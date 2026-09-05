import type { HrAdminAttendancePolicyAssignmentWriteInput, HrAdminScopedAssignment } from "@/lib/types";

export function attendancePolicyAssignmentToFormValue(item: HrAdminScopedAssignment): HrAdminAttendancePolicyAssignmentWriteInput {
  return {
    attendance_policy_id: item.policy_id,
    legal_entity_id: item.legal_entity_id,
    branch_id: item.branch_id,
    location_id: item.location_id ?? null,
    department_id: item.department_id,
    grade_id: item.grade_id,
    employment_type_id: item.employment_type_id,
    employee_id: item.employee_id,
    priority: item.priority,
    is_active: item.is_active,
  };
}

export function createEmptyAttendancePolicyAssignmentValue(): HrAdminAttendancePolicyAssignmentWriteInput {
  return {
    attendance_policy_id: null,
    legal_entity_id: null,
    branch_id: null,
    location_id: null,
    department_id: null,
    grade_id: null,
    employment_type_id: null,
    employee_id: null,
    priority: 100,
    is_active: true,
  };
}
