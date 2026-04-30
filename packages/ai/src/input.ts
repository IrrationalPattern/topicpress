import { siteConfig as defaultSiteConfig, type SiteConfig } from "@topicpress/config";

import type {
  ArticleGenerationInput,
  ArticleGenerationInputOptions,
  ArticleSourceInput,
} from "./types.js";
import { assertSupportedLocale, DraftValidationInputError, findActiveDraftCategory } from "./utils.js";

export function buildArticleGenerationInput(
  sourceItems: ArticleSourceInput | readonly ArticleSourceInput[],
  options: ArticleGenerationInputOptions & { readonly siteConfig?: SiteConfig } = {},
): ArticleGenerationInput {
  const config = options.siteConfig ?? defaultSiteConfig;
  const locale = options.locale ?? config.locales.defaultLocale;
  const sourceItemList = Array.isArray(sourceItems) ? [...sourceItems] : [sourceItems];
  const issues = collectClusterIssues(sourceItemList, options);

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

  const normalizedSourceItems = sourceItemList
    .map((source) => normalizeSource(source))
    .sort((left, right) => left.sourceItemId.localeCompare(right.sourceItemId));
  const sourceItemIds = normalizedSourceItems.map((source) => source.sourceItemId);
  const primarySourceItemId = options.primarySourceItemId ?? sourceItemIds[0] ?? "";

  return {
    locale,
    storyClusterId: options.storyClusterId?.trim() ?? "",
    primarySourceItemId,
    sourceItemIds,
    sourceItems: normalizedSourceItems,
    ...(options.categoryHint !== undefined ? { categoryHint: options.categoryHint } : {}),
    keywordHints,
  };
}

function normalizeSource(source: ArticleSourceInput): ArticleSourceInput {
  const normalized = {
    sourceItemId: source.sourceItemId.trim(),
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

function collectClusterIssues(
  sourceItems: readonly ArticleSourceInput[],
  options: ArticleGenerationInputOptions,
): string[] {
  const issues: string[] = [];
  const sourceItemIds = new Set<string>();
  const primarySourceItemId = options.primarySourceItemId?.trim();

  if (!hasText(options.storyClusterId)) {
    issues.push("storyClusterId: expected non-empty string");
  }

  if (sourceItems.length === 0) {
    issues.push("sourceItems: expected non-empty array");
  }

  sourceItems.forEach((source, index) => {
    issues.push(...collectSourceIssues(source, `sourceItems[${index}]`));

    if (hasText(source.sourceItemId)) {
      const sourceItemId = source.sourceItemId.trim();

      if (sourceItemIds.has(sourceItemId)) {
        issues.push(`sourceItems[${index}].sourceItemId: duplicate source item id "${sourceItemId}"`);
      }

      sourceItemIds.add(sourceItemId);
    }
  });

  if (primarySourceItemId !== undefined && !sourceItemIds.has(primarySourceItemId)) {
    issues.push(
      `primarySourceItemId: expected one of provided source item ids, received "${primarySourceItemId}"`,
    );
  }

  return issues;
}

function collectSourceIssues(source: ArticleSourceInput, path: string): string[] {
  const issues: string[] = [];

  if (!hasText(source.sourceItemId)) {
    issues.push(`${path}.sourceItemId: expected non-empty string`);
  }

  if (!hasText(source.sourceName)) {
    issues.push(`${path}.sourceName: expected non-empty string`);
  }

  if (!hasText(source.title)) {
    issues.push(`${path}.title: expected non-empty string`);
  }

  if (!hasText(source.url)) {
    issues.push(`${path}.url: expected URL`);
  } else {
    try {
      const url = new URL(source.url);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        issues.push(`${path}.url: expected http or https URL`);
      }
    } catch {
      issues.push(`${path}.url: expected URL`);
    }
  }

  if (source.publishedAt !== undefined && Number.isNaN(Date.parse(source.publishedAt))) {
    issues.push(`${path}.publishedAt: expected parseable date string`);
  }

  return issues;
}

function hasText(input: string | undefined): input is string {
  return typeof input === "string" && input.trim().length > 0;
}
