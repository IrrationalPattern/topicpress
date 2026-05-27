# Milestone: m5-4-sitemap-and-robots - Sitemap And Robots

## Status

Complete; QA passed on 2026-05-27 with no blocking findings.

## Metadata

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Milestone ID     | `m5-4-sitemap-and-robots`                                             |
| Target milestone | `M5 Public Site and SEO Rendering`                                    |
| Owner            | `orchestrator`                                                        |
| Architect        | `architect`                                                           |
| Created          | `2026-05-27`                                                          |
| Last updated     | `2026-05-27`                                                          |
| Related specs    | `docs/frontend/routes.md`, `docs/qa/test-strategy.md`                 |
| Related issues   | `root-web-build-hangs`                                                |

## Goal

Implement the next narrow M5 SEO surface: `/sitemap.xml` and `/robots.txt`.

The sitemap must expose only crawlable public URLs that Topicpress can currently render: locale homepages, active category pages, and durable published article detail URLs for supported locales. Article URLs must use the same locale/default-locale fallback and public eligibility rules established by M5.3 article detail pages, and must not leak draft, review, ready, failed, unpublished, inactive-category, ambiguous, or incomplete article records.

## Non-goals

- Do not implement `/[locale]/archive`.
- Do not implement article JSON-LD or other structured article data.
- Do not implement pagination, sitemap indexes, or paginated sitemaps.
- Do not implement source attribution, related articles, ads, right rail content, newsletter modules, comments, or social sharing.
- Do not perform release hardening or fix `root-web-build-hangs`.
- Do not add database schema changes, migrations, indexes, or seed changes unless T001 proves they are required and returns to Architect for scope expansion.
- Do not change ingestion, clustering, generation, review, publishing, AI provider behavior, or article rendering UI.

## Background

M5.1 delivered locale homepages, M5.2 delivered active category pages, and M5.3 delivered article detail pages at `/[locale]/articles/[slug]`. M5.3 closeout recommends sitemap and robots as the next M5 slice now that category and article URL policy is settled.

Current public routes are:

- `/`, redirecting to the configured default locale homepage.
- `/[locale]`, for supported locale homepages.
- `/[locale]/categories/[categorySlug]`, for active categories.
- `/[locale]/articles/[slug]`, for durable published article details.

Before M5.4 implementation, `/robots.txt` and `/sitemap.xml` were deferred in canonical route docs. Root `pnpm build` remains affected by `root-web-build-hangs`, so this milestone used focused web/worker validation and route smoke evidence instead of release hardening.

## Required reading

Every agent working on this milestone must read:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-4-sitemap-and-robots/plan.md`
- `docs/milestones/m5-4-sitemap-and-robots/task-graph.yaml`

Additional domain-specific docs:

- `docs/product/vision.md`
- `docs/architecture/overview.md`
- `docs/architecture/boundaries.md`
- `docs/architecture/adr/ADR-001-monorepo-split-runtime.md`
- `docs/architecture/adr/ADR-005-manual-review-before-publication.md`
- `docs/architecture/adr/ADR-006-database-backed-worker-execution.md`
- `docs/database/schema.md`
- `docs/frontend/routes.md`
- `docs/qa/test-strategy.md`
- `docs/milestones/m5-3-public-article-detail-pages/closeout.md`
- `docs/milestones/m5-3-public-article-detail-pages/qa-report.md`

Relevant code before implementation:

- `packages/config/src/index.ts`
- `apps/web/src/i18n/routing.ts`
- `apps/web/src/lib/public-article-routing.ts`
- `apps/web/src/app/(public)/[locale]/page.tsx`
- `apps/web/src/app/(public)/[locale]/categories/[categorySlug]/page.tsx`
- `apps/web/src/app/(public)/[locale]/articles/[slug]/page.tsx`
- `apps/worker/src/public-category-listing/`
- `apps/worker/src/public-article-detail/`
- `apps/worker/test/public-category-listing.test.mjs`
- `apps/worker/test/public-article-detail.test.mjs`
- `apps/web/test/public-category-page.test.ts`
- `apps/web/test/public-category-route.test.ts`
- `apps/web/test/public-article-detail-page.test.ts`

## Current state before milestone

- Before implementation, `/robots.txt` was unavailable; no `apps/web/src/app/robots.ts` file existed.
- Before implementation, `/sitemap.xml` was unavailable; no `apps/web/src/app/sitemap.ts` file existed.
- Public homepage, category, and article detail routes are implemented.
- Article detail reads require supported locales, valid slug shape, `published` status, non-null `published_at`, active category rows, required fields after locale/default-locale fallback, and backend-provided `alternateSlugs`.
- `packages/config` already contains site domain fields, SEO canonical policy notes, and robots directives for local, staging, and production.
- Production domain remains a placeholder until launch-domain clearance; `siteConfig.seo.canonical.requireProductionOrigin` says not to generate canonical URLs pointing to localhost.
- Root `pnpm build` hangs in the web build path and is not a focused M5.4 completion gate.

## Desired state after milestone

- `/robots.txt` returns a valid robots response using the configured robots directive for the current deployment environment and includes a `Sitemap` pointer to the configured canonical sitemap URL.
- `/sitemap.xml` returns valid XML through the Next.js sitemap route surface.
- Sitemap URLs are absolute, normalized, and derived from the configured canonical origin. They must not be derived from localhost, arbitrary request hosts, or browser input.
- Sitemap includes supported locale homepage URLs.
- Sitemap includes active category URLs for supported locales only when the category is active in configuration and the synced database category row is active.
- Sitemap includes durable article detail URLs for supported locales only when the article is public-eligible under the M5.3 article detail contract.
- Article sitemap entries reuse or exactly mirror backend article-detail slug eligibility so invalid or ambiguous article URLs are omitted rather than guessed.
- Focused worker and web tests cover URL inventory, published-only filtering, locale fallback, robots directives, and route output shape.
- QA records route smoke for `/robots.txt` and `/sitemap.xml`, including host, sitemap contents, and known root build caveat.

## T001 contract decisions

T001 resolved the open sitemap and robots contract questions on 2026-05-27.

### Canonical origin

The canonical origin source of truth for M5.4 is `siteConfig.identity.domains.productionOriginPlaceholder` in `packages/config/src/index.ts`.

Because `siteConfig.seo.canonical.requireProductionOrigin` is `true`, sitemap and robots URL assembly must never use `siteConfig.identity.domains.localOrigin`, `NEXT_PUBLIC_SITE_URL`, arbitrary request hosts, or localhost as the canonical origin. Local, test, and staging QA may emit absolute URLs rooted at the current placeholder value `https://ai-landscape-brief.example`; that is an accepted pre-release QA artifact because non-production robots directives remain `noindex,nofollow`.

Production launch/indexability is still blocked until the placeholder origin is replaced with the real production origin in committed site configuration. A production deployment must not be considered release-ready if `/sitemap.xml` or `/robots.txt` still point at the `.example` placeholder, even if focused M5.4 checks pass locally.

### Robots environment mapping

T003 must implement a minimal existing-compatible environment resolver without adding a new deployment variable:

- `process.env.VERCEL_ENV === "production"` maps to `siteConfig.seo.robots.production`.
- `process.env.VERCEL_ENV === "preview"` maps to `siteConfig.seo.robots.staging`.
- `process.env.VERCEL_ENV === "development"` maps to `siteConfig.seo.robots.local`.
- If `VERCEL_ENV` is absent and `NODE_ENV` is `development`, `test`, or unset, map to `local`.
- If `VERCEL_ENV` is absent and `NODE_ENV` is `production`, map to `staging` as a fail-closed default until platform work documents a non-Vercel production environment signal.
- Unknown `VERCEL_ENV` values must fail closed to `staging`.

This keeps local and CI output non-indexable, supports the documented Vercel deployment model, and avoids introducing a new config/env contract in this milestone.

### Sitemap implementation library

Use native Next.js App Router metadata route files: `apps/web/src/app/sitemap.ts` returning `MetadataRoute.Sitemap` and `apps/web/src/app/robots.ts` returning `MetadataRoute.Robots`.

`next-sitemap` was evaluated and rejected for M5.4. Its static/postbuild and route-handler helpers do not remove the hard parts for this milestone: canonical-origin policy, fail-closed robots environment mapping, database-backed published-only inventory, and M5.3 article slug fallback/ambiguity rules. Adding it would introduce dependency/config surface without enough risk reduction. Revisit only if future milestones require sitemap indexes, split sitemaps, or build-time sitemap artifacts.

### Article URL eligibility

T002 should extract or reuse worker-only pure helper logic from the M5.3 public article detail service so sitemap article URL eligibility cannot drift from detail-route eligibility. Do not mirror slug/fallback logic independently in a separate sitemap-only implementation unless extraction proves impossible and the handoff documents why.

For every supported locale, include an article URL only when the candidate route slug is valid and resolves back to the same public article under the M5.3 article detail contract. Omit the candidate if it is invalid, incomplete after requested/default locale fallback, inactive-category, unpublished, null-`published_at`, ambiguous, or resolves to a different article.

## T003 scope amendment

T003 may update `apps/web/test/public-article-detail-page.test.ts` only to revise the obsolete assertions that `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts` do not exist. Those assertions were valid while the SEO routes were deferred, but they directly conflict with the T003 requirement to add native Next.js metadata routes. This amendment does not authorize article detail route behavior changes or broader edits to that test file.

T003 may also update `apps/web/test/public-category-route.test.ts` only to revise the same obsolete assertions that `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts` do not exist. That test is part of `pnpm --filter @topicpress/web test`, so leaving the absence assertions in place would make the required T003 endpoint files fail the package validation. This amendment does not authorize category route behavior changes or broader edits to that test file.

## Scope

### In scope

- Define sitemap and robots route/data contracts.
- Add a narrow public sitemap URL inventory read service if needed by the web runtime.
- Generate `/sitemap.xml` for locale homepages, active categories, and public article detail URLs.
- Generate `/robots.txt` with configured environment-specific robots directives and sitemap location.
- Preserve M5.3 article detail locale/default-locale fallback rules for article URLs.
- Filter articles to `published` with non-null `published_at`, active category rows, and required public fields after fallback.
- Validate and omit invalid or ambiguous article URL candidates.
- Add focused tests and route smoke checks.
- Update canonical route and QA docs after implementation.

### Out of scope

- Archive route.
- Structured article data / JSON-LD.
- Pagination, sitemap index files, image/video/news sitemaps, or split sitemap files.
- Source attribution, related articles, ads, right rail content, or other article-page modules.
- Release hardening or fixing `root-web-build-hangs`.
- Schema, migration, seed, AI, ingestion, clustering, review, or publishing changes by default.

## Architecture impact

This milestone adds two public SEO endpoints to `apps/web` and one read-only public URL inventory boundary if implementation needs database-backed article/category enumeration. It should not require a new ADR if it stays within the established request-scoped public read pattern.

### Expected architecture changes

- Add a worker read service such as `apps/worker/src/public-sitemap/` that returns public-safe sitemap path records for categories and articles.
- Extract or reuse worker-only article URL eligibility helpers from the M5.3 public article detail read service where needed to avoid slug/fallback drift.
- Add a server-only web wrapper/helper in `apps/web/src/lib/` that opens a short-lived database client, calls the public sitemap service, and closes the connection.
- Add native Next.js App Router metadata route files: `apps/web/src/app/sitemap.ts` and `apps/web/src/app/robots.ts`.
- Add tests for path generation, canonical-origin handling, robots output, and published-only URL filtering.
- Revise stale public article detail route-test assertions that still expect `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts` to be absent.
- Revise stale public category route-test assertions that still expect `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts` to be absent.

### Architecture boundaries

Agents must respect these boundaries:

- Browser/client code must not import database code, Drizzle clients, postgres clients, server-only env loading, or worker stores.
- Public sitemap reads must require `articles.status = "published"` and non-null `articles.published_at`.
- Public sitemap reads must not expose draft, review, ready, failed, unpublished, inactive-category, incomplete, invalid-slug, or ambiguous article records.
- Public sitemap reads must not perform ingestion, clustering, generation, review, publication, retry, recovery, or live OpenAI work.
- New web code may use narrow exported public read services from `@topicpress/worker`, but must not import arbitrary worker internals into components.
- Database schema changes require returning to Architect before implementation.
- If the sitemap URL source of truth or canonical host behavior is unclear, implementation agents must stop and ask instead of guessing.

### Required ADRs

No new ADR is required if this milestone uses existing config-owned canonical/robots settings and existing public read boundaries.

Create or update an ADR only if implementation proposes one of these durable changes:

- a new canonical host source of truth outside `packages/config`,
- a new environment contract beyond existing runtime/deployment values,
- schema or index changes,
- sitemap indexing/pagination as a durable SEO strategy,
- a new shared public-query package,
- a change to web/worker runtime ownership.

## Contracts to define or update

### Route contracts

Public SEO routes:

- `/robots.txt`
- `/sitemap.xml`

Robots behavior:

- Return a valid plain-text robots response.
- Select the directive from `siteConfig.seo.robots` using the T001 environment resolver:
  - `VERCEL_ENV=production`: `siteConfig.seo.robots.production`
  - `VERCEL_ENV=preview`: `siteConfig.seo.robots.staging`
  - `VERCEL_ENV=development`: `siteConfig.seo.robots.local`
  - no `VERCEL_ENV` with `NODE_ENV=development`, `NODE_ENV=test`, or unset: `siteConfig.seo.robots.local`
  - no `VERCEL_ENV` with `NODE_ENV=production`: `siteConfig.seo.robots.staging`
  - unknown `VERCEL_ENV`: `siteConfig.seo.robots.staging`
- Include one `Sitemap` line pointing to the canonical `/sitemap.xml` URL.
- Do not hard-code localhost as the sitemap URL.
- Do not introduce a new deployment environment variable in M5.4.

Sitemap behavior:

- Return valid XML through `apps/web/src/app/sitemap.ts`.
- Use absolute URLs rooted at the configured canonical origin.
- Normalize paths without duplicate slashes.
- Include supported locale homepages:
  - `/en-gb`
  - `/uk-ua`
- Include active category URLs for each supported locale:
  - `/<localePath>/categories/<categorySlug>`
- Include public article detail URLs for supported locales:
  - `/<localePath>/articles/<articleSlug>`
- Omit `/`, because it redirects to the default-locale homepage.
- Omit internal routes.
- Omit deferred routes including `/[locale]/archive`.

### Canonical host contract

The canonical origin must come from committed site configuration or an explicitly documented runtime deployment value that is already part of the project contract. Current config has:

- `siteConfig.identity.domains.productionOriginPlaceholder`
- `siteConfig.seo.canonical.requireProductionOrigin`

M5.4 uses `siteConfig.identity.domains.productionOriginPlaceholder` as the configured production-origin value for absolute sitemap and robots URLs. `siteConfig.identity.domains.localOrigin` is not a canonical source for sitemap/robots while `requireProductionOrigin` is true.

The current placeholder is acceptable for local, test, and staging QA only. Production release/indexability remains blocked until the real production origin replaces the placeholder in committed config.

Implementation agents must stop and ask if:

- they cannot identify a single canonical origin source of truth,
- the only available origin is localhost,
- implementation would make production indexable while still using the `.example` placeholder,
- they need a new environment variable or deployment config contract.

### Data contracts

The public sitemap inventory should be narrow and serialized. A backend read service may return path-level records instead of absolute URLs so host selection remains web/config-owned:

- homepage entries are derived from `siteConfig.locales.supportedLocales`.
- category entries include `locale`, `categorySlug`, optional `lastModified`, and source marker `category`.
- article entries include `articleId`, `locale`, `slug`, `publishedAt`, optional `updatedAt`, and source marker `article`.

Eligibility:

- Category entries require an active configured taxonomy category and an active synced database category row.
- Article entries require `articles.status = "published"`, non-null `articles.published_at`, active category row, supported locale, valid slug, and required public fields after requested-locale/default-locale fallback.
- Article URL slug selection must reuse or exactly mirror M5.3 `alternateSlugs` semantics. For each supported locale, include a URL only if that slug resolves the same public article under the article detail contract.
- If a slug candidate resolves more than one public article, resolves a different article, or is invalid for the locale, omit the URL and record the data issue in the handoff.

### Database contracts

No schema change is planned. Implementation must use existing tables:

- `articles`
- `article_localizations`
- `categories`

If implementation discovers correctness or performance requires a new index/schema change, stop and return to Architect with evidence.

### Frontend contracts

Create or update:

- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/lib/public-sitemap.ts`
- `apps/web/src/lib/public-seo-origin.ts` or equivalent helper if needed
- focused web tests under `apps/web/test/`

### Documentation contracts

Update after implementation:

- `docs/frontend/routes.md`
- `docs/qa/test-strategy.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-4-sitemap-and-robots/qa-report.md`
- `docs/milestones/m5-4-sitemap-and-robots/closeout.md`

## Task summary

| Task ID | Title                                    | Type                    | Owner          | Actor              | Status  | Depends on     | Blocks      | Parallel group | Write scope |
| ------- | ---------------------------------------- | ----------------------- | -------------- | ------------------ | ------- | -------------- | ----------- | -------------- | ----------- |
| T001    | Finalize sitemap and robots contract     | contract                | orchestrator   | architect          | qa_passed | []          | [T002,T003] | A              | docs-only   |
| T002    | Add public sitemap URL inventory service | backend                 | implementation | backend_developer  | qa_passed | [T001]         | [T003,T004] | B              | bounded     |
| T003    | Implement sitemap and robots endpoints   | frontend                | implementation | frontend_developer | qa_passed | [T001,T002]    | [T004]      | C              | bounded     |
| T004    | QA sitemap and robots routes             | qa                      | qa             | qa_reviewer        | qa_passed | [T002,T003]    | [T005]      | D              | docs-only   |
| T005    | Consolidate docs and close milestone     | knowledge_consolidation | docs           | knowledge_curator  | implemented | [T004]         | []          | E              | docs-only   |

## Build order

1. T001 confirms canonical-origin, robots environment, URL inventory, and article URL eligibility contracts.
2. T002 adds the backend public sitemap URL inventory service and worker tests.
3. T003 adds the Next.js sitemap/robots route files, web helpers, and web tests.
4. T004 runs focused QA, validation commands, XML/robots route smoke, and negative checks for unpublished content leakage.
5. T005 updates canonical docs, records final state, writes closeout, and updates `docs/PROJECT_STATE.md` if the milestone result changes project state.

## Parallelization plan

Implementation should be sequential. T003 consumes the contract and data service from T001/T002, and QA depends on both implementation handoffs.

### Parallel groups

| Group | Tasks | Safe to run in parallel? | Reason |
| ----- | ----- | ------------------------ | ------ |
| A | T001 | Yes | Docs-only contract confirmation. |
| B | T002 | No with T003 | T003 consumes the public sitemap inventory service. |
| C | T003 | No with T002 | T003 depends on the DTO/path contract and may add tests that assume it. |
| D | T004 | No | QA requires implementation handoffs and route output. |
| E | T005 | No | Docs consolidation depends on QA result. |

## Dependency routing rules

- Only dispatch tasks with status `ready`.
- Do not dispatch tasks with unmet `depends_on`.
- Do not run tasks in parallel if their `write_scope.allowed_paths` overlap unless Architect explicitly approves it.
- Do not run T002 or T003 until T001 resolves canonical host and robots environment behavior.
- Do not run T003 until T002 exports the public sitemap inventory service unless T001 explicitly decides that no backend service is required.
- Do not run QA before implementation handoffs exist.
- If any task needs archive, structured data, pagination, release hardening, schema, migration, or new deployment config changes, return to Architect instead of expanding scope.

## Risks

| Risk | Impact | Probability | Mitigation |
| ---- | ------ | ----------- | ---------- |
| Canonical origin is still a placeholder. | High | Medium | Local/test/staging QA may use the placeholder, but production release/indexability remains blocked until the real origin replaces it in config. |
| Robots environment mapping defaults to indexable output in non-production. | High | Medium | T003 must use the T001 resolver: Vercel production is the only production-indexable signal; unknown/non-Vercel production falls back to staging/noindex. |
| Sitemap duplicates or invents invalid article URLs. | High | Medium | T002 must extract or reuse M5.3 article-detail eligibility helpers and omit ambiguous URLs. |
| Sitemap leaks unpublished or incomplete articles. | High | Medium | T002 tests must cover status, null `published_at`, inactive category, missing fields, and invalid slugs. |
| Category sitemap includes inactive or unsynced categories. | Medium | Medium | T002 must require active config taxonomy and active DB category rows. |
| Root web build remains unreliable. | Medium | High | Use focused checks and route smoke; document missing root build evidence as residual release risk. |
| Next dev status behavior differs from production. | Medium | Medium | QA must validate route output shape locally and record that production build/status evidence remains gated by release hardening. |

## Quality gates

The milestone cannot be marked complete until all task acceptance criteria are satisfied or explicitly documented as accepted deviations.

### Required validation commands

Focused package validation:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/config test
```

Broaden only if implementation crosses scope:

```powershell
pnpm db:check
pnpm typecheck
pnpm lint
pnpm test
```

Do not use root `pnpm build` as the sole completion gate while `root-web-build-hangs` remains open. If root build is skipped or blocked, the QA report must say so.

### Required local route smoke

After starting the web app:

```powershell
pnpm --filter @topicpress/web dev
```

Record the actual base URL and check:

- `/robots.txt` returns robots text with the expected directive for the local/dev environment and one sitemap URL.
- `/sitemap.xml` returns XML and includes canonical absolute URLs, not localhost URLs, when `requireProductionOrigin` is true.
- Sitemap includes supported locale homepages.
- Sitemap includes active category URLs for supported locales.
- Sitemap includes at least one published article URL when local data contains a qualifying published article.
- Sitemap excludes draft/review/ready/failed/unpublished/null-`published_at` article URLs if fixture/local data is available to verify that.
- Sitemap omits `/`, `/internal/editorial/review`, `/[locale]/archive`, invalid category slugs, and invalid article slugs.
- Existing route smoke still passes for `/`, `/en-gb`, `/uk-ua`, `/en-gb/categories/news`, and a representative article detail URL when local data supports it.

If local database state does not include a published article or negative-case records, QA must either prepare data through existing workflows/tests or document the smoke limitation instead of claiming live coverage.

### Required QA checks

- Verify all implementation task handoffs exist.
- Verify robots output uses configured directives and sitemap URL.
- Verify sitemap includes only currently implemented public route families.
- Verify public article URL filtering is published-only and non-null `published_at`.
- Verify default-locale fallback article URL behavior matches M5.3.
- Verify invalid/ambiguous article URL candidates are omitted.
- Verify no archive, structured data, pagination, source attribution, related content, ads, right rail, schema, migration, or release-hardening scope was introduced.
- Verify docs are updated after implementation.

## Milestone acceptance criteria

This milestone is complete when:

- [x] All task YAML files exist under `docs/milestones/m5-4-sitemap-and-robots/tasks/`.
- [x] T001 resolves canonical-origin and robots-environment questions or marks the milestone blocked.
- [x] `/robots.txt` exists and returns configured robots directives with a sitemap pointer.
- [x] `/sitemap.xml` exists and returns absolute canonical URLs for locale homepages, active categories, and public article details.
- [x] Sitemap article entries expose only durable `published` articles with non-null `published_at`.
- [x] Sitemap article entries use article detail fallback/alternate slug rules and omit invalid or ambiguous URLs.
- [x] Focused web, worker, and config validation commands pass or failures are documented and accepted.
- [x] Local route smoke evidence is recorded.
- [x] Handoff files exist for all implementation and QA tasks.
- [x] `docs/frontend/routes.md`, `docs/qa/test-strategy.md`, and `docs/PROJECT_STATE.md` are updated to reflect the delivered state.
- [x] `docs/milestones/m5-4-sitemap-and-robots/qa-report.md` records final QA result.
- [x] `docs/milestones/m5-4-sitemap-and-robots/closeout.md` records final outcome and next milestone recommendation.

## Open questions

| Question | Owner | Needed by | Status |
| -------- | ----- | --------- | ------ |
| Should M5.4 local QA accept `siteConfig.identity.domains.productionOriginPlaceholder` as the canonical origin, or should sitemap generation block until the final production origin is configured? | architect/product | T001/T003 | resolved: local/test/staging QA may use the placeholder; production release/indexability remains blocked until the real production origin replaces it in config. |
| Which exact runtime signal should select `local`, `staging`, or `production` robots directives? | architect/platform | T001/T003 | resolved: use `VERCEL_ENV` first, then `NODE_ENV`, with non-Vercel production and unknown values failing closed to staging/noindex. |
| Should article sitemap inventory reuse existing M5.3 article-detail helpers directly, or extract shared worker-only slug eligibility helpers to avoid drift? | backend/architect | T002 | resolved: extract or reuse worker-only M5.3 article-detail eligibility helpers; avoid independent sitemap-only slug logic unless extraction is blocked and documented. |

## Process notes from M5.3

- M5.3 worked well when the contract task explicitly resolved route lookup precedence, fallback fields, and deferred scope before implementation.
- M5.3 struggled where package test scripts initially omitted focused tests; M5.4 tasks must require any new focused tests to be wired into package test scripts before QA.
- M5.3 QA found a metadata suffix defect because route smoke checked browser-visible output and metadata. M5.4 QA should similarly inspect generated robots text and sitemap XML, not only unit tests.
- M5.3 needed a scope amendment for stale tests after route activation. M5.4 handled the equivalent stale `/robots.txt` and `/sitemap.xml` absence assertions through explicit T003 scope amendments.

## Notes for orchestrator

- M5.4 is complete after T005 docs consolidation.
- Preserve the production-indexability blocker until the `.example` placeholder canonical origin is replaced with the real production origin in committed config.
- Route release hardening separately; do not treat focused M5.4 QA as a substitute for repairing `root-web-build-hangs` or validating production status behavior.
