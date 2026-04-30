import { siteConfig as defaultSiteConfig } from "@topicpress/config";

import { FixtureDraftProvider } from "./fixture-provider.js";
import { buildDraftPrompt } from "./prompt.js";
import type {
  AiProviderMode,
  ArticleDraft,
  ArticleGenerationInput,
  DraftProvider,
  GenerateArticleDraftOptions,
} from "./types.js";
import { AiProviderConfigurationError } from "./types.js";
import { validateArticleDraft } from "./validation.js";

export interface AiProviderEnv {
  readonly TOPICPRESS_AI_PROVIDER?: string;
  readonly TOPICPRESS_AI_LIVE_ENABLED?: string;
}

export interface CreateDraftProviderOptions {
  readonly mode?: AiProviderMode;
  readonly env?: AiProviderEnv;
  readonly fixtureProvider?: DraftProvider;
  readonly liveProvider?: DraftProvider;
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
      throw new AiProviderConfigurationError(
        "Live AI provider requested but no liveProvider adapter was supplied",
      );
    }

    return options.liveProvider;
  }

  return options.fixtureProvider ?? new FixtureDraftProvider();
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

  return env;
}
