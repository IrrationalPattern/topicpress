import { randomUUID } from "node:crypto";

import {
  buildArticleHeroImagePrompt,
  createImageProvider,
  defaultOpenAiImageModel,
  stableHash,
  type ArticleHeroImageCandidate,
  type ArticleHeroImagePrompt,
} from "@topicpress/ai";

import type { TopicpressDatabase } from "../database.js";
import { readErrorMessage } from "../feed-errors.js";
import { truncateNormalizedText } from "../text-utils.js";
import { createDrizzleHeroImageCandidateStore } from "./drizzle-store.js";
import {
  sanitizeHeroImageCandidateErrorMessage,
  sanitizeHeroImageCandidateJson,
} from "./service-utils.js";
import { createSupabaseHeroImageCandidateStorage } from "./storage.js";
import type {
  GenerateHeroImageCandidateInput,
  GenerateHeroImageCandidateOptions,
  GenerateHeroImageCandidateResult,
  HeroImageCandidateArticleContext,
  HeroImageCandidateFailure,
  HeroImageCandidateFailureCode,
  HeroImageCandidateRecord,
  HeroImageCandidateSourceContext,
  HeroImageCandidateStore,
  HeroImageCandidateStorage,
  HeroImageCandidateJsonObject,
} from "./types.js";
import { publicHeroImageBucket } from "./types.js";

const defaultAttempt = 1;
const maxBodySummaryLength = 640;

export async function generateHeroImageCandidateForArticle(
  db: TopicpressDatabase,
  input: GenerateHeroImageCandidateInput,
  options: GenerateHeroImageCandidateOptions = {},
): Promise<GenerateHeroImageCandidateResult> {
  return generateHeroImageCandidateForArticleWithStore(
    createDrizzleHeroImageCandidateStore(db),
    input,
    options,
  );
}

export async function generateHeroImageCandidateForArticleWithStore(
  store: HeroImageCandidateStore,
  input: GenerateHeroImageCandidateInput,
  options: GenerateHeroImageCandidateOptions = {},
): Promise<GenerateHeroImageCandidateResult> {
  const now = options.now ?? new Date();
  const storageBucket = options.storageBucket ?? publicHeroImageBucket;
  const pipelineRun = await store.createPipelineRun({
    runType: "generate",
    articleId: input.articleId,
    attempt: defaultAttempt,
    startedAt: now,
    payload: {
      operation: "hero_image_candidate_generation",
      outcome: "running",
      articleId: input.articleId,
      regenerate: input.regenerate === true,
      storageBucket,
      startedAt: now.toISOString(),
    },
  });

  try {
    let preflight = await loadGenerationPreflight(store, input.articleId);

    if (preflight.kind === "existing" && input.regenerate !== true) {
      await finishPipelineRunSucceeded(store, pipelineRun.id, now, {
        outcome: "existing_candidate",
        articleId: input.articleId,
        candidate: candidatePayload(preflight.candidate),
      });

      return {
        ok: true,
        created: false,
        outcome: "existing_candidate",
        candidate: preflight.candidate,
        pipelineRunId: pipelineRun.id,
      };
    }

    if (preflight.kind === "existing" && input.regenerate === true) {
      const context = await loadArticleContextForRegeneration(store, input.articleId);

      if (context.kind === "failure") {
        await finishPipelineRunFailed(store, pipelineRun.id, now, context.error, {
          outcome: "ineligible",
          articleId: input.articleId,
          errorCode: context.error.code,
          errorMessage: context.error.message,
        });

        return {
          ok: false,
          outcome: "ineligible",
          error: context.error,
          pipelineRunId: pipelineRun.id,
        };
      }

      preflight = { kind: "ready", context: context.context, existingCandidate: preflight.candidate };
    }

    if (preflight.kind === "failure") {
      await finishPipelineRunFailed(store, pipelineRun.id, now, preflight.error, {
        outcome: "ineligible",
        articleId: input.articleId,
        errorCode: preflight.error.code,
        errorMessage: preflight.error.message,
      });

      return {
        ok: false,
        outcome: "ineligible",
        error: preflight.error,
        pipelineRunId: pipelineRun.id,
      };
    }

    if (preflight.kind !== "ready") {
      throw new HeroImageCandidatePersistenceError("Hero image generation preflight did not resolve.");
    }

    const prompt = buildPrompt(preflight.context);
    const promptText = formatPromptForPersistence(prompt);
    const promptHash = stableHash(prompt);
    const candidateId = options.createCandidateId?.() ?? randomUUID();
    const provider = options.provider ?? createImageProvider();
    const generated = await provider.generateImage({ prompt, now });
    let storage: HeroImageCandidateStorage;

    try {
      storage = options.storage ?? createSupabaseHeroImageCandidateStorage();
    } catch (error) {
      throw new HeroImageCandidateStorageBoundaryError(error);
    }

    const storagePath = buildStoragePath(
      input.articleId,
      candidateId,
      extensionForContentType(generated.metadata.contentType),
    );
    const upload = await uploadCandidateImage(storage, {
      bucket: storageBucket,
      path: storagePath,
      bytes: generated.bytes,
      contentType: generated.metadata.contentType,
    });
    const upsertInput = {
      id: candidateId,
      articleId: input.articleId,
      promptText,
      promptHash,
      generated,
      storageBucket: upload.bucket,
      storagePath: upload.path,
      publicUrl: upload.publicUrl,
      sizeBytes: upload.sizeBytes,
      now,
      ...(preflight.existingCandidate !== undefined
        ? { existingCandidateId: preflight.existingCandidate.id }
        : {}),
    };
    const upserted = await upsertGeneratedCandidate(store, upsertInput);

    await finishPipelineRunSucceeded(store, pipelineRun.id, now, {
      outcome: upserted.created ? "created" : upserted.regenerated ? "regenerated" : "existing_candidate",
      articleId: input.articleId,
      candidate: candidatePayload(upserted.candidate),
      generation: generationPayload(upserted.candidate),
    });

    return {
      ok: true,
      created: upserted.created,
      outcome: upserted.created ? "created" : upserted.regenerated ? "regenerated" : "existing_candidate",
      candidate: upserted.candidate,
      pipelineRunId: pipelineRun.id,
    };
  } catch (error) {
    const failureCode = error instanceof HeroImageCandidateStorageBoundaryError
      ? "storage_failed"
      : error instanceof HeroImageCandidatePersistenceError
        ? "persistence_failed"
        : "provider_failed";
    const failure = failureResult(failureCode, readErrorMessage(error, "Hero image generation failed."));
    const failedCandidate = await persistFailedCandidateAfterRuntimeError(store, input.articleId, now, {
      error,
      failure,
      storageBucket,
      ...(options.createCandidateId !== undefined ? { createCandidateId: options.createCandidateId } : {}),
    });

    await finishPipelineRunFailed(store, pipelineRun.id, now, failure, {
      outcome: "failed",
      articleId: input.articleId,
      errorCode: failure.code,
      errorMessage: failure.message,
      ...(failedCandidate !== undefined ? { candidate: candidatePayload(failedCandidate) } : {}),
    });

    return {
      ok: false,
      outcome: "failed",
      error: failure,
      ...(failedCandidate !== undefined ? { candidate: failedCandidate } : {}),
      pipelineRunId: pipelineRun.id,
    };
  }
}

type GenerationPreflight =
  | {
      readonly kind: "ready";
      readonly context: HeroImageCandidateArticleContext;
      readonly existingCandidate?: HeroImageCandidateRecord;
    }
  | {
      readonly kind: "existing";
      readonly candidate: HeroImageCandidateRecord;
    }
  | {
      readonly kind: "failure";
      readonly error: HeroImageCandidateFailure;
    };

async function loadGenerationPreflight(
  store: HeroImageCandidateStore,
  articleId: string,
): Promise<GenerationPreflight> {
  return store.transaction(async (tx) => {
    const existingCandidate = await tx.findCandidateByArticleId(articleId);

    if (existingCandidate !== null) {
      return { kind: "existing", candidate: existingCandidate };
    }

    const context = await tx.findArticleContext(articleId);

    if (context === null) {
      return {
        kind: "failure",
        error: failureResult("not_found", `Article "${articleId}" was not found.`),
      };
    }

    if (context.article.status !== "review") {
      return {
        kind: "failure",
        error: failureResult(
          "ineligible_article",
          `Article "${articleId}" is not eligible for hero image generation while status is "${context.article.status}".`,
        ),
      };
    }

    if (context.primaryLocalization === null) {
      return {
        kind: "failure",
        error: failureResult(
          "missing_primary_localization",
          `Article "${articleId}" has no primary localization for "${context.article.primaryLocale}".`,
        ),
      };
    }

    return { kind: "ready", context };
  });
}

async function loadArticleContextForRegeneration(
  store: HeroImageCandidateStore,
  articleId: string,
): Promise<
  | { readonly kind: "ready"; readonly context: HeroImageCandidateArticleContext }
  | { readonly kind: "failure"; readonly error: HeroImageCandidateFailure }
> {
  return store.transaction(async (tx) => {
    const context = await tx.findArticleContext(articleId);

    if (context === null) {
      return {
        kind: "failure",
        error: failureResult("not_found", `Article "${articleId}" was not found.`),
      };
    }

    if (context.article.status !== "review") {
      return {
        kind: "failure",
        error: failureResult(
          "ineligible_article",
          `Article "${articleId}" is not eligible for hero image regeneration while status is "${context.article.status}".`,
        ),
      };
    }

    if (context.primaryLocalization === null) {
      return {
        kind: "failure",
        error: failureResult(
          "missing_primary_localization",
          `Article "${articleId}" has no primary localization for "${context.article.primaryLocale}".`,
        ),
      };
    }

    return { kind: "ready", context };
  });
}

function buildPrompt(context: HeroImageCandidateArticleContext): ArticleHeroImagePrompt {
  const localization = context.primaryLocalization;

  if (localization === null) {
    throw new Error("Primary localization is required before building a hero image prompt.");
  }

  return buildArticleHeroImagePrompt({
    locale: localization.locale,
    title: localization.title,
    excerpt: localization.excerpt,
    ...(localization.subtitle !== null ? { subtitle: localization.subtitle } : {}),
    body: bodySummary(localization.body, context.sources),
    categoryLabel: context.category.name,
    keywordHints: keywordHints(localization.keywords, context.category, context.sources),
  });
}

function bodySummary(
  body: string,
  sources: readonly HeroImageCandidateSourceContext[],
): string {
  const sourceContext = sources
    .slice(0, 3)
    .map((source) => source.title)
    .filter((title) => title.trim().length > 0)
    .join("; ");
  const summary = sourceContext.length > 0 ? `${body}\nSource context: ${sourceContext}` : body;

  return stripInternalReferences(truncateNormalizedText(summary, maxBodySummaryLength));
}

function keywordHints(
  articleKeywords: readonly string[],
  category: HeroImageCandidateArticleContext["category"],
  sources: readonly HeroImageCandidateSourceContext[],
): readonly string[] {
  return [
    ...articleKeywords,
    category.slug,
    ...sources
      .filter((source) => source.isPrimary)
      .flatMap((source) => source.title.split(/\W+/)),
  ]
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 3)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .slice(0, 8);
}

function stripInternalReferences(value: string): string {
  return value
    .replace(/\b(?:source[-_ ]?item|story[-_ ]?cluster|generation[-_ ]?run|article|candidate)[-_ ]+[A-Za-z0-9_-]+\b/gi, "[redacted-id]")
    .replace(/\b(?:source item|story cluster|generation run|article|candidate)\s+id\b/gi, "[redacted-id]");
}

async function upsertGeneratedCandidate(
  store: HeroImageCandidateStore,
  input: {
    readonly id: string;
    readonly articleId: string;
    readonly existingCandidateId?: string;
    readonly promptText: string;
    readonly promptHash: string;
    readonly generated: ArticleHeroImageCandidate;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly publicUrl: string;
    readonly sizeBytes: number;
    readonly now: Date;
  },
): Promise<{
  readonly created: boolean;
  readonly regenerated: boolean;
  readonly candidate: HeroImageCandidateRecord;
}> {
  return store.transaction(async (tx) => {
    const existing = await tx.findCandidateByArticleId(input.articleId);

    if (existing !== null && input.existingCandidateId === undefined) {
      return { created: false, regenerated: false, candidate: existing };
    }

    const metadata = input.generated.metadata;
    const values = {
      status: "generated" as const,
      provider: metadata.provider,
      model: metadata.model,
      prompt: input.promptText,
      promptHash: metadata.promptHash || input.promptHash,
      stylePolicy: metadata.stylePolicy,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      contentType: metadata.contentType,
      width: metadata.width,
      height: metadata.height,
      sizeBytes: input.sizeBytes,
      publicUrl: input.publicUrl,
      reviewNotes: null,
      generationMetadata: sanitizeMetadata({
        operation: "hero_image_candidate_generation",
        status: "generated",
        publicBucket: input.storageBucket,
        ...metadata,
      }),
      generatedAt: input.now,
      reviewedAt: null,
      updatedAt: input.now,
    };

    const candidate = existing !== null
      ? await tx.updateCandidate({ ...values, candidateId: existing.id })
      : await tx.insertCandidate({
          ...values,
          id: input.id,
          articleId: input.articleId,
          createdAt: input.now,
        });

    if (candidate === null) {
      throw new HeroImageCandidatePersistenceError(
        `Hero image candidate for article "${input.articleId}" could not be persisted.`,
      );
    }

    const article = await tx.setArticleHeroImageUrl({
      articleId: input.articleId,
      heroImageUrl: input.publicUrl,
      updatedAt: input.now,
    });

    if (article === null) {
      throw new HeroImageCandidatePersistenceError(
        `Article "${input.articleId}" hero image URL could not be updated.`,
      );
    }

    return {
      created: existing === null,
      regenerated: existing !== null,
      candidate,
    };
  });
}

async function persistFailedCandidateAfterRuntimeError(
  store: HeroImageCandidateStore,
  articleId: string,
  now: Date,
  input: {
    readonly error: unknown;
    readonly failure: HeroImageCandidateFailure;
    readonly storageBucket: string;
    readonly createCandidateId?: () => string;
  },
): Promise<HeroImageCandidateRecord | undefined> {
  try {
    const preflight = await loadGenerationPreflight(store, articleId);

    if (preflight.kind === "existing") {
      return preflight.candidate;
    }

    if (preflight.kind !== "ready") {
      return undefined;
    }

    const prompt = buildPrompt(preflight.context);
    const promptText = formatPromptForPersistence(prompt);
    const promptHash = stableHash(prompt);

    return store.transaction(async (tx) => {
      const existing = await tx.findCandidateByArticleId(articleId);

      if (existing !== null) {
        return existing;
      }

      return tx.insertCandidate({
        id: input.createCandidateId?.() ?? randomUUID(),
        articleId,
        status: "failed",
        provider: "openai",
        model: defaultOpenAiImageModel,
        prompt: promptText,
        promptHash,
        stylePolicy: prompt.stylePolicy,
        storageBucket: input.storageBucket,
        storagePath: null,
        contentType: null,
        width: null,
        height: null,
        sizeBytes: null,
        publicUrl: null,
        reviewNotes: input.failure.message,
        generationMetadata: sanitizeMetadata({
          operation: "hero_image_candidate_generation",
          status: "failed",
          publicBucket: input.storageBucket,
          provider: "openai",
          model: defaultOpenAiImageModel,
          promptHash,
          stylePolicy: prompt.stylePolicy,
          errorCode: input.failure.code,
          errorMessage: input.failure.message,
          errorName: input.error instanceof Error ? input.error.name : "Error",
        }),
        generatedAt: now,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch {
    return undefined;
  }
}

function formatPromptForPersistence(prompt: ArticleHeroImagePrompt): string {
  return [
    "System:",
    prompt.system,
    "",
    "User:",
    prompt.user,
    "",
    `Style policy: ${prompt.stylePolicy}`,
    `Image count: ${prompt.outputContract.imageCount}`,
    `Output format: ${prompt.outputContract.outputFormat}`,
    `Size: ${prompt.outputContract.size}`,
  ].join("\n");
}

function buildStoragePath(articleId: string, candidateId: string, extension: string): string {
  return `articles/${articleId}/${candidateId}.${extension}`;
}

function extensionForContentType(contentType: string): "png" | "webp" {
  return contentType === "image/png" ? "png" : "webp";
}

async function uploadCandidateImage(
  storage: HeroImageCandidateStorage,
  input: Parameters<HeroImageCandidateStorage["upload"]>[0],
): Promise<Awaited<ReturnType<HeroImageCandidateStorage["upload"]>>> {
  try {
    return await storage.upload(input);
  } catch (error) {
    throw new HeroImageCandidateStorageBoundaryError(error);
  }
}

function sanitizeMetadata(value: unknown): HeroImageCandidateJsonObject {
  const sanitized = sanitizeHeroImageCandidateJson(value);

  return typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized)
    ? sanitized as HeroImageCandidateJsonObject
    : {};
}

function failureResult(
  code: HeroImageCandidateFailureCode,
  message: string,
): HeroImageCandidateFailure {
  return {
    code,
    message: sanitizeHeroImageCandidateErrorMessage(message),
  };
}

async function finishPipelineRunSucceeded(
  store: HeroImageCandidateStore,
  pipelineRunId: string,
  now: Date,
  payload: HeroImageCandidateJsonObject,
): Promise<void> {
  await store.finishPipelineRun(pipelineRunId, {
    status: "succeeded",
    attempt: defaultAttempt,
    finishedAt: now,
    payload: {
      operation: "hero_image_candidate_generation",
      ...payload,
    },
  });
}

async function finishPipelineRunFailed(
  store: HeroImageCandidateStore,
  pipelineRunId: string,
  now: Date,
  failure: HeroImageCandidateFailure,
  payload: HeroImageCandidateJsonObject,
): Promise<void> {
  await store.finishPipelineRun(pipelineRunId, {
    status: "failed",
    attempt: defaultAttempt,
    finishedAt: now,
    errorMessage: failure.message,
    payload: {
      operation: "hero_image_candidate_generation",
      ...payload,
    },
  });
}

function candidatePayload(candidate: HeroImageCandidateRecord): HeroImageCandidateJsonObject {
  return {
    id: candidate.id,
    articleId: candidate.articleId,
    status: candidate.status,
    provider: candidate.provider,
    model: candidate.model,
    promptHash: candidate.promptHash,
    stylePolicy: candidate.stylePolicy,
    storageBucket: candidate.storageBucket,
    storagePath: candidate.storagePath,
    contentType: candidate.contentType,
    width: candidate.width,
    height: candidate.height,
    sizeBytes: candidate.sizeBytes,
    publicUrl: candidate.publicUrl,
  };
}

function generationPayload(candidate: HeroImageCandidateRecord): HeroImageCandidateJsonObject {
  return {
    provider: candidate.provider,
    model: candidate.model,
    promptHash: candidate.promptHash,
    stylePolicy: candidate.stylePolicy,
    contentType: candidate.contentType,
    width: candidate.width,
    height: candidate.height,
    sizeBytes: candidate.sizeBytes,
  };
}

export class HeroImageCandidateStorageBoundaryError extends Error {
  constructor(error: unknown) {
    super(readErrorMessage(error, "Hero image candidate storage failed."));
    this.name = "HeroImageCandidateStorageBoundaryError";
  }
}

export class HeroImageCandidatePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeroImageCandidatePersistenceError";
  }
}
