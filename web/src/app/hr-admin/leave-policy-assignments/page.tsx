import Link from "next/link";

import { LeavePolicyAssignmentActions } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-actions";
import { LeavePolicyAssignmentGovernancePanel } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-governance-panel";
import { LeavePolicyAssignmentImportWorkbench } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-import-workbench";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
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
  return `/hr-admin/leave-policy-assignments${query ? `?${query}` : ""}`;
}

export default async function HrAdminLeavePolicyAssignmentsPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view", "leave.policies.manage"], fallbackPath: "/hr-admin/policy-assignments" });
  const canManagePolicies = sessionHasPermission(sessionUser, "leave.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const filters = {
    q: normalizeParam(currentParams.q) ?? "",
    status: normalizeParam(currentParams.status) ?? "all",
    scope: normalizeParam(currentParams.scope) ?? "all",
    risk: normalizeParam(currentParams.risk) ?? "all",
  };
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 50);
  const page = numberParam(currentParams.page, 1);
  const [result, optionsResult] = await Promise.all([
    getHrAdminLeavePolicyAssignments({ q: filters.q, status: filters.status, scope: filters.scope, risk: filters.risk, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include: ["employees", "leave_policies", "leave_types"] }),
  ]);
  const pageItems = result.data.items;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const activeCount = pageItems.filter((item) => item.is_active).length;
  const conflictingCount = pageItems.filter((item) => (item.conflict_count ?? 0) > 0).length;
  const blockingCount = pageItems.filter((item) => item.has_blocking_conflict).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave assignment mode" : "Demo leave assignment mode"}
        title="Leave assignments"
        description="Map leave policies to the actual slices of the organization they should govern, with clear priority behavior when multiple rules could apply."
        actions={
          <>
            {canManagePolicies ? (
              <Link className="button button--primary" href="/hr-admin/leave-policy-assignments/new">
                Create leave assignment
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/hr-admin/policy-assignments">
              Back to policy assignments
            </Link>
          </>
        }
        pills={["Priority-driven precedence", "Structure-based targeting", "Employee override support"]}
      />

      <TimeLeaveOperationsStrip
        current="assignments"
        title="Leave assignment governance"
        description="Map leave policies to legal entity, branch, department, employment type, or employee overrides with visible overlap risk."
        primaryMetricLabel="assignments"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="blocking risks"
        secondaryMetricValue={blockingCount}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Assignments" value={totalCount} trend="Matching scope links" />
          <MetricTile label="Active assignments" value={activeCount} trend="Visible rows" />
          <MetricTile label="Overlap watch" value={conflictingCount} trend="Visible risk rows" />
          <MetricTile label="Blocking risks" value={blockingCount} trend="Visible blockers" />
        </div>
      </section>

      {canManagePolicies ? (
        <>
          <LeavePolicyAssignmentGovernancePanel leaveTypes={optionsResult.data.leave_types} />
          <LeavePolicyAssignmentImportWorkbench assignments={pageItems} employees={optionsResult.data.employees} leavePolicies={optionsResult.data.leave_policies} />
        </>
      ) : (
        <section className="section"><div className="notice"><strong>Read-only leave assignment view.</strong><span className="muted">Resolution previews and assignment edits require leave policy management permission.</span></div></section>
      )}

      <section className="section queue-layout">
        <form className="workspace-data-panel queue-toolbar" method="get" aria-label="Leave assignment filters">
          <div className="queue-toolbar__grid">
            <label><span>Search</span><input className="input-control" name="q" type="search" defaultValue={filters.q} placeholder="Policy, leave type, employee, scope" /></label>
            <label><span>Status</span><select className="input-control" name="status" defaultValue={filters.status}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label><span>Scope</span><select className="input-control" name="scope" defaultValue={filters.scope}><option value="all">All scopes</option><option value="employee">Employee overrides</option><option value="organization">Organization scopes</option><option value="global">Global</option></select></label>
            <label><span>Risk</span><select className="input-control" name="risk" defaultValue={filters.risk}><option value="all">All risk states</option><option value="blocking">Blocking overlap</option><option value="overlap">Any overlap</option><option value="clear">Clear</option></select></label>
            <label><span>Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
          </div>
          <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--secondary" href="/hr-admin/leave-policy-assignments">Clear</Link><span className="queue-summary-chip"><strong>{totalCount}</strong> matching</span></div>
        </form>
        <div className="queue-list">
          {pageItems.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.policy_name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className={`record-chip${item.is_active ? " record-chip--accent" : ""}`}>
                      {item.is_active ? "active" : "inactive"}
                    </span>
                    <span className="record-chip">Priority {item.priority}</span>
                    {item.leave_type_name ? <span className="record-chip">{item.leave_type_name}</span> : null}
                    {(item.conflict_count ?? 0) > 0 ? (
                      <span className={`record-chip${item.has_blocking_conflict ? " record-chip--danger" : ""}`}>
                        {item.has_blocking_conflict ? "blocking overlap" : `${item.conflict_count} overlap${item.conflict_count === 1 ? "" : "s"}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="record-card__actions">
                  {canManagePolicies ? (
                    <>
                      <Link className="button button--secondary" href={`/hr-admin/leave-policy-assignments/${item.id}/edit`}>
                        Edit
                      </Link>
                      <LeavePolicyAssignmentActions assignmentId={item.id} isActive={item.is_active} policyName={item.policy_name} />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Legal entity</span>
                  <span className="detail-value">{item.legal_entity || "Any entity"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Branch</span>
                  <span className="detail-value">{item.branch || "Any branch"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{item.department || "Any department"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Employee override</span>
                  <span className="detail-value">{item.employee || "No employee override"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Resolved scope</span>
                  <span className="detail-value">{item.scope_labels?.length ? item.scope_labels.join(" • ") : "Global assignment"}</span>
                </div>
              </div>
              {item.conflict_summary ? (
                <div className="notice">
                  <strong>{item.has_blocking_conflict ? "Action needed." : "Governance note."}</strong>
                  <span className="muted">{item.conflict_summary}</span>
                </div>
              ) : null}
            </article>
          ))}
          {pageItems.length === 0 ? (
            <div className="payroll-setup-empty-state"><strong>No leave assignments match these filters.</strong><span>Clear filters or widen the search to review all policy scopes.</span></div>
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
    </main>
  );
}
