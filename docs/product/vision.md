# Topicpress Product Vision

## Purpose

Topicpress is a reusable AI-assisted news publishing platform for launching focused editorial websites around specific topics such as AI, K-Pop, gaming, biotech, fintech, climate, or other niche verticals.

The product is not a single publication. It is a shared publishing foundation where each deployment becomes one standalone site with its own brand, domain, database, content sources, taxonomy, editorial rules, SEO configuration, theme, and environment settings.

Topicpress exists to make niche publication launches repeatable: configure the site, connect trusted sources, generate reviewable article drafts, and render a technically sound public news site without forking the application for each vertical.

## Target Outcome

The target outcome is a platform that can power a network of independently deployed niche editorial sites from one codebase.

A new site should be launchable primarily through configuration, source setup, branding, and deployment values rather than custom application code. Each site should remain operationally isolated while sharing the same ingestion, article-production, public rendering, SEO, theming, and review-gated publishing systems.

## Product Goals

- Launch new topic-specific news sites quickly from a shared application foundation.
- Keep each publication isolated through its own deployment, domain, Supabase project, and operational database.
- Treat repo-owned configuration as the durable source of truth for site identity, locales, taxonomy, sources, editorial rules, theme tokens, and SEO defaults.
- Ingest trusted structured sources, normalize source items, cluster related coverage, and preserve traceability from published articles back to source material.
- Use AI to assist with article drafting, category assignment, locale-ready fields, and SEO metadata while keeping publication under human review for MVP.
- Render durable, indexable public pages with consistent metadata, canonical behavior, localization support, and site-specific visual identity.
- Keep MVP operations simple with database-backed worker execution and pipeline history before introducing dedicated queue infrastructure.

## MVP Scope

The MVP supports a single-site deployment model per publication, with configuration-driven setup and Supabase Postgres as the system of record for operational publishing state.

Core MVP capabilities are:

- per-site configuration for brand, domain, locales, categories, sources, editorial tone, theme tokens, and SEO defaults
- RSS ingestion from approved structured sources
- source-item normalization, persistence, and deduplication
- story clustering with at most one canonical article per cluster
- AI-assisted draft generation with source lineage, taxonomy assignment, SEO fields, and generation metadata
- manual review before publication
- public rendering for published content only
- localized public routing and listing pages
- database-backed worker execution with `pipeline_runs` history

## MVP Non-Goals

The MVP intentionally excludes:

- multi-tenant runtime infrastructure inside one shared production database
- automatic publication of generated articles without human review
- arbitrary scraping of unstructured websites
- social publishing automation
- comments, community features, or reader accounts
- large-team CMS workflows
- embeddings, vector search, or broad semantic retrieval
- dedicated queue infrastructure unless database-backed polling proves insufficient
- follow-up articles or multiple canonical editorial angles from one story cluster

## Deployment Model

Each publication is deployed as an independent instance of Topicpress with:

- its own Vercel project
- its own Supabase project and Postgres database
- its own domain
- its own environment variables
- its own site configuration

This model keeps the MVP operationally simple and isolates site data, failures, and configuration while preserving reuse of the shared monorepo, worker pipeline, database schema, and frontend component system.

## Current Status

As of the current project state dated 2026-05-20, Topicpress is in MVP implementation during the public site and SEO rendering phase.

Completed foundation work includes:

- monorepo foundation
- configuration-owned site setup and seed/sync flow
- Supabase/Drizzle schema foundation
- RSS ingestion into durable `source_items`
- clustering and fixture-backed draft generation
- review-gated publishing with live OpenAI draft generation available as an explicit, secret-gated path
- public homepage rendering
- public category pages

Current public routes include `/`, `/[locale]`, and `/[locale]/categories/[categorySlug]`. The internal editorial review surface exists at `/internal/editorial/review`.

Important remaining MVP surfaces include article detail pages, sitemap and robots support, archive or pagination if needed, structured article data, production canonical behavior, and release hardening. A known release risk remains that the root `pnpm build` hangs in the web build path, even though focused public-site checks have passed for completed slices.
