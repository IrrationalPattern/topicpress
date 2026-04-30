import { normalizeWhitespace } from "../text-utils.js";
import type { ClusterableSourceItem } from "./types.js";

export function buildCanonicalTopic(item: ClusterableSourceItem): string {
  const title = normalizeWhitespace(item.normalizedTitle ?? item.title);
  const simplified = title
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (simplified.length > 0) {
    return normalizeWhitespace(simplified);
  }

  if (title.length > 0) {
    return title.toLocaleLowerCase("en-US");
  }

  return `untitled:${item.id}`;
}

export function sourceItemObservedAt(item: ClusterableSourceItem): Date {
  return item.publishedAt ?? item.fetchedAt;
}
