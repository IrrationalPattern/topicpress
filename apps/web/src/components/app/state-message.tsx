import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StateMessage({
  action,
  children,
  className,
  role,
  title,
  titleAs: Heading = "h2",
}: {
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly role?: "alert" | "status";
  readonly title: ReactNode;
  readonly titleAs?: "h1" | "h2" | "h3";
}) {
  return (
    <Card
      className={cn("rounded-lg border-dashed py-0", className)}
      role={role}
      {...(role === "status" ? { "aria-live": "polite" as const } : {})}
    >
      <CardContent className="py-6">
        <div className="flex flex-col gap-3">
          <div>
            <Heading className="font-heading text-lg leading-snug font-semibold">{title}</Heading>
            {children === undefined ? null : (
              <div className="mt-2 text-muted-foreground">{children}</div>
            )}
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
