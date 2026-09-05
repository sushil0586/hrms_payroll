import type { HrAdminEmployeeShiftAssignment, HrAdminEmployeeShiftAssignmentWriteInput } from "@/lib/types";

export function employeeShiftAssignmentToFormValue(item: HrAdminEmployeeShiftAssignment): HrAdminEmployeeShiftAssignmentWriteInput {
  return {
    employee_id: item.employee_id,
    shift_id: item.shift_id,
    assignment_kind: item.assignment_kind,
    effective_from: item.effective_from,
    effective_to: item.effective_to,
    is_primary: item.is_primary,
    config_snapshot: {
      rotation: {
        anchor_date: item.config_snapshot?.rotation?.anchor_date ?? item.effective_from,
        entries:
          item.config_snapshot?.rotation?.entries?.map((entry) => ({
            position: entry.position,
            shift_id: entry.shift_id,
            span_days: entry.span_days,
          })) ?? [{ position: 0, shift_id: item.shift_id, span_days: 7 }],
      },
    },
  };
}

export function createEmptyEmployeeShiftAssignmentValue(): HrAdminEmployeeShiftAssignmentWriteInput {
  return {
    employee_id: null,
    shift_id: null,
    assignment_kind: "fixed",
    effective_from: "",
    effective_to: null,
    is_primary: true,
    config_snapshot: {
      rotation: {
        anchor_date: null,
        entries: [{ position: 0, shift_id: null, span_days: 7 }],
      },
    },
  };
}
