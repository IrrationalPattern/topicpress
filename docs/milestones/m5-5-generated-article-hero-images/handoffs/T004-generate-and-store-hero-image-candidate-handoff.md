# Handoff - T004 Generate and store hero image candidate

Supersession note, 2026-05-28: this handoff documents the original private-candidate generation path. The active M5.5 contract supersedes its private storage, `pending_review` success state, and "do not update `articles.hero_image_url`" behavior with direct public-bucket generation/regeneration that updates `articles.hero_image_url` on success.

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T004` |
| Type | backend |
| Actor | `backend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: add worker-owned generation and storage of exactly one generated hero image candidate for an article.

Scope: bounded worker implementation only. Add a worker service/store, storage boundary, exports, focused tests, task status updates, and this handoff. Do not edit `packages/ai`, `packages/db` schema/migrations, `apps/web`, or broad docs.

Dependencies: T002 candidate table with one-row-per-article invariant and `pending_review`/`failed` statuses; T003 OpenAI image provider and prompt builder; ADR-006 database-backed worker execution; ADR-007 review-gated generated hero image contract.

Acceptance criteria: at most one candidate per article; candidate bytes upload to private storage through an injectable boundary; successful rows persist as `pending_review`; provider/storage failures persist a sanitized `failed` candidate when possible; reruns return existing candidates without duplication; generated prompts follow editorial-illustration policy and avoid fake photojournalism/internal IDs/source URLs; `articles.hero_image_url` is never mutated; pipeline evidence is sanitized; worker tests are wired into `pnpm --filter @topicpress/worker test`.

## Implementation summary

Added a new `apps/worker/src/hero-image-candidates/` module:

| File | Change summary |
| --- | --- |
| `apps/worker/src/hero-image-candidates/service.ts` | Orchestrates candidate preflight, prompt construction, provider call, private storage upload, candidate persistence, idempotent existing-candidate return, failure persistence, and sanitized pipeline evidence. |
| `apps/worker/src/hero-image-candidates/drizzle-store.ts` | Implements article context reads, existing candidate lookup, candidate insert, and `pipeline_runs` create/finish using existing Drizzle patterns. |
| `apps/worker/src/hero-image-candidates/storage.ts` | Defines a testable storage boundary plus an optional Supabase Storage REST implementation using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. |
| `apps/worker/src/hero-image-candidates/types.ts` | Defines the narrow public service/store/storage/result contracts for T005/T006. |
| `apps/worker/src/hero-image-candidates/service-utils.ts` | Centralizes error and metadata sanitization for persisted failures and pipeline payloads. |
| `apps/worker/src/hero-image-candidates.ts` and `apps/worker/src/index.ts` | Export the narrow worker facade. |
| `apps/worker/test/hero-image-candidates.test.mjs` | Adds no-network tests for success, idempotency, ineligible article, provider failure, storage failure, duplicate-candidate race, and secret-safe persistence. |
| `apps/worker/package.json` | Wires the new test into the worker package test script. |

## Behavioral contract

- Eligibility is intentionally narrow in T004: article status must be `review`, `articles.hero_image_url` must be empty, and the primary localization must exist.
- Existing candidate rows are returned without provider calls or storage uploads.
- Successful generation persists `status = pending_review`, private `storage_bucket`, private `storage_path`, content metadata, prompt, prompt hash, model/provider metadata, and review-gated generation metadata.
- Failure after provider or storage errors persists `status = failed` when the article is eligible and no candidate already exists.
- Failure messages, review notes, generation metadata, and pipeline payloads redact API keys, JWT-like tokens, service-role strings, and secret-bearing URLs.
- Candidate generation does not update `articles.hero_image_url`, article status, review state, public URLs, or approved storage.
- The private object path is deterministic for auditability: `articles/<articleId>/<candidateId>.<ext>`.

## Pipeline evidence

T004 records hero image candidate generation through existing `pipeline_runs.run_type = generate`, matching the T002 handoff guidance to avoid expanding `pipeline_run_type`.

Payloads include operation name, article id, outcome, candidate id/status, provider/model, prompt hash, storage object identifiers, dimensions, and sanitized failure details. They intentionally do not include raw provider responses, API keys, service-role keys, signed URLs, or public promotion data.

## Supabase storage notes

The worker service accepts any `HeroImageCandidateStorage` implementation in tests and callers. The included Supabase implementation uses the documented private candidate bucket name `article-hero-image-candidates` and server-only service-role credentials.

Supabase docs checked during implementation:

- `https://supabase.com/docs/guides/storage`
- `https://supabase.com/docs/guides/storage/serving/downloads`
- `https://supabase.com/docs/guides/storage/uploads/s3-uploads`

No live Supabase Storage call was made in T004 validation.

## Validation evidence

Passed:

```powershell
pnpm --filter @topicpress/worker run typecheck
pnpm --filter @topicpress/worker run lint
pnpm --filter @topicpress/worker run build
node test/hero-image-candidates.test.mjs
pnpm --filter @topicpress/worker test
```

`pnpm --filter @topicpress/worker test` completed successfully with the new `hero-image-candidates.test.mjs` included in the package script.

## QA notes

- QA should verify a real Supabase Storage upload once local Supabase/Docker is available and the T002 migration has been applied.
- QA should verify the private candidate bucket is not public and that public routes still read only `articles.hero_image_url`.
- T004 intentionally does not implement approval/rejection or public bucket promotion; those remain T005.
- T004 intentionally does not add frontend preview or signed URL behavior; those remain T005/T006.
