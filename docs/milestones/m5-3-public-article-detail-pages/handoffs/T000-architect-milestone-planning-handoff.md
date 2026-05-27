# Handoff - T000 Architect milestone planning

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T000` |
| Type | planning |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-26` |

## Summary

Created the docs-first milestone package for M5.3 Public Article Detail Pages. The milestone activates `/[locale]/articles/[slug]` with a narrow published-only article read path and a readable article page. The right rail is intentionally empty or absent for this slice.

## Scope completed

- [x] Created the milestone plan, task graph, six task YAML files, QA report stub, and closeout stub.
- [x] Updated `docs/PROJECT_STATE.md` to point at the new M5.3 milestone package.
- [x] Scoped the route around published article content, locale/default-locale fallback, metadata, body rendering, article card links, QA, and docs consolidation.
- [x] Kept sitemap, robots, archive, structured data, schema changes, generation/review/publish changes, ads, related articles, and right-rail modules out of scope.

## Scope not completed

- No production code was implemented.
- No QA was run for application behavior because this was planning-only.

## Files changed

| File | Change summary |
| --- | --- |
| `docs/PROJECT_STATE.md` | References the ready M5.3 article detail milestone package. |
| `docs/milestones/m5-3-public-article-detail-pages/plan.md` | Defines the milestone goal, scope, contracts, tasks, risks, and quality gates. |
| `docs/milestones/m5-3-public-article-detail-pages/task-graph.yaml` | Defines task dependencies, validation, write scopes, and sequencing. |
| `docs/milestones/m5-3-public-article-detail-pages/tasks/*.yaml` | Defines six ready tasks for contract, backend, frontend, linking, QA, and docs consolidation. |
| `docs/milestones/m5-3-public-article-detail-pages/qa-report.md` | Adds the QA report stub to be completed after implementation. |
| `docs/milestones/m5-3-public-article-detail-pages/closeout.md` | Adds the closeout stub to be completed after QA. |

## Validation run

| Command | Result | Notes |
| --- | --- | --- |
| `rg` consistency scans | Passed | Checked for milestone references and template leftovers relevant to planning. |
| `git diff --check` | Pending | Run from the parent thread after final local review. |

## Known issues

- `root-web-build-hangs` remains an existing release-hardening risk and is explicitly excluded as a completion gate for focused M5.3 work.
- T001 remains the first task even though the plan proposes contracts; it is the formal checkpoint to resolve open questions before backend/frontend implementation.

## QA focus

QA should verify that the implementation eventually renders only published article content, handles requested-locale/default-locale fallback, preserves not-found protections, and records route smoke evidence.
