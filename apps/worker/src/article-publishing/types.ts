import type { ArticleStatus, PipelineRunStatus } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { JsonValue } from "../feed-types.js";
import type {
  ArticleReviewArticle,
  ArticleReviewArticleData,
  ArticleReviewValidationIssue,
  ArticleReviewValidationIssueCode,
} from "../article-review.js";

export type ArticlePublishErrorCode =
  | "not_found"
  | "invalid_transition"
  | "validation_failed"
  | "persistence_failed";

export type ArticlePublishOutcome = "published" | "already_published";

export type ArticlePublishValidationIssueCode =
  | ArticleReviewValidationIssueCode
  | "published_at_present"
  | "missing_published_at";

export interface ArticlePublishValidationIssue {
  readonly code: ArticlePublishValidationIssueCode;
  readonly message: string;
}

export interface ArticlePublishValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ArticlePublishValidationIssue[];
}

export interface PublishArticleInput {
  readonly articleId: string;
  readonly operatorType?: string;
}

export interface PublishArticleOptions {
  readonly now?: Date;
  readonly operatorType?: string;
}

export interface ArticlePublishFailure {
  readonly code: ArticlePublishErrorCode;
  readonly message: string;
  readonly issues?: readonly ArticlePublishValidationIssue[];
}

export interface PublishPipelineRunSummary {
  readonly id: string;
  readonly status: Extract<PipelineRunStatus, "succeeded" | "failed">;
  readonly payload: PublishJsonObject;
  readonly errorMessage?: string;
}

export type PublishArticleResult =
  | {
      readonly ok: true;
      readonly outcome: ArticlePublishOutcome;
      readonly article: ArticleReviewArticle;
      readonly validation: ArticlePublishValidationResult;
      readonly pipelineRun: PublishPipelineRunSummary;
    }
  | {
      readonly ok: false;
      readonly error: ArticlePublishFailure;
      readonly pipelineRun: PublishPipelineRunSummary;
    };

export interface ArticlePublishingStore {
  readonly transaction: <TResult>(
    callback: (tx: ArticlePublishingTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface ArticlePublishingTransaction {
  readonly findArticleReviewById: (articleId: string) => Promise<ArticleReviewArticleData | null>;
  readonly createPublishPipelineRun: (
    input: CreatePublishPipelineRunInput,
  ) => Promise<{ readonly id: string }>;
  readonly finishPublishPipelineRun: (
    runId: string,
    input: FinishPublishPipelineRunInput,
  ) => Promise<void>;
  readonly publishArticle: (
    input: PublishArticleMutationInput,
  ) => Promise<PublishArticleMutationRow | null>;
}

export interface CreatePublishPipelineRunInput {
  readonly attempt: number;
  readonly startedAt: Date;
  readonly payload: PublishJsonObject;
}

export interface FinishPublishPipelineRunInput {
  readonly status: Extract<PipelineRunStatus, "succeeded" | "failed">;
  readonly attempt: number;
  readonly finishedAt: Date;
  readonly payload: PublishJsonObject;
  readonly errorMessage?: string;
  readonly articleId?: string;
  readonly storyClusterId?: string;
}

export interface PublishArticleMutationInput {
  readonly articleId: string;
  readonly expectedStatus: Extract<ArticleStatus, "ready">;
  readonly publishedAt: Date;
  readonly updatedAt: Date;
}

export interface PublishArticleMutationRow {
  readonly id: string;
  readonly status: Extract<ArticleStatus, "published">;
  readonly publishedAt: Date;
  readonly updatedAt: Date;
}

export type PublishJsonObject = { readonly [key: string]: JsonValue };

export type PublishReviewValidationIssue = ArticleReviewValidationIssue;
export type ArticlePublishingExecutor = Pick<TopicpressDatabase, "insert" | "select" | "update">;
