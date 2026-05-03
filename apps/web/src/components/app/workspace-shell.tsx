import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WorkspaceShell({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <main className={cn("mx-auto w-[min(1180px,calc(100%_-_32px))] py-7 pb-12", className)}>
      {children}
    </main>
  );
}
