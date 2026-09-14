import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getMssApprovalInbox } from "@/lib/api";
import type { ManagerTeamSummary } from "@/lib/types";

type ManagerActionStatus = "ready" | "warning" | "blocked";

const statusLabel: Record<ManagerActionStatus, string> = {
  ready: "Ready",
  warning: "Review",
  blocked: "Blocked",
};

function chipClass(status: ManagerActionStatus) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  if (status === "blocked") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--blocked";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function actionStatus(value: number, blocked = false): ManagerActionStatus {
  if (blocked) {
    return "blocked";
  }
  return value > 0 ? "warning" : "ready";
}

function buildManagerActions(summary: ManagerTeamSummary) {
  return [
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
}

export default async function MssControlCenterPage() {
  const result = await getMssApprovalInbox({ leave_page_size: 5, regularization_page_size: 5 });
  const summary = result.summary;
  const actions = buildManagerActions(summary);
  const activeSignals = actions.filter((item) => item.status !== "ready").length;
  const totalPending = summary.pending_leave_approvals_count + summary.pending_attendance_regularizations_count;

  return (
    <main className="shell shell--mss-control">
      <PageIntro
        eyebrow={result.state === "live" ? "Live manager inbox" : "Demo manager inbox"}
        title="Manager control center"
        description="Team approvals, attendance exceptions, leave coverage, and payroll-impact signals in one focused workspace."
        actions={
          <>
            <Link className="button button--primary" href="/mss/approvals">
              Open approvals
            </Link>
            <Link className="button button--secondary" href="/mss/notifications">
              Notifications
            </Link>
            <Link className="button button--secondary" href="/ess">
              Self service
            </Link>
          </>
        }
        pills={["Team queue", "Payroll impact", "Fast decisions"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Team members" value={summary.team_size} trend="Direct and routed reports" />
          <MetricTile label="Pending decisions" value={totalPending} trend="Leave and attendance" />
          <MetricTile label="Leave approvals" value={summary.pending_leave_approvals_count} trend="Awaiting manager action" />
          <MetricTile label="Attendance exceptions" value={summary.attendance_exceptions_today} trend="Today signals" />
          <MetricTile label="On leave today" value={summary.employees_on_leave_today} trend="Coverage snapshot" />
        </div>
      </section>

      <section className="section mss-control-center" data-testid="mss-control-center">
        <article className="panel-card-soft hr-admin-control-card hr-admin-control-card--primary">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Manager command queue</span>
              <h2>Team priorities</h2>
            </div>
            <span className="queue-summary-chip"><strong>{activeSignals}</strong> active signals</span>
          </div>
          <div className="hr-admin-command-list">
            {actions.map((item) => (
              <div className="hr-admin-command-row" key={item.label}>
                <span className={chipClass(item.status)}>{statusLabel[item.status]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className="record-chip">{item.value}</span>
                <Link className="button button--secondary" href={item.href}>{item.action}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card-soft hr-admin-control-card">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Decision shortcuts</span>
              <h2>Work queue</h2>
            </div>
            <span className={chipClass(totalPending ? "warning" : "ready")}>{totalPending ? "Review" : "Ready"}</span>
          </div>
          <div className="hr-admin-shortcut-grid">
            <Link className="button button--primary" href="/mss/approvals?queue=leave">Leave queue</Link>
            <Link className="button button--secondary" href="/mss/approvals?queue=attendance">Attendance queue</Link>
            <Link className="button button--secondary" href="/mss/notifications">Alerts</Link>
            <Link className="button button--secondary" href="/ess/payslips">My payslips</Link>
            <Link className="button button--secondary" href="/ess/documents">My documents</Link>
            <Link className="button button--secondary" href="/ess/statutory-declarations">Tax declarations</Link>
          </div>
          <div className="detail-grid">
            <div className="detail-row">
              <span>Leave queue rows</span>
              <strong>{result.pendingLeave.total_count}</strong>
            </div>
            <div className="detail-row">
              <span>Attendance queue rows</span>
              <strong>{result.pendingRegularizations.total_count}</strong>
            </div>
            <div className="detail-row">
              <span>Payroll-impact queue</span>
              <strong>{summary.pending_attendance_regularizations_count}</strong>
            </div>
            <div className="detail-row">
              <span>Coverage watch</span>
              <strong>{summary.employees_on_leave_today}</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
