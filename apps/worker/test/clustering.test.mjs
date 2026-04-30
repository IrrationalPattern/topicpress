import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCanonicalTopic, clusterSourceItemsWithStore } from "../dist/clustering.js";

const now = new Date("2026-04-30T10:00:00.000Z");
const fetchedAt = new Date("2026-04-30T09:00:00.000Z");

test("clusters source items by deterministic canonical title and selects one primary", async () => {
  const store = createMemoryClusteringStore({
    sourceItems: [
      sourceItem({
        id: "item-newer",
        title: "Markets rally after rate decision!",
        normalizedTitle: "Markets rally after rate decision",
        publishedAt: new Date("2026-04-30T08:30:00.000Z"),
      }),
      sourceItem({
        id: "item-earlier",
        title: "Markets Rally After Rate Decision",
        normalizedTitle: "Markets Rally After Rate Decision",
        publishedAt: new Date("2026-04-30T08:00:00.000Z"),
      }),
    ],
  });

  const result = await clusterSourceItemsWithStore(store, { now });

  assert.deepEqual(result, {
    candidates: 2,
    clustered: 2,
    alreadyClustered: 0,
    clustersCreated: 1,
    clustersUpdated: 1,
    primaryAssignmentsChanged: 3,
  });
  assert.equal(store.storyClusters.length, 1);
  assert.equal(store.storyClusters[0].canonicalTopic, "markets rally after rate decision");
  assert.equal(store.storyClusters[0].firstSeenAt.toISOString(), "2026-04-30T08:00:00.000Z");
  assert.equal(store.storyClusters[0].lastSeenAt.toISOString(), "2026-04-30T08:30:00.000Z");
  assert.equal(store.storyClusterItems.length, 2);
  assert.equal(primaryItems(store).length, 1);
  assert.equal(primaryItems(store)[0].sourceItemId, "item-earlier");
  assert.equal(store.sourceItems.every((item) => item.status === "clustered"), true);
});

test("rerunning after clustering is idempotent", async () => {
  const store = createMemoryClusteringStore({
    sourceItems: [
      sourceItem({ id: "item-1", title: "Stable Story", normalizedTitle: "Stable Story" }),
      sourceItem({ id: "item-2", title: "Stable Story", normalizedTitle: "Stable Story" }),
    ],
  });

  const firstResult = await clusterSourceItemsWithStore(store, { now });
  const secondResult = await clusterSourceItemsWithStore(store, { now });

  assert.equal(firstResult.clustered, 2);
  assert.deepEqual(secondResult, {
    candidates: 0,
    clustered: 0,
    alreadyClustered: 0,
    clustersCreated: 0,
    clustersUpdated: 0,
    primaryAssignmentsChanged: 0,
  });
  assert.equal(store.storyClusters.length, 1);
  assert.equal(store.storyClusterItems.length, 2);
  assert.equal(primaryItems(store).length, 1);
});

test("existing source item assignment is not duplicated and primary is repaired", async () => {
  const store = createMemoryClusteringStore({
    includeAssignedSourceItems: true,
    sourceItems: [
      sourceItem({
        id: "item-assigned",
        title: "Already Assigned",
        normalizedTitle: "Already Assigned",
        status: "normalized",
      }),
      sourceItem({
        id: "item-primary",
        title: "Already Assigned",
        normalizedTitle: "Already Assigned",
        publishedAt: new Date("2026-04-30T07:00:00.000Z"),
        status: "clustered",
      }),
    ],
    storyClusters: [
      storyCluster({
        id: "cluster-existing",
        canonicalTopic: "already assigned",
      }),
    ],
    storyClusterItems: [
      storyClusterItem({
        id: "cluster-item-assigned",
        storyClusterId: "cluster-existing",
        sourceItemId: "item-assigned",
        isPrimary: true,
      }),
      storyClusterItem({
        id: "cluster-item-primary",
        storyClusterId: "cluster-existing",
        sourceItemId: "item-primary",
        isPrimary: true,
      }),
    ],
  });

  const result = await clusterSourceItemsWithStore(store, { now });

  assert.deepEqual(result, {
    candidates: 1,
    clustered: 0,
    alreadyClustered: 1,
    clustersCreated: 0,
    clustersUpdated: 0,
    primaryAssignmentsChanged: 1,
  });
  assert.equal(store.storyClusterItems.length, 2);
  assert.equal(primaryItems(store).length, 1);
  assert.equal(primaryItems(store)[0].sourceItemId, "item-primary");
  assert.equal(store.sourceItems.find((item) => item.id === "item-assigned").status, "clustered");
});

test("new item joins an existing open cluster and becomes primary when earliest", async () => {
  const store = createMemoryClusteringStore({
    sourceItems: [
      sourceItem({
        id: "item-old",
        title: "Shared Topic",
        normalizedTitle: "Shared Topic",
        publishedAt: new Date("2026-04-30T07:00:00.000Z"),
      }),
      sourceItem({
        id: "item-existing",
        title: "Shared Topic",
        normalizedTitle: "Shared Topic",
        publishedAt: new Date("2026-04-30T08:00:00.000Z"),
        status: "clustered",
      }),
    ],
    storyClusters: [
      storyCluster({
        id: "cluster-existing",
        canonicalTopic: "shared topic",
        firstSeenAt: new Date("2026-04-30T08:00:00.000Z"),
        lastSeenAt: new Date("2026-04-30T08:00:00.000Z"),
      }),
    ],
    storyClusterItems: [
      storyClusterItem({
        storyClusterId: "cluster-existing",
        sourceItemId: "item-existing",
        isPrimary: true,
      }),
    ],
  });

  const result = await clusterSourceItemsWithStore(store, { now });

  assert.equal(result.clustered, 1);
  assert.equal(result.clustersCreated, 0);
  assert.equal(result.clustersUpdated, 1);
  assert.equal(store.storyClusters[0].firstSeenAt.toISOString(), "2026-04-30T07:00:00.000Z");
  assert.equal(store.storyClusterItems.length, 2);
  assert.equal(primaryItems(store).length, 1);
  assert.equal(primaryItems(store)[0].sourceItemId, "item-old");
});

test("canonical topic heuristic ignores case and punctuation deterministically", () => {
  assert.equal(
    buildCanonicalTopic(
      sourceItem({
        id: "item-heuristic",
        title: "  Ukraine: Energy-Grid Update!!! ",
        normalizedTitle: "  Ukraine: Energy-Grid Update!!! ",
      }),
    ),
    "ukraine energy grid update",
  );
});

function sourceItem(overrides = {}) {
  return {
    id: "item-default",
    title: "Default Story",
    normalizedTitle: "Default Story",
    publishedAt: new Date("2026-04-30T08:00:00.000Z"),
    fetchedAt,
    status: "normalized",
    ...overrides,
  };
}

function storyCluster(overrides = {}) {
  return {
    id: "cluster-default",
    canonicalTopic: "default story",
    summary: null,
    status: "open",
    firstSeenAt: new Date("2026-04-30T08:00:00.000Z"),
    lastSeenAt: new Date("2026-04-30T08:00:00.000Z"),
    selectedForGenerationAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function storyClusterItem(overrides = {}) {
  return {
    id: `cluster-item-${Math.random().toString(16).slice(2)}`,
    storyClusterId: "cluster-default",
    sourceItemId: "item-default",
    isPrimary: false,
    createdAt: now,
    ...overrides,
  };
}

function createMemoryClusteringStore(overrides = {}) {
  const sourceItems = (overrides.sourceItems ?? []).map((row) => ({ ...row }));
  const storyClusters = (overrides.storyClusters ?? []).map((row) => ({ ...row }));
  const storyClusterItems = (overrides.storyClusterItems ?? []).map((row) => ({ ...row }));
  const includeAssignedSourceItems = overrides.includeAssignedSourceItems ?? false;
  let nextClusterId = storyClusters.length + 1;
  let nextClusterItemId = storyClusterItems.length + 1;

  const tx = {
    listClusterableSourceItems: async (limit) => {
      const rows = sourceItems
        .filter(
          (item) =>
            item.status === "normalized" &&
            (includeAssignedSourceItems ||
              !storyClusterItems.some((clusterItem) => clusterItem.sourceItemId === item.id)),
        )
        .sort(compareClusterableItems);

      return limit === undefined ? rows : rows.slice(0, limit);
    },
    findOpenStoryClusterByCanonicalTopic: async (canonicalTopic) =>
      storyClusters
        .filter((cluster) => cluster.status === "open" && cluster.canonicalTopic === canonicalTopic)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .at(0) ?? null,
    insertStoryCluster: async (values) => {
      const row = storyCluster({
        id: `cluster-${nextClusterId}`,
        ...values,
      });

      nextClusterId += 1;
      storyClusters.push(row);

      return { id: row.id };
    },
    updateStoryClusterWindow: async (id, values) => {
      const row = storyClusters.find((cluster) => cluster.id === id);

      assert.notEqual(row, undefined);
      row.firstSeenAt = values.firstSeenAt;
      row.lastSeenAt = values.lastSeenAt;
      row.updatedAt = values.updatedAt;
    },
    findClusterItemBySourceItemId: async (sourceItemId) =>
      storyClusterItems.find((item) => item.sourceItemId === sourceItemId) ?? null,
    insertStoryClusterItem: async (values) => {
      assert.equal(
        storyClusterItems.some((item) => item.sourceItemId === values.sourceItemId),
        false,
      );

      const row = storyClusterItem({
        id: `cluster-item-${nextClusterItemId}`,
        ...values,
      });

      nextClusterItemId += 1;
      storyClusterItems.push(row);

      return { id: row.id };
    },
    listClusterItemsWithSourceItems: async (storyClusterId) =>
      storyClusterItems
        .filter((item) => item.storyClusterId === storyClusterId)
        .map((item) => {
          const source = sourceItems.find((sourceItemRow) => sourceItemRow.id === item.sourceItemId);

          assert.notEqual(source, undefined);

          return {
            ...item,
            sourcePublishedAt: source.publishedAt,
            sourceFetchedAt: source.fetchedAt,
          };
        }),
    setClusterItemPrimary: async (id, isPrimary) => {
      const row = storyClusterItems.find((item) => item.id === id);

      assert.notEqual(row, undefined);
      row.isPrimary = isPrimary;
    },
    markSourceItemClustered: async (id, updatedAt) => {
      const row = sourceItems.find((item) => item.id === id);

      assert.notEqual(row, undefined);
      row.status = "clustered";
      row.updatedAt = updatedAt;
    },
  };

  return {
    sourceItems,
    storyClusters,
    storyClusterItems,
    transaction: async (callback) => callback(tx),
  };
}

function compareClusterableItems(left, right) {
  const titleComparison = (left.normalizedTitle ?? left.title).localeCompare(
    right.normalizedTitle ?? right.title,
  );

  if (titleComparison !== 0) {
    return titleComparison;
  }

  const leftPublishedAt = left.publishedAt?.getTime() ?? 0;
  const rightPublishedAt = right.publishedAt?.getTime() ?? 0;
  const publishedAtDifference = leftPublishedAt - rightPublishedAt;

  if (publishedAtDifference !== 0) {
    return publishedAtDifference;
  }

  return left.id.localeCompare(right.id);
}

function primaryItems(store) {
  return store.storyClusterItems.filter((item) => item.isPrimary);
}
