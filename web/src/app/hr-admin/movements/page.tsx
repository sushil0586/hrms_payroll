import {LifecycleQueueFocus} from "@/app/hr-admin/lifecycle/lifecycle-queue-focus";

import { createEmptyMovementValue, movementToFormValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { MovementQueue } from "@/app/hr-admin/movements/movement-queue";
import { LifecycleEditorDialog } from "@/app/hr-admin/lifecycle/lifecycle-form-state";
import {LifecycleUnavailable} from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import {WorkspaceStandardHeader} from "@/components/patterns/workspace-standard";
import { getHrAdminMovement, getHrAdminLifecycleOptions, getHrAdminMovements } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminMovementsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const requestedPage=Number(normalizeParam(currentParams.page)??"1");
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const requestedSize=Number(normalizeParam(currentParams.page_size)??"25");
  const pageSize=[10,25,50,100].includes(requestedSize)?requestedSize:25;
  const recordLoaded=normalizeParam(currentParams.recordLoaded)??"";
  const receipt=recordLoaded?await getHrAdminMovement(recordLoaded).catch(()=>null):null;
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const movementType = normalizeParam(currentParams.movement_type) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";
  const movementModal = normalizeParam(currentParams.movementModal) ?? "";
  const editMovement = normalizeParam(currentParams.editMovement) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminMovements({
      page,
      page_size: pageSize,
      q,
      status: status || undefined,
      movement_type: movementType || undefined,
      owner: owner || undefined,
    }).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
  ]);
  if(result?.state!=="live"||optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  const modalCloseHref = `/hr-admin/movements${buildQueryString({ q, status, movement_type: movementType, owner, page, page_size: pageSize })}`;
  const selected=editMovement?await getHrAdminMovement(editMovement).catch(()=>null):null;
  const editItem=selected?.state==="live"&&selected.data.id===editMovement?selected.data:undefined;
  const isCreateModalOpen = movementModal === "create";

  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <LifecycleQueueFocus/>
      <WorkspaceStandardHeader
        title="Movements"
        description="Track transfers, promotions, reporting changes, and owner follow-up."
        actions={
          <>
            <a data-lifecycle-trigger="create-movement" data-navigation-mode="document" className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}movementModal=create`}>Create movement</a>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</a>
          </>
        }
      />
      <section className="attendance-summary-strip" aria-label="Movement summary">
        <span><strong>{result.data.total_count}</strong> matching records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{optionsResult.data.movement_types.length}</strong> movement types</span>
        <span><strong>{optionsResult.data.lifecycle_event_statuses.length}</strong> lifecycle states</span>
      </section>
      {recordLoaded?<div className="notice" role="status">{receipt?.state==="live"&&receipt.data.id===recordLoaded?<>Current record loaded: {receipt.data.employee_name}. Review its current state in the record editor.</>:<>Requested record could not be confirmed. Reload before relying on this result.</>}</div>:null}
      <MovementQueue
        items={result.data.items}
        state={result.state}
        lifecycleStatusOptions={optionsResult.data.lifecycle_event_statuses}
        movementTypeOptions={optionsResult.data.movement_types}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, status, movement_type: movementType, owner, page, page_size: pageSize }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
      {isCreateModalOpen ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="movement-create-title" title="Create movement">
          <MovementForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyMovementValue(optionsResult.data.movement_types[0]?.value ?? "transfer", optionsResult.data.lifecycle_event_statuses[0]?.value ?? "draft")}
            mode="create"
            options={optionsResult.data}
          />
        </LifecycleEditorDialog>
      ) : null}
      {editMovement&&!editItem?<div className="notice" role="status">Selected record unavailable. No other record has been opened. <a href={modalCloseHref}>Return to queue</a></div>:null}
      {editItem ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="movement-edit-title" title={`Edit movement: ${editItem.employee_name}`}>
          <MovementForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={movementToFormValue(editItem)}
            itemId={editItem.id}
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
