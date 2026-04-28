import type { IngestionPolicy } from "../ingestion-policy.js";
import type { PersistSourceItemsResult } from "../source-item-persistence.js";
import type {
  IngestionRunSummary,
  IngestionSource,
  JsonObject,
  SourceFailureSummary,
} from "./types.js";

export function toAggregatePayload(
  summary: IngestionRunSummary,
  policy: IngestionPolicy,
): JsonObject {
  return {
    outcome: summary.outcome,
    status: summary.status,
    force: summary.force,
    startedAt: summary.startedAt,
    finishedAt: summary.finishedAt,
    policy: toPolicyPayload(policy),
    sources: { ...summary.sources },
    items: { ...summary.items },
    sourceRunIds: summary.sourceRuns.map((run) => run.runId),
    sourceRuns: summary.sourceRuns.map((run) => ({
      runId: run.runId,
      sourceId: run.sourceId,
      configKey: run.configKey,
      outcome: run.outcome,
      attempts: run.attempts,
      retryCount: run.retryCount,
      candidates: run.candidates,
      inserted: run.inserted,
      updated: run.updated,
      unchanged: run.unchanged,
      skippedByFreshness: run.skippedByFreshness,
      degraded: run.degraded,
      ...(run.errorClass !== undefined ? { errorClass: run.errorClass } : {}),
      ...(run.errorMessage !== undefined ? { errorMessage: run.errorMessage } : {}),
    })),
    failures: summary.failures.map(toFailurePayload),
    degradedSources: summary.degradedSources.map(toFailurePayload),
  };
}

export function toSourcePayload(source: IngestionSource): JsonObject {
  return {
    id: source.id,
    configKey: source.configKey,
    name: source.name,
    kind: source.kind,
    feedUrl: source.feedUrl,
    language: source.language,
  };
}

export function toPersistencePayload(result: PersistSourceItemsResult): JsonObject {
  return {
    candidates: result.candidates,
    inserted: result.inserted,
    updated: result.updated,
    unchanged: result.unchanged,
    matchedByGuid: result.matchedByGuid,
    matchedByExternalUrl: result.matchedByExternalUrl,
    matchedByContentHash: result.matchedByContentHash,
    sourceMetadataUpdated: result.sourceMetadataUpdated,
  };
}

export function aggregateErrorMessage(summary: IngestionRunSummary): string {
  if (summary.outcome === "no_active_sources") {
    return "No active sources are configured.";
  }

  if (summary.outcome === "failed" && summary.failures.length > 0) {
    return "All eligible sources failed.";
  }

  return "Ingestion run failed.";
}

export function toPolicyPayload(policy: IngestionPolicy): JsonObject {
  return {
    freshnessWindowDays: policy.freshnessWindowDays,
    recrawlIntervalMinutes: policy.recrawlIntervalMinutes,
    transientFetchRetries: policy.transientFetchRetries,
    retryBackoffMs: [...policy.retryBackoffMs],
    fetchTimeoutMs: policy.fetchTimeoutMs,
    degradedAfterConsecutiveFailures: policy.degradedAfterConsecutiveFailures,
    degradedAfterFailureHours: policy.degradedAfterFailureHours,
  };
}

function toFailurePayload(failure: SourceFailureSummary): JsonObject {
  return {
    runId: failure.runId,
    sourceId: failure.sourceId,
    configKey: failure.configKey,
    errorClass: failure.errorClass,
    errorMessage: failure.errorMessage,
    degraded: failure.degraded,
  };
}
