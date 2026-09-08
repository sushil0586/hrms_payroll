"""Common app admin registrations."""

from django.contrib import admin

from apps.common.models import (
    HrmsLaunchRemediationAssignment,
    SaasCommercialAuditEvent,
    SaasIncidentRecord,
    SaasSupportAccessGrant,
    SaasTenantChangeRequest,
    SaasUsageMeterSnapshot,
)


@admin.register(HrmsLaunchRemediationAssignment)
class HrmsLaunchRemediationAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "gate_ref",
        "tenant",
        "module_ref",
        "severity",
        "status",
        "owner_role_ref",
        "assigned_to_identifier",
        "due_at",
        "reminder_count",
        "escalated_at",
        "last_seen_at",
    )
    list_filter = ("status", "severity", "module_ref", "owner_role_ref")
    search_fields = ("tenant__name", "tenant__code", "gate_ref", "module_ref", "label", "owner_role_ref", "assigned_to_identifier")
    readonly_fields = ("source_hash", "created_at", "updated_at")


@admin.register(SaasUsageMeterSnapshot)
class SaasUsageMeterSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "meter_ref",
        "current_value",
        "limit_value",
        "remaining_value",
        "status",
        "plan_ref",
        "subscription_status",
        "recorded_at",
    )
    list_filter = ("status", "meter_ref", "plan_ref", "subscription_status")
    search_fields = ("tenant__name", "tenant__code", "meter_ref", "profile_ref", "source_hash")
    readonly_fields = ("source_hash", "created_at", "updated_at")


@admin.register(SaasCommercialAuditEvent)
class SaasCommercialAuditEventAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "event_type",
        "plan_ref",
        "subscription_status",
        "actor_identifier",
        "occurred_at",
    )
    list_filter = ("event_type", "plan_ref", "subscription_status")
    search_fields = ("tenant__name", "tenant__code", "event_type", "actor_identifier", "profile_ref", "source_hash")
    readonly_fields = ("source_hash", "created_at", "updated_at")


@admin.register(SaasTenantChangeRequest)
class SaasTenantChangeRequestAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "request_type",
        "status",
        "title",
        "target_ref",
        "requested_by_identifier",
        "decided_by_identifier",
        "applied_by_identifier",
        "requested_at",
    )
    list_filter = ("request_type", "status")
    search_fields = ("tenant__name", "tenant__code", "title", "target_ref", "requested_by_identifier", "source_hash")
    readonly_fields = ("source_hash", "created_at", "updated_at")


@admin.register(SaasSupportAccessGrant)
class SaasSupportAccessGrantAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "status",
        "support_agent_identifier",
        "requested_duration_minutes",
        "approved_duration_minutes",
        "requested_by_identifier",
        "approved_by_identifier",
        "access_expires_at",
        "session_ref",
    )
    list_filter = ("status",)
    search_fields = ("tenant__name", "tenant__code", "support_agent_identifier", "requested_by_identifier", "session_ref", "source_hash")
    readonly_fields = ("source_hash", "created_at", "updated_at")


@admin.register(SaasIncidentRecord)
class SaasIncidentRecordAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "incident_ref",
        "severity",
        "status",
        "owner_role_ref",
        "detected_at",
        "acknowledged_at",
        "resolved_at",
    )
    list_filter = ("severity", "status", "owner_role_ref")
    search_fields = ("tenant__name", "tenant__code", "incident_ref", "title", "owner_role_ref", "source_hash")
    readonly_fields = ("source_hash", "created_at", "updated_at")
