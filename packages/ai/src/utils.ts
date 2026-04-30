import type { LocaleCode, LocalizedText, SiteConfig } from "@topicpress/config";

import type { DraftCategory } from "./types.js";

export function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") {
    return JSON.stringify(input);
  }

  if (Array.isArray(input)) {
    return `[${input.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = input as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function stableHash(input: unknown): string {
  const text = typeof input === "string" ? input : stableStringify(input);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug.length > 0 ? slug : "generated-draft";
}

export function resolveLocalizedText(
  text: LocalizedText,
  locale: LocaleCode,
  fallbackLocale: LocaleCode,
): string {
  return text[locale] ?? text[fallbackLocale] ?? "";
}

export function activeDraftCategories(
  config: SiteConfig,
  locale: LocaleCode = config.locales.defaultLocale,
): readonly DraftCategory[] {
  return config.taxonomy
    .filter((category) => category.isActive)
    .map((category) => ({
      key: category.key,
      slug: category.slug,
      label: resolveLocalizedText(category.labels, locale, config.locales.defaultLocale),
    }));
}

export function findActiveDraftCategory(
  config: SiteConfig,
  keyOrSlug: string,
  locale: LocaleCode = config.locales.defaultLocale,
): DraftCategory | undefined {
  return activeDraftCategories(config, locale).find(
    (category) => category.key === keyOrSlug || category.slug === keyOrSlug,
  );
}

export function assertSupportedLocale(config: SiteConfig, locale: LocaleCode): void {
  if (!config.locales.supportedLocales.includes(locale)) {
    throw new DraftValidationInputError([`locale: unsupported locale "${locale}"`]);
  }
}

export class DraftValidationInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid generation input:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "DraftValidationInputError";
    this.issues = issues;
  }
}
