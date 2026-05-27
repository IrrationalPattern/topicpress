# Frontend Routes

Updated: 2026-05-27

Evidence sources:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-3-public-article-detail-pages/qa-report.md`
- `docs/milestones/m5-3-public-article-detail-pages/handoffs/T005-qa-article-detail-route-handoff.md`
- `docs/milestones/m5-3-public-article-detail-pages/handoffs/QA-M5.3-001-metadata-title-suffix-fix-handoff.md`
- `docs/milestones/m5-4-sitemap-and-robots/qa-report.md`
- `docs/milestones/m5-4-sitemap-and-robots/closeout.md`
- `README.md` public homepage/category verification sections
- `apps/web/src`
- `apps/web/test`

## Scope

This document records the currently implemented Topicpress frontend route contract. It is a documentation handoff for the route surface only; it does not add, remove, or change application routes.

Topicpress is currently in M5 Public Site and SEO Rendering. The completed public slices are M5.1 Public Homepage, M5.2 Category Pages, M5.3 Public Article Detail Pages, and M5.4 Sitemap and Robots. Archive, structured article data, production canonical rollout, and release hardening remain deferred.

## Implemented Routes

| Route                                    | Surface  | Implementation                                                               | Behavior                                                                                                                                      |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                      | Public   | `apps/web/src/middleware.ts` with `next-intl` routing                        | Redirects to the configured default-locale path. Current config maps the default locale to `/en-gb`.                                          |
| `/[locale]`                              | Public   | `apps/web/src/app/(public)/[locale]/layout.tsx` and `page.tsx`               | Renders the public homepage for supported locales. Reads published homepage articles from Postgres through `getHomepageArticles`.             |
| `/[locale]/categories/[categorySlug]`    | Public   | `apps/web/src/app/(public)/[locale]/categories/[categorySlug]/page.tsx`      | Renders active configured category listing pages for supported locales. Reads published category articles through `getPublicCategoryListing`. |
| `/[locale]/articles/[slug]`              | Public   | `apps/web/src/app/(public)/[locale]/articles/[slug]/page.tsx`                | Renders durable published article detail pages for supported locales through the public article detail read boundary.                          |
| `/robots.txt`                            | Public   | `apps/web/src/app/robots.ts`                                                 | Returns native Next metadata-route robots text using the configured environment directive and one canonical sitemap pointer.                   |
| `/sitemap.xml`                           | Public   | `apps/web/src/app/sitemap.ts`                                                | Returns native Next metadata-route XML for locale homepages, active category URLs, and public article detail URLs.                            |
| `/internal/editorial/review`             | Internal | `apps/web/src/app/(internal)/internal/editorial/review/page.tsx`             | Renders the internal editorial review list. This route is not locale-prefixed.                                                                |
| `/internal/editorial/review/[articleId]` | Internal | `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/page.tsx` | Renders the internal review detail/actions surface for a single article. Unknown records use the route-local not-found UI.                    |

Homepage and category article cards now link to locale-aware article detail URLs when the resolved article slug is usable.

Homepage, category listing, and article detail reads prefer the requested locale and fall back to the configured default locale for required public fields. Public list articles require usable slug, title, and excerpt after fallback. Public article details require usable slug, title, excerpt, and body after fallback.

## Article Detail Contract

Public article detail route:

```text
/[locale]/articles/[slug]
```

Eligibility and lookup behavior:

- Locale must resolve to a supported app locale.
- Slug must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Lookup precedence is requested-locale `article_localizations.slug`, then default-locale `article_localizations.slug`, then canonical `articles.slug`.
- The article must be `published`, have non-null `published_at`, and belong to an active category row.
- Required public fields after requested/default locale fallback are slug, title, excerpt, and body.
- `alternateSlugs` are provided by the backend and include only supported locales with usable route slugs resolving the same public article.

Rendering behavior:

- The article page renders title, optional subtitle, excerpt, category link, publication date, optional hero image, and body.
- Body content is rendered as escaped plain text paragraphs. It is not treated as trusted HTML.
- The right rail is absent/empty.
- M5.3 did not introduce source attribution, related articles, ads, newsletter, comments, social sharing, archive, structured article data, or production canonical rollout.

## Sitemap And Robots Contract

Public SEO endpoints:

```text
/robots.txt
/sitemap.xml
```

`/robots.txt` behavior:

- Implemented with the native Next.js metadata route in `apps/web/src/app/robots.ts`.
- Uses configured `siteConfig.seo.robots` directives through the M5.4 environment resolver.
- Local/dev/test output is non-indexing and, in the installed Next 15 metadata representation, returns `Disallow: /`.
- Includes one sitemap pointer to `https://ai-landscape-brief.example/sitemap.xml` until the production origin placeholder is replaced.
- Does not use localhost, request hosts, or `NEXT_PUBLIC_SITE_URL` for the sitemap pointer.

`/sitemap.xml` behavior:

- Implemented with the native Next.js metadata route in `apps/web/src/app/sitemap.ts`.
- Uses absolute canonical URLs rooted at `siteConfig.identity.domains.productionOriginPlaceholder`.
- Includes supported locale homepages, active category URLs, and public article detail URLs.
- Omits `/` because it redirects to the configured default-locale homepage.
- Omits internal routes, archive routes, unsupported locales, invalid category slugs, invalid article slugs, and any article candidate that does not resolve as the same public article under the M5.3 article detail contract.
- Uses worker-provided path-level DTOs from the public sitemap inventory service; canonical URL construction remains owned by web/config.

Production release/indexability remains blocked while the canonical origin is still `https://ai-landscape-brief.example`.

## Deferred Routes

These route surfaces remain intentionally unimplemented:

| Route                        | Status   | Notes                                                                                                  |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `/[locale]/archive`          | Deferred | Deferred until article volume justifies a chronological archive, pagination, or continuation surface.  |
| Structured article data      | Deferred | Article pages use Open Graph article metadata, but JSON-LD/article structured data is not implemented. |
| Production canonical rollout | Deferred | Metadata and sitemap/robots canonical placeholders exist for implemented routes, but full production canonical rollout remains out of M5.4 scope. |

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

Public article detail routes call `notFound()` when:

- the locale is unsupported,
- the slug segment has an invalid shape,
- no matching public article exists,
- the article is unpublished or has null `published_at`,
- the category association is inactive,
- required public fields are missing after locale fallback.

Known nuance from M5.2/M5.3 QA: in Next dev, dynamic unknown or invalid category/article slugs may return HTTP `200` while streaming App Router not-found and `noindex` body markers. Production status should be rechecked after the root web build issue is repaired or when SEO release criteria require it.

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

Article metadata is implemented through `apps/web/src/lib/public-article-routing.ts` and the article route:

- title from article `metaTitle`, else article title, with idempotent site-name suffixing after QA-M5.3-001,
- description from article `metaDescription`, else excerpt, else localized site SEO description,
- `openGraph.type` set to `article`,
- publication time from `publishedAt`,
- optional image and keywords when supplied,
- language alternates from backend-provided `alternateSlugs` only.

Current page metadata intentionally excludes archive metadata, JSON-LD structured article data, and full production canonical rollout. Sitemap and robots are implemented as native Next metadata routes in `apps/web/src/app/sitemap.ts` and `apps/web/src/app/robots.ts`.

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
pnpm --filter @topicpress/config test
```

Direct focused article detail tests, useful when narrowing failures:

```powershell
node apps\worker\test\public-article-detail.test.mjs
cd apps\web
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-components.test.tsx
..\..\node_modules\.bin\tsx.cmd test\public-article-detail-page.test.ts
```

Route smoke pointers after starting the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Check these representative paths locally:

- `/` redirects to `/en-gb`.
- `/en-gb` renders the English homepage and article cards link to `/en-gb/articles/<slug>` when local published data exists.
- `/uk-ua` renders the Ukrainian homepage and uses locale-aware article links when usable slugs exist.
- `/en-gb/categories/news` renders category article links when local published data exists.
- `/en-gb/articles/<published-slug>` renders article title and body for a published article.
- `/uk-ua/articles/<published-or-fallback-slug>` renders localized content or default-locale fallback according to contract.
- `/fr-fr/articles/example` returns not found for an unsupported locale.
- `/en-gb/articles/Bad_Slug` and `/en-gb/articles/unknown-slug` use article not-found behavior.
- `/robots.txt` returns local/dev non-indexing robots text with one canonical sitemap pointer.
- `/sitemap.xml` returns XML with canonical placeholder URLs for supported locale homepages, active categories, and public article details.
- `/en-gb/archive` remains unavailable until its own slice implements it.
- `/internal/editorial/review` remains available without a locale prefix.

M5.4 QA passed on 2026-05-27 with no blocking sitemap/robots findings. Root `pnpm build` remains a known release/CI hardening risk tracked as `root-web-build-hangs`; use the focused checks above for M5 public route evidence until that issue is repaired.
