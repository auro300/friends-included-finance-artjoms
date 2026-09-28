"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-page">
      <p className="eyebrow">Friends Included</p>
      <h1>The finance desk hit a problem.</h1>
      <p>Your saved records have not been changed.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
