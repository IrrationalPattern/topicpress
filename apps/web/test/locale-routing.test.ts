import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { siteConfig } from "@topicpress/config";

import { getLocalePathSegment as getNextIntlLocalePathSegment, routing } from "../src/i18n/routing.ts";
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
    siteConfig.locales.supportedLocales.map((locale) => ({ locale })),
  );
});

runTest("next-intl routing derives locales and prefixes from site config", () => {
  assert.deepEqual(routing.locales, [...siteConfig.locales.supportedLocales]);
  assert.equal(routing.defaultLocale, siteConfig.locales.defaultLocale);

  for (const locale of siteConfig.locales.supportedLocales) {
    assert.equal(getNextIntlLocalePathSegment(locale), getLocalePathSegment(locale));
  }
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

runTest("every supported locale has a next-intl message file", () => {
  for (const locale of siteConfig.locales.supportedLocales) {
    assert.equal(existsSync(new URL(`../messages/${locale}.json`, import.meta.url)), true);
  }
});
