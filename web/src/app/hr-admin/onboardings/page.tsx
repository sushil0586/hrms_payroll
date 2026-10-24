import {LifecycleQueueFocus} from "@/app/hr-admin/lifecycle/lifecycle-queue-focus";


import { createEmptyOnboardingValue, onboardingToFormValue } from "@/app/hr-admin/onboardings/form-values";
import { OnboardingForm } from "@/app/hr-admin/onboardings/onboarding-form";
import { OnboardingQueue } from "@/app/hr-admin/onboardings/onboarding-queue";
import { LifecycleEditorDialog } from "@/app/hr-admin/lifecycle/lifecycle-form-state";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminOnboarding, getHrAdminLifecycleOptions, getHrAdminOnboardings, getHrAdminWorkflowTemplates } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminOnboardingsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const recordLoaded=normalizeParam(currentParams.recordLoaded)??"";
  const receipt=recordLoaded?await getHrAdminOnboarding(recordLoaded).catch(()=>null):null;
  const requestedPage=Number(normalizeParam(currentParams.page)??"1");
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const requestedSize=Number(normalizeParam(currentParams.page_size)??"25");
  const pageSize=[10,25,50,100].includes(requestedSize)?requestedSize:25;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";
  const onboardingModal = normalizeParam(currentParams.onboardingModal) ?? "";
  const editOnboarding = normalizeParam(currentParams.editOnboarding) ?? "";

  const [result, optionsResult, templatesResult] = await Promise.all([
    getHrAdminOnboardings({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      owner: owner || undefined,
    }).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
    getHrAdminWorkflowTemplates().catch(()=>null),
  ]);
  if(result?.state!=="live" || optionsResult?.state!=="live" || templatesResult?.state!=="live")return <LifecycleUnavailable/>;
  const documentBlockedCount = result.data.items.filter((item) => item.missing_required_document_count > 0).length;
  const futureDueDocumentCount = result.data.items.reduce((total, item) => total + item.future_due_document_count, 0);
  const modalCloseHref = `/hr-admin/onboardings${buildQueryString({ q, status, owner, page, page_size: pageSize })}`;
  const selectedResult = editOnboarding ? await getHrAdminOnboarding(editOnboarding).catch(()=>null) : null;
  const editItem = selectedResult?.state === "live" && selectedResult.data.id === editOnboarding ? selectedResult.data : undefined;
  const isCreateModalOpen = onboardingModal === "create";

  if(result?.state!=="live" || optionsResult?.state!=="live" || templatesResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <LifecycleQueueFocus/>
      <WorkspaceStandardHeader
        title="Onboarding operations"
        description="Track joiners, checklist completion, documents, and owner load."
        actions={
          <>
            <a data-lifecycle-trigger="create-onboarding" data-navigation-mode="document" className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}onboardingModal=create`}>Create onboarding</a>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</a>
          </>
        }
      />
      <section className="attendance-summary-strip" aria-label="Onboarding summary">
        <span><strong>{result.data.total_count}</strong> matching records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{documentBlockedCount}</strong> on-page doc blockers</span>
        <span><strong>{futureDueDocumentCount}</strong> on-page future due docs</span>
      </section>
      {recordLoaded?<div className="notice" role="status">{receipt?.state==="live"&&receipt.data.id===recordLoaded?<>Current record loaded: {receipt.data.employee_name}. Review its current state in the record editor.</>:<>Requested record could not be confirmed. Reload the queue before relying on this result.</>}</div>:null}
      <OnboardingQueue
        items={result.data.items}
        state={result.state}
        onboardingStatusOptions={optionsResult.data.onboarding_statuses}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, status, owner, page, page_size: pageSize }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
      {isCreateModalOpen ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="onboarding-create-title" title="Create onboarding">
          <OnboardingForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyOnboardingValue(optionsResult.data.onboarding_statuses[0]?.value ?? "not_started")}
            lifecycleTemplates={templatesResult.data}
            mode="create"
            options={optionsResult.data}
          />
        </LifecycleEditorDialog>
      ) : null}
      {editOnboarding && !editItem ? <div className="notice" role="status">Selected record unavailable. No other record has been opened. <a data-navigation-mode="document" href={modalCloseHref}>Return to queue</a></div> : null}
      {editItem ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="onboarding-edit-title" title={`Edit onboarding: ${editItem.employee_name}`}>
          <OnboardingForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={onboardingToFormValue(editItem)}
            item={editItem}
            itemId={editItem.id}
            lifecycleTemplates={templatesResult.data}
            mode="edit"
            options={optionsResult.data}
          />
        </LifecycleEditorDialog>
      ) : null}
    </main>
  );
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}
