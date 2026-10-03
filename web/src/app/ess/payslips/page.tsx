import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PayslipDetailAction } from "@/app/ess/payslips/payslip-detail-action";
import { getEssPayrollPayslips } from "@/lib/api";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
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

export default async function EssPayslipsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const year = normalizeParam(currentParams.year) ?? "";
  const page = Number(normalizeParam(currentParams.page) ?? 1);
  const pageSize = Number(normalizeParam(currentParams.page_size) ?? 5);
  const selectedPayslipId = normalizeParam(currentParams.payslipId);
  const result = await getEssPayrollPayslips({
    q,
    year,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 5,
    selected_id: selectedPayslipId,
  });
  const data = result.data;
  const selectedPayslip = data.items.find((item) => item.id === selectedPayslipId) ?? data.items[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const sharedParams = { q, year, page_size: data.page_size, payslipId: selectedPayslip?.id };

  return (
    <main className="shell shell--workspace shell--ess-payslips">
      <PageIntro
        eyebrow={result.state === "live" ? "Live employee payroll" : "Demo employee payroll"}
        title="Payslips"
        description="View, download, and acknowledge the payslips released to your employee account."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/ess">
              Overview
            </Link>
            <Link className="button button--secondary" href="/ess/documents">
              Documents
            </Link>
            <Link className="button button--secondary" href="/ess/notifications">
              Inbox
            </Link>
          </>
        }
        pills={["Personal view", "Published only", "Audit protected"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Published payslips" value={data.summary.published_payslip_count} trend={`${data.total_count} visible`} />
          <MetricTile className="metric-tile-soft" label="Downloadable" value={data.summary.downloadable_payslip_count} trend="Released files" />
          <MetricTile className="metric-tile-soft" label="Latest net pay" value={formatMoney(data.summary.latest_net_pay)} trend={data.summary.latest_period_name || "No payroll yet"} />
          <MetricTile className="metric-tile-soft" label="Latest pay date" value={formatDate(data.summary.latest_pay_date)} trend="Employee portal" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="ess-payslip-action-band">
          <div>
            <span className="workspace-card__eyebrow">Latest payslip</span>
            <h2>{selectedPayslip ? selectedPayslip.period_name : "No payslip published"}</h2>
            <p className="section-copy section-copy-soft">
              {selectedPayslip
                ? `${formatMoney(selectedPayslip.totals_snapshot.net_pay)} net pay / paid ${formatDate(selectedPayslip.pay_date)}`
                : "Published payslips will appear here after payroll outputs are released."}
            </p>
          </div>
          {selectedPayslip ? (
            <div className="ess-payslip-action-band__actions">
              <PayslipDetailAction payslip={selectedPayslip} variant="primary" />
              {selectedPayslip.download_url ? (
                <a className="button button--secondary" href={`/api/me/payroll-payslips/${selectedPayslip.id}/download`}>
                  Download latest
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ess-payslip-workspace">
          <div className="ess-payslip-main">
            <div className="ess-payslip-panel-header ess-payslip-panel-header--split">
              <div>
                <span className="workspace-card__eyebrow">Employee register</span>
                <h2>Published payslips</h2>
              </div>
              <StatusBadge status={selectedPayslip ? "published" : "draft"} />
            </div>

            <form action="/ess/payslips" className="ess-payslip-filter-form">
              <input aria-label="Search payslips" className="input-control" defaultValue={q} name="q" placeholder="Search payslips" />
              <select aria-label="Year" className="input-control" defaultValue={year} name="year">
                <option value="">All years</option>
                {data.summary.available_years.map((availableYear) => (
                  <option key={availableYear} value={availableYear}>{availableYear}</option>
                ))}
              </select>
              <select aria-label="Rows per page" className="input-control" defaultValue={String(pageSize)} name="page_size">
                <option value="5">5 / page</option>
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
              <button className="button button--primary" type="submit">Apply</button>
            </form>

            <div className="ess-payslip-summary-strip">
              <div>
                <span className="workspace-card__eyebrow">Latest period</span>
                <strong>{data.summary.latest_period_name || "Pending"}</strong>
                <span>{formatDate(data.summary.latest_pay_date)}</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Scope</span>
                <strong>Own employee record</strong>
                <span>Published payslips only</span>
              </div>
              <div>
                <span className="workspace-card__eyebrow">Delivery</span>
                <strong>Employee portal</strong>
                <span>{selectedPayslip ? `${selectedPayslip.access_summary.notification_count} notification event(s)` : "Download via authenticated route"}</span>
              </div>
            </div>

            <div className="payroll-table-scroll">
              <table className="payroll-readiness-table ess-payslip-table">
                <thead>
                  <tr>
                    <th>Payslip</th>
                    <th>Pay date</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net pay</th>
                    <th>Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((payslip) => (
                    <tr className={selectedPayslip?.id === payslip.id ? "is-selected" : ""} key={payslip.id}>
                      <td>
                        <Link href={`/ess/payslips${buildQueryString({
                          q,
                          year,
                          page: data.page,
                          page_size: data.page_size,
                          payslipId: payslip.id,
                        })}`}>
                          <strong>{payslip.title}</strong>
                          <span>{payslip.period_name} / {payslip.payroll_run_name}</span>
                          <span>Source hash {payslip.source_hash.slice(0, 12)}</span>
                        </Link>
                      </td>
                      <td>{formatDate(payslip.pay_date)}</td>
                      <td>{formatMoney(payslip.totals_snapshot.gross_earnings)}</td>
                      <td>{formatMoney(payslip.totals_snapshot.employee_deductions)}</td>
                      <td>{formatMoney(payslip.totals_snapshot.net_pay)}</td>
                      <td>
                        <strong>{payslip.access_summary.is_read_acknowledged ? "Read" : "Unread"}</strong>
                        <span>{payslip.access_summary.download_count} downloads</span>
                        <span>{payslip.access_summary.notification_count} notifications</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <PayslipDetailAction payslip={payslip} />
                          {payslip.download_url ? (
                            <a className="button button--secondary" href={`/api/me/payroll-payslips/${payslip.id}/download`}>
                              Download
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.items.length === 0 ? (
              <div className="notice">
                <strong>No payslips found.</strong>
                <span className="muted">Try another year or search value.</span>
              </div>
            ) : null}

            {data.total_count > data.page_size ? (
              <PaginationBar
                firstHref={`/ess/payslips${buildQueryString({ ...sharedParams, page: 1 })}`}
                hasNext={Boolean(data.has_next)}
                hasPrevious={Boolean(data.has_previous)}
                lastHref={`/ess/payslips${buildQueryString({ ...sharedParams, page: totalPages })}`}
                nextHref={`/ess/payslips${buildQueryString({ ...sharedParams, page: data.page + 1 })}`}
                page={data.page}
                pageSize={data.page_size}
                previousHref={`/ess/payslips${buildQueryString({ ...sharedParams, page: data.page - 1 })}`}
                totalCount={data.total_count}
              />
            ) : null}

            <div className="ess-payslip-evidence-grid">
              <article>
                <strong>Published only</strong>
                <span>Draft and generated payroll artifacts stay hidden until the output batch is published.</span>
              </article>
              <article>
                <strong>Employee scoped</strong>
                <span>The API resolves files through the signed-in employee context and tenant boundary.</span>
              </article>
              <article>
                <strong>Download tracked</strong>
                <span>Download behavior is driven by provider and strategy refs, not hardcoded file paths.</span>
              </article>
            </div>
          </div>

          <aside className="ess-payslip-guidance">
            <div className="ess-payslip-panel-header">
              <div>
                <span className="workspace-card__eyebrow">Before downloading</span>
                <h2>Payslip checklist</h2>
              </div>
            </div>
            <div className="ess-payslip-checklist">
              <article>
                <strong>Correct period</strong>
                <span>Confirm the month and pay date before sharing the file.</span>
              </article>
              <article>
                <strong>Salary totals</strong>
                <span>Check gross earnings, deductions, and net pay in the review dialog.</span>
              </article>
              <article>
                <strong>Secure download</strong>
                <span>Use only the app download link. Do not rely on forwarded files.</span>
              </article>
              <article>
                <strong>Read receipt</strong>
                <span>Mark as read when you have reviewed the payslip and totals.</span>
              </article>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
