# M5.5 Managed Implementation Correction Handoff

Date: 2026-05-28

## Goal

Coordinate a multi-agent correction pass over the already-implemented M5.5 work so it matches the amended generated-hero-image contract.

## Scope

Included:

- Database/storage metadata contract for one public `article-hero-images` bucket.
- Worker generate/regenerate behavior for one current generated image per article.
- Removal of image approval/promotion gates from ready and publish behavior.
- Internal review UI generate/regenerate controls.
- Public article generated-image disclosure.
- Focused package validation.

Excluded:

- Live OpenAI image generation.
- Browser-driven end-to-end smoke.
- Destructive cleanup of any leftover local `article-hero-image-candidates` bucket.
- Full M5.5 closeout.

## Agent Assignments

- `Schema`: DB schema, migration, Drizzle snapshot, local Supabase migration verification.
- `Core`: worker generation/regeneration, review/publish gates, worker tests.
- `Pixel`: internal review UI, public disclosure, web tests.
- `Check`: QA findings and remaining risks.
- `Vector`: architecture and milestone documentation alignment.

## Implementation Summary

- `article_hero_image_candidate_status` is now `generated | failed`.
- `article_hero_image_candidates` remains the one-current-image metadata table with a unique `article_id`.
- Successful generation/regeneration writes directly to public `article-hero-images`, persists the public URL, and updates `articles.hero_image_url`.
- Regeneration is explicit through review action flow; page reads do not generate images.
- Ready/publish validation no longer requires an approved/generated image.
- Internal review renders current image metadata and a Generate/Regenerate action.
- Public article detail renders an `AI-generated illustration` disclosure when public generated-image provenance matches the article hero URL.

## Validation Evidence

Passed:

- `pnpm --filter @topicpress/db build`
- `pnpm --filter @topicpress/db lint`
- `pnpm db:check`
- `.\node_modules\.bin\supabase.CMD migration list --local` showed `20260528202412` applied.
- `pnpm --filter @topicpress/worker run test`
- `pnpm --filter @topicpress/worker run lint`
- `pnpm --filter @topicpress/worker run build`
- `pnpm --filter @topicpress/web run test` after escalated rerun for `tsx`/esbuild spawn permissions.
- `pnpm --filter @topicpress/web run lint`
- `pnpm --filter @topicpress/web run typecheck`
- `git diff --check` passed with line-ending warnings only.

Known validation notes:

- Initial sandboxed web test failed with `spawn EPERM`; escalated rerun passed.
- Root `pnpm build` was not used because `root-web-build-hangs` remains a known project caveat.
- Live OpenAI and real browser smoke were not run.

## Remaining Risks

- Local Supabase can still contain a leftover private `article-hero-image-candidates` bucket from the superseded flow. Current code writes to `article-hero-images`; closeout should document or intentionally clean local residue.
- Historical handoffs still contain old private-candidate/approval-promotion details and are marked superseded by later amendment notes. T008 should consolidate them before milestone closeout.
- Real generated-image review flow still needs browser smoke: generate/regenerate in internal review, public article display, disclosure, and storage object visibility.

## Status

T002, T004, T005, and T006 are back to `implemented` after the correction pass. T007 remains `qa_failed` until the closeout smoke/documentation items above are completed.
