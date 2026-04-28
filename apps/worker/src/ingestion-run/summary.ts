import type { IngestionPolicy } from "../ingestion-policy.js";
import type { PersistSourceItemsResult } from "../source-item-persistence.js";
import type {
  IngestionRunOutcome,
  IngestionRunStatus,
  IngestionRunSummary,
  IngestionSource,
  SourceFailureSummary,
  SourceRunSummary,
} from "./types.js";

export const emptyPersistenceResult: PersistSourceItemsResult = {
  candidates: 0,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  matchedByGuid: 0,
  matchedByExternalUrl: 0,
  matchedByContentHash: 0,
  sourceMetadataUpdated: 0,
};

export function partitionEligibleSources(
  activeSources: readonly IngestionSource[],
  now: Date,
  policy: IngestionPolicy,
  force: boolean,
): {
  readonly eligibleSources: readonly IngestionSource[];
  readonly skippedSources: readonly IngestionSource[];
} {
  if (force) {
    return { eligibleSources: activeSources, skippedSources: [] };
  }

  const recrawlIntervalMs = policy.recrawlIntervalMinutes * 60 * 1_000;
  const eligibleSources: IngestionSource[] = [];
  const skippedSources: IngestionSource[] = [];

  activeSources.forEach((source) => {
    if (
      source.lastFetchedAt !== null &&
      now.getTime() - source.lastFetchedAt.getTime() < recrawlIntervalMs
    ) {
      skippedSources.push(source);
      return;
    }

    eligibleSources.push(source);
  });

  return { eligibleSources, skippedSources };
}

export function buildSummary(
  runId: string,
  startedAt: Date,
  finishedAt: Date,
  force: boolean,
  input: {
    readonly activeSources: readonly IngestionSource[];
    readonly eligibleSources: readonly IngestionSource[];
    readonly skippedSources: readonly IngestionSource[];
    readonly sourceRuns: readonly SourceRunSummary[];
  },
): IngestionRunSummary {
  const attemptedRuns = input.sourceRuns.filter((run) => run.outcome !== "skipped");
  const succeededRuns = attemptedRuns.filter((run) => run.outcome === "succeeded");
  const failedRuns = attemptedRuns.filter((run) => run.outcome === "failed");
  const status = determineStatus(input.activeSources, input.eligibleSources, succeededRuns);
  const outcome = determineOutcome(
    input.activeSources,
    input.eligibleSources,
    succeededRuns,
    failedRuns,
  );
  const failures = failedRuns.map(toFailureSummary);

  return {
    runId,
    status,
    outcome,
    force,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    sources: {
      active: input.activeSources.length,
      eligible: input.eligibleSources.length,
      attempted: attemptedRuns.length,
      succeeded: succeededRuns.length,
      failed: failedRuns.length,
      skippedByRecrawl: input.skippedSources.length,
    },
    items: {
      candidates: sum(input.sourceRuns, (run) => run.candidates),
      inserted: sum(input.sourceRuns, (run) => run.inserted),
      updated: sum(input.sourceRuns, (run) => run.updated),
      unchanged: sum(input.sourceRuns, (run) => run.unchanged),
      skippedByFreshness: sum(input.sourceRuns, (run) => run.skippedByFreshness),
      conflicts: failedRuns.filter((run) => run.errorClass === "persistence").length,
    },
    sourceRuns: input.sourceRuns,
    failures,
    degradedSources: failures.filter((failure) => failure.degraded),
  };
}

export function failedFatalSummary(
  runId: string,
  startedAt: Date,
  finishedAt: Date,
  force: boolean,
  errorMessage: string,
): IngestionRunSummary {
  const failure = {
    runId,
    sourceId: "",
    configKey: "aggregate",
    errorClass: "runtime" as const,
    errorMessage,
    degraded: false,
  };

  return {
    runId,
    status: "failed",
    outcome: "failed",
    force,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    sources: {
      active: 0,
      eligible: 0,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skippedByRecrawl: 0,
    },
    items: {
      candidates: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      skippedByFreshness: 0,
      conflicts: 0,
    },
    sourceRuns: [],
    failures: [failure],
    degradedSources: [],
  };
}

export function toSuccessfulSourceRunSummary(
  runId: string,
  source: IngestionSource,
  attempts: number,
  skippedByFreshness: number,
  persistence: PersistSourceItemsResult,
): SourceRunSummary {
  return {
    runId,
    sourceId: source.id,
    configKey: source.configKey,
    outcome: "succeeded",
    attempts,
    retryCount: Math.max(0, attempts - 1),
    candidates: persistence.candidates,
    inserted: persistence.inserted,
    updated: persistence.updated,
    unchanged: persistence.unchanged,
    skippedByFreshness,
    degraded: false,
  };
}

function determineStatus(
  activeSources: readonly IngestionSource[],
  eligibleSources: readonly IngestionSource[],
  succeededRuns: readonly SourceRunSummary[],
): IngestionRunStatus {
  if (activeSources.length === 0) {
    return "failed";
  }

  if (eligibleSources.length === 0) {
    return "succeeded";
  }

  return succeededRuns.length > 0 ? "succeeded" : "failed";
}

function determineOutcome(
  activeSources: readonly IngestionSource[],
  eligibleSources: readonly IngestionSource[],
  succeededRuns: readonly SourceRunSummary[],
  failedRuns: readonly SourceRunSummary[],
): IngestionRunOutcome {
  if (activeSources.length === 0) {
    return "no_active_sources";
  }

  if (eligibleSources.length === 0) {
    return "no_eligible_sources";
  }

  if (succeededRuns.length === 0) {
    return "failed";
  }

  return failedRuns.length > 0 ? "partial_success" : "success";
}

function toFailureSummary(run: SourceRunSummary): SourceFailureSummary {
  return {
    runId: run.runId,
    sourceId: run.sourceId,
    configKey: run.configKey,
    errorClass: run.errorClass ?? "runtime",
    errorMessage: run.errorMessage ?? "Source ingestion failed.",
    degraded: run.degraded,
  };
}

function sum<T>(items: readonly T[], readValue: (item: T) => number): number {
  return items.reduce((total, item) => total + readValue(item), 0);
}
