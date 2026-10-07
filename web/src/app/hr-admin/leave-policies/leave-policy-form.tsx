"use client";

import { useRef, useState } from "react";
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
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateDateOrder } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminLeavePolicyWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
  item?: HrAdminLeavePolicy;
};

type LeavePolicyField =
  | "leave_type_id"
  | "code"
  | "name"
  | "effective_to"
  | "annual_entitlement"
  | "max_carry_forward"
  | "max_consecutive_days"
  | "min_days_per_request"
  | "notice_days_required"
  | "minimum_service_days";

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

const genderRestrictionOptions = [
  { value: "", label: "No gender restriction" },
  { value: "female", label: "Female employees only" },
  { value: "male", label: "Male employees only" },
  { value: "other", label: "Other gender identity only" },
] as const;

const maritalStatusRestrictionOptions = [
  { value: "", label: "No marital-status restriction" },
  { value: "unmarried", label: "Unmarried employees only" },
  { value: "married", label: "Married employees only" },
] as const;

type LeavePolicyTemplatePatch = Partial<Omit<HrAdminLeavePolicyWriteInput, "config_snapshot">> & {
  leaveTypeName: string;
  config_snapshot: Partial<{
    [Key in keyof HrAdminLeavePolicyAdvancedConfig]: Partial<HrAdminLeavePolicyAdvancedConfig[Key]>;
  }>;
};

type LeavePolicyTemplate = {
  key: string;
  label: string;
  summary: string;
  bestFor: string;
  patch: LeavePolicyTemplatePatch;
};

const leavePolicyTemplates: LeavePolicyTemplate[] = [
  {
    key: "india-earned-leave",
    label: "India earned / annual leave",
    summary: "20 days below 3 years, then 22 days at 3+ years and 25 days at 5+ years, with joining-month proration and controlled carry-forward.",
    bestFor: "Annual paid leave policies where tenure changes entitlement.",
    patch: {
      leaveTypeName: "Earned Leave",
      code: "EL_STANDARD",
      name: "Earned Leave Standard",
      accrual_frequency: "monthly",
      annual_entitlement: "20.00",
      max_carry_forward: "10.00",
      max_consecutive_days: "15.00",
      min_days_per_request: "0.50",
      notice_days_required: 7,
      allow_half_day: true,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: false,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      gender_restriction: "",
      marital_status_restriction: "",
      minimum_service_days: 0,
      config_snapshot: {
        approval: { default_route: "manager_only", escalation_route: "manager_then_hr", escalate_when_units_gte: "10.00" },
        evidence: { attachment_required: false, attachment_label: "travel or supporting document", required_when_units_gte: "5.00" },
        entitlement: {
          grant_mode: "scheduled",
          proration_mode: "by_join_month",
          service_tiers: [
            { min_service_months: 36, annual_entitlement: "22.00", label: "3+ years" },
            { min_service_months: 60, annual_entitlement: "25.00", label: "5+ years" },
          ],
          carry_forward_mode: "limited",
          carry_forward_cap: "10.00",
          encashment_allowed: true,
          encashment_cap: "5.00",
          probation_accrual_mode: "accrue",
        },
        operations: { approval_required_for_encashment: true, encashment_requires_approval_over_units: "1.00" },
        lifecycle: { allow_employee_withdraw_pending: true, allow_employee_cancel_approved: true, cancel_approved_requires_reapproval: true },
      },
    },
  },
  {
    key: "sick-leave",
    label: "Sick leave",
    summary: "Short-notice medical leave with half-day support, medical certificate after 2 days, and no carry-forward or encashment by default.",
    bestFor: "Medical absence where evidence rules matter more than tenure.",
    patch: {
      leaveTypeName: "Sick Leave",
      code: "SL_STANDARD",
      name: "Sick Leave Standard",
      accrual_frequency: "monthly",
      annual_entitlement: "6.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "7.00",
      min_days_per_request: "0.50",
      notice_days_required: 0,
      allow_half_day: true,
      allow_backdated_application: true,
      allow_weekend_holiday_overlap: false,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      minimum_service_days: 0,
      config_snapshot: {
        approval: { default_route: "manager_only", escalation_route: "manager_then_hr", escalate_when_units_gte: "5.00" },
        evidence: {
          attachment_required: false,
          attachment_label: "medical certificate",
          required_when_units_gte: "2.00",
          medical_certificate_when_units_gte: "2.00",
          approval_route_when_evidence_required: "manager_then_hr",
        },
        entitlement: { grant_mode: "scheduled", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
      },
    },
  },
  {
    key: "maternity-leave",
    label: "Maternity leave",
    summary: "Female-only long-duration leave with service eligibility, required evidence, and HR-inclusive approval routing.",
    bestFor: "Statutory or company maternity policies.",
    patch: {
      leaveTypeName: "Maternity Leave",
      code: "ML_STANDARD",
      name: "Maternity Leave Standard",
      accrual_frequency: "yearly",
      annual_entitlement: "182.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "182.00",
      min_days_per_request: "1.00",
      notice_days_required: 30,
      allow_half_day: false,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: true,
      sandwich_rule_enabled: false,
      is_probation_eligible: false,
      gender_restriction: "female",
      marital_status_restriction: "",
      minimum_service_days: 80,
      config_snapshot: {
        approval: { default_route: "manager_then_hr", escalation_route: "manager_second_level_hr", escalate_when_units_gte: "30.00" },
        evidence: { attachment_required: true, attachment_label: "medical certificate", approval_route_when_evidence_required: "manager_then_hr" },
        entitlement: { grant_mode: "upfront", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
      },
    },
  },
  {
    key: "paternity-leave",
    label: "Paternity leave",
    summary: "Male-only short family leave with birth/adoption evidence and manager approval.",
    bestFor: "Company paternity or co-parent leave rules.",
    patch: {
      leaveTypeName: "Paternity Leave",
      code: "PL_STANDARD",
      name: "Paternity Leave Standard",
      accrual_frequency: "yearly",
      annual_entitlement: "5.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "5.00",
      min_days_per_request: "1.00",
      notice_days_required: 15,
      allow_half_day: false,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: true,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      gender_restriction: "male",
      marital_status_restriction: "",
      minimum_service_days: 0,
      config_snapshot: {
        approval: { default_route: "manager_only", escalation_route: "manager_then_hr", escalate_when_units_gte: "5.00" },
        evidence: { attachment_required: true, attachment_label: "birth or adoption proof" },
        entitlement: { grant_mode: "upfront", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
      },
    },
  },
  {
    key: "bereavement-leave",
    label: "Bereavement leave",
    summary: "Immediate compassionate leave with optional evidence, backdated application, and no balance carry-forward.",
    bestFor: "Compassionate absence where fast submission matters.",
    patch: {
      leaveTypeName: "Bereavement Leave",
      code: "BL_STANDARD",
      name: "Bereavement Leave Standard",
      accrual_frequency: "yearly",
      annual_entitlement: "5.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "5.00",
      min_days_per_request: "1.00",
      notice_days_required: 0,
      allow_half_day: false,
      allow_backdated_application: true,
      allow_weekend_holiday_overlap: true,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      minimum_service_days: 0,
      config_snapshot: {
        approval: { default_route: "manager_only", escalation_route: "manager_then_hr", escalate_when_units_gte: "3.00" },
        evidence: { attachment_required: false, attachment_label: "supporting document", required_when_units_gte: null },
        entitlement: { grant_mode: "upfront", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
      },
    },
  },
  {
    key: "comp-off",
    label: "Comp-off",
    summary: "Time-off-in-lieu policy with manager approval, no annual carry-forward, and balance governance for manual credits.",
    bestFor: "Overtime or holiday-work compensatory leave.",
    patch: {
      leaveTypeName: "Comp Off",
      code: "COMP_OFF",
      name: "Comp-off Standard",
      accrual_frequency: "monthly",
      annual_entitlement: "0.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "3.00",
      min_days_per_request: "0.50",
      notice_days_required: 2,
      allow_half_day: true,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: false,
      sandwich_rule_enabled: false,
      is_probation_eligible: true,
      minimum_service_days: 0,
      config_snapshot: {
        approval: { default_route: "manager_only", escalation_route: "manager_then_hr", escalate_when_units_gte: "3.00" },
        evidence: { attachment_required: false, attachment_label: "work proof", required_when_units_gte: null },
        entitlement: { grant_mode: "scheduled", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
        operations: { approval_required_for_debit_adjustment: true, credit_adjustment_requires_approval_over_units: "1.00" },
      },
    },
  },
  {
    key: "study-leave",
    label: "Study / exam leave",
    summary: "Education leave with advance notice, evidence requirement, and manager-to-HR routing.",
    bestFor: "Certification, exam, or sponsored learning policies.",
    patch: {
      leaveTypeName: "Study Leave",
      code: "STUDY_LEAVE",
      name: "Study Leave Standard",
      accrual_frequency: "yearly",
      annual_entitlement: "5.00",
      max_carry_forward: "0.00",
      max_consecutive_days: "5.00",
      min_days_per_request: "1.00",
      notice_days_required: 15,
      allow_half_day: false,
      allow_backdated_application: false,
      allow_weekend_holiday_overlap: false,
      sandwich_rule_enabled: false,
      is_probation_eligible: false,
      minimum_service_days: 180,
      config_snapshot: {
        approval: { default_route: "manager_then_hr", escalation_route: "manager_second_level_hr", escalate_when_units_gte: "3.00" },
        evidence: { attachment_required: true, attachment_label: "exam schedule or enrollment proof", approval_route_when_evidence_required: "manager_then_hr" },
        entitlement: { grant_mode: "upfront", proration_mode: "none", service_tiers: [], carry_forward_mode: "none", carry_forward_cap: null, encashment_allowed: false, encashment_cap: null },
      },
    },
  },
];

function mergeAdvancedConfig(
  current: HrAdminLeavePolicyAdvancedConfig,
  patch: LeavePolicyTemplatePatch["config_snapshot"],
): HrAdminLeavePolicyAdvancedConfig {
  return {
    ...current,
    approval: { ...current.approval, ...patch.approval },
    evidence: { ...current.evidence, ...patch.evidence },
    entitlement: { ...current.entitlement, ...patch.entitlement },
    operations: { ...current.operations, ...patch.operations },
    lifecycle: { ...current.lifecycle, ...patch.lifecycle },
    holiday_governance: { ...current.holiday_governance, ...patch.holiday_governance },
  };
}

function normalizedLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function LeavePolicyForm({ initialValue, mode, options, itemId, item }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LeavePolicyField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [previewEmployeeId, setPreviewEmployeeId] = useState(options.employees[0]?.id ?? "");
  const [previewUnits, setPreviewUnits] = useState("1.00");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<HrAdminLeavePolicyPreview | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const selectedTemplate = leavePolicyTemplates.find((template) => template.key === selectedTemplateKey) ?? null;
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
    setFieldErrors((current) => ({ ...current, [key as LeavePolicyField]: undefined }));
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

  function updateServiceTier(
    index: number,
    key: keyof HrAdminLeavePolicyAdvancedConfig["entitlement"]["service_tiers"][number],
    value: string | number,
  ) {
    const tiers = [...formValue.config_snapshot.entitlement.service_tiers];
    tiers[index] = {
      ...tiers[index],
      [key]: value,
    };
    updateEntitlement("service_tiers", tiers);
  }

  function addServiceTier() {
    updateEntitlement("service_tiers", [
      ...formValue.config_snapshot.entitlement.service_tiers,
      { min_service_months: 36, annual_entitlement: formValue.annual_entitlement, label: "3+ years" },
    ]);
  }

  function removeServiceTier(index: number) {
    updateEntitlement("service_tiers", formValue.config_snapshot.entitlement.service_tiers.filter((_, tierIndex) => tierIndex !== index));
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

  function findTemplateLeaveTypeId(leaveTypeName: string) {
    const target = normalizedLabel(leaveTypeName);
    const match = options.leave_types.find((leaveType) => {
      const candidate = normalizedLabel(leaveType.name);
      return candidate === target || candidate.includes(target) || target.includes(candidate);
    });
    return match?.id ?? formValue.leave_type_id;
  }

  function applySelectedTemplate() {
    if (!selectedTemplate || configSnapshotLocked) {
      return;
    }
    const { config_snapshot: configPatch, leaveTypeName, ...fieldPatch } = selectedTemplate.patch;
    const nextLeaveTypeId = leaveTypeLocked ? formValue.leave_type_id : findTemplateLeaveTypeId(leaveTypeName);
    setFormValue((current) => ({
      ...current,
      ...fieldPatch,
      leave_type_id: nextLeaveTypeId,
      config_snapshot: mergeAdvancedConfig(current.config_snapshot, configPatch),
    }));
    setFieldErrors({});
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    if (mode === "edit" && item && item.can_edit_directly === false) {
      setError("This record cannot be edited directly in its current governance state.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    setFieldErrors({});
    const annualEntitlement = Number(formValue.annual_entitlement);
    const maxCarryForward = Number(formValue.max_carry_forward);
    const maxConsecutiveDays = formValue.max_consecutive_days ? Number(formValue.max_consecutive_days) : null;
    const minDaysPerRequest = Number(formValue.min_days_per_request);
    const nextErrors: FieldErrors<LeavePolicyField> = {
      leave_type_id: requireValue(formValue.leave_type_id, "Select the leave type for this policy."),
      code: requireText(formValue.code, "Enter a unique leave policy code."),
      name: requireText(formValue.name, "Enter the leave policy name."),
      effective_to: validateDateOrder(formValue.effective_from ?? "", formValue.effective_to ?? "", "Effective to must be the same as or after effective from."),
      annual_entitlement: !Number.isFinite(annualEntitlement) || annualEntitlement < 0 ? "Annual entitlement cannot be negative." : undefined,
      max_carry_forward: !Number.isFinite(maxCarryForward) || maxCarryForward < 0 ? "Max carry forward cannot be negative." : undefined,
      max_consecutive_days: maxConsecutiveDays !== null && (!Number.isFinite(maxConsecutiveDays) || maxConsecutiveDays <= 0) ? "Max consecutive days must be greater than zero." : undefined,
      min_days_per_request: !Number.isFinite(minDaysPerRequest) || minDaysPerRequest <= 0 ? "Minimum days per request must be greater than zero." : undefined,
      notice_days_required: formValue.notice_days_required < 0 ? "Notice days cannot be negative." : undefined,
      minimum_service_days: formValue.minimum_service_days < 0 ? "Minimum service days cannot be negative." : undefined,
    };
    if (maxConsecutiveDays !== null && Number.isFinite(maxConsecutiveDays) && Number.isFinite(minDaysPerRequest) && minDaysPerRequest > maxConsecutiveDays) {
      nextErrors.min_days_per_request = "Minimum days per request cannot exceed max consecutive days.";
    }
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setError("Review the highlighted leave policy fields and try again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/leave-policies" : `/api/hr-admin/leave-policies/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    setSuccessMessage(mode === "create" ? "Leave policy created. Returning to the policy list." : "Leave policy saved. Returning to the policy list.");
    setIsSubmitting(false);
    isSubmittingRef.current = false;
    window.setTimeout(() => {
      router.push("/hr-admin/leave-policies");
      router.refresh();
    }, 700);
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
    let response: Response;
    try {
      response = await fetch("/api/hr-admin/leave-policies/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: previewEmployeeId,
          leave_type_id: formValue.leave_type_id,
          requested_units: previewUnits,
          annual_entitlement: formValue.annual_entitlement,
          policy_id: itemId ?? null,
          config_snapshot: formValue.config_snapshot,
        }),
      });
    } catch {
      setPreviewError("Unable to reach the server. Check your connection and try again.");
      setIsPreviewLoading(false);
      return;
    }
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
    <form className="section form-layout-modern" noValidate onSubmit={handleSubmit}>
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
          <FormSection
            fullWidth
            title="Policy template starter"
            description="Pick a common leave policy baseline, review the intent, then apply it. HR can still edit every field after the template fills the form."
          >
            <div className="form-grid">
              <label className="form-field">
                <span className="muted">Template</span>
                <select
                  className="input-control"
                  disabled={configSnapshotLocked}
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value)}
                >
                  <option value="">Choose a policy starter</option>
                  {leavePolicyTemplates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="notice">
                <strong>{selectedTemplate ? selectedTemplate.bestFor : "Use templates for faster SaaS rollout"}</strong>
                <span className="muted">
                  {selectedTemplate
                    ? selectedTemplate.summary
                    : "Templates cover entitlement, service tiers, evidence, lifecycle, carry-forward, encashment, and approval defaults for common global scenarios."}
                </span>
              </div>
            </div>
            <div className="form-actions-bar">
              <span className="muted">
                {selectedTemplate
                  ? `Applying this will set ${selectedTemplate.patch.annual_entitlement} annual units and ${selectedTemplate.patch.max_carry_forward} carry-forward units as a starting point.`
                  : "Select a template to see the starter assumptions before applying."}
              </span>
              <button
                className="button button--secondary"
                disabled={!selectedTemplate || configSnapshotLocked}
                onClick={applySelectedTemplate}
                type="button"
              >
                Apply template
              </button>
            </div>
            <GovernanceLockHint fieldPath="config_snapshot" item={item} />
          </FormSection>

          <FormSection title="Identity and timing" description="Start with the linked leave type, policy identity, and effective dates.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Leave type</span><select aria-invalid={Boolean(fieldErrors.leave_type_id)} className="input-control" disabled={leaveTypeLocked} value={formValue.leave_type_id ?? ""} onChange={(e) => update("leave_type_id", e.target.value || null)}>{selectOptions(options.leave_types)}</select>{fieldErrors.leave_type_id ? <span className="field-error-text">{fieldErrors.leave_type_id}</span> : null}<GovernanceLockHint fieldPath="leave_type_id" item={item} /></label>
              <label className="form-field"><span className="muted">Code</span><input aria-invalid={Boolean(fieldErrors.code)} className="input-control" disabled={codeLocked} required value={formValue.code} onChange={(e) => update("code", e.target.value)} />{fieldErrors.code ? <span className="field-error-text">{fieldErrors.code}</span> : null}<GovernanceLockHint fieldPath="code" item={item} /></label>
              <label className="form-field"><span className="muted">Name</span><input aria-invalid={Boolean(fieldErrors.name)} className="input-control" disabled={nameLocked} required value={formValue.name} onChange={(e) => update("name", e.target.value)} />{fieldErrors.name ? <span className="field-error-text">{fieldErrors.name}</span> : null}<GovernanceLockHint fieldPath="name" item={item} /></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" disabled={statusLocked} value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.leave_policy_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="status" item={item} /></label>
              <label className="form-field"><span className="muted">Effective from</span><input className="input-control" disabled={effectiveFromLocked} type="date" value={formValue.effective_from ?? ""} onChange={(e) => update("effective_from", e.target.value || null)} /><GovernanceLockHint fieldPath="effective_from" item={item} /></label>
              <label className="form-field"><span className="muted">Effective to</span><input aria-invalid={Boolean(fieldErrors.effective_to)} className="input-control" disabled={effectiveToLocked} type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} />{fieldErrors.effective_to ? <span className="field-error-text">{fieldErrors.effective_to}</span> : null}<GovernanceLockHint fieldPath="effective_to" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Entitlement and request limits" description="Set the core numerical behavior that shapes accrual, usage, and request bounds.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Accrual frequency</span><select className="input-control" disabled={accrualFrequencyLocked} value={formValue.accrual_frequency} onChange={(e) => update("accrual_frequency", e.target.value)}>{options.accrual_frequencies.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><GovernanceLockHint fieldPath="accrual_frequency" item={item} /></label>
              <label className="form-field"><span className="muted">Annual entitlement</span><input aria-invalid={Boolean(fieldErrors.annual_entitlement)} className="input-control" disabled={annualEntitlementLocked} value={formValue.annual_entitlement} onChange={(e) => update("annual_entitlement", e.target.value)} />{fieldErrors.annual_entitlement ? <span className="field-error-text">{fieldErrors.annual_entitlement}</span> : null}<GovernanceLockHint fieldPath="annual_entitlement" item={item} /></label>
              <label className="form-field"><span className="muted">Max carry forward</span><input aria-invalid={Boolean(fieldErrors.max_carry_forward)} className="input-control" disabled={maxCarryForwardLocked} value={formValue.max_carry_forward} onChange={(e) => update("max_carry_forward", e.target.value)} />{fieldErrors.max_carry_forward ? <span className="field-error-text">{fieldErrors.max_carry_forward}</span> : null}<GovernanceLockHint fieldPath="max_carry_forward" item={item} /></label>
              <label className="form-field"><span className="muted">Max consecutive days</span><input aria-invalid={Boolean(fieldErrors.max_consecutive_days)} className="input-control" disabled={maxConsecutiveDaysLocked} value={formValue.max_consecutive_days ?? ""} onChange={(e) => update("max_consecutive_days", e.target.value || null)} />{fieldErrors.max_consecutive_days ? <span className="field-error-text">{fieldErrors.max_consecutive_days}</span> : null}<GovernanceLockHint fieldPath="max_consecutive_days" item={item} /></label>
              <label className="form-field"><span className="muted">Min days per request</span><input aria-invalid={Boolean(fieldErrors.min_days_per_request)} className="input-control" disabled={minDaysPerRequestLocked} value={formValue.min_days_per_request} onChange={(e) => update("min_days_per_request", e.target.value)} />{fieldErrors.min_days_per_request ? <span className="field-error-text">{fieldErrors.min_days_per_request}</span> : null}<GovernanceLockHint fieldPath="min_days_per_request" item={item} /></label>
              <label className="form-field"><span className="muted">Notice days required</span><input aria-invalid={Boolean(fieldErrors.notice_days_required)} className="input-control" disabled={noticeDaysLocked} type="number" value={formValue.notice_days_required} onChange={(e) => update("notice_days_required", Number(e.target.value))} />{fieldErrors.notice_days_required ? <span className="field-error-text">{fieldErrors.notice_days_required}</span> : null}<GovernanceLockHint fieldPath="notice_days_required" item={item} /></label>
            </div>
          </FormSection>

          <FormSection title="Eligibility filters" description="Optional restrictions help scope the policy to the correct employee populations.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Gender restriction</span><select className="input-control" disabled={genderRestrictionLocked} value={formValue.gender_restriction} onChange={(e) => update("gender_restriction", e.target.value)}>{genderRestrictionOptions.map((option) => <option key={option.value || "none"} value={option.value}>{option.label}</option>)}</select><GovernanceLockHint fieldPath="gender_restriction" item={item} /></label>
              <label className="form-field"><span className="muted">Marital status restriction</span><select className="input-control" disabled={maritalStatusRestrictionLocked} value={formValue.marital_status_restriction} onChange={(e) => update("marital_status_restriction", e.target.value)}>{maritalStatusRestrictionOptions.map((option) => <option key={option.value || "none"} value={option.value}>{option.label}</option>)}</select><GovernanceLockHint fieldPath="marital_status_restriction" item={item} /></label>
              <label className="form-field"><span className="muted">Minimum service days</span><input aria-invalid={Boolean(fieldErrors.minimum_service_days)} className="input-control" disabled={minimumServiceDaysLocked} type="number" value={formValue.minimum_service_days} onChange={(e) => update("minimum_service_days", Number(e.target.value))} />{fieldErrors.minimum_service_days ? <span className="field-error-text">{fieldErrors.minimum_service_days}</span> : null}<GovernanceLockHint fieldPath="minimum_service_days" item={item} /></label>
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Advanced routing and evidence rules"
            description="These settings are stored in JSON behind the scenes, but managed here as normal policy controls so every entity can configure its own approval and document rules."
            summaryMeta={<span className="queue-summary-chip"><strong>{formValue.config_snapshot.approval.default_route.replaceAll("_", " ")}</strong> route</span>}
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Advanced entitlement and carry-forward rules"
            description="Configure how balances accrue, how joining-date proration behaves, and how service tenure changes annual entitlement."
            summaryMeta={<span className="queue-summary-chip"><strong>{formValue.config_snapshot.entitlement.service_tiers.length}</strong> service tiers</span>}
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

            <div className="notice">
              <strong>Service-based entitlement tiers</strong>
              <span className="muted">Use these rows for global policies where entitlement increases with completed service, such as 20 days below 3 years and 22 days after 3 years.</span>
            </div>

            <div className="form-grid">
              {formValue.config_snapshot.entitlement.service_tiers.map((tier, index) => (
                <div className="notice" key={`${tier.min_service_months}-${index}`}>
                  <div className="form-grid">
                    <label className="form-field">
                      <span className="muted">Tier label</span>
                      <input
                        className="input-control"
                        placeholder="e.g. 3+ years"
                        value={tier.label}
                        onChange={(e) => updateServiceTier(index, "label", e.target.value)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="muted">Minimum completed service months</span>
                      <input
                        className="input-control"
                        min={0}
                        type="number"
                        value={tier.min_service_months}
                        onChange={(e) => updateServiceTier(index, "min_service_months", Number(e.target.value || 0))}
                      />
                    </label>
                    <label className="form-field">
                      <span className="muted">Annual entitlement from this tier</span>
                      <input
                        className="input-control"
                        placeholder="e.g. 22.00"
                        value={tier.annual_entitlement}
                        onChange={(e) => updateServiceTier(index, "annual_entitlement", e.target.value)}
                      />
                    </label>
                    <div className="form-actions-bar">
                      <span className="muted">Tier applies once the employee completes the service months above.</span>
                      <button className="button button--secondary" onClick={() => removeServiceTier(index)} type="button">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions-bar">
              <span className="muted">Add multiple tiers for rules like 3+ years, 5+ years, and 10+ years.</span>
              <button className="button button--secondary" onClick={addServiceTier} type="button">Add service tier</button>
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Balance operation governance"
            description="Configure maker-checker controls for encashment and manual balance mutations so every entity can enforce its own audit posture."
            summaryMeta={<span className="queue-summary-chip"><strong>{formValue.config_snapshot.entitlement.encashment_allowed ? "On" : "Off"}</strong> encashment</span>}
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Request lifecycle governance"
            description="Control whether employees can withdraw pending leave, cancel approved leave, and whether stage-specific evidence is required."
            summaryMeta={<span className="queue-summary-chip"><strong>{formValue.config_snapshot.lifecycle.allow_employee_cancel_approved ? "Cancel on" : "Cancel off"}</strong> lifecycle</span>}
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Holiday-linked leave governance"
            description="Use this when a leave policy should only be booked on specific holiday types such as RH, and when paid usage needs a configurable cap."
            summaryMeta={<span className="queue-summary-chip"><strong>{formValue.config_snapshot.holiday_governance.enabled ? "On" : "Off"}</strong> holiday rules</span>}
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
            collapsible
            defaultOpen={false}
            fullWidth
            title="Workflow preview"
            description="Pick an employee and request size to test the exact approval chain this policy will produce before a real leave request is submitted."
            summaryMeta={<span className="queue-summary-chip"><strong>Test</strong> route</span>}
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
                <div className="notice notice--success detail-row--full">
                  <strong>Preview summary</strong>
                  <span className="muted">
                    For this employee and request size, the policy resolves to {previewResult.entitlement_preview.projected_accrued_amount} accrued units in the selected policy year and routes through {previewResult.approval_route.replaceAll("_", " ")}.
                  </span>
                </div>
                <div className="notice detail-row--full">
                  <strong>How to read this preview</strong>
                  <span className="muted">
                    This does not submit leave. It checks the same entitlement, service-tier, assignment, evidence, and approval-routing logic that will run when an employee applies.
                  </span>
                </div>
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
                      : "No, another active policy currently resolves first. Save and assign this policy if HR expects it to apply."}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Resolved route</span>
                  <span className="detail-row__value">{previewResult.approval_route.replaceAll("_", " ")}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Attachment rule</span>
                  <span className="detail-row__value">{previewResult.required_attachment_reason || "No attachment is required for this request size and leave type."}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Policy period</span>
                  <span className="detail-row__value">
                    FY {previewResult.entitlement_preview.policy_period_year} • {previewResult.entitlement_preview.policy_year_start} to {previewResult.entitlement_preview.policy_year_end}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Entitlement resolution</span>
                  <span className="detail-row__value">
                    {previewResult.entitlement_preview.entitlement_resolution
                      ? `${previewResult.entitlement_preview.entitlement_resolution.resolved_annual_entitlement} annual units. ${previewResult.entitlement_preview.entitlement_resolution.summary}`
                      : "Using configured annual entitlement."}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Service months</span>
                  <span className="detail-row__value">
                    {previewResult.entitlement_preview.entitlement_resolution?.service_months ?? "Not available"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Prorated entitlement</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.prorated_entitlement} units after joining-date and probation rules.</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Projected accrued amount</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.projected_accrued_amount} units available from the accrual schedule as of today.</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Projected carry forward</span>
                  <span className="detail-row__value">{previewResult.entitlement_preview.projected_carry_forward_amount} units expected from the previous policy year, capped by this policy.</span>
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

        {successMessage ? <div className="notice notice--success" role="status"><strong>Save complete.</strong><span className="muted">{successMessage}</span></div> : null}
        {error ? <div className="notice notice--error" role="alert"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
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
