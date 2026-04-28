import type { FeedErrorClass } from "./feed-types.js";
import { truncateNormalizedText } from "./text-utils.js";

export class FeedProcessingError extends Error {
  readonly errorClass: FeedErrorClass;
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(
    message: string,
    options: {
      readonly errorClass: FeedErrorClass;
      readonly retryable: boolean;
      readonly httpStatus?: number;
    },
  ) {
    super(message);
    this.name = "FeedProcessingError";
    this.errorClass = options.errorClass;
    this.retryable = options.retryable;

    if (options.httpStatus !== undefined) {
      this.httpStatus = options.httpStatus;
    }
  }
}

export function toFeedProcessingError(error: unknown): FeedProcessingError {
  if (error instanceof FeedProcessingError) {
    return error;
  }

  if (isAbortError(error)) {
    return new FeedProcessingError("Feed request timed out", {
      errorClass: "timeout",
      retryable: true,
    });
  }

  return new FeedProcessingError(readErrorMessage(error, "Feed request failed"), {
    errorClass: "network",
    retryable: true,
  });
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (isRecord(error) && error.name === "AbortError")
  );
}

export function sanitizeErrorMessage(message: string): string {
  return truncateNormalizedText(message, 300);
}

export function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export function isRecord(input: unknown): input is Readonly<Record<string, unknown>> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
