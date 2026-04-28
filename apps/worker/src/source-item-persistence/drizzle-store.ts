import { and, eq } from "drizzle-orm";

import { sourceItems, sources } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { FeedSourceIdentity, NormalizedSourceItemCandidate } from "../feed-types.js";
import { truncateNormalizedText } from "../text-utils.js";
import type {
  PersistableSourceItemUpdateValues,
  PersistableSourceItemValues,
  SourceIdentityRow,
  SourceItemMatch,
  SourceItemMatchType,
  SourceItemPersistenceStore,
  SourceItemPersistenceTransaction,
  SourceItemRow,
} from "./types.js";
import { SourceItemPersistenceError } from "./types.js";

type SourceItemPersistenceExecutor = Pick<TopicpressDatabase, "insert" | "select" | "update">;

export function createDrizzleSourceItemPersistenceStore(
  db: TopicpressDatabase,
): SourceItemPersistenceStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzleSourceItemPersistenceTransaction(tx))),
  };
}

function createDrizzleSourceItemPersistenceTransaction(
  db: SourceItemPersistenceExecutor,
): SourceItemPersistenceTransaction {
  return {
    resolveSourceIdentity: (candidate) => resolveSourceIdentity(db, candidate),
    resolveSourceByIdentity: (source) => resolveSourceByIdentity(db, source),
    findExistingSourceItemMatch: (values) => findExistingSourceItemMatch(db, values),
    insertSourceItem: (values) => insertSourceItem(db, values),
    updateSourceItem: (id, values) => updateSourceItem(db, id, values),
    markSourceFetchSucceeded: (sourceId, fetchedAt, now) =>
      markSourceFetchSucceededById(db, sourceId, fetchedAt, now),
    markSourceFetchFailed: (sourceId, failedAt, errorMessage, now) =>
      markSourceFetchFailedById(db, sourceId, failedAt, errorMessage, now),
  };
}

async function insertSourceItem(
  db: SourceItemPersistenceExecutor,
  values: PersistableSourceItemValues,
): Promise<{ readonly id: string }> {
  const inserted = await db.insert(sourceItems).values(values).returning({ id: sourceItems.id });
  const insertedRow = inserted[0];

  if (insertedRow === undefined) {
    throw new SourceItemPersistenceError(`Failed to persist source item "${values.externalUrl}".`);
  }

  return insertedRow;
}

async function updateSourceItem(
  db: SourceItemPersistenceExecutor,
  id: string,
  values: PersistableSourceItemUpdateValues,
): Promise<{ readonly id: string }> {
  const updated = await db
    .update(sourceItems)
    .set(values)
    .where(eq(sourceItems.id, id))
    .returning({ id: sourceItems.id });
  const updatedRow = updated[0];

  if (updatedRow === undefined) {
    throw new SourceItemPersistenceError(`Failed to update source item "${id}".`);
  }

  return updatedRow;
}

async function resolveSourceIdentity(
  db: SourceItemPersistenceExecutor,
  candidate: NormalizedSourceItemCandidate,
): Promise<SourceIdentityRow> {
  if (candidate.sourceId !== undefined) {
    const sourceById = await db
      .select({
        id: sources.id,
        configKey: sources.configKey,
        kind: sources.kind,
        feedUrl: sources.feedUrl,
        language: sources.language,
      })
      .from(sources)
      .where(eq(sources.id, candidate.sourceId))
      .limit(1);
    const row = sourceById[0];

    if (row !== undefined) {
      return row;
    }
  }

  return resolveSourceByIdentity(db, candidate.source);
}

async function resolveSourceByIdentity(
  db: SourceItemPersistenceExecutor,
  source: FeedSourceIdentity,
): Promise<SourceIdentityRow> {
  const rows = await db
    .select({
      id: sources.id,
      configKey: sources.configKey,
      kind: sources.kind,
      feedUrl: sources.feedUrl,
      language: sources.language,
    })
    .from(sources)
    .where(eq(sources.configKey, source.configKey))
    .limit(1);
  const row = rows[0];

  if (row === undefined) {
    throw new SourceItemPersistenceError(
      `Cannot persist source items for unknown source config key "${source.configKey}".`,
    );
  }

  if (row.kind !== source.kind || row.feedUrl !== source.feedUrl) {
    throw new SourceItemPersistenceError(
      `Source identity mismatch for config key "${source.configKey}".`,
    );
  }

  return row;
}

async function findExistingSourceItemMatch(
  db: SourceItemPersistenceExecutor,
  values: PersistableSourceItemValues,
): Promise<SourceItemMatch | null> {
  const matches = new Map<string, { row: SourceItemRow; matchTypes: SourceItemMatchType[] }>();

  if (values.externalGuid !== null) {
    addMatches(matches, await findByGuid(db, values.sourceId, values.externalGuid), "guid");
  }

  addMatches(matches, await findByExternalUrl(db, values.externalUrl), "external_url");
  addMatches(matches, await findByContentHash(db, values), "content_hash");

  if (matches.size === 0) {
    return null;
  }

  if (matches.size > 1) {
    throw new SourceItemPersistenceError(
      `Source item identity conflict for external URL "${values.externalUrl}".`,
    );
  }

  const match = [...matches.values()][0];

  return match === undefined ? null : { row: match.row, matchTypes: match.matchTypes };
}

async function findByGuid(
  db: SourceItemPersistenceExecutor,
  sourceId: string,
  externalGuid: string,
): Promise<SourceItemRow[]> {
  return db
    .select()
    .from(sourceItems)
    .where(and(eq(sourceItems.sourceId, sourceId), eq(sourceItems.externalGuid, externalGuid)))
    .limit(1);
}

async function findByExternalUrl(
  db: SourceItemPersistenceExecutor,
  externalUrl: string,
): Promise<SourceItemRow[]> {
  return db.select().from(sourceItems).where(eq(sourceItems.externalUrl, externalUrl)).limit(1);
}

async function findByContentHash(
  db: SourceItemPersistenceExecutor,
  values: PersistableSourceItemValues,
): Promise<SourceItemRow[]> {
  return db
    .select()
    .from(sourceItems)
    .where(
      and(
        eq(sourceItems.sourceId, values.sourceId),
        eq(sourceItems.contentHash, values.contentHash),
      ),
    )
    .limit(2);
}

function addMatches(
  matches: Map<string, { row: SourceItemRow; matchTypes: SourceItemMatchType[] }>,
  rows: readonly SourceItemRow[],
  matchType: SourceItemMatchType,
): void {
  rows.forEach((row) => {
    const existing = matches.get(row.id);

    if (existing === undefined) {
      matches.set(row.id, { row, matchTypes: [matchType] });
      return;
    }

    existing.matchTypes.push(matchType);
  });
}

async function markSourceFetchSucceededById(
  db: SourceItemPersistenceExecutor,
  sourceId: string,
  fetchedAt: Date,
  now: Date,
): Promise<void> {
  await db
    .update(sources)
    .set({
      lastFetchedAt: fetchedAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      updatedAt: now,
    })
    .where(eq(sources.id, sourceId));
}

async function markSourceFetchFailedById(
  db: SourceItemPersistenceExecutor,
  sourceId: string,
  failedAt: Date,
  errorMessage: string,
  now: Date,
): Promise<void> {
  await db
    .update(sources)
    .set({
      lastErrorAt: failedAt,
      lastErrorMessage: truncateNormalizedText(errorMessage, 1_000),
      updatedAt: now,
    })
    .where(eq(sources.id, sourceId));
}
