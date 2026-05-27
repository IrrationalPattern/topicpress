import type { ArticleStatus, Category } from "@topicpress/db";

import type { TopicpressDatabase } from "../database.js";

export type PublicArticleDetailResult =
  | {
      readonly kind: "found";
      readonly article: PublicArticleDetail;
    }
  | { readonly kind: "not_found" };

export interface PublicArticleDetail {
  readonly id: string;
  readonly slug: string;
  readonly displaySlug: string;
  readonly locale: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly excerpt: string;
  readonly body: string;
  readonly category: PublicArticleDetailCategory;
  readonly publishedAt: Date;
  readonly heroImageUrl?: string;
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly keywords?: readonly string[];
  readonly alternateSlugs: Readonly<Record<string, string>>;
}

export interface PublicArticleDetailCategory {
  readonly configKey: string;
  readonly slug: string;
  readonly label: string;
}

export interface GetPublicArticleDetailOptions {
  readonly locale?: string;
  readonly slug: string;
}

export interface PublicArticleDetailStore {
  readonly transaction: <TResult>(
    callback: (tx: PublicArticleDetailTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
}

export interface PublicArticleDetailTransaction {
  readonly findArticleDetailCandidatesBySlug: (
    options: FindArticleDetailCandidatesBySlugOptions,
  ) => Promise<readonly PublicArticleDetailData[]>;
}

export interface FindArticleDetailCandidatesBySlugOptions {
  readonly slug: string;
  readonly requestedLocale: string;
  readonly defaultLocale: string;
  readonly supportedLocales: readonly string[];
}

export interface PublicArticleDetailData {
  readonly article: PublicArticleDetailRow;
  readonly category: PublicArticleDetailCategoryRow;
  readonly localizations: readonly PublicArticleDetailLocalizationRow[];
}

export interface PublicArticleDetailRow {
  readonly id: string;
  readonly slug: string;
  readonly status: ArticleStatus;
  readonly publishedAt: Date | null;
  readonly heroImageUrl: string | null;
  readonly updatedAt?: Date;
}

export type PublicArticleDetailCategoryRow = Pick<
  Category,
  "configKey" | "slug" | "name" | "isActive"
>;

export interface PublicArticleDetailLocalizationRow {
  readonly locale: string;
  readonly slug: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly excerpt: string;
  readonly body: string;
  readonly keywords: readonly string[];
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
}

export type PublicArticleDetailExecutor = Pick<TopicpressDatabase, "select">;
