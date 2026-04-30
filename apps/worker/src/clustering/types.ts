import type { SourceItem, StoryCluster, StoryClusterItem } from "@topicpress/db";

export interface ClusterSourceItemsOptions {
  readonly now?: Date;
  readonly limit?: number;
}

export interface ClusterSourceItemsResult {
  readonly candidates: number;
  readonly clustered: number;
  readonly alreadyClustered: number;
  readonly clustersCreated: number;
  readonly clustersUpdated: number;
  readonly primaryAssignmentsChanged: number;
}

export interface ClusteringStore {
  readonly transaction: <TResult>(
    callback: (tx: ClusteringTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface ClusteringTransaction {
  readonly listClusterableSourceItems: (
    limit: number | undefined,
  ) => Promise<readonly ClusterableSourceItem[]>;
  readonly findOpenStoryClusterByCanonicalTopic: (
    canonicalTopic: string,
  ) => Promise<StoryClusterRow | null>;
  readonly insertStoryCluster: (
    values: InsertStoryClusterValues,
  ) => Promise<Pick<StoryCluster, "id">>;
  readonly updateStoryClusterWindow: (
    id: string,
    values: UpdateStoryClusterWindowValues,
  ) => Promise<void>;
  readonly findClusterItemBySourceItemId: (
    sourceItemId: string,
  ) => Promise<StoryClusterItemRow | null>;
  readonly insertStoryClusterItem: (
    values: InsertStoryClusterItemValues,
  ) => Promise<Pick<StoryClusterItem, "id">>;
  readonly listClusterItemsWithSourceItems: (
    storyClusterId: string,
  ) => Promise<readonly ClusterItemWithSourceItem[]>;
  readonly setClusterItemPrimary: (id: string, isPrimary: boolean) => Promise<void>;
  readonly markSourceItemClustered: (id: string, now: Date) => Promise<void>;
}

export type ClusterableSourceItem = Pick<
  SourceItem,
  "id" | "title" | "normalizedTitle" | "publishedAt" | "fetchedAt" | "status"
>;

export type StoryClusterRow = Pick<
  StoryCluster,
  "id" | "canonicalTopic" | "status" | "firstSeenAt" | "lastSeenAt"
>;

export type StoryClusterItemRow = Pick<
  StoryClusterItem,
  "id" | "storyClusterId" | "sourceItemId" | "isPrimary"
>;

export interface ClusterItemWithSourceItem extends StoryClusterItemRow {
  readonly sourcePublishedAt: Date | null;
  readonly sourceFetchedAt: Date;
}

export interface InsertStoryClusterValues {
  readonly canonicalTopic: string;
  readonly summary: string | null;
  readonly status: "open";
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateStoryClusterWindowValues {
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
  readonly updatedAt: Date;
}

export interface InsertStoryClusterItemValues {
  readonly storyClusterId: string;
  readonly sourceItemId: string;
  readonly isPrimary: boolean;
  readonly createdAt: Date;
}

export class ClusteringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClusteringError";
  }
}
