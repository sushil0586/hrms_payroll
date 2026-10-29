
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicies, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { LeavePoliciesWorkspace } from "./leave-policies-workspace";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLeavePoliciesPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["leave.view", "leave.policies.manage"], fallbackPath: "/hr-admin" });
  const canManagePolicies = sessionHasPermission(sessionUser, "leave.policies.manage");
  const currentParams = (await searchParams) ?? {};
  const createModal = normalizeParam(currentParams.leavePolicyModal) === "create";
  const editLeavePolicyId = normalizeParam(currentParams.editLeavePolicy);
  const [result, optionsResult] = await Promise.all([
    getHrAdminLeavePolicies(),
    getHrAdminPolicyOptions(),
  ]);
  const activeCount = result.data.filter((item) => item.status === "active").length;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave policies"
        description="Define the entitlement, accrual, notice, and eligibility behavior that the system should actually apply beyond simple leave labels."
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
        title="Leave policy configuration"
        description="Configure entitlement, accrual, eligibility, evidence, and approval behavior before assigning policies to employee scopes."
        primaryMetricLabel="policies"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />
      </details>

      <LeavePoliciesWorkspace initialData={{ items: result.data, options: optionsResult.data, state: result.state === "live" ? "live" : "demo" }} canManagePolicies={canManagePolicies} initialModal={canManagePolicies && editLeavePolicyId ? { mode: "edit", id: editLeavePolicyId } : canManagePolicies && createModal ? { mode: "create", id: "" } : { mode: "", id: "" }} />
    </main>
  );
}
