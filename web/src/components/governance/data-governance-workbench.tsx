"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AsyncActionButton } from "@/components/patterns/async-action-button";

type Item = Record<string, unknown>;
type Props = {
  mode: "platform" | "tenant";
  recordCategories: string[];
  policies: Item[];
  legalHolds: Item[];
  requests: Item[];
  preview?: { categories: Item[]; destructive_execution_enabled: boolean };
  tenants?: Array<{ id: string; name: string }>;
};

function value(item: Item, key: string) {
  return String(item[key] ?? "");
}

async function mutate(path: string, body: Item) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.detail || Object.values(payload)[0] || "Governance action failed."));
  return payload;
}

export function DataGovernanceWorkbench({ mode, recordCategories, policies, legalHolds, requests, preview, tenants = [] }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key); setError(""); setMessage("");
    try { await operation(); setMessage(success); router.refresh(); }
    catch (next) { setError(next instanceof Error ? next.message : "Governance action failed."); }
    finally { setBusy(""); }
  }

  return <>
    <div aria-live="polite" className="form-status" role="status">
      {busy ? "Submitting the governed action..." : message}
      {error ? <span className="form-error" role="alert">{error} Retry after correcting the request or restoring connectivity.</span> : null}
    </div>

    {mode === "platform" ? <section className="section panel-card-soft" aria-labelledby="retention-policy-title">
      <h2 id="retention-policy-title">Retention policy configuration</h2>
      <p>Durations require an approved legal basis and approval reference. No statutory duration is inferred.</p>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        void run("policy", () => mutate("/api/platform/data-governance", Object.fromEntries(data.entries())), "Retention policy recorded.");
      }}>
        <label className="form-field"><span>Tenant</span><select name="tenant_id" required><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label className="form-field"><span>Jurisdiction</span><input name="jurisdiction" required /></label>
        <label className="form-field"><span>Record category</span><select name="record_category" required>{recordCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-field"><span>Retention days</span><input min="1" name="retention_days" required type="number" /></label>
        <label className="form-field"><span>Lifecycle date field</span><input name="lifecycle_date_field" required /></label>
        <label className="form-field"><span>Effective from</span><input name="effective_from" required type="date" /></label>
        <label className="form-field"><span>Legal basis reference</span><input name="legal_basis_ref" required /></label>
        <label className="form-field"><span>Approval reference</span><input name="approval_ref" required /></label>
        <input name="status" type="hidden" value="approved" />
        <AsyncActionButton pending={busy === "policy"} pendingLabel="Saving policy" type="submit">Save approved policy</AsyncActionButton>
      </form>
    </section> : null}

    {mode === "platform" ? <section className="section panel-card-soft" aria-labelledby="legal-hold-title">
      <h2 id="legal-hold-title">Legal holds</h2>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        void run("hold", () => mutate("/api/platform/data-governance/legal-holds", Object.fromEntries(data.entries())), "Legal hold placed.");
      }}>
        <label className="form-field"><span>Tenant</span><select name="tenant_id" required><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label className="form-field"><span>Category</span><select name="record_category"><option value="">All categories</option>{recordCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-field"><span>Authority reference</span><input name="authority_ref" required /></label>
        <label className="form-field form-field--full"><span>Reason</span><textarea name="reason" required /></label>
        <AsyncActionButton pending={busy === "hold"} pendingLabel="Placing hold" type="submit">Place legal hold</AsyncActionButton>
      </form>
    </section> : null}

    {mode === "tenant" ? <section className="section panel-card-soft" aria-labelledby="governance-request-title">
      <h2 id="governance-request-title">Governed data request</h2>
      <p>Requests require independent Platform Admin approval. Erasure remains blocked unless deployment governance explicitly enables it.</p>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const categories = data.getAll("record_categories");
        void run("request", () => mutate("/api/tenant-admin/data-governance/requests", {
          request_type: data.get("request_type"), reason: data.get("reason"), idempotency_key: crypto.randomUUID(), scope: { record_categories: categories },
        }), "Governance request submitted for independent approval.");
      }}>
        <label className="form-field"><span>Request type</span><select name="request_type"><option value="export">Protected export</option><option value="erasure">Controlled erasure assessment</option></select></label>
        <fieldset className="form-field form-field--full"><legend>Record categories</legend>{recordCategories.map((category) => <label key={category} className="selection-row"><input name="record_categories" type="checkbox" value={category} />{category.replaceAll("_", " ")}</label>)}</fieldset>
        <label className="form-field form-field--full"><span>Business reason</span><textarea name="reason" required /></label>
        <AsyncActionButton pending={busy === "request"} pendingLabel="Submitting request" type="submit">Submit request</AsyncActionButton>
      </form>
    </section> : null}

    <section className="section panel-card-soft" aria-labelledby="impact-preview-title">
      <h2 id="impact-preview-title">Retention and erasure impact</h2>
      {preview && !preview.destructive_execution_enabled ? <div className="notice notice--warning">Irreversible erasure is disabled by deployment policy.</div> : null}
      <div className="table-shell"><table><thead><tr><th>Category</th><th>Records</th><th>Expired</th><th>Policy</th><th>Holds</th><th>Eligibility</th></tr></thead><tbody>
        {(preview?.categories ?? []).map((item) => <tr key={value(item, "record_category")}><td>{value(item, "record_category")}</td><td>{value(item, "record_count")}</td><td>{value(item, "eligible_record_count")}</td><td>{value(item, "retention_days") || "Not approved"}</td><td>{value(item, "legal_hold_count")}</td><td>{item.eligible ? "Eligible for governed review" : value(item, "blockers")}</td></tr>)}
      </tbody></table></div>
    </section>

    <section className="section panel-card-soft"><h2>Request status</h2><div className="table-shell"><table><thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Attempts</th><th>Action</th></tr></thead><tbody>
      {requests.map((item) => <tr key={value(item, "id")}><td>{value(item, "request_type")}</td><td>{value(item, "status")}</td><td>{value(item, "reason")}</td><td>{value(item, "attempt_count")}</td><td>{mode === "platform" && value(item, "status") === "requested" ? <AsyncActionButton pending={busy === value(item, "id")} pendingLabel="Approving" onClick={() => void run(value(item, "id"), () => mutate(`/api/platform/data-governance/requests/${value(item, "id")}/actions`, { action: "approve" }), "Request approved.")}>Approve</AsyncActionButton> : mode === "platform" && ["approved", "failed"].includes(value(item, "status")) ? <AsyncActionButton pending={busy === value(item, "id")} pendingLabel="Queueing" onClick={() => void run(value(item, "id"), () => mutate(`/api/platform/data-governance/requests/${value(item, "id")}/actions`, { action: "dispatch" }), "Request queued.")}>Queue job</AsyncActionButton> : "Read only"}</td></tr>)}
    </tbody></table></div></section>

    <section className="section panel-card-soft"><h2>Active and released holds</h2><p>{legalHolds.length} hold record(s). Hold history is retained after release.</p>
      {mode === "platform" && legalHolds.some((item) => value(item, "status") === "active") ? <form className="form-grid" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget); const holdId = String(data.get("hold_id") || "");
        void run(`release-${holdId}`, () => mutate(`/api/platform/data-governance/legal-holds/${holdId}/release`, { reason: data.get("release_reason") }), "Legal hold released with retained audit history.");
      }}><label className="form-field"><span>Active legal hold</span><select name="hold_id" required>{legalHolds.filter((item) => value(item, "status") === "active").map((item) => <option key={value(item, "id")} value={value(item, "id")}>{value(item, "authority_ref")} - {value(item, "record_category") || "All categories"}</option>)}</select></label><label className="form-field"><span>Release reason</span><textarea name="release_reason" required /></label><AsyncActionButton pending={busy.startsWith("release-")} pendingLabel="Releasing hold" type="submit">Release legal hold</AsyncActionButton></form> : null}
    </section>
    <section className="section panel-card-soft"><h2>Applicable policies</h2><p>{policies.length} configured policy record(s).</p></section>
  </>;
}
