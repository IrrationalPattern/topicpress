import { StateMessage } from "@/components/app/state-message";

export default function PublicCategoryRouteNotFound() {
  return (
    <StateMessage role="alert" title="Category page not found" titleAs="h1">
      <p>The requested public locale or category slug is not available.</p>
    </StateMessage>
  );
}
