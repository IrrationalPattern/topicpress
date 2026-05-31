# Handoff - T008 Consolidate docs and closeout

Date: 2026-06-01

## Result

Status: implemented, ready for QA.

M5.5 is documented as complete after T007 `qa_passed`. Canonical docs now describe the amended delivered behavior instead of the superseded private-candidate approval/promotion path.

## Scope

Docs-only changes were made under the T008 write scope. No application code, package files, schema source, migrations, config files, or Supabase runtime state were edited.

## Docs Changed

| File | Why |
| --- | --- |
| `docs/PROJECT_STATE.md` | Marks M5.5 complete, moves next work to release hardening, and records residual risks. |
| `docs/database/schema.md` | Records the delivered `article_hero_image_candidates` enum/table contract, constraints, public bucket, and disclosure provenance boundary. |
| `docs/frontend/routes.md` | Records public generated hero image rendering and `AI-generated illustration` disclosure behavior. |
| `docs/infrastructure/secrets.md` | Records final image env/storage boundaries, public bucket constraints, service-role boundary, and post-closeout removal of the old local private bucket. |
| `docs/qa/test-strategy.md` | Adds generated hero image validation commands, public route expectations, internal review smoke expectations, and leakage checks. |
| `docs/milestones/m5-5-generated-article-hero-images/plan.md` | Marks T008 and milestone acceptance complete. |
| `docs/milestones/m5-5-generated-article-hero-images/task-graph.yaml` | Marks milestone closed and T008 implemented. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T008-consolidate-docs-and-closeout.yaml` | Marks T008 implemented. |
| `docs/milestones/m5-5-generated-article-hero-images/closeout.md` | Adds final status, validation summary, residual risks, and next recommendation. |
| `docs/milestones/m5-5-generated-article-hero-images/handoffs/T008-consolidate-docs-and-closeout-handoff.md` | Adds this handoff for QA continuity. |

## Evidence Used

- T007 QA report dated 2026-05-31.
- T007 handoff dated 2026-05-31.
- Managed correction handoff dated 2026-05-28.
- ADR-007 amended on 2026-05-28.
- Current schema/migration evidence for `generated | failed`, public `article-hero-images`, MIME/type constraints, and one-row-per-article invariant.

## Residual Risks

- Old local private `article-hero-image-candidates` bucket was removed by the operator on 2026-06-01 after closeout; current runtime contract uses `article-hero-images`.
- Historical handoffs still contain superseded private-candidate language but are marked as historical/superseded evidence.
- Root `pnpm build` remains blocked by `root-web-build-hangs` outside this milestone gate.
- Live OpenAI image generation remains opt-in and subject to cost, organization verification, model availability, and latency.

## Validation

Required docs validation:

```powershell
git diff --check -- docs
```

Result: passed. Git printed expected Windows line-ending warnings for touched docs, with no whitespace errors.

Supplemental trailing-whitespace scan over the changed docs and new untracked closeout/handoff files also passed.

## QA Focus

- Confirm no code, package, schema, migration, or infrastructure files were edited by T008.
- Confirm active docs agree that M5.5 is complete and uses the amended public-bucket regeneration model.
- Confirm residual risks match T007 plus the 2026-06-01 operator update: old private-bucket residue was removed locally, historical superseded handoffs remain, and the root build caveat remains.
