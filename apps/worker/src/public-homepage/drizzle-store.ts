import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { articleLocalizations, articles, categories } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  HomepageArticleData,
  ListHomepageArticleCandidatesOptions,
  PublicHomepageExecutor,
  PublicHomepageStore,
  PublicHomepageTransaction,
} from "./types.js";

export function createDrizzlePublicHomepageStore(db: TopicpressDatabase): PublicHomepageStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzlePublicHomepageTransaction(tx))),
  };
}

function createDrizzlePublicHomepageTransaction(
  db: PublicHomepageExecutor,
): PublicHomepageTransaction {
  return {
    listHomepageArticleCandidates: (options) => listHomepageArticleCandidates(db, options),
  };
}

async function listHomepageArticleCandidates(
  db: PublicHomepageExecutor,
  options: ListHomepageArticleCandidatesOptions,
): Promise<readonly HomepageArticleData[]> {
  if (options.limit === 0) {
    return [];
  }

  const baseRows = await db
    .select({
      article: {
        id: articles.id,
        status: articles.status,
        publishedAt: articles.publishedAt,
        heroImageUrl: articles.heroImageUrl,
        createdAt: articles.createdAt,
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
      ),
    )
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt), desc(articles.id))
    .limit(options.limit);

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
      metaTitle: articleLocalizations.metaTitle,
      metaDescription: articleLocalizations.metaDescription,
    })
    .from(articleLocalizations)
    .where(
      and(
        inArray(articleLocalizations.articleId, articleIds),
        inArray(articleLocalizations.locale, [...options.locales]),
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
        metaTitle: localization.metaTitle,
        metaDescription: localization.metaDescription,
      })),
  }));
}
