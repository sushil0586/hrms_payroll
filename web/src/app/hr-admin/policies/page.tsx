import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import {
  getHrAdminAttendancePolicies,
  getHrAdminAttendancePolicyAssignments,
  getHrAdminLeavePolicies,
  getHrAdminLeavePolicyAssignments,
  getHrAdminLeaveTypes,
} from "@/lib/api";

export default async function HrAdminPoliciesPage() {
  const [
    leaveTypesResult,
    leavePoliciesResult,
    leaveAssignmentsResult,
    attendancePoliciesResult,
    attendanceAssignmentsResult,
  ] = await Promise.all([
    getHrAdminLeaveTypes(),
    getHrAdminLeavePolicies(),
    getHrAdminLeavePolicyAssignments(),
    getHrAdminAttendancePolicies(),
    getHrAdminAttendancePolicyAssignments(),
  ]);

  const state =
    leaveTypesResult.state === "live" &&
    leavePoliciesResult.state === "live" &&
    leaveAssignmentsResult.state === "live" &&
    attendancePoliciesResult.state === "live" &&
    attendanceAssignmentsResult.state === "live"
      ? "live"
      : "demo";
  const leaveCatalogCount = leaveTypesResult.data.length + leavePoliciesResult.data.length;
  const assignmentCount = leaveAssignmentsResult.data.total_count + attendanceAssignmentsResult.data.length;
  const policyRows = [
    {
      href: "/hr-admin/leave-types",
      label: "Leave types",
      description: "Define the leave buckets employees and managers see.",
      metric: `${leaveTypesResult.data.length} types`,
      secondary: `${leavePoliciesResult.data.length} linked policies`,
      action: "Manage types",
      tone: "info" as const,
    },
    {
      href: "/hr-admin/leave-policies",
      label: "Leave policies",
      description: "Set entitlement, accrual, notice, eligibility, evidence, and approval behavior.",
      metric: `${leavePoliciesResult.data.length} policies`,
      secondary: `${leaveAssignmentsResult.data.total_count} assignments`,
      action: "Manage policies",
      tone: "success" as const,
    },
    {
      href: "/hr-admin/attendance-policies",
      label: "Attendance policies",
      description: "Define lateness, overtime, check-in, and regularization behavior.",
      metric: `${attendancePoliciesResult.data.length} policies`,
      secondary: `${attendanceAssignmentsResult.data.length} assignments`,
      action: "Manage policies",
      tone: "success" as const,
    },
    {
      href: "/hr-admin/leave-balances",
      label: "Leave balance operations",
      description: "Inspect balances, credits, debits, encashment, and policy-led ledger impact.",
      metric: "Operations",
      secondary: `${leavePoliciesResult.data.length} policy sources`,
      action: "Open balances",
      tone: "neutral" as const,
    },
  ];
  const assignmentRows = [
    {
      href: "/hr-admin/leave-policy-assignments",
      label: "Leave policy assignments",
      description: "Apply leave policies to organization scopes or employee overrides.",
      metric: `${leaveAssignmentsResult.data.total_count} assignments`,
      secondary: `${leaveAssignmentsResult.data.items.filter((item) => item.is_active).length} active on page`,
      action: "Manage leave",
      tone: "info" as const,
    },
    {
      href: "/hr-admin/attendance-policy-assignments",
      label: "Attendance policy assignments",
      description: "Map attendance policies to branches, departments, grades, and employees.",
      metric: `${attendanceAssignmentsResult.data.length} assignments`,
      secondary: `${attendanceAssignmentsResult.data.filter((item) => item.is_active).length} active`,
      action: "Manage attendance",
      tone: "info" as const,
    },
  ];

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={state === "live" ? "Live policy mode" : "Demo policy mode"}
        title="Policy control"
        description="Control leave and attendance rules, assignments, and rollout surfaces from one policy workspace."
        actions={
          <>
            <Link className="button button--primary" href="/hr-admin/leave-policies">Leave policies</Link>
            <Link className="button button--secondary" href="/hr-admin/attendance-policies">Attendance policies</Link>
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">Assignments</Link>
            <Link className="button button--secondary" href="/hr-admin">
              Back to admin workspace
            </Link>
          </>
        }
        pills={[
          "Policy building blocks and assignments",
          "Attendance and leave coverage",
          "Ready for structure-aware rollout",
        ]}
      />

      <div className="attendance-summary-strip" aria-label="Policy control summary">
        <span><strong>{leaveCatalogCount}</strong> leave catalog records</span>
        <span><strong>{attendancePoliciesResult.data.length}</strong> attendance policies</span>
        <span><strong>{assignmentCount}</strong> assignments</span>
        <span><strong>{state}</strong> mode</span>
      </div>

      <section className="section attendance-operations-panel">
        <div className="section-heading-row attendance-operations-panel__header">
          <div>
            <h2 className="section-heading-soft">Configure policy foundations</h2>
            <p className="section-copy-soft">Use these pages for rule setup. Assignment and balance operations stay in their own workspaces.</p>
          </div>
        </div>
        <div className="attendance-operation-list">
          {policyRows.map((item) => (
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

      <section className="section attendance-operations-panel">
        <div className="section-heading-row attendance-operations-panel__header">
          <div>
            <h2 className="section-heading-soft">Scoped rollout</h2>
            <p className="section-copy-soft">Open assignment workspaces when HR needs to change which policy applies to which workforce slice.</p>
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
