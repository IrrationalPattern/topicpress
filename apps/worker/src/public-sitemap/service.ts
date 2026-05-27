import {
  siteConfig as defaultSiteConfig,
  type CategoryConfig,
  type SiteConfig,
} from "@topicpress/config";

import type { TopicpressDatabase } from "../database.js";
import {
  buildPublicArticleDetailCandidate,
  resolvePublicArticleDetailCandidateForSlug,
} from "../public-article-detail/service.js";
import { createDrizzlePublicSitemapStore } from "./drizzle-store.js";
import type {
  PublicSitemapArticlePathRecord,
  PublicSitemapCategoryPathRecord,
  PublicSitemapCategoryRow,
  PublicSitemapInventory,
  PublicSitemapStore,
} from "./types.js";

export async function listPublicSitemapInventory(
  db: TopicpressDatabase,
): Promise<PublicSitemapInventory> {
  return listPublicSitemapInventoryWithStore(createDrizzlePublicSitemapStore(db));
}

export async function listPublicSitemapInventoryWithStore(
  store: PublicSitemapStore,
  config: SiteConfig = defaultSiteConfig,
): Promise<PublicSitemapInventory> {
  const activeConfigCategories = config.taxonomy.filter((category) => category.isActive);
  const categoryConfigKeys = activeConfigCategories.map((category) => category.key);
  const activeConfigCategoryByKey = new Map(
    activeConfigCategories.map((category) => [category.key, category]),
  );

  return store.transaction(async (tx) => {
    const dbCategories = await tx.listActiveCategoriesByConfigKeys(categoryConfigKeys);
    const dbCategoryByConfigKey = new Map(
      dbCategories.map((category) => [category.configKey, category]),
    );
    const categoryRecords = buildCategoryPathRecords(
      activeConfigCategories,
      dbCategoryByConfigKey,
      config,
    );
    const articleCandidates = await tx.listPublicArticleSitemapCandidates({
      categoryConfigKeys,
      supportedLocales: config.locales.supportedLocales,
    });
    const articleRecords: PublicSitemapArticlePathRecord[] = [];

    for (const candidate of articleCandidates) {
      const configCategory = activeConfigCategoryByKey.get(candidate.category.configKey);

      if (
        configCategory === undefined ||
        candidate.category.slug !== configCategory.slug ||
        !candidate.category.isActive
      ) {
        continue;
      }

      for (const locale of config.locales.supportedLocales) {
        const article = buildPublicArticleDetailCandidate(
          candidate,
          locale,
          config.locales.defaultLocale,
          config,
        );

        if (article === null) {
          continue;
        }

        const resolved = await resolvePublicArticleDetailCandidateForSlug(
          tx,
          article.slug,
          locale,
          config,
        );

        if (resolved?.data.article.id !== candidate.article.id) {
          continue;
        }

        if (candidate.article.publishedAt === null) {
          continue;
        }

        articleRecords.push({
          source: "article",
          articleId: candidate.article.id,
          locale,
          slug: article.slug,
          publishedAt: candidate.article.publishedAt.toISOString(),
          ...(candidate.article.updatedAt !== undefined
            ? { updatedAt: candidate.article.updatedAt.toISOString() }
            : {}),
        });
      }
    }

    return {
      categories: categoryRecords,
      articles: articleRecords,
    };
  });
}

function buildCategoryPathRecords(
  configCategories: readonly CategoryConfig[],
  dbCategoryByConfigKey: ReadonlyMap<string, PublicSitemapCategoryRow>,
  config: SiteConfig,
): readonly PublicSitemapCategoryPathRecord[] {
  return configCategories.flatMap((configCategory) => {
    const dbCategory = dbCategoryByConfigKey.get(configCategory.key);

    if (
      dbCategory === undefined ||
      !dbCategory.isActive ||
      dbCategory.slug !== configCategory.slug
    ) {
      return [];
    }

    return config.locales.supportedLocales.map((locale) => ({
      source: "category" as const,
      locale,
      categorySlug: configCategory.slug,
      lastModified: dbCategory.updatedAt.toISOString(),
    }));
  });
}
