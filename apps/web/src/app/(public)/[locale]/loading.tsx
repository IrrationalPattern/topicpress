import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

export default async function PublicLocaleHomeLoading() {
  const t = await getTranslations("PublicHomePage");

  return (
    <section aria-busy="true" aria-label={t("states.loadingLabel")} className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-10 w-64 md:h-12" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </section>
  );
}
