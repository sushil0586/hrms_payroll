import Link from "next/link";

import { EmployeeShiftAssignmentImportWorkbench } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-import-workbench";
import { EmployeeShiftAssignmentGovernancePanel } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignment-governance-panel";
import { EmployeeShiftAssignmentsWorkbench } from "@/app/hr-admin/employee-shift-assignments/employee-shift-assignments-workbench";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminEmployeeShiftAssignment, getHrAdminEmployeeShiftAssignments, getHrAdminPolicyWorkbenchOptions } from "@/lib/api";
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
  const pageSize = Math.min(numberParam(currentParams.page_size, 10), 100);
  const page = numberParam(currentParams.page, 1);
  const [result, optionsResult] = await Promise.all([
    getHrAdminEmployeeShiftAssignments({ q: filters.q, kind: filters.kind, primary: filters.primary, risk: filters.risk, page, page_size: pageSize }),
    getHrAdminPolicyWorkbenchOptions({ include: ["employees", "shifts"] }),
  ]);
  const pageItems = result.data.items;
  const editAssignmentId = normalizeParam(currentParams.editAssignment) ?? "";
  const editItem = canManagePolicies && editAssignmentId
    ? pageItems.find((item) => item.id === editAssignmentId) ?? (await getHrAdminEmployeeShiftAssignment(editAssignmentId)).data
    : null;
  const totalCount = result.data.total_count;
  const totalPages = result.data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(result.data.page, totalPages);
  const primaryCount = pageItems.filter((item) => item.is_primary).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live shift assignment mode" : "Demo shift assignment mode"}
        title="Shift assignments"
        description="Control fixed shifts, weekly rotations, and temporary overrides before attendance runtime depends on them."
        actions={
          <>
            {canManagePolicies ? (
              <Link className="button button--primary" href="/hr-admin/employee-shift-assignments?assignmentModal=create">
                Create shift assignment
              </Link>
            ) : null}
            <Link className="button button--secondary" href="/hr-admin/attendance-operations">
              Back to attendance operations
            </Link>
          </>
        }
      />

      <details className="workspace-context-disclosure"><summary>Attendance navigation and summary</summary><TimeLeaveOperationsStrip
        current="shifts"
        title="Employee shift assignment governance"
        description="Assign employees to fixed shifts, weekly rotations, or temporary overrides with effective windows and overlap review."
        primaryMetricLabel="assignments"
        primaryMetricValue={totalCount}
        secondaryMetricLabel="primary"
        secondaryMetricValue={primaryCount}
      /></details>

      <EmployeeShiftAssignmentsWorkbench
        canManagePolicies={canManagePolicies}
        currentParams={currentParams}
        editItem={editItem}
        items={pageItems}
        options={optionsResult.data}
        page={safePage}
        pageSize={pageSize}
        state={result.state}
        totalCount={totalCount}
        totalPages={totalPages}
      />

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
