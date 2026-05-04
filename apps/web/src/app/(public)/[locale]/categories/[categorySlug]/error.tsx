"use client";

import { StateMessage } from "@/components/app/state-message";
import { Button } from "@/components/ui/button";

export default function PublicCategoryRouteError({ reset }: { readonly reset: () => void }) {
  return (
    <StateMessage
      action={
        <Button variant="outline" type="button" onClick={() => reset()}>
          Try again
        </Button>
      }
      role="alert"
      title="Category page failed to load"
      titleAs="h1"
    >
      <p>The category route is available, but this request could not be completed.</p>
    </StateMessage>
  );
}
