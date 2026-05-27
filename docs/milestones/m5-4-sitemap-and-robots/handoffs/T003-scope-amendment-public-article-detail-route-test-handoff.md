# Handoff - T003 scope amendment for public article detail route test

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T003` |
| Type | architecture / scope amendment |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: resolve a narrow T003 scope drift before frontend implementation continues.

Scope: docs-only amendment to the M5.4 milestone plan, task graph, and T003 task YAML. No app code or test code is edited by this handoff.

Dependencies: `AGENTS.md`, `docs/PROJECT_STATE.md`, the M5.4 plan, task graph, T003 task YAML, T001 contract handoff, T002 implementation handoff, and the existing assertion in `apps/web/test/public-article-detail-page.test.ts`.

Acceptance criteria: decide whether T003 should include `apps/web/test/public-article-detail-page.test.ts`; if yes, add the path to T003 allowed/may-update/expected test scope with a narrow reason; write this handoff; do not edit app or test code.

## Decision

Decision: yes, add `apps/web/test/public-article-detail-page.test.ts` to T003 scope for the narrow purpose of revising obsolete sitemap/robots absence assertions.

Reason: T003 must add `apps/web/src/app/sitemap.ts` and `apps/web/src/app/robots.ts`. The existing public article detail route test still asserts those files do not exist, so `pnpm --filter @topicpress/web test` would fail after T003 unless the stale assertions are revised. This is a route-activation test maintenance change, not an article detail behavior change.

## Scope guardrail

T003 may update `apps/web/test/public-article-detail-page.test.ts` only to remove or revise assertions that `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts` are absent.

This amendment does not authorize:

- changing article detail route behavior,
- changing article detail metadata expectations,
- changing public article data eligibility,
- adding sitemap or robots implementation outside the existing T003 allowed paths,
- editing worker, schema, migration, or Supabase files.

## Docs changed

| File | Change summary |
| --- | --- |
| `docs/milestones/m5-4-sitemap-and-robots/plan.md` | Added the T003 scope amendment and architecture-impact note for stale route-test assertion cleanup. |
| `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml` | Added `apps/web/test/public-article-detail-page.test.ts` to T003 allowed paths with a narrow scope note. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/T003-implement-sitemap-and-robots-endpoints.yaml` | Added the test file to relevant files, write scope, expected test changes, contracts.may_update, and acceptance criteria with the narrow reason. |
| `docs/milestones/m5-4-sitemap-and-robots/handoffs/T003-scope-amendment-public-article-detail-route-test-handoff.md` | Added this handoff. |

## Validation and manual review

Manual review completed:

- Confirmed `apps/web/test/public-article-detail-page.test.ts` asserts `src/app/robots.ts` and `src/app/sitemap.ts` do not exist.
- Confirmed T003 requires adding `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts`.
- Confirmed the path was not already in T003 allowed paths, expected test paths, or contracts.may_update.
- Confirmed no app or test code was edited.

Validation command to run after this docs-only amendment:

```powershell
git diff --check -- docs/milestones/m5-4-sitemap-and-robots
```

## Handoff to T003

The frontend implementation agent should revise `apps/web/test/public-article-detail-page.test.ts` only enough to stop asserting that the required sitemap and robots metadata route files are absent. The new focused sitemap/robots tests remain the primary place for endpoint behavior coverage.
