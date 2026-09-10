import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReviewSetup } from "@/lib/api";
import { PayrollCloseActionsPanel } from "../payroll-close-actions-panel";
import { PayrollReviewExceptionActions } from "./payroll-review-exception-actions";
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

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
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

function ReviewRail({
  reviews,
  runs,
  selectedReview,
}: {
  reviews: HrAdminPayrollRunReview[];
  runs: HrAdminPayrollRun[];
  selectedReview: HrAdminPayrollRunReview | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-review-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Review queue</span>
        <h2>Review queue</h2>
      </div>
      <div className="payroll-setup-card-list">
        {reviews.map((review) => {
          const run = runs.find((item) => item.id === review.payroll_run_id);
          return (
            <Link
              className={`payroll-setup-mini-card payroll-review-card ${selectedReview?.id === review.id ? "is-selected" : ""}`}
              href={`/hr-admin/payroll-review?reviewId=${review.id}`}
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
            </Link>
          );
        })}
      </div>
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

function ApprovalTimeline({ approvals }: { approvals: HrAdminPayrollRunApproval[] }) {
  return (
    <section className="payroll-setup-assignment-panel payroll-review-approval-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Approval trail</span>
          <h2>Approval trail</h2>
        </div>
        <span className="payroll-setup-count">{approvals.length} decisions</span>
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
  const currentParams = (await searchParams) ?? {};
  const selectedReviewId = normalizeParam(currentParams.reviewId);
  const selectedExceptionId = normalizeParam(currentParams.exceptionId);
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
  const selectedException = visibleExceptions.find((item) => item.id === selectedExceptionId) ?? visibleExceptions[0] ?? null;
  const visibleApprovals = selectedReview ? setup.approvals.filter((item) => item.review_id === selectedReview.id) : setup.approvals;
  const visibleLines: HrAdminPayrollCalculationLine[] = selectedReview
    ? setup.lines.filter((item) => item.calculation_id === selectedReview.calculation_id)
    : setup.lines;
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
          <ReviewRail reviews={setup.reviews} runs={setup.runs} selectedReview={selectedReview} />

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
                  disabled: !selectedReview,
                  disabledReason: "Select a payroll review first.",
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
                  disabled: !selectedReview,
                  disabledReason: "Select a payroll review first.",
                },
                {
                  id: "lock-review",
                  label: "Final lock",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/lock` : "",
                  disabled: !selectedReview,
                  disabledReason: "Select a payroll review first.",
                },
                {
                  id: "generate-outputs",
                  label: "Generate outputs",
                  endpoint: selectedReview ? `/api/hr-admin/payroll-reviews/${selectedReview.id}/generate-outputs` : "",
                  profileField: "output_profile_ref",
                  profileLabel: "Output profile ref",
                  defaultProfileRef: "tenant.payroll.outputs.v1",
                  disabled: !selectedReview,
                  disabledReason: "Select a payroll review first.",
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
                    {visibleExceptions.map((item) => (
                      <tr className={selectedException?.id === item.id ? "is-selected" : ""} key={item.id}>
                        <td>
                          <Link href={`/hr-admin/payroll-review?reviewId=${item.review_id}&exceptionId=${item.id}`}>
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
            </div>

            <PayrollReviewExceptionActions
              reviewId={selectedReview?.id ?? null}
              selectedException={selectedException}
              lines={visibleLines}
              severityOptions={setup.options.exception_severities}
            />

            <ApprovalTimeline approvals={visibleApprovals} />

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
                    {visibleLines.slice(0, 8).map((line) => (
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
            </div>
          </div>

          <ExceptionDetail item={selectedException} />
        </div>
      </section>
    </main>
  );
}
