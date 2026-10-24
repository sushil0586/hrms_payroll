"use client";

import Link from "next/link";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformAdminError({ error }: Props) {
  return (
    <WorkspaceErrorState
      appearance="accerio"
      userFacing
      actions={
        <>
          <Link className="button button--secondary" href="/login">
            Sign in again
          </Link>
          <Link className="button button--secondary" href="/">
            Home
          </Link>
        </>
      }
      detail={error.message}
      eyebrow="Platform admin load issue"
      onRetry={() => window.location.reload()}
      title="Platform console could not load tenant onboarding data"
    />
  );
}
