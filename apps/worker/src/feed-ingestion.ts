import { getFreshnessCutoff, defaultIngestionPolicy } from "./ingestion-policy.js";
import { FeedProcessingError, sanitizeErrorMessage, toFeedProcessingError } from "./feed-errors.js";
import { fetchText, fetchWithRetry } from "./feed-http.js";
import { toCandidate, toSourceIdentity } from "./feed-normalization.js";
import { parseFeedBody } from "./feed-parser.js";
import type {
  FeedAttempt,
  FeedBatchResult,
  FeedSource,
  FeedSourceIdentity,
  FeedSourceResult,
  FetchFeedOptions,
} from "./feed-types.js";

export function selectActiveFeedSources(sources: readonly FeedSource[]): readonly FeedSource[] {
  return sources.filter((source) => source.isActive);
}

export async function fetchAndNormalizeActiveSources(
  sources: readonly FeedSource[],
  options: FetchFeedOptions = {},
): Promise<FeedBatchResult> {
  const results: FeedSourceResult[] = [];
  const activeSources = selectActiveFeedSources(sources);
  const ignoredInactiveSources = sources.length - activeSources.length;

  for (const source of activeSources) {
    results.push(await fetchAndNormalizeFeedSource(source, options));
  }

  return { results, ignoredInactiveSources };
}

export async function fetchAndNormalizeFeedSource(
  source: FeedSourceIdentity,
  options: FetchFeedOptions = {},
): Promise<FeedSourceResult> {
  const fetchedAt = options.now ?? new Date();
  const policy = options.policy ?? defaultIngestionPolicy;
  const httpClient = options.httpClient ?? fetchText;
  const attempts: FeedAttempt[] = [];

  try {
    const body = await fetchWithRetry(source.feedUrl, httpClient, policy, attempts);
    const parsedFeed = parseFeedBody(body, source.kind);
    const cutoff = getFreshnessCutoff(fetchedAt, policy);
    const freshItems = parsedFeed.items.filter(
      (item) => item.publishedAt === null || item.publishedAt >= cutoff,
    );
    const candidates = freshItems.map((item) => toCandidate(source, item, fetchedAt));

    return {
      ok: true,
      source: toSourceIdentity(source),
      candidates,
      skippedByFreshness: parsedFeed.items.length - candidates.length,
      fetchedAt,
      attempts,
    };
  } catch (error) {
    const feedError = toFeedProcessingError(error);

    if (attempts.length === 0) {
      attempts.push(toAttempt(feedError));
    }

    return {
      ok: false,
      source: toSourceIdentity(source),
      errorClass: feedError.errorClass,
      errorMessage: sanitizeErrorMessage(feedError.message),
      fetchedAt,
      attempts,
      ...(feedError.httpStatus !== undefined ? { httpStatus: feedError.httpStatus } : {}),
    };
  }
}

function toAttempt(error: FeedProcessingError): FeedAttempt {
  return {
    attempt: 1,
    retryable: error.retryable,
    errorClass: error.errorClass,
    ...(error.httpStatus !== undefined ? { httpStatus: error.httpStatus } : {}),
    message: sanitizeErrorMessage(error.message),
  };
}
