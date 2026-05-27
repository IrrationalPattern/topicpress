# Handoff - T002 Add public article detail read service

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T002` |
| Type | backend |
| Owner | `implementation` |
| Actor | `backend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: add a read-only worker public article detail service for T003 to consume.

Scope: bounded to `apps/worker/src/public-article-detail/`, `apps/worker/src/public-article-detail.ts`, `apps/worker/src/index.ts`, `apps/worker/test/public-article-detail.test.mjs`, and this handoff. No web, schema, Supabase, generation, review, publish, sitemap, robots, archive, structured data, or source-attribution behavior was changed.

Dependencies: T001 finalized the route/data contract and slug lookup precedence.

Acceptance evidence:

- The service returns `found` for public-eligible articles only.
- Lookup precedence is requested-locale localization slug, default-locale localization slug, then canonical `articles.slug`.
- Required fields after fallback are public slug, title, excerpt, and body.
- Unsupported locale, invalid slug, unknown slug, unpublished status, null `published_at`, inactive category row, and incomplete records return `not_found`.
- Requested-locale fields win over default-locale fallback.
- `alternateSlugs` is keyed by supported app locale and only includes slugs that resolve the same public article under the lookup contract.
- The DTO is serialized and public-safe; no raw database row or source-attribution join is exposed.

## Files changed

| File | Change summary |
| --- | --- |
| `apps/worker/src/public-article-detail/types.ts` | Added public article detail DTO, result, store, transaction, and row contracts. |
| `apps/worker/src/public-article-detail/drizzle-store.ts` | Added Drizzle read store for slug candidate lookup against published articles, non-null `published_at`, active categories, and supported localization rows. |
| `apps/worker/src/public-article-detail/service.ts` | Added read-only service with locale validation, slug validation, lookup-tier resolution, fallback/sanitization, category labels, keyword cleanup, and `alternateSlugs` verification. |
| `apps/worker/src/public-article-detail.ts` | Added facade exports for the new service folder. |
| `apps/worker/src/index.ts` | Exported `public-article-detail` through the worker package facade. |
| `apps/worker/test/public-article-detail.test.mjs` | Added focused in-memory service tests for found, fallback, lookup precedence, canonical fallback, alternate slugs, and not-found cases. |

## Validation

Passed:

```powershell
pnpm --filter @topicpress/worker build
node apps\worker\test\public-article-detail.test.mjs
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/worker run lint
pnpm --filter @topicpress/worker run typecheck
```

Notes:

- `node apps\worker\test\public-article-detail.test.mjs` passed with 13 assertions across 6 top-level tests.
- The existing `pnpm --filter @topicpress/worker test` script passed, but it does not currently enumerate `test/public-article-detail.test.mjs`. `apps/worker/package.json` is outside this task's allowed write scope, so the new test was run separately and this caveat is recorded for QA/T003 follow-up.

## Risks and follow-up notes

- No schema/index change was made. The Drizzle store uses the existing `article_localizations_locale_slug_unique`, `articles_slug_unique`, and public status/category indexes.
- Same-tier duplicate public candidates return `not_found` in service logic, as required by the T001 contract. No duplicate data issue was observed because tests used the in-memory store.
- Source attribution remains deferred; there are no `article_sources` or `source_items` joins.

## Process notes

What helped:

- The homepage and category listing read services provided a clear store/service/test pattern.
- T001's explicit slug precedence and body/source-attribution decisions kept the implementation bounded.
- The in-memory test store made it straightforward to exercise precedence and alternate-slug behavior without schema or fixture changes.

What struggled:

- Verifying `alternateSlugs` correctly requires checking route resolution, not just reading localization rows, because a fallback slug can be shadowed by another article's requested-locale slug.
- The package test script is manually enumerated and outside T002 write scope, so the new focused test cannot be added to the default worker test command in this task.
