# QA Report - m5-3-public-article-detail-pages Public Article Detail Pages

## Report metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| QA agent | `qa_reviewer` |
| Date | `2026-05-27` |
| Final result | Pass after follow-up fix |

## Scope restatement

Goal: verify M5.3 T005 for the locale-aware public article detail route at `/[locale]/articles/[slug]`, including the worker public detail read service, web route/page/metadata/not-found behavior, safe plain-text body rendering, and homepage/category card links.

Scope: docs-only QA. Reviewed implementation artifacts and validation evidence for T002, T003, and T004. Write scope was limited to this QA report and `docs/milestones/m5-3-public-article-detail-pages/handoffs/T005-qa-article-detail-route-handoff.md`; no production code, tests, package files, Supabase files, or database schema files were edited.

Dependencies: T005 depends on T002 public article detail read service, T003 article detail route/page, and T004 public article card links. Required implementation handoffs were present, including the T004 scope amendment for the stale category route test.

Acceptance criteria: QA report must record reviewed artifacts, command results, route smoke results, and findings; published-only/not-found protections, article rendering, and card links must be verified; skipped or limited checks must be tied to explicit caveats; no high-severity open finding may remain before T006.

## Files and artifacts reviewed

| Artifact | Reviewed? | Notes |
| --- | --- | --- |
| `AGENTS.md` | Yes | Confirmed docs-first workflow and T005 docs-only boundary. |
| `docs/PROJECT_STATE.md` | Yes | Current state still identifies article detail pages as next slice; final docs consolidation remains T006 scope. |
| Milestone plan and task graph | Yes | Verified route/data/metadata contracts, deferred scope, validation gates, and T005 write scope. |
| `T005-qa-article-detail-route.yaml` | Yes | Confirmed required commands and manual smoke scope. |
| T002/T003/T004 handoffs plus T004 scope amendment | Yes | All required handoffs exist and contain implementation/validation evidence. |
| Worker public article detail service/tests | Yes | Reviewed `apps/worker/src/public-article-detail/*`, facade exports, and `apps/worker/test/public-article-detail.test.mjs`. |
| Web article route/wrapper/components/tests | Yes | Reviewed route files, server-only wrapper, routing/metadata helper, article detail renderer, and focused tests. |
| Homepage/category card link changes | Yes | Reviewed `article-card.tsx`, `article-list.tsx`, and updated web tests. |
| Deferred-scope artifacts | Yes | Confirmed no `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, or archive route directory. `rg` found no article detail source joins, structured data, comments, newsletter, ads, or related-article/right-rail modules. |

## Validation commands

| Command | Result | Evidence / Notes |
| --- | --- | --- |
| `pnpm --filter @topicpress/web test` | Pass | Existing web suite passed 24 `ok` checks, including updated article route helper/link assertions. The package script still does not run the new article detail focused tests. |
| `pnpm --filter @topicpress/web lint` | Pass | ESLint completed without errors. |
| `pnpm --filter @topicpress/web typecheck` | Pass | `tsc --noEmit` completed without errors. |
| `pnpm --filter @topicpress/worker test` | Pass | Worker suite passed; note this package script still does not include `public-article-detail.test.mjs`. |
| `pnpm --filter @topicpress/worker build` | Pass | `tsc -p tsconfig.json` completed without errors. |
| `node apps\worker\test\public-article-detail.test.mjs` | Pass | Standalone detail test passed 13 assertions across 6 top-level tests, covering published-only filters, slug precedence, fallback, inactive category, missing fields, and alternate slugs. |
| `..\..\node_modules\.bin\tsx.cmd test\public-article-detail-components.test.tsx` from `apps/web` | Pass | Additional focused QA evidence because the package script omits this file. Confirmed escaped plain-text body rendering and absence of deferred modules. |
| `..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts` from `apps/web` | Pass | Additional focused QA evidence because the package script omits this file. Confirmed route helpers, metadata shape, alternates, and no archive/robots/sitemap files. |

No command required a sandbox escalation during T005. Root `pnpm build` was not run because `root-web-build-hangs` remains the documented release-hardening caveat and is not a T005 gate.

## Route smoke

Base URL: `http://localhost:3002`

Local data assumption: local Supabase contained the published article `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`.

| Route / Check | Result | Evidence / Notes |
| --- | --- | --- |
| `/` redirects to `/en-gb` | Pass | HTTP `307`, `Location: /en-gb`. |
| `/en-gb` renders homepage and article links | Pass | HTTP `200`; response contained Benchmaxxer content and `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`. Browser DOM listed three `/en-gb/articles/...` links. |
| `/uk-ua` renders localized/fallback article links | Pass | HTTP `200`; Browser DOM showed Ukrainian heading and `/uk-ua/articles/...` links, including the Benchmaxxer fallback slug. |
| `/en-gb/categories/news` renders category article links | Pass | HTTP `200`; Browser DOM showed `News` heading and the Benchmaxxer article link. |
| `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard` renders article | Pass with finding | HTTP `200`; Browser DOM showed visible article H1/body markers, category link `/en-gb/categories/news`, no visible article not-found heading, `og:type=article`, and no `robots` noindex. Metadata title finding recorded below. |
| `/uk-ua/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard` renders fallback article | Pass with finding | Browser DOM showed visible fallback article title/body, category link `/uk-ua/categories/news`, `og:type=article`, and no `robots` noindex. Metadata title finding also applies. |
| Homepage article card navigation | Pass | Browser DOM confirmed visible title link. A coordinate click on the visible title line navigated to the article detail route and rendered the article H1. |
| `/fr-fr/articles/example` uses not-found behavior | Pass | HTTP `404`; Browser DOM showed global 404 title with `noindex`. This unsupported locale path is outside the configured middleware matcher, so route-local article not-found UI is not expected in dev. |
| `/en-gb/articles/Bad_Slug` uses not-found behavior | Pass | HTTP `200` in Next dev with `noindex`; Browser DOM showed visible `Article page not found` route-local UI after load. |
| `/en-gb/articles/unknown-slug` uses not-found behavior | Pass | HTTP `200` in Next dev with `noindex`; Browser DOM showed visible `Article page not found` route-local UI after load. |
| `/internal/editorial/review` remains reachable | Pass | HTTP `200`; response contained editorial review markers. |

Next dev streamed hidden not-found boundary payload text in some successful article HTTP responses; browser DOM visibility checks confirmed the published article page did not visibly render the not-found heading.

## Contract checks

- Published-only and public eligibility: verified by worker service query filters, service-level guards, and standalone tests for unpublished status, null `published_at`, inactive category row, unknown slug, invalid slug, unsupported locale, and missing required fields.
- Locale fallback: verified by worker tests for requested-locale precedence and default-locale fallback; route smoke confirmed `/uk-ua` list/detail fallback on local data.
- Server/client boundary: `apps/web/src/lib/public-article-detail.ts` is `server-only`, creates a request-scoped Postgres/Drizzle client, calls the worker facade, and closes in `finally`. Public components receive serialized DTOs and do not import DB clients.
- Body rendering: article body is treated as text, split on blank-line paragraph boundaries, and rendered as React text with `whitespace-pre-line`; focused test confirms `<script>` is escaped and `dangerouslySetInnerHTML` is absent.
- Public links: homepage/category card surfaces now emit locale-aware `/articles/<slug>` hrefs through `getPublicArticleRouteHref`.
- Deferred scope: no source attribution, right rail, related articles, comments, newsletter, ads, sitemap, robots, archive, structured data, schema changes, or production canonical rollout was introduced.

## Findings

### QA-M5.3-001 - Medium - Article metadata can duplicate the site-name suffix

Status: Fixed after QA by `docs/milestones/m5-3-public-article-detail-pages/handoffs/QA-M5.3-001-metadata-title-suffix-fix-handoff.md`.

Evidence:

- `apps/web/src/lib/public-article-routing.ts:93` returns `` `${article.metaTitle ?? article.title} | ${siteConfig.identity.name}` `` for every article.
- `apps/worker/test/public-article-detail.test.mjs` fixtures prove stored `metaTitle` values may already include the site suffix, for example `Public article | AI Landscape Brief`.
- Browser smoke for the local published article produced `<title>` and `og:title` as `Adding Benchmaxxer Repellant to the Open ASR Leaderboard | AI Landscape Brief | AI Landscape Brief`.

Contract assessment: the metadata contract says the page title should use localized `metaTitle`, else article `title`, optionally suffixed with the site name through existing metadata conventions. Always suffixing an already-suffixed `metaTitle` produces duplicated SEO text and does not preserve the supplied localized meta title cleanly.

Resolution:

- `apps/web/src/lib/public-article-routing.ts` now keeps an existing complete `metaTitle` unchanged when it already ends with `| AI Landscape Brief`.
- Suffix-free `metaTitle` fragments and fallback article titles still receive the site suffix.
- `apps/web/test/public-article-detail-page.test.ts` now includes regression coverage for complete stored meta titles and Open Graph title behavior.
- Follow-up validation passed: focused article detail page test, `pnpm --filter @topicpress/web test`, `pnpm --filter @topicpress/web lint`, and `pnpm --filter @topicpress/web typecheck`.

## Final result

Pass after follow-up fix.

T006 may proceed to consolidate docs and closeout with QA-M5.3-001 recorded as fixed. A final integration pass also wired the focused article detail tests into the default web and worker package `test` scripts.
