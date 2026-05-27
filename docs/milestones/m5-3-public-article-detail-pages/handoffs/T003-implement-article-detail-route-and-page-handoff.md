# Handoff - T003 Implement article detail route and page

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T003` |
| Type | frontend |
| Owner | `implementation` |
| Actor | `frontend_developer` |
| Status | Implemented with documented package-test caveat |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: implement the locale-aware public article detail route at `/[locale]/articles/[slug]` using the T002 read service and the finalized T001 contract.

Scope stayed bounded to the T003 web route, web read wrapper, route helper, article detail component, focused web tests, and this handoff. T004-owned article card/list link rollout was not changed. No worker, schema, Supabase, sitemap, robots, archive, structured data, comments, related articles, source attribution, or right-rail modules were edited.

Dependencies consumed:

- T001 finalized lookup, fallback, body rendering, metadata alternate, and attribution contracts.
- T002 exported `getPublicArticleDetail` and the narrow `PublicArticleDetail` DTO from `@topicpress/worker`.

Acceptance evidence:

- `/[locale]/articles/[slug]` route files now exist under `apps/web/src/app/(public)/[locale]/articles/[slug]/`.
- The page resolves locale/slug params before data reads and calls `notFound()` for unsupported locale, invalid slug, missing article, backend `not_found`, or invalid returned category slug.
- The web read wrapper is `server-only`, opens a request-scoped Postgres/Drizzle client, calls the worker facade, and closes the client in `finally`.
- Metadata uses article meta title/description fallbacks, Open Graph `article`, publication time, optional hero image, optional keywords, and language alternates from backend `alternateSlugs` only.
- Body rendering treats stored body as text, splits on blank-line paragraph boundaries, preserves ordinary line breaks inside paragraphs, and lets React escape text. No `dangerouslySetInnerHTML` or markdown/HTML conversion was added.
- The rendered detail page has no source attribution, comments, related articles, newsletter, ad, or right-rail placeholders.

## Files changed

| File | Change summary |
| --- | --- |
| `apps/web/src/app/(public)/[locale]/articles/[slug]/page.tsx` | Added dynamic article detail route, cached request read, metadata generation, not-found handling, category link resolution, and server component composition. |
| `apps/web/src/app/(public)/[locale]/articles/[slug]/not-found.tsx` | Added route-local not-found UI. |
| `apps/web/src/app/(public)/[locale]/articles/[slug]/loading.tsx` | Added route-local loading skeleton. |
| `apps/web/src/app/(public)/[locale]/articles/[slug]/error.tsx` | Added route-local retry error boundary. |
| `apps/web/src/lib/public-article-detail.ts` | Added server-only request-scoped wrapper around the worker public article detail read service. |
| `apps/web/src/lib/public-article-routing.ts` | Added article slug route helpers plus pure metadata/alternate helper functions for testing without importing `server-only`. |
| `apps/web/src/components/public/article-detail-content.tsx` | Added article detail renderer with title, subtitle, excerpt, category link, date, optional hero image, and plain-text paragraphs. |
| `apps/web/test/public-article-detail-components.test.tsx` | Added focused component tests for field rendering, escaped paragraph body behavior, and absence of deferred modules. |
| `apps/web/test/public-article-detail-page.test.ts` | Added focused route helper and metadata tests, including backend-provided alternate slugs. |
| `docs/milestones/m5-3-public-article-detail-pages/handoffs/T003-implement-article-detail-route-and-page-handoff.md` | Added this handoff. |

## Validation

Passed:

```powershell
cd apps/web
..\..\node_modules\.bin\tsx.cmd test/public-article-detail-components.test.tsx
..\..\node_modules\.bin\tsx.cmd test/public-article-detail-page.test.ts
```

Focused test results:

- `public-article-detail-components.test.tsx`: 3 tests passed.
- `public-article-detail-page.test.ts`: 6 tests passed.

Passed:

```powershell
pnpm --filter @topicpress/web run lint
pnpm --filter @topicpress/web run typecheck
```

Failed with expected T004-adjacent existing assertion:

```powershell
pnpm --filter @topicpress/web test
```

Failure:

- `apps/web/test/public-category-route.test.ts:76`
- Assertion expected `existsSync("src/app/(public)/[locale]/articles")` to be `false`.
- Actual value is now `true` because T003 implements the article route directory.
- That existing test file is outside T003 write scope. T004/QA should update the deferred-route absence assertion when rolling public link behavior forward.

Initial direct focused test attempts through `pnpm --filter @topicpress/web exec tsx ...` failed because `tsx` was not resolved in the filtered package shell. Running the root `tsx.cmd` from `apps/web` worked after sandbox escalation. A sandboxed `tsx.cmd` attempt also hit the known Windows `tsx`/`esbuild` `spawn EPERM` behavior; rerunning outside the sandbox resolved it.

## Route smoke

Local dev server:

- Base URL used: `http://localhost:3002`
- Server was already reachable on port `3002` during final smoke.

Published article HTTP smoke:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3002/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard -TimeoutSec 30
```

Observed:

- HTTP status: `200`
- Response included the provided slug.
- Response included `Benchmaxxer` article title/body payload markers.

Limitation:

- The in-app browser connection was unavailable after the interrupted turn (`No active Codex browser pane available`), so final smoke used HTTP instead of browser DOM verification.
- The raw streaming App Router HTML includes loading/not-found boundary module payload text in addition to article payload, so HTTP body string checks are weaker than browser DOM checks. QA should perform browser DOM smoke with the same published route.

Earlier invalid-slug browser smoke before the browser connection dropped:

- URL: `http://localhost:3002/en-gb/articles/Bad_Slug`
- Rendered route-local `Article page not found` UI.
- Browser console error log count: `0`.

## Residual risks and follow-up notes

- `pnpm --filter @topicpress/web test` remains red until the existing category route scaffold test stops asserting that article routes are absent.
- New focused article detail tests are not wired into `apps/web/package.json`; that file is outside T003 write scope.
- Browser DOM smoke for the published article still needs QA confirmation because the in-app browser surface was unavailable at final verification time.
- Public card/list links remain unchanged by design; T004 owns link rollout.
- Root build remains subject to the known `root-web-build-hangs` caveat and was not run.

## Process notes

What helped:

- T001's explicit body-rendering and alternate-slug contracts kept the page implementation narrow.
- T002's DTO already included the needed route and metadata fields, so no frontend guessing or backend scope expansion was needed.
- Existing homepage/category route patterns made the server-only wrapper, cache usage, loading/error/not-found files, and metadata shape straightforward to mirror.

What struggled:

- The existing web test suite still contains deferred-article-route assertions from the previous milestone state, but T003 cannot edit that file under its write scope.
- Direct `tsx` test execution needed the root binary from the `apps/web` working directory to resolve aliases correctly.
- Browser smoke was interrupted by the lost in-app browser pane, so the final published-route verification had to use HTTP evidence.
