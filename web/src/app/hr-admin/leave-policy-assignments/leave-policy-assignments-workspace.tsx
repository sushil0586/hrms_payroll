"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { apiErrorMessage } from "@/lib/ui/api-error-message";
import type { HrAdminLeavePolicyAssignmentListResponse, HrAdminPolicyWorkbenchOptions } from "@/lib/types";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";
import { LeavePolicyAssignmentGovernancePanel } from "./leave-policy-assignment-governance-panel";
import { LeavePolicyAssignmentImportWorkbench } from "./leave-policy-assignment-import-workbench";
import { LeavePolicyAssignmentsTable } from "./leave-policy-assignments-table";

type SearchParamValue = string | string[] | undefined;
type Props = {
  initialData: HrAdminLeavePolicyAssignmentListResponse;
  currentParams: Record<string, SearchParamValue>;
  filters: { q: string; status: string; scope: string; risk: string };
  options: Pick<HrAdminPolicyWorkbenchOptions, "employees" | "leave_policies" | "leave_types">;
  canManagePolicies: boolean;
};
function buildHref(currentParams: Record<string, SearchParamValue>, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(currentParams).forEach(([key, value]) => { const normalized = Array.isArray(value) ? value[0] : value; if (normalized) params.set(key, normalized); });
  Object.entries(updates).forEach(([key, value]) => { if (value) params.set(key, value); else params.delete(key); });
  return `/hr-admin/leave-policy-assignments${params.size ? `?${params}` : ""}`;
}

/** Keep import outcomes mounted while refreshing the same authorized, committed query. */
export function LeavePolicyAssignmentsWorkspace({ initialData, currentParams, filters, options, canManagePolicies }: Props) {
  const [snapshot, setSnapshot] = useState<{base: Props["initialData"]; data: Props["initialData"]} | null>(null);
  const data = snapshot?.base === initialData ? snapshot.data : initialData;
  const pageItems = data.items;
  const totalCount = data.total_count;
  const totalPages = data.total_pages ?? Math.max(1, Math.ceil(totalCount / data.page_size));
  const safePage = data.page;
  const pageSize = data.page_size;
  const activeCount = pageItems.filter(item => item.is_active).length;
  const conflictingCount = pageItems.filter(item => (item.conflict_count ?? 0) > 0).length;
  const blockingCount = pageItems.filter(item => item.has_blocking_conflict).length;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const request = useRef<{id: number; controller?: AbortController}>({id: 0});
  const workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stop = () => request.current.controller?.abort();
    window.addEventListener("pagehide", stop);
    return () => { window.removeEventListener("pagehide", stop); stop(); };
  }, []);

  async function refreshCatalog() {
    request.current.controller?.abort();
    const id = ++request.current.id;
    const controller = new AbortController(); request.current.controller = controller;
    const location = window.location.pathname + window.location.search;
    const params = new URLSearchParams({...filters, page: String(safePage), page_size: String(pageSize)});
    setIsRefreshing(true); setRefreshError("");
    try {
      const read = async () => {
        const response = await fetch(`/api/hr-admin/leave-policy-assignments?${params}`, {cache:"no-store", signal:controller.signal});
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(response.status >= 500 ? "Catalog service is unavailable." : apiErrorMessage(payload, "Catalog access could not be confirmed."));
        if (!payload || !Array.isArray(payload.items) || !Number.isInteger(payload.total_count) || !Number.isInteger(payload.page) || !Number.isInteger(payload.page_size)) throw new Error("Catalog confirmation was incomplete.");
        return payload as HrAdminLeavePolicyAssignmentListResponse;
      };
      let refreshed = await read();
      const lastPage = refreshed.total_pages ?? Math.max(1, Math.ceil(refreshed.total_count / pageSize));
      if (safePage > lastPage) { params.set("page", String(lastPage)); refreshed = await read(); }
      if (controller.signal.aborted || id !== request.current.id || location !== window.location.pathname + window.location.search) return;
      setSnapshot({base:initialData, data:refreshed});
      if (safePage !== refreshed.page) window.history.replaceState(window.history.state, "", buildHref(currentParams, {page:String(refreshed.page)}));
      if (document.activeElement === document.body) workspaceRef.current?.querySelector<HTMLElement>('[aria-label="Leave assignments table scroll"]')?.focus({preventScroll:true});
    } catch (error) {
      if (!controller.signal.aborted && id === request.current.id && location === window.location.pathname + window.location.search) setRefreshError(`${error instanceof Error ? error.message : "Catalog refresh failed."} Your completed changes are saved; last loaded results are shown. Retry the catalog read without resubmitting the import.`);
    } finally {
      if (id === request.current.id) setIsRefreshing(false);
    }
  }

  return <div ref={workspaceRef} aria-busy={isRefreshing || undefined}>
    {refreshError ? <div className="notice notice--warning" role="alert"><span>{refreshError}</span><button type="button" className="button button--secondary" disabled={isRefreshing} onClick={() => void refreshCatalog()}>Retry catalog refresh</button></div> : null}
    {isRefreshing ? <div role="status" className="notice">Refreshing the assignment catalog…</div> : null}
      <details className="workspace-context-disclosure"><summary>Leave navigation and summary</summary>
      <TimeLeaveOperationsStrip
        current="assignments"
        title="Leave assignment governance"
        description="Map leave policies to legal entity, branch, department, employment type, or employee overrides with visible overlap risk."
        primaryMetricLabel="assignments"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="blocking risks on page"
        secondaryMetricValue={blockingCount}
      />
      </details>

      <section className="section">
        <div className="attendance-summary-strip" role="group" aria-label="Leave assignment summary">
          <span><strong>{totalCount}</strong> assignments</span>
          <span><strong>{activeCount}</strong> active on page</span>
          <span><strong>{conflictingCount}</strong> overlap watch on page</span>
          <span><strong>{blockingCount}</strong> blocking risks on page</span>
        </div>
      </section>


      <section className="section queue-layout">
        <WorkspaceFilterForm action="/hr-admin/leave-policy-assignments" className="workspace-filter-form--three" label="Leave assignment filters">
            <label className="form-field"><span>Search</span><input className="input-control" name="q" type="search" defaultValue={filters.q} placeholder="Policy, leave type, employee, scope" /></label>
            <label className="form-field"><span>Status</span><select className="input-control" name="status" defaultValue={filters.status}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label className="form-field"><span>Scope</span><select className="input-control" name="scope" defaultValue={filters.scope}><option value="all">All scopes</option><option value="employee">Employee overrides</option><option value="organization">Organization scopes</option><option value="global">Global</option></select></label>
            <label className="form-field"><span>Risk</span><select className="input-control" name="risk" defaultValue={filters.risk}><option value="all">All risk states</option><option value="blocking">Blocking overlap</option><option value="overlap">Any overlap</option><option value="clear">Clear</option></select></label>
            <label className="form-field"><span>Rows</span><select className="input-control" name="page_size" defaultValue={String(pageSize)}>{![10,25,50].includes(pageSize) ? <option value={pageSize}>{pageSize}</option> : null}<option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
          <div className="workspace-filter-actions"><button className="button button--primary" type="submit">Apply filters</button><a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/leave-policy-assignments">Clear</a><span className="queue-summary-chip"><strong>{totalCount}</strong> matching</span></div>
        </WorkspaceFilterForm>
        <LeavePolicyAssignmentsTable assignments={pageItems} canManagePolicies={canManagePolicies} onChanged={refreshCatalog} />
        <PaginationBar
          navigationMode="document"
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
          <details className="workspace-context-disclosure">
            <summary>Assignment governance tools</summary>
            <LeavePolicyAssignmentGovernancePanel leaveTypes={options.leave_types} />
            <LeavePolicyAssignmentImportWorkbench onCommitted={refreshCatalog} assignments={pageItems} employees={options.employees} leavePolicies={options.leave_policies} />
          </details>
        </>
      ) : (
        <section className="section"><div className="notice"><strong>Read-only leave assignment view.</strong><span className="muted">Resolution previews and assignment edits require leave policy management permission.</span></div></section>
      )}

  </div>;
}
