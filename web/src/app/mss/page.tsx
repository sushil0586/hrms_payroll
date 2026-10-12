import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { getMssApprovalInbox } from "@/lib/api";
import type { ManagerTeamSummary } from "@/lib/types";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";

type ManagerActionStatus = "ready" | "warning" | "blocked";

const statusLabel: Record<ManagerActionStatus, string> = {
  ready: "Ready",
  warning: "Review",
  blocked: "Blocked",
};

function statusTone(status: ManagerActionStatus) {
  if (status === "ready") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}

function actionStatus(value: number, blocked = false): ManagerActionStatus {
  if (blocked) {
    return "blocked";
  }
  return value > 0 ? "warning" : "ready";
}

function buildManagerActions(
  summary: ManagerTeamSummary,
  permissions: { canApproveLeave: boolean; canReviewAttendance: boolean },
) {
  const actions = [
    {
      label: "Leave approvals",
      value: summary.pending_leave_approvals_count,
      detail: "Team leave requests waiting for manager decision.",
      href: "/mss/approvals?queue=leave",
      action: "Review leave",
      status: actionStatus(summary.pending_leave_approvals_count),
    },
    {
      label: "Attendance regularizations",
      value: summary.pending_attendance_regularizations_count,
      detail: "Attendance corrections that may affect payroll inputs.",
      href: "/mss/approvals?queue=attendance",
      action: "Review attendance",
      status: actionStatus(summary.pending_attendance_regularizations_count),
    },
    {
      label: "Today exceptions",
      value: summary.attendance_exceptions_today,
      detail: "Same-day attendance signals needing manager attention.",
      href: "/mss/approvals?queue=attendance",
      action: "Open exceptions",
      status: actionStatus(summary.attendance_exceptions_today),
    },
    {
      label: "Team on leave",
      value: summary.employees_on_leave_today,
      detail: "People away today for capacity and handoff planning.",
      href: "/mss/approvals?queue=leave",
      action: "View leave context",
      status: "ready" as const,
    },
  ];
  return actions.filter((item) => {
    if (item.href.includes("queue=leave")) {
      return permissions.canApproveLeave;
    }
    if (item.href.includes("queue=attendance")) {
      return permissions.canReviewAttendance;
    }
    return true;
  });
}

function priorityCopy(totalPending: number, activeSignals: number) {
  if (totalPending > 0) {
    return {
      title: "Decisions need review",
      body: `${totalPending} team request${totalPending === 1 ? "" : "s"} need a manager decision. Clear payroll-period items first.`,
      tone: "warning" as const,
    };
  }
  if (activeSignals > 0) {
    return {
      title: "Team signals need a quick look",
      body: `${activeSignals} team signal${activeSignals === 1 ? "" : "s"} may need follow-up, but no approval is blocking right now.`,
      tone: "warning" as const,
    };
  }
  return {
    title: "No manager decisions pending",
    body: "Your approval queues are clear. Check alerts or switch to ESS for your own employee tasks.",
    tone: "ready" as const,
  };
}

export default async function MssControlCenterPage() {
  const sessionUser = await requireWorkspaceAccess({ workspace: "mss" });
  const canApproveLeave = sessionHasPermission(sessionUser, "leave.requests.approve");
  const canReviewAttendance = sessionHasPermission(sessionUser, "attendance.regularization.review");
  const result = await getMssApprovalInbox({
    leave_page_size: 5,
    regularization_page_size: 5,
    include_leave: canApproveLeave,
    include_regularizations: canReviewAttendance,
  });
  const summary = result.summary;
  const actions = buildManagerActions(summary, { canApproveLeave, canReviewAttendance });
  const activeSignals = actions.filter((item) => item.status !== "ready").length;
  const visiblePendingLeave = canApproveLeave ? summary.pending_leave_approvals_count : 0;
  const visiblePendingAttendance = canReviewAttendance ? summary.pending_attendance_regularizations_count : 0;
  const totalPending = visiblePendingLeave + visiblePendingAttendance;
  const dailyPriority = priorityCopy(totalPending, activeSignals);

  return (
    <main className="shell shell--mss-control">
      <PageIntro
        eyebrow={result.state === "live" ? "Live manager inbox" : "Demo manager inbox"}
        title="Manager dashboard"
        description="Review team decisions, attendance signals, and approval risk from one calm daily workspace."
        actions={
          <>
            {canApproveLeave ? (
              <Link className="button button--primary" href="/mss/approvals?queue=leave">
                Leave approvals
              </Link>
            ) : null}
            {canReviewAttendance ? (
              <Link className="button button--secondary" href="/mss/approvals?queue=attendance">
                Attendance approvals
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/mss/notifications">
              Inbox
            </Link>
          </>
        }
        pills={["Daily manager view", "Team approvals", "Payroll aware"]}
        showPills
      />

      <section className="workspace-section">
        <div className="attendance-summary-strip" aria-label="Manager summary">
          <span><strong>{summary.team_size}</strong> team members</span>
          <span><strong>{totalPending}</strong> pending decisions</span>
          {canApproveLeave ? <span><strong>{summary.pending_leave_approvals_count}</strong> leave approvals</span> : null}
          {canReviewAttendance ? <span><strong>{summary.pending_attendance_regularizations_count}</strong> attendance fixes</span> : null}
          <span><strong>{summary.employees_on_leave_today}</strong> on leave today</span>
        </div>
      </section>

      <section className="section mss-dashboard" data-testid="mss-control-center">
        <article className={`panel-card-soft mss-priority-card mss-priority-card--${dailyPriority.tone}`}>
          <div className="mss-priority-card__content">
            <div>
              <span className="workspace-card__eyebrow">Today</span>
              <h2>{dailyPriority.title}</h2>
              <p className="section-copy section-copy-soft">{dailyPriority.body}</p>
            </div>
            <WorkspaceStatusBadge tone={statusTone(dailyPriority.tone)}>{statusLabel[dailyPriority.tone]}</WorkspaceStatusBadge>
          </div>
        </article>

        <article className="panel-card-soft mss-dashboard-card mss-dashboard-card--wide">
          <div className="mss-dashboard-card__header">
            <div>
              <span className="workspace-card__eyebrow">Manager actions</span>
              <h2>What to review next</h2>
              <p className="section-copy section-copy-soft">Open one focused queue at a time. Approval detail and decision capture stay inside that queue.</p>
            </div>
            <span className="queue-summary-chip"><strong>{activeSignals}</strong> active signals</span>
          </div>
          <div className="workspace-table-scroll">
            {actions.length ? (
              <table className="workspace-table attendance-directory-table mss-action-table" aria-label="Manager actions">
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Action</th>
                    <th>Count</th>
                    <th>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((item) => (
                    <tr key={item.label}>
                      <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{statusLabel[item.status]}</WorkspaceStatusBadge></td>
                      <td className="workspace-table__primary-cell">
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.detail}</span>
                        </div>
                      </td>
                      <td><span className="record-chip">{item.value}</span></td>
                      <td>
                        <Link className={item.status === "warning" ? "button button--primary" : "button button--secondary"} href={item.href}>
                          {item.action}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="notice notice--compact">
                <strong>No manager approval queues are enabled.</strong>
                <span className="muted">Use ESS for personal employee tasks or ask HR to confirm manager permissions.</span>
              </div>
            )}
          </div>
        </article>

        <article className="panel-card-soft mss-dashboard-card">
          <div className="mss-dashboard-card__header">
            <div>
              <span className="workspace-card__eyebrow">Team snapshot</span>
              <h2>Coverage context</h2>
            </div>
          </div>
          <div className="mss-context-grid">
            <div className="mss-context-tile">
              <span>Leave queue rows</span>
              <strong>{canApproveLeave ? result.pendingLeave.total_count : "Hidden"}</strong>
            </div>
            <div className="mss-context-tile">
              <span>Attendance queue rows</span>
              <strong>{canReviewAttendance ? result.pendingRegularizations.total_count : "Hidden"}</strong>
            </div>
            <div className="mss-context-tile">
              <span>Exceptions today</span>
              <strong>{canReviewAttendance ? summary.attendance_exceptions_today : "Hidden"}</strong>
            </div>
            <div className="mss-context-tile">
              <span>On leave today</span>
              <strong>{summary.employees_on_leave_today}</strong>
            </div>
          </div>
        </article>

        <article className="panel-card-soft mss-dashboard-card">
          <div className="mss-dashboard-card__header">
            <div>
              <span className="workspace-card__eyebrow">Personal workspace</span>
              <h2>Your ESS</h2>
              <p className="section-copy section-copy-soft">Use ESS for your own payslips, documents, tax declarations, and personal leave.</p>
            </div>
          </div>
          <div className="mss-personal-links">
            <Link className="button button--secondary" href="/ess">Open ESS</Link>
            <Link className="button button--secondary" href="/ess/payslips">Payslips</Link>
            <Link className="button button--secondary" href="/ess/documents">Documents</Link>
            <Link className="button button--secondary" href="/ess/statutory-declarations">Tax</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
