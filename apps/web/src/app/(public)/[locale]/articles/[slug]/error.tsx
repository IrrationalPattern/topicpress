"use client";

import { StateMessage } from "@/components/app/state-message";
import { Button } from "@/components/ui/button";

export default function PublicArticleRouteError({ reset }: { readonly reset: () => void }) {
  return (
    <StateMessage
      action={
        <Button variant="outline" type="button" onClick={() => reset()}>
          Try again
        </Button>
      }
      role="alert"
      title="Article page failed to load"
      titleAs="h1"
    >
      <p>The article route is available, but this request could not be completed.</p>
    </StateMessage>
  );
}
