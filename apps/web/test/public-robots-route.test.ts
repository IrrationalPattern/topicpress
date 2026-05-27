import assert from "node:assert/strict";

import {
  buildPublicRobotsRoute,
  getRobotsDirective,
  resolveRobotsEnvironment,
} from "../src/lib/public-seo-origin.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const canonicalSitemapUrl = "https://ai-landscape-brief.example/sitemap.xml";

runTest("robots environment resolver follows the T001 Vercel and Node mapping", () => {
  assert.equal(resolveRobotsEnvironment({ vercelEnv: "production", nodeEnv: "development" }), "production");
  assert.equal(resolveRobotsEnvironment({ vercelEnv: "preview", nodeEnv: "production" }), "staging");
  assert.equal(resolveRobotsEnvironment({ vercelEnv: "development", nodeEnv: "production" }), "local");
  assert.equal(resolveRobotsEnvironment({ nodeEnv: "development" }), "local");
  assert.equal(resolveRobotsEnvironment({ nodeEnv: "test" }), "local");
  assert.equal(resolveRobotsEnvironment({}), "local");
  assert.equal(resolveRobotsEnvironment({ nodeEnv: "production" }), "staging");
  assert.equal(resolveRobotsEnvironment({ vercelEnv: "qa", nodeEnv: "development" }), "staging");
});

runTest("robots directives come from the configured environment directive map", () => {
  assert.equal(getRobotsDirective({ vercelEnv: "production" }), "index,follow");
  assert.equal(getRobotsDirective({ vercelEnv: "preview" }), "noindex,nofollow");
  assert.equal(getRobotsDirective({ vercelEnv: "development" }), "noindex,nofollow");
  assert.equal(getRobotsDirective({ nodeEnv: "production" }), "noindex,nofollow");
});

runTest("robots route includes one canonical sitemap pointer and no localhost URL", () => {
  const route = buildPublicRobotsRoute({ nodeEnv: "test" });

  assert.equal(route.sitemap, canonicalSitemapUrl);
  assert.equal(Array.isArray(route.sitemap), false);
  assert.equal(String(route.sitemap).includes("localhost"), false);
});

runTest("robots route maps production to allow and non-production to disallow", () => {
  const productionRoute = buildPublicRobotsRoute({ vercelEnv: "production" });
  const previewRoute = buildPublicRobotsRoute({ vercelEnv: "preview" });

  assert.deepEqual(productionRoute.rules, {
    userAgent: "*",
    allow: "/",
  });
  assert.deepEqual(previewRoute.rules, {
    userAgent: "*",
    disallow: "/",
  });
});
