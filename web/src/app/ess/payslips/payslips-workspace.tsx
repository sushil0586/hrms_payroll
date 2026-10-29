"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { WorkspaceStandardHeader, WorkspaceStandardPanel } from "@/components/patterns/workspace-standard";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import type { EssPayrollPayslipListResponse } from "@/lib/types";
import { essDocumentDate, essMoney } from "@/lib/ui/employee-document-format";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

import { PayslipDetailAction } from "./payslip-detail-action";
import { PayslipReadStateProvider, PayslipReadStatus } from "./payslip-read-state";

export type PayslipQuery = { q: string; year: string; page: number; page_size: number; payslipId: string };
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function fromLocation(): PayslipQuery {
  const params = new URLSearchParams(window.location.search);
  const positive = (key: string, fallback: number) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : fallback; };
  const size = positive("page_size", 5);
  return { q: params.get("q") || "", year: params.get("year") || "", page: positive("page", 1), page_size: [5, 10, 25, 50].includes(size) ? size : 5, payslipId: params.get("payslipId") || "" };
}

function href(query: PayslipQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "" && !(key === "page" && value === 1) && !(key === "page_size" && value === 5)) params.set(key, String(value)); });
  return `/ess/payslips${params.size ? `?${params}` : ""}`;
}

export function PayslipsWorkspace({ initialData, initialQuery }: { initialData: EssPayrollPayslipListResponse; initialQuery: PayslipQuery }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const request = useCallback(async (query: PayslipQuery, signal: AbortSignal) => {
    const read = async (value: PayslipQuery) => {
      const params = new URLSearchParams({ q: value.q, year: value.year, page: String(value.page), page_size: String(value.page_size) });
      if (value.payslipId) params.set("selected_id", value.payslipId);
      const response = await fetch(`/api/me/payroll-payslips?${params}`, { cache: "no-store", signal });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
      if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray(payload.items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Payslips could not be updated.", response.status);
      return payload as EssPayrollPayslipListResponse;
    };
    const data = await read(query);
    const last = Math.max(1, Math.ceil(data.total_count / data.page_size));
    return query.page > last ? read({ ...query, page: last }) : data;
  }, []);
  const resolve = useCallback((query: PayslipQuery, data: EssPayrollPayslipListResponse) => ({ ...query, page: data.page, page_size: data.page_size, payslipId: data.items.some((item) => item.id === query.payslipId) ? query.payslipId : "" }), []);
  const historyHref = useCallback((query: PayslipQuery) => href(query), []);
  const resource = useScopedWorkspaceResource({ initialData, initialQuery, request, resolveQuery: resolve, historyHref, readHistoryQuery: fromLocation, fallbackError: "Payslips could not be updated. The last confirmed history is still shown." });
  const data = resource.data;
  const query = resource.query;
  const selected = data.items.find((item) => item.id === query.payslipId) ?? data.items[0] ?? null;
  const last = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const pageQuery = (page: number) => ({ ...query, page });

  return <PayslipReadStateProvider><main className="shell shell--workspace shell--ess-payslips ess-experience-shell ess-compact accerio-page" data-hydrated={hydrated}>
    <WorkspaceStandardHeader eyebrow="Employee self service" title="Payslips" description="Review published payroll documents, download copies and acknowledge receipt." actions={<Link prefetch={false} className="button button--secondary" href="/ess/documents">Employee documents</Link>} />
    <WorkspaceStandardPanel title="Published payroll" description="Pay dates are payroll dates, not confirmation of a bank payment."><WorkspaceInformation fields={[["Published payslips", String(data.summary.published_payslip_count)], ["Available downloads", String(data.summary.downloadable_payslip_count)], ["Latest published period", data.summary.latest_period_name || "Not available"], ["Latest pay date", essDocumentDate(data.summary.latest_pay_date)]]} /></WorkspaceStandardPanel>
    <WorkspaceStandardPanel title="Payslip history" description="Search and year filters cover all your published payslips. Year follows the payroll pay date.">
      <div aria-busy={resource.isPending}>
        <WorkspaceFilterForm key={JSON.stringify(query)} action="/ess/payslips" pending={resource.isPending} updateMode="scoped" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void resource.load({ q: String(form.get("q") || ""), year: String(form.get("year") || ""), page: 1, page_size: Number(form.get("page_size") || 5), payslipId: "" }); }}>
          <label className="form-field"><span className="muted">Search payslips</span><input aria-label="Search payslips" className="input-control" defaultValue={query.q} name="q" placeholder="Search payslips" /></label>
          <label className="form-field"><span className="muted">Year</span><select aria-label="Year" className="input-control" defaultValue={query.year} name="year"><option value="">All years</option>{data.summary.available_years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="form-field"><span className="muted">Rows per page</span><select aria-label="Rows per page" className="input-control" defaultValue={String(query.page_size)} name="page_size">{[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}</select></label>
          <button className="button button--primary" type="submit">Apply</button>
          <a className="button button--ghost" data-navigation-mode="local" href="/ess/payslips" onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void resource.load({ q: "", year: "", page: 1, page_size: 5, payslipId: "" }); }}>Clear filters</a>
        </WorkspaceFilterForm>
        {resource.error ? <div className="notice notice--error" role="alert"><p>{resource.error}</p><button className="button button--secondary" disabled={resource.isPending} onClick={() => void resource.load(query, "none")} type="button">Retry payslips</button></div> : null}
        <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Payslip history table"><table className="workspace-table" aria-label="Published payslips"><thead><tr><th>Payslip</th><th>Pay date</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Access</th><th>Actions</th></tr></thead><tbody>{data.items.map((payslip) => <tr className={selected?.id === payslip.id ? "is-selected" : ""} key={payslip.id}>
          <td className="workspace-table__primary-cell"><a data-navigation-mode="local" href={href({ ...query, payslipId: payslip.id })} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void resource.load({ ...query, payslipId: payslip.id }); }}><strong>{payslip.title}</strong><span>{payslip.period_name} / {payslip.payroll_run_name}</span></a></td>
          <td>{essDocumentDate(payslip.pay_date)}</td><td>{essMoney(payslip.totals_snapshot.gross_earnings)}</td><td>{essMoney(payslip.totals_snapshot.employee_deductions)}</td><td>{essMoney(payslip.totals_snapshot.net_pay)}</td><td><PayslipReadStatus payslip={payslip} /></td>
          <td><div className="table-actions">{selected?.id === payslip.id ? <PayslipDetailAction payslip={payslip} /> : <a className="button button--secondary" data-navigation-mode="local" href={href({ ...query, payslipId: payslip.id })} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void resource.load({ ...query, payslipId: payslip.id }); }}>Select payslip</a>}{payslip.download_url ? <AsyncDownloadButton href={`/api/me/payroll-payslips/${payslip.id}/download`} fileName={payslip.file_name || "payslip"}>Download payslip</AsyncDownloadButton> : <span className="muted">Download unavailable</span>}</div></td>
        </tr>)}</tbody></table></WorkspaceTableScrollRegion>
        {!data.items.length ? <div className="notice"><strong>No payslips found.</strong><span className="muted">Try another year or search value.</span></div> : null}
        {data.total_count > data.page_size ? <PaginationBar navigationMode="scoped" pending={resource.isPending} firstHref={href(pageQuery(1))} hasNext={Boolean(data.has_next)} hasPrevious={Boolean(data.has_previous)} lastHref={href(pageQuery(last))} nextHref={href(pageQuery(data.page + 1))} page={data.page} pageSize={data.page_size} previousHref={href(pageQuery(Math.max(1, data.page - 1)))} totalCount={data.total_count} onFirst={() => void resource.load(pageQuery(1))} onLast={() => void resource.load(pageQuery(last))} onNext={() => void resource.load(pageQuery(data.page + 1))} onPrevious={() => void resource.load(pageQuery(Math.max(1, data.page - 1)))} /> : null}
      </div>
    </WorkspaceStandardPanel>
  </main></PayslipReadStateProvider>;
}
