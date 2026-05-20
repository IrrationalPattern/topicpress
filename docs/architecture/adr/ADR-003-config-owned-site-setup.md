# ADR-003 — Keep durable site setup in repo configuration

## Status

Accepted

## Context

A new Topicpress site should be launchable primarily through configuration rather than application branching. Operational content state still belongs in Postgres.

The platform needs one typed source of truth for site identity, locale behavior, taxonomy, sources, editorial rules, theme, and SEO defaults so web, worker, and seed logic do not diverge.

## Decision

The repo-owned config package is the source of truth for durable site setup:

- site identity and domain
- locales and default locale
- category taxonomy seed
- approved source list
- editorial rules and prompt constraints
- theme tokens and visual configuration
- SEO defaults

Runtime registry tables such as `sources` and `categories` should be seeded or synced from config using stable `config_key` values.

## Alternatives considered

- Store durable site setup primarily in database tables.
- Hard-code site setup directly inside web or worker application code.
- Let each deployment branch customize application logic instead of configuration.

## Consequences

- Site onboarding can be reviewed and versioned in code.
- Seed/sync logic must be idempotent and should deactivate removed config entries instead of deleting referenced rows.
- Web, worker, and database seed code need typed access to the same validated config shape.
- Config changes can affect public rendering, worker behavior, and seed/sync behavior, so validation and tests must cover the shared contract.

## Follow-up tasks

- None active. The config package and config-driven seed/sync path have already been implemented as part of M1.
