import type { ArticleStatus, Category } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";
import type { HomepageArticle, HomepageArticleLocalizationRow, HomepageArticleRow } from "../public-homepage/types.js";

export type CategoryListingResult =
  | {
      readonly kind: "found";
      readonly locale: string;
      readonly category: CategoryListingCategory;
      readonly articles: readonly HomepageArticle[];
      readonly limit: number;
      readonly hasMore: false;
    }
  | { readonly kind: "not_found" };

export interface CategoryListingCategory {
  readonly configKey: string;
  readonly slug: string;
  readonly label: string;
  readonly description?: string;
}

export interface GetCategoryListingOptions {
  readonly locale?: string;
  readonly categorySlug: string;
  readonly limit?: number;
}

export interface PublicCategoryListingStore {
  readonly transaction: <TResult>(
    callback: (tx: PublicCategoryListingTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface PublicCategoryListingTransaction {
  readonly findActiveCategoryByConfigKey: (
    configKey: string,
  ) => Promise<CategoryListingCategoryRow | null>;
  readonly listCategoryArticleCandidates: (
    options: ListCategoryArticleCandidatesOptions,
  ) => Promise<readonly CategoryListingArticleData[]>;
}

export interface ListCategoryArticleCandidatesOptions {
  readonly categoryId: string;
  readonly locales: readonly string[];
  readonly limit: number;
}

export interface CategoryListingArticleData {
  readonly article: CategoryListingArticleRow;
  readonly category: CategoryListingCategoryRow;
  readonly localizations: readonly HomepageArticleLocalizationRow[];
}

export interface CategoryListingArticleRow extends HomepageArticleRow {
  readonly status: ArticleStatus;
}

export type CategoryListingCategoryRow = Pick<
  Category,
  "id" | "configKey" | "slug" | "name" | "description" | "isActive"
>;

export type PublicCategoryListingExecutor = Pick<TopicpressDatabase, "select">;
