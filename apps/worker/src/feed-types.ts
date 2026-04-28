import type { SourceFeedKind } from "@topicpress/config";

import type { IngestionPolicy } from "./ingestion-policy.js";

export interface FeedSourceIdentity {
  readonly id?: string;
  readonly configKey: string;
  readonly kind: SourceFeedKind;
  readonly feedUrl: string;
  readonly language: string;
}

export interface FeedSource extends FeedSourceIdentity {
  readonly isActive: boolean;
  readonly name?: string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface NormalizedSourceItemCandidate {
  readonly source: FeedSourceIdentity;
  readonly sourceId?: string;
  readonly externalGuid?: string;
  readonly externalUrl: string;
  readonly title: string;
  readonly summary?: string;
  readonly contentText?: string;
  readonly rawPayload: JsonValue;
  readonly contentHashInput: string;
  readonly contentHash: string;
  readonly language: string;
  readonly publishedAt: Date | null;
  readonly fetchedAt: Date;
}

export type FeedErrorClass =
  | "network"
  | "timeout"
  | "http_4xx"
  | "http_5xx"
  | "parser"
  | "validation"
  | "unsupported";

export interface FeedAttempt {
  readonly attempt: number;
  readonly retryable: boolean;
  readonly errorClass?: FeedErrorClass;
  readonly httpStatus?: number;
  readonly message?: string;
}

export interface FeedSourceSuccess {
  readonly ok: true;
  readonly source: FeedSourceIdentity;
  readonly candidates: readonly NormalizedSourceItemCandidate[];
  readonly skippedByFreshness: number;
  readonly fetchedAt: Date;
  readonly attempts: readonly FeedAttempt[];
}

export interface FeedSourceFailure {
  readonly ok: false;
  readonly source: FeedSourceIdentity;
  readonly errorClass: FeedErrorClass;
  readonly errorMessage: string;
  readonly fetchedAt: Date;
  readonly attempts: readonly FeedAttempt[];
  readonly httpStatus?: number;
}

export type FeedSourceResult = FeedSourceSuccess | FeedSourceFailure;

export interface FeedBatchResult {
  readonly results: readonly FeedSourceResult[];
  readonly ignoredInactiveSources: number;
}

export interface FeedHttpResponse {
  readonly status: number;
  readonly body: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export type FeedHttpClient = (
  url: string,
  options: { readonly signal: AbortSignal },
) => Promise<FeedHttpResponse>;

export interface FetchFeedOptions {
  readonly now?: Date;
  readonly policy?: IngestionPolicy;
  readonly httpClient?: FeedHttpClient;
}

export interface ParsedFeedItem {
  readonly externalGuid?: string;
  readonly externalUrl: string;
  readonly title: string;
  readonly summary?: string;
  readonly contentText?: string;
  readonly publishedAt: Date | null;
  readonly language?: string;
  readonly rawPayload: JsonValue;
}

export interface ParsedFeed {
  readonly items: readonly ParsedFeedItem[];
}
