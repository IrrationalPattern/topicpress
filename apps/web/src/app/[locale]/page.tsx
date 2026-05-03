import { siteConfig } from "@topicpress/config";
import { notFound } from "next/navigation";

import { getSupportedLocaleRouteParams, resolveLocaleFromPathSegment } from "@/lib/locale-routing";
import { StateMessage } from "@/components/app/state-message";
import { WorkspaceHeader } from "@/components/app/workspace-header";
import { WorkspaceShell } from "@/components/app/workspace-shell";

export function generateStaticParams() {
  return getSupportedLocaleRouteParams();
}

export default async function PublicLocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeSegment } = await params;
  const localeRoute = resolveLocaleFromPathSegment(localeSegment);

  if (localeRoute === null) {
    notFound();
  }

  const tagline =
    siteConfig.identity.tagline[localeRoute.locale] ??
    siteConfig.identity.tagline[siteConfig.locales.defaultLocale] ??
    "";

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        kicker={localeRoute.locale}
        subtitle={tagline}
        title={siteConfig.identity.name}
      />

      <StateMessage title="Public homepage route scaffold">
        <p>FE-505 will compose published article data and final homepage sections here.</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
