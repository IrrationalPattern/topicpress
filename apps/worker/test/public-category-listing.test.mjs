import assert from "node:assert/strict";
import { test } from "node:test";

import { getCategoryListingWithStore } from "../dist/public-category-listing.js";

const baseTime = new Date("2026-05-01T09:00:00.000Z");
const newerPublishedAt = new Date("2026-05-02T10:00:00.000Z");
const olderPublishedAt = new Date("2026-05-01T10:00:00.000Z");

test("returns category metadata plus published articles for a valid active category", async () => {
  const store = createMemoryPublicCategoryListingStore({
    candidates: [candidate({ article: article({ id: "news-article" }) })],
  });

  const result = await getCategoryListingWithStore(
    store,
    { locale: "en-GB", categorySlug: "news" },
    publicCategoryConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.locale, "en-GB");
  assert.deepEqual(result.category, {
    configKey: "news",
    slug: "news",
    label: "News",
    description: "Timely AI updates.",
  });
  assert.equal(result.limit, 12);
  assert.equal(result.hasMore, false);
  assert.deepEqual(
    result.articles.map((currentArticle) => currentArticle.id),
    ["news-article"],
  );
  assert.equal(result.articles[0].category.configKey, "news");
});

test("returns an empty list for a valid active category without published articles", async () => {
  const store = createMemoryPublicCategoryListingStore({ candidates: [] });

  const result = await getCategoryListingWithStore(
    store,
    { locale: "en-GB", categorySlug: "model-releases" },
    publicCategoryConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.category.configKey, "model_releases");
  assert.deepEqual(result.articles, []);
});

test("returns not_found for invalid, unknown, inactive, or stale categories", async (t) => {
  await t.test("unsupported locale", async () => {
    const store = createMemoryPublicCategoryListingStore();

    const result = await getCategoryListingWithStore(
      store,
      { locale: "fr-FR", categorySlug: "news" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
    assert.equal(store.calls.length, 0);
  });

  await t.test("invalid slug shape", async () => {
    const store = createMemoryPublicCategoryListingStore();

    const result = await getCategoryListingWithStore(
      store,
      { locale: "en-GB", categorySlug: "bad_slug" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
    assert.equal(store.calls.length, 0);
  });

  await t.test("unknown category slug", async () => {
    const store = createMemoryPublicCategoryListingStore();

    const result = await getCategoryListingWithStore(
      store,
      { locale: "en-GB", categorySlug: "unknown" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("inactive configured category", async () => {
    const store = createMemoryPublicCategoryListingStore();

    const result = await getCategoryListingWithStore(
      store,
      { locale: "en-GB", categorySlug: "inactive" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("inactive database category", async () => {
    const store = createMemoryPublicCategoryListingStore({
      categories: [category({ isActive: false })],
    });

    const result = await getCategoryListingWithStore(
      store,
      { locale: "en-GB", categorySlug: "news" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("config and database slug mismatch", async () => {
    const store = createMemoryPublicCategoryListingStore({
      categories: [category({ slug: "stale-news" })],
    });

    const result = await getCategoryListingWithStore(
      store,
      { locale: "en-GB", categorySlug: "news" },
      publicCategoryConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });
});

test("uses requested locale fields and falls back to default locale fields", async () => {
  const store = createMemoryPublicCategoryListingStore({
    candidates: [
      candidate({
        localizations: [
          localization({
            locale: "en-GB",
            slug: "default-slug",
            title: "Default title",
            subtitle: "Default subtitle",
            excerpt: "Default excerpt",
            metaTitle: "Default meta title",
            metaDescription: "Default meta description",
          }),
          localization({
            id: "localization-uk",
            locale: "uk-UA",
            slug: "requested-slug",
            title: "Requested title",
            subtitle: "",
            excerpt: "",
            metaTitle: "Requested meta title",
            metaDescription: null,
          }),
        ],
      }),
    ],
  });

  const result = await getCategoryListingWithStore(
    store,
    { locale: "uk-UA", categorySlug: "news" },
    publicCategoryFallbackConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.category.label, "News");
  assert.equal(result.category.description, "Timely AI updates.");
  assert.equal(result.articles[0].slug, "requested-slug");
  assert.equal(result.articles[0].title, "Requested title");
  assert.equal(result.articles[0].excerpt, "Default excerpt");
  assert.equal(result.articles[0].subtitle, "Default subtitle");
  assert.equal(result.articles[0].metaTitle, "Requested meta title");
  assert.equal(result.articles[0].metaDescription, "Default meta description");
  assert.equal(result.articles[0].category.label, "News");
  assert.deepEqual(store.calls[1].locales, ["uk-UA", "en-GB"]);
});

test("orders deterministically and caps category listings at twelve articles", async () => {
  const candidates = Array.from({ length: 13 }, (_, index) =>
    candidate({
      article: article({
        id: `article-${String(index + 1).padStart(2, "0")}`,
        publishedAt: index === 0 ? newerPublishedAt : olderPublishedAt,
        createdAt: new Date(`2026-05-01T09:${String(index).padStart(2, "0")}:00.000Z`),
      }),
      localizations: [
        localization({
          id: `localization-${index + 1}`,
          articleId: `article-${String(index + 1).padStart(2, "0")}`,
          slug: `article-${String(index + 1).padStart(2, "0")}`,
          title: `Article ${index + 1}`,
        }),
      ],
    }),
  );
  const store = createMemoryPublicCategoryListingStore({ candidates });

  const result = await getCategoryListingWithStore(
    store,
    { locale: "en-GB", categorySlug: "news" },
    publicCategoryConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.articles.length, 12);
  assert.equal(result.articles[0].id, "article-01");
  assert.deepEqual(
    result.articles.slice(1).map((currentArticle) => currentArticle.id),
    [
      "article-13",
      "article-12",
      "article-11",
      "article-10",
      "article-09",
      "article-08",
      "article-07",
      "article-06",
      "article-05",
      "article-04",
      "article-03",
    ],
  );
  assert.equal(store.calls[1].limit, 12);
  assert.deepEqual(store.calls[1].locales, ["en-GB"]);
});

test("excludes non-published, null-published, incomplete, and other-category articles", async () => {
  const store = createMemoryPublicCategoryListingStore({
    categories: [
      category(),
      category({
        id: "category-model-releases",
        configKey: "model_releases",
        slug: "model-releases",
        name: "Model Releases",
      }),
    ],
    candidates: [
      candidate({ article: article({ id: "draft-article", status: "draft" }) }),
      candidate({ article: article({ id: "review-article", status: "review" }) }),
      candidate({ article: article({ id: "ready-article", status: "ready" }) }),
      candidate({ article: article({ id: "failed-article", status: "failed" }) }),
      candidate({
        article: article({ id: "missing-published-at", publishedAt: null }),
      }),
      candidate({
        article: article({ id: "incomplete-localization" }),
        localizations: [localization({ slug: "", title: "", excerpt: "" })],
      }),
      candidate({
        article: article({ id: "other-category" }),
        category: category({
          id: "category-model-releases",
          configKey: "model_releases",
          slug: "model-releases",
          name: "Model Releases",
        }),
      }),
      candidate({ article: article({ id: "published-news" }) }),
    ],
    applyQueryFilters: false,
  });

  const result = await getCategoryListingWithStore(
    store,
    { locale: "en-GB", categorySlug: "news" },
    publicCategoryConfig,
  );

  assert.equal(result.kind, "found");
  assert.deepEqual(
    result.articles.map((currentArticle) => currentArticle.id),
    ["published-news"],
  );
});

function createMemoryPublicCategoryListingStore(overrides = {}) {
  const categories = (overrides.categories ?? [category(), modelReleaseCategory()]).map(
    (row) => ({ ...row }),
  );
  const candidates = (overrides.candidates ?? [candidate()]).map(cloneCandidate);
  const calls = [];

  const tx = {
    findActiveCategoryByConfigKey: async (configKey) => {
      calls.push({ configKey });
      const currentCategory = categories.find(
        (row) => row.configKey === configKey && row.isActive,
      );

      return currentCategory === undefined ? null : { ...currentCategory };
    },
    listCategoryArticleCandidates: async (options) => {
      calls.push({
        categoryId: options.categoryId,
        locales: [...options.locales],
        limit: options.limit,
      });

      const rows =
        overrides.applyQueryFilters === false
          ? candidates
          : candidates
              .filter(
                (row) =>
                  row.article.status === "published" &&
                  row.article.publishedAt !== null &&
                  row.category.id === options.categoryId &&
                  row.category.isActive,
              )
              .sort(compareCandidates)
              .slice(0, options.limit);

      return rows.map((row) => ({
        article: { ...row.article },
        category: { ...row.category },
        localizations: row.localizations
          .filter((localization) => options.locales.includes(localization.locale))
          .map((localization) => ({ ...localization })),
      }));
    },
  };

  return {
    calls,
    transaction: async (callback) => callback(tx),
  };
}

function compareCandidates(left, right) {
  return (
    compareNullableDatesDesc(left.article.publishedAt, right.article.publishedAt) ||
    compareDatesDesc(left.article.createdAt, right.article.createdAt) ||
    right.article.id.localeCompare(left.article.id)
  );
}

function compareNullableDatesDesc(left, right) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return compareDatesDesc(left, right);
}

function compareDatesDesc(left, right) {
  return right.getTime() - left.getTime();
}

function cloneCandidate(row) {
  return {
    article: { ...row.article },
    category: { ...row.category },
    localizations: row.localizations.map((localization) => ({ ...localization })),
  };
}

function candidate(overrides = {}) {
  const currentArticle = overrides.article ?? article();

  return {
    article: currentArticle,
    category: overrides.category ?? category(),
    localizations: overrides.localizations ?? [localization({ articleId: currentArticle.id })],
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    status: "published",
    publishedAt: olderPublishedAt,
    heroImageUrl: "https://example.test/hero.jpg",
    createdAt: baseTime,
    ...overrides,
  };
}

function category(overrides = {}) {
  return {
    id: "category-news",
    configKey: "news",
    slug: "news",
    name: "News",
    description: "Database news description.",
    isActive: true,
    ...overrides,
  };
}

function modelReleaseCategory(overrides = {}) {
  return category({
    id: "category-model-releases",
    configKey: "model_releases",
    slug: "model-releases",
    name: "Model Releases",
    description: "Database model releases description.",
    ...overrides,
  });
}

function localization(overrides = {}) {
  return {
    id: "localization-1",
    articleId: "article-1",
    locale: "en-GB",
    slug: "published-article",
    title: "Published article",
    subtitle: "Public subtitle",
    excerpt: "A stable public excerpt.",
    metaTitle: "Published article | AI Landscape Brief",
    metaDescription: "A stable public meta description.",
    ...overrides,
  };
}

const publicCategoryConfig = {
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

const publicCategoryFallbackConfig = {
  ...publicCategoryConfig,
  taxonomy: [
    {
      key: "news",
      slug: "news",
      labels: {
        "en-GB": "News",
      },
      descriptions: {
        "en-GB": "Timely AI updates.",
      },
      isActive: true,
    },
  ],
};
