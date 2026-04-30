import { siteConfig as defaultSiteConfig } from "@topicpress/config";
import { parseArticleDraft, type ArticleDraft } from "@topicpress/ai";

import type { TopicpressDatabase } from "../database.js";
import { createDrizzleDraftCreationStore } from "./drizzle-store.js";
import type {
  CreateDraftArticleInput,
  DraftCreationArticleInfo,
  DraftCreationErrorCode,
  DraftCreationFailure,
  DraftCreationOptions,
  DraftCreationResult,
  DraftCreationSourceItemRow,
  DraftCreationStore,
  DraftCreationTransaction,
  DraftGenerationMetadataJson,
  InsertDraftArticleSourceValues,
} from "./types.js";
import { DraftCreationError } from "./types.js";

const eligibleClusterStatuses = new Set(["open", "selected"]);

export async function createDraftArticleForCluster(
  db: TopicpressDatabase,
  input: CreateDraftArticleInput,
  options: DraftCreationOptions = {},
): Promise<DraftCreationResult> {
  return createDraftArticleForClusterWithStore(createDrizzleDraftCreationStore(db), input, options);
}

export async function createDraftArticleForClusterWithStore(
  store: DraftCreationStore,
  input: CreateDraftArticleInput,
  options: DraftCreationOptions = {},
): Promise<DraftCreationResult> {
  const now = options.now ?? new Date();
  const siteConfig = options.siteConfig ?? defaultSiteConfig;

  try {
    return await store.transaction(async (tx) => {
      const existingArticle = await tx.findArticleByStoryClusterId(input.cluster.id);

      if (existingArticle !== null) {
        return success(existingArticle, false, 0);
      }

      if (!eligibleClusterStatuses.has(input.cluster.status)) {
        return failure(
          "ineligible_cluster",
          `Cluster "${input.cluster.id}" is not eligible for draft creation while status is "${input.cluster.status}".`,
        );
      }

      if (
        input.generationInput !== undefined &&
        input.generationInput.storyClusterId !== input.cluster.id
      ) {
        return failure(
          "malformed_output",
          `Article generation input references cluster "${input.generationInput.storyClusterId}", not "${input.cluster.id}".`,
        );
      }

      const expectedLocale =
        options.locale ??
        input.generationInput?.locale ??
        readDraftGenerationLocale(input.draft) ??
        siteConfig.locales.defaultLocale;
      const parsedDraft = parseArticleDraft(input.draft, {
        siteConfig,
        locale: expectedLocale,
        ...(input.generationInput !== undefined ? { input: input.generationInput } : {}),
      });

      if (!parsedDraft.ok || parsedDraft.value === undefined) {
        return failure(
          "malformed_output",
          "Generated article draft failed validation.",
          parsedDraft.issues,
        );
      }

      const draftClusterId = readOptionalString(input.draft, "storyClusterId");

      if (draftClusterId !== undefined && draftClusterId !== input.cluster.id) {
        return failure(
          "malformed_output",
          `Generated article draft references cluster "${draftClusterId}", not "${input.cluster.id}".`,
        );
      }

      return persistValidatedDraft(
        tx,
        input,
        parsedDraft.value,
        extractLineageReferences(input.draft, parsedDraft.value),
        now,
      );
    });
  } catch (error) {
    if (error instanceof DraftCreationError) {
      return failure(error.code, error.message, error.issues);
    }

    return failure(
      "persistence_failed",
      error instanceof Error ? error.message : "Draft persistence failed.",
    );
  }
}

async function persistValidatedDraft(
  tx: DraftCreationTransaction,
  input: CreateDraftArticleInput,
  draft: ArticleDraft,
  lineageReferences: DraftLineageReferences,
  now: Date,
): Promise<DraftCreationResult> {
  const category = await tx.findActiveCategoryByConfigKey(draft.category.key);

  if (category === null) {
    return failure(
      "invalid_category",
      `Cannot create draft for inactive or missing category "${draft.category.key}".`,
    );
  }

  if (category.slug !== draft.category.slug) {
    return failure(
      "invalid_category",
      `Category "${draft.category.key}" resolved to slug "${category.slug}", not draft slug "${draft.category.slug}".`,
    );
  }

  const sourceItems = await tx.listClusterSourceItems(input.cluster.id);

  if (sourceItems.length === 0) {
    return failure(
      "missing_source_items",
      `Cluster "${input.cluster.id}" has no source items to freeze as article lineage.`,
    );
  }

  const lineageSourceItems = resolveLineageSourceItems(sourceItems, lineageReferences);

  if (!lineageSourceItems.ok) {
    return lineageSourceItems.result;
  }

  const articleSlugConflict = await tx.findArticleBySlug(draft.slug);

  if (articleSlugConflict !== null) {
    return slugConflict(draft.slug, articleSlugConflict);
  }

  const localizationSlugConflict = await tx.findLocalizationByLocaleSlug(
    draft.generation.locale,
    draft.slug,
  );

  if (localizationSlugConflict !== null) {
    return slugConflict(draft.slug, localizationSlugConflict);
  }

  const article = await tx.insertArticle({
    storyClusterId: input.cluster.id,
    categoryId: category.id,
    slug: draft.slug,
    status: "review",
    primaryLocale: draft.generation.locale,
    generationMetadata: sanitizeGenerationMetadata(draft),
    createdAt: now,
    updatedAt: now,
  });

  await tx.insertArticleLocalization({
    articleId: article.id,
    locale: draft.generation.locale,
    slug: draft.slug,
    title: draft.title,
    subtitle: draft.subtitle ?? null,
    excerpt: draft.excerpt,
    body: draft.body,
    keywords: [...draft.keywords],
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    isMachineTranslated: false,
    createdAt: now,
    updatedAt: now,
  });

  await tx.insertArticleSources(
    buildArticleSourceValues(article.id, lineageSourceItems.items, now),
  );

  return success(article, true, lineageSourceItems.items.length);
}

interface DraftLineageReferences {
  readonly sourceItemIds: readonly string[];
  readonly sourceUrls: readonly string[];
}

type ResolvedLineageSourceItems =
  | {
      readonly ok: true;
      readonly items: readonly DraftCreationSourceItemRow[];
    }
  | {
      readonly ok: false;
      readonly result: DraftCreationResult;
    };

function resolveLineageSourceItems(
  sourceItems: readonly DraftCreationSourceItemRow[],
  lineageReferences: DraftLineageReferences,
): ResolvedLineageSourceItems {
  if (lineageReferences.sourceItemIds.length > 0) {
    const sourceItemsById = new Map(sourceItems.map((item) => [item.sourceItemId, item]));
    const resolved = lineageReferences.sourceItemIds.flatMap((sourceItemId) => {
      const sourceItem = sourceItemsById.get(sourceItemId);
      return sourceItem === undefined ? [] : [sourceItem];
    });

    if (resolved.length !== lineageReferences.sourceItemIds.length) {
      const missingIds = lineageReferences.sourceItemIds.filter(
        (sourceItemId) => !sourceItemsById.has(sourceItemId),
      );

      return {
        ok: false,
        result: failure(
          "missing_source_items",
          `Draft lineage references source items that are not attached to the cluster: ${missingIds.join(", ")}.`,
        ),
      };
    }

    return { ok: true, items: resolved };
  }

  const sourceItemUrls = new Set(sourceItems.map((item) => item.externalUrl));
  const lineageUrls = new Set(lineageReferences.sourceUrls);
  const resolved = sourceItems.filter(
    (item) => sourceItemUrls.has(item.externalUrl) && lineageUrls.has(item.externalUrl),
  );

  if (resolved.length === 0) {
    return {
      ok: false,
      result: failure(
        "missing_lineage",
        "Draft lineage does not reference a source item attached to the cluster.",
      ),
    };
  }

  return { ok: true, items: resolved };
}

function extractLineageReferences(rawDraft: unknown, draft: ArticleDraft): DraftLineageReferences {
  return {
    sourceItemIds: uniqueStrings([
      ...draft.lineage.map((lineage) => lineage.sourceItemId),
      ...extractRawLineageSourceItemIds(rawDraft),
    ]),
    sourceUrls: uniqueStrings(draft.lineage.map((lineage) => lineage.sourceUrl)),
  };
}

function extractRawLineageSourceItemIds(input: unknown): readonly string[] {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return [];
  }

  const lineage = (input as Readonly<Record<string, unknown>>).lineage;

  if (!Array.isArray(lineage)) {
    return [];
  }

  return lineage.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return [];
    }

    const sourceItemId = (entry as Readonly<Record<string, unknown>>).sourceItemId;
    return typeof sourceItemId === "string" && sourceItemId.trim().length > 0
      ? [sourceItemId.trim()]
      : [];
  });
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function readOptionalString(input: unknown, key: string): string | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }

  const value = (input as Readonly<Record<string, unknown>>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function buildArticleSourceValues(
  articleId: string,
  sourceItems: readonly DraftCreationSourceItemRow[],
  now: Date,
): readonly InsertDraftArticleSourceValues[] {
  const primarySourceItemId =
    sourceItems.find((item) => item.isPrimary)?.sourceItemId ?? sourceItems[0]?.sourceItemId;

  if (primarySourceItemId === undefined) {
    return [];
  }

  return sourceItems.map((item) => ({
    articleId,
    sourceItemId: item.sourceItemId,
    role: item.sourceItemId === primarySourceItemId ? "primary" : "supporting",
    createdAt: now,
  }));
}

function sanitizeGenerationMetadata(draft: ArticleDraft): DraftGenerationMetadataJson {
  const base = {
    generationRunId: draft.generation.generationRunId,
    provider: draft.generation.provider,
    mode: draft.generation.mode,
    locale: draft.generation.locale,
    generatedAt: draft.generation.generatedAt,
    promptHash: draft.generation.promptHash,
    inputHash: draft.generation.inputHash,
    manualReviewRequired: true,
    status: "review",
  } as const;

  return {
    ...base,
    ...(draft.generation.model !== undefined ? { model: draft.generation.model } : {}),
    ...(draft.generation.fixtureKey !== undefined
      ? { fixtureKey: draft.generation.fixtureKey }
      : {}),
  };
}

function readDraftGenerationLocale(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }

  const generation = (input as Readonly<Record<string, unknown>>).generation;

  if (typeof generation !== "object" || generation === null || Array.isArray(generation)) {
    return undefined;
  }

  const locale = (generation as Readonly<Record<string, unknown>>).locale;
  return typeof locale === "string" && locale.trim().length > 0 ? locale.trim() : undefined;
}

function slugConflict(slug: string, article: DraftCreationArticleInfo): DraftCreationResult {
  return failure(
    "slug_conflict",
    `Cannot create draft with slug "${slug}" because article "${article.id}" already uses it.`,
  );
}

function success(
  article: DraftCreationArticleInfo,
  created: boolean,
  sourceCount: number,
): DraftCreationResult {
  return {
    ok: true,
    created,
    article,
    sourceCount,
  };
}

function failure(
  code: DraftCreationErrorCode,
  message: string,
  issues?: readonly string[],
): DraftCreationResult {
  const error: DraftCreationFailure =
    issues !== undefined && issues.length > 0 ? { code, message, issues } : { code, message };

  return {
    ok: false,
    error,
  };
}
