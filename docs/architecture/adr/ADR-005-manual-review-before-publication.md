# ADR-005 — Require manual review before publication in MVP

## Status

Accepted

## Context

Topicpress generates article drafts with AI from ingested source material. The platform foundation requires configurable publication gates before articles go live, and the architecture defines the article lifecycle as `draft`, `review`, `ready`, `published`, and `failed`.

The unresolved choice was whether every generated article must pass manual review before publication, or whether some generated content could move directly from validation to published.

## Decision

For MVP, generated articles require manual review before publication.

The worker may ingest, cluster, generate drafts, classify categories, generate SEO fields, and create locale variants automatically. It must not publish generated articles directly to the live site by default.

The default publication path is:

1. Generated content enters `draft` or `review`.
2. Validation prepares it for editorial review.
3. A human review step moves acceptable content to `ready`.
4. Publication moves `ready` content to `published`.

Autopublish may be considered later as an explicit site policy or article-class policy, but it is out of scope for the MVP default path.

## Alternatives considered

- Allow generated articles to publish automatically after validation.
- Make autopublish the default and rely on post-publication correction.
- Treat validation gates as a substitute for human approval in MVP.

## Consequences

- AI publishing risk is lower during MVP launch.
- The admin/editorial surface needs enough capability to inspect, approve, reject, or hold generated drafts.
- The publish worker should treat `ready` as the publishable state, not raw generated output.
- Validation gates still matter, but they do not replace human approval in MVP.
- Future autopublish support must be intentionally designed, configured, and audited rather than emerging as a side effect of worker automation.

## Follow-up tasks

- None active. The M4 review-gated publishing milestone has already implemented and verified this path.
