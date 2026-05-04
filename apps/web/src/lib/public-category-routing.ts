import { getLocalePathSegment, resolveAppLocale, type AppLocale } from "@/i18n/routing";

const categorySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PublicCategoryRouteParams {
  readonly locale: AppLocale;
  readonly categorySlug: string;
}

export function resolvePublicCategoryRouteParams({
  categorySlug,
  locale,
}: {
  readonly categorySlug: string;
  readonly locale: string;
}): PublicCategoryRouteParams | null {
  const appLocale = resolveAppLocale(locale);

  if (appLocale === null || !isCategorySlugSegment(categorySlug)) {
    return null;
  }

  return {
    locale: appLocale,
    categorySlug,
  };
}

export function getPublicCategoryPath(locale: AppLocale, categorySlug: string): string {
  if (!isCategorySlugSegment(categorySlug)) {
    throw new Error(`Invalid public category slug segment "${categorySlug}".`);
  }

  return `/${getLocalePathSegment(locale)}/categories/${categorySlug}`;
}

export function isCategorySlugSegment(categorySlug: string): boolean {
  return categorySlugPattern.test(categorySlug);
}
