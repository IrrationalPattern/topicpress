export default function HomePage() {
  return (
    <main className="workspace-shell">
      <div className="workspace-header">
        <div>
          <p className="workspace-kicker">Topicpress</p>
          <h1 className="workspace-title">Internal publication workspace</h1>
          <p className="workspace-subtitle">
            Review generated drafts before later review and publish actions are wired.
          </p>
        </div>
        <a className="button-link" href="/internal/editorial/review">
          Open editorial review
        </a>
      </div>
    </main>
  );
}
