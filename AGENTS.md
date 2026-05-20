# AGENTS.md

## Project knowledge source

The canonical project knowledge is in docs/.
Do not rely only on chat history.

Before starting any task, read:
1. docs/PROJECT_STATE.md
2. The assigned milestone plan
3. The assigned task YAML
4. Relevant domain docs under docs/

## Required behavior

- Restate task goal, scope, dependencies, and acceptance criteria before implementation.
- Stay inside task scope.
- Update docs when implementation changes architecture, API, database, frontend behavior, infrastructure, or QA strategy.
- Write a handoff after every implementation task.
- Run validation commands listed in the task file.
- Do not mark work complete without evidence.

## Done means

A task is complete only when:
- code is implemented,
- tests/checks pass or failures are documented,
- docs are updated if needed,
- handoff file is written,
- QA has enough context to verify the work.