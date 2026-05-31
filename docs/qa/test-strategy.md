# Topicpress Test Strategy

Updated: 2026-06-01

## Current Strategy

Topicpress currently uses focused package-level checks plus targeted local route smoke tests as the QA evidence path. Full root validation exists in package scripts, but root `pnpm build` has a known web-build hang on this Windows workspace, so M5 public-site QA relies on narrower checks that prove the implemented contracts without waiting on unresolved release-hardening work.

The current public rendering scope is:

- `/` redirects to the configured default-locale homepage.
- `/[locale]` renders the public homepage for supported locales.
- `/[locale]/categories/[categorySlug]` renders active public category pages for supported locales.
- `/[locale]/articles/[slug]` renders durable published public article detail pages for supported locales.
- `/robots.txt` returns configured robots directives with one canonical sitemap pointer.
- `/sitemap.xml` returns canonical absolute URLs for supported locale homepages, active category URLs, and public article detail URLs.
- `/internal/editorial/review` remains the internal review surface.
- Generated article hero images are generated/regenerated through explicit internal review actions, stored in public `article-hero-images`, surfaced through `articles.hero_image_url`, and disclosed on public article pages as `AI-generated illustration` when generated-image provenance matches the public hero URL.

Deferred routes and surfaces remain outside focused M5 validation unless a later task explicitly changes scope:

- `/[locale]/archive`
- structured article data
- production canonical rollout
- release hardening

Public rendering and sitemap evidence must preserve the core product rule from ADR-005 and current project state: public surfaces expose only durable `published` articles with non-null publication timestamps. Draft, review, ready, failed, unpublished, unrelated-category records, inactive-category records, invalid or ambiguous slug candidates, and records missing required public fields after requested-locale/default-locale fallback must not appear in public rendering or sitemap output.

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

- `@topicpress/web test` runs locale routing, homepage components/routes, category components/routes/metadata, public article card link assertions, article detail component/metadata route-helper tests, and sitemap/robots helper tests.
- `@topicpress/worker test` runs a TypeScript build and service/CLI tests for seed sync, feed ingestion, source item persistence, clustering, draft creation, review, publishing, public homepage reads, public category reads, public article detail reads, public sitemap inventory reads, ingestion runs, generation runs, and worker CLIs.
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

For public article detail changes, use:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

The package `test` scripts enumerate the focused public article detail tests. Direct test commands remain useful for narrowing failures, but they are no longer required for default M5.3 coverage.

For sitemap and robots changes, use:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/config test
```

Sitemap/robots validation must verify native Next metadata route output, canonical placeholder URL behavior, robots environment mapping, published-only inventory filtering, active-category filtering, locale fallback, invalid slug omission, ambiguous slug omission, and absence of `next-sitemap` or sitemap postbuild scope unless a future task explicitly reopens that decision.

For worker, generation, review, publishing, ingestion, or pipeline visibility changes, include:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

For prompt, provider, structured output, or AI gating changes, include:

```powershell
pnpm --filter @topicpress/ai test
```

For generated article hero image changes, use:

```powershell
pnpm --filter @topicpress/db build
pnpm db:check
pnpm db:migrate
pnpm --filter @topicpress/ai test
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Generated hero image validation must verify the `article_hero_image_candidates` contract, public `article-hero-images` bucket, OpenAI live gate/model pinning, one current generated row per article, explicit generate/regenerate behavior, `articles.hero_image_url` updates, text-only publication allowance, public article rendering, `AI-generated illustration` disclosure, and absence of OpenAI keys, Supabase service-role keys, raw provider responses, prompt text, private storage paths, or signed URLs in public route output.

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
- Homepage article cards link to `/[locale]/articles/[slug]` when published local data exists.
- Empty homepage state renders when no published article qualifies.

Category smoke expectations:

- `/en-gb/categories/news` renders a valid active category page when `news` is active, synced, and populated locally.
- `/uk-ua/categories/news` renders the same active category route under the Ukrainian locale.
- `/en-gb/categories/model-releases` can be used as a valid empty active category check when local data has no published articles in that category.
- `/en-gb/categories/unknown` follows the project not-found path for an unknown category.
- `/fr-fr/categories/news` returns not found for an unsupported locale.
- Invalid slug shapes such as `/en-gb/categories/Bad_Slug` and `/en-gb/categories/model--releases` follow the not-found path.
- Category pages list only published articles in the requested active category, may use default-locale article field fallback when required requested-locale fields are unavailable, and link qualifying article cards to detail pages.

Article detail smoke expectations:

- `/en-gb/articles/<published-slug>` renders the article title and body for a durable published article.
- `/uk-ua/articles/<published-or-fallback-slug>` renders localized content or default-locale fallback according to the M5.3 contract.
- `/fr-fr/articles/example` returns not found for an unsupported locale.
- `/en-gb/articles/Bad_Slug` follows not-found behavior for invalid slug shape.
- `/en-gb/articles/unknown-slug` follows not-found behavior for an unknown slug.
- Article detail pages expose article Open Graph metadata and language alternates only from backend-provided `alternateSlugs`.
- Article body renders as escaped plain text paragraphs.
- Article detail pages do not introduce source attribution, related articles, ads, comments, archive, sitemap, robots, right-rail modules, or structured article data.
- When a published article has generated-image provenance matching `articles.hero_image_url`, the public route renders the hero image and `AI-generated illustration` disclosure.
- Public article output must not expose image prompts, raw provider metadata, candidate status, storage paths, OpenAI keys, service-role keys, or `sk-` text.

Generated hero image internal review smoke expectations:

- `/internal/editorial/review/[articleId]` renders current generated image metadata and a deliberate Generate or Regenerate action.
- Page load does not generate or regenerate an image.
- Generation/regeneration is cost-bearing in live mode; avoid extra live clicks unless the task explicitly requires them and the operator accepts the cost.
- Successful generation/regeneration writes `article-hero-images`, updates `articles.hero_image_url`, and records sanitized pipeline evidence.
- Article ready/publish flow is not blocked solely because no generated hero image exists.

Sitemap and robots smoke expectations:

- `/robots.txt` returns HTTP 200 plain text.
- Local/dev output is non-indexing and contains `Disallow: /`.
- `/robots.txt` contains exactly one sitemap pointer rooted at `https://ai-landscape-brief.example` until the production origin placeholder is replaced.
- `/sitemap.xml` returns HTTP 200 XML with supported locale homepage URLs.
- `/sitemap.xml` includes active category URLs for supported locales.
- `/sitemap.xml` includes public article detail URLs only when qualifying local published article data exists.
- Sitemap URLs are absolute canonical placeholder URLs, not localhost or request-host URLs.
- Sitemap output omits `/`, internal routes, `/[locale]/archive`, unsupported locales, invalid category slugs, invalid article slugs, unpublished/null-`published_at` articles, inactive-category articles, incomplete fallback records, and ambiguous article slug candidates. Where live DB data cannot prove a negative case, cite focused worker/web tests instead of claiming live smoke coverage.

M5.2/M5.3 QA observed a Next dev nuance: unknown or invalid dynamic category/article slugs may return HTTP `200` while streaming App Router not-found/noindex body markers. This is a residual SEO/release-hardening risk, not a focused M5 blocker, until production `next build && next start` status behavior can be validated after the root build issue is repaired.

The internal route `/internal/editorial/review` should remain reachable during public-site smoke checks unless the task scope explicitly changes internal editorial behavior.

## Known Root Build Caveat

Obsidian issue `Projects/Topicpress/06-issues/root-web-build-hangs` remains open. Root `pnpm build` hangs in the web build path on this Windows workspace and is classified as an advisory/full-workspace risk for focused M5.1 homepage, M5.2 category-page, M5.3 article-detail, and M5.4 sitemap/robots verification.

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
- local data assumptions, including category slugs and article slugs used for populated checks
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

Broaden to config tests when site identity, locales, taxonomy, sources, theme tokens, or SEO defaults change.

Broaden to database workflow checks when schema, migrations, seed sync, Drizzle exports, indexes, or persistence constraints change.

Broaden to browser/dev-route smoke when a change affects rendered public pages, route redirects, supported/unsupported locale behavior, empty states, metadata-visible output, category links, article links, article body rendering, or internal editorial navigation.

Broaden beyond focused checks toward root commands and release-style validation when:

- a task touches multiple packages or shared workspace tooling
- behavior spans ingestion, generation, review, publish, and public rendering
- SEO output, canonical URLs, sitemap, robots, structured data, or production status codes are in scope
- auth, secrets, environment loading, or production deployment behavior changes
- a milestone is closing or a release/CI gate is being evaluated

Until the root build caveat is closed, any broadened validation that would normally include root `pnpm build` must explicitly classify that missing evidence as residual release risk.
