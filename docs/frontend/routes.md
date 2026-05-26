# Frontend Routes

Updated: 2026-05-26

Evidence sources:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/product/vision.md`
- `README.md` public homepage and category verification sections
- `apps/web/src`
- `apps/web/test`
- Obsidian Topicpress M5.1/M5.2 notes and QA handoffs, especially QA-506, QA-527, and the QA-527 handoff

## Scope

This document records the currently implemented Topicpress frontend route contract. It is a documentation handoff for the route surface only; it does not add, remove, or change application routes.

Topicpress is currently in M5 Public Site and SEO Rendering. The completed public slices are M5.1 Public Homepage and M5.2 Category Pages. Article detail pages, archive, sitemap, robots, structured article data, production canonical rollout, and release hardening remain deferred.

## Implemented Routes

| Route                                    | Surface  | Implementation                                                               | Behavior                                                                                                                                      |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                      | Public   | `apps/web/src/middleware.ts` with `next-intl` routing                        | Redirects to the configured default-locale path. Current config maps the default locale to `/en-gb`.                                          |
| `/[locale]`                              | Public   | `apps/web/src/app/(public)/[locale]/layout.tsx` and `page.tsx`               | Renders the public homepage for supported locales. Reads published homepage articles from Postgres through `getHomepageArticles`.             |
| `/[locale]/categories/[categorySlug]`    | Public   | `apps/web/src/app/(public)/[locale]/categories/[categorySlug]/page.tsx`      | Renders active configured category listing pages for supported locales. Reads published category articles through `getPublicCategoryListing`. |
| `/internal/editorial/review`             | Internal | `apps/web/src/app/(internal)/internal/editorial/review/page.tsx`             | Renders the internal editorial review list. This route is not locale-prefixed.                                                                |
| `/internal/editorial/review/[articleId]` | Internal | `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/page.tsx` | Renders the internal review detail/actions surface for a single article. Unknown records use the route-local not-found UI.                    |

Public article cards and category listings intentionally do not link to article detail URLs yet. Focused tests assert no `/articles/` anchors are emitted by the implemented public list surfaces.

Homepage and category listing article fields prefer the requested locale and fall back to the configured default locale for slug, title, excerpt, and optional display/SEO fields. Articles are omitted from public lists when required public fields remain unavailable after fallback.

## Deferred Routes

These route surfaces are intentionally not implemented in the current M5.1/M5.2 state:

| Route                        | Status   | Notes                                                                                                                                                                              |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/[locale]/articles/[slug]`  | Deferred | Recommended next M5 slice if readable article permalinks are the product priority. No public article detail route files exist under `apps/web/src/app/(public)/[locale]/articles`. |
| `/[locale]/archive`          | Deferred | Deferred until article volume justifies a chronological archive, pagination, or continuation surface.                                                                              |
| `/robots.txt`                | Deferred | Should remain a separate SEO surface after URL policy is settled. No `apps/web/src/app/robots.ts` file exists.                                                                     |
| `/sitemap.xml`               | Deferred | Should remain a separate SEO surface after article/category URL policy is confirmed. No `apps/web/src/app/sitemap.ts` file exists.                                                 |
| Structured article data      | Deferred | No public article structured data boundary is implemented while article detail pages are absent.                                                                                   |
| Production canonical rollout | Deferred | Homepage/category metadata exists, but full canonical release behavior remains out of the completed M5.1/M5.2 scope.                                                               |

## Locale Behavior

Locale routing is configuration-driven:

- `apps/web/src/i18n/routing.ts` builds `next-intl` routing from `siteConfig.locales.supportedLocales`, `siteConfig.locales.defaultLocale`, and `siteConfig.locales.paths`.
- `localePrefix.mode` is `always`.
- `localeDetection` is disabled.
- Current supported path segments are `en-gb` for `en-GB` and `uk-ua` for `uk-UA`.
- The middleware matcher is scoped to `/` and the supported locale path prefixes: `["/", "/(en-gb|uk-ua)/:path*"]`.
- Internal editorial routes are intentionally unprefixed and are outside the public locale middleware matcher.

Route params may arrive as configured locale codes or visible path segments. Public route helpers resolve either form back to supported app locales, and unsupported locale segments resolve to not-found behavior.

## Not-Found Behavior

Public locale routes call `notFound()` when the locale cannot be resolved. The route-local UI in `apps/web/src/app/(public)/[locale]/not-found.tsx` reports that the requested public locale is not available.

Public category routes call `notFound()` when:

- the locale is unsupported,
- the category slug segment has an invalid shape,
- the category is unknown,
- the category is inactive or stale relative to configured active taxonomy/database state.

The category route-local UI in `apps/web/src/app/(public)/[locale]/categories/[categorySlug]/not-found.tsx` reports that the requested public locale or category slug is not available.

Known nuance from M5.2 QA: in Next dev, dynamic unknown or invalid category slugs may return HTTP `200` while streaming App Router not-found and `noindex` body markers. This is documented as a residual risk, not a focused M5.2 blocker. Production HTTP status for those dynamic category not-found paths should be rechecked after the root web build issue is repaired or when SEO release criteria require it.

Deferred routes such as `/en-gb/articles/example`, `/en-gb/archive`, `/robots.txt`, and `/sitemap.xml` were smoke-checked in M5.2 QA as `404`.

## Metadata Boundaries

Homepage metadata is implemented in `apps/web/src/app/(public)/[locale]/page.tsx`:

- title from `siteConfig.identity.name`,
- localized SEO description from `siteConfig.seo.descriptions`,
- language alternates for supported locale homepages,
- website Open Graph metadata.

Category metadata is implemented through `apps/web/src/lib/public-category-page.ts` and the category route:

- title as `<Category label> | <Site name>`,
- category description when available, with localized site SEO description fallback,
- language alternates for the same category slug across supported locales,
- website Open Graph metadata.

Current metadata intentionally excludes sitemap generation, robots rules, archive metadata, article-detail canonical metadata, structured article data, and full production canonical rollout.

## Validation Pointers

Focused web validation:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Focused worker validation for published-only public read boundaries:

```powershell
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
```

Route smoke pointers after starting the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Check these representative paths locally:

- `/` redirects to `/en-gb`.
- `/en-gb` renders the English homepage.
- `/uk-ua` renders the Ukrainian homepage.
- `/en-gb/categories/news` renders an active populated category when local data exists.
- `/en-gb/categories/model-releases` renders an active empty category when local data has no published articles for it.
- `/fr-fr` and `/fr-fr/categories/news` return not found for unsupported locales.
- `/en-gb/categories/Bad_Slug` and `/en-gb/categories/model--releases` use category not-found behavior.
- `/en-gb/articles/example`, `/en-gb/archive`, `/robots.txt`, and `/sitemap.xml` remain unavailable until their own slices implement them.
- `/internal/editorial/review` remains available without a locale prefix.

Current documentation-task validation:

- `pnpm --filter @topicpress/web test` passed on 2026-05-21 after rerunning outside the sandbox. The first sandboxed attempt failed with `tsx`/`esbuild` child-process `spawn EPERM`, then the same command passed with approval.
- The passing web tests cover locale routing, configured default redirect target, supported locale message files, category route helpers, unsupported locale and invalid category slug not-found resolution, deferred public route absence, homepage/category list rendering, absence of public article anchors, and category metadata/alternates.

Full root `pnpm build` remains a known release/CI hardening risk tracked as `root-web-build-hangs`; use the focused checks above for M5.1/M5.2 route evidence until that issue is repaired.
