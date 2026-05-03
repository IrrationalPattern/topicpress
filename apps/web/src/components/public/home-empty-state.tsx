import { Newspaper } from "lucide-react";
import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type HomeEmptyStateHeadingLevel = "h2" | "h3";

export interface HomeEmptyStateProps {
  readonly action?: React.ReactNode;
  readonly className?: string | undefined;
  readonly description?: React.ReactNode;
  readonly role?: "alert" | "status" | undefined;
  readonly title: React.ReactNode;
  readonly titleAs?: HomeEmptyStateHeadingLevel | undefined;
}

export function HomeEmptyState({
  action,
  className,
  description,
  role = "status",
  title,
  titleAs: Heading = "h2",
}: HomeEmptyStateProps) {
  const EmptyHeading: React.ElementType = Heading;

  return (
    <Card
      aria-live={role === "status" ? "polite" : undefined}
      className={cn("rounded-lg border-dashed py-0", className)}
      role={role}
    >
      <CardContent className="flex flex-col items-start gap-4 py-8 text-left sm:flex-row sm:items-center sm:py-10">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Newspaper aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <EmptyHeading className="font-heading text-xl leading-snug font-semibold text-foreground">
            {title}
          </EmptyHeading>
          {description === undefined ? null : (
            <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          )}
          {action === undefined ? null : <div className="mt-4">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
