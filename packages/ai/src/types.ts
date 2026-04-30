import type { CategoryConfig, LocaleCode, SiteConfig } from "@topicpress/config";

export type AiProviderMode = "fixture" | "live";

export interface ArticleSourceInput {
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
  readonly source: ArticleSourceInput;
  readonly categoryHint?: string;
  readonly keywordHints: readonly string[];
}

export interface ArticleGenerationInputOptions {
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
  readonly sourceName: string;
  readonly title: string;
  readonly url: string;
  readonly author?: string;
  readonly publishedAt?: string;
}

export interface DraftLineage {
  readonly kind: "source_item";
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly fetchedAt?: string;
}

export interface DraftGenerationMetadata {
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
