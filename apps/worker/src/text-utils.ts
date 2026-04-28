export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function truncateNormalizedText(value: string, maxLength: number): string {
  return normalizeWhitespace(value).slice(0, maxLength);
}
