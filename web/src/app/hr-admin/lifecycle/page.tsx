import {LifecycleQueueFocus} from "./lifecycle-queue-focus";

import { LifecycleQueue } from "@/app/hr-admin/lifecycle/lifecycle-queue";
import { ActionMenu } from "@/components/patterns/action-menu";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "./lifecycle-unavailable";
import { getHrAdminOnboarding, getHrAdminWorkflowTemplates, getHrAdminExits, getHrAdminLifecycleOptions, getHrAdminLifecycleQueue, getHrAdminMovements, getHrAdminOnboardings, getHrAdminProbationReview, getHrAdminProbationReviews } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminLifecyclePage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const requestedPage=Number(normalizeParam(currentParams.page)??"1");
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const requestedSize=Number(normalizeParam(currentParams.page_size)??"25");
  const pageSize=[10,25,50,100].includes(requestedSize)?requestedSize:25;
  const q = normalizeParam(currentParams.q) ?? "";
  const itemType = normalizeParam(currentParams.item_type) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const employeeId = normalizeParam(currentParams.employee_id) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";
  const primaryDateFrom = normalizeParam(currentParams.primary_date_from) ?? "";
  const primaryDateTo = normalizeParam(currentParams.primary_date_to) ?? "";
  const editRecord = normalizeParam(currentParams.editRecord) ?? "";
  const [editRecordType, editRecordId] = editRecord.split(":");

  const [queueResult, optionsResult, onboardingsResult, probationResult, movementsResult, exitsResult] = await Promise.all([
    getHrAdminLifecycleQueue({
      page,
      page_size: pageSize,
      q,
      item_type: itemType || undefined,
      status: status || undefined,
      employee_id: employeeId || undefined,
      owner: owner || undefined,
      primary_date_from: primaryDateFrom || undefined,
      primary_date_to: primaryDateTo || undefined,
    }).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
    getHrAdminOnboardings({ page: 1, page_size: 1 }).catch(()=>null),
    getHrAdminProbationReviews({ page: 1, page_size: 1, decision: "pending" }).catch(()=>null),
    getHrAdminMovements({ page: 1, page_size: 1 }).catch(()=>null),
    getHrAdminExits({ page: 1, page_size: 1 }).catch(()=>null),
  ]);
  const recordKey=normalizeParam(currentParams.record)??"";
  const [recordResult,editRecordResult,editProbationResult,editOnboardingResult,templatesResult]=await Promise.all([
    recordKey?getHrAdminLifecycleQueue({record:recordKey,page:1,page_size:1}).catch(()=>null):null,
    editRecord?getHrAdminLifecycleQueue({record:editRecord,page:1,page_size:1}).catch(()=>null):null,
    editRecordType==="probation"&&editRecordId?getHrAdminProbationReview(editRecordId).catch(()=>null):null,
    editRecordType==="onboarding"&&editRecordId?getHrAdminOnboarding(editRecordId).catch(()=>null):null,
    editRecordType==="onboarding"?getHrAdminWorkflowTemplates().catch(()=>null):null,
  ]);

  const state =
    queueResult?.state === "live" &&
    optionsResult?.state === "live" &&
    onboardingsResult?.state === "live" &&
    probationResult?.state === "live" &&
    movementsResult?.state === "live" &&
    exitsResult?.state === "live"
      ? "live"
      : "demo";

  if(!queueResult||!optionsResult||!onboardingsResult||!probationResult||!movementsResult||!exitsResult||state!=="live")return <LifecycleUnavailable/>;
  const statusOptionsByType = {
    onboarding: optionsResult.data.onboarding_statuses,
    probation: optionsResult.data.probation_decisions,
    movement: optionsResult.data.lifecycle_event_statuses,
    exit: optionsResult.data.exit_statuses,
  };
  const documentBlockedCount = queueResult.data.items.filter((item) => item.document_attention_state === "blocked").length;
  const documentUpcomingCount = queueResult.data.items.filter((item) => item.document_attention_state === "warning" || item.document_attention_state === "upcoming").length;

  if(state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <LifecycleQueueFocus/>
      <WorkspaceStandardHeader
        title="Lifecycle"
        description="Joiners, movers, reviews, and exits in one queue."
        actions={
          <>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin">
              Admin
            </a>
            <ActionMenu
              label="Queues"
              items={[
                { href: "/hr-admin/onboardings", title: "Onboardings", description: "Track joiner setup and completion." },
                { href: "/hr-admin/probation-reviews", title: "Probation reviews", description: "Handle pending decisions and extensions." },
                { href: "/hr-admin/movements", title: "Movements", description: "Review manager and org changes." },
                { href: "/hr-admin/exits", title: "Exits", description: "Inspect separation workflow and closure." },
              ]}
            />
          </>
        }
      />
      <LifecycleQueue
        items={queueResult.data.items}
        state={state}
        employees={optionsResult.data.employees}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{
          q,
          item_type: itemType,
          status,
          employee_id: employeeId,
          owner,
          primary_date_from: primaryDateFrom,
          primary_date_to: primaryDateTo,
          page,
          page_size: pageSize,
        }}
        pagination={{
          total_count: queueResult.data.total_count,
          page: queueResult.data.page,
          page_size: queueResult.data.page_size,
          has_next: queueResult.data.has_next,
          has_previous: queueResult.data.has_previous,
        }}
        statusOptionsByType={statusOptionsByType}
        lifecycleOptions={optionsResult.data}
        editProbationReview={editProbationResult?.state==="live"&&editProbationResult.data.id===editRecordId?editProbationResult.data:null}
        editOnboarding={editOnboardingResult?.state==="live"&&editOnboardingResult.data.id===editRecordId&&templatesResult?.state==="live"?editOnboardingResult.data:null}
        workflowTemplates={templatesResult?.state==="live"?templatesResult.data:[]}
        recordItem={recordResult?.state==="live"?recordResult.data.items.find(item=>`${item.item_type}:${item.id}`===recordKey)??null:null}
        editRecordItem={editRecordResult?.state==="live"?editRecordResult.data.items.find(item=>`${item.item_type}:${item.id}`===editRecord)??null:null}
        summary={{
          documentBlockedCount,
          documentUpcomingCount,
          onboardingCount: onboardingsResult.data.total_count,
          pendingProbationCount: probationResult.data.total_count,
        }}
      />
    </main>
  );
}
