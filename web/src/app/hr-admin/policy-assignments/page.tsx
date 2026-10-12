import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getHrAdminAttendancePolicyAssignments, getHrAdminLeavePolicyAssignments } from "@/lib/api";

export default async function HrAdminPolicyAssignmentsPage() {
  const [leaveResult, attendanceResult] = await Promise.all([
    getHrAdminLeavePolicyAssignments(),
    getHrAdminAttendancePolicyAssignments(),
  ]);

  const state = leaveResult.state === "live" && attendanceResult.state === "live" ? "live" : "demo";
  const activeLeaveCount = leaveResult.data.items.filter((item) => item.is_active).length;
  const activeAttendanceCount = attendanceResult.data.filter((item) => item.is_active).length;
  const assignmentRows = [
    {
      href: "/hr-admin/leave-policy-assignments",
      label: "Leave policy assignments",
      description: "Apply leave policies to organization slices or employee overrides with priority and overlap checks.",
      metric: `${leaveResult.data.total_count} assignments`,
      secondary: `${activeLeaveCount} active on page`,
      action: "Manage leave",
      tone: "info" as const,
    },
    {
      href: "/hr-admin/attendance-policy-assignments",
      label: "Attendance policy assignments",
      description: "Map attendance policies to branches, departments, grades, employment types, and employees.",
      metric: `${attendanceResult.data.length} assignments`,
      secondary: `${activeAttendanceCount} active`,
      action: "Manage attendance",
      tone: "info" as const,
    },
  ];

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={state === "live" ? "Live assignment mode" : "Demo assignment mode"}
        title="Policy assignments"
        description="Apply leave and attendance policies by branch, department, grade, employment type, or employee scope."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policy-assignments">Open leave assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-policy-assignments">Open attendance assignments</Link>
            <Link className="button button--secondary" href="/hr-admin/policies">Back to policies</Link>
          </>
        }
      />

      <div className="attendance-summary-strip" aria-label="Policy assignment summary">
        <span><strong>{leaveResult.data.total_count}</strong> leave assignments</span>
        <span><strong>{attendanceResult.data.length}</strong> attendance assignments</span>
        <span><strong>{activeLeaveCount + activeAttendanceCount}</strong> active visible</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section className="section attendance-operations-panel">
        <div className="section-heading-row attendance-operations-panel__header">
          <div>
            <h2 className="section-heading-soft">Choose assignment scope</h2>
            <p className="section-copy-soft">Leave and attendance assignment rules stay separate so rollout behavior is easier to audit.</p>
          </div>
        </div>
        <div className="attendance-operation-list">
          {assignmentRows.map((item) => (
            <Link className="attendance-operation-row" href={item.href} key={item.href}>
              <div className="attendance-operation-row__main">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
              <div className="attendance-operation-row__meta">
                <WorkspaceStatusBadge tone={item.tone}>{item.metric}</WorkspaceStatusBadge>
                <span>{item.secondary}</span>
              </div>
              <span className="button button--secondary button--compact">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
