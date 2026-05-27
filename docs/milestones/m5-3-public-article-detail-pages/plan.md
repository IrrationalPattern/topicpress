# Milestone: m5-3-public-article-detail-pages - Public Article Detail Pages

## Status

Complete; QA passed after QA-M5.3-001 fix

## Metadata

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Milestone ID     | `m5-3-public-article-detail-pages`                                    |
| Target milestone | `M5 Public Site and SEO Rendering`                                    |
| Owner            | `orchestrator`                                                        |
| Architect        | `architect`                                                           |
| Created          | `2026-05-26`                                                          |
| Last updated     | `2026-05-27`                                                          |
| Related specs    | `docs/frontend/routes.md`, `docs/qa/test-strategy.md`                 |
| Related issues   | `root-web-build-hangs`                                                |

## Goal

Implement locale-aware public article detail pages at `/[locale]/articles/[slug]` so readers can open a durable published article permalink and read the article content.

The page must render only published articles with non-null `published_at`, resolve article content using requested-locale fields with default-locale fallback, and keep the route inside the existing public web read boundary. The right rail may be empty for this milestone; no related-article, ad, newsletter, archive, sitemap, robots, or structured-data work is required.

## Non-goals

- Do not implement sitemap or robots endpoints.
- Do not implement `/[locale]/archive`, pagination, infinite scroll, or an all-articles index.
- Do not implement article structured data or full production canonical rollout.
- Do not add related articles, topic widgets, ads, newsletter modules, comments, reader accounts, or social sharing.
- Do not change article generation, review, publishing, ingestion, clustering, AI provider behavior, or database schema unless a blocker proves the current schema cannot serve article details.
- Do not expose draft, review, ready, failed, or unpublished article records.
- Do not introduce client-side database access.

## Background

Topicpress is in M5 Public Site and SEO Rendering. M5.1 delivered the public homepage and M5.2 delivered category pages. At milestone kickoff, `docs/PROJECT_STATE.md` identified article detail pages as the recommended next slice if readable article permalinks were the product priority.

Before M5.3, public routes were `/`, `/[locale]`, and `/[locale]/categories/[categorySlug]`. Public list surfaces intentionally avoided article links because `/[locale]/articles/[slug]` did not exist yet. This milestone activated that deferred route and updated list surfaces to link to readable permalinks.

Existing architecture allows request-scoped server-side public reads from `apps/web`, currently through narrow exported read services in `@topicpress/worker`. This milestone should follow the same pattern used by `public-homepage` and `public-category-listing`, while keeping browser/client components on serialized DTOs only.

## Required reading

Every agent working on this milestone must read:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-3-public-article-detail-pages/plan.md`
- `docs/milestones/m5-3-public-article-detail-pages/task-graph.yaml`

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

Relevant code before implementation:

- `apps/web/src/app/(public)/[locale]/page.tsx`
- `apps/web/src/app/(public)/[locale]/categories/[categorySlug]/page.tsx`
- `apps/web/src/lib/public-homepage.ts`
- `apps/web/src/lib/public-category-listing.ts`
- `apps/web/src/lib/public-category-page.ts`
- `apps/web/src/components/public/article-card.tsx`
- `apps/web/src/components/public/article-list.tsx`
- `apps/worker/src/public-homepage/`
- `apps/worker/src/public-category-listing/`
- `apps/web/test/public-homepage-route.test.tsx`
- `apps/web/test/public-category-route.test.ts`
- `apps/web/test/public-category-page.test.ts`
- `apps/worker/test/public-homepage.test.mjs`
- `apps/worker/test/public-category-listing.test.mjs`

## Current state before milestone

- `/[locale]/articles/[slug]` is deferred and unavailable.
- Public article cards and category listings do not emit `/articles/` links.
- Homepage and category public reads expose only durable `published` articles with non-null `published_at`.
- Homepage and category reads use requested-locale article localization fields with default-locale fallback for required list fields.
- Category pages validate configured active taxonomy and active synced category rows before rendering.
- Article localization rows contain `slug`, `title`, `subtitle`, `excerpt`, `body`, `keywords`, `meta_title`, and `meta_description`.
- Existing web tests assert deferred article routes are absent; these tests must change when the route becomes active.
- Full root `pnpm build` remains a known release-hardening risk under `root-web-build-hangs`; focused package checks are the current M5 evidence path.

## Desired state after milestone

- `/[locale]/articles/[slug]` renders a public article detail page for supported locale paths and valid published article slugs.
- Unknown locales, invalid slug shapes, missing articles, inactive category associations, unpublished articles, and articles missing usable required public fields render not-found behavior.
- Article details include title, optional subtitle, excerpt/standfirst where useful, body content, category label/link, publication date, and optional hero image.
- Source attribution is deferred from required rendering in this slice. The page must not show fake attribution or block article content on source-lineage joins.
- The right rail is allowed to be empty. If a layout reserves a right rail, it must not show fake or placeholder content.
- Metadata for found article pages uses article-localized `meta_title`/`meta_description` with title/excerpt fallback and article Open Graph metadata. Sitemap, robots, JSON-LD structured data, and full canonical release hardening remain out of scope.
- Homepage and category article cards link to the new article detail route using the slug resolved for the rendered locale.
- Documentation records the route as implemented and updates QA smoke expectations.
- All implementation tasks produce handoffs and QA evidence.

## Scope

### In scope

- Define route, data, metadata, not-found, and fallback contracts for article detail pages.
- Add a narrow `@topicpress/worker` public article detail read service and tests.
- Add a server-only `apps/web` read wrapper for article details.
- Add Next.js App Router files for `/[locale]/articles/[slug]`.
- Add article detail components that render body content safely from stored article fields.
- Add route helpers for article paths.
- Link existing public article cards/lists to article detail pages.
- Update focused web and worker tests.
- Run focused validation and local route smoke checks.
- Update route and QA docs after implementation.

### Out of scope

- Database schema or migration changes.
- AI generation, prompt, review, publish, ingestion, or worker execution changes beyond a read-only public article detail service.
- Sitemap, robots, archive, pagination, structured data, production canonical rollout, release hardening, auth, reader accounts, comments, and social sharing.
- Non-empty right rail modules.

## Architecture impact

This milestone extends the existing public rendering surface but does not require a new ADR if it stays inside the established M5 public read pattern.

### Expected architecture changes

- Add a read-only public article detail service in `apps/worker`, exported through the package facade in the same style as homepage/category public reads.
- Add a server-only web wrapper in `apps/web/src/lib/` that creates a short-lived database client, calls the public detail service, and closes the connection.
- Add a locale-aware Next.js route under `apps/web/src/app/(public)/[locale]/articles/[slug]/`.
- Update existing article list/card components to use a public article path helper.

### Architecture boundaries

Agents must respect these boundaries:

- Browser/client code must not import database code, Drizzle clients, postgres clients, server-only env loading, or worker stores.
- Public page reads must require `articles.status = "published"` and non-null `articles.published_at`.
- Public page reads must not expose draft, review, ready, failed, unpublished, unrelated-category, or inactive-category records.
- Route logic may use the existing MVP pattern of importing narrow exported public read services from `@topicpress/worker`, but must not import arbitrary worker internals into components.
- No page request may perform ingestion, clustering, generation, review, publication, retry, recovery, or live OpenAI work.
- Database schema changes require explicit return to Architect before implementation.

### Required ADRs

No new ADR is required if the milestone uses the existing request-scoped public read boundary.

Create or update an ADR only if implementation proposes one of these durable changes:

- a new shared public-query package,
- a different routing/canonical URL policy,
- schema or index changes,
- a non-MVP SEO strategy such as structured data or sitemap coupling,
- a change to web/worker runtime ownership.

## Contracts to define or update

### Route contract

- Public route: `/[locale]/articles/[slug]`
- Locale behavior: locale segment must resolve through existing public locale routing.
- Slug behavior: slug must match the public slug shape `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Lookup behavior: after locale and slug-shape validation, resolve the route slug in this order:
  1. requested-locale `article_localizations.slug`,
  2. configured default-locale `article_localizations.slug`,
  3. canonical `articles.slug`.
- Lookup candidates must still satisfy all public eligibility rules: `articles.status = "published"`, non-null `articles.published_at`, active category row, and required fields after fallback.
- If more than one candidate can match across tiers, choose the first tier in the precedence order that yields a public-eligible article. Same-tier duplicates should be impossible under current uniqueness constraints; if implementation detects them, return `not_found` and record the data issue in the task handoff.
- Rendered fields use requested-locale localization first, then configured default-locale localization. The canonical `articles.slug` may only fill the public slug field when no usable localization slug exists for the rendered locale/default-locale fallback.
- Required article fields after fallback: public slug, title, excerpt, and body. Each required field must be non-empty after trimming and null-byte removal; the public slug must also match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Not-found behavior: unsupported locale, invalid slug, missing article, inactive category, unpublished article, null `published_at`, or missing required fields after fallback.
- Right rail: may be absent or empty. Do not add placeholder, related-article, ad, newsletter, source-attribution, or explanatory modules.

### Data contract

The public detail DTO should be narrow and serialized:

- `id`
- `slug`
- `displaySlug`
- `locale`
- `title`
- optional `subtitle`
- `excerpt`
- `body`
- `category` with `configKey`, `slug`, `label`
- `publishedAt`
- optional `heroImageUrl`
- optional `metaTitle`
- optional `metaDescription`
- optional `keywords`
- `alternateSlugs`, a serialized record keyed by supported app locale, containing only route slugs that resolve this same public article for that locale under the lookup contract

Source attribution is not part of the required T002/T003 DTO or UI contract. Do not add `article_sources`/`source_items` joins or attribution rendering in this slice unless implementation proves the data is already available through the same public article query without broadening scope; if adding it would change query shape, UI scope, or QA scope, return to Architect instead.

The body rendering contract is plain text paragraph rendering. Treat persisted `body` as display text, not trusted HTML. Split sanitized text into paragraphs using blank-line boundaries, preserve ordinary line breaks inside paragraphs only if the component can do so without raw HTML injection, and let React escape text content. Do not use `dangerouslySetInnerHTML`, markdown-to-HTML conversion, or sanitized HTML rendering in M5.3 unless a later architecture decision explicitly changes the body storage/rendering contract.

### Metadata contract

For found article pages:

- `title`: localized `metaTitle`, else article `title`, optionally suffixed with site name through existing metadata conventions.
- `description`: localized `metaDescription`, else article `excerpt`, else site SEO description fallback.
- `openGraph.type`: `article`.
- `openGraph.publishedTime`: article `publishedAt` when supported by the local metadata helper.
- language alternates: build from `alternateSlugs`. For each supported locale, include an alternate only when that locale has a usable slug resolving this same public article and the article has required fields through that locale/default-locale fallback. Omit locales without a usable slug instead of pointing them at the requested route slug by assumption.

For not-found article pages:

- Use route-local not-found UI and noindex behavior consistent with existing public dynamic routes.

### Database contracts

No schema change is planned. Implementation must use existing tables:

- `articles`
- `article_localizations`
- `categories`
- optional `article_sources`
- optional `source_items`

If implementation discovers the route cannot be made performant or correct without a new index or schema change, stop and return to Architect with evidence.

### Frontend contracts

Create or update:

- `apps/web/src/app/(public)/[locale]/articles/[slug]/page.tsx`
- `apps/web/src/app/(public)/[locale]/articles/[slug]/not-found.tsx`
- `apps/web/src/app/(public)/[locale]/articles/[slug]/loading.tsx`
- `apps/web/src/app/(public)/[locale]/articles/[slug]/error.tsx`
- `apps/web/src/lib/public-article-detail.ts`
- `apps/web/src/lib/public-article-routing.ts`
- `apps/web/src/components/public/article-detail-content.tsx`
- `apps/web/src/components/public/article-card.tsx`
- `apps/web/src/components/public/article-list.tsx`

### Infrastructure contracts

No infrastructure change is planned.

## Task summary

| Task ID | Title                                           | Type                      | Owner          | Actor                | Status | Depends on     | Blocks      | Parallel group | Write scope |
| ------- | ----------------------------------------------- | ------------------------- | -------------- | -------------------- | ------ | -------------- | ----------- | -------------- | ----------- |
| T001    | Finalize article detail route/data contract     | contract                  | orchestrator   | architect            | qa_passed | []             | [T002,T003] | A              | docs-only   |
| T002    | Add public article detail read service          | backend                   | implementation | backend_developer    | qa_passed | [T001]         | [T003]      | B              | bounded     |
| T003    | Implement article detail route and page         | frontend                  | implementation | frontend_developer   | qa_passed | [T001,T002]    | [T004,T005] | C              | bounded     |
| T004    | Link public article cards to detail pages       | frontend                  | implementation | frontend_developer   | qa_passed | [T003]         | [T005]      | D              | bounded     |
| T005    | QA article detail route                         | qa                        | qa             | qa_reviewer          | qa_passed | [T002,T003,T004] | [T006]    | E              | docs-only   |
| T006    | Consolidate docs and milestone handoff          | knowledge_consolidation   | docs           | knowledge_curator    | implemented | [T005]         | []          | F              | docs-only   |

## Build order

1. T001 confirms the exact route, data, metadata, and fallback contracts before code changes.
2. T002 adds the backend/read-service contract and worker tests.
3. T003 adds the Next.js article route, page rendering, metadata, not-found behavior, web wrapper, and web tests.
4. T004 links existing public cards/lists to the new route and updates tests that previously asserted article routes were absent.
5. T005 runs focused QA, validation commands, and local route smoke checks.
6. T006 updates canonical docs, writes final handoff/closeout recommendations, and updates `docs/PROJECT_STATE.md` if the milestone result changes current state.

## Parallelization plan

Implementation should be mostly sequential because the frontend route consumes the backend DTO, and card linking depends on the route helper.

### Parallel groups

| Group | Tasks | Safe to run in parallel? | Reason |
| ----- | ----- | ------------------------ | ------ |
| A | T001 | Yes | Docs-only contract confirmation. |
| B | T002 | No with T003 | T003 consumes the DTO and service exported by T002. |
| C | T003 | No with T004 | T004 depends on the route helper and component behavior introduced by T003. |
| D | T004 | No with T003 | Both may touch public article components/tests. |
| E | T005 | No | QA requires implementation handoffs. |
| F | T006 | No | Knowledge consolidation depends on QA results. |

## Dependency routing rules

- Only dispatch tasks with status `ready`.
- Do not dispatch tasks with unmet `depends_on`.
- Do not run tasks in parallel if their `write_scope.allowed_paths` overlap unless Architect explicitly approves it.
- Do not run T003 until T002 defines and exports the public article detail DTO/service.
- Do not run T004 until the public article route helper exists.
- Do not run QA before all implementation task handoff files exist.
- If any task needs schema, migration, sitemap, robots, structured data, or production canonical changes, return to Architect instead of expanding scope.

## Risks

| Risk | Impact | Probability | Mitigation |
| ---- | ------ | ----------- | ---------- |
| Article slug policy is ambiguous between canonical article slug and localized slugs. | High | Medium | T001 must confirm lookup precedence and tests must cover requested-locale and default-locale fallback. |
| Public route exposes unpublished or incomplete content. | High | Medium | T002 service tests must cover status, `published_at`, inactive category, and missing required field exclusions. |
| Raw article body rendering introduces unsafe HTML behavior. | High | Low | Render stored body as text/paragraphs unless an existing sanitized body contract is proven. Do not use raw HTML injection without explicit contract. |
| Metadata alternates point to slugs that do not work in a locale. | Medium | Medium | Generate alternates only for supported locales with usable public slugs. |
| Existing tests expect article links to be absent. | Medium | High | T004 must update assertions to require links after the route is implemented. |
| Root web build remains unreliable. | Medium | High | Use focused checks for this milestone and document the missing root build evidence as residual release risk. |
| Next dev dynamic not-found status may return HTTP 200 with noindex markers. | Medium | Medium | QA must record status and body markers; production status remains a release-hardening follow-up if root build is still blocked. |

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
```

Broaden only if implementation crosses scope:

```powershell
pnpm --filter @topicpress/config test
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

Record the actual base URL and check representative paths:

- `/` redirects to `/en-gb`.
- `/en-gb` renders the English homepage and links article cards to `/en-gb/articles/<slug>` when local published data exists.
- `/uk-ua` renders the Ukrainian homepage and uses locale-aware article links when usable slugs exist.
- `/en-gb/categories/news` renders category article links when local published data exists.
- `/en-gb/articles/<published-slug>` renders article title and body for a published article.
- `/uk-ua/articles/<published-or-fallback-slug>` renders localized content or default-locale fallback according to contract.
- `/fr-fr/articles/example` returns not found for unsupported locale.
- `/en-gb/articles/Bad_Slug` follows not-found behavior for invalid slug shape.
- `/en-gb/articles/unknown-slug` follows not-found behavior.
- `/internal/editorial/review` remains reachable.

If local database state does not include a published article, QA must prepare fixture/local data through existing seed/review/publish workflows or document the smoke limitation.

### Required QA checks

- Verify all implementation task handoffs exist.
- Verify public route renders only published articles with non-null `published_at`.
- Verify requested-locale fields render when available.
- Verify default-locale fallback works for required fields.
- Verify not-found behavior for unsupported locale, invalid slug, unknown slug, inactive category, unpublished article, and missing required content.
- Verify article cards/lists now link to article detail routes.
- Verify no sitemap, robots, archive, structured data, comments, or right-rail modules were introduced.
- Verify docs are updated after implementation.

## Milestone acceptance criteria

This milestone is complete when:

- [x] All task YAML files exist under `docs/milestones/m5-3-public-article-detail-pages/tasks/`.
- [x] `/[locale]/articles/[slug]` exists and renders published article content.
- [x] Article detail reads are request-scoped, server-only, DTO-shaped, and read-only.
- [x] Public article detail reads filter out unpublished, null `published_at`, inactive-category, and incomplete records.
- [x] Requested-locale and default-locale fallback behavior is covered by tests.
- [x] Public list surfaces link to article detail pages.
- [x] Focused web and worker validation commands pass or failures are documented and accepted.
- [x] Local route smoke evidence is recorded.
- [x] Handoff files exist for all implementation tasks.
- [x] `docs/frontend/routes.md`, `docs/qa/test-strategy.md`, and `docs/PROJECT_STATE.md` are updated to reflect the delivered state.
- [x] `docs/milestones/m5-3-public-article-detail-pages/qa-report.md` records final QA result.
- [x] `docs/milestones/m5-3-public-article-detail-pages/closeout.md` records final outcome and next milestone recommendation.

## Resolved T001 questions

| Question | Owner | Needed by | Status |
| -------- | ----- | --------- | ------ |
| Should article lookup accept canonical `articles.slug` as a fallback when `article_localizations.slug` is absent? | architect | T001 | resolved yes; canonical slug is third-precedence compatibility fallback after requested-locale and default-locale localization slugs. |
| Should article source attribution appear on the detail page in this slice? | product/architect | T001 | resolved deferred; do not add attribution DTO/UI/joins unless already available without query, UI, or QA expansion. |
| Should body be rendered as paragraphized plain text or an existing sanitized rich-text format? | architect | T001 | resolved plain text paragraphs; no raw HTML, markdown-to-HTML, or sanitized HTML rendering in M5.3. |

## Notes for orchestrator

- Dispatch T001 first even though this plan already defines proposed contracts; T001 is the implementation-start checkpoint that confirms the plan is still correct.
- Prefer one implementation agent for T003 and T004 unless file conflict risk is explicitly reviewed.
- Do not let implementation tasks widen into sitemap/robots or structured data.
- Require handoffs after T002, T003, T004, T005, and T006.
- After QA pass, run T006 to consolidate docs and update project state before closeout.
