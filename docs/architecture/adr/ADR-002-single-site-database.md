# ADR-002 — Use a single-site database per publication

## Status

Accepted

## Context

Topicpress launches independently deployed niche publications. The MVP does not need multi-tenant runtime infrastructure inside one shared production database.

Each site has its own brand, domain, source list, taxonomy, SEO configuration, visual identity, deployment, and operational publishing state.

## Decision

Each deployed publication uses its own Supabase project and operational Postgres database.

The MVP schema must not include runtime `sites`, `site_locales`, or `site_id` columns in content tables.

## Alternatives considered

- A shared multi-tenant production database with `site_id` on operational content tables.
- Runtime `sites` and `site_locales` tables in the MVP schema.
- A single shared Supabase project for multiple publications.

## Consequences

- Operational schema stays smaller and easier to reason about.
- Site identity, locales, taxonomy seeds, source seeds, editorial rules, theme tokens, and SEO defaults belong in repo-owned configuration.
- Per-site deployment isolation is favored over centralized multi-tenant complexity.
- Multi-tenant hosting can be reconsidered later as a new architecture decision if product needs change.

## Follow-up tasks

- None active.
