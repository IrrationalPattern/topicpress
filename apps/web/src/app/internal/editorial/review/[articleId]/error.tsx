"use client";

import { StateMessage } from "@/components/app/state-message";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { Button } from "@/components/ui/button";

export default function ArticleReviewDetailError({
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
        title="Article review could not load"
        titleAs="h1"
      >
        <p>{error.message}</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
