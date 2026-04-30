import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  articles,
  pipelineRuns,
  sourceItems,
  sources,
  storyClusterItems,
  storyClusters,
} from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { ClusterGenerationRunStore } from "./types.js";

export function createDrizzleClusterGenerationRunStore(
  db: TopicpressDatabase,
): ClusterGenerationRunStore {
  return {
    listGenerationCandidates: async (limit) => {
      const query = db
        .select({
          id: storyClusters.id,
          status: storyClusters.status,
          canonicalTopic: storyClusters.canonicalTopic,
        })
        .from(storyClusters)
        .leftJoin(articles, eq(articles.storyClusterId, storyClusters.id))
        .where(
          and(
            inArray(storyClusters.status, ["open", "selected"]),
            isNull(articles.id),
          ),
        )
        .orderBy(asc(storyClusters.lastSeenAt), asc(storyClusters.id));

      const rows = limit === undefined ? await query : await query.limit(limit);

      return rows.filter((row): row is typeof row & { readonly status: "open" | "selected" } =>
        row.status === "open" || row.status === "selected"
      );
    },
    listClusterSourceItems: (storyClusterId) =>
      db
        .select({
          sourceItemId: sourceItems.id,
          sourceName: sources.name,
          title: sourceItems.title,
          externalUrl: sourceItems.externalUrl,
          summary: sourceItems.summary,
          contentText: sourceItems.contentText,
          publishedAt: sourceItems.publishedAt,
          isPrimary: storyClusterItems.isPrimary,
        })
        .from(storyClusterItems)
        .innerJoin(sourceItems, eq(storyClusterItems.sourceItemId, sourceItems.id))
        .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
        .where(eq(storyClusterItems.storyClusterId, storyClusterId))
        .orderBy(desc(storyClusterItems.isPrimary), asc(sourceItems.publishedAt), asc(sourceItems.id)),
    createPipelineRun: async (input) => {
      const rows = await db
        .insert(pipelineRuns)
        .values({
          runType: input.runType,
          status: "running",
          storyClusterId: input.storyClusterId ?? null,
          attempt: input.attempt,
          startedAt: input.startedAt,
          payload: input.payload,
          createdAt: input.startedAt,
          updatedAt: input.startedAt,
        })
        .returning({ id: pipelineRuns.id });
      const row = rows[0];

      if (row === undefined) {
        throw new Error(`Failed to create ${input.runType} pipeline run.`);
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
          ...(input.articleId !== undefined ? { articleId: input.articleId } : {}),
          updatedAt: input.finishedAt,
        })
        .where(eq(pipelineRuns.id, id));
    },
  };
}
