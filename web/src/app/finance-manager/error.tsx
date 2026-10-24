"use client";

import Link from "next/link";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FinanceManagerError({ error }: Props) {
  return (
    <WorkspaceErrorState
      appearance="accerio"
      userFacing
      actions={
        <>
          <Link className="button button--secondary" href="/hr-admin/reports">
            Open reports
          </Link>
          <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
            Open payroll outputs
          </Link>
        </>
      }
      detail={error.message}
      eyebrow="Finance load issue"
      onRetry={() => window.location.reload()}
      title="Finance control center could not load handoff data"
    />
  );
}
