# ADR-006 — Use database-backed worker execution for MVP

## Status

Accepted

## Context

Topicpress needs asynchronous work for RSS ingestion, normalization, deduplication, story clustering, AI generation, translation, SEO field generation, publication, retries, and operational recovery.

The architecture avoids a separate queueing platform for MVP. The schema includes `pipeline_runs` for execution history and visibility, but explicitly avoids treating it as a full queue abstraction in schema v1.

The unresolved choice was whether to introduce dedicated job scheduling or queue infrastructure before worker implementation.

## Decision

For MVP, use database-backed worker execution based on polling explicit state transitions and recording attempts in `pipeline_runs`.

The first worker implementation should not introduce Redis, BullMQ, hosted queue infrastructure, or a separate durable jobs table unless state polling proves insufficient.

`pipeline_runs` should remain execution history and operational visibility. It should record run type, status, attempt, timestamps, errors, and references to the relevant source, source item, cluster, or article.

Feed polling cadence, freshness cutoffs, retry/backoff values, and source failure thresholds are implementation policy and should be defined in the worker task or ingestion spec, not as separate architecture primitives.

## Alternatives considered

- Add Redis, BullMQ, or another dedicated queue for MVP.
- Add a durable jobs table before proving that state polling is insufficient.
- Use `pipeline_runs` as a scheduler or queue abstraction rather than execution history.

## Consequences

- MVP operational complexity stays low.
- Supabase Postgres remains the system of record for publishing state and worker visibility.
- Worker code must make state transitions idempotent so repeated polling or retries do not duplicate articles or corrupt status.
- The system should avoid overloading `pipeline_runs` as a scheduler; if scheduling needs grow, add a dedicated jobs table or queue through a later ADR and migration.
- Observability starts with structured run records and can later expand to metrics, traces, or queue dashboards if needed.

## Follow-up tasks

- None active.
