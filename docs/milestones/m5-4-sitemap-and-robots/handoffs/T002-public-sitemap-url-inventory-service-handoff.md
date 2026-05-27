# Handoff - T002 Public sitemap URL inventory service

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T002` |
| Type | backend |
| Owner | `implementation` |
| Actor | `backend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: add a read-only worker public sitemap inventory service that returns public-safe path-level records for crawlable category and article paths. The service must not construct canonical hosts or absolute URLs.

Scope: bounded backend work under `apps/worker/src/public-sitemap/`, `apps/worker/src/public-sitemap.ts`, bounded reusable helper extraction in `apps/worker/src/public-article-detail/`, worker facade/package test wiring, focused worker tests, and this handoff. No web route, robots, schema, migration, Supabase config, ingestion, generation, review, publish, or AI behavior is in scope.

Dependencies: T001's contract handoff and milestone plan; existing `@topicpress/config` locale/taxonomy configuration; existing Drizzle schema exports for `articles`, `article_localizations`, and `categories`; the M5.3 worker public article-detail service semantics for slug precedence, requested/default locale fallback, required fields, invalid slugs, and ambiguous/different-article resolution.

Acceptance criteria: category path records are returned only for active configured categories with active synced DB rows; article path records are returned only for durable `published` articles with non-null `published_at`; inactive-category, unpublished, null-`published_at`, incomplete, invalid-slug, inactive configured-category, stale category slug, and ambiguous candidates are omitted; article path behavior reuses M5.3 detail-route eligibility helpers; returned DTOs are serialized public-safe path records; the worker facade exports the service; focused worker tests are included in `pnpm --filter @topicpress/worker test`; no state-changing/schema/web work is introduced.

## Implementation summary

- Added `listPublicSitemapInventory` / `listPublicSitemapInventoryWithStore` in `apps/worker/src/public-sitemap/service.ts`.
- Added sitemap DTO/store types in `apps/worker/src/public-sitemap/types.ts`.
- Added a Drizzle store in `apps/worker/src/public-sitemap/drizzle-store.ts` that reads active categories and published article candidates only.
- Exported the service through `apps/worker/src/public-sitemap.ts` and the worker package facade.
- Extracted reusable worker-only article-detail helpers from `apps/worker/src/public-article-detail/service.ts`:
  - `buildPublicArticleDetailCandidate`
  - `resolvePublicArticleDetailCandidateForSlug`
  - `isPublicArticleSlug`
- Exported `createDrizzlePublicArticleDetailTransaction` so the sitemap store can reuse the exact detail lookup implementation inside one worker transaction.
- Added optional `updatedAt` to the internal public article detail row type so sitemap records can expose serialized update timestamps without raw rows.
- Added `apps/worker/test/public-sitemap.test.mjs` and wired it into the worker package `test` script.

## Behavior notes

Category records:

- Require an active configured taxonomy category.
- Require an active DB category row with the same `config_key`.
- Require the DB slug to match the configured slug to avoid stale synced category paths.
- Emit one path record per supported locale with `source`, `locale`, `categorySlug`, and serialized `lastModified`.

Article records:

- The Drizzle store prefilters to `articles.status = "published"`, non-null `articles.published_at`, active category rows, and active configured category keys.
- The service also validates active configured category presence and matching category slug.
- For each supported locale, the service builds the candidate slug using the M5.3 detail helper and then resolves that slug through the M5.3 detail lookup helper.
- The path is emitted only when the resolved article id matches the candidate article id. Invalid, incomplete, ambiguous, or different-article candidates are omitted.
- Returned article records contain only `source`, `articleId`, `locale`, `slug`, serialized `publishedAt`, and optional serialized `updatedAt`.

No host, origin, canonical URL, robots directive, sitemap XML, web route, database schema, migration, or state-changing worker behavior was added.

## Changed files

| File | Notes |
| --- | --- |
| `apps/worker/src/public-sitemap/types.ts` | New public-safe sitemap DTO and store contracts. |
| `apps/worker/src/public-sitemap/drizzle-store.ts` | New read-only Drizzle store for category/article sitemap candidates. |
| `apps/worker/src/public-sitemap/service.ts` | New sitemap inventory service and category/article eligibility assembly. |
| `apps/worker/src/public-sitemap.ts` | New facade barrel for the sitemap service. |
| `apps/worker/src/public-article-detail/service.ts` | Extracted reusable detail eligibility/lookup helpers. |
| `apps/worker/src/public-article-detail/drizzle-store.ts` | Exported the detail transaction factory for reuse by sitemap store. |
| `apps/worker/src/public-article-detail/types.ts` | Added optional `updatedAt` to the internal article row projection. |
| `apps/worker/src/index.ts` | Exported the public sitemap facade. Existing M5.3 public article-detail facade export was already present in the working tree and was preserved. |
| `apps/worker/package.json` | Added `public-sitemap.test.mjs` to the worker package test script. Existing M5.3 public article-detail test wiring was preserved. |
| `apps/worker/test/public-sitemap.test.mjs` | New focused memory-store tests for category records, fallback article paths, public-safe DTO shape, exclusion cases, and ambiguity omission. |
| `docs/milestones/m5-4-sitemap-and-robots/handoffs/T002-public-sitemap-url-inventory-service-handoff.md` | This handoff. |

## Validation evidence

Passed:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

Additional check run after implementation:

```powershell
pnpm --filter @topicpress/worker lint
```

Result: passed after removing one unused type import found by the first lint run.

The final `@topicpress/worker test` run includes `node test/public-sitemap.test.mjs`. The new sitemap test passed 4 top-level tests covering active category records, supported-locale article paths with detail fallback semantics, exclusion of ineligible article/category candidates, and ambiguous slug omission.

## Process notes

- The working tree already contained M5.3/M5.4 docs and article-detail files before this task. Those edits were preserved.
- An initial TypeScript run flagged that `publishedAt` is nullable in the shared row type, so the sitemap service now includes an explicit null guard before DTO serialization.
- An initial sitemap fixture reused the same slug across negative cases, which correctly triggered the M5.3 ambiguity rule and omitted the positive row. The fixture was corrected to use distinct slugs for filter-specific cases.
- No live database data issue was observed because this task used focused memory-store tests and package build/test validation, not local route smoke or web endpoint QA.

## QA focus

QA should verify that T003 consumes only these path-level DTOs and keeps canonical origin/absolute URL construction in the web/config-owned layer. QA should also confirm no draft/review/ready/failed/null-`published_at` article leaks into `/sitemap.xml` once the frontend route is implemented.
