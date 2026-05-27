import { siteConfig } from "@topicpress/config";
import type { PublicArticleDetail, PublicArticleDetailResult } from "@topicpress/worker";
import type { Metadata } from "next";

import { getLocalePathSegment, isAppLocale, resolveAppLocale, type AppLocale } from "@/i18n/routing";

const articleSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const articleMetadataSiteSuffix = `| ${siteConfig.identity.name}`;
const normalizedArticleMetadataSiteSuffix = articleMetadataSiteSuffix.toLowerCase();

export interface PublicArticleRouteParams {
  readonly locale: AppLocale;
  readonly slug: string;
}

export function resolvePublicArticleRouteParams({
  locale,
  slug,
}: {
  readonly locale: string;
  readonly slug: string;
}): PublicArticleRouteParams | null {
  const appLocale = resolveAppLocale(locale);

  if (appLocale === null || !isArticleSlugSegment(slug)) {
    return null;
  }

  return {
    locale: appLocale,
    slug,
  };
}

export function getPublicArticlePath(locale: AppLocale, slug: string): string {
  if (!isArticleSlugSegment(slug)) {
    throw new Error(`Invalid public article slug segment "${slug}".`);
  }

  return `/${getLocalePathSegment(locale)}/articles/${slug}`;
}

export interface PublicArticleRouteReference {
  readonly slug: string;
}

export function getPublicArticleRouteHref(
  locale: string,
  article: PublicArticleRouteReference,
): string | undefined {
  const appLocale = resolveAppLocale(locale);

  if (appLocale === null || !isArticleSlugSegment(article.slug)) {
    return undefined;
  }

  return getPublicArticlePath(appLocale, article.slug);
}

export function isArticleSlugSegment(slug: string): boolean {
  return articleSlugPattern.test(slug);
}

export function getPublicArticleDetailMetadata(
  locale: AppLocale,
  result: PublicArticleDetailResult,
): Metadata | null {
  if (result.kind === "not_found") {
    return null;
  }

  const { article } = result;
  const title = getArticleMetadataTitle(article);
  const description = getArticleMetadataDescription(locale, article);

  return {
    title,
    description,
    alternates: {
      languages: getArticleLanguageAlternates(article.alternateSlugs),
    },
    ...(article.keywords === undefined ? {} : { keywords: [...article.keywords] }),
    openGraph: {
      title,
      description,
      siteName: siteConfig.identity.name,
      locale,
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      ...(article.heroImageUrl === undefined ? {} : { images: [article.heroImageUrl] }),
    },
  };
}

export function getArticleMetadataTitle(article: PublicArticleDetail): string {
  if (article.metaTitle !== undefined && hasArticleMetadataSiteSuffix(article.metaTitle)) {
    return article.metaTitle;
  }

  return `${article.metaTitle ?? article.title} ${articleMetadataSiteSuffix}`;
}

function hasArticleMetadataSiteSuffix(title: string): boolean {
  return title.trim().toLowerCase().endsWith(normalizedArticleMetadataSiteSuffix);
}

export function getArticleMetadataDescription(
  locale: AppLocale,
  article: PublicArticleDetail,
): string {
  return (
    article.metaDescription ??
    article.excerpt ??
    siteConfig.seo.descriptions[locale] ??
    siteConfig.seo.descriptions[siteConfig.locales.defaultLocale] ??
    ""
  );
}

export function getArticleLanguageAlternates(
  alternateSlugs: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(alternateSlugs).flatMap(([locale, slug]) => {
      if (!isAppLocale(locale) || !isArticleSlugSegment(slug)) {
        return [];
      }

      return [[locale, getPublicArticlePath(locale, slug)]];
    }),
  );
}
