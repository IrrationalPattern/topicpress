# Handoff - T002 Add hero image candidate data model

Supersession note, 2026-05-28: this handoff documents the original private-candidate implementation. The active M5.5 contract supersedes its approved-only `public_url`, private candidate bucket, and image approval semantics with one public `article-hero-images` bucket, direct `articles.hero_image_url` updates during generation/regeneration, and no image approval gate.

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Target milestone | `M5 Public Site and SEO Rendering` |
| Task | `T002` |
| Type | database |
| Owner | `implementation` |
| Actor | `data_agent` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: add a first-class `article_hero_image_candidates` database model for exactly one generated hero image candidate per article.

Scope: bounded database/data-model work only. Update Drizzle schema/relations/exports, Supabase migration SQL and Drizzle migration metadata, database and secrets documentation, T002 status, and this handoff. Do not edit AI provider code, worker generation/review/publish code, frontend code, or unrelated docs.

Dependencies: T001 generated-image contract, ADR-007, M5.5 plan/task graph, current Drizzle schema under `packages/db/src/schema/`, and existing migration style under `supabase/migrations/`.

Acceptance criteria: Drizzle and SQL migration define the table; `article_id` references `articles.id`; one candidate per article is enforced; only approved candidates may carry `public_url`; provider/model/prompt hash/style/storage/content/audit/timestamp fields are represented; no secrets or private signed URLs are stored or documented; database and secrets docs describe the table and storage boundary; validation evidence is recorded.

## Data-model decisions

| Topic | Decision |
| --- | --- |
| Table | Added `article_hero_image_candidates`. |
| Status enum | Added `article_hero_image_candidate_status` with `pending_review`, `approved`, `rejected`, `failed`. `pending_review` is the generated-awaiting-review state requested for implementation and maps to the planning contract's generated candidate state. |
| One-candidate invariant | Enforced by unique index `article_hero_image_candidates_article_id_unique`. |
| Public URL gate | Enforced by check constraint `article_hero_image_candidates_public_url_approved_check`: `public_url` must be null unless status is `approved`. |
| Provider fields | Stored as generic `provider` and `model`; no production fallback provider-specific columns were added. |
| Storage fields | Private candidate bucket defaults to `article-hero-image-candidates`; approved public bucket is documented as `article-hero-images`. |
| Pipeline enum | Not expanded. Later worker tasks should record image generation through existing `pipeline_run_type = generate` payloads unless they explicitly justify a new enum. |
| Secret safety | Schema stores provider/model names, prompts, prompt hashes, storage object identifiers, and sanitized JSON metadata only. It does not store API keys, service-role values, or signed URLs. |

## Changed files

| File | Change summary |
| --- | --- |
| `packages/db/src/schema/enums.ts` | Added `article_hero_image_candidate_status` enum and TypeScript type export. |
| `packages/db/src/schema/articles.ts` | Added `articleHeroImageCandidates` table, constraints, indexes, relations source export, and infer types. |
| `packages/db/src/schema/relations.ts` | Added article-to-hero-candidate relation and candidate-to-article relation. |
| `supabase/migrations/0001_mysterious_jean_grey.sql` | Added enum, table, FK, unique article constraint, status index, and check constraints. |
| `supabase/migrations/meta/_journal.json` | Registered generated migration entry. |
| `supabase/migrations/meta/0001_snapshot.json` | Added Drizzle snapshot for the new schema state. |
| `docs/database/schema.md` | Documented enum, table, constraints, secret-safety contract, relationship, and public rendering boundary. |
| `docs/infrastructure/secrets.md` | Documented private candidate and public approved storage buckets plus signed-URL prohibition. |
| `docs/milestones/m5-5-generated-article-hero-images/task-graph.yaml` | Marked T002 implemented; left T003 ready. |
| `docs/milestones/m5-5-generated-article-hero-images/tasks/T002-add-hero-image-candidate-data-model.yaml` | Marked T002 implemented. |
| `docs/milestones/m5-5-generated-article-hero-images/handoffs/T002-add-hero-image-candidate-data-model-handoff.md` | Added this handoff. |

## Validation evidence

Passed:

```powershell
pnpm db:generate
pnpm --filter @topicpress/db build
pnpm --filter @topicpress/db typecheck
pnpm --filter @topicpress/db lint
pnpm db:check
git diff --check -- packages/db/src/schema supabase/migrations docs/database/schema.md docs/infrastructure/secrets.md docs/milestones/m5-5-generated-article-hero-images
```

Notes:

- `pnpm db:generate` first failed inside the sandbox with `spawn EPERM`; rerunning with approved escalation succeeded and generated `0001_mysterious_jean_grey.sql` plus `0001_snapshot.json`.
- `git diff --check` reported no whitespace errors. It printed expected Windows line-ending warnings for touched files.

Blocked:

```powershell
pnpm db:migrate
```

Result: blocked because local Supabase Postgres is not running on `127.0.0.1:54322`.

```text
failed to connect to postgres: failed to connect to `host=127.0.0.1 user=postgres database=postgres`: dial error (dial tcp 127.0.0.1:54322: connectex: No connection could be made because the target machine actively refused it.)
```

Follow-up check:

```powershell
pnpm supabase:status
pnpm supabase:status
```

The second status check was rerun with approved escalation. Both failed because the Docker engine pipe was unavailable:

```text
failed to inspect container health: error during connect: ... open //./pipe/docker_engine: The system cannot find the file specified.
```

Substitute evidence: Drizzle generated the migration from schema, `pnpm db:check` validated schema/migration metadata consistency, and the migration SQL was manually inspected for table, enum, FK, unique index, status index, positive metadata checks, and approved-only `public_url` check.

## QA notes

- QA should verify the migration applies once local Supabase/Docker is available.
- QA should verify the one-candidate invariant by attempting two rows with the same `article_id`.
- QA should verify `public_url` insert/update is rejected unless status is `approved`.
- QA should verify public DTO/routes never expose `article_hero_image_candidates.storage_bucket` or `storage_path`.
