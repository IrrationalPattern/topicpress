import { siteConfig } from "@topicpress/config";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CategoryListingContent } from "@/components/public/category-listing-content";
import { getActiveCategoryRouteHref } from "@/components/public/category-links";
import { routing } from "@/i18n/routing";
import { getPublicCategoryListingMetadata } from "@/lib/public-category-page";
import { getPublicCategoryListing } from "@/lib/public-category-listing";
import { resolvePublicCategoryRouteParams } from "@/lib/public-category-routing";

export const dynamic = "force-dynamic";

const getCachedPublicCategoryListing = cache(getPublicCategoryListing);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    siteConfig.taxonomy
      .filter((category) => category.isActive)
      .map((category) => ({ locale, categorySlug: category.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ categorySlug: string; locale: string }>;
}): Promise<Metadata> {
  const routeParams = resolvePublicCategoryRouteParams(await params);

  if (routeParams === null) {
    return {};
  }

  const result = await getCachedPublicCategoryListing(
    routeParams.locale,
    routeParams.categorySlug,
  );

  return getPublicCategoryListingMetadata(routeParams.locale, result) ?? {};
}

export default async function PublicCategoryPage({
  params,
}: {
  readonly params: Promise<{ categorySlug: string; locale: string }>;
}) {
  const routeParams = resolvePublicCategoryRouteParams(await params);

  if (routeParams === null) {
    notFound();
  }

  setRequestLocale(routeParams.locale);
  const result = await getCachedPublicCategoryListing(routeParams.locale, routeParams.categorySlug);

  if (result.kind === "not_found") {
    notFound();
  }

  const t = await getTranslations({ locale: routeParams.locale, namespace: "PublicHomePage" });

  return (
    <CategoryListingContent
      articleListAriaLabel={t("categories.articlesAriaLabel", {
        category: result.category.label,
      })}
      articleStatus={t("categories.articleCount", { count: result.articles.length })}
      articles={result.articles}
      category={result.category}
      categoryLabel={t("articles.categoryLabel")}
      dateLabel={t("articles.dateLabel")}
      emptyStateDescription={t("categories.emptyStateDescription", {
        category: result.category.label,
      })}
      emptyStateTitle={t("categories.emptyStateTitle")}
      getCategoryHref={(article) => getActiveCategoryRouteHref(routeParams.locale, article.category)}
      locale={routeParams.locale}
      slugLabel={t("articles.slugLabel")}
    />
  );
}
