"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { useConfirmedPayslip } from "./payslip-read-state";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { PayslipReadReceiptAction } from "@/app/ess/payslips/payslip-read-receipt-action";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { WorkspaceInformation } from "@/components/patterns/workspace-information";
import { essDocumentDate, essMoney } from "@/lib/ui/employee-document-format";
import type { EssPayrollPayslip } from "@/lib/types";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function getLineValue(line: Record<string, unknown>, key: string) {
  const value = line[key];
  return value === null || value === undefined || value === "" ? "Not available" : String(value);
}

function formatDateTime(value: string | null) {
  return value ? `${essDocumentDate(value)} ${value.slice(11, 16)} UTC` : "Not recorded";
}

function formatFileSize(value: number) {
  if (!value) {
    return "Not recorded";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


export function PayslipDetailAction({ payslip: initialPayslip, variant = "secondary" }: { payslip: EssPayrollPayslip; variant?: "primary" | "secondary" }) {
  const payslip = useConfirmedPayslip(initialPayslip);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const renderModel = payslip.render_model;
  const taxSheet = renderModel?.tax_sheet;
  const dayCountBasis = renderModel?.day_count_basis;
  const visibleSections = renderModel?.sections.filter((section) => section.lines.length) ?? [];
  const proofSummary = taxSheet?.proof_status_summary ? Object.entries(taxSheet.proof_status_summary)
    .map(([key, value]) => `${titleCase(key)} ${String(value)}`)
    .join(", ") : "";
  const modal = isOpen && mounted
    ? createPortal(
        <HrAdminActionModal
          className="accerio-dialog"
          explicitTabOrder
          closeHref="/ess/payslips"
          description={`${payslip.title} / Pay date ${essDocumentDate(payslip.pay_date)}`}
          eyebrow="Payslip detail"
          footer={(
            <>
              {payslip.download_url ? (
                <AsyncDownloadButton className="button button--primary" href={`/api/me/payroll-payslips/${payslip.id}/download`} fileName={payslip.file_name || "payslip"}>Download payslip</AsyncDownloadButton>
              ) : (
                <span className="payroll-output-download-state">Download blocked</span>
              )}
              <PayslipReadReceiptAction
                endpoint={`/api/me/payroll-payslips/${payslip.id}/read`}
                isReadAcknowledged={payslip.access_summary.is_read_acknowledged}
                onActionStart={() => closeButtonRef.current?.focus({ preventScroll: true })}
              />
              <button className="button button--secondary" ref={closeButtonRef} onClick={() => setIsOpen(false)} type="button">Close</button>
            </>
          )}
          labelledBy={`payslip-detail-${payslip.id}`}
          onClose={() => setIsOpen(false)}
          title={payslip.period_name}
        >
            <WorkspaceInformation fields={[["Gross earnings", essMoney(payslip.totals_snapshot.gross_earnings)], ["Deductions", essMoney(payslip.totals_snapshot.employee_deductions)], ["Net pay", essMoney(payslip.totals_snapshot.net_pay)]]} />
            <div className="queue-list">
              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Payslip lines</span>
                <div className="payroll-rule-snapshot-list">
                  {visibleSections.length ? (
                    visibleSections.map((section) => (
                      <div className="payroll-rule-snapshot-group" key={section.key}>
                        <h3 className="section-heading-soft">{section.label} · {section.total}</h3>
                        <WorkspaceInformation fields={section.lines.map((line) => [line.component_name, line.amount])} />
                      </div>
                    ))
                  ) : payslip.line_snapshot.length ? (
                    <WorkspaceInformation fields={payslip.line_snapshot.map((line) => [getLineValue(line, "component_name"), `${essMoney(line.amount)} · ${titleCase(getLineValue(line, "line_type"))}`])} />
                  ) : (
                    <p className="section-copy section-copy-soft">No calculation lines were attached to this payslip.</p>
                  )}
                </div>
              </section>
              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Period details</span>
                <WorkspaceInformation fields={[["Period start", essDocumentDate(payslip.period_start_date)], ["Period end", essDocumentDate(payslip.period_end_date)], ["Published by", payslip.published_by_name ?? "Not recorded"], ["File", payslip.file_name || "Not recorded"]]} />
              </section>

              <details>
                <summary tabIndex={0}>Access and file information</summary>
                <div className="queue-list">
              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Access trail</span>
                <WorkspaceInformation fields={[["Notifications", String(payslip.access_summary.notification_count)], ["Downloads", String(payslip.access_summary.download_count)], ["Read receipt", payslip.access_summary.is_read_acknowledged ? formatDateTime(payslip.access_summary.first_read_at) : "Not acknowledged"], ["Latest notification", formatDateTime(payslip.access_summary.latest_notification_at)]]} />
              </section>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Storage governance</span>
                <WorkspaceInformation fields={[["Provider", payslip.storage_provider_ref], ["Strategy", payslip.download_strategy_ref], ["Signed URL", payslip.supports_signed_url ? `${payslip.signed_url_expires_in_seconds}s` : "Streamed"], ["Retention", payslip.retention_policy_ref], ["Checksum", payslip.checksum_sha256 ? `${payslip.checksum_sha256.slice(0, 18)}...` : "Pending"], ["Size", formatFileSize(payslip.file_size_bytes)]]} />
              </section>                </div>
              </details>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Tax sheet</span>
                {taxSheet?.available ? (
                  <WorkspaceInformation fields={[["Tax regime", taxSheet.tax_regime || "As per payroll setup"], ["This period", taxSheet.current_period_tax], ["Year to date", taxSheet.ytd_tax], ["Taxable earnings", taxSheet.taxable_earnings], ["Readiness", titleCase(taxSheet.readiness_status || "pending")], ["Source hashes", String(taxSheet.source_hash_count ?? 0)], ["Proofs", proofSummary || "No proof summary attached"]]} />
                ) : (
                  <p className="section-copy section-copy-soft">Tax sheet will appear here once payroll publishes tax calculation evidence with the payslip.</p>
                )}
              </section>



              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Day-count basis</span>
                {dayCountBasis?.available ? (
                  <WorkspaceInformation fields={[["Source", titleCase(dayCountBasis.source || "schedule_spine")], ["Calendar days", String(dayCountBasis.calendar_days)], ["Working days", String(dayCountBasis.working_days)], ["Weekly offs", String(dayCountBasis.weekly_off_days)], ["Holidays", String(dayCountBasis.holiday_days)], ["Readiness", titleCase(dayCountBasis.readiness_status || "ready")]]} />
                ) : (
                  <p className="section-copy section-copy-soft">Payroll has not attached roster and holiday day-count evidence to this payslip yet.</p>
                )}
              </section>

              {renderModel ? (
                <section className="ess-payslip-detail-section">
                  <span className="workspace-card__eyebrow">Template information</span>
                  <WorkspaceInformation fields={[["Template", renderModel.template_ref || "Default payslip template"], ["Employee", renderModel.employee.code || renderModel.employee.name || "Employee"], ["Hidden lines", String(renderModel.quality.hidden_line_count)], ["Tax sheet", taxSheet?.available ? "Attached" : "Not attached"]]} />
                </section>
              ) : null}

              <section className="ess-payslip-detail-section ess-payslip-detail-section--wide">
                <span className="workspace-card__eyebrow">Source hash</span>
                <code>{payslip.source_hash}</code>
              </section>
            </div>
        </HrAdminActionModal>,
        document.body,
      )
    : null;

  return (
    <>
      <button className={`button button--${variant}`} onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); setIsOpen(true); }} type="button">
        Review payslip
      </button>

      {modal}
    </>
  );
}
