import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getEssDashboard } from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  return `status status--${status}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

type EssActionStatus = "ready" | "warning";

const essActionStatusLabel: Record<EssActionStatus, string> = {
  ready: "Ready",
  warning: "Review",
};

function essActionChipClass(status: EssActionStatus) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function essActionStatus(value: number): EssActionStatus {
  return value > 0 ? "warning" : "ready";
}

export default async function EssPage() {
  const { dashboard, leaveRequests, regularizations, state } = await getEssDashboard({
    leave_page_size: 3,
    regularization_page_size: 3,
  });
  const pendingLeaveCount = dashboard.leave.pending_requests_count;
  const pendingRegularizationCount = dashboard.attendance.pending_regularizations_count;
  const commandActions = [
    {
      label: "Leave requests",
      value: pendingLeaveCount,
      detail: pendingLeaveCount ? "Requests waiting for approval or follow-up." : "No leave request needs your action.",
      href: "/ess/leave?status=pending",
      action: pendingLeaveCount ? "Review" : "Open",
      status: essActionStatus(pendingLeaveCount),
    },
    {
      label: "Attendance fixes",
      value: pendingRegularizationCount,
      detail: pendingRegularizationCount ? "Corrections waiting for manager review." : "No attendance correction is pending.",
      href: "/ess/attendance?status=pending",
      action: pendingRegularizationCount ? "Review" : "Open",
      status: essActionStatus(pendingRegularizationCount),
    },
    {
      label: "Documents",
      value: "Open",
      detail: "Upload employee documents and track verification status.",
      href: "/ess/documents",
      action: "Open",
      status: "ready" as const,
    },
    {
      label: "Payslips",
      value: "View",
      detail: "Download payroll files and acknowledge reads.",
      href: "/ess/payslips",
      action: "Open",
      status: "ready" as const,
    },
  ];
  const activeSignals = commandActions.filter((item) => item.status !== "ready").length;
  const latestLeaveRequest = leaveRequests.items[0] ?? null;
  const latestRegularization = regularizations.items[0] ?? null;
  const quickActions = [
    { label: "Apply leave", href: "/ess/leave#apply-leave", tone: "primary" },
    { label: "Regularize attendance", href: "/ess/attendance#regularize-attendance", tone: "secondary" },
    { label: "Documents", href: "/ess/documents", tone: "secondary" },
    { label: "Payslips", href: "/ess/payslips", tone: "secondary" },
    { label: "Tax declarations", href: "/ess/statutory-declarations", tone: "secondary" },
    { label: "Notifications", href: "/ess/notifications", tone: "secondary" },
  ];

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={state === "live" ? "Live ESS" : "Demo ESS"}
        title="My workspace"
        description="Start with personal actions that need attention, then open a focused page for leave, attendance, documents, payslips, or tax declarations."
        actions={
          <>
            <Link className="button button--primary" href="/ess/leave#apply-leave">
              Apply leave
            </Link>
            <Link className="button button--secondary" href="/ess/attendance#regularize-attendance">
              Regularize attendance
            </Link>
            <Link className="button button--secondary" href="/ess/notifications">
              Inbox
            </Link>
          </>
        }
        pills={["Personal view", dashboard.profile.employee_code, dashboard.profile.department || "No department"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Pending leave" labelClassName="metric-label-soft" value={pendingLeaveCount} valueClassName="metric-value-soft" trend="Open leave page" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Attendance fixes" labelClassName="metric-label-soft" value={pendingRegularizationCount} valueClassName="metric-value-soft" trend="Open attendance page" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Hours this month" labelClassName="metric-label-soft" value={dashboard.attendance.month_to_date.work_duration_hours} valueClassName="metric-value-soft" trend="Logged so far" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Today" labelClassName="metric-label-soft" value={dashboard.attendance.today.status.replace("_", " ")} valueClassName="metric-value-soft" trend="Attendance state" trendClassName="metric-trend-soft" />
        </div>
      </section>

      <section className="section ess-home-grid" data-testid="ess-control-center">
        <article className="panel-card-soft ess-home-card ess-home-card--primary">
          <div className="ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Needs attention</span>
              <h2>Today&apos;s actions</h2>
              <p className="section-copy section-copy-soft">Only actions that may need employee input or review appear here.</p>
            </div>
            <span className="queue-summary-chip"><strong>{activeSignals}</strong> active signals</span>
          </div>
          <div className="ess-action-list">
            {commandActions.map((item) => (
              <div className="ess-action-row" key={item.label}>
                <span className={essActionChipClass(item.status)}>{essActionStatusLabel[item.status]}</span>
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

        <article className="panel-card-soft ess-home-card">
          <div className="ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Quick actions</span>
              <h2>What do you want to do?</h2>
              <p className="section-copy section-copy-soft">Use one focused page for each employee task.</p>
            </div>
            <span className={essActionChipClass(activeSignals ? "warning" : "ready")}>{activeSignals ? "Review" : "Ready"}</span>
          </div>
          <div className="ess-shortcut-grid">
            {quickActions.map((item) => (
              <Link className={`button button--${item.tone}`} href={item.href} key={item.label}>
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="section ess-snapshot-grid">
        <article className="record-card panel-card-soft ess-profile-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">My profile</h2>
              <p className="section-copy section-copy-soft">Employee details used for personal workflows.</p>
            </div>
          </div>
          <div className="ess-profile-summary">
            <div>
              <span className="workspace-card__eyebrow">{dashboard.profile.employee_code}</span>
              <strong>{dashboard.profile.full_name}</strong>
              <span>{dashboard.profile.designation || "No designation"} • {dashboard.profile.department || "No department"}</span>
            </div>
            <div className="detail-grid">
              <DetailRow label="Legal entity" value={dashboard.profile.legal_entity || "Not mapped"} />
              <DetailRow label="Branch" value={dashboard.profile.branch || "Not mapped"} />
              <DetailRow label="Location" value={dashboard.profile.location || "Not mapped"} />
              <DetailRow label="Manager" value={dashboard.profile.reporting_manager || "Not mapped"} />
            </div>
          </div>
        </article>

        <article className="record-card panel-card-soft ess-today-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">Today</h2>
              <p className="section-copy section-copy-soft">Personal day snapshot.</p>
            </div>
            <span className={statusClass(dashboard.attendance.today.status)}>{dashboard.attendance.today.status.replace("_", " ")}</span>
          </div>
          <div className="detail-grid">
            <DetailRow label="Date" value={formatDate(dashboard.attendance.today.date)} />
            <DetailRow label="Shift" value={dashboard.attendance.today.shift || "Not assigned"} />
            <DetailRow label="Check-in" value={formatDateTime(dashboard.attendance.today.check_in_at)} />
            <DetailRow label="Month hours" value={String(dashboard.attendance.month_to_date.work_duration_hours)} />
            <DetailRow label="Latest leave" value={latestLeaveRequest ? `${latestLeaveRequest.leave_type} - ${latestLeaveRequest.status.replace("_", " ")}` : "No request available"} />
            <DetailRow label="Latest attendance fix" value={latestRegularization ? `${formatDate(latestRegularization.attendance_date)} - ${latestRegularization.status.replace("_", " ")}` : "No correction available"} />
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Leave balances</h2>
            <p className="section-copy section-copy-soft">A compact balance snapshot. Open Leave for request history and application.</p>
          </div>
          <Link className="button button--secondary" href="/ess/leave#apply-leave">Apply leave</Link>
        </div>
        <div className="workspace-grid-modern balance-grid">
          {dashboard.leave.balances.length ? (
            dashboard.leave.balances.map((balance) => (
              <article className="workspace-card workspace-card--compact" key={balance.leave_type}>
                <h3>{balance.leave_type}</h3>
                <p className="muted">{balance.policy_name}</p>
                <div className="tableish__meta">
                  <span>Available: {balance.closing_balance}</span>
                  <span>Used: {balance.consumed_amount}</span>
                  <span>Reserved: {balance.reserved_amount}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="notice">
              <strong>No leave balances are mapped yet.</strong>
              <span className="muted">Contact HR if you expected leave balances here.</span>
            </div>
          )}
        </div>
      </section>

      {state === "demo" ? (
        <section className="section">
          <div className="notice">
            <strong>Web preview is running in demo mode.</strong>
            <span className="muted">
              Set `HRMS_API_BASE_URL` and a working `HRMS_API_BEARER_TOKEN` in the web environment file to use live data.
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
