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
import { articleStatusEnum } from "./enums.js";
import { sourceItems, storyClusters } from "./ingestion.js";
import { categories } from "./taxonomy.js";

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyClusterId: uuid("story_cluster_id")
      .notNull()
      .references(() => storyClusters.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    slug: text("slug").notNull(),
    status: articleStatusEnum("status").notNull().default("draft"),
    primaryLocale: text("primary_locale").notNull(),
    heroImageUrl: text("hero_image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    generationMetadata: jsonb("generation_metadata").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("articles_slug_unique").on(table.slug),
    uniqueIndex("articles_story_cluster_id_unique").on(table.storyClusterId),
    index("articles_status_published_at_idx").on(table.status, table.publishedAt.desc()),
    index("articles_category_published_at_idx").on(table.categoryId, table.publishedAt.desc()),
  ],
);

export const articleLocalizations = pgTable(
  "article_localizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    locale: text("locale").notNull(),
    slug: text("slug"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    isMachineTranslated: boolean("is_machine_translated").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("article_localizations_article_locale_unique").on(table.articleId, table.locale),
    uniqueIndex("article_localizations_locale_slug_unique")
      .on(table.locale, table.slug)
      .where(sql`${table.slug} is not null`),
    index("article_localizations_locale_idx").on(table.locale),
  ],
);

export const articleSources = pgTable(
  "article_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id),
    role: text("role").notNull().default("supporting"),
    ...createdAt,
  },
  (table) => [
    uniqueIndex("article_sources_article_source_item_unique").on(table.articleId, table.sourceItemId),
    index("article_sources_source_item_id_idx").on(table.sourceItemId),
  ],
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleLocalization = typeof articleLocalizations.$inferSelect;
export type NewArticleLocalization = typeof articleLocalizations.$inferInsert;
export type ArticleSource = typeof articleSources.$inferSelect;
export type NewArticleSource = typeof articleSources.$inferInsert;
