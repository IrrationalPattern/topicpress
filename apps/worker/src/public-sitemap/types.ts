import type { Category } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type {
  PublicArticleDetailData,
  PublicArticleDetailTransaction,
} from "../public-article-detail/types.js";

export interface PublicSitemapInventory {
  readonly categories: readonly PublicSitemapCategoryPathRecord[];
  readonly articles: readonly PublicSitemapArticlePathRecord[];
}

export interface PublicSitemapCategoryPathRecord {
  readonly source: "category";
  readonly locale: string;
  readonly categorySlug: string;
  readonly lastModified?: string;
}

export interface PublicSitemapArticlePathRecord {
  readonly source: "article";
  readonly articleId: string;
  readonly locale: string;
  readonly slug: string;
  readonly publishedAt: string;
  readonly updatedAt?: string;
}

export interface PublicSitemapStore {
  readonly transaction: <TResult>(
    callback: (tx: PublicSitemapTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface PublicSitemapTransaction extends PublicArticleDetailTransaction {
  readonly listActiveCategoriesByConfigKeys: (
    configKeys: readonly string[],
  ) => Promise<readonly PublicSitemapCategoryRow[]>;
  readonly listPublicArticleSitemapCandidates: (
    options: ListPublicArticleSitemapCandidatesOptions,
  ) => Promise<readonly PublicArticleDetailData[]>;
}

export interface ListPublicArticleSitemapCandidatesOptions {
  readonly categoryConfigKeys: readonly string[];
  readonly supportedLocales: readonly string[];
}

export type PublicSitemapCategoryRow = Pick<
  Category,
  "id" | "configKey" | "slug" | "isActive" | "updatedAt"
>;

export type PublicSitemapExecutor = Pick<TopicpressDatabase, "select">;
