import Link from "next/link";

import { createEmptyMovementValue, movementToFormValue } from "@/app/hr-admin/movements/form-values";
import { MovementForm } from "@/app/hr-admin/movements/movement-form";
import { MovementQueue } from "@/app/hr-admin/movements/movement-queue";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminMovements } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminMovementsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
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
    }),
    getHrAdminLifecycleOptions(),
  ]);
  const modalCloseHref = `/hr-admin/movements${buildQueryString({ q, status, movement_type: movementType, owner, page, page_size: pageSize })}`;
  const editItem = editMovement ? result.data.items.find((item) => item.id === editMovement) : undefined;
  const isCreateModalOpen = movementModal === "create";

  return (
    <main className="shell hr-lifecycle-workbench">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Movement operations"
        description="Track transfers, promotions, reporting changes, and owner follow-up."
        actions={
          <>
            <Link className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}movementModal=create`}>Create movement</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        pills={[
          "Bulk owner and status actions",
          "Movement-type filtering",
          "Shareable queue state",
        ]}
      />
      <section className="attendance-summary-strip" aria-label="Movement summary">
        <span><strong>{result.data.total_count}</strong> records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{optionsResult.data.movement_types.length}</strong> movement types</span>
        <span><strong>{optionsResult.data.lifecycle_event_statuses.length}</strong> lifecycle states</span>
      </section>
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
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="movement-create-title" title="Create movement" eyebrow="Lifecycle record">
          <MovementForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyMovementValue(optionsResult.data.movement_types[0]?.value ?? "transfer", optionsResult.data.lifecycle_event_statuses[0]?.value ?? "draft")}
            mode="create"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}
      {editItem ? (
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="movement-edit-title" title={`Edit movement: ${editItem.employee_name}`} eyebrow="Lifecycle record">
          <MovementForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={movementToFormValue(editItem)}
            itemId={editItem.id}
            mode="edit"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
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
