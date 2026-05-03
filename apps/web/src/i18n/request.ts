import { getRequestConfig } from "next-intl/server";

import { resolveAppLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = requestedLocale !== undefined
    ? resolveAppLocale(requestedLocale) ?? routing.defaultLocale
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
