# Milestone Closeout - m5-4-sitemap-and-robots Sitemap And Robots

## Closeout metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Final status | Complete; QA passed with no blocking findings |
| Date | `2026-05-27` |
| Closed by | `knowledge_curator` |

## Original goal

Implement `/robots.txt` and `/sitemap.xml` as the next narrow M5 SEO surface. Sitemap output should include supported locale homepages, active category pages, and durable published article detail URLs while preserving M5.3 article detail fallback and published-only rules.

## Final outcome

M5.4 delivered native Next.js metadata routes for `/robots.txt` and `/sitemap.xml`.

Implemented behavior:

- `/robots.txt` returns environment-mapped robots output with one canonical sitemap pointer.
- Local/dev robots output is non-indexing through `Disallow: /`.
- `/sitemap.xml` returns canonical absolute URLs rooted at `https://ai-landscape-brief.example` for local/test/staging QA.
- Sitemap output includes supported locale homepages, active category URLs, and public article detail URLs from the worker public sitemap inventory.
- Sitemap output excludes localhost/request-host URLs, `/`, internal routes, archive routes, unsupported locales, invalid slugs, unpublished/null-`published_at` articles, inactive-category articles, incomplete fallback records, and ambiguous article slug candidates.
- The worker public sitemap inventory returns path-level DTOs only; canonical URL construction remains web/config-owned.
- `next-sitemap` was evaluated and rejected/deferred for M5.4.

Deferred behavior remains out of scope:

- archive
- structured article data
- sitemap indexes, split sitemaps, pagination, image/video/news sitemaps
- production canonical rollout
- release hardening and `root-web-build-hangs`

## Task final status

| Task ID | Title | Type | Owner | Actor | Final status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| T001 | Finalize sitemap and robots contract | contract | orchestrator | architect | QA passed | Resolved canonical origin, robots environment mapping, native Next route choice, and article URL eligibility. |
| T002 | Add public sitemap URL inventory service | backend | implementation | backend_developer | QA passed | Added path-level worker inventory with active-category and public article eligibility protections. |
| T003 | Implement sitemap and robots endpoints | frontend | implementation | frontend_developer | QA passed | Added native Next metadata routes, web canonical helpers, and focused tests. |
| T004 | QA sitemap and robots routes | qa | qa | qa_reviewer | QA passed | Required commands and local route smoke passed; no blocking findings. |
| T005 | Consolidate docs and close milestone | knowledge_consolidation | docs | knowledge_curator | Implemented | Canonical docs, statuses, closeout, and handoff updated. |

## QA result

| Field | Value |
| --- | --- |
| QA report | `docs/milestones/m5-4-sitemap-and-robots/qa-report.md` |
| Final QA result | PASS |
| Open critical findings | None |
| Open high findings | None |
| Open medium findings | None |
| Open low findings | None |

## Validation summary

Passed during QA:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/config test
```

Route smoke passed on `http://localhost:3002`:

- `/robots.txt` returned HTTP 200, `User-Agent: *`, `Disallow: /`, and `Sitemap: https://ai-landscape-brief.example/sitemap.xml`.
- `/sitemap.xml` returned HTTP 200 XML with 24 URLs: 2 locale homepages, 16 category URLs, and 6 article URLs from local qualifying published data.
- Sitemap smoke found no localhost, internal, archive, or root redirect URLs.
- Representative public routes still passed: `/` redirected to `/en-gb`; `/en-gb`, `/uk-ua`, `/en-gb/categories/news`, and one representative article detail URL returned 200.

Root `pnpm build` was not run because `root-web-build-hangs` remains the accepted release-hardening caveat.

## Important decisions made

| Decision | Documented in ADR? | Notes |
| --- | --- | --- |
| Use native Next.js metadata routes, not `next-sitemap`. | No | T001/T003 documented that project-owned origin policy, robots mapping, DB-backed inventory, and M5.3 slug eligibility are the hard parts. |
| Use `siteConfig.identity.domains.productionOriginPlaceholder` as the M5.4 canonical origin source. | No | Accepted for local/test/staging QA only; production release remains blocked while the `.example` placeholder is committed. |
| Fail closed for robots environment resolution outside explicit production. | No | Vercel production maps to production directives; preview/unknown/non-Vercel production map to non-indexing staging/local behavior. |
| Keep sitemap inventory path-level and worker-owned. | No | Canonical URL construction remains web/config-owned. |

No new ADR was required because M5.4 stayed inside existing config-owned SEO settings and existing web/worker public read boundaries.

## Documentation updated

- [x] `docs/PROJECT_STATE.md`
- [x] `docs/frontend/routes.md`
- [x] `docs/qa/test-strategy.md`
- [x] `docs/milestones/m5-4-sitemap-and-robots/`
- [x] `README.md`

## Remaining risks

| Risk | Impact | Owner | Suggested follow-up |
| --- | --- | --- | --- |
| Production canonical origin is still the `.example` placeholder. | High | product/platform | Replace `siteConfig.identity.domains.productionOriginPlaceholder` with the real production origin before enabling production indexability. |
| Root `pnpm build` remains blocked by `root-web-build-hangs`. | Medium | platform/infra | Repair before release hardening, CI build gating, or production status validation. |
| Live route smoke did not include local DB negative records for every exclusion class. | Low | QA | Focused worker/web tests cover unpublished, null-`published_at`, inactive, invalid, incomplete, and ambiguous protections; prepare negative live data only if release QA requires it. |

## Process notes

- The sequential task order worked: T001 contract decisions unblocked T002, T002 path-level DTOs unblocked T003, and T004 had enough implementation handoff evidence for focused QA.
- Stale route-absence assertions in existing route tests were handled through explicit T003 scope amendments.
- Browser navigation to raw metadata routes was blocked by the local browser environment during QA; direct HTTP checks provided the recorded route smoke evidence.
- The milestone did not introduce schema, migration, seed, archive, structured data, release-hardening, source attribution, related content, ads, or right-rail scope.

## Next milestone recommendation

Recommended next milestone:

```text
Release hardening and production SEO readiness
```

Reason:

M5.4 completed the sitemap/robots surface, but production indexing must remain blocked until the canonical `.example` placeholder is replaced with the real production origin and root/web build validation is reliable. If product wants more public SEO surface before launch readiness, archive and structured article data should remain separate scoped slices.

## Final closeout statement

M5.4 is complete with passing focused QA and canonical docs updated. Topicpress now exposes `/robots.txt` and `/sitemap.xml` for the implemented public route families, while production indexability and full release validation remain explicit follow-up work.
