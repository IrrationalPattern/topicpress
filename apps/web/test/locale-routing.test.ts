import assert from "node:assert/strict";

import { siteConfig } from "@topicpress/config";

import {
  getDefaultLocalePath,
  getLocalePathSegment,
  getSupportedLocaleRouteParams,
  resolveLocaleFromPathSegment,
} from "../src/lib/locale-routing.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

runTest("root redirect target comes from the configured default locale path", () => {
  assert.equal(getDefaultLocalePath(), siteConfig.locales.paths[siteConfig.locales.defaultLocale]);
});

runTest("supported locale static params derive from configured locale paths", () => {
  assert.deepEqual(
    getSupportedLocaleRouteParams(),
    siteConfig.locales.supportedLocales.map((locale) => ({
      locale: getLocalePathSegment(locale),
    })),
  );
});

runTest("path segments resolve to configured supported locale codes", () => {
  for (const locale of siteConfig.locales.supportedLocales) {
    const segment = getLocalePathSegment(locale);

    assert.deepEqual(resolveLocaleFromPathSegment(segment), {
      locale,
      path: siteConfig.locales.paths[locale],
      segment,
    });
  }
});

runTest("unsupported locale path segments do not resolve", () => {
  assert.equal(resolveLocaleFromPathSegment("unsupported-locale"), null);
});
