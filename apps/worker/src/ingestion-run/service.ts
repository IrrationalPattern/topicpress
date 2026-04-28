import type { TopicpressDatabase } from "../database.js";
import { sanitizeErrorMessage } from "../feed-errors.js";
import { fetchAndNormalizeFeedSource } from "../feed-ingestion.js";
import type { FeedHttpClient } from "../feed-types.js";
import { defaultIngestionPolicy, type IngestionPolicy } from "../ingestion-policy.js";
import { SourceItemPersistenceError } from "../source-item-persistence.js";
import { createDrizzleIngestionRunStore } from "./drizzle-store.js";
import {
  aggregateErrorMessage,
  toAggregatePayload,
  toPersistencePayload,
  toPolicyPayload,
  toSourcePayload,
} from "./payload.js";
import {
  buildSummary,
  emptyPersistenceResult,
  failedFatalSummary,
  partitionEligibleSources,
  toSuccessfulSourceRunSummary,
} from "./summary.js";
import type {
  IngestionRunResult,
  IngestionRunStore,
  IngestionSource,
  RunIngestionOptions,
  SourceRunErrorClass,
  SourceRunHistory,
  SourceRunSummary,
} from "./types.js";

export async function runIngestion(
  db: TopicpressDatabase,
  options: RunIngestionOptions = {},
): Promise<IngestionRunResult> {
  return runIngestionWithStore(createDrizzleIngestionRunStore(db), options);
}

export async function runIngestionWithStore(
  store: IngestionRunStore,
  options: RunIngestionOptions = {},
): Promise<IngestionRunResult> {
  const policy = options.policy ?? defaultIngestionPolicy;
  const force = options.force ?? false;
  const startedAt = options.now ?? new Date();
  const aggregateRun = await store.createPipelineRun({
    sourceId: null,
    attempt: 1,
    startedAt,
    payload: {
      outcome: "running",
      force,
      policy: toPolicyPayload(policy),
      startedAt: startedAt.toISOString(),
    },
  });

  try {
    const activeSources = await store.listActiveSources();
    const { eligibleSources, skippedSources } = partitionEligibleSources(
      activeSources,
      startedAt,
      policy,
      force,
    );
    const sourceRuns: SourceRunSummary[] = [];

    for (const skippedSource of skippedSources) {
      sourceRuns.push(await recordSkippedSource(store, skippedSource, startedAt, policy));
    }

    for (const source of eligibleSources) {
      sourceRuns.push(await attemptSource(store, source, startedAt, policy, options.httpClient));
    }

    const summary = buildSummary(aggregateRun.id, startedAt, new Date(), force, {
      activeSources,
      eligibleSources,
      skippedSources,
      sourceRuns,
    });

    await store.finishPipelineRun(aggregateRun.id, {
      status: summary.status,
      attempt: 1,
      finishedAt: new Date(summary.finishedAt),
      payload: toAggregatePayload(summary, policy),
      ...(summary.status === "failed" ? { errorMessage: aggregateErrorMessage(summary) } : {}),
    });

    return {
      ok: summary.status === "succeeded",
      exitCode: summary.status === "succeeded" ? 0 : 1,
      summary,
    };
  } catch (error) {
    const finishedAt = new Date();
    const errorMessage = sanitizeErrorMessage(readErrorMessage(error));
    const summary = failedFatalSummary(aggregateRun.id, startedAt, finishedAt, force, errorMessage);

    await store.finishPipelineRun(aggregateRun.id, {
      status: "failed",
      attempt: 1,
      finishedAt,
      errorMessage,
      payload: toAggregatePayload(summary, policy),
    });

    return { ok: false, exitCode: 1, summary };
  }
}

async function recordSkippedSource(
  store: IngestionRunStore,
  source: IngestionSource,
  now: Date,
  policy: IngestionPolicy,
): Promise<SourceRunSummary> {
  const sourceRun = await store.createPipelineRun({
    sourceId: source.id,
    attempt: 0,
    startedAt: now,
    payload: {
      outcome: "running",
      source: toSourcePayload(source),
      force: false,
      reason: "recrawl_window",
    },
  });
  const payload = {
    outcome: "skipped",
    reason: "recrawl_window",
    recrawlIntervalMinutes: policy.recrawlIntervalMinutes,
    source: toSourcePayload(source),
    lastFetchedAt: source.lastFetchedAt?.toISOString() ?? null,
  };

  await store.finishPipelineRun(sourceRun.id, {
    status: "succeeded",
    attempt: 0,
    finishedAt: now,
    payload,
  });

  return {
    runId: sourceRun.id,
    sourceId: source.id,
    configKey: source.configKey,
    outcome: "skipped",
    attempts: 0,
    retryCount: 0,
    candidates: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skippedByFreshness: 0,
    degraded: false,
  };
}

async function attemptSource(
  store: IngestionRunStore,
  source: IngestionSource,
  now: Date,
  policy: IngestionPolicy,
  httpClient: FeedHttpClient | undefined,
): Promise<SourceRunSummary> {
  const sourceRun = await store.createPipelineRun({
    sourceId: source.id,
    attempt: 1,
    startedAt: now,
    payload: {
      outcome: "running",
      source: toSourcePayload(source),
    },
  });
  const feedResult = await fetchAndNormalizeFeedSource(source, {
    now,
    policy,
    ...(httpClient !== undefined ? { httpClient } : {}),
  });

  if (!feedResult.ok) {
    const summary = await failSourceRun(store, {
      source,
      sourceRunId: sourceRun.id,
      now,
      policy,
      attempts: feedResult.attempts.length,
      errorClass: feedResult.errorClass,
      errorMessage: feedResult.errorMessage,
      ...(feedResult.httpStatus !== undefined ? { httpStatus: feedResult.httpStatus } : {}),
    });

    return summary;
  }

  try {
    const persistence =
      feedResult.candidates.length === 0
        ? emptyPersistenceResult
        : await store.persistSourceItems(feedResult.candidates, { now });

    if (feedResult.candidates.length === 0) {
      await store.markSourceFetchSucceeded(feedResult.source, feedResult.fetchedAt, { now });
    }

    const attempts = feedResult.attempts.length;
    const summary = toSuccessfulSourceRunSummary(
      sourceRun.id,
      source,
      attempts,
      feedResult.skippedByFreshness,
      persistence,
    );

    await store.finishPipelineRun(sourceRun.id, {
      status: "succeeded",
      attempt: attempts,
      finishedAt: now,
      payload: {
        outcome: "succeeded",
        source: toSourcePayload(source),
        attempts,
        retryCount: Math.max(0, attempts - 1),
        fetchedAt: feedResult.fetchedAt.toISOString(),
        skippedByFreshness: feedResult.skippedByFreshness,
        persistence: toPersistencePayload(persistence),
      },
    });

    return summary;
  } catch (error) {
    return failSourceRun(store, {
      source,
      sourceRunId: sourceRun.id,
      now,
      policy,
      attempts: feedResult.attempts.length,
      errorClass: error instanceof SourceItemPersistenceError ? "persistence" : "runtime",
      errorMessage: sanitizeErrorMessage(readErrorMessage(error)),
      candidates: feedResult.candidates.length,
      skippedByFreshness: feedResult.skippedByFreshness,
    });
  }
}

async function failSourceRun(
  store: IngestionRunStore,
  input: {
    readonly source: IngestionSource;
    readonly sourceRunId: string;
    readonly now: Date;
    readonly policy: IngestionPolicy;
    readonly attempts: number;
    readonly errorClass: SourceRunErrorClass;
    readonly errorMessage: string;
    readonly httpStatus?: number;
    readonly candidates?: number;
    readonly skippedByFreshness?: number;
  },
): Promise<SourceRunSummary> {
  const degraded = await isSourceDegradedAfterFailure(
    store,
    input.source.id,
    input.now,
    input.policy,
  );

  await store.markSourceFetchFailed(input.source, input.now, input.errorMessage, {
    now: input.now,
  });
  await store.finishPipelineRun(input.sourceRunId, {
    status: "failed",
    attempt: input.attempts,
    finishedAt: input.now,
    errorMessage: input.errorMessage,
    payload: {
      outcome: "failed",
      source: toSourcePayload(input.source),
      attempts: input.attempts,
      retryCount: Math.max(0, input.attempts - 1),
      errorClass: input.errorClass,
      errorMessage: input.errorMessage,
      degraded,
      ...(input.httpStatus !== undefined ? { httpStatus: input.httpStatus } : {}),
      ...(input.candidates !== undefined ? { candidates: input.candidates } : {}),
      ...(input.skippedByFreshness !== undefined
        ? { skippedByFreshness: input.skippedByFreshness }
        : {}),
    },
  });

  return {
    runId: input.sourceRunId,
    sourceId: input.source.id,
    configKey: input.source.configKey,
    outcome: "failed",
    attempts: input.attempts,
    retryCount: Math.max(0, input.attempts - 1),
    candidates: input.candidates ?? 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skippedByFreshness: input.skippedByFreshness ?? 0,
    degraded,
    errorClass: input.errorClass,
    errorMessage: input.errorMessage,
  };
}

async function isSourceDegradedAfterFailure(
  store: IngestionRunStore,
  sourceId: string,
  now: Date,
  policy: IngestionPolicy,
): Promise<boolean> {
  const recentRuns = (
    await store.listRecentSourceRuns(sourceId, policy.degradedAfterConsecutiveFailures)
  ).filter((run) => run.status !== "running");
  const consecutiveFailuresIncludingCurrent =
    1 + takeLeadingFailures(recentRuns).filter((run) => run.status === "failed").length;

  if (consecutiveFailuresIncludingCurrent >= policy.degradedAfterConsecutiveFailures) {
    return true;
  }

  const latestFailure = recentRuns.find((run) => run.status === "failed");
  const latestFailureAt = latestFailure?.finishedAt ?? latestFailure?.startedAt;

  if (latestFailureAt === undefined || latestFailureAt === null) {
    return false;
  }

  const failedForMs = now.getTime() - latestFailureAt.getTime();

  return failedForMs >= policy.degradedAfterFailureHours * 60 * 60 * 1_000;
}

function takeLeadingFailures(runs: readonly SourceRunHistory[]): readonly SourceRunHistory[] {
  const failures: SourceRunHistory[] = [];

  for (const run of runs) {
    if (run.status !== "failed") {
      break;
    }

    failures.push(run);
  }

  return failures;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ingestion run failed.";
}
