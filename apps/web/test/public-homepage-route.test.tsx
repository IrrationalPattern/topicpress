import assert from "node:assert/strict";

import type { HomepageArticle } from "@topicpress/worker";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomepageContent } from "../src/components/public/homepage-content.tsx";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const article = {
  id: "article-1",
  slug: "published-ai-brief",
  displaySlug: "published-ai-brief",
  title: "Published AI brief",
  excerpt: "A concise public summary from durable published state.",
  category: {
    configKey: "news",
    slug: "news",
    label: "News",
  },
  publishedAt: new Date("2026-05-03T09:30:00.000Z"),
} satisfies HomepageArticle;

runTest("homepage composition renders populated published state without deferred links", () => {
  const html = renderToStaticMarkup(
    <HomepageContent
      articleListAriaLabel="Published homepage articles"
      articles={[article]}
      categoryLabel="Category"
      dateLabel="Published"
      description="Concise factual AI briefings."
      emptyStateDescription="Reviewed articles will appear here."
      emptyStateTitle="No published articles yet"
      heading="Latest briefings"
      kicker="AI briefing"
      locale="en-GB"
      publishedCountLabel="1 published article"
      slugLabel="Slug"
      title="AI Landscape Brief"
    />,
  );

  assert.match(html, /AI Landscape Brief/);
  assert.match(html, /1 published article/);
  assert.match(html, /Latest briefings/);
  assert.match(html, /Published AI brief/);
  assert.match(html, /published-ai-brief/);
  assert.doesNotMatch(html, /\shref=/);
});

runTest("homepage composition preserves explicit empty state", () => {
  const html = renderToStaticMarkup(
    <HomepageContent
      articleListAriaLabel="Published homepage articles"
      articles={[]}
      categoryLabel="Category"
      dateLabel="Published"
      description="Concise factual AI briefings."
      emptyStateDescription="Reviewed articles will appear here."
      emptyStateTitle="No published articles yet"
      heading="Latest briefings"
      kicker="AI briefing"
      locale="en-GB"
      publishedCountLabel="No published articles yet"
      slugLabel="Slug"
      title="AI Landscape Brief"
    />,
  );

  assert.match(html, /No published articles yet/);
  assert.match(html, /Reviewed articles will appear here/);
  assert.doesNotMatch(html, /Published AI brief/);
  assert.doesNotMatch(html, /<li/);
});
