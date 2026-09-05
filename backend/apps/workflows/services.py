"""Workflow service helpers for operational modules."""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.iam.models import TenantMembership
from apps.workflows.models import (
    WorkflowAction,
    WorkflowActorType,
    WorkflowAssignment,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowModule,
    WorkflowStepMode,
    WorkflowStepInstance,
    WorkflowTemplate,
)


def _create_step_assignment(*, step_instance: WorkflowStepInstance, actor_type: str, membership=None, role=None, actor_identifier: str = ""):
    WorkflowAssignment.objects.create(
        step_instance=step_instance,
        actor_type=actor_type,
        membership=membership,
        role=role,
        actor_identifier=actor_identifier,
    )


def _seed_template_step_assignments(
    *,
    step_instance: WorkflowStepInstance,
    template_step,
    manager_membership: TenantMembership | None,
    hr_owner_membership: TenantMembership | None,
):
    if template_step.actor_type == WorkflowActorType.MANAGER and manager_membership:
        _create_step_assignment(
            step_instance=step_instance,
            actor_type=WorkflowActorType.MANAGER,
            membership=manager_membership,
            actor_identifier=str(manager_membership.user_id),
        )
    elif template_step.actor_type == WorkflowActorType.HR_OWNER and hr_owner_membership:
        _create_step_assignment(
            step_instance=step_instance,
            actor_type=WorkflowActorType.HR_OWNER,
            membership=hr_owner_membership,
            actor_identifier=str(hr_owner_membership.user_id),
        )
    elif template_step.membership_id:
        _create_step_assignment(
            step_instance=step_instance,
            actor_type=template_step.actor_type,
            membership=template_step.membership,
            actor_identifier=str(template_step.membership.user_id),
        )
    elif template_step.role_id:
        _create_step_assignment(
            step_instance=step_instance,
            actor_type=template_step.actor_type,
            role=template_step.role,
            actor_identifier=template_step.role.code,
        )


def _seed_dynamic_approval_chain(*, instance: WorkflowInstance, approval_steps: list[dict[str, Any]]):
    for index, step in enumerate(approval_steps, start=1):
        step_instance = WorkflowStepInstance.objects.create(
            workflow_instance=instance,
            step_order=index,
            name=step.get("name") or f"Approval Step {index}",
            mode=step.get("mode") or WorkflowStepMode.SEQUENTIAL,
            status=WorkflowInstanceStatus.PENDING if index == 1 else WorkflowInstanceStatus.DRAFT,
            started_at=timezone.now() if index == 1 else None,
        )
        membership = step.get("membership")
        role = step.get("role")
        actor_type = step.get("actor_type") or WorkflowActorType.MEMBERSHIP
        actor_identifier = step.get("actor_identifier") or (
            str(membership.user_id) if membership else role.code if role else ""
        )
        if membership or role or actor_identifier:
            _create_step_assignment(
                step_instance=step_instance,
                actor_type=actor_type,
                membership=membership,
                role=role,
                actor_identifier=actor_identifier,
            )


def _get_active_template(tenant, module: str, trigger_key: str) -> WorkflowTemplate | None:
    return (
        WorkflowTemplate.objects.filter(
            tenant=tenant,
            module=module,
            trigger_key=trigger_key,
            status="active",
        )
        .order_by("-version", "-created_at")
        .first()
    )


def create_workflow_instance(
    *,
    tenant,
    module: str,
    trigger_key: str,
    subject_type: str,
    subject_identifier: str,
    initiated_by_identifier: str,
    employee_identifier: str = "",
    payload_snapshot: dict[str, Any] | None = None,
    manager_membership: TenantMembership | None = None,
    hr_owner_membership: TenantMembership | None = None,
    approval_steps: list[dict[str, Any]] | None = None,
) -> WorkflowInstance:
    """Creates a workflow instance and seeds step assignments when possible."""

    template = _get_active_template(tenant, module, trigger_key)
    instance = WorkflowInstance.objects.create(
        tenant=tenant,
        template=template,
        module=module,
        trigger_key=trigger_key,
        subject_type=subject_type,
        subject_identifier=subject_identifier,
        employee_identifier=employee_identifier,
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=1,
        initiated_by_identifier=initiated_by_identifier,
        submitted_at=timezone.now(),
        payload_snapshot=payload_snapshot or {},
    )
    if approval_steps:
        _seed_dynamic_approval_chain(instance=instance, approval_steps=approval_steps)
    elif template:
        steps = list(template.steps.order_by("step_order"))
        for template_step in steps:
            step_instance = WorkflowStepInstance.objects.create(
                workflow_instance=instance,
                template_step=template_step,
                step_order=template_step.step_order,
                name=template_step.name,
                mode=template_step.mode,
                status=WorkflowInstanceStatus.PENDING if template_step.step_order == 1 else WorkflowInstanceStatus.DRAFT,
                started_at=timezone.now() if template_step.step_order == 1 else None,
            )
            _seed_template_step_assignments(
                step_instance=step_instance,
                template_step=template_step,
                manager_membership=manager_membership,
                hr_owner_membership=hr_owner_membership,
            )
    else:
        WorkflowStepInstance.objects.create(
            workflow_instance=instance,
            step_order=1,
            name="Default Approval",
            mode="sequential",
            status=WorkflowInstanceStatus.PENDING,
            started_at=timezone.now(),
        )
    instance.action_logs.create(
        action=WorkflowAction.SUBMIT,
        actor_identifier=initiated_by_identifier,
        to_status=WorkflowInstanceStatus.PENDING,
        payload=payload_snapshot or {},
    )
    return instance


def resolve_workflow_action(*, instance: WorkflowInstance, actor_identifier: str, action: str, comment: str = "") -> WorkflowInstance:
    """Applies a simple approve/reject action to a workflow instance."""

    current_step = instance.step_instances.order_by("step_order").filter(status__in=["pending", "in_progress"]).first()
    if not current_step:
        return instance
    previous_instance_status = instance.status
    current_step.resolved_action = action
    current_step.resolution_comment = comment
    current_step.completed_at = timezone.now()
    if action == WorkflowAction.APPROVE:
        current_step.status = WorkflowInstanceStatus.APPROVED
        next_step = (
            instance.step_instances.order_by("step_order")
            .filter(step_order__gt=current_step.step_order)
            .first()
        )
        if next_step:
            next_step.status = WorkflowInstanceStatus.PENDING
            next_step.started_at = timezone.now()
            next_step.save(update_fields=["status", "started_at", "updated_at"])
            instance.status = WorkflowInstanceStatus.PENDING
            instance.current_step_order = next_step.step_order
        else:
            instance.status = WorkflowInstanceStatus.APPROVED
    elif action == WorkflowAction.REJECT:
        current_step.status = WorkflowInstanceStatus.REJECTED
        instance.status = WorkflowInstanceStatus.REJECTED
    elif action == WorkflowAction.CANCEL:
        current_step.status = WorkflowInstanceStatus.CANCELLED
        instance.status = WorkflowInstanceStatus.CANCELLED
    else:
        current_step.status = WorkflowInstanceStatus.COMPLETED
        instance.status = WorkflowInstanceStatus.IN_PROGRESS
    current_step.save(
        update_fields=[
            "resolved_action",
            "resolution_comment",
            "completed_at",
            "status",
            "updated_at",
        ]
    )
    if instance.status in {
        WorkflowInstanceStatus.APPROVED,
        WorkflowInstanceStatus.REJECTED,
        WorkflowInstanceStatus.CANCELLED,
    }:
        instance.completed_at = timezone.now()
    instance.save(update_fields=["status", "current_step_order", "completed_at", "updated_at"])
    instance.action_logs.create(
        step_instance=current_step,
        action=action,
        actor_identifier=actor_identifier,
        comment=comment,
        from_status=previous_instance_status,
        to_status=instance.status,
    )
    return instance
