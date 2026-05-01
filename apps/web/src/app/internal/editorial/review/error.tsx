"use client";

export default function EditorialReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="workspace-shell">
      <div className="state-box" role="alert">
        <h1 className="panel-title">Editorial review could not load</h1>
        <p className="muted">{error.message}</p>
        <button className="button-link" type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
