import { and, asc, desc, eq } from "drizzle-orm";

import {
  articleHeroImageCandidates,
  articleLocalizations,
  articleSources,
  articles,
  categories,
  pipelineRuns,
  sourceItems,
  sources,
} from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { JsonValue } from "../feed-types.js";
import type {
  HeroImageCandidateArticleContext,
  HeroImageCandidateRecord,
  HeroImageCandidateSourceContext,
  HeroImageCandidateStore,
  HeroImageCandidateTransaction,
  InsertHeroImageCandidateValues,
  SetArticleHeroImageUrlInput,
  UpdateHeroImageCandidateValues,
} from "./types.js";

export function createDrizzleHeroImageCandidateStore(
  db: TopicpressDatabase,
): HeroImageCandidateStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzleHeroImageCandidateTransaction(tx))),
    createPipelineRun: async (input) => {
      const rows = await db
        .insert(pipelineRuns)
        .values({
          runType: input.runType,
          status: "running",
          articleId: input.articleId,
          attempt: input.attempt,
          startedAt: input.startedAt,
          payload: input.payload,
          createdAt: input.startedAt,
          updatedAt: input.startedAt,
        })
        .returning({ id: pipelineRuns.id });
      const row = rows[0];

      if (row === undefined) {
        throw new Error("Failed to create hero image candidate pipeline run.");
      }

      return row;
    },
    finishPipelineRun: async (id, input) => {
      await db
        .update(pipelineRuns)
        .set({
          status: input.status,
          attempt: input.attempt,
          finishedAt: input.finishedAt,
          errorMessage: input.errorMessage ?? null,
          payload: input.payload,
          updatedAt: input.finishedAt,
        })
        .where(eq(pipelineRuns.id, id));
    },
  };
}

type HeroImageCandidateExecutor = Pick<TopicpressDatabase, "insert" | "select" | "update">;

function createDrizzleHeroImageCandidateTransaction(
  db: HeroImageCandidateExecutor,
): HeroImageCandidateTransaction {
  return {
    findArticleContext: (articleId) => findArticleContext(db, articleId),
    findCandidateByArticleId: (articleId) => findCandidateByArticleId(db, articleId),
    insertCandidate: (values) => insertCandidate(db, values),
    updateCandidate: (values) => updateCandidate(db, values),
    setArticleHeroImageUrl: (input) => setArticleHeroImageUrl(db, input),
  };
}

async function findArticleContext(
  db: HeroImageCandidateExecutor,
  articleId: string,
): Promise<HeroImageCandidateArticleContext | null> {
  const articleRows = await db
    .select({
      article: {
        id: articles.id,
        status: articles.status,
        primaryLocale: articles.primaryLocale,
        heroImageUrl: articles.heroImageUrl,
        storyClusterId: articles.storyClusterId,
      },
      category: {
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        isActive: categories.isActive,
      },
    })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.id, articleId))
    .limit(1);
  const articleRow = articleRows[0];

  if (articleRow === undefined) {
    return null;
  }

  const localizationRows = await db
    .select({
      locale: articleLocalizations.locale,
      title: articleLocalizations.title,
      subtitle: articleLocalizations.subtitle,
      excerpt: articleLocalizations.excerpt,
      body: articleLocalizations.body,
      keywords: articleLocalizations.keywords,
    })
    .from(articleLocalizations)
    .where(
      and(
        eq(articleLocalizations.articleId, articleId),
        eq(articleLocalizations.locale, articleRow.article.primaryLocale),
      ),
    )
    .limit(1);

  const primaryLocalization = localizationRows[0] ?? null;

  return {
    article: articleRow.article,
    category: articleRow.category,
    primaryLocalization,
    sources: await listArticleSourceContext(db, articleId),
  };
}

async function listArticleSourceContext(
  db: HeroImageCandidateExecutor,
  articleId: string,
): Promise<readonly HeroImageCandidateSourceContext[]> {
  return db
    .select({
      sourceItemId: sourceItems.id,
      sourceName: sources.name,
      title: sourceItems.title,
      summary: sourceItems.summary,
      contentText: sourceItems.contentText,
      isPrimary: articleSources.role,
    })
    .from(articleSources)
    .innerJoin(sourceItems, eq(articleSources.sourceItemId, sourceItems.id))
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(eq(articleSources.articleId, articleId))
    .orderBy(desc(articleSources.role), asc(sourceItems.publishedAt), asc(sourceItems.id))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        isPrimary: row.isPrimary === "primary",
      })),
    );
}

async function findCandidateByArticleId(
  db: HeroImageCandidateExecutor,
  articleId: string,
): Promise<HeroImageCandidateRecord | null> {
  const rows = await db
    .select(candidateSelection())
    .from(articleHeroImageCandidates)
    .where(eq(articleHeroImageCandidates.articleId, articleId))
    .limit(1);

  return rows[0] === undefined ? null : toCandidateRecord(rows[0]);
}

async function insertCandidate(
  db: HeroImageCandidateExecutor,
  values: InsertHeroImageCandidateValues,
): Promise<HeroImageCandidateRecord> {
  const rows = await db
    .insert(articleHeroImageCandidates)
    .values(values)
    .returning(candidateSelection());
  const row = rows[0];

  if (row === undefined) {
    throw new Error(`Failed to create hero image candidate for article "${values.articleId}".`);
  }

  return toCandidateRecord(row);
}

async function updateCandidate(
  db: HeroImageCandidateExecutor,
  values: UpdateHeroImageCandidateValues,
): Promise<HeroImageCandidateRecord | null> {
  const rows = await db
    .update(articleHeroImageCandidates)
    .set({
      status: values.status,
      provider: values.provider,
      model: values.model,
      prompt: values.prompt,
      promptHash: values.promptHash,
      stylePolicy: values.stylePolicy,
      storageBucket: values.storageBucket,
      storagePath: values.storagePath,
      contentType: values.contentType,
      width: values.width,
      height: values.height,
      sizeBytes: values.sizeBytes,
      publicUrl: values.publicUrl,
      reviewNotes: values.reviewNotes,
      generationMetadata: values.generationMetadata,
      generatedAt: values.generatedAt,
      reviewedAt: values.reviewedAt,
      updatedAt: values.updatedAt,
    })
    .where(eq(articleHeroImageCandidates.id, values.candidateId))
    .returning(candidateSelection());

  return rows[0] === undefined ? null : toCandidateRecord(rows[0]);
}

async function setArticleHeroImageUrl(
  db: HeroImageCandidateExecutor,
  input: SetArticleHeroImageUrlInput,
): Promise<{ readonly id: string; readonly heroImageUrl: string | null } | null> {
  const rows = await db
    .update(articles)
    .set({
      heroImageUrl: input.heroImageUrl,
      updatedAt: input.updatedAt,
    })
    .where(eq(articles.id, input.articleId))
    .returning({
      id: articles.id,
      heroImageUrl: articles.heroImageUrl,
    });

  return rows[0] ?? null;
}

function toCandidateRecord(
  row: Omit<HeroImageCandidateRecord, "generationMetadata"> & {
    readonly generationMetadata: unknown;
  },
): HeroImageCandidateRecord {
  return {
    ...row,
    generationMetadata: normalizeJsonValue(row.generationMetadata),
  };
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJsonValue(entry)]),
    );
  }

  return {};
}

function candidateSelection() {
  return {
    id: articleHeroImageCandidates.id,
    articleId: articleHeroImageCandidates.articleId,
    status: articleHeroImageCandidates.status,
    provider: articleHeroImageCandidates.provider,
    model: articleHeroImageCandidates.model,
    prompt: articleHeroImageCandidates.prompt,
    promptHash: articleHeroImageCandidates.promptHash,
    stylePolicy: articleHeroImageCandidates.stylePolicy,
    storageBucket: articleHeroImageCandidates.storageBucket,
    storagePath: articleHeroImageCandidates.storagePath,
    contentType: articleHeroImageCandidates.contentType,
    width: articleHeroImageCandidates.width,
    height: articleHeroImageCandidates.height,
    sizeBytes: articleHeroImageCandidates.sizeBytes,
    publicUrl: articleHeroImageCandidates.publicUrl,
    reviewNotes: articleHeroImageCandidates.reviewNotes,
    generationMetadata: articleHeroImageCandidates.generationMetadata,
    generatedAt: articleHeroImageCandidates.generatedAt,
    reviewedAt: articleHeroImageCandidates.reviewedAt,
    createdAt: articleHeroImageCandidates.createdAt,
    updatedAt: articleHeroImageCandidates.updatedAt,
  };
}
