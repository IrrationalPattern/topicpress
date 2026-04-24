# Topicpress

Topicpress is a monorepo for a Next.js publication app, an asynchronous worker, and shared packages for database, configuration, and AI boundaries.

## Workspace Shape

```text
apps/
  web/       Next.js application shell
  worker/    TypeScript worker shell
packages/
  db/        Database package shell; Drizzle schema comes later
  config/    Configuration package shell; site schema comes later
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

`INF-001` only creates the repository foundation. Follow-up implementation belongs to the next task records: `DATA-001` for site configuration, `INF-002` for Supabase local workflow, `BE-001` for the Drizzle schema package, and `FE-001` for the real web application shell.
