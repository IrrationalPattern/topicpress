import { siteConfig } from "@topicpress/config";
import { notFound } from "next/navigation";

import {
  getSupportedLocaleRouteParams,
  resolveLocaleFromPathSegment,
} from "@/lib/locale-routing";

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
    siteConfig.identity.tagline[siteConfig.locales.defaultLocale];

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="workspace-kicker">{localeRoute.locale}</p>
          <h1 className="workspace-title">{siteConfig.identity.name}</h1>
          <p className="workspace-subtitle">{tagline}</p>
        </div>
      </header>

      <section className="state-box" aria-labelledby="homepage-route-title">
        <h2 className="panel-title" id="homepage-route-title">
          Public homepage route scaffold
        </h2>
        <p className="muted">
          FE-505 will compose published article data and final homepage sections here.
        </p>
      </section>
    </main>
  );
}
