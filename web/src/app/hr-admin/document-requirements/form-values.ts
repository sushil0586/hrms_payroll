import type {
  HrAdminDocumentRequirementRule,
  HrAdminDocumentRequirementRuleWriteInput,
} from "@/lib/types";

export function documentRequirementToFormValue(item: HrAdminDocumentRequirementRule): HrAdminDocumentRequirementRuleWriteInput {
  return {
    category_id: item.category_id,
    legal_entity_id: item.legal_entity_id,
    branch_id: item.branch_id,
    department_id: item.department_id,
    grade_id: item.grade_id,
    employment_type_id: item.employment_type_id,
    is_mandatory: item.is_mandatory,
    required_within_days_of_joining: item.required_within_days_of_joining,
    priority: item.priority,
    is_active: item.is_active,
  };
}

export function createEmptyDocumentRequirementValue(): HrAdminDocumentRequirementRuleWriteInput {
  return {
    category_id: null,
    legal_entity_id: null,
    branch_id: null,
    department_id: null,
    grade_id: null,
    employment_type_id: null,
    is_mandatory: true,
    required_within_days_of_joining: 0,
    priority: 100,
    is_active: true,
  };
}
