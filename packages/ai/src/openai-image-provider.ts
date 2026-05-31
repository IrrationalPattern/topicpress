import type {
  ArticleHeroImageCandidate,
  ImageOutputFormat,
  ImageProvider,
  ImageProviderRequest,
  ImageSize,
} from "./types.js";
import { AiProviderConfigurationError } from "./types.js";
import { stableHash } from "./utils.js";

export const defaultOpenAiImageModel = "gpt-image-1.5";
export const defaultOpenAiImageSize: ImageSize = "1536x1024";
export const defaultOpenAiImageOutputFormat: ImageOutputFormat = "webp";
export const defaultOpenAiImageQuality = "medium";

export interface OpenAIImageProviderOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly size?: ImageSize;
  readonly outputFormat?: ImageOutputFormat;
  readonly quality?: "low" | "medium" | "high";
  readonly id?: string;
  readonly fetch?: OpenAIImageFetch;
}

export type OpenAIImageFetch = (input: string | URL, init: RequestInit) => Promise<Response>;

interface OpenAIImageResponseBody {
  readonly id?: string;
  readonly data?: readonly OpenAIImageData[];
  readonly error?: {
    readonly type?: string;
    readonly code?: string;
    readonly message?: string;
  };
}

interface OpenAIImageData {
  readonly b64_json?: string;
  readonly revised_prompt?: string;
}

export class OpenAIImageProvider implements ImageProvider {
  readonly id: string;
  readonly mode = "live" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly size: ImageSize;
  private readonly outputFormat: ImageOutputFormat;
  private readonly quality: "low" | "medium" | "high";
  private readonly fetchImpl: OpenAIImageFetch;

  constructor(options: OpenAIImageProviderOptions) {
    const apiKey = options.apiKey.trim();

    if (apiKey.length === 0) {
      throw new AiProviderConfigurationError("OPENAI_API_KEY is required for live OpenAI image generation.");
    }

    this.id = options.id ?? "openai-images";
    this.apiKey = apiKey;
    this.model = normalizeModel(options.model);
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.timeoutMs = normalizeTimeout(options.timeoutMs);
    this.size = options.size ?? defaultOpenAiImageSize;
    this.outputFormat = options.outputFormat ?? defaultOpenAiImageOutputFormat;
    this.quality = options.quality ?? defaultOpenAiImageQuality;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async generateImage(request: ImageProviderRequest): Promise<ArticleHeroImageCandidate> {
    const promptHash = stableHash(request.prompt);
    const response = await this.createImage(request);
    const imageData = readSingleImageData(response);
    const base64 = readBase64Image(imageData);
    const bytes = decodeBase64Image(base64);
    const dimensions = parseImageSize(this.size);
    const contentType = contentTypeForOutputFormat(this.outputFormat);
    const revisedPrompt = sanitizeProviderText(imageData.revised_prompt);

    return {
      bytes,
      base64,
      metadata: {
        provider: "openai",
        mode: "live",
        model: this.model,
        promptHash,
        stylePolicy: request.prompt.stylePolicy,
        contentType,
        width: dimensions.width,
        height: dimensions.height,
        sizeBytes: bytes.byteLength,
        outputFormat: this.outputFormat,
        generatedAt: request.now.toISOString(),
        ...(response.id !== undefined ? { responseId: response.id } : {}),
        ...(revisedPrompt !== undefined ? { revisedPrompt } : {}),
      },
    };
  }

  private async createImage(request: ImageProviderRequest): Promise<OpenAIImageResponseBody> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: buildOpenAIImagePrompt(request),
          n: 1,
          size: this.size,
          quality: this.quality,
          output_format: this.outputFormat,
        }),
        signal: controller.signal,
      });

      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new OpenAIImageProviderError(
          `OpenAI image generation failed with HTTP ${response.status}${formatOpenAIError(body)}.`,
        );
      }

      return body;
    } catch (error) {
      if (isAbortError(error)) {
        throw new OpenAIImageProviderError(
          `OpenAI image generation timed out after ${this.timeoutMs}ms.`,
        );
      }

      if (error instanceof OpenAIImageProviderError) {
        throw error;
      }

      throw new OpenAIImageProviderError("OpenAI image generation failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenAIImageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIImageProviderError";
  }
}

function buildOpenAIImagePrompt(request: ImageProviderRequest): string {
  return [
    request.prompt.system,
    "",
    request.prompt.user,
    "",
    "Output contract:",
    `- Generate exactly ${request.prompt.outputContract.imageCount} image.`,
    `- Style policy: ${request.prompt.outputContract.stylePolicy}.`,
    `- Target size: ${request.prompt.outputContract.size}.`,
    `- Output format: ${request.prompt.outputContract.outputFormat}.`,
    `- Forbidden elements: ${request.prompt.outputContract.forbiddenElements.join(", ")}.`,
  ].join("\n");
}

async function readJsonResponse(response: Response): Promise<OpenAIImageResponseBody> {
  try {
    return (await response.json()) as OpenAIImageResponseBody;
  } catch {
    throw new OpenAIImageProviderError("OpenAI image response body was not valid JSON.");
  }
}

function readSingleImageData(response: OpenAIImageResponseBody): OpenAIImageData {
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw new OpenAIImageProviderError("OpenAI image response did not include exactly one image.");
  }

  const imageData = response.data[0];

  if (imageData === undefined || typeof imageData !== "object" || imageData === null) {
    throw new OpenAIImageProviderError("OpenAI image response data was invalid.");
  }

  return imageData;
}

function readBase64Image(imageData: OpenAIImageData): string {
  const value = imageData.b64_json?.replace(/\s/g, "") ?? "";

  if (value.length === 0) {
    throw new OpenAIImageProviderError("OpenAI image response did not include base64 image data.");
  }

  return value;
}

function decodeBase64Image(base64: string): Uint8Array {
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new OpenAIImageProviderError("OpenAI image response base64 data was invalid.");
  }

  const buffer = Buffer.from(base64, "base64");
  const normalizedInput = base64.replace(/=+$/, "");
  const normalizedOutput = buffer.toString("base64").replace(/=+$/, "");

  if (buffer.byteLength === 0 || normalizedInput !== normalizedOutput) {
    throw new OpenAIImageProviderError("OpenAI image response base64 data was invalid.");
  }

  return new Uint8Array(buffer);
}

function sanitizeProviderText(input: string | undefined): string | undefined {
  const value = input
    ?.replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[redacted-id]")
    .replace(/\s+/g, " ")
    .trim();

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  return value.length <= 1_200 ? value : `${value.slice(0, 1_197).replace(/\s+\S*$/, "")}...`;
}

function formatOpenAIError(body: OpenAIImageResponseBody): string {
  const type = body.error?.type ?? body.error?.code;

  if (type === undefined) {
    return "";
  }

  const verificationNote = /verification/i.test(type)
    ? " Verify the OpenAI organization has GPT Image model access"
    : "";

  return ` (${type}).${verificationNote}`;
}

function normalizeModel(model: string | undefined): string {
  if (model === undefined) {
    return defaultOpenAiImageModel;
  }

  const normalized = model.trim();

  if (normalized.length === 0) {
    throw new AiProviderConfigurationError("TOPICPRESS_OPENAI_IMAGE_MODEL must be a non-empty string.");
  }

  return normalized;
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
    throw new AiProviderConfigurationError(
      "TOPICPRESS_OPENAI_IMAGE_TIMEOUT_MS must be a positive integer.",
    );
  }

  return timeoutMs;
}

function parseImageSize(size: ImageSize): { readonly width: number; readonly height: number } {
  const [widthText, heightText] = size.split("x");
  const width = Number(widthText);
  const height = Number(heightText);

  return { width, height };
}

function contentTypeForOutputFormat(format: ImageOutputFormat): string {
  return format === "png" ? "image/png" : "image/webp";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
