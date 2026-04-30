import { siteConfig as defaultSiteConfig, type SiteConfig } from "@topicpress/config";

import type {
  ArticleDraft,
  DraftCategory,
  DraftCitation,
  DraftGenerationMetadata,
  DraftLineage,
  ValidationResult,
} from "./types.js";
import { DraftValidationError } from "./types.js";
import { activeDraftCategories } from "./utils.js";

export interface DraftValidationOptions {
  readonly siteConfig?: SiteConfig;
  readonly locale?: string;
}

export function parseArticleDraft(
  input: unknown,
  options: DraftValidationOptions = {},
): ValidationResult<ArticleDraft> {
  const config = options.siteConfig ?? defaultSiteConfig;
  const locale = options.locale ?? config.locales.defaultLocale;
  const issues: string[] = [];
  const draft = asRecord(input, "draft", issues);

  if (draft === undefined) {
    return { ok: false, issues };
  }

  const title = readRequiredString(draft, "title", "draft.title", issues);
  const subtitle = readOptionalString(draft, "subtitle", "draft.subtitle", issues);
  const excerpt = readRequiredString(draft, "excerpt", "draft.excerpt", issues);
  const body = readRequiredString(draft, "body", "draft.body", issues);
  const keywords = readStringArray(draft, "keywords", "draft.keywords", issues);
  const metaTitle = readRequiredString(draft, "metaTitle", "draft.metaTitle", issues);
  const metaDescription = readRequiredString(
    draft,
    "metaDescription",
    "draft.metaDescription",
    issues,
  );
  const category = readCategory(draft.category, config, locale, issues);
  const slug = readSlug(draft, "slug", "draft.slug", issues);
  const citations = readCitations(draft.citations, issues);
  const lineage = readLineage(draft.lineage, issues);
  const generation = readGeneration(draft.generation, locale, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      title: title ?? "",
      ...(subtitle !== undefined ? { subtitle } : {}),
      excerpt: excerpt ?? "",
      body: body ?? "",
      keywords,
      metaTitle: metaTitle ?? "",
      metaDescription: metaDescription ?? "",
      category: category ?? activeDraftCategories(config, locale)[0] ?? {
        key: "uncategorised",
        slug: "uncategorised",
        label: "Uncategorised",
      },
      slug: slug ?? "",
      citations,
      lineage,
      generation: generation ?? {
        provider: "unknown",
        mode: "fixture",
        locale,
        generatedAt: new Date(0).toISOString(),
        promptHash: "00000000",
        inputHash: "00000000",
        manualReviewRequired: true,
        status: "review",
      },
    },
    issues: [],
  };
}

export function validateArticleDraft(
  input: unknown,
  options: DraftValidationOptions = {},
): ArticleDraft {
  const result = parseArticleDraft(input, options);

  if (!result.ok || result.value === undefined) {
    throw new DraftValidationError(result.issues);
  }

  return result.value;
}

export { DraftValidationError } from "./types.js";

function readCategory(
  input: unknown,
  config: SiteConfig,
  locale: string,
  issues: string[],
): DraftCategory | undefined {
  const category = asRecord(input, "draft.category", issues);

  if (category === undefined) {
    return undefined;
  }

  const key = readRequiredString(category, "key", "draft.category.key", issues);
  const slug = readRequiredString(category, "slug", "draft.category.slug", issues);
  const label = readRequiredString(category, "label", "draft.category.label", issues);
  const allowedCategory = activeDraftCategories(config, locale).find(
    (entry) => entry.key === key,
  );

  if (key !== undefined && allowedCategory === undefined) {
    issues.push(`draft.category.key: unknown active taxonomy category "${key}"`);
  }

  if (allowedCategory !== undefined && slug !== undefined && slug !== allowedCategory.slug) {
    issues.push(
      `draft.category.slug: expected "${allowedCategory.slug}" for category "${allowedCategory.key}"`,
    );
  }

  if (key === undefined || slug === undefined || label === undefined) {
    return undefined;
  }

  return { key, slug, label };
}

function readCitations(input: unknown, issues: string[]): readonly DraftCitation[] {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push("draft.citations: expected non-empty array");
    return [];
  }

  return input.flatMap((entry, index) => {
    const citation = asRecord(entry, `draft.citations[${index}]`, issues);

    if (citation === undefined) {
      return [];
    }

    const sourceName = readRequiredString(
      citation,
      "sourceName",
      `draft.citations[${index}].sourceName`,
      issues,
    );
    const title = readRequiredString(citation, "title", `draft.citations[${index}].title`, issues);
    const url = readUrl(citation, "url", `draft.citations[${index}].url`, issues);
    const author = readOptionalString(
      citation,
      "author",
      `draft.citations[${index}].author`,
      issues,
    );
    const publishedAt = readOptionalDateString(
      citation,
      "publishedAt",
      `draft.citations[${index}].publishedAt`,
      issues,
    );

    if (sourceName === undefined || title === undefined || url === undefined) {
      return [];
    }

    return [
      {
        sourceName,
        title,
        url,
        ...(author !== undefined ? { author } : {}),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
    ];
  });
}

function readLineage(input: unknown, issues: string[]): readonly DraftLineage[] {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push("draft.lineage: expected non-empty array");
    return [];
  }

  return input.flatMap((entry, index) => {
    const lineage = asRecord(entry, `draft.lineage[${index}]`, issues);

    if (lineage === undefined) {
      return [];
    }

    if (lineage.kind !== "source_item") {
      issues.push(`draft.lineage[${index}].kind: expected "source_item"`);
    }

    const sourceName = readRequiredString(
      lineage,
      "sourceName",
      `draft.lineage[${index}].sourceName`,
      issues,
    );
    const sourceUrl = readUrl(lineage, "sourceUrl", `draft.lineage[${index}].sourceUrl`, issues);
    const sourceTitle = readRequiredString(
      lineage,
      "sourceTitle",
      `draft.lineage[${index}].sourceTitle`,
      issues,
    );
    const fetchedAt = readOptionalDateString(
      lineage,
      "fetchedAt",
      `draft.lineage[${index}].fetchedAt`,
      issues,
    );

    if (sourceName === undefined || sourceUrl === undefined || sourceTitle === undefined) {
      return [];
    }

    return [
      {
        kind: "source_item" as const,
        sourceName,
        sourceUrl,
        sourceTitle,
        ...(fetchedAt !== undefined ? { fetchedAt } : {}),
      },
    ];
  });
}

function readGeneration(
  input: unknown,
  expectedLocale: string,
  issues: string[],
): DraftGenerationMetadata | undefined {
  const generation = asRecord(input, "draft.generation", issues);

  if (generation === undefined) {
    return undefined;
  }

  const provider = readRequiredString(generation, "provider", "draft.generation.provider", issues);
  const mode = readMode(generation.mode, issues);
  const locale = readRequiredString(generation, "locale", "draft.generation.locale", issues);
  const generatedAt = readDateString(
    generation,
    "generatedAt",
    "draft.generation.generatedAt",
    issues,
  );
  const promptHash = readHash(generation, "promptHash", "draft.generation.promptHash", issues);
  const inputHash = readHash(generation, "inputHash", "draft.generation.inputHash", issues);
  const model = readOptionalString(generation, "model", "draft.generation.model", issues);
  const fixtureKey = readOptionalString(
    generation,
    "fixtureKey",
    "draft.generation.fixtureKey",
    issues,
  );

  if (locale !== undefined && locale !== expectedLocale) {
    issues.push(`draft.generation.locale: expected "${expectedLocale}"`);
  }

  if (generation.manualReviewRequired !== true) {
    issues.push("draft.generation.manualReviewRequired: expected true");
  }

  if (generation.status !== "review") {
    issues.push('draft.generation.status: expected "review"');
  }

  if (
    provider === undefined ||
    mode === undefined ||
    locale === undefined ||
    generatedAt === undefined ||
    promptHash === undefined ||
    inputHash === undefined
  ) {
    return undefined;
  }

  return {
    provider,
    mode,
    locale,
    generatedAt,
    promptHash,
    inputHash,
    manualReviewRequired: true,
    status: "review",
    ...(model !== undefined ? { model } : {}),
    ...(fixtureKey !== undefined ? { fixtureKey } : {}),
  };
}

function readMode(input: unknown, issues: string[]): "fixture" | "live" | undefined {
  if (input !== "fixture" && input !== "live") {
    issues.push('draft.generation.mode: expected "fixture" or "live"');
    return undefined;
  }

  return input;
}

function readRequiredString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = input[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}: expected non-empty string`);
    return undefined;
  }

  return value.trim();
}

function readOptionalString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push(`${path}: expected string`);
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStringArray(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): readonly string[] {
  const value = input[key];

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  ) {
    issues.push(`${path}: expected non-empty string array`);
    return [];
  }

  return value.map((entry) => entry.trim());
}

function readSlug(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readRequiredString(input, key, path, issues);

  if (value !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    issues.push(`${path}: expected URL slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/`);
  }

  return value;
}

function readUrl(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readRequiredString(input, key, path, issues);

  if (value === undefined) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      issues.push(`${path}: expected http or https URL`);
    }
  } catch {
    issues.push(`${path}: expected URL`);
  }

  return value;
}

function readDateString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readRequiredString(input, key, path, issues);

  if (value !== undefined && Number.isNaN(Date.parse(value))) {
    issues.push(`${path}: expected parseable date string`);
  }

  return value;
}

function readOptionalDateString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readOptionalString(input, key, path, issues);

  if (value !== undefined && Number.isNaN(Date.parse(value))) {
    issues.push(`${path}: expected parseable date string`);
  }

  return value;
}

function readHash(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readRequiredString(input, key, path, issues);

  if (value !== undefined && !/^[a-f0-9]{8,64}$/.test(value)) {
    issues.push(`${path}: expected lowercase hex hash`);
  }

  return value;
}

function asRecord(
  input: unknown,
  path: string,
  issues: string[],
): Readonly<Record<string, unknown>> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    issues.push(`${path}: expected object`);
    return undefined;
  }

  return input as Readonly<Record<string, unknown>>;
}
