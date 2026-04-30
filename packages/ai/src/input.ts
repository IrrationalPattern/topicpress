import { siteConfig as defaultSiteConfig, type SiteConfig } from "@topicpress/config";

import type {
  ArticleGenerationInput,
  ArticleGenerationInputOptions,
  ArticleSourceInput,
} from "./types.js";
import { assertSupportedLocale, DraftValidationInputError, findActiveDraftCategory } from "./utils.js";

export function buildArticleGenerationInput(
  source: ArticleSourceInput,
  options: ArticleGenerationInputOptions & { readonly siteConfig?: SiteConfig } = {},
): ArticleGenerationInput {
  const config = options.siteConfig ?? defaultSiteConfig;
  const locale = options.locale ?? config.locales.defaultLocale;
  const issues = collectSourceIssues(source);

  try {
    assertSupportedLocale(config, locale);
  } catch (error) {
    if (error instanceof DraftValidationInputError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  if (
    options.categoryHint !== undefined &&
    findActiveDraftCategory(config, options.categoryHint, locale) === undefined
  ) {
    issues.push(`categoryHint: unknown active taxonomy category "${options.categoryHint}"`);
  }

  const keywordHints = [...(options.keywordHints ?? [])]
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  if (issues.length > 0) {
    throw new DraftValidationInputError(issues);
  }

  return {
    locale,
    source: normalizeSource(source),
    ...(options.categoryHint !== undefined ? { categoryHint: options.categoryHint } : {}),
    keywordHints,
  };
}

function normalizeSource(source: ArticleSourceInput): ArticleSourceInput {
  const normalized = {
    sourceName: source.sourceName.trim(),
    title: source.title.trim(),
    url: source.url.trim(),
  };

  return {
    ...normalized,
    ...(hasText(source.author) ? { author: source.author.trim() } : {}),
    ...(hasText(source.publishedAt) ? { publishedAt: source.publishedAt.trim() } : {}),
    ...(hasText(source.excerpt) ? { excerpt: source.excerpt.trim() } : {}),
    ...(hasText(source.contentText) ? { contentText: source.contentText.trim() } : {}),
  };
}

function collectSourceIssues(source: ArticleSourceInput): string[] {
  const issues: string[] = [];

  if (!hasText(source.sourceName)) {
    issues.push("source.sourceName: expected non-empty string");
  }

  if (!hasText(source.title)) {
    issues.push("source.title: expected non-empty string");
  }

  if (!hasText(source.url)) {
    issues.push("source.url: expected URL");
  } else {
    try {
      const url = new URL(source.url);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        issues.push("source.url: expected http or https URL");
      }
    } catch {
      issues.push("source.url: expected URL");
    }
  }

  if (source.publishedAt !== undefined && Number.isNaN(Date.parse(source.publishedAt))) {
    issues.push("source.publishedAt: expected parseable date string");
  }

  return issues;
}

function hasText(input: string | undefined): input is string {
  return typeof input === "string" && input.trim().length > 0;
}
