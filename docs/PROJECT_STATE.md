# Project State

Updated: 2026-05-26

Source: imported from Obsidian MCP project notes under `Projects/Topicpress/`.

## Current phase

MVP implementation, currently in the public site and SEO rendering phase.

Completed foundation:

- M0 monorepo foundation is complete.
- M1 Grounding is complete: schema, config, local Supabase workflow, and config seed/sync.
- M2 Ingestion Foundation is complete: configured feed ingestion into durable `source_items`.
- M3 Clustering and Draft Generation is complete: fixture-backed local cluster/generate creates review-only article drafts with category, primary-locale localization, SEO fields, generation metadata, source lineage, and idempotency.
- M4 Review-Gated Publishing is complete, including the live OpenAI review-draft extension. Manual review remains required before publication.
- M5.1 Public Homepage is complete after QA-511 on 2026-05-04.
- M5.2 Category Pages is complete after QA-527 on 2026-05-05.

## Current milestone

M5 Public Site and SEO Rendering.

Latest completed slice: M5.2 Category Pages Implementation.

Recommended next slice from the latest QA handoff: article detail pages if the product priority is readable article permalinks. Sitemap and robots can proceed as a separate SEO surface after article/category URL policy is confirmed.

## Current architecture summary

- Frontend: `apps/web` is a Next.js App Router app using locale-aware public routing, `next-intl`, shadcn/ui, semantic CSS variables, and site-config-driven theme tokens. Implemented public routes are `/`, `/[locale]`, and `/[locale]/categories/[categorySlug]`. `/` redirects to the configured default-locale homepage. Internal editorial review lives under `/internal/editorial/review` and `/internal/editorial/review/[articleId]`.
- Backend: `apps/worker` owns feed ingestion, source-item persistence, clustering, AI draft generation, review/publish services, provider selection for fixture vs live OpenAI draft generation, and pipeline visibility. Long-running work stays out of page requests.
- Database: Supabase Postgres is the system of record. `packages/db` owns the Drizzle schema, migrations, and typed schema exports. The MVP schema centers on `sources`, `categories`, `source_items`, `story_clusters`, `story_cluster_items`, `articles`, `article_localizations`, `article_sources`, and `pipeline_runs`.
- Config: `packages/config` owns site identity, domain, locales, taxonomy, sources, editorial rules, theme tokens, SEO defaults, and seed helpers. Sources and categories are config-owned and sync to runtime rows by stable config keys.
- AI: `packages/ai` owns prompt builders, structured output validation, and provider behavior. Fixture-backed generation remains the deterministic default for local tests and CI; live OpenAI generation is explicit and secret-gated.
- Auth: No full production authentication/authorization model is in scope yet. The existing editorial surface is minimal and internal for MVP review/publish workflows.
- Infrastructure: pnpm workspaces and Turborepo orchestrate the monorepo. Local development uses Supabase CLI from the repo root, Drizzle migrations, and root scripts such as `pnpm seed:sync`, `pnpm ingest`, and database workflow commands.
- Testing: Focused package tests, typecheck, lint, worker build, and dev-route smoke checks are the current evidence path. Full root `pnpm build` remains an open advisory risk.

## Critical decisions

- One deployed publication uses one isolated site database; do not model multi-tenant runtime tables in MVP.
- Repo configuration is the durable source of truth for site setup; Postgres owns operational publishing state.
- Generated articles require manual review before publication in MVP.
- One story cluster may produce at most one canonical article in MVP.
- MVP worker execution uses database-backed polling/state transitions plus `pipeline_runs` history, not a dedicated queue platform.
- Vector search, embeddings, arbitrary scraping, comments/community features, large-team CMS workflows, and multi-tenant production database architecture are out of MVP scope.
- Public rendering must expose only durable `published` articles with non-null `published_at`.
- Public homepage and category listings may fall back from requested-locale article localization fields to the configured default locale, but only when required public fields such as slug, title, and excerpt are usable after fallback.
- M5.1 and M5.2 intentionally deferred article detail pages, archive, sitemap, robots, structured article data, full release hardening, and production canonical rollout.

## Active risks

- `root-web-build-hangs`: root `pnpm build` hangs in the web build path. Focused M5.1/M5.2 checks passed, but this must be repaired before release hardening or CI build gating.
- `supabase-db-diff-local-windows-shadow-db`: Windows Docker `db:diff:local` shadow database failure. Non-blocking while reset/migrate/generate/check paths remain verified.
- Invalid or unknown dynamic category slugs may return HTTP 200 in Next dev while rendering App Router not-found/noindex body markers. Production status should be rechecked once root build/release validation is repaired.
- Live OpenAI generation carries cost, availability, latency, and content-quality risk. It is opt-in, secret-gated, and remains review-draft-only.
- Public article detail pages, sitemap, robots, archive, structured data, production canonical behavior, and release hardening are not implemented yet.
- Several package test suites started as placeholders; coverage is focused around implemented contracts rather than broad product behavior.

## Current contracts

- Canonical project knowledge now lives in `docs/`. Obsidian remains a legacy/migration source only when explicitly needed.
- Repo workflow: `AGENTS.md`.
- Current state: `docs/PROJECT_STATE.md`.
- Product vision: `docs/product/vision.md`.
- Architecture overview: `docs/architecture/overview.md`.
- Ownership boundaries: `docs/architecture/boundaries.md`.
- Accepted architecture decisions: `docs/architecture/adr/`.
- Database schema source: `packages/db/src/schema/` and Supabase migrations.
- Database contract summary: `docs/database/schema.md`.
- Site configuration source: `packages/config/src/`.
- Secrets and environment boundary: `docs/infrastructure/secrets.md`.
- QA strategy: `docs/qa/test-strategy.md`.
- Frontend route contract: `docs/frontend/routes.md`.
- Frontend public routes currently implemented:
  - `/` redirects to the configured default-locale homepage.
  - `/[locale]` renders the public homepage for supported locales.
  - `/[locale]/categories/[categorySlug]` renders active category listing pages for supported locales.
  - `/internal/editorial/review` renders the internal review list.
  - `/internal/editorial/review/[articleId]` renders the internal review detail/actions surface.
- Deferred frontend routes:
  - `/[locale]/articles/[slug]`
  - `/[locale]/archive`
  - `/robots.txt`
  - `/sitemap.xml`
- Key local validation commands:
  - `pnpm --filter @topicpress/web test`
  - `pnpm --filter @topicpress/web lint`
  - `pnpm --filter @topicpress/web typecheck`
  - `pnpm --filter @topicpress/worker test`
  - `pnpm --filter @topicpress/worker build`

## Next planned milestones

1. M5 article detail pages, recommended next if readable article permalinks are the priority.
2. M5 sitemap and robots, recommended as a separate SEO slice after article/category URL policy is confirmed.
3. M5 archive or pagination only if article volume justifies it.
4. M6 End-to-End QA, Release, and Operations after public rendering slices are complete.
