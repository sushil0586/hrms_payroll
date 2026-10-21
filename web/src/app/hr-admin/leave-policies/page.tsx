
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeavePolicies, getHrAdminLeavePolicy, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { createEmptyLeavePolicyValue, leavePolicyToFormValue } from "./form-values";
import { LeavePolicyForm } from "./leave-policy-form";
import { LeavePolicyList } from "./leave-policy-list";
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
  const shouldLoadModal = canManagePolicies && (createModal || Boolean(editLeavePolicyId));
  const [result, optionsResult, editResult] = await Promise.all([
    getHrAdminLeavePolicies(),
    shouldLoadModal ? getHrAdminPolicyOptions() : Promise.resolve(null),
    canManagePolicies && editLeavePolicyId ? getHrAdminLeavePolicy(editLeavePolicyId) : Promise.resolve(null),
  ]);
  const activeCount = result.data.filter((item) => item.status === "active").length;
  const context = new URLSearchParams();
  for (const [key,value] of Object.entries(currentParams)) { const normalized=normalizeParam(value); if(normalized && key!=="leavePolicyModal" && key!=="editLeavePolicy") context.set(key,normalized); }
  const closeHref = `/hr-admin/leave-policies${context.size ? `?${context}` : ""}`;
  const createHref = `${closeHref}${context.size ? "&" : "?"}leavePolicyModal=create`;
  const modalTitle = createModal ? "Create leave policy" : editResult?.data ? "Edit leave policy" : "";

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave policies"
        description="Define the entitlement, accrual, notice, and eligibility behavior that the system should actually apply beyond simple leave labels."
        actions={
          <>
            {canManagePolicies ? (
              <a data-navigation-mode="document" className="button button--primary" href={createHref}>
                Create leave policy
              </a>
            ) : null}
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

      <LeavePolicyList canManagePolicies={canManagePolicies} policies={result.data} />

      {shouldLoadModal && optionsResult && (createModal || editResult?.data) ? (
        <HrAdminActionModal
          documentNavigation
          closeHref={closeHref}
          description="Required fields are marked with an asterisk. Existing validation, preview logic, governance locks, and save APIs are unchanged."
          eyebrow="Leave setup"
          labelledBy="leave-policy-modal-title"
          title={modalTitle}
        >
          {createModal ? (
            <LeavePolicyForm
              initialValue={createEmptyLeavePolicyValue(optionsResult.data.leave_policy_statuses[0]?.value || "draft", optionsResult.data.accrual_frequencies[0]?.value || "none")}
              mode="create"
              options={optionsResult.data}
              returnPath={closeHref}
            />
          ) : editResult?.data ? (
            <LeavePolicyForm
              initialValue={leavePolicyToFormValue(editResult.data)}
              item={editResult.data}
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
