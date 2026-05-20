# Topicpress Ownership Boundaries

Updated: 2026-05-21

This document defines practical ownership boundaries for the current Topicpress MVP codebase. It is based on `docs/PROJECT_STATE.md`, accepted ADRs 001-006, the imported Obsidian architecture overview, M5 public-route notes, and the current local code structure.

## Binding Architecture Decisions

- `apps/web` and `apps/worker` are separate runtimes inside one pnpm/Turborepo monorepo. Public rendering must not absorb ingestion, clustering, generation, retry, or recovery work.
- Each deployed publication uses one isolated Supabase Postgres database. Runtime content tables do not model multi-tenancy with `site_id`.
- Repo-owned configuration is the durable source of truth for site identity, locales, taxonomy, sources, editorial rules, theme tokens, and SEO defaults.
- Supabase Postgres owns operational publishing state: source items, clusters, articles, localizations, source lineage, and pipeline run history.
- One story cluster may produce at most one canonical article in MVP.
- Generated articles require manual review before publication.
- MVP worker execution is database-backed polling/state transitions plus `pipeline_runs` history, not a dedicated queue platform.

## Runtime Ownership

### `apps/web`

Owns the Next.js App Router runtime:

- locale-aware public routes, currently `/`, `/[locale]`, and `/[locale]/categories/[categorySlug]`
- future SEO endpoints and public pages when their slice is activated
- public layout, shadcn/ui components, semantic CSS token consumption, and `next-intl` routing
- lightweight internal editorial review pages under `/internal/editorial/review`
- server-only read wrappers that open short-lived Drizzle/Postgres connections for page data
- server actions for the existing internal editorial review surface

`apps/web` may read published public data and may call explicit review/publish service functions for the internal editorial surface. It must not run feed fetches, clustering, draft generation, live OpenAI calls, retry loops, or background recovery inside page requests.

Current caveat: `apps/web` imports selected service/read functions from `@topicpress/worker`. Treat that as a shared service boundary, not permission to use arbitrary worker internals from routes. New public read contracts should be narrow, server-only, DTO-shaped, and safe for request-time execution. If this coupling grows, introduce a shared query/service package or a clearer exported facade rather than importing deep worker modules.

### `apps/worker`

Owns asynchronous and operational content work:

- feed ingestion, fetch policy, normalization, deduplication, and source item persistence
- story clustering and cluster state transitions
- article draft creation, category assignment, locale content generation, SEO fields, and source lineage
- fixture vs live AI provider selection through `packages/ai`
- manual review service rules and publish service rules used by the internal editorial surface
- idempotent seed/sync for config-owned `sources` and `categories`
- `pipeline_runs` writes for execution history, attempts, errors, and operational visibility
- CLI entrypoints such as ingest, cluster/generate, publish, and seed/sync

The worker owns state-changing pipeline behavior. It should keep operations idempotent and sanitize errors, review notes, payloads, and generation metadata before persistence so secrets or provider internals do not leak into database-visible records.

### `packages/db`

Owns the database contract:

- Drizzle schema definitions and exported typed schema
- table, enum, relation, index, and constraint definitions
- schema changes that require Supabase migrations
- canonical database type exports used by web and worker

`packages/db` should not own runtime database clients, business services, seed data, or environment loading. It defines shape and constraints; apps decide when and why to query. Migrations under `supabase/migrations` must stay aligned with this package.

### `packages/config`

Owns durable site configuration:

- site identity, configured domains, supported locales, default locale, and locale paths
- active category taxonomy seed and source seed definitions
- editorial rules, prompt constraints, review expectations, and publication policy defaults
- public theme/design tokens and SEO defaults
- validation helpers and derived config views such as category/source seed values

Config is versioned product setup, not operational state. Adding a source, category, locale, SEO policy, or theme token belongs here first, then flows into runtime rows through seed/sync or rendering logic. Do not store runtime article status, fetched timestamps, pipeline attempts, or generated content here.

### `packages/ai`

Owns AI-facing contracts:

- article generation input shaping
- prompt builders
- fixture provider behavior for deterministic local/CI flows
- live OpenAI provider behavior, structured output format, timeouts, and provider errors
- draft output validation, category enforcement, slug helpers, and generated body sanitization

`packages/ai` should not open database connections, write article rows, read route params, or decide publication status beyond returning validated draft metadata. Live provider use must remain explicit and secret-gated; fixture-backed generation remains the default local/CI path.

### `supabase`

Owns local Supabase project configuration and generated migration artifacts:

- `supabase/config.toml` for local Supabase service settings
- `supabase/migrations/*` as the committed SQL history applied to Postgres
- migration metadata produced by Drizzle/Supabase workflows

Supabase is the operational database platform, not the application architecture layer. Product schema decisions start in `packages/db` and accepted architecture docs/ADRs, then become migrations. Do not hand-edit migrations to introduce behavior that is absent from the Drizzle schema unless the discrepancy is documented and reconciled immediately.

### `docs`

Owns canonical project knowledge during the docs migration:

- current state in `docs/PROJECT_STATE.md`
- accepted architecture decisions under `docs/architecture/adr`
- milestone/task templates and future imported milestone/task records
- architecture, API, database, frontend behavior, infrastructure, and QA strategy notes when implementation changes those surfaces

Obsidian Topicpress notes remain useful historical and migration context, but repo `docs/` is the working canonical source called out by `AGENTS.md`. If Obsidian and `docs/` disagree, preserve the discrepancy in the relevant docs/handoff instead of silently picking one.

### `.codex` agents

Owns local agent role configuration and routing prompts:

- role prompts under `.codex/agents`
- repo-local Codex settings in `.codex/config.toml`
- agent scope, permissions, and collaboration expectations

`.codex` must not become product source code, runtime configuration, database state, or durable product requirements. Agent changes are infrastructure/process changes and should be reviewed separately from app behavior changes. `.codex` agents may guide work, but accepted decisions still belong in `docs/`, ADRs, specs, task records, or code.

## Server And Client Database Boundary

Database access belongs on the server side only.

- Public React components and client-side UI must receive serialized DTOs, not Drizzle clients, SQL builders, raw Postgres connection details, or privileged environment values.
- `apps/web` route handlers, server components, metadata functions, and server actions may open server-only database clients when the work is short and request-scoped.
- Public page reads must filter to durable `published` articles with non-null `published_at` and must not expose `draft`, `review`, `ready`, `failed`, unpublished, or unrelated-category content.
- Internal editorial server actions may call review/publish services, but those actions are part of the internal surface and should not create public write APIs by accident.
- Long-running, retryable, or failure-prone DB work belongs in `apps/worker`, with state transitions and `pipeline_runs` evidence.

Practical rule: if a database operation changes ingestion, clustering, generation, article lifecycle, publication, retries, or recovery state, route it to `apps/worker`. If it only reads bounded published data for a public page, it may live behind a server-only `apps/web` read wrapper.

## Secrets Boundary

Secrets are runtime environment values, never committed product configuration.

- Allowed committed examples: placeholder values in `.env.example` and secret names in docs or config comments.
- Disallowed committed values: real database passwords, Supabase anon/service-role keys, JWT secrets, OpenAI API keys, provider responses containing secrets, or private production origins.
- `DATABASE_URL`/`SUPABASE_DB_URL` are server-only database connection values used by local web/worker and Drizzle workflows.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should not be used in public client bundles.
- `OPENAI_API_KEY` and live AI provider settings belong only to server/worker runtime env. Live generation requires explicit `TOPICPRESS_AI_PROVIDER=live` and `TOPICPRESS_AI_LIVE_ENABLED=true`.
- Error messages, review notes, generation metadata, pipeline payloads, and handoffs must be scrubbed before persistence or documentation.

Public `NEXT_PUBLIC_*` variables may be exposed to the browser by design. Do not place secrets behind a `NEXT_PUBLIC_` prefix.

## Config Versus State Boundary

Use this split when deciding where a value belongs:

| Concern                      | Owner                                     | Examples                                                                                      |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Durable site setup           | `packages/config`                         | brand, locales, taxonomy, approved source list, editorial rules, theme tokens, SEO defaults   |
| Schema and constraints       | `packages/db` plus `supabase/migrations`  | tables, enums, indexes, uniqueness, foreign keys                                              |
| Operational publishing state | Supabase Postgres via worker/web services | source items, clusters, articles, localizations, status, review notes, publication timestamps |
| Execution history            | Supabase Postgres via `apps/worker`       | `pipeline_runs`, attempts, errors, payload summaries                                          |
| Runtime secrets              | ignored env / deployment secret store     | DB URLs, Supabase keys, OpenAI keys                                                           |
| Agent/process configuration  | `.codex` and AGENTS.md                    | role prompts, agent routing, local collaboration instructions                                 |

Config can seed or sync runtime rows by stable `config_key` values. Runtime rows should keep historical references even when config entries are removed or deactivated; seed/sync should deactivate rather than destructively delete referenced data.

## Public Route Boundaries

Implemented public routes:

- `/` redirects to the configured default-locale homepage.
- `/[locale]` renders the locale-aware homepage.
- `/[locale]/categories/[categorySlug]` renders active category listing pages from published article state.

Deferred public routes:

- `/[locale]/articles/[slug]`
- `/[locale]/archive`
- `/robots.txt`
- `/sitemap.xml`

Deferred means not owned by incidental navigation, data fetching, metadata work, or component cleanup. Work on deferred routes should start only through a dedicated M5 slice or task that defines route contract, data contract, metadata/SEO behavior, validation commands, and QA acceptance criteria.

Until article detail pages exist, public cards and category pages should avoid links that imply readable article permalinks are live. Until sitemap/robots exist, do not treat metadata helpers as a crawler coverage contract. Until archive exists, do not add chronological all-article pagination unless a task explicitly activates that surface.

## Agent Routing Rules

- Use Architect for architecture boundaries, ADRs, route/data ownership decisions, and cross-package tradeoffs.
- Use Frontend Implementation for Next.js routes, React components, shadcn/ui, public shell, metadata composition, and browser-visible behavior in `apps/web`.
- Use Backend Implementation for worker services, request-safe read services, CLI behavior, article lifecycle services, ingestion, clustering, generation, and publication behavior in `apps/worker`.
- Use Data Agent when schema, migrations, indexes, constraints, or data integrity are the primary change.
- Use Platform Infra for Supabase CLI workflow, CI/build behavior, deployment settings, operational docs, and release checks.
- Use QA for task validation, defect classification, regression evidence, and release-readiness reports.
- Use Vault Coordinator for canonical project-memory updates that exceed a role's write authority.

When a task crosses boundaries, split work by owner and keep write scopes disjoint. Architecture should define the contract first; implementation agents should not silently expand route, schema, or runtime ownership.

## Open Questions

- Whether `apps/web` importing exported `@topicpress/worker` read services should remain acceptable for M5, or be moved behind a smaller shared read package before release hardening.
- Whether article detail pages or sitemap/robots should be the next M5 slice after completed category pages.
