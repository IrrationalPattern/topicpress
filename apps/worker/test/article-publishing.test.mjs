import assert from "node:assert/strict";
import { test } from "node:test";

import { publishArticleWithStore } from "../dist/article-publishing.js";

const createdAt = new Date("2026-05-01T09:00:00.000Z");
const publishedAt = new Date("2026-05-01T10:30:00.000Z");
const originalPublishedAt = new Date("2026-04-30T12:00:00.000Z");

test("publishes a valid ready article and records a succeeded publish run", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready" })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1", operatorType: "local-editor" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "published");
  assert.equal(result.article.status, "published");
  assert.equal(result.article.publishedAt, publishedAt);
  assert.equal(store.articles[0].status, "published");
  assert.equal(store.articles[0].publishedAt, publishedAt);
  assert.equal(store.publishCalls, 1);
  assert.equal(store.pipelineRuns.length, 1);
  assert.equal(result.pipelineRun.status, "succeeded");
  assert.equal(result.pipelineRun.payload.outcome, "published");
  assert.equal(result.pipelineRun.payload.requestedTransition, "ready->published");
  assert.equal(result.pipelineRun.payload.articleId, "article-1");
  assert.equal(result.pipelineRun.payload.storyClusterId, "cluster-1");
  assert.equal(result.pipelineRun.payload.alreadyPublished, false);
});

test("rejects direct publish attempts from non-ready statuses without article mutation", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "review" })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_transition");
  assert.equal(store.articles[0].status, "review");
  assert.equal(store.articles[0].publishedAt, null);
  assert.equal(store.publishCalls, 0);
  assert.equal(result.pipelineRun.status, "failed");
  assert.equal(result.pipelineRun.payload.outcome, "invalid_transition");
  assert.equal(result.pipelineRun.payload.fromStatus, "review");
});

test("blocks ready articles with missing required fields and records validation visibility", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready" })],
    localizations: [localization({ metaTitle: "" })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "validation_failed");
  assert.deepEqual(
    result.error.issues.map((issue) => issue.code),
    ["missing_meta_title"],
  );
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.articles[0].publishedAt, null);
  assert.equal(store.publishCalls, 0);
  assert.equal(result.pipelineRun.status, "failed");
  assert.equal(result.pipelineRun.payload.outcome, "validation_failed");
  assert.deepEqual(
    result.pipelineRun.payload.validationErrors.map((issue) => issue.code),
    ["missing_meta_title"],
  );
});

test("publishes ready article without a generated hero image", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready", heroImageUrl: null })],
    heroImageCandidates: [],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "published");
  assert.equal(result.article.heroImageUrl, null);
  assert.equal(store.articles[0].status, "published");
  assert.equal(store.publishCalls, 1);
});

test("publishes ready article when generated image metadata is failed", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready", heroImageUrl: null })],
    heroImageCandidates: [heroImageCandidate({ status: "failed", publicUrl: null })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "published");
  assert.equal(store.publishCalls, 1);
});

test("allows ready publish when the generated candidate matches the public hero URL", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready" })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "published");
  assert.equal(result.article.heroImageUrl, "https://cdn.example.test/articles/article-1/candidate-1.webp");
});

test("treats already published articles as idempotent and preserves publishedAt", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "published", publishedAt: originalPublishedAt })],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "already_published");
  assert.equal(result.article.status, "published");
  assert.equal(result.article.publishedAt, originalPublishedAt);
  assert.equal(store.articles[0].publishedAt, originalPublishedAt);
  assert.equal(store.publishCalls, 0);
  assert.equal(result.pipelineRun.status, "succeeded");
  assert.equal(result.pipelineRun.payload.outcome, "already_published");
  assert.equal(result.pipelineRun.payload.alreadyPublished, true);
});

test("preserves already published idempotency for legacy articles without generated hero images", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "published", publishedAt: originalPublishedAt, heroImageUrl: null })],
    heroImageCandidates: [],
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "already_published");
  assert.equal(result.article.publishedAt, originalPublishedAt);
  assert.equal(store.publishCalls, 0);
});

test("records not_found publish attempts without unsafe article references", async () => {
  const store = createMemoryArticlePublishingStore({ articles: [] });

  const result = await publishArticleWithStore(
    store,
    { articleId: "missing-article" },
    { now: publishedAt },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "not_found");
  assert.equal(store.publishCalls, 0);
  assert.equal(result.pipelineRun.status, "failed");
  assert.equal(result.pipelineRun.payload.outcome, "not_found");
  assert.equal(store.pipelineRuns[0].articleId, null);
  assert.equal(store.pipelineRuns[0].storyClusterId, null);
});

test("does not partially mutate when the conditional publish update fails", async () => {
  const store = createMemoryArticlePublishingStore({
    articles: [article({ status: "ready" })],
    failPublish: true,
  });

  const result = await publishArticleWithStore(
    store,
    { articleId: "article-1" },
    { now: publishedAt },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "persistence_failed");
  assert.equal(store.articles[0].status, "ready");
  assert.equal(store.articles[0].publishedAt, null);
  assert.equal(store.publishCalls, 1);
  assert.equal(result.pipelineRun.status, "failed");
  assert.equal(result.pipelineRun.payload.outcome, "persistence_failed");
});

test("sanitizes operator and runtime failure payload text", async () => {
  const store = createMemoryArticlePublishingStore({
    findError: new Error("database secret=sk-secret-value-that-must-not-leak"),
  });

  const result = await publishArticleWithStore(
    store,
    {
      articleId: "article-1",
      operatorType: "local token=sk-secret-value-that-must-not-leak",
    },
    { now: publishedAt },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "persistence_failed");
  assert.equal(JSON.stringify(result.pipelineRun.payload).includes("sk-secret"), false);
  assert.equal(result.pipelineRun.errorMessage.includes("sk-secret"), false);
});

function createMemoryArticlePublishingStore(overrides = {}) {
  const categories = (overrides.categories ?? [category()]).map((row) => ({ ...row }));
  const storyClusters = (overrides.storyClusters ?? [storyCluster()]).map((row) => ({ ...row }));
  const articles = (overrides.articles ?? [article({ status: "ready" })]).map((row) => ({ ...row }));
  const localizations = (overrides.localizations ?? [localization()]).map((row) => ({ ...row }));
  const sourceLineage = (overrides.sourceLineage ?? [lineage()]).map((row) => ({ ...row }));
  const heroImageCandidates = (overrides.heroImageCandidates ?? [heroImageCandidate()]).map((row) => ({
    ...row,
  }));
  const pipelineRuns = [];
  let publishCalls = 0;
  let nextRunId = 1;

  const tx = {
    findArticleReviewById: async (articleId) => {
      if (overrides.findError !== undefined) {
        throw overrides.findError;
      }

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
    createPublishPipelineRun: async (input) => {
      const row = {
        id: `publish-run-${nextRunId}`,
        runType: "publish",
        status: "running",
        articleId: null,
        storyClusterId: null,
        attempt: input.attempt,
        startedAt: input.startedAt,
        finishedAt: null,
        errorMessage: null,
        payload: input.payload,
      };

      nextRunId += 1;
      pipelineRuns.push(row);

      return { id: row.id };
    },
    finishPublishPipelineRun: async (runId, input) => {
      const run = pipelineRuns.find((row) => row.id === runId);

      assert.ok(run);
      run.status = input.status;
      run.attempt = input.attempt;
      run.finishedAt = input.finishedAt;
      run.payload = input.payload;
      run.errorMessage = input.errorMessage ?? null;
      run.articleId = input.articleId ?? run.articleId;
      run.storyClusterId = input.storyClusterId ?? run.storyClusterId;
    },
    publishArticle: async (input) => {
      publishCalls += 1;

      if (overrides.failPublish === true) {
        return null;
      }

      const currentArticle = articles.find(
        (row) =>
          row.id === input.articleId &&
          row.status === input.expectedStatus &&
          row.publishedAt === null,
      );

      if (currentArticle === undefined) {
        return null;
      }

      currentArticle.status = "published";
      currentArticle.publishedAt = input.publishedAt;
      currentArticle.updatedAt = input.updatedAt;

      return {
        id: currentArticle.id,
        status: "published",
        publishedAt: currentArticle.publishedAt,
        updatedAt: currentArticle.updatedAt,
      };
    },
  };

  return {
    categories,
    storyClusters,
    articles,
    localizations,
    sourceLineage,
    heroImageCandidates,
    pipelineRuns,
    get publishCalls() {
      return publishCalls;
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
    status: "ready",
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
    createdAt,
    updatedAt: createdAt,
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
    generatedAt: createdAt,
    reviewedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
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
      publishedAt: createdAt,
      fetchedAt: createdAt,
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
