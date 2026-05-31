# Handoff - T005 Review approval and publish gate

Supersession note, 2026-05-28: this handoff documents the original image approval/promotion implementation. The active M5.5 contract removes image approve/reject promotion from the MVP path, permits article ready/publish without a generated image, and requires generation/regeneration to update `articles.hero_image_url` directly.

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T005` |
| Type | backend |
| Actor | `backend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: add worker-side review services for approving or rejecting the one generated hero image candidate, and enforce the ready/publish gate so articles do not newly go live without an approved generated hero image or an already-public hero image.

Scope: bounded worker changes in `apps/worker/src/article-review/`, `apps/worker/src/article-publishing/`, `apps/worker/src/hero-image-candidates/`, focused worker tests, task status markers, and this handoff. No frontend, schema, migration, `packages/ai`, or broad documentation files were changed.

Dependencies: T002 candidate table/status/storage contract, T004 private candidate generation/storage service, ADR-005 manual review before publication, and ADR-007 review-gated generated article hero images.

Acceptance criteria: approval promotes the private object to the public bucket and updates `articles.hero_image_url`; rejection records sanitized notes without setting `articles.hero_image_url`; only `pending_review` generated candidates can transition; failed/missing/private-object-missing candidates fail closed; ready/publish gates block missing or unapproved images; DTOs expose review-safe candidate data for T006 without private storage identifiers; worker validation passes.

## Implementation summary

| File | Change summary |
| --- | --- |
| `apps/worker/src/article-review/types.ts` | Added review-safe hero image candidate DTOs, approval/rejection result types, candidate validation issue codes, and store mutation contracts. |
| `apps/worker/src/article-review/drizzle-store.ts` | Loads the one candidate with article review data; updates candidate approval/rejection state; updates `articles.hero_image_url` after approval. |
| `apps/worker/src/article-review/service.ts` | Added `approveArticleHeroImageCandidate*` and `rejectArticleHeroImageCandidate*`; sanitizes notes/metadata; omits private bucket/path from DTOs; adds ready-gate validation for missing/unapproved/mismatched hero images. |
| `apps/worker/src/article-publishing/service.ts` | Applies the hero image ready gate to new ready-to-published transitions, while preserving already-published idempotent behavior for legacy published articles. |
| `apps/worker/src/hero-image-candidates/types.ts` | Added public approved bucket constant and promotion storage boundary types. |
| `apps/worker/src/hero-image-candidates/storage.ts` | Extended Supabase storage boundary with private download plus public upload promotion and deterministic public URL construction. |
| `apps/worker/src/hero-image-candidates/service-utils.ts` | Added shared sanitized review-note helper. |
| `apps/worker/test/article-review.test.mjs` | Added approve, duplicate approve, reject, missing/failed/private-object/storage-failure, ready-gate, and DTO leakage tests. |
| `apps/worker/test/article-publishing.test.mjs` | Added publish-gate tests for missing/unapproved/approved candidates plus already-published legacy idempotency. |
| `docs/milestones/m5-5-generated-article-hero-images/task-graph.yaml` | Marked T005 implemented. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T005-review-approval-and-publish-gate.yaml` | Marked T005 implemented. |

## Behavioral contract

- Approval is allowed only for `pending_review` candidates with private storage object metadata.
- Approval copies the candidate object into the public `article-hero-images` bucket through an injectable promotion storage boundary, sets candidate status to `approved`, records sanitized notes and `reviewed_at`, stores the approved public URL, and updates `articles.hero_image_url` to that exact URL.
- Duplicate approval of an already approved candidate is idempotent and does not copy storage again. If the article pointer is missing, the service restores it from the approved candidate URL.
- Rejection is allowed only for `pending_review` candidates. It sets status `rejected`, records sanitized notes and `reviewed_at`, and does not mutate `articles.hero_image_url`.
- Review DTOs expose candidate id, status, provider/model, prompt, prompt hash, style policy, dimensions, content type, size, sanitized metadata/notes, approved `publicUrl` only when approved, and `privatePreviewAvailable`. They do not expose private bucket names or object paths.
- Ready validation fails when no approved/generated candidate and no existing public hero image URL is present, when a candidate is pending/rejected/failed, when an approved candidate lacks `public_url`, or when `articles.hero_image_url` differs from the approved candidate `public_url`.
- New ready-to-published publication uses the same gate through article review validation.
- Already-published idempotent publish calls keep the pre-existing behavior and do not retroactively fail solely because legacy published articles lack generated hero image rows.

## Supabase storage notes

The promotion implementation uses the service-role boundary server-side only:

1. GET the private object from `article-hero-image-candidates`.
2. POST the same bytes to `article-hero-images`.
3. Return the stable public Storage URL for `articles.hero_image_url`.

Supabase docs checked during implementation: `https://supabase.com/docs/guides/storage/management/copy-move-objects`. Current docs confirm objects can be copied across buckets and that source select plus destination insert permissions are required. The worker implementation uses private download plus public upload to keep the existing no-SDK REST boundary from T004.

## Validation evidence

Passed:

```powershell
pnpm --filter @topicpress/worker run typecheck
pnpm --filter @topicpress/worker run lint
pnpm --filter @topicpress/worker run build
node test\article-review.test.mjs
node test\article-publishing.test.mjs
pnpm --filter @topicpress/worker run test
```

`pnpm --filter @topicpress/worker run test` completed the full worker package test script successfully, including the updated article review and publishing suites plus existing hero-image candidate tests.

## QA notes

- QA should verify real Supabase Storage promotion once local Supabase/Docker and buckets are available.
- QA should verify the private candidate bucket remains inaccessible publicly and only the approved public bucket URL appears in `articles.hero_image_url`.
- QA should verify T006 uses the review-safe DTO and does not expose private `storage_bucket` or `storage_path` to browser clients.
- The public copy happens before DB approval mutation. If DB persistence fails after a successful copy, the article pointer is not updated, but an orphaned public object may need operational cleanup.
