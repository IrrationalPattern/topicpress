export const aiPackageName = "@topicpress/ai";

export {
  buildArticleGenerationInput,
} from "./input.js";
export {
  FixtureDraftProvider,
  generateFixtureDraft,
} from "./fixture-provider.js";
export {
  buildDraftPrompt,
} from "./prompt.js";
export {
  createDraftProvider,
  generateArticleDraft,
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
} from "./provider.js";
export type {
  ArticleDraft,
  ArticleGenerationInput,
  ArticleGenerationInputOptions,
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
  ValidationResult,
} from "./types.js";
export {
  AiProviderConfigurationError,
  DraftValidationError,
} from "./types.js";
export { DraftValidationInputError } from "./utils.js";
