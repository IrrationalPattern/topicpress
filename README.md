# Topicpress

Topicpress is a local-first publishing monorepo. It contains:

- `apps/web` - Next.js public site and internal editorial review UI.
- `apps/worker` - feed ingestion, article generation, and publish commands.
- `packages/db` - Drizzle schema exported to Supabase migrations.
- `packages/config` - site taxonomy, sources, locales, and editorial rules.
- `packages/ai` - fixture and live OpenAI draft providers.

## Requirements

- Node.js and pnpm.
- Docker Desktop for the local Supabase database.

Install dependencies:

```powershell
pnpm install
```

Create local environment values:

```powershell
Copy-Item .env.example .env
```

After Supabase starts, run `pnpm supabase:status` and copy the generated local keys and database password into `.env`. Do not commit real Supabase keys, database passwords, or OpenAI API keys.

## Local URLs

| Service               | URL                                                                  |
| --------------------- | -------------------------------------------------------------------- |
| Web app               | `http://localhost:3000`                                              |
| English public site   | `http://localhost:3000/en-gb`                                        |
| Ukrainian public site | `http://localhost:3000/uk-ua`                                        |
| Robots                | `http://localhost:3000/robots.txt`                                   |
| Sitemap               | `http://localhost:3000/sitemap.xml`                                  |
| Editorial review UI   | `http://localhost:3000/internal/editorial/review`                    |
| Supabase Studio       | `http://127.0.0.1:54323`                                             |
| Supabase API          | `http://127.0.0.1:54321`                                             |
| Postgres database     | `postgresql://postgres:<local-db-password>@127.0.0.1:54322/postgres` |

## Run The Database

Start local Supabase:

```powershell
pnpm supabase:start
pnpm supabase:status
```

Apply the schema from tracked migrations:

```powershell
pnpm db:reset
pnpm db:migrate
pnpm db:check
```

`pnpm db:reset` rebuilds the local database from `supabase/migrations`. `pnpm db:migrate` is useful after reset as a no-pending-migrations check.

Sync configured sources and categories into the database:

```powershell
pnpm seed:sync
```

Stop Supabase when you are done:

```powershell
pnpm supabase:stop
```

## Generate Articles

Article generation has two steps:

1. Ingest source items from configured feeds.
2. Cluster ingested items and generate review articles.

Generated articles are created in review flow. They do not appear on the public homepage until they are approved and published.

### Mock Articles

Mock generation is the default. It uses deterministic fixture-backed drafts and does not require an OpenAI API key.

Make sure `.env` keeps fixture mode:

```dotenv
TOPICPRESS_AI_PROVIDER=fixture
TOPICPRESS_AI_LIVE_ENABLED=false
```

Run the local generation flow:

```powershell
pnpm seed:sync
pnpm ingest --force --json
pnpm --filter @topicpress/worker cluster:generate -- --json --limit 5
```

Open the review UI:

```text
http://localhost:3000/internal/editorial/review
```

### Real Articles

Real generation uses the configured feed sources plus the live OpenAI provider. Store the key only in `.env` or `.env.local`:

```dotenv
TOPICPRESS_AI_PROVIDER=live
TOPICPRESS_AI_LIVE_ENABLED=true
TOPICPRESS_OPENAI_MODEL=gpt-5.5
TOPICPRESS_OPENAI_TIMEOUT_MS=60000
OPENAI_API_KEY=<local-openai-service-account-api-key>
```

Then run the same flow with a small limit first:

```powershell
pnpm seed:sync
pnpm ingest --force --json
pnpm --filter @topicpress/worker cluster:generate -- --json --limit 1
```

The generated article still starts in review. Use the editorial UI to move it through review, ready, and published states.

## Run Web

Start only the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Open:

```text
http://localhost:3000
```

You can also run all dev tasks in parallel:

```powershell
pnpm dev
```

## Verify The Public Homepage

Use this focused path for the M5.1 homepage slice. It verifies the public homepage without requiring archive, sitemap, robots, or release-hardening checks.

Prerequisites:

- `.env` is configured from `.env.example`.
- Local Supabase is running and migrated if you want to inspect real database-backed homepage content.
- `pnpm seed:sync` has been run before creating or publishing local articles.

Run the focused checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
```

Start the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Verify routes in a browser or with local HTTP requests:

- `http://localhost:3000/` redirects to the configured default locale path, currently `/en-gb`.
- `http://localhost:3000/en-gb` renders the English public homepage.
- `http://localhost:3000/uk-ua` renders the Ukrainian public homepage.
- Unsupported locale paths such as `/fr-fr` return not found.
- `/robots.txt` and `/sitemap.xml` are implemented in the M5.4 SEO slice; `/en-gb/archive` remains deferred.

Published-only behavior:

- Generated articles start in review flow and do not appear on the public homepage until they are moved through `review` to `ready` and then `published`.
- Use the editorial UI or `pnpm --filter @topicpress/worker article:publish -- --article-id <article-id> --json` to publish a ready article for a populated homepage check.
- `pnpm --filter @topicpress/worker test` includes the public homepage read-boundary tests for excluding `draft`, `review`, `ready`, and `failed` articles, returning an empty list when no published articles qualify, locale fallback, ordering, and the 12-article limit.
- `pnpm --filter @topicpress/web test` includes route, component, populated homepage, and empty-state coverage.

Do not paste API keys, database passwords, service-role keys, generated Supabase credentials, or OpenAI keys into verification notes or screenshots.

## Verify The Public Category Pages

Use this focused path for the M5.2 category-page slice after FE-523. It verifies `/[locale]/categories/[categorySlug]` without requiring archive, sitemap, robots, structured article data, or release-hardening checks.

Prerequisites:

- `.env` is configured from `.env.example`.
- Local Supabase is running and migrated when checking database-backed category content.
- `pnpm seed:sync` has been run so configured active categories exist in the local database.
- At least one active category has a published article for the populated check. `news` is the usual example when local data exists.
- At least one active category has no published articles for the empty-state check. `model-releases` is a useful example when it is locally empty.

Run the focused checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
```

Start the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Verify category routes in a browser or with local HTTP requests:

- `http://localhost:3000/en-gb/categories/news` renders a valid active category page when `news` is active and synced.
- `http://localhost:3000/uk-ua/categories/news` renders the same category route under the Ukrainian locale.
- `http://localhost:3000/en-gb/categories/model-releases` renders the valid empty category state when that active category has no published articles.
- `http://localhost:3000/en-gb/categories/unknown` returns the project's not-found path for an unknown category.
- If local config or database state includes an inactive category, its category URL also returns not found rather than an empty page.
- `http://localhost:3000/fr-fr/categories/news` returns not found for an unsupported locale.
- Invalid slug shapes such as `/en-gb/categories/Bad_Slug` or `/en-gb/categories/model--releases` return not found.

Published-only and category filtering:

- Category pages list only articles with `published` status, non-null `published_at`, and the requested active category.
- Draft, review, ready, failed, unpublished, incomplete-localization, and other-category articles must not appear on the category page.
- Use the editorial UI or `pnpm --filter @topicpress/worker article:publish -- --article-id <article-id> --json` to publish a ready article for a populated category check.
- `pnpm --filter @topicpress/worker test` includes public category read-boundary coverage for populated category output, valid empty categories, unsupported locale, invalid slug shape, unknown/inactive/stale categories, published-only filtering, and other-category exclusion.
- `pnpm --filter @topicpress/web test` includes category route, component, metadata, empty-state, not-found, unsupported-locale, invalid-slug, and deferred-route-surface coverage.

Confirm deferred surfaces remain outside this slice:

- Category article cards link to working article detail routes when published articles are present.
- `/robots.txt` and `/sitemap.xml` are covered by the M5.4 sitemap/robots verification path. `/en-gb/archive` remains deferred.
- Treat archive, sitemap, robots, structured article data, or release-hardening behavior as a separate slice unless a later task explicitly changes that scope.

Do not paste API keys, database passwords, service-role keys, generated Supabase credentials, OpenAI keys, private production URLs, or raw database connection strings into verification notes or screenshots.

## Verify The Public Article Detail Pages

Use this focused path for the M5.3 article-detail slice. It verifies `/[locale]/articles/[slug]` without requiring archive, sitemap, robots, structured article data, source attribution, right-rail modules, or release-hardening checks.

Prerequisites:

- `.env` is configured from `.env.example`.
- Local Supabase is running and migrated when checking database-backed article content.
- `pnpm seed:sync` has been run so configured active categories exist in the local database.
- At least one ready article has been published for the rendered article checks.

Run the focused checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

The package test scripts enumerate the focused article-detail tests. Direct test commands can still be used to narrow a failure while debugging.

Start the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Verify article routes in a browser or with local HTTP requests:

- `http://localhost:3000/en-gb` renders homepage article links to `/en-gb/articles/<slug>` when local published data exists.
- `http://localhost:3000/en-gb/categories/news` renders category article links when local published data exists.
- `http://localhost:3000/en-gb/articles/<published-slug>` renders the article title and body.
- `http://localhost:3000/uk-ua/articles/<published-or-fallback-slug>` renders localized content or default-locale fallback according to the route contract.
- `http://localhost:3000/fr-fr/articles/example` returns not found for an unsupported locale.
- Invalid slug shapes such as `/en-gb/articles/Bad_Slug` return not found.
- Unknown slugs such as `/en-gb/articles/unknown-slug` return not found.

Published-only and deferred-scope behavior:

- Article detail pages render only articles with `published` status, non-null `published_at`, an active category, a valid public slug, and required public fields after requested/default locale fallback.
- Article body renders as escaped plain text paragraphs.
- Article metadata uses article meta fields and fallbacks, with language alternates from backend-provided slugs only.
- Source attribution, related articles, ads, comments, archive, sitemap, robots, right-rail modules, and structured article data remain outside M5.3.

## Verify Sitemap And Robots

Use this focused path for the M5.4 sitemap/robots slice. It verifies `/robots.txt` and `/sitemap.xml` without requiring archive, structured article data, production canonical rollout, or release hardening.

Run the focused checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/config test
```

Start the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Verify routes in a browser or with local HTTP requests:

- `http://localhost:3000/robots.txt` returns local/dev non-indexing robots text with `Disallow: /`.
- `http://localhost:3000/robots.txt` points to `https://ai-landscape-brief.example/sitemap.xml` until the production origin placeholder is replaced.
- `http://localhost:3000/sitemap.xml` returns XML with canonical placeholder URLs for `/en-gb`, `/uk-ua`, active category pages, and qualifying public article detail pages.
- Sitemap output must not use localhost/request-host URLs and must omit `/`, internal routes, archive routes, unsupported locales, invalid slugs, unpublished articles, null-`published_at` articles, inactive-category articles, incomplete fallback records, and ambiguous article slug candidates.

Production release/indexability remains blocked while the committed canonical origin is still the `.example` placeholder.

## Publish A Generated Article

The normal path is the editorial UI:

```text
http://localhost:3000/internal/editorial/review
```

Use the article detail actions to move an article from `review` to `ready`, then publish it. Published articles appear on the localized public homepage.

For backend-only local checks, publish a ready article by id:

```powershell
pnpm --filter @topicpress/worker article:publish -- --article-id <article-id> --json
```

## Useful Commands

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

`pnpm build` is still listed for full workspace validation, but the local Windows workspace has a known root web build hang tracked in docs as `root-web-build-hangs`. For focused M5.1 homepage, M5.2 category-page, M5.3 article-detail, and M5.4 sitemap/robots verification, use the focused web and worker checks above unless the root build issue has been repaired.

Focused checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/ai test
```
