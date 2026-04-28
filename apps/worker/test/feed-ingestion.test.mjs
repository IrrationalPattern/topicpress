import assert from "node:assert/strict";
import { test } from "node:test";

import {
  fetchAndNormalizeActiveSources,
  fetchAndNormalizeFeedSource,
  selectActiveFeedSources,
} from "../dist/feed-ingestion.js";
import { defaultIngestionPolicy } from "../dist/ingestion-policy.js";
import { httpClient } from "./support/feed-fixtures.mjs";
import { feedSource as source } from "./support/source-fixtures.mjs";

const now = new Date("2026-04-28T12:00:00.000Z");
const noWaitPolicy = {
  ...defaultIngestionPolicy,
  retryBackoffMs: [0, 0],
};

test("RSS entries normalize into source item candidates and skip stale items", async () => {
  const rss = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <guid>rss-1</guid>
          <title>Fresh RSS Item</title>
          <link>https://example.test/fresh-rss</link>
          <description><![CDATA[Fresh summary]]></description>
          <content:encoded><![CDATA[Fresh body]]></content:encoded>
          <pubDate>Mon, 27 Apr 2026 10:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Old RSS Item</title>
          <link>https://example.test/old-rss</link>
          <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Missing Date RSS Item</title>
          <link>https://example.test/missing-date-rss</link>
        </item>
      </channel>
    </rss>`;

  const result = await fetchAndNormalizeFeedSource(source(), {
    now,
    policy: noWaitPolicy,
    httpClient: httpClient(rss),
  });

  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 2);
  assert.equal(result.skippedByFreshness, 1);
  assert.equal(result.candidates[0].sourceId, source().id);
  assert.equal(result.candidates[0].externalGuid, "rss-1");
  assert.equal(result.candidates[0].externalUrl, "https://example.test/fresh-rss");
  assert.equal(result.candidates[0].summary, "Fresh summary");
  assert.equal(result.candidates[0].contentText, "Fresh body");
  assert.match(result.candidates[0].contentHash, /^[a-f0-9]{64}$/);
  assert.equal(result.candidates[1].publishedAt, null);
  assert.equal(result.candidates[1].fetchedAt.toISOString(), now.toISOString());
});

test("Atom entries normalize alternate links and publication dates", async () => {
  const atom = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>tag:example.test,2026:atom-1</id>
        <title>Atom Item</title>
        <link rel="self" href="https://example.test/feed/atom-1"/>
        <link rel="alternate" href="https://example.test/atom-1"/>
        <summary>Atom summary</summary>
        <content>Atom body</content>
        <published>2026-04-26T09:00:00Z</published>
      </entry>
    </feed>`;

  const result = await fetchAndNormalizeFeedSource(source({ kind: "atom" }), {
    now,
    policy: noWaitPolicy,
    httpClient: httpClient(atom),
  });

  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].externalGuid, "tag:example.test,2026:atom-1");
  assert.equal(result.candidates[0].externalUrl, "https://example.test/atom-1");
  assert.equal(result.candidates[0].publishedAt.toISOString(), "2026-04-26T09:00:00.000Z");
});

test("JSON Feed entries normalize JSON fields and item language", async () => {
  const jsonFeed = JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: "Fixture Feed",
    language: "en",
    items: [
      {
        id: "json-1",
        url: "https://example.test/json-1",
        title: "JSON Feed Item",
        summary: "JSON summary",
        content_text: "JSON body",
        language: "uk",
        date_published: "2026-04-25T08:00:00Z",
      },
    ],
  });

  const result = await fetchAndNormalizeFeedSource(source({ kind: "json_feed" }), {
    now,
    policy: noWaitPolicy,
    httpClient: httpClient(jsonFeed),
  });

  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].externalGuid, "json-1");
  assert.equal(result.candidates[0].language, "uk");
  assert.equal(result.candidates[0].rawPayload.kind, "json_feed");
});

test("inactive sources are ignored by default", async () => {
  let fetchCount = 0;
  const active = source({ configKey: "active_source", feedUrl: "https://example.test/active.xml" });
  const inactive = source({
    configKey: "inactive_source",
    feedUrl: "https://example.test/inactive.xml",
    isActive: false,
  });
  const batch = await fetchAndNormalizeActiveSources([active, inactive], {
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;
      return {
        status: 200,
        body: `<rss><channel><item><title>Active</title><link>https://example.test/active</link></item></channel></rss>`,
      };
    },
  });

  assert.equal(fetchCount, 1);
  assert.equal(batch.ignoredInactiveSources, 1);
  assert.equal(batch.results.length, 1);
  assert.equal(batch.results[0].ok, true);
  assert.deepEqual(selectActiveFeedSources([active, inactive]), [active]);
});

test("batch retrieval isolates source-level failures", async () => {
  const failing = source({
    configKey: "bad_source",
    feedUrl: "https://example.test/bad.xml",
  });
  const succeeding = source({
    configKey: "good_source",
    feedUrl: "https://example.test/good.xml",
  });
  const batch = await fetchAndNormalizeActiveSources([failing, succeeding], {
    now,
    policy: noWaitPolicy,
    httpClient: async (url) => {
      if (url.endsWith("/bad.xml")) {
        return { status: 200, body: "<rss><channel></channel></rss>" };
      }

      return {
        status: 200,
        body: `<rss><channel><item><title>Good</title><link>https://example.test/good</link></item></channel></rss>`,
      };
    },
  });

  assert.equal(batch.results.length, 2);
  assert.equal(batch.results[0].ok, false);
  assert.equal(batch.results[0].errorClass, "parser");
  assert.equal(batch.results[1].ok, true);
  assert.equal(batch.results[1].candidates.length, 1);
});

test("malformed feeds fail at source level without retry", async () => {
  let fetchCount = 0;
  const result = await fetchAndNormalizeFeedSource(source(), {
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;
      return { status: 200, body: "<rss><channel></channel></rss>" };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorClass, "parser");
  assert.equal(fetchCount, 1);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].retryable, false);
});

test("transient network failures retry and remain source-level failures", async () => {
  let fetchCount = 0;
  const result = await fetchAndNormalizeFeedSource(source(), {
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;
      throw new Error("temporary network failure");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorClass, "network");
  assert.equal(fetchCount, 3);
  assert.equal(result.attempts.length, 3);
  assert.deepEqual(
    result.attempts.map((attempt) => attempt.retryable),
    [true, true, false],
  );
});

test("HTTP 5xx responses retry and can recover", async () => {
  let fetchCount = 0;
  const result = await fetchAndNormalizeFeedSource(source(), {
    now,
    policy: noWaitPolicy,
    httpClient: async () => {
      fetchCount += 1;

      if (fetchCount < 3) {
        return { status: 503, body: "unavailable" };
      }

      return {
        status: 200,
        body: `<rss><channel><item><title>Recovered</title><link>https://example.test/recovered</link></item></channel></rss>`,
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(fetchCount, 3);
  assert.equal(result.attempts.length, 3);
  assert.equal(result.attempts[0].httpStatus, 503);
  assert.equal(result.candidates.length, 1);
});
