"""Governed retention, legal-hold, export, and erasure orchestration."""

from __future__ import annotations

import hashlib
import json
from datetime import date, timedelta

from django.conf import settings
from django.core.exceptions import FieldDoesNotExist, PermissionDenied, ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.tenants.models import (
    DataGovernanceEvent,
    DataGovernanceRequest,
    GovernanceRequestStatus,
    GovernanceRequestType,
    LegalHold,
    LegalHoldStatus,
    RetentionPolicy,
    RetentionPolicyStatus,
    Tenant,
)


RECORD_CATEGORIES = {
    "employee_master": ("employees.Employee",),
    "employee_documents": ("documents.EmployeeDocument", "documents.DocumentArtifact"),
    "attendance": ("attendance.AttendanceRecord", "attendance.AttendanceRegularization"),
    "leave": ("leave_management.LeaveRequest", "leave_management.LeaveBalance", "leave_management.LeaveBalanceTransaction"),
    "payroll": ("payroll.PayrollRun", "payroll.PayrollCalculationLine", "payroll.PayrollOutputArtifact"),
    "finance": ("payroll.PayrollFinanceHandoff", "payroll.PayrollProviderDelivery"),
    "workflow_audit": ("workflows.WorkflowActionLog", "common.SaasCommercialAuditEvent"),
}


def actor_identifier(user) -> str:
    return getattr(user, "username", "") or getattr(user, "email", "") or str(user.pk)


def record_event(*, tenant: Tenant, event_type: str, actor, request=None, legal_hold=None, evidence=None):
    payload = evidence or {}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return DataGovernanceEvent.objects.create(
        tenant=tenant,
        request=request,
        legal_hold=legal_hold,
        event_type=event_type,
        actor_identifier=actor_identifier(actor),
        evidence=payload,
        evidence_hash=hashlib.sha256(canonical.encode()).hexdigest(),
    )


def _model_for_label(label: str):
    from django.apps import apps

    return apps.get_model(label)


def _eligible_record_count(model, tenant: Tenant, *, lifecycle_field: str, cutoff: date) -> tuple[int, int]:
    tenant_field = next((field for field in model._meta.fields if field.name == "tenant"), None)
    if tenant_field is None:
        raise ValidationError(f"{model._meta.label} is not tenant-scoped.")
    try:
        field = model._meta.get_field(lifecycle_field)
    except FieldDoesNotExist as exc:
        raise ValidationError(f"Configured lifecycle field '{lifecycle_field}' is unavailable on {model._meta.label}.") from exc
    queryset = model.objects.filter(tenant=tenant)
    if isinstance(field, models.DateTimeField):
        eligible = queryset.filter(**{f"{lifecycle_field}__date__lte": cutoff}).count()
    elif isinstance(field, models.DateField):
        eligible = queryset.filter(**{f"{lifecycle_field}__lte": cutoff}).count()
    else:
        raise ValidationError(f"Configured lifecycle field '{lifecycle_field}' is not a date on {model._meta.label}.")
    return queryset.count(), eligible


def retention_preview(tenant: Tenant, *, as_of: date | None = None, scope: dict | None = None) -> dict:
    as_of = as_of or timezone.localdate()
    scope = scope or {}
    selected = scope.get("record_categories") or list(RECORD_CATEGORIES)
    active_holds = LegalHold.objects.filter(tenant=tenant, status=LegalHoldStatus.ACTIVE)
    rows = []
    for category in selected:
        labels = RECORD_CATEGORIES.get(category, ())
        policy = RetentionPolicy.objects.filter(
            tenant__in=[tenant, None],
            record_category=category,
            status=RetentionPolicyStatus.APPROVED,
            effective_from__lte=as_of,
        ).filter(models_effective_to(as_of)).order_by("-tenant_id", "-effective_from").first()
        hold_count = active_holds.filter(record_category__in=["", category]).count()
        model_counts = []
        lifecycle_error = ""
        cutoff = as_of - timedelta(days=policy.retention_days) if policy else None
        for label in labels:
            model = _model_for_label(label)
            try:
                count, eligible_count = _eligible_record_count(
                    model,
                    tenant,
                    lifecycle_field=policy.lifecycle_date_field if policy else "updated_at",
                    cutoff=cutoff or as_of,
                )
            except ValidationError as exc:
                count = model.objects.filter(tenant=tenant).count() if any(field.name == "tenant" for field in model._meta.fields) else 0
                eligible_count = 0
                lifecycle_error = "; ".join(exc.messages)
            model_counts.append({"model": label, "count": count, "eligible_count": eligible_count})
        blockers = []
        if not policy:
            blockers.append("No approved retention policy applies.")
        if hold_count:
            blockers.append(f"{hold_count} active legal hold(s) apply.")
        if lifecycle_error:
            blockers.append(lifecycle_error)
        eligible_record_count = sum(item["eligible_count"] for item in model_counts)
        if policy and not lifecycle_error and eligible_record_count == 0:
            blockers.append("No records have reached the configured retention expiry date.")
        rows.append({
            "record_category": category,
            "record_count": sum(item["count"] for item in model_counts),
            "eligible_record_count": eligible_record_count,
            "models": model_counts,
            "policy_id": str(policy.id) if policy else None,
            "retention_days": policy.retention_days if policy else None,
            "legal_hold_count": hold_count,
            "retention_cutoff": cutoff.isoformat() if cutoff else None,
            "eligible": bool(policy) and not hold_count and not lifecycle_error and eligible_record_count > 0,
            "blockers": blockers,
        })
    return {
        "tenant_id": str(tenant.id),
        "as_of": as_of.isoformat(),
        "categories": rows,
        "eligible_category_count": sum(1 for row in rows if row["eligible"]),
        "blocked_category_count": sum(1 for row in rows if not row["eligible"]),
        "destructive_execution_enabled": bool(getattr(settings, "DATA_ERASURE_EXECUTION_ENABLED", False)),
        "backup_disposition": "external-verification-required",
        "storage_disposition": "object-inventory-required",
    }


def models_effective_to(as_of: date):
    from django.db.models import Q

    return Q(effective_to__isnull=True) | Q(effective_to__gte=as_of)


@transaction.atomic
def place_legal_hold(*, tenant: Tenant, actor, reason: str, authority_ref: str, **scope) -> LegalHold:
    if not reason.strip() or not authority_ref.strip():
        raise ValidationError("Legal hold reason and authority reference are required.")
    hold = LegalHold.objects.create(tenant=tenant, placed_by=actor, reason=reason, authority_ref=authority_ref, **scope)
    record_event(tenant=tenant, legal_hold=hold, event_type="legal_hold_placed", actor=actor, evidence={"scope": scope, "authority_ref": authority_ref})
    return hold


@transaction.atomic
def release_legal_hold(hold_id, *, actor, reason: str) -> LegalHold:
    hold = LegalHold.objects.select_for_update().get(id=hold_id)
    if hold.status == LegalHoldStatus.RELEASED:
        return hold
    if hold.placed_by_id == actor.pk:
        raise PermissionDenied("The hold placer cannot release the same legal hold.")
    if not reason.strip():
        raise ValidationError("A release reason is required.")
    hold.status = LegalHoldStatus.RELEASED
    hold.released_by = actor
    hold.released_at = timezone.now()
    hold.release_reason = reason
    hold.save(update_fields=["status", "released_by", "released_at", "release_reason", "updated_at"])
    record_event(tenant=hold.tenant, legal_hold=hold, event_type="legal_hold_released", actor=actor, evidence={"reason": reason})
    return hold


@transaction.atomic
def create_governance_request(*, tenant: Tenant, actor, request_type: str, reason: str, scope: dict, idempotency_key: str):
    if request_type not in GovernanceRequestType.values:
        raise ValidationError("Unsupported governance request type.")
    if not reason.strip() or not idempotency_key.strip():
        raise ValidationError("Reason and idempotency key are required.")
    existing = DataGovernanceRequest.objects.filter(tenant=tenant, request_type=request_type, idempotency_key=idempotency_key).first()
    if existing:
        return existing, False
    preview = retention_preview(tenant, scope=scope)
    item = DataGovernanceRequest.objects.create(
        tenant=tenant, request_type=request_type, reason=reason, scope=scope,
        requested_by=actor, idempotency_key=idempotency_key, preview_snapshot=preview,
    )
    record_event(tenant=tenant, request=item, event_type=f"{request_type}_requested", actor=actor, evidence={"scope": scope})
    return item, True


@transaction.atomic
def approve_governance_request(request_id, *, actor):
    item = DataGovernanceRequest.objects.select_for_update().get(id=request_id)
    if item.requested_by_id == actor.pk:
        raise PermissionDenied("Maker/checker separation requires a different approver.")
    if item.status in {GovernanceRequestStatus.APPROVED, GovernanceRequestStatus.QUEUED, GovernanceRequestStatus.RUNNING, GovernanceRequestStatus.SUCCEEDED}:
        return item, False
    if item.status != GovernanceRequestStatus.REQUESTED:
        raise ValidationError("Only requested actions can be approved.")
    item.status = GovernanceRequestStatus.APPROVED
    item.approved_by = actor
    item.approved_at = timezone.now()
    item.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
    record_event(tenant=item.tenant, request=item, event_type=f"{item.request_type}_approved", actor=actor)
    return item, True


@transaction.atomic
def execute_governance_request(request_id, *, task_id=""):
    item = DataGovernanceRequest.objects.select_for_update().select_related("tenant").get(id=request_id)
    if item.status == GovernanceRequestStatus.SUCCEEDED:
        return item
    if item.status not in {GovernanceRequestStatus.APPROVED, GovernanceRequestStatus.QUEUED, GovernanceRequestStatus.FAILED}:
        raise ValidationError("Governance request is not executable.")
    item.status = GovernanceRequestStatus.RUNNING
    item.task_id = task_id
    item.attempt_count += 1
    item.save(update_fields=["status", "task_id", "attempt_count", "updated_at"])
    preview = retention_preview(item.tenant, scope=item.scope)
    if item.request_type == GovernanceRequestType.ERASURE:
        blockers = [blocker for category in preview["categories"] for blocker in category["blockers"]]
        if not getattr(settings, "DATA_ERASURE_EXECUTION_ENABLED", False):
            blockers.append("Irreversible erasure is disabled by deployment policy.")
        item.status = GovernanceRequestStatus.BLOCKED
        item.result_snapshot = {"executed": False, "blockers": sorted(set(blockers)), "preview": preview}
    else:
        item.status = GovernanceRequestStatus.SUCCEEDED
        item.result_snapshot = {
            "export_manifest_version": 1,
            "tenant_id": str(item.tenant_id),
            "generated_at": timezone.now().isoformat(),
            "categories": preview["categories"],
            "artifact_status": "manifest-only",
            "protected_download_required": True,
        }
        item.completed_at = timezone.now()
    item.save(update_fields=["status", "result_snapshot", "completed_at", "updated_at"])
    record_event(tenant=item.tenant, request=item, event_type=f"{item.request_type}_{item.status}", actor=item.approved_by, evidence={"attempt_count": item.attempt_count})
    return item
