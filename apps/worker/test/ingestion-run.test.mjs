import assert from "node:assert/strict";
import { test } from "node:test";

import { SourceItemPersistenceError } from "../dist/source-item-persistence.js";
import { defaultIngestionPolicy } from "../dist/ingestion-policy.js";
import { runIngestionWithStore } from "../dist/ingestion-run.js";

const now = new Date("2026-04-29T08:00:00.000Z");
const noWaitPolicy = {
  ...defaultIngestionPolicy,
  retryBackoffMs: [0, 0],
};

test("orchestrates active source ingestion, persistence, summary, and pipeline visibility", async () => {
  const store = createMemoryRunStore({ sources: [source()] });
  const result = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: httpClient({
      "https://example.test/feed.xml": rssFeed([
        rssItem(
          "fresh",
          "Fresh Item",
          "https://example.test/fresh",
          "Tue, 28 Apr 2026 10:00:00 GMT",
        ),
        rssItem("old", "Old Item", "https://example.test/old", "Mon, 01 Jan 2024 10:00:00 GMT"),
      ]),
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.outcome, "success");
  assert.deepEqual(result.summary.sources, {
    active: 1,
    eligible: 1,
    attempted: 1,
    succeeded: 1,
    failed: 0,
    skippedByRecrawl: 0,
  });
  assert.equal(result.summary.items.candidates, 1);
  assert.equal(result.summary.items.inserted, 1);
  assert.equal(result.summary.items.skippedByFreshness, 1);
  assert.equal(store.persistedCandidates.length, 1);
  assert.equal(store.sources[0].lastFetchedAt.toISOString(), now.toISOString());
  assert.equal(store.sources[0].lastErrorAt, null);

  const aggregateRun = store.pipelineRuns.find((run) => run.sourceId === null);
  const sourceRun = store.pipelineRuns.find((run) => run.sourceId === sourceId);

  assert.equal(aggregateRun.status, "succeeded");
  assert.equal(aggregateRun.payload.outcome, "success");
  assert.deepEqual(aggregateRun.payload.sourceRunIds, [sourceRun.id]);
  assert.equal(sourceRun.status, "succeeded");
  assert.equal(sourceRun.payload.persistence.inserted, 1);
});

test("one source failure does not block unrelated active sources", async () => {
  const badSource = source({
    id: secondSourceId,
    configKey: "bad_source",
    feedUrl: "https://example.test/bad.xml",
  });
  const store = createMemoryRunStore({ sources: [badSource, source()] });
  const result = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: httpClient({
      "https://example.test/bad.xml": "<rss><channel></channel></rss>",
      "https://example.test/feed.xml": rssFeed([
        rssItem("good", "Good Item", "https://example.test/good"),
      ]),
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.outcome, "partial_success");
  assert.equal(result.summary.sources.attempted, 2);
  assert.equal(result.summary.sources.succeeded, 1);
  assert.equal(result.summary.sources.failed, 1);
  assert.equal(result.summary.failures.length, 1);
  assert.equal(result.summary.failures[0].configKey, "bad_source");
  assert.equal(store.persistedCandidates.length, 1);
  assert.equal(
    store.sources.find((row) => row.id === secondSourceId).lastErrorAt.toISOString(),
    now.toISOString(),
  );
  assert.equal(store.pipelineRuns.filter((run) => run.sourceId !== null).length, 2);
});

test("all eligible sources failing fails the aggregate run and exit semantics", async () => {
  const store = createMemoryRunStore({
    sources: [
      source({ id: sourceId, configKey: "bad_one", feedUrl: "https://example.test/bad-one.xml" }),
      source({
        id: secondSourceId,
        configKey: "bad_two",
        feedUrl: "https://example.test/bad-two.xml",
      }),
    ],
  });
  const result = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: httpClient({
      "https://example.test/bad-one.xml": "<rss><channel></channel></rss>",
      "https://example.test/bad-two.xml": "<rss><channel></channel></rss>",
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.equal(result.summary.status, "failed");
  assert.equal(result.summary.outcome, "failed");
  assert.equal(result.summary.sources.attempted, 2);
  assert.equal(result.summary.sources.failed, 2);
  assert.equal(
    store.pipelineRuns.find((run) => run.sourceId === null).errorMessage,
    "All eligible sources failed.",
  );
});

test("no active sources is a failed precondition run", async () => {
  const store = createMemoryRunStore({ sources: [] });
  const result = await runIngestionWithStore(store, { now, policy: noWaitPolicy });

  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.equal(result.summary.outcome, "no_active_sources");
  assert.equal(store.pipelineRuns[0].status, "failed");
  assert.equal(store.pipelineRuns[0].errorMessage, "No active sources are configured.");
});

test("recrawl policy skips recent sources unless forced", async () => {
  let fetchCount = 0;
  const store = createMemoryRunStore({
    sources: [
      source({
        lastFetchedAt: new Date("2026-04-29T07:30:00.000Z"),
      }),
    ],
  });
  const result = await runIngestionWithStore(store, {
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;
      return {
        status: 200,
        body: rssFeed([rssItem("fresh", "Fresh", "https://example.test/fresh")]),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.outcome, "no_eligible_sources");
  assert.equal(result.summary.sources.skippedByRecrawl, 1);
  assert.equal(fetchCount, 0);
  assert.equal(store.persistedCandidates.length, 0);
  assert.equal(
    store.pipelineRuns.find((run) => run.sourceId === sourceId).payload.outcome,
    "skipped",
  );

  const forcedResult = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;
      return {
        status: 200,
        body: rssFeed([rssItem("forced", "Forced", "https://example.test/forced")]),
      };
    },
  });

  assert.equal(forcedResult.summary.outcome, "success");
  assert.equal(fetchCount, 1);
});

test("source failure visibility includes pipeline payload, source error metadata, and degradation", async () => {
  const store = createMemoryRunStore({
    sources: [source()],
    pipelineRuns: [
      historyRun({
        id: "previous-run-1",
        sourceId,
        status: "failed",
        finishedAt: new Date("2026-04-29T07:00:00.000Z"),
      }),
      historyRun({
        id: "previous-run-2",
        sourceId,
        status: "failed",
        finishedAt: new Date("2026-04-29T06:00:00.000Z"),
      }),
    ],
  });
  const result = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: httpClient({
      "https://example.test/feed.xml": "<rss><channel></channel></rss>",
    }),
  });
  const sourceRun = store.pipelineRuns.find((run) => run.id === result.summary.sourceRuns[0].runId);

  assert.equal(result.ok, false);
  assert.equal(result.summary.failures[0].degraded, true);
  assert.equal(result.summary.degradedSources.length, 1);
  assert.equal(store.sources[0].lastErrorAt.toISOString(), now.toISOString());
  assert.equal(sourceRun.status, "failed");
  assert.equal(sourceRun.errorMessage, result.summary.failures[0].errorMessage);
  assert.equal(sourceRun.payload.degraded, true);
  assert.equal(sourceRun.payload.errorClass, "parser");
});

test("persistence failures are source-level failures with item conflict counts", async () => {
  const store = createMemoryRunStore({
    sources: [source()],
    persistSourceItems: async () => {
      throw new SourceItemPersistenceError("Source item identity conflict for external URL");
    },
  });
  const result = await runIngestionWithStore(store, {
    force: true,
    now,
    policy: noWaitPolicy,
    httpClient: httpClient({
      "https://example.test/feed.xml": rssFeed([
        rssItem("fresh", "Fresh Item", "https://example.test/fresh"),
      ]),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.summary.items.candidates, 1);
  assert.equal(result.summary.items.conflicts, 1);
  assert.equal(result.summary.failures[0].errorClass, "persistence");
  assert.equal(store.pipelineRuns.find((run) => run.sourceId === sourceId).payload.candidates, 1);
});

const sourceId = "00000000-0000-0000-0000-000000000001";
const secondSourceId = "00000000-0000-0000-0000-000000000002";

function source(overrides = {}) {
  return {
    id: sourceId,
    configKey: "fixture_source",
    name: "Fixture Source",
    kind: "rss",
    feedUrl: "https://example.test/feed.xml",
    language: "en",
    isActive: true,
    lastFetchedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    ...overrides,
  };
}

function httpClient(responses) {
  return async (url) => {
    const body = responses[url];

    if (body === undefined) {
      throw new Error(`Unexpected URL ${url}`);
    }

    return { status: 200, body };
  };
}

function rssFeed(items) {
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items.join("")}</channel></rss>`;
}

function rssItem(guid, title, link, publishedAt = "Tue, 28 Apr 2026 10:00:00 GMT") {
  return `<item><guid>${guid}</guid><title>${title}</title><link>${link}</link><pubDate>${publishedAt}</pubDate></item>`;
}

function historyRun(overrides = {}) {
  return {
    id: "history-run",
    sourceId,
    status: "failed",
    startedAt: now,
    finishedAt: now,
    errorMessage: "previous failure",
    payload: {},
    createdAt: overrides.finishedAt ?? now,
    ...overrides,
  };
}

function createMemoryRunStore(overrides = {}) {
  const sources = (overrides.sources ?? [source()]).map((row) => ({ ...row }));
  const pipelineRuns = (overrides.pipelineRuns ?? []).map((row) => ({ ...row }));
  const persistedCandidates = [];
  let nextRunId = pipelineRuns.length + 1;

  const store = {
    sources,
    pipelineRuns,
    persistedCandidates,
    listActiveSources: async () => sources.filter((row) => row.isActive),
    createPipelineRun: async (input) => {
      const row = {
        id: `run-${nextRunId}`,
        sourceId: input.sourceId,
        status: "running",
        attempt: input.attempt,
        startedAt: input.startedAt,
        finishedAt: null,
        errorMessage: null,
        payload: input.payload,
        createdAt: input.startedAt,
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
    },
    persistSourceItems:
      overrides.persistSourceItems ??
      (async (candidates) => {
        persistedCandidates.push(...candidates);

        candidates.forEach((candidate) => {
          const row = sources.find(
            (sourceRow) => sourceRow.configKey === candidate.source.configKey,
          );

          assert.notEqual(row, undefined);
          row.lastFetchedAt = candidate.fetchedAt;
          row.lastErrorAt = null;
          row.lastErrorMessage = null;
        });

        return {
          candidates: candidates.length,
          inserted: candidates.length,
          updated: 0,
          unchanged: 0,
          matchedByGuid: 0,
          matchedByExternalUrl: 0,
          matchedByContentHash: 0,
          sourceMetadataUpdated: candidates.length > 0 ? 1 : 0,
        };
      }),
    markSourceFetchSucceeded: async (sourceIdentity, fetchedAt) => {
      const row = sources.find((sourceRow) => sourceRow.configKey === sourceIdentity.configKey);

      assert.notEqual(row, undefined);
      row.lastFetchedAt = fetchedAt;
      row.lastErrorAt = null;
      row.lastErrorMessage = null;
    },
    markSourceFetchFailed: async (sourceIdentity, failedAt, errorMessage) => {
      const row = sources.find((sourceRow) => sourceRow.configKey === sourceIdentity.configKey);

      assert.notEqual(row, undefined);
      row.lastErrorAt = failedAt;
      row.lastErrorMessage = errorMessage;
    },
    listRecentSourceRuns: async (id, limit) =>
      pipelineRuns
        .filter((run) => run.sourceId === id)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit)
        .map((run) => ({
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          errorMessage: run.errorMessage,
        })),
  };

  return store;
}
