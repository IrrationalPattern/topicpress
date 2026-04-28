import type { JsonValue, NormalizedSourceItemCandidate } from "../feed-types.js";
import { normalizeWhitespace } from "../text-utils.js";
import type {
  PersistableSourceItemUpdateValues,
  PersistableSourceItemValues,
  SourceItemRow,
} from "./types.js";

export function toPersistableSourceItemValues(
  candidate: NormalizedSourceItemCandidate,
  sourceId: string,
  now: Date,
): PersistableSourceItemValues {
  return {
    sourceId,
    externalGuid: candidate.externalGuid ?? null,
    externalUrl: candidate.externalUrl,
    title: candidate.title,
    summary: candidate.summary ?? null,
    contentText: candidate.contentText ?? null,
    rawPayload: candidate.rawPayload,
    contentHash: candidate.contentHash,
    language: candidate.language,
    publishedAt: candidate.publishedAt,
    fetchedAt: candidate.fetchedAt,
    status: "normalized",
    normalizedTitle: normalizeWhitespace(candidate.title),
    normalizedSummary:
      candidate.summary === undefined ? null : normalizeWhitespace(candidate.summary),
    errorMessage: null,
    updatedAt: now,
  };
}

export function mergeSourceItemValues(
  existing: SourceItemRow,
  next: PersistableSourceItemValues,
): PersistableSourceItemUpdateValues {
  return {
    externalGuid: next.externalGuid ?? existing.externalGuid,
    externalUrl: next.externalUrl,
    title: next.title,
    summary: next.summary ?? existing.summary,
    contentText: next.contentText ?? existing.contentText,
    rawPayload: next.rawPayload,
    contentHash: next.contentHash,
    language: next.language,
    publishedAt: next.publishedAt ?? existing.publishedAt,
    fetchedAt: next.fetchedAt,
    normalizedTitle: next.normalizedTitle,
    normalizedSummary: next.normalizedSummary ?? existing.normalizedSummary,
    updatedAt: next.updatedAt,
  };
}

export function hasSourceItemChanges(
  existing: SourceItemRow,
  next: PersistableSourceItemUpdateValues,
): boolean {
  return (
    existing.externalGuid !== next.externalGuid ||
    existing.externalUrl !== next.externalUrl ||
    existing.title !== next.title ||
    existing.summary !== next.summary ||
    existing.contentText !== next.contentText ||
    !jsonValuesEqual(existing.rawPayload as JsonValue, next.rawPayload) ||
    existing.contentHash !== next.contentHash ||
    existing.language !== next.language ||
    !nullableDatesEqual(existing.publishedAt, next.publishedAt) ||
    !datesEqual(existing.fetchedAt, next.fetchedAt) ||
    existing.normalizedTitle !== next.normalizedTitle ||
    existing.normalizedSummary !== next.normalizedSummary
  );
}

function datesEqual(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime();
}

function nullableDatesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return datesEqual(left, right);
}

function jsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
