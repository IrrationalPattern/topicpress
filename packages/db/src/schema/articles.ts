import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, timestamps } from "./common.js";
import { articleHeroImageCandidateStatusEnum, articleStatusEnum } from "./enums.js";
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

export const articleHeroImageCandidates = pgTable(
  "article_hero_image_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    status: articleHeroImageCandidateStatusEnum("status").notNull().default("generated"),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    promptHash: text("prompt_hash").notNull(),
    stylePolicy: text("style_policy").notNull().default("editorial_illustration"),
    storageBucket: text("storage_bucket").notNull().default("article-hero-images"),
    storagePath: text("storage_path"),
    contentType: text("content_type"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    publicUrl: text("public_url"),
    reviewNotes: text("review_notes"),
    generationMetadata: jsonb("generation_metadata").notNull().default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("article_hero_image_candidates_article_id_unique").on(table.articleId),
    index("article_hero_image_candidates_status_idx").on(table.status),
    check(
      "article_hero_image_candidates_public_url_generated_check",
      sql`${table.publicUrl} is null or ${table.status} = 'generated'`,
    ),
    check(
      "article_hero_image_candidates_provider_openai_check",
      sql`${table.provider} = 'openai'`,
    ),
    check(
      "article_hero_image_candidates_style_policy_check",
      sql`${table.stylePolicy} = 'editorial_illustration'`,
    ),
    check(
      "article_hero_image_candidates_storage_bucket_public_check",
      sql`${table.storageBucket} = 'article-hero-images'`,
    ),
    check(
      "article_hero_image_candidates_content_type_check",
      sql`${table.contentType} is null or ${table.contentType} in ('image/png', 'image/webp')`,
    ),
    check("article_hero_image_candidates_width_positive_check", sql`${table.width} is null or ${table.width} > 0`),
    check("article_hero_image_candidates_height_positive_check", sql`${table.height} is null or ${table.height} > 0`),
    check(
      "article_hero_image_candidates_size_bytes_positive_check",
      sql`${table.sizeBytes} is null or ${table.sizeBytes} > 0`,
    ),
    check(
      "article_hero_image_candidates_storage_bucket_not_empty_check",
      sql`length(trim(${table.storageBucket})) > 0`,
    ),
    check(
      "article_hero_image_candidates_prompt_hash_not_empty_check",
      sql`length(trim(${table.promptHash})) > 0`,
    ),
  ],
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleLocalization = typeof articleLocalizations.$inferSelect;
export type NewArticleLocalization = typeof articleLocalizations.$inferInsert;
export type ArticleSource = typeof articleSources.$inferSelect;
export type NewArticleSource = typeof articleSources.$inferInsert;
export type ArticleHeroImageCandidate = typeof articleHeroImageCandidates.$inferSelect;
export type NewArticleHeroImageCandidate = typeof articleHeroImageCandidates.$inferInsert;
