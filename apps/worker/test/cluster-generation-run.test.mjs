import assert from "node:assert/strict";
import { test } from "node:test";

import { FixtureDraftProvider } from "@topicpress/ai";

import { runClusterGenerationWithStores } from "../dist/cluster-generation-run.js";

const now = new Date("2026-05-01T09:00:00.000Z");

test("runs clustering, generates fixture draft, persists article, and records visibility", async () => {
  const stores = createMemoryStores();
  const result = await runClusterGenerationWithStores(stores, { now, limit: 5 });

  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.outcome, "success");
  assert.equal(result.summary.clustering.candidates, 0);
  assert.equal(result.summary.generation.eligible, 1);
  assert.equal(result.summary.generation.created, 1);
  assert.equal(stores.articles.length, 1);
  assert.equal(stores.articleSources.length, 2);

  const clusterRun = stores.pipelineRuns.find((run) => run.runType === "cluster");
  const aggregateGenerateRun = stores.pipelineRuns.find(
    (run) => run.runType === "generate" && run.storyClusterId === null,
  );
  const perClusterRun = stores.pipelineRuns.find(
    (run) => run.runType === "generate" && run.storyClusterId === "cluster-1",
  );

  assert.equal(clusterRun.status, "succeeded");
  assert.equal(clusterRun.payload.outcome, "succeeded");
  assert.equal(aggregateGenerateRun.status, "succeeded");
  assert.deepEqual(aggregateGenerateRun.payload.clusterRunIds, [perClusterRun.id]);
  assert.equal(perClusterRun.status, "succeeded");
  assert.equal(perClusterRun.articleId, stores.articles[0].id);
  assert.equal(perClusterRun.payload.generation.mode, "fixture");
});

test("rerun is idempotent when a cluster already has an article", async () => {
  const stores = createMemoryStores();
  const firstResult = await runClusterGenerationWithStores(stores, { now });
  const secondResult = await runClusterGenerationWithStores(stores, { now });

  assert.equal(firstResult.summary.generation.created, 1);
  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.summary.outcome, "no_eligible_clusters");
  assert.equal(secondResult.summary.generation.eligible, 0);
  assert.equal(stores.articles.length, 1);
  assert.equal(stores.pipelineRuns.filter((run) => run.storyClusterId === "cluster-1").length, 1);
});

test("records validation failure visibility for malformed provider output", async () => {
  const stores = createMemoryStores();
  const invalidProvider = {
    id: "invalid-provider",
    mode: "fixture",
    generateDraft: async () => ({ title: "" }),
  };
  const result = await runClusterGenerationWithStores(stores, {
    now,
    provider: invalidProvider,
  });
  const clusterRun = stores.pipelineRuns.find((run) => run.storyClusterId === "cluster-1");

  assert.equal(result.ok, false);
  assert.equal(result.summary.outcome, "failed");
  assert.equal(result.summary.failures.length, 1);
  assert.equal(result.summary.failures[0].errorClass, "validation_failed");
  assert.equal(clusterRun.status, "failed");
  assert.equal(clusterRun.payload.errorClass, "validation_failed");
  assert.equal(clusterRun.payload.issues.length > 0, true);
  assert.equal(stores.articles.length, 0);
});

test("partial generation failure does not block unrelated eligible clusters", async () => {
  const stores = createMemoryStores({
    clusters: [cluster(), cluster({ id: "cluster-2", canonicalTopic: "second model release" })],
    sourceItemsByCluster: {
      "cluster-1": sourceItemsForCluster("cluster-1"),
      "cluster-2": sourceItemsForCluster("cluster-2", {
        sourceItemId: "source-item-2-primary",
        externalUrl: "https://example.test/second-primary",
        title: "Second primary source",
      }),
    },
  });
  const fixtureProvider = new FixtureDraftProvider();
  const provider = {
    id: "partial-provider",
    mode: "fixture",
    generateDraft: async (request) => {
      if (request.input.storyClusterId === "cluster-2") {
        throw new Error("Provider unavailable for cluster-2");
      }

      return fixtureProvider.generateDraft(request);
    },
  };
  const result = await runClusterGenerationWithStores(stores, { now, provider });

  assert.equal(result.ok, true);
  assert.equal(result.summary.outcome, "partial_success");
  assert.equal(result.summary.generation.created, 1);
  assert.equal(result.summary.generation.failed, 1);
  assert.equal(result.summary.failures[0].clusterId, "cluster-2");
  assert.equal(result.summary.failures[0].errorClass, "provider_failed");
  assert.equal(stores.articles.length, 1);
  assert.equal(stores.pipelineRuns.find((run) => run.storyClusterId === "cluster-2").status, "failed");
});

test("records cluster aggregate failure when clustering fails before generation", async () => {
  const stores = createMemoryStores({
    clusteringStore: {
      transaction: async () => {
        throw new Error("clustering transaction unavailable");
      },
    },
  });
  const result = await runClusterGenerationWithStores(stores, { now });

  assert.equal(result.ok, false);
  assert.equal(result.summary.outcome, "cluster_failed");
  assert.equal(stores.pipelineRuns.length, 1);
  assert.equal(stores.pipelineRuns[0].runType, "cluster");
  assert.equal(stores.pipelineRuns[0].status, "failed");
  assert.equal(stores.pipelineRuns[0].errorMessage, "clustering transaction unavailable");
});

function createMemoryStores(overrides = {}) {
  const clusters = (overrides.clusters ?? [cluster()]).map((row) => ({ ...row }));
  const sourceItemsByCluster = new Map(
    Object.entries(overrides.sourceItemsByCluster ?? { "cluster-1": sourceItemsForCluster("cluster-1") }).map(
      ([clusterId, rows]) => [clusterId, rows.map((row) => ({ ...row }))],
    ),
  );
  const categories = (overrides.categories ?? [category(), modelReleaseCategory()]).map((row) => ({
    ...row,
  }));
  const articles = (overrides.articles ?? []).map((row) => article(row));
  const localizations = [];
  const articleSources = [];
  const pipelineRuns = [];
  let nextRunId = 1;
  let nextArticleId = articles.length + 1;
  let nextLocalizationId = 1;

  const runStore = {
    listGenerationCandidates: async (limit) => {
      const rows = clusters.filter(
        (row) =>
          (row.status === "open" || row.status === "selected") &&
          !articles.some((articleRow) => articleRow.storyClusterId === row.id),
      );

      return limit === undefined ? rows : rows.slice(0, limit);
    },
    listClusterSourceItems: async (storyClusterId) => sourceItemsByCluster.get(storyClusterId) ?? [],
    createPipelineRun: async (input) => {
      const row = {
        id: `run-${nextRunId}`,
        runType: input.runType,
        status: "running",
        storyClusterId: input.storyClusterId ?? null,
        articleId: null,
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
    finishPipelineRun: async (id, input) => {
      const row = pipelineRuns.find((run) => run.id === id);

      assert.notEqual(row, undefined);
      row.status = input.status;
      row.attempt = input.attempt;
      row.finishedAt = input.finishedAt;
      row.errorMessage = input.errorMessage ?? null;
      row.payload = input.payload;
      row.articleId = input.articleId ?? row.articleId;
    },
  };

  const draftTx = {
    findArticleByStoryClusterId: async (storyClusterId) =>
      articles.find((row) => row.storyClusterId === storyClusterId) ?? null,
    findActiveCategoryByConfigKey: async (configKey) =>
      categories.find((row) => row.configKey === configKey && row.isActive) ?? null,
    listClusterSourceItems: async (storyClusterId) =>
      (sourceItemsByCluster.get(storyClusterId) ?? []).map((row) => ({
        sourceItemId: row.sourceItemId,
        externalUrl: row.externalUrl,
        title: row.title,
        isPrimary: row.isPrimary,
      })),
    findArticleBySlug: async (slug) => articles.find((row) => row.slug === slug) ?? null,
    findLocalizationByLocaleSlug: async (locale, slug) => {
      const localization = localizations.find(
        (row) => row.locale === locale && row.slug === slug,
      );

      return localization === undefined
        ? null
        : articles.find((row) => row.id === localization.articleId) ?? null;
    },
    insertArticle: async (values) => {
      const inserted = article({ id: `article-${nextArticleId}`, ...values });

      nextArticleId += 1;
      articles.push(inserted);

      return inserted;
    },
    insertArticleLocalization: async (values) => {
      const inserted = { id: `localization-${nextLocalizationId}`, ...values };

      nextLocalizationId += 1;
      localizations.push(inserted);

      return { id: inserted.id };
    },
    insertArticleSources: async (values) => {
      values.forEach((value) => articleSources.push({ ...value }));
    },
  };

  return {
    clusteringStore: overrides.clusteringStore ?? noOpClusteringStore(),
    draftCreationStore: {
      transaction: async (callback) => callback(draftTx),
    },
    runStore,
    clusters,
    articles,
    localizations,
    articleSources,
    pipelineRuns,
  };
}

function noOpClusteringStore() {
  return {
    transaction: async (callback) =>
      callback({
        listClusterableSourceItems: async () => [],
      }),
  };
}

function cluster(overrides = {}) {
  return {
    id: "cluster-1",
    status: "selected",
    canonicalTopic: "fixture model release",
    ...overrides,
  };
}

function sourceItemsForCluster(clusterId, overrides = {}) {
  return [
    sourceItem({ storyClusterId: clusterId, ...overrides }),
    sourceItem({
      storyClusterId: clusterId,
      sourceItemId: `${clusterId}-supporting`,
      externalUrl: `https://example.test/${clusterId}/supporting`,
      title: "Supporting source",
      isPrimary: false,
    }),
  ];
}

function sourceItem(overrides = {}) {
  return {
    storyClusterId: "cluster-1",
    sourceItemId: "source-item-primary",
    sourceName: "Fixture Source",
    title: "Fixture model release reaches developers",
    externalUrl: "https://example.test/primary",
    summary: "A source summary about a fixture model release.",
    contentText: "A longer source body about a fixture model release reaching developers.",
    publishedAt: now,
    isPrimary: true,
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

function modelReleaseCategory(overrides = {}) {
  return {
    id: "category-model-releases",
    configKey: "model_releases",
    slug: "model-releases",
    isActive: true,
    ...overrides,
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    storyClusterId: "cluster-1",
    categoryId: "category-news",
    slug: "fixture-model-release-reaches-developers",
    status: "review",
    primaryLocale: "en-GB",
    generationMetadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
