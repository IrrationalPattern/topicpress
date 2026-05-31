import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AiProviderConfigurationError,
  buildArticleHeroImagePrompt,
  createImageProvider,
  generateArticleHeroImage,
  OpenAIImageProvider,
  OpenAIImageProviderError,
} from "../dist/index.js";

const now = new Date("2026-05-27T12:00:00.000Z");
const articleImageInput = {
  locale: "en-GB",
  title: "AI infrastructure groups publish new model deployment guidance",
  subtitle: "Operators weigh safety controls and developer demand.",
  excerpt:
    "AI infrastructure groups published new guidance for safer model deployment across developer platforms.",
  body:
    "The guidance focuses on deployment controls, evaluations, and release practices without naming a single private person.",
  categoryLabel: "Policy and Safety",
  keywordHints: ["deployment", "safety", "infrastructure"],
};

test("hero image prompt enforces editorial illustration safety policy", () => {
  const prompt = buildArticleHeroImagePrompt({
    ...articleImageInput,
    excerpt:
      "Read more at https://example.com/source and internal id 123e4567-e89b-12d3-a456-426614174000.",
  });

  assert.equal(prompt.stylePolicy, "editorial_illustration");
  assert.equal(prompt.outputContract.imageCount, 1);
  assert.equal(prompt.outputContract.size, "1536x1024");
  assert.equal(prompt.outputContract.outputFormat, "webp");
  assert.match(prompt.system, /not documentary photography/);
  assert.match(prompt.system, /Do not depict identifiable real people/);
  assert.match(prompt.system, /Do not include logos/);
  assert.match(prompt.system, /readable text/);
  assert.equal(prompt.user.includes("https://example.com/source"), false);
  assert.equal(prompt.user.includes("123e4567-e89b-12d3-a456-426614174000"), false);
});

test("default hero image generation uses deterministic fixture test provider", async () => {
  const firstImage = await generateArticleHeroImage(articleImageInput, { now });
  const secondImage = await generateArticleHeroImage(articleImageInput, { now });

  assert.equal(firstImage.base64, secondImage.base64);
  assert.deepEqual(firstImage.metadata, secondImage.metadata);
  assert.equal(firstImage.metadata.provider, "openai");
  assert.equal(firstImage.metadata.mode, "fixture");
  assert.equal(firstImage.metadata.model, "fixture-openai-image");
  assert.equal(firstImage.metadata.stylePolicy, "editorial_illustration");
  assert.equal(firstImage.metadata.contentType, "image/png");
  assert.equal(firstImage.metadata.width, 1536);
  assert.equal(firstImage.metadata.height, 1024);
  assert.equal(firstImage.metadata.sizeBytes, firstImage.bytes.byteLength);
  assert.equal(firstImage.bytes[0], 0x89);
});

test("live image providers are optional and must be explicitly env-gated", async () => {
  assert.equal(createImageProvider({ env: {} }).mode, "fixture");
  assert.throws(
    () => createImageProvider({ env: { TOPICPRESS_AI_PROVIDER: "live" } }),
    AiProviderConfigurationError,
  );
  assert.throws(
    () =>
      createImageProvider({
        env: {
          TOPICPRESS_AI_PROVIDER: "live",
          TOPICPRESS_AI_LIVE_ENABLED: "true",
        },
      }),
    /OPENAI_API_KEY/,
  );

  const liveProvider = {
    id: "test-openai-image-provider",
    mode: "live",
    async generateImage() {
      return {
        bytes: new Uint8Array([1, 2, 3]),
        base64: "AQID",
        metadata: {
          provider: "openai",
          mode: "live",
          model: "test-image-model",
          promptHash: "1234abcd",
          stylePolicy: "editorial_illustration",
          contentType: "image/webp",
          width: 1536,
          height: 1024,
          sizeBytes: 3,
          outputFormat: "webp",
          generatedAt: now.toISOString(),
        },
      };
    },
  };

  const selectedProvider = createImageProvider({
    env: {
      TOPICPRESS_AI_PROVIDER: "live",
      TOPICPRESS_AI_LIVE_ENABLED: "true",
    },
    liveProvider,
  });
  const image = await generateArticleHeroImage(articleImageInput, {
    provider: selectedProvider,
    now,
  });

  assert.equal(image.metadata.mode, "live");
  assert.equal(image.metadata.model, "test-image-model");
});

test("OpenAI image provider maps Image API base64 output into sanitized metadata", async () => {
  const imageBytes = new Uint8Array([1, 2, 3, 4, 5]);
  const imageBase64 = Buffer.from(imageBytes).toString("base64");
  let called = false;
  const provider = new OpenAIImageProvider({
    apiKey: "test-openai-api-key",
    model: "gpt-image-1.5",
    fetch: async (url, init) => {
      called = true;
      assert.equal(url, "https://api.openai.com/v1/images/generations");
      assert.equal(init.headers.authorization, "Bearer test-openai-api-key");

      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, "gpt-image-1.5");
      assert.equal(requestBody.n, 1);
      assert.equal(requestBody.size, "1536x1024");
      assert.equal(requestBody.quality, "medium");
      assert.equal(requestBody.output_format, "webp");
      assert.match(requestBody.prompt, /editorial illustration/);
      assert.match(requestBody.prompt, /No text in the image/);

      return new Response(
        JSON.stringify({
          id: "img_resp_test",
          data: [
            {
              b64_json: imageBase64,
              revised_prompt:
                "Editorial illustration prompt with https://example.com/source removed from metadata.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const image = await generateArticleHeroImage(articleImageInput, { provider, now });

  assert.equal(called, true);
  assert.deepEqual(image.bytes, imageBytes);
  assert.equal(image.base64, imageBase64);
  assert.equal(image.metadata.provider, "openai");
  assert.equal(image.metadata.mode, "live");
  assert.equal(image.metadata.model, "gpt-image-1.5");
  assert.equal(image.metadata.contentType, "image/webp");
  assert.equal(image.metadata.width, 1536);
  assert.equal(image.metadata.height, 1024);
  assert.equal(image.metadata.responseId, "img_resp_test");
  assert.equal(image.metadata.revisedPrompt.includes("https://example.com/source"), false);
});

test("OpenAI image provider rejects invalid model configuration", () => {
  assert.throws(
    () =>
      createImageProvider({
        env: {
          TOPICPRESS_AI_PROVIDER: "live",
          TOPICPRESS_AI_LIVE_ENABLED: "true",
          OPENAI_API_KEY: "test-openai-api-key",
          TOPICPRESS_OPENAI_IMAGE_MODEL: "",
        },
      }),
    /TOPICPRESS_OPENAI_IMAGE_MODEL/,
  );
});

test("OpenAI image provider rejects invalid timeout configuration", () => {
  assert.throws(
    () =>
      createImageProvider({
        env: {
          TOPICPRESS_AI_PROVIDER: "live",
          TOPICPRESS_AI_LIVE_ENABLED: "true",
          OPENAI_API_KEY: "test-openai-api-key",
          TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS: "0",
        },
      }),
    /TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS/,
  );
});

test("OpenAI image provider reports timeouts without returning partial image data", async () => {
  const provider = new OpenAIImageProvider({
    apiKey: "test-openai-api-key",
    timeoutMs: 1,
    fetch: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
  });

  await assert.rejects(
    () => generateArticleHeroImage(articleImageInput, { provider, now }),
    /timed out after 1ms/,
  );
});

test("OpenAI image provider rejects invalid base64 image data", async () => {
  const provider = new OpenAIImageProvider({
    apiKey: "test-openai-api-key",
    fetch: async () =>
      new Response(
        JSON.stringify({
          data: [{ b64_json: "not-base64!!" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  await assert.rejects(
    () => generateArticleHeroImage(articleImageInput, { provider, now }),
    OpenAIImageProviderError,
  );
});

test("OpenAI image provider reports organization verification blockers without raw response details", async () => {
  const provider = new OpenAIImageProvider({
    apiKey: "test-openai-api-key",
    fetch: async () =>
      new Response(
        JSON.stringify({
          error: {
            type: "organization_verification_required",
            message: "Full provider message should not be surfaced.",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
  });

  await assert.rejects(
    () => generateArticleHeroImage(articleImageInput, { provider, now }),
    (error) => {
      assert.ok(error instanceof OpenAIImageProviderError);
      assert.match(error.message, /organization_verification_required/);
      assert.match(error.message, /Verify the OpenAI organization/);
      assert.equal(error.message.includes("Full provider message"), false);
      return true;
    },
  );
});
