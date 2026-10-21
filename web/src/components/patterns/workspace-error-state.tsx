"use client";

import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";

type Props = {
  appearance?: "standard" | "accerio";
  userFacing?: boolean;
  actions?: React.ReactNode;
  detail?: string;
  eyebrow: string;
  onRetry?: () => void;
  title: string;
};

export function WorkspaceErrorState({ appearance = "standard", userFacing = false, actions, detail, eyebrow, onRetry, title }: Props) {
  return (
    <main className={`shell shell--workspace${appearance === "accerio" ? " accerio-page" : ""}`} data-workspace-error="true">
      <PageIntro
        appearance={appearance}
        eyebrow={eyebrow}
        title={title}
        description={userFacing ? "This workspace is temporarily unavailable. Please try again." : "The workspace could not load live data. This is now treated as a real issue instead of silently switching to placeholder data."}
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
        <div className="notice" role="alert">
          <strong>Live workspace load failed.</strong>
          <span className="muted">
            {userFacing ? "Try again or clear the filters. Contact your administrator if the problem continues." : <>Check API base URL, authentication, and backend availability. If you intended to use seeded demo data, enable <code>HRMS_ENABLE_DEMO_DATA=true</code> explicitly.</>}
          </span>
          {detail && !userFacing ? <span className="muted">Technical detail: {detail}</span> : null}
        </div>
      </section>
    </main>
  );
}
