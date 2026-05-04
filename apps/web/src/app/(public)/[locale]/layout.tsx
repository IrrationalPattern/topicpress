import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PublicShell } from "@/components/public/public-shell";
import { resolveAppLocale, routing, type AppLocale } from "@/i18n/routing";
import { siteThemeStyle } from "@/lib/site-theme";

import "../../globals.css";

interface PublicLocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLocaleLayout({ children, params }: PublicLocaleLayoutProps) {
  const locale = resolveLocale((await params).locale);

  if (locale === null) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "PublicHomePage" });

  return (
    <html lang={locale} className="font-sans" style={siteThemeStyle}>
      <body>
        <NextIntlClientProvider>
          <PublicShell
            currentLocale={locale}
            footerLocaleLabel={t("shell.footerLocale")}
            homeLabel={t("shell.home")}
            localeSwitcherLabel={t("shell.localeSwitcher")}
            skipContentLabel={t("shell.skipContent")}
          >
            {children}
          </PublicShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function resolveLocale(locale: string): AppLocale | null {
  return resolveAppLocale(locale);
}
