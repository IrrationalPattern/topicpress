import assert from "node:assert/strict";
import { test } from "node:test";

import { createDraftArticleForClusterWithStore } from "../dist/draft-creation.js";

const now = new Date("2026-04-30T14:00:00.000Z");
const cluster = {
  id: "cluster-1",
  status: "selected",
  canonicalTopic: "durable draft boundary",
};

test("creates review article, primary localization, and durable source lineage", async () => {
  const store = createMemoryDraftCreationStore();
  const draft = articleDraft({
    lineage: [
      lineage({ sourceItemId: "source-item-primary", sourceUrl: "https://example.test/primary" }),
      lineage({
        sourceItemId: "source-item-supporting",
        sourceUrl: "https://example.test/supporting",
        sourceTitle: "Supporting source",
        isPrimarySource: false,
      }),
    ],
    citations: [
      citation({ sourceItemId: "source-item-primary", url: "https://example.test/primary" }),
      citation({
        sourceItemId: "source-item-supporting",
        title: "Supporting source",
        url: "https://example.test/supporting",
        isPrimarySource: false,
      }),
    ],
    generation: {
      ...generation(),
      apiKey: "sk-secret-value-that-must-not-persist",
    },
  });

  const result = await createDraftArticleForClusterWithStore(
    store,
    { cluster, draft, generationInput: articleGenerationInput() },
    { now },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.sourceCount, 2);
  assert.equal(result.article.status, "review");
  assert.equal(result.article.primaryLocale, "en-GB");
  assert.equal(store.articles.length, 1);
  assert.equal(store.localizations.length, 1);
  assert.equal(store.localizations[0].title, draft.title);
  assert.equal(store.localizations[0].metaTitle, draft.metaTitle);
  assert.deepEqual(
    store.articleSources.map((source) => [source.sourceItemId, source.role]),
    [
      ["source-item-primary", "primary"],
      ["source-item-supporting", "supporting"],
    ],
  );
  assert.equal(store.articles[0].generationMetadata.apiKey, undefined);
  assert.equal(JSON.stringify(store.articles[0].generationMetadata).includes("sk-secret"), false);
});

test("returns an existing article for an already article-backed cluster", async () => {
  const existingArticle = article({ id: "article-existing", storyClusterId: cluster.id });
  const store = createMemoryDraftCreationStore({
    articles: [existingArticle],
  });

  const result = await createDraftArticleForClusterWithStore(
    store,
    { cluster, draft: articleDraft({ slug: "different-slug" }) },
    { now },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.article.id, "article-existing");
  assert.equal(store.articles.length, 1);
  assert.equal(store.localizations.length, 0);
  assert.equal(store.articleSources.length, 0);
});

test("fails visibly when the draft category is not active in the database", async () => {
  const store = createMemoryDraftCreationStore({
    categories: [category({ isActive: false })],
  });

  const result = await createDraftArticleForClusterWithStore(
    store,
    { cluster, draft: articleDraft() },
    { now },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_category");
  assert.equal(store.articles.length, 0);
  assert.equal(store.localizations.length, 0);
  assert.equal(store.articleSources.length, 0);
});

test("fails when draft lineage references source items outside the cluster", async () => {
  const store = createMemoryDraftCreationStore();

  const result = await createDraftArticleForClusterWithStore(
    store,
    {
      cluster,
      draft: articleDraft({
        lineage: [lineage({ sourceItemId: "source-item-missing" })],
      }),
    },
    { now },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "missing_source_items");
  assert.equal(store.articles.length, 0);
  assert.equal(store.localizations.length, 0);
  assert.equal(store.articleSources.length, 0);
});

test("fails before insert when the article slug already belongs to another article", async () => {
  const store = createMemoryDraftCreationStore({
    articles: [
      article({
        id: "article-conflict",
        storyClusterId: "cluster-other",
        slug: "durable-draft-boundary",
      }),
    ],
  });

  const result = await createDraftArticleForClusterWithStore(
    store,
    { cluster, draft: articleDraft() },
    { now },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "slug_conflict");
  assert.equal(store.articles.length, 1);
  assert.equal(store.localizations.length, 0);
  assert.equal(store.articleSources.length, 0);
});

function articleDraft(overrides = {}) {
  return {
    title: "Durable draft boundary",
    subtitle: "Persistence contract",
    excerpt: "A focused draft for persistence tests.",
    body: "A focused draft for persistence tests with enough body content for validation.",
    keywords: ["drafts", "persistence"],
    metaTitle: "Durable draft boundary | AI Landscape Brief",
    metaDescription: "A focused draft for persistence tests.",
    category: {
      key: "news",
      slug: "news",
      label: "News",
    },
    slug: "durable-draft-boundary",
    citations: [citation({ sourceItemId: "source-item-primary" })],
    lineage: [lineage({ sourceItemId: "source-item-primary" })],
    generation: generation(),
    ...overrides,
  };
}

function articleGenerationInput(overrides = {}) {
  return {
    locale: "en-GB",
    storyClusterId: cluster.id,
    primarySourceItemId: "source-item-primary",
    sourceItemIds: ["source-item-primary", "source-item-supporting"],
    sourceItems: [
      sourceInput({ sourceItemId: "source-item-primary", url: "https://example.test/primary" }),
      sourceInput({
        sourceItemId: "source-item-supporting",
        title: "Supporting source",
        url: "https://example.test/supporting",
      }),
    ],
    keywordHints: ["drafts", "persistence"],
    ...overrides,
  };
}

function sourceInput(overrides = {}) {
  return {
    sourceItemId: "source-item-primary",
    sourceName: "Fixture Source",
    title: "Primary source",
    url: "https://example.test/primary",
    ...overrides,
  };
}

function citation(overrides = {}) {
  return {
    sourceItemId: "source-item-primary",
    sourceName: "Fixture Source",
    title: "Primary source",
    url: "https://example.test/primary",
    isPrimarySource: true,
    ...overrides,
  };
}

function generation(overrides = {}) {
  return {
    generationRunId: "generation-run-1",
    provider: "fixture-provider",
    mode: "fixture",
    locale: "en-GB",
    generatedAt: now.toISOString(),
    promptHash: "1234abcd",
    inputHash: "abcd1234",
    manualReviewRequired: true,
    status: "review",
    fixtureKey: "draft-creation-test",
    ...overrides,
  };
}

function lineage(overrides = {}) {
  return {
    kind: "source_item",
    sourceItemId: "source-item-primary",
    storyClusterId: cluster.id,
    generationRunId: "generation-run-1",
    sourceName: "Fixture Source",
    sourceUrl: "https://example.test/primary",
    sourceTitle: "Primary source",
    fetchedAt: now.toISOString(),
    isPrimarySource: true,
    ...overrides,
  };
}

function category(overrides = {}) {
  return {
    id: "category-news",
    configKey: "news",
    slug: "news",
    isActive: true,
    ...overrides,
  };
}

function sourceItem(overrides = {}) {
  return {
    sourceItemId: "source-item-primary",
    externalUrl: "https://example.test/primary",
    title: "Primary source",
    isPrimary: true,
    ...overrides,
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    storyClusterId: "cluster-1",
    categoryId: "category-news",
    slug: "durable-draft-boundary",
    status: "review",
    primaryLocale: "en-GB",
    generationMetadata: generation(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMemoryDraftCreationStore(overrides = {}) {
  const categories = (overrides.categories ?? [category()]).map((row) => ({ ...row }));
  const clusterSourceItems = (
    overrides.clusterSourceItems ?? [
      sourceItem(),
      sourceItem({
        sourceItemId: "source-item-supporting",
        externalUrl: "https://example.test/supporting",
        title: "Supporting source",
        isPrimary: false,
      }),
    ]
  ).map((row) => ({ ...row }));
  const articles = (overrides.articles ?? []).map((row) => article(row));
  const localizations = (overrides.localizations ?? []).map((row) => ({ ...row }));
  const articleSources = (overrides.articleSources ?? []).map((row) => ({ ...row }));
  let nextArticleId = articles.length + 1;
  let nextLocalizationId = localizations.length + 1;

  const tx = {
    findArticleByStoryClusterId: async (storyClusterId) =>
      articles.find((row) => row.storyClusterId === storyClusterId) ?? null,
    findActiveCategoryByConfigKey: async (configKey) =>
      categories.find((row) => row.configKey === configKey && row.isActive) ?? null,
    listClusterSourceItems: async (storyClusterId) =>
      storyClusterId === cluster.id ? clusterSourceItems : [],
    findArticleBySlug: async (slug) => articles.find((row) => row.slug === slug) ?? null,
    findLocalizationByLocaleSlug: async (locale, slug) => {
      const localization = localizations.find((row) => row.locale === locale && row.slug === slug);

      if (localization === undefined) {
        return null;
      }

      return articles.find((row) => row.id === localization.articleId) ?? null;
    },
    insertArticle: async (values) => {
      assert.equal(
        articles.some((row) => row.storyClusterId === values.storyClusterId),
        false,
      );
      assert.equal(
        articles.some((row) => row.slug === values.slug),
        false,
      );

      const inserted = article({
        id: `article-${nextArticleId}`,
        ...values,
      });

      nextArticleId += 1;
      articles.push(inserted);

      return inserted;
    },
    insertArticleLocalization: async (values) => {
      assert.equal(
        localizations.some(
          (row) => row.articleId === values.articleId && row.locale === values.locale,
        ),
        false,
      );

      const inserted = {
        id: `article-localization-${nextLocalizationId}`,
        ...values,
      };

      nextLocalizationId += 1;
      localizations.push(inserted);

      return { id: inserted.id };
    },
    insertArticleSources: async (values) => {
      values.forEach((value) => {
        assert.equal(
          articleSources.some(
            (row) => row.articleId === value.articleId && row.sourceItemId === value.sourceItemId,
          ),
          false,
        );
        articleSources.push({ ...value });
      });
    },
  };

  return {
    categories,
    clusterSourceItems,
    articles,
    localizations,
    articleSources,
    transaction: async (callback) => callback(tx),
  };
}
