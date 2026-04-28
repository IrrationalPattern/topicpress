import { and, asc, desc, eq } from "drizzle-orm";

import { pipelineRuns, sources } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import {
  markSourceFetchFailed,
  markSourceFetchSucceeded,
  persistNormalizedSourceItems,
} from "../source-item-persistence.js";
import type { IngestionRunStore } from "./types.js";

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
