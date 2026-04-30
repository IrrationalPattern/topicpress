import { siteConfig as defaultSiteConfig, type SiteConfig } from "@topicpress/config";

import type { ArticleGenerationInput, DraftPrompt } from "./types.js";
import { activeDraftCategories } from "./utils.js";

export function buildDraftPrompt(
  input: ArticleGenerationInput,
  siteConfig: SiteConfig = defaultSiteConfig,
): DraftPrompt {
  const categories = activeDraftCategories(siteConfig, input.locale);
  const tone = siteConfig.editorialRules.tone;
  const categoryLines = categories
    .map((category) => `- ${category.key} (${category.slug}): ${category.label}`)
    .join("\n");

  return {
    system: [
      `You draft articles for ${siteConfig.identity.name}.`,
      `Locale: ${input.locale}.`,
      `Tone: ${tone.join(", ")}.`,
      `Audience: ${siteConfig.editorialRules.primaryAudience}.`,
      "Use only sourced facts from the supplied source material.",
      "Do not invent citations, quotes, publication dates, or category keys.",
      "Generated content must remain in manual review.",
    ].join("\n"),
    user: [
      "Create one structured article draft from this approved source item.",
      "",
      "Allowed categories:",
      categoryLines,
      "",
      "Source item:",
      `- Source: ${input.source.sourceName}`,
      `- Title: ${input.source.title}`,
      `- URL: ${input.source.url}`,
      input.source.author !== undefined ? `- Author: ${input.source.author}` : undefined,
      input.source.publishedAt !== undefined
        ? `- Published at: ${input.source.publishedAt}`
        : undefined,
      input.source.excerpt !== undefined ? `- Excerpt: ${input.source.excerpt}` : undefined,
      input.source.contentText !== undefined ? `- Body: ${input.source.contentText}` : undefined,
      input.categoryHint !== undefined ? `- Category hint: ${input.categoryHint}` : undefined,
      input.keywordHints.length > 0 ? `- Keyword hints: ${input.keywordHints.join(", ")}` : undefined,
      "",
      "Return only the structured draft fields in the requested contract.",
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n"),
    outputContract: {
      requiredFields: [
        "title",
        "excerpt",
        "body",
        "keywords",
        "metaTitle",
        "metaDescription",
        "category",
        "slug",
        "citations",
        "lineage",
        "generation",
      ],
      optionalFields: ["subtitle"],
      allowedCategoryKeys: categories.map((category) => category.key),
      locale: input.locale,
    },
    metadata: {
      siteName: siteConfig.identity.name,
      locale: input.locale,
      tone,
      primaryAudience: siteConfig.editorialRules.primaryAudience,
      categoryKeys: categories.map((category) => category.key),
    },
  };
}
