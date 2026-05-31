import { sanitizeErrorMessage } from "../feed-errors.js";

const secretKeyPattern = /(api[-_ ]?key|secret|token|password|service[-_ ]?role)/i;

export function sanitizeHeroImageCandidateErrorMessage(message: string): string {
  return sanitizeErrorMessage(redactSecretLikeText(message));
}

export function sanitizeHeroImageCandidateReviewNote(input: string | undefined): string | null {
  if (input === undefined) {
    return null;
  }

  const compacted = input
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, 2_000);
  const sanitized = sanitizeHeroImageCandidateErrorMessage(compacted).trim();

  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeHeroImageCandidateJson(value: unknown): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return redactSecretLikeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeHeroImageCandidateJson(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        secretKeyPattern.test(key) ? "[redacted]" : sanitizeHeroImageCandidateJson(entry),
      ]),
    );
  }

  return {};
}

function redactSecretLikeText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(
      /\b(api[-_ ]?key|secret|token|password|service[-_ ]?role)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .replace(/https?:\/\/[^\s"]*(?:token|secret|apikey|api_key|service_role)[^\s"]*/gi, "[redacted-url]");
}
