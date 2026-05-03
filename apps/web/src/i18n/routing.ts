import { siteConfig } from "@topicpress/config";
import { defineRouting } from "next-intl/routing";

export const localePrefixes = Object.fromEntries(
  siteConfig.locales.supportedLocales.map((locale) => [
    locale,
    normalizeLocalePrefix(getConfiguredLocalePath(locale)),
  ]),
);

export const routing = defineRouting({
  locales: [...siteConfig.locales.supportedLocales],
  defaultLocale: siteConfig.locales.defaultLocale,
  localeDetection: false,
  localePrefix: {
    mode: "always",
    prefixes: localePrefixes,
  },
});

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(locale: string): locale is AppLocale {
  return routing.locales.includes(locale);
}

export function resolveAppLocale(value: string): AppLocale | null {
  if (isAppLocale(value)) {
    return value;
  }

  return (
    routing.locales.find((locale) => getLocalePathSegment(locale) === normalizePathSegment(value)) ??
    null
  );
}

export function getLocalePath(locale: AppLocale): string {
  return getConfiguredLocalePath(locale);
}

export function getLocalePathSegment(locale: AppLocale): string {
  return normalizeLocalePrefix(getConfiguredLocalePath(locale)).replace(/^\/+/, "");
}

export function getLanguageAlternates(): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, getConfiguredLocalePath(locale)]),
  );
}

function getConfiguredLocalePath(locale: string): string {
  const path = siteConfig.locales.paths[locale];

  if (path === undefined) {
    throw new Error(`Missing configured path for locale "${locale}".`);
  }

  return path;
}

function normalizeLocalePrefix(path: string): string {
  const normalizedPath = `/${normalizePathSegment(path)}`;

  if (normalizedPath === "/") {
    throw new Error("Locale prefixes must not resolve to the site root.");
  }

  return normalizedPath;
}

function normalizePathSegment(path: string): string {
  return path.split("/").filter(Boolean).join("/");
}
