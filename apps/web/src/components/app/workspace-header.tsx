import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WorkspaceHeader({
  action,
  children,
  className,
  kicker,
  subtitle,
  title,
}: {
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly kicker?: string;
  readonly subtitle?: string;
  readonly title: ReactNode;
}) {
  return (
    <header className={cn("mb-5 grid items-start gap-4 md:flex md:justify-between", className)}>
      <div>
        {kicker === undefined ? null : (
          <p className="mb-1 text-xs font-bold tracking-normal text-muted-foreground uppercase">
            {kicker}
          </p>
        )}
        <h1 className="m-0 text-[28px] leading-tight font-semibold">{title}</h1>
        {subtitle === undefined ? null : (
          <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {action}
    </header>
  );
}
