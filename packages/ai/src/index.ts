export const aiPackageName = "@topicpress/ai";

export {
  buildArticleGenerationInput,
} from "./input.js";
export {
  FixtureDraftProvider,
  generateFixtureDraft,
} from "./fixture-provider.js";
export {
  FixtureOpenAIImageProvider,
} from "./fixture-image-provider.js";
export {
  buildArticleHeroImagePrompt,
} from "./image-prompt.js";
export {
  defaultOpenAiImageModel,
  defaultOpenAiImageOutputFormat,
  defaultOpenAiImageQuality,
  defaultOpenAiImageSize,
  OpenAIImageProvider,
  OpenAIImageProviderError,
} from "./openai-image-provider.js";
export {
  defaultOpenAiDraftModel,
  OpenAIDraftProvider,
  OpenAIDraftProviderError,
} from "./openai-provider.js";
export {
  buildDraftPrompt,
} from "./prompt.js";
export {
  createImageProvider,
  createDraftProvider,
  generateArticleDraft,
  generateArticleHeroImage,
} from "./provider.js";
export {
  parseArticleDraft,
  validateArticleDraft,
} from "./validation.js";
export {
  activeDraftCategories,
  findActiveDraftCategory,
  slugify,
  stableHash,
  stableStringify,
} from "./utils.js";
export type {
  AiProviderEnv,
  CreateDraftProviderOptions,
  CreateImageProviderOptions,
} from "./provider.js";
export type {
  ArticleDraft,
  ArticleGenerationInput,
  ArticleGenerationInputOptions,
  ArticleHeroImageCandidate,
  ArticleHeroImageGenerationMetadata,
  ArticleHeroImageOutputContract,
  ArticleHeroImagePrompt,
  ArticleHeroImagePromptInput,
  ArticleHeroImagePromptMetadata,
  ArticleSourceInput,
  AiProviderMode,
  DraftCategory,
  DraftCitation,
  DraftGenerationMetadata,
  DraftLineage,
  DraftOutputContract,
  DraftPrompt,
  DraftPromptMetadata,
  DraftProvider,
  DraftProviderRequest,
  GenerateArticleDraftOptions,
  GenerateArticleHeroImageOptions,
  ImageOutputFormat,
  ImageProvider,
  ImageProviderName,
  ImageProviderRequest,
  ImageSize,
  ImageStylePolicy,
  ValidationResult,
} from "./types.js";
export type {
  OpenAIDraftProviderOptions,
} from "./openai-provider.js";
export type {
  OpenAIImageFetch,
  OpenAIImageProviderOptions,
} from "./openai-image-provider.js";
export {
  AiProviderConfigurationError,
  DraftValidationError,
} from "./types.js";
export { DraftValidationInputError } from "./utils.js";
