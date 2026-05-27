# Handoff - T005 QA article detail route

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Task | `T005` |
| Type | qa |
| Owner | `qa` |
| Actor | `qa_reviewer` |
| Status | Implemented; follow-up finding fixed |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: verify the M5.3 public article detail route, including the worker public detail read service, Next.js article detail route/page/metadata/not-found behavior, safe plain-text body rendering, homepage/category article card links, and deferred-scope boundaries.

Scope: docs-only QA. I reviewed implementation docs, handoffs, production/test artifacts, validation commands, HTTP route smoke, and Browser plugin DOM/click smoke. I edited only:

- `docs/milestones/m5-3-public-article-detail-pages/qa-report.md`
- `docs/milestones/m5-3-public-article-detail-pages/handoffs/T005-qa-article-detail-route-handoff.md`

Dependencies: T005 consumed completed T002, T003, and T004 implementation handoffs plus the T004 scope amendment. All required handoff files were present.

Acceptance criteria: QA report records reviewed artifacts, command results, route smoke results, findings, and final result; published-only and not-found protections are verified; article content rendering and card links are verified; skipped/limited checks are documented; no high-severity open finding remains before T006.

## Validation summary

Passed required commands:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
node apps\worker\test\public-article-detail.test.mjs
```

Additional focused tests passed during T005 because the package scripts did not yet enumerate the new article detail tests:

```powershell
cd apps\web
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-components.test.tsx
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts
```

No T005 command required sandbox escalation. Root `pnpm build` was not run because `root-web-build-hangs` remains an accepted focused-QA caveat.

## Route smoke summary

Base URL: `http://localhost:3002`

Passed:

- `/` returned HTTP `307` with `Location: /en-gb`.
- `/en-gb` returned HTTP `200` and Browser DOM showed locale-aware article links.
- `/uk-ua` returned HTTP `200` and Browser DOM showed fallback `/uk-ua/articles/...` links.
- `/en-gb/categories/news` returned HTTP `200` and Browser DOM showed the Benchmaxxer article link.
- `/en-gb/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard` returned HTTP `200` and Browser DOM showed visible title/body/category link plus `og:type=article`.
- `/uk-ua/articles/adding-benchmaxxer-repellant-to-the-open-asr-leaderboard` rendered the fallback article detail page.
- `/fr-fr/articles/example` returned HTTP `404` with `noindex`.
- `/en-gb/articles/Bad_Slug` and `/en-gb/articles/unknown-slug` returned Next dev HTTP `200` with `noindex` and visible route-local `Article page not found` UI after load.
- `/internal/editorial/review` returned HTTP `200`.

Browser card navigation: a coordinate click on the visible homepage article title line navigated to the article detail route and rendered the article H1. A locator-center click landed between wrapped title lines and did not navigate; this was treated as a browser automation targeting nuance, not a product defect, because the visible text line click and href both worked.

## Findings

### QA-M5.3-001 - Medium - Article metadata can duplicate the site-name suffix

Fixed after QA by `docs/milestones/m5-3-public-article-detail-pages/handoffs/QA-M5.3-001-metadata-title-suffix-fix-handoff.md`.

`apps/web/src/lib/public-article-routing.ts` always appends `| AI Landscape Brief` to `article.metaTitle ?? article.title`. Worker fixtures and local published data show `metaTitle` can already include `| AI Landscape Brief`, and Browser smoke confirmed the real article page rendered:

```text
Adding Benchmaxxer Repellant to the Open ASR Leaderboard | AI Landscape Brief | AI Landscape Brief
```

This affects `<title>` and `og:title`. It violates the intent of the metadata contract to use localized `metaTitle` with an optional site suffix through existing conventions. Recommended fix: make article metadata title suffixing idempotent or clarify that stored `metaTitle` values must be suffix-free, then add a regression test.

Follow-up resolution: `getArticleMetadataTitle` now avoids re-appending the configured site suffix when a stored `metaTitle` already ends with it. The fix handoff records passing focused article detail page validation plus `pnpm --filter @topicpress/web test`, `lint`, and `typecheck`.

## Residual risks

- Final integration follow-up now wires `public-article-detail-components.test.tsx`, `public-article-detail-page.test.ts`, and `public-article-detail.test.mjs` into the default package `test` scripts.
- Root build remains covered by the existing `root-web-build-hangs` release-hardening caveat.
- T006 still needs to consolidate canonical docs such as `docs/frontend/routes.md`, `docs/qa/test-strategy.md`, and `docs/PROJECT_STATE.md` after the milestone result.

## Recommended next action

Proceed to T006 with QA-M5.3-001 recorded as fixed after QA. The package-script coverage gap was resolved by the final integration follow-up.
