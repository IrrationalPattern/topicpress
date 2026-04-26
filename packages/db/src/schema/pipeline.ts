import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { articles } from "./articles.js";
import { timestamps } from "./common.js";
import { pipelineRunStatusEnum, pipelineRunTypeEnum } from "./enums.js";
import { sourceItems, storyClusters } from "./ingestion.js";
import { sources } from "./sources.js";

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runType: pipelineRunTypeEnum("run_type").notNull(),
    status: pipelineRunStatusEnum("status").notNull().default("queued"),
    sourceId: uuid("source_id").references(() => sources.id),
    sourceItemId: uuid("source_item_id").references(() => sourceItems.id),
    storyClusterId: uuid("story_cluster_id").references(() => storyClusters.id),
    articleId: uuid("article_id").references(() => articles.id),
    attempt: integer("attempt").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    payload: jsonb("payload").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index("pipeline_runs_type_status_created_at_idx").on(table.runType, table.status, table.createdAt.desc()),
    index("pipeline_runs_article_id_idx").on(table.articleId),
    index("pipeline_runs_story_cluster_id_idx").on(table.storyClusterId),
    index("pipeline_runs_source_item_id_idx").on(table.sourceItemId),
  ],
);

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;
