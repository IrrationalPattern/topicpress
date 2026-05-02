import type { ArticleStatus, Category } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";

export interface HomepageArticle {
  readonly id: string;
  readonly slug: string;
  readonly displaySlug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly subtitle?: string;
  readonly category: HomepageArticleCategory;
  readonly publishedAt: Date;
  readonly heroImageUrl?: string;
  readonly metaTitle?: string;
  readonly metaDescription?: string;
}

export interface HomepageArticleCategory {
  readonly configKey: string;
  readonly slug: string;
  readonly label: string;
}

export interface ListHomepageArticlesOptions {
  readonly locale?: string;
  readonly limit?: number;
}

export interface PublicHomepageStore {
  readonly transaction: <TResult>(
    callback: (tx: PublicHomepageTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface PublicHomepageTransaction {
  readonly listHomepageArticleCandidates: (
    options: ListHomepageArticleCandidatesOptions,
  ) => Promise<readonly HomepageArticleData[]>;
}

export interface ListHomepageArticleCandidatesOptions {
  readonly locales: readonly string[];
  readonly limit: number;
}

export interface HomepageArticleData {
  readonly article: HomepageArticleRow;
  readonly category: HomepageArticleCategoryRow;
  readonly localizations: readonly HomepageArticleLocalizationRow[];
}

export interface HomepageArticleRow {
  readonly id: string;
  readonly status: ArticleStatus;
  readonly publishedAt: Date | null;
  readonly heroImageUrl: string | null;
  readonly createdAt: Date;
}

export type HomepageArticleCategoryRow = Pick<
  Category,
  "configKey" | "slug" | "name" | "isActive"
>;

export interface HomepageArticleLocalizationRow {
  readonly locale: string;
  readonly slug: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly excerpt: string;
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
}

export type PublicHomepageExecutor = Pick<TopicpressDatabase, "select">;
