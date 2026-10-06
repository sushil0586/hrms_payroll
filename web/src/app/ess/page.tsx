import Link from "next/link";

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
    <main className="shell shell--workspace ess-experience-shell shell--ess-home">
      <section className="workspace-control-header">
        <div className="workspace-control-header__copy">
          <span className="workspace-control-header__eyebrow">{state === "live" ? "Live ESS" : "Demo ESS"} / Self service</span>
          <h1>My workspace</h1>
          <p>Start with personal actions that need attention, then open a focused page for leave, attendance, documents, payslips, tax, or notifications.</p>
        </div>
        <div className="workspace-control-header__actions">
          <Link className="button button--primary" href="/ess/leave#apply-leave">Apply leave</Link>
          <Link className="button button--secondary" href="/ess/attendance#regularize-attendance">Regularize attendance</Link>
          <Link className="button button--secondary" href="/ess/notifications">Inbox</Link>
        </div>
        <div className="workspace-control-header__metrics" aria-label="Employee summary">
          <span className="queue-summary-chip"><strong>{dashboard.profile.employee_code}</strong> employee</span>
          <span className="queue-summary-chip"><strong>{dashboard.profile.department || "No department"}</strong></span>
          <span className="queue-summary-chip"><strong>{dashboard.profile.reporting_manager || "No manager"}</strong> manager</span>
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-summary-grid metric-grid-modern">
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">LV</span><h3>Pending leave</h3></div>
            <strong>{pendingLeaveCount}</strong>
            <p>Requests waiting for approval or follow-up.</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">AT</span><h3>Attendance fixes</h3></div>
            <strong>{pendingRegularizationCount}</strong>
            <p>Corrections waiting for manager review.</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">HR</span><h3>Hours this month</h3></div>
            <strong>{dashboard.attendance.month_to_date.work_duration_hours}</strong>
            <p>Logged so far in this attendance period.</p>
          </article>
          <article className="workspace-summary-card metric-tile metric-tile-soft">
            <div><span className="workspace-summary-card__icon" aria-hidden="true">TD</span><h3>Today status</h3></div>
            <strong>{dashboard.attendance.today.status.replace("_", " ")}</strong>
            <p>{formatDate(dashboard.attendance.today.date)} attendance state.</p>
          </article>
        </div>
      </section>

      <section className="workspace-section ess-home-grid" data-testid="ess-control-center">
        <article className="workspace-data-panel ess-home-card ess-home-card--primary">
          <div className="workspace-data-panel__header ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Needs attention</span>
              <h2>Today&apos;s actions</h2>
              <p>Only actions that may need employee input or review appear here.</p>
            </div>
            <span className="queue-summary-chip"><strong>{activeSignals}</strong> active signals</span>
          </div>
          <div className="workspace-table ess-action-list" role="table" aria-label="Today actions">
            <div className="workspace-table__row workspace-table__row--head ess-action-row" role="row">
              <span role="columnheader">State</span>
              <span role="columnheader">Action</span>
              <span role="columnheader">Count</span>
              <span role="columnheader">Open</span>
            </div>
            {commandActions.map((item) => (
              <div className="workspace-table__row ess-action-row" key={item.label} role="row">
                <span role="cell"><span className={essActionChipClass(item.status)}>{essActionStatusLabel[item.status]}</span></span>
                <span role="cell">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <span role="cell"><span className="record-chip">{item.value}</span></span>
                <span role="cell"><Link className="button button--secondary" href={item.href}>{item.action}</Link></span>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-data-panel ess-home-card">
          <div className="workspace-data-panel__header ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Quick actions</span>
              <h2>What do you want to do?</h2>
              <p>Use one focused page for each employee task.</p>
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

      <section className="workspace-section ess-snapshot-grid">
        <article className="workspace-data-panel ess-profile-card">
          <div className="workspace-data-panel__header">
            <div>
              <h2>My profile</h2>
              <p>Employee details used for personal workflows.</p>
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

        <article className="workspace-data-panel ess-today-card">
          <div className="workspace-data-panel__header">
            <div>
              <h2>Today</h2>
              <p>Personal day snapshot.</p>
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

      <section className="workspace-section">
        <div className="workspace-section__header">
          <div>
            <h2>Leave balances</h2>
            <p>A compact balance snapshot. Open Leave for request history and application.</p>
          </div>
          <Link className="button button--secondary" href="/ess/leave#apply-leave">Apply leave</Link>
        </div>
        <div className="workspace-summary-grid balance-grid">
          {dashboard.leave.balances.length ? (
            dashboard.leave.balances.map((balance) => (
              <article className="workspace-summary-card ess-balance-card" key={balance.leave_type}>
                <div>
                  <span className="workspace-summary-card__icon" aria-hidden="true">{balance.leave_type.slice(0, 2).toUpperCase()}</span>
                  <h3>{balance.leave_type}</h3>
                </div>
                <strong>{balance.closing_balance}</strong>
                <p className="muted">{balance.policy_name}</p>
                <div className="workspace-summary-card__meta">
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
        <section className="workspace-section">
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
