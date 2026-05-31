# Handoff - M5.5 amended contract doc alignment

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-05-28 |
| Milestone | `m5-5-generated-article-hero-images` |
| Type | architecture docs alignment |
| Scope | docs-only |

## Task Restatement

Goal: review M5.5 architecture and milestone docs for contradictions against the amended contract: one public `article-hero-images` bucket, explicit generate/regenerate during article review, generation updates `articles.hero_image_url` directly, and no image approval gate.

Scope: docs-only alignment under M5.5 milestone docs, ADR-007, and canonical database/secrets/project docs. No production code, migrations, package files, or Supabase state were changed.

Dependencies reviewed: `AGENTS.md`, `docs/PROJECT_STATE.md`, M5.5 plan, task graph, all M5.5 task YAMLs, ADR-007, `docs/database/schema.md`, `docs/infrastructure/secrets.md`, and supporting route/QA/boundary docs.

Acceptance criteria: active docs should not require private candidate buckets, approval promotion, approved-only public URLs, or image approval before article ready/publish. Historical pre-amendment handoffs should be clearly marked as superseded where they retain old implementation evidence.

## Changes

- Tightened ADR-007 wording from exactly one generated image to at most one current generated image record, with text-only publication allowed.
- Updated the M5.5 plan risk language to avoid implying an image approval step.
- Updated T001 and T006 task criteria to use one-current-image and generated-image language instead of one-candidate/approved-image language.
- Reframed `docs/database/schema.md` so the current `pending_review`/`approved` enum and approved-only `public_url` constraint are documented as stale implementation constraints, not the target contract.
- Added supersession notes to the historical T002, T004, T005, T006, and T007 handoffs and the QA report.

## Validation

Docs-only validation:

- `git diff --check -- docs`
- focused `rg` scans for private-bucket, approval, promotion, `pending_review`, approved-only URL, and direct-pointer terms across active M5.5 docs and canonical docs.

Package tests were not run because this pass changed documentation only.

## Residual Notes

Historical handoffs and the failed QA report intentionally still contain pre-amendment implementation details after their supersession notes. They should remain as evidence until implementation agents replace the failed private-candidate path.
