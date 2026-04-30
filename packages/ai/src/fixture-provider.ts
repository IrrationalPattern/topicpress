import type { SiteConfig } from "@topicpress/config";

import type {
  ArticleDraft,
  ArticleGenerationInput,
  DraftCategory,
  DraftProvider,
  DraftProviderRequest,
} from "./types.js";
import { activeDraftCategories, findActiveDraftCategory, slugify, stableHash } from "./utils.js";

export interface FixtureDraftProviderOptions {
  readonly id?: string;
}

export class FixtureDraftProvider implements DraftProvider {
  readonly id: string;
  readonly mode = "fixture" as const;

  constructor(options: FixtureDraftProviderOptions = {}) {
    this.id = options.id ?? "fixture-draft-provider";
  }

  async generateDraft(request: DraftProviderRequest): Promise<ArticleDraft> {
    return generateFixtureDraft(request.input, request.siteConfig, request.now, {
      providerId: this.id,
      promptHash: stableHash(request.prompt),
    });
  }
}

export interface GenerateFixtureDraftOptions {
  readonly providerId?: string;
  readonly promptHash?: string;
}

export function generateFixtureDraft(
  input: ArticleGenerationInput,
  siteConfig: SiteConfig,
  now: Date,
  options: GenerateFixtureDraftOptions = {},
): ArticleDraft {
  const category = selectFixtureCategory(input, siteConfig);
  const primarySource = getPrimarySourceItem(input);
  const title = makeDraftTitle(primarySource.title);
  const subtitle = `A concise ${category.label.toLowerCase()} brief for ${siteConfig.identity.name}.`;
  const excerptSource = primarySource.excerpt ?? primarySource.contentText ?? primarySource.title;
  const excerpt = truncateSentence(excerptSource, 155);
  const body = buildFixtureBody(input, category);
  const keywords = selectKeywords(input, category);
  const slug = slugify(title);
  const inputHash = stableHash(input);
  const promptHash = options.promptHash ?? stableHash({ input, site: siteConfig.identity.slug });
  const generationRunId = `fixture-run-${stableHash({
    generatedAt: now.toISOString(),
    inputHash,
    promptHash,
    provider: options.providerId ?? "fixture-draft-provider",
  })}`;

  return {
    title,
    subtitle,
    excerpt,
    body,
    keywords,
    metaTitle: `${title} | ${siteConfig.identity.name}`,
    metaDescription: truncateSentence(excerpt, 155),
    category,
    slug,
    citations: input.sourceItems.map((source) => ({
      sourceItemId: source.sourceItemId,
      sourceName: source.sourceName,
      title: source.title,
      url: source.url,
      ...(source.author !== undefined ? { author: source.author } : {}),
      ...(source.publishedAt !== undefined ? { publishedAt: source.publishedAt } : {}),
      isPrimarySource: source.sourceItemId === input.primarySourceItemId,
    })),
    lineage: input.sourceItems.map((source) => ({
        kind: "source_item",
      sourceItemId: source.sourceItemId,
      storyClusterId: input.storyClusterId,
      generationRunId,
      sourceName: source.sourceName,
      sourceUrl: source.url,
      sourceTitle: source.title,
      fetchedAt: now.toISOString(),
      isPrimarySource: source.sourceItemId === input.primarySourceItemId,
    })),
    generation: {
      generationRunId,
      provider: options.providerId ?? "fixture-draft-provider",
      mode: "fixture",
      locale: input.locale,
      generatedAt: now.toISOString(),
      promptHash,
      inputHash,
      manualReviewRequired: true,
      status: "review",
      fixtureKey: `fixture-${inputHash}`,
    },
  };
}

function selectFixtureCategory(
  input: ArticleGenerationInput,
  siteConfig: SiteConfig,
): DraftCategory {
  if (input.categoryHint !== undefined) {
    const hintedCategory = findActiveDraftCategory(siteConfig, input.categoryHint, input.locale);

    if (hintedCategory !== undefined) {
      return hintedCategory;
    }
  }

  const categories = activeDraftCategories(siteConfig, input.locale);
  const haystack = [
    ...input.sourceItems.flatMap((source) => [
      source.title,
      source.excerpt,
      source.contentText,
    ]),
    ...input.keywordHints,
  ]
    .filter((entry): entry is string => entry !== undefined)
    .join(" ")
    .toLowerCase();

  const categoryScores = categories.map((category) => ({
    category,
    score: scoreCategory(category, haystack),
  }));
  const selected = categoryScores.sort((left, right) => right.score - left.score)[0]?.category;

  return selected ?? categories[0] ?? { key: "news", slug: "news", label: "News" };
}

function scoreCategory(category: DraftCategory, haystack: string): number {
  const termsByCategory: Readonly<Record<string, readonly string[]>> = {
    news: ["news", "update", "launch", "announced", "released"],
    model_releases: ["model", "release", "capability", "availability", "weights"],
    tools_products: ["tool", "product", "platform", "app", "feature"],
    research: ["research", "paper", "study", "technical", "analysis"],
    benchmarks: ["benchmark", "evaluation", "score", "performance", "compare"],
    guides_explainers: ["guide", "explainer", "how", "tutorial", "learn"],
    policy_safety: ["policy", "safety", "regulation", "governance", "risk"],
    business_adoption: ["business", "enterprise", "adoption", "market", "organisation"],
  };
  const terms = termsByCategory[category.key] ?? [category.key.replace(/_/g, " ")];

  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function makeDraftTitle(sourceTitle: string): string {
  const cleanedTitle = sourceTitle.replace(/\s+/g, " ").trim();

  if (cleanedTitle.length <= 88) {
    return cleanedTitle;
  }

  return `${cleanedTitle.slice(0, 85).replace(/\s+\S*$/, "")}...`;
}

function buildFixtureBody(input: ArticleGenerationInput, category: DraftCategory): string {
  const primarySource = getPrimarySourceItem(input);
  const sourceSummary = primarySource.excerpt ?? primarySource.contentText ?? primarySource.title;
  const sourceDate =
    primarySource.publishedAt !== undefined
      ? ` The primary source item is dated ${new Date(primarySource.publishedAt).toISOString()}.`
      : "";
  const supportingSourceCount = Math.max(input.sourceItems.length - 1, 0);

  return [
    `This draft summarises the primary source item from ${primarySource.sourceName}, "${primarySource.title}".${sourceDate}`,
    `It belongs to story cluster ${input.storyClusterId} with ${supportingSourceCount} supporting source item(s).`,
    `The cluster is classified as ${category.label} because the source material and hints point to that taxonomy area.`,
    `Key source detail: ${truncateSentence(sourceSummary, 260)}`,
    "Editors should review every original source before publication and keep attribution attached.",
  ].join("\n\n");
}

function selectKeywords(
  input: ArticleGenerationInput,
  category: DraftCategory,
): readonly string[] {
  const candidates = [
    category.label,
    ...input.keywordHints,
    ...getPrimarySourceItem(input).title.split(/\W+/).filter((word) => word.length > 4),
  ];
  const seen = new Set<string>();

  return candidates
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => {
      if (keyword.length === 0 || seen.has(keyword)) {
        return false;
      }

      seen.add(keyword);
      return true;
    })
    .slice(0, 8);
}

function getPrimarySourceItem(input: ArticleGenerationInput): ArticleGenerationInput["sourceItems"][number] {
  return (
    input.sourceItems.find((source) => source.sourceItemId === input.primarySourceItemId) ??
    input.sourceItems[0] ?? {
      sourceItemId: input.primarySourceItemId,
      sourceName: "Unknown source",
      title: "Generated draft",
      url: "https://example.com/source",
    }
  );
}

function truncateSentence(input: string, maxLength: number): string {
  const normalized = input.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
}
