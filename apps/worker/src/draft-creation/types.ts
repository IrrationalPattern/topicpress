import type { SiteConfig } from "@topicpress/config";
import type { ArticleStatus, Category, StoryCluster } from "@topicpress/db";
import type { ArticleGenerationInput } from "@topicpress/ai";

import type { TopicpressDatabase } from "../database.js";

export type DraftCreationErrorCode =
  | "malformed_output"
  | "ineligible_cluster"
  | "invalid_category"
  | "missing_lineage"
  | "missing_source_items"
  | "slug_conflict"
  | "persistence_failed";

export type DraftCreationResult =
  | {
      readonly ok: true;
      readonly created: boolean;
      readonly article: DraftCreationArticleInfo;
      readonly sourceCount: number;
    }
  | {
      readonly ok: false;
      readonly error: DraftCreationFailure;
    };

export interface DraftCreationFailure {
  readonly code: DraftCreationErrorCode;
  readonly message: string;
  readonly issues?: readonly string[];
}

export interface DraftCreationCluster {
  readonly id: string;
  readonly status: StoryCluster["status"];
  readonly canonicalTopic?: string;
}

export interface CreateDraftArticleInput {
  readonly cluster: DraftCreationCluster;
  readonly draft: unknown;
  readonly generationInput?: ArticleGenerationInput;
}

export interface DraftCreationOptions {
  readonly now?: Date;
  readonly siteConfig?: SiteConfig;
  readonly locale?: string;
}

export interface DraftCreationStore {
  readonly transaction: <TResult>(
    callback: (tx: DraftCreationTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface DraftCreationTransaction {
  readonly findArticleByStoryClusterId: (
    storyClusterId: string,
  ) => Promise<DraftCreationArticleInfo | null>;
  readonly findActiveCategoryByConfigKey: (
    configKey: string,
  ) => Promise<DraftCreationCategoryRow | null>;
  readonly listClusterSourceItems: (
    storyClusterId: string,
  ) => Promise<readonly DraftCreationSourceItemRow[]>;
  readonly findArticleBySlug: (slug: string) => Promise<DraftCreationArticleInfo | null>;
  readonly findLocalizationByLocaleSlug: (
    locale: string,
    slug: string,
  ) => Promise<DraftCreationArticleInfo | null>;
  readonly insertArticle: (values: InsertDraftArticleValues) => Promise<DraftCreationArticleInfo>;
  readonly insertArticleLocalization: (
    values: InsertDraftArticleLocalizationValues,
  ) => Promise<{ readonly id: string }>;
  readonly insertArticleSources: (
    values: readonly InsertDraftArticleSourceValues[],
  ) => Promise<void>;
}

export type DraftCreationArticleInfo = {
  readonly id: string;
  readonly storyClusterId: string;
  readonly categoryId: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly primaryLocale: string;
};

export type DraftCreationCategoryRow = Pick<Category, "id" | "configKey" | "slug" | "isActive">;

export interface DraftCreationSourceItemRow {
  readonly sourceItemId: string;
  readonly externalUrl: string;
  readonly title: string;
  readonly isPrimary: boolean;
}

export interface InsertDraftArticleValues {
  readonly storyClusterId: string;
  readonly categoryId: string;
  readonly slug: string;
  readonly status: "review";
  readonly primaryLocale: string;
  readonly generationMetadata: DraftGenerationMetadataJson;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InsertDraftArticleLocalizationValues {
  readonly articleId: string;
  readonly locale: string;
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly excerpt: string;
  readonly body: string;
  readonly keywords: readonly string[];
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly isMachineTranslated: false;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InsertDraftArticleSourceValues {
  readonly articleId: string;
  readonly sourceItemId: string;
  readonly role: "primary" | "supporting";
  readonly createdAt: Date;
}

export interface DraftGenerationMetadataJson {
  readonly generationRunId: string;
  readonly provider: string;
  readonly mode: string;
  readonly locale: string;
  readonly generatedAt: string;
  readonly promptHash: string;
  readonly inputHash: string;
  readonly manualReviewRequired: true;
  readonly status: "review";
  readonly model?: string;
  readonly fixtureKey?: string;
}

export class DraftCreationError extends Error {
  readonly code: DraftCreationErrorCode;
  readonly issues: readonly string[];

  constructor(code: DraftCreationErrorCode, message: string, issues: readonly string[] = []) {
    super(message);
    this.name = "DraftCreationError";
    this.code = code;
    this.issues = issues;
  }
}

export type DraftCreationExecutor = Pick<TopicpressDatabase, "insert" | "select">;
