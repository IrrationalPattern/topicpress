import type { TopicpressDatabase } from "../database.js";
import { createDrizzleClusteringStore } from "./drizzle-store.js";
import { buildCanonicalTopic, sourceItemObservedAt } from "./heuristic.js";
import type {
  ClusterItemWithSourceItem,
  ClusterSourceItemsOptions,
  ClusterSourceItemsResult,
  ClusterableSourceItem,
  ClusteringStore,
  ClusteringTransaction,
  StoryClusterRow,
} from "./types.js";

type MutableClusterSourceItemsResult = {
  -readonly [Key in keyof ClusterSourceItemsResult]: ClusterSourceItemsResult[Key];
};

export async function clusterSourceItems(
  db: TopicpressDatabase,
  options: ClusterSourceItemsOptions = {},
): Promise<ClusterSourceItemsResult> {
  return clusterSourceItemsWithStore(createDrizzleClusteringStore(db), options);
}

export async function clusterSourceItemsWithStore(
  store: ClusteringStore,
  options: ClusterSourceItemsOptions = {},
): Promise<ClusterSourceItemsResult> {
  const now = options.now ?? new Date();

  return store.transaction(async (tx) => {
    const items = await tx.listClusterableSourceItems(options.limit);
    const result = mutableResult(items.length);

    for (const item of items) {
      const outcome = await clusterOneSourceItem(tx, item, now);

      result.clustered += outcome.clustered;
      result.alreadyClustered += outcome.alreadyClustered;
      result.clustersCreated += outcome.clustersCreated;
      result.clustersUpdated += outcome.clustersUpdated;
      result.primaryAssignmentsChanged += outcome.primaryAssignmentsChanged;
    }

    return result;
  });
}

async function clusterOneSourceItem(
  tx: ClusteringTransaction,
  item: ClusterableSourceItem,
  now: Date,
): Promise<Omit<ClusterSourceItemsResult, "candidates">> {
  const existingItem = await tx.findClusterItemBySourceItemId(item.id);

  if (existingItem !== null) {
    await tx.markSourceItemClustered(item.id, now);

    return {
      clustered: 0,
      alreadyClustered: 1,
      clustersCreated: 0,
      clustersUpdated: 0,
      primaryAssignmentsChanged: await ensureSinglePrimaryItem(tx, existingItem.storyClusterId),
    };
  }

  const canonicalTopic = buildCanonicalTopic(item);
  const observedAt = sourceItemObservedAt(item);
  const existingCluster = await tx.findOpenStoryClusterByCanonicalTopic(canonicalTopic);
  const cluster = existingCluster ?? (await createStoryCluster(tx, canonicalTopic, observedAt, now));
  const nextWindow = mergeClusterWindow(cluster, observedAt);
  let clustersUpdated = 0;

  if (
    nextWindow.firstSeenAt.getTime() !== cluster.firstSeenAt.getTime() ||
    nextWindow.lastSeenAt.getTime() !== cluster.lastSeenAt.getTime()
  ) {
    await tx.updateStoryClusterWindow(cluster.id, { ...nextWindow, updatedAt: now });
    clustersUpdated = 1;
  }

  await tx.insertStoryClusterItem({
    storyClusterId: cluster.id,
    sourceItemId: item.id,
    isPrimary: false,
    createdAt: now,
  });
  await tx.markSourceItemClustered(item.id, now);

  return {
    clustered: 1,
    alreadyClustered: 0,
    clustersCreated: existingCluster === null ? 1 : 0,
    clustersUpdated,
    primaryAssignmentsChanged: await ensureSinglePrimaryItem(tx, cluster.id),
  };
}

async function createStoryCluster(
  tx: ClusteringTransaction,
  canonicalTopic: string,
  observedAt: Date,
  now: Date,
): Promise<StoryClusterRow> {
  const inserted = await tx.insertStoryCluster({
    canonicalTopic,
    summary: null,
    status: "open",
    firstSeenAt: observedAt,
    lastSeenAt: observedAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: inserted.id,
    canonicalTopic,
    status: "open",
    firstSeenAt: observedAt,
    lastSeenAt: observedAt,
  };
}

function mergeClusterWindow(
  cluster: StoryClusterRow,
  observedAt: Date,
): Pick<StoryClusterRow, "firstSeenAt" | "lastSeenAt"> {
  return {
    firstSeenAt:
      observedAt.getTime() < cluster.firstSeenAt.getTime() ? observedAt : cluster.firstSeenAt,
    lastSeenAt: observedAt.getTime() > cluster.lastSeenAt.getTime() ? observedAt : cluster.lastSeenAt,
  };
}

async function ensureSinglePrimaryItem(
  tx: ClusteringTransaction,
  storyClusterId: string,
): Promise<number> {
  const items = await tx.listClusterItemsWithSourceItems(storyClusterId);

  if (items.length === 0) {
    return 0;
  }

  const primaryItem = choosePrimaryItem(items);
  let changed = 0;

  for (const item of items) {
    const shouldBePrimary = item.id === primaryItem.id;

    if (item.isPrimary !== shouldBePrimary) {
      await tx.setClusterItemPrimary(item.id, shouldBePrimary);
      changed += 1;
    }
  }

  return changed;
}

function choosePrimaryItem(items: readonly ClusterItemWithSourceItem[]): ClusterItemWithSourceItem {
  const sorted = [...items].sort(comparePrimaryCandidates);
  const first = sorted[0];

  if (first === undefined) {
    throw new Error("Cannot choose a primary item for an empty cluster.");
  }

  return first;
}

function comparePrimaryCandidates(
  left: ClusterItemWithSourceItem,
  right: ClusterItemWithSourceItem,
): number {
  const leftObservedAt = left.sourcePublishedAt ?? left.sourceFetchedAt;
  const rightObservedAt = right.sourcePublishedAt ?? right.sourceFetchedAt;
  const observedAtDifference = leftObservedAt.getTime() - rightObservedAt.getTime();

  if (observedAtDifference !== 0) {
    return observedAtDifference;
  }

  return left.sourceItemId.localeCompare(right.sourceItemId);
}

function mutableResult(candidates: number): MutableClusterSourceItemsResult {
  return {
    candidates,
    clustered: 0,
    alreadyClustered: 0,
    clustersCreated: 0,
    clustersUpdated: 0,
    primaryAssignmentsChanged: 0,
  };
}
