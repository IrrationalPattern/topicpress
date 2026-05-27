# Handoff - T004 QA sitemap and robots routes

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T004` |
| Type | qa |
| Owner | `qa` |
| Actor | `qa_reviewer` |
| Status | QA passed |
| Date | `2026-05-27` |

## Required restatement

Goal: run docs-only QA for the M5.4 sitemap and robots route implementation.

Scope: review required project/milestone/task/handoff context; inspect `apps/worker/src/public-sitemap/*`, related worker/web tests, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, `apps/web/src/lib/public-sitemap.ts`, `apps/web/src/lib/public-seo-origin.ts`, and package manifests; run the required focused validation commands; smoke `/robots.txt` and `/sitemap.xml`; record findings without editing app/package/test/schema/Supabase files; write only this handoff and `docs/milestones/m5-4-sitemap-and-robots/qa-report.md`.

Dependencies: T001 finalized canonical-origin, robots-environment, native Next metadata route, and article eligibility decisions; T002 implemented the worker public sitemap inventory service and reused M5.3 detail-route eligibility helpers; T003 implemented the native Next sitemap and robots routes and web canonical-origin helpers; the local web dev server was available at `http://localhost:3002`.

Acceptance criteria: QA report records reviewed artifacts, command results, route smoke results, and findings; published-only/non-null `published_at`/active-category/fallback/ambiguity protections are verified by tests or smoke evidence; `/robots.txt` and `/sitemap.xml` are verified locally; robots environment mapping is verified; canonical sitemap URLs use the configured placeholder origin and not localhost/request hosts; skipped or limited checks are tied to caveats; no high-severity finding remains before T005; this handoff records goal, scope, dependencies, acceptance criteria, evidence, and next steps.

## Evidence summary

Reviewed required context:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-4-sitemap-and-robots/plan.md`
- `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml`
- T002, T003, and T004 task YAML files
- T001, T002, T003, and T003 scope-amendment handoffs
- Relevant frontend route and QA strategy docs

Reviewed implementation and tests:

- `apps/worker/src/public-sitemap/*`
- `apps/worker/test/public-sitemap.test.mjs`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/lib/public-sitemap.ts`
- `apps/web/src/lib/public-seo-origin.ts`
- `apps/web/test/public-sitemap-route.test.ts`
- `apps/web/test/public-robots-route.test.ts`
- package manifests and lockfile for `next-sitemap`/`postbuild`

Validation commands:

| Command | Result |
| --- | --- |
| `pnpm --filter @topicpress/web test` | Pass |
| `pnpm --filter @topicpress/web lint` | Pass |
| `pnpm --filter @topicpress/web typecheck` | Pass |
| `pnpm --filter @topicpress/worker test` | Pass |
| `pnpm --filter @topicpress/worker build` | Pass |
| `pnpm --filter @topicpress/config test` | Pass |

Additional manifest check:

```powershell
Select-String -Path <package manifests and pnpm-lock.yaml> -Pattern 'next-sitemap|postbuild'
```

Result: `NO_MATCHES`.

## Route smoke evidence

Base URL: `http://localhost:3002`.

Browser note: Browser plugin was initialized, but local navigation to raw metadata routes was blocked with `net::ERR_BLOCKED_BY_CLIENT`; direct HTTP checks were used as the documented fallback.

`/robots.txt`:

- HTTP 200
- `Content-Type: text/plain`
- Body:

```text
User-Agent: *
Disallow: /

Sitemap: https://ai-landscape-brief.example/sitemap.xml
```

Assessment: local/dev output is non-indexing through the native Next robots representation. The lack of a literal `X-Robots-Tag` line is acceptable for this milestone because T003 documented that installed Next 15 metadata types do not support `rules.other`, and the user-requested expected output is `Disallow: /`.

`/sitemap.xml`:

- HTTP 200
- `Content-Type: application/xml`
- Parsed XML URL count: 24
- Locale homepages: 2
- Category URLs: 16
- Article URLs: 6
- `HasLocalhost=False`
- `HasInternal=False`
- `HasArchive=False`
- `HasRoot=False`

Representative existing route checks:

- `/` returned 307 to `/en-gb`
- `/en-gb` returned 200
- `/uk-ua` returned 200
- `/en-gb/categories/news` returned 200
- `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard` returned 200 and contained the expected title text

## Findings

No blocking findings.

## Residual risks

- Live route smoke did not prove unpublished/null-published/inactive/invalid/ambiguous local DB negative records because the local sitemap output only exposed qualifying public URLs. Those protections are covered by focused worker and web tests.
- Root `pnpm build` was not run and remains a residual release-hardening risk under `root-web-build-hangs`.
- Production release/indexability remains blocked until `https://ai-landscape-brief.example` is replaced by the real production origin in committed config.
- T005 and the parent integration cleanup updated canonical docs that previously described `/robots.txt` and `/sitemap.xml` as deferred.

## Next step

T005 proceeded and completed closeout. Parent integration cleanup completed the remaining architecture-doc consistency update.
