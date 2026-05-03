"use client";

import { useTranslations } from "next-intl";

import { StateMessage } from "@/components/app/state-message";
import { Button } from "@/components/ui/button";

export default function PublicLocaleHomeError({ reset }: { reset: () => void }) {
  const t = useTranslations("PublicHomePage");

  return (
    <StateMessage
      action={
        <Button variant="outline" type="button" onClick={() => reset()}>
          {t("states.retry")}
        </Button>
      }
      role="alert"
      title={t("states.errorTitle")}
      titleAs="h1"
    >
      <p>{t("states.errorBody")}</p>
    </StateMessage>
  );
}
