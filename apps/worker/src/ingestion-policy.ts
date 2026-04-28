export interface IngestionPolicy {
  readonly freshnessWindowDays: number;
  readonly recrawlIntervalMinutes: number;
  readonly transientFetchRetries: number;
  readonly retryBackoffMs: readonly number[];
  readonly fetchTimeoutMs: number;
  readonly degradedAfterConsecutiveFailures: number;
  readonly degradedAfterFailureHours: number;
}

export const defaultIngestionPolicy = {
  freshnessWindowDays: 30,
  recrawlIntervalMinutes: 60,
  transientFetchRetries: 2,
  retryBackoffMs: [1_000, 5_000],
  fetchTimeoutMs: 15_000,
  degradedAfterConsecutiveFailures: 3,
  degradedAfterFailureHours: 24,
} as const satisfies IngestionPolicy;

export function getFreshnessCutoff(
  now: Date,
  policy: IngestionPolicy = defaultIngestionPolicy,
): Date {
  return new Date(now.getTime() - policy.freshnessWindowDays * 24 * 60 * 60 * 1_000);
}
