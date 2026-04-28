import type { Source, SourceItem, SourceItemStatus } from "@topicpress/db";

import type {
  FeedSourceIdentity,
  JsonValue,
  NormalizedSourceItemCandidate,
} from "../feed-types.js";

export interface PersistSourceItemsOptions {
  readonly now?: Date;
  readonly updateSourceFetchMetadata?: boolean;
}

export interface PersistSourceItemsResult {
  readonly candidates: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly matchedByGuid: number;
  readonly matchedByExternalUrl: number;
  readonly matchedByContentHash: number;
  readonly sourceMetadataUpdated: number;
}

export interface PersistedSourceItemResult {
  readonly itemId: string;
  readonly action: PersistedSourceItemAction;
  readonly matchType: SourceItemMatchType | null;
}

export type PersistedSourceItemAction = "inserted" | "updated" | "unchanged";
export type SourceItemMatchType = "guid" | "external_url" | "content_hash";

export interface SourceFetchFailureInput {
  readonly source: FeedSourceIdentity;
  readonly failedAt: Date;
  readonly errorMessage: string;
}

export interface SourceItemPersistenceStore {
  readonly transaction: <TResult>(
    callback: (tx: SourceItemPersistenceTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface SourceItemPersistenceTransaction {
  readonly resolveSourceIdentity: (
    candidate: NormalizedSourceItemCandidate,
  ) => Promise<SourceIdentityRow>;
  readonly resolveSourceByIdentity: (source: FeedSourceIdentity) => Promise<SourceIdentityRow>;
  readonly findExistingSourceItemMatch: (
    values: PersistableSourceItemValues,
  ) => Promise<SourceItemMatch | null>;
  readonly insertSourceItem: (
    values: PersistableSourceItemValues,
  ) => Promise<Pick<SourceItem, "id">>;
  readonly updateSourceItem: (
    id: string,
    values: PersistableSourceItemUpdateValues,
  ) => Promise<Pick<SourceItem, "id">>;
  readonly markSourceFetchSucceeded: (
    sourceId: string,
    fetchedAt: Date,
    now: Date,
  ) => Promise<void>;
  readonly markSourceFetchFailed: (
    sourceId: string,
    failedAt: Date,
    errorMessage: string,
    now: Date,
  ) => Promise<void>;
}

export class SourceItemPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceItemPersistenceError";
  }
}

export type SourceIdentityRow = Pick<Source, "id" | "configKey" | "kind" | "feedUrl" | "language">;
export type SourceItemRow = SourceItem;

export type PersistableSourceItemValues = {
  readonly sourceId: string;
  readonly externalGuid: string | null;
  readonly externalUrl: string;
  readonly title: string;
  readonly summary: string | null;
  readonly contentText: string | null;
  readonly rawPayload: JsonValue;
  readonly contentHash: string;
  readonly language: string;
  readonly publishedAt: Date | null;
  readonly fetchedAt: Date;
  readonly status: SourceItemStatus;
  readonly normalizedTitle: string;
  readonly normalizedSummary: string | null;
  readonly errorMessage: string | null;
  readonly updatedAt: Date;
};

export type PersistableSourceItemUpdateValues = Omit<
  PersistableSourceItemValues,
  "sourceId" | "status" | "errorMessage"
>;

export interface SourceItemMatch {
  readonly row: SourceItemRow;
  readonly matchTypes: readonly SourceItemMatchType[];
}
