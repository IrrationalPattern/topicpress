import type { SourceFeedKind } from "@topicpress/config";

import { FeedProcessingError, isRecord, readErrorMessage } from "./feed-errors.js";
import type { JsonValue, ParsedFeed } from "./feed-types.js";

export function parseFeedBody(body: string, kind: SourceFeedKind): ParsedFeed {
  if (kind === "rss") {
    return parseRss(body);
  }

  if (kind === "atom") {
    return parseAtom(body);
  }

  if (kind === "json_feed") {
    return parseJsonFeed(body);
  }

  throw new FeedProcessingError(`Unsupported source kind "${String(kind)}"`, {
    errorClass: "unsupported",
    retryable: false,
  });
}

function parseRss(xml: string): ParsedFeed {
  const blocks = getXmlBlocks(xml, "item");

  if (blocks.length === 0) {
    throw new FeedProcessingError("RSS feed has no item entries", {
      errorClass: "parser",
      retryable: false,
    });
  }

  return {
    items: blocks.map((block, index) => {
      const title = requiredText(readXmlText(block, "title"), `rss.item[${index}].title`);
      const externalUrl = requiredUrl(readXmlText(block, "link"), `rss.item[${index}].link`);
      const externalGuid = optionalText(readXmlText(block, "guid"));
      const summary = optionalText(readXmlText(block, "description"));
      const contentText = optionalText(readXmlText(block, "content:encoded"));
      const publishedAt = parseOptionalDate(
        readXmlText(block, "pubDate"),
        `rss.item[${index}].pubDate`,
      );

      return {
        ...(externalGuid !== undefined ? { externalGuid } : {}),
        externalUrl,
        title,
        ...(summary !== undefined ? { summary } : {}),
        ...(contentText !== undefined ? { contentText } : {}),
        publishedAt,
        rawPayload: {
          kind: "rss",
          title,
          externalUrl,
          ...(externalGuid !== undefined ? { externalGuid } : {}),
          ...(summary !== undefined ? { summary } : {}),
          ...(contentText !== undefined ? { contentText } : {}),
          ...(publishedAt !== null ? { publishedAt: publishedAt.toISOString() } : {}),
          rawXml: block,
        },
      };
    }),
  };
}

function parseAtom(xml: string): ParsedFeed {
  const blocks = getXmlBlocks(xml, "entry");

  if (blocks.length === 0) {
    throw new FeedProcessingError("Atom feed has no entry elements", {
      errorClass: "parser",
      retryable: false,
    });
  }

  return {
    items: blocks.map((block, index) => {
      const title = requiredText(readXmlText(block, "title"), `atom.entry[${index}].title`);
      const externalUrl = requiredUrl(readAtomLink(block), `atom.entry[${index}].link`);
      const externalGuid = optionalText(readXmlText(block, "id"));
      const summary = optionalText(readXmlText(block, "summary"));
      const contentText = optionalText(readXmlText(block, "content"));
      const publishedAt = parseOptionalDate(
        readXmlText(block, "published") ?? readXmlText(block, "updated"),
        `atom.entry[${index}].published`,
      );

      return {
        ...(externalGuid !== undefined ? { externalGuid } : {}),
        externalUrl,
        title,
        ...(summary !== undefined ? { summary } : {}),
        ...(contentText !== undefined ? { contentText } : {}),
        publishedAt,
        rawPayload: {
          kind: "atom",
          title,
          externalUrl,
          ...(externalGuid !== undefined ? { externalGuid } : {}),
          ...(summary !== undefined ? { summary } : {}),
          ...(contentText !== undefined ? { contentText } : {}),
          ...(publishedAt !== null ? { publishedAt: publishedAt.toISOString() } : {}),
          rawXml: block,
        },
      };
    }),
  };
}

function parseJsonFeed(body: string): ParsedFeed {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new FeedProcessingError(readErrorMessage(error, "Invalid JSON Feed payload"), {
      errorClass: "parser",
      retryable: false,
    });
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    throw new FeedProcessingError("JSON Feed payload is missing an items array", {
      errorClass: "validation",
      retryable: false,
    });
  }

  const feedLanguage = readString(parsed, "language");

  return {
    items: parsed.items.map((item, index) => {
      if (!isRecord(item)) {
        throw new FeedProcessingError(`json_feed.items[${index}]: expected object`, {
          errorClass: "validation",
          retryable: false,
        });
      }

      const title = requiredText(readString(item, "title"), `json_feed.items[${index}].title`);
      const externalUrl = requiredUrl(
        readString(item, "url") ?? readString(item, "external_url"),
        `json_feed.items[${index}].url`,
      );
      const externalGuid = optionalText(readString(item, "id"));
      const summary = optionalText(readString(item, "summary"));
      const contentText = optionalText(
        readString(item, "content_text") ?? readString(item, "content_html"),
      );
      const language = optionalText(readString(item, "language") ?? feedLanguage);
      const publishedAt = parseOptionalDate(
        readString(item, "date_published") ?? readString(item, "date_modified"),
        `json_feed.items[${index}].date_published`,
      );

      return {
        ...(externalGuid !== undefined ? { externalGuid } : {}),
        externalUrl,
        title,
        ...(summary !== undefined ? { summary } : {}),
        ...(contentText !== undefined ? { contentText } : {}),
        ...(language !== undefined ? { language } : {}),
        publishedAt,
        rawPayload: toJsonValue({ kind: "json_feed", item }),
      };
    }),
  };
}

function getXmlBlocks(xml: string, tagName: string): readonly string[] {
  const pattern = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    "gi",
  );
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const block = match[1];

    if (block !== undefined) {
      blocks.push(block);
    }
  }

  return blocks;
}

function readXmlText(xml: string, tagName: string): string | undefined {
  const pattern = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    "i",
  );
  const match = pattern.exec(xml);
  const text = match?.[1];

  if (text === undefined) {
    return undefined;
  }

  return decodeXmlEntities(stripTags(stripCdata(text))).trim();
}

function readAtomLink(xml: string): string | undefined {
  const links = [...xml.matchAll(/<link\b([^>]*)\/?>/gi)];
  const alternate = links.find((match) => {
    const attributes = match[1] ?? "";
    const rel = readXmlAttribute(attributes, "rel");
    return rel === undefined || rel === "alternate";
  });
  const href = readXmlAttribute(alternate?.[1] ?? links[0]?.[1] ?? "", "href");

  return href;
}

function readXmlAttribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const match = pattern.exec(attributes);
  const value = match?.[1] ?? match?.[2];

  return value === undefined ? undefined : decodeXmlEntities(value.trim());
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function requiredText(value: string | undefined, path: string): string {
  const text = optionalText(value);

  if (text === undefined) {
    throw new FeedProcessingError(`${path}: expected non-empty text`, {
      errorClass: "validation",
      retryable: false,
    });
  }

  return text;
}

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim();

  return text === undefined || text.length === 0 ? undefined : text;
}

function requiredUrl(value: string | undefined, path: string): string {
  const url = requiredText(value, path);

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new FeedProcessingError(`${path}: expected http or https URL`, {
      errorClass: "validation",
      retryable: false,
    });
  }

  return url;
}

function parseOptionalDate(value: string | undefined, path: string): Date | null {
  const text = optionalText(value);

  if (text === undefined) {
    return null;
  }

  const timestamp = Date.parse(text);

  if (Number.isNaN(timestamp)) {
    throw new FeedProcessingError(`${path}: expected parseable date`, {
      errorClass: "validation",
      retryable: false,
    });
  }

  return new Date(timestamp);
}

function readString(input: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = input[key];

  return typeof value === "string" ? value : undefined;
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
