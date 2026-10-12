import Link from "next/link";

import { createEmptyProbationReviewValue, probationReviewToFormValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { ProbationReviewQueue } from "@/app/hr-admin/probation-reviews/probation-review-queue";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminLifecycleOptions, getHrAdminProbationReviews } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminProbationReviewsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const page = Math.max(Number(normalizeParam(currentParams.page) || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) || "25") || 25, 1), 100);
  const q = normalizeParam(currentParams.q) ?? "";
  const decision = normalizeParam(currentParams.decision) ?? "";
  const owner = normalizeParam(currentParams.owner) ?? "";
  const reviewModal = normalizeParam(currentParams.reviewModal) ?? "";
  const editReview = normalizeParam(currentParams.editReview) ?? "";

  const [result, optionsResult] = await Promise.all([
    getHrAdminProbationReviews({
      page,
      page_size: pageSize,
      q,
      decision: decision || undefined,
      owner: owner || undefined,
    }),
    getHrAdminLifecycleOptions(),
  ]);
  const modalCloseHref = `/hr-admin/probation-reviews${buildQueryString({ q, decision, owner, page, page_size: pageSize })}`;
  const editItem = editReview ? result.data.items.find((item) => item.id === editReview) : undefined;
  const isCreateModalOpen = reviewModal === "create";

  return (
    <main className="shell hr-lifecycle-workbench">
      <PageIntro
        eyebrow={result.state === "live" && optionsResult.state === "live" ? "Live lifecycle mode" : "Demo lifecycle mode"}
        title="Probation reviews"
        description="Review confirmation decisions, extensions, owners, and blockers."
        actions={
          <>
            <Link className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}reviewModal=create`}>Create probation review</Link>
            <Link className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</Link>
          </>
        }
        pills={[
          "Extension pre-checks in queue",
          "Bulk owner and decision actions",
          "Shareable filter state",
        ]}
      />
      <section className="attendance-summary-strip" aria-label="Probation review summary">
        <span><strong>{result.data.total_count}</strong> records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{optionsResult.data.probation_decisions.length}</strong> decisions</span>
        <span><strong>{optionsResult.data.lifecycle_owners.length}</strong> owners</span>
      </section>
      <ProbationReviewQueue
        items={result.data.items}
        state={result.state}
        probationDecisionOptions={optionsResult.data.probation_decisions}
        lifecycleOwners={optionsResult.data.lifecycle_owners}
        currentFilters={{ q, decision, owner, page, page_size: pageSize }}
        pagination={{
          total_count: result.data.total_count,
          page: result.data.page,
          page_size: result.data.page_size,
          has_next: result.data.has_next,
          has_previous: result.data.has_previous,
        }}
      />
      {isCreateModalOpen ? (
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="probation-create-title" title="Create probation review" eyebrow="Lifecycle record">
          <ProbationReviewForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyProbationReviewValue(optionsResult.data.probation_decisions[0]?.value ?? "pending")}
            mode="create"
            options={optionsResult.data}
          />
        </HrAdminActionModal>
      ) : null}
      {editItem ? (
        <HrAdminActionModal closeHref={modalCloseHref} labelledBy="probation-edit-title" title={`Edit probation review: ${editItem.employee_name}`} eyebrow="Lifecycle record">
          <ProbationReviewForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={probationReviewToFormValue(editItem)}
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
