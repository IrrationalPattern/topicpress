CREATE TYPE "public"."article_hero_image_candidate_status" AS ENUM('generated', 'failed');--> statement-breakpoint
CREATE TABLE "article_hero_image_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"status" "article_hero_image_candidate_status" DEFAULT 'generated' NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"style_policy" text DEFAULT 'editorial_illustration' NOT NULL,
	"storage_bucket" text DEFAULT 'article-hero-images' NOT NULL,
	"storage_path" text,
	"content_type" text,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"public_url" text,
	"review_notes" text,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_hero_image_candidates_public_url_generated_check" CHECK ("article_hero_image_candidates"."public_url" is null or "article_hero_image_candidates"."status" = 'generated'),
	CONSTRAINT "article_hero_image_candidates_provider_openai_check" CHECK ("article_hero_image_candidates"."provider" = 'openai'),
	CONSTRAINT "article_hero_image_candidates_style_policy_check" CHECK ("article_hero_image_candidates"."style_policy" = 'editorial_illustration'),
	CONSTRAINT "article_hero_image_candidates_storage_bucket_public_check" CHECK ("article_hero_image_candidates"."storage_bucket" = 'article-hero-images'),
	CONSTRAINT "article_hero_image_candidates_content_type_check" CHECK ("article_hero_image_candidates"."content_type" is null or "article_hero_image_candidates"."content_type" in ('image/png', 'image/webp')),
	CONSTRAINT "article_hero_image_candidates_width_positive_check" CHECK ("article_hero_image_candidates"."width" is null or "article_hero_image_candidates"."width" > 0),
	CONSTRAINT "article_hero_image_candidates_height_positive_check" CHECK ("article_hero_image_candidates"."height" is null or "article_hero_image_candidates"."height" > 0),
	CONSTRAINT "article_hero_image_candidates_size_bytes_positive_check" CHECK ("article_hero_image_candidates"."size_bytes" is null or "article_hero_image_candidates"."size_bytes" > 0),
	CONSTRAINT "article_hero_image_candidates_storage_bucket_not_empty_check" CHECK (length(trim("article_hero_image_candidates"."storage_bucket")) > 0),
	CONSTRAINT "article_hero_image_candidates_prompt_hash_not_empty_check" CHECK (length(trim("article_hero_image_candidates"."prompt_hash")) > 0)
);
--> statement-breakpoint
ALTER TABLE "article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_hero_image_candidates_article_id_unique" ON "article_hero_image_candidates" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_hero_image_candidates_status_idx" ON "article_hero_image_candidates" USING btree ("status");
