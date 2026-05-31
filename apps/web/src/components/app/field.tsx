import type { ReactNode } from "react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Field({
  className,
  label,
  value,
}: {
  readonly className?: string;
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1 text-xs font-bold tracking-normal text-muted-foreground uppercase">
        {label}
      </p>
      <div className="[overflow-wrap:anywhere] text-foreground">{value}</div>
    </div>
  );
}

export function MissingValue({ value }: { readonly value: string | null | undefined }) {
  return <>{isBlank(value) ? "Not provided" : value}</>;
}

function isBlank(value: string | null | undefined): boolean {
  return value === undefined || value === null || value.trim().length === 0;
}
