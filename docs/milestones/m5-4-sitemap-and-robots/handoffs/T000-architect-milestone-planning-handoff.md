# Handoff - T000 Architect milestone planning

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T000` |
| Type | planning |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: create a docs-first milestone package for the next M5 slice, sitemap and robots, using milestone id `m5-4-sitemap-and-robots`.

Scope: documentation planning only. Create the milestone plan, task graph, task YAML files, QA report stub, closeout stub, and this planning handoff. Update `docs/PROJECT_STATE.md` only to point at the ready milestone package. Do not edit app/package code.

Dependencies: `AGENTS.md`, `docs/PROJECT_STATE.md`, route/QA/architecture/product docs, M5.3 closeout and QA report, and milestone templates. The implementation sequence depends on T001 resolving canonical-origin and robots-environment behavior before backend/frontend work starts.

Acceptance criteria: new milestone docs exist under `docs/milestones/m5-4-sitemap-and-robots/`; tasks have disjoint write scopes, dependency ordering, validation commands, acceptance criteria, failure handling, and handoff requirements; planned scope includes `/robots.txt`, `/sitemap.xml`, locale homepages, active categories, durable published article detail URLs, published-only/non-null `published_at` filtering, M5.3 fallback rules, and QA route smoke; out-of-scope items remain excluded; project state is accurate with M5.3 complete and the next planned package ready.

## Summary

Created the docs-first milestone package for M5.4 Sitemap And Robots. The package keeps implementation narrow: a contract task, a backend public sitemap inventory service task, a frontend sitemap/robots endpoint task, QA, and docs closeout.

## Scope completed

- [x] Created `plan.md`, `task-graph.yaml`, five task YAML files, `qa-report.md`, `closeout.md`, and this handoff.
- [x] Scoped `/sitemap.xml` to locale homepages, active categories, and public article detail URLs.
- [x] Scoped `/robots.txt` to configured robots directives plus a canonical sitemap pointer.
- [x] Preserved M5.3 public article eligibility: published status, non-null `published_at`, active category, supported locale, valid slug, required fields after fallback, and backend-provided alternate slug semantics.
- [x] Added explicit stop-and-ask language for unclear sitemap URL source-of-truth or canonical host behavior.
- [x] Kept archive, structured data, pagination, source attribution, related content, ads, right rail, schema/migration work, and `root-web-build-hangs` release hardening out of scope.
- [x] Captured M5.3 process lessons so M5.4 starts with focused tests wired into package scripts and route-output QA.

## Scope not completed

- No production code was implemented.
- No application validation was run because this was planning-only.
- Canonical production-origin and robots environment mapping remain open for T001 to resolve before implementation.

## Files changed

| File | Change summary |
| --- | --- |
| `docs/PROJECT_STATE.md` | Points at the ready M5.4 sitemap/robots milestone package as the next planned slice. |
| `docs/milestones/m5-4-sitemap-and-robots/plan.md` | Defines goal, non-goals, current/desired state, architecture impact, contracts, tasks, dependencies, risks, validation, QA gates, acceptance criteria, open questions, and process notes. |
| `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml` | Defines task dependencies, statuses, write scopes, validation commands, sequencing, and handoff requirements. |
| `docs/milestones/m5-4-sitemap-and-robots/tasks/*.yaml` | Defines five atomic tasks for contract, backend inventory, frontend endpoints, QA, and docs consolidation. |
| `docs/milestones/m5-4-sitemap-and-robots/qa-report.md` | Adds the QA report stub to be completed after implementation. |
| `docs/milestones/m5-4-sitemap-and-robots/closeout.md` | Adds the closeout stub to be completed after QA. |

## Validation run

| Command | Result | Notes |
| --- | --- | --- |
| `rg --files docs/milestones/m5-4-sitemap-and-robots` | Passed | Confirmed expected milestone files exist. |
| `rg` placeholder and stale-path scans | Passed | No template placeholders, encoding artifacts, or stale M5.3 template path references found. |
| `git diff --check -- docs/PROJECT_STATE.md docs/milestones/m5-4-sitemap-and-robots` | Passed | No whitespace errors. Git warned that `docs/PROJECT_STATE.md` will be normalized to CRLF when Git touches it. |
| `node -e "<yaml parse check>"` | Skipped | Local `yaml` package was unavailable, so YAML parsing was not run. |

## Key open questions

| Question | Owner | Needed by |
| --- | --- | --- |
| Should local QA accept `siteConfig.identity.domains.productionOriginPlaceholder` as the canonical origin, or should sitemap generation block until the final production origin is configured? | architect/product | T001/T003 |
| Which exact runtime signal should select `local`, `staging`, or `production` robots directives? | architect/platform | T001/T003 |
| Should article sitemap inventory reuse existing M5.3 article-detail helpers directly, or extract shared worker-only slug eligibility helpers to avoid drift? | backend/architect | T002 |

## Next implementation recommendation

Dispatch T001 first. Do not start backend or frontend implementation until T001 resolves canonical-origin behavior and robots environment mapping. If those cannot be resolved from existing config/runtime contracts, mark T001 blocked and ask product/platform before writing app code.
