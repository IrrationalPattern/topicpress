import type { TopicpressDatabase } from "../database.js";
import { sanitizeErrorMessage } from "../feed-errors.js";
import {
  buildArticleReview,
  type ArticleReviewArticle,
  type ArticleReviewValidationIssue,
} from "../article-review.js";
import { createDrizzleArticlePublishingStore } from "./drizzle-store.js";
import type {
  ArticlePublishErrorCode,
  ArticlePublishFailure,
  ArticlePublishValidationIssue,
  ArticlePublishValidationResult,
  ArticlePublishingStore,
  ArticlePublishingTransaction,
  PublishArticleInput,
  PublishArticleOptions,
  PublishArticleResult,
  PublishJsonObject,
  PublishPipelineRunSummary,
} from "./types.js";

const attempt = 1;
const defaultOperatorType = "local";
const maxOperatorTypeLength = 80;

export async function publishArticle(
  db: TopicpressDatabase,
  input: PublishArticleInput,
  options: PublishArticleOptions = {},
): Promise<PublishArticleResult> {
  return publishArticleWithStore(createDrizzleArticlePublishingStore(db), input, options);
}

export async function publishArticleWithStore(
  store: ArticlePublishingStore,
  input: PublishArticleInput,
  options: PublishArticleOptions = {},
): Promise<PublishArticleResult> {
  const now = options.now ?? new Date();
  const operatorType = sanitizeOperatorType(input.operatorType ?? options.operatorType);

  return store.transaction(async (tx) => {
    const run = await tx.createPublishPipelineRun({
      attempt,
      startedAt: now,
      payload: {
        outcome: "running",
        requestedTransition: "ready->published",
        articleId: input.articleId,
        operatorType,
        startedAt: now.toISOString(),
      },
    });

    try {
      const current = await tx.findArticleReviewById(input.articleId);

      if (current === null) {
        const message = `Article "${input.articleId}" was not found.`;
        const payload = failurePayload({
          outcome: "not_found",
          requestedTransition: "ready->published",
          articleId: input.articleId,
          operatorType,
          reason: message,
          finishedAt: now,
        });

        return finishFailure(tx, run.id, now, payload, "not_found", message);
      }

      const article = buildArticleReview(current);
      const requestedTransition = `${article.status}->published`;

      if (article.status === "published") {
        return finishAlreadyPublished(tx, run.id, article, now, requestedTransition, operatorType);
      }

      if (article.status !== "ready") {
        const message = `Cannot publish article "${article.id}" from "${article.status}" status.`;
        const payload = failurePayload({
          outcome: "invalid_transition",
          requestedTransition,
          articleId: article.id,
          storyClusterId: article.storyClusterId,
          fromStatus: article.status,
          operatorType,
          reason: message,
          finishedAt: now,
        });

        return finishFailure(tx, run.id, now, payload, "invalid_transition", message, {
          articleId: article.id,
          storyClusterId: article.storyClusterId,
        });
      }

      const validation = validatePublishEligibility(article);

      if (!validation.ok) {
        const message = `Article "${article.id}" is not eligible for publication.`;
        const payload = failurePayload({
          outcome: "validation_failed",
          requestedTransition,
          articleId: article.id,
          storyClusterId: article.storyClusterId,
          fromStatus: article.status,
          operatorType,
          reason: message,
          validation,
          finishedAt: now,
        });

        return finishFailure(tx, run.id, now, payload, "validation_failed", message, {
          articleId: article.id,
          storyClusterId: article.storyClusterId,
          issues: validation.issues,
        });
      }

      const published = await tx.publishArticle({
        articleId: article.id,
        expectedStatus: "ready",
        publishedAt: now,
        updatedAt: now,
      });

      if (published === null) {
        const message = `Article "${article.id}" was not published; its status or published timestamp may have changed.`;
        const payload = failurePayload({
          outcome: "persistence_failed",
          requestedTransition,
          articleId: article.id,
          storyClusterId: article.storyClusterId,
          fromStatus: article.status,
          operatorType,
          reason: message,
          finishedAt: now,
        });

        return finishFailure(tx, run.id, now, payload, "persistence_failed", message, {
          articleId: article.id,
          storyClusterId: article.storyClusterId,
        });
      }

      const nextArticle: ArticleReviewArticle = {
        ...article,
        status: "published",
        publishedAt: published.publishedAt,
        updatedAt: published.updatedAt,
      };
      const payload = successPayload({
        outcome: "published",
        requestedTransition,
        article: nextArticle,
        operatorType,
        alreadyPublished: false,
        publishedAt: published.publishedAt,
        finishedAt: now,
      });

      await tx.finishPublishPipelineRun(run.id, {
        status: "succeeded",
        attempt,
        finishedAt: now,
        payload,
        articleId: nextArticle.id,
        storyClusterId: nextArticle.storyClusterId,
      });

      return {
        ok: true,
        outcome: "published",
        article: nextArticle,
        validation,
        pipelineRun: { id: run.id, status: "succeeded", payload },
      };
    } catch (error) {
      const message = sanitizePublishText(readErrorMessage(error, "Publish attempt failed."));
      const payload = failurePayload({
        outcome: "persistence_failed",
        requestedTransition: "ready->published",
        articleId: input.articleId,
        operatorType,
        reason: message,
        finishedAt: now,
      });

      return finishFailure(tx, run.id, now, payload, "persistence_failed", message);
    }
  });
}

export function validatePublishEligibility(
  article: ArticleReviewArticle,
): ArticlePublishValidationResult {
  const issues: ArticlePublishValidationIssue[] = [];

  if (article.status !== "ready") {
    issues.push({
      code: "invalid_status",
      message: `Article must be in ready status before first publication; current status is "${article.status}".`,
    });
  }

  if (article.publishedAt !== null) {
    issues.push({
      code: "published_at_present",
      message: "Article must not already have a published timestamp before first publication.",
    });
  }

  issues.push(...readyGateIssues(article.validation.issues));

  return { ok: issues.length === 0, issues };
}

function validateAlreadyPublishedEligibility(
  article: ArticleReviewArticle,
): ArticlePublishValidationResult {
  const issues: ArticlePublishValidationIssue[] = [];

  if (article.publishedAt === null) {
    issues.push({
      code: "missing_published_at",
      message: "Published article must retain its first published timestamp.",
    });
  }

  issues.push(...readyGateIssues(article.validation.issues));

  return { ok: issues.length === 0, issues };
}

async function finishAlreadyPublished(
  tx: ArticlePublishingTransaction,
  runId: string,
  article: ArticleReviewArticle,
  now: Date,
  requestedTransition: string,
  operatorType: string,
): Promise<PublishArticleResult> {
  const validation = validateAlreadyPublishedEligibility(article);

  if (!validation.ok) {
    const message = `Article "${article.id}" is not eligible for idempotent publication.`;
    const payload = failurePayload({
      outcome: "validation_failed",
      requestedTransition,
      articleId: article.id,
      storyClusterId: article.storyClusterId,
      fromStatus: article.status,
      operatorType,
      reason: message,
      validation,
      finishedAt: now,
    });

    return finishFailure(tx, runId, now, payload, "validation_failed", message, {
      articleId: article.id,
      storyClusterId: article.storyClusterId,
      issues: validation.issues,
    });
  }

  const payload = successPayload({
    outcome: "already_published",
    requestedTransition,
    article,
    operatorType,
    alreadyPublished: true,
    publishedAt: article.publishedAt,
    finishedAt: now,
  });

  await tx.finishPublishPipelineRun(runId, {
    status: "succeeded",
    attempt,
    finishedAt: now,
    payload,
    articleId: article.id,
    storyClusterId: article.storyClusterId,
  });

  return {
    ok: true,
    outcome: "already_published",
    article,
    validation,
    pipelineRun: { id: runId, status: "succeeded", payload },
  };
}

async function finishFailure(
  tx: ArticlePublishingTransaction,
  runId: string,
  now: Date,
  payload: PublishJsonObject,
  code: ArticlePublishErrorCode,
  message: string,
  refs: {
    readonly articleId?: string;
    readonly storyClusterId?: string;
    readonly issues?: readonly ArticlePublishValidationIssue[];
  } = {},
): Promise<PublishArticleResult> {
  const errorMessage = sanitizePublishText(message);

  await tx.finishPublishPipelineRun(runId, {
    status: "failed",
    attempt,
    finishedAt: now,
    payload,
    errorMessage,
    ...(refs.articleId !== undefined ? { articleId: refs.articleId } : {}),
    ...(refs.storyClusterId !== undefined ? { storyClusterId: refs.storyClusterId } : {}),
  });

  const error: ArticlePublishFailure =
    refs.issues !== undefined && refs.issues.length > 0
      ? { code, message: errorMessage, issues: refs.issues }
      : { code, message: errorMessage };

  const summary: PublishPipelineRunSummary = {
    id: runId,
    status: "failed",
    payload,
    errorMessage,
  };

  return { ok: false, error, pipelineRun: summary };
}

function readyGateIssues(
  issues: readonly ArticleReviewValidationIssue[],
): readonly ArticlePublishValidationIssue[] {
  return issues
    .filter((issue) => issue.code !== "invalid_status")
    .map((issue) => ({ code: issue.code, message: sanitizePublishText(issue.message) }));
}

function successPayload(input: {
  readonly outcome: "published" | "already_published";
  readonly requestedTransition: string;
  readonly article: ArticleReviewArticle;
  readonly operatorType: string;
  readonly alreadyPublished: boolean;
  readonly publishedAt: Date | null;
  readonly finishedAt: Date;
}): PublishJsonObject {
  return {
    outcome: input.outcome,
    requestedTransition: input.requestedTransition,
    fromStatus: input.alreadyPublished ? "published" : "ready",
    toStatus: "published",
    articleId: input.article.id,
    storyClusterId: input.article.storyClusterId,
    operatorType: input.operatorType,
    alreadyPublished: input.alreadyPublished,
    publishedAt: input.publishedAt?.toISOString() ?? null,
    finishedAt: input.finishedAt.toISOString(),
  };
}

function failurePayload(input: {
  readonly outcome: "not_found" | "invalid_transition" | "validation_failed" | "persistence_failed";
  readonly requestedTransition: string;
  readonly articleId: string;
  readonly storyClusterId?: string;
  readonly fromStatus?: string;
  readonly operatorType: string;
  readonly reason: string;
  readonly validation?: ArticlePublishValidationResult;
  readonly finishedAt: Date;
}): PublishJsonObject {
  return {
    outcome: input.outcome,
    requestedTransition: input.requestedTransition,
    ...(input.fromStatus !== undefined ? { fromStatus: input.fromStatus } : {}),
    toStatus: "published",
    articleId: input.articleId,
    ...(input.storyClusterId !== undefined ? { storyClusterId: input.storyClusterId } : {}),
    operatorType: input.operatorType,
    reason: sanitizePublishText(input.reason),
    ...(input.validation !== undefined
      ? { validationErrors: input.validation.issues.map((issue) => sanitizeIssue(issue)) }
      : {}),
    finishedAt: input.finishedAt.toISOString(),
  };
}

function sanitizeIssue(issue: ArticlePublishValidationIssue): PublishJsonObject {
  return {
    code: issue.code,
    message: sanitizePublishText(issue.message),
  };
}

function sanitizeOperatorType(value: string | undefined): string {
  const sanitized = sanitizePublishText(value ?? defaultOperatorType).slice(0, maxOperatorTypeLength);

  return sanitized.length > 0 ? sanitized : defaultOperatorType;
}

function sanitizePublishText(value: string): string {
  return sanitizeErrorMessage(redactSecretLikeText(value)).trim();
}

const secretKeyPattern = /(api[-_ ]?key|secret|token|password|service[-_ ]?role)/i;

function redactSecretLikeText(value: string): string {
  if (secretKeyPattern.test(value)) {
    return value
      .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
      .replace(
        /\b(api[-_ ]?key|secret|token|password|service[-_ ]?role)\s*[:=]\s*\S+/gi,
        "$1=[redacted]",
      );
  }

  return value;
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}
