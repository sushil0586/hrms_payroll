import type { HrAdminDocumentCategory, HrAdminDocumentCategoryWriteInput } from "@/lib/types";

export function documentCategoryToFormValue(item: HrAdminDocumentCategory): HrAdminDocumentCategoryWriteInput {
  return {
    code: item.code,
    name: item.name,
    category_type: item.category_type,
    description: item.description,
    is_active: item.is_active,
    is_system_seeded: item.is_system_seeded,
    requires_expiry_date: item.requires_expiry_date,
    requires_verification: item.requires_verification,
    allow_employee_upload: item.allow_employee_upload,
    allow_multiple_files: item.allow_multiple_files,
    visibility_rules: JSON.stringify(item.visibility_rules ?? {}, null, 2),
  };
}

export function createEmptyDocumentCategoryValue(defaultCategoryType = "other"): HrAdminDocumentCategoryWriteInput {
  return {
    code: "",
    name: "",
    category_type: defaultCategoryType,
    description: "",
    is_active: true,
    is_system_seeded: false,
    requires_expiry_date: false,
    requires_verification: true,
    allow_employee_upload: true,
    allow_multiple_files: false,
    visibility_rules: "{}",
  };
}
