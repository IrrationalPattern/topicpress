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
      "Create one structured article draft from this approved story cluster.",
      "",
      "Allowed categories:",
      categoryLines,
      "",
      `Story cluster id: ${input.storyClusterId}`,
      `Primary source item id: ${input.primarySourceItemId}`,
      "",
      "Clustered source items:",
      ...input.sourceItems.flatMap((source, index) => [
        `Source item ${index + 1}${source.sourceItemId === input.primarySourceItemId ? " (primary)" : ""}:`,
        `- Source item id: ${source.sourceItemId}`,
        `- Source: ${source.sourceName}`,
        `- Title: ${source.title}`,
        `- URL: ${source.url}`,
        source.author !== undefined ? `- Author: ${source.author}` : undefined,
        source.publishedAt !== undefined ? `- Published at: ${source.publishedAt}` : undefined,
        source.excerpt !== undefined ? `- Excerpt: ${source.excerpt}` : undefined,
        source.contentText !== undefined ? `- Body: ${source.contentText}` : undefined,
      ]),
      input.categoryHint !== undefined ? `- Category hint: ${input.categoryHint}` : undefined,
      input.keywordHints.length > 0 ? `- Keyword hints: ${input.keywordHints.join(", ")}` : undefined,
      "",
      "Return citations and lineage for every supplied source item.",
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
