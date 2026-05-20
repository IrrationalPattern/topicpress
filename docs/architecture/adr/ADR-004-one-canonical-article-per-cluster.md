# ADR-004 — Produce one canonical article per story cluster in MVP

## Status

Accepted

## Context

Topicpress uses story clusters to group related source items before article generation. The schema blueprint treats a story cluster as the unit selected for generation and recommends a unique `articles.story_cluster_id` constraint for MVP if only one canonical article may be produced from a cluster.

The unresolved choice was whether a cluster should always produce at most one canonical article in MVP, or whether the platform should allow multiple articles from the same cluster over time.

## Decision

For MVP, one story cluster may produce at most one canonical article.

The initial schema should enforce this with a unique relationship from `articles.story_cluster_id` to `story_clusters.id`.

If Topicpress later needs follow-up coverage, live updates, multiple editorial angles, or separate article types from one story cluster, that should be introduced as a new architecture decision and migration rather than supported implicitly in the first schema.

## Alternatives considered

- Allow multiple canonical articles from one story cluster in MVP.
- Allow follow-up articles or multiple editorial angles from the same cluster without a separate content model.
- Leave cluster-to-article cardinality unenforced and rely on worker behavior only.

## Consequences

- Deduplication remains strict and easy to reason about.
- Public article identity is simpler because one cluster cannot create competing canonical URLs.
- Source lineage stays straightforward: one generated article freezes the source set used from the cluster.
- Follow-up article workflows are deferred; they will require an explicit content model change if needed.
- Implementation tasks should treat duplicate generation attempts for an already-article-backed cluster as invalid or idempotent.

## Follow-up tasks

- None active.
