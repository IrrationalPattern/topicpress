import { and, eq, isNull } from "drizzle-orm";

import { articles, pipelineRuns } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import { createDrizzleArticleReviewTransaction } from "../article-review/drizzle-store.js";
import type {
  ArticlePublishingExecutor,
  ArticlePublishingStore,
  ArticlePublishingTransaction,
  CreatePublishPipelineRunInput,
  FinishPublishPipelineRunInput,
  PublishArticleMutationInput,
  PublishArticleMutationRow,
} from "./types.js";

export function createDrizzleArticlePublishingStore(db: TopicpressDatabase): ArticlePublishingStore {
  return {
    transaction: (callback) =>
      db.transaction((tx) => callback(createDrizzleArticlePublishingTransaction(tx))),
  };
}

function createDrizzleArticlePublishingTransaction(
  db: ArticlePublishingExecutor,
): ArticlePublishingTransaction {
  const reviewTx = createDrizzleArticleReviewTransaction(db);

  return {
    findArticleReviewById: (articleId) => reviewTx.findArticleReviewById(articleId),
    createPublishPipelineRun: (input) => createPublishPipelineRun(db, input),
    finishPublishPipelineRun: (runId, input) => finishPublishPipelineRun(db, runId, input),
    publishArticle: (input) => publishArticle(db, input),
  };
}

async function createPublishPipelineRun(
  db: ArticlePublishingExecutor,
  input: CreatePublishPipelineRunInput,
): Promise<{ readonly id: string }> {
  const rows = await db
    .insert(pipelineRuns)
    .values({
      runType: "publish",
      status: "running",
      attempt: input.attempt,
      startedAt: input.startedAt,
      payload: input.payload,
      createdAt: input.startedAt,
      updatedAt: input.startedAt,
    })
    .returning({ id: pipelineRuns.id });
  const row = rows[0];

  if (row === undefined) {
    throw new Error("Failed to create publish pipeline run.");
  }

  return row;
}

async function finishPublishPipelineRun(
  db: ArticlePublishingExecutor,
  runId: string,
  input: FinishPublishPipelineRunInput,
): Promise<void> {
  await db
    .update(pipelineRuns)
    .set({
      status: input.status,
      attempt: input.attempt,
      finishedAt: input.finishedAt,
      payload: input.payload,
      errorMessage: input.errorMessage ?? null,
      ...(input.articleId !== undefined ? { articleId: input.articleId } : {}),
      ...(input.storyClusterId !== undefined ? { storyClusterId: input.storyClusterId } : {}),
      updatedAt: input.finishedAt,
    })
    .where(eq(pipelineRuns.id, runId));
}

async function publishArticle(
  db: ArticlePublishingExecutor,
  input: PublishArticleMutationInput,
): Promise<PublishArticleMutationRow | null> {
  const rows = await db
    .update(articles)
    .set({
      status: "published",
      publishedAt: input.publishedAt,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(articles.id, input.articleId),
        eq(articles.status, input.expectedStatus),
        isNull(articles.publishedAt),
      ),
    )
    .returning({
      id: articles.id,
      status: articles.status,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    });
  const row = rows[0];

  if (row === undefined || row.status !== "published" || row.publishedAt === null) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}
