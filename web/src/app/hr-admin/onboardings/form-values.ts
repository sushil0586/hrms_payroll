import type { HrAdminOnboarding, HrAdminOnboardingWriteInput } from "@/lib/types";

export function onboardingToFormValue(item: HrAdminOnboarding): HrAdminOnboardingWriteInput {
  return {
    employee_id: item.employee_id,
    status: item.status,
    expected_joining_date: item.expected_joining_date,
    actual_joining_date: item.actual_joining_date,
    onboarding_template_code: item.onboarding_template_code,
    owner_value: item.owner_value,
    assigned_owner_identifier: item.assigned_owner_identifier,
    workflow_reference: item.workflow_reference,
    checklist_snapshot: JSON.stringify(item.checklist_snapshot ?? [], null, 2),
    notes: item.notes,
  };
}

export function createEmptyOnboardingValue(defaultStatus = "not_started"): HrAdminOnboardingWriteInput {
  return {
    employee_id: null,
    status: defaultStatus,
    expected_joining_date: null,
    actual_joining_date: null,
    onboarding_template_code: "",
    owner_value: "",
    assigned_owner_identifier: "",
    workflow_reference: "",
    checklist_snapshot: "[]",
    notes: "",
  };
}
