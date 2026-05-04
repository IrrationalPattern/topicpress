import { siteConfig } from "@topicpress/config";

import { resolveAppLocale } from "@/i18n/routing";
import { getPublicCategoryPath } from "@/lib/public-category-routing";

export interface PublicCategoryReference {
  readonly configKey: string;
  readonly slug: string;
}

export function getActiveCategoryRouteHref(
  locale: string,
  category: PublicCategoryReference,
): string | undefined {
  const appLocale = resolveAppLocale(locale);

  if (appLocale === null) {
    return undefined;
  }

  const activeCategory = siteConfig.taxonomy.find(
    (configCategory) =>
      configCategory.isActive &&
      configCategory.key === category.configKey &&
      configCategory.slug === category.slug,
  );

  if (activeCategory === undefined) {
    return undefined;
  }

  return getPublicCategoryPath(appLocale, activeCategory.slug);
}
