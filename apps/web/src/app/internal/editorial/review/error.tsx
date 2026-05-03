"use client";

import { StateMessage } from "@/components/app/state-message";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/app/workspace-shell";

export default function EditorialReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceShell>
      <StateMessage
        action={
          <Button variant="outline" type="button" onClick={() => reset()}>
            Try again
          </Button>
        }
        role="alert"
        title="Editorial review could not load"
        titleAs="h1"
      >
        <p>{error.message}</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
