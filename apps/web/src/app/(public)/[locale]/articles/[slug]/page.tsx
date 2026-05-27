import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ArticleDetailContent } from "@/components/public/article-detail-content";
import { getPublicArticleDetail } from "@/lib/public-article-detail";
import {
  getPublicArticleDetailMetadata,
  resolvePublicArticleRouteParams,
} from "@/lib/public-article-routing";
import { getPublicCategoryPath, isCategorySlugSegment } from "@/lib/public-category-routing";

export const dynamic = "force-dynamic";

const getCachedPublicArticleDetail = cache(getPublicArticleDetail);

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const routeParams = resolvePublicArticleRouteParams(await params);

  if (routeParams === null) {
    return {};
  }

  const result = await getCachedPublicArticleDetail(routeParams.locale, routeParams.slug);

  return getPublicArticleDetailMetadata(routeParams.locale, result) ?? {};
}

export default async function PublicArticleDetailPage({
  params,
}: {
  readonly params: Promise<{ locale: string; slug: string }>;
}) {
  const routeParams = resolvePublicArticleRouteParams(await params);

  if (routeParams === null) {
    notFound();
  }

  setRequestLocale(routeParams.locale);
  const result = await getCachedPublicArticleDetail(routeParams.locale, routeParams.slug);

  if (result.kind === "not_found") {
    notFound();
  }

  const t = await getTranslations({ locale: routeParams.locale, namespace: "PublicHomePage" });

  if (!isCategorySlugSegment(result.article.category.slug)) {
    notFound();
  }

  const categoryHref = getPublicCategoryPath(routeParams.locale, result.article.category.slug);

  return (
    <ArticleDetailContent
      article={result.article}
      categoryHref={categoryHref}
      categoryLabel={t("articles.categoryLabel")}
      dateLabel={t("articles.dateLabel")}
      locale={routeParams.locale}
    />
  );
}
