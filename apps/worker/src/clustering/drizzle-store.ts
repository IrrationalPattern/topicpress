import { and, asc, eq, isNull } from "drizzle-orm";

import { sourceItems, sources, storyClusterItems, storyClusters } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  ClusterItemWithSourceItem,
  ClusterableSourceItem,
  ClusteringStore,
  ClusteringTransaction,
  InsertStoryClusterItemValues,
  InsertStoryClusterValues,
  StoryClusterItemRow,
  StoryClusterRow,
  UpdateStoryClusterWindowValues,
} from "./types.js";
import { ClusteringError } from "./types.js";

type ClusteringExecutor = Pick<TopicpressDatabase, "insert" | "select" | "update">;

export function createDrizzleClusteringStore(db: TopicpressDatabase): ClusteringStore {
  return {
    transaction: (callback) => db.transaction((tx) => callback(createDrizzleClusteringTransaction(tx))),
  };
}

function createDrizzleClusteringTransaction(db: ClusteringExecutor): ClusteringTransaction {
  return {
    listClusterableSourceItems: (limit) => listClusterableSourceItems(db, limit),
    findOpenStoryClusterByCanonicalTopic: (canonicalTopic) =>
      findOpenStoryClusterByCanonicalTopic(db, canonicalTopic),
    insertStoryCluster: (values) => insertStoryCluster(db, values),
    updateStoryClusterWindow: (id, values) => updateStoryClusterWindow(db, id, values),
    findClusterItemBySourceItemId: (sourceItemId) =>
      findClusterItemBySourceItemId(db, sourceItemId),
    insertStoryClusterItem: (values) => insertStoryClusterItem(db, values),
    listClusterItemsWithSourceItems: (storyClusterId) =>
      listClusterItemsWithSourceItems(db, storyClusterId),
    setClusterItemPrimary: (id, isPrimary) => setClusterItemPrimary(db, id, isPrimary),
    markSourceItemClustered: (id, now) => markSourceItemClustered(db, id, now),
  };
}

async function listClusterableSourceItems(
  db: ClusteringExecutor,
  limit: number | undefined,
): Promise<readonly ClusterableSourceItem[]> {
  const query = buildClusterableSourceItemsQuery(db, limit);

  return query;
}

export function buildClusterableSourceItemsQuery(
  db: ClusteringExecutor,
  limit: number | undefined,
) {
  const query = db
    .select({
      id: sourceItems.id,
      title: sourceItems.title,
      normalizedTitle: sourceItems.normalizedTitle,
      publishedAt: sourceItems.publishedAt,
      fetchedAt: sourceItems.fetchedAt,
      status: sourceItems.status,
    })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .leftJoin(storyClusterItems, eq(sourceItems.id, storyClusterItems.sourceItemId))
    .where(
      and(
        eq(sourceItems.status, "normalized"),
        eq(sources.isActive, true),
        isNull(storyClusterItems.id),
      ),
    )
    .orderBy(asc(sourceItems.normalizedTitle), asc(sourceItems.publishedAt), asc(sourceItems.id));

  if (limit !== undefined) {
    return query.limit(limit);
  }

  return query;
}

async function findOpenStoryClusterByCanonicalTopic(
  db: ClusteringExecutor,
  canonicalTopic: string,
): Promise<StoryClusterRow | null> {
  const rows = await db
    .select({
      id: storyClusters.id,
      canonicalTopic: storyClusters.canonicalTopic,
      status: storyClusters.status,
      firstSeenAt: storyClusters.firstSeenAt,
      lastSeenAt: storyClusters.lastSeenAt,
    })
    .from(storyClusters)
    .where(and(eq(storyClusters.status, "open"), eq(storyClusters.canonicalTopic, canonicalTopic)))
    .orderBy(asc(storyClusters.createdAt), asc(storyClusters.id))
    .limit(1);

  return rows[0] ?? null;
}

async function insertStoryCluster(
  db: ClusteringExecutor,
  values: InsertStoryClusterValues,
): Promise<{ readonly id: string }> {
  const inserted = await db.insert(storyClusters).values(values).returning({ id: storyClusters.id });
  const row = inserted[0];

  if (row === undefined) {
    throw new ClusteringError(`Failed to create story cluster "${values.canonicalTopic}".`);
  }

  return row;
}

async function updateStoryClusterWindow(
  db: ClusteringExecutor,
  id: string,
  values: UpdateStoryClusterWindowValues,
): Promise<void> {
  await db.update(storyClusters).set(values).where(eq(storyClusters.id, id));
}

async function findClusterItemBySourceItemId(
  db: ClusteringExecutor,
  sourceItemId: string,
): Promise<StoryClusterItemRow | null> {
  const rows = await db
    .select({
      id: storyClusterItems.id,
      storyClusterId: storyClusterItems.storyClusterId,
      sourceItemId: storyClusterItems.sourceItemId,
      isPrimary: storyClusterItems.isPrimary,
    })
    .from(storyClusterItems)
    .where(eq(storyClusterItems.sourceItemId, sourceItemId))
    .limit(1);

  return rows[0] ?? null;
}

async function insertStoryClusterItem(
  db: ClusteringExecutor,
  values: InsertStoryClusterItemValues,
): Promise<{ readonly id: string }> {
  const inserted = await db
    .insert(storyClusterItems)
    .values(values)
    .returning({ id: storyClusterItems.id });
  const row = inserted[0];

  if (row === undefined) {
    throw new ClusteringError(`Failed to attach source item "${values.sourceItemId}" to cluster.`);
  }

  return row;
}

async function listClusterItemsWithSourceItems(
  db: ClusteringExecutor,
  storyClusterId: string,
): Promise<readonly ClusterItemWithSourceItem[]> {
  return db
    .select({
      id: storyClusterItems.id,
      storyClusterId: storyClusterItems.storyClusterId,
      sourceItemId: storyClusterItems.sourceItemId,
      isPrimary: storyClusterItems.isPrimary,
      sourcePublishedAt: sourceItems.publishedAt,
      sourceFetchedAt: sourceItems.fetchedAt,
    })
    .from(storyClusterItems)
    .innerJoin(sourceItems, eq(storyClusterItems.sourceItemId, sourceItems.id))
    .where(eq(storyClusterItems.storyClusterId, storyClusterId))
    .orderBy(asc(sourceItems.publishedAt), asc(sourceItems.fetchedAt), asc(sourceItems.id));
}

async function setClusterItemPrimary(
  db: ClusteringExecutor,
  id: string,
  isPrimary: boolean,
): Promise<void> {
  await db.update(storyClusterItems).set({ isPrimary }).where(eq(storyClusterItems.id, id));
}

async function markSourceItemClustered(
  db: ClusteringExecutor,
  id: string,
  now: Date,
): Promise<void> {
  await db
    .update(sourceItems)
    .set({ status: "clustered", updatedAt: now })
    .where(eq(sourceItems.id, id));
}
