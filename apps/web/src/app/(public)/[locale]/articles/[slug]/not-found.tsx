import { StateMessage } from "@/components/app/state-message";

export default function PublicArticleRouteNotFound() {
  return (
    <StateMessage role="alert" title="Article page not found" titleAs="h1">
      <p>The requested public locale or article slug is not available.</p>
    </StateMessage>
  );
}
