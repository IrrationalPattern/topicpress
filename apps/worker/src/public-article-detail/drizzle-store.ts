import { and, eq, inArray, isNotNull, or } from "drizzle-orm";

import { articleLocalizations, articles, categories } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  FindArticleDetailCandidatesBySlugOptions,
  PublicArticleDetailData,
  PublicArticleDetailExecutor,
  PublicArticleDetailStore,
  PublicArticleDetailTransaction,
} from "./types.js";

export function createDrizzlePublicArticleDetailStore(
  db: TopicpressDatabase,
): PublicArticleDetailStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzlePublicArticleDetailTransaction(tx))),
  };
}

export function createDrizzlePublicArticleDetailTransaction(
  db: PublicArticleDetailExecutor,
): PublicArticleDetailTransaction {
  return {
    findArticleDetailCandidatesBySlug: (options) =>
      findArticleDetailCandidatesBySlug(db, options),
  };
}

async function findArticleDetailCandidatesBySlug(
  db: PublicArticleDetailExecutor,
  options: FindArticleDetailCandidatesBySlugOptions,
): Promise<readonly PublicArticleDetailData[]> {
  const lookupLocales = [...new Set([options.requestedLocale, options.defaultLocale])];

  const localizationMatches = await db
    .select({
      articleId: articleLocalizations.articleId,
    })
    .from(articleLocalizations)
    .where(
      and(
        inArray(articleLocalizations.locale, lookupLocales),
        eq(articleLocalizations.slug, options.slug),
      ),
    );

  const localizedArticleIds = [...new Set(localizationMatches.map((row) => row.articleId))];
  const articleLookupPredicate =
    localizedArticleIds.length > 0
      ? or(inArray(articles.id, localizedArticleIds), eq(articles.slug, options.slug))
      : eq(articles.slug, options.slug);

  const baseRows = await db
    .select({
      article: {
        id: articles.id,
        slug: articles.slug,
        status: articles.status,
        publishedAt: articles.publishedAt,
        heroImageUrl: articles.heroImageUrl,
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
        articleLookupPredicate,
        eq(articles.status, "published"),
        isNotNull(articles.publishedAt),
        eq(categories.isActive, true),
      ),
    );

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
