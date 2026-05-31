ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_public_url_approved_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_public_url_generated_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_provider_openai_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_style_policy_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_storage_bucket_public_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" DROP CONSTRAINT IF EXISTS "article_hero_image_candidates_content_type_check";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
CREATE TYPE "public"."article_hero_image_candidate_status_m5_5" AS ENUM('generated', 'failed');
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates"
  ALTER COLUMN "status" TYPE "public"."article_hero_image_candidate_status_m5_5"
  USING (
    CASE
      WHEN "status"::text = 'generated' THEN 'generated'
      WHEN "status"::text = 'approved' AND "public_url" IS NOT NULL THEN 'generated'
      ELSE 'failed'
    END
  )::"public"."article_hero_image_candidate_status_m5_5";
--> statement-breakpoint
DROP TYPE "public"."article_hero_image_candidate_status";
--> statement-breakpoint
ALTER TYPE "public"."article_hero_image_candidate_status_m5_5" RENAME TO "article_hero_image_candidate_status";
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ALTER COLUMN "status" SET DEFAULT 'generated';
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ALTER COLUMN "storage_bucket" SET DEFAULT 'article-hero-images';
--> statement-breakpoint
UPDATE "public"."article_hero_image_candidates"
SET "storage_bucket" = 'article-hero-images'
WHERE "storage_bucket" <> 'article-hero-images';
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_public_url_generated_check" CHECK ("public_url" IS NULL OR "status" = 'generated');
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_provider_openai_check" CHECK ("provider" = 'openai');
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_style_policy_check" CHECK ("style_policy" = 'editorial_illustration');
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_storage_bucket_public_check" CHECK ("storage_bucket" = 'article-hero-images');
--> statement-breakpoint
ALTER TABLE "public"."article_hero_image_candidates" ADD CONSTRAINT "article_hero_image_candidates_content_type_check" CHECK ("content_type" IS NULL OR "content_type" IN ('image/png', 'image/webp'));
--> statement-breakpoint
INSERT INTO "storage"."buckets" (
  "id",
  "name",
  "owner",
  "public",
  "file_size_limit",
  "allowed_mime_types",
  "created_at",
  "updated_at"
) VALUES (
  'article-hero-images',
  'article-hero-images',
  NULL,
  TRUE,
  10485760,
  ARRAY['image/png', 'image/webp']::text[],
  now(),
  now()
) ON CONFLICT ("id") DO UPDATE SET
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types",
  "updated_at" = now();
