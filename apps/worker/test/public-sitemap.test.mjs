import assert from "node:assert/strict";
import { test } from "node:test";

import { listPublicSitemapInventoryWithStore } from "../dist/public-sitemap.js";

const publishedAt = new Date("2026-05-01T10:00:00.000Z");
const updatedAt = new Date("2026-05-02T10:00:00.000Z");
const categoryUpdatedAt = new Date("2026-05-03T10:00:00.000Z");

test("returns active category path records for supported locales", async () => {
  const store = createMemoryPublicSitemapStore({
    categories: [
      category({ configKey: "news", slug: "news" }),
      category({ id: "category-stale", configKey: "model_releases", slug: "stale-models" }),
      category({ id: "category-inactive-db", configKey: "research", slug: "research", isActive: false }),
      category({ id: "category-inactive-config", configKey: "inactive", slug: "inactive" }),
    ],
    candidates: [],
  });

  const inventory = await listPublicSitemapInventoryWithStore(store, publicSitemapConfig);

  assert.deepEqual(inventory.categories, [
    {
      source: "category",
      locale: "en-GB",
      categorySlug: "news",
      lastModified: categoryUpdatedAt.toISOString(),
    },
    {
      source: "category",
      locale: "uk-UA",
      categorySlug: "news",
      lastModified: categoryUpdatedAt.toISOString(),
    },
  ]);
  assert.deepEqual(inventory.articles, []);
  assert.deepEqual(store.calls[0], {
    kind: "listActiveCategoriesByConfigKeys",
    configKeys: ["news", "model_releases", "research"],
  });
});

test("returns article path records for supported locales using detail fallback semantics", async () => {
  const store = createMemoryPublicSitemapStore({
    candidates: [
      candidate({
        article: article({ id: "article-localized" }),
        localizations: [
          localization({
            articleId: "article-localized",
            locale: "en-GB",
            slug: "english-slug",
            title: "English title",
            excerpt: "English excerpt",
            body: "English body",
          }),
          localization({
            id: "localization-uk",
            articleId: "article-localized",
            locale: "uk-UA",
            slug: "ukrainian-slug",
            title: "Ukrainian title",
            excerpt: "",
            body: "Ukrainian body",
          }),
        ],
      }),
      candidate({
        article: article({ id: "article-fallback", slug: "fallback-canonical" }),
        localizations: [
          localization({
            id: "localization-fallback-en",
            articleId: "article-fallback",
            locale: "en-GB",
            slug: "fallback-default",
            title: "Fallback default title",
            excerpt: "Fallback default excerpt",
            body: "Fallback default body",
          }),
          localization({
            id: "localization-fallback-uk",
            articleId: "article-fallback",
            locale: "uk-UA",
            slug: null,
            title: "",
            excerpt: "",
            body: "",
          }),
        ],
      }),
    ],
  });

  const inventory = await listPublicSitemapInventoryWithStore(store, publicSitemapConfig);

  assert.deepEqual(inventory.articles, [
    {
      source: "article",
      articleId: "article-localized",
      locale: "en-GB",
      slug: "english-slug",
      publishedAt: publishedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
    {
      source: "article",
      articleId: "article-localized",
      locale: "uk-UA",
      slug: "ukrainian-slug",
      publishedAt: publishedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
    {
      source: "article",
      articleId: "article-fallback",
      locale: "en-GB",
      slug: "fallback-default",
      publishedAt: publishedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
    {
      source: "article",
      articleId: "article-fallback",
      locale: "uk-UA",
      slug: "fallback-default",
      publishedAt: publishedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
  ]);
  assert.equal("title" in inventory.articles[0], false);
  assert.equal("body" in inventory.articles[0], false);
  assert.equal("category" in inventory.articles[0], false);
});

test("omits unpublished, null-published, inactive-category, incomplete, invalid, and inactive-config articles", async () => {
  const store = createMemoryPublicSitemapStore({
    categories: [
      category(),
      category({
        id: "category-inactive-config",
        configKey: "inactive",
        slug: "inactive",
      }),
      category({
        id: "category-stale",
        configKey: "model_releases",
        slug: "stale-models",
      }),
    ],
    candidates: [
      candidate({
        article: article({ id: "draft-article", status: "draft" }),
        localizations: [localization({ articleId: "draft-article", slug: "draft-article" })],
      }),
      candidate({
        article: article({ id: "review-article", status: "review" }),
        localizations: [localization({ articleId: "review-article", slug: "review-article" })],
      }),
      candidate({
        article: article({ id: "ready-article", status: "ready" }),
        localizations: [localization({ articleId: "ready-article", slug: "ready-article" })],
      }),
      candidate({
        article: article({ id: "failed-article", status: "failed" }),
        localizations: [localization({ articleId: "failed-article", slug: "failed-article" })],
      }),
      candidate({
        article: article({ id: "null-published", publishedAt: null }),
        localizations: [localization({ articleId: "null-published", slug: "null-published" })],
      }),
      candidate({
        article: article({ id: "inactive-db-category" }),
        category: category({ isActive: false }),
        localizations: [
          localization({ articleId: "inactive-db-category", slug: "inactive-db-category" }),
        ],
      }),
      candidate({
        article: article({ id: "inactive-config-category" }),
        category: category({
          id: "category-inactive-config",
          configKey: "inactive",
          slug: "inactive",
        }),
        localizations: [
          localization({
            articleId: "inactive-config-category",
            slug: "inactive-config-category",
          }),
        ],
      }),
      candidate({
        article: article({ id: "stale-category-slug" }),
        category: category({
          id: "category-stale",
          configKey: "model_releases",
          slug: "stale-models",
        }),
        localizations: [
          localization({ articleId: "stale-category-slug", slug: "stale-category-slug" }),
        ],
      }),
      candidate({
        article: article({ id: "missing-fields" }),
        localizations: [
          localization({
            articleId: "missing-fields",
            slug: "missing-fields",
            title: "",
            excerpt: "",
            body: "",
          }),
        ],
      }),
      candidate({
        article: article({ id: "invalid-slug", slug: "bad_slug" }),
        localizations: [
          localization({
            articleId: "invalid-slug",
            slug: "bad_slug",
          }),
        ],
      }),
      candidate({
        article: article({ id: "published-article" }),
        localizations: [
          localization({ articleId: "published-article", slug: "published-article" }),
        ],
      }),
    ],
    applyQueryFilters: false,
  });

  const inventory = await listPublicSitemapInventoryWithStore(store, publicSitemapConfig);

  assert.deepEqual(
    inventory.articles.map((record) => record.articleId),
    ["published-article", "published-article"],
  );
});

test("omits article path candidates that are ambiguous under article-detail lookup", async () => {
  const store = createMemoryPublicSitemapStore({
    candidates: [
      candidate({
        article: article({ id: "target-article" }),
        localizations: [
          localization({
            articleId: "target-article",
            slug: "shared-slug",
          }),
        ],
      }),
      candidate({
        article: article({ id: "shadow-article" }),
        localizations: [
          localization({
            id: "localization-shadow",
            articleId: "shadow-article",
            slug: "shared-slug",
          }),
        ],
      }),
    ],
  });

  const inventory = await listPublicSitemapInventoryWithStore(store, publicSitemapConfig);

  assert.deepEqual(inventory.articles, []);
});

function createMemoryPublicSitemapStore(overrides = {}) {
  const categories = (overrides.categories ?? [category()]).map((row) => ({ ...row }));
  const candidates = (overrides.candidates ?? [candidate()]).map(cloneCandidate);
  const calls = [];

  const tx = {
    listActiveCategoriesByConfigKeys: async (configKeys) => {
      calls.push({
        kind: "listActiveCategoriesByConfigKeys",
        configKeys: [...configKeys],
      });

      return categories
        .filter((row) => configKeys.includes(row.configKey) && row.isActive)
        .map((row) => ({ ...row }));
    },
    listPublicArticleSitemapCandidates: async (options) => {
      calls.push({
        kind: "listPublicArticleSitemapCandidates",
        categoryConfigKeys: [...options.categoryConfigKeys],
        supportedLocales: [...options.supportedLocales],
      });

      const rows = filterCandidateRows(candidates, {
        categoryConfigKeys: options.categoryConfigKeys,
        supportedLocales: options.supportedLocales,
        applyQueryFilters: overrides.applyQueryFilters !== false,
      });

      return rows.map((row) => toArticleDetailData(row, options.supportedLocales));
    },
    findArticleDetailCandidatesBySlug: async (options) => {
      calls.push({
        kind: "findArticleDetailCandidatesBySlug",
        slug: options.slug,
        requestedLocale: options.requestedLocale,
        defaultLocale: options.defaultLocale,
        supportedLocales: [...options.supportedLocales],
      });

      const rows = candidates
        .filter((row) => matchesLookup(row, options))
        .filter((row) =>
          overrides.applyQueryFilters === false
            ? true
            : row.article.status === "published" &&
              row.article.publishedAt !== null &&
              row.category.isActive,
        );

      return rows.map((row) => toArticleDetailData(row, options.supportedLocales));
    },
  };

  return {
    calls,
    transaction: async (callback) => callback(tx),
  };
}

function filterCandidateRows(rows, options) {
  return rows
    .filter((row) => options.categoryConfigKeys.includes(row.category.configKey))
    .filter((row) =>
      options.applyQueryFilters
        ? row.article.status === "published" &&
          row.article.publishedAt !== null &&
          row.category.isActive
        : true,
    );
}

function matchesLookup(row, options) {
  return (
    row.article.slug === options.slug ||
    row.localizations.some(
      (localization) =>
        localization.slug === options.slug &&
        (localization.locale === options.requestedLocale ||
          localization.locale === options.defaultLocale),
    )
  );
}

function toArticleDetailData(row, supportedLocales) {
  return {
    article: { ...row.article },
    category: { ...row.category },
    localizations: row.localizations
      .filter((localization) => supportedLocales.includes(localization.locale))
      .map((localization) => ({ ...localization, keywords: [...localization.keywords] })),
  };
}

function cloneCandidate(row) {
  return {
    article: { ...row.article },
    category: { ...row.category },
    localizations: row.localizations.map((localization) => ({
      ...localization,
      keywords: [...localization.keywords],
    })),
  };
}

function candidate(overrides = {}) {
  const currentArticle = overrides.article ?? article();

  return {
    article: currentArticle,
    category: overrides.category ?? category(),
    localizations: overrides.localizations ?? [
      localization({ articleId: currentArticle.id, slug: "public-article" }),
    ],
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    slug: "canonical-article",
    status: "published",
    publishedAt,
    heroImageUrl: null,
    updatedAt,
    ...overrides,
  };
}

function category(overrides = {}) {
  return {
    id: "category-news",
    configKey: "news",
    slug: "news",
    name: "News",
    isActive: true,
    updatedAt: categoryUpdatedAt,
    ...overrides,
  };
}

function localization(overrides = {}) {
  return {
    id: "localization-1",
    articleId: "article-1",
    locale: "en-GB",
    slug: "public-article",
    title: "Published article",
    subtitle: "Public subtitle",
    excerpt: "A stable public excerpt.",
    body: "A stable public body.",
    keywords: ["ai", "news"],
    metaTitle: "Published article | AI Landscape Brief",
    metaDescription: "A stable public meta description.",
    ...overrides,
  };
}

const publicSitemapConfig = {
  locales: {
    defaultLocale: "en-GB",
    supportedLocales: ["en-GB", "uk-UA"],
  },
  taxonomy: [
    {
      key: "news",
      slug: "news",
      labels: {
        "en-GB": "News",
        "uk-UA": "News UK",
      },
      descriptions: {
        "en-GB": "Timely AI updates.",
        "uk-UA": "Timely AI updates in Ukrainian.",
      },
      isActive: true,
    },
    {
      key: "model_releases",
      slug: "model-releases",
      labels: {
        "en-GB": "Model Releases",
      },
      descriptions: {
        "en-GB": "New AI model updates.",
      },
      isActive: true,
    },
    {
      key: "research",
      slug: "research",
      labels: {
        "en-GB": "Research",
      },
      descriptions: {
        "en-GB": "Research updates.",
      },
      isActive: true,
    },
    {
      key: "inactive",
      slug: "inactive",
      labels: {
        "en-GB": "Inactive",
      },
      descriptions: {
        "en-GB": "Inactive category.",
      },
      isActive: false,
    },
  ],
};
