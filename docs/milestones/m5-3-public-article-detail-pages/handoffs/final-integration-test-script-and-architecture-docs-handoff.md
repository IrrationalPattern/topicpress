# Handoff - Final integration test script and architecture docs

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Type | integration follow-up |
| Actor | parent orchestrator |
| Status | Implemented |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: remove the last process and docs drifts found after T006: focused article-detail tests were not in package scripts, and architecture docs still described article detail pages as deferred.

Scope: package test script wiring and canonical docs corrections only. No runtime behavior, schema, Supabase, source code logic, route implementation, or tests were changed.

Dependencies: T002-T006 implementation and QA evidence, plus the T006 handoff that identified the package-script and architecture-doc caveats.

Acceptance:

- `pnpm --filter @topicpress/web test` enumerates `public-article-detail-components.test.tsx` and `public-article-detail-page.test.ts`.
- `pnpm --filter @topicpress/worker test` enumerates `public-article-detail.test.mjs`.
- Architecture docs no longer list `/[locale]/articles/[slug]` as deferred.
- Project state, QA strategy, README, closeout, and T006 handoff no longer record package-script coverage as an open gap.

## Files changed

| File | Change summary |
| --- | --- |
| `apps/web/package.json` | Added focused article detail component/page tests to the default web `test` script. |
| `apps/worker/package.json` | Added `public-article-detail.test.mjs` to the default worker `test` script. |
| `docs/architecture/overview.md` | Updated implemented route list, public read boundary, article detail rendering rules, and current M5 status. |
| `docs/architecture/boundaries.md` | Updated public route ownership and deferred-route boundary now that article detail pages are implemented. |
| `docs/PROJECT_STATE.md` | Removed package-script coverage from active risks and next milestones. |
| `docs/qa/test-strategy.md` | Updated package coverage and M5.3 validation commands now that package scripts enumerate detail tests. |
| `README.md` | Simplified M5.3 verification commands to package scripts. |
| `docs/milestones/m5-3-public-article-detail-pages/closeout.md` | Removed resolved package-script and architecture-doc residual risks. |
| `docs/milestones/m5-3-public-article-detail-pages/handoffs/T006-consolidate-docs-and-handoff.md` | Added a post-T006 integration note and removed resolved caveats. |

## Validation

Passed after this handoff:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

Also passed:

```powershell
git diff --check
```

`git diff --check` printed only line-ending warnings from the Windows workspace and no whitespace errors.

## Process notes

What worked: QA and T006 handoffs made the process gaps visible enough to fix before final handoff.

What struggled: earlier task write scopes prevented implementation agents from updating package scripts or architecture docs, so the parent orchestrator had to do a final consistency pass.
