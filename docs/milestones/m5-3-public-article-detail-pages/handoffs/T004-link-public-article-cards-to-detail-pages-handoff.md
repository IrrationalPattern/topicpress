# Handoff - T004 Link public article cards to detail pages

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T004` |
| Type | frontend |
| Owner | `implementation` |
| Actor | `frontend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: link existing public homepage and category listing article cards to the locale-aware article detail route at `/[locale]/articles/[slug]`.

Scope stayed bounded to T004-owned public list/card components, the public article routing helper, specified stale web tests, and this handoff. No worker, database, Supabase, article detail route, sitemap, robots, archive, related-content, attribution, right-rail, or unrelated navigation files were edited.

Dependencies consumed:

- T003 implemented `/[locale]/articles/[slug]` and introduced `apps/web/src/lib/public-article-routing.ts`.
- Public list article DTOs already expose the resolved public route slug through `article.slug`.
- The architect scope amendment explicitly added `apps/web/test/public-category-route.test.ts` to T004 write scope.

Acceptance evidence:

- Homepage article cards now render article detail links through a shared route helper.
- Category listing article cards now render article detail links through the same helper.
- Existing category badge links remain unchanged and still use the active configured category helper.
- Stale tests no longer assert that article links/routes are absent.
- No new sitemap, robots, archive, related-content, attribution, right-rail, or unrelated navigation surfaces were introduced.

## Files changed

| File | Change summary |
| --- | --- |
| `apps/web/src/lib/public-article-routing.ts` | Added `getPublicArticleRouteHref(locale, article)` to centralize locale resolution and slug validation for list/card article links. |
| `apps/web/src/components/public/article-list.tsx` | Computes each article href with the shared route helper and passes it to `ArticleCard`. |
| `apps/web/src/components/public/article-card.tsx` | Renders the hero image and title as article detail links when a valid href is available, while preserving category badge links. |
| `apps/web/test/public-homepage-components.test.tsx` | Updated component assertions to require article detail hrefs. |
| `apps/web/test/public-homepage-route.test.tsx` | Updated homepage composition assertions to require both category and article hrefs. |
| `apps/web/test/public-category-components.test.tsx` | Updated category listing assertions to require article detail hrefs while preserving category hrefs. |
| `apps/web/test/public-category-route.test.ts` | Replaced stale article-route absence assertion with article route/helper existence and validation assertions. |

## Validation

Initial sandboxed test attempt failed with the known Windows `tsx`/`esbuild` child-process limitation:

```powershell
pnpm --filter @topicpress/web test
```

Observed failure:

- Locale-routing tests passed.
- The first `tsx` test failed with `Error [TransformError]: spawn EPERM`.

Reran outside the sandbox:

```powershell
pnpm --filter @topicpress/web test
```

Result: passed. The suite reported all web route/component/category metadata tests as `ok`, including the updated article link and article route helper assertions.

Passed:

```powershell
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

## Smoke check

The in-app Browser tools were not exposed by tool discovery in this session, so final route smoke used HTTP against the already-running dev server.

Base URL: `http://localhost:3002`

Command summary:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3002/en-gb
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3002/en-gb/categories/news
```

Observed:

- `/en-gb` returned HTTP `200`.
- Homepage response contained `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`.
- `/en-gb/categories/news` returned HTTP `200`.
- Category response contained `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard`.
- Category response still contained `/en-gb/categories/news`.

## Residual risks and follow-up notes

- Browser DOM click/navigation smoke remains for QA because the Browser plugin tools were unavailable; HTTP evidence confirms rendered hrefs but not interactive focus/click behavior in a real browser pane.
- Root `pnpm build` remains covered by the existing `root-web-build-hangs` caveat and was not part of T004 validation.
- `apps/web/package.json` still does not include T003's new article detail focused tests; T004 did not edit package scripts because that file is outside the allowed write scope.

## Process notes

What worked:

- T003's route helper file provided the right place to centralize list-surface article href generation.
- Keeping article navigation on the title and optional hero avoided nesting links around the existing category badge link.
- The architect scope amendment cleanly covered the stale `public-category-route.test.ts` assertion that blocked the web test suite.

What struggled:

- The first package test run hit the documented Windows sandbox `tsx`/`esbuild` `spawn EPERM` failure and required an approved rerun outside the sandbox.
- The Browser plugin tools were not available through tool discovery, so smoke validation had to use HTTP response checks instead of browser DOM inspection.
