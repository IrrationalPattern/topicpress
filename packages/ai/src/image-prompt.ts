import type { ArticleHeroImagePrompt, ArticleHeroImagePromptInput } from "./types.js";

const maxFieldLength = 480;

export function buildArticleHeroImagePrompt(
  input: ArticleHeroImagePromptInput,
): ArticleHeroImagePrompt {
  const title = sanitizePromptField(input.title, "Untitled article");
  const excerpt = sanitizePromptField(input.excerpt, "No excerpt supplied.");
  const subtitle =
    input.subtitle !== undefined ? sanitizePromptField(input.subtitle, "No subtitle supplied.") : undefined;
  const body =
    input.body !== undefined ? sanitizePromptField(input.body, "No article body supplied.") : undefined;
  const categoryLabel =
    input.categoryLabel !== undefined ? sanitizePromptField(input.categoryLabel, "News") : undefined;
  const keywordHints = (input.keywordHints ?? [])
    .map((keyword) => sanitizePromptField(keyword, ""))
    .filter((keyword) => keyword.length > 0)
    .slice(0, 8);

  return {
    system: [
      "Create one review-gated hero image candidate for an editorial article.",
      "The image must be an editorial illustration or abstract visual metaphor, not documentary photography.",
      "Do not imply the image depicts the actual event, an eyewitness scene, or real press photography.",
      "Do not depict identifiable real people or private-person likenesses.",
      "Do not include logos, brand marks, product UI, screenshots, watermarks, captions, or readable text.",
      "Do not include source URLs, internal IDs, provider/debug metadata, or implementation details.",
    ].join("\n"),
    user: [
      "Generate a topic-relevant editorial illustration for this article.",
      `Locale: ${input.locale}`,
      `Title: ${title}`,
      subtitle !== undefined ? `Subtitle: ${subtitle}` : undefined,
      `Excerpt: ${excerpt}`,
      categoryLabel !== undefined ? `Category: ${categoryLabel}` : undefined,
      keywordHints.length > 0 ? `Keyword hints: ${keywordHints.join(", ")}` : undefined,
      body !== undefined ? `Article body summary: ${body}` : undefined,
      "",
      "Visual direction:",
      "- Use a clean, modern editorial illustration style suitable for a public news article hero.",
      "- Prefer symbolic scenes, abstract systems, tools, infrastructure, documents, or interface-free objects.",
      "- Avoid realistic press-photo framing, camera perspective, newsroom lower-thirds, and event evidence cues.",
      "- No text in the image.",
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n"),
    stylePolicy: "editorial_illustration",
    outputContract: {
      imageCount: 1,
      stylePolicy: "editorial_illustration",
      size: "1536x1024",
      outputFormat: "webp",
      forbiddenElements: [
        "fake photojournalism",
        "real-person likenesses",
        "logos",
        "product UI",
        "screenshots",
        "watermarks",
        "readable text",
        "source URLs",
        "internal IDs",
      ],
    },
    metadata: {
      locale: input.locale,
      title,
      ...(categoryLabel !== undefined ? { categoryLabel } : {}),
      keywordHints,
    },
  };
}

function sanitizePromptField(input: string, fallback: string): string {
  const withoutUrls = input.replace(/https?:\/\/\S+/gi, "[redacted-url]");
  const withoutUuids = withoutUrls.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[redacted-id]",
  );
  const normalized = withoutUuids.replace(/\s+/g, " ").trim();
  const value = normalized.length > 0 ? normalized : fallback;

  if (value.length <= maxFieldLength) {
    return value;
  }

  return `${value.slice(0, maxFieldLength - 3).replace(/\s+\S*$/, "")}...`;
}
