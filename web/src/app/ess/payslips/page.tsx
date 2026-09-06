import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PayslipReadReceiptAction } from "@/app/ess/payslips/payslip-read-receipt-action";
import { getEssPayrollPayslips } from "@/lib/api";
import type { EssPayrollPayslip } from "@/lib/types";

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

function getLineValue(line: Record<string, unknown>, key: string) {
  const value = line[key];
  return value === null || value === undefined || value === "" ? "Not available" : String(value);
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function formatFileSize(value: number) {
  if (!value) {
    return "Pending";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function PayslipRail({
  payslips,
  selectedPayslip,
  filters,
}: {
  payslips: EssPayrollPayslip[];
  selectedPayslip: EssPayrollPayslip | null;
  filters: { q: string; year: string; page_size: number };
}) {
  return (
    <aside className="payroll-setup-rail payroll-output-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Published history</span>
        <h2>My payslips</h2>
      </div>
      <div className="payroll-setup-card-list">
        {payslips.map((payslip) => (
          <Link
            className={`payroll-setup-mini-card payroll-output-card ${selectedPayslip?.id === payslip.id ? "is-selected" : ""}`}
            href={`/ess/payslips${buildQueryString({
              q: filters.q,
              year: filters.year,
              page_size: filters.page_size,
              payslipId: payslip.id,
            })}`}
            key={payslip.id}
          >
            <div>
              <strong>{payslip.period_name}</strong>
              <span>{payslip.payroll_run_name}</span>
            </div>
            <StatusBadge status="published" />
            <div className="payroll-input-run-card__counts">
              <span>{formatMoney(payslip.totals_snapshot.net_pay)}</span>
              <span>{formatDate(payslip.pay_date)}</span>
            </div>
            <code>{payslip.storage_object_version || payslip.download_strategy_ref}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function PayslipDetail({ payslip }: { payslip: EssPayrollPayslip | null }) {
  if (!payslip) {
    return (
      <aside className="payroll-setup-detail-panel payroll-output-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Payslip detail</span>
          <h2>No payslip selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Published employee payslips will appear here after payroll outputs are released.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-output-detail-panel" aria-label={`${payslip.title} detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Payslip detail</span>
          <h2>{payslip.title}</h2>
          <p className="section-copy section-copy-soft">{payslip.period_name} / Paid {formatDate(payslip.pay_date)}</p>
        </div>
        <StatusBadge status="published" />
      </div>

      <div className="payroll-output-net-block">
        <span className="workspace-card__eyebrow">Net pay</span>
        <strong>{formatMoney(payslip.totals_snapshot.net_pay)}</strong>
        <span>{payslip.file_name || payslip.id}</span>
        {payslip.download_url ? (
          <a className="button button--secondary payroll-output-download-link" href={`/api/me/payroll-payslips/${payslip.id}/download`}>
            Download payslip
          </a>
        ) : (
          <span className="payroll-output-download-state">Download blocked</span>
        )}
        <PayslipReadReceiptAction
          endpoint={`/api/me/payroll-payslips/${payslip.id}/read`}
          isReadAcknowledged={payslip.access_summary.is_read_acknowledged}
        />
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Access trail</span>
        <div className="detail-grid">
          <DetailRow label="Notifications" value={String(payslip.access_summary.notification_count)} />
          <DetailRow label="Downloads" value={String(payslip.access_summary.download_count)} />
          <DetailRow label="Read receipt" value={payslip.access_summary.is_read_acknowledged ? formatDateTime(payslip.access_summary.first_read_at) : "Pending"} />
          <DetailRow label="Latest notification" value={formatDateTime(payslip.access_summary.latest_notification_at)} />
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Payment summary</span>
        <div className="detail-grid">
          <DetailRow label="Gross earnings" value={formatMoney(payslip.totals_snapshot.gross_earnings)} />
          <DetailRow label="Deductions" value={formatMoney(payslip.totals_snapshot.employee_deductions)} />
          <DetailRow label="Net pay" value={formatMoney(payslip.totals_snapshot.net_pay)} />
          <DetailRow label="Period start" value={formatDate(payslip.period_start_date)} />
          <DetailRow label="Period end" value={formatDate(payslip.period_end_date)} />
          <DetailRow label="Published by" value={payslip.published_by_name ?? "Payroll team"} />
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Storage governance</span>
        <div className="detail-grid">
          <DetailRow label="Provider" value={payslip.storage_provider_ref} />
          <DetailRow label="Object version" value={payslip.storage_object_version || "Pending"} />
          <DetailRow label="Strategy" value={payslip.download_strategy_ref} />
          <DetailRow label="Signed URL" value={payslip.supports_signed_url ? `${payslip.signed_url_expires_in_seconds}s` : "Streamed"} />
          <DetailRow label="Retention" value={payslip.retention_policy_ref} />
          <DetailRow label="Checksum" value={payslip.checksum_sha256 ? `${payslip.checksum_sha256.slice(0, 18)}...` : "Pending"} />
          <DetailRow label="Size" value={formatFileSize(payslip.file_size_bytes)} />
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Source hash</span>
        <code>{payslip.source_hash}</code>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Recent access events</span>
        <div className="payroll-rule-snapshot-list">
          {payslip.access_events.map((event) => (
            <div className="detail-row" key={event.id}>
              <span className="detail-label">{titleCase(event.event_type)}</span>
              <span className="detail-value">
                {event.source_channel_ref} / {formatDateTime(event.created_at)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Calculation lines</span>
        <div className="payroll-rule-snapshot-list">
          {payslip.line_snapshot.map((line, index) => (
            <div className="detail-row" key={`${getLineValue(line, "component_code")}-${index}`}>
              <span className="detail-label">{getLineValue(line, "component_name")}</span>
              <span className="detail-value">
                {formatMoney(line.amount)} / {titleCase(getLineValue(line, "line_type"))}
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default async function EssPayslipsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const year = normalizeParam(currentParams.year) ?? "";
  const page = Number(normalizeParam(currentParams.page) ?? 1);
  const pageSize = Number(normalizeParam(currentParams.page_size) ?? 10);
  const selectedPayslipId = normalizeParam(currentParams.payslipId);
  const result = await getEssPayrollPayslips({
    q,
    year,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10,
  });
  const data = result.data;
  const selectedPayslip = data.items.find((item) => item.id === selectedPayslipId) ?? data.items[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-outputs shell--ess-payslips">
      <PageIntro
        eyebrow={result.state === "live" ? "Live employee payroll" : "Demo employee payroll"}
        title="Payslips"
        description="Published payroll outputs for the signed-in employee, with download metadata, retention policy, source hash, and calculation line evidence."
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
        pills={["Published only", "Employee scoped", "Storage governed"]}
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
        <div className="payroll-setup-workspace payroll-output-workspace">
          <PayslipRail payslips={data.items} selectedPayslip={selectedPayslip} filters={{ q, year, page_size: pageSize }} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Employee register</span>
                <h2>Payslip register</h2>
              </div>
              <StatusBadge status={selectedPayslip ? "published" : "draft"} />
            </div>

            <form action="/ess/payslips" className="payroll-filter-form">
              <input className="input-control" defaultValue={q} name="q" placeholder="Search payslips" />
              <select className="input-control" defaultValue={year} name="year">
                <option value="">All years</option>
                {data.summary.available_years.map((availableYear) => (
                  <option key={availableYear} value={availableYear}>{availableYear}</option>
                ))}
              </select>
              <select className="input-control" defaultValue={String(pageSize)} name="page_size">
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
              <button className="button button--primary" type="submit">Apply</button>
            </form>

            <div className="payroll-review-lock-strip payroll-output-publish-strip">
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
              <table className="payroll-readiness-table payroll-setup-table payroll-output-artifact-table">
                <thead>
                  <tr>
                    <th>Payslip</th>
                    <th>Pay date</th>
                    <th>Net pay</th>
                    <th>Storage</th>
                    <th>Status</th>
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
                          <span>{payslip.file_name}</span>
                          <span>hash {payslip.source_hash.slice(0, 12)}</span>
                        </Link>
                      </td>
                      <td>{formatDate(payslip.pay_date)}</td>
                      <td>{formatMoney(payslip.totals_snapshot.net_pay)}</td>
                      <td>
                        <strong>{payslip.storage_object_version || "Pending"}</strong>
                        <span>{payslip.download_strategy_ref}</span>
                        <span>{payslip.access_summary.download_count} downloads</span>
                      </td>
                      <td><StatusBadge status="published" /></td>
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

            <div className="payroll-output-handoff-grid">
              <article>
                <strong>Published gate</strong>
                <span>Draft and generated payroll artifacts stay hidden until the output batch is published.</span>
              </article>
              <article>
                <strong>Tenant isolation</strong>
                <span>The API resolves files through the signed-in employee context and tenant boundary.</span>
              </article>
              <article>
                <strong>Storage strategy</strong>
                <span>Download behavior is driven by provider and strategy refs, not hardcoded file paths.</span>
              </article>
            </div>
          </div>

          <PayslipDetail payslip={selectedPayslip} />
        </div>
      </section>
    </main>
  );
}
