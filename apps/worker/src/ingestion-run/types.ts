import type { PipelineRunStatus } from "@topicpress/db";

import type {
  FeedErrorClass,
  FeedHttpClient,
  FeedSource,
  FeedSourceIdentity,
  JsonValue,
  NormalizedSourceItemCandidate,
} from "../feed-types.js";
import type { IngestionPolicy } from "../ingestion-policy.js";
import type { PersistSourceItemsResult } from "../source-item-persistence.js";

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

export type JsonObject = { readonly [key: string]: JsonValue };
