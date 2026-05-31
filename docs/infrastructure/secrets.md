# Secrets and Environment Boundaries

## Purpose

This document defines where Topicpress secrets may live, which values are safe to document, and how agents should handle environment evidence.

Topicpress uses local Supabase, Postgres connection strings, and optional live OpenAI generation. Those values are required for local operation, but real credentials must never become project knowledge.

## Source of truth

- `.env.example` is the committed placeholder contract.
- `.env` and `.env.local` are ignored local files for real values.
- `README.md` documents local setup commands and placeholder-only examples.
- `docs/PROJECT_STATE.md` tracks high-level risks and current validation expectations.

Do not store real secrets in `docs/`, Obsidian, fixtures, screenshots, handoffs, QA reports, terminal transcripts, or committed config.

## Current environment variables

Committed placeholders in `.env.example`:

| Variable                       | Purpose                                                 | Secret?                             | Notes                                                  |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`         | Public web origin for metadata and local previews       | No                                  | Public by design. Local default is safe.               |
| `DATABASE_URL`                 | Local Postgres URL for Drizzle and app/worker DB access | Yes                                 | Contains database password when real.                  |
| `SUPABASE_DB_URL`              | Alternate local Postgres URL                            | Yes                                 | Same handling as `DATABASE_URL`.                       |
| `SUPABASE_URL`                 | Local Supabase API URL                                  | No for local                        | Public URL is not a credential.                        |
| `SUPABASE_ANON_KEY`            | Supabase anon key                                       | Treat as sensitive in docs/evidence | Placeholder only in committed files.                   |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase service-role key                               | Yes                                 | Never expose.                                          |
| `TOPICPRESS_AI_PROVIDER`       | AI provider mode, usually `fixture` or `live`           | No                                  | Live mode must be explicit.                            |
| `TOPICPRESS_AI_LIVE_ENABLED`   | Live-provider safety gate                               | No                                  | Must be `true` before live provider is allowed.        |
| `TOPICPRESS_OPENAI_MODEL`      | OpenAI model name                                       | No                                  | Model name is safe.                                    |
| `TOPICPRESS_OPENAI_TIMEOUT_MS` | OpenAI request timeout                                  | No                                  | Numeric config is safe.                                |
| `TOPICPRESS_OPENAI_IMAGE_MODEL` | OpenAI image model name                                | No                                  | Defaults to `gpt-image-1.5` for generated hero images. |
| `TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS` | OpenAI image request timeout                       | No                                  | Numeric config is safe.                                |
| `TOPICPRESS_OPENAI_BASE_URL`   | Optional OpenAI-compatible base URL                     | Treat as sensitive when private     | Do not paste private provider URLs into docs.          |
| `OPENAI_API_KEY`               | OpenAI service-account API key                          | Yes                                 | Keep only in ignored local env files or secret stores. |

M5.5 generated hero images use the image-provider variables above. The database contract recognizes only safe provider names, model names, prompt hashes, sanitized generation metadata, and storage object identifiers.

## Storage boundaries

Generated article hero images use Supabase Storage with one documented MVP bucket after the 2026-05-28 M5.5 amendment:

| Bucket | Access | Purpose |
| --- | --- | --- |
| `article-hero-images` | Public | Generated hero image binaries referenced by `articles.hero_image_url`. |

The amended MVP does not require a private `article-hero-image-candidates` bucket or approval-time promotion. The operator removed the old local private bucket on 2026-06-01 after M5.5 closeout; it is not part of the current runtime contract. Generated image metadata may persist public bucket/object identifiers for audit and regeneration workflows. Do not store or document OpenAI keys, Supabase service-role keys, raw provider responses containing secrets, or private signed URLs. Public pages must render images through `articles.hero_image_url`.

The M5.5 storage migration configures `article-hero-images` as public, with generated image MIME types limited to `image/png` and `image/webp` and a 10 MiB object size limit. Worker/server code may use service-role credentials to upload generated bytes; browser/client code must never receive service-role credentials.

## Local development rules

1. Copy `.env.example` to `.env` or `.env.local`.
2. Run local Supabase and copy generated local values from `pnpm supabase:status`.
3. Keep fixture-backed AI generation as the default:

   ```dotenv
   TOPICPRESS_AI_PROVIDER=fixture
   TOPICPRESS_AI_LIVE_ENABLED=false
   ```

4. Enable live OpenAI generation only when a task explicitly requires it and the operator has provided a local key:

   ```dotenv
   TOPICPRESS_AI_PROVIDER=live
   TOPICPRESS_AI_LIVE_ENABLED=true
   OPENAI_API_KEY=<local-openai-service-account-api-key>
   TOPICPRESS_OPENAI_IMAGE_MODEL=gpt-image-1.5
   ```

5. Never commit `.env`, `.env.local`, generated Supabase credentials, database passwords, service-role keys, or OpenAI keys.

## Runtime boundaries

- Browser/client code may read only `NEXT_PUBLIC_*` values.
- Server-side web modules may read server-only database URLs for typed read boundaries.
- Worker code may read database and provider settings required for ingestion, generation, review, and publish flows.
- Service-role keys must not be needed by public browser code.
- Live OpenAI generation must fail closed when credentials, provider mode, live gate, or response validation are missing or invalid.

## Documentation and QA evidence

Allowed in docs, handoffs, and QA reports:

- Environment variable names.
- Placeholder values such as `<local-db-password>` or `<local-openai-service-account-api-key>`.
- Local non-secret URLs such as `http://127.0.0.1:54321`.
- High-level statements that a key was present or missing.
- Redacted values such as `<redacted>` or `sk-...redacted`.

Not allowed:

- Full API keys.
- Full database connection strings with passwords.
- Supabase service-role keys.
- JWTs or generated local Supabase secrets.
- Private production URLs.
- Raw environment dumps.
- Screenshots that show secret-bearing terminal output.

## Agent responsibilities

- Before writing docs or QA evidence, redact secret-bearing command output.
- If a validation command prints secrets, summarize the result instead of pasting output.
- If a task requires a live key, state the missing dependency without asking the user to paste the key into chat.
- If a secret is accidentally committed or recorded, stop and escalate. Treat it as credential exposure requiring rotation, not just a docs cleanup.

## Related project risks

- Live OpenAI generation is opt-in and carries cost, availability, latency, and content-quality risk.
- Root build and release hardening are still open concerns; secret handling must be rechecked before deployment.
- Production environment and deployment secret storage are not finalized in the current MVP documentation.
