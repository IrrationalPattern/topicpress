import { Badge } from "@/components/ui/badge";

export function ArticleStatusBadge({ status }: { readonly status: string }) {
  return <Badge variant={status === "failed" ? "destructive" : "secondary"}>{status}</Badge>;
}

export function ValidationBadge({
  issueCount,
  ok,
}: {
  readonly issueCount: number;
  readonly ok: boolean;
}) {
  return (
    <Badge variant={ok ? "default" : "outline"}>
      {ok ? "ready-valid" : `${issueCount} validation issue${issueCount === 1 ? "" : "s"}`}
    </Badge>
  );
}
