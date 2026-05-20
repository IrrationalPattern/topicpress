# Topicpress Test Strategy

Updated: 2026-05-21

## Current Strategy

Topicpress currently uses focused package-level checks plus targeted local route smoke tests as the QA evidence path. Full root validation exists in package scripts, but root `pnpm build` has a known web-build hang on this Windows workspace, so M5 public-site QA relies on narrower checks that prove the implemented contracts without waiting on unresolved release-hardening work.

The current public rendering scope is:

- `/` redirects to the configured default-locale homepage.
- `/[locale]` renders the public homepage for supported locales.
- `/[locale]/categories/[categorySlug]` renders active public category pages for supported locales.
- `/internal/editorial/review` remains the internal review surface.

Deferred routes and surfaces remain outside focused M5.1/M5.2 validation unless a later task explicitly changes scope:

- `/[locale]/articles/[slug]`
- `/[locale]/archive`
- `/robots.txt`
- `/sitemap.xml`
- structured article data
- production canonical rollout
- release hardening

Public rendering evidence must preserve the core product rule from ADR-005 and current project state: public homepage and category pages expose only durable `published` articles with non-null publication timestamps. Draft, review, ready, failed, unpublished, incomplete-localization, and other-category records must not appear in public lists.

## Test Surface

Root scripts are defined in `package.json` and fan out through Turborepo:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use package-level scripts for focused evidence:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/ai test
pnpm --filter @topicpress/config test
```

Current package coverage:

- `@topicpress/web test` runs locale routing, category route scaffold, homepage components, homepage route composition, category components, and category page metadata/state tests.
- `@topicpress/worker test` runs a TypeScript build and service/CLI tests for seed sync, feed ingestion, source item persistence, clustering, draft creation, review, publishing, public homepage reads, public category reads, ingestion runs, generation runs, and worker CLIs.
- `@topicpress/ai test` covers fixture-backed generation, prompt/input validation, structured output validation, and explicit live-provider gating.
- `@topicpress/config test` covers site configuration contracts.
- `@topicpress/db test` is currently a placeholder: `No tests configured for @topicpress/db yet.`

Database workflow checks are relevant when schema, migrations, seed sync, or Drizzle contracts change:

```powershell
pnpm db:reset
pnpm db:migrate
pnpm db:check
pnpm seed:sync
```

`pnpm db:diff:local` has a separate Windows Docker shadow-database caveat in project state and should not be treated as the only schema evidence path while reset/migrate/generate/check remain available.

## Focused Validation Commands

For public homepage changes, use:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
```

For public category page changes, use:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

For worker, generation, review, publishing, ingestion, or pipeline visibility changes, include:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

For prompt, provider, structured output, or AI gating changes, include:

```powershell
pnpm --filter @topicpress/ai test
```

For site config, locales, taxonomy, sources, theme tokens, or SEO defaults, include:

```powershell
pnpm --filter @topicpress/config test
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/worker test
```

For broad monorepo contract changes, run root `pnpm lint`, `pnpm typecheck`, and `pnpm test` when practical. Treat root `pnpm build` separately because of the known caveat below.

## Browser And Dev-Route Smoke

Start the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Use `http://localhost:3000` by default. If that port is occupied, run the Next dev server on an alternate port and record the actual base URL used.

Homepage smoke expectations:

- `/` redirects to the configured default locale path, currently `/en-gb`.
- `/en-gb` renders the English public homepage.
- `/uk-ua` renders the Ukrainian public homepage.
- `/fr-fr` returns not found for an unsupported locale.
- Homepage output lists only durable published content.
- Empty homepage state renders when no published article qualifies.
- Deferred public surfaces remain unavailable for the slice under test.

Category smoke expectations:

- `/en-gb/categories/news` renders a valid active category page when `news` is active, synced, and populated locally.
- `/uk-ua/categories/news` renders the same active category route under the Ukrainian locale.
- `/en-gb/categories/model-releases` can be used as a valid empty active category check when local data has no published articles in that category.
- `/en-gb/categories/unknown` follows the project not-found path for an unknown category.
- `/fr-fr/categories/news` returns not found for an unsupported locale.
- Invalid slug shapes such as `/en-gb/categories/Bad_Slug` and `/en-gb/categories/model--releases` follow the not-found path.
- Category pages list only published articles in the requested active category and do not introduce article detail links.

M5.2 QA observed a Next dev nuance: unknown or invalid dynamic category slugs may return HTTP `200` while streaming App Router not-found/noindex body markers. This is a residual SEO/release-hardening risk, not a focused M5.2 blocker, until production `next build && next start` status behavior can be validated after the root build issue is repaired.

The internal route `/internal/editorial/review` should remain reachable during public-site smoke checks unless the task scope explicitly changes internal editorial behavior.

## Known Root Build Caveat

Obsidian issue `Projects/Topicpress/06-issues/root-web-build-hangs` remains open. Root `pnpm build` hangs in the web build path on this Windows workspace and is classified as an advisory/full-workspace risk for focused M5.1 homepage and M5.2 category-page verification.

Current handling:

- Do not use root `pnpm build` as the only gate for focused public-site QA while the issue is open.
- Record that the caveat remains open whenever focused checks pass without root build evidence.
- Use package-level web/worker tests, lint, typecheck, worker build, and route smoke evidence to decide focused pass/fail.
- Before release hardening, CI build gating, or production status validation, route a narrow frontend/infra repair task to make `pnpm --filter @topicpress/web build` and root `pnpm build` reliable.

## QA Evidence Rules

QA evidence must be concrete enough for a later agent to reproduce or challenge the result.

Record:

- exact commands run
- pass/fail/blocked status for each command
- important output summaries, especially failures
- local base URL and route list used for browser or HTTP smoke
- observed HTTP status, redirects, and key streamed body markers where route status is ambiguous
- local data assumptions, including category slugs used for populated and empty states
- whether Supabase was running, migrated, and seed-synced when database-backed checks were performed
- residual risks and deferred surfaces

Do not record:

- API keys
- database passwords
- Supabase service-role keys
- generated local Supabase credentials
- OpenAI keys
- private production URLs
- raw database connection strings

Treat partial, flaky, interrupted, or environment-dependent results as risks, not passes. If a route check depends on local database state that was not prepared, say so instead of implying live coverage. If a command is skipped because it is out of scope or blocked by a known caveat, name the caveat and identify the substitute evidence.

## When To Broaden Validation

Start with focused validation for the touched package and user-facing path. Broaden when the change crosses a contract boundary or changes shared behavior.

Broaden to worker tests when frontend public rendering depends on article, category, publication, localization, or filtering semantics.

Broaden to web tests, lint, and typecheck when config, taxonomy, locale, metadata, or public-route behavior changes.

Broaden to AI tests when prompt builders, provider selection, live/fixture gating, structured response validation, source lineage, or draft metadata changes.

Broaden to config tests when site identity, locales, taxonomy, sources, editorial rules, theme tokens, or SEO defaults change.

Broaden to database workflow checks when schema, migrations, seed sync, Drizzle exports, indexes, or persistence constraints change.

Broaden to browser/dev-route smoke when a change affects rendered public pages, route redirects, supported/unsupported locale behavior, empty states, metadata-visible output, category links, or internal editorial navigation.

Broaden beyond focused checks toward root commands and release-style validation when:

- a task touches multiple packages or shared workspace tooling
- behavior spans ingestion, generation, review, publish, and public rendering
- SEO output, canonical URLs, sitemap, robots, structured data, or production status codes are in scope
- auth, secrets, environment loading, or production deployment behavior changes
- a milestone is closing or a release/CI gate is being evaluated

Until the root build caveat is closed, any broadened validation that would normally include root `pnpm build` must explicitly classify that missing evidence as residual release risk.
