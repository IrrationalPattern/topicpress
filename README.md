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

Advisory local checks:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker typecheck
pnpm --filter @topicpress/worker lint
pnpm --filter @topicpress/worker build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm db:diff:local` is useful as an advisory schema-drift check, but it is a known non-blocking Windows Docker shadow database issue in this workspace. Do not block M2 ingestion if `pnpm db:reset`, `pnpm db:migrate`, `pnpm db:check`, seed sync, worker tests, and ingestion verification pass.

Root `pnpm build` currently has a known unrelated web build hang in this Windows workspace. Prefer `pnpm --filter @topicpress/worker build` for M2 ingestion verification unless the ingestion change touches `apps/web` or shared build behavior.

If Docker is not running, default Supabase ports are unavailable, or local package installation is blocked, record the exact blocker instead of substituting remote credentials.
