import type { TopicpressDatabase } from "../database.js";
import type { FeedSourceIdentity, NormalizedSourceItemCandidate } from "../feed-types.js";
import { createDrizzleSourceItemPersistenceStore } from "./drizzle-store.js";
import {
  hasSourceItemChanges,
  mergeSourceItemValues,
  toPersistableSourceItemValues,
} from "./source-item-values.js";
import type {
  PersistedSourceItemResult,
  PersistSourceItemsOptions,
  PersistSourceItemsResult,
  SourceFetchFailureInput,
  SourceItemMatchType,
  SourceItemPersistenceStore,
  SourceItemPersistenceTransaction,
} from "./types.js";

export async function persistNormalizedSourceItems(
  db: TopicpressDatabase,
  candidates: readonly NormalizedSourceItemCandidate[],
  options: PersistSourceItemsOptions = {},
): Promise<PersistSourceItemsResult> {
  return persistNormalizedSourceItemsWithStore(
    createDrizzleSourceItemPersistenceStore(db),
    candidates,
    options,
  );
}

export async function persistNormalizedSourceItemsWithStore(
  store: SourceItemPersistenceStore,
  candidates: readonly NormalizedSourceItemCandidate[],
  options: PersistSourceItemsOptions = {},
): Promise<PersistSourceItemsResult> {
  const now = options.now ?? new Date();
  const updateSourceFetchMetadata = options.updateSourceFetchMetadata ?? true;

  return store.transaction(async (tx) => {
    const itemResults: PersistedSourceItemResult[] = [];
    const fetchedAtBySourceId = new Map<string, Date>();

    for (const candidate of candidates) {
      const source = await tx.resolveSourceIdentity(candidate);
      const result = await persistOneSourceItem(tx, candidate, source.id, now);

      itemResults.push(result);
      fetchedAtBySourceId.set(
        source.id,
        maxDate(fetchedAtBySourceId.get(source.id), candidate.fetchedAt),
      );
    }

    if (updateSourceFetchMetadata) {
      for (const [sourceId, fetchedAt] of fetchedAtBySourceId.entries()) {
        await tx.markSourceFetchSucceeded(sourceId, fetchedAt, now);
      }
    }

    return summarizePersistenceResults(
      candidates.length,
      itemResults,
      updateSourceFetchMetadata ? fetchedAtBySourceId.size : 0,
    );
  });
}

export async function markSourceFetchSucceeded(
  db: TopicpressDatabase,
  source: FeedSourceIdentity,
  fetchedAt: Date,
  options: { readonly now?: Date } = {},
): Promise<void> {
  await markSourceFetchSucceededWithStore(
    createDrizzleSourceItemPersistenceStore(db),
    source,
    fetchedAt,
    options,
  );
}

export async function markSourceFetchSucceededWithStore(
  store: SourceItemPersistenceStore,
  source: FeedSourceIdentity,
  fetchedAt: Date,
  options: { readonly now?: Date } = {},
): Promise<void> {
  const now = options.now ?? new Date();

  await store.transaction(async (tx) => {
    const sourceRow = await tx.resolveSourceByIdentity(source);
    await tx.markSourceFetchSucceeded(sourceRow.id, fetchedAt, now);
  });
}

export async function markSourceFetchFailed(
  db: TopicpressDatabase,
  input: SourceFetchFailureInput,
  options: { readonly now?: Date } = {},
): Promise<void> {
  await markSourceFetchFailedWithStore(createDrizzleSourceItemPersistenceStore(db), input, options);
}

export async function markSourceFetchFailedWithStore(
  store: SourceItemPersistenceStore,
  input: SourceFetchFailureInput,
  options: { readonly now?: Date } = {},
): Promise<void> {
  const now = options.now ?? new Date();

  await store.transaction(async (tx) => {
    const source = await tx.resolveSourceByIdentity(input.source);
    await tx.markSourceFetchFailed(source.id, input.failedAt, input.errorMessage, now);
  });
}

async function persistOneSourceItem(
  tx: SourceItemPersistenceTransaction,
  candidate: NormalizedSourceItemCandidate,
  sourceId: string,
  now: Date,
): Promise<PersistedSourceItemResult> {
  const values = toPersistableSourceItemValues(candidate, sourceId, now);
  const match = await tx.findExistingSourceItemMatch(values);

  if (match === null) {
    const insertedRow = await tx.insertSourceItem(values);

    return { itemId: insertedRow.id, action: "inserted", matchType: null };
  }

  const mergedValues = mergeSourceItemValues(match.row, values);

  if (!hasSourceItemChanges(match.row, mergedValues)) {
    return {
      itemId: match.row.id,
      action: "unchanged",
      matchType: primaryMatchType(match.matchTypes),
    };
  }

  const updatedRow = await tx.updateSourceItem(match.row.id, mergedValues);

  return {
    itemId: updatedRow.id,
    action: "updated",
    matchType: primaryMatchType(match.matchTypes),
  };
}

function summarizePersistenceResults(
  candidates: number,
  results: readonly PersistedSourceItemResult[],
  sourceMetadataUpdated: number,
): PersistSourceItemsResult {
  return {
    candidates,
    inserted: results.filter((result) => result.action === "inserted").length,
    updated: results.filter((result) => result.action === "updated").length,
    unchanged: results.filter((result) => result.action === "unchanged").length,
    matchedByGuid: results.filter((result) => result.matchType === "guid").length,
    matchedByExternalUrl: results.filter((result) => result.matchType === "external_url").length,
    matchedByContentHash: results.filter((result) => result.matchType === "content_hash").length,
    sourceMetadataUpdated,
  };
}

function primaryMatchType(matchTypes: readonly SourceItemMatchType[]): SourceItemMatchType {
  if (matchTypes.includes("guid")) {
    return "guid";
  }

  if (matchTypes.includes("external_url")) {
    return "external_url";
  }

  return "content_hash";
}

function maxDate(left: Date | undefined, right: Date): Date {
  if (left === undefined || right.getTime() > left.getTime()) {
    return right;
  }

  return left;
}
