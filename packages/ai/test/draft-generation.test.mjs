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
  sourceItemId: "source-item-openai-release",
  sourceName: "OpenAI News",
  title: "New model release improves benchmark performance for developers",
  url: "https://openai.com/news/example-model-release",
  author: "OpenAI",
  publishedAt: "2026-04-29T10:30:00.000Z",
  excerpt:
    "OpenAI announced a model update with stronger benchmark results and new developer availability details.",
};
const supportingSource = {
  sourceItemId: "source-item-benchmark-brief",
  sourceName: "Benchmark Journal",
  title: "Independent benchmark brief tracks developer model performance",
  url: "https://example.com/benchmark-brief",
  author: "Benchmark Desk",
  publishedAt: "2026-04-29T12:00:00.000Z",
  excerpt:
    "A benchmark brief compares new developer model performance across common coding tasks.",
};
const clusterOptions = {
  storyClusterId: "story-cluster-model-release",
  primarySourceItemId: source.sourceItemId,
};

test("default generation uses deterministic fixture-backed drafts", async () => {
  const input = buildArticleGenerationInput(source, {
    ...clusterOptions,
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
  assert.equal(firstDraft.citations[0]?.sourceItemId, source.sourceItemId);
  assert.equal(firstDraft.citations[0]?.isPrimarySource, true);
  assert.equal(firstDraft.lineage[0]?.sourceTitle, source.title);
  assert.equal(firstDraft.lineage[0]?.sourceItemId, source.sourceItemId);
  assert.equal(firstDraft.lineage[0]?.storyClusterId, clusterOptions.storyClusterId);
  assert.equal(firstDraft.lineage[0]?.generationRunId, firstDraft.generation.generationRunId);
  assert.match(firstDraft.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("fixture drafts cite and track every clustered source item", async () => {
  const input = buildArticleGenerationInput([supportingSource, source], {
    storyClusterId: clusterOptions.storyClusterId,
    keywordHints: ["model release", "benchmarks"],
  });

  const draft = await generateArticleDraft(input, { now });
  const citationIds = draft.citations.map((citation) => citation.sourceItemId);
  const lineageIds = draft.lineage.map((entry) => entry.sourceItemId);

  assert.deepEqual(input.sourceItemIds, [
    supportingSource.sourceItemId,
    source.sourceItemId,
  ]);
  assert.equal(input.primarySourceItemId, supportingSource.sourceItemId);
  assert.deepEqual(citationIds, input.sourceItemIds);
  assert.deepEqual(lineageIds, input.sourceItemIds);
  assert.equal(draft.citations[0]?.isPrimarySource, true);
  assert.equal(draft.citations[1]?.isPrimarySource, false);
  assert.ok(draft.body.includes(clusterOptions.storyClusterId));
});

test("prompt builder uses primary locale, editorial tone, and configured taxonomy", () => {
  const input = buildArticleGenerationInput([source, supportingSource], clusterOptions);
  const prompt = buildDraftPrompt(input);

  assert.equal(input.locale, "en-GB");
  assert.equal(prompt.outputContract.locale, "en-GB");
  assert.ok(prompt.system.includes("neutral, concise, factual, expert_but_accessible"));
  assert.ok(prompt.user.includes("model_releases (model-releases): Model Releases"));
  assert.ok(prompt.user.includes("Story cluster id: story-cluster-model-release"));
  assert.ok(prompt.user.includes("Clustered source items:"));
  assert.ok(prompt.user.includes("- Source item id: source-item-openai-release"));
  assert.ok(prompt.outputContract.allowedCategoryKeys.includes("policy_safety"));
});

test("input builder rejects category hints outside the active taxonomy", () => {
  assert.throws(
    () =>
      buildArticleGenerationInput(source, {
        ...clusterOptions,
        categoryHint: "made_up_category",
      }),
    /categoryHint: unknown active taxonomy category "made_up_category"/,
  );
});

test("input builder requires cluster and durable source item identifiers", () => {
  assert.throws(
    () =>
      buildArticleGenerationInput({
        ...source,
        sourceItemId: "",
      }),
    /storyClusterId: expected non-empty string/,
  );
  assert.throws(
    () =>
      buildArticleGenerationInput(
        [
          source,
          {
            ...supportingSource,
            sourceItemId: source.sourceItemId,
          },
        ],
        clusterOptions,
      ),
    /duplicate source item id "source-item-openai-release"/,
  );
  assert.throws(
    () =>
      buildArticleGenerationInput([source, supportingSource], {
        ...clusterOptions,
        primarySourceItemId: "missing-source-item",
      }),
    /primarySourceItemId: expected one of provided source item ids/,
  );
});

test("structured validation rejects generated drafts with unknown categories", async () => {
  const input = buildArticleGenerationInput(source, clusterOptions);
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

test("structured validation rejects lineage without durable source ids", async () => {
  const input = buildArticleGenerationInput([source, supportingSource], clusterOptions);
  const draft = await generateArticleDraft(input, { now });
  const invalidDraft = {
    ...draft,
    lineage: draft.lineage.map(({ sourceItemId, ...entry }) => entry),
  };

  const result = parseArticleDraft(invalidDraft, { input });

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /draft\.lineage\[0\]\.sourceItemId/);
  assert.throws(() => validateArticleDraft(invalidDraft, { input }), DraftValidationError);
});

test("structured validation rejects lineage that omits clustered source items", async () => {
  const input = buildArticleGenerationInput([source, supportingSource], clusterOptions);
  const draft = await generateArticleDraft(input, { now });
  const invalidDraft = {
    ...draft,
    citations: draft.citations.slice(0, 1),
    lineage: draft.lineage.slice(0, 1),
  };

  const result = parseArticleDraft(invalidDraft, { input });

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /missing entry for source item id/);
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
            sourceItemId: source.sourceItemId,
            sourceName: source.sourceName,
            title: source.title,
            url: source.url,
            isPrimarySource: true,
          },
        ],
        lineage: [
          {
            kind: "source_item",
            sourceItemId: source.sourceItemId,
            storyClusterId: clusterOptions.storyClusterId,
            generationRunId: "live-run-123",
            sourceName: source.sourceName,
            sourceUrl: source.url,
            sourceTitle: source.title,
            isPrimarySource: true,
          },
        ],
        generation: {
          generationRunId: "live-run-123",
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
  const input = buildArticleGenerationInput(source, clusterOptions);
  const draft = await generateArticleDraft(input, {
    provider: selectedProvider,
    now,
  });

  assert.equal(draft.generation.mode, "live");
  assert.equal(draft.generation.model, "test-model");
});
