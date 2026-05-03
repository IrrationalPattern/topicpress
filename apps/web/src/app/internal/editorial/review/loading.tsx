import { StateMessage } from "@/components/app/state-message";
import { WorkspaceShell } from "@/components/app/workspace-shell";

export default function EditorialReviewLoading() {
  return (
    <WorkspaceShell>
      <StateMessage role="status" title="Loading editorial review" titleAs="h1">
        <p>Fetching reviewable drafts from the local database.</p>
      </StateMessage>
    </WorkspaceShell>
  );
}
