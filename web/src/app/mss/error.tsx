"use client";

import Link from "next/link";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MssError({ error, reset }: Props) {
  return (
    <WorkspaceErrorState
      actions={
        <>
          <Link className="button button--secondary" href="/ess">
            Open ESS
          </Link>
          <Link className="button button--secondary" href="/login">
            Sign in again
          </Link>
        </>
      }
      detail={error.message}
      eyebrow="MSS load issue"
      onRetry={reset}
      title="Manager workspace could not load the live approval inbox"
    />
  );
}
