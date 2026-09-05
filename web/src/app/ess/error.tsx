"use client";

import Link from "next/link";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EssError({ error, reset }: Props) {
  return (
    <WorkspaceErrorState
      actions={
        <Link className="button button--secondary" href="/login">
          Sign in again
        </Link>
      }
      detail={error.message}
      eyebrow="ESS load issue"
      onRetry={reset}
      title="Employee self service could not load your live data"
    />
  );
}
