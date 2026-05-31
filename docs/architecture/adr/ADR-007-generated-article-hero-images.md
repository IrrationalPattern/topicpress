# ADR-007 - Generate generated article hero images

## Status

Accepted, amended 2026-05-28

## Context

Topicpress already generates review-gated article drafts and public article pages can render an optional `articles.hero_image_url`. Product now wants generated article hero images for MVP with these constraints:

- OpenAI only for MVP.
- No production fallback image provider.
- At most one current generated image record per article; articles may publish without a generated image.
- Expected volume is about five articles per day.
- Generated images should be reviewable during article review, with explicit regeneration on demand.
- Style must be editorial illustration, not fake photojournalism.
- Public disclosure label is desired unless rejected by a later task.
- Supabase Storage should hold generated article hero images.

The original ADR version used a private candidate bucket plus a public approved bucket. Product amended the MVP on 2026-05-28: store the generated image directly in the public hero-image bucket, let editors regenerate intentionally during review, and rely on the existing article publish gate to control whether the image appears on public article routes.

The existing architecture splits public rendering, worker operations, database schema, and AI provider code across `apps/web`, `apps/worker`, `packages/db`, and `packages/ai`. Public browser code must not access database clients, OpenAI secrets, service-role keys, or private storage paths.

## Decision

Add generated article hero images as a worker-owned pipeline with review-time regeneration.

Use OpenAI Image API for MVP image generation. T003 in M5.5 must verify current official OpenAI docs and account availability, then pin `TOPICPRESS_OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1.5` if available. Do not hard-code a nonverified future model name in planning or implementation.

Use one current generated hero image record per article for MVP. The existing `article_hero_image_candidates` table may be repurposed if that is the smallest migration path, but the target contract is no longer a private pending candidate awaiting promotion. The record should store provider/model metadata, prompt hash, style policy, public storage object metadata, sanitized generation metadata, optional regeneration/review notes, and timestamps.

Use one Supabase Storage bucket:

- public `article-hero-images` bucket for generated article hero images.

Keep `articles.hero_image_url` as the public image pointer. Hero image generation and regeneration update `articles.hero_image_url` to the newly generated public object URL. Public article routes still render only published articles, so the image is not shown through the site until the article itself is published.

Do not add a separate image approval/promotion step in MVP. Editorial review may regenerate the image, remove/replace the pointer if needed, or hold the article before publication. Article publication may proceed without a generated hero image.

The generated image style contract is editorial illustration. Prompts, review UI, and QA must reject fake photojournalism framing or any implication that a generated image is evidence from a real event.

## Alternatives considered

- Reuse only `articles.hero_image_url` without any metadata table. Acceptable for the smallest prototype, but not preferred because prompt/model metadata and regeneration evidence are useful for QA and debugging.
- Store generated images directly in a public bucket. Accepted for MVP after product amendment. The risk is that a generated image URL is technically reachable before publication if someone knows it, but public article routes still hide non-published articles and the generated images are editorial illustrations rather than sensitive source material.
- Use a private candidate bucket and public approved bucket. Originally accepted, then superseded because it added workflow and storage friction without enough MVP value.
- Add multiple candidate images per article. Rejected for MVP scope and cost; five articles/day does not justify the additional UI and selection complexity yet.
- Add a fallback provider. Rejected by product decision for MVP and because provider abstraction would expand testing and operational scope.
- Generate images inside public web requests. Rejected because long-running AI and storage writes belong to the worker runtime under ADR-001 and ADR-006.

## Consequences

- Database schema and migration cleanup are required because the already-built private-candidate contract no longer matches the target.
- Supabase Storage bucket setup is still part of the infrastructure contract, but only the public `article-hero-images` bucket is required.
- Internal review UI must expose the current generated image and a deliberate regenerate action.
- Public rendering remains simple because it continues to read `articles.hero_image_url`.
- QA must verify generation/regeneration, article publish behavior, public rendering from `articles.hero_image_url`, and the generated-image disclosure decision.
- OpenAI organization verification, model availability, latency, and cost become active implementation risks.
- Future private review workflows or multiple-candidate support would require a new task and likely schema changes.

## Follow-up tasks

- `docs/milestones/m5-5-generated-article-hero-images/tasks/T002-add-hero-image-candidate-data-model.yaml`
- `docs/milestones/m5-5-generated-article-hero-images/tasks/T003-add-openai-image-provider.yaml`
- `docs/milestones/m5-5-generated-article-hero-images/tasks/T004-generate-and-store-hero-image-candidate.yaml`
- `docs/milestones/m5-5-generated-article-hero-images/tasks/T005-review-approval-and-publish-gate.yaml`
- `docs/milestones/m5-5-generated-article-hero-images/tasks/T006-editorial-review-image-ui.yaml`
