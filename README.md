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

If Docker is not running, default Supabase ports are unavailable, or local package installation is blocked, record the exact blocker instead of substituting remote credentials.
