"use server";

import { revalidatePath } from "next/cache";

import {
  generateOrRegenerateEditorialArticleHeroImage,
  publishEditorialArticle,
  transitionEditorialArticleReviewStatus,
} from "@/lib/article-review";
import type {
  ReviewActionFeedback,
  ReviewActionIntent,
  ReviewActionIssue,
} from "./review-action-state";

const reviewListPath = "/internal/editorial/review";
const staleHeroImageApprovalIssueCodes = new Set([
  "missing_approved_hero_image",
  "unapproved_hero_image_candidate",
  "missing_approved_hero_image_public_url",
  "hero_image_url_mismatch",
]);

export async function reviewArticleAction(
  previousState: ReviewActionFeedback,
  formData: FormData,
): Promise<ReviewActionFeedback> {
  const refreshToken = previousState.refreshToken + 1;
  const articleId = readFormText(formData, "articleId");
  const intent = readFormText(formData, "intent") as ReviewActionIntent | null;

  if (articleId === null) {
    return formFailure(
      refreshToken,
      "missing_article",
      "Missing article",
      "Article id was not submitted.",
    );
  }

  switch (intent) {
    case "request_review":
      return transitionArticle(refreshToken, articleId, "review");
    case "approve_ready":
      return transitionArticle(refreshToken, articleId, "ready");
    case "mark_failed":
      return transitionArticle(refreshToken, articleId, "failed", readFormText(formData, "reason"));
    case "publish":
      return publishArticle(refreshToken, articleId);
    case "generate_hero_image":
      return generateHeroImage(refreshToken, articleId);
    case "hold":
      return {
        ok: true,
        title: "Held for review",
        message: "No article status change was requested.",
        code: null,
        issues: [],
        pipelineRunId: null,
        pipelineRunStatus: null,
        outcome: "held",
        refreshToken,
        shouldRefresh: false,
      };
    default:
      return formFailure(
        refreshToken,
        "unknown_action",
        "Unknown action",
        "The submitted review action is not recognized.",
      );
  }
}

async function generateHeroImage(
  refreshToken: number,
  articleId: string,
): Promise<ReviewActionFeedback> {
  const result = await generateOrRegenerateEditorialArticleHeroImage({ articleId });

  if (!result.ok) {
    return {
      ok: false,
      title: titleForCode(result.error.code),
      message: result.error.message,
      code: result.error.code,
      issues: [],
      pipelineRunId: result.pipelineRunId,
      pipelineRunStatus: "failed",
      outcome: null,
      refreshToken,
      shouldRefresh: false,
    };
  }

  revalidateArticlePaths(articleId);

  const outcome = result.outcome;

  return {
    ok: true,
    title: outcome === "regenerated" ? "Hero image regenerated" : "Hero image generated",
    message: "The generated hero image request completed and the review detail is ready to refresh.",
    code: null,
    issues: [],
    pipelineRunId: result.pipelineRunId,
    pipelineRunStatus: "succeeded",
    outcome,
    refreshToken,
    shouldRefresh: true,
  };
}

async function transitionArticle(
  refreshToken: number,
  articleId: string,
  toStatus: "review" | "ready" | "failed",
  reason: string | null = null,
): Promise<ReviewActionFeedback> {
  const result = await transitionEditorialArticleReviewStatus({
    articleId,
    toStatus,
    ...(reason !== null ? { reason } : {}),
  });

  if (!result.ok) {
    return {
      ok: false,
      title: titleForCode(result.error.code),
      message: result.error.message,
      code: result.error.code,
      issues: toActionIssues(result.error.issues ?? []),
      pipelineRunId: null,
      pipelineRunStatus: null,
      outcome: null,
      refreshToken,
      shouldRefresh: false,
    };
  }

  revalidateArticlePaths(articleId);

  return {
    ok: true,
    title: `Article is ${result.article.status}`,
    message: `The article was updated to "${result.article.status}".`,
    code: null,
    issues: toActionIssues(result.validation.issues),
    pipelineRunId: null,
    pipelineRunStatus: null,
    outcome: result.article.status,
    refreshToken,
    shouldRefresh: true,
  };
}

async function publishArticle(
  refreshToken: number,
  articleId: string,
): Promise<ReviewActionFeedback> {
  const result = await publishEditorialArticle(articleId);

  if (!result.ok) {
    return {
      ok: false,
      title: titleForCode(result.error.code),
      message: result.error.message,
      code: result.error.code,
      issues: toActionIssues(result.error.issues ?? []),
      pipelineRunId: result.pipelineRun.id,
      pipelineRunStatus: result.pipelineRun.status,
      outcome: null,
      refreshToken,
      shouldRefresh: false,
    };
  }

  revalidateArticlePaths(articleId);

  return {
    ok: true,
    title: result.outcome === "already_published" ? "Already published" : "Published",
    message:
      result.outcome === "already_published"
        ? "The publish request was idempotent; the article was already published."
        : "The article was published.",
    code: null,
    issues: toActionIssues(result.validation.issues),
    pipelineRunId: result.pipelineRun.id,
    pipelineRunStatus: result.pipelineRun.status,
    outcome: result.outcome,
    refreshToken,
    shouldRefresh: true,
  };
}

function revalidateArticlePaths(articleId: string): void {
  revalidatePath(reviewListPath);
  revalidatePath(`${reviewListPath}/${articleId}`);
}

function formFailure(
  refreshToken: number,
  code: string,
  title: string,
  message: string,
): ReviewActionFeedback {
  return {
    ok: false,
    title,
    message,
    code,
    issues: [],
    pipelineRunId: null,
    pipelineRunStatus: null,
    outcome: null,
    refreshToken,
    shouldRefresh: false,
  };
}

function readFormText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toActionIssues(
  issues: readonly { readonly code: string; readonly message: string }[],
): readonly ReviewActionIssue[] {
  return issues
    .filter((issue) => !staleHeroImageApprovalIssueCodes.has(issue.code))
    .map((issue) => ({ code: issue.code, message: issue.message }));
}

function titleForCode(code: string): string {
  switch (code) {
    case "not_found":
      return "Article not found";
    case "invalid_transition":
      return "Invalid transition";
    case "validation_failed":
      return "Validation failed";
    case "missing_reason":
      return "Reason required";
    case "persistence_failed":
      return "Persistence failure";
    case "ineligible_article":
      return "Hero image unavailable";
    case "missing_primary_localization":
      return "Missing localization";
    case "provider_failed":
      return "Image provider failure";
    case "storage_failed":
      return "Storage failure";
    default:
      return "Action failed";
  }
}
