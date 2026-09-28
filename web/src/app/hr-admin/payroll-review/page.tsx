import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReviewSetup } from "@/lib/api";
import { PayrollCloseActionsPanel } from "../payroll-close-actions-panel";
import { PayrollCycleJourney } from "../payroll-cycle-journey";
import { PayrollWorkflowGuide } from "../payroll-workflow-guide";
import { PayrollReviewExceptionActions } from "./payroll-review-exception-actions";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import type {
  HrAdminPayrollCalculationLine,
  HrAdminPayrollRun,
  HrAdminPayrollRunApproval,
  HrAdminPayrollRunException,
  HrAdminPayrollRunReview,
} from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};
type PageSize = 10 | 25 | 50;

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number.parseInt(normalizeParam(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: SearchParamValue): PageSize {
  const parsed = parsePositiveInteger(value, 10);
  return parsed === 25 || parsed === 50 ? parsed : 10;
}

function paginate<T>(items: T[], page: number, pageSize: PageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
  };
}

function reviewHref(currentParams: Record<string, SearchParamValue>, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return `/hr-admin/payroll-review${query ? `?${query}` : ""}`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Open";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function PaginationControls({
  ariaLabel,
  currentParams,
  page,
  pageParam,
  pageSize,
  pageSizeParam,
  totalPages,
}: {
  ariaLabel: string;
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageParam: string;
  pageSize: PageSize;
  pageSizeParam: string;
  totalPages: number;
}) {
  return (
    <nav aria-label={ariaLabel} className="payroll-setup-pagination">
      <span>{page} of {totalPages}</span>
      <div className="payroll-setup-pagination__sizes">
        {[10, 25, 50].map((size) => (
          <Link
            aria-current={pageSize === size ? "page" : undefined}
            className="button button--secondary button--compact"
            href={reviewHref(currentParams, { [pageSizeParam]: size, [pageParam]: 1 })}
            key={size}
          >
            {size}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__actions">
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={reviewHref(currentParams, { [pageParam]: 1 })}>First</Link>
        <Link aria-disabled={page === 1} className="button button--secondary button--compact" href={reviewHref(currentParams, { [pageParam]: Math.max(1, page - 1) })}>Previous</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={reviewHref(currentParams, { [pageParam]: Math.min(totalPages, page + 1) })}>Next</Link>
        <Link aria-disabled={page === totalPages} className="button button--secondary button--compact" href={reviewHref(currentParams, { [pageParam]: totalPages })}>Last</Link>
      </div>
    </nav>
  );
}

function ReviewRail({
  currentParams,
  page,
  pageSize,
  reviews,
  runs,
  selectedReview,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  reviews: HrAdminPayrollRunReview[];
  runs: HrAdminPayrollRun[];
  selectedReview: HrAdminPayrollRunReview | null;
}) {
  const pagedReviews = paginate(reviews, page, pageSize);

  return (
    <aside className="payroll-setup-rail payroll-review-rail">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Review queue</span>
          <h2>Review queue</h2>
        </div>
        <span className="payroll-setup-count">{reviews.length}</span>
      </div>
      <div className="payroll-setup-card-list">
        {pagedReviews.items.map((review) => {
          const run = runs.find((item) => item.id === review.payroll_run_id);
          return (
            <Link
              className={`payroll-setup-mini-card payroll-review-card ${selectedReview?.id === review.id ? "is-selected" : ""}`}
              href={reviewHref(currentParams, { reviewId: review.id, exceptionId: undefined, exceptionPage: 1, approvalPage: 1, linePage: 1 })}
              key={review.id}
            >
              <div>
                <strong>{review.payroll_run_name}</strong>
                <span>Attempt {review.calculation_attempt_number} / {run?.period_name ?? "Current period"}</span>
              </div>
              <StatusBadge status={review.status} />
              <div className="payroll-input-run-card__counts">
                <span>{review.exception_count} exceptions</span>
                <span>{review.approval_count} approvals</span>
              </div>
              <code>{review.review_profile_ref}</code>
              {selectedReview?.id === review.id ? <span className="payroll-rule-selected-marker">Selected review</span> : null}
            </Link>
          );
        })}
      </div>
      {reviews.length > pageSize ? (
        <PaginationControls
          ariaLabel="payroll review queue pagination"
          currentParams={currentParams}
          page={pagedReviews.page}
          pageParam="reviewPage"
          pageSize={pagedReviews.pageSize}
          pageSizeParam="reviewSize"
          totalPages={pagedReviews.totalPages}
        />
      ) : null}
    </aside>
  );
}

function ExceptionDetail({ item }: { item: HrAdminPayrollRunException | null }) {
  if (!item) {
    return (
      <aside className="payroll-setup-detail-panel payroll-review-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Exception detail</span>
          <h2>No exception selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Open a register item to inspect employee, source, decision, and configuration evidence.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-review-detail-panel" aria-label={`${item.title} exception detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Exception detail</span>
          <h2>{item.title}</h2>
          <p className="section-copy section-copy-soft">{item.employee_name ?? "Run level"} / {item.employee_code ?? "No employee"}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <span className="payroll-rule-selected-marker">Selected exception</span>

      <div className="payroll-review-exception-summary">
        <span className="workspace-card__eyebrow">Severity</span>
        <strong>{titleCase(item.severity)}</strong>
        <span>{titleCase(item.category)}</span>
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Review note</span>
        <p>{item.detail || "No exception detail captured."}</p>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Decision</span>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Reason</span><span className="detail-value">{item.decision_reason || "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Decided by</span><span className="detail-value">{item.decided_by_name ?? "Pending"}</span></div>
          <div className="detail-row"><span className="detail-label">Decided</span><span className="detail-value">{formatDate(item.decided_at)}</span></div>
          <div className="detail-row"><span className="detail-label">Component</span><span className="detail-value">{item.component_code ?? "Run level"}</span></div>
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Configuration evidence</span>
        <div className="payroll-rule-snapshot-list">
          {Object.entries(item.config_snapshot).slice(0, 6).map(([key, value]) => (
            <div className="detail-row" key={key}>
              <span className="detail-label">{titleCase(key)}</span>
              <span className="detail-value">{String(value ?? "None")}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ApprovalTimeline({ approvals, totalApprovalCount }: { approvals: HrAdminPayrollRunApproval[]; totalApprovalCount: number }) {
  return (
    <section className="payroll-setup-assignment-panel payroll-review-approval-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Approval trail</span>
          <h2>Approval trail</h2>
        </div>
        <span className="payroll-setup-count">{totalApprovalCount} decisions</span>
      </div>
      <div className="payroll-review-timeline">
        {approvals.map((approval) => (
          <article className="payroll-review-timeline-item" key={approval.id}>
            <div>
              <strong>{approval.approver_name ?? "System"}</strong>
              <span>{approval.comment || "No comment captured"}</span>
            </div>
            <StatusBadge status={approval.status} />
            <code>{approval.approval_profile_ref}</code>
            <time>{formatDate(approval.decided_at)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function HrAdminPayrollReviewPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({ permissionKeys: ["payroll.review"], fallbackPath: "/hr-admin" });
  const canReviewPayroll = sessionHasPermission(sessionUser, "payroll.review");
  const canApprovePayroll = sessionHasPermission(sessionUser, "payroll.approve");
  const canLockPayroll = sessionHasPermission(sessionUser, "payroll.lock");
  const canGenerateOutputs = sessionHasPermission(sessionUser, "payroll.publish");
  const currentParams = (await searchParams) ?? {};
  const selectedReviewId = normalizeParam(currentParams.reviewId);
  const selectedExceptionId = normalizeParam(currentParams.exceptionId);
  const reviewPage = parsePositiveInteger(currentParams.reviewPage, 1);
  const reviewSize = normalizePageSize(currentParams.reviewSize);
  const exceptionPage = parsePositiveInteger(currentParams.exceptionPage, 1);
  const exceptionSize = normalizePageSize(currentParams.exceptionSize);
  const approvalPage = parsePositiveInteger(currentParams.approvalPage, 1);
  const approvalSize = normalizePageSize(currentParams.approvalSize);
  const linePage = parsePositiveInteger(currentParams.linePage, 1);
  const lineSize = normalizePageSize(currentParams.lineSize);
  const result = await getHrAdminPayrollReviewSetup({
    review_id: selectedReviewId,
  });
  const setup = result.data;
  const selectedReview =
    setup.reviews.find((item) => item.id === selectedReviewId) ??
    setup.reviews.find((item) => item.status === "ready_for_approval") ??
    setup.reviews[0] ??
    null;
  const visibleExceptions = selectedReview ? setup.exceptions.filter((item) => item.review_id === selectedReview.id) : setup.exceptions;
  const pagedExceptions = paginate(visibleExceptions, exceptionPage, exceptionSize);
  const selectedException = visibleExceptions.find((item) => item.id === selectedExceptionId) ?? visibleExceptions[0] ?? null;
  const visibleApprovals = selectedReview ? setup.approvals.filter((item) => item.review_id === selectedReview.id) : setup.approvals;
  const pagedApprovals = paginate(visibleApprovals, approvalPage, approvalSize);
  const visibleLines: HrAdminPayrollCalculationLine[] = selectedReview
    ? setup.lines.filter((item) => item.calculation_id === selectedReview.calculation_id)
    : setup.lines;
  const pagedLines = paginate(visibleLines, linePage, lineSize);
  const selectedRun = selectedReview ? setup.runs.find((item) => item.id === selectedReview.payroll_run_id) ?? null : null;
  const totals = selectedReview?.totals_snapshot ?? {};
  const summary = selectedReview?.exception_summary_snapshot ?? {};

  return (
    <main className="shell shell--payroll-setup shell--payroll-review">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 3A" : "Demo payroll phase 3A"}
        title="Payroll Review"
        description="Review calculated payroll, resolve exceptions, capture approval decisions, and final-lock the run with immutable evidence."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-outputs">
              Outputs
            </Link>
          </>
        }
        pills={["Exception controlled", "Approval captured", "Final lock"]}
        showPills
      />

      <PayrollCycleJourney
        current="review"
        selectedRunName={selectedReview?.payroll_run_name}
        selectedRunStatus={selectedReview?.status}
        primaryMetricLabel="exceptions"
        primaryMetricValue={visibleExceptions.length}
        secondaryMetricLabel="approvals"
        secondaryMetricValue={visibleApprovals.length}
      />

      <PayrollWorkflowGuide
        title="Payroll review desk"
        description="Work the exception queue, capture decisions, then approve or final-lock the run with evidence."
        steps={[
          { label: "Select review", detail: "Scope one calculation attempt for approval." },
          { label: "Resolve exceptions", detail: "Inspect each issue and record the decision." },
          { label: "Approve and lock", detail: "Use guarded actions after evidence is clean." },
        ]}
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Reviews" value={setup.summary.review_count} trend={`${setup.summary.locked_review_count} locked`} />
          <MetricTile className="metric-tile-soft" label="Open reviews" value={setup.summary.open_review_count} trend={`${setup.summary.approved_review_count} approved`} />
          <MetricTile className="metric-tile-soft" label="Open blockers" value={setup.summary.open_blocker_count} trend={`${setup.summary.open_exception_count} open exceptions`} />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(setup.summary.latest_net_pay)} trend="Approved total" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace payroll-review-workspace">
          <ReviewRail currentParams={currentParams} page={reviewPage} pageSize={reviewSize} reviews={setup.reviews} runs={setup.runs} selectedReview={selectedReview} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Review state</span>
                <h2>{selectedReview?.payroll_run_name ?? "No review"}</h2>
              </div>
              {selectedReview ? <StatusBadge status={selectedReview.status} /> : null}
            </div>

            <div className="payroll-calc-total-grid payroll-review-total-grid">
              <article>
                <span>Gross earnings</span>
                <strong>{formatMoney(totals.gross_earnings)}</strong>
              </article>
              <article>
                <span>Deductions</span>
                <strong>{formatMoney(totals.employee_deductions)}</strong>
              </article>
              <article>
                <span>Net pay</span>
                <strong>{formatMoney(totals.net_pay)}</strong>
              </article>
              <article>
                <span>Exceptions</span>
                <strong>{String(summary.total ?? selectedReview?.exception_count ?? 0)}</strong>
              </article>
            </div>

            <div className="payroll-review-lock-strip">
              <div>
                <span className="workspace-card__eyebrow">Final lock</span>
                <strong>{selectedRun?.final_locked_at ? "Locked" : "Pending"}</strong>
                <span>{selectedRun?.final_locked_by_name ?? selectedReview?.locked_by_name ?? "No final lock owner"}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Calculation</span>
                <strong>Attempt {selectedReview?.calculation_attempt_number ?? 0}</strong>
                <Link href={`/hr-admin/payroll-calculations?runId=${selectedReview?.payroll_run_id ?? ""}&calculationId=${selectedReview?.calculation_id ?? ""}`}>Open trace</Link>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Review profile</span>
                <strong>{selectedReview?.review_profile_ref ?? "No profile"}</strong>
                <span>{formatDate(selectedReview?.locked_at ?? null)}</span>
              </div>
            </div>

            <PayrollCloseActionsPanel
              eyebrow="Payroll operations"
              title="Review controls"
              description="Submit, approve, final-lock, and generate outputs through authenticated tenant action endpoints."
              actions={[
                {
                  id: "submit-review",
                  label: "Submit review",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/submit` : "",
                  disabled: !canReviewPayroll || !selectedReview,
                  disabledReason: !canReviewPayroll ? "Requires payroll.review." : "Select a payroll review first.",
                },
                {
                  id: "approve-review",
                  label: "Approve review",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/approve` : "",
                  profileField: "approval_profile_ref",
                  profileLabel: "Approval profile ref",
                  defaultProfileRef: selectedReview?.review_profile_ref ?? "",
                  commentField: "comment",
                  commentLabel: "Approval comment",
                  disabled: !canApprovePayroll || !selectedReview,
                  disabledReason: !canApprovePayroll ? "Requires payroll.approve." : "Select a payroll review first.",
                },
                {
                  id: "lock-review",
                  label: "Final lock",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/lock` : "",
                  disabled: !canLockPayroll || !selectedReview,
                  disabledReason: !canLockPayroll ? "Requires payroll.lock." : "Select a payroll review first.",
                },
                {
                  id: "generate-outputs",
                  label: "Generate outputs",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/generate-outputs` : "",
                  profileField: "output_profile_ref",
                  profileLabel: "Output profile ref",
                  defaultProfileRef: "tenant.payroll.outputs.v1",
                  disabled: !canGenerateOutputs || !selectedReview,
                  disabledReason: !canGenerateOutputs ? "Requires payroll.publish." : "Select a payroll review first.",
                },
              ]}
            />

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Exception register</span>
                  <h2>Exception register</h2>
                </div>
                <span className="payroll-setup-count">{visibleExceptions.length} items</span>
              </div>
              <div className="payroll-table-scroll">
                <table className="payroll-readiness-table payroll-setup-table payroll-review-exception-table">
                  <thead>
                    <tr>
                      <th>Exception</th>
                      <th>Employee</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedExceptions.items.map((item) => (
                      <tr className={selectedException?.id === item.id ? "is-selected" : ""} key={item.id}>
                        <td>
                          <Link href={reviewHref(currentParams, { reviewId: item.review_id, exceptionId: item.id })}>
                            <strong>{item.title}</strong>
                            <span>{titleCase(item.category)}</span>
                          </Link>
                        </td>
                        <td>
                          <strong>{item.employee_name ?? "Run level"}</strong>
                          <span>{item.employee_code ?? item.component_code ?? "No employee"}</span>
                        </td>
                        <td><StatusBadge status={item.severity} /></td>
                        <td><StatusBadge status={item.status} /></td>
                        <td>{formatDate(item.decided_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleExceptions.length > exceptionSize ? (
                <PaginationControls
                  ariaLabel="payroll review exception pagination"
                  currentParams={currentParams}
                  page={pagedExceptions.page}
                  pageParam="exceptionPage"
                  pageSize={pagedExceptions.pageSize}
                  pageSizeParam="exceptionSize"
                  totalPages={pagedExceptions.totalPages}
                />
              ) : null}
            </div>

            <PayrollReviewExceptionActions
              reviewId={selectedReview?.id ?? null}
              selectedException={selectedException}
              lines={visibleLines}
              severityOptions={setup.options.exception_severities}
              canManageExceptions={canReviewPayroll}
            />

            <ApprovalTimeline approvals={pagedApprovals.items} totalApprovalCount={visibleApprovals.length} />
            {visibleApprovals.length > approvalSize ? (
              <PaginationControls
                ariaLabel="payroll review approval pagination"
                currentParams={currentParams}
                page={pagedApprovals.page}
                pageParam="approvalPage"
                pageSize={pagedApprovals.pageSize}
                pageSizeParam="approvalSize"
                totalPages={pagedApprovals.totalPages}
              />
            ) : null}

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Approved lines</span>
                  <h2>Approved calculation lines</h2>
                </div>
                <span className="payroll-setup-count">{visibleLines.length} lines</span>
              </div>
              <div className="payroll-table-scroll payroll-table-scroll--compact">
                <table className="payroll-readiness-table payroll-setup-table payroll-review-line-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Component</th>
                      <th>Amount</th>
                      <th>Rule</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLines.items.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.employee_name}</strong>
                          <span>{line.employee_code}</span>
                        </td>
                        <td>
                          <strong>{line.component_name}</strong>
                          <span>{line.component_code}</span>
                        </td>
                        <td>{formatMoney(line.amount, line.currency_code)}</td>
                        <td>{line.rule_code} v{line.rule_version}</td>
                        <td><code>{line.source_hash.slice(0, 12)}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleLines.length > lineSize ? (
                <PaginationControls
                  ariaLabel="payroll review line pagination"
                  currentParams={currentParams}
                  page={pagedLines.page}
                  pageParam="linePage"
                  pageSize={pagedLines.pageSize}
                  pageSizeParam="lineSize"
                  totalPages={pagedLines.totalPages}
                />
              ) : null}
            </div>
          </div>

          <ExceptionDetail item={selectedException} />
        </div>
      </section>
    </main>
  );
}
