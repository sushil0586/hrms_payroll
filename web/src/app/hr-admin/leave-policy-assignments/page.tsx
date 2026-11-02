import { LeavePolicyAssignmentsWorkspace } from "./leave-policy-assignments-workspace";
import { redirect } from "next/navigation";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicyAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";

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
    sort: ["policy-asc", "policy-desc", "priority-desc", "risk"].includes(normalizeParam(currentParams.sort) ?? "") ? normalizeParam(currentParams.sort)! : "policy-asc",
  };
  const createModal = normalizeParam(currentParams.leaveAssignmentModal) === "create";
  const editLeaveAssignmentId = normalizeParam(currentParams.editLeaveAssignment);
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 50);
  const page = numberParam(currentParams.page, 1);
  const include = ["employees", "leave_policies", "leave_types", "legal_entities", "branches", "departments", "grades", "employment_types"];
  const [result, optionsResult] = await Promise.all([
    getHrAdminLeavePolicyAssignments({ q: filters.q, status: filters.status, scope: filters.scope, risk: filters.risk, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include }),
  ]);
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  if (page > totalPages) redirect(buildHref(currentParams, {page: String(totalPages)}));

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave assignment mode" : "Demo leave assignment mode"}
        title="Leave assignments"
        description="Map leave policies to the actual slices of the organization they should govern, with clear priority behavior when multiple rules could apply."
        actions={
          <>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/policy-assignments">
              Back to policy assignments
            </a>
          </>
        }
      />

      <LeavePolicyAssignmentsWorkspace initialData={result.data} initialQuery={{ ...filters, page, page_size: pageSize }} options={optionsResult.data} canManagePolicies={canManagePolicies} initialModal={canManagePolicies && editLeaveAssignmentId ? { mode: "edit", id: editLeaveAssignmentId } : canManagePolicies && createModal ? { mode: "create", id: "" } : { mode: "", id: "" }} />
    </main>
  );
}
