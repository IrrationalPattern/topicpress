# Milestone Closeout — <milestone-id> <milestone-name>

## Closeout metadata

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| Milestone        | `<milestone-id>`                       |
| Target milestone | `<target_milestone>`                   |
| Final status     | Complete / Partial / Failed / Deferred |
| Date             | `<YYYY-MM-DD>`                         |
| Closed by        | `<agent/person>`                       |

## Original goal

Copy or summarize the goal from `plan.md`.

## Final outcome

Describe what was actually delivered.

## Delivered

- [ ] `<delivered item>`
- [ ] `<delivered item>`
- [ ] `<delivered item>`

## Not delivered

List anything planned but not completed.

- `<none>` or describe missing item.

## Task final status

| Task ID | Title     | Type     | Owner     | Actor     | Final status                            | Notes     |
| ------- | --------- | -------- | --------- | --------- | --------------------------------------- | --------- |
| T001    | `<title>` | `<type>` | `<owner>` | `<actor>` | closed / qa_passed / blocked / deferred | `<notes>` |
| T002    | `<title>` | `<type>` | `<owner>` | `<actor>` | closed / qa_passed / blocked / deferred | `<notes>` |

## Dependency and parallelization result

| Check                                | Result             | Notes |
| ------------------------------------ | ------------------ | ----- |
| Dependency graph followed            | Yes / No / Partial |       |
| Parallel groups were safe            | Yes / No / Partial |       |
| Write scopes were respected          | Yes / No / Partial |       |
| Blocked tasks were handled correctly | Yes / No / Partial |       |
| Related specs were updated           | Yes / No / Partial |       |
| Related issues were linked           | Yes / No / Partial |       |

## QA result

| Field                  | Value                                         |
| ---------------------- | --------------------------------------------- |
| QA report              | `docs/milestones/<milestone-id>/qa-report.md` |
| Final QA result        | Pass / Fail / Partial                         |
| Open critical findings | `<count>`                                     |
| Open high findings     | `<count>`                                     |
| Open medium findings   | `<count>`                                     |
| Open low findings      | `<count>`                                     |

## Validation summary

| Command          | Result                    | Notes     |
| ---------------- | ------------------------- | --------- |
| `pnpm typecheck` | Passed / Failed / Not run | `<notes>` |
| `pnpm lint`      | Passed / Failed / Not run | `<notes>` |
| `pnpm test`      | Passed / Failed / Not run | `<notes>` |
| `pnpm build`     | Passed / Failed / Not run | `<notes>` |

## Package-specific validation summary

| Command                                      | Result                    | Notes     |
| -------------------------------------------- | ------------------------- | --------- |
| `pnpm --filter <package-name> run typecheck` | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run lint`      | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run test`      | Passed / Failed / Not run | `<notes>` |
| `pnpm --filter <package-name> run build`     | Passed / Failed / Not run | `<notes>` |

## Important decisions made

List durable decisions made during the milestone.

| Decision     | Documented in ADR?    | Notes     |
| ------------ | --------------------- | --------- |
| `<decision>` | Yes / No / Not needed | `<notes>` |

## Architecture changes

Describe architecture changes made by this milestone.

- `<change>` or `<none>`

## Contract changes

### API

- `<change>` or `<none>`

### Database

- `<change>` or `<none>`

### Frontend

- `<change>` or `<none>`

### Infrastructure

- `<change>` or `<none>`

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

## Remaining risks

| Risk     | Impact              | Owner    | Suggested follow-up   |
| -------- | ------------------- | -------- | --------------------- |
| `<risk>` | High / Medium / Low | `<role>` | `<task or milestone>` |

## Follow-up tasks

| Task title | Reason     | Suggested milestone | Suggested role |
| ---------- | ---------- | ------------------- | -------------- |
| `<task>`   | `<reason>` | `<milestone>`       | `<role>`       |

## Lessons learned

What should be improved in agent orchestration?

Examples:

- Tasks were too broad.
- Acceptance criteria were unclear.
- QA needed more context.
- Handoff template missed important information.
- Parallel execution caused file conflicts.
- `AGENTS.md` needs a new rule.
- A reusable Skill should be added or updated.

## Updates recommended for agent system

### `AGENTS.md`

- `<recommended change>` or `<none>`

### Custom agents

- `<recommended change>` or `<none>`

### Skills

- `<recommended change>` or `<none>`

### Project docs

- `<recommended change>` or `<none>`

## Next milestone recommendation

Recommended next milestone:

```text
<milestone-id> — <milestone-name>
```

Reason:

> `<why this should be next>`

## Final closeout statement

One-paragraph final summary.

Example:

> Milestone `<milestone-id>` is complete. The implementation is tested, documented, QA-passed, and ready for the next milestone. Remaining follow-up work is documented above.
