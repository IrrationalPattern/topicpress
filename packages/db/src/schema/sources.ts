import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./common.js";
import { sourceKindEnum } from "./enums.js";

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configKey: text("config_key").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: sourceKindEnum("kind").notNull(),
    feedUrl: text("feed_url").notNull(),
    homepageUrl: text("homepage_url"),
    language: text("language").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastErrorMessage: text("last_error_message"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sources_config_key_unique").on(table.configKey),
    uniqueIndex("sources_slug_unique").on(table.slug),
    uniqueIndex("sources_feed_url_unique").on(table.feedUrl),
    index("sources_is_active_idx").on(table.isActive),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
