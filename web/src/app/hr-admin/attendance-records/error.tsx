"use client";

import { WorkspaceErrorState } from "@/components/patterns/workspace-error-state";

export default function AttendanceRecordsError() {
  return <WorkspaceErrorState appearance="accerio" userFacing eyebrow="Attendance load issue" title="Attendance records could not be loaded" onRetry={()=>window.location.reload()} actions={<a className="button button--secondary" data-navigation-mode="document" href="/hr-admin/attendance-records">Clear filters</a>}/>;
}
