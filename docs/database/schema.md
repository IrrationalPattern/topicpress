# Database Schema

Updated: 2026-05-21

## Sources Reviewed

- `docs/PROJECT_STATE.md`
- `docs/product/vision.md`
- ADRs under `docs/architecture/adr/`
- Drizzle schema under `packages/db/src/schema/`
- Applied migration `supabase/migrations/0000_youthful_sentinels.sql`
- Imported Obsidian schema context from `Projects/Topicpress/02-specs/drizzle-schema-design.md`

## Purpose

Topicpress uses Supabase Postgres as the system of record for operational publishing state. The MVP schema supports one independently deployed publication per database. It stores configured source and category registries, ingested source material, story clusters, review-gated generated articles, article localization content, article-to-source lineage, and pipeline execution history.

The schema intentionally stays small for MVP:

- one site per database, with no runtime `sites`, `site_locales`, or `site_id` columns;
- repo configuration owns durable site setup;
- Postgres owns mutable operational state;
- generated content must pass manual review before publication;
- one story cluster can produce at most one canonical article;
- worker execution uses state polling plus `pipeline_runs` history, not a dedicated queue table.

## Config and State Boundary

Repo-owned configuration, mainly `packages/config`, owns durable site identity and setup: domain, locales, taxonomy definitions, source definitions, editorial rules, SEO defaults, and theme tokens.

The database stores operational rows needed by the worker and public renderer:

- `sources` and `categories` are runtime registry tables synced from configuration through stable `config_key` values.
- Removed or disabled configured sources/categories should be deactivated with `is_active = false`, not deleted, because other operational rows may reference them.
- Article, ingestion, clustering, publishing, and pipeline status are database-owned state.
- Localized public labels may come from config, while article localization bodies and SEO fields are persisted in `article_localizations`.

## Enums

`article_status`

- `draft`: generated or manually created content not yet ready for review.
- `review`: content awaiting human review.
- `ready`: review-approved content eligible for publication.
- `published`: durable public content. Public rendering must also require non-null `published_at`.
- `failed`: content that failed generation, review, validation, or publication.

`source_item_status`

- `pending`: ingested but not normalized or clustered.
- `normalized`: normalized and eligible for clustering.
- `clustered`: assigned to a story cluster.
- `rejected`: excluded from downstream article generation.
- `failed`: ingestion or normalization failed.

`cluster_status`

- `open`: cluster may accept source items.
- `selected`: cluster selected for generation.
- `processed`: cluster has completed generation processing.
- `ignored`: cluster intentionally excluded.

`pipeline_run_type`

- `ingest`, `cluster`, `generate`, `translate`, `seo`, `publish`

`pipeline_run_status`

- `queued`, `running`, `succeeded`, `failed`, `cancelled`

`source_kind`

- `rss`, `atom`, `json_feed`

## Tables

### `sources`

Config-synced registry of approved structured feeds.

Important columns:

- `id` UUID primary key.
- `config_key` stable key from repo configuration.
- `name`, `slug`, `kind`, `feed_url`, `homepage_url`, `language`.
- `is_active` controls worker eligibility and public/editorial source visibility.
- `last_fetched_at`, `last_error_at`, `last_error_message` capture source health.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Unique: `sources_config_key_unique`, `sources_slug_unique`, `sources_feed_url_unique`.
- Lookup/filter: `sources_is_active_idx`.

### `categories`

Config-synced taxonomy used for classification and public category pages.

Important columns:

- `id` UUID primary key.
- `config_key` stable key from repo configuration.
- `slug`, `name`, `description`.
- `parent_id` optional self-reference for category hierarchy.
- `sort_order`, `is_active`.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Unique: `categories_config_key_unique`, `categories_slug_unique`.
- Foreign key: `parent_id` references `categories.id`.
- Lookup/filter: `categories_parent_id_idx`, `categories_active_sort_order_idx`.

### `source_items`

Durable normalized source material ingested from configured feeds.

Important columns:

- `id` UUID primary key.
- `source_id` references `sources.id`.
- `external_guid`, `external_url`.
- `title`, `summary`, `content_text`, `raw_payload`.
- `content_hash` for dedupe and similarity checks.
- `language`, `published_at`, `fetched_at`.
- `status`, `normalized_title`, `normalized_summary`, `error_message`.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Unique: `source_items_external_url_unique`.
- Partial unique: `source_items_source_guid_unique` on `(source_id, external_guid)` where `external_guid is not null`.
- Lookup/dedupe: `source_items_source_fetched_at_idx`, `source_items_source_content_hash_idx`, `source_items_content_hash_idx`.
- Worker filters: `source_items_status_idx`, `source_items_published_at_idx`.

### `story_clusters`

Groups related source items into a generation unit.

Important columns:

- `id` UUID primary key.
- `canonical_topic`, `summary`.
- `status`.
- `first_seen_at`, `last_seen_at`.
- `selected_for_generation_at`.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Worker filters: `story_clusters_status_idx`.
- Recency ordering: `story_clusters_last_seen_at_idx`.

### `story_cluster_items`

Join table assigning source items to clusters.

Important columns:

- `id` UUID primary key.
- `story_cluster_id` references `story_clusters.id`.
- `source_item_id` references `source_items.id`.
- `is_primary` marks the primary source item for the cluster.
- `created_at` timestamp.

Indexes and constraints:

- Unique: `story_cluster_items_cluster_source_unique` on `(story_cluster_id, source_item_id)`.
- Unique: `story_cluster_items_source_item_unique` on `source_item_id`, enforcing one cluster per source item in MVP.
- Lookup: `story_cluster_items_story_cluster_id_idx`.

### `articles`

Canonical generated article records and lifecycle state.

Important columns:

- `id` UUID primary key.
- `story_cluster_id` references `story_clusters.id`.
- `category_id` references `categories.id`.
- `slug` canonical article slug.
- `status`.
- `primary_locale`.
- `hero_image_url`.
- `published_at`.
- `review_notes`.
- `generation_metadata` JSONB for provider/model/runtime metadata.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Unique: `articles_slug_unique`.
- Unique: `articles_story_cluster_id_unique`, enforcing one canonical article per story cluster.
- Public/review filters: `articles_status_published_at_idx`.
- Category listing: `articles_category_published_at_idx`.

### `article_localizations`

Localized article text and SEO fields.

Important columns:

- `id` UUID primary key.
- `article_id` references `articles.id`.
- `locale`.
- `slug` optional locale-specific slug.
- `title`, `subtitle`, `excerpt`, `body`.
- `keywords` text array.
- `meta_title`, `meta_description`.
- `is_machine_translated`.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Unique: `article_localizations_article_locale_unique` on `(article_id, locale)`.
- Partial unique: `article_localizations_locale_slug_unique` on `(locale, slug)` where `slug is not null`.
- Lookup: `article_localizations_locale_idx`.

### `article_sources`

Frozen lineage from generated articles back to source items.

Important columns:

- `id` UUID primary key.
- `article_id` references `articles.id`.
- `source_item_id` references `source_items.id`.
- `role`, defaulting to `supporting`; review validation expects primary source lineage when roles are recorded.
- `created_at` timestamp.

Indexes and constraints:

- Unique: `article_sources_article_source_item_unique` on `(article_id, source_item_id)`.
- Reverse lookup: `article_sources_source_item_id_idx`.

### `pipeline_runs`

Execution history and operational visibility for worker runs.

Important columns:

- `id` UUID primary key.
- `run_type`, `status`, `attempt`.
- Optional references to `source_id`, `source_item_id`, `story_cluster_id`, and `article_id`.
- `started_at`, `finished_at`, `error_message`.
- `payload` JSONB for sanitized run details and summaries.
- `created_at`, `updated_at` timestamps.

Indexes and constraints:

- Queue/history filter: `pipeline_runs_type_status_created_at_idx`.
- Entity drill-down: `pipeline_runs_article_id_idx`, `pipeline_runs_story_cluster_id_idx`, `pipeline_runs_source_item_id_idx`.

`pipeline_runs` is not a scheduler or durable job queue in schema v1. Scheduling, retry, freshness, and backoff policy live in worker code and configuration until a later queue decision is made.

## Relationships

- `sources` has many `source_items`.
- `sources` has many `pipeline_runs`.
- `categories` may have a parent category and many child categories.
- `categories` has many `articles`.
- `source_items` belongs to one `source`.
- `source_items` has at most one `story_cluster_items` assignment in MVP.
- `source_items` may appear in many `article_sources` lineage rows.
- `story_clusters` has many `story_cluster_items`.
- `story_clusters` has at most one `articles` row in MVP.
- `articles` belongs to one `story_cluster`.
- `articles` belongs to one `category`.
- `articles` has many `article_localizations`.
- `articles` has many `article_sources`.
- `pipeline_runs` may reference one source, source item, story cluster, or article depending on run type and failure point.

All foreign keys in the initial migration use `ON DELETE no action` and `ON UPDATE no action`. Deletion must therefore be explicit and ordered, and deactivation is preferred for config-synced registry rows.

## Public Rendering Contract

Public pages must query only durable published content:

- `articles.status = 'published'`
- `articles.published_at is not null`
- joined category is active where category context matters
- matching `article_localizations.locale` for localized pages

The current public schema supports homepage and category listing routes. Article detail pages, sitemap, robots, archive, and structured article data are deferred public surfaces.

## Deferred Schema Items

The following are intentionally out of the MVP schema:

- Runtime multi-tenancy tables such as `sites`, `site_locales`, or per-row `site_id`.
- A dedicated jobs table or external queue representation.
- Multiple canonical articles, follow-up articles, or multiple editorial angles from one story cluster.
- Embeddings, vector indexes, and broad semantic retrieval tables.
- Reader accounts, comments, community features, or social publishing tables.
- Large-team CMS workflow tables such as assignments, custom approval chains, or audit-heavy newsroom roles.
- Arbitrary scraping source models beyond structured feed kinds.
- Production auth/RLS policy model for a full editorial back office.

Adding any of these should be treated as a new architecture decision plus an explicit migration plan.
