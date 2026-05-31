# Handoff - T003 Add OpenAI image provider

## Task metadata

| Field | Value |
| --- | --- |
| Milestone | `m5-5-generated-article-hero-images` |
| Task | `T003` |
| Type | implementation |
| Actor | `backend_developer` |
| Status | Implemented |
| Date | `2026-05-27` |

## Required restatement

Goal: add the `packages/ai` foundation for one generated article hero image candidate.

Scope: `packages/ai` only for provider contracts, prompt building, deterministic fixture/test behavior, live OpenAI Image API behavior, exports, and focused tests. Narrow environment documentation was updated for the new image variables. No database, Supabase Storage, worker orchestration, frontend UI, or fallback production provider was added.

Dependencies: T001 contract and ADR-007, current `packages/ai` draft provider patterns, `docs/infrastructure/secrets.md`, and official OpenAI image docs.

Acceptance criteria: Image API generates exactly one image from one prompt; live provider is OpenAI-only and secret-gated; fixture provider is deterministic test mode only; prompt policy enforces editorial illustration and blocks fake photojournalism, likenesses, logos/product UI, and text; base64 is decoded to bytes and metadata is sanitized; tests cover success, config errors, live gate, timeout, invalid base64, and organization verification messaging.

## OpenAI docs consulted

Official docs checked on `2026-05-27`:

- `https://platform.openai.com/docs/guides/image-generation`
- `https://platform.openai.com/docs/api-reference/images`
- `https://platform.openai.com/docs/models/gpt-image-1.5`

Implementation used the Image API generation endpoint for the one-prompt/one-image MVP path. Current docs identify GPT Image models including `gpt-image-1.5`, and `gpt-image-1.5` remains the selected default for `TOPICPRESS_OPENAI_IMAGE_MODEL`. GPT Image models return base64 image data, so the provider decodes base64 server-side and returns bytes plus sanitized metadata. Organization verification remains an operational dependency for live GPT Image access.

## Files changed

| File | Change summary |
| --- | --- |
| `packages/ai/src/types.ts` | Added article hero image prompt, provider, candidate, metadata, size, format, and generation option types. |
| `packages/ai/src/image-prompt.ts` | Added prompt builder for editorial illustration hero images with no fake photojournalism, no real-person likenesses, no logos/product UI, no text, and no internal/source metadata. |
| `packages/ai/src/openai-image-provider.ts` | Added OpenAI Image API provider using `POST /images/generations`, `n=1`, default model `gpt-image-1.5`, base64 decoding, timeout handling, sanitized errors, and sanitized metadata. |
| `packages/ai/src/fixture-image-provider.ts` | Added deterministic fixture/test image provider that returns generated PNG bytes without network access. |
| `packages/ai/src/provider.ts` | Added image provider selection and `generateArticleHeroImage`, reusing `TOPICPRESS_AI_PROVIDER`, `TOPICPRESS_AI_LIVE_ENABLED`, `OPENAI_API_KEY`, and `TOPICPRESS_OPENAI_BASE_URL`; added image-specific model and timeout env handling. |
| `packages/ai/src/index.ts` | Exported image provider types, prompt builder, providers, defaults, and generation helpers. |
| `packages/ai/test/image-generation.test.mjs` | Added no-network tests for prompt policy, fixture determinism, env gating, OpenAI request shape, decoded bytes, invalid config, timeout, invalid base64, and org verification errors. |
| `packages/ai/package.json` | Wired image provider tests into the package test script. |
| `.env.example` | Added placeholder image model and image timeout variables. |
| `docs/infrastructure/secrets.md` | Documented image model and image timeout environment variables. |

## Provider contract

- Live provider: `OpenAIImageProvider`, `mode: "live"`, provider metadata `provider: "openai"`.
- Fixture/test provider: `FixtureOpenAIImageProvider`, `mode: "fixture"`, provider metadata still uses `provider: "openai"` so downstream candidate metadata can keep the MVP OpenAI-only provider contract while tests remain deterministic.
- Default image model: `gpt-image-1.5`.
- Default image size: `1536x1024`.
- Default live output format: `webp`.
- Default live quality: `medium`.
- Returned candidate includes `bytes`, `base64`, and metadata: provider, mode, model, prompt hash, style policy, content type, width, height, byte size, output format, generated timestamp, optional response id, and optional sanitized revised prompt.
- The provider has no database, storage, worker, or publication knowledge.

## Validation

Commands run:

```powershell
pnpm --filter @topicpress/ai run typecheck
pnpm --filter @topicpress/ai run lint
pnpm --filter @topicpress/ai test
pnpm --filter @topicpress/ai run build
```

Result: passed.

Initial lint run found one unused parameter in `packages/ai/src/openai-image-provider.ts`; it was removed and the focused checks were rerun successfully.

## Notes for T004 and QA

- Tests mock `fetch`; no live OpenAI call was made.
- Live image generation fails closed without `TOPICPRESS_AI_PROVIDER=live`, `TOPICPRESS_AI_LIVE_ENABLED=true`, and `OPENAI_API_KEY`.
- `TOPICPRESS_OPENAI_IMAGE_MODEL` is optional; when unset, the live provider uses `gpt-image-1.5`.
- `TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS` must be a positive integer when set.
- `TOPICPRESS_OPENAI_BASE_URL` is reused for optional base URL handling and should not be persisted if private.
- The fixture provider is test/local determinism only, not a production fallback.
