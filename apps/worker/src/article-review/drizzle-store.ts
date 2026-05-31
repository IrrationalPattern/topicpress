import { and, desc, eq, inArray } from "drizzle-orm";

import {
  articleLocalizations,
  articleHeroImageCandidates,
  articleSources,
  articles,
  categories,
  sources,
  sourceItems,
  storyClusterItems,
  storyClusters,
} from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  ArticleReviewArticleData,
  ArticleReviewHeroImageCandidateRow,
  ArticleReviewExecutor,
  ArticleReviewSourceLineage,
  ArticleReviewStore,
  ArticleReviewTransaction,
  ListReviewableArticlesOptions,
  UpdateArticleReviewStatusInput,
} from "./types.js";

export function createDrizzleArticleReviewStore(db: TopicpressDatabase): ArticleReviewStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzleArticleReviewTransaction(tx))),
  };
}

export function createDrizzleArticleReviewTransaction(
  db: ArticleReviewExecutor,
): ArticleReviewTransaction {
  return {
    listReviewableArticleIds: (options) => listReviewableArticleIds(db, options),
    findArticleReviewById: (articleId) => findArticleReviewById(db, articleId),
    updateArticleStatus: (input) => updateArticleStatus(db, input),
  };
}

async function listReviewableArticleIds(
  db: ArticleReviewExecutor,
  options: ListReviewableArticlesOptions,
): Promise<readonly string[]> {
  const statuses = options.statuses ?? ["draft", "review", "ready"];

  if (statuses.length === 0) {
    return [];
  }

  const query = db
    .select({ id: articles.id })
    .from(articles)
    .where(inArray(articles.status, [...statuses]))
    .orderBy(desc(articles.updatedAt), desc(articles.createdAt), desc(articles.id));
  const rows = options.limit === undefined ? await query : await query.limit(options.limit);

  return rows.map((row) => row.id);
}

async function findArticleReviewById(
  db: ArticleReviewExecutor,
  articleId: string,
): Promise<ArticleReviewArticleData | null> {
  const baseRows = await db
    .select({
      article: articleSelection(),
      category: {
        id: categories.id,
        configKey: categories.configKey,
        slug: categories.slug,
        name: categories.name,
        isActive: categories.isActive,
      },
      storyCluster: {
        id: storyClusters.id,
        canonicalTopic: storyClusters.canonicalTopic,
        summary: storyClusters.summary,
        status: storyClusters.status,
      },
    })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .innerJoin(storyClusters, eq(articles.storyClusterId, storyClusters.id))
    .where(eq(articles.id, articleId))
    .limit(1);
  const base = baseRows[0];

  if (base === undefined) {
    return null;
  }

  const [localizations, lineage, slugMatches, clusterMatches] = await Promise.all([
    listLocalizations(db, articleId),
    listSourceLineage(db, articleId, base.article.storyClusterId),
    listArticleIdsBySlug(db, base.article.slug),
    listArticleIdsByStoryClusterId(db, base.article.storyClusterId),
  ]);
  const heroImageCandidate = await findHeroImageCandidateByArticleId(db, articleId);

  return {
    article: base.article,
    category: base.category,
    storyCluster: base.storyCluster,
    localizations,
    sources: lineage,
    heroImageCandidate,
    articleIdsWithSameSlug: slugMatches,
    articleIdsWithSameStoryCluster: clusterMatches,
  };
}

async function listLocalizations(db: ArticleReviewExecutor, articleId: string) {
  return db
    .select({
      id: articleLocalizations.id,
      locale: articleLocalizations.locale,
      slug: articleLocalizations.slug,
      title: articleLocalizations.title,
      subtitle: articleLocalizations.subtitle,
      excerpt: articleLocalizations.excerpt,
      body: articleLocalizations.body,
      keywords: articleLocalizations.keywords,
      metaTitle: articleLocalizations.metaTitle,
      metaDescription: articleLocalizations.metaDescription,
      isMachineTranslated: articleLocalizations.isMachineTranslated,
    })
    .from(articleLocalizations)
    .where(eq(articleLocalizations.articleId, articleId));
}

async function listSourceLineage(
  db: ArticleReviewExecutor,
  articleId: string,
  storyClusterId: string,
): Promise<readonly ArticleReviewSourceLineage[]> {
  return db
    .select({
      articleSourceId: articleSources.id,
      role: articleSources.role,
      isClusterPrimary: storyClusterItems.isPrimary,
      sourceItem: {
        id: sourceItems.id,
        externalUrl: sourceItems.externalUrl,
        title: sourceItems.title,
        summary: sourceItems.summary,
        contentText: sourceItems.contentText,
        language: sourceItems.language,
        publishedAt: sourceItems.publishedAt,
        fetchedAt: sourceItems.fetchedAt,
      },
      source: {
        id: sources.id,
        configKey: sources.configKey,
        slug: sources.slug,
        name: sources.name,
        kind: sources.kind,
        isActive: sources.isActive,
      },
    })
    .from(articleSources)
    .innerJoin(sourceItems, eq(articleSources.sourceItemId, sourceItems.id))
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .innerJoin(
      storyClusterItems,
      and(
        eq(storyClusterItems.sourceItemId, sourceItems.id),
        eq(storyClusterItems.storyClusterId, storyClusterId),
      ),
    )
    .where(eq(articleSources.articleId, articleId));
}

async function listArticleIdsBySlug(
  db: ArticleReviewExecutor,
  slug: string,
): Promise<readonly string[]> {
  const rows = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
  return rows.map((row) => row.id);
}

async function listArticleIdsByStoryClusterId(
  db: ArticleReviewExecutor,
  storyClusterId: string,
): Promise<readonly string[]> {
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.storyClusterId, storyClusterId));

  return rows.map((row) => row.id);
}

async function updateArticleStatus(
  db: ArticleReviewExecutor,
  input: UpdateArticleReviewStatusInput,
): Promise<{ readonly id: string } | null> {
  const rows = await db
    .update(articles)
    .set({
      status: input.toStatus,
      updatedAt: input.updatedAt,
      ...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes } : {}),
    })
    .where(and(eq(articles.id, input.articleId), eq(articles.status, input.expectedStatus)))
    .returning({ id: articles.id });

  return rows[0] ?? null;
}

async function findHeroImageCandidateByArticleId(
  db: ArticleReviewExecutor,
  articleId: string,
): Promise<ArticleReviewHeroImageCandidateRow | null> {
  const rows = await db
    .select(candidateSelection())
    .from(articleHeroImageCandidates)
    .where(eq(articleHeroImageCandidates.articleId, articleId))
    .limit(1);

  return rows[0] ?? null;
}

function articleSelection() {
  return {
    id: articles.id,
    storyClusterId: articles.storyClusterId,
    categoryId: articles.categoryId,
    slug: articles.slug,
    status: articles.status,
    heroImageUrl: articles.heroImageUrl,
    primaryLocale: articles.primaryLocale,
    publishedAt: articles.publishedAt,
    reviewNotes: articles.reviewNotes,
    generationMetadata: articles.generationMetadata,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt,
  };
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
