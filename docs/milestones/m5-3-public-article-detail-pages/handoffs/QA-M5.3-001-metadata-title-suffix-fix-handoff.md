# Handoff - QA-M5.3-001 metadata title suffix fix

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-3-public-article-detail-pages` |
| Finding | `QA-M5.3-001` |
| Type | bugfix |
| Actor | `frontend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Goal, scope, dependencies, and acceptance

Goal: fix duplicated article metadata site-name suffixes when stored `article.metaTitle` already includes `| AI Landscape Brief`.

Scope: bounded frontend helper/test fix. Edited only:

- `apps/web/src/lib/public-article-routing.ts`
- `apps/web/test/public-article-detail-page.test.ts`
- `docs/milestones/m5-3-public-article-detail-pages/handoffs/QA-M5.3-001-metadata-title-suffix-fix-handoff.md`

Dependencies: M5.3 article detail metadata contract, `T005` QA finding `QA-M5.3-001`, existing `siteConfig.identity.name`, and the focused article detail page test.

Acceptance: `getArticleMetadataTitle` returns a stored complete `metaTitle` unchanged when it already ends with the configured site suffix, using straightforward trim/case-insensitive suffix detection; suffix-free `metaTitle` fragments and fallback article titles still receive the site suffix; `getPublicArticleDetailMetadata` uses the fixed title for `openGraph.title`.

## Implementation notes

- Added a small site suffix helper in `public-article-routing.ts`.
- `metaTitle` values that already end with `| ${siteConfig.identity.name}` are no longer suffixed again.
- The existing fallback behavior remains unchanged for `metaTitle` fragments and article title fallback.
- Added focused regression coverage for complete stored meta titles, simple case/whitespace suffix detection, and Open Graph title output.

## Validation

Focused test:

```powershell
cd apps\web
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts
```

Result: first sandboxed run failed with Windows/esbuild `spawn EPERM`; rerun with approved escalation passed all 7 checks.

Package checks:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Result: all passed.

## Residual risks

- `pnpm --filter @topicpress/web test` still does not enumerate `test/public-article-detail-page.test.ts`; the focused test was run directly.
- No browser smoke was run for this bounded helper/test-only fix.
