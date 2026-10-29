
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveTypes, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";
import { LeaveTypesWorkspace } from "./leave-types-workspace";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLeaveTypesPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view", "leave.policies.manage"], fallbackPath: "/hr-admin" });
  const canManagePolicies = sessionHasPermission(sessionUser, "leave.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const createModal = normalizeParam(currentParams.leaveTypeModal) === "create";
  const editLeaveTypeId = normalizeParam(currentParams.editLeaveType);
  const [result, optionsResult] = await Promise.all([
    getHrAdminLeaveTypes(),
    getHrAdminPolicyOptions(),
  ]);
  const activeCount = result.data.filter((item) => item.is_active).length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave types"
        description="Manage the leave categories employees and managers work with before layering policy assignments, accrual rules, and approval logic on top."
        actions={
          <>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/policies">
              Back to policies
            </a>
          </>
        }
      />

      <details className="workspace-context-disclosure"><summary>Leave navigation and summary</summary>
      <TimeLeaveOperationsStrip
        current="policies"
        title="Leave type configuration"
        description="Maintain foundational leave categories before policy rules, assignments, accrual, and approval behavior are applied."
        primaryMetricLabel="leave types"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />
      </details>

      <LeaveTypesWorkspace initialData={{ items: result.data, options: optionsResult.data, state: result.state === "live" ? "live" : "demo" }} canManagePolicies={canManagePolicies} initialModal={canManagePolicies && editLeaveTypeId ? { mode: "edit", id: editLeaveTypeId } : canManagePolicies && createModal ? { mode: "create", id: "" } : { mode: "", id: "" }} />
    </main>
  );
}
