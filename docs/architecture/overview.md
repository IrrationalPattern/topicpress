# Architecture Overview

Topicpress is a reusable news publishing platform whose MVP runtime model is one independently deployed publication per instance. The monorepo keeps deployment and runtime boundaries simple: one codebase, one publication per deployment, one Supabase Postgres database per publication, and separate web and worker responsibilities.

## Monorepo Shape

The workspace is defined by `pnpm-workspace.yaml` as:

```text
apps/
  web/
  worker/
packages/
  ai/
  config/
  db/
```

Root scripts in `package.json` delegate build, lint, typecheck, test, seed, ingestion, and database workflows through Turborepo, pnpm filters, Drizzle Kit, and the Supabase CLI. `turbo.json` keeps package builds ordered through dependency builds while dev runs are parallel and persistent.

## Runtime Boundaries

`apps/web` is the Next.js App Router application. It owns the public rendering surface, locale-aware routing, SEO metadata for implemented pages, shadcn/ui-based UI components, theme application, and the minimal internal editorial review list/detail surface under `/internal/editorial/review`. Implemented public routes are `/`, `/[locale]`, `/[locale]/categories/[categorySlug]`, `/[locale]/articles/[slug]`, `/robots.txt`, and `/sitemap.xml`; `/` redirects to the configured default-locale homepage.

`apps/worker` owns long-running and failure-prone publishing work: feed ingestion, source-item persistence, clustering, draft generation, review status transitions, publication, and pipeline visibility. It exposes CLI entrypoints such as ingestion, seed sync, cluster/generate, and publish. Page requests must not perform AI generation, ingestion, clustering, or publishing work inline.

The current web app imports selected read/query services from `@topicpress/worker` for homepage, category listing, and article detail data. That is acceptable for the MVP because these paths are read-only public projections, but the architectural boundary remains that the web runtime renders durable database state while the worker mutates pipeline state.

## Shared Packages

`packages/db` owns the Drizzle schema and typed exports. The schema is split by domain across sources, taxonomy, ingestion, articles, pipeline, relations, common fields, and enums.

`packages/config` owns validated site configuration: identity, domains, locales, taxonomy, sources, editorial rules, theme tokens, and SEO defaults. It also provides seed-record helpers for config-owned sources and categories.

`packages/ai` owns draft-generation inputs, prompt construction, provider abstraction, fixture-backed generation, live OpenAI provider integration, and structured validation. Fixture-backed generation remains the deterministic default for local tests and CI; live generation is explicit and secret-gated.

## Supabase And Drizzle

Supabase Postgres is the system of record for operational publishing state. `drizzle.config.ts` points Drizzle Kit at `packages/db/src/schema/index.ts` and writes migrations to `supabase/migrations`.

The MVP follows the accepted single-site database decision: no runtime `sites`, `site_locales`, or `site_id` columns are modeled in content tables. Each deployed publication is expected to use its own Supabase project and database.

The core schema centers on:

- `sources`
- `categories`
- `source_items`
- `story_clusters`
- `story_cluster_items`
- `articles`
- `article_localizations`
- `article_sources`
- `pipeline_runs`

Important constraints include stable `config_key` identities for seeded sources and categories, one canonical article per story cluster, localized article slug support, article/source lineage, and `pipeline_runs` as execution history rather than a dedicated queue.

## Configuration Boundary

Repo configuration is the durable source of truth for site setup. This includes site identity, locale paths, taxonomy, approved feeds, editorial constraints, visual theme, and SEO defaults.

Postgres owns operational state: ingested source records, clustering state, generated drafts, localizations, article lifecycle, publication timestamps, source lineage, and pipeline run history.

Config-owned runtime tables are synchronized by stable keys. `sources.config_key` maps to configured source keys and `categories.config_key` maps to configured taxonomy keys. Removed or disabled config entries should be deactivated instead of deleted when historical records may reference them.

## Content Pipeline

The MVP content flow is:

1. Sync configured sources and categories into runtime rows.
2. Fetch approved RSS/Atom/JSON feeds.
3. Normalize and persist durable `source_items`.
4. Cluster related source items into `story_clusters`.
5. Generate one canonical draft per selected cluster.
6. Assign the draft to a configured category.
7. Store primary-locale content, SEO fields, generation metadata, and source lineage.
8. Require manual review before the article can become `ready`.
9. Publish only reviewed `ready` articles by moving them to `published` and setting `published_at`.
10. Render public pages directly from Postgres.

The worker uses database-backed execution and records attempts in `pipeline_runs`. A separate queue, jobs table, vector database, embeddings layer, arbitrary scraper system, and multi-tenant runtime database are out of MVP scope.

## Public Rendering State

Public rendering only exposes durable published content. Homepage, category, and article detail queries require:

- `articles.status = "published"`
- non-null `articles.published_at`
- active category rows
- usable article localization data for the requested locale or configured default-locale fallback; articles missing required public fields after fallback are omitted

Category pages also validate slugs against the configured active taxonomy, then resolve the active database category by `config_key`. Article detail pages validate locale and slug shape, resolve requested-locale/default-locale/canonical slug matches through a narrow public read service, render persisted body text as escaped plain-text paragraphs, and build language alternates only from backend-provided `alternateSlugs`. Invalid locale, category, or article inputs render the app's not-found path. Current listing pages cap results at 12 and do not yet implement pagination.

Archive pages, structured article data, production canonical rollout, and full release hardening remain deferred M5 work. Production indexability remains blocked until the placeholder canonical origin is replaced with the real production origin in committed config.

## Current M5 Status

M5 is the public site and SEO rendering milestone. As of `docs/PROJECT_STATE.md` updated 2026-05-27:

- M5.1 Public Homepage is complete after QA-511.
- M5.2 Category Pages is complete after QA-527.
- M5.3 Public Article Detail Pages is complete after QA and the QA-M5.3-001 metadata suffix fix.
- M5.4 Sitemap And Robots is complete after QA, using native Next metadata routes and a worker public sitemap inventory service.
- Root `pnpm build` still has a known web-build hang risk; focused web and worker validation paths have been used as current evidence.

## Accepted Architecture Decisions

The local ADRs currently accepted for MVP are:

- ADR-001: use a monorepo with split web and worker runtimes.
- ADR-002: use a single-site database per publication.
- ADR-003: keep durable site setup in repo configuration.
- ADR-004: produce one canonical article per story cluster.
- ADR-005: require manual review before publication.
- ADR-006: use database-backed worker execution for MVP.
