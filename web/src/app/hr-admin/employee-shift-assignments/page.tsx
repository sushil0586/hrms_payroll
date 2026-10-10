import Link from "next/link";

import { EmployeeShiftAssignmentImportWorkbench } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-import-workbench";
import { EmployeeShiftAssignmentGovernancePanel } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-governance-panel";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeShiftAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: SearchParamValue, fallback: number) {
  const parsed = Number(normalizeParam(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildHref(currentParams: Record<string, SearchParamValue>, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) params.set(key, normalized);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return `/hr-admin/employee-shift-assignments${query ? `?${query}` : ""}`;
}

export default async function HrAdminEmployeeShiftAssignmentsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["attendance.view", "attendance.policies.manage"], fallbackPath: "/hr-admin/attendance-operations" });
  const canManagePolicies = sessionHasPermission(sessionUser, "attendance.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const filters = {
    q: normalizeParam(currentParams.q) ?? "",
    kind: normalizeParam(currentParams.kind) ?? "all",
    primary: normalizeParam(currentParams.primary) ?? "all",
    risk: normalizeParam(currentParams.risk) ?? "all",
  };
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 50);
  const page = numberParam(currentParams.page, 1);
  const [result, optionsResult] = await Promise.all([
    getHrAdminEmployeeShiftAssignments({ q: filters.q, kind: filters.kind, primary: filters.primary, risk: filters.risk, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include: ["employees", "shifts"] }),
  ]);
  const pageItems = result.data.items;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const primaryCount = pageItems.filter((item) => item.is_primary).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live shift assignment mode" : "Demo shift assignment mode"}
        title="Shift assignments"
        description="Control fixed shifts, weekly rotations, and temporary overrides before attendance runtime depends on them."
        actions={
          <>
            {canManagePolicies ? (
              <Link className="button button--primary" href="/hr-admin/employee-shift-assignments/new">
                Create shift assignment
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">
              Back to attendance operations
            </Link>
          </>
        }
      />

      <TimeLeaveOperationsStrip
        current="shifts"
        title="Employee shift assignment governance"
        description="Assign employees to fixed shifts, weekly rotations, or temporary overrides with effective windows and overlap review."
        primaryMetricLabel="assignments"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="primary"
        secondaryMetricValue={primaryCount}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Assignments" value={totalCount} trend="Matching coverage" />
          <MetricTile label="Primary assignments" value={primaryCount} trend="Visible rows" />
          <MetricTile label="Employees on page" value={new Set(pageItems.map((item) => item.employee_id)).size} trend="Visible coverage" />
        </div>
      </section>

      <section className="section queue-layout">
        <form className="workspace-data-panel queue-toolbar" method="get" aria-label="Shift assignment filters">
          <div className="queue-toolbar__grid">
            <label><span>Search</span><input className="input-control" name="q" type="search" defaultValue={filters.q} placeholder="Employee, code, shift, scope" /></label>
            <label><span>Assignment mode</span><select className="input-control" name="kind" defaultValue={filters.kind}><option value="all">All modes</option><option value="fixed">Fixed</option><option value="weekly_rotation">Weekly rotation</option><option value="temporary_override">Temporary override</option></select></label>
            <label><span>Primary state</span><select className="input-control" name="primary" defaultValue={filters.primary}><option value="all">All</option><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
            <label><span>Risk</span><select className="input-control" name="risk" defaultValue={filters.risk}><option value="all">All risk states</option><option value="blocking">Blocking overlap</option><option value="overlap">Any overlap</option><option value="clear">Clear</option></select></label>
            <label><span>Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
          </div>
          <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--secondary" href="/hr-admin/employee-shift-assignments">Clear</Link><span className="queue-summary-chip"><strong>{totalCount}</strong> matching</span></div>
        </form>
        <div className="queue-list">
          {pageItems.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.employee}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.employee_code}</span>
                    <span className={`record-chip${item.is_primary ? " record-chip--accent" : ""}`}>{item.is_primary ? "primary" : "secondary"}</span>
                  </div>
                </div>
                <div className="record-card__actions">
                  {canManagePolicies ? (
                    <Link className="button button--secondary" href={`/hr-admin/employee-shift-assignments/${item.id}/edit`}>
                      Edit
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Shift</span>
                  <span className="detail-value">{item.shift}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Assignment mode</span>
                  <span className="detail-value">{item.assignment_kind.replace("_", " ")}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Effective window</span>
                  <span className="detail-value">{`${item.effective_from} to ${item.effective_to ?? "open ended"}`}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Scope summary</span>
                  <span className="detail-value">{item.scope_labels?.length ? item.scope_labels.join(" • ") : "No scope summary"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Overlap review</span>
                  <span className="detail-value">{item.conflict_summary || "No overlap summary available."}</span>
                </div>
              </div>
            </article>
          ))}
          {pageItems.length === 0 ? (
            <div className="payroll-setup-empty-state"><strong>No shift assignments match these filters.</strong><span>Clear filters or search by employee, shift, assignment mode, or risk state.</span></div>
          ) : null}
        </div>
        <PaginationBar
          firstHref={buildHref(currentParams, { page: "1", page_size: String(pageSize) })}
          hasNext={safePage < totalPages}
          hasPrevious={safePage > 1}
          lastHref={buildHref(currentParams, { page: String(totalPages), page_size: String(pageSize) })}
          nextHref={buildHref(currentParams, { page: String(safePage + 1), page_size: String(pageSize) })}
          page={safePage}
          pageSize={pageSize}
          previousHref={buildHref(currentParams, { page: String(safePage - 1), page_size: String(pageSize) })}
          totalCount={totalCount}
        />
      </section>

      {canManagePolicies ? (
        <>
          <EmployeeShiftAssignmentImportWorkbench assignments={pageItems} employees={optionsResult.data.employees} shifts={optionsResult.data.shifts} />
          <EmployeeShiftAssignmentGovernancePanel />
        </>
      ) : (
        <section className="section"><div className="notice"><strong>Read-only shift assignment view.</strong><span className="muted">Conflict previews and assignment edits require attendance policy management permission.</span></div></section>
      )}
    </main>
  );
}
