import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SourceItemPersistenceError,
  markSourceFetchFailedWithStore,
  persistNormalizedSourceItemsWithStore,
} from "../dist/source-item-persistence.js";

const sourceId = "00000000-0000-0000-0000-000000000001";
const secondSourceId = "00000000-0000-0000-0000-000000000002";
const fetchedAt = new Date("2026-04-28T12:00:00.000Z");
const now = new Date("2026-04-28T12:05:00.000Z");

test("duplicate source GUID reruns update one source item instead of inserting", async () => {
  const store = createMemoryStore();
  const first = candidate({ externalGuid: "guid-1", externalUrl: "https://example.test/first" });
  const changed = candidate({
    externalGuid: "guid-1",
    externalUrl: "https://example.test/renamed",
    title: "Renamed Item",
    contentHash: "hash-renamed",
  });

  const firstResult = await persistNormalizedSourceItemsWithStore(store, [first], { now });
  const secondResult = await persistNormalizedSourceItemsWithStore(store, [changed], { now });

  assert.equal(firstResult.inserted, 1);
  assert.equal(secondResult.updated, 1);
  assert.equal(secondResult.matchedByGuid, 1);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].externalUrl, "https://example.test/renamed");
  assert.equal(store.items[0].title, "Renamed Item");
});

test("duplicate external URLs are matched globally without moving source ownership", async () => {
  const store = createMemoryStore({
    sources: [source(), source({ id: secondSourceId, configKey: "other_source" })],
  });

  await persistNormalizedSourceItemsWithStore(
    store,
    [candidate({ externalGuid: "source-a-guid", externalUrl: "https://example.test/shared" })],
    { now },
  );
  const result = await persistNormalizedSourceItemsWithStore(
    store,
    [
      candidate({
        sourceId: secondSourceId,
        source: source({ id: secondSourceId, configKey: "other_source" }),
        externalGuid: "source-b-guid",
        externalUrl: "https://example.test/shared",
        title: "Shared URL From Other Source",
      }),
    ],
    { now },
  );

  assert.equal(result.updated, 1);
  assert.equal(result.matchedByExternalUrl, 1);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].sourceId, sourceId);
  assert.equal(store.items[0].title, "Shared URL From Other Source");
});

test("duplicate source content hashes use lookup behavior without creating duplicates", async () => {
  const store = createMemoryStore();

  await persistNormalizedSourceItemsWithStore(
    store,
    [
      candidate({
        externalGuid: undefined,
        externalUrl: "https://example.test/original",
        contentHash: "same-hash",
      }),
    ],
    { now },
  );
  const result = await persistNormalizedSourceItemsWithStore(
    store,
    [
      candidate({
        externalGuid: undefined,
        externalUrl: "https://example.test/copy",
        contentHash: "same-hash",
      }),
    ],
    { now },
  );

  assert.equal(result.updated, 1);
  assert.equal(result.matchedByContentHash, 1);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].externalUrl, "https://example.test/copy");
});

test("same candidate rerun is unchanged, while content changes update in place", async () => {
  const store = createMemoryStore();
  const item = candidate({ externalGuid: "stable-guid" });

  const firstResult = await persistNormalizedSourceItemsWithStore(store, [item], { now });
  const rerunResult = await persistNormalizedSourceItemsWithStore(store, [item], { now });
  const changedResult = await persistNormalizedSourceItemsWithStore(
    store,
    [candidate({ externalGuid: "stable-guid", summary: "Updated summary" })],
    { now },
  );

  assert.equal(firstResult.inserted, 1);
  assert.equal(rerunResult.unchanged, 1);
  assert.equal(changedResult.updated, 1);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].summary, "Updated summary");
});

test("unknown source identity fails before inserting source items", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    () =>
      persistNormalizedSourceItemsWithStore(
        store,
        [
          candidate({
            sourceId: undefined,
            source: source({ id: undefined, configKey: "missing_source" }),
          }),
        ],
        { now },
      ),
    SourceItemPersistenceError,
  );
  assert.equal(store.items.length, 0);
});

test("updates preserve lifecycle status and error message on existing rows", async () => {
  const store = createMemoryStore({
    items: [
      sourceItem({
        status: "clustered",
        errorMessage: "keep this diagnostic",
        externalUrl: "https://example.test/existing",
      }),
    ],
  });

  const result = await persistNormalizedSourceItemsWithStore(
    store,
    [
      candidate({
        externalUrl: "https://example.test/existing",
        title: "Updated Existing Item",
      }),
    ],
    { now },
  );

  assert.equal(result.updated, 1);
  assert.equal(store.items[0].status, "clustered");
  assert.equal(store.items[0].errorMessage, "keep this diagnostic");
  assert.equal(store.items[0].title, "Updated Existing Item");
});

test("source metadata success and failure helpers update only operational fields", async () => {
  const store = createMemoryStore({
    sources: [
      source({
        lastFetchedAt: new Date("2026-04-27T00:00:00.000Z"),
        lastErrorAt: new Date("2026-04-27T01:00:00.000Z"),
        lastErrorMessage: "old failure",
      }),
    ],
  });

  const result = await persistNormalizedSourceItemsWithStore(store, [candidate()], { now });

  assert.equal(result.sourceMetadataUpdated, 1);
  assert.equal(store.sources[0].lastFetchedAt.toISOString(), fetchedAt.toISOString());
  assert.equal(store.sources[0].lastErrorAt, null);
  assert.equal(store.sources[0].lastErrorMessage, null);

  await markSourceFetchFailedWithStore(
    store,
    {
      source: source(),
      failedAt: now,
      errorMessage: "network failure with details",
    },
    { now },
  );

  assert.equal(store.sources[0].lastFetchedAt.toISOString(), fetchedAt.toISOString());
  assert.equal(store.sources[0].lastErrorAt.toISOString(), now.toISOString());
  assert.equal(store.sources[0].lastErrorMessage, "network failure with details");
});

function source(overrides = {}) {
  return {
    id: sourceId,
    configKey: "fixture_source",
    kind: "rss",
    feedUrl: "https://example.test/feed.xml",
    language: "en",
    isActive: true,
    ...overrides,
  };
}

function candidate(overrides = {}) {
  const sourceValue = overrides.source ?? source({ id: overrides.sourceId ?? sourceId });

  return {
    source: sourceValue,
    sourceId,
    externalGuid: "guid-default",
    externalUrl: "https://example.test/default",
    title: "Fixture Item",
    summary: "Fixture summary",
    contentText: "Fixture body",
    rawPayload: { fixture: true },
    contentHashInput: "fixture-hash-input",
    contentHash: "fixture-hash",
    language: "en",
    publishedAt: new Date("2026-04-28T11:00:00.000Z"),
    fetchedAt,
    ...overrides,
  };
}

function sourceItem(overrides = {}) {
  return {
    id: `item-${Math.random().toString(16).slice(2)}`,
    sourceId,
    externalGuid: null,
    externalUrl: "https://example.test/default",
    title: "Fixture Item",
    summary: "Fixture summary",
    contentText: "Fixture body",
    rawPayload: { fixture: true },
    contentHash: "fixture-hash",
    language: "en",
    publishedAt: new Date("2026-04-28T11:00:00.000Z"),
    fetchedAt,
    status: "normalized",
    normalizedTitle: "Fixture Item",
    normalizedSummary: "Fixture summary",
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMemoryStore(overrides = {}) {
  const sources = (overrides.sources ?? [source()]).map((row) => ({
    lastFetchedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    updatedAt: now,
    ...row,
  }));
  const items = (overrides.items ?? []).map((row) => sourceItem(row));
  let nextItemId = items.length + 1;

  const tx = {
    resolveSourceIdentity: async (itemCandidate) => {
      if (itemCandidate.sourceId !== undefined) {
        const rowById = sources.find((row) => row.id === itemCandidate.sourceId);

        if (rowById !== undefined) {
          return rowById;
        }
      }

      return tx.resolveSourceByIdentity(itemCandidate.source);
    },
    resolveSourceByIdentity: async (sourceIdentity) => {
      const row = sources.find((sourceRow) => sourceRow.configKey === sourceIdentity.configKey);

      if (row === undefined) {
        throw new SourceItemPersistenceError(
          `Cannot persist source items for unknown source config key "${sourceIdentity.configKey}".`,
        );
      }

      if (row.kind !== sourceIdentity.kind || row.feedUrl !== sourceIdentity.feedUrl) {
        throw new SourceItemPersistenceError(
          `Source identity mismatch for config key "${sourceIdentity.configKey}".`,
        );
      }

      return row;
    },
    findExistingSourceItemMatch: async (values) => {
      const matches = new Map();

      if (values.externalGuid !== null) {
        addMemoryMatches(
          matches,
          items.filter(
            (item) =>
              item.sourceId === values.sourceId && item.externalGuid === values.externalGuid,
          ),
          "guid",
        );
      }

      addMemoryMatches(
        matches,
        items.filter((item) => item.externalUrl === values.externalUrl),
        "external_url",
      );
      addMemoryMatches(
        matches,
        items.filter(
          (item) => item.sourceId === values.sourceId && item.contentHash === values.contentHash,
        ),
        "content_hash",
      );

      if (matches.size === 0) {
        return null;
      }

      if (matches.size > 1) {
        throw new SourceItemPersistenceError(
          `Source item identity conflict for external URL "${values.externalUrl}".`,
        );
      }

      return [...matches.values()][0];
    },
    insertSourceItem: async (values) => {
      const inserted = sourceItem({
        id: `item-${nextItemId}`,
        ...values,
        createdAt: now,
      });

      nextItemId += 1;
      items.push(inserted);

      return { id: inserted.id };
    },
    updateSourceItem: async (id, values) => {
      const index = items.findIndex((item) => item.id === id);

      assert.notEqual(index, -1);
      items[index] = { ...items[index], ...values };

      return { id };
    },
    markSourceFetchSucceeded: async (id, successFetchedAt, updatedAt) => {
      const row = sources.find((sourceRow) => sourceRow.id === id);

      assert.notEqual(row, undefined);
      row.lastFetchedAt = successFetchedAt;
      row.lastErrorAt = null;
      row.lastErrorMessage = null;
      row.updatedAt = updatedAt;
    },
    markSourceFetchFailed: async (id, failedAt, errorMessage, updatedAt) => {
      const row = sources.find((sourceRow) => sourceRow.id === id);

      assert.notEqual(row, undefined);
      row.lastErrorAt = failedAt;
      row.lastErrorMessage = errorMessage;
      row.updatedAt = updatedAt;
    },
  };

  return {
    sources,
    items,
    transaction: async (callback) => callback(tx),
  };
}

function addMemoryMatches(matches, rows, matchType) {
  rows.forEach((row) => {
    const existing = matches.get(row.id);

    if (existing === undefined) {
      matches.set(row.id, { row, matchTypes: [matchType] });
      return;
    }

    existing.matchTypes.push(matchType);
  });
}
