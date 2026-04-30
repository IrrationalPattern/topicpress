import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AiProviderConfigurationError,
  buildArticleGenerationInput,
  buildDraftPrompt,
  createDraftProvider,
  DraftValidationError,
  generateArticleDraft,
  parseArticleDraft,
  validateArticleDraft,
} from "../dist/index.js";

const now = new Date("2026-04-30T12:00:00.000Z");
const source = {
  sourceName: "OpenAI News",
  title: "New model release improves benchmark performance for developers",
  url: "https://openai.com/news/example-model-release",
  author: "OpenAI",
  publishedAt: "2026-04-29T10:30:00.000Z",
  excerpt:
    "OpenAI announced a model update with stronger benchmark results and new developer availability details.",
};

test("default generation uses deterministic fixture-backed drafts", async () => {
  const input = buildArticleGenerationInput(source, {
    categoryHint: "model_releases",
    keywordHints: ["model release", "benchmarks"],
  });

  const firstDraft = await generateArticleDraft(input, { now });
  const secondDraft = await generateArticleDraft(input, { now });

  assert.deepEqual(firstDraft, secondDraft);
  assert.equal(firstDraft.generation.mode, "fixture");
  assert.equal(firstDraft.generation.manualReviewRequired, true);
  assert.equal(firstDraft.generation.status, "review");
  assert.equal(firstDraft.generation.locale, "en-GB");
  assert.equal(firstDraft.category.key, "model_releases");
  assert.equal(firstDraft.category.slug, "model-releases");
  assert.equal(firstDraft.citations[0]?.url, source.url);
  assert.equal(firstDraft.lineage[0]?.sourceTitle, source.title);
  assert.match(firstDraft.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("prompt builder uses primary locale, editorial tone, and configured taxonomy", () => {
  const input = buildArticleGenerationInput(source);
  const prompt = buildDraftPrompt(input);

  assert.equal(input.locale, "en-GB");
  assert.equal(prompt.outputContract.locale, "en-GB");
  assert.ok(prompt.system.includes("neutral, concise, factual, expert_but_accessible"));
  assert.ok(prompt.user.includes("model_releases (model-releases): Model Releases"));
  assert.ok(prompt.outputContract.allowedCategoryKeys.includes("policy_safety"));
});

test("input builder rejects category hints outside the active taxonomy", () => {
  assert.throws(
    () =>
      buildArticleGenerationInput(source, {
        categoryHint: "made_up_category",
      }),
    /categoryHint: unknown active taxonomy category "made_up_category"/,
  );
});

test("structured validation rejects generated drafts with unknown categories", async () => {
  const input = buildArticleGenerationInput(source);
  const draft = await generateArticleDraft(input, { now });
  const invalidDraft = {
    ...draft,
    category: {
      key: "unapproved",
      slug: "unapproved",
      label: "Unapproved",
    },
  };

  const result = parseArticleDraft(invalidDraft);

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /draft\.category\.key/);
  assert.throws(() => validateArticleDraft(invalidDraft), DraftValidationError);
});

test("live providers are optional and must be explicitly env-gated", async () => {
  assert.equal(createDraftProvider({ env: {} }).mode, "fixture");
  assert.throws(
    () => createDraftProvider({ env: { TOPICPRESS_AI_PROVIDER: "live" } }),
    AiProviderConfigurationError,
  );

  const liveProvider = {
    id: "test-live-provider",
    mode: "live",
    async generateDraft() {
      return {
        title: "Live adapter draft",
        excerpt: "A live adapter returned a structured draft.",
        body: "A live adapter returned a structured draft for review.",
        keywords: ["live"],
        metaTitle: "Live adapter draft | AI Landscape Brief",
        metaDescription: "A live adapter returned a structured draft.",
        category: {
          key: "news",
          slug: "news",
          label: "News",
        },
        slug: "live-adapter-draft",
        citations: [
          {
            sourceName: source.sourceName,
            title: source.title,
            url: source.url,
          },
        ],
        lineage: [
          {
            kind: "source_item",
            sourceName: source.sourceName,
            sourceUrl: source.url,
            sourceTitle: source.title,
          },
        ],
        generation: {
          provider: "test-live-provider",
          mode: "live",
          locale: "en-GB",
          generatedAt: now.toISOString(),
          promptHash: "1234abcd",
          inputHash: "abcd1234",
          manualReviewRequired: true,
          status: "review",
          model: "test-model",
        },
      };
    },
  };

  const selectedProvider = createDraftProvider({
    env: {
      TOPICPRESS_AI_PROVIDER: "live",
      TOPICPRESS_AI_LIVE_ENABLED: "true",
    },
    liveProvider,
  });
  const input = buildArticleGenerationInput(source);
  const draft = await generateArticleDraft(input, {
    provider: selectedProvider,
    now,
  });

  assert.equal(draft.generation.mode, "live");
  assert.equal(draft.generation.model, "test-model");
});
