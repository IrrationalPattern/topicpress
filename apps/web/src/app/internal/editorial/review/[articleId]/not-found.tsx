import Link from "next/link";

import { StateMessage } from "@/components/app/state-message";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { Button } from "@/components/ui/button";

export default function ArticleReviewNotFound() {
  return (
    <WorkspaceShell>
      <StateMessage
        action={
          <Button asChild variant="outline">
            <Link href="/internal/editorial/review">Back to review list</Link>
          </Button>
        }
        title="Article review not found"
        titleAs="h1"
      >
        <p>The requested draft is not available for review.</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
