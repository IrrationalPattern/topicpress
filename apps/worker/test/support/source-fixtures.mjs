export const sourceId = "00000000-0000-0000-0000-000000000001";
export const secondSourceId = "00000000-0000-0000-0000-000000000002";

export function feedSource(overrides = {}) {
  return {
    id: sourceId,
    configKey: "fixture_source",
    kind: "rss",
    feedUrl: "https://example.test/feed.xml",
    language: "en",
    isActive: true,
    ...overrides,
  };
}

export function ingestionSource(overrides = {}) {
  return {
    ...feedSource(),
    name: "Fixture Source",
    lastFetchedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    ...overrides,
  };
}
