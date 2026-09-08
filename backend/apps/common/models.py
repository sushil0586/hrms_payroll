"""Shared model abstractions for the HRMS backend."""

import hashlib
import json
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Adds created and updated timestamps to derived models."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDPrimaryKeyModel(models.Model):
    """Uses UUIDs for public-facing identifiers."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """Marks rows as inactive without physically deleting them."""

    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        abstract = True

    def soft_delete(self) -> None:
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at"])


class HrmsLaunchRemediationStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"
    IGNORED = "ignored", "Ignored"


class HrmsLaunchRemediationAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Materialized launch-audit remediation item for a tenant gate."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="hrms_launch_remediation_assignments")
    gate_ref = models.CharField(max_length=180)
    module_ref = models.CharField(max_length=120)
    module_label = models.CharField(max_length=160)
    label = models.CharField(max_length=180)
    severity = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20,
        choices=HrmsLaunchRemediationStatus.choices,
        default=HrmsLaunchRemediationStatus.OPEN,
    )
    owner_role_ref = models.CharField(max_length=120)
    assigned_to_identifier = models.CharField(max_length=160, blank=True)
    action_href = models.CharField(max_length=240)
    action_label = models.CharField(max_length=160)
    sla_days = models.PositiveSmallIntegerField(default=3)
    current_value = models.CharField(max_length=240, blank=True)
    evidence_ref = models.CharField(max_length=180, blank=True)
    first_seen_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)
    due_at = models.DateTimeField(blank=True, null=True)
    due_source_ref = models.CharField(max_length=120, default="launch_audit.sla_days")
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    acknowledged_by_identifier = models.CharField(max_length=160, blank=True)
    reminder_sent_at = models.DateTimeField(blank=True, null=True)
    reminder_count = models.PositiveSmallIntegerField(default=0)
    escalated_at = models.DateTimeField(blank=True, null=True)
    escalated_by_identifier = models.CharField(max_length=160, blank=True)
    escalation_owner_role_ref = models.CharField(max_length=120, blank=True)
    ignored_at = models.DateTimeField(blank=True, null=True)
    ignored_by_identifier = models.CharField(max_length=160, blank=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    resolution_note = models.TextField(blank=True)
    action_history = models.JSONField(default=list, blank=True)
    assignment_snapshot = models.JSONField(default=dict, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["status", "severity", "module_ref", "gate_ref"]
        unique_together = [("tenant", "gate_ref")]
        indexes = [
            models.Index(fields=["tenant", "status", "severity"]),
            models.Index(fields=["tenant", "module_ref"]),
            models.Index(fields=["tenant", "owner_role_ref"]),
        ]
        verbose_name = "HRMS Launch Remediation Assignment"
        verbose_name_plural = "HRMS Launch Remediation Assignments"

    def _assignment_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "gate_ref": self.gate_ref,
            "module_ref": self.module_ref,
            "label": self.label,
            "severity": self.severity,
            "status": self.status,
            "owner_role_ref": self.owner_role_ref,
            "assigned_to_identifier": self.assigned_to_identifier,
            "action_href": self.action_href,
            "action_label": self.action_label,
            "sla_days": self.sla_days,
            "current_value": self.current_value,
            "evidence_ref": self.evidence_ref,
            "due_at": self.due_at,
            "due_source_ref": self.due_source_ref,
            "acknowledged_at": self.acknowledged_at,
            "acknowledged_by_identifier": self.acknowledged_by_identifier,
            "reminder_sent_at": self.reminder_sent_at,
            "reminder_count": self.reminder_count,
            "escalated_at": self.escalated_at,
            "escalated_by_identifier": self.escalated_by_identifier,
            "escalation_owner_role_ref": self.escalation_owner_role_ref,
            "ignored_at": self.ignored_at,
            "ignored_by_identifier": self.ignored_by_identifier,
            "resolved_at": self.resolved_at,
            "resolution_note": self.resolution_note,
            "action_history": self.action_history,
            "assignment_snapshot": self.assignment_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if self.severity not in {"blocker", "warning"}:
            errors["severity"] = "Severity must be blocker or warning."
        if not isinstance(self.assignment_snapshot, dict):
            errors["assignment_snapshot"] = "Assignment snapshot must be an object."
        if not isinstance(self.action_history, list):
            errors["action_history"] = "Action history must be a list."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.status != HrmsLaunchRemediationStatus.OPEN and not self.resolved_at:
            self.resolved_at = timezone.now()
        if self.status == HrmsLaunchRemediationStatus.OPEN:
            self.resolved_at = None
        self.source_hash = self._assignment_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.gate_ref}:{self.status}"


class SaasUsageMeterSnapshot(UUIDPrimaryKeyModel, TimeStampedModel):
    """Point-in-time commercial usage evidence for a tenant meter."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="saas_usage_meter_snapshots")
    profile_ref = models.CharField(max_length=160)
    profile_source = models.CharField(max_length=80)
    plan_ref = models.CharField(max_length=80)
    subscription_status = models.CharField(max_length=40)
    meter_ref = models.CharField(max_length=120)
    label = models.CharField(max_length=160)
    current_value = models.PositiveIntegerField(default=0)
    limit_value = models.PositiveIntegerField(default=0)
    remaining_value = models.PositiveIntegerField(blank=True, null=True)
    status = models.CharField(max_length=40)
    source_ref = models.CharField(max_length=160, default="saas.commercial_control.snapshot.v1")
    actor_identifier = models.CharField(max_length=160, blank=True)
    recorded_at = models.DateTimeField(default=timezone.now)
    evidence_snapshot = models.JSONField(default=dict, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-recorded_at", "meter_ref"]
        indexes = [
            models.Index(fields=["tenant", "meter_ref", "-recorded_at"]),
            models.Index(fields=["tenant", "status"]),
        ]
        verbose_name = "SaaS Usage Meter Snapshot"
        verbose_name_plural = "SaaS Usage Meter Snapshots"

    def _snapshot_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "profile_ref": self.profile_ref,
            "profile_source": self.profile_source,
            "plan_ref": self.plan_ref,
            "subscription_status": self.subscription_status,
            "meter_ref": self.meter_ref,
            "label": self.label,
            "current_value": self.current_value,
            "limit_value": self.limit_value,
            "remaining_value": self.remaining_value,
            "status": self.status,
            "source_ref": self.source_ref,
            "actor_identifier": self.actor_identifier,
            "recorded_at": self.recorded_at,
            "evidence_snapshot": self.evidence_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if not isinstance(self.evidence_snapshot, dict):
            errors["evidence_snapshot"] = "Evidence snapshot must be an object."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.source_hash = self._snapshot_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.meter_ref}:{self.recorded_at:%Y-%m-%d}"


class SaasCommercialAuditEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Audit ledger for tenant commercial lifecycle and enforcement decisions."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="saas_commercial_audit_events")
    event_type = models.CharField(max_length=80)
    actor_identifier = models.CharField(max_length=160, blank=True)
    source_ref = models.CharField(max_length=160, default="saas.commercial_control.lifecycle.v1")
    profile_ref = models.CharField(max_length=160)
    profile_source = models.CharField(max_length=80)
    plan_ref = models.CharField(max_length=80)
    subscription_status = models.CharField(max_length=40)
    occurred_at = models.DateTimeField(default=timezone.now)
    previous_state = models.JSONField(default=dict, blank=True)
    new_state = models.JSONField(default=dict, blank=True)
    usage_snapshot = models.JSONField(default=list, blank=True)
    enforcement_snapshot = models.JSONField(default=dict, blank=True)
    event_snapshot = models.JSONField(default=dict, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["tenant", "event_type", "-occurred_at"]),
            models.Index(fields=["tenant", "plan_ref"]),
        ]
        verbose_name = "SaaS Commercial Audit Event"
        verbose_name_plural = "SaaS Commercial Audit Events"

    def _event_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "event_type": self.event_type,
            "actor_identifier": self.actor_identifier,
            "source_ref": self.source_ref,
            "profile_ref": self.profile_ref,
            "profile_source": self.profile_source,
            "plan_ref": self.plan_ref,
            "subscription_status": self.subscription_status,
            "occurred_at": self.occurred_at,
            "previous_state": self.previous_state,
            "new_state": self.new_state,
            "usage_snapshot": self.usage_snapshot,
            "enforcement_snapshot": self.enforcement_snapshot,
            "event_snapshot": self.event_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if not isinstance(self.previous_state, dict):
            errors["previous_state"] = "Previous state must be an object."
        if not isinstance(self.new_state, dict):
            errors["new_state"] = "New state must be an object."
        if not isinstance(self.usage_snapshot, list):
            errors["usage_snapshot"] = "Usage snapshot must be a list."
        if not isinstance(self.enforcement_snapshot, dict):
            errors["enforcement_snapshot"] = "Enforcement snapshot must be an object."
        if not isinstance(self.event_snapshot, dict):
            errors["event_snapshot"] = "Event snapshot must be an object."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.source_hash = self._event_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.event_type}:{self.occurred_at:%Y-%m-%d %H:%M}"


class SaasTenantChangeRequestType(models.TextChoices):
    PLAN_CHANGE = "plan_change", "Plan Change"
    BILLING_CONTACT = "billing_contact", "Billing Contact"
    CONFIGURATION_CHANGE = "configuration_change", "Configuration Change"


class SaasTenantChangeRequestStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    APPLIED = "applied", "Applied"
    CANCELED = "canceled", "Canceled"


class SaasTenantChangeRequest(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-admin request ledger for commercial and configuration changes."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="saas_tenant_change_requests")
    request_type = models.CharField(max_length=40, choices=SaasTenantChangeRequestType.choices)
    status = models.CharField(
        max_length=30,
        choices=SaasTenantChangeRequestStatus.choices,
        default=SaasTenantChangeRequestStatus.SUBMITTED,
    )
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    target_ref = models.CharField(max_length=180, blank=True)
    requested_by_identifier = models.CharField(max_length=160)
    decided_by_identifier = models.CharField(max_length=160, blank=True)
    applied_by_identifier = models.CharField(max_length=160, blank=True)
    requested_payload = models.JSONField(default=dict, blank=True)
    current_snapshot = models.JSONField(default=dict, blank=True)
    decision_note = models.TextField(blank=True)
    action_history = models.JSONField(default=list, blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    decided_at = models.DateTimeField(blank=True, null=True)
    applied_at = models.DateTimeField(blank=True, null=True)
    source_ref = models.CharField(max_length=160, default="saas.tenant_admin.change_request.v1")
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-requested_at", "-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "request_type", "status"]),
            models.Index(fields=["tenant", "status", "-requested_at"]),
            models.Index(fields=["tenant", "target_ref"]),
        ]
        verbose_name = "SaaS Tenant Change Request"
        verbose_name_plural = "SaaS Tenant Change Requests"

    def _request_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "request_type": self.request_type,
            "status": self.status,
            "title": self.title,
            "description": self.description,
            "target_ref": self.target_ref,
            "requested_by_identifier": self.requested_by_identifier,
            "decided_by_identifier": self.decided_by_identifier,
            "applied_by_identifier": self.applied_by_identifier,
            "requested_payload": self.requested_payload,
            "current_snapshot": self.current_snapshot,
            "decision_note": self.decision_note,
            "action_history": self.action_history,
            "requested_at": self.requested_at,
            "decided_at": self.decided_at,
            "applied_at": self.applied_at,
            "source_ref": self.source_ref,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if not isinstance(self.requested_payload, dict):
            errors["requested_payload"] = "Requested payload must be an object."
        if not isinstance(self.current_snapshot, dict):
            errors["current_snapshot"] = "Current snapshot must be an object."
        if not isinstance(self.action_history, list):
            errors["action_history"] = "Action history must be a list."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.source_hash = self._request_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.request_type}:{self.status}"


class SaasSupportAccessGrantStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    ACTIVE = "active", "Active"
    ENDED = "ended", "Ended"
    REVOKED = "revoked", "Revoked"
    EXPIRED = "expired", "Expired"


class SaasSupportAccessGrant(UUIDPrimaryKeyModel, TimeStampedModel):
    """Time-boxed support access grant approved by a tenant administrator."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="saas_support_access_grants")
    status = models.CharField(
        max_length=30,
        choices=SaasSupportAccessGrantStatus.choices,
        default=SaasSupportAccessGrantStatus.REQUESTED,
    )
    support_agent_identifier = models.CharField(max_length=160)
    reason = models.TextField()
    scope_refs = models.JSONField(default=list, blank=True)
    requested_duration_minutes = models.PositiveSmallIntegerField(default=60)
    approved_duration_minutes = models.PositiveSmallIntegerField(default=0)
    requested_by_identifier = models.CharField(max_length=160)
    approved_by_identifier = models.CharField(max_length=160, blank=True)
    revoked_by_identifier = models.CharField(max_length=160, blank=True)
    started_by_identifier = models.CharField(max_length=160, blank=True)
    ended_by_identifier = models.CharField(max_length=160, blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    approved_at = models.DateTimeField(blank=True, null=True)
    access_starts_at = models.DateTimeField(blank=True, null=True)
    access_expires_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    decision_note = models.TextField(blank=True)
    session_ref = models.CharField(max_length=180, blank=True)
    action_history = models.JSONField(default=list, blank=True)
    request_snapshot = models.JSONField(default=dict, blank=True)
    source_ref = models.CharField(max_length=160, default="saas.support_access.grant.v1")
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-requested_at", "-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "-requested_at"]),
            models.Index(fields=["tenant", "support_agent_identifier"]),
            models.Index(fields=["tenant", "access_expires_at"]),
        ]
        verbose_name = "SaaS Support Access Grant"
        verbose_name_plural = "SaaS Support Access Grants"

    def _grant_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "status": self.status,
            "support_agent_identifier": self.support_agent_identifier,
            "reason": self.reason,
            "scope_refs": self.scope_refs,
            "requested_duration_minutes": self.requested_duration_minutes,
            "approved_duration_minutes": self.approved_duration_minutes,
            "requested_by_identifier": self.requested_by_identifier,
            "approved_by_identifier": self.approved_by_identifier,
            "revoked_by_identifier": self.revoked_by_identifier,
            "started_by_identifier": self.started_by_identifier,
            "ended_by_identifier": self.ended_by_identifier,
            "requested_at": self.requested_at,
            "approved_at": self.approved_at,
            "access_starts_at": self.access_starts_at,
            "access_expires_at": self.access_expires_at,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "revoked_at": self.revoked_at,
            "decision_note": self.decision_note,
            "session_ref": self.session_ref,
            "action_history": self.action_history,
            "request_snapshot": self.request_snapshot,
            "source_ref": self.source_ref,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if not isinstance(self.scope_refs, list):
            errors["scope_refs"] = "Scope refs must be a list."
        if not isinstance(self.action_history, list):
            errors["action_history"] = "Action history must be a list."
        if not isinstance(self.request_snapshot, dict):
            errors["request_snapshot"] = "Request snapshot must be an object."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.source_hash = self._grant_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.support_agent_identifier}:{self.status}"


class SaasIncidentSeverity(models.TextChoices):
    CRITICAL = "critical", "Critical"
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"


class SaasIncidentStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    MITIGATED = "mitigated", "Mitigated"
    RESOLVED = "resolved", "Resolved"
    CANCELED = "canceled", "Canceled"


class SaasIncidentRecord(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-scoped incident and service-impact ledger for SaaS operations."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="saas_incident_records")
    incident_ref = models.CharField(max_length=160)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=30, choices=SaasIncidentSeverity.choices, default=SaasIncidentSeverity.MEDIUM)
    status = models.CharField(max_length=30, choices=SaasIncidentStatus.choices, default=SaasIncidentStatus.OPEN)
    impact_refs = models.JSONField(default=list, blank=True)
    owner_role_ref = models.CharField(max_length=120, default="platform-owner")
    detected_at = models.DateTimeField(default=timezone.now)
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    mitigated_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    target_response_minutes = models.PositiveIntegerField(default=60)
    target_resolution_minutes = models.PositiveIntegerField(default=240)
    breached_response_at = models.DateTimeField(blank=True, null=True)
    breached_resolution_at = models.DateTimeField(blank=True, null=True)
    action_history = models.JSONField(default=list, blank=True)
    incident_snapshot = models.JSONField(default=dict, blank=True)
    source_ref = models.CharField(max_length=160, default="saas.incident.record.v1")
    source_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["status", "-detected_at"]
        unique_together = [("tenant", "incident_ref")]
        indexes = [
            models.Index(fields=["tenant", "status", "severity"]),
            models.Index(fields=["tenant", "-detected_at"]),
            models.Index(fields=["tenant", "owner_role_ref"]),
        ]
        verbose_name = "SaaS Incident Record"
        verbose_name_plural = "SaaS Incident Records"

    def _incident_digest(self) -> str:
        payload = {
            "tenant_id": str(self.tenant_id or ""),
            "incident_ref": self.incident_ref,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "status": self.status,
            "impact_refs": self.impact_refs,
            "owner_role_ref": self.owner_role_ref,
            "detected_at": self.detected_at,
            "acknowledged_at": self.acknowledged_at,
            "mitigated_at": self.mitigated_at,
            "resolved_at": self.resolved_at,
            "target_response_minutes": self.target_response_minutes,
            "target_resolution_minutes": self.target_resolution_minutes,
            "breached_response_at": self.breached_response_at,
            "breached_resolution_at": self.breached_resolution_at,
            "action_history": self.action_history,
            "incident_snapshot": self.incident_snapshot,
            "source_ref": self.source_ref,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if not isinstance(self.impact_refs, list):
            errors["impact_refs"] = "Impact refs must be a list."
        if not isinstance(self.action_history, list):
            errors["action_history"] = "Action history must be a list."
        if not isinstance(self.incident_snapshot, dict):
            errors["incident_snapshot"] = "Incident snapshot must be an object."
        if self.source_hash and len(self.source_hash) != 64:
            errors["source_hash"] = "Source hash must be a SHA-256 hex digest."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.status == SaasIncidentStatus.ACKNOWLEDGED and not self.acknowledged_at:
            self.acknowledged_at = timezone.now()
        if self.status == SaasIncidentStatus.MITIGATED and not self.mitigated_at:
            self.mitigated_at = timezone.now()
        if self.status in {SaasIncidentStatus.RESOLVED, SaasIncidentStatus.CANCELED} and not self.resolved_at:
            self.resolved_at = timezone.now()
        if self.status in {SaasIncidentStatus.OPEN, SaasIncidentStatus.ACKNOWLEDGED, SaasIncidentStatus.MITIGATED}:
            self.resolved_at = None
        self.source_hash = self._incident_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.incident_ref}:{self.status}"
