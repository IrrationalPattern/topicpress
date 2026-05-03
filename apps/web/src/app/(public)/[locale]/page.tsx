import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { StateMessage } from "@/components/app/state-message";
import { PublicShell } from "@/components/public/public-shell";
import { resolveAppLocale, routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = resolveAppLocale(localeParam);

  if (locale === null) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "PublicHomePage" });

  return (
    <PublicShell
      currentLocale={locale}
      footerLocaleLabel={t("shell.footerLocale")}
      homeLabel={t("shell.home")}
      localeSwitcherLabel={t("shell.localeSwitcher")}
      primaryNavLabel={t("shell.primaryNav")}
      skipContentLabel={t("shell.skipContent")}
    >
      <StateMessage title={t("routeScaffoldTitle")}>
        <p>{t("routeScaffoldBody")}</p>
      </StateMessage>
    </PublicShell>
  );
}
