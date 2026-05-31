import { deflateSync } from "node:zlib";

import type {
  ArticleHeroImageCandidate,
  ImageProvider,
  ImageProviderRequest,
  ImageSize,
} from "./types.js";
import { stableHash } from "./utils.js";

export interface FixtureOpenAIImageProviderOptions {
  readonly id?: string;
  readonly model?: string;
  readonly size?: ImageSize;
}

export class FixtureOpenAIImageProvider implements ImageProvider {
  readonly id: string;
  readonly mode = "fixture" as const;

  private readonly model: string;
  private readonly size: ImageSize;

  constructor(options: FixtureOpenAIImageProviderOptions = {}) {
    this.id = options.id ?? "fixture-openai-image-provider";
    this.model = options.model ?? "fixture-openai-image";
    this.size = options.size ?? "1536x1024";
  }

  async generateImage(request: ImageProviderRequest): Promise<ArticleHeroImageCandidate> {
    const promptHash = stableHash(request.prompt);
    const dimensions = parseImageSize(this.size);
    const bytes = createFixturePng(dimensions.width, dimensions.height, promptHash);
    const base64 = Buffer.from(bytes).toString("base64");

    return {
      bytes,
      base64,
      metadata: {
        provider: "openai",
        mode: "fixture",
        model: this.model,
        promptHash,
        stylePolicy: request.prompt.stylePolicy,
        contentType: "image/png",
        width: dimensions.width,
        height: dimensions.height,
        sizeBytes: bytes.byteLength,
        outputFormat: "png",
        generatedAt: request.now.toISOString(),
      },
    };
  }
}

function createFixturePng(width: number, height: number, seed: string): Uint8Array {
  const color = colorFromSeed(seed);
  const rowLength = 1 + width * 3;
  const raw = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowLength;
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 3;
      raw[pixelOffset] = color.red;
      raw[pixelOffset + 1] = color.green;
      raw[pixelOffset + 2] = color.blue;
    }
  }

  const header = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function colorFromSeed(seed: string): { readonly red: number; readonly green: number; readonly blue: number } {
  const value = Number.parseInt(seed.slice(0, 6), 16);

  return {
    red: 32 + ((value >> 16) % 160),
    green: 32 + ((value >> 8) % 160),
    blue: 32 + (value % 160),
  };
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  const payload = Buffer.concat([typeBuffer, data]);

  length.writeUInt32BE(data.byteLength, 0);
  crc.writeUInt32BE(crc32(payload), 0);

  return Buffer.concat([length, payload, crc]);
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of input) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function parseImageSize(size: ImageSize): { readonly width: number; readonly height: number } {
  const [widthText, heightText] = size.split("x");

  return {
    width: Number(widthText),
    height: Number(heightText),
  };
}
