import type { SiteConfig } from "@topicpress/config";

import type {
  ArticleDraft,
  ArticleGenerationInput,
  DraftCategory,
  DraftProvider,
  DraftProviderRequest,
} from "./types.js";
import { AiProviderConfigurationError } from "./types.js";
import { activeDraftCategories, findActiveDraftCategory, stableHash } from "./utils.js";

export const defaultOpenAiDraftModel = "gpt-5.5";

export interface OpenAIDraftProviderOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly id?: string;
  readonly fetch?: OpenAIFetch;
}

export type OpenAIFetch = (input: string | URL, init: RequestInit) => Promise<Response>;

interface OpenAIArticleContent {
  readonly title: string;
  readonly subtitle: string | null;
  readonly excerpt: string;
  readonly body: string;
  readonly keywords: readonly string[];
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly categoryKey: string;
  readonly slug: string;
}

interface OpenAIResponseBody {
  readonly id?: string;
  readonly output_text?: string;
  readonly output?: readonly OpenAIOutputItem[];
  readonly error?: {
    readonly type?: string;
    readonly code?: string;
    readonly message?: string;
  };
}

interface OpenAIOutputItem {
  readonly type?: string;
  readonly content?: readonly OpenAIContentItem[];
}

interface OpenAIContentItem {
  readonly type?: string;
  readonly text?: string;
  readonly refusal?: string;
}

export class OpenAIDraftProvider implements DraftProvider {
  readonly id: string;
  readonly mode = "live" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: OpenAIFetch;

  constructor(options: OpenAIDraftProviderOptions) {
    const apiKey = options.apiKey.trim();

    if (apiKey.length === 0) {
      throw new AiProviderConfigurationError("OPENAI_API_KEY is required for live OpenAI generation.");
    }

    this.id = options.id ?? "openai-responses";
    this.apiKey = apiKey;
    this.model = normalizeModel(options.model);
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.timeoutMs = normalizeTimeout(options.timeoutMs);
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async generateDraft(request: DraftProviderRequest): Promise<ArticleDraft> {
    const promptHash = stableHash(request.prompt);
    const inputHash = stableHash(request.input);
    const response = await this.createResponse(request, promptHash);
    const content = parseOpenAIArticleContent(response);
    const category = resolveCategory(content.categoryKey, request.siteConfig, request.input);
    const generationRunId = `openai-${stableHash({
      inputHash,
      promptHash,
      responseId: response.id ?? "unknown",
      generatedAt: request.now.toISOString(),
      model: this.model,
    })}`;

    return {
      title: content.title,
      ...(content.subtitle !== null ? { subtitle: content.subtitle } : {}),
      excerpt: content.excerpt,
      body: content.body,
      keywords: content.keywords,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      category,
      slug: content.slug,
      citations: buildCitations(request.input),
      lineage: buildLineage(request.input, generationRunId, request.now),
      generation: {
        generationRunId,
        provider: this.id,
        mode: "live",
        locale: request.input.locale,
        generatedAt: request.now.toISOString(),
        promptHash,
        inputHash,
        manualReviewRequired: true,
        status: "review",
        model: this.model,
      },
    };
  }

  private async createResponse(
    request: DraftProviderRequest,
    promptHash: string,
  ): Promise<OpenAIResponseBody> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          instructions: request.prompt.system,
          input: request.prompt.user,
          store: false,
          metadata: {
            topicpress_provider: this.id,
            topicpress_prompt_hash: promptHash,
          },
          text: {
            format: buildStructuredOutputFormat(request.siteConfig, request.input),
          },
        }),
        signal: controller.signal,
      });

      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new OpenAIDraftProviderError(
          `OpenAI draft generation failed with HTTP ${response.status}${formatOpenAIError(body)}.`,
        );
      }

      return body;
    } catch (error) {
      if (isAbortError(error)) {
        throw new OpenAIDraftProviderError(
          `OpenAI draft generation timed out after ${this.timeoutMs}ms.`,
        );
      }

      if (error instanceof OpenAIDraftProviderError) {
        throw error;
      }

      throw new OpenAIDraftProviderError(readSafeErrorMessage(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenAIDraftProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIDraftProviderError";
  }
}

function buildStructuredOutputFormat(siteConfig: SiteConfig, input: ArticleGenerationInput) {
  const categories = activeDraftCategories(siteConfig, input.locale);

  return {
    type: "json_schema",
    name: "topicpress_article_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "subtitle",
        "excerpt",
        "body",
        "keywords",
        "metaTitle",
        "metaDescription",
        "categoryKey",
        "slug",
      ],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 120 },
        subtitle: { type: ["string", "null"], maxLength: 160 },
        excerpt: { type: "string", minLength: 1, maxLength: 220 },
        body: { type: "string", minLength: 1 },
        keywords: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: { type: "string", minLength: 1, maxLength: 48 },
        },
        metaTitle: { type: "string", minLength: 1, maxLength: 120 },
        metaDescription: { type: "string", minLength: 1, maxLength: 180 },
        categoryKey: {
          type: "string",
          enum: categories.map((category) => category.key),
        },
        slug: {
          type: "string",
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          minLength: 1,
          maxLength: 120,
        },
      },
    },
  } as const;
}

function parseOpenAIArticleContent(response: OpenAIResponseBody): OpenAIArticleContent {
  const refusal = findRefusal(response);

  if (refusal !== undefined) {
    throw new OpenAIDraftProviderError("OpenAI refused to generate a review draft.");
  }

  const outputText = extractOutputText(response);

  if (outputText === undefined) {
    throw new OpenAIDraftProviderError("OpenAI response did not include structured draft output.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new OpenAIDraftProviderError("OpenAI response output was not valid JSON.");
  }

  return readArticleContent(parsed);
}

function readArticleContent(input: unknown): OpenAIArticleContent {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new OpenAIDraftProviderError("OpenAI structured output was not an object.");
  }

  const record = input as Readonly<Record<string, unknown>>;
  const title = readString(record, "title");
  const rawSubtitle = record.subtitle;
  const subtitle = rawSubtitle === null ? null : readString(record, "subtitle");
  const excerpt = readString(record, "excerpt");
  const body = readString(record, "body");
  const metaTitle = readString(record, "metaTitle");
  const metaDescription = readString(record, "metaDescription");
  const categoryKey = readString(record, "categoryKey");
  const slug = readString(record, "slug");
  const keywords = readKeywords(record.keywords);

  return {
    title,
    subtitle,
    excerpt,
    body,
    keywords,
    metaTitle,
    metaDescription,
    categoryKey,
    slug,
  };
}

function resolveCategory(
  categoryKey: string,
  siteConfig: SiteConfig,
  input: ArticleGenerationInput,
): DraftCategory {
  const category = findActiveDraftCategory(siteConfig, categoryKey, input.locale);

  if (category === undefined) {
    throw new OpenAIDraftProviderError(
      `OpenAI structured output selected unknown category "${categoryKey}".`,
    );
  }

  return category;
}

function buildCitations(input: ArticleGenerationInput): ArticleDraft["citations"] {
  return input.sourceItems.map((source) => ({
    sourceItemId: source.sourceItemId,
    sourceName: source.sourceName,
    title: source.title,
    url: source.url,
    ...(source.author !== undefined ? { author: source.author } : {}),
    ...(source.publishedAt !== undefined ? { publishedAt: source.publishedAt } : {}),
    isPrimarySource: source.sourceItemId === input.primarySourceItemId,
  }));
}

function buildLineage(
  input: ArticleGenerationInput,
  generationRunId: string,
  now: Date,
): ArticleDraft["lineage"] {
  return input.sourceItems.map((source) => ({
    kind: "source_item",
    sourceItemId: source.sourceItemId,
    storyClusterId: input.storyClusterId,
    generationRunId,
    sourceName: source.sourceName,
    sourceUrl: source.url,
    sourceTitle: source.title,
    fetchedAt: now.toISOString(),
    isPrimarySource: source.sourceItemId === input.primarySourceItemId,
  }));
}

async function readJsonResponse(response: Response): Promise<OpenAIResponseBody> {
  try {
    return (await response.json()) as OpenAIResponseBody;
  } catch {
    throw new OpenAIDraftProviderError("OpenAI response body was not valid JSON.");
  }
}

function extractOutputText(response: OpenAIResponseBody): string | undefined {
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return undefined;
}

function findRefusal(response: OpenAIResponseBody): string | undefined {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.refusal === "string" && content.refusal.trim().length > 0) {
        return content.refusal;
      }
    }
  }

  return undefined;
}

function formatOpenAIError(body: OpenAIResponseBody): string {
  const type = body.error?.type ?? body.error?.code;
  return type === undefined ? "" : ` (${type})`;
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OpenAIDraftProviderError(`OpenAI structured output field "${key}" was invalid.`);
  }

  return value.trim();
}

function readKeywords(input: unknown): readonly string[] {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    !input.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  ) {
    throw new OpenAIDraftProviderError('OpenAI structured output field "keywords" was invalid.');
  }

  return input.map((entry) => entry.trim()).slice(0, 8);
}

function normalizeModel(model: string | undefined): string {
  const normalized = model?.trim() ?? "";
  return normalized.length > 0 ? normalized : defaultOpenAiDraftModel;
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const normalized = baseUrl?.trim() ?? "";
  return (normalized.length > 0 ? normalized : "https://api.openai.com/v1").replace(/\/+$/, "");
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return 60_000;
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AiProviderConfigurationError("TOPICPRESS_OPENAI_TIMEOUT_MS must be a positive integer.");
  }

  return timeoutMs;
}

function readSafeErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "OpenAI draft generation failed.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
