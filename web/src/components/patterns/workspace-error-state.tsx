"use client";

import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";

type Props = {
  actions?: React.ReactNode;
  detail?: string;
  eyebrow: string;
  onRetry?: () => void;
  title: string;
};

export function WorkspaceErrorState({ actions, detail, eyebrow, onRetry, title }: Props) {
  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={eyebrow}
        title={title}
        description="The workspace could not load live data. This is now treated as a real issue instead of silently switching to placeholder data."
        actions={
          <>
            {onRetry ? (
              <button className="button button--primary" onClick={onRetry} type="button">
                Retry workspace
              </button>
            ) : null}
            <Link className="button button--secondary" href="/">
              Return home
            </Link>
            {actions}
          </>
        }
      />

      <section className="section">
        <div className="notice">
          <strong>Live workspace load failed.</strong>
          <span className="muted">
            Check API base URL, authentication, and backend availability. If you intended to use seeded demo data,
            enable `HRMS_ENABLE_DEMO_DATA=true` explicitly.
          </span>
          {detail ? <span className="muted">Technical detail: {detail}</span> : null}
        </div>
      </section>
    </main>
  );
}
