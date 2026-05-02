import assert from "node:assert/strict";
import { test } from "node:test";

import { listHomepageArticlesWithStore } from "../dist/public-homepage.js";

const baseTime = new Date("2026-05-01T09:00:00.000Z");
const newerPublishedAt = new Date("2026-05-02T10:00:00.000Z");
const olderPublishedAt = new Date("2026-05-01T10:00:00.000Z");

test("returns only durable published homepage articles from active categories", async () => {
  const store = createMemoryPublicHomepageStore({
    candidates: [
      candidate({ article: article({ id: "draft-article", status: "draft" }) }),
      candidate({ article: article({ id: "review-article", status: "review" }) }),
      candidate({ article: article({ id: "ready-article", status: "ready" }) }),
      candidate({ article: article({ id: "failed-article", status: "failed" }) }),
      candidate({
        article: article({ id: "missing-published-at", publishedAt: null }),
      }),
      candidate({
        article: article({ id: "inactive-category" }),
        category: category({ isActive: false }),
      }),
      candidate({ article: article({ id: "published-article" }) }),
    ],
    applyQueryFilters: false,
  });

  const articles = await listHomepageArticlesWithStore(store, { locale: "en-GB" });

  assert.deepEqual(
    articles.map((article) => article.id),
    ["published-article"],
  );
  assert.equal(articles[0].publishedAt, olderPublishedAt);
});

test("uses requested-locale fields and falls back to default-locale fields only when needed", async () => {
  const store = createMemoryPublicHomepageStore({
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

  const articles = await listHomepageArticlesWithStore(
    store,
    { locale: "uk-UA" },
    publicHomepageConfig,
  );

  assert.equal(articles.length, 1);
  assert.equal(articles[0].slug, "requested-slug");
  assert.equal(articles[0].displaySlug, "requested-slug");
  assert.equal(articles[0].title, "Requested title");
  assert.equal(articles[0].excerpt, "Default excerpt");
  assert.equal(articles[0].subtitle, "Default subtitle");
  assert.equal(articles[0].metaTitle, "Requested meta title");
  assert.equal(articles[0].metaDescription, "Default meta description");
  assert.equal(articles[0].category.label, "Новини");
});

test("omits published articles without required localized public fields", async () => {
  const store = createMemoryPublicHomepageStore({
    candidates: [
      candidate({
        localizations: [
          localization({ locale: "en-GB", slug: "", title: " ", excerpt: "" }),
          localization({
            id: "localization-uk",
            locale: "uk-UA",
            slug: null,
            title: "",
            excerpt: "Requested excerpt",
          }),
        ],
      }),
    ],
  });

  const articles = await listHomepageArticlesWithStore(store, { locale: "uk-UA" });

  assert.deepEqual(articles, []);
});

test("returns a stable empty result when no published articles qualify", async () => {
  const store = createMemoryPublicHomepageStore({ candidates: [] });

  const articles = await listHomepageArticlesWithStore(store, { locale: "en-GB" });

  assert.deepEqual(articles, []);
});

test("orders deterministically and caps homepage results at twelve articles", async () => {
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
  const store = createMemoryPublicHomepageStore({ candidates });

  const articles = await listHomepageArticlesWithStore(store, { locale: "en-GB" });

  assert.equal(articles.length, 12);
  assert.equal(articles[0].id, "article-01");
  assert.deepEqual(
    articles.slice(1).map((article) => article.id),
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
  assert.equal(store.calls[0].limit, 12);
  assert.deepEqual(store.calls[0].locales, ["en-GB"]);
});

function createMemoryPublicHomepageStore(overrides = {}) {
  const candidates = (overrides.candidates ?? [candidate()]).map(cloneCandidate);
  const calls = [];

  const tx = {
    listHomepageArticleCandidates: async (options) => {
      calls.push({
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
    configKey: "news",
    slug: "news",
    name: "News",
    isActive: true,
    ...overrides,
  };
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

const publicHomepageConfig = {
  locales: {
    defaultLocale: "en-GB",
    supportedLocales: ["en-GB", "uk-UA"],
  },
  taxonomy: [
    {
      key: "news",
      labels: {
        "en-GB": "News",
        "uk-UA": "Новини",
      },
    },
  ],
};
