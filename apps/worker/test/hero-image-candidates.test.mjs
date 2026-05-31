import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generateHeroImageCandidateForArticleWithStore,
  publicHeroImageBucket,
} from "../dist/hero-image-candidates.js";

const now = new Date("2026-05-27T10:00:00.000Z");

test("generates, stores, and persists one public hero image", async () => {
  const store = createMemoryHeroImageCandidateStore();
  const provider = createProvider();
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    {
      now,
      provider,
      storage,
      createCandidateId: () => "candidate-1",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.outcome, "created");
  assert.equal(result.candidate.status, "generated");
  assert.equal(result.candidate.articleId, "article-1");
  assert.equal(result.candidate.provider, "openai");
  assert.equal(result.candidate.model, "fixture-image-model");
  assert.equal(result.candidate.storageBucket, publicHeroImageBucket);
  assert.equal(result.candidate.storagePath, "articles/article-1/candidate-1.webp");
  assert.equal(result.candidate.publicUrl, "https://storage.example.test/article-hero-images/articles/article-1/candidate-1.webp");
  assert.equal(store.candidates.length, 1);
  assert.equal(
    store.contexts.get("article-1").article.heroImageUrl,
    "https://storage.example.test/article-hero-images/articles/article-1/candidate-1.webp",
  );
  assert.equal(provider.calls.length, 1);
  assert.equal(provider.calls[0].prompt.outputContract.imageCount, 1);
  assert.equal(provider.calls[0].prompt.stylePolicy, "editorial_illustration");
  assert.equal(provider.calls[0].prompt.system.includes("not documentary photography"), true);
  assert.equal(provider.calls[0].prompt.user.includes("https://example.test"), false);
  assert.equal(provider.calls[0].prompt.user.includes("source-item-primary"), false);
  assert.deepEqual(storage.uploads.map((upload) => [upload.bucket, upload.path]), [
    [publicHeroImageBucket, "articles/article-1/candidate-1.webp"],
  ]);
  assert.equal(store.pipelineRuns[0].status, "succeeded");
  assert.equal(store.pipelineRuns[0].payload.outcome, "created");
});

test("explicit regeneration updates the current row and article hero URL", async () => {
  const store = createMemoryHeroImageCandidateStore({
    candidates: [candidate({ id: "candidate-existing", publicUrl: "https://storage.example.test/old.webp" })],
  });
  const provider = createProvider();
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1", regenerate: true },
    {
      now,
      provider,
      storage,
      createCandidateId: () => "generation-2",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.outcome, "regenerated");
  assert.equal(result.candidate.id, "candidate-existing");
  assert.equal(result.candidate.storagePath, "articles/article-1/generation-2.webp");
  assert.equal(result.candidate.publicUrl, "https://storage.example.test/article-hero-images/articles/article-1/generation-2.webp");
  assert.equal(store.candidates.length, 1);
  assert.equal(
    store.contexts.get("article-1").article.heroImageUrl,
    "https://storage.example.test/article-hero-images/articles/article-1/generation-2.webp",
  );
  assert.equal(provider.calls.length, 1);
  assert.equal(storage.uploads.length, 1);
  assert.equal(store.pipelineRuns[0].payload.outcome, "regenerated");
});

test("returns existing candidate without regenerating or reuploading", async () => {
  const existingCandidate = candidate({ id: "candidate-existing" });
  const store = createMemoryHeroImageCandidateStore({
    candidates: [existingCandidate],
  });
  const provider = createProvider();
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    { now, provider, storage },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.candidate.id, "candidate-existing");
  assert.equal(provider.calls.length, 0);
  assert.equal(storage.uploads.length, 0);
  assert.equal(store.candidates.length, 1);
  assert.equal(store.pipelineRuns[0].status, "succeeded");
  assert.equal(store.pipelineRuns[0].payload.outcome, "existing_candidate");
});

test("does not generate a candidate for an ineligible article", async () => {
  const store = createMemoryHeroImageCandidateStore({
    contexts: [articleContext({ article: { status: "draft" } })],
  });
  const provider = createProvider();
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    { now, provider, storage },
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "ineligible");
  assert.equal(result.error.code, "ineligible_article");
  assert.equal(provider.calls.length, 0);
  assert.equal(storage.uploads.length, 0);
  assert.equal(store.candidates.length, 0);
  assert.equal(store.pipelineRuns[0].status, "failed");
});

test("persists a secret-safe failed candidate when provider generation fails", async () => {
  const store = createMemoryHeroImageCandidateStore();
  const provider = createProvider({
    error: new Error("OpenAI rejected request with apiKey=sk-secret-value token=eyJabc.def.ghi"),
  });
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    {
      now,
      provider,
      storage,
      createCandidateId: () => "candidate-failed",
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "provider_failed");
  assert.equal(result.error.message.includes("sk-secret"), false);
  assert.equal(result.error.message.includes("eyJabc"), false);
  assert.equal(result.candidate.status, "failed");
  assert.equal(result.candidate.storagePath, null);
  assert.equal(result.candidate.reviewNotes.includes("sk-secret"), false);
  assert.equal(JSON.stringify(result.candidate.generationMetadata).includes("sk-secret"), false);
  assert.equal(storage.uploads.length, 0);
  assert.equal(store.pipelineRuns[0].status, "failed");
  assert.equal(JSON.stringify(store.pipelineRuns[0].payload).includes("eyJabc"), false);
});

test("persists a secret-safe failed candidate when public storage upload fails", async () => {
  const store = createMemoryHeroImageCandidateStore();
  const provider = createProvider();
  const storage = createStorage({
    error: new Error("Supabase upload failed service_role=eyJsecret.token.value"),
  });

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    {
      now,
      provider,
      storage,
      createCandidateId: () => "candidate-storage-failed",
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "storage_failed");
  assert.equal(result.error.message.includes("eyJsecret"), false);
  assert.equal(result.candidate.status, "failed");
  assert.equal(result.candidate.storagePath, null);
  assert.equal(store.candidates.length, 1);
  assert.equal(store.pipelineRuns[0].status, "failed");
  assert.equal(JSON.stringify(store.pipelineRuns[0]).includes("service_role=eyJsecret"), false);
});

test("honors an existing candidate found during the insert transaction", async () => {
  const existingCandidate = candidate({ id: "candidate-race" });
  let candidateFinds = 0;
  const store = createMemoryHeroImageCandidateStore({
    findCandidateByArticleId: async () => {
      candidateFinds += 1;
      return candidateFinds >= 2 ? existingCandidate : null;
    },
  });
  const provider = createProvider();
  const storage = createStorage();

  const result = await generateHeroImageCandidateForArticleWithStore(
    store,
    { articleId: "article-1" },
    {
      now,
      provider,
      storage,
      createCandidateId: () => "candidate-new",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.candidate.id, "candidate-race");
  assert.equal(store.candidates.length, 0);
  assert.equal(provider.calls.length, 1);
  assert.equal(storage.uploads.length, 1);
});

function createProvider(options = {}) {
  const calls = [];

  return {
    id: "fixture-provider",
    mode: "fixture",
    calls,
    async generateImage(request) {
      calls.push(request);

      if (options.error !== undefined) {
        throw options.error;
      }

      const bytes = new Uint8Array([1, 2, 3, 4, 5]);

      return {
        bytes,
        base64: Buffer.from(bytes).toString("base64"),
        metadata: {
          provider: "openai",
          mode: "fixture",
          model: "fixture-image-model",
          promptHash: "fixture-prompt-hash",
          stylePolicy: "editorial_illustration",
          contentType: "image/webp",
          width: 1536,
          height: 1024,
          sizeBytes: bytes.byteLength,
          outputFormat: "webp",
          generatedAt: request.now.toISOString(),
        },
      };
    },
  };
}

function createStorage(options = {}) {
  const uploads = [];

  return {
    uploads,
    async upload(input) {
      uploads.push(input);

      if (options.error !== undefined) {
        throw options.error;
      }

      return {
        bucket: input.bucket,
        path: input.path,
        publicUrl: `https://storage.example.test/${input.bucket}/${input.path}`,
        contentType: input.contentType,
        sizeBytes: input.bytes.byteLength,
      };
    },
  };
}

function createMemoryHeroImageCandidateStore(overrides = {}) {
  const contexts = new Map(
    (overrides.contexts ?? [articleContext()]).map((context) => [context.article.id, context]),
  );
  const candidates = (overrides.candidates ?? []).map((row) => candidate(row));
  const pipelineRuns = [];
  let nextRunId = 1;

  const tx = {
    findArticleContext: async (articleId) => contexts.get(articleId) ?? null,
    findCandidateByArticleId: async (articleId) => {
      if (overrides.findCandidateByArticleId !== undefined) {
        return overrides.findCandidateByArticleId(articleId);
      }

      return candidates.find((row) => row.articleId === articleId) ?? null;
    },
    insertCandidate: async (values) => {
      assert.equal(
        candidates.some((row) => row.articleId === values.articleId),
        false,
        "memory store enforces one candidate per article",
      );

      const inserted = candidate(values);
      candidates.push(inserted);

      return inserted;
    },
    updateCandidate: async (values) => {
      const currentCandidate = candidates.find((row) => row.id === values.candidateId);

      if (currentCandidate === undefined) {
        return null;
      }

      Object.assign(currentCandidate, {
        status: values.status,
        provider: values.provider,
        model: values.model,
        prompt: values.prompt,
        promptHash: values.promptHash,
        stylePolicy: values.stylePolicy,
        storageBucket: values.storageBucket,
        storagePath: values.storagePath,
        contentType: values.contentType,
        width: values.width,
        height: values.height,
        sizeBytes: values.sizeBytes,
        publicUrl: values.publicUrl,
        reviewNotes: values.reviewNotes,
        generationMetadata: values.generationMetadata,
        generatedAt: values.generatedAt,
        reviewedAt: values.reviewedAt,
        updatedAt: values.updatedAt,
      });

      return { ...currentCandidate };
    },
    setArticleHeroImageUrl: async (input) => {
      const context = contexts.get(input.articleId);

      if (context === undefined) {
        return null;
      }

      context.article.heroImageUrl = input.heroImageUrl;

      return { id: input.articleId, heroImageUrl: input.heroImageUrl };
    },
  };

  return {
    contexts,
    candidates,
    pipelineRuns,
    transaction: async (callback) => callback(tx),
    createPipelineRun: async (input) => {
      const run = {
        id: `pipeline-run-${nextRunId}`,
        status: "running",
        ...input,
      };
      nextRunId += 1;
      pipelineRuns.push(run);

      return { id: run.id };
    },
    finishPipelineRun: async (id, input) => {
      const run = pipelineRuns.find((entry) => entry.id === id);
      assert.notEqual(run, undefined);
      Object.assign(run, input);
    },
  };
}

function articleContext(overrides = {}) {
  return {
    article: {
      id: "article-1",
      status: "review",
      primaryLocale: "en-GB",
      heroImageUrl: null,
      storyClusterId: "cluster-1",
      ...(overrides.article ?? {}),
    },
    category: {
      id: "category-news",
      slug: "news",
      name: "News",
      isActive: true,
      ...(overrides.category ?? {}),
    },
    primaryLocalization: overrides.primaryLocalization ?? {
      locale: "en-GB",
      title: "AI regulation shifts in Europe",
      subtitle: "Policy and market response",
      excerpt: "European policymakers are testing a new framework for AI accountability.",
      body:
        "The article explains the policy shift without claiming a generated image depicts a real event. Source URL https://example.test/story and internal ID source-item-primary should be redacted.",
      keywords: ["ai", "regulation", "policy"],
    },
    sources: overrides.sources ?? [
      {
        sourceItemId: "source-item-primary",
        sourceName: "Fixture Source",
        title: "Primary source explains AI regulation",
        summary: "A policy summary.",
        contentText: "Full source text.",
        isPrimary: true,
      },
    ],
  };
}

function candidate(overrides = {}) {
  return {
    id: "candidate-1",
    articleId: "article-1",
    status: "generated",
    provider: "openai",
    model: "fixture-image-model",
    prompt: "System:\nCreate one review-gated hero image candidate.",
    promptHash: "fixture-prompt-hash",
    stylePolicy: "editorial_illustration",
    storageBucket: publicHeroImageBucket,
    storagePath: "articles/article-1/candidate-1.webp",
    contentType: "image/webp",
    width: 1536,
    height: 1024,
    sizeBytes: 5,
    publicUrl: "https://storage.example.test/article-hero-images/articles/article-1/candidate-1.webp",
    reviewNotes: null,
    generationMetadata: {},
    generatedAt: now,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
