# Handoff - Docs drift fix

## Task metadata

| Field | Value |
| --- | --- |
| Date | 2026-05-26 |
| Task | Review and fix contradictions/drift in `docs/` |
| Type | documentation |
| Status | implemented |

## Scope completed

- Reconciled public localization fallback docs with current worker code: homepage and category listings prefer requested-locale fields and fall back to the configured default locale, omitting articles when required public fields remain unavailable after fallback.
- Clarified Topicpress product/runtime wording: reusable platform, with one independently deployed publication per MVP instance/database.
- Updated current-state date references from stale `2026-05-20`/`2026-05-21` wording to `2026-05-26` where the touched docs now describe current state.
- Expanded internal editorial route documentation to include both the review list and review detail/actions route.
- Broadened `source_items` wording so the schema doc reflects the table lifecycle model while noting current ingestion persists normalized rows.

## Files changed

- `docs/PROJECT_STATE.md`
- `docs/architecture/overview.md`
- `docs/database/schema.md`
- `docs/frontend/routes.md`
- `docs/product/vision.md`
- `docs/qa/test-strategy.md`
- `docs/milestones/ad-hoc/handoffs/2026-05-26-docs-drift-fix.md`

## Code evidence used

- `apps/worker/src/public-homepage/service.ts` resolves requested-locale fields with default-locale fallback for slug, title, excerpt, and optional display/SEO fields.
- `apps/worker/src/public-category-listing/service.ts` applies the same fallback behavior for category listing article fields.
- `apps/worker/src/public-homepage/drizzle-store.ts` filters candidates to `published` articles with non-null `published_at` and active categories before localization resolution.
- `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/page.tsx` confirms the implemented internal review detail route.
- `apps/worker/src/source-item-persistence/source-item-values.ts` confirms current ingestion persists source items with `status: "normalized"`.

## Validation

- No assigned milestone plan or task YAML existed under `docs/milestones/` beyond templates, so there were no task-file validation commands to run.
- Documentation consistency scans were run with `rg` for stale date references, contradictory localization phrases, and route-summary wording.

## Residual risks

- This task did not run application tests because no runtime code changed.
- Root `pnpm build` remains the existing release-hardening risk documented in project state and QA strategy.
