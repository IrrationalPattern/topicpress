import { StateMessage } from "@/components/app/state-message";
import { WorkspaceShell } from "@/components/app/workspace-shell";

export default function ArticleReviewDetailLoading() {
  return (
    <WorkspaceShell>
      <StateMessage role="status" title="Loading article review" titleAs="h1">
        <p>Fetching generated draft content, lineage, and validation state.</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
