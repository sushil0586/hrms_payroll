
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLeaveType, getHrAdminLeaveTypes, getHrAdminPolicyOptions } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TimeLeaveOperationsStrip } from "../time-leave-operations-strip";
import { createEmptyLeaveTypeValue, leaveTypeToFormValue } from "./form-values";
import { LeaveTypeForm } from "./leave-type-form";
import { LeaveTypesWorkbench } from "./leave-types-workbench";

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
  const shouldLoadModal = canManagePolicies && (createModal || Boolean(editLeaveTypeId));
  const [result, optionsResult, editResult] = await Promise.all([
    getHrAdminLeaveTypes(),
    shouldLoadModal ? getHrAdminPolicyOptions() : Promise.resolve(null),
    canManagePolicies && editLeaveTypeId ? getHrAdminLeaveType(editLeaveTypeId) : Promise.resolve(null),
  ]);
  const activeCount = result.data.filter((item) => item.is_active).length;
  const modalTitle = createModal ? "Create leave type" : editResult?.data ? "Edit leave type" : "";
  const context = new URLSearchParams();
  for (const [key,value] of Object.entries(currentParams)) { const normalized=normalizeParam(value); if(normalized && key!=="leaveTypeModal" && key!=="editLeaveType") context.set(key,normalized); }
  const closeHref = `/hr-admin/leave-types${context.size ? `?${context}` : ""}`;
  const createHref = `${closeHref}${context.size ? "&" : "?"}leaveTypeModal=create`;

  return (
    <main className="shell shell--time-leave hr-admin-compact-ui accerio-page">
      <PageIntro
        appearance="accerio"
        eyebrow={result.state === "live" ? "Live leave policy mode" : "Demo leave policy mode"}
        title="Leave types"
        description="Manage the leave categories employees and managers work with before layering policy assignments, accrual rules, and approval logic on top."
        actions={
          <>
            {canManagePolicies ? (
              <a data-navigation-mode="document" className="button button--primary" href={createHref}>
                Create leave type
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
        title="Leave type configuration"
        description="Maintain foundational leave categories before policy rules, assignments, accrual, and approval behavior are applied."
        primaryMetricLabel="leave types"
        primaryMetricValue={result.data.length}
        secondaryMetricLabel="active"
        secondaryMetricValue={activeCount}
      />
      </details>

      <LeaveTypesWorkbench canManagePolicies={canManagePolicies} leaveTypes={result.data} />

      {shouldLoadModal && optionsResult && (createModal || editResult?.data) ? (
        <HrAdminActionModal
          documentNavigation
          closeHref={closeHref}
          description="Required fields are marked with an asterisk. Existing validation, governance locks, and save APIs are unchanged."
          eyebrow="Leave setup"
          labelledBy="leave-type-modal-title"
          title={modalTitle}
        >
          {createModal ? (
            <LeaveTypeForm
              initialValue={createEmptyLeaveTypeValue(optionsResult.data.leave_categories[0]?.value || "paid", optionsResult.data.leave_units[0]?.value || "day")}
              mode="create"
              options={optionsResult.data}
              returnPath={closeHref}
            />
          ) : editResult?.data ? (
            <LeaveTypeForm
              initialValue={leaveTypeToFormValue(editResult.data)}
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
