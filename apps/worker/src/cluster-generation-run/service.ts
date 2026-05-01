import { siteConfig as defaultSiteConfig } from "@topicpress/config";
import {
  buildArticleGenerationInput,
  createDraftProvider,
  DraftValidationError,
  DraftValidationInputError,
  generateArticleDraft,
  type ArticleGenerationInput,
  type ArticleSourceInput,
} from "@topicpress/ai";

import { clusterSourceItemsWithStore } from "../clustering.js";
import type { TopicpressDatabase } from "../database.js";
import { createDraftArticleForClusterWithStore } from "../draft-creation.js";
import { sanitizeErrorMessage } from "../feed-errors.js";
import { createDrizzleClusteringStore } from "../clustering/drizzle-store.js";
import { createDrizzleDraftCreationStore } from "../draft-creation/drizzle-store.js";
import { createDrizzleClusterGenerationRunStore } from "./drizzle-store.js";
import type {
  ClusterGenerationAttemptSummary,
  ClusterGenerationCandidate,
  ClusterGenerationFailureClass,
  ClusterGenerationFailureSummary,
  ClusterGenerationRunResult,
  ClusterGenerationRunStores,
  ClusterGenerationRunSummary,
  ClusterGenerationSourceItem,
  ClusterGenerationTotals,
  ClusterGenerationJsonObject,
  RunClusterGenerationOptions,
} from "./types.js";

const emptyClusteringResult: ClusterGenerationRunSummary["clustering"] = {
  candidates: 0,
  clustered: 0,
  alreadyClustered: 0,
  clustersCreated: 0,
  clustersUpdated: 0,
  primaryAssignmentsChanged: 0,
} as const;

export async function runClusterGeneration(
  db: TopicpressDatabase,
  options: RunClusterGenerationOptions = {},
): Promise<ClusterGenerationRunResult> {
  return runClusterGenerationWithStores(
    {
      clusteringStore: createDrizzleClusteringStore(db),
      draftCreationStore: createDrizzleDraftCreationStore(db),
      runStore: createDrizzleClusterGenerationRunStore(db),
    },
    options,
  );
}

export async function runClusterGenerationWithStores(
  stores: ClusterGenerationRunStores,
  options: RunClusterGenerationOptions = {},
): Promise<ClusterGenerationRunResult> {
  const startedAt = options.now ?? new Date();
  const limit = options.limit;
  const clusterRun = await stores.runStore.createPipelineRun({
    runType: "cluster",
    attempt: 1,
    startedAt,
    payload: {
      outcome: "running",
      limit: limit ?? null,
      startedAt: startedAt.toISOString(),
    },
  });

  let clustering = emptyClusteringResult;

  try {
    clustering = await clusterSourceItemsWithStore(stores.clusteringStore, {
      now: startedAt,
      ...(limit !== undefined ? { limit } : {}),
    });

    await stores.runStore.finishPipelineRun(clusterRun.id, {
      status: "succeeded",
      attempt: 1,
      finishedAt: startedAt,
      payload: {
        outcome: "succeeded",
        limit: limit ?? null,
        ...clustering,
      },
    });
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(readErrorMessage(error, "Clustering failed."));

    await stores.runStore.finishPipelineRun(clusterRun.id, {
      status: "failed",
      attempt: 1,
      finishedAt: startedAt,
      errorMessage,
      payload: {
        outcome: "failed",
        limit: limit ?? null,
        errorClass: "runtime",
        errorMessage,
      },
    });

    const summary = buildRunSummary({
      runId: clusterRun.id,
      clusterRunId: clusterRun.id,
      generateRunId: null,
      status: "failed",
      outcome: "cluster_failed",
      startedAt,
      finishedAt: startedAt,
      limit: limit ?? null,
      clustering,
      eligible: 0,
      clusterRuns: [],
    });

    return { ok: false, exitCode: 1, summary };
  }

  const generateRun = await stores.runStore.createPipelineRun({
    runType: "generate",
    attempt: 1,
    startedAt,
    payload: {
      outcome: "running",
      clusterRunId: clusterRun.id,
      limit: limit ?? null,
      startedAt: startedAt.toISOString(),
    },
  });

  const candidates = await stores.runStore.listGenerationCandidates(limit);
  const clusterRuns: ClusterGenerationAttemptSummary[] = [];

  for (const candidate of candidates) {
    clusterRuns.push(await attemptClusterGeneration(stores, candidate, startedAt, options));
  }

  const totals = buildGenerationTotals(candidates.length, clusterRuns);
  const outcome = generationOutcome(totals);
  const status = outcome === "failed" ? "failed" : "succeeded";
  const summary = buildRunSummary({
    runId: generateRun.id,
    clusterRunId: clusterRun.id,
    generateRunId: generateRun.id,
    status,
    outcome,
    startedAt,
    finishedAt: startedAt,
    limit: limit ?? null,
    clustering,
    eligible: candidates.length,
    clusterRuns,
  });

  await stores.runStore.finishPipelineRun(generateRun.id, {
    status,
    attempt: 1,
    finishedAt: startedAt,
    ...(status === "failed" ? { errorMessage: aggregateErrorMessage(summary.failures) } : {}),
    payload: {
      outcome,
      clusterRunId: clusterRun.id,
      limit: limit ?? null,
      generation: toTotalsPayload(totals),
      clusterRunIds: clusterRuns.map((run) => run.runId),
      failures: summary.failures.map(toFailurePayload),
    },
  });

  return { ok: status === "succeeded", exitCode: status === "succeeded" ? 0 : 1, summary };
}

async function attemptClusterGeneration(
  stores: ClusterGenerationRunStores,
  cluster: ClusterGenerationCandidate,
  now: Date,
  options: RunClusterGenerationOptions,
): Promise<ClusterGenerationAttemptSummary> {
  const run = await stores.runStore.createPipelineRun({
    runType: "generate",
    attempt: 1,
    storyClusterId: cluster.id,
    startedAt: now,
    payload: {
      outcome: "running",
      cluster: toClusterPayload(cluster),
    },
  });
  let sourceItemCount = 0;

  try {
    const sourceItems = await stores.runStore.listClusterSourceItems(cluster.id);
    sourceItemCount = sourceItems.length;
    const generationInput = buildGenerationInput(cluster, sourceItems, options);
    const draft = await generateArticleDraft(generationInput, {
      siteConfig: options.siteConfig ?? defaultSiteConfig,
      now,
      provider: options.provider ?? createDraftProvider(),
    });
    const draftResult = await createDraftArticleForClusterWithStore(
      stores.draftCreationStore,
      {
        cluster,
        draft,
        generationInput,
      },
      {
        now,
        siteConfig: options.siteConfig ?? defaultSiteConfig,
        locale: generationInput.locale,
      },
    );

    if (!draftResult.ok) {
      return failClusterRun(stores, run.id, cluster, now, sourceItems.length, {
        errorClass: "draft_creation_failed",
        errorMessage: draftResult.error.message,
        ...(draftResult.error.issues !== undefined ? { issues: draftResult.error.issues } : {}),
      });
    }

    const outcome = draftResult.created ? "created" : "existing_article";
    const summary: ClusterGenerationAttemptSummary = {
      runId: run.id,
      clusterId: cluster.id,
      canonicalTopic: cluster.canonicalTopic,
      outcome,
      sourceItems: sourceItems.length,
      articleId: draftResult.article.id,
      provider: draft.generation.provider,
      mode: draft.generation.mode,
      generationRunId: draft.generation.generationRunId,
    };

    await stores.runStore.finishPipelineRun(run.id, {
      status: "succeeded",
      attempt: 1,
      finishedAt: now,
      articleId: draftResult.article.id,
      payload: {
        outcome,
        cluster: toClusterPayload(cluster),
        sourceItems: sourceItems.length,
        articleId: draftResult.article.id,
        created: draftResult.created,
        sourceCount: draftResult.sourceCount,
        generation: {
          generationRunId: draft.generation.generationRunId,
          provider: draft.generation.provider,
          mode: draft.generation.mode,
          locale: draft.generation.locale,
          promptHash: draft.generation.promptHash,
          inputHash: draft.generation.inputHash,
          ...(draft.generation.model !== undefined ? { model: draft.generation.model } : {}),
          ...(draft.generation.fixtureKey !== undefined
            ? { fixtureKey: draft.generation.fixtureKey }
            : {}),
        },
      },
    });

    return summary;
  } catch (error) {
    return failClusterRun(stores, run.id, cluster, now, sourceItemCount, classifyGenerationError(error));
  }
}

function buildGenerationInput(
  cluster: ClusterGenerationCandidate,
  sourceItems: readonly ClusterGenerationSourceItem[],
  options: RunClusterGenerationOptions,
): ArticleGenerationInput {
  const primarySourceItemId =
    sourceItems.find((sourceItem) => sourceItem.isPrimary)?.sourceItemId ??
    sourceItems[0]?.sourceItemId;
  const articleSources: readonly ArticleSourceInput[] = sourceItems.map((sourceItem) => ({
    sourceItemId: sourceItem.sourceItemId,
    sourceName: sourceItem.sourceName,
    title: sourceItem.title,
    url: sourceItem.externalUrl,
    ...(sourceItem.publishedAt !== null ? { publishedAt: sourceItem.publishedAt.toISOString() } : {}),
    ...(sourceItem.summary !== null ? { excerpt: sourceItem.summary } : {}),
    ...(sourceItem.contentText !== null ? { contentText: sourceItem.contentText } : {}),
  }));

  return buildArticleGenerationInput(articleSources, {
    storyClusterId: cluster.id,
    ...(primarySourceItemId !== undefined ? { primarySourceItemId } : {}),
    siteConfig: options.siteConfig ?? defaultSiteConfig,
    keywordHints: keywordHints(cluster.canonicalTopic),
  });
}

async function failClusterRun(
  stores: ClusterGenerationRunStores,
  runId: string,
  cluster: ClusterGenerationCandidate,
  now: Date,
  sourceItems: number,
  failure: {
    readonly errorClass: ClusterGenerationFailureClass;
    readonly errorMessage: string;
    readonly issues?: readonly string[];
  },
): Promise<ClusterGenerationAttemptSummary> {
  const errorMessage = sanitizeErrorMessage(failure.errorMessage);
  const summary: ClusterGenerationAttemptSummary = {
    runId,
    clusterId: cluster.id,
    canonicalTopic: cluster.canonicalTopic,
    outcome: "failed",
    sourceItems,
    errorClass: failure.errorClass,
    errorMessage,
    ...(failure.issues !== undefined ? { issues: failure.issues } : {}),
  };

  await stores.runStore.finishPipelineRun(runId, {
    status: "failed",
    attempt: 1,
    finishedAt: now,
    errorMessage,
    payload: {
      outcome: "failed",
      cluster: toClusterPayload(cluster),
      sourceItems,
      errorClass: failure.errorClass,
      errorMessage,
      ...(failure.issues !== undefined ? { issues: failure.issues } : {}),
    },
  });

  return summary;
}

function classifyGenerationError(error: unknown): {
  readonly errorClass: ClusterGenerationFailureClass;
  readonly errorMessage: string;
  readonly issues?: readonly string[];
} {
  if (error instanceof DraftValidationInputError) {
    return {
      errorClass: "input_validation",
      errorMessage: error.message,
      issues: error.issues,
    };
  }

  if (error instanceof DraftValidationError) {
    return {
      errorClass: "validation_failed",
      errorMessage: error.message,
      issues: error.issues,
    };
  }

  return {
    errorClass: "provider_failed",
    errorMessage: readErrorMessage(error, "Draft generation failed."),
  };
}

function buildRunSummary(input: {
  readonly runId: string;
  readonly clusterRunId: string;
  readonly generateRunId: string | null;
  readonly status: ClusterGenerationRunSummary["status"];
  readonly outcome: ClusterGenerationRunSummary["outcome"];
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly limit: number | null;
  readonly clustering: ClusterGenerationRunSummary["clustering"];
  readonly eligible: number;
  readonly clusterRuns: readonly ClusterGenerationAttemptSummary[];
}): ClusterGenerationRunSummary {
  const failures = input.clusterRuns
    .filter((run): run is ClusterGenerationAttemptSummary & {
      readonly errorClass: ClusterGenerationFailureClass;
      readonly errorMessage: string;
    } => run.outcome === "failed" && run.errorClass !== undefined && run.errorMessage !== undefined)
    .map((run) => ({
      runId: run.runId,
      clusterId: run.clusterId,
      canonicalTopic: run.canonicalTopic,
      errorClass: run.errorClass,
      errorMessage: run.errorMessage,
      ...(run.issues !== undefined ? { issues: run.issues } : {}),
    }));

  return {
    runId: input.runId,
    clusterRunId: input.clusterRunId,
    generateRunId: input.generateRunId,
    status: input.status,
    outcome: input.outcome,
    startedAt: input.startedAt.toISOString(),
    finishedAt: input.finishedAt.toISOString(),
    limit: input.limit,
    clustering: input.clustering,
    generation: buildGenerationTotals(input.eligible, input.clusterRuns),
    clusterRuns: input.clusterRuns,
    failures,
  };
}

function buildGenerationTotals(
  eligible: number,
  clusterRuns: readonly ClusterGenerationAttemptSummary[],
): ClusterGenerationTotals {
  return {
    eligible,
    attempted: clusterRuns.length,
    succeeded: clusterRuns.filter((run) => run.outcome !== "failed").length,
    failed: clusterRuns.filter((run) => run.outcome === "failed").length,
    created: clusterRuns.filter((run) => run.outcome === "created").length,
    existingArticles: clusterRuns.filter((run) => run.outcome === "existing_article").length,
    sourceItems: clusterRuns.reduce((total, run) => total + run.sourceItems, 0),
  };
}

function generationOutcome(totals: ClusterGenerationTotals): ClusterGenerationRunSummary["outcome"] {
  if (totals.eligible === 0) {
    return "no_eligible_clusters";
  }

  if (totals.failed === 0) {
    return "success";
  }

  return totals.succeeded > 0 ? "partial_success" : "failed";
}

function aggregateErrorMessage(failures: readonly ClusterGenerationFailureSummary[]): string {
  if (failures.length === 0) {
    return "Cluster generation failed.";
  }

  if (failures.length === 1) {
    return failures[0]?.errorMessage ?? "Cluster generation failed.";
  }

  return `${failures.length} cluster generation attempts failed.`;
}

function toClusterPayload(cluster: ClusterGenerationCandidate): ClusterGenerationJsonObject {
  return {
    id: cluster.id,
    status: cluster.status,
    canonicalTopic: cluster.canonicalTopic,
  };
}

function toTotalsPayload(totals: ClusterGenerationTotals): ClusterGenerationJsonObject {
  return {
    eligible: totals.eligible,
    attempted: totals.attempted,
    succeeded: totals.succeeded,
    failed: totals.failed,
    created: totals.created,
    existingArticles: totals.existingArticles,
    sourceItems: totals.sourceItems,
  };
}

function toFailurePayload(
  failure: ClusterGenerationFailureSummary,
): ClusterGenerationJsonObject {
  return {
    runId: failure.runId,
    clusterId: failure.clusterId,
    canonicalTopic: failure.canonicalTopic,
    errorClass: failure.errorClass,
    errorMessage: failure.errorMessage,
    ...(failure.issues !== undefined ? { issues: failure.issues } : {}),
  };
}

function keywordHints(canonicalTopic: string): readonly string[] {
  return canonicalTopic
    .split(/\W+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
