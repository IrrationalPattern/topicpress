export default function EditorialReviewLoading() {
  return (
    <main className="workspace-shell">
      <div className="state-box" role="status" aria-live="polite">
        <h1 className="panel-title">Loading editorial review</h1>
        <p className="muted">Fetching reviewable drafts from the local database.</p>
      </div>
    </main>
  );
}
