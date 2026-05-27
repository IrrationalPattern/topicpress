import { siteConfig, type RobotsDirective, type SiteConfig } from "@topicpress/config";
import type { MetadataRoute } from "next";

import { getLocalePathSegment, isAppLocale, type AppLocale } from "@/i18n/routing";
import { getPublicArticlePath, isArticleSlugSegment } from "@/lib/public-article-routing";
import { getPublicCategoryPath, isCategorySlugSegment } from "@/lib/public-category-routing";

import type { PublicSitemapInventory } from "@topicpress/worker";

export type RobotsEnvironment = "local" | "staging" | "production";

export interface RobotsEnvironmentInput {
  readonly vercelEnv?: string | undefined;
  readonly nodeEnv?: string | undefined;
}

export function getCanonicalOrigin(config: SiteConfig = siteConfig): string {
  const origin = normalizeOrigin(config.identity.domains.productionOriginPlaceholder);

  if (config.seo.canonical.requireProductionOrigin && isLocalhostOrigin(origin)) {
    throw new Error("Canonical sitemap and robots URLs must not use localhost.");
  }

  return origin;
}

export function buildCanonicalUrl(path: string, config: SiteConfig = siteConfig): string {
  return buildUrlFromOrigin(getCanonicalOrigin(config), path);
}

export function getCanonicalSitemapUrl(config: SiteConfig = siteConfig): string {
  return buildCanonicalUrl("/sitemap.xml", config);
}

export function buildPublicSitemapRouteEntries(
  inventory: PublicSitemapInventory,
  config: SiteConfig = siteConfig,
): MetadataRoute.Sitemap {
  const origin = getCanonicalOrigin(config);
  const entries: MetadataRoute.Sitemap = [];

  getSupportedAppLocales(config).forEach((locale) => {
    entries.push({
      url: buildUrlFromOrigin(origin, getLocaleHomepagePath(locale)),
    });
  });

  inventory.categories.forEach((record) => {
    const locale = resolveInventoryLocale(record.locale);

    if (locale === null || !isCategorySlugSegment(record.categorySlug)) {
      return;
    }

    entries.push(
      withOptionalLastModified(
        {
          url: buildUrlFromOrigin(origin, getPublicCategoryPath(locale, record.categorySlug)),
        },
        record.lastModified,
      ),
    );
  });

  inventory.articles.forEach((record) => {
    const locale = resolveInventoryLocale(record.locale);

    if (locale === null || !isArticleSlugSegment(record.slug)) {
      return;
    }

    entries.push(
      withOptionalLastModified(
        {
          url: buildUrlFromOrigin(origin, getPublicArticlePath(locale, record.slug)),
        },
        record.updatedAt ?? record.publishedAt,
      ),
    );
  });

  return dedupeSitemapEntries(entries);
}

export function resolveRobotsEnvironment(input: RobotsEnvironmentInput): RobotsEnvironment {
  if (input.vercelEnv === "production") {
    return "production";
  }

  if (input.vercelEnv === "preview") {
    return "staging";
  }

  if (input.vercelEnv === "development") {
    return "local";
  }

  if (input.vercelEnv !== undefined) {
    return "staging";
  }

  if (
    input.nodeEnv === undefined ||
    input.nodeEnv === "development" ||
    input.nodeEnv === "test"
  ) {
    return "local";
  }

  if (input.nodeEnv === "production") {
    return "staging";
  }

  return "staging";
}

export function getRobotsDirective(
  input: RobotsEnvironmentInput,
  config: SiteConfig = siteConfig,
): RobotsDirective {
  return config.seo.robots[resolveRobotsEnvironment(input)];
}

export function buildPublicRobotsRoute(
  input: RobotsEnvironmentInput,
  config: SiteConfig = siteConfig,
): MetadataRoute.Robots {
  const directive = getRobotsDirective(input, config);

  return {
    rules: {
      userAgent: "*",
      ...(directive === "index,follow" ? { allow: "/" } : { disallow: "/" }),
    },
    sitemap: getCanonicalSitemapUrl(config),
  };
}

function getSupportedAppLocales(config: SiteConfig): readonly AppLocale[] {
  return config.locales.supportedLocales.filter(isAppLocale);
}

function getLocaleHomepagePath(locale: AppLocale): string {
  return `/${getLocalePathSegment(locale)}`;
}

function resolveInventoryLocale(locale: string): AppLocale | null {
  return isAppLocale(locale) ? locale : null;
}

function withOptionalLastModified(
  entry: MetadataRoute.Sitemap[number],
  lastModified: string | undefined,
): MetadataRoute.Sitemap[number] {
  if (lastModified === undefined) {
    return entry;
  }

  return {
    ...entry,
    lastModified,
  };
}

function dedupeSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

function buildUrlFromOrigin(origin: string, path: string): string {
  return new URL(normalizePath(path), `${origin}/`).toString();
}

function normalizeOrigin(origin: string): string {
  const url = new URL(origin);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Canonical origin must be an HTTP(S) URL.");
  }

  return url.origin;
}

function normalizePath(path: string): string {
  return `/${path.split("/").filter(Boolean).join("/")}`;
}

function isLocalhostOrigin(origin: string): boolean {
  const { hostname } = new URL(origin);

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
