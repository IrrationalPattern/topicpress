# Handoff - T006 Consolidate docs and milestone handoff

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T006` |
| Type | knowledge_consolidation |
| Owner | `docs` |
| Actor | `knowledge_curator` |
| Status | Implemented |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: consolidate canonical docs after M5.3 public article detail pages passed QA and QA-M5.3-001 was fixed.

Scope: docs-only for T006. I updated project state, route docs, QA strategy, milestone statuses, milestone closeout, README route verification guidance, and this T006 handoff. I did not edit application code, package code, tests, schema, Supabase files, package scripts, or infrastructure during T006.

Dependencies: T006 depended on T005 QA. Evidence consumed included `docs/milestones/m5-3-public-article-detail-pages/qa-report.md`, `docs/milestones/m5-3-public-article-detail-pages/handoffs/T005-qa-article-detail-route-handoff.md`, and `docs/milestones/m5-3-public-article-detail-pages/handoffs/QA-M5.3-001-metadata-title-suffix-fix-handoff.md`.

Acceptance criteria:

- `docs/PROJECT_STATE.md` reflects M5.3 completion and residual risks.
- `docs/frontend/routes.md` records `/[locale]/articles/[slug]` as implemented and keeps remaining deferred routes accurate.
- `docs/qa/test-strategy.md` records article detail validation expectations.
- Milestone closeout records final status, validation summary, residual risks, and next milestone recommendation.
- No code, package, schema, migration, or infrastructure files are edited by T006.

## Current project state

M5.3 Public Article Detail Pages is complete after QA passed on 2026-05-27 and QA-M5.3-001 fixed metadata title suffix duplication.

Implemented state now recorded canonically:

- `/[locale]/articles/[slug]` renders durable published article details.
- Homepage/category article cards link to article detail pages.
- Public article detail reads require `published` status, non-null `published_at`, active category, valid slug, required public fields after locale fallback, and backend-provided `alternateSlugs`.
- Article body renders as escaped plain text paragraphs.
- Metadata uses article meta fields/fallbacks and backend-provided alternates.

Active risks:

- Root `pnpm build` still has the `root-web-build-hangs` release-hardening caveat.
- Next dev dynamic not-found article/category paths can return HTTP `200` with `noindex` markers; production status needs release validation.
- Sitemap, robots, archive, structured article data, source attribution, right rail content, and production canonical rollout remain deferred.

## Docs changed

| File | Why |
| --- | --- |
| `docs/PROJECT_STATE.md` | Marked M5.3 complete, updated implemented public routes, current contracts, risks, and next planned milestones. |
| `docs/frontend/routes.md` | Replaced stale M5.2 route state with the implemented article detail route, article detail contract, metadata behavior, not-found behavior, and updated smoke checks. |
| `docs/qa/test-strategy.md` | Added article detail validation commands, route smoke expectations, and deferred scope. |
| `README.md` | Updated local verification guidance because article detail routes and card links are now implemented; added focused M5.3 verification steps. |
| `docs/milestones/m5-3-public-article-detail-pages/plan.md` | Updated milestone status, task statuses, and acceptance checklist. |
| `docs/milestones/m5-3-public-article-detail-pages/task-graph.yaml` | Updated milestone/task statuses to reflect QA pass and T006 implementation. |
| `docs/milestones/m5-3-public-article-detail-pages/tasks/*.yaml` | Updated task statuses: T001-T005 `qa_passed`, T006 `implemented`. |
| `docs/milestones/m5-3-public-article-detail-pages/closeout.md` | Replaced placeholder closeout with final outcome, validation summary, residual risks, and next recommendation. |
| `docs/milestones/m5-3-public-article-detail-pages/handoffs/T006-consolidate-docs-and-handoff.md` | Added this handoff. |

## Validation

Manual docs consistency checks performed:

- Confirmed `docs/PROJECT_STATE.md`, `docs/frontend/routes.md`, `docs/qa/test-strategy.md`, milestone plan, task graph, task YAML statuses, closeout, and this handoff agree that M5.3 is complete after QA-M5.3-001.
- Confirmed remaining deferred surfaces are consistent across docs: archive, sitemap, robots, structured article data, source attribution, right rail content, production canonical rollout, and release hardening.
- Confirmed package-level validation plus route smoke are the focused evidence path.

No code validation commands were required by T006.

## Post-T006 integration note

After T006, the parent integration pass made two follow-up corrections before final handoff:

- `apps/web/package.json` and `apps/worker/package.json` now enumerate the focused article detail tests in their package `test` scripts.
- `docs/architecture/overview.md` and `docs/architecture/boundaries.md` now reflect `/[locale]/articles/[slug]` as implemented rather than deferred.

The T006 docs in this handoff have been adjusted to remove the former package-script and architecture-doc caveats.

## Next actions

Recommended next slice remains M5 sitemap and robots now that article/category/detail URL policy is settled.

If operational readiness is prioritized first, route release hardening before the sitemap/robots slice:

- repair `root-web-build-hangs`,
- recheck production status behavior for dynamic not-found article/category paths.
