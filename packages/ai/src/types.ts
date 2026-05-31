import type { CategoryConfig, LocaleCode, SiteConfig } from "@topicpress/config";

export type AiProviderMode = "fixture" | "live";

export type ImageProviderName = "openai";

export type ImageStylePolicy = "editorial_illustration";

export type ImageOutputFormat = "png" | "webp";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export interface ArticleHeroImagePromptInput {
  readonly locale: LocaleCode;
  readonly title: string;
  readonly excerpt: string;
  readonly subtitle?: string;
  readonly body?: string;
  readonly categoryLabel?: string;
  readonly keywordHints?: readonly string[];
}

export interface ArticleHeroImagePrompt {
  readonly system: string;
  readonly user: string;
  readonly stylePolicy: ImageStylePolicy;
  readonly outputContract: ArticleHeroImageOutputContract;
  readonly metadata: ArticleHeroImagePromptMetadata;
}

export interface ArticleHeroImageOutputContract {
  readonly imageCount: 1;
  readonly stylePolicy: ImageStylePolicy;
  readonly size: ImageSize;
  readonly outputFormat: ImageOutputFormat;
  readonly forbiddenElements: readonly string[];
}

export interface ArticleHeroImagePromptMetadata {
  readonly locale: LocaleCode;
  readonly title: string;
  readonly categoryLabel?: string;
  readonly keywordHints: readonly string[];
}

export interface ArticleHeroImageGenerationMetadata {
  readonly provider: ImageProviderName;
  readonly mode: AiProviderMode;
  readonly model: string;
  readonly promptHash: string;
  readonly stylePolicy: ImageStylePolicy;
  readonly contentType: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly outputFormat: ImageOutputFormat;
  readonly generatedAt: string;
  readonly responseId?: string;
  readonly revisedPrompt?: string;
}

export interface ArticleHeroImageCandidate {
  readonly bytes: Uint8Array;
  readonly base64: string;
  readonly metadata: ArticleHeroImageGenerationMetadata;
}

export interface ImageProviderRequest {
  readonly prompt: ArticleHeroImagePrompt;
  readonly now: Date;
}

export interface ImageProvider {
  readonly id: string;
  readonly mode: AiProviderMode;
  generateImage(request: ImageProviderRequest): Promise<ArticleHeroImageCandidate>;
}

export interface GenerateArticleHeroImageOptions {
  readonly provider?: ImageProvider;
  readonly now?: Date;
}

export interface ArticleSourceInput {
  readonly sourceItemId: string;
  readonly sourceName: string;
  readonly title: string;
  readonly url: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly excerpt?: string;
  readonly contentText?: string;
}

export interface ArticleGenerationInput {
  readonly locale: LocaleCode;
  readonly storyClusterId: string;
  readonly primarySourceItemId: string;
  readonly sourceItemIds: readonly string[];
  readonly sourceItems: readonly ArticleSourceInput[];
  readonly categoryHint?: string;
  readonly keywordHints: readonly string[];
}

export interface ArticleGenerationInputOptions {
  readonly storyClusterId?: string;
  readonly primarySourceItemId?: string;
  readonly locale?: LocaleCode;
  readonly categoryHint?: string;
  readonly keywordHints?: readonly string[];
}

export interface DraftPrompt {
  readonly system: string;
  readonly user: string;
  readonly outputContract: DraftOutputContract;
  readonly metadata: DraftPromptMetadata;
}

export interface DraftOutputContract {
  readonly requiredFields: readonly string[];
  readonly optionalFields: readonly string[];
  readonly allowedCategoryKeys: readonly string[];
  readonly locale: LocaleCode;
}

export interface DraftPromptMetadata {
  readonly siteName: string;
  readonly locale: LocaleCode;
  readonly tone: readonly string[];
  readonly primaryAudience: string;
  readonly categoryKeys: readonly string[];
}

export interface DraftCategory {
  readonly key: string;
  readonly slug: string;
  readonly label: string;
}

export interface DraftCitation {
  readonly sourceItemId: string;
  readonly sourceName: string;
  readonly title: string;
  readonly url: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly isPrimarySource: boolean;
}

export interface DraftLineage {
  readonly kind: "source_item";
  readonly sourceItemId: string;
  readonly storyClusterId: string;
  readonly generationRunId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly fetchedAt?: string;
  readonly isPrimarySource: boolean;
}

export interface DraftGenerationMetadata {
  readonly generationRunId: string;
  readonly provider: string;
  readonly mode: AiProviderMode;
  readonly locale: LocaleCode;
  readonly generatedAt: string;
  readonly promptHash: string;
  readonly inputHash: string;
  readonly manualReviewRequired: true;
  readonly status: "review";
  readonly model?: string;
  readonly fixtureKey?: string;
}

export interface ArticleDraft {
  readonly title: string;
  readonly subtitle?: string;
  readonly excerpt: string;
  readonly body: string;
  readonly keywords: readonly string[];
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly category: DraftCategory;
  readonly slug: string;
  readonly citations: readonly DraftCitation[];
  readonly lineage: readonly DraftLineage[];
  readonly generation: DraftGenerationMetadata;
}

export interface DraftProviderRequest {
  readonly input: ArticleGenerationInput;
  readonly prompt: DraftPrompt;
  readonly siteConfig: SiteConfig;
  readonly now: Date;
}

export interface DraftProvider {
  readonly id: string;
  readonly mode: AiProviderMode;
  generateDraft(request: DraftProviderRequest): Promise<unknown>;
}

export interface GenerateArticleDraftOptions {
  readonly provider?: DraftProvider;
  readonly siteConfig?: SiteConfig;
  readonly now?: Date;
}

export interface ValidationResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly issues: readonly string[];
}

export class DraftValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid generated draft:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "DraftValidationError";
    this.issues = issues;
  }
}

export class AiProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderConfigurationError";
  }
}

export function isActiveCategory(category: CategoryConfig): boolean {
  return category.isActive;
}
