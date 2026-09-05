"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import { PlatformGovernanceFormBanner } from "@/components/patterns/platform-governance-form-banner";
import { GovernanceLockHint, isGovernanceFieldLocked } from "@/components/patterns/platform-governance-locks";
import type {
  HrAdminLeaveApprovalRoute,
  HrAdminLeavePolicy,
  HrAdminLeavePolicyPreview,
  HrAdminLeavePolicyAdvancedConfig,
  HrAdminLeavePolicyWriteInput,
  HrAdminPolicyOptions,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminLeavePolicyWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
  item?: HrAdminLeavePolicy;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save leave policy.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save leave policy.");
}

function selectOptions(items: Array<{ id: string; name: string }>) {
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

const approvalRouteOptions: Array<{ value: HrAdminLeaveApprovalRoute; label: string }> = [
  { value: "manager_only", label: "Manager only" },
  { value: "manager_then_second_level", label: "Manager then second-level manager" },
  { value: "manager_then_hr", label: "Manager then HR" },
  { value: "manager_second_level_hr", label: "Manager, second-level manager, then HR" },
];

const entitlementGrantModeOptions = [
  { value: "scheduled", label: "Scheduled accrual" },
  { value: "upfront", label: "Grant upfront" },
] as const;

const entitlementProrationModeOptions = [
  { value: "none", label: "No proration" },
  { value: "by_join_month", label: "Prorate by join month" },
] as const;

const carryForwardModeOptions = [
  { value: "limited", label: "Limited carry forward" },
  { value: "none", label: "No carry forward" },
] as const;

const probationAccrualModeOptions = [
  { value: "accrue", label: "Accrue during probation" },
  { value: "defer", label: "Defer until confirmation" },
] as const;

export function LeavePolicyForm({ initialValue, mode, options, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewEmployeeId, setPreviewEmployeeId] = useState(options.employees[0]?.id ?? "");
  const [previewUnits, setPreviewUnits] = useState("1.00");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<HrAdminLeavePolicyPreview | null>(null);
  const leaveTypeLocked = isGovernanceFieldLocked(item, "leave_type_id");
  const codeLocked = isGovernanceFieldLocked(item, "code");
  const nameLocked = isGovernanceFieldLocked(item, "name");
  const statusLocked = isGovernanceFieldLocked(item, "status");
  const effectiveFromLocked = isGovernanceFieldLocked(item, "effective_from");
  const effectiveToLocked = isGovernanceFieldLocked(item, "effective_to");
  const accrualFrequencyLocked = isGovernanceFieldLocked(item, "accrual_frequency");
  const annualEntitlementLocked = isGovernanceFieldLocked(item, "annual_entitlement");
  const maxCarryForwardLocked = isGovernanceFieldLocked(item, "max_carry_forward");
  const maxConsecutiveDaysLocked = isGovernanceFieldLocked(item, "max_consecutive_days");
  const minDaysPerRequestLocked = isGovernanceFieldLocked(item, "min_days_per_request");
  const noticeDaysLocked = isGovernanceFieldLocked(item, "notice_days_required");
  const genderRestrictionLocked = isGovernanceFieldLocked(item, "gender_restriction");
  const maritalStatusRestrictionLocked = isGovernanceFieldLocked(item, "marital_status_restriction");
  const minimumServiceDaysLocked = isGovernanceFieldLocked(item, "minimum_service_days");
  const allowHalfDayLocked = isGovernanceFieldLocked(item, "allow_half_day");
  const allowBackdatedLocked = isGovernanceFieldLocked(item, "allow_backdated_application");
  const allowOverlapLocked = isGovernanceFieldLocked(item, "allow_weekend_holiday_overlap");
  const sandwichRuleLocked = isGovernanceFieldLocked(item, "sandwich_rule_enabled");
  const probationEligibleLocked = isGovernanceFieldLocked(item, "is_probation_eligible");
  const configSnapshotLocked = isGovernanceFieldLocked(item, "config_snapshot");

  function update<Key extends keyof HrAdminLeavePolicyWriteInput>(key: Key, value: HrAdminLeavePolicyWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function updateAdvanced(value: HrAdminLeavePolicyAdvancedConfig) {
    setFormValue((current) => ({ ...current, config_snapshot: value }));
  }

  function updateApproval<Key extends keyof HrAdminLeavePolicyAdvancedConfig["approval"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["approval"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      approval: {
        ...formValue.config_snapshot.approval,
        [key]: value,
      },
    });
  }

  function updateEvidence<Key extends keyof HrAdminLeavePolicyAdvancedConfig["evidence"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["evidence"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      evidence: {
        ...formValue.config_snapshot.evidence,
        [key]: value,
      },
    });
  }

  function updateEntitlement<Key extends keyof HrAdminLeavePolicyAdvancedConfig["entitlement"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["entitlement"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      entitlement: {
        ...formValue.config_snapshot.entitlement,
        [key]: value,
      },
    });
  }

  function updateOperations<Key extends keyof HrAdminLeavePolicyAdvancedConfig["operations"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["operations"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      operations: {
        ...formValue.config_snapshot.operations,
        [key]: value,
      },
    });
  }

  function updateLifecycle<Key extends keyof HrAdminLeavePolicyAdvancedConfig["lifecycle"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["lifecycle"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      lifecycle: {
        ...formValue.config_snapshot.lifecycle,
        [key]: value,
      },
    });
  }

  function updateHolidayGovernance<Key extends keyof HrAdminLeavePolicyAdvancedConfig["holiday_governance"]>(
    key: Key,
    value: HrAdminLeavePolicyAdvancedConfig["holiday_governance"][Key],
  ) {
    updateAdvanced({
      ...formValue.config_snapshot,
      holiday_governance: {
        ...formValue.config_snapshot.holiday_governance,
        [key]: value,
      },
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "edit" && item && item.can_edit_directly === false) {
      setError("This record cannot be edited directly in its current governance state.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    const response = await fetch(mode === "create" ? "/api/hr-admin/leave-policies" : `/api/hr-admin/leave-policies/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/leave-policies");
    router.refresh();
  }

  async function handlePreview() {
    setPreviewError("");
    setPreviewResult(null);
    if (!previewEmployeeId) {
      setPreviewError("Select an employee for preview.");
      return;
    }
    if (!formValue.leave_type_id) {
      setPreviewError("Select a leave type before previewing the route.");
      return;
    }
    setIsPreviewLoading(true);
    const response = await fetch("/api/hr-admin/leave-policies/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: previewEmployeeId,
        leave_type_id: formValue.leave_type_id,
        requested_units: previewUnits,
        policy_id: itemId ?? null,
        config_snapshot: formValue.config_snapshot,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPreviewError(getErrorMessage(payload));
      setIsPreviewLoading(false);
      return;
    }
    setPreviewResult(payload as HrAdminLeavePolicyPreview);
    setIsPreviewLoading(false);
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2 className="section-heading-soft">{mode === "create" ? "Leave policy" : "Edit leave policy"}</h2>
            <p className="section-copy section-copy-soft">Define entitlement, timing, eligibility, and request behavior.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.status}</strong> status</span>
            <span className="queue-summary-chip"><strong>{formValue.accrual_frequency}</strong> accrual</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          {mode === "edit" && item ? <PlatformGovernanceFormBanner detachPath={`/api/hr-admin/leave-policies/${itemId}/detach`} item={item} /> : null}
          <FormSection title="Identity and timing" description="Start with the linked leave type, policy identity, and effective dates.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Leave type</span><select className="input-control" disabled={leaveTypeLocked} value={formValue.leave_type_id ?? ""} onChange={(e) => update("leave_type_id", e.target.value || null)}>{selectOptions(options.leave_types)}</select><GovernanceLockHint fieldPath="leave_type_id" item={item} /></label>
              <label className="form-field"><span className="muted">Code</span><input className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} /><GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} /><GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" disabled={statusLocked} value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.leave_policy_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="status" item={item} /></label>
              <label className="form-field"><span className="muted">Effective from</span><input className="input-control" disabled={effectiveFromLocked} type="date" value={formValue.effective_from ?? ""} onChange={(e) => update("effective_from", e.target.value || null)} /><GovernanceLockHint fieldPath="effective_from" item={item} /></label>
              <label className="form-field"><span className="muted">Effective to</span><input className="input-control" disabled={effectiveToLocked} type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} /><GovernanceLockHint fieldPath="effective_to" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Entitlement and request limits" description="Set the core numerical behavior that shapes accrual, usage, and request bounds.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Accrual frequency</span><select className="input-control" disabled={accrualFrequencyLocked} value={formValue.accrual_frequency} onChange={(e) => update("accrual_frequency", e.target.value)}>{options.accrual_frequencies.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="accrual_frequency" item={item} /></label>
              <label className="form-field"><span className="muted">Annual entitlement</span><input className="input-control" disabled={annualEntitlementLocked} value={formValue.annual_entitlement} onChange={(e) => update("annual_entitlement", e.target.value)} /><GovernanceLockHint fieldPath="annual_entitlement" item={item} /></label>
              <label className="form-field"><span className="muted">Max carry forward</span><input className="input-control" disabled={maxCarryForwardLocked} value={formValue.max_carry_forward} onChange={(e) => update("max_carry_forward", e.target.value)} /><GovernanceLockHint fieldPath="max_carry_forward" item={item} /></label>
              <label className="form-field"><span className="muted">Max consecutive days</span><input className="input-control" disabled={maxConsecutiveDaysLocked} value={formValue.max_consecutive_days ?? ""} onChange={(e) => update("max_consecutive_days", e.target.value || null)} /><GovernanceLockHint fieldPath="max_consecutive_days" item={item} /></label>
              <label className="form-field"><span className="muted">Min days per request</span><input className="input-control" disabled={minDaysPerRequestLocked} value={formValue.min_days_per_request} onChange={(e) => update("min_days_per_request", e.target.value)} /><GovernanceLockHint fieldPath="min_days_per_request" item={item} /></label>
              <label className="form-field"><span className="muted">Notice days required</span><input className="input-control" disabled={noticeDaysLocked} type="number" value={formValue.notice_days_required} onChange={(e) => update("notice_days_required", Number(e.target.value))} /><GovernanceLockHint fieldPath="notice_days_required" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Eligibility filters" description="Optional restrictions help scope the policy to the correct employee populations.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Gender restriction</span><input className="input-control" disabled={genderRestrictionLocked} value={formValue.gender_restriction} onChange={(e) => update("gender_restriction", e.target.value)} /><GovernanceLockHint fieldPath="gender_restriction" item={item} /></label>
              <label className="form-field"><span className="muted">Marital status restriction</span><input className="input-control" disabled={maritalStatusRestrictionLocked} value={formValue.marital_status_restriction} onChange={(e) => update("marital_status_restriction", e.target.value)} /><GovernanceLockHint fieldPath="marital_status_restriction" item={item} /></label>
              <label className="form-field"><span className="muted">Minimum service days</span><input className="input-control" disabled={minimumServiceDaysLocked} type="number" value={formValue.minimum_service_days} onChange={(e) => update("minimum_service_days", Number(e.target.value))} /><GovernanceLockHint fieldPath="minimum_service_days" item={item} /></label>
            </div>
          </FormSection>

          <FormSection fullWidth title="Behavior switches" description="These toggles control request flexibility, overlap handling, and approval behavior.">
            <div className="toggle-field-list">
              {[
                ["allow_half_day", "Allow half day", "Permit half-day leave requests under this policy."],
                ["allow_backdated_application", "Allow backdated application", "Let leave requests be submitted after the actual date."],
                ["allow_weekend_holiday_overlap", "Allow weekend or holiday overlap", "Allow leave to overlap weekends or holidays without blocking."],
                ["sandwich_rule_enabled", "Enable sandwich rule", "Apply sandwich logic when weekends or holidays sit between leave dates."],
                ["is_probation_eligible", "Probation eligible", "Allow this leave policy to apply during employee probation."],
              ].map(([key, label, description]) => (
                <label className="toggle-field" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <p className="section-copy">{description}</p>
                    {key === "allow_half_day" ? <GovernanceLockHint fieldPath="allow_half_day" item={item} /> : null}
                    {key === "allow_backdated_application" ? <GovernanceLockHint fieldPath="allow_backdated_application" item={item} /> : null}
                    {key === "allow_weekend_holiday_overlap" ? <GovernanceLockHint fieldPath="allow_weekend_holiday_overlap" item={item} /> : null}
                    {key === "sandwich_rule_enabled" ? <GovernanceLockHint fieldPath="sandwich_rule_enabled" item={item} /> : null}
                    {key === "is_probation_eligible" ? <GovernanceLockHint fieldPath="is_probation_eligible" item={item} /> : null}
                  </div>
                  <input
                    checked={Boolean(formValue[key as keyof HrAdminLeavePolicyWriteInput])}
                    disabled={
                      key === "allow_half_day"
                        ? allowHalfDayLocked
                        : key === "allow_backdated_application"
                          ? allowBackdatedLocked
                          : key === "allow_weekend_holiday_overlap"
                            ? allowOverlapLocked
                            : key === "sandwich_rule_enabled"
                              ? sandwichRuleLocked
                              : key === "is_probation_eligible"
                                ? probationEligibleLocked
                                : false
                    }
                    onChange={(e) => update(key as keyof HrAdminLeavePolicyWriteInput, e.target.checked as never)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection
            fullWidth
            title="Advanced routing and evidence rules"
            description="These settings are stored in JSON behind the scenes, but managed here as normal policy controls so every entity can configure its own approval and document rules."
          >
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Default approval route</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.approval.default_route}
                  onChange={(e) => updateApproval("default_route", e.target.value as HrAdminLeaveApprovalRoute)}
                >
                  {approvalRouteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Escalation route</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.approval.escalation_route ?? ""}
                  onChange={(e) =>
                    updateApproval(
                      "escalation_route",
                      (e.target.value || null) as HrAdminLeavePolicyAdvancedConfig["approval"]["escalation_route"],
                    )
                  }
                >
                  <option value="">No escalation route</option>
                  {approvalRouteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Escalate when requested units reach</span>
                <input
                  className="input-control"
                  placeholder="e.g. 3.00"
                  value={formValue.config_snapshot.approval.escalate_when_units_gte ?? ""}
                  onChange={(e) => updateApproval("escalate_when_units_gte", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">HR owner</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.approval.hr_owner_employee_id ?? ""}
                  onChange={(e) => updateApproval("hr_owner_employee_id", e.target.value || null)}
                >
                  <option value="">Use tenant HR fallback</option>
                  {options.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Second-level approver override</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.approval.second_level_owner_employee_id ?? ""}
                  onChange={(e) => updateApproval("second_level_owner_employee_id", e.target.value || null)}
                >
                  <option value="">Use reporting-chain fallback</option>
                  {options.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Attachment label</span>
                <input
                  className="input-control"
                  placeholder="supporting document"
                  value={formValue.config_snapshot.evidence.attachment_label}
                  onChange={(e) => updateEvidence("attachment_label", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Require attachment when units reach</span>
                <input
                  className="input-control"
                  placeholder="e.g. 2.00"
                  value={formValue.config_snapshot.evidence.required_when_units_gte ?? ""}
                  onChange={(e) => updateEvidence("required_when_units_gte", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Require medical certificate when units reach</span>
                <input
                  className="input-control"
                  placeholder="e.g. 2.00"
                  value={formValue.config_snapshot.evidence.medical_certificate_when_units_gte ?? ""}
                  onChange={(e) => updateEvidence("medical_certificate_when_units_gte", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Approval route when evidence is required</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.evidence.approval_route_when_evidence_required ?? ""}
                  onChange={(e) =>
                    updateEvidence(
                      "approval_route_when_evidence_required",
                      (e.target.value || null) as HrAdminLeavePolicyAdvancedConfig["evidence"]["approval_route_when_evidence_required"],
                    )
                  }
                >
                  <option value="">Keep default route</option>
                  {approvalRouteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Always require attachment</strong>
                  <p className="section-copy">Use this when the leave category should always carry evidence, regardless of duration.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.evidence.attachment_required}
                  onChange={(e) => updateEvidence("attachment_required", e.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Advanced entitlement and carry-forward rules"
            description="Configure how balances accrue across the policy year, how joining-date proration behaves, and whether probation or carry-forward rules change the credited balance."
          >
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Grant mode</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.entitlement.grant_mode}
                  onChange={(e) => updateEntitlement("grant_mode", e.target.value as HrAdminLeavePolicyAdvancedConfig["entitlement"]["grant_mode"])}
                >
                  {entitlementGrantModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Proration mode</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.entitlement.proration_mode}
                  onChange={(e) => updateEntitlement("proration_mode", e.target.value as HrAdminLeavePolicyAdvancedConfig["entitlement"]["proration_mode"])}
                >
                  {entitlementProrationModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Policy year start month</span>
                <input
                  className="input-control"
                  max={12}
                  min={1}
                  type="number"
                  value={formValue.config_snapshot.entitlement.policy_year_start_month}
                  onChange={(e) => updateEntitlement("policy_year_start_month", Number(e.target.value || 1))}
                />
              </label>
              <label className="form-field">
                <span className="muted">Policy year start day</span>
                <input
                  className="input-control"
                  max={28}
                  min={1}
                  type="number"
                  value={formValue.config_snapshot.entitlement.policy_year_start_day}
                  onChange={(e) => updateEntitlement("policy_year_start_day", Number(e.target.value || 1))}
                />
              </label>
              <label className="form-field">
                <span className="muted">Carry forward mode</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.entitlement.carry_forward_mode}
                  onChange={(e) => updateEntitlement("carry_forward_mode", e.target.value as HrAdminLeavePolicyAdvancedConfig["entitlement"]["carry_forward_mode"])}
                >
                  {carryForwardModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Carry forward cap override</span>
                <input
                  className="input-control"
                  placeholder="Use max carry forward if blank"
                  value={formValue.config_snapshot.entitlement.carry_forward_cap ?? ""}
                  onChange={(e) => updateEntitlement("carry_forward_cap", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Probation accrual mode</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.entitlement.probation_accrual_mode}
                  onChange={(e) => updateEntitlement("probation_accrual_mode", e.target.value as HrAdminLeavePolicyAdvancedConfig["entitlement"]["probation_accrual_mode"])}
                >
                  {probationAccrualModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Encashment cap</span>
                <input
                  className="input-control"
                  placeholder="e.g. 5.00"
                  value={formValue.config_snapshot.entitlement.encashment_cap ?? ""}
                  onChange={(e) => updateEntitlement("encashment_cap", e.target.value || null)}
                />
              </label>
            </div>

            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Allow encashment</strong>
                  <p className="section-copy">Keep this off when the leave type should never convert into payout, regardless of remaining balance.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.entitlement.encashment_allowed}
                  onChange={(e) => updateEntitlement("encashment_allowed", e.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Balance operation governance"
            description="Configure maker-checker controls for encashment and manual balance mutations so every entity can enforce its own audit posture."
          >
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Balance reviewer</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.operations.reviewer_employee_id ?? ""}
                  onChange={(e) => updateOperations("reviewer_employee_id", e.target.value || null)}
                >
                  <option value="">Use HR owner or tenant HR fallback</option>
                  {options.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Credit adjustment review threshold</span>
                <input
                  className="input-control"
                  placeholder="e.g. 2.00"
                  value={formValue.config_snapshot.operations.credit_adjustment_requires_approval_over_units ?? ""}
                  onChange={(e) => updateOperations("credit_adjustment_requires_approval_over_units", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Debit adjustment review threshold</span>
                <input
                  className="input-control"
                  placeholder="e.g. 1.00"
                  value={formValue.config_snapshot.operations.debit_adjustment_requires_approval_over_units ?? ""}
                  onChange={(e) => updateOperations("debit_adjustment_requires_approval_over_units", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Encashment review threshold</span>
                <input
                  className="input-control"
                  placeholder="e.g. 1.00"
                  value={formValue.config_snapshot.operations.encashment_requires_approval_over_units ?? ""}
                  onChange={(e) => updateOperations("encashment_requires_approval_over_units", e.target.value || null)}
                />
              </label>
            </div>

            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Always review encashment</strong>
                  <p className="section-copy">Require approval before any encashment reduces the employee’s leave balance.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.operations.approval_required_for_encashment}
                  onChange={(e) => updateOperations("approval_required_for_encashment", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Always review debit adjustments</strong>
                  <p className="section-copy">Require a second reviewer before manual debit adjustments are applied.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.operations.approval_required_for_debit_adjustment}
                  onChange={(e) => updateOperations("approval_required_for_debit_adjustment", e.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Request lifecycle governance"
            description="Control whether employees can withdraw pending leave, cancel approved leave, and whether stage-specific evidence is required."
          >
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Withdraw notice hours before start</span>
                <input
                  className="input-control"
                  placeholder="Blank means no cutoff"
                  value={formValue.config_snapshot.lifecycle.withdraw_notice_hours_before_start ?? ""}
                  onChange={(e) => updateLifecycle("withdraw_notice_hours_before_start", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Withdraw attachment label</span>
                <input
                  className="input-control"
                  value={formValue.config_snapshot.lifecycle.withdraw_attachment_label}
                  onChange={(e) => updateLifecycle("withdraw_attachment_label", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Cancel notice hours before start</span>
                <input
                  className="input-control"
                  placeholder="Blank means no cutoff"
                  value={formValue.config_snapshot.lifecycle.cancel_notice_hours_before_start ?? ""}
                  onChange={(e) => updateLifecycle("cancel_notice_hours_before_start", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Cancel attachment label</span>
                <input
                  className="input-control"
                  value={formValue.config_snapshot.lifecycle.cancel_attachment_label}
                  onChange={(e) => updateLifecycle("cancel_attachment_label", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Cancel approval route override</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.lifecycle.cancel_approval_route ?? ""}
                  onChange={(e) => updateLifecycle("cancel_approval_route", (e.target.value || null) as HrAdminLeavePolicyAdvancedConfig["lifecycle"]["cancel_approval_route"])}
                >
                  <option value="">Use the leave request route</option>
                  {approvalRouteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Allow employee withdraw while pending</strong>
                  <p className="section-copy">Let employees pull back submitted leave before approval, subject to the notice window above.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.lifecycle.allow_employee_withdraw_pending}
                  onChange={(e) => updateLifecycle("allow_employee_withdraw_pending", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Require evidence on withdraw</strong>
                  <p className="section-copy">Use when pending withdrawals need a supporting note, document, or other stage-specific evidence.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.lifecycle.withdraw_requires_attachment}
                  onChange={(e) => updateLifecycle("withdraw_requires_attachment", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Allow employee cancel after approval</strong>
                  <p className="section-copy">Permit self-service cancellation after approval, again controlled by the notice window and evidence rules below.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.lifecycle.allow_employee_cancel_approved}
                  onChange={(e) => updateLifecycle("allow_employee_cancel_approved", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Send approved cancellations back for approval</strong>
                  <p className="section-copy">Use this when cancellation itself should route through manager or HR approval instead of applying immediately.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.lifecycle.cancel_approved_requires_reapproval}
                  onChange={(e) => updateLifecycle("cancel_approved_requires_reapproval", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Require evidence on cancel</strong>
                  <p className="section-copy">Use when approved leave cancellations should carry cancellation proof or supporting context.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.lifecycle.cancel_requires_attachment}
                  onChange={(e) => updateLifecycle("cancel_requires_attachment", e.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Holiday-linked leave governance"
            description="Use this when a leave policy should only be booked on specific holiday types such as RH, and when paid usage needs a configurable cap."
          >
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
            <fieldset disabled={configSnapshotLocked} style={{ border: 0, margin: 0, padding: 0 }}>
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Allowed holiday type</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.holiday_governance.allowed_holiday_types[0] ?? ""}
                  onChange={(e) => updateHolidayGovernance("allowed_holiday_types", e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Any holiday type</option>
                  <option value="restricted">Restricted holiday (RH)</option>
                  <option value="compulsory">Compulsory holiday (CH)</option>
                  <option value="general">General holiday</option>
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Max paid units per policy period</span>
                <input
                  className="input-control"
                  placeholder="e.g. 4.00"
                  value={formValue.config_snapshot.holiday_governance.max_paid_units_per_period ?? ""}
                  onChange={(e) => updateHolidayGovernance("max_paid_units_per_period", e.target.value || null)}
                />
              </label>
              <label className="form-field">
                <span className="muted">Cap exhaustion action</span>
                <select
                  className="input-control"
                  value={formValue.config_snapshot.holiday_governance.paid_cap_exhaustion_action}
                  onChange={(e) => updateHolidayGovernance("paid_cap_exhaustion_action", e.target.value as "block")}
                >
                  <option value="block">Block after paid cap is exhausted</option>
                </select>
              </label>
            </div>

            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Enable holiday-linked validation</strong>
                  <p className="section-copy">Require this leave policy to match holiday rows from the employee holiday calendar.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.holiday_governance.enabled}
                  onChange={(e) => updateHolidayGovernance("enabled", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Require matching holiday dates</strong>
                  <p className="section-copy">Block requests unless the leave dates fall on holiday rows of the allowed type.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.holiday_governance.require_matching_holiday_dates}
                  onChange={(e) => updateHolidayGovernance("require_matching_holiday_dates", e.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="toggle-field">
                <div>
                  <strong>Count pending requests toward the paid cap</strong>
                  <p className="section-copy">Reserve paid RH capacity as soon as the request is pending, not only after final approval.</p>
                </div>
                <input
                  checked={formValue.config_snapshot.holiday_governance.count_pending_requests_towards_cap}
                  onChange={(e) => updateHolidayGovernance("count_pending_requests_towards_cap", e.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            </fieldset>
          </FormSection>

          <FormSection
            fullWidth
            title="Workflow preview"
            description="Pick an employee and request size to test the exact approval chain this policy will produce before a real leave request is submitted."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Employee</span>
                <select className="input-control" value={previewEmployeeId} onChange={(e) => setPreviewEmployeeId(e.target.value)}>
                  <option value="">Select an employee</option>
                  {options.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="muted">Requested units</span>
                <input className="input-control" value={previewUnits} onChange={(e) => setPreviewUnits(e.target.value)} />
              </label>
            </div>

            <div className="form-actions-bar">
              <span className="muted">The preview uses the same backend routing rules as real leave submission.</span>
              <div className="form-actions-bar__buttons">
                <button className="button button--secondary" onClick={handlePreview} type="button">
                  {isPreviewLoading ? "Previewing..." : "Preview route"}
                </button>
              </div>
            </div>

            {previewError ? (
              <div className="notice">
                <strong>Preview failed.</strong>
                <span className="muted">{previewError}</span>
              </div>
            ) : null}

            {previewResult ? (
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-row__label">Current active policy</span>
                  <span className="detail-row__value">{previewResult.current_resolved_policy_name || "No active policy currently resolves for this employee."}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Current assignment scope</span>
                  <span className="detail-row__value">
                    {previewResult.current_assignment_scope?.length
                      ? previewResult.current_assignment_scope.join(" • ")
                      : "No matching assignment in scope."}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Current assignment priority</span>
                  <span className="detail-row__value">
                    {previewResult.current_assignment_priority ?? "Not applicable"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Draft matches current resolution</span>
                  <span className="detail-row__value">
                    {previewResult.draft_policy_matches_current_resolution
                      ? "Yes, this draft is already the resolved policy for this employee."
                      : "No, another active policy currently resolves first."}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Resolved route</span>
                  <span className="detail-row__value">{previewResult.approval_route.replaceAll("_", " ")}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Attachment rule</span>
                  <span className="detail-row__value">{previewResult.required_attachment_reason || "No attachment required for this scenario."}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Policy period</span>
                  <span className="detail-row__value">
                    FY {previewResult.entitlement_preview.policy_period_year} • {previewResult.entitlement_preview.policy_year_start} to {previewResult.entitlement_preview.policy_year_end}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Prorated entitlement</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.prorated_entitlement} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Projected accrued amount</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.projected_accrued_amount} units</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Projected carry forward</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.projected_carry_forward_amount} units</span>
                </div>
                <div className="detail-row detail-row--full">
                  <span className="detail-row__label">Approval steps</span>
                  <div className="detail-row__value">
                    {previewResult.steps.length ? (
                      previewResult.steps.map((step) => (
                        <div key={`${step.step_order}-${step.actor_identifier || step.name}`}>
                          {step.step_order}. {step.name}: {step.actor_name || step.actor_identifier || "Unresolved approver"}
                        </div>
                      ))
                    ) : (
                      <span>No approvers resolved for this preview.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Policy changes save back into the leave policy catalog and stay ready for scoped assignments.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting || (mode === "edit" && item?.can_edit_directly === false)} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create leave policy" : item && item.can_edit_directly === false ? "Direct edit unavailable" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
