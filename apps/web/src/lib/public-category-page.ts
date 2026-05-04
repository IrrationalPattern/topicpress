import { siteConfig } from "@topicpress/config";
import type { Metadata } from "next";

import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import type { CategoryListingResult } from "@/lib/public-category-listing";
import { getPublicCategoryPath } from "@/lib/public-category-routing";

export function getPublicCategoryListingMetadata(
  locale: AppLocale,
  result: CategoryListingResult,
): Metadata | null {
  if (result.kind === "not_found") {
    return null;
  }

  const title = getCategoryMetadataTitle(result.category.label);
  const description = getCategoryMetadataDescription(locale, result.category.description);

  return {
    title,
    description,
    alternates: {
      languages: getCategoryLanguageAlternates(result.category.slug),
    },
    openGraph: {
      title,
      description,
      siteName: siteConfig.identity.name,
      locale,
      type: "website",
    },
  };
}

export function getCategoryMetadataTitle(categoryLabel: string): string {
  return `${categoryLabel} | ${siteConfig.identity.name}`;
}

export function getCategoryMetadataDescription(
  locale: AppLocale,
  categoryDescription: string | undefined,
): string {
  const trimmedCategoryDescription = categoryDescription?.trim();

  if (trimmedCategoryDescription !== undefined && trimmedCategoryDescription.length > 0) {
    return trimmedCategoryDescription;
  }

  return (
    siteConfig.seo.descriptions[locale] ??
    siteConfig.seo.descriptions[siteConfig.locales.defaultLocale] ??
    ""
  );
}

export function getCategoryLanguageAlternates(categorySlug: string): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, getPublicCategoryPath(locale, categorySlug)]),
  );
}
