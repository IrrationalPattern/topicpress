# Project State

Updated: 2026-06-01

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
- M5.3 Public Article Detail Pages is complete after QA on 2026-05-27, including the QA-M5.3-001 metadata title suffix fix.
- M5.4 Sitemap and Robots is complete after QA on 2026-05-27.
- M5.5 Generated Article Hero Images is complete after T007 QA on 2026-05-31 and T008 documentation closeout on 2026-06-01.

## Current milestone

M5 Public Site and SEO Rendering.

Latest completed slice: M5.5 Generated Article Hero Images.

Recommended next slice from the latest milestone closeout: release hardening and production-readiness work, especially replacing the `.example` canonical placeholder with the real production origin and repairing `root-web-build-hangs`, before production indexability is enabled. M5.5 closeout records only non-blocking residuals: historical handoffs with superseded private-candidate language, live OpenAI image-generation operational risk, and the existing root build caveat outside the M5.5 gate.

## Current architecture summary

- Frontend: `apps/web` is a Next.js App Router app using locale-aware public routing, `next-intl`, shadcn/ui, semantic CSS variables, and site-config-driven theme tokens. Implemented public routes are `/`, `/[locale]`, `/[locale]/categories/[categorySlug]`, `/[locale]/articles/[slug]`, `/robots.txt`, and `/sitemap.xml`. `/` redirects to the configured default-locale homepage. Internal editorial review lives under `/internal/editorial/review` and `/internal/editorial/review/[articleId]`.
- Backend: `apps/worker` owns feed ingestion, source-item persistence, clustering, AI draft generation, review/publish services, provider selection for fixture vs live OpenAI draft generation, pipeline visibility, and narrow public read services including the path-level sitemap inventory. Long-running work stays out of page requests.
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
- Public article detail pages may fall back from requested-locale article localization fields to the configured default locale, but only when public slug, title, excerpt, and body are usable after fallback. Detail reads require published status, non-null `published_at`, an active category row, valid slug shape, and backend-provided `alternateSlugs` for supported locale alternates.
- Public article body rendering treats persisted `body` as escaped plain text paragraphs. M5.3 did not introduce source attribution, related articles, ads, comments, right-rail modules, archive, structured article data, or production canonical rollout.
- M5.4 implements `/robots.txt` and `/sitemap.xml` through native Next.js metadata routes. It uses the committed canonical placeholder origin `https://ai-landscape-brief.example` for local/test/staging QA, not localhost or request hosts. Production release/indexability remains blocked until that placeholder is replaced with the real production origin in committed config.
- Public sitemap inventory returns path-level DTOs only. Canonical URL construction remains owned by web/config, and sitemap entries require active categories plus public article eligibility matching the M5.3 detail-route slug/fallback protections.
- M5.5 planning accepts amended `docs/architecture/adr/ADR-007-generated-article-hero-images.md`: generated article hero images are OpenAI-only for MVP, at most one current generated image per article, editorial illustration rather than fake photojournalism, stored in the public `article-hero-images` Supabase Storage bucket, reviewable through explicit regeneration during article review, with `articles.hero_image_url` remaining the public image pointer.
- M5.5 implementation uses one current generated-image metadata row per article, writes successful generations/regenerations to the public `article-hero-images` bucket, updates `articles.hero_image_url` during generation, removes the image approval/promotion gate from ready/publish, exposes explicit generate/regenerate controls in internal review, and renders public generated-image disclosure when provenance matches the public hero URL. T007 QA passed on 2026-05-31 against article `b7bad77e-d888-4d50-8e95-133b23237361`; T008 closeout completed on 2026-06-01.

## Active risks

- `root-web-build-hangs`: root `pnpm build` hangs in the web build path. Focused M5.1/M5.2/M5.3/M5.4 checks passed, but this must be repaired before release hardening or CI build gating.
- Production release/indexability remains blocked until `siteConfig.identity.domains.productionOriginPlaceholder` is replaced with the real production origin in committed config. Local M5.4 QA intentionally observed `https://ai-landscape-brief.example` sitemap URLs with non-indexing local robots output.
- `supabase-db-diff-local-windows-shadow-db`: Windows Docker `db:diff:local` shadow database failure. Non-blocking while reset/migrate/generate/check paths remain verified.
- Invalid or unknown dynamic category slugs may return HTTP 200 in Next dev while rendering App Router not-found/noindex body markers. Production status should be rechecked once root build/release validation is repaired.
- Live OpenAI generation carries cost, availability, latency, and content-quality risk. It is opt-in, secret-gated, and remains review-draft-only.
- Generated hero images add OpenAI image model availability, organization-verification, cost, latency, storage policy, disclosure, explicit-regeneration, and fake-photojournalism risks. M5.5 mitigates these with opt-in live generation, `TOPICPRESS_OPENAI_IMAGE_MODEL` defaulting to `gpt-image-1.5`, public-bucket QA, explicit review-time generate/regenerate actions, no image-generation side effects during publication, and the `AI-generated illustration` public disclosure.
- Operator removed the old private `article-hero-image-candidates` bucket from local Supabase on 2026-06-01 after M5.5 closeout. Current code and T007 smoke evidence use only public `article-hero-images`.
- Archive, structured article data, production canonical rollout, and release hardening are not implemented yet.
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
  - `/[locale]/articles/[slug]` renders durable published article detail pages for supported locales.
  - `/robots.txt` returns environment-mapped robots directives with one canonical sitemap pointer.
  - `/sitemap.xml` returns absolute canonical URLs for supported locale homepages, active categories, and public article details.
  - `/internal/editorial/review` renders the internal review list.
  - `/internal/editorial/review/[articleId]` renders the internal review detail/actions surface.
- Deferred frontend routes:
  - `/[locale]/archive`
  - structured article data
- Key local validation commands:
  - `pnpm --filter @topicpress/web test`
  - `pnpm --filter @topicpress/web lint`
  - `pnpm --filter @topicpress/web typecheck`
  - `pnpm --filter @topicpress/worker test`
  - `pnpm --filter @topicpress/worker build`
  - `pnpm --filter @topicpress/config test`

## Next planned milestones

1. Release hardening, including `root-web-build-hangs`, production-origin replacement, and production status validation, if operational readiness is prioritized.
2. M5 archive or pagination only if article volume justifies it.
3. Structured article data as a separate SEO slice if product prioritizes richer search metadata before release hardening.
4. M6 End-to-End QA, Release, and Operations after public rendering and release-hardening slices are complete.
