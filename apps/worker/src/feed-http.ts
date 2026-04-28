import { setTimeout as sleep } from "node:timers/promises";

import type { IngestionPolicy } from "./ingestion-policy.js";
import {
  FeedProcessingError,
  isAbortError,
  readErrorMessage,
  sanitizeErrorMessage,
  toFeedProcessingError,
} from "./feed-errors.js";
import type { FeedAttempt, FeedHttpClient, FeedHttpResponse } from "./feed-types.js";

export async function fetchWithRetry(
  url: string,
  httpClient: FeedHttpClient,
  policy: IngestionPolicy,
  attempts: FeedAttempt[],
): Promise<string> {
  const maxAttempts = 1 + policy.transientFetchRetries;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, httpClient, policy.fetchTimeoutMs);

      if (response.status >= 500) {
        throw new FeedProcessingError(`Feed request failed with HTTP ${response.status}`, {
          errorClass: "http_5xx",
          retryable: true,
          httpStatus: response.status,
        });
      }

      if (response.status >= 400) {
        throw new FeedProcessingError(`Feed request failed with HTTP ${response.status}`, {
          errorClass: "http_4xx",
          retryable: false,
          httpStatus: response.status,
        });
      }

      attempts.push({ attempt, retryable: false, httpStatus: response.status });
      return response.body;
    } catch (error) {
      const feedError = toFeedProcessingError(error);
      const willRetry = feedError.retryable && attempt < maxAttempts;

      attempts.push({
        attempt,
        retryable: willRetry,
        errorClass: feedError.errorClass,
        ...(feedError.httpStatus !== undefined ? { httpStatus: feedError.httpStatus } : {}),
        message: sanitizeErrorMessage(feedError.message),
      });

      if (!willRetry) {
        throw feedError;
      }

      await sleep(policy.retryBackoffMs[attempt - 1] ?? 0);
    }
  }

  throw new FeedProcessingError("Feed request failed after retries", {
    errorClass: "network",
    retryable: false,
  });
}

export async function fetchText(
  url: string,
  options: { readonly signal: AbortSignal },
): Promise<FeedHttpResponse> {
  try {
    const response = await fetch(url, {
      signal: options.signal,
      headers: {
        accept:
          "application/feed+json, application/json, application/atom+xml, application/rss+xml, application/xml, text/xml",
        "user-agent": "TopicpressWorker/0.0 (+https://topicpress.local)",
      },
    });

    return {
      status: response.status,
      body: await response.text(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new FeedProcessingError(readErrorMessage(error, "Feed request failed"), {
      errorClass: "network",
      retryable: true,
    });
  }
}

async function fetchWithTimeout(
  url: string,
  httpClient: FeedHttpClient,
  timeoutMs: number,
): Promise<FeedHttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await httpClient(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new FeedProcessingError("Feed request timed out", {
        errorClass: "timeout",
        retryable: true,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
