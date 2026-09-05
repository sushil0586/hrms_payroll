import type {
  HrAdminWorkflowStepWriteInput,
  HrAdminWorkflowTemplate,
  HrAdminWorkflowTemplateWriteInput,
} from "@/lib/types";

export function workflowTemplateToFormValue(item: HrAdminWorkflowTemplate): HrAdminWorkflowTemplateWriteInput {
  return {
    code: item.code,
    name: item.name,
    module: item.module,
    trigger_key: item.trigger_key,
    description: item.description,
    status: item.status,
    version: item.version,
    is_system_seeded: item.is_system_seeded,
    effective_from: item.effective_from,
    effective_to: item.effective_to,
    condition_snapshot: JSON.stringify(item.condition_snapshot ?? {}, null, 2),
    steps: item.steps.map((step) => ({
      step_order: step.step_order,
      name: step.name,
      mode: step.mode,
      actor_type: step.actor_type,
      role_id: step.role_id,
      membership_id: step.membership_id,
      permission_key: step.permission_key,
      scope_type: step.scope_type,
      auto_approve_after_hours: step.auto_approve_after_hours,
      escalate_after_hours: step.escalate_after_hours,
      allow_delegate: step.allow_delegate,
      allow_send_back: step.allow_send_back,
      allow_comment: step.allow_comment,
      rule_snapshot: step.rule_snapshot ?? {},
    })),
  };
}

export function createEmptyWorkflowStep(
  defaults?: Partial<Pick<HrAdminWorkflowStepWriteInput, "mode" | "actor_type" | "scope_type">>,
  stepOrder = 1,
): HrAdminWorkflowStepWriteInput {
  return {
    step_order: stepOrder,
    name: "",
    mode: defaults?.mode ?? "sequential",
    actor_type: defaults?.actor_type ?? "manager",
    role_id: null,
    membership_id: null,
    permission_key: "",
    scope_type: defaults?.scope_type ?? "direct_reports",
    auto_approve_after_hours: 0,
    escalate_after_hours: 0,
    allow_delegate: true,
    allow_send_back: true,
    allow_comment: true,
    rule_snapshot: {},
  };
}

export function createEmptyWorkflowTemplateValue(): HrAdminWorkflowTemplateWriteInput {
  return {
    code: "",
    name: "",
    module: "leave",
    trigger_key: "",
    description: "",
    status: "draft",
    version: 1,
    is_system_seeded: false,
    effective_from: null,
    effective_to: null,
    condition_snapshot: "{}",
    steps: [createEmptyWorkflowStep(undefined, 1)],
  };
}
