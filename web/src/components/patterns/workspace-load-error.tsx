"use client";
import { usePathname } from "next/navigation";
import { WorkspaceErrorState } from "./workspace-error-state";

/** A fresh document retry reissues server reads and keeps the committed query. */
export function WorkspaceLoadError() {
  const pathname = usePathname();
  return <WorkspaceErrorState appearance="accerio" userFacing eyebrow="Workspace unavailable" title="This workspace could not be loaded" onRetry={() => window.location.reload()} actions={<a className="button button--secondary" href={pathname}>Clear filters</a>}/>;
}
