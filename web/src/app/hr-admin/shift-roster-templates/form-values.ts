import type { HrAdminShiftRosterTemplate, HrAdminShiftRosterTemplateWriteInput } from "@/lib/types";

export function shiftRosterTemplateToFormValue(item: HrAdminShiftRosterTemplate): HrAdminShiftRosterTemplateWriteInput {
  return {
    code: item.code,
    name: item.name,
    description: item.description,
    status: item.status,
    shift_id: item.shift_id,
    assignment_kind: item.assignment_kind,
    config_snapshot: {
      rotation: {
        anchor_date: item.config_snapshot?.rotation?.anchor_date ?? null,
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

export function createEmptyShiftRosterTemplateValue(): HrAdminShiftRosterTemplateWriteInput {
  return {
    code: "",
    name: "",
    description: "",
    status: "draft",
    shift_id: null,
    assignment_kind: "fixed",
    config_snapshot: {
      rotation: {
        anchor_date: null,
        entries: [{ position: 0, shift_id: null, span_days: 7 }],
      },
    },
  };
}
