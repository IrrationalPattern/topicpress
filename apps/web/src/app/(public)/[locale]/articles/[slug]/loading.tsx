import { Skeleton } from "@/components/ui/skeleton";

export default function PublicArticleRouteLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading article page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8"
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-11 w-full max-w-2xl md:h-14" />
        <Skeleton className="h-6 w-full max-w-xl" />
      </div>
      <Skeleton className="aspect-[16/9] w-full rounded-lg" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-10/12" />
      </div>
    </section>
  );
}
