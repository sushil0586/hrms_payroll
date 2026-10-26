"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";

type Item = Record<string, unknown>;
type Props = {
  mode: "platform" | "tenant";
  recordCategories: string[];
  policies: Item[];
  legalHolds: Item[];
  requests: Item[];
  preview?: { categories: Item[]; destructive_execution_enabled: boolean };
  tenants?: Array<{ id: string; name: string }>;
  selectedTenantId?: string;
};

function value(item: Item, key: string) {
  return String(item[key] ?? "");
}

async function mutate(path: string, body: Item) {
  let response: Response;
  try {
    response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    const error = new Error("The service response was interrupted, so the request outcome is unconfirmed. Keep these values and refresh the request register before deciding whether to submit again.") as Error & { ambiguous?: boolean };
    error.ambiguous = true;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.detail || Object.values(payload)[0] || "Governance action failed."));
  return payload;
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["succeeded", "approved", "completed", "released"].includes(status)) return "success";
  if (["failed", "blocked", "rejected"].includes(status)) return "danger";
  if (["requested", "queued", "running", "active"].includes(status)) return "warning";
  return "neutral";
}

export function DataGovernanceWorkbench({ mode, recordCategories, policies, legalHolds, requests, preview, tenants = [], selectedTenantId = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorAmbiguous, setErrorAmbiguous] = useState(false);
  const [requestKey, setRequestKey] = useState("");

  async function run(key: string, operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key); setError(""); setErrorAmbiguous(false); setMessage("");
    try { await operation(); setMessage(success); router.refresh(); return true; }
    catch (next) {
      setError(next instanceof Error ? next.message : "Governance action failed.");
      setErrorAmbiguous(Boolean((next as Error & { ambiguous?: boolean }).ambiguous));
      return false;
    }
    finally { setBusy(""); }
  }

  return <>
    {busy || message || error ? <div aria-live="polite" className="form-status" role="status">
      {busy ? "Submitting the governed action..." : message}
      {error ? <span className="form-error" role="alert">{error}{errorAmbiguous ? "" : " Review the request before trying again."}</span> : null}
    </div> : null}

    {mode === "platform" ? <section className="section panel-card-soft tenant-console-panel" aria-labelledby="retention-policy-title">
      <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Approved rules</span><h2 id="retention-policy-title">Retention policy configuration</h2><p className="tenant-section-copy">Durations require an approved legal basis and approval reference. No statutory duration is inferred.</p></div><WorkspaceStatusBadge tone="warning">Evidence required</WorkspaceStatusBadge></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        void run("policy", () => mutate("/api/platform/data-governance", Object.fromEntries(data.entries())), "Retention policy recorded.").then((confirmed) => { if (confirmed) form.reset(); });
      }}>
        <label className="form-field"><span>Tenant</span><select className="input-control" defaultValue={selectedTenantId} name="tenant_id" required><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label className="form-field"><span>Jurisdiction</span><input className="input-control" name="jurisdiction" required /></label>
        <label className="form-field"><span>Record category</span><select className="input-control" name="record_category" required>{recordCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-field"><span>Retention days</span><input className="input-control" min="1" name="retention_days" required type="number" /></label>
        <label className="form-field"><span>Lifecycle date field</span><input className="input-control" name="lifecycle_date_field" required /></label>
        <label className="form-field"><span>Effective from</span><input className="input-control" name="effective_from" required type="date" /></label>
        <label className="form-field"><span>Legal basis reference</span><input className="input-control" name="legal_basis_ref" required /></label>
        <label className="form-field"><span>Approval reference</span><input className="input-control" name="approval_ref" required /></label>
        <input name="status" type="hidden" value="approved" />
        <AsyncActionButton pending={busy === "policy"} pendingLabel="Saving policy" type="submit">Save approved policy</AsyncActionButton>
      </form>
    </section> : null}

    {mode === "platform" ? <section className="section panel-card-soft tenant-console-panel" aria-labelledby="legal-hold-title">
      <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Preservation control</span><h2 id="legal-hold-title">Legal holds</h2><p className="tenant-section-copy">Place a documented hold to block deletion for the selected tenant or category.</p></div><WorkspaceStatusBadge tone="warning">Audited action</WorkspaceStatusBadge></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const form = event.currentTarget;
        void run("hold", () => mutate("/api/platform/data-governance/legal-holds", Object.fromEntries(data.entries())), "Legal hold placed.").then((confirmed) => { if (confirmed) form.reset(); });
      }}>
        <label className="form-field"><span>Tenant</span><select className="input-control" defaultValue={selectedTenantId} name="tenant_id" required><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label className="form-field"><span>Category</span><select className="input-control" name="record_category"><option value="">All categories</option>{recordCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-field"><span>Authority reference</span><input className="input-control" name="authority_ref" required /></label>
        <label className="form-field form-field--full"><span>Reason</span><textarea className="input-control" name="reason" required /></label>
        <AsyncActionButton pending={busy === "hold"} pendingLabel="Placing hold" type="submit">Place legal hold</AsyncActionButton>
      </form>
    </section> : null}

    {mode === "tenant" ? <section className="section panel-card-soft tenant-console-panel" aria-labelledby="governance-request-title">
      <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Maker step</span><h2 id="governance-request-title">Governed data request</h2><p className="tenant-section-copy">Requests require independent Platform Admin approval. Erasure remains blocked unless deployment governance explicitly enables it.</p></div><WorkspaceStatusBadge tone="warning">Independent approval</WorkspaceStatusBadge></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const categories = data.getAll("record_categories");
        if (!categories.length) { setErrorAmbiguous(false); setError("Select at least one record category."); return; }
        const stableRequestKey = requestKey || crypto.randomUUID();
        setRequestKey(stableRequestKey);
        const form = event.currentTarget;
        void run("request", () => mutate("/api/tenant-admin/data-governance/requests", {
          request_type: data.get("request_type"), reason: data.get("reason"), idempotency_key: stableRequestKey, scope: { record_categories: categories },
        }), "Governance request submitted for independent approval.").then((confirmed) => { if (confirmed) { form.reset(); setRequestKey(""); } });
      }}>
        <label className="form-field"><span>Request type</span><select className="input-control" name="request_type"><option value="export">Protected export</option><option value="erasure">Controlled erasure assessment</option></select></label>
        <fieldset className="form-field form-field--full"><legend>Record categories</legend>{recordCategories.map((category) => <label key={category} className="selection-row"><input name="record_categories" type="checkbox" value={category} />{category.replaceAll("_", " ")}</label>)}</fieldset>
        <label className="form-field form-field--full"><span>Business reason</span><textarea className="input-control" name="reason" required /></label>
        <AsyncActionButton pending={busy === "request"} pendingLabel="Submitting request" type="submit">Submit request</AsyncActionButton>
      </form>
    </section> : null}

    <section className="section panel-card-soft tenant-console-panel" aria-labelledby="impact-preview-title">
      <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Read-only preview</span><h2 id="impact-preview-title">Retention and erasure impact</h2><p className="tenant-section-copy">Counts and blockers describe the current governed scope; this preview performs no destructive action.</p></div><span className="record-chip">{preview?.categories.length ?? 0} categories</span></div>
      {preview && !preview.destructive_execution_enabled ? <div className="notice notice--warning">Irreversible erasure is disabled by deployment policy.</div> : null}
      <WorkspaceTableScrollRegion label="Retention impact table" className="table-shell workspace-table-region"><table className="workspace-data-table"><thead><tr><th>Category</th><th>Records</th><th>Expired</th><th>Policy</th><th>Holds</th><th>Eligibility</th></tr></thead><tbody>
        {(preview?.categories ?? []).map((item) => <tr key={value(item, "record_category")}><td>{value(item, "record_category").replaceAll("_", " ")}</td><td>{value(item, "record_count")}</td><td>{value(item, "eligible_record_count")}</td><td>{value(item, "retention_days") || "Not approved"}</td><td>{value(item, "legal_hold_count")}</td><td><WorkspaceStatusBadge tone={item.eligible ? "success" : "danger"}>{item.eligible ? "Eligible for governed review" : "Blocked"}</WorkspaceStatusBadge>{!item.eligible ? <small>{value(item, "blockers")}</small> : null}</td></tr>)}
      </tbody></table></WorkspaceTableScrollRegion>
    </section>

    <section className="section panel-card-soft tenant-console-panel"><div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Governed lifecycle</span><h2>Request status</h2><p className="tenant-section-copy">Tenant requests remain read-only here after submission; approval and execution belong to Platform governance.</p></div><span className="record-chip">{requests.length} requests</span></div><WorkspaceTableScrollRegion label="Governance request status table" className="table-shell workspace-table-region"><table className="workspace-data-table"><thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Attempts</th><th>Action</th></tr></thead><tbody>
      {requests.map((item) => <tr key={value(item, "id")}><td>{value(item, "request_type").replaceAll("_", " ")}</td><td><WorkspaceStatusBadge tone={statusTone(value(item, "status"))}>{value(item, "status")}</WorkspaceStatusBadge></td><td>{value(item, "reason")}</td><td>{value(item, "attempt_count")}</td><td>{mode === "platform" && value(item, "status") === "requested" ? <AsyncActionButton pending={busy === value(item, "id")} pendingLabel="Approving" onClick={() => void run(value(item, "id"), () => mutate(`/api/platform/data-governance/requests/${value(item, "id")}/actions`, { action: "approve" }), "Request approved.")}>Approve</AsyncActionButton> : mode === "platform" && ["approved", "failed"].includes(value(item, "status")) ? <AsyncActionButton pending={busy === value(item, "id")} pendingLabel="Queueing" onClick={() => void run(value(item, "id"), () => mutate(`/api/platform/data-governance/requests/${value(item, "id")}/actions`, { action: "dispatch" }), "Request queued.")}>Queue job</AsyncActionButton> : "Read only"}</td></tr>)}
      {!requests.length ? <tr><td colSpan={5}>No governed data requests have been submitted.</td></tr> : null}
    </tbody></table></WorkspaceTableScrollRegion></section>

    <section className="section panel-card-soft tenant-console-panel"><div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Preservation controls</span><h2>Active and released holds</h2><p className="tenant-section-copy">{legalHolds.length} hold record(s). Hold history is retained after release.</p></div><span className="record-chip">{legalHolds.filter((item) => value(item, "status") === "active").length} active</span></div>
      {mode === "platform" ? legalHolds.some((item) => value(item, "status") === "active") ? <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget); const holdId = String(data.get("hold_id") || "");
        void run(`release-${holdId}`, () => mutate(`/api/platform/data-governance/legal-holds/${holdId}/release`, { reason: data.get("release_reason") }), "Legal hold released with retained audit history.");
      }}><label className="form-field"><span>Active legal hold</span><select className="input-control" name="hold_id" required>{legalHolds.filter((item) => value(item, "status") === "active").map((item) => <option key={value(item, "id")} value={value(item, "id")}>{value(item, "authority_ref")} - {value(item, "record_category") || "All categories"}</option>)}</select></label><label className="form-field"><span>Release reason</span><textarea className="input-control" name="release_reason" required /></label><AsyncActionButton pending={busy.startsWith("release-")} pendingLabel="Releasing hold" type="submit">Release legal hold</AsyncActionButton></form> : <div className="notice notice--compact"><strong>No active legal holds</strong><span className="muted">There is no current preservation block to release for this tenant.</span></div> : null}
    </section>
    <section className="section panel-card-soft tenant-console-panel"><div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Published rules</span><h2>Applicable policies</h2><p className="tenant-section-copy">{policies.length} configured policy record(s). The register preserves jurisdiction, lifecycle, and approval evidence.</p></div><span className="record-chip">Read only</span></div>
      <WorkspaceTableScrollRegion label="Applicable retention policies table" className="table-shell workspace-table-region"><table className="workspace-data-table"><thead><tr><th>Category</th><th>Jurisdiction</th><th>Days</th><th>Lifecycle field</th><th>Status</th><th>Approval</th></tr></thead><tbody>{policies.map((item) => <tr key={value(item, "id")}><td>{value(item, "record_category").replaceAll("_", " ")}</td><td>{value(item, "jurisdiction")}</td><td>{value(item, "retention_days")}</td><td>{value(item, "lifecycle_date_field")}</td><td><WorkspaceStatusBadge tone={statusTone(value(item, "status"))}>{value(item, "status")}</WorkspaceStatusBadge></td><td>{value(item, "approval_ref") || "Not approved"}</td></tr>)}{!policies.length ? <tr><td colSpan={6}>No retention policies apply to this tenant yet.</td></tr> : null}</tbody></table></WorkspaceTableScrollRegion>
    </section>
  </>;
}
