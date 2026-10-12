import Link from "next/link";

import { LeavePolicyAssignmentGovernancePanel } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-governance-panel";
import { LeavePolicyAssignmentImportWorkbench } from "@/app/hr-admin/leave-policy-assignments/leave-policy-assignment-import-workbench";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignment, getHrAdminLeavePolicyAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";
import { createEmptyLeavePolicyAssignmentValue, leavePolicyAssignmentToFormValue } from "./form-values";
import { LeavePolicyAssignmentForm } from "./leave-policy-assignment-form";
import { LeavePolicyAssignmentsTable } from "./leave-policy-assignments-table";

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
  const createModal = normalizeParam(currentParams.leaveAssignmentModal) === "create";
  const editLeaveAssignmentId = normalizeParam(currentParams.editLeaveAssignment);
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 50);
  const page = numberParam(currentParams.page, 1);
  const modalInclude = ["leave_policies", "legal_entities", "branches", "departments", "grades", "employment_types"];
  const include = createModal || editLeaveAssignmentId
    ? ["employees", "leave_policies", "leave_types", ...modalInclude]
    : ["employees", "leave_policies", "leave_types"];
  const [result, optionsResult, editResult] = await Promise.all([
    getHrAdminLeavePolicyAssignments({ q: filters.q, status: filters.status, scope: filters.scope, risk: filters.risk, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include }),
    canManagePolicies && editLeaveAssignmentId ? getHrAdminLeavePolicyAssignment(editLeaveAssignmentId) : Promise.resolve(null),
  ]);
  const pageItems = result.data.items;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const activeCount = pageItems.filter((item) => item.is_active).length;
  const conflictingCount = pageItems.filter((item) => (item.conflict_count ?? 0) > 0).length;
  const blockingCount = pageItems.filter((item) => item.has_blocking_conflict).length;
  const closeHref = buildHref(currentParams, { leaveAssignmentModal: undefined, editLeaveAssignment: undefined });
  const modalTitle = createModal ? "Create leave assignment" : editResult?.data ? "Edit leave assignment" : "";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui">
      <PageIntro
        eyebrow={result.state === "live" ? "Live leave assignment mode" : "Demo leave assignment mode"}
        title="Leave assignments"
        description="Map leave policies to the actual slices of the organization they should govern, with clear priority behavior when multiple rules could apply."
        actions={
          <>
            {canManagePolicies ? (
              <Link className="button button--primary" href={buildHref(currentParams, { leaveAssignmentModal: "create", editLeaveAssignment: undefined })}>
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
        <div className="attendance-summary-strip" aria-label="Leave assignment summary">
          <span><strong>{totalCount}</strong> assignments</span>
          <span><strong>{activeCount}</strong> active on page</span>
          <span><strong>{conflictingCount}</strong> overlap watch</span>
          <span><strong>{blockingCount}</strong> blocking risks</span>
        </div>
      </section>

      {canManagePolicies ? (
        <>
          <details className="section panel-card-soft">
            <summary className="bulk-tools-summary">
              <span><strong>Assignment governance tools</strong><small>Open for resolution preview and policy-scope import.</small></span>
              <span className="button button--secondary">Open tools</span>
            </summary>
            <LeavePolicyAssignmentGovernancePanel leaveTypes={optionsResult.data.leave_types} />
            <LeavePolicyAssignmentImportWorkbench assignments={pageItems} employees={optionsResult.data.employees} leavePolicies={optionsResult.data.leave_policies} />
          </details>
        </>
      ) : (
        <section className="section"><div className="notice"><strong>Read-only leave assignment view.</strong><span className="muted">Resolution previews and assignment edits require leave policy management permission.</span></div></section>
      )}

      <section className="section queue-layout">
        <form className="workspace-data-panel queue-toolbar" method="get" aria-label="Leave assignment filters">
          <div className="queue-toolbar__header">
            <div>
              <h2 className="section-heading-soft">Leave assignment catalog</h2>
              <p className="section-copy section-copy-soft">Filter assignment scopes, then inspect overlap and precedence in context.</p>
            </div>
            <span className="queue-summary-chip"><strong>{pageItems.length}</strong> on this page</span>
          </div>
          <div className="queue-toolbar__grid">
            <label><span>Search</span><input className="input-control" name="q" type="search" defaultValue={filters.q} placeholder="Policy, leave type, employee, scope" /></label>
            <label><span>Status</span><select className="input-control" name="status" defaultValue={filters.status}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label><span>Scope</span><select className="input-control" name="scope" defaultValue={filters.scope}><option value="all">All scopes</option><option value="employee">Employee overrides</option><option value="organization">Organization scopes</option><option value="global">Global</option></select></label>
            <label><span>Risk</span><select className="input-control" name="risk" defaultValue={filters.risk}><option value="all">All risk states</option><option value="blocking">Blocking overlap</option><option value="overlap">Any overlap</option><option value="clear">Clear</option></select></label>
            <label><span>Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
          </div>
          <div className="queue-toolbar__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--secondary" href="/hr-admin/leave-policy-assignments">Clear</Link><span className="queue-summary-chip"><strong>{totalCount}</strong> matching</span></div>
        </form>
        <LeavePolicyAssignmentsTable assignments={pageItems} canManagePolicies={canManagePolicies} />
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

      {canManagePolicies && (createModal || editResult?.data) ? (
        <HrAdminActionModal
          closeHref={closeHref}
          description="Required fields are marked with an asterisk. Existing validation, conflict checks, and save APIs are unchanged."
          eyebrow="Leave setup"
          labelledBy="leave-assignment-modal-title"
          title={modalTitle}
        >
          {createModal ? (
            <LeavePolicyAssignmentForm
              initialValue={createEmptyLeavePolicyAssignmentValue()}
              mode="create"
              options={optionsResult.data}
              returnPath={closeHref}
            />
          ) : editResult?.data ? (
            <LeavePolicyAssignmentForm
              initialEmployeeLabel={editResult.data.employee}
              initialValue={leavePolicyAssignmentToFormValue(editResult.data)}
              itemId={editResult.data.id}
              mode="edit"
              options={optionsResult.data}
              returnPath={closeHref}
            />
          ) : null}
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
