import type {
  HrAdminWorkflowTemplateAssignment,
  HrAdminWorkflowTemplateAssignmentWriteInput,
} from "@/lib/types";

export function workflowTemplateAssignmentToFormValue(item: HrAdminWorkflowTemplateAssignment): HrAdminWorkflowTemplateAssignmentWriteInput {
  return {
    template_id: item.template_id,
    legal_entity_id: item.legal_entity_id,
    branch_id: item.branch_id,
    department_id: item.department_id,
    business_unit_id: item.business_unit_id,
    grade_id: item.grade_id,
    priority: item.priority,
    is_active: item.is_active,
  };
}

export function createEmptyWorkflowTemplateAssignmentValue(): HrAdminWorkflowTemplateAssignmentWriteInput {
  return {
    template_id: null,
    legal_entity_id: null,
    branch_id: null,
    department_id: null,
    business_unit_id: null,
    grade_id: null,
    priority: 100,
    is_active: true,
  };
}
