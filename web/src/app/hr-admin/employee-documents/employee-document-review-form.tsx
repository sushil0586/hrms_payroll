"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { HrAdminDocumentOptions, HrAdminEmployeeDocument, HrAdminEmployeeDocumentWriteInput } from "@/lib/types";

type Props = {
  document: HrAdminEmployeeDocument;
  initialValue: HrAdminEmployeeDocumentWriteInput;
  options: HrAdminDocumentOptions;
  itemId: string;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
  canDownload?: boolean;
  onStateChange?: (state: { busy: boolean; dirty: boolean }) => void;
};
function humanize(value: string) { return value.replaceAll("_", " "); }
function tone(status: string) { return status === "verified" ? "success" : status === "pending" ? "warning" : status === "rejected" || status === "expired" ? "danger" : "neutral"; }
function snapshot(form: HTMLFormElement) { return JSON.stringify(Array.from(new FormData(form).entries()).sort(([a], [b]) => a.localeCompare(b))); }

export function EmployeeDocumentReviewForm({ document, initialValue, options, itemId, cancelHref = "/hr-admin/employee-documents", successHref = "/hr-admin/employee-documents?review_saved=1", compact = false, canDownload = false, onStateChange }: Props) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const original = useRef("");
  const submitting = useRef(false);
  const leaving = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState(initialValue.verification_status);
  const [reupload, setReupload] = useState(initialValue.reupload_requested);
  const metadata = useRef<HTMLDetailsElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 0); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (ready && form.current) { original.current = snapshot(form.current); if (compact) form.current.querySelector<HTMLSelectElement>('#review-verification_status')?.focus(); } }, [ready, compact]);
  useEffect(() => { if (Object.keys(fieldErrors).some(key => ["title", "status", "document_number", "issued_on", "expires_on"].includes(key)) && metadata.current) metadata.current.open = true; }, [fieldErrors]);
  useEffect(() => { onStateChange?.({ busy, dirty }); }, [busy, dirty, onStateChange]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { if (!leaving.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname.startsWith("/api/") || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      if (submitting.current || (dirty && !window.confirm("Discard unsaved changes?"))) { event.preventDefault(); event.stopImmediatePropagation(); }
      else { leaving.current = true; window.setTimeout(() => { leaving.current = false; }, 0); }
    };
    window.document.addEventListener("click", guardLink, true);
    return () => window.document.removeEventListener("click", guardLink, true);
  }, [dirty, busy]);

  function cancel() {
    if (submitting.current || (dirty && !window.confirm("Discard unsaved changes?"))) return;
    router.push(cancelHref);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const body = { title: String(data.get("title") ?? ""), status: String(data.get("status") ?? ""), verification_status: String(data.get("verification_status") ?? ""), document_number: String(data.get("document_number") ?? ""), issued_on: String(data.get("issued_on") ?? "") || null, expires_on: String(data.get("expires_on") ?? "") || null, reupload_requested: data.get("reupload_requested") === "true", rejection_reason: String(data.get("rejection_reason") ?? "") };
    setError(""); setFieldErrors({}); submitting.current = true; setBusy(true); onStateChange?.({ busy: true, dirty });
    let response: Response;
    try { response = await fetch(`/api/hr-admin/employee-documents/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
    catch { setError("The review outcome could not be confirmed. Check the queue before trying again."); submitting.current = false; setBusy(false); return; }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errors: Record<string, string> = {};
      if (payload && typeof payload === "object") for (const [key, value] of Object.entries(payload)) if (Array.isArray(value)) errors[key] = value.map(String).join(" ");
      setFieldErrors(errors); setError(response.status >= 500 ? "The review outcome could not be confirmed. Check the queue before trying again." : payload?.detail || "Review was not saved. Check the highlighted fields and try again."); submitting.current = false; setBusy(false); return;
    }
    setDirty(false); onStateChange?.({ busy: true, dirty: false });
    // A fresh document navigation avoids competing push/refresh updates retaining the saved dialog.
    leaving.current = true;
    window.location.assign(new URL(successHref, window.location.origin));
  }
  function revealFocusedControl(event: React.FocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!target.matches("input, select, textarea, summary")) return;
    const box = target.getBoundingClientRect();
    const footerTop = form.current?.querySelector("footer")?.getBoundingClientRect().top ?? window.innerHeight;
    const headerBottom = form.current?.closest('[role="dialog"]')?.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    if (box.bottom > Math.min(footerTop, window.innerHeight) - 8 || box.top < headerBottom + 8) target.scrollIntoView({ block: "center" });
  }
  function invalid(name: string) { return { "aria-invalid": Boolean(fieldErrors[name]), "aria-describedby": fieldErrors[name] ? `review-error-${name}` : undefined }; }
  function fieldError(name: string) { return fieldErrors[name] ? <span className="field-error-text" id={`review-error-${name}`}>{fieldErrors[name]}</span> : null; }
  return <form ref={form} className={`document-review-form${compact ? " document-review-form--modal" : ""}`} data-hydrated={ready ? "true" : "false"} onSubmit={submit} onFocusCapture={revealFocusedControl} onChange={() => { if (form.current) setDirty(snapshot(form.current) !== original.current); }}>
    <section className="document-review-context" aria-label="Evidence to review">
      <div><strong>{document.employee_name} · {document.employee_code}</strong><p>{document.category_name} · {document.file_name}</p></div>
      <WorkspaceStatusBadge tone={tone(document.verification_status)}>{humanize(document.verification_status)}</WorkspaceStatusBadge>
      <p>{document.review_status_label} · {document.expires_on ? `Expires ${document.expires_on}` : "No expiry recorded"}</p>
      {canDownload && document.artifact_id ? <a className="button button--secondary button--compact" href={`/api/hr-admin/employee-documents/${itemId}/download`}>Download current file</a> : <p className="muted">{document.artifact_id ? "Downloading requires document export access." : "No stored file is linked to this record."}</p>}
    </section>
    {error ? <div className="notice notice--error" role="alert" ref={errorRef} tabIndex={-1}><strong>Review not confirmed</strong><span>{error}</span></div> : null}
    <fieldset disabled={busy || !ready} className="document-review-fields">
      <legend>Review decision</legend>
      <div className="form-grid">
        <div className="form-field"><label htmlFor="review-verification_status">Verification status</label><select className="input-control" id="review-verification_status" name="verification_status" value={verification} onChange={e => setVerification(e.target.value)} {...invalid("verification_status")}>{options.verification_statuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{fieldError("verification_status")}</div>
        <div className="form-field"><label htmlFor="review-reupload_requested">Re-upload requested</label><select className="input-control" id="review-reupload_requested" name="reupload_requested" value={String(reupload)} onChange={e => setReupload(e.target.value === "true")} {...invalid("reupload_requested")}><option value="false">No</option><option value="true">Yes</option></select>{fieldError("reupload_requested")}</div>
        <div className="form-field form-field--full"><label htmlFor="review-rejection_reason">Rejection reason or review note</label><textarea className="input-control" id="review-rejection_reason" name="rejection_reason" rows={3} defaultValue={initialValue.rejection_reason} {...invalid("rejection_reason")} />{fieldError("rejection_reason")}</div>
      </div>
      <p className="document-decision-effect" role="status">{verification === "verified" ? "Verified clears the rejection reason and any re-upload request. Review notes are recorded only when verification status changes." : verification === "rejected" || reupload ? "The employee will see the document returned for correction." : verification === "expired" ? "The employee will see the document as expired." : "The document remains pending HR review."}</p>
      <details className="document-review-metadata" ref={metadata}>
        <summary tabIndex={0}>Document metadata</summary>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="review-title">Title</label><input className="input-control" id="review-title" name="title" defaultValue={initialValue.title} {...invalid("title")} />{fieldError("title")}</div>
          <div className="form-field"><label htmlFor="review-status">Record status</label><select className="input-control" id="review-status" name="status" defaultValue={initialValue.status} {...invalid("status")}>{options.employee_document_statuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{fieldError("status")}</div>
          <div className="form-field"><label htmlFor="review-document_number">Document number</label><input className="input-control" id="review-document_number" name="document_number" defaultValue={initialValue.document_number} {...invalid("document_number")} />{fieldError("document_number")}</div>
          <div className="form-field"><label htmlFor="review-issued_on">Issued on</label><input className="input-control" type="date" id="review-issued_on" name="issued_on" defaultValue={initialValue.issued_on ?? ""} {...invalid("issued_on")} />{fieldError("issued_on")}</div>
          <div className="form-field"><label htmlFor="review-expires_on">Expires on</label><input className="input-control" type="date" id="review-expires_on" name="expires_on" defaultValue={initialValue.expires_on ?? ""} {...invalid("expires_on")} />{fieldError("expires_on")}</div>
        </div>
      </details>
    </fieldset>
    <details className="document-review-history"><summary tabIndex={0}>File details and history</summary>
      <p>{document.mime_type || "Unknown file type"} · {document.file_size_bytes ? `${document.file_size_bytes} bytes` : "Size not recorded"} · Uploaded by {document.uploaded_by_identifier || "Unknown"}</p>
      <h3>Version history</h3>{document.version_history.length ? <ul>{document.version_history.map(v => <li key={v.id}>Version {v.version_number} · {v.file_name} · {humanize(v.verification_status)}</li>)}</ul> : <p>No version history recorded.</p>}
      <h3>Review history</h3>{document.review_history.length ? <ul>{document.review_history.map(h => <li key={h.id}>{h.previous_status || "new"} → {h.new_status} · {h.actor_identifier || "Unknown"} · {h.created_at}<p>{h.comment || "No comment"}</p></li>)}</ul> : <p>No review history yet.</p>}
    </details>
    <footer className="document-review-footer"><span className="muted">Saving returns to the document queue.</span><button className="button button--secondary" type="button" disabled={busy} onClick={cancel}>Cancel</button><button className="button button--primary" type="submit" disabled={busy || !ready}>{busy ? "Saving review…" : "Save review"}</button></footer>
  </form>;
}
