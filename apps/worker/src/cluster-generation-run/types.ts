import type { PipelineRunType } from "@topicpress/db";
import type { SiteConfig } from "@topicpress/config";
import type { DraftProvider } from "@topicpress/ai";

import type { ClusteringStore, ClusterSourceItemsResult } from "../clustering.js";
import type { DraftCreationStore } from "../draft-creation.js";
import type { JsonValue } from "../feed-types.js";

export type ClusterGenerationRunStatus = "succeeded" | "failed";
export type ClusterGenerationRunOutcome =
  | "success"
  | "partial_success"
  | "failed"
  | "cluster_failed"
  | "no_eligible_clusters";
export type ClusterGenerationAttemptOutcome = "created" | "existing_article" | "failed";
export type ClusterGenerationFailureClass =
  | "input_validation"
  | "provider_failed"
  | "validation_failed"
  | "draft_creation_failed"
  | "runtime";

export interface RunClusterGenerationOptions {
  readonly now?: Date;
  readonly limit?: number;
  readonly siteConfig?: SiteConfig;
  readonly provider?: DraftProvider;
}

export interface ClusterGenerationRunStores {
  readonly clusteringStore: ClusteringStore;
  readonly draftCreationStore: DraftCreationStore;
  readonly runStore: ClusterGenerationRunStore;
}

export interface ClusterGenerationRunResult {
  readonly ok: boolean;
  readonly exitCode: number;
  readonly summary: ClusterGenerationRunSummary;
}

export interface ClusterGenerationRunSummary {
  readonly runId: string;
  readonly clusterRunId: string;
  readonly generateRunId: string | null;
  readonly status: ClusterGenerationRunStatus;
  readonly outcome: ClusterGenerationRunOutcome;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly limit: number | null;
  readonly clustering: ClusterSourceItemsResult;
  readonly generation: ClusterGenerationTotals;
  readonly clusterRuns: readonly ClusterGenerationAttemptSummary[];
  readonly failures: readonly ClusterGenerationFailureSummary[];
}

export interface ClusterGenerationTotals {
  readonly eligible: number;
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly created: number;
  readonly existingArticles: number;
  readonly sourceItems: number;
}

export interface ClusterGenerationAttemptSummary {
  readonly runId: string;
  readonly clusterId: string;
  readonly canonicalTopic: string;
  readonly outcome: ClusterGenerationAttemptOutcome;
  readonly sourceItems: number;
  readonly articleId?: string;
  readonly provider?: string;
  readonly mode?: string;
  readonly generationRunId?: string;
  readonly errorClass?: ClusterGenerationFailureClass;
  readonly errorMessage?: string;
  readonly issues?: readonly string[];
}

export interface ClusterGenerationFailureSummary {
  readonly runId: string;
  readonly clusterId: string;
  readonly canonicalTopic: string;
  readonly errorClass: ClusterGenerationFailureClass;
  readonly errorMessage: string;
  readonly issues?: readonly string[];
}

export interface ClusterGenerationCandidate {
  readonly id: string;
  readonly status: "open" | "selected";
  readonly canonicalTopic: string;
}

export interface ClusterGenerationSourceItem {
  readonly sourceItemId: string;
  readonly sourceName: string;
  readonly title: string;
  readonly externalUrl: string;
  readonly summary: string | null;
  readonly contentText: string | null;
  readonly publishedAt: Date | null;
  readonly isPrimary: boolean;
}

export interface ClusterGenerationRunStore {
  readonly listGenerationCandidates: (
    limit: number | undefined,
  ) => Promise<readonly ClusterGenerationCandidate[]>;
  readonly listClusterSourceItems: (
    storyClusterId: string,
  ) => Promise<readonly ClusterGenerationSourceItem[]>;
  readonly createPipelineRun: (
    input: CreateClusterGenerationPipelineRunInput,
  ) => Promise<{ readonly id: string }>;
  readonly finishPipelineRun: (
    id: string,
    input: FinishClusterGenerationPipelineRunInput,
  ) => Promise<void>;
}

export interface CreateClusterGenerationPipelineRunInput {
  readonly runType: PipelineRunType;
  readonly attempt: number;
  readonly startedAt: Date;
  readonly payload: ClusterGenerationJsonObject;
  readonly storyClusterId?: string;
}

export interface FinishClusterGenerationPipelineRunInput {
  readonly status: ClusterGenerationRunStatus;
  readonly attempt: number;
  readonly finishedAt: Date;
  readonly payload: ClusterGenerationJsonObject;
  readonly errorMessage?: string;
  readonly articleId?: string;
}

export type ClusterGenerationJsonObject = { readonly [key: string]: JsonValue };
