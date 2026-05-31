# Handoff - T006 Editorial review image UI

Supersession note, 2026-05-28: this handoff documents the original approve/reject UI. The active M5.5 contract replaces image approval controls with explicit generate/regenerate controls during article review and keeps public rendering tied to `articles.hero_image_url`.

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Task | `T006` |
| Type | frontend |
| Actor | `frontend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: expose generated hero image candidate review state in the internal editorial review detail UI and add approve/reject actions through the existing server-action boundary.

Scope: internal review route UI, web review wrapper actions, focused web tests, and this handoff. Public article pages continue to use existing `heroImageUrl` rendering only; no public route, schema, storage, worker, or OpenAI calls were added from web/browser code.

Dependencies: T004 generated candidate DTO/storage boundary, T005 approval/rejection services and validation blockers, ADR-007, current internal editorial review route, and existing web test patterns.

Acceptance criteria: internal review detail displays candidate status and safe metadata; pending/approved generated candidates show the `AI-generated illustration` disclosure; private candidate storage paths and secrets are redacted from rendered summaries; approve/reject controls call existing server actions; no live generation trigger is added to the review UI; public article detail does not infer generated-image disclosure from `heroImageUrl` alone; web tests/lint/typecheck pass.

## Files changed

| File | Change summary |
| --- | --- |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/page.tsx` | Added the hero image candidate panel to the internal article review detail sidebar. |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/hero-image-candidate-summary.tsx` | Added review-safe candidate preview/status/metadata rendering, validation blocker display, disclosure label, and redaction of private storage details. |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/hero-image-candidate-actions-panel.tsx` | Added approve/reject action forms using the existing review server action pattern. |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/actions.ts` | Routed `approve_hero_image` and `reject_hero_image` intents to worker-backed web wrappers. |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/review-action-state.ts` | Added hero image review intents. |
| `apps/web/src/app/(internal)/internal/editorial/review/[articleId]/review-actions-panel.tsx` | Exported shared action feedback rendering for the hero image action panel. |
| `apps/web/src/lib/article-review.ts` | Added server-only wrappers for approving/rejecting article hero image candidates. |
| `apps/web/test/internal-review-hero-image-ui.test.tsx` | Added static-render tests for pending, approved, missing, and failed candidate states. |
| `apps/web/test/public-article-detail-components.test.tsx` | Added regression coverage that public article detail does not infer generated-image disclosure without public metadata. |
| `apps/web/package.json` | Wired the new internal review hero image UI test into the package test script. |

## Validation

Commands run:

```powershell
pnpm --filter @topicpress/web test
pnpm --filter @topicpress/web lint
pnpm --filter @topicpress/web typecheck
```

Result: passed.

## Notes for QA

- The internal UI intentionally does not start generation; generation stays in the worker path.
- Pending private candidates do not expose private bucket/object paths or long-lived signed URLs in the review DTO rendering.
- Approved candidates render the approved public URL and disclosure label.
- Public article pages still only know about `heroImageUrl`; the disclosure label was not added to public pages in this task because public metadata does not yet distinguish generated images from other hero image sources.
