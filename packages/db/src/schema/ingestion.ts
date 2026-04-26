import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, timestamps } from "./common.js";
import { clusterStatusEnum, sourceItemStatusEnum } from "./enums.js";
import { sources } from "./sources.js";

export const sourceItems = pgTable(
  "source_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalGuid: text("external_guid"),
    externalUrl: text("external_url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentText: text("content_text"),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    contentHash: text("content_hash").notNull(),
    language: text("language").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    status: sourceItemStatusEnum("status").notNull().default("pending"),
    normalizedTitle: text("normalized_title"),
    normalizedSummary: text("normalized_summary"),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("source_items_external_url_unique").on(table.externalUrl),
    uniqueIndex("source_items_source_guid_unique")
      .on(table.sourceId, table.externalGuid)
      .where(sql`${table.externalGuid} is not null`),
    index("source_items_source_fetched_at_idx").on(table.sourceId, table.fetchedAt.desc()),
    index("source_items_source_content_hash_idx").on(table.sourceId, table.contentHash),
    index("source_items_content_hash_idx").on(table.contentHash),
    index("source_items_status_idx").on(table.status),
    index("source_items_published_at_idx").on(table.publishedAt.desc()),
  ],
);

export const storyClusters = pgTable(
  "story_clusters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalTopic: text("canonical_topic").notNull(),
    summary: text("summary"),
    status: clusterStatusEnum("status").notNull().default("open"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    selectedForGenerationAt: timestamp("selected_for_generation_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("story_clusters_status_idx").on(table.status),
    index("story_clusters_last_seen_at_idx").on(table.lastSeenAt.desc()),
  ],
);

export const storyClusterItems = pgTable(
  "story_cluster_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyClusterId: uuid("story_cluster_id")
      .notNull()
      .references(() => storyClusters.id),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...createdAt,
  },
  (table) => [
    uniqueIndex("story_cluster_items_cluster_source_unique").on(table.storyClusterId, table.sourceItemId),
    uniqueIndex("story_cluster_items_source_item_unique").on(table.sourceItemId),
    index("story_cluster_items_story_cluster_id_idx").on(table.storyClusterId),
  ],
);

export type SourceItem = typeof sourceItems.$inferSelect;
export type NewSourceItem = typeof sourceItems.$inferInsert;
export type StoryCluster = typeof storyClusters.$inferSelect;
export type NewStoryCluster = typeof storyClusters.$inferInsert;
export type StoryClusterItem = typeof storyClusterItems.$inferSelect;
export type NewStoryClusterItem = typeof storyClusterItems.$inferInsert;
