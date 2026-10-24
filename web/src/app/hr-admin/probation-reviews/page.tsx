import {LifecycleQueueFocus} from "@/app/hr-admin/lifecycle/lifecycle-queue-focus";


import { createEmptyProbationReviewValue, probationReviewToFormValue } from "@/app/hr-admin/probation-reviews/form-values";
import { ProbationReviewForm } from "@/app/hr-admin/probation-reviews/probation-review-form";
import { ProbationReviewQueue } from "@/app/hr-admin/probation-reviews/probation-review-queue";
import { LifecycleEditorDialog } from "@/app/hr-admin/lifecycle/lifecycle-form-state";
import { WorkspaceStandardHeader } from "@/components/patterns/workspace-standard";
import { LifecycleUnavailable } from "@/app/hr-admin/lifecycle/lifecycle-unavailable";
import { getHrAdminProbationReview, getHrAdminLifecycleOptions, getHrAdminProbationReviews } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HrAdminProbationReviewsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const recordLoaded=normalizeParam(currentParams.recordLoaded)??"";
  const receipt=recordLoaded?await getHrAdminProbationReview(recordLoaded).catch(()=>null):null;
  const requestedPage=Number(normalizeParam(currentParams.page)??"1");
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const requestedSize=Number(normalizeParam(currentParams.page_size)??"25");
  const pageSize=[10,25,50,100].includes(requestedSize)?requestedSize:25;
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
    }).catch(()=>null),
    getHrAdminLifecycleOptions().catch(()=>null),
  ]);
  if(result?.state!=="live" || optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  const modalCloseHref = `/hr-admin/probation-reviews${buildQueryString({ q, decision, owner, page, page_size: pageSize })}`;
  const selectedResult = editReview ? await getHrAdminProbationReview(editReview).catch(()=>null) : null;
  const editItem = selectedResult?.state === "live" && selectedResult.data.id === editReview ? selectedResult.data : undefined;
  const isCreateModalOpen = reviewModal === "create";

  if(result?.state!=="live" || optionsResult?.state!=="live")return <LifecycleUnavailable/>;
  return (
    <main className="shell hr-lifecycle-workbench accerio-page lifecycle-phase3">
      <LifecycleQueueFocus/>
      <WorkspaceStandardHeader
        title="Probation reviews"
        description="Review confirmation decisions, extensions, owners, and blockers."
        actions={
          <>
            <a data-lifecycle-trigger="create-probation" data-navigation-mode="document" className="button button--primary" href={`${modalCloseHref}${modalCloseHref.includes("?") ? "&" : "?"}reviewModal=create`}>Create probation review</a>
            <a data-navigation-mode="document" className="button button--secondary" href="/hr-admin/lifecycle">Back to lifecycle</a>
          </>
        }
      />
      <section className="attendance-summary-strip" aria-label="Probation review summary">
        <span><strong>{result.data.total_count}</strong> matching records</span>
        <span><strong>{result.data.items.length}</strong> on page</span>
        <span><strong>{optionsResult.data.probation_decisions.length}</strong> decisions</span>
        <span><strong>{optionsResult.data.lifecycle_owners.length}</strong> owners</span>
      </section>
      {recordLoaded?<div className="notice" role="status">{receipt?.state==="live"&&receipt.data.id===recordLoaded?<>Current record loaded: {receipt.data.employee_name}. Review its current state in the record editor.</>:<>Requested record could not be confirmed. Reload the queue before relying on this result.</>}</div>:null}
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
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="probation-create-title" title="Create probation review">
          <ProbationReviewForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={createEmptyProbationReviewValue(optionsResult.data.probation_decisions[0]?.value ?? "pending")}
            mode="create"
            options={optionsResult.data}
          />
        </LifecycleEditorDialog>
      ) : null}
      {editReview && !editItem ? <div className="notice" role="status">Selected record unavailable. No other record has been opened. <a data-navigation-mode="document" href={modalCloseHref}>Return to queue</a></div> : null}
      {editItem ? (
        <LifecycleEditorDialog closeHref={modalCloseHref} labelledBy="probation-edit-title" title={`Edit probation review: ${editItem.employee_name}`}>
          <ProbationReviewForm
            compact
            cancelHref={modalCloseHref}
            successHref={modalCloseHref}
            initialValue={probationReviewToFormValue(editItem)}
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
