"use client";

import Link from "next/link";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HrAdminError({ error, reset }: Props) {
  return (
    <WorkspaceErrorState
      actions={
        <>
          <Link className="button button--secondary" href="/hr-admin/reports">
            Open reports
          </Link>
          <Link className="button button--secondary" href="/ess">
            Open ESS
          </Link>
        </>
      }
      detail={error.message}
      eyebrow="HR admin load issue"
      onRetry={reset}
      title="HR admin could not load the current workspace"
    />
  );
}
