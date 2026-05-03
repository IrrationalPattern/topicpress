import { siteConfig, type LocaleCode, type SiteConfig } from "@topicpress/config";

export interface LocaleRoute {
  readonly locale: LocaleCode;
  readonly path: string;
  readonly segment: string;
}

export function getDefaultLocalePath(config: SiteConfig = siteConfig): string {
  const defaultPath = config.locales.paths[config.locales.defaultLocale];

  if (defaultPath === undefined) {
    throw new Error(
      `Missing locale path for default locale "${config.locales.defaultLocale}" in site config.`,
    );
  }

  return defaultPath;
}

export function getSupportedLocaleRouteParams(
  config: SiteConfig = siteConfig,
): { locale: string }[] {
  return config.locales.supportedLocales.map((locale) => ({
    locale: getLocalePathSegment(locale, config),
  }));
}

export function resolveLocaleFromPathSegment(
  segment: string,
  config: SiteConfig = siteConfig,
): LocaleRoute | null {
  const normalizedSegment = normalizePathSegment(segment);

  for (const locale of config.locales.supportedLocales) {
    const path = config.locales.paths[locale];

    if (path === undefined) {
      continue;
    }

    const configuredSegment = pathToSingleSegment(path, locale);

    if (configuredSegment === normalizedSegment) {
      return {
        locale,
        path,
        segment: configuredSegment,
      };
    }
  }

  return null;
}

export function getLocalePathSegment(locale: LocaleCode, config: SiteConfig = siteConfig): string {
  const path = config.locales.paths[locale];

  if (path === undefined || !config.locales.supportedLocales.includes(locale)) {
    throw new Error(`Unsupported locale "${locale}" in site config locale routing.`);
  }

  return pathToSingleSegment(path, locale);
}

function normalizePathSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, "");
}

function pathToSingleSegment(path: string, locale: LocaleCode): string {
  const segments = path.split("/").filter(Boolean);

  if (segments.length !== 1) {
    throw new Error(
      `Locale path for "${locale}" must resolve to a single route segment for /[locale].`,
    );
  }

  return segments[0] ?? "";
}
