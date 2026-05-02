import { siteConfig as defaultSiteConfig, type SiteConfig } from "@topicpress/config";

import type { TopicpressDatabase } from "../database.js";
import { createDrizzlePublicHomepageStore } from "./drizzle-store.js";
import type {
  HomepageArticle,
  HomepageArticleData,
  HomepageArticleLocalizationRow,
  ListHomepageArticlesOptions,
  PublicHomepageStore,
} from "./types.js";

const defaultHomepageLimit = 12;

export async function listHomepageArticles(
  db: TopicpressDatabase,
  options: ListHomepageArticlesOptions = {},
): Promise<readonly HomepageArticle[]> {
  return listHomepageArticlesWithStore(createDrizzlePublicHomepageStore(db), options);
}

export async function listHomepageArticlesWithStore(
  store: PublicHomepageStore,
  options: ListHomepageArticlesOptions = {},
  config: SiteConfig = defaultSiteConfig,
): Promise<readonly HomepageArticle[]> {
  const locale = resolveRequestedLocale(options.locale, config);
  const defaultLocale = config.locales.defaultLocale;
  const locales = uniqueLocales([locale, defaultLocale]);
  const limit = normalizeLimit(options.limit);

  return store.transaction(async (tx) => {
    const candidates = await tx.listHomepageArticleCandidates({ locales, limit });

    return candidates
      .flatMap((candidate) => buildHomepageArticle(candidate, locale, defaultLocale, config))
      .slice(0, limit);
  });
}

function buildHomepageArticle(
  data: HomepageArticleData,
  locale: string,
  defaultLocale: string,
  config: SiteConfig,
): readonly HomepageArticle[] {
  if (data.article.status !== "published" || data.article.publishedAt === null) {
    return [];
  }

  if (!data.category.isActive) {
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

function resolveRequestedLocale(locale: string | undefined, config: SiteConfig): string {
  const requestedLocale = locale ?? config.locales.defaultLocale;

  if (!config.locales.supportedLocales.includes(requestedLocale)) {
    throw new Error(`Unsupported homepage locale "${requestedLocale}".`);
  }

  return requestedLocale;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return defaultHomepageLimit;
  }

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("Homepage article limit must be a non-negative integer.");
  }

  return Math.min(limit, defaultHomepageLimit);
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
  requestedLocalization: HomepageArticleLocalizationRow | undefined,
  defaultLocalization: HomepageArticleLocalizationRow | undefined,
  field: "slug" | "title" | "excerpt",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveOptionalLocalizedField(
  requestedLocalization: HomepageArticleLocalizationRow | undefined,
  defaultLocalization: HomepageArticleLocalizationRow | undefined,
  field: "subtitle" | "metaTitle" | "metaDescription",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveCategoryLabel(
  configKey: string,
  databaseName: string,
  locale: string,
  config: SiteConfig,
): string {
  const categoryConfig = config.taxonomy.find((category) => category.key === configKey);
  const label =
    categoryConfig?.labels[locale] ??
    categoryConfig?.labels[config.locales.defaultLocale] ??
    databaseName;

  return sanitizeOptionalText(label) ?? databaseName;
}

function sanitizeOptionalText(value: string | null | undefined): string | undefined {
  const sanitized = value?.replace(/\0/g, "").trim();

  return sanitized === undefined || sanitized.length === 0 ? undefined : sanitized;
}
