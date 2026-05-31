# Closeout - M5.5 Generated Article Hero Images

Date: 2026-06-01

## Status

Final status: complete, ready for closeout QA.

M5.5 delivered the amended generated article hero image contract: OpenAI-only generated editorial illustrations, one current generated-image metadata row per article, public `article-hero-images` storage, direct `articles.hero_image_url` updates on generation/regeneration, no image approval/promotion gate, explicit internal review Generate/Regenerate controls, and public `AI-generated illustration` disclosure when generated-image provenance matches the public hero URL.

T007 QA passed on 2026-05-31 against article `b7bad77e-d888-4d50-8e95-133b23237361` at `http://localhost:3002/en-gb/articles/openai-trustworthy-third-party-ai-evaluations`.

## Validation Summary

T007 passed these milestone validation commands:

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

Live smoke evidence verified the published article rendered the generated WebP hero image from `article-hero-images`, rendered `AI-generated illustration`, used `openai` / `gpt-image-1.5`, had exactly one generated metadata row, and did not expose obvious OpenAI key, service-role, `sk-`, prompt, candidate-status, or private-storage leakage in public output. QA skipped an extra live regenerate click to avoid another cost-bearing OpenAI call; explicit regeneration is covered by worker tests and internal route/action smoke.

T008 docs validation:

```powershell
git diff --check -- docs
```

Result: passed. Git printed expected Windows line-ending warnings for touched docs, with no whitespace errors.

Supplemental trailing-whitespace scan over the changed docs and new untracked closeout/handoff files also passed.

## Residual Risks

- The old private `article-hero-image-candidates` bucket was removed from local Supabase by the operator on 2026-06-01 after M5.5 closeout. Current code and QA evidence use only `article-hero-images`.
- Historical handoffs intentionally retain superseded private-candidate and approval-promotion language for audit history. Active docs now point to the amended public-bucket regeneration contract.
- Root `pnpm build` remains outside this gate under the existing `root-web-build-hangs` risk. Focused M5.5 package checks passed.
- Live OpenAI image generation remains opt-in, cost-bearing, organization-verification dependent, and subject to model availability and latency.

## Next Recommendation

Prioritize release hardening before production indexability: repair `root-web-build-hangs`, replace the `.example` production-origin placeholder with the real production origin, and recheck production status/canonical behavior.
