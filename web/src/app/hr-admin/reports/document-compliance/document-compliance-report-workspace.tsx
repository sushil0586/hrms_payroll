"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HrAdminEmployeeDocument } from "@/lib/types";

const PAGE_SIZE = 10;

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(fileSizeBytes: number) {
  if (fileSizeBytes <= 0) return "Not available";
  if (fileSizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: string) {
  if (["verified", "approved", "active", "low"].includes(status.toLowerCase())) return "record-chip record-chip--success";
  if (["pending", "medium", "expiring"].includes(status.toLowerCase())) return "record-chip record-chip--warning";
  if (["rejected", "expired", "high"].includes(status.toLowerCase())) return "record-chip record-chip--danger";
  return "record-chip";
}

function complianceRisk(item: HrAdminEmployeeDocument) {
  if (item.is_expired || item.verification_status === "rejected") return "High";
  if (item.is_expiring_soon || item.verification_status === "pending") return "Medium";
  return "Low";
}

export function DocumentComplianceReportWorkspace({ documents }: { documents: HrAdminEmployeeDocument[] }) {
  const [query, setQuery] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("All");
  const [recordStatus, setRecordStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [expiryFocus, setExpiryFocus] = useState("All");
  const [sortBy, setSortBy] = useState("risk");
  const [page, setPage] = useState(1);

  const verificationStatuses = useMemo(() => ["All", ...unique(documents.map((item) => item.verification_status))], [documents]);
  const recordStatuses = useMemo(() => ["All", ...unique(documents.map((item) => item.status))], [documents]);
  const categories = useMemo(() => ["All", ...unique(documents.map((item) => item.category_name))], [documents]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = documents.filter((item) => {
      const matchesVerification = verificationStatus === "All" || item.verification_status === verificationStatus;
      const matchesRecord = recordStatus === "All" || item.status === recordStatus;
      const matchesCategory = category === "All" || item.category_name === category;
      const matchesExpiry =
        expiryFocus === "All" ||
        (expiryFocus === "expiring" && item.is_expiring_soon) ||
        (expiryFocus === "expired" && item.is_expired) ||
        (expiryFocus === "missing_expiry" && !item.expires_on);
      const matchesQuery =
        !normalizedQuery ||
        [
          item.employee_code,
          item.employee_name,
          item.category_name,
          item.title,
          item.document_number,
          item.file_name,
          item.verification_status,
          item.status,
          item.expiry_label,
          item.uploaded_by_identifier,
          item.verified_by_identifier,
          item.rejection_reason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesVerification && matchesRecord && matchesCategory && matchesExpiry && matchesQuery;
    });

    return nextRows.sort((left, right) => {
      if (sortBy === "employee") return left.employee_name.localeCompare(right.employee_name);
      if (sortBy === "verification") return left.verification_status.localeCompare(right.verification_status);
      if (sortBy === "expiry") return Number(left.days_until_expiry ?? 99999) - Number(right.days_until_expiry ?? 99999);
      if (sortBy === "category") return left.category_name.localeCompare(right.category_name);
      const riskRank = { High: 0, Medium: 1, Low: 2 };
      return riskRank[complianceRisk(left) as keyof typeof riskRank] - riskRank[complianceRisk(right) as keyof typeof riskRank];
    });
  }, [category, documents, expiryFocus, query, recordStatus, sortBy, verificationStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (verificationStatus !== "All") params.set("verification_status", verificationStatus);
    if (recordStatus !== "All") params.set("status", recordStatus);
    if (category !== "All") params.set("category", category);
    if (expiryFocus !== "All") params.set("expiry_focus", expiryFocus);
    params.set("sort", sortBy);
    return `/api/hr-admin/reports/document-compliance?${params.toString()}`;
  }, [category, expiryFocus, query, recordStatus, sortBy, verificationStatus]);
  const manifestHref = `${exportHref}&format=manifest`;

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <section className="section section--tight" aria-label="Document compliance report workspace">
      <div className="report-catalog-workspace document-compliance-report" data-testid="document-compliance-report">
        <div className="metric-grid-modern payroll-setup-metrics">
          <article className="metric-tile metric-tile-soft">
            <span>Documents</span>
            <strong>{filteredRows.length}</strong>
            <small>{documents.length} total records</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Pending verification</span>
            <strong>{filteredRows.filter((item) => item.verification_status === "pending").length}</strong>
            <small>Needs reviewer action</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Expiry risk</span>
            <strong>{filteredRows.filter((item) => item.is_expired || item.is_expiring_soon).length}</strong>
            <small>Expired or expiring</small>
          </article>
          <article className="metric-tile metric-tile-soft">
            <span>Re-upload requests</span>
            <strong>{filteredRows.filter((item) => item.reupload_requested).length}</strong>
            <small>Employee follow-up</small>
          </article>
        </div>

        <div className="report-catalog-toolbar payroll-register-toolbar" aria-label="Document compliance filters">
          <label>
            <span>Search documents</span>
            <input className="input-control" type="search" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search employee, category, title, number" />
          </label>
          <label>
            <span>Verification status</span>
            <select aria-label="Verification status" className="input-control" value={verificationStatus} onChange={(event) => updateFilter(() => setVerificationStatus(event.target.value))}>
              {verificationStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Record status</span>
            <select aria-label="Record status" className="input-control" value={recordStatus} onChange={(event) => updateFilter(() => setRecordStatus(event.target.value))}>
              {recordStatuses.map((item) => <option key={item} value={item}>{item === "All" ? item : titleCase(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select aria-label="Category" className="input-control" value={category} onChange={(event) => updateFilter(() => setCategory(event.target.value))}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Expiry focus</span>
            <select aria-label="Expiry focus" className="input-control" value={expiryFocus} onChange={(event) => updateFilter(() => setExpiryFocus(event.target.value))}>
              <option value="All">All documents</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="missing_expiry">Missing expiry</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" className="input-control" value={sortBy} onChange={(event) => updateFilter(() => setSortBy(event.target.value))}>
              <option value="risk">Compliance risk</option>
              <option value="employee">Employee</option>
              <option value="verification">Verification status</option>
              <option value="expiry">Expiry date</option>
              <option value="category">Category</option>
            </select>
          </label>
        </div>

        <div className="report-catalog-summary" aria-live="polite">
          <span className="queue-summary-chip"><strong>{categories.length - 1}</strong> categories</span>
          <span className="queue-summary-chip"><strong>{filteredRows.filter((item) => complianceRisk(item) === "High").length}</strong> high risk</span>
          <span className="queue-summary-chip"><strong>{currentPage}</strong> of {pageCount} pages</span>
          <Link className="button button--secondary" href={exportHref} prefetch={false}>Export filtered CSV</Link>
          <Link className="button button--ghost" href={manifestHref} prefetch={false}>Manifest</Link>
        </div>

        <div className="report-catalog-table-wrap">
          <table className="report-catalog-table payroll-register-table">
            <thead>
              <tr>
                <th scope="col">Employee</th>
                <th scope="col">Document</th>
                <th scope="col">Verification</th>
                <th scope="col">Expiry</th>
                <th scope="col">Evidence</th>
                <th scope="col">Risk</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.employee_name}</strong>
                    <span>{item.employee_code}</span>
                    <span>{item.uploaded_by_identifier || "Uploader pending"}</span>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <strong>{item.title}</strong>
                      <span>{item.category_name}</span>
                      <span>{item.document_number || "No document number"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(item.verification_status)}>{titleCase(item.verification_status)}</span>
                      <span className={statusClass(item.status)}>{titleCase(item.status)}</span>
                      <span>{item.verified_by_identifier || "Reviewer pending"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{formatDate(item.expires_on)}</span>
                      <span>{item.expiry_label}</span>
                      <span>{item.days_until_expiry ?? "Not tracked"} days</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span>{item.file_name || "No file"}</span>
                      <span>{item.mime_type || "Unknown type"}</span>
                      <span>{formatFileSize(item.file_size_bytes)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="payroll-register-stack">
                      <span className={statusClass(complianceRisk(item))}>{complianceRisk(item)}</span>
                      <span>{item.reupload_requested ? "Re-upload requested" : "No re-upload"}</span>
                      <span>{item.review_history.length} review steps</span>
                    </div>
                  </td>
                  <td>
                    <div className="report-row-actions">
                      <Link className="button button--secondary" href={`/hr-admin/employee-documents/${item.id}/review`}>
                        Review
                      </Link>
                      {item.artifact_id ? (
                        <Link className="button button--ghost" href={`/api/hr-admin/employee-documents/${item.id}/download`} prefetch={false}>
                          Download
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No document compliance rows match the selected filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar" aria-label="Document compliance pagination">
          <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
          <button className="button button--secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
