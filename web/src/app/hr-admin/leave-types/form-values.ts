import type { HrAdminLeaveType, HrAdminLeaveTypeWriteInput } from "@/lib/types";

export function leaveTypeToFormValue(item: HrAdminLeaveType): HrAdminLeaveTypeWriteInput {
  return {
    code: item.code,
    name: item.name,
    short_code: item.short_code,
    category: item.category,
    unit: item.unit,
    color_code: item.color_code,
    description: item.description,
    is_active: item.is_active,
    requires_attachment: item.requires_attachment,
    allow_negative_balance: item.allow_negative_balance,
    is_approval_required: item.is_approval_required,
  };
}

export function createEmptyLeaveTypeValue(defaultCategory: string, defaultUnit: string): HrAdminLeaveTypeWriteInput {
  return {
    code: "",
    name: "",
    short_code: "",
    category: defaultCategory,
    unit: defaultUnit,
    color_code: "",
    description: "",
    is_active: true,
    requires_attachment: false,
    allow_negative_balance: false,
    is_approval_required: true,
  };
}
