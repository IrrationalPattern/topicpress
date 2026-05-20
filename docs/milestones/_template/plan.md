# Milestone: <milestone-id> — <milestone-name>

## Status

Draft | Ready | In Progress | QA | Complete | Partial | Blocked

## Metadata

| Field            | Value                     |
| ---------------- | ------------------------- |
| Milestone ID     | `<milestone-id>`          |
| Target milestone | `<target_milestone>`      |
| Owner            | `<person-or-agent-owner>` |
| Architect        | `architect`               |
| Created          | `<YYYY-MM-DD>`            |
| Last updated     | `<YYYY-MM-DD>`            |
| Related specs    | `<paths-or-links>`        |
| Related issues   | `<issue-ids-or-links>`    |

## Goal

Describe the concrete outcome this milestone must deliver.

Example:

> Implement database dependency injection so backend services can use a testable database provider instead of directly importing a global database singleton.

## Non-goals

List what this milestone must not attempt to solve.

Examples:

- Do not redesign the full database schema.
- Do not implement authentication.
- Do not change production deployment configuration unless required.
- Do not modify unrelated frontend pages.

## Background

Explain why this milestone exists.

Include relevant context from:

- product requirements,
- current architecture,
- known technical debt,
- previous milestone closeouts,
- QA findings,
- user requirements.

## Required reading

Every agent working on this milestone should read:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/milestones/<milestone-id>/plan.md`
- `docs/milestones/<milestone-id>/task-graph.yaml`

Additional domain-specific docs:

- `docs/architecture/adr/`
- `README.md`
- `packages/config/src/`
- `packages/db/src/schema/`
- `apps/web/src/`
- `apps/worker/src/`
- `supabase/migrations/`

Remove docs that are not relevant to this milestone.

## Current state before milestone

Describe the current project state before work begins.

Include:

- relevant existing files,
- current architecture behavior,
- known bugs,
- missing contracts,
- test coverage state,
- risks from previous milestones.

## Desired state after milestone

Describe the state that should be true after this milestone is complete.

Include:

- user-visible behavior,
- architecture behavior,
- API/database/frontend/infrastructure changes,
- test expectations,
- documentation expectations.

## Scope

### In scope

- `<specific deliverable>`
- `<specific deliverable>`

### Out of scope

- `<specific non-goal>`
- `<specific non-goal>`

## Architecture impact

Describe whether this milestone changes architecture.

### Expected architecture changes

- TBD

### Architecture boundaries

Agents must respect these boundaries:

- Browser/client code must not directly access database code. Server-side web reads must stay inside typed route or read-boundary modules.
- Worker/backend services must respect the runtime boundary in `docs/architecture/adr/ADR-001-monorepo-split-runtime.md`.
- API contract changes must be reflected in the relevant route/server-action docs or a new `docs/api/` contract if the milestone introduces one.
- Database changes must be reflected in `packages/db/src/schema/`, `supabase/migrations/`, and a `docs/database/` contract if the milestone introduces one.
- Infrastructure changes must be reflected in `README.md`, `supabase/`, deployment config, or a new `docs/infrastructure/` contract if the milestone introduces one.

### Required ADRs

Create or update ADRs if this milestone introduces durable technical decisions.

Potential ADRs:

- `docs/architecture/adr/0001-<decision>.md`

## Contracts to define or update

List contracts that must be created or updated before implementation tasks proceed.

### API contracts

- `apps/web/src/app/` route handlers or server actions
- `docs/api/` if this milestone introduces an API contract doc

### Database contracts

- `packages/db/src/schema/`
- `supabase/migrations/`
- `docs/database/` if this milestone introduces a database contract doc

### Frontend contracts

- `apps/web/src/app/`
- `apps/web/src/components/`
- `apps/web/messages/`
- `docs/frontend/` if this milestone introduces a frontend contract doc

### Infrastructure contracts

- `README.md`
- `.env.example`
- `supabase/`
- `docs/infrastructure/` if this milestone introduces an infrastructure contract doc

## Task summary

| Task ID | Title          | Type           | Owner     | Actor             | Status | Depends on | Blocks | Parallel group | Write scope |
| ------- | -------------- | -------------- | --------- | ----------------- | ------ | ---------- | ------ | -------------- | ----------- |
| T001    | `<task title>` | contract       | `<owner>` | architect         | draft  | []         | [T002] | A              | docs-only   |
| T002    | `<task title>` | implementation | `<owner>` | backend_developer | draft  | [T001]     | []     | B              | backend     |

## Build order

Describe the expected execution order.

Example:

1. Define or update contracts.
2. Implement foundational backend changes.
3. Implement dependent frontend/infrastructure changes.
4. Add tests.
5. Run QA.
6. Consolidate documentation.
7. Close milestone.

## Parallelization plan

Tasks may run in parallel only when all are true:

- no dependency conflict,
- no likely same-file conflict,
- required contracts already exist,
- acceptance criteria are clear,
- each task has a handoff file,
- QA can verify each task independently.

### Parallel groups

| Group | Tasks      | Safe to run in parallel? | Reason                           |
| ----- | ---------- | ------------------------ | -------------------------------- |
| A     | T001       | Yes                      | Foundational contract task       |
| B     | T002, T003 | Maybe                    | Must verify file conflicts first |

## Dependency routing rules

The orchestrator must use the following rules:

- Only dispatch tasks with status `ready`.
- Do not dispatch tasks with unmet `depends_on`.
- Do not run tasks in parallel if their `write_scope.allowed_paths` overlap unless explicitly approved.
- Do not run tasks in parallel if one task writes a contract that another task consumes.
- Use `blocks` to identify tasks that become eligible after completion.
- Prefer `parallel_group` for batch planning, but dependency and write-scope checks override group assignment.
- If a task has unclear scope, return it to the Architect instead of guessing.

## Risks

| Risk     | Impact              | Probability         | Mitigation     |
| -------- | ------------------- | ------------------- | -------------- |
| `<risk>` | High / Medium / Low | High / Medium / Low | `<mitigation>` |

## Quality gates

The milestone cannot be marked complete until these checks are satisfied.

### Default validation commands

Use these when the whole repo should be validated:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Workspace-specific validation commands

Use these when only a package/workspace should be validated:

```bash
pnpm --filter <package-name> run typecheck
pnpm --filter <package-name> run lint
pnpm --filter <package-name> run test
pnpm --filter <package-name> run build
```

Replace `<package-name>` with the relevant workspace package.

### Required QA checks

- All task acceptance criteria are verified.
- No unresolved high-severity QA findings remain.
- Docs are updated.
- Handoffs exist for all implementation tasks.
- `docs/PROJECT_STATE.md` is updated if project state changed.
- Relevant ADRs are created or updated.
- Final milestone closeout is written.

## Milestone acceptance criteria

This milestone is complete when:

- [ ] All required task files exist.
- [ ] All implementation tasks are `qa_passed` or `closed`.
- [ ] All required validation commands pass, or failures are documented and accepted.
- [ ] QA report has final result `Pass`.
- [ ] Handoff files exist for all implementation tasks.
- [ ] Relevant docs are updated.
- [ ] `docs/PROJECT_STATE.md` is updated.
- [ ] Milestone closeout is complete.

## Open questions

| Question     | Owner           | Needed by          | Status |
| ------------ | --------------- | ------------------ | ------ |
| `<question>` | `<role/person>` | `<task/milestone>` | open   |

## Notes for orchestrator

- Do not dispatch tasks with status `draft`.
- Do not dispatch tasks with unmet dependencies.
- Do not run tasks in parallel if they may edit the same files.
- Check `write_scope` before parallel dispatch.
- After each implementation task, run QA.
- After QA pass, update task status.
- After a task batch or full milestone, run Knowledge Curator.
