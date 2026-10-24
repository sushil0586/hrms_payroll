import Link from "next/link";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { PayslipReadStateProvider, PayslipReadStatus } from "./payslip-read-state";
import { unstable_rethrow } from "next/navigation";
import EssError from "@/app/ess/error";

import { PaginationBar } from "@/components/patterns/pagination-bar";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { PayslipDetailAction } from "@/app/ess/payslips/payslip-detail-action";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { essDocumentDate, essMoney } from "@/lib/ui/employee-document-format";
import { getEssPayrollPayslips } from "@/lib/api";
import { WorkspaceFilterBar, WorkspaceStandardHeader, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";

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

export default async function EssPayslipsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const rawYear = normalizeParam(currentParams.year) ?? "";
  const year = /^[1-9]\d{3}$/.test(rawYear) ? rawYear : "";
  const page = Number(normalizeParam(currentParams.page) ?? 1);
  const pageSize = Number(normalizeParam(currentParams.page_size) ?? 5);
  const rawId = normalizeParam(currentParams.payslipId);
  const selectedPayslipId = rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId) ? rawId : undefined;
  let result: Awaited<ReturnType<typeof getEssPayrollPayslips>>;
  try {
    result = await getEssPayrollPayslips({
      q,
      year,
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      page_size: [5, 10, 25, 50].includes(pageSize) ? pageSize : 5,
      selected_id: selectedPayslipId,
    }, 15_000);
    if (result.data.total_count > 0 && result.data.page > Math.ceil(result.data.total_count / result.data.page_size)) {
      result = await getEssPayrollPayslips({ q, year, page: Math.ceil(result.data.total_count / result.data.page_size), page_size: result.data.page_size, selected_id: selectedPayslipId }, 15_000);
    }
    if (selectedPayslipId && !result.data.items.some(item => item.id === selectedPayslipId)) {
      result = await getEssPayrollPayslips({ q, year, page: result.data.page, page_size: result.data.page_size }, 15_000);
    }
  } catch (error) {
    // Preserve Next authentication redirects; expected read failures use the shared employee feedback view.
    unstable_rethrow(error);
    return <EssError />;
  }

  const data = result.data;
  const selectedPayslip = data.items.find((item) => item.id === selectedPayslipId) ?? data.items[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const sharedParams = { q, year, page_size: data.page_size, payslipId: selectedPayslip?.id };

  return (
    <PayslipReadStateProvider><main className="shell shell--workspace shell--ess-payslips ess-experience-shell ess-compact accerio-page">
      <WorkspaceStandardHeader eyebrow="Employee self service" title="Payslips" description="Review published payroll documents, download copies and acknowledge receipt." actions={<Link prefetch={false} className="button button--secondary" href="/ess/documents">Employee documents</Link>} />
      <WorkspaceStandardPanel title="Published payroll" description="Pay dates are payroll dates, not confirmation of a bank payment.">
        <WorkspaceInformation fields={[
          ["Published payslips", String(data.summary.published_payslip_count)],
          ["Available downloads", String(data.summary.downloadable_payslip_count)],
          ["Latest published period", data.summary.latest_period_name || "Not available"],
          ["Latest pay date", essDocumentDate(data.summary.latest_pay_date)],
        ]} />
      </WorkspaceStandardPanel>
      {selectedPayslipId && !data.items.some(item => item.id === selectedPayslipId) ? <p className="notice" role="status">The selected payslip is not on this page. Search its period or change the year/page.</p> : null}
      <WorkspaceStandardPanel title="Payslip history" description="Search and year filters cover all your published payslips. Year follows the payroll pay date.">
            <form action="/ess/payslips" data-navigation-mode="document">
              <WorkspaceFilterBar>
                <label className="form-field">
                  <span className="muted">Search payslips</span>
                  <input aria-label="Search payslips" className="input-control" defaultValue={q} name="q" placeholder="Search payslips" />
                </label>
                <label className="form-field">
                  <span className="muted">Year</span>
                  <select aria-label="Year" className="input-control" defaultValue={year} name="year">
                    <option value="">All years</option>
                    {data.summary.available_years.map((availableYear) => (
                      <option key={availableYear} value={availableYear}>{availableYear}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="muted">Rows per page</span>
                  <select aria-label="Rows per page" className="input-control" defaultValue={String(data.page_size)} name="page_size">
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                </label>
                <button className="button button--primary" type="submit">Apply</button>
              </WorkspaceFilterBar>
            </form>

            <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Payslip history table">
              <table className="workspace-table " aria-label="Published payslips">
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
                      <td className="workspace-table__primary-cell">
                        <a data-navigation-mode="document" href={`/ess/payslips${buildQueryString({
                          q,
                          year,
                          page: data.page,
                          page_size: data.page_size,
                          payslipId: payslip.id,
                        })}`}>
                          <strong>{payslip.title}</strong>
                          <span>{payslip.period_name} / {payslip.payroll_run_name}</span>
                        </a>
                      </td>
                      <td>{essDocumentDate(payslip.pay_date)}</td>
                      <td>{essMoney(payslip.totals_snapshot.gross_earnings)}</td>
                      <td>{essMoney(payslip.totals_snapshot.employee_deductions)}</td>
                      <td>{essMoney(payslip.totals_snapshot.net_pay)}</td>
                      <td>
                        <PayslipReadStatus payslip={payslip} />
                      </td>
                      <td>
                        <div className="table-actions">
                          {selectedPayslip?.id === payslip.id ? <PayslipDetailAction payslip={payslip} /> : <a className="button button--secondary" data-navigation-mode="document" href={`/ess/payslips${buildQueryString({ q, year, page: data.page, page_size: data.page_size, payslipId: payslip.id })}`}>Select payslip</a>}
                          {payslip.download_url ? (
                            <AsyncDownloadButton href={`/api/me/payroll-payslips/${payslip.id}/download`} fileName={payslip.file_name || "payslip"}>
                              Download payslip
                            </AsyncDownloadButton>
                          ) : <span className="muted">Download unavailable</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WorkspaceTableScrollRegion>

            {data.items.length === 0 ? (
              <div className="notice">
                <strong>No payslips found.</strong>
                <span className="muted">Try another year or search value.</span>
              </div>
            ) : null}

            {data.total_count > data.page_size ? (
              <PaginationBar
                navigationMode="document"
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

      </WorkspaceStandardPanel>
    </main></PayslipReadStateProvider>
  );
}
