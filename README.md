# Topicpress

Topicpress is a monorepo for a Next.js publication app, an asynchronous worker, and shared packages for database, configuration, and AI boundaries.

## Workspace Shape

```text
apps/
  web/       Next.js application shell
  worker/    TypeScript worker shell
packages/
  db/        Drizzle schema package
  config/    Site configuration package
  ai/        AI package shell; provider logic comes later
```

## Local Commands

Install dependencies:

```powershell
pnpm install
```

Run workspace tasks:

```powershell
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm format
```

## Local Database

M1 uses local Supabase only. No remote Supabase project, login, hosted project ref, or production credential is required for local verification.

Supabase CLI is a root dev dependency and should be run through pnpm scripts:

```powershell
pnpm supabase:telemetry:disable
pnpm supabase:start
pnpm supabase:status
```

Copy `.env.example` to an ignored local env file and fill in local values from `pnpm supabase:status`. Keep generated anon keys, service-role keys, database passwords, and any production values out of git and Obsidian notes.

Required local placeholders:

```dotenv
DATABASE_URL=postgresql://postgres:<local-db-password>@127.0.0.1:54322/postgres
SUPABASE_DB_URL=postgresql://postgres:<local-db-password>@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

Drizzle migrations are generated from `packages/db/src/schema/index.ts` into `supabase/migrations`:

```powershell
pnpm db:generate
```

Apply the tracked migrations to a running local Supabase database, or rebuild the local database from them:

```powershell
# Applies pending files from supabase/migrations.
pnpm db:migrate

# Rebuilds the local Supabase database from tracked migrations.
pnpm db:reset
```

Useful verification commands:

```powershell
pnpm db:check
pnpm db:diff:local
pnpm typecheck
pnpm lint
pnpm build
```

Sync the repo-owned source and category config into the local database:

```powershell
pnpm seed:sync
```

The seed sync upserts by stable `config_key` values and marks missing configured rows inactive by default instead of deleting them. Use `pnpm --filter @topicpress/worker seed:sync -- --keep-missing-active` only when inspecting local data without changing inactive state.

Changing a source or category `config_key` creates a new identity. If the renamed entry keeps a slug or feed URL already owned by the old row, sync fails clearly instead of merging history across identities.

## M2 Local Ingestion Verification

M2 ingestion is local-first. Use the local Supabase database and public configured feed URLs only. Do not use remote Supabase credentials, production database URLs, private feed credentials, or secrets in repo/vault notes.

Required QA path from a clean local database:

```powershell
pnpm supabase:start
pnpm db:reset
pnpm db:migrate
pnpm db:check
pnpm seed:sync
pnpm ingest --force --json
```

Use `pnpm db:migrate` after `pnpm db:reset` as a no-pending-migrations check; reset rebuilds the local database from tracked migrations. `pnpm seed:sync` must run before ingestion so the local `sources` and `categories` rows match repo-owned config.

Preferred ingest CLI forms:

```powershell
pnpm ingest
pnpm ingest --force
pnpm ingest --json
```

Flags can be combined when QA needs both a recrawl override and machine-readable output:

```powershell
pnpm ingest --force --json
```

The worker CLI also tolerates pnpm's forwarded separator form, such as `pnpm ingest -- --json`, for compatibility with older handoff notes. Prefer the direct forms above for new runs.

The command writes aggregate and per-source `ingest` rows to `pipeline_runs`, persists normalized feed items idempotently, and exits non-zero when no active source can be ingested successfully.

For M2 QA, a successful fixture-backed or controlled local run should prove:

- Active seeded sources can be ingested after migrations and seed sync.
- Re-running ingestion does not duplicate `source_items`.
- `pipeline_runs` records aggregate and per-source `ingest` visibility.
- One failed source does not prevent unrelated active sources from succeeding.
- `pnpm ingest --json`, `pnpm ingest --force --json`, and separator compatibility reach ingestion startup rather than failing argument parsing.

Live public-feed smoke is optional. Public feed availability, shape, and network access can change, so live-feed failure should not be the sole M2 QA gate when deterministic fixture-backed worker tests and controlled local ingestion pass.

## M3 Local Cluster And Draft Verification

M3 extends the verified M2 path: local Supabase, tracked migrations, seed sync, ingestion, then the worker cluster/generate command. The default QA path is deterministic and fixture-backed; live AI is optional and must be explicitly env-gated when a live adapter/command supports it. Do not put API keys, generated Supabase credentials, database passwords, production URLs, or private feed credentials in repo files or vault notes.

BE-303 exposes the local M3 worker command as `cluster:generate` in `apps/worker/package.json`. There is currently no root `cluster:generate` alias, so run it through the worker filter.

Required QA-308 path from a clean local database:

```powershell
pnpm supabase:start
pnpm db:reset
pnpm db:migrate
pnpm db:check
pnpm seed:sync
pnpm ingest --force --json
pnpm --filter @topicpress/worker cluster:generate -- --json --limit 5
```

The documented `cluster:generate` CLI currently exposes `--json` and `--limit`; it does not expose a live-AI flag. Keep this command in fixture/default mode for QA. `--limit 5` bounds the local M3 run while still proving the command can cluster eligible source items and generate reviewable drafts.

Required QA-308 evidence:

- Clustering consumes active, normalized local `source_items` and creates durable `story_clusters` plus `story_cluster_items`.
- Draft generation creates exactly one reviewable `articles` row for an eligible cluster, with primary-locale localization, SEO fields, configured category, generation metadata, and article-source lineage.
- Re-running generation for an already article-backed cluster is idempotent and does not create a duplicate article.
- `pipeline_runs` records M3 `cluster` and `generate` visibility for success, no-op/idempotent, and failure cases without storing secrets.
- Generated content remains in review flow only; M3 must not publish, render public pages, add schedulers, or introduce queue infrastructure.

Live AI is not required for M3 closure, and the documented BE-303 command does not require provider credentials. Document live provider keys only in placeholder form and only after a future command or live adapter actually supports them.

Advisory local checks:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/ai test
pnpm --filter @topicpress/worker typecheck
pnpm --filter @topicpress/worker lint
pnpm --filter @topicpress/worker build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm db:diff:local` is useful as an advisory schema-drift check, but it is a known non-blocking Windows Docker shadow database issue in this workspace. Do not block local M2/M3 verification if `pnpm db:reset`, `pnpm db:migrate`, `pnpm db:check`, seed sync, focused worker/AI tests, ingestion, and cluster/generate verification pass.

Root `pnpm build` currently has a known unrelated web build hang in this Windows workspace. Prefer focused worker/AI builds for M2/M3 verification unless the change touches `apps/web` or shared build behavior.

If Docker is not running, default Supabase ports are unavailable, or local package installation is blocked, record the exact blocker instead of substituting remote credentials.

## M4 Local Review-Gated Publishing Verification

M4 keeps publishing local/internal and manually gated. Generated drafts must move through human review before publication; direct `draft` or `review` publication must remain blocked. Do not put API keys, generated Supabase credentials, database passwords, production URLs, reviewer credentials, or private source credentials in repo files, UI notes, CLI output, or vault notes.

Prepare a local dataset from the verified M3 path:

```powershell
pnpm supabase:start
pnpm db:reset
pnpm db:migrate
pnpm db:check
pnpm seed:sync
pnpm ingest --force --json
pnpm --filter @topicpress/worker cluster:generate -- --json --limit 5
```

Run the internal editorial UI:

```powershell
pnpm --filter @topicpress/web dev
```

Open `http://localhost:3000/internal/editorial/review`. The list shows reviewable `draft`, `review`, and `ready` articles. Open an article detail page to inspect title, body, category, slug, primary locale, SEO fields, source lineage, generation metadata, review notes, and BE-401 validation state.

Use the article detail actions for the UI workflow:

- `Move to review` sends a `draft` article to `review`.
- `Approve ready` sends a valid `review` article to `ready` through BE-401 validation.
- `Mark failed` requires a non-empty reason and records sanitized review notes through BE-401.
- `Publish` publishes only valid `ready` content through BE-402 and returns pipeline run feedback.
- `Hold` is a no-op and does not submit a backend transition.

Use the worker CLI when QA needs a backend-only publish path:

```powershell
pnpm --filter @topicpress/worker article:publish -- --article-id <article-id> --json
```

Expected positive check:

- A valid `review` article can move to `ready`.
- A valid `ready` article can publish.
- Successful publication sets `articles.status = 'published'` and `articles.published_at`.
- The publish attempt creates one `pipeline_runs` row with `run_type = 'publish'`, final status, article id, and a sanitized payload.

Expected negative checks:

- `draft` and `review` articles cannot publish directly through the UI or CLI.
- Missing category, slug, primary localization, title/body/excerpt, SEO metadata, generation metadata, source lineage, or primary source lineage blocks ready/publish transitions.
- Invalid transitions and validation failures must not partially mutate article status or `published_at`.
- Re-running publish for an already published article is idempotent and preserves the original `published_at`.

Useful local SQL inspection through the project Supabase CLI:

```powershell
.\node_modules\.bin\supabase.CMD db query "select id, status, published_at, review_notes from public.articles order by updated_at desc limit 10;"
.\node_modules\.bin\supabase.CMD db query "select id, run_type, status, article_id, error_message, payload from public.pipeline_runs where run_type = 'publish' order by created_at desc limit 10;"
```

Focused M4 checks:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/web lint
pnpm db:check
```

`pnpm db:diff:local` remains advisory because of the known Windows shadow database issue. Root `pnpm build` has a known web build hang risk in this workspace; prefer focused web typecheck/lint and worker tests for M4 unless specifically investigating build behavior.
