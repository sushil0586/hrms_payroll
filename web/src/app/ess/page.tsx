import { WorkspaceQuickActions } from "@/components/patterns/workspace-information";
import Link from "next/link";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";

import { WorkspaceStandardHeader, WorkspaceStandardPanel, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getEssOverview } from "@/lib/api";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";
import { EssFields, EssIdentity, essDate, essStatus } from "./ess-profile-summary";

export default async function EssPage() {
  const session = await requireWorkspaceAccess({ workspace: "ess" });
  const { data: dashboard, state } = await getEssOverview();
  const can = (permission: string) => state === "demo" || sessionHasPermission(session, permission);
  const canLeave = can("leave.view");
  const canAttendance = can("attendance.view");
  const today = dashboard.attendance.today;
  const shortcuts = [
    ...(can("leave.requests.create") ? [{ label: "Apply leave", href: "/ess/leave#apply-leave", detail: "Choose dates and review your request." }] : []),
    ...(can("attendance.regularization.request") ? [{ label: "Regularize attendance", href: "/ess/attendance#regularize-attendance", detail: "Request a correction to an eligible record." }] : []),
    ...(can("documents.view") ? [{ label: "Documents", href: "/ess/documents", detail: "Requirements, permitted uploads and verification." }] : []),
    { label: "Payslips", href: "/ess/payslips", detail: "View and download your published payslips." },
    ...(can("statutory.declarations.view") || can("statutory.declarations.manage") ? [{ label: "Tax declarations", href: "/ess/statutory-declarations", detail: "Review your declaration and permitted updates." }] : []),
    ...(can("notifications.view") ? [{ label: "Notifications", href: "/ess/notifications", detail: "Read your employee updates." }] : []),
  ];

  return (
    <main className="shell shell--workspace ess-experience-shell ess-compact" id="ess-main">
      <WorkspaceStandardHeader title="My workspace" description="Your working day, requests and employee services." actions={<Link prefetch={false} className="button button--secondary" href="/ess/profile">My Profile</Link>} />
      <EssIdentity profile={dashboard.profile} />
      {state === "demo" ? <p className="notice">Preview data · Sign in to a connected workspace for your employee information.</p> : null}
      <div className="ess-dashboard-grid" data-testid="ess-control-center">
        {canAttendance ? <WorkspaceStandardPanel title="Today" description="Attendance times shown in UTC." actions={<Link prefetch={false} href="/ess/attendance">View attendance</Link>} meta={<WorkspaceStatusBadge tone="neutral">{essStatus(today.status)}</WorkspaceStatusBadge>}>
          <EssFields fields={[["Date", essDate(today.date)], ["Shift", today.shift || "Not assigned"], ["Check-in", today.check_in_at ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(today.check_in_at)) : "Not recorded"], ["Month to date hours", String(dashboard.attendance.month_to_date.work_duration_hours)]]} />
        </WorkspaceStandardPanel> : null}
        {canLeave ? <WorkspaceStandardPanel title="Leave balances" description={`Leave year ${dashboard.leave.period_year}`} actions={<Link prefetch={false} href="/ess/leave">View leave</Link>}>
          {dashboard.leave.balances.length ? <WorkspaceTableScrollRegion className="workspace-table-scroll" label="Leave balance details"><table className="workspace-table ess-balance-table" aria-label="Leave balances"><thead><tr><th scope="col">Leave type</th><th scope="col">Available</th><th scope="col">Used</th><th scope="col">Reserved</th></tr></thead><tbody>{dashboard.leave.balances.map((balance, index) => <tr key={`${balance.leave_type}-${index}`}><th scope="row">{balance.leave_type}<small>{balance.policy_name}</small></th><td>{balance.closing_balance}</td><td>{balance.consumed_amount}</td><td>{balance.reserved_amount}</td></tr>)}</tbody></table></WorkspaceTableScrollRegion> : <p className="ess-empty">No leave balances are mapped yet. Contact HR if you expected an entitlement.</p>}
        </WorkspaceStandardPanel> : null}
        {canLeave || canAttendance ? <WorkspaceStandardPanel title="Awaiting approval" description="Requests waiting for review by your approver.">
          <ul className="ess-request-list">
            {canLeave ? <li><div><strong>Leave requests</strong><span>{dashboard.leave.pending_requests_count} pending</span></div><Link prefetch={false} href="/ess/leave?status=pending">View pending leave</Link></li> : null}
            {canAttendance ? <li><div><strong>Attendance fixes</strong><span>{dashboard.attendance.pending_regularizations_count} pending</span></div><Link prefetch={false} href="/ess/attendance?status=pending">View pending corrections</Link></li> : null}
          </ul>
          {(!canLeave || dashboard.leave.pending_requests_count === 0) && (!canAttendance || dashboard.attendance.pending_regularizations_count === 0) ? <p className="ess-empty">No requests awaiting approval.</p> : null}
        </WorkspaceStandardPanel> : null}
        <WorkspaceStandardPanel className="ess-services-panel" title="Employee services" description="Open a service to view details or take an available action.">
          <WorkspaceQuickActions actions={shortcuts} />
        </WorkspaceStandardPanel>
      </div>
    </main>
  );
}
