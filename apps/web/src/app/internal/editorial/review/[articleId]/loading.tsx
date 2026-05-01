export default function ArticleReviewDetailLoading() {
  return (
    <main className="workspace-shell">
      <div className="state-box" role="status" aria-live="polite">
        <h1 className="panel-title">Loading article review</h1>
        <p className="muted">Fetching generated draft content, lineage, and validation state.</p>
      </div>
    </main>
  );
}
