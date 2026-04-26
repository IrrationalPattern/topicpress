import { pgEnum } from "drizzle-orm/pg-core";

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "review",
  "ready",
  "published",
  "failed",
]);

export const sourceItemStatusEnum = pgEnum("source_item_status", [
  "pending",
  "normalized",
  "clustered",
  "rejected",
  "failed",
]);

export const clusterStatusEnum = pgEnum("cluster_status", ["open", "selected", "processed", "ignored"]);

export const pipelineRunTypeEnum = pgEnum("pipeline_run_type", [
  "ingest",
  "cluster",
  "generate",
  "translate",
  "seo",
  "publish",
]);

export const pipelineRunStatusEnum = pgEnum("pipeline_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const sourceKindEnum = pgEnum("source_kind", ["rss", "atom", "json_feed"]);

export type ArticleStatus = (typeof articleStatusEnum.enumValues)[number];
export type SourceItemStatus = (typeof sourceItemStatusEnum.enumValues)[number];
export type ClusterStatus = (typeof clusterStatusEnum.enumValues)[number];
export type PipelineRunType = (typeof pipelineRunTypeEnum.enumValues)[number];
export type PipelineRunStatus = (typeof pipelineRunStatusEnum.enumValues)[number];
export type SourceKind = (typeof sourceKindEnum.enumValues)[number];
