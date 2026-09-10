"use client";

import { useState } from "react";

import type {
  HrAdminOptionItem,
  HrAdminPolicyOptions,
  HrAdminShiftRosterRollout,
  HrAdminShiftRosterTemplate,
  HrAdminShiftRosterTemplateRolloutResult,
} from "@/lib/types";

type Props = {
  options: HrAdminPolicyOptions;
  templates: HrAdminShiftRosterTemplate[];
  rollouts: HrAdminShiftRosterRollout[];
};

function selectOptions(items: HrAdminOptionItem[]) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

function formatApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to run roster rollout.";
  }
  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }
  const messages = Object.entries(payload)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${key}: ${String(item)}`);
      }
      if (typeof value === "string") {
        return `${key}: ${value}`;
      }
      return [];
    });
  return messages[0] ?? "Unable to run roster rollout.";
}

export function ShiftRosterRolloutPanel({ options, templates, rollouts }: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HrAdminShiftRosterTemplateRolloutResult | null>(null);
  const [error, setError] = useState("");

  async function runRollout(dryRun: boolean) {
    setError("");
    setResult(null);
    if (!templateId || !effectiveFrom) {
      setError("Choose a roster template and an effective start date first.");
      return;
    }
    if (employeeIds.length === 0 && !departmentId) {
      setError("Choose employees directly or target a department for rollout.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/hr-admin/shift-roster-templates/rollout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          employee_ids: employeeIds,
          legal_entity_id: legalEntityId || null,
          branch_id: branchId || null,
          location_id: locationId || null,
          department_id: departmentId || null,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
          is_primary: isPrimary,
          dry_run: dryRun,
        }),
      });
      const payload = (await response.json().catch(() => null)) as HrAdminShiftRosterTemplateRolloutResult | { detail?: string } | null;
      if (!response.ok || !payload || !("target_count" in payload)) {
        setError(formatApiError(payload));
        return;
      }
      setResult(payload);
    } catch {
      setError("Unable to run roster rollout.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="workspace-card workspace-card--compact">
        <div className="workspace-card__header">
          <div>
            <h2>Roster rollout</h2>
            <p className="section-copy">Preview or apply a published roster template across employee scope without manually creating every shift assignment one at a time.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="form-field"><span className="muted">Roster template</span><select className="input-control" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{selectOptions(templates.map((item) => ({ id: item.id, name: `${item.name} (${item.status})` })))}</select></label>
          <label className="form-field"><span className="muted">Legal entity scope</span><select className="input-control" value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)}>{selectOptions(options.legal_entities)}</select></label>
          <label className="form-field"><span className="muted">Branch scope</span><select className="input-control" value={branchId} onChange={(e) => setBranchId(e.target.value)}>{selectOptions(options.branches)}</select></label>
          <label className="form-field"><span className="muted">Location scope</span><select className="input-control" value={locationId} onChange={(e) => setLocationId(e.target.value)}>{selectOptions(options.locations)}</select></label>
          <label className="form-field"><span className="muted">Department scope</span><select className="input-control" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>{selectOptions(options.departments)}</select></label>
          <label className="form-field"><span className="muted">Effective from</span><input className="input-control" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
          <label className="form-field"><span className="muted">Effective to</span><input className="input-control" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} /></label>
          <label className="form-field">
            <span className="muted">Target employees</span>
            <select
              className="input-control input-control--multiselect"
              multiple
              size={5}
              value={employeeIds}
              onChange={(e) => setEmployeeIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
            >
              {options.employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toggle-field-list">
          <label className="toggle-field">
            <div>
              <strong>Create as primary assignments</strong>
              <p className="section-copy">Primary assignments win over secondary windows when multiple shift assignments could otherwise match the same employee and date.</p>
            </div>
            <input checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} type="checkbox" />
          </label>
        </div>
        <div className="form-actions-bar">
          <span className="muted">Use preview first when rolling out a new roster pattern to a broad team scope.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--secondary" disabled={isLoading} onClick={() => runRollout(true)} type="button">{isLoading ? "Running..." : "Preview rollout"}</button>
            <button className="button button--primary" disabled={isLoading} onClick={() => runRollout(false)} type="button">{isLoading ? "Running..." : "Apply rollout"}</button>
          </div>
        </div>
        {error ? <div className="notice"><strong>Rollout unavailable.</strong><span className="muted">{error}</span></div> : null}
        {result ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Summary</span>
              <span className="detail-value">{result.summary}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Targeted</span>
              <span className="detail-value">{result.target_count}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created / ready</span>
              <span className="detail-value">{result.created_count}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Skipped</span>
              <span className="detail-value">{result.skipped_count}</span>
            </div>
            {result.items.map((item) => (
              <div className="detail-row" key={`${item.employee_id}-${item.status}`}>
                <span className="detail-label">{item.employee_name}</span>
                <span className="detail-value">{`${item.status} • ${item.reason}`}</span>
              </div>
            ))}
          </div>
        ) : null}
        {rollouts.length ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Recent rollout history</span>
              <span className="detail-value">{rollouts.length} recent run(s)</span>
            </div>
            {rollouts.map((item) => (
              <div className="detail-row" key={item.id}>
                <span className="detail-label">{item.template_name}</span>
                <span className="detail-value">{`${item.created_at.slice(0, 16).replace("T", " ")} • ${item.scope_labels.join(" • ")} • ${item.summary}`}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
