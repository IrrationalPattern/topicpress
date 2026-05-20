# Handoff — <task-id> <task-title>

## Task metadata

| Field            | Value                           |
| ---------------- | ------------------------------- |
| Milestone        | `<milestone-id>`                |
| Target milestone | `<target_milestone>`            |
| Task             | `<task-id>`                     |
| Type             | `<task-type>`                   |
| Owner            | `<person-or-agent-owner>`       |
| Actor            | `<agent-role>`                  |
| Status           | Implemented / Blocked / Partial |
| Date             | `<YYYY-MM-DD>`                  |

## Summary

Briefly describe what was done.

Example:

> Implemented injectable database provider for backend services and added tests proving services can use a fake provider in test environments.

## Scope completed

- [ ] `<completed item>`
- [ ] `<completed item>`
- [ ] `<completed item>`

## Scope not completed

List anything from the task that was not completed.

- `<none>` or describe missing work.

## Files changed

| File     | Change summary   |
| -------- | ---------------- |
| `<path>` | `<what changed>` |
| `<path>` | `<what changed>` |

## Write scope check

| Field                        | Value    |
| ---------------------------- | -------- |
| Stayed inside allowed paths? | Yes / No |
| Touched forbidden paths?     | Yes / No |
| Scope expansion needed?      | Yes / No |

Notes:

> `<explain any scope issues>`

## Important implementation decisions

Document any decision another agent needs to know.

Examples:

- Chose constructor injection instead of module-level singleton replacement.
- Added a worker service boundary under `apps/worker/src/`.
- Did not modify schema because task scope excluded schema changes.

## Contract changes

Describe changes to API, database, frontend, infrastructure, or design contracts.

### API

- `<none>` or describe changes.

### Database

- `<none>` or describe changes.

### Frontend

- `<none>` or describe changes.

### Infrastructure

- `<none>` or describe changes.

## Related specs updated

- `<none>` or list changed spec files.

## Related issues

- `<none>` or list issue IDs/links.

## Tests added or updated

| Test file | Purpose                       |
| --------- | ----------------------------- |
| `<path>`  | `<what behavior it verifies>` |

## Validation run

| Command          | Result                    | Notes     |
| ---------------- | ------------------------- | --------- |
| `pnpm typecheck` | Passed / Failed / Not run | `<notes>` |
| `pnpm lint`      | Passed / Failed / Not run | `<notes>` |
| `pnpm test`      | Passed / Failed / Not run | `<notes>` |
| `pnpm build`     | Passed / Failed / Not run | `<notes>` |

## Package-specific validation run

| Command                                      | Result                    | Notes     |
| -------------------------------------------- | ------------------------- | --------- |
| `pnpm --filter <package-name> run typecheck` | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run lint`      | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run test`      | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run build`     | Passed / Failed / Not run | `<notes>` |

## Known issues

List known problems, incomplete items, flaky tests, or unresolved questions.

- `<none>` or describe issue.

## Follow-up tasks recommended

| Suggested task | Reason         | Suggested role |
| -------------- | -------------- | -------------- |
| `<task title>` | `<why needed>` | `<role>`       |

## Documentation updated

- [ ] `docs/PROJECT_STATE.md`
- [ ] `docs/architecture/`
- [ ] `docs/milestones/<milestone-id>/`
- [ ] `README.md`
- [ ] `packages/config/src/`
- [ ] `packages/db/src/schema/`
- [ ] `apps/web/src/`
- [ ] `apps/worker/src/`
- [ ] `supabase/`
- [ ] New contract docs introduced by this milestone
- [ ] Not needed

Explain:

> `<why docs were or were not updated>`

## QA focus

QA should specifically verify:

- `<focus area>`
- `<focus area>`
- `<focus area>`

## Agent notes

Any additional notes for future agents.

- `<note>`
