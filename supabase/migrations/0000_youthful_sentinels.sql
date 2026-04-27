CREATE TYPE "public"."article_status" AS ENUM('draft', 'review', 'ready', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cluster_status" AS ENUM('open', 'selected', 'processed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_type" AS ENUM('ingest', 'cluster', 'generate', 'translate', 'seo', 'publish');--> statement-breakpoint
CREATE TYPE "public"."source_item_status" AS ENUM('pending', 'normalized', 'clustered', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('rss', 'atom', 'json_feed');--> statement-breakpoint
CREATE TABLE "article_localizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"subtitle" text,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"is_machine_translated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"role" text DEFAULT 'supporting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_cluster_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"primary_locale" text NOT NULL,
	"hero_image_url" text,
	"published_at" timestamp with time zone,
	"review_notes" text,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_guid" text,
	"external_url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content_text" text,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"language" text NOT NULL,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "source_item_status" DEFAULT 'pending' NOT NULL,
	"normalized_title" text,
	"normalized_summary" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_cluster_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_cluster_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_topic" text NOT NULL,
	"summary" text,
	"status" "cluster_status" DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"selected_for_generation_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_type" "pipeline_run_type" NOT NULL,
	"status" "pipeline_run_status" DEFAULT 'queued' NOT NULL,
	"source_id" uuid,
	"source_item_id" uuid,
	"story_cluster_id" uuid,
	"article_id" uuid,
	"attempt" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_message" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"feed_url" text NOT NULL,
	"homepage_url" text,
	"language" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_localizations" ADD CONSTRAINT "article_localizations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_story_cluster_id_story_clusters_id_fk" FOREIGN KEY ("story_cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_items" ADD CONSTRAINT "source_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_cluster_items" ADD CONSTRAINT "story_cluster_items_story_cluster_id_story_clusters_id_fk" FOREIGN KEY ("story_cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_cluster_items" ADD CONSTRAINT "story_cluster_items_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_story_cluster_id_story_clusters_id_fk" FOREIGN KEY ("story_cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_localizations_article_locale_unique" ON "article_localizations" USING btree ("article_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "article_localizations_locale_slug_unique" ON "article_localizations" USING btree ("locale","slug") WHERE "article_localizations"."slug" is not null;--> statement-breakpoint
CREATE INDEX "article_localizations_locale_idx" ON "article_localizations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "article_sources_article_source_item_unique" ON "article_sources" USING btree ("article_id","source_item_id");--> statement-breakpoint
CREATE INDEX "article_sources_source_item_id_idx" ON "article_sources" USING btree ("source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_story_cluster_id_unique" ON "articles" USING btree ("story_cluster_id");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "articles" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_category_published_at_idx" ON "articles" USING btree ("category_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_external_url_unique" ON "source_items" USING btree ("external_url");--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_source_guid_unique" ON "source_items" USING btree ("source_id","external_guid") WHERE "source_items"."external_guid" is not null;--> statement-breakpoint
CREATE INDEX "source_items_source_fetched_at_idx" ON "source_items" USING btree ("source_id","fetched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_items_source_content_hash_idx" ON "source_items" USING btree ("source_id","content_hash");--> statement-breakpoint
CREATE INDEX "source_items_content_hash_idx" ON "source_items" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "source_items_status_idx" ON "source_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_items_published_at_idx" ON "source_items" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "story_cluster_items_cluster_source_unique" ON "story_cluster_items" USING btree ("story_cluster_id","source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_cluster_items_source_item_unique" ON "story_cluster_items" USING btree ("source_item_id");--> statement-breakpoint
CREATE INDEX "story_cluster_items_story_cluster_id_idx" ON "story_cluster_items" USING btree ("story_cluster_id");--> statement-breakpoint
CREATE INDEX "story_clusters_status_idx" ON "story_clusters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "story_clusters_last_seen_at_idx" ON "story_clusters" USING btree ("last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pipeline_runs_type_status_created_at_idx" ON "pipeline_runs" USING btree ("run_type","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pipeline_runs_article_id_idx" ON "pipeline_runs" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_story_cluster_id_idx" ON "pipeline_runs" USING btree ("story_cluster_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_source_item_id_idx" ON "pipeline_runs" USING btree ("source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_config_key_unique" ON "sources" USING btree ("config_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_unique" ON "sources" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_feed_url_unique" ON "sources" USING btree ("feed_url");--> statement-breakpoint
CREATE INDEX "sources_is_active_idx" ON "sources" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_config_key_unique" ON "categories" USING btree ("config_key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_active_sort_order_idx" ON "categories" USING btree ("is_active","sort_order");