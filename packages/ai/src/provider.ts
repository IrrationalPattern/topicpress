import { siteConfig as defaultSiteConfig } from "@topicpress/config";

import { FixtureDraftProvider } from "./fixture-provider.js";
import { FixtureOpenAIImageProvider } from "./fixture-image-provider.js";
import { buildArticleHeroImagePrompt } from "./image-prompt.js";
import { OpenAIImageProvider, type OpenAIImageProviderOptions } from "./openai-image-provider.js";
import { OpenAIDraftProvider, type OpenAIDraftProviderOptions } from "./openai-provider.js";
import { buildDraftPrompt } from "./prompt.js";
import type {
  AiProviderMode,
  ArticleDraft,
  ArticleHeroImageCandidate,
  ArticleHeroImagePromptInput,
  ArticleGenerationInput,
  DraftProvider,
  GenerateArticleDraftOptions,
  GenerateArticleHeroImageOptions,
  ImageProvider,
} from "./types.js";
import { AiProviderConfigurationError } from "./types.js";
import { validateArticleDraft } from "./validation.js";

export interface AiProviderEnv {
  readonly TOPICPRESS_AI_PROVIDER?: string;
  readonly TOPICPRESS_AI_LIVE_ENABLED?: string;
  readonly OPENAI_API_KEY?: string;
  readonly TOPICPRESS_OPENAI_MODEL?: string;
  readonly TOPICPRESS_OPENAI_IMAGE_MODEL?: string;
  readonly TOPICPRESS_OPENAI_BASE_URL?: string;
  readonly TOPICPRESS_OPENAI_TIMEOUT_MS?: string;
  readonly TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS?: string;
}

export interface CreateDraftProviderOptions {
  readonly mode?: AiProviderMode;
  readonly env?: AiProviderEnv;
  readonly fixtureProvider?: DraftProvider;
  readonly liveProvider?: DraftProvider;
}

export interface CreateImageProviderOptions {
  readonly mode?: AiProviderMode;
  readonly env?: AiProviderEnv;
  readonly fixtureProvider?: ImageProvider;
  readonly liveProvider?: ImageProvider;
}

export function createDraftProvider(options: CreateDraftProviderOptions = {}): DraftProvider {
  const env = options.env ?? readProcessEnv();
  const requestedMode = options.mode ?? readProviderMode(env);

  if (requestedMode === "live") {
    if (env.TOPICPRESS_AI_LIVE_ENABLED !== "true") {
      throw new AiProviderConfigurationError(
        'Live AI provider requested but TOPICPRESS_AI_LIVE_ENABLED is not "true"',
      );
    }

    if (options.liveProvider === undefined) {
      return createOpenAIDraftProvider(env);
    }

    return options.liveProvider;
  }

  return options.fixtureProvider ?? new FixtureDraftProvider();
}

export function createImageProvider(options: CreateImageProviderOptions = {}): ImageProvider {
  const env = options.env ?? readProcessEnv();
  const requestedMode = options.mode ?? readProviderMode(env);

  if (requestedMode === "live") {
    if (env.TOPICPRESS_AI_LIVE_ENABLED !== "true") {
      throw new AiProviderConfigurationError(
        'Live AI image provider requested but TOPICPRESS_AI_LIVE_ENABLED is not "true"',
      );
    }

    if (options.liveProvider === undefined) {
      return createOpenAIImageProvider(env);
    }

    return options.liveProvider;
  }

  return options.fixtureProvider ?? new FixtureOpenAIImageProvider();
}

export async function generateArticleDraft(
  input: ArticleGenerationInput,
  options: GenerateArticleDraftOptions = {},
): Promise<ArticleDraft> {
  const siteConfig = options.siteConfig ?? defaultSiteConfig;
  const now = options.now ?? new Date();
  const prompt = buildDraftPrompt(input, siteConfig);
  const provider = options.provider ?? createDraftProvider();
  const rawDraft = await provider.generateDraft({
    input,
    prompt,
    siteConfig,
    now,
  });

  return validateArticleDraft(rawDraft, {
    input,
    siteConfig,
    locale: input.locale,
  });
}

export async function generateArticleHeroImage(
  input: ArticleHeroImagePromptInput,
  options: GenerateArticleHeroImageOptions = {},
): Promise<ArticleHeroImageCandidate> {
  const now = options.now ?? new Date();
  const prompt = buildArticleHeroImagePrompt(input);
  const provider = options.provider ?? createImageProvider();

  return provider.generateImage({
    prompt,
    now,
  });
}

function readProviderMode(env: AiProviderEnv): AiProviderMode {
  return env.TOPICPRESS_AI_PROVIDER === "live" ? "live" : "fixture";
}

function readProcessEnv(): AiProviderEnv {
  if (typeof process === "undefined") {
    return {};
  }

  const env: Record<string, string> = {};

  if (process.env.TOPICPRESS_AI_PROVIDER !== undefined) {
    env.TOPICPRESS_AI_PROVIDER = process.env.TOPICPRESS_AI_PROVIDER;
  }

  if (process.env.TOPICPRESS_AI_LIVE_ENABLED !== undefined) {
    env.TOPICPRESS_AI_LIVE_ENABLED = process.env.TOPICPRESS_AI_LIVE_ENABLED;
  }

  if (process.env.OPENAI_API_KEY !== undefined) {
    env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }

  if (process.env.TOPICPRESS_OPENAI_MODEL !== undefined) {
    env.TOPICPRESS_OPENAI_MODEL = process.env.TOPICPRESS_OPENAI_MODEL;
  }

  if (process.env.TOPICPRESS_OPENAI_IMAGE_MODEL !== undefined) {
    env.TOPICPRESS_OPENAI_IMAGE_MODEL = process.env.TOPICPRESS_OPENAI_IMAGE_MODEL;
  }

  if (process.env.TOPICPRESS_OPENAI_BASE_URL !== undefined) {
    env.TOPICPRESS_OPENAI_BASE_URL = process.env.TOPICPRESS_OPENAI_BASE_URL;
  }

  if (process.env.TOPICPRESS_OPENAI_TIMEOUT_MS !== undefined) {
    env.TOPICPRESS_OPENAI_TIMEOUT_MS = process.env.TOPICPRESS_OPENAI_TIMEOUT_MS;
  }

  if (process.env.TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS !== undefined) {
    env.TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS = process.env.TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS;
  }

  return env;
}

function createOpenAIDraftProvider(env: AiProviderEnv): OpenAIDraftProvider {
  const options: OpenAIDraftProviderOptions = {
    apiKey: env.OPENAI_API_KEY ?? "",
    ...(env.TOPICPRESS_OPENAI_MODEL !== undefined ? { model: env.TOPICPRESS_OPENAI_MODEL } : {}),
    ...(env.TOPICPRESS_OPENAI_BASE_URL !== undefined
      ? { baseUrl: env.TOPICPRESS_OPENAI_BASE_URL }
      : {}),
    ...(env.TOPICPRESS_OPENAI_TIMEOUT_MS !== undefined
      ? { timeoutMs: parseTimeoutMs(env.TOPICPRESS_OPENAI_TIMEOUT_MS) }
      : {}),
  };

  return new OpenAIDraftProvider(options);
}

function createOpenAIImageProvider(env: AiProviderEnv): OpenAIImageProvider {
  const options: OpenAIImageProviderOptions = {
    apiKey: env.OPENAI_API_KEY ?? "",
    ...(env.TOPICPRESS_OPENAI_IMAGE_MODEL !== undefined
      ? { model: env.TOPICPRESS_OPENAI_IMAGE_MODEL }
      : {}),
    ...(env.TOPICPRESS_OPENAI_BASE_URL !== undefined
      ? { baseUrl: env.TOPICPRESS_OPENAI_BASE_URL }
      : {}),
    ...(env.TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS !== undefined
      ? { timeoutMs: parseImageTimeoutMs(env.TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS) }
      : {}),
  };

  return new OpenAIImageProvider(options);
}

function parseTimeoutMs(value: string): number {
  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AiProviderConfigurationError("TOPICPRESS_OPENAI_TIMEOUT_MS must be a positive integer.");
  }

  return timeoutMs;
}

function parseImageTimeoutMs(value: string): number {
  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AiProviderConfigurationError(
      "TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS must be a positive integer.",
    );
  }

  return timeoutMs;
}
