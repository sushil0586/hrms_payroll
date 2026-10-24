import {LifecycleQueueFocus} from "@/app/hr-admin/lifecycle/lifecycle-queue-focus";

import { createEmptyExitValue, exitToFormValue } from "@/app/hr-admin/exits/form-values";
import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { ExitQueue } from "@/app/hr-admin/exits/exit-queue";
import {LifecycleEditorDialog} from "@/app/hr-admin/lifecycle/lifecycle-form-state";
import {LifecycleUnavailable} from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import {WorkspaceStandardHeader} from "@/components/patterns/workspace-standard";
import { getHrAdminExit, getHrAdminExits, getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminExitsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const requestedPage=Number(normalizeParam(currentParams.page)??"1");
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const requestedSize=Number(normalizeParam(currentParams.page_size)??"25");
  const pageSize=[10,25,50,100].includes(requestedSize)?requestedSize:25;
  const recordLoaded=normalizeParam(currentParams.recordLoaded)??"";
  const receipt=recordLoaded?await getHrAdminExit(recordLoaded).catch(()=>null):null;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const rehireEligible = normalizeParam(currentParams.rehire_eligible) ?? "";
  const exitModal = normalizeParam(currentParams.exitModal) ?? "";
  const editExit = normalizeParam(currentParams.editExit) ?? "";

  const [result, optionsResult, templatesResult] = await Promise.all([
    getHrAdminExits({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      rehire_eligible: rehireEligible || undefined,
    }).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
    getHrAdminWorkflowTemplates().catch(()=>null),
  ]);
  if(result?.state!=="live"||optionsResult?.state!=="live"||templatesResult?.state!=="live")return <LifecycleUnavailable/>;
  const modalCloseHref = `/hr-admin/exits${buildQueryString({ q, status, rehire_eligible: rehireEligible, page, page_size: pageSize })}`;
  const selected=editExit?await getHrAdminExit(editExit).catch(()=>null):null;
  const editItem=selected?.state==="live"&&selected.data.id===editExit?selected.data:undefined;
  const isCreateModalOpen = exitModal === "create";

  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <LifecycleQueueFocus/>
      <WorkspaceStandardHeader
        actions={
          <>
            <a data-lifecycle-trigger="create-exit" data-navigation-mode="document" className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}exitModal=create`}>Create exit</a>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</a>
          </>
        }
        description="Manage resignations, notice periods, clearance, and final exit readiness."
        title="Exits"
      />
      <section className="attendance-summary-strip" aria-label="Exit summary">
        <span><strong>{result.data.total_count}</strong> matching records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{result.data.items.filter((item) => item.rehire_eligible).length}</strong> rehire eligible on page</span>
        <span><strong>{result.data.items.filter((item) => item.clearance_open_count > 0).length}</strong> with open clearance on page</span>
      </section>
      {recordLoaded?<div className="notice" role="status">{receipt?.state==="live"&&receipt.data.id===recordLoaded?<>Current record loaded: {receipt.data.employee_name}. Review its current state in the record editor.</>:<>Requested record could not be confirmed. Reload before relying on this result.</>}</div>:null}
      <ExitQueue
        items={result.data.items}
        exitStatusOptions={optionsResult.data.exit_statuses}
        currentFilters={{ q, status, rehire_eligible: rehireEligible, page, page_size: pageSize }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
      {isCreateModalOpen ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="exit-create-title" title="Create exit">
          <ExitForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyExitValue(optionsResult.data.exit_statuses[0]?.value ?? "draft")}
            lifecycleTemplates={templatesResult.data}
            mode="create"
            options={optionsResult.data}
          />
        </LifecycleEditorDialog>
      ) : null}
      {editExit&&!editItem?<div className="notice" role="status">Selected record unavailable. No other record has been opened. <a href={modalCloseHref}>Return to queue</a></div>:null}
      {editItem ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="exit-edit-title" title={`Edit exit: ${editItem.employee_name}`}>
          <ExitForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={exitToFormValue(editItem)}
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
