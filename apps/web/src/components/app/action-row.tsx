import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ActionRow({
  action,
  children,
  className,
}: {
  readonly action: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 border-b py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_max-content] md:items-center",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

export function ActionCopy({
  helpText,
  title,
}: {
  readonly helpText: ReactNode;
  readonly title: ReactNode;
}) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{helpText}</p>
    </div>
  );
}
