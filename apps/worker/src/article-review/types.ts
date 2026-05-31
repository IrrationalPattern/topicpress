import type {
  ArticleHeroImageCandidateStatus,
  ArticleLocalization,
  ArticleStatus,
  Category,
  Source,
  SourceItem,
  StoryCluster,
} from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { JsonValue } from "../feed-types.js";

export type ArticleReviewErrorCode =
  | "not_found"
  | "invalid_transition"
  | "validation_failed"
  | "missing_reason"
  | "persistence_failed";

export type ArticleReviewValidationIssueCode =
  | "invalid_status"
  | "missing_story_cluster"
  | "inactive_category"
  | "missing_slug"
  | "duplicate_slug"
  | "missing_primary_localization"
  | "missing_title"
  | "missing_body"
  | "missing_excerpt"
  | "missing_meta_title"
  | "missing_meta_description"
  | "missing_source_lineage"
  | "missing_primary_source_lineage"
  | "missing_generation_metadata"
  | "duplicate_story_cluster";

export type ArticleReviewTransitionStatus = Extract<
  ArticleStatus,
  "review" | "ready" | "failed" | "published"
>;

export interface ArticleReviewOptions {
  readonly now?: Date;
}

export interface ListReviewableArticlesOptions {
  readonly limit?: number;
  readonly statuses?: readonly ArticleStatus[];
}

export interface ArticleReviewValidationIssue {
  readonly code: ArticleReviewValidationIssueCode;
  readonly message: string;
}

export interface ArticleReviewValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ArticleReviewValidationIssue[];
}

export interface ArticleReviewFailure {
  readonly code: ArticleReviewErrorCode;
  readonly message: string;
  readonly issues?: readonly ArticleReviewValidationIssue[];
}

export type LoadArticleReviewResult =
  | {
      readonly ok: true;
      readonly article: ArticleReviewArticle;
    }
  | {
      readonly ok: false;
      readonly error: ArticleReviewFailure;
    };

export type ArticleReviewTransitionResult =
  | {
      readonly ok: true;
      readonly article: ArticleReviewArticle;
      readonly validation: ArticleReviewValidationResult;
    }
  | {
      readonly ok: false;
      readonly error: ArticleReviewFailure;
    };

export interface TransitionArticleReviewStatusInput {
  readonly articleId: string;
  readonly toStatus: ArticleReviewTransitionStatus;
  readonly reason?: string;
  readonly reviewNote?: string;
}

export interface ArticleReviewArticle {
  readonly id: string;
  readonly storyClusterId: string;
  readonly categoryId: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly heroImageUrl: string | null;
  readonly primaryLocale: string;
  readonly publishedAt: Date | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: JsonValue;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly category: ArticleReviewCategory;
  readonly storyCluster: ArticleReviewStoryCluster;
  readonly primaryLocalization: ArticleReviewLocalization | null;
  readonly localizations: readonly ArticleReviewLocalization[];
  readonly sources: readonly ArticleReviewSourceLineage[];
  readonly heroImageCandidate: ArticleReviewHeroImageCandidate | null;
  readonly validation: ArticleReviewValidationResult;
}

export interface ArticleReviewHeroImageCandidate {
  readonly id: string;
  readonly status: ArticleHeroImageCandidateStatus;
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly promptHash: string;
  readonly stylePolicy: string;
  readonly contentType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: number | null;
  readonly publicUrl: string | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: JsonValue;
  readonly generatedAt: Date;
  readonly reviewedAt: Date | null;
  readonly privatePreviewAvailable: boolean;
}

export type ArticleReviewCategory = Pick<
  Category,
  "id" | "configKey" | "slug" | "name" | "isActive"
>;

export type ArticleReviewStoryCluster = Pick<
  StoryCluster,
  "id" | "canonicalTopic" | "summary" | "status"
>;

export type ArticleReviewLocalization = Pick<
  ArticleLocalization,
  | "id"
  | "locale"
  | "slug"
  | "title"
  | "subtitle"
  | "excerpt"
  | "body"
  | "keywords"
  | "metaTitle"
  | "metaDescription"
  | "isMachineTranslated"
>;

export interface ArticleReviewSourceLineage {
  readonly articleSourceId: string;
  readonly role: string;
  readonly isClusterPrimary: boolean;
  readonly sourceItem: Pick<
    SourceItem,
    "id" | "externalUrl" | "title" | "summary" | "contentText" | "language" | "publishedAt" | "fetchedAt"
  >;
  readonly source: Pick<Source, "id" | "configKey" | "slug" | "name" | "kind" | "isActive">;
}

export interface ArticleReviewStore {
  readonly transaction: <TResult>(
    callback: (tx: ArticleReviewTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface ArticleReviewTransaction {
  readonly listReviewableArticleIds: (
    options: ListReviewableArticlesOptions,
  ) => Promise<readonly string[]>;
  readonly findArticleReviewById: (articleId: string) => Promise<ArticleReviewArticleData | null>;
  readonly updateArticleStatus: (
    input: UpdateArticleReviewStatusInput,
  ) => Promise<{ readonly id: string } | null>;
}

export interface ArticleReviewArticleData {
  readonly article: ArticleReviewArticleRow;
  readonly category: ArticleReviewCategory;
  readonly storyCluster: ArticleReviewStoryCluster;
  readonly localizations: readonly ArticleReviewLocalization[];
  readonly sources: readonly ArticleReviewSourceLineage[];
  readonly heroImageCandidate: ArticleReviewHeroImageCandidateRow | null;
  readonly articleIdsWithSameSlug: readonly string[];
  readonly articleIdsWithSameStoryCluster: readonly string[];
}

export interface ArticleReviewArticleRow {
  readonly id: string;
  readonly storyClusterId: string;
  readonly categoryId: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly heroImageUrl: string | null;
  readonly primaryLocale: string;
  readonly publishedAt: Date | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: unknown;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateArticleReviewStatusInput {
  readonly articleId: string;
  readonly expectedStatus: ArticleStatus;
  readonly toStatus: ArticleStatus;
  readonly updatedAt: Date;
  readonly reviewNotes?: string;
}

export interface ArticleReviewHeroImageCandidateRow {
  readonly id: string;
  readonly articleId: string;
  readonly status: ArticleHeroImageCandidateStatus;
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly promptHash: string;
  readonly stylePolicy: string;
  readonly storageBucket: string;
  readonly storagePath: string | null;
  readonly contentType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: number | null;
  readonly publicUrl: string | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: unknown;
  readonly generatedAt: Date;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ArticleReviewExecutor = Pick<TopicpressDatabase, "insert" | "select" | "update">;
