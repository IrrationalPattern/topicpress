import { and, asc, eq } from "drizzle-orm";

import {
  articleLocalizations,
  articleSources,
  articles,
  categories,
  sourceItems,
  storyClusterItems,
} from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  DraftCreationArticleInfo,
  DraftCreationCategoryRow,
  DraftCreationExecutor,
  DraftCreationSourceItemRow,
  DraftCreationStore,
  DraftCreationTransaction,
  InsertDraftArticleLocalizationValues,
  InsertDraftArticleSourceValues,
  InsertDraftArticleValues,
} from "./types.js";
import { DraftCreationError } from "./types.js";

export function createDrizzleDraftCreationStore(db: TopicpressDatabase): DraftCreationStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzleDraftCreationTransaction(tx))),
  };
}

function createDrizzleDraftCreationTransaction(
  db: DraftCreationExecutor,
): DraftCreationTransaction {
  return {
    findArticleByStoryClusterId: (storyClusterId) =>
      findArticleByStoryClusterId(db, storyClusterId),
    findActiveCategoryByConfigKey: (configKey) => findActiveCategoryByConfigKey(db, configKey),
    listClusterSourceItems: (storyClusterId) => listClusterSourceItems(db, storyClusterId),
    findArticleBySlug: (slug) => findArticleBySlug(db, slug),
    findLocalizationByLocaleSlug: (locale, slug) => findLocalizationByLocaleSlug(db, locale, slug),
    insertArticle: (values) => insertArticle(db, values),
    insertArticleLocalization: (values) => insertArticleLocalization(db, values),
    insertArticleSources: (values) => insertArticleSources(db, values),
  };
}

async function findArticleByStoryClusterId(
  db: DraftCreationExecutor,
  storyClusterId: string,
): Promise<DraftCreationArticleInfo | null> {
  const rows = await db
    .select(articleInfoSelection())
    .from(articles)
    .where(eq(articles.storyClusterId, storyClusterId))
    .limit(1);

  return rows[0] ?? null;
}

async function findArticleBySlug(
  db: DraftCreationExecutor,
  slug: string,
): Promise<DraftCreationArticleInfo | null> {
  const rows = await db
    .select(articleInfoSelection())
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

async function findLocalizationByLocaleSlug(
  db: DraftCreationExecutor,
  locale: string,
  slug: string,
): Promise<DraftCreationArticleInfo | null> {
  const rows = await db
    .select(articleInfoSelection())
    .from(articleLocalizations)
    .innerJoin(articles, eq(articleLocalizations.articleId, articles.id))
    .where(and(eq(articleLocalizations.locale, locale), eq(articleLocalizations.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

async function findActiveCategoryByConfigKey(
  db: DraftCreationExecutor,
  configKey: string,
): Promise<DraftCreationCategoryRow | null> {
  const rows = await db
    .select({
      id: categories.id,
      configKey: categories.configKey,
      slug: categories.slug,
      isActive: categories.isActive,
    })
    .from(categories)
    .where(and(eq(categories.configKey, configKey), eq(categories.isActive, true)))
    .limit(1);

  return rows[0] ?? null;
}

async function listClusterSourceItems(
  db: DraftCreationExecutor,
  storyClusterId: string,
): Promise<readonly DraftCreationSourceItemRow[]> {
  return db
    .select({
      sourceItemId: sourceItems.id,
      externalUrl: sourceItems.externalUrl,
      title: sourceItems.title,
      isPrimary: storyClusterItems.isPrimary,
    })
    .from(storyClusterItems)
    .innerJoin(sourceItems, eq(storyClusterItems.sourceItemId, sourceItems.id))
    .where(eq(storyClusterItems.storyClusterId, storyClusterId))
    .orderBy(asc(storyClusterItems.isPrimary), asc(sourceItems.publishedAt), asc(sourceItems.id));
}

async function insertArticle(
  db: DraftCreationExecutor,
  values: InsertDraftArticleValues,
): Promise<DraftCreationArticleInfo> {
  const inserted = await db.insert(articles).values(values).returning(articleInfoSelection());
  const row = inserted[0];

  if (row === undefined) {
    throw new DraftCreationError(
      "persistence_failed",
      `Failed to create article for cluster "${values.storyClusterId}".`,
    );
  }

  return row;
}

async function insertArticleLocalization(
  db: DraftCreationExecutor,
  values: InsertDraftArticleLocalizationValues,
): Promise<{ readonly id: string }> {
  const inserted = await db
    .insert(articleLocalizations)
    .values({
      ...values,
      keywords: [...values.keywords],
    })
    .returning({ id: articleLocalizations.id });
  const row = inserted[0];

  if (row === undefined) {
    throw new DraftCreationError(
      "persistence_failed",
      `Failed to create primary localization for article "${values.articleId}".`,
    );
  }

  return row;
}

async function insertArticleSources(
  db: DraftCreationExecutor,
  values: readonly InsertDraftArticleSourceValues[],
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  await db.insert(articleSources).values([...values]);
}

function articleInfoSelection() {
  return {
    id: articles.id,
    storyClusterId: articles.storyClusterId,
    categoryId: articles.categoryId,
    slug: articles.slug,
    status: articles.status,
    primaryLocale: articles.primaryLocale,
  };
}
