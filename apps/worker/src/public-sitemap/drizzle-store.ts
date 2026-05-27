import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { articleLocalizations, articles, categories } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import { createDrizzlePublicArticleDetailTransaction } from "../public-article-detail/drizzle-store.js";
import type { PublicArticleDetailData } from "../public-article-detail/types.js";
import type {
  ListPublicArticleSitemapCandidatesOptions,
  PublicSitemapCategoryRow,
  PublicSitemapExecutor,
  PublicSitemapStore,
} from "./types.js";

export function createDrizzlePublicSitemapStore(db: TopicpressDatabase): PublicSitemapStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) =>
        callback({
          ...createDrizzlePublicArticleDetailTransaction(tx),
          listActiveCategoriesByConfigKeys: (configKeys) =>
            listActiveCategoriesByConfigKeys(tx, configKeys),
          listPublicArticleSitemapCandidates: (options) =>
            listPublicArticleSitemapCandidates(tx, options),
        }),
      ),
  };
}

async function listActiveCategoriesByConfigKeys(
  db: PublicSitemapExecutor,
  configKeys: readonly string[],
): Promise<readonly PublicSitemapCategoryRow[]> {
  if (configKeys.length === 0) {
    return [];
  }

  return db
    .select({
      id: categories.id,
      configKey: categories.configKey,
      slug: categories.slug,
      isActive: categories.isActive,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .where(and(inArray(categories.configKey, [...configKeys]), eq(categories.isActive, true)));
}

async function listPublicArticleSitemapCandidates(
  db: PublicSitemapExecutor,
  options: ListPublicArticleSitemapCandidatesOptions,
): Promise<readonly PublicArticleDetailData[]> {
  if (options.categoryConfigKeys.length === 0) {
    return [];
  }

  const baseRows = await db
    .select({
      article: {
        id: articles.id,
        slug: articles.slug,
        status: articles.status,
        publishedAt: articles.publishedAt,
        heroImageUrl: articles.heroImageUrl,
        updatedAt: articles.updatedAt,
      },
      category: {
        configKey: categories.configKey,
        slug: categories.slug,
        name: categories.name,
        isActive: categories.isActive,
      },
    })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .where(
      and(
        eq(articles.status, "published"),
        isNotNull(articles.publishedAt),
        eq(categories.isActive, true),
        inArray(categories.configKey, [...options.categoryConfigKeys]),
      ),
    )
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt), desc(articles.id));

  const articleIds = baseRows.map((row) => row.article.id);

  if (articleIds.length === 0) {
    return [];
  }

  const localizationRows = await db
    .select({
      articleId: articleLocalizations.articleId,
      locale: articleLocalizations.locale,
      slug: articleLocalizations.slug,
      title: articleLocalizations.title,
      subtitle: articleLocalizations.subtitle,
      excerpt: articleLocalizations.excerpt,
      body: articleLocalizations.body,
      keywords: articleLocalizations.keywords,
      metaTitle: articleLocalizations.metaTitle,
      metaDescription: articleLocalizations.metaDescription,
    })
    .from(articleLocalizations)
    .where(
      and(
        inArray(articleLocalizations.articleId, articleIds),
        inArray(articleLocalizations.locale, [...options.supportedLocales]),
      ),
    );

  return baseRows.map((row) => ({
    article: row.article,
    category: row.category,
    localizations: localizationRows
      .filter((localization) => localization.articleId === row.article.id)
      .map((localization) => ({
        locale: localization.locale,
        slug: localization.slug,
        title: localization.title,
        subtitle: localization.subtitle,
        excerpt: localization.excerpt,
        body: localization.body,
        keywords: localization.keywords,
        metaTitle: localization.metaTitle,
        metaDescription: localization.metaDescription,
      })),
  }));
}
