import { and, asc, desc, eq } from "drizzle-orm";

import { pipelineRuns, sources, type PipelineRunStatus } from "@topicpress/db";

import type { TopicpressDatabase } from "./database.js";
import { sanitizeErrorMessage } from "./feed-errors.js";
import { fetchAndNormalizeFeedSource } from "./feed-ingestion.js";
import type {
  FeedErrorClass,
  FeedHttpClient,
  FeedSource,
  FeedSourceIdentity,
  NormalizedSourceItemCandidate,
} from "./feed-types.js";
import { defaultIngestionPolicy, type IngestionPolicy } from "./ingestion-policy.js";
import {
  markSourceFetchFailed,
  markSourceFetchSucceeded,
  persistNormalizedSourceItems,
  SourceItemPersistenceError,
  type PersistSourceItemsResult,
} from "./source-item-persistence.js";

export type IngestionRunStatus = "succeeded" | "failed";
export type IngestionRunOutcome =
  | "success"
  | "partial_success"
  | "failed"
  | "no_active_sources"
  | "no_eligible_sources";
export type SourceRunOutcome = "succeeded" | "failed" | "skipped";
export type SourceRunErrorClass = FeedErrorClass | "persistence" | "runtime";

export interface IngestionSource extends FeedSource {
  readonly id: string;
  readonly name: string;
  readonly lastFetchedAt: Date | null;
  readonly lastErrorAt: Date | null;
  readonly lastErrorMessage: string | null;
}

export interface RunIngestionOptions {
  readonly force?: boolean;
  readonly now?: Date;
  readonly policy?: IngestionPolicy;
  readonly httpClient?: FeedHttpClient;
}

export interface IngestionRunResult {
  readonly ok: boolean;
  readonly exitCode: number;
  readonly summary: IngestionRunSummary;
}

export interface IngestionRunSummary {
  readonly runId: string;
  readonly status: IngestionRunStatus;
  readonly outcome: IngestionRunOutcome;
  readonly force: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly sources: SourceTotals;
  readonly items: ItemTotals;
  readonly sourceRuns: readonly SourceRunSummary[];
  readonly failures: readonly SourceFailureSummary[];
  readonly degradedSources: readonly SourceFailureSummary[];
}

export interface SourceTotals {
  readonly active: number;
  readonly eligible: number;
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skippedByRecrawl: number;
}

export interface ItemTotals {
  readonly candidates: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly skippedByFreshness: number;
  readonly conflicts: number;
}

export interface SourceRunSummary {
  readonly runId: string;
  readonly sourceId: string;
  readonly configKey: string;
  readonly outcome: SourceRunOutcome;
  readonly attempts: number;
  readonly retryCount: number;
  readonly candidates: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly skippedByFreshness: number;
  readonly degraded: boolean;
  readonly errorClass?: SourceRunErrorClass;
  readonly errorMessage?: string;
}

export interface SourceFailureSummary {
  readonly runId: string;
  readonly sourceId: string;
  readonly configKey: string;
  readonly errorClass: SourceRunErrorClass;
  readonly errorMessage: string;
  readonly degraded: boolean;
}

export interface IngestionRunStore {
  readonly listActiveSources: () => Promise<readonly IngestionSource[]>;
  readonly createPipelineRun: (input: CreatePipelineRunInput) => Promise<{ readonly id: string }>;
  readonly finishPipelineRun: (id: string, input: FinishPipelineRunInput) => Promise<void>;
  readonly persistSourceItems: (
    candidates: readonly NormalizedSourceItemCandidate[],
    options: { readonly now: Date },
  ) => Promise<PersistSourceItemsResult>;
  readonly markSourceFetchSucceeded: (
    source: FeedSourceIdentity,
    fetchedAt: Date,
    options: { readonly now: Date },
  ) => Promise<void>;
  readonly markSourceFetchFailed: (
    source: FeedSourceIdentity,
    failedAt: Date,
    errorMessage: string,
    options: { readonly now: Date },
  ) => Promise<void>;
  readonly listRecentSourceRuns: (
    sourceId: string,
    limit: number,
  ) => Promise<readonly SourceRunHistory[]>;
}

export interface CreatePipelineRunInput {
  readonly sourceId: string | null;
  readonly attempt: number;
  readonly startedAt: Date;
  readonly payload: JsonObject;
}

export interface FinishPipelineRunInput {
  readonly status: IngestionRunStatus;
  readonly attempt: number;
  readonly finishedAt: Date;
  readonly payload: JsonObject;
  readonly errorMessage?: string;
}

export interface SourceRunHistory {
  readonly status: PipelineRunStatus;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly errorMessage: string | null;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

const emptyPersistenceResult: PersistSourceItemsResult = {
  candidates: 0,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  matchedByGuid: 0,
  matchedByExternalUrl: 0,
  matchedByContentHash: 0,
  sourceMetadataUpdated: 0,
};

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

export function createDrizzleIngestionRunStore(db: TopicpressDatabase): IngestionRunStore {
  return {
    listActiveSources: async () => {
      const rows = await db
        .select({
          id: sources.id,
          configKey: sources.configKey,
          name: sources.name,
          kind: sources.kind,
          feedUrl: sources.feedUrl,
          language: sources.language,
          isActive: sources.isActive,
          lastFetchedAt: sources.lastFetchedAt,
          lastErrorAt: sources.lastErrorAt,
          lastErrorMessage: sources.lastErrorMessage,
        })
        .from(sources)
        .where(eq(sources.isActive, true))
        .orderBy(asc(sources.configKey));

      return rows;
    },
    createPipelineRun: async (input) => {
      const rows = await db
        .insert(pipelineRuns)
        .values({
          runType: "ingest",
          status: "running",
          sourceId: input.sourceId,
          attempt: input.attempt,
          startedAt: input.startedAt,
          payload: input.payload,
          createdAt: input.startedAt,
          updatedAt: input.startedAt,
        })
        .returning({ id: pipelineRuns.id });
      const row = rows[0];

      if (row === undefined) {
        throw new Error("Failed to create ingestion pipeline run.");
      }

      return row;
    },
    finishPipelineRun: async (id, input) => {
      await db
        .update(pipelineRuns)
        .set({
          status: input.status,
          attempt: input.attempt,
          finishedAt: input.finishedAt,
          payload: input.payload,
          errorMessage: input.errorMessage ?? null,
          updatedAt: input.finishedAt,
        })
        .where(eq(pipelineRuns.id, id));
    },
    persistSourceItems: (candidates, options) =>
      persistNormalizedSourceItems(db, candidates, {
        now: options.now,
        updateSourceFetchMetadata: true,
      }),
    markSourceFetchSucceeded: (source, fetchedAt, options) =>
      markSourceFetchSucceeded(db, source, fetchedAt, options),
    markSourceFetchFailed: (source, failedAt, errorMessage, options) =>
      markSourceFetchFailed(db, { source, failedAt, errorMessage }, options),
    listRecentSourceRuns: async (sourceId, limit) =>
      db
        .select({
          status: pipelineRuns.status,
          startedAt: pipelineRuns.startedAt,
          finishedAt: pipelineRuns.finishedAt,
          errorMessage: pipelineRuns.errorMessage,
        })
        .from(pipelineRuns)
        .where(and(eq(pipelineRuns.runType, "ingest"), eq(pipelineRuns.sourceId, sourceId)))
        .orderBy(desc(pipelineRuns.createdAt))
        .limit(limit),
  };
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

function partitionEligibleSources(
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

function buildSummary(
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

function failedFatalSummary(
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

function toSuccessfulSourceRunSummary(
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

function toAggregatePayload(summary: IngestionRunSummary, policy: IngestionPolicy): JsonObject {
  return {
    outcome: summary.outcome,
    status: summary.status,
    force: summary.force,
    startedAt: summary.startedAt,
    finishedAt: summary.finishedAt,
    policy: toPolicyPayload(policy),
    sources: {
      active: summary.sources.active,
      eligible: summary.sources.eligible,
      attempted: summary.sources.attempted,
      succeeded: summary.sources.succeeded,
      failed: summary.sources.failed,
      skippedByRecrawl: summary.sources.skippedByRecrawl,
    },
    items: {
      candidates: summary.items.candidates,
      inserted: summary.items.inserted,
      updated: summary.items.updated,
      unchanged: summary.items.unchanged,
      skippedByFreshness: summary.items.skippedByFreshness,
      conflicts: summary.items.conflicts,
    },
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

function toSourcePayload(source: IngestionSource): JsonObject {
  return {
    id: source.id,
    configKey: source.configKey,
    name: source.name,
    kind: source.kind,
    feedUrl: source.feedUrl,
    language: source.language,
  };
}

function toPolicyPayload(policy: IngestionPolicy): JsonObject {
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

function toPersistencePayload(result: PersistSourceItemsResult): JsonObject {
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

function aggregateErrorMessage(summary: IngestionRunSummary): string {
  if (summary.outcome === "no_active_sources") {
    return "No active sources are configured.";
  }

  if (summary.outcome === "failed" && summary.failures.length > 0) {
    return "All eligible sources failed.";
  }

  return "Ingestion run failed.";
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ingestion run failed.";
}

function sum<T>(items: readonly T[], readValue: (item: T) => number): number {
  return items.reduce((total, item) => total + readValue(item), 0);
}
