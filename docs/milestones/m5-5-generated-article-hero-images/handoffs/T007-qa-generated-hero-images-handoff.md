# Handoff - T007 QA Generated Hero Images

Date: 2026-05-31

## Result

QA result: PASS.

T007 is closed as `qa_passed` against the amended M5.5 generated hero image contract. The 2026-05-28 failed QA evidence covered the now-superseded private-candidate/approval-promotion implementation path.

## Scope

Validated:

- Database and migration state.
- Public Supabase Storage bucket state.
- OpenAI image provider tests and live generated-image evidence.
- Worker generation/review/publish behavior.
- Internal review detail route smoke.
- Public article route smoke.
- Generated-image disclosure.
- Persisted metadata and route output for obvious secret leakage.

Skipped:

- Extra live regeneration click, to avoid another cost-bearing OpenAI image call after the operator had already generated a real image successfully.
- Root `pnpm build`, because `root-web-build-hangs` remains a known project caveat outside the M5.5 gate.

## Evidence

Smoke article:

- Public URL: `http://localhost:3002/en-gb/articles/openai-trustworthy-third-party-ai-evaluations`
- Article id: `b7bad77e-d888-4d50-8e95-133b23237361`
- Article status: `published`
- Hero image status: `generated`
- Provider/model: `openai` / `gpt-image-1.5`
- Storage bucket: `article-hero-images`
- Public image URL matched `articles.hero_image_url`
- Public route returned HTTP 200, rendered the hero image, and rendered `AI-generated illustration`
- Storage object returned HTTP 200 as `image/webp`
- Internal review route returned HTTP 200 and rendered the generated-image panel/action surface
- Candidate row count for the article: `1`
- Pipeline payload scan found no obvious OpenAI key/service-role leakage

Commands passed:

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

## Remaining Non-Blocking Risks

- During T007, local Supabase still contained the old private `article-hero-image-candidates` bucket as residue. Current code and smoke evidence use `article-hero-images`. Operator update on 2026-06-01: the old local private bucket was removed after closeout.
- Older handoffs contain historical references to the failed private-candidate path. T008 should consolidate docs before milestone closeout.
- Root build remains covered by the separate `root-web-build-hangs` risk.

## Recommendation

Proceed to T008 documentation consolidation and milestone closeout.
