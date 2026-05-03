import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

export default async function PublicLocaleHomeLoading() {
  const t = await getTranslations("PublicHomePage");

  return (
    <section aria-busy="true" aria-label={t("states.loadingLabel")} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full max-w-2xl md:h-16" />
        <Skeleton className="h-5 w-full max-w-3xl" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </section>
  );
}
