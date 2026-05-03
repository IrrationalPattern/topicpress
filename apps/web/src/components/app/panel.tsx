import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Panel({
  action,
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly description?: ReactNode;
  readonly title: string;
}) {
  const titleId = headingId(title);

  return (
    <section aria-labelledby={titleId} className={className}>
      <Card className="gap-0 rounded-lg py-0">
        <CardHeader className="border-b py-4">
          <div>
            <h2 className="font-heading text-lg leading-snug font-semibold" id={titleId}>
              {title}
            </h2>
            {description === undefined ? null : (
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            )}
          </div>
          {action === undefined ? null : <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent className={cn("flex flex-col gap-4 py-4", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function headingId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
