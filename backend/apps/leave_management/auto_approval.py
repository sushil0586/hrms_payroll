"""Policy-owned elapsed-hour approval; all decisions use the normal leave service."""

from datetime import timedelta
import logging
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import CharField, Exists, OuterRef
from django.db.models.functions import Cast
from django.utils import timezone

from apps.leave_management.models import LeavePolicy, LeavePolicyStatus, LeaveRequest, LeaveRequestStatus
from apps.workflows.models import WorkflowInstance, WorkflowInstanceStatus, WorkflowModule, WorkflowStepInstance

logger = logging.getLogger(__name__)
SYSTEM_ACTOR = "system:leave-auto-approval"
WAITING_STATUSES = (LeaveRequestStatus.PENDING, LeaveRequestStatus.PARTIALLY_APPROVED)


class AutoApprovalUnavailable(Exception):
    """A stale, disabled or not-yet-due candidate must not be decided."""


def _recorded_hours(request):
    metadata = request.metadata or {}
    if metadata.get("request_action") != "leave_request":
        return None
    approval = metadata.get("policy_rules", {}).get("config_snapshot", {}).get("approval", {})
    hours = approval.get("auto_approve_after_hours")
    if approval.get("auto_approve_enabled") is True and type(hours) is int and hours > 0:
        return hours
    return None


def _workflow(request, *, lock=False):
    if not request.workflow_reference:
        return None
    try:
        reference = UUID(str(request.workflow_reference))
    except ValueError:
        return None
    queryset = WorkflowInstance.objects
    if lock:
        queryset = queryset.select_for_update()
    return queryset.filter(
        pk=reference, tenant_id=request.tenant_id, module=WorkflowModule.LEAVE,
        subject_type="leave_request", subject_identifier=str(request.pk),
        status__in=(WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS),
    ).first()


def arm_leave_auto_approval(request):
    """Called inside submission/decision transactions, never from a GET."""
    hours = _recorded_hours(request)
    if hours is None or request.status not in WAITING_STATUSES:
        return
    workflow = _workflow(request)
    if workflow is None:
        return
    step = workflow.step_instances.filter(
        step_order=workflow.current_step_order, status=WorkflowInstanceStatus.PENDING,
    ).first()
    if step is None or step.started_at is None or step.due_at is not None:
        return
    try:
        step.due_at = step.started_at + timedelta(hours=hours)
    except OverflowError:
        raise ValidationError({"auto_approve_after_hours": "Waiting hours exceed the supported date range."})
    step.save(update_fields=["due_at", "updated_at"])


def due_leave_auto_approval_context(request):
    """Request → policy → workflow → step locks precede existing ledger locks."""
    hours = _recorded_hours(request)
    if hours is None or request.status not in WAITING_STATUSES or not request.leave_policy_id:
        raise AutoApprovalUnavailable("Request has no eligible recorded automatic approval rule.")
    policy = LeavePolicy.objects.select_for_update().filter(
        pk=request.leave_policy_id, tenant_id=request.tenant_id, leave_type_id=request.leave_type_id,
        status=LeavePolicyStatus.ACTIVE,
    ).first()
    # A policy-level off switch stops future automatic decisions. Edits never
    # enable legacy requests or replace their captured waiting hours.
    if policy is None or (policy.config_snapshot or {}).get("approval", {}).get("auto_approve_enabled") is not True:
        raise AutoApprovalUnavailable("Automatic approval is disabled on the policy.")
    workflow = _workflow(request, lock=True)
    if workflow is None:
        raise AutoApprovalUnavailable("No matching active leave workflow.")
    step = workflow.step_instances.select_for_update().filter(
        step_order=workflow.current_step_order, status=WorkflowInstanceStatus.PENDING,
    ).first()
    now = timezone.now()
    if step is None or step.started_at is None or step.due_at is None:
        raise AutoApprovalUnavailable("Current approval step has no recorded deadline.")
    try:
        expected_deadline = step.started_at + timedelta(hours=hours)
    except OverflowError:
        raise AutoApprovalUnavailable("Recorded waiting hours exceed the supported date range.")
    if step.due_at != expected_deadline or step.due_at > now:
        raise AutoApprovalUnavailable("Current step is not due under its recorded rule.")
    if not step.assignments.exists():
        raise ValidationError({"approval": "Automatic approval requires a configured approver."})
    return {
        "step_id": str(step.pk), "step_order": step.step_order, "hours": hours,
        "basis": "elapsed_hours", "policy_id": str(policy.pk),
        "deadline": step.due_at.isoformat(), "executed_at": now.isoformat(),
        "actor": SYSTEM_ACTOR,
    }


def process_due_leave_auto_approvals(*, limit=100):
    """Bounded scan; duplicates and competing manual decisions are harmless."""
    from apps.leave_management.services import resolve_leave_request

    if type(limit) is not int or limit < 1:
        raise ValueError("limit must be a positive integer")
    eligible = LeaveRequest.objects.filter(
        workflow_reference=Cast(OuterRef("workflow_instance_id"), CharField()),
        tenant_id=OuterRef("workflow_instance__tenant_id"), status__in=WAITING_STATUSES,
        metadata__request_action="leave_request",
        metadata__policy_rules__config_snapshot__approval__auto_approve_enabled=True,
        leave_policy__status=LeavePolicyStatus.ACTIVE,
        leave_policy__config_snapshot__approval__auto_approve_enabled=True,
    )
    candidates = list(WorkflowStepInstance.objects.annotate(
        has_eligible_request=Exists(eligible),
    ).filter(
        has_eligible_request=True,
        workflow_instance__module=WorkflowModule.LEAVE,
        workflow_instance__subject_type="leave_request",
        workflow_instance__status__in=(WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS),
        status=WorkflowInstanceStatus.PENDING, due_at__lte=timezone.now(),
    ).order_by("updated_at", "due_at", "id").values(
        "id", "workflow_instance__subject_identifier", "workflow_instance__tenant_id",
    )[:limit])
    result = {"candidates": len(candidates), "approved_steps": 0, "skipped": 0, "blocked": 0, "failed": 0}
    for candidate in candidates:
        try:
            request_id = UUID(candidate["workflow_instance__subject_identifier"])
            with transaction.atomic():
                request = LeaveRequest.objects.select_for_update(skip_locked=True, of=("self",)).filter(
                    pk=request_id, tenant_id=candidate["workflow_instance__tenant_id"],
                ).first()
                if request is None:
                    result["skipped"] += 1
                    continue
                resolve_leave_request(leave_request=request, actor_employee=None, approve=True, _automatic_approval=True)
            result["approved_steps"] += 1
        except (AutoApprovalUnavailable, ValueError):
            result["skipped"] += 1
        except ValidationError:
            # The atomic block rolls back workflow, audit and ledger together.
            result["blocked"] += 1
            WorkflowStepInstance.objects.filter(pk=candidate["id"], status=WorkflowInstanceStatus.PENDING).update(updated_at=timezone.now())
            logger.warning("Leave automatic approval blocked for candidate %s", candidate["workflow_instance__subject_identifier"], exc_info=True)
        except Exception:
            result["failed"] += 1
            WorkflowStepInstance.objects.filter(pk=candidate["id"], status=WorkflowInstanceStatus.PENDING).update(updated_at=timezone.now())
            logger.exception("Leave automatic approval failed for candidate %s", candidate["workflow_instance__subject_identifier"])
    return result
