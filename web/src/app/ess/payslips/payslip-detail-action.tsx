"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PayslipReadReceiptAction } from "@/app/ess/payslips/payslip-read-receipt-action";
import type { EssPayrollPayslip } from "@/lib/types";

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function useEscapeClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

export function PayslipDetailAction({ payslip, variant = "secondary" }: { payslip: EssPayrollPayslip; variant?: "primary" | "secondary" }) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeClose(isOpen, () => setIsOpen(false));
  const renderModel = payslip.render_model;
  const taxSheet = renderModel?.tax_sheet;
  const visibleSections = renderModel?.sections.filter((section) => section.lines.length) ?? [];
  const proofSummary = taxSheet?.proof_status_summary ? Object.entries(taxSheet.proof_status_summary)
    .map(([key, value]) => `${titleCase(key)} ${String(value)}`)
    .join(", ") : "";
  const modal = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="modal-shell" role="presentation">
          <div aria-label={`Payslip detail for ${payslip.period_name}`} aria-modal="true" className="modal ess-payslip-modal" role="dialog">
            <div className="modal__header">
              <div>
                <span className="workspace-card__eyebrow">Payslip detail</span>
                <h2 id={`payslip-detail-${payslip.id}`}>{payslip.period_name}</h2>
                <p className="section-copy section-copy-soft">{payslip.title} / Paid {formatDate(payslip.pay_date)}</p>
              </div>
              <button className="button button--secondary" onClick={() => setIsOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="ess-payslip-modal-summary">
              <article>
                <span>Gross earnings</span>
                <strong>{formatMoney(payslip.totals_snapshot.gross_earnings)}</strong>
              </article>
              <article>
                <span>Deductions</span>
                <strong>{formatMoney(payslip.totals_snapshot.employee_deductions)}</strong>
              </article>
              <article>
                <span>Net pay</span>
                <strong>{formatMoney(payslip.totals_snapshot.net_pay)}</strong>
              </article>
            </div>

            <div className="ess-payslip-modal-actions">
              {payslip.download_url ? (
                <a className="button button--primary" href={`/api/me/payroll-payslips/${payslip.id}/download`}>
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

            <div className="ess-payslip-modal-grid">
              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Payment summary</span>
                <div className="detail-grid">
                  <DetailRow label="Period start" value={formatDate(payslip.period_start_date)} />
                  <DetailRow label="Period end" value={formatDate(payslip.period_end_date)} />
                  <DetailRow label="Published by" value={payslip.published_by_name ?? "Payroll team"} />
                  <DetailRow label="File" value={payslip.file_name || "Generated payslip file"} />
                </div>
              </section>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Access trail</span>
                <div className="detail-grid">
                  <DetailRow label="Notifications" value={String(payslip.access_summary.notification_count)} />
                  <DetailRow label="Downloads" value={String(payslip.access_summary.download_count)} />
                  <DetailRow label="Read receipt" value={payslip.access_summary.is_read_acknowledged ? formatDateTime(payslip.access_summary.first_read_at) : "Pending"} />
                  <DetailRow label="Latest notification" value={formatDateTime(payslip.access_summary.latest_notification_at)} />
                </div>
              </section>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Storage governance</span>
                <div className="detail-grid">
                  <DetailRow label="Provider" value={payslip.storage_provider_ref} />
                  <DetailRow label="Strategy" value={payslip.download_strategy_ref} />
                  <DetailRow label="Signed URL" value={payslip.supports_signed_url ? `${payslip.signed_url_expires_in_seconds}s` : "Streamed"} />
                  <DetailRow label="Retention" value={payslip.retention_policy_ref} />
                  <DetailRow label="Checksum" value={payslip.checksum_sha256 ? `${payslip.checksum_sha256.slice(0, 18)}...` : "Pending"} />
                  <DetailRow label="Size" value={formatFileSize(payslip.file_size_bytes)} />
                </div>
              </section>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Tax sheet</span>
                {taxSheet?.available ? (
                  <div className="detail-grid">
                    <DetailRow label="Tax regime" value={taxSheet.tax_regime || "As per payroll setup"} />
                    <DetailRow label="This period" value={taxSheet.current_period_tax} />
                    <DetailRow label="Year to date" value={taxSheet.ytd_tax} />
                    <DetailRow label="Taxable earnings" value={taxSheet.taxable_earnings} />
                    <DetailRow label="Readiness" value={titleCase(taxSheet.readiness_status || "pending")} />
                    <DetailRow label="Source hashes" value={String(taxSheet.source_hash_count ?? 0)} />
                    <DetailRow label="Proofs" value={proofSummary || "No proof summary attached"} />
                  </div>
                ) : (
                  <p className="section-copy section-copy-soft">Tax sheet will appear here once payroll publishes tax calculation evidence with the payslip.</p>
                )}
              </section>

              <section className="ess-payslip-detail-section">
                <span className="workspace-card__eyebrow">Payslip lines</span>
                <div className="payroll-rule-snapshot-list">
                  {visibleSections.length ? (
                    visibleSections.map((section) => (
                      <div className="payroll-rule-snapshot-group" key={section.key}>
                        <div className="detail-row">
                          <span className="detail-label">{section.label}</span>
                          <span className="detail-value">{section.total}</span>
                        </div>
                        {section.lines.slice(0, 6).map((line) => (
                          <div className="detail-row" key={`${section.key}-${line.component_code}`}>
                            <span className="detail-label">{line.component_name}</span>
                            <span className="detail-value">{line.amount}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : payslip.line_snapshot.length ? (
                    payslip.line_snapshot.map((line, index) => (
                      <div className="detail-row" key={`${getLineValue(line, "component_code")}-${index}`}>
                        <span className="detail-label">{getLineValue(line, "component_name")}</span>
                        <span className="detail-value">
                          {formatMoney(line.amount)} / {titleCase(getLineValue(line, "line_type"))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="section-copy section-copy-soft">No calculation lines were attached to this payslip.</p>
                  )}
                </div>
              </section>

              {renderModel ? (
                <section className="ess-payslip-detail-section">
                  <span className="workspace-card__eyebrow">PDF readiness</span>
                  <div className="detail-grid">
                    <DetailRow label="Template" value={renderModel.template_ref || "Default payslip template"} />
                    <DetailRow label="Employee" value={renderModel.employee.code || renderModel.employee.name || "Employee"} />
                    <DetailRow label="Hidden lines" value={String(renderModel.quality.hidden_line_count)} />
                    <DetailRow label="Tax sheet" value={taxSheet?.available ? "Attached" : "Not attached"} />
                  </div>
                </section>
              ) : null}

              <section className="ess-payslip-detail-section ess-payslip-detail-section--wide">
                <span className="workspace-card__eyebrow">Source hash</span>
                <code>{payslip.source_hash}</code>
              </section>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button className={`button button--${variant}`} onClick={() => setIsOpen(true)} type="button">
        Review payslip
      </button>

      {modal}
    </>
  );
}
