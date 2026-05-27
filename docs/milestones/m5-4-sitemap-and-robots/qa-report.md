# QA Report - m5-4-sitemap-and-robots Sitemap And Robots

## Report metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| QA agent | `qa_reviewer` |
| Date | `2026-05-27` |
| Final result | PASS |

## QA status

PASS. No blocking M5.4 QA findings were found. T005 may proceed.

Highest-risk result: sitemap article eligibility and non-production robots behavior are covered by focused tests and local route smoke. Local route smoke confirmed `Disallow: /` for the dev environment and canonical placeholder sitemap URLs only.

## Required restatement

Goal: verify M5.4 sitemap and robots routes after T002 and T003 implementation.

Scope: docs-only QA. Review required milestone/task/handoff context, inspect the sitemap/robots implementation and package manifests, run focused validation commands, perform local route smoke for `/robots.txt` and `/sitemap.xml`, and record evidence in this QA report and the T004 QA handoff. Do not edit app, package, test, schema, or Supabase files.

Dependencies: T001 contract decisions, T002 public sitemap inventory service, T003 native Next metadata endpoints, existing site config canonical origin and robots settings, worker article-detail eligibility helpers from M5.3, and the running local web dev server.

Acceptance criteria: QA report records reviewed artifacts, command results, route smoke results, and findings; published-only/non-null `published_at`/active-category/fallback/ambiguity protections are verified by tests or smoke evidence; `/robots.txt` and `/sitemap.xml` are verified locally; robots environment mapping is verified; canonical sitemap URLs use the configured placeholder origin and not localhost/request hosts; skipped or limited checks are tied to caveats; no high-severity finding remains before T005; QA handoff records goal, scope, dependencies, acceptance criteria, evidence, and next steps.

## Files and artifacts reviewed

| Artifact | Result | Notes |
| --- | --- | --- |
| `AGENTS.md` | Reviewed | Confirmed required QA behavior, docs source of truth, validation, handoff, and docs-only scope. |
| `docs/PROJECT_STATE.md` | Reviewed | Current state still lists sitemap/robots deferred before T005 consolidation. |
| `docs/milestones/m5-4-sitemap-and-robots/plan.md` | Reviewed | Confirmed T001 decisions, route contracts, quality gates, and root build caveat. |
| `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml` | Reviewed | Confirmed T004 docs-only write scope and T005 dependency. |
| T002/T003/T004 task YAML | Reviewed | Confirmed acceptance criteria, validation commands, and package/route smoke requirements. |
| T001/T002/T003 implementation handoffs | Reviewed | Confirmed implementation evidence and known T003 Next 15 robots representation note. |
| T003 scope-amendment handoffs | Reviewed | Confirmed route-test assertion cleanup was approved. |
| `apps/worker/src/public-sitemap/*` | Reviewed | Service returns path-level DTOs, uses article-detail lookup helpers, and filters inactive/stale category state. |
| `apps/worker/test/public-sitemap.test.mjs` | Reviewed | Covers active categories, fallback article paths, exclusions, DTO safety, and ambiguous slug omission. |
| `apps/web/src/app/sitemap.ts` | Reviewed | Native Next metadata sitemap route using `getPublicSitemapEntries`. |
| `apps/web/src/app/robots.ts` | Reviewed | Native Next robots metadata route using T001 environment resolver input. |
| `apps/web/src/lib/public-sitemap.ts` | Reviewed | Server-only DB wrapper calls worker inventory and closes the client. |
| `apps/web/src/lib/public-seo-origin.ts` | Reviewed | Canonical origin, sitemap URL assembly, route filtering, dedupe, and robots mapping helpers. |
| `apps/web/test/public-sitemap-route.test.ts` | Reviewed | Covers placeholder canonical origin, route families, exclusions, and localhost rejection. |
| `apps/web/test/public-robots-route.test.ts` | Reviewed | Covers Vercel/Node mapping, directive lookup, sitemap pointer, and allow/disallow mapping. |
| Package manifests and lockfile | Reviewed | `Select-String` found no `next-sitemap` or `postbuild` matches in package manifests or `pnpm-lock.yaml`. |

## Acceptance criteria verification

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| `/robots.txt` returns configured robots directives with a sitemap pointer. | Pass | HTTP smoke returned 200 text with `User-Agent: *`, `Disallow: /`, and `Sitemap: https://ai-landscape-brief.example/sitemap.xml`. |
| `/sitemap.xml` returns canonical absolute URLs for locale homepages, active categories, and public article details. | Pass | HTTP smoke returned 200 XML with 24 URLs: 2 locale homepages, 16 category URLs, and 6 article URLs. |
| Sitemap article entries expose only durable `published` articles with non-null `published_at`. | Pass | `@topicpress/worker test` includes public sitemap tests for unpublished/null-published exclusion; local sitemap emitted 6 article URLs from qualifying local data. |
| Sitemap article entries use M5.3 fallback/alternate slug rules and omit invalid or ambiguous URLs. | Pass | Worker tests cover detail fallback semantics and ambiguous slug omission through reused article-detail helpers. |
| Robots environment mapping follows T001. | Pass | Web robots tests cover Vercel production/preview/development, local/test/unset, non-Vercel production fail-closed staging, and unknown Vercel values. |
| Canonical URLs do not use localhost/request hosts. | Pass | Web tests and route smoke confirmed placeholder origin `https://ai-landscape-brief.example`; sitemap smoke found `HasLocalhost=False`. |
| `next-sitemap` was not introduced. | Pass | Package manifest/lockfile scan found `NO_MATCHES` for `next-sitemap` and `postbuild`. |
| Focused validation commands pass or failures are documented. | Pass | All required commands passed. |
| Local route smoke evidence is recorded. | Pass | See route smoke section. |
| Required docs and handoffs are complete enough for T005. | Pass with T005 follow-up | T001-T003 handoffs exist; this report and T004 handoff are added by QA. Canonical docs still need T005 consolidation. |

## Validation commands

| Command | Result | Evidence / Notes |
| --- | --- | --- |
| `pnpm --filter @topicpress/web test` | Pass | Ran locale/category/homepage/article-detail plus sitemap/robots tests; all `ok`. |
| `pnpm --filter @topicpress/web lint` | Pass | ESLint completed with exit code 0. |
| `pnpm --filter @topicpress/web typecheck` | Pass | `tsc --noEmit` completed with exit code 0. |
| `pnpm --filter @topicpress/worker test` | Pass | Full worker test script passed, including `public-sitemap.test.mjs` with 4 sitemap subtests. |
| `pnpm --filter @topicpress/worker build` | Pass | `tsc -p tsconfig.json` completed with exit code 0. |
| `pnpm --filter @topicpress/config test` | Pass | Config build and site config tests passed. |
| Root `pnpm build` | Not run | Not a focused M5.4 gate while `root-web-build-hangs` remains open. Residual release-hardening risk. |

## Route smoke

Base URL used: `http://localhost:3002`. The dev server was already listening on that port.

Browser tool note: the Browser plugin was available and initialized, but navigation to both `http://localhost:3002/robots.txt` and `http://127.0.0.1:3002/robots.txt` failed with `net::ERR_BLOCKED_BY_CLIENT`. QA used direct HTTP checks and records this fallback.

| Route / Check | Result | Evidence / Notes |
| --- | --- | --- |
| `/robots.txt` status and body | Pass | HTTP 200, `Content-Type: text/plain`, body contains `User-Agent: *`, `Disallow: /`, and one sitemap pointer. |
| `/robots.txt` local/dev non-indexing | Pass | Output uses native Next robots representation: `Disallow: /`. This satisfies the T003 note for `noindex,nofollow` under installed Next 15 metadata types. |
| `/sitemap.xml` status and XML | Pass | HTTP 200, `Content-Type: application/xml`, parsed as XML with sitemap namespace. |
| Locale homepage URLs included | Pass | Includes `https://ai-landscape-brief.example/en-gb` and `/uk-ua`. |
| Active category URLs included | Pass | Includes 16 category URLs, two locales each for `news`, `model-releases`, `tools-products`, `research`, `benchmarks`, `guides-explainers`, `policy-safety`, and `business-adoption`. |
| Published article URLs included | Pass | Includes 6 article URLs, two locales each for 3 local published articles. |
| No localhost/request-host canonical URLs | Pass | Parsed sitemap check: `HasLocalhost=False`; all sampled URLs use `https://ai-landscape-brief.example`. |
| Internal/archive/root redirect URLs omitted | Pass | Parsed sitemap check: `HasInternal=False`, `HasArchive=False`, `HasRoot=False`. |
| Existing public route smoke | Pass | `/` returned 307 to `/en-gb`; `/en-gb`, `/uk-ua`, `/en-gb/categories/news`, and a representative article URL returned 200. |
| Negative content leakage in live data | Limited | Local sitemap had no visible internal/archive/root leakage. Unpublished/null-published/inactive/invalid/ambiguous article exclusions are verified by focused worker/web tests, not by live DB negative fixture smoke. |

Observed sitemap counts:

| Metric | Value |
| --- | --- |
| Total URLs | 24 |
| Locale homepage URLs | 2 |
| Category URLs | 16 |
| Article URLs | 6 |

Observed article URLs:

- `https://ai-landscape-brief.example/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`
- `https://ai-landscape-brief.example/uk-ua/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`
- `https://ai-landscape-brief.example/en-gb/articles/hugging-face-ai-cybersecurity-openness`
- `https://ai-landscape-brief.example/uk-ua/articles/hugging-face-ai-cybersecurity-openness`
- `https://ai-landscape-brief.example/en-gb/articles/openai-trusted-access-cyber-gpt-5-4-cyber`
- `https://ai-landscape-brief.example/uk-ua/articles/openai-trusted-access-cyber-gpt-5-4-cyber`

## Findings

No blocking findings.

## Non-blocking follow-ups for T005

- `docs/PROJECT_STATE.md`, `docs/frontend/routes.md`, and `docs/qa/test-strategy.md` still describe `/robots.txt` and `/sitemap.xml` as deferred. This is expected pre-T005 consolidation work and does not block T005 from proceeding.
- Production release/indexability remains blocked until `siteConfig.identity.domains.productionOriginPlaceholder` is replaced with the real production origin in committed config.
- Root `pnpm build` remains unverified because of the known `root-web-build-hangs` caveat.

## QA conclusion

M5.4 T004 QA passes. T005 may proceed to consolidate docs and close the milestone, with the residual release-hardening risks above carried forward.
