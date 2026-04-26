import { boolean, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { timestamps } from "./common.js";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configKey: text("config_key").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_config_key_unique").on(table.configKey),
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_active_sort_order_idx").on(table.isActive, table.sortOrder),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
