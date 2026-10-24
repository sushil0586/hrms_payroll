"use client";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TenantAdminError({ error }: Props) {
  return (
    <WorkspaceErrorState
      appearance="accerio"
      userFacing
      detail={error.message}
      eyebrow="Tenant admin load issue"
      onRetry={() => {
        window.location.reload();
      }}
      title="Tenant admin could not load the current workspace"
    />
  );
}
