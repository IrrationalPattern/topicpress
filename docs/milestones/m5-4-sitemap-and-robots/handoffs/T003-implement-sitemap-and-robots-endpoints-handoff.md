# Handoff - T003 Implement sitemap and robots endpoints

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-4-sitemap-and-robots` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T003` |
| Type | frontend |
| Owner | `implementation` |
| Actor | `frontend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: implement native Next.js App Router metadata endpoints for `/sitemap.xml` and `/robots.txt`.

Scope: bounded frontend work in `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, `apps/web/src/lib/public-sitemap.ts`, `apps/web/src/lib/public-seo-origin.ts`, focused web tests, web package test wiring, and this handoff. Two approved scope amendments also allowed narrow stale-test cleanup in `apps/web/test/public-article-detail-page.test.ts` and `apps/web/test/public-category-route.test.ts` only for obsolete `robots.ts`/`sitemap.ts` absence assertions.

Dependencies: T001 canonical-origin and robots-environment contract, T002 worker public sitemap inventory service, existing locale/category/article route helpers, `siteConfig.identity.domains.productionOriginPlaceholder`, `siteConfig.seo.robots`, and the existing web server-only database wrapper pattern.

Acceptance criteria: `/sitemap.xml` is implemented through native Next metadata routes; `/robots.txt` is implemented through native Next metadata routes; sitemap output includes supported locale homepages plus active category and public article paths from the inventory service; absolute URLs use `siteConfig.identity.domains.productionOriginPlaceholder` and do not use localhost, `localOrigin`, request hosts, or `NEXT_PUBLIC_SITE_URL`; robots uses the T001 Vercel/Node resolver and includes one canonical sitemap pointer; focused web tests cover URL generation, canonical origin, exclusions, environment mapping, and no localhost usage; new tests are wired into `pnpm --filter @topicpress/web test`; no new dependency, env/config contract, schema, migration, archive, structured data, pagination, source attribution, related content, ads, right rail, or release-hardening work is introduced.

## Implementation summary

- Added `apps/web/src/app/sitemap.ts` as a native Next `MetadataRoute.Sitemap` endpoint using `dynamic = "force-dynamic"`.
- Added `apps/web/src/app/robots.ts` as a native Next `MetadataRoute.Robots` endpoint.
- Added `apps/web/src/lib/public-sitemap.ts`, a server-only wrapper that opens a request-scoped Drizzle/Postgres client, calls `listPublicSitemapInventory` from `@topicpress/worker`, builds sitemap entries, and closes the connection.
- Added `apps/web/src/lib/public-seo-origin.ts` with pure helpers for:
  - canonical origin selection from `productionOriginPlaceholder`,
  - canonical URL assembly and normalization,
  - sitemap route entry generation for locale homepages, category records, and article records,
  - invalid/unsupported inventory record exclusion,
  - robots environment resolution and directive mapping.
- Added focused tests:
  - `apps/web/test/public-sitemap-route.test.ts`
  - `apps/web/test/public-robots-route.test.ts`
- Wired those tests into `apps/web/package.json`.
- Revised stale route-activation assertions in:
  - `apps/web/test/public-article-detail-page.test.ts`
  - `apps/web/test/public-category-route.test.ts`

## Behavior notes

Sitemap:

- Includes `/en-gb` and `/uk-ua` locale homepages.
- Includes category URLs from T002 inventory only when locale and slug remain valid at the web route layer.
- Includes article URLs from T002 inventory only when locale and slug remain valid at the web route layer.
- Uses `updatedAt` as article `lastModified` when present, otherwise `publishedAt`.
- Uses category `lastModified` when present.
- Deduplicates by absolute URL.
- Omits `/`, internal routes, archive routes, unsupported locales, invalid category slugs, and invalid article slugs.
- Uses `https://ai-landscape-brief.example` for local QA because T001 selected `productionOriginPlaceholder` as the M5.4 canonical source of truth.

Robots:

- Resolves environment with the T001 mapping:
  - `VERCEL_ENV=production -> production`
  - `VERCEL_ENV=preview -> staging`
  - `VERCEL_ENV=development -> local`
  - absent `VERCEL_ENV` plus `NODE_ENV=development`, `test`, or unset -> local
  - absent `VERCEL_ENV` plus `NODE_ENV=production -> staging`
  - unknown `VERCEL_ENV -> staging`
- Emits one sitemap pointer: `https://ai-landscape-brief.example/sitemap.xml`.
- Maps the configured robots directive through the installed Next 15 `MetadataRoute.Robots` shape:
  - `index,follow` -> `Allow: /`
  - `noindex,nofollow` -> `Disallow: /`
- The installed Next metadata type in this workspace does not support the newer `rules.other` field, so the generated `robots.txt` does not include a literal `X-Robots-Tag` line.

## Changed files

| File | Notes |
| --- | --- |
| `apps/web/src/app/sitemap.ts` | New native Next sitemap metadata route. |
| `apps/web/src/app/robots.ts` | New native Next robots metadata route. |
| `apps/web/src/lib/public-sitemap.ts` | New server-only worker inventory read wrapper. |
| `apps/web/src/lib/public-seo-origin.ts` | New pure canonical URL, sitemap entry, and robots resolver helpers. |
| `apps/web/test/public-sitemap-route.test.ts` | New focused sitemap helper tests. |
| `apps/web/test/public-robots-route.test.ts` | New focused robots helper tests. |
| `apps/web/package.json` | Added sitemap and robots tests to the web test script. |
| `apps/web/test/public-article-detail-page.test.ts` | Removed obsolete assertions that sitemap and robots files are absent; no article detail behavior assertions changed. |
| `apps/web/test/public-category-route.test.ts` | Removed obsolete assertions that sitemap and robots files are absent; no category behavior assertions changed. |
| `docs/milestones/m5-4-sitemap-and-robots/handoffs/T003-implement-sitemap-and-robots-endpoints-handoff.md` | This handoff. |

## Validation evidence

Passed:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Notes:

- The first non-escalated web test run correctly exposed stale route-activation assertions in existing tests. Those were fixed under the two approved scope amendments.
- Later non-escalated test runs intermittently failed with `spawn EPERM` from `tsx`/`esbuild`. The required web test command passed when rerun with approved escalation for the same command.
- Lint and typecheck passed without escalation.

Route smoke:

Started the web dev server on `http://localhost:3002`.

```powershell
Invoke-WebRequest -Uri http://localhost:3002/robots.txt -UseBasicParsing
```

Observed:

```text
200
User-Agent: *
Disallow: /

Sitemap: https://ai-landscape-brief.example/sitemap.xml
```

```powershell
Invoke-WebRequest -Uri http://localhost:3002/sitemap.xml -UseBasicParsing
```

Observed:

- HTTP `200`.
- XML began with locale homepages and active category URLs rooted at `https://ai-landscape-brief.example`.
- Sitemap content checks:
  - `localhost=False`
  - `/internal/=False`
  - `/archive=False`
  - `/articles/=True`
  - `url_count=24`

The temporary dev process was no longer listening on port `3002` when checked after smoke.

## QA focus

- Verify route output shape through Next's generated `/robots.txt` and `/sitemap.xml` responses.
- Verify that local/staging robots output being `Disallow: /` is accepted as the Next 15 metadata-route representation of the configured `noindex,nofollow` policy.
- Verify sitemap article URLs come only from T002 inventory and do not leak draft/review/ready/failed/null-`published_at` records.
- Verify production release remains blocked until the `.example` placeholder canonical origin is replaced with the real production origin in committed config.
- Root build was not run; the known `root-web-build-hangs` caveat remains outside T003 scope.
