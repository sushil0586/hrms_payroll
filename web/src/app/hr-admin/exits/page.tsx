import Link from "next/link";

import { createEmptyExitValue, exitToFormValue } from "@/app/hr-admin/exits/form-values";
import { ExitForm } from "@/app/hr-admin/exits/exit-form";
import { ExitQueue } from "@/app/hr-admin/exits/exit-queue";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminExits, getHrAdminLifecycleOptions, getHrAdminWorkflowTemplates } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminExitsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
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
    }),
    getHrAdminLifecycleOptions(),
    getHrAdminWorkflowTemplates(),
  ]);
  const modalCloseHref = `/hr-admin/exits${buildQueryString({ q, status, rehire_eligible: rehireEligible, page, page_size: pageSize })}`;
  const editItem = editExit ? result.data.items.find((item) => item.id === editExit) : undefined;
  const isCreateModalOpen = exitModal === "create";

  return (
    <main className="shell hr-lifecycle-workbench">
      <PageIntro
        actions={
          <>
            <Link className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}exitModal=create`}>Create exit</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        description="Manage resignations, notice periods, clearance, and final exit readiness."
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        pills={[
          `${result.data.total_count} exits`,
          `${result.data.items.filter((item) => item.status === "active").length} active on this page`,
        ]}
        title="Exit operations"
      />
      <section className="attendance-summary-strip" aria-label="Exit summary">
        <span><strong>{result.data.total_count}</strong> records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{result.data.items.filter((item) => item.rehire_eligible).length}</strong> rehire eligible</span>
        <span><strong>{result.data.items.filter((item) => item.clearance_open_count > 0).length}</strong> clearance open</span>
      </section>
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
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="exit-create-title" title="Create exit" eyebrow="Lifecycle record">
          <ExitForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyExitValue(optionsResult.data.exit_statuses[0]?.value ?? "draft")}
            lifecycleTemplates={templatesResult.data}
            mode="create"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}
      {editItem ? (
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="exit-edit-title" title={`Edit exit: ${editItem.employee_name}`} eyebrow="Lifecycle record">
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
