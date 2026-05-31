import assert from "node:assert/strict";
import { test } from "node:test";

import {
  listReviewableArticlesWithStore,
  loadArticleReviewWithStore,
  transitionArticleReviewStatusWithStore,
} from "../dist/article-review.js";

const now = new Date("2026-05-01T09:00:00.000Z");
const transitionTime = new Date("2026-05-01T10:30:00.000Z");

test("lists reviewable articles with editorial context and readiness state", async () => {
  const store = createMemoryArticleReviewStore();

  const articles = await listReviewableArticlesWithStore(store);

  assert.equal(articles.length, 1);
  assert.equal(articles[0].id, "article-1");
  assert.equal(articles[0].category.slug, "news");
  assert.equal(articles[0].primaryLocalization.title, "Review gated publishing");
  assert.equal(articles[0].sources.length, 1);
  assert.equal(articles[0].sources[0].sourceItem.externalUrl, "https://example.test/story");
  assert.equal(articles[0].heroImageCandidate.status, "generated");
  assert.equal(articles[0].heroImageCandidate.privatePreviewAvailable, false);
  assert.equal(articles[0].validation.ok, true);
});

test("loads a reviewable article by id and returns not_found for missing records", async () => {
  const store = createMemoryArticleReviewStore();

  const loaded = await loadArticleReviewWithStore(store, "article-1");
  const missing = await loadArticleReviewWithStore(store, "missing-article");

  assert.equal(loaded.ok, true);
  assert.equal(loaded.article.storyCluster.canonicalTopic, "Review workflow");
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, "not_found");
});

test("sanitizes existing review notes and generation metadata on read", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [
      article({
        reviewNotes: "Rejected with token=sk-secret-value-that-must-not-expose",
        generationMetadata: {
          provider: "fixture-provider",
          apiKey: "sk-secret-value-that-must-not-expose",
        },
      }),
    ],
  });

  const loaded = await loadArticleReviewWithStore(store, "article-1");

  assert.equal(loaded.ok, true);
  assert.equal(loaded.article.reviewNotes.includes("sk-secret"), false);
  assert.equal(JSON.stringify(loaded.article.generationMetadata).includes("sk-secret"), false);
});

test("removes internal source lineage sections from review body display", async () => {
  const store = createMemoryArticleReviewStore({
    localizations: [
      localization({
        body: [
          "A complete article body for review-gated publishing validation.",
          "",
          "## Source and lineage",
          "- Primary source: Source story. Source item id: source-item-1.",
          "- Story cluster id: cluster-1",
        ].join("\n"),
      }),
    ],
  });

  const loaded = await loadArticleReviewWithStore(store, "article-1");

  assert.equal(loaded.ok, true);
  assert.equal(
    loaded.article.primaryLocalization.body,
    "A complete article body for review-gated publishing validation.",
  );
  assert.equal(loaded.article.primaryLocalization.body.includes("Story cluster id"), false);
  assert.equal(loaded.article.primaryLocalization.body.includes("Source item id"), false);
});

test("moves a complete review article to ready without changing notes when none are supplied", async () => {
  const store = createMemoryArticleReviewStore();

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, true);
  assert.equal(result.article.status, "ready");
  assert.equal(result.article.reviewNotes, null);
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.articles[0].updatedAt, transitionTime);
  assert.equal(store.updateCalls, 1);
});

test("allows review to ready when no generated hero image exists", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [article({ heroImageUrl: null })],
    heroImageCandidates: [],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, true);
  assert.equal(result.article.status, "ready");
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.updateCalls, 1);
});

test("allows review to ready when generated image metadata is failed", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [article({ heroImageUrl: null })],
    heroImageCandidates: [heroImageCandidate({ status: "failed", publicUrl: null })],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, true);
  assert.equal(result.article.status, "ready");
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.updateCalls, 1);
});

test("moves draft articles into review without applying ready validation gates", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [article({ status: "draft" })],
    localizations: [localization({ metaDescription: "" })],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "review", reviewNote: "Ready for human review" },
    { now: transitionTime },
  );

  assert.equal(result.ok, true);
  assert.equal(result.article.status, "review");
  assert.equal(result.article.reviewNotes, "Ready for human review");
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.updateCalls, 1);
});

test("blocks review to ready when required primary localization fields are missing", async () => {
  const store = createMemoryArticleReviewStore({
    localizations: [localization({ metaDescription: "" })],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "validation_failed");
  assert.deepEqual(
    result.error.issues.map((issue) => issue.code),
    ["missing_meta_description"],
  );
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.updateCalls, 0);
});

test("blocks review to ready when source lineage has only supporting roles", async () => {
  const store = createMemoryArticleReviewStore({
    sourceLineage: [lineage({ role: "supporting", isClusterPrimary: false })],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "validation_failed");
  assert.deepEqual(
    result.error.issues.map((issue) => issue.code),
    ["missing_primary_source_lineage"],
  );
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.updateCalls, 0);
});

test("requires a reason before marking review articles failed", async () => {
  const store = createMemoryArticleReviewStore();

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "failed" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "missing_reason");
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.articles[0].reviewNotes, null);
  assert.equal(store.updateCalls, 0);
});

test("marks failed articles with sanitized non-secret review notes", async () => {
  const store = createMemoryArticleReviewStore();

  const result = await transitionArticleReviewStatusWithStore(
    store,
    {
      articleId: "article-1",
      toStatus: "failed",
      reason: "Rejected after review\napi_key=sk-secret-value-that-must-not-persist",
    },
    { now: transitionTime },
  );

  assert.equal(result.ok, true);
  assert.equal(result.article.status, "failed");
  assert.match(result.article.reviewNotes, /Rejected after review/);
  assert.equal(result.article.reviewNotes.includes("sk-secret"), false);
  assert.equal(store.articles[0].reviewNotes.includes("sk-secret"), false);
});

test("rejects direct publish bypass attempts without partial mutation", async () => {
  const store = createMemoryArticleReviewStore();

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "published", reviewNote: "publish now" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_transition");
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.articles[0].reviewNotes, null);
  assert.equal(store.updateCalls, 0);
});

test("rejects ready to published because publish execution belongs to BE-402", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [article({ status: "ready" })],
  });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "published", reviewNote: "publish now" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_transition");
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.updateCalls, 0);
});

test("reports persistence failure when the conditional status update loses the race", async () => {
  const store = createMemoryArticleReviewStore({ failUpdates: true });

  const result = await transitionArticleReviewStatusWithStore(
    store,
    { articleId: "article-1", toStatus: "ready" },
    { now: transitionTime },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "persistence_failed");
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.updateCalls, 1);
});

test("does not leak storage identifiers through article review DTOs", async () => {
  const store = createMemoryArticleReviewStore({
    articles: [article({ heroImageUrl: null })],
    heroImageCandidates: [heroImageCandidate({ status: "generated" })],
  });

  const loaded = await loadArticleReviewWithStore(store, "article-1");

  assert.equal(loaded.ok, true);
  assert.equal(loaded.article.heroImageCandidate.privatePreviewAvailable, false);
  assert.equal(JSON.stringify(loaded.article).includes("article-hero-images"), false);
  assert.equal(JSON.stringify(loaded.article).includes("storagePath"), false);
});

function createMemoryArticleReviewStore(overrides = {}) {
  const categories = (overrides.categories ?? [category()]).map((row) => ({ ...row }));
  const storyClusters = (overrides.storyClusters ?? [storyCluster()]).map((row) => ({ ...row }));
  const articles = (overrides.articles ?? [article()]).map((row) => ({ ...row }));
  const localizations = (overrides.localizations ?? [localization()]).map((row) => ({ ...row }));
  const sourceLineage = (overrides.sourceLineage ?? [lineage()]).map((row) => ({ ...row }));
  const heroImageCandidates = (overrides.heroImageCandidates ?? [heroImageCandidate()]).map((row) => ({
    ...row,
  }));
  let updateCalls = 0;

  const tx = {
    listReviewableArticleIds: async (options) => {
      const statuses = new Set(options.statuses ?? ["draft", "review", "ready"]);
      return articles
        .filter((row) => statuses.has(row.status))
        .slice(0, options.limit ?? articles.length)
        .map((row) => row.id);
    },
    findArticleReviewById: async (articleId) => {
      const currentArticle = articles.find((row) => row.id === articleId);

      if (currentArticle === undefined) {
        return null;
      }

      const currentCategory = categories.find((row) => row.id === currentArticle.categoryId);
      const currentStoryCluster = storyClusters.find(
        (row) => row.id === currentArticle.storyClusterId,
      );

      assert.ok(currentCategory);
      assert.ok(currentStoryCluster);

      return {
        article: { ...currentArticle },
        category: { ...currentCategory },
        storyCluster: { ...currentStoryCluster },
        localizations: localizations
          .filter((row) => row.articleId === articleId)
          .map(({ articleId: _articleId, ...row }) => ({ ...row })),
        sources: sourceLineage
          .filter((row) => row.articleId === articleId)
          .map(({ articleId: _articleId, ...row }) => ({ ...row })),
        heroImageCandidate: heroImageCandidates.find((row) => row.articleId === articleId) ?? null,
        articleIdsWithSameSlug: articles
          .filter((row) => row.slug === currentArticle.slug)
          .map((row) => row.id),
        articleIdsWithSameStoryCluster: articles
          .filter((row) => row.storyClusterId === currentArticle.storyClusterId)
          .map((row) => row.id),
      };
    },
    updateArticleStatus: async (input) => {
      updateCalls += 1;

      if (overrides.failUpdates === true) {
        return null;
      }

      const currentArticle = articles.find(
        (row) => row.id === input.articleId && row.status === input.expectedStatus,
      );

      if (currentArticle === undefined) {
        return null;
      }

      currentArticle.status = input.toStatus;
      currentArticle.updatedAt = input.updatedAt;

      if (input.reviewNotes !== undefined) {
        currentArticle.reviewNotes = input.reviewNotes;
      }

      return { id: currentArticle.id };
    },
  };

  return {
    categories,
    storyClusters,
    articles,
    localizations,
    sourceLineage,
    heroImageCandidates,
    get updateCalls() {
      return updateCalls;
    },
    transaction: async (callback) => callback(tx),
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    storyClusterId: "cluster-1",
    categoryId: "category-news",
    slug: "review-gated-publishing",
    status: "review",
    heroImageUrl: "https://cdn.example.test/articles/article-1/candidate-1.webp",
    primaryLocale: "en-GB",
    publishedAt: null,
    reviewNotes: null,
    generationMetadata: {
      generationRunId: "generation-run-1",
      provider: "fixture-provider",
      mode: "fixture",
      locale: "en-GB",
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function heroImageCandidate(overrides = {}) {
  return {
    id: "candidate-1",
    articleId: "article-1",
    status: "generated",
    provider: "openai",
    model: "fixture-image-model",
    prompt: "System:\nCreate one review-gated hero image candidate.",
    promptHash: "fixture-prompt-hash",
    stylePolicy: "editorial_illustration",
    storageBucket: "article-hero-images",
    storagePath: "articles/article-1/candidate-1.webp",
    contentType: "image/webp",
    width: 1536,
    height: 1024,
    sizeBytes: 5,
    publicUrl: "https://cdn.example.test/articles/article-1/candidate-1.webp",
    reviewNotes: "Approved.",
    generationMetadata: {},
    generatedAt: now,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
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
    ...overrides,
  };
}

function storyCluster(overrides = {}) {
  return {
    id: "cluster-1",
    canonicalTopic: "Review workflow",
    summary: "Manual review before publication",
    status: "processed",
    ...overrides,
  };
}

function localization(overrides = {}) {
  return {
    id: "localization-1",
    articleId: "article-1",
    locale: "en-GB",
    slug: "review-gated-publishing",
    title: "Review gated publishing",
    subtitle: "Manual approval",
    excerpt: "A concise summary for review.",
    body: "A complete article body for review-gated publishing validation.",
    keywords: ["review", "publishing"],
    metaTitle: "Review gated publishing | AI Landscape Brief",
    metaDescription: "A concise SEO description for review.",
    isMachineTranslated: false,
    ...overrides,
  };
}

function lineage(overrides = {}) {
  return {
    articleId: "article-1",
    articleSourceId: "article-source-1",
    role: "primary",
    isClusterPrimary: true,
    sourceItem: {
      id: "source-item-1",
      externalUrl: "https://example.test/story",
      title: "Source story",
      summary: "Source summary",
      contentText: "Source content",
      language: "en",
      publishedAt: now,
      fetchedAt: now,
    },
    source: {
      id: "source-1",
      configKey: "source",
      slug: "source",
      name: "Source",
      kind: "rss",
      isActive: true,
    },
    ...overrides,
  };
}
