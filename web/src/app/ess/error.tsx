"use client";

import Link from "next/link";

export default function EssError() {
  function retry() {
    // A fresh authenticated GET avoids reusing a stale failed RSC boundary.
    // Preserve the current employee URL and query; never replay a submission.
    window.location.reload();
  }
  return (
    <main className="shell shell--workspace ess-compact accerio-page">
      <h1>Employee information is unavailable</h1>
      <p role="alert">We could not load your employee information. Try again. If the problem continues, contact HR to check your employee access.</p>
      <div className="ess-related-links">
        <button className="button button--primary" onClick={retry} type="button">Retry workspace</button>
        <Link prefetch={false} className="button button--secondary" href="/login">Sign in again</Link>
        <Link prefetch={false} className="button button--secondary" href="/ess">Back to dashboard</Link>
      </div>
    </main>
  );
}
