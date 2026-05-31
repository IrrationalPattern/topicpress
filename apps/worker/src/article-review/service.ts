import type { ArticleStatus } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import {
  sanitizeHeroImageCandidateErrorMessage,
  sanitizeHeroImageCandidateJson,
  sanitizeHeroImageCandidateReviewNote,
} from "../hero-image-candidates/service-utils.js";
import { createDrizzleArticleReviewStore } from "./drizzle-store.js";
import type {
  ArticleReviewArticle,
  ArticleReviewArticleData,
  ArticleReviewErrorCode,
  ArticleReviewFailure,
  ArticleReviewOptions,
  ArticleReviewStore,
  ArticleReviewTransitionResult,
  ArticleReviewValidationIssue,
  ArticleReviewValidationResult,
  ListReviewableArticlesOptions,
  LoadArticleReviewResult,
  TransitionArticleReviewStatusInput,
} from "./types.js";

const defaultReviewableStatuses: readonly ArticleStatus[] = ["draft", "review", "ready"];
const allowedTransitions = new Set(["draft->review", "review->ready", "review->failed", "ready->failed"]);
const maxReviewNoteLength = 2_000;

export async function listReviewableArticles(
  db: TopicpressDatabase,
  options: ListReviewableArticlesOptions = {},
): Promise<readonly ArticleReviewArticle[]> {
  return listReviewableArticlesWithStore(createDrizzleArticleReviewStore(db), options);
}

export async function listReviewableArticlesWithStore(
  store: ArticleReviewStore,
  options: ListReviewableArticlesOptions = {},
): Promise<readonly ArticleReviewArticle[]> {
  return store.transaction(async (tx) => {
    const ids = await tx.listReviewableArticleIds({
      ...options,
      statuses: options.statuses ?? defaultReviewableStatuses,
    });
    const articles = await Promise.all(ids.map((id) => tx.findArticleReviewById(id)));

    return articles.flatMap((article) => (article === null ? [] : [buildArticleReview(article)]));
  });
}

export async function loadArticleReview(
  db: TopicpressDatabase,
  articleId: string,
): Promise<LoadArticleReviewResult> {
  return loadArticleReviewWithStore(createDrizzleArticleReviewStore(db), articleId);
}

export async function loadArticleReviewWithStore(
  store: ArticleReviewStore,
  articleId: string,
): Promise<LoadArticleReviewResult> {
  return store.transaction(async (tx) => {
    const article = await tx.findArticleReviewById(articleId);

    if (article === null) {
      return failure("not_found", `Article "${articleId}" was not found.`);
    }

    return { ok: true, article: buildArticleReview(article) };
  });
}

export async function transitionArticleReviewStatus(
  db: TopicpressDatabase,
  input: TransitionArticleReviewStatusInput,
  options: ArticleReviewOptions = {},
): Promise<ArticleReviewTransitionResult> {
  return transitionArticleReviewStatusWithStore(
    createDrizzleArticleReviewStore(db),
    input,
    options,
  );
}

export async function transitionArticleReviewStatusWithStore(
  store: ArticleReviewStore,
  input: TransitionArticleReviewStatusInput,
  options: ArticleReviewOptions = {},
): Promise<ArticleReviewTransitionResult> {
  const now = options.now ?? new Date();

  try {
    return await store.transaction(async (tx) => {
      const current = await tx.findArticleReviewById(input.articleId);

      if (current === null) {
        return failure("not_found", `Article "${input.articleId}" was not found.`);
      }

      const article = buildArticleReview(current);
      const transitionKey = `${article.status}->${input.toStatus}`;

      if (!allowedTransitions.has(transitionKey)) {
        return failure(
          "invalid_transition",
          `Cannot transition article "${article.id}" from "${article.status}" to "${input.toStatus}".`,
        );
      }

      const noteResult = reviewNotesForTransition(input);

      if (!noteResult.ok) {
        return failure(noteResult.code, noteResult.message);
      }

      if (input.toStatus === "ready" && !article.validation.ok) {
        return failure(
          "validation_failed",
          `Article "${article.id}" is not eligible for ready status.`,
          article.validation.issues,
        );
      }

      const updated = await tx.updateArticleStatus({
        articleId: article.id,
        expectedStatus: article.status,
        toStatus: input.toStatus,
        updatedAt: now,
        ...(noteResult.reviewNotes !== undefined ? { reviewNotes: noteResult.reviewNotes } : {}),
      });

      if (updated === null) {
        return failure(
          "persistence_failed",
          `Article "${article.id}" was not updated; its status may have changed.`,
        );
      }

      const refreshed = await tx.findArticleReviewById(article.id);

      if (refreshed === null) {
        return failure("persistence_failed", `Article "${article.id}" could not be reloaded.`);
      }

      const nextArticle = buildArticleReview(refreshed);

      return { ok: true, article: nextArticle, validation: nextArticle.validation };
    });
  } catch (error) {
    return failure(
      "persistence_failed",
      error instanceof Error ? error.message : "Article review transition failed.",
    );
  }
}

export function validateReadyEligibility(
  article: ArticleReviewArticle,
): ArticleReviewValidationResult {
  return {
    ok: article.validation.ok,
    issues: article.validation.issues,
  };
}

export function buildArticleReview(data: ArticleReviewArticleData): ArticleReviewArticle {
  const localizations = data.localizations.map(sanitizeLocalizationForReview);
  const primaryLocalization =
    localizations.find((localization) => localization.locale === data.article.primaryLocale) ?? null;
  const validation = validateArticleData(data, primaryLocalization);

  return {
    id: data.article.id,
    storyClusterId: data.article.storyClusterId,
    categoryId: data.article.categoryId,
    slug: data.article.slug,
    status: data.article.status,
    heroImageUrl: data.article.heroImageUrl,
    primaryLocale: data.article.primaryLocale,
    publishedAt: data.article.publishedAt,
    reviewNotes: sanitizeReviewNote(data.article.reviewNotes ?? undefined) ?? null,
    generationMetadata: sanitizeJsonValue(data.article.generationMetadata),
    createdAt: data.article.createdAt,
    updatedAt: data.article.updatedAt,
    category: data.category,
    storyCluster: data.storyCluster,
    primaryLocalization,
    localizations,
    sources: data.sources,
    heroImageCandidate: sanitizeHeroImageCandidateForReview(data.heroImageCandidate),
    validation,
  };
}

function sanitizeHeroImageCandidateForReview(
  candidate: ArticleReviewArticleData["heroImageCandidate"],
): ArticleReviewArticle["heroImageCandidate"] {
  if (candidate === null) {
    return null;
  }

  return {
    id: candidate.id,
    status: candidate.status,
    provider: candidate.provider,
    model: candidate.model,
    prompt: sanitizeHeroImageCandidateErrorMessage(candidate.prompt),
    promptHash: candidate.promptHash,
    stylePolicy: candidate.stylePolicy,
    contentType: candidate.contentType,
    width: candidate.width,
    height: candidate.height,
    sizeBytes: candidate.sizeBytes,
    publicUrl: candidate.publicUrl,
    reviewNotes: sanitizeHeroImageCandidateReviewNote(candidate.reviewNotes ?? undefined),
    generationMetadata: sanitizeJsonValue(sanitizeHeroImageCandidateJson(candidate.generationMetadata)),
    generatedAt: candidate.generatedAt,
    reviewedAt: candidate.reviewedAt,
    privatePreviewAvailable: false,
  };
}

function sanitizeLocalizationForReview(
  localization: ArticleReviewArticle["localizations"][number],
): ArticleReviewArticle["localizations"][number] {
  return {
    ...localization,
    body: removeInternalBodySections(localization.body),
  };
}

function removeInternalBodySections(body: string): string {
  return (
    body
      .split(/\n(?=#{1,6}\s*(?:source(?:s)?|source and lineage|citations?|lineage|metadata|internal notes?)\b)/i)[0]
      ?.split(/\r?\n/)
      .filter((line) => !containsInternalReference(line))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() ?? body
  );
}

function containsInternalReference(value: string): boolean {
  return (
    /\b(?:story\s+cluster|source\s+item|generation\s+run)\s+id\b/i.test(value) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(value)
  );
}

function validateArticleData(
  data: ArticleReviewArticleData,
  primaryLocalization: ArticleReviewArticle["primaryLocalization"],
): ArticleReviewValidationResult {
  const issues: ArticleReviewValidationIssue[] = [];

  if (data.article.status !== "review") {
    issues.push({
      code: "invalid_status",
      message: `Article must be in review status before it can be marked ready; current status is "${data.article.status}".`,
    });
  }

  if (isBlank(data.article.storyClusterId)) {
    issues.push({
      code: "missing_story_cluster",
      message: "Article must reference a story cluster.",
    });
  }

  if (data.articleIdsWithSameStoryCluster.some((id) => id !== data.article.id)) {
    issues.push({
      code: "duplicate_story_cluster",
      message: "Article story cluster is already attached to another canonical article.",
    });
  }

  if (!data.category.isActive) {
    issues.push({
      code: "inactive_category",
      message: `Article category "${data.category.slug}" is not active.`,
    });
  }

  if (isBlank(data.article.slug)) {
    issues.push({
      code: "missing_slug",
      message: "Article must have a slug.",
    });
  }

  if (data.articleIdsWithSameSlug.some((id) => id !== data.article.id)) {
    issues.push({
      code: "duplicate_slug",
      message: `Article slug "${data.article.slug}" is already used by another article.`,
    });
  }

  if (primaryLocalization === null) {
    issues.push({
      code: "missing_primary_localization",
      message: `Article must have a primary "${data.article.primaryLocale}" localization.`,
    });
  } else {
    if (isBlank(primaryLocalization.title)) {
      issues.push({ code: "missing_title", message: "Primary localization must have a title." });
    }

    if (isBlank(primaryLocalization.body)) {
      issues.push({ code: "missing_body", message: "Primary localization must have a body." });
    }

    if (isBlank(primaryLocalization.excerpt)) {
      issues.push({
        code: "missing_excerpt",
        message: "Primary localization must have an excerpt.",
      });
    }

    if (isBlank(primaryLocalization.metaTitle)) {
      issues.push({
        code: "missing_meta_title",
        message: "Primary localization must have a meta title.",
      });
    }

    if (isBlank(primaryLocalization.metaDescription)) {
      issues.push({
        code: "missing_meta_description",
        message: "Primary localization must have a meta description.",
      });
    }
  }

  if (data.sources.length === 0) {
    issues.push({
      code: "missing_source_lineage",
      message: "Article must preserve at least one source lineage row.",
    });
  } else if (hasRecordedSourceRoles(data.sources) && !hasPrimarySourceLineage(data.sources)) {
    issues.push({
      code: "missing_primary_source_lineage",
      message: "Article source lineage must preserve at least one primary source role.",
    });
  }

  if (!hasGenerationMetadata(data.article.generationMetadata)) {
    issues.push({
      code: "missing_generation_metadata",
      message: "Article must include generation metadata.",
    });
  }

  return { ok: issues.length === 0, issues };
}

type ReviewNotesResult =
  | {
      readonly ok: true;
      readonly reviewNotes?: string;
    }
  | {
      readonly ok: false;
      readonly code: ArticleReviewErrorCode;
      readonly message: string;
    };

function reviewNotesForTransition(input: TransitionArticleReviewStatusInput): ReviewNotesResult {
  if (input.toStatus === "failed") {
    const sanitizedReason = sanitizeReviewNote(input.reason);

    if (sanitizedReason === undefined) {
      return {
        ok: false,
        code: "missing_reason",
        message: "A non-empty, non-secret reason is required when marking an article failed.",
      };
    }

    return { ok: true, reviewNotes: sanitizedReason };
  }

  const sanitizedReviewNote = sanitizeReviewNote(input.reviewNote);
  return sanitizedReviewNote === undefined ? { ok: true } : { ok: true, reviewNotes: sanitizedReviewNote };
}

function sanitizeReviewNote(input: string | undefined): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  const compacted = input
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, maxReviewNoteLength);
  const redacted = redactSecretLikeText(compacted).trim();

  return redacted.length > 0 ? redacted : undefined;
}

function sanitizeJsonValue(value: unknown): ArticleReviewArticle["generationMetadata"] {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value === "string" ? redactSecretLikeText(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        secretKeyPattern.test(key) ? "[redacted]" : sanitizeJsonValue(entry),
      ]),
    );
  }

  return {};
}

const secretKeyPattern = /(api[-_ ]?key|secret|token|password|service[-_ ]?role)/i;

function redactSecretLikeText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(
      /\b(api[-_ ]?key|secret|token|password|service[-_ ]?role)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    );
}

function hasGenerationMetadata(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}

function hasRecordedSourceRoles(sources: ArticleReviewArticleData["sources"]): boolean {
  return sources.some((source) => source.role.trim().length > 0);
}

function hasPrimarySourceLineage(sources: ArticleReviewArticleData["sources"]): boolean {
  return sources.some((source) => source.role.trim() === "primary");
}

function isBlank(value: string | null | undefined): boolean {
  return value === undefined || value === null || value.trim().length === 0;
}

function failure(
  code: ArticleReviewErrorCode,
  message: string,
  issues?: readonly ArticleReviewValidationIssue[],
): ArticleReviewTransitionResult & LoadArticleReviewResult {
  const error: ArticleReviewFailure =
    issues !== undefined && issues.length > 0 ? { code, message, issues } : { code, message };

  return { ok: false, error };
}
