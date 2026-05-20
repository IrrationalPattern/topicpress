# ADR-001 — Use a monorepo with split web and worker runtimes

## Status

Accepted

## Context

Topicpress needs a public web surface, SEO endpoints, shared configuration, shared database code, AI boundaries, and long-running ingestion and generation work.

The platform also needs clear ownership boundaries so public rendering does not become coupled to failure-prone ingestion, clustering, AI generation, retries, or publication recovery.

## Decision

Use one pnpm/Turborepo monorepo with separate runtime packages:

- `apps/web` for Next.js pages, SEO endpoints, and lightweight editorial/admin surfaces.
- `apps/worker` for ingestion, normalization, deduplication, clustering, generation, translation, publishing, retries, and recovery.
- `packages/db`, `packages/config`, and `packages/ai` for shared boundaries.

The web app must not run long AI or content-generation work during page requests.

## Alternatives considered

- Separate repositories for web, worker, and shared packages.
- A single Next.js runtime that handles public rendering and all content pipeline work.
- A monorepo without explicit runtime boundaries between web and worker code.

## Consequences

- Shared types and validation can live in packages without duplicating code across services.
- Worker failures are isolated from public rendering.
- Task boundaries are clear for agents and future CI.
- Cross-package dependency discipline matters; web should read durable state and trigger background work only through explicit state changes or jobs.

## Follow-up tasks

- None active.
