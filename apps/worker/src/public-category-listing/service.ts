import {
  siteConfig as defaultSiteConfig,
  type CategoryConfig,
  type SiteConfig,
} from "@topicpress/config";

import type { TopicpressDatabase } from "../database.js";
import type { HomepageArticle, HomepageArticleLocalizationRow } from "../public-homepage/types.js";
import { createDrizzlePublicCategoryListingStore } from "./drizzle-store.js";
import type {
  CategoryListingArticleData,
  CategoryListingCategory,
  CategoryListingCategoryRow,
  CategoryListingResult,
  GetCategoryListingOptions,
  PublicCategoryListingStore,
} from "./types.js";

const defaultCategoryListingLimit = 12;
const categorySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getCategoryListing(
  db: TopicpressDatabase,
  options: GetCategoryListingOptions,
): Promise<CategoryListingResult> {
  return getCategoryListingWithStore(createDrizzlePublicCategoryListingStore(db), options);
}

export async function getCategoryListingWithStore(
  store: PublicCategoryListingStore,
  options: GetCategoryListingOptions,
  config: SiteConfig = defaultSiteConfig,
): Promise<CategoryListingResult> {
  const locale = resolveRequestedLocale(options.locale, config);

  if (locale === null || !categorySlugPattern.test(options.categorySlug)) {
    return { kind: "not_found" };
  }

  const configCategory = config.taxonomy.find(
    (category) => category.slug === options.categorySlug,
  );

  if (configCategory === undefined || !configCategory.isActive) {
    return { kind: "not_found" };
  }

  const defaultLocale = config.locales.defaultLocale;
  const locales = uniqueLocales([locale, defaultLocale]);
  const limit = normalizeLimit(options.limit);

  return store.transaction(async (tx) => {
    const dbCategory = await tx.findActiveCategoryByConfigKey(configCategory.key);

    if (
      dbCategory === null ||
      !dbCategory.isActive ||
      dbCategory.slug !== configCategory.slug
    ) {
      return { kind: "not_found" };
    }

    const category = buildCategory(configCategory, dbCategory, locale, defaultLocale);

    if (category === null) {
      return { kind: "not_found" };
    }

    const candidates = await tx.listCategoryArticleCandidates({
      categoryId: dbCategory.id,
      locales,
      limit,
    });
    const articles = candidates
      .flatMap((candidate) =>
        buildCategoryListingArticle(candidate, dbCategory, locale, defaultLocale, config),
      )
      .slice(0, limit);

    return {
      kind: "found",
      locale,
      category,
      articles,
      limit,
      hasMore: false,
    };
  });
}

function buildCategory(
  configCategory: CategoryConfig,
  dbCategory: CategoryListingCategoryRow,
  locale: string,
  defaultLocale: string,
): CategoryListingCategory | null {
  const label =
    resolveLocalizedConfigText(configCategory.labels, locale, defaultLocale) ??
    sanitizeOptionalText(dbCategory.name);

  if (label === undefined) {
    return null;
  }

  const description =
    resolveLocalizedConfigText(configCategory.descriptions, locale, defaultLocale) ??
    sanitizeOptionalText(dbCategory.description);

  return {
    configKey: configCategory.key,
    slug: configCategory.slug,
    label,
    ...(description !== undefined ? { description } : {}),
  };
}

function buildCategoryListingArticle(
  data: CategoryListingArticleData,
  category: CategoryListingCategoryRow,
  locale: string,
  defaultLocale: string,
  config: SiteConfig,
): readonly HomepageArticle[] {
  if (data.article.status !== "published" || data.article.publishedAt === null) {
    return [];
  }

  if (
    !data.category.isActive ||
    data.category.configKey !== category.configKey ||
    data.category.slug !== category.slug
  ) {
    return [];
  }

  const requestedLocalization = findLocalization(data.localizations, locale);
  const defaultLocalization = findLocalization(data.localizations, defaultLocale);
  const slug = resolveRequiredLocalizedField(requestedLocalization, defaultLocalization, "slug");
  const title = resolveRequiredLocalizedField(requestedLocalization, defaultLocalization, "title");
  const excerpt = resolveRequiredLocalizedField(
    requestedLocalization,
    defaultLocalization,
    "excerpt",
  );

  if (slug === undefined || title === undefined || excerpt === undefined) {
    return [];
  }

  const subtitle = resolveOptionalLocalizedField(
    requestedLocalization,
    defaultLocalization,
    "subtitle",
  );
  const metaTitle = resolveOptionalLocalizedField(
    requestedLocalization,
    defaultLocalization,
    "metaTitle",
  );
  const metaDescription = resolveOptionalLocalizedField(
    requestedLocalization,
    defaultLocalization,
    "metaDescription",
  );
  const heroImageUrl = sanitizeOptionalText(data.article.heroImageUrl);

  return [
    {
      id: data.article.id,
      slug,
      displaySlug: slug,
      title,
      excerpt,
      ...(subtitle !== undefined ? { subtitle } : {}),
      category: {
        configKey: data.category.configKey,
        slug: data.category.slug,
        label: resolveCategoryLabel(data.category.configKey, data.category.name, locale, config),
      },
      publishedAt: data.article.publishedAt,
      ...(heroImageUrl !== undefined ? { heroImageUrl } : {}),
      ...(metaTitle !== undefined ? { metaTitle } : {}),
      ...(metaDescription !== undefined ? { metaDescription } : {}),
    },
  ];
}

function resolveRequestedLocale(locale: string | undefined, config: SiteConfig): string | null {
  const requestedLocale = locale ?? config.locales.defaultLocale;

  return config.locales.supportedLocales.includes(requestedLocale) ? requestedLocale : null;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return defaultCategoryListingLimit;
  }

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("Category listing article limit must be a non-negative integer.");
  }

  return Math.min(limit, defaultCategoryListingLimit);
}

function uniqueLocales(locales: readonly string[]): readonly string[] {
  return [...new Set(locales)];
}

function findLocalization(
  localizations: readonly HomepageArticleLocalizationRow[],
  locale: string,
): HomepageArticleLocalizationRow | undefined {
  return localizations.find((localization) => localization.locale === locale);
}

function resolveRequiredLocalizedField(
  requestedLocalization:
    | { readonly slug: string | null; readonly title: string; readonly excerpt: string }
    | undefined,
  defaultLocalization:
    | { readonly slug: string | null; readonly title: string; readonly excerpt: string }
    | undefined,
  field: "slug" | "title" | "excerpt",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveOptionalLocalizedField(
  requestedLocalization:
    | {
        readonly subtitle: string | null;
        readonly metaTitle: string | null;
        readonly metaDescription: string | null;
      }
    | undefined,
  defaultLocalization:
    | {
        readonly subtitle: string | null;
        readonly metaTitle: string | null;
        readonly metaDescription: string | null;
      }
    | undefined,
  field: "subtitle" | "metaTitle" | "metaDescription",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveLocalizedConfigText(
  text: Readonly<Record<string, string>>,
  locale: string,
  defaultLocale: string,
): string | undefined {
  return sanitizeOptionalText(text[locale]) ?? sanitizeOptionalText(text[defaultLocale]);
}

function resolveCategoryLabel(
  configKey: string,
  databaseName: string,
  locale: string,
  config: SiteConfig,
): string {
  const categoryConfig = config.taxonomy.find((category) => category.key === configKey);
  const label =
    resolveLocalizedConfigText(categoryConfig?.labels ?? {}, locale, config.locales.defaultLocale) ??
    sanitizeOptionalText(databaseName);

  return label ?? databaseName;
}

function sanitizeOptionalText(value: string | null | undefined): string | undefined {
  const sanitized = value?.replace(/\0/g, "").trim();

  return sanitized === undefined || sanitized.length === 0 ? undefined : sanitized;
}
