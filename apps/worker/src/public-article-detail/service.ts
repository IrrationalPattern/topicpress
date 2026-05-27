import {
  siteConfig as defaultSiteConfig,
  type CategoryConfig,
  type SiteConfig,
} from "@topicpress/config";

import type { TopicpressDatabase } from "../database.js";
import { createDrizzlePublicArticleDetailStore } from "./drizzle-store.js";
import type {
  GetPublicArticleDetailOptions,
  PublicArticleDetail,
  PublicArticleDetailData,
  PublicArticleDetailLocalizationRow,
  PublicArticleDetailResult,
  PublicArticleDetailStore,
  PublicArticleDetailTransaction,
} from "./types.js";

const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ResolvedPublicArticleDetailCandidate {
  readonly data: PublicArticleDetailData;
  readonly article: Omit<PublicArticleDetail, "alternateSlugs">;
}

export async function getPublicArticleDetail(
  db: TopicpressDatabase,
  options: GetPublicArticleDetailOptions,
): Promise<PublicArticleDetailResult> {
  return getPublicArticleDetailWithStore(createDrizzlePublicArticleDetailStore(db), options);
}

export async function getPublicArticleDetailWithStore(
  store: PublicArticleDetailStore,
  options: GetPublicArticleDetailOptions,
  config: SiteConfig = defaultSiteConfig,
): Promise<PublicArticleDetailResult> {
  const locale = resolveRequestedLocale(options.locale, config);
  const slug = sanitizeOptionalText(options.slug);

  if (locale === null || slug === undefined || !isPublicArticleSlug(slug)) {
    return { kind: "not_found" };
  }

  return store.transaction(async (tx) => {
    const resolved = await resolvePublicArticleDetailCandidateForSlug(tx, slug, locale, config);

    if (resolved === null) {
      return { kind: "not_found" };
    }

    const alternateSlugs = await buildAlternateSlugs(tx, resolved.data, config);

    return {
      kind: "found",
      article: {
        ...resolved.article,
        alternateSlugs,
      },
    };
  });
}

export async function resolvePublicArticleDetailCandidateForSlug(
  tx: PublicArticleDetailTransaction,
  slug: string,
  locale: string,
  config: SiteConfig,
): Promise<ResolvedPublicArticleDetailCandidate | null> {
  const defaultLocale = config.locales.defaultLocale;
  const candidates = await tx.findArticleDetailCandidatesBySlug({
    slug,
    requestedLocale: locale,
    defaultLocale,
    supportedLocales: config.locales.supportedLocales,
  });

  const publicCandidates = candidates.flatMap((candidate) => {
    const article = buildPublicArticleDetailCandidate(
      candidate,
      locale,
      defaultLocale,
      config,
    );

    if (article === null) {
      return [];
    }

    const lookupTier = resolveLookupTier(candidate, slug, locale, defaultLocale);

    return lookupTier === null ? [] : [{ data: candidate, article, lookupTier }];
  });

  for (const lookupTier of [1, 2, 3] as const) {
    const tierCandidates = publicCandidates.filter((candidate) => candidate.lookupTier === lookupTier);

    if (tierCandidates.length > 1) {
      return null;
    }

    const tierCandidate = tierCandidates[0];

    if (tierCandidate !== undefined) {
      return { data: tierCandidate.data, article: tierCandidate.article };
    }
  }

  return null;
}

export function buildPublicArticleDetailCandidate(
  data: PublicArticleDetailData,
  locale: string,
  defaultLocale: string,
  config: SiteConfig,
): Omit<PublicArticleDetail, "alternateSlugs"> | null {
  if (data.article.status !== "published" || data.article.publishedAt === null) {
    return null;
  }

  if (!data.category.isActive) {
    return null;
  }

  const requestedLocalization = findLocalization(data.localizations, locale);
  const defaultLocalization = findLocalization(data.localizations, defaultLocale);
  const slug = resolvePublicSlug(requestedLocalization, defaultLocalization, data.article.slug);
  const title = resolveRequiredLocalizedField(requestedLocalization, defaultLocalization, "title");
  const excerpt = resolveRequiredLocalizedField(
    requestedLocalization,
    defaultLocalization,
    "excerpt",
  );
  const body = resolveRequiredLocalizedField(requestedLocalization, defaultLocalization, "body");

  if (slug === undefined || title === undefined || excerpt === undefined || body === undefined) {
    return null;
  }

  const category = buildCategory(data.category, locale, defaultLocale, config);

  if (category === null) {
    return null;
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
  const keywords = resolveKeywords(requestedLocalization, defaultLocalization);

  return {
    id: data.article.id,
    slug,
    displaySlug: slug,
    locale,
    title,
    excerpt,
    body,
    category,
    publishedAt: data.article.publishedAt,
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(heroImageUrl !== undefined ? { heroImageUrl } : {}),
    ...(metaTitle !== undefined ? { metaTitle } : {}),
    ...(metaDescription !== undefined ? { metaDescription } : {}),
    ...(keywords !== undefined ? { keywords } : {}),
  };
}

async function buildAlternateSlugs(
  tx: PublicArticleDetailTransaction,
  data: PublicArticleDetailData,
  config: SiteConfig,
): Promise<Readonly<Record<string, string>>> {
  const alternates: Record<string, string> = {};

  for (const locale of config.locales.supportedLocales) {
    const article = buildPublicArticleDetailCandidate(
      data,
      locale,
      config.locales.defaultLocale,
      config,
    );

    if (article === null) {
      continue;
    }

    const resolved = await resolvePublicArticleDetailCandidateForSlug(
      tx,
      article.slug,
      locale,
      config,
    );

    if (resolved?.data.article.id === data.article.id) {
      alternates[locale] = article.slug;
    }
  }

  return alternates;
}

function resolveLookupTier(
  data: PublicArticleDetailData,
  slug: string,
  locale: string,
  defaultLocale: string,
): 1 | 2 | 3 | null {
  const requestedLocalization = findLocalization(data.localizations, locale);
  const defaultLocalization = findLocalization(data.localizations, defaultLocale);

  if (sanitizeSlug(requestedLocalization?.slug) === slug) {
    return 1;
  }

  if (sanitizeSlug(defaultLocalization?.slug) === slug) {
    return 2;
  }

  if (sanitizeSlug(data.article.slug) === slug) {
    return 3;
  }

  return null;
}

function resolveRequestedLocale(locale: string | undefined, config: SiteConfig): string | null {
  const requestedLocale = locale ?? config.locales.defaultLocale;

  return config.locales.supportedLocales.includes(requestedLocale) ? requestedLocale : null;
}

function resolvePublicSlug(
  requestedLocalization: PublicArticleDetailLocalizationRow | undefined,
  defaultLocalization: PublicArticleDetailLocalizationRow | undefined,
  canonicalSlug: string,
): string | undefined {
  return (
    sanitizeSlug(requestedLocalization?.slug) ??
    sanitizeSlug(defaultLocalization?.slug) ??
    sanitizeSlug(canonicalSlug)
  );
}

function resolveRequiredLocalizedField(
  requestedLocalization: PublicArticleDetailLocalizationRow | undefined,
  defaultLocalization: PublicArticleDetailLocalizationRow | undefined,
  field: "title" | "excerpt" | "body",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveOptionalLocalizedField(
  requestedLocalization: PublicArticleDetailLocalizationRow | undefined,
  defaultLocalization: PublicArticleDetailLocalizationRow | undefined,
  field: "subtitle" | "metaTitle" | "metaDescription",
): string | undefined {
  return (
    sanitizeOptionalText(requestedLocalization?.[field]) ??
    sanitizeOptionalText(defaultLocalization?.[field])
  );
}

function resolveKeywords(
  requestedLocalization: PublicArticleDetailLocalizationRow | undefined,
  defaultLocalization: PublicArticleDetailLocalizationRow | undefined,
): readonly string[] | undefined {
  const requestedKeywords = sanitizeKeywords(requestedLocalization?.keywords);
  const defaultKeywords = sanitizeKeywords(defaultLocalization?.keywords);
  const keywords = requestedKeywords ?? defaultKeywords;

  return keywords === undefined || keywords.length === 0 ? undefined : keywords;
}

function sanitizeKeywords(keywords: readonly string[] | undefined): readonly string[] | undefined {
  const sanitized = keywords
    ?.map((keyword) => sanitizeOptionalText(keyword))
    .filter((keyword): keyword is string => keyword !== undefined);

  return sanitized === undefined || sanitized.length === 0 ? undefined : sanitized;
}

function buildCategory(
  category: PublicArticleDetailData["category"],
  locale: string,
  defaultLocale: string,
  config: SiteConfig,
): PublicArticleDetail["category"] | null {
  const configCategory = config.taxonomy.find((current) => current.key === category.configKey);
  const label =
    resolveCategoryLabel(configCategory, locale, defaultLocale) ?? sanitizeOptionalText(category.name);

  if (label === undefined) {
    return null;
  }

  return {
    configKey: category.configKey,
    slug: category.slug,
    label,
  };
}

function resolveCategoryLabel(
  configCategory: CategoryConfig | undefined,
  locale: string,
  defaultLocale: string,
): string | undefined {
  return (
    sanitizeOptionalText(configCategory?.labels[locale]) ??
    sanitizeOptionalText(configCategory?.labels[defaultLocale])
  );
}

function findLocalization(
  localizations: readonly PublicArticleDetailLocalizationRow[],
  locale: string,
): PublicArticleDetailLocalizationRow | undefined {
  return localizations.find((localization) => localization.locale === locale);
}

function sanitizeSlug(value: string | null | undefined): string | undefined {
  const sanitized = sanitizeOptionalText(value);

  return sanitized !== undefined && isPublicArticleSlug(sanitized) ? sanitized : undefined;
}

export function isPublicArticleSlug(value: string): boolean {
  return publicSlugPattern.test(value);
}

function sanitizeOptionalText(value: string | null | undefined): string | undefined {
  const sanitized = value?.replace(/\0/g, "").trim();

  return sanitized === undefined || sanitized.length === 0 ? undefined : sanitized;
}
