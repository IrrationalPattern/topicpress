import Link from "next/link";

export default function ArticleReviewNotFound() {
  return (
    <main className="workspace-shell">
      <div className="state-box">
        <h1 className="panel-title">Article review not found</h1>
        <p className="muted">The requested draft was not returned by the BE-401 review boundary.</p>
        <Link className="button-link" href="/internal/editorial/review">
          Back to review list
        </Link>
      </div>
    </main>
  );
}
