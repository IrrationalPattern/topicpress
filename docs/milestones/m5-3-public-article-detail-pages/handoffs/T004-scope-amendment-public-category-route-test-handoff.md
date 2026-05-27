# Handoff - T004 Scope Amendment for Public Category Route Test

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Amendment target | `T004` |
| Type | architect scope amendment |
| Actor | `architect` |
| Date | `2026-05-27` |

## Decision

`apps/web/test/public-category-route.test.ts` is in T004 scope.

Reason: T003 implemented `apps/web/src/app/(public)/[locale]/articles/[slug]/`, and its handoff records that `pnpm --filter @topicpress/web test` now fails because `public-category-route.test.ts` still asserts `src/app/(public)/[locale]/articles` is absent. T004 already owns updating tests that previously asserted article links/routes were absent, so the missing file was a write-scope documentation mismatch rather than a new implementation task.

## Scope changes made

- Added `apps/web/test/public-category-route.test.ts` to the milestone plan's relevant code list.
- Added `apps/web/test/public-category-route.test.ts` to T004 `write_scope.allowed_paths` in `task-graph.yaml`.
- Added `apps/web/test/public-category-route.test.ts` to T004 relevant files, allowed paths, expected test paths, and `contracts.may_update`.
- Added a T004 manual validation note to confirm the stale article-route absence assertion is removed.

## Boundaries

This amendment does not authorize application, worker, database, Supabase, sitemap, robots, archive, or structured-data changes. It only authorizes T004 to update the existing route scaffold test so it matches the implemented article route and unblocks the focused web package test command.

## Required follow-up for T004

- Update `apps/web/test/public-category-route.test.ts` alongside the other T004 link/route tests.
- Run the T004 validation commands:
  - `pnpm --filter @topicpress/web test`
  - `pnpm --filter @topicpress/web lint`
  - `pnpm --filter @topicpress/web typecheck`
- Record validation evidence in `docs/milestones/m5-3-public-article-detail-pages/handoffs/T004-link-public-article-cards-to-detail-pages-handoff.md`.
