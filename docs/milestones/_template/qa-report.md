# QA Report — <milestone-id> <milestone-name>

## Report metadata

| Field            | Value                                |
| ---------------- | ------------------------------------ |
| Milestone        | `<milestone-id>`                     |
| Target milestone | `<target_milestone>`                 |
| QA agent         | `qa_reviewer`                        |
| Date             | `<YYYY-MM-DD>`                       |
| Final result     | Pass / Fail / Partial / Not reviewed |

## Scope reviewed

Describe what QA reviewed.

Include:

- milestone plan,
- task graph,
- task YAML files,
- implementation handoffs,
- changed files,
- validation results,
- documentation updates.

## Files and artifacts reviewed

| Artifact                                         | Reviewed? | Notes |
| ------------------------------------------------ | --------- | ----- |
| `AGENTS.md`                                      | Yes / No  |       |
| `docs/PROJECT_STATE.md`                          | Yes / No  |       |
| `docs/milestones/<milestone-id>/plan.md`         | Yes / No  |       |
| `docs/milestones/<milestone-id>/task-graph.yaml` | Yes / No  |       |
| `docs/milestones/<milestone-id>/tasks/`          | Yes / No  |       |
| `docs/milestones/<milestone-id>/handoffs/`       | Yes / No  |       |
| Changed production code                          | Yes / No  |       |
| Changed tests                                    | Yes / No  |       |
| Changed docs                                     | Yes / No  |       |

## Task review summary

| Task ID | Title     | Type     | Owner     | Actor     | Status     | QA result             | Notes     |
| ------- | --------- | -------- | --------- | --------- | ---------- | --------------------- | --------- |
| T001    | `<title>` | `<type>` | `<owner>` | `<actor>` | `<status>` | Pass / Fail / Partial | `<notes>` |
| T002    | `<title>` | `<type>` | `<owner>` | `<actor>` | `<status>` | Pass / Fail / Partial | `<notes>` |

## Dependency and routing review

| Check                                       | Result                | Notes |
| ------------------------------------------- | --------------------- | ----- |
| All `depends_on` relationships respected    | Pass / Fail / Partial |       |
| `blocks` relationships updated correctly    | Pass / Fail / Partial |       |
| Parallel execution was safe                 | Pass / Fail / Partial |       |
| Write scopes were respected                 | Pass / Fail / Partial |       |
| Related specs were updated where needed     | Pass / Fail / Partial |       |
| Related issues were referenced where needed | Pass / Fail / Partial |       |

## Acceptance criteria verification

| Acceptance criterion | Result                | Evidence                       |
| -------------------- | --------------------- | ------------------------------ |
| `<criterion>`        | Pass / Fail / Partial | `<file, test, or observation>` |
| `<criterion>`        | Pass / Fail / Partial | `<file, test, or observation>` |

## Validation commands

| Command          | Result                    | Evidence / Notes |
| ---------------- | ------------------------- | ---------------- |
| `pnpm typecheck` | Passed / Failed / Not run | `<notes>`        |
| `pnpm lint`      | Passed / Failed / Not run | `<notes>`        |
| `pnpm test`      | Passed / Failed / Not run | `<notes>`        |
| `pnpm build`     | Passed / Failed / Not run | `<notes>`        |

## Package-specific validation commands

| Command                                      | Result                    | Evidence / Notes |
| -------------------------------------------- | ------------------------- | ---------------- |
| `pnpm --filter <package-name> run typecheck` | Passed / Failed / Not run | `<notes>`        |
| `pnpm --filter <package-name> run lint`      | Passed / Failed / Not run | `<notes>`        |
| `pnpm --filter <package-name> run test`      | Passed / Failed / Not run | `<notes>`        |
| `pnpm --filter <package-name> run build`     | Passed / Failed / Not run | `<notes>`        |

## Findings

### Finding Q001 — <finding title>

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Severity       | Critical / High / Medium / Low     |
| Status         | Open / Fixed / Accepted / Deferred |
| Affected task  | `<task-id>`                        |
| Affected files | `<paths>`                          |

#### Problem

Describe the issue clearly.

#### Evidence

Reference the relevant file, behavior, command output, or missing artifact.

#### Reproduction steps

1. `<step>`
2. `<step>`
3. `<step>`

#### Expected behavior

Describe what should happen.

#### Actual behavior

Describe what actually happens.

#### Required fix

Describe the minimum fix required.

#### Suggested owner

`<role>`

---

## Regression risks

List possible regressions caused by this milestone.

| Risk     | Area                        | Suggested check |
| -------- | --------------------------- | --------------- |
| `<risk>` | `<frontend/backend/db/etc>` | `<check>`       |

## Documentation review

| Document                                       | Status                             | Notes |
| ---------------------------------------------- | ---------------------------------- | ----- |
| `docs/PROJECT_STATE.md`                        | Updated / Not updated / Not needed |       |
| `docs/architecture/`                           | Updated / Not updated / Not needed |       |
| `docs/milestones/<milestone-id>/`              | Updated / Not updated / Not needed |       |
| `README.md`                                    | Updated / Not updated / Not needed |       |
| `packages/config/src/`                         | Updated / Not updated / Not needed |       |
| `packages/db/src/schema/`                      | Updated / Not updated / Not needed |       |
| `apps/web/src/`                                | Updated / Not updated / Not needed |       |
| `apps/worker/src/`                             | Updated / Not updated / Not needed |       |
| `supabase/`                                    | Updated / Not updated / Not needed |       |
| New contract docs introduced by this milestone | Updated / Not updated / Not needed |       |

## QA conclusion

### Final result

Pass / Fail / Partial

### Summary

Explain why the milestone passed or failed QA.

### Required before closeout

- [ ] All high-severity findings fixed or explicitly accepted.
- [ ] All required validation commands passed or failures documented.
- [ ] All implementation handoffs exist.
- [ ] Docs updated where needed.
- [ ] `docs/PROJECT_STATE.md` updated if project state changed.
