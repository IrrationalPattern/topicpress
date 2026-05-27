# Handoff - T001 Finalize sitemap and robots contract

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T001` |
| Type | contract |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: resolve the M5.4 sitemap and robots contract before backend or frontend implementation starts.

Scope: docs-only contract work under `docs/milestones/m5-4-sitemap-and-robots/`. This task may update the milestone plan, task graph, task YAML files, and this handoff. It must not edit production code, package code, database schema, migrations, Supabase files, or app implementation.

Dependencies: `AGENTS.md`, `docs/PROJECT_STATE.md`, the M5.4 milestone plan, task graph, T001 task YAML, product/architecture/frontend/QA docs, M5.3 closeout and QA evidence, and the relevant config/routing/article-detail source files used for contract verification.

Acceptance criteria: canonical origin behavior is explicit, including placeholder local-QA behavior; robots environment mapping is explicit or the milestone is blocked; sitemap route families and exclusions are explicit; article URL eligibility, fallback, invalid-slug, and ambiguity behavior are explicit; open questions are resolved or converted into blockers before T002/T003 start; no production code/package/database files are edited; this handoff records task goal, scope, dependencies, acceptance criteria, decisions, docs changed, validation/manual review, and process notes.

## Decisions

| Topic | Decision |
| --- | --- |
| Canonical origin source of truth | Use `siteConfig.identity.domains.productionOriginPlaceholder` for M5.4 canonical absolute URLs. Do not use `localOrigin`, `NEXT_PUBLIC_SITE_URL`, request hosts, or localhost while `requireProductionOrigin` is true. |
| Placeholder local QA | Local, test, and staging QA may emit `https://ai-landscape-brief.example` because those environments must use `noindex,nofollow`. Production release/indexability remains blocked until the placeholder is replaced with the real production origin in committed config. |
| Robots environment mapping | Use `VERCEL_ENV` first: `production -> production`, `preview -> staging`, `development -> local`. If absent, `NODE_ENV=development`, `NODE_ENV=test`, or unset maps to local; absent `VERCEL_ENV` with `NODE_ENV=production` fails closed to staging; unknown `VERCEL_ENV` fails closed to staging. |
| Sitemap route families | Include supported locale homepages, active category URLs for active configured categories with active synced DB rows, and public article detail URLs for supported locales. Exclude `/`, internal routes, archive, structured data, unimplemented routes, and invalid/ineligible content. |
| Article URL eligibility | T002 should extract or reuse worker-only M5.3 article-detail eligibility helpers. Include an article URL only when the candidate slug is valid and resolves back to the same public article under the M5.3 detail contract; omit invalid, incomplete, unpublished, null-`published_at`, inactive-category, ambiguous, or different-article candidates. |
| `next-sitemap` | Rejected/deferred for M5.4. Native Next.js App Router metadata routes are the planned implementation because the hard risks are project-owned policy/data decisions rather than XML serialization. Revisit only for sitemap indexes, split sitemaps, or build-time artifacts. |

## Docs changed

| File | Change summary |
| --- | --- |
| `docs/milestones/m5-4-sitemap-and-robots/plan.md` | Added T001 contract decisions, resolved open questions, updated status to ready for T002, marked T001 implemented/T002 ready, clarified canonical origin, robots mapping, article eligibility, native Next route decision, risks, and next dispatch note. |
| `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml` | Marked T001 implemented and T002 ready; expanded T002 backend write scope to allow bounded extraction/reuse work in `apps/worker/src/public-article-detail/` and its focused test. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/T001-finalize-sitemap-robots-contract.yaml` | Marked implemented and recorded the resolved contract directly in the task. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/T002-public-sitemap-url-inventory-service.yaml` | Updated scope/write scope/acceptance to require extracting or reusing M5.3 article-detail eligibility helpers and preserving detail-route behavior. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/T003-implement-sitemap-and-robots-endpoints.yaml` | Clarified native Next route implementation, canonical placeholder origin behavior, robots environment tests, and no `next-sitemap` dependency. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/T004-qa-sitemap-and-robots-routes.yaml` | Added QA checks for robots environment mapping, placeholder-origin behavior, and absence of `next-sitemap` dependency/postbuild scope. |
| `docs/milestones/m5-4-sitemap-and-robots/handoffs/T001-finalize-sitemap-robots-contract-handoff.md` | Added this handoff. |

## Validation and manual review

Manual review completed:

- Confirmed config has `siteConfig.identity.domains.productionOriginPlaceholder`, `localOrigin`, `seo.canonical.requireProductionOrigin`, and robots directives for `local`, `staging`, and `production`.
- Confirmed no existing project-wide robots deployment env signal beyond generic `NODE_ENV`; Vercel deployment is documented in product vision, so the contract uses `VERCEL_ENV` when present and fails closed otherwise.
- Confirmed M5.3 article detail service owns slug precedence, fallback, published-only filtering, active-category filtering, required field checks, and `alternateSlugs`.
- Confirmed current deferred routes remain `/[locale]/archive`, `/robots.txt`, `/sitemap.xml`, and structured article data.
- Confirmed no production code, package code, database schema, migration, Supabase, or app implementation files were edited.

Validation commands:

```powershell
git diff --check -- docs/milestones/m5-4-sitemap-and-robots
rg --line-number "[ \t]+$" docs/milestones/m5-4-sitemap-and-robots
```

Result: passed. `git diff --check` reported no whitespace errors for tracked diffs, and `rg` found no trailing whitespace in the M5.4 docs package.

## Process notes

- T002 is unblocked and should run next.
- T003 remains blocked until T002 exports the public sitemap inventory service.
- Production launch remains blocked on replacing the placeholder origin with the real launch domain; this is a release/config blocker, not a blocker for focused local M5.4 implementation.
- No ADR is required because the decisions stay inside existing config-owned canonical/robots settings and existing web/worker public read boundaries.
