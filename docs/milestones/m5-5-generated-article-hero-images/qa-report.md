# QA Report - M5.5 Generated Article Hero Images

## Status

Result: PASS

Date: 2026-05-31

T007 is closed as `qa_passed` against the amended M5.5 contract. The earlier 2026-05-28 failure report covered the superseded private-candidate/approval-promotion path and is superseded by this pass.

M5.5 is ready for T008 documentation consolidation and closeout. Root `pnpm build` remains outside this QA gate because `root-web-build-hangs` is a known project caveat.

## Task Restatement

Goal: validate generated article hero images end to end enough to unblock M5.5 closeout.

Scope: QA-only validation across database/migration state, Supabase Storage state, OpenAI image provider tests, worker generation/review/publish behavior, internal review UI, public article rendering, disclosure, and persisted metadata safety.

Acceptance criteria checked: exact command evidence recorded; public storage and generated image behavior verified; explicit generation/regeneration behavior verified by implementation tests and UI route smoke; public article generated-image disclosure verified; no high-severity finding remains unresolved before T008.

## Live Smoke Article

Public URL:

```text
http://localhost:3002/en-gb/articles/openai-trustworthy-third-party-ai-evaluations
```

Database evidence:

- Article id: `b7bad77e-d888-4d50-8e95-133b23237361`.
- Article status: `published`.
- `articles.hero_image_url` is set.
- Exactly one `article_hero_image_candidates` row exists for this article.
- Candidate status: `generated`.
- Candidate provider/model: `openai` / `gpt-image-1.5`.
- Candidate style policy: `editorial_illustration`.
- Candidate bucket/path: `article-hero-images` / `articles/b7bad77e-d888-4d50-8e95-133b23237361/a9ed2e13-0f7d-4e9a-baea-ae532a47afef.webp`.
- Candidate `public_url` exactly matches `articles.hero_image_url`.
- Candidate object metadata: `image/webp`, `1536x1024`, `1568408` bytes.

Pipeline evidence:

- Article draft generation pipeline run succeeded.
- Hero image generation pipeline run succeeded with outcome `created`.
- Publish pipeline run succeeded with outcome `published`.
- Pipeline payload scan found no obvious `OPENAI_API_KEY`, `service_role`, or `sk-` leakage for the article.

Storage evidence:

- `article-hero-images` exists and is public.
- Uploaded image URL returned HTTP 200.
- Uploaded image response headers: `Content-Type: image/webp`, `Content-Length: 1568408`, `Cache-Control: public, max-age=31536000, immutable`.
- During T007, local Supabase still contained the old private `article-hero-image-candidates` bucket as residue from the superseded implementation path. Current code and smoke evidence used only `article-hero-images`; this was non-blocking for T007. Operator update on 2026-06-01: the old local private bucket was removed after closeout.

Public route smoke:

- Public article route returned HTTP 200.
- Article title/content rendered.
- Hero image URL from `article-hero-images` appeared in the rendered page.
- `AI-generated illustration` disclosure appeared in the rendered page.
- Rendered page scan did not find obvious prompt, candidate-status, OpenAI key, service-role, or `sk-` leakage.

Internal review route smoke:

- Internal review detail route for the article returned HTTP 200.
- Generated image panel/action copy rendered.
- Public image URL appeared in the internal review detail.
- Rendered internal route scan did not find obvious OpenAI key, service-role, or `sk-` leakage.

## Validation Commands

Passed:

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

Notes:

- `pnpm db:migrate` reported the local database is up to date.
- `pnpm --filter @topicpress/web test` was run with elevated sandbox permission because `tsx`/esbuild must spawn a helper process on Windows.
- Live OpenAI image generation was already exercised by the operator-created article. QA did not trigger an extra live regenerate call to avoid additional cost; explicit regeneration behavior is covered by worker tests and the internal review UI route/action surface.

## Findings

No high-severity blockers remain.

Residual, non-blocking:

1. During T007, local storage still had the superseded private `article-hero-image-candidates` bucket. Current code writes to the public `article-hero-images` bucket. Operator update on 2026-06-01: the old local private bucket was removed after closeout.
2. Some older handoffs still include historical private-candidate/approval-promotion language. T008 should consolidate the milestone docs around the amended contract before final closeout.
3. Root `pnpm build` remains under the known `root-web-build-hangs` caveat and was not used as the M5.5 completion gate.

## Recommendation

Proceed to T008 consolidate-docs-and-closeout.
