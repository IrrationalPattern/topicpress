import { StateMessage } from "@/components/app/state-message";

export default function PublicLocaleHomeNotFound() {
  return (
    <StateMessage role="alert" title="Public homepage not found" titleAs="h1">
      <p>The requested public locale is not available.</p>
    </StateMessage>
  );
}
