# Handoff - T001 Finalize generated image contract

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T001` |
| Type | contract |
| Owner | `orchestrator` |
| Actor | `architect` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: create the actual M5.5 planning artifacts for generated article hero images.

Scope: docs/planning only. Create the milestone plan, task graph, eight task YAMLs, T001 handoff, and ADR-007. Make only canonical docs updates needed to register the planned architecture state. Do not edit app, package, schema implementation, migration, or Supabase runtime files.

Dependencies: `AGENTS.md`, `docs/PROJECT_STATE.md`, architecture boundaries, database schema docs, secrets docs, QA strategy, frontend routes, existing M5.4 milestone examples, ADR-001, ADR-005, ADR-006, relevant code layout, and official OpenAI docs evidence.

Acceptance criteria: planning artifacts exist; T001 is marked implemented; other tasks are ready/pending by dependency; OpenAI Image API evidence is paraphrased; T003 must verify and pin `TOPICPRESS_OPENAI_IMAGE_MODEL` at implementation time, defaulting to `gpt-image-1.5` if available; ADR-007 records the durable architecture decision; no app/package/db code is edited; docs diff checks are run and reported.

## Decisions

| Topic | Decision |
| --- | --- |
| Provider | OpenAI only for MVP. No production fallback provider. |
| Image count | Exactly one generated hero image candidate per article. |
| Review gate | Generated candidate must be approved before public use. |
| Style policy | Prompts and review UI must treat output as editorial illustration, not fake photojournalism. |
| Data model | Prefer new `article_hero_image_candidates` table with one candidate per article in MVP. |
| Public pointer | Existing `articles.hero_image_url` remains the approved public image pointer. |
| Storage | Use private Supabase Storage for candidates and public Supabase Storage for approved images. |
| Disclosure | Public disclosure label is desired unless a later implementation task rejects it with product rationale. |
| Model pinning | T003 must verify current OpenAI docs and organization/model availability, then pin `TOPICPRESS_OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1.5` if available. |

## OpenAI evidence

Official docs checked:

- `https://developers.openai.com/api/docs/guides/image-generation`
- `https://developers.openai.com/api/reference/resources/images`
- `https://developers.openai.com/api/docs/models/gpt-image-1.5`

Evidence captured in the plan:

- Image API is the appropriate API for one image from one prompt.
- GPT Image model guidance includes `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`; prior/current indexed docs describe `gpt-image-1.5` as best overall quality where available.
- GPT image models return base64 image data by default.
- Organization verification may be required for GPT Image models.
- Current live docs may mention newer image model availability, so implementation must verify availability and must not hard-code a nonverified future model name from planning.

## Docs changed

| File | Change summary |
| --- | --- |
| `docs/milestones/m5-5-generated-article-hero-images/plan.md` | Added complete M5.5 plan with goal, non-goals, current/desired state, architecture impact, contracts, tasks, sequencing, risks, validation, QA gates, and acceptance criteria. |
| `docs/milestones/m5-5-generated-article-hero-images/task-graph.yaml` | Added task graph with statuses, dependencies, owners, write scopes, validation, and sequencing. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T001-finalize-generated-image-contract.yaml` | Added implemented T001 contract task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T002-add-hero-image-candidate-data-model.yaml` | Added ready database/storage contract task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T003-add-openai-image-provider.yaml` | Added ready OpenAI image provider task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T004-generate-and-store-hero-image-candidate.yaml` | Added pending worker candidate-generation task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T005-review-approval-and-publish-gate.yaml` | Added pending review/public-promotion gate task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T006-editorial-review-image-ui.yaml` | Added pending internal review UI/public disclosure task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T007-qa-generated-hero-images.yaml` | Added pending QA task. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T008-consolidate-docs-and-closeout.yaml` | Added pending docs closeout task. |
| `docs/milestones/m5-5-generated-article-hero-images/handoffs/T001-finalize-generated-image-contract-handoff.md` | Added this handoff. |
| `docs/architecture/adr/ADR-007-generated-article-hero-images.md` | Added accepted architecture decision for generated article hero images. |
| `docs/PROJECT_STATE.md` | Updated current planning state to register M5.5 as the planned next slice and ADR-007 as an accepted decision. |

## Validation and manual review

Manual review completed:

- Confirmed M5.4 artifact structure and status conventions.
- Confirmed public article pages already render optional `articles.hero_image_url`.
- Confirmed current review and publishing services are worker-owned.
- Confirmed current AI live provider is secret-gated and `packages/ai`-owned.
- Confirmed no production app, package, schema implementation, migration, or Supabase runtime files were edited.

Validation commands:

```powershell
git diff --check -- docs
rg --line-number "[ \t]+$" docs/milestones/m5-5-generated-article-hero-images docs/architecture/adr/ADR-007-generated-article-hero-images.md docs/PROJECT_STATE.md
```

Result: passed. `git diff --check -- docs` reported no whitespace errors, and `rg` found no trailing whitespace in the M5.5 docs package, ADR-007, or `docs/PROJECT_STATE.md`.

## Next dispatch

T002 and T003 are ready and may run in parallel after the orchestrator confirms no write-scope conflicts. T004 must wait for both T002 and T003 handoffs.
