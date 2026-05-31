# Milestone: m5-5-generated-article-hero-images - Generated Article Hero Images

## Status

Complete. Amended on 2026-05-28, T007 QA passed on 2026-05-31, and T008 documentation closeout completed on 2026-06-01.

T001 contract planning was implemented by the original artifact set. T007 later failed the private-candidate implementation path. Product amended the MVP on 2026-05-28 to remove the private candidate bucket and approval-promotion step in favor of one public hero-image bucket plus explicit regeneration during review. The amended implementation passed T007 QA on 2026-05-31 and T008 consolidated the milestone docs and closeout.

## Metadata

| Field | Value |
| --- | --- |
| Milestone ID | `m5-5-generated-article-hero-images` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Owner | `orchestrator` |
| Architect | `architect` |
| Created | `2026-05-27` |
| Last updated | `2026-06-01` |
| Related ADR | `docs/architecture/adr/ADR-007-generated-article-hero-images.md` |
| Related specs | `docs/database/schema.md`, `docs/frontend/routes.md`, `docs/infrastructure/secrets.md`, `docs/qa/test-strategy.md` |
| Related issues | `root-web-build-hangs` |

## Goal

Add generated hero images for generated articles.

The amended MVP path generates one current hero image for an article in review, stores it in the public `article-hero-images` bucket, updates `articles.hero_image_url`, exposes the image in the internal editorial review surface, and lets editors intentionally regenerate it during review. Public article pages continue to read `articles.hero_image_url`; because public routes expose only published articles, a review article's image is not shown by the public site until the article itself is published.

Expected MVP volume is about five generated articles per day, so the design optimizes for correctness, reviewability, and simple operations rather than high-throughput image pipelines.

## Non-goals

- Do not add production fallback image providers.
- Do not maintain multiple selectable candidate images per article in MVP.
- Do not add a separate image approval/promotion workflow in MVP.
- Do not use generated images to imply fake photojournalism, eyewitness photography, or real event capture.
- Do not change article text generation provider behavior except where image prompt context requires a typed boundary.
- Do not add archive, structured article data, ads, related articles, right rail content, comments, or social sharing.
- Do not add full production auth/RLS for editorial users unless a task proves it is required for storage access.
- Do not fix `root-web-build-hangs` in this milestone.

## Required Reading

Every agent working on this milestone must read:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/m5-5-generated-article-hero-images/plan.md`
- `docs/milestones/m5-5-generated-article-hero-images/task-graph.yaml`
- the assigned task YAML
- prior task handoffs for all dependencies

Domain docs and ADRs:

- `docs/architecture/boundaries.md`
- `docs/architecture/adr/ADR-001-monorepo-split-runtime.md`
- `docs/architecture/adr/ADR-005-manual-review-before-publication.md`
- `docs/architecture/adr/ADR-006-database-backed-worker-execution.md`
- `docs/architecture/adr/ADR-007-generated-article-hero-images.md`
- `docs/database/schema.md`
- `docs/frontend/routes.md`
- `docs/infrastructure/secrets.md`
- `docs/qa/test-strategy.md`

Relevant source areas before implementation:

- `packages/ai/src/openai-provider.ts`
- `packages/ai/src/provider.ts`
- `packages/ai/src/types.ts`
- `apps/worker/src/draft-creation/`
- `apps/worker/src/article-review/`
- `apps/worker/src/article-publishing/`
- `apps/web/src/lib/article-review.ts`
- `apps/web/src/app/(internal)/internal/editorial/review/`
- `apps/web/src/components/public/article-detail-content.tsx`
- `packages/db/src/schema/articles.ts`
- `packages/db/src/schema/relations.ts`
- `supabase/migrations/`

## Current State

- Articles already have `articles.hero_image_url`, and public article detail pages render that value as an optional hero image.
- Current generated drafts require manual review before publication.
- `packages/ai` owns live OpenAI draft-generation behavior, fixture behavior, prompt building, and response validation.
- `apps/worker` owns long-running generation, review, publication, and pipeline-run evidence.
- `apps/web` owns public rendering and the lightweight internal editorial review UI.
- The first M5.5 implementation path added private candidate storage, approval/promotion services, and review UI, but T007 failed that path because buckets were missing and the publish gate made images mandatory. Those implementation details now need revision to the amended contract.

## Desired State

- Each generated article has at most one current generated hero image record in MVP.
- The generated image is stored directly in the public `article-hero-images` Supabase Storage bucket.
- Generation and intentional regeneration update `articles.hero_image_url` to the latest generated public object URL.
- Human editorial review controls whether the article is published; there is no separate image approval/promotion step.
- Editors can intentionally regenerate the image during review.
- Article publication may proceed without a generated hero image.
- Public article detail pages continue to render only `articles.hero_image_url`.
- The internal editorial UI shows the current generated image, provider/model/style metadata, generation status, and a regenerate action.
- Public pages include a disclosure label for AI-generated hero images unless product explicitly rejects that requirement.

## Product Decisions

| Decision | Contract |
| --- | --- |
| Provider | OpenAI only for MVP. No production fallback provider. |
| Current image count | At most one current generated hero image per article in MVP. |
| Volume | Design around 5 articles/day. Batch throughput is not a driver. |
| Review model | Generated images are reviewed as part of article review; editors regenerate intentionally when needed. |
| Style policy | Editorial illustration, not fake photojournalism. |
| Disclosure | Public disclosure label is desired unless rejected by a later task. |
| Data model | Existing candidate table may be repurposed for current-image metadata; avoid adding another table unless revision proves it is cleaner. |
| Public pointer | Use existing `articles.hero_image_url` for the generated public URL. |
| Storage | Single public Supabase Storage bucket: `article-hero-images`. |

## OpenAI Docs Evidence

Official docs checked on `2026-05-27`:

- Image generation guide: `https://developers.openai.com/api/docs/guides/image-generation`
- Image API reference: `https://developers.openai.com/api/reference/resources/images`
- GPT Image 1.5 model page: `https://developers.openai.com/api/docs/models/gpt-image-1.5`

Planning evidence to carry into implementation:

- The OpenAI image generation guide says the Image API is the right choice when generating or editing a single image from one prompt. M5.5 generates one hero image from one prompt, so T003 should use the Image API generation endpoint rather than a conversational image tool.
- Official docs and recent indexed docs describe GPT Image models including `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`, with `gpt-image-1.5` described in prior/current model guidance as the best overall quality where available.
- The image API reference says GPT image models return base64 image data by default. T003/T004 must decode the base64 response server-side and write binary image data to Supabase Storage; implementation must not depend on a provider-hosted temporary URL for GPT image models.
- The image generation guide says API organization verification may be required before using GPT Image models.
- Current live docs also mention newer image model availability in some places. Do not hard-code a nonverified future model name during planning. T003 must verify current official docs and account availability at implementation time, then pin `TOPICPRESS_OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1.5` if available for the operator's verified organization.

## Architecture Impact

M5.5 adds a new generated-image pipeline beside article draft generation. It stays inside existing runtime boundaries:

- `packages/ai` owns the OpenAI image provider interface, image prompt construction helpers, response decoding/validation, and provider errors.
- `apps/worker` owns hero image generation/regeneration orchestration, idempotency, database writes, Supabase Storage writes, and pipeline-run evidence.
- `packages/db` owns the current-image metadata table or compatible revised candidate table, constraints, indexes, and migration.
- `apps/web` owns internal editorial review UI changes and public article disclosure rendering.
- Public browser/client code receives serialized DTOs and public image URLs only; it must never access service-role keys, Drizzle clients, OpenAI credentials, or raw provider responses.

### Data Flow

```text
article draft in review
  -> worker hero-image generator/regenerator
  -> packages/ai OpenAI Image API provider
  -> base64 image bytes decoded server-side
  -> public Supabase Storage object in article-hero-images
  -> articles.hero_image_url updated
  -> internal editorial review preview
  -> optional explicit regenerate action repeats generation
  -> article publish gate
  -> public article page renders hero image and disclosure
```

## Contracts

### Current Image Data Contract

The already-added `article_hero_image_candidates` table may be revised and repurposed as the current generated hero image metadata table if that is the smallest safe migration. Do not preserve private-candidate semantics just because the table name exists.

Required fields:

- `id`
- `article_id`
- `status`: target values should represent generated/current or failed states without requiring image approval before article publication
- `provider`: `openai`
- `model`
- `prompt`
- `prompt_hash`
- `style_policy`: expected `editorial_illustration`
- `storage_bucket`: expected `article-hero-images`
- `storage_path`
- `content_type`
- `width`
- `height`
- `size_bytes`
- `public_url`: the generated public object URL used to update `articles.hero_image_url`
- `review_notes` or `regeneration_notes`
- `generation_metadata`
- `generated_at`
- `reviewed_at` may be removed or left nullable if not useful after the approval step is removed
- `created_at`
- `updated_at`

Constraints:

- At most one current generated hero image row per article for MVP.
- A successful generated image row may have `public_url` immediately.
- `articles.hero_image_url` may be updated by generation/regeneration from the generated public URL.
- Candidate metadata must not store API keys, raw provider responses containing secrets, or private signed URLs.

### Storage Contract

- Required bucket: `article-hero-images`.
- The bucket is public because public article pages render `articles.hero_image_url`.
- No private candidate bucket is required in the amended MVP.
- Object paths must be deterministic enough for auditability and regeneration cleanup, such as `articles/<articleId>/<generationId>.<ext>` or a single stable current-object path if overwrite semantics are chosen.
- Regeneration should either overwrite the current object intentionally or write a new object and update `articles.hero_image_url`. The chosen behavior must be documented in the implementation handoff.

### OpenAI Provider Contract

- T003 must introduce a separate image provider contract instead of extending article draft text generation with image-specific behavior.
- Environment names:
  - `TOPICPRESS_OPENAI_IMAGE_MODEL`
  - `TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS`
  - reuse `OPENAI_API_KEY`
  - reuse live gate policy or introduce an image-specific gate only if T003 documents why the existing live gate is insufficient
- Default model is not hard-coded in docs beyond the T003 requirement to verify and pin at implementation time, defaulting to `gpt-image-1.5` if available.
- Request count must be `n=1`.
- Output format should be a web-renderable image format, preferably `webp` or `png`, with dimensions suitable for current article detail hero layout.
- Provider errors must be sanitized before database persistence, pipeline payloads, or handoffs.

### Prompt And Style Contract

Generated image prompts must request:

- editorial illustration
- topic-relevant visual metaphor or scene
- no fake press photography
- no claim that the image depicts the actual news event
- no realistic depiction of identifiable private people unless the source article contract and policy allow it
- no text-heavy layouts or synthetic logos
- no source URLs, internal IDs, or provider/debug metadata

### Review And Publish Contract

- Hero image generation does not change article publication status by itself.
- Hero image generation/regeneration updates `articles.hero_image_url`.
- Article publication may proceed without a generated hero image.
- No image approval step is required before article ready/publish.
- The internal review UI must expose a deliberate regenerate action; it must not regenerate on every page load.
- If an editor wants no generated image, the implementation may provide a remove/clear action or defer that to a later task, but publish must not be blocked solely because no hero image exists.

### Public Rendering Contract

- Public article pages render only `articles.hero_image_url`.
- Public article pages should not query image metadata tables unless a narrow server-side read is required for disclosure provenance.
- If public disclosure is retained, the implementation must provide a safe provenance field or metadata source that lets the public article page render `AI-generated illustration` without exposing secrets or raw provider metadata.

## Task Summary

| Task ID | Title | Type | Owner | Actor | Status | Depends on | Blocks | Parallel group |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T001 | Finalize generated image contract | contract | orchestrator | architect | implemented | [] | [T002,T003,T004,T005,T006] | A |
| T002 | Revise hero image metadata model | database | implementation | data_agent | implemented | [T001] | [T004,T005,T006,T007] | B |
| T003 | Add OpenAI image provider | implementation | implementation | backend_developer | implemented | [T001] | [T004,T007] | B |
| T004 | Generate/regenerate public hero image | backend | implementation | backend_developer | implemented | [T002,T003] | [T005,T006,T007] | C |
| T005 | Remove image approval gate and fix publish behavior | backend | implementation | backend_developer | implemented | [T002,T004] | [T006,T007] | D |
| T006 | Editorial review image UI regeneration flow | frontend | implementation | frontend_developer | implemented | [T002,T005] | [T007] | E |
| T007 | QA generated hero images | qa | qa | qa_reviewer | qa_passed | [T004,T005,T006] | [T008] | F |
| T008 | Consolidate docs and closeout | knowledge_consolidation | docs | knowledge_curator | implemented | [T007] | [] | G |

## Build Order

1. T001 freezes the contract and ADR.
2. T002 revises the schema/migration/storage contract away from private candidates and toward current generated-image metadata plus the single public bucket.
3. T003 adds the OpenAI image provider and model verification/pinning contract.
4. T004 wires generation/regeneration orchestration and public storage.
5. T005 removes image approval/promotion from the ready/publish gate and ensures publication can proceed without an image.
6. T006 updates internal review UI with current image preview/regeneration controls and public disclosure rendering if retained.
7. T007 performs focused QA across DB, AI, worker, web, storage, and route behavior.
8. T008 updates canonical docs, records residual risks, and closes the milestone if QA passes.

## Parallelization Plan

T002 and T003 may run in parallel after T001 because their write scopes are disjoint. T004 must wait for both. T005 depends on T004 and T002. T006 waits for the review DTO/action contract from T005. T007 and T008 are sequential.

## Risks

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| OpenAI model availability or organization verification blocks live calls. | High | Medium | T003 must verify official docs and account availability, document verification requirement, and fail closed with clear configuration errors. |
| Generated image implies fake event photography. | High | Medium | Prompt/style policy requires editorial illustration and review UI must show the style policy before publication. |
| Generated image URL is reachable before article publication if someone knows the object URL. | Medium | Medium | Accept for MVP; generated images are editorial illustrations, public routes still hide review articles, and editors can regenerate before publishing. |
| Regeneration happens accidentally or repeatedly. | High | Medium | T004/T006 must make regeneration an explicit action and record pipeline evidence. |
| Storage bucket policy is misconfigured. | High | Medium | T002/T004 define the public bucket setup and QA verifies generated URLs render only from `articles.hero_image_url` on public pages. |
| Cost/latency surprises. | Medium | Medium | Expected volume is five articles/day; T003 records model, size, quality, timeout, and cost evidence. |
| Root web build remains unreliable. | Medium | High | Use focused checks and record the existing root build caveat; release hardening remains separate. |

## Validation Commands

Milestone-level focused validation:

```powershell
pnpm --filter @topicpress/db build
pnpm db:check
pnpm db:migrate
pnpm --filter @topicpress/ai test
pnpm --filter @topicpress/worker test
pnpm --filter @topicpress/worker build
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Optional broadened validation when practical:

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

Do not use root `pnpm build` as the sole completion gate while `root-web-build-hangs` remains open.

## QA Gates

- Schema and migration match the amended current-image metadata contract.
- The public `article-hero-images` bucket exists and accepts generated image MIME types.
- Live OpenAI image generation is secret-gated, model-pinned, and organization-verification blockers are documented.
- At most one current generated hero image record per article is enforced.
- Generation/regeneration writes public storage and updates `articles.hero_image_url`.
- Regeneration is explicit and does not happen on page load.
- Article ready/publish is not blocked solely because no generated hero image exists.
- Internal review UI can preview the current image and trigger regeneration safely.
- Public article page renders the generated image and disclosure label if retained.
- No app/client code receives OpenAI keys, Supabase service-role keys, or raw provider responses.
- Handoffs exist for every implementation and QA task.

## Milestone Acceptance Criteria

- [x] Planning artifacts and ADR exist.
- [x] T001 contract handoff exists and records docs-diff evidence.
- [x] Current-image metadata table/constraints/indexes/migration and docs match the amended contract.
- [x] OpenAI image provider is implemented and tested.
- [x] Generation/regeneration stores one current public image pointer per article.
- [x] Publish gate permits text-only publication and does not require image approval.
- [x] Internal review UI supports image preview and intentional regeneration.
- [x] Public rendering shows generated hero images and disclosure if retained.
- [x] Focused validation commands pass or failures are documented and accepted.
- [x] T008 closeout documents final result and residual risks.

## Open Questions For Implementation

| Question | Owner | Needed by | Default |
| --- | --- | --- | --- |
| Exact migration/storage setup mechanism for the public bucket. | data/platform | T002 | `article-hero-images` public. |
| Whether regeneration overwrites one stable object or writes a new object and updates the URL. | backend/platform | T004 | Write a new object and update the URL unless cleanup complexity argues for overwrite. |
| Exact public disclosure copy and placement. | frontend/product | T006 | Short label near hero image. |
| Whether article publication should block when no generated image exists. | product/architect | T005 | Do not block publication. |
| Exact image model, size, output format, quality, and timeout. | backend | T003 | Verify current docs/account; default to `gpt-image-1.5` if available. |
