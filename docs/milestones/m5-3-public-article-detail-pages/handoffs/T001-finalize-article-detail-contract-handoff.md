# Handoff - T001 Finalize article detail route/data contract

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T001` |
| Type | contract |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-26` |

## Goal, scope, dependencies, and acceptance

Goal: confirm the article detail route, data, metadata, not-found, fallback, body rendering, and source-attribution contract before T002/T003 implementation.

Scope: docs-only under `docs/milestones/m5-3-public-article-detail-pages/`. No production code, package code, database schema, migrations, sitemap, robots, archive, structured data, right-rail modules, or source-attribution UI were changed.

Dependencies: none. This task blocks T002 and T003 until the contract is explicit.

Acceptance criteria satisfied:

- The milestone plan now explicitly defines slug lookup precedence, required fallback fields, body rendering, metadata alternates, source attribution scope, and not-found behavior.
- Open questions were resolved rather than left for implementers.
- No `apps/`, `packages/`, or `supabase/` files were edited.
- This handoff records the decisions and manual validation evidence.

## Contract decisions

1. Slug lookup precedence is now fixed:
   1. requested-locale `article_localizations.slug`,
   2. default-locale `article_localizations.slug`,
   3. canonical `articles.slug`.
2. A candidate must still be public-eligible: `published`, non-null `published_at`, active category, and complete required fields after requested-locale/default-locale fallback.
3. Required fields after fallback are public slug, title, excerpt, and body. They must be non-empty after trimming and null-byte removal; the public slug must match the public slug regex.
4. `articles.slug` is only a compatibility fallback for the public slug when no usable localization slug exists for the rendered locale/default fallback.
5. Body rendering is plain text paragraph rendering. M5.3 must not inject raw HTML or convert markdown/rich text into HTML.
6. Metadata language alternates must come from backend-provided `alternateSlugs`, keyed by supported app locale, and only include slugs that resolve the same public article.
7. Source attribution is deferred from the required DTO and UI. The page may have an empty or absent right rail; implementation must not add fake attribution or block content on source-lineage joins.

## Files changed

| File | Change summary |
| --- | --- |
| `docs/milestones/m5-3-public-article-detail-pages/plan.md` | Finalized article detail route/data/body/metadata/source-attribution contracts, marked T001 implemented in the task summary, and resolved open questions. |
| `docs/milestones/m5-3-public-article-detail-pages/task-graph.yaml` | Marked T001 as `implemented`. |
| `docs/milestones/m5-3-public-article-detail-pages/tasks/T001-finalize-article-detail-contract.yaml` | Marked T001 as `implemented` and recorded resolved contract notes. |
| `docs/milestones/m5-3-public-article-detail-pages/tasks/T002-add-public-article-detail-read-service.yaml` | Added `alternateSlugs` and source-attribution boundary requirements for backend implementation. |
| `docs/milestones/m5-3-public-article-detail-pages/tasks/T003-implement-article-detail-route-and-page.yaml` | Added `alternateSlugs` metadata usage and source-attribution boundary requirements for frontend implementation. |
| `docs/milestones/m5-3-public-article-detail-pages/handoffs/T001-finalize-article-detail-contract-handoff.md` | Added this handoff. |

## Manual validation evidence

Manual consistency checks only; no production tests were required or run for this docs-only task.

- Read required context: `AGENTS.md`, `docs/PROJECT_STATE.md`, milestone plan, task graph, and T001 task YAML.
- Read relevant architecture, route, database, and QA docs.
- Checked existing homepage/category public DTO and fallback patterns in `apps/worker/src/public-homepage/types.ts`, `apps/worker/src/public-category-listing/types.ts`, and related services for contract alignment.
- Reviewed T002/T003 task YAML after edits to ensure implementation tasks consume the finalized contract.
- Ran text consistency scans and `git diff --check`; both passed after edits. `git diff --check` emitted an existing line-ending warning for `docs/PROJECT_STATE.md`, which was outside T001 scope and was not edited for this task.

## Blockers

None. T002 may proceed after orchestration accepts this T001 handoff.

## Process notes

What helped:

- The milestone plan already had the right sections, risks, validation gates, and task boundaries, so T001 could refine rather than redesign the milestone.
- The existing homepage/category public read types made the fallback and DTO shape easy to align.
- The explicit docs-only write scope prevented accidental implementation drift.

What was ambiguous or slowed the task:

- Source attribution was described as optional, but optional joins/UI can still expand backend, frontend, and QA scope. This is now resolved as deferred unless Architect reopens it.
- Metadata alternates needed more detail than the original plan provided because frontend implementation needs per-locale slugs without guessing.
- The term `body` did not state whether stored content was trusted HTML, markdown, or text. It is now plain text paragraph rendering for M5.3.
