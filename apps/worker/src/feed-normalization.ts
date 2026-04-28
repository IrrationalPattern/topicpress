import { createHash } from "node:crypto";

import type {
  FeedSourceIdentity,
  JsonValue,
  NormalizedSourceItemCandidate,
  ParsedFeedItem,
} from "./feed-types.js";
import { normalizeWhitespace } from "./text-utils.js";

export function toCandidate(
  source: FeedSourceIdentity,
  item: ParsedFeedItem,
  fetchedAt: Date,
): NormalizedSourceItemCandidate {
  const language = item.language ?? source.language;
  const sourceIdentity = toSourceIdentity(source);
  const contentHashInput = stableJson({
    sourceConfigKey: source.configKey,
    externalUrl: item.externalUrl,
    title: normalizeWhitespace(item.title),
    summary: normalizeWhitespace(item.summary ?? ""),
    contentText: normalizeWhitespace(item.contentText ?? ""),
    publishedAt: item.publishedAt === null ? null : item.publishedAt.toISOString(),
  });
  const base = {
    source: sourceIdentity,
    externalUrl: item.externalUrl,
    title: item.title,
    rawPayload: item.rawPayload,
    contentHashInput,
    contentHash: createHash("sha256").update(contentHashInput).digest("hex"),
    language,
    publishedAt: item.publishedAt,
    fetchedAt,
  };

  return {
    ...base,
    ...(source.id !== undefined ? { sourceId: source.id } : {}),
    ...(item.externalGuid !== undefined ? { externalGuid: item.externalGuid } : {}),
    ...(item.summary !== undefined ? { summary: item.summary } : {}),
    ...(item.contentText !== undefined ? { contentText: item.contentText } : {}),
  };
}

export function toSourceIdentity(source: FeedSourceIdentity): FeedSourceIdentity {
  return {
    ...(source.id !== undefined ? { id: source.id } : {}),
    configKey: source.configKey,
    kind: source.kind,
    feedUrl: source.feedUrl,
    language: source.language,
  };
}

function stableJson(input: Readonly<Record<string, JsonValue>>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right))),
  );
}
