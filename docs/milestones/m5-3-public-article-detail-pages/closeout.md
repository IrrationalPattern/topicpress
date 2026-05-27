# Milestone Closeout - m5-3-public-article-detail-pages Public Article Detail Pages

## Closeout metadata

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| Milestone        | `m5-3-public-article-detail-pages`         |
| Target milestone | `M5 Public Site and SEO Rendering`         |
| Final status     | Complete; QA passed after follow-up fix    |
| Date             | `2026-05-27`                               |
| Closed by        | `knowledge_curator`                        |

## Original goal

Implement locale-aware public article detail pages at `/[locale]/articles/[slug]` so readers can open a durable published article permalink and read article content.

## Final outcome

M5.3 delivered the public article detail route and linked existing public article cards to readable article permalinks.

Implemented behavior:

- `/[locale]/articles/[slug]` renders public article details for supported locales and valid public slugs.
- Homepage and category article cards link to locale-aware detail pages.
- The worker public detail read service returns only durable published articles with non-null `published_at`, active category rows, valid slugs, required public fields after requested/default locale fallback, and backend-provided `alternateSlugs`.
- Article bodies render as escaped plain text paragraphs.
- Metadata uses article meta fields/fallbacks, Open Graph article metadata, and backend-provided language alternates.
- QA-M5.3-001 fixed duplicated site-name suffixes when stored article `metaTitle` values already included the suffix.

Deferred behavior remains out of scope:

- source attribution
- related articles
- ads, newsletter modules, comments, or right rail content
- archive
- sitemap
- robots
- structured article data
- production canonical rollout
- release hardening

## Task final status

| Task ID | Title | Type | Owner | Actor | Final status | Notes |
| ------- | ----- | ---- | ----- | ----- | ------------ | ----- |
| T001 | Finalize article detail route/data contract | contract | orchestrator | architect | QA passed | Contract resolved slug precedence, fallback, body rendering, metadata alternates, and deferred attribution. |
| T002 | Add public article detail read service | backend | implementation | backend_developer | QA passed | Service and standalone worker detail test implemented; package script coverage gap remains. |
| T003 | Implement article detail route and page | frontend | implementation | frontend_developer | QA passed | Route, metadata, plain-text renderer, and focused web tests implemented. |
| T004 | Link public article cards to detail pages | frontend | implementation | frontend_developer | QA passed | Homepage/category article card links implemented and stale absence assertions removed. |
| T005 | QA article detail route | qa | qa | qa_reviewer | QA passed after fix | QA-M5.3-001 found and then verified fixed. |
| T006 | Consolidate docs and milestone handoff | knowledge_consolidation | docs | knowledge_curator | Implemented | Canonical docs, statuses, closeout, and handoff updated. |

## QA result

| Field                  | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| QA report              | `docs/milestones/m5-3-public-article-detail-pages/qa-report.md`        |
| Final QA result        | Pass after follow-up fix                                               |
| Open critical findings | None                                                                   |
| Open high findings     | None                                                                   |
| Open medium findings   | None; QA-M5.3-001 was fixed                                            |
| Open low findings      | None                                                                   |

## Validation summary

Passed during QA:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
node apps\worker\test\public-article-detail.test.mjs
cd apps\web
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-components.test.tsx
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts
```

QA-M5.3-001 follow-up validation passed:

```powershell
cd apps\web
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Route smoke passed on `http://localhost:3002` for homepage/category article links, English article detail rendering, Ukrainian fallback detail rendering, unsupported locale not found, invalid/unknown article slug not found, and internal editorial review reachability.

Root `pnpm build` was not run because `root-web-build-hangs` remains the accepted release-hardening caveat.

## Remaining risks

| Risk | Impact | Owner | Suggested follow-up |
| ---- | ------ | ----- | ------------------- |
| Root `pnpm build` remains blocked by `root-web-build-hangs`. | Medium | platform/infra | Repair before release hardening, CI build gating, or production status validation. |
| Next dev can return HTTP `200` for dynamic not-found category/article paths while streaming `noindex` markers. | Medium | frontend/platform | Recheck production status behavior after build/release validation is repaired. |
| Sitemap, robots, archive, structured article data, source attribution, and production canonical rollout remain deferred. | Low to medium | product/architect | Dispatch separate scoped M5 slices when prioritized. |

## Next milestone recommendation

Recommended next milestone:

```text
M5 sitemap and robots
```

Reason:

Article/category/article-detail URL policy is now settled enough for a narrow sitemap and robots slice.

If operational readiness is the higher priority, run release hardening first: repair `root-web-build-hangs` and validate production status behavior.

## Final closeout statement

M5.3 is complete with QA evidence and canonical docs updated. The project now has readable public article permalinks, while sitemap/robots and release hardening remain explicit follow-up work.
