"""Shared selectors for the first API slice."""

import hashlib
import json
import secrets
import uuid
from copy import deepcopy
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from apps.common.models import (
    HrmsLaunchRemediationAssignment,
    HrmsLaunchRemediationStatus,
    SaasCommercialAuditEvent,
    SaasIncidentRecord,
    SaasIncidentSeverity,
    SaasIncidentStatus,
    SaasSupportAccessGrant,
    SaasSupportAccessGrantStatus,
    SaasTenantChangeRequest,
    SaasTenantChangeRequestStatus,
    SaasTenantChangeRequestType,
    SaasUsageMeterSnapshot,
)
from apps.attendance.models import AttendancePolicy, AttendancePolicyStatus, AttendanceRecord, AttendanceRegularization, AttendanceStatus, RegularizationStatus
from apps.documents.models import DocumentCategory, DocumentRequirementRule, EmployeeDocument, VerificationStatus
from apps.employee_lifecycle.models import EmployeeExit, EmployeeMovement, EmployeeOnboarding, ExitStatus, OnboardingStatus, ProbationDecision, ProbationReview
from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.leave_management.models import LeaveBalance, LeavePolicy, LeavePolicyStatus, LeaveRequest, LeaveRequestStatus, LeaveType
from apps.leave_management.services import _get_leave_request_lifecycle_runtime, get_leave_policy_period_year
from apps.notifications.models import Notification, NotificationEventDefinition, NotificationStatus, NotificationTemplate, NotificationTemplateStatus
from apps.notifications.services import trigger_notification_event
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.payroll.models import (
    PayGroup,
    PayGroupStatus,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollFinanceHandoff,
    PayrollOutputArtifact,
    PayrollOutputBatch,
    PayrollProviderConnectionStatus,
    PayrollProviderDelivery,
    PayrollProviderDeliveryStatus,
    PayrollProviderJob,
    PayrollProviderJobStatus,
    PayrollProviderLaunchRehearsal,
    PayrollProviderLaunchRehearsalStatus,
    PayrollProviderConnection,
    PayrollProviderRetryEvent,
    PayrollProviderRetryEventStatus,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunStatus,
    SalaryComponent,
    SalaryStructureVersion,
)
from apps.platform_config.models import ConfigCategory, ConfigDataType, ConfigStatus, ConfigurationDefinition, TenantConfiguration
from apps.tenants.models import Tenant, TenantStatus
from apps.workflows.models import WorkflowAssignment, WorkflowInstanceStatus, WorkflowStatus, WorkflowTemplate


PAYROLL_READINESS_CONFIG_KEY = "payroll.readiness_profile.v1"
SAAS_COMMERCIAL_PROFILE_CONFIG_KEY = "saas.commercial_profile.v1"
SAAS_COMMERCIAL_PROFILE_REF = "saas.commercial_profile.v1"
SAAS_OPERATIONAL_HEALTH_REF = "saas.operational_health.v1"
SAAS_RESILIENCE_PROFILE_CONFIG_KEY = "saas.resilience_profile.v1"
SAAS_RESILIENCE_PROFILE_REF = "saas.resilience_profile.v1"
SAAS_RESILIENCE_READINESS_REF = "saas.resilience_readiness.v1"
SAAS_SLA_PROFILE_CONFIG_KEY = "saas.sla_profile.v1"
SAAS_SLA_PROFILE_REF = "saas.sla_profile.v1"
SAAS_SLA_OPERATIONS_REF = "saas.sla_operations.v1"
SAAS_ENTERPRISE_SECURITY_PROFILE_CONFIG_KEY = "saas.enterprise_security_profile.v1"
SAAS_ENTERPRISE_SECURITY_PROFILE_REF = "saas.enterprise_security_profile.v1"
SAAS_ENTERPRISE_SECURITY_READINESS_REF = "saas.enterprise_security_readiness.v1"
HRMS_SAAS_LAUNCH_AUDIT_PROFILE_REF = "hrms.saas_launch_audit.v1"
HRMS_SAAS_LAUNCH_AUDIT_CONFIG_KEY = "hrms.saas_launch_audit_profile.v1"
HRMS_SAAS_LAUNCH_AUDIT_PACK_REF = "hrms.saas_launch_audit_pack.v1"
HRMS_SAAS_LAUNCH_AUDIT_COMMAND_REF = "hrms.saas_launch_audit.management_command.v1"
SAAS_COMMERCIAL_SUPPORT_AUDIT_PACK_REF = "saas.commercial_support_audit_pack.v1"

DEFAULT_PAYROLL_READINESS_PROFILE = {
    "profile_key": PAYROLL_READINESS_CONFIG_KEY,
    "profile_name": "Source data readiness",
    "version": 1,
    "included_employment_statuses": [EmploymentStatus.ACTIVE, EmploymentStatus.ON_NOTICE],
    "employee_required_fields": [
        {"field": "date_of_joining", "label": "Date of joining", "severity": "blocker"},
        {"field": "legal_entity", "label": "Legal entity", "severity": "blocker"},
        {"field": "branch", "label": "Branch", "severity": "blocker"},
        {"field": "location", "label": "Location", "severity": "blocker"},
        {"field": "department", "label": "Department", "severity": "blocker"},
        {"field": "cost_center", "label": "Cost center", "severity": "blocker"},
        {"field": "grade", "label": "Grade", "severity": "warning"},
        {"field": "employment_type", "label": "Employment type", "severity": "blocker"},
    ],
    "bank_account": {"required": True, "severity": "warning", "label": "Primary bank account"},
    "pending_sources": {
        "leave_request_statuses": [LeaveRequestStatus.PENDING],
        "attendance_regularization_statuses": [RegularizationStatus.PENDING],
        "severity": "warning",
    },
    "attendance_unknown_statuses": [AttendanceStatus.UNKNOWN],
}

DEFAULT_SAAS_COMMERCIAL_PROFILE = {
    "profile_key": SAAS_COMMERCIAL_PROFILE_CONFIG_KEY,
    "profile_ref": SAAS_COMMERCIAL_PROFILE_REF,
    "profile_name": "SaaS commercial control plane",
    "version": 1,
    "subscription": {
        "status": "active",
        "active_statuses": ["active", "trialing"],
        "status_options": ["trialing", "active", "past_due", "suspended", "canceled"],
        "billing_provider_ref": "manual_billing.v1",
        "billing_account_ref": "",
        "current_period_end": "",
    },
    "modules": {
        "core_hr": {"label": "Core HR"},
        "ess": {"label": "Employee self service"},
        "mss": {"label": "Manager self service"},
        "leave": {"label": "Leave"},
        "attendance": {"label": "Attendance"},
        "documents": {"label": "Documents"},
        "notifications": {"label": "Notifications"},
        "payroll": {"label": "Payroll"},
        "payroll_provider_integrations": {"label": "Payroll provider integrations"},
    },
    "plans": {
        "starter": {
            "edition": "starter",
            "entitlements": {
                "core_hr": True,
                "ess": True,
                "mss": True,
                "leave": True,
                "attendance": True,
                "documents": True,
                "notifications": True,
                "payroll": False,
                "payroll_provider_integrations": False,
            },
            "usage_limits": {
                "active_employees": 50,
                "active_memberships": 75,
                "payroll_runs_per_month": 0,
                "provider_connections": 0,
            },
        },
        "growth": {
            "edition": "growth",
            "entitlements": {
                "core_hr": True,
                "ess": True,
                "mss": True,
                "leave": True,
                "attendance": True,
                "documents": True,
                "notifications": True,
                "payroll": True,
                "payroll_provider_integrations": True,
            },
            "usage_limits": {
                "active_employees": 500,
                "active_memberships": 750,
                "payroll_runs_per_month": 12,
                "provider_connections": 6,
            },
        },
        "enterprise": {
            "edition": "enterprise",
            "entitlements": {
                "core_hr": True,
                "ess": True,
                "mss": True,
                "leave": True,
                "attendance": True,
                "documents": True,
                "notifications": True,
                "payroll": True,
                "payroll_provider_integrations": True,
            },
            "usage_limits": {
                "active_employees": 0,
                "active_memberships": 0,
                "payroll_runs_per_month": 0,
                "provider_connections": 0,
            },
        },
    },
    "launch_required_entitlements": ["core_hr", "ess", "mss", "payroll", "payroll_provider_integrations"],
    "launch_blocking_usage_limits": ["active_employees", "active_memberships", "payroll_runs_per_month", "provider_connections"],
    "enforcement": {
        "enabled": True,
        "default_failure_mode": "block",
        "scopes": {
            "payroll_core": {
                "label": "Payroll core",
                "entitlements": ["payroll"],
                "blocking_usage_limits": ["active_employees", "active_memberships", "payroll_runs_per_month"],
                "path_prefixes": [
                    "/api/v1/hr-admin/payroll",
                    "/api/v1/hr-admin/salary",
                    "/api/v1/hr-admin/employee-statutory",
                ],
                "methods": ["GET", "POST", "PATCH", "DELETE"],
            },
            "payroll_provider_integrations": {
                "label": "Payroll provider integrations",
                "entitlements": ["payroll", "payroll_provider_integrations"],
                "blocking_usage_limits": ["provider_connections"],
                "path_prefixes": [
                    "/api/v1/hr-admin/payroll-provider",
                    "/api/v1/hr-admin/payroll-finance",
                ],
                "methods": ["GET", "POST", "PATCH", "DELETE"],
            },
        },
    },
    "tenant_admin_change_requests": {
        "enabled": True,
        "request_types": {
            "plan_change": {
                "label": "Plan change",
                "description": "Request a plan, subscription status, or commercial period update.",
                "target_ref_required": False,
                "allowed_payload_fields": ["subscription_plan", "status", "current_period_end"],
            },
            "billing_contact": {
                "label": "Billing contact",
                "description": "Request billing contact or billing reference updates.",
                "target_ref_required": False,
                "allowed_payload_fields": ["primary_email", "primary_phone", "billing_provider_ref", "billing_account_ref"],
            },
            "configuration_change": {
                "label": "Configuration change",
                "description": "Request a tenant configuration review or controlled setting change.",
                "target_ref_required": True,
                "allowed_payload_fields": ["configuration_key", "change_summary", "requested_value_ref"],
            },
        },
        "actions": {
            "approve": {"label": "Approve"},
            "reject": {"label": "Reject"},
            "cancel": {"label": "Cancel"},
            "apply": {"label": "Mark applied"},
        },
    },
    "support_access": {
        "enabled": True,
        "max_duration_minutes": 120,
        "scope_options": {
            "read_only_account": {"label": "Account posture", "description": "Read tenant account, seat, and plan posture."},
            "commercial_evidence": {"label": "Commercial evidence", "description": "Read usage-meter and commercial audit evidence."},
            "configuration_health": {"label": "Configuration health", "description": "Read tenant configuration health and refs."},
            "payroll_support": {"label": "Payroll support", "description": "Read payroll support evidence through existing role gates."},
        },
        "allowed_scope_refs": ["read_only_account", "commercial_evidence", "configuration_health", "payroll_support"],
        "domain_snapshots": {
            "tenant_account": {"label": "Tenant account", "scope_ref": "read_only_account", "description": "Tenant account, plan, seats, and role posture."},
            "commercial_control": {"label": "Commercial control", "scope_ref": "commercial_evidence", "description": "Subscription, entitlements, usage limits, and evidence counters."},
            "commercial_audit": {"label": "Commercial audit", "scope_ref": "commercial_evidence", "description": "Recent commercial audit and usage-meter evidence."},
            "configuration_health": {"label": "Configuration health", "scope_ref": "configuration_health", "description": "Published tenant configuration and governance health."},
            "sla_operations": {"label": "SLA operations", "scope_ref": "configuration_health", "description": "Incident, SLA, and operational signal posture."},
            "resilience_readiness": {"label": "Resilience readiness", "scope_ref": "configuration_health", "description": "Backup, restore, and retention readiness evidence."},
            "payroll_readiness": {"label": "Payroll readiness", "scope_ref": "payroll_support", "description": "Payroll setup, calendar, rules, and open-run posture."},
            "payroll_outputs": {"label": "Payroll outputs", "scope_ref": "payroll_support", "description": "Output batch and artifact aggregate posture."},
            "payroll_handoff": {"label": "Payroll handoff", "scope_ref": "payroll_support", "description": "Finance handoff and provider delivery aggregate posture."},
            "payroll_providers": {"label": "Payroll providers", "scope_ref": "payroll_support", "description": "Provider connections, jobs, retries, and rehearsal posture."},
        },
        "actions": {
            "approve": {"label": "Approve"},
            "reject": {"label": "Reject"},
            "start": {"label": "Start session"},
            "end": {"label": "End session"},
            "revoke": {"label": "Revoke"},
        },
    },
    "trust_audit": {
        "enabled": True,
        "default_page_size": 12,
        "max_page_size": 50,
        "event_type_groups": {
            "all": {"label": "All events", "event_types": []},
            "commercial": {
                "label": "Commercial lifecycle",
                "event_types": ["subscription_updated", "usage_snapshot_recorded"],
            },
            "tenant_admin": {
                "label": "Tenant admin actions",
                "event_types": [
                    "tenant_membership_invited",
                    "tenant_membership_activated",
                    "tenant_membership_suspended",
                    "tenant_membership_revoked",
                    "tenant_membership_roles_updated",
                    "tenant_change_request_submitted",
                    "tenant_change_request_approved",
                    "tenant_change_request_rejected",
                    "tenant_change_request_canceled",
                    "tenant_change_request_applied",
                ],
            },
            "support": {
                "label": "Support access",
                "event_types": [
                    "support_access_requested",
                    "support_access_approved",
                    "support_access_rejected",
                    "support_access_session_started",
                    "support_access_session_ended",
                    "support_access_revoked",
                    "support_access_session_checked",
                    "support_access_session_denied",
                    "support_access_session_expired",
                ],
            },
        },
        "source_ref_options": [],
    },
}

DEFAULT_SAAS_RESILIENCE_PROFILE = {
    "profile_key": SAAS_RESILIENCE_PROFILE_CONFIG_KEY,
    "profile_ref": SAAS_RESILIENCE_PROFILE_REF,
    "profile_name": "SaaS resilience profile",
    "version": 1,
    "backup": {
        "enabled": True,
        "required": True,
        "frequency_hours": 24,
        "grace_hours": 2,
        "recovery_point_objective_minutes": 1440,
        "last_successful_backup_at": "",
        "last_backup_status": "missing",
        "success_statuses": ["succeeded", "completed"],
        "encryption_required": True,
        "encryption_enabled": False,
        "offsite_required": True,
        "offsite_copy_enabled": False,
        "runbook_ref": "runbook.backup.daily.v1",
    },
    "restore": {
        "required": True,
        "restore_test_interval_days": 30,
        "grace_days": 3,
        "last_restore_test_at": "",
        "last_restore_test_status": "missing",
        "success_statuses": ["passed", "succeeded", "completed"],
        "runbook_ref": "runbook.restore.monthly.v1",
    },
    "retention": {
        "default_retention_days": 2555,
        "minimum_default_retention_days": 365,
        "payroll_retention_days": 3650,
        "minimum_payroll_retention_days": 2555,
        "audit_retention_days": 3650,
        "minimum_audit_retention_days": 2555,
        "support_session_retention_days": 365,
        "minimum_support_session_retention_days": 180,
        "deletion_policy_ref": "",
        "legal_hold_policy_ref": "",
    },
    "evidence": {
        "storage_policy_ref": "",
        "backup_job_ref": "",
        "restore_test_ref": "",
        "retention_policy_ref": "",
        "last_evidence_at": "",
    },
    "actions": {
        "backup": {"label": "Review backup", "href": "/hr-admin/saas-resilience"},
        "restore": {"label": "Review restore test", "href": "/hr-admin/saas-resilience"},
        "retention": {"label": "Review retention", "href": "/hr-admin/saas-resilience"},
    },
}

DEFAULT_SAAS_SLA_PROFILE = {
    "profile_key": SAAS_SLA_PROFILE_CONFIG_KEY,
    "profile_ref": SAAS_SLA_PROFILE_REF,
    "profile_name": "SaaS SLA operations profile",
    "version": 1,
    "incident_targets": {
        "critical": {"response_minutes": 15, "resolution_minutes": 120, "owner_role_ref": "platform-owner"},
        "high": {"response_minutes": 30, "resolution_minutes": 240, "owner_role_ref": "operations-admin"},
        "medium": {"response_minutes": 120, "resolution_minutes": 720, "owner_role_ref": "operations-admin"},
        "low": {"response_minutes": 480, "resolution_minutes": 1440, "owner_role_ref": "support-admin"},
    },
    "open_statuses": [SaasIncidentStatus.OPEN, SaasIncidentStatus.ACKNOWLEDGED, SaasIncidentStatus.MITIGATED],
    "resolved_statuses": [SaasIncidentStatus.RESOLVED, SaasIncidentStatus.CANCELED],
    "impact_options": {
        "payroll": {"label": "Payroll"},
        "notifications": {"label": "Notifications"},
        "provider_queue": {"label": "Provider queue"},
        "support_access": {"label": "Support access"},
        "tenant_admin": {"label": "Tenant admin"},
        "core_hr": {"label": "Core HR"},
    },
    "operational_thresholds": {
        "failed_notifications": {"max_count": 0, "severity": "blocker", "owner_role_ref": "operations-admin", "href": "/hr-admin/notification-diagnostics"},
        "stale_provider_jobs": {"max_count": 0, "severity": "blocker", "owner_role_ref": "payroll-admin", "href": "/hr-admin/payroll-handoff"},
        "expired_support_grants": {"max_count": 0, "severity": "warning", "owner_role_ref": "tenant-admin", "href": "/tenant-admin"},
        "overdue_remediations": {"max_count": 0, "severity": "blocker", "owner_role_ref": "release-manager", "href": "/hr-admin/launch-remediation"},
    },
    "actions": {
        "incident_review": {"label": "Review incident", "href": "/hr-admin/saas-sla-operations"},
        "sla_review": {"label": "Review SLA", "href": "/hr-admin/saas-sla-operations"},
    },
}

DEFAULT_SAAS_ENTERPRISE_SECURITY_PROFILE = {
    "profile_key": SAAS_ENTERPRISE_SECURITY_PROFILE_CONFIG_KEY,
    "profile_ref": SAAS_ENTERPRISE_SECURITY_PROFILE_REF,
    "profile_name": "Enterprise security readiness profile",
    "version": 1,
    "mfa": {
        "required": True,
        "enforced": False,
        "allowed_methods": [],
        "exempt_role_refs": [],
        "minimum_method_count": 1,
        "evidence_ref": "",
        "owner_role_ref": "security-admin",
    },
    "sso": {
        "required": True,
        "enabled": False,
        "provider_ref": "",
        "protocol": "",
        "allowed_protocols": ["saml", "oidc"],
        "metadata_ref": "",
        "last_tested_at": "",
        "test_interval_days": 30,
        "certificate_rotation_due_at": "",
        "certificate_warning_days": 30,
        "owner_role_ref": "security-admin",
    },
    "scim": {
        "required": True,
        "enabled": False,
        "provider_ref": "",
        "last_sync_at": "",
        "sync_interval_hours": 24,
        "error_count": 0,
        "max_error_count": 0,
        "deprovisioning_enabled": False,
        "owner_role_ref": "security-admin",
    },
    "session": {
        "idle_timeout_minutes": 0,
        "max_idle_timeout_minutes": 60,
        "absolute_timeout_hours": 0,
        "max_absolute_timeout_hours": 12,
        "device_trust_required": False,
        "device_trust_enabled": False,
        "owner_role_ref": "security-admin",
    },
    "audit": {
        "retention_days": 0,
        "minimum_retention_days": 2555,
        "customer_export_enabled": False,
        "immutable_export_ref": "",
        "owner_role_ref": "compliance-admin",
    },
    "data_protection": {
        "encryption_at_rest": False,
        "encryption_in_transit": False,
        "customer_managed_key_ref": "",
        "data_residency_ref": "",
        "owner_role_ref": "security-admin",
    },
    "actions": {
        "mfa": {"label": "Review MFA", "href": "/tenant-admin/security-readiness"},
        "sso": {"label": "Review SSO", "href": "/tenant-admin/security-readiness"},
        "scim": {"label": "Review SCIM", "href": "/tenant-admin/security-readiness"},
        "session": {"label": "Review sessions", "href": "/tenant-admin/security-readiness"},
        "audit": {"label": "Review audit", "href": "/tenant-admin/security-readiness"},
        "data_protection": {"label": "Review data protection", "href": "/tenant-admin/security-readiness"},
    },
}

DEFAULT_HRMS_SAAS_LAUNCH_AUDIT_PROFILE = {
    "profile_key": HRMS_SAAS_LAUNCH_AUDIT_CONFIG_KEY,
    "profile_ref": HRMS_SAAS_LAUNCH_AUDIT_PROFILE_REF,
    "profile_name": "HRMS SaaS launch audit",
    "version": 1,
    "module_defaults": {
        "tenant_foundation": {"owner_role_ref": "platform-owner", "action_href": "/hr-admin", "action_label": "Review tenant setup", "sla_days": 2},
        "iam_workspace_access": {"owner_role_ref": "security-admin", "action_href": "/hr-admin/employees", "action_label": "Review workspace access", "sla_days": 2},
        "organization_master": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/organization", "action_label": "Review organization", "sla_days": 3},
        "employee_master": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/employees", "action_label": "Review employees", "sla_days": 3},
        "ess_mss_workspaces": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/employees", "action_label": "Review workspace roles", "sla_days": 3},
        "leave_governance": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/policies", "action_label": "Review leave policy", "sla_days": 3},
        "attendance_governance": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/attendance-operations", "action_label": "Review attendance", "sla_days": 3},
        "lifecycle_workflows": {"owner_role_ref": "hr-admin", "action_href": "/hr-admin/lifecycle", "action_label": "Review lifecycle", "sla_days": 4},
        "documents_compliance": {"owner_role_ref": "compliance-admin", "action_href": "/hr-admin/documents", "action_label": "Review documents", "sla_days": 4},
        "notifications_delivery": {"owner_role_ref": "operations-admin", "action_href": "/hr-admin/notifications-admin", "action_label": "Review delivery", "sla_days": 2},
        "saas_commercial_control": {"owner_role_ref": "platform-owner", "action_href": "/hr-admin/saas-control-plane", "action_label": "Review plan", "sla_days": 2},
        "payroll_core": {"owner_role_ref": "payroll-admin", "action_href": "/hr-admin/payroll-setup", "action_label": "Review payroll setup", "sla_days": 3},
        "provider_launch_history": {"owner_role_ref": "payroll-admin", "action_href": "/hr-admin/payroll-providers", "action_label": "Run provider rehearsal", "sla_days": 2},
    },
    "gate_overrides": {
        "payroll.salary_components": {"action_href": "/hr-admin/salary-setup", "action_label": "Review salary setup"},
        "payroll.structure_versions": {"action_href": "/hr-admin/salary-setup", "action_label": "Review salary structures"},
        "payroll.rule_versions": {"action_href": "/hr-admin/payroll-rules", "action_label": "Review payroll rules"},
        "provider.rehearsal_recorded": {"action_href": "/hr-admin/payroll-providers", "action_label": "Run provider rehearsal"},
        "provider.rehearsal_ready": {"action_href": "/hr-admin/payroll-providers", "action_label": "Resolve provider blockers"},
    },
}


def _employee_display_name(employee: Employee) -> str:
    return " ".join(part for part in [employee.first_name, employee.last_name] if part)


def _deep_merge_dict(base: dict, override: dict) -> dict:
    result = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge_dict(result[key], value)
        else:
            result[key] = value
    return result


def _resolve_payroll_readiness_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=PAYROLL_READINESS_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_PAYROLL_READINESS_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_PAYROLL_READINESS_PROFILE, source_value), tenant_config.status


def _resolve_saas_commercial_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=SAAS_COMMERCIAL_PROFILE_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_SAAS_COMMERCIAL_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_SAAS_COMMERCIAL_PROFILE, source_value), tenant_config.status


def _resolve_saas_resilience_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=SAAS_RESILIENCE_PROFILE_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_SAAS_RESILIENCE_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_SAAS_RESILIENCE_PROFILE, source_value), tenant_config.status


def _resolve_saas_sla_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=SAAS_SLA_PROFILE_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_SAAS_SLA_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_SAAS_SLA_PROFILE, source_value), tenant_config.status


def _resolve_saas_enterprise_security_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=SAAS_ENTERPRISE_SECURITY_PROFILE_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_SAAS_ENTERPRISE_SECURITY_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_SAAS_ENTERPRISE_SECURITY_PROFILE, source_value), tenant_config.status


def _resolve_hrms_saas_launch_audit_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=HRMS_SAAS_LAUNCH_AUDIT_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_HRMS_SAAS_LAUNCH_AUDIT_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_HRMS_SAAS_LAUNCH_AUDIT_PROFILE, source_value), tenant_config.status


def _limit_status(current_value: int, limit_value: int) -> str:
    if limit_value <= 0:
        return "unlimited"
    if current_value > limit_value:
        return "exceeded"
    if current_value >= int(limit_value * 0.8):
        return "near_limit"
    return "ok"


def _commercial_enforcement_scopes(profile: dict) -> tuple[bool, list[dict]]:
    enforcement = profile.get("enforcement") if isinstance(profile.get("enforcement"), dict) else {}
    enabled = bool(enforcement.get("enabled", True))
    scopes = enforcement.get("scopes") if isinstance(enforcement.get("scopes"), dict) else {}
    scope_items = []
    for scope_ref, scope_config in scopes.items():
        if not isinstance(scope_config, dict):
            continue
        methods = scope_config.get("methods") if isinstance(scope_config.get("methods"), list) else []
        path_prefixes = scope_config.get("path_prefixes") if isinstance(scope_config.get("path_prefixes"), list) else []
        entitlements = scope_config.get("entitlements") if isinstance(scope_config.get("entitlements"), list) else []
        blocking_usage_limits = scope_config.get("blocking_usage_limits") if isinstance(scope_config.get("blocking_usage_limits"), list) else []
        scope_items.append(
            {
                "scope_ref": str(scope_ref),
                "label": str(scope_config.get("label") or str(scope_ref).replace("_", " ").title()),
                "enabled": bool(scope_config.get("enabled", True)),
                "entitlements": [str(item) for item in entitlements if str(item)],
                "blocking_usage_limits": [str(item) for item in blocking_usage_limits if str(item)],
                "path_prefixes": [str(item) for item in path_prefixes if str(item)],
                "methods": [str(item).upper() for item in methods if str(item)],
            }
        )
    return enabled, scope_items


def describe_saas_commercial_control(tenant, *, dashboard: dict | None = None, include_history: bool = True) -> dict:
    profile, profile_source = _resolve_saas_commercial_profile(tenant)
    dashboard = dashboard or get_hr_admin_dashboard_for_tenant(tenant, include_launch_audit=False)
    plan_ref = tenant.subscription_plan or ""
    plans = profile.get("plans") if isinstance(profile.get("plans"), dict) else {}
    plan = plans.get(plan_ref, {}) if isinstance(plans.get(plan_ref), dict) else {}
    entitlements = plan.get("entitlements") if isinstance(plan.get("entitlements"), dict) else {}
    usage_limits = plan.get("usage_limits") if isinstance(plan.get("usage_limits"), dict) else {}
    current_month_start = timezone.localdate().replace(day=1)
    usage = {
        "active_employees": dashboard["overview"]["active_employees"],
        "active_memberships": dashboard["overview"]["active_memberships"],
        "payroll_runs_per_month": PayrollRun.objects.filter(tenant=tenant, created_at__date__gte=current_month_start).count(),
        "provider_connections": PayrollProviderConnection.objects.filter(tenant=tenant).count(),
    }
    usage_items = []
    for meter_ref, current_value in usage.items():
        limit_value = int(usage_limits.get(meter_ref) or 0)
        usage_items.append(
            {
                "meter_ref": meter_ref,
                "label": meter_ref.replace("_", " ").title(),
                "current_value": current_value,
                "limit_value": limit_value,
                "remaining_value": None if limit_value <= 0 else max(limit_value - current_value, 0),
                "status": _limit_status(current_value, limit_value),
            }
        )
    modules = profile.get("modules") if isinstance(profile.get("modules"), dict) else {}
    entitlement_items = []
    for entitlement_ref, enabled in entitlements.items():
        module_config = modules.get(entitlement_ref, {}) if isinstance(modules.get(entitlement_ref), dict) else {}
        entitlement_items.append(
            {
                "entitlement_ref": entitlement_ref,
                "label": str(module_config.get("label") or entitlement_ref.replace("_", " ").title()),
                "enabled": bool(enabled),
            }
        )
    required_entitlements = [str(item) for item in profile.get("launch_required_entitlements", []) if str(item)]
    blocking_usage_limits = [str(item) for item in profile.get("launch_blocking_usage_limits", []) if str(item)]
    missing_required_entitlements = [item for item in required_entitlements if not entitlements.get(item)]
    exceeded_usage_limits = [
        item["meter_ref"]
        for item in usage_items
        if item["meter_ref"] in blocking_usage_limits and item["status"] == "exceeded"
    ]
    entitlement_state = {item["entitlement_ref"]: item["enabled"] for item in entitlement_items}
    usage_state = {item["meter_ref"]: item["status"] for item in usage_items}
    subscription = profile.get("subscription") if isinstance(profile.get("subscription"), dict) else {}
    subscription_status = str(subscription.get("status") or "unknown")
    subscription_active_statuses = {str(item) for item in subscription.get("active_statuses", ["active", "trialing"])}
    subscription_status_options = [str(item) for item in subscription.get("status_options", sorted(subscription_active_statuses)) if str(item)]
    can_launch = bool(plan_ref in plans and subscription_status in subscription_active_statuses and not missing_required_entitlements and not exceeded_usage_limits)
    enforcement_enabled, enforcement_scopes = _commercial_enforcement_scopes(profile)
    enforcement_scope_items = []
    for scope in enforcement_scopes:
        missing_scope_entitlements = [item for item in scope["entitlements"] if not entitlement_state.get(item)]
        exceeded_scope_limits = [
            item
            for item in scope["blocking_usage_limits"]
            if usage_state.get(item) == "exceeded"
        ]
        blocking_reasons = []
        if plan_ref not in plans:
            blocking_reasons.append("plan_unconfigured")
        if subscription_status not in subscription_active_statuses:
            blocking_reasons.append("subscription_inactive")
        if missing_scope_entitlements:
            blocking_reasons.append("entitlement_missing")
        if exceeded_scope_limits:
            blocking_reasons.append("usage_limit_exceeded")
        enforcement_scope_items.append(
            {
                **scope,
                "missing_entitlements": missing_scope_entitlements,
                "exceeded_usage_limits": exceeded_scope_limits,
                "blocking_reasons": blocking_reasons,
                "allowed": bool(scope["enabled"] and not blocking_reasons),
            }
        )
    payload = {
        "profile_ref": str(profile.get("profile_ref") or SAAS_COMMERCIAL_PROFILE_REF),
        "profile_source": profile_source,
        "profile_name": str(profile.get("profile_name") or "SaaS commercial control plane"),
        "version": int(profile.get("version") or 1),
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": plan_ref,
        },
        "subscription": {
            "status": subscription_status,
            "billing_provider_ref": str(subscription.get("billing_provider_ref") or ""),
            "billing_account_ref": str(subscription.get("billing_account_ref") or ""),
            "current_period_end": str(subscription.get("current_period_end") or ""),
            "active_statuses": sorted(subscription_active_statuses),
            "status_options": subscription_status_options,
        },
        "plan": {
            "plan_ref": plan_ref,
            "edition": str(plan.get("edition") or plan_ref or "unconfigured"),
            "configured": plan_ref in plans,
        },
        "available_plans": [
            {
                "plan_ref": str(ref),
                "edition": str(config.get("edition") or ref) if isinstance(config, dict) else str(ref),
                "label": str(config.get("label") or str(ref).replace("_", " ").title()) if isinstance(config, dict) else str(ref),
            }
            for ref, config in plans.items()
        ],
        "summary": {
            "entitlement_count": len(entitlement_items),
            "enabled_entitlement_count": sum(1 for item in entitlement_items if item["enabled"]),
            "required_entitlement_count": len(required_entitlements),
            "missing_required_entitlement_count": len(missing_required_entitlements),
            "usage_meter_count": len(usage_items),
            "exceeded_usage_limit_count": len(exceeded_usage_limits),
            "near_usage_limit_count": sum(1 for item in usage_items if item["status"] == "near_limit"),
            "can_launch": can_launch,
        },
        "entitlements": entitlement_items,
        "usage_limits": usage_items,
        "required_entitlements": required_entitlements,
        "missing_required_entitlements": missing_required_entitlements,
        "exceeded_usage_limits": exceeded_usage_limits,
        "blocking_usage_limits": blocking_usage_limits,
        "enforcement": {
            "enabled": enforcement_enabled,
            "scope_count": len(enforcement_scope_items),
            "blocking_scope_count": sum(1 for item in enforcement_scope_items if item["enabled"] and not item["allowed"]),
            "scopes": enforcement_scope_items,
        },
        "recent_usage_snapshots": [],
        "recent_audit_events": [],
    }
    if include_history:
        payload["recent_usage_snapshots"] = get_recent_saas_usage_meter_snapshots(tenant)
        payload["recent_audit_events"] = get_recent_saas_commercial_audit_events(tenant)
    return payload


def evaluate_saas_commercial_access(tenant, *, request_path: str = "", method: str = "", scope_ref: str = "") -> dict:
    control = describe_saas_commercial_control(tenant, include_history=False)
    enforcement = control["enforcement"]
    if not enforcement["enabled"]:
        return {"allowed": True, "enforced": False, "matched_scopes": [], "control": control, "detail": "Commercial enforcement is disabled."}

    normalized_method = (method or "").upper()
    matched_scopes = []
    for scope in enforcement["scopes"]:
        if not scope["enabled"]:
            continue
        if scope_ref and scope["scope_ref"] == scope_ref:
            matched_scopes.append(scope)
            continue
        if not scope_ref:
            method_matches = not scope["methods"] or normalized_method in scope["methods"]
            path_matches = any((request_path or "").startswith(prefix) for prefix in scope["path_prefixes"])
            if method_matches and path_matches:
                matched_scopes.append(scope)

    if not matched_scopes:
        return {"allowed": True, "enforced": False, "matched_scopes": [], "control": control, "detail": "No commercial enforcement scope matched."}

    blocking_scopes = [scope for scope in matched_scopes if not scope["allowed"]]
    return {
        "allowed": not blocking_scopes,
        "enforced": True,
        "matched_scopes": matched_scopes,
        "blocking_scopes": blocking_scopes,
        "control": control,
        "detail": "Commercial access allowed." if not blocking_scopes else "Commercial access blocked by tenant subscription, entitlement, or usage policy.",
    }


def _saas_commercial_state_summary(control: dict) -> dict:
    return {
        "profile_ref": control["profile_ref"],
        "profile_source": control["profile_source"],
        "tenant": control["tenant"],
        "subscription": control["subscription"],
        "plan": control["plan"],
        "summary": control["summary"],
        "required_entitlements": control["required_entitlements"],
        "missing_required_entitlements": control["missing_required_entitlements"],
        "exceeded_usage_limits": control["exceeded_usage_limits"],
    }


def _saas_usage_snapshot_payload(snapshot: SaasUsageMeterSnapshot) -> dict:
    return {
        "id": str(snapshot.id),
        "profile_ref": snapshot.profile_ref,
        "profile_source": snapshot.profile_source,
        "plan_ref": snapshot.plan_ref,
        "subscription_status": snapshot.subscription_status,
        "meter_ref": snapshot.meter_ref,
        "label": snapshot.label,
        "current_value": snapshot.current_value,
        "limit_value": snapshot.limit_value,
        "remaining_value": snapshot.remaining_value,
        "status": snapshot.status,
        "source_ref": snapshot.source_ref,
        "actor_identifier": snapshot.actor_identifier,
        "recorded_at": snapshot.recorded_at,
        "source_hash": snapshot.source_hash,
    }


def _saas_commercial_audit_event_payload(event: SaasCommercialAuditEvent) -> dict:
    return {
        "id": str(event.id),
        "event_type": event.event_type,
        "actor_identifier": event.actor_identifier,
        "source_ref": event.source_ref,
        "profile_ref": event.profile_ref,
        "profile_source": event.profile_source,
        "plan_ref": event.plan_ref,
        "subscription_status": event.subscription_status,
        "occurred_at": event.occurred_at,
        "previous_state": event.previous_state,
        "new_state": event.new_state,
        "usage_snapshot": event.usage_snapshot,
        "enforcement_snapshot": event.enforcement_snapshot,
        "event_snapshot": event.event_snapshot,
        "source_hash": event.source_hash,
    }


def get_recent_saas_usage_meter_snapshots(tenant, *, limit: int = 12) -> list[dict]:
    snapshots = SaasUsageMeterSnapshot.objects.filter(tenant=tenant).order_by("-recorded_at", "meter_ref")[:limit]
    return [_saas_usage_snapshot_payload(snapshot) for snapshot in snapshots]


def get_recent_saas_commercial_audit_events(tenant, *, limit: int = 8) -> list[dict]:
    events = SaasCommercialAuditEvent.objects.filter(tenant=tenant).order_by("-occurred_at")[:limit]
    return [_saas_commercial_audit_event_payload(event) for event in events]


def _summarize_payload_values(items: list[dict], key: str) -> dict:
    summary: dict[str, int] = {}
    for item in items:
        value = str(item.get(key) or "unknown")
        summary[value] = summary.get(value, 0) + 1
    return dict(sorted(summary.items()))


def recompute_saas_commercial_support_audit_pack_checksum(audit_pack: dict) -> str:
    checksum_payload = {key: value for key, value in audit_pack.items() if key != "evidence_checksum_sha256"}
    checksum = hashlib.sha256(json.dumps(checksum_payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    audit_pack["evidence_checksum_sha256"] = checksum
    return checksum


def describe_saas_commercial_support_audit_pack(
    tenant,
    *,
    generated_at=None,
    generated_by_ref: str = "tenant_admin.commercial_support_audit.download.v1",
    actor_identifier: str = "",
    max_events: int = 100,
    max_snapshots: int = 100,
    max_grants: int = 100,
) -> dict:
    """Builds a tenant-scoped commercial/support evidence export."""

    generated_at = generated_at or timezone.now()
    commercial_control = describe_saas_commercial_control(tenant, include_history=False)
    commercial_events = [
        _saas_commercial_audit_event_payload(item)
        for item in SaasCommercialAuditEvent.objects.filter(tenant=tenant).order_by("-occurred_at", "-created_at")[:max_events]
    ]
    usage_snapshots = [
        _saas_usage_snapshot_payload(item)
        for item in SaasUsageMeterSnapshot.objects.filter(tenant=tenant).order_by("-recorded_at", "meter_ref")[:max_snapshots]
    ]
    support_grants = [
        _support_access_grant_payload(item)
        for item in SaasSupportAccessGrant.objects.filter(tenant=tenant).order_by("-requested_at", "-updated_at")[:max_grants]
    ]
    source_hashes = {
        "commercial_events": [item["source_hash"] for item in commercial_events if item.get("source_hash")],
        "usage_snapshots": [item["source_hash"] for item in usage_snapshots if item.get("source_hash")],
        "support_access_grants": [item["source_hash"] for item in support_grants if item.get("source_hash")],
    }
    audit_pack = {
        "audit_pack_ref": SAAS_COMMERCIAL_SUPPORT_AUDIT_PACK_REF,
        "generated_by_ref": generated_by_ref,
        "generated_at": generated_at,
        "generated_for_actor": actor_identifier,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "country_code": tenant.country_code,
            "timezone": tenant.timezone,
            "is_sandbox": tenant.is_sandbox,
        },
        "filters": {
            "max_events": max_events,
            "max_snapshots": max_snapshots,
            "max_grants": max_grants,
        },
        "summary": {
            "commercial_event_count": len(commercial_events),
            "usage_snapshot_count": len(usage_snapshots),
            "support_access_grant_count": len(support_grants),
            "commercial_event_type_counts": _summarize_payload_values(commercial_events, "event_type"),
            "usage_meter_status_counts": _summarize_payload_values(usage_snapshots, "status"),
            "support_access_status_counts": _summarize_payload_values(support_grants, "status"),
        },
        "commercial_control": {
            "profile_ref": commercial_control["profile_ref"],
            "profile_source": commercial_control["profile_source"],
            "subscription": commercial_control["subscription"],
            "plan": commercial_control["plan"],
            "summary": commercial_control["summary"],
            "required_entitlements": commercial_control["required_entitlements"],
            "missing_required_entitlements": commercial_control["missing_required_entitlements"],
            "usage_limits": commercial_control["usage_limits"],
            "exceeded_usage_limits": commercial_control["exceeded_usage_limits"],
            "enforcement": commercial_control["enforcement"],
        },
        "commercial_events": commercial_events,
        "usage_snapshots": usage_snapshots,
        "support_access": {
            "config": _support_access_config(tenant),
            "scope_options": _support_access_scope_options(tenant),
            "grants": support_grants,
        },
        "integrity": {
            "source_hashes": source_hashes,
            "source_hash_count": sum(len(values) for values in source_hashes.values()),
        },
    }
    recompute_saas_commercial_support_audit_pack_checksum(audit_pack)
    return audit_pack


def _resolve_trust_audit_config(tenant: Tenant) -> tuple[dict, str]:
    profile, profile_source = _resolve_saas_commercial_profile(tenant)
    trust_audit = profile.get("trust_audit") if isinstance(profile.get("trust_audit"), dict) else {}
    default_trust_audit = DEFAULT_SAAS_COMMERCIAL_PROFILE["trust_audit"]
    return _deep_merge_dict(default_trust_audit, trust_audit), profile_source


def _audit_event_support_session_ref(event_snapshot: dict) -> str:
    if not isinstance(event_snapshot, dict):
        return ""
    runtime = event_snapshot.get("support_access_runtime")
    if isinstance(runtime, dict) and runtime.get("session_ref"):
        return str(runtime.get("session_ref") or "")
    support_access_grant = event_snapshot.get("support_access_grant")
    if isinstance(support_access_grant, dict) and support_access_grant.get("session_ref"):
        return str(support_access_grant.get("session_ref") or "")
    previous_support_access_grant = event_snapshot.get("previous_support_access_grant")
    if isinstance(previous_support_access_grant, dict) and previous_support_access_grant.get("session_ref"):
        return str(previous_support_access_grant.get("session_ref") or "")
    return ""


def _trust_audit_event_payload(event: SaasCommercialAuditEvent, *, event_type_groups: dict) -> dict:
    payload = _saas_commercial_audit_event_payload(event)
    group_refs = []
    for group_ref, config in event_type_groups.items():
        event_types = config.get("event_types") if isinstance(config, dict) else []
        normalized_event_types = {str(item) for item in event_types if str(item)}
        if not normalized_event_types or event.event_type in normalized_event_types:
            group_refs.append(str(group_ref))
    payload["event_group_refs"] = sorted(group_refs)
    payload["support_session_ref"] = _audit_event_support_session_ref(event.event_snapshot)
    return payload


def get_tenant_admin_trust_audit_review(
    tenant: Tenant,
    *,
    event_group: str = "all",
    event_type: str = "",
    actor: str = "",
    source_ref: str = "",
    support_session_ref: str = "",
    date_from: str = "",
    date_to: str = "",
    page: int = 1,
    page_size: int | None = None,
) -> dict:
    """Builds a customer-visible commercial/support audit review workspace."""

    generated_at = timezone.now()
    config, profile_source = _resolve_trust_audit_config(tenant)
    event_type_groups = config.get("event_type_groups") if isinstance(config.get("event_type_groups"), dict) else {}
    normalized_event_group = (event_group or "all").strip() or "all"
    group_config = event_type_groups.get(normalized_event_group, {}) if isinstance(event_type_groups.get(normalized_event_group), dict) else {}
    group_event_types = [str(item) for item in group_config.get("event_types", []) if str(item)]
    normalized_event_type = (event_type or "").strip()
    normalized_actor = (actor or "").strip()
    normalized_source_ref = (source_ref or "").strip()
    normalized_support_session_ref = (support_session_ref or "").strip()
    configured_page_size = _coerce_positive_int(config.get("default_page_size"), 12)
    max_page_size = _coerce_positive_int(config.get("max_page_size"), 50) or 50
    current_page_size = min(_coerce_positive_int(page_size, configured_page_size) or configured_page_size, max_page_size)
    current_page = max(_coerce_positive_int(page, 1), 1)

    queryset = SaasCommercialAuditEvent.objects.filter(tenant=tenant)
    if group_event_types:
        queryset = queryset.filter(event_type__in=group_event_types)
    if normalized_event_type:
        queryset = queryset.filter(event_type=normalized_event_type)
    if normalized_actor:
        queryset = queryset.filter(actor_identifier__icontains=normalized_actor)
    if normalized_source_ref:
        queryset = queryset.filter(source_ref=normalized_source_ref)
    parsed_date_from = parse_date(date_from) if date_from else None
    parsed_date_to = parse_date(date_to) if date_to else None
    if parsed_date_from:
        queryset = queryset.filter(occurred_at__date__gte=parsed_date_from)
    if parsed_date_to:
        queryset = queryset.filter(occurred_at__date__lte=parsed_date_to)

    ordered_events = list(queryset.order_by("-occurred_at", "-created_at")[:500])
    if normalized_support_session_ref:
        ordered_events = [
            event
            for event in ordered_events
            if _audit_event_support_session_ref(event.event_snapshot) == normalized_support_session_ref
        ]

    total_count = len(ordered_events)
    start_index = (current_page - 1) * current_page_size
    end_index = start_index + current_page_size
    current_events = ordered_events[start_index:end_index]
    all_tenant_events = SaasCommercialAuditEvent.objects.filter(tenant=tenant)
    configured_source_options = [str(item) for item in config.get("source_ref_options", []) if str(item)]
    source_ref_options = configured_source_options or list(
        all_tenant_events.exclude(source_ref="").values_list("source_ref", flat=True).distinct().order_by("source_ref")[:25]
    )
    event_type_options = list(
        all_tenant_events.exclude(event_type="").values_list("event_type", flat=True).distinct().order_by("event_type")[:50]
    )
    support_session_options = sorted(
        {
            session_ref
            for session_ref in (_audit_event_support_session_ref(event.event_snapshot) for event in all_tenant_events.order_by("-occurred_at")[:200])
            if session_ref
        }
    )
    group_payload = [
        {
            "group_ref": str(group_ref),
            "label": str(group.get("label") or str(group_ref).replace("_", " ").title()) if isinstance(group, dict) else str(group_ref).replace("_", " ").title(),
            "event_types": [str(item) for item in group.get("event_types", []) if str(item)] if isinstance(group, dict) else [],
        }
        for group_ref, group in event_type_groups.items()
    ]
    current_event_payloads = [
        _trust_audit_event_payload(event, event_type_groups=event_type_groups)
        for event in current_events
    ]
    return {
        "profile_ref": "saas.tenant_trust_audit_review.v1",
        "profile_source": profile_source,
        "generated_at": generated_at,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "timezone": tenant.timezone,
        },
        "summary": {
            "status": "ready" if config.get("enabled", True) else "blocked",
            "total_event_count": total_count,
            "visible_event_count": len(current_event_payloads),
            "event_type_count": len(event_type_options),
            "source_ref_count": len(source_ref_options),
            "support_session_count": len(support_session_options),
            "configured_group_count": len(group_payload),
            "page": current_page,
            "page_size": current_page_size,
        },
        "filters": {
            "event_group": normalized_event_group,
            "event_type": normalized_event_type,
            "actor": normalized_actor,
            "source_ref": normalized_source_ref,
            "support_session_ref": normalized_support_session_ref,
            "date_from": date_from or "",
            "date_to": date_to or "",
        },
        "options": {
            "event_groups": group_payload,
            "event_types": event_type_options,
            "source_refs": source_ref_options,
            "support_session_refs": support_session_options,
        },
        "events": current_event_payloads,
        "total_count": total_count,
        "page": current_page,
        "page_size": current_page_size,
        "has_next": end_index < total_count,
        "has_previous": current_page > 1,
    }


def record_saas_usage_meter_snapshots(
    tenant,
    *,
    control: dict | None = None,
    source_ref: str = "saas.commercial_control.snapshot.v1",
    actor_identifier: str = "",
) -> list[SaasUsageMeterSnapshot]:
    control = control or describe_saas_commercial_control(tenant, include_history=False)
    created = []
    for item in control["usage_limits"]:
        created.append(
            SaasUsageMeterSnapshot.objects.create(
                tenant=tenant,
                profile_ref=control["profile_ref"],
                profile_source=control["profile_source"],
                plan_ref=control["plan"]["plan_ref"],
                subscription_status=control["subscription"]["status"],
                meter_ref=item["meter_ref"],
                label=item["label"],
                current_value=item["current_value"],
                limit_value=item["limit_value"],
                remaining_value=item["remaining_value"],
                status=item["status"],
                source_ref=source_ref,
                actor_identifier=actor_identifier,
                evidence_snapshot={
                    "usage_limit": item,
                    "commercial_summary": control["summary"],
                    "blocking_usage_limits": control["blocking_usage_limits"],
                },
            )
        )
    return created


def record_saas_commercial_audit_event(
    tenant,
    *,
    event_type: str,
    previous_control: dict | None = None,
    new_control: dict | None = None,
    actor_identifier: str = "",
    source_ref: str = "saas.commercial_control.lifecycle.v1",
    event_snapshot: dict | None = None,
) -> SaasCommercialAuditEvent:
    new_control = new_control or describe_saas_commercial_control(tenant, include_history=False)
    previous_state = _saas_commercial_state_summary(previous_control) if previous_control else {}
    new_state = _saas_commercial_state_summary(new_control)
    clean_event_snapshot = json.loads(json.dumps(event_snapshot or {}, sort_keys=True, default=str))
    return SaasCommercialAuditEvent.objects.create(
        tenant=tenant,
        event_type=event_type,
        actor_identifier=actor_identifier,
        source_ref=source_ref,
        profile_ref=new_control["profile_ref"],
        profile_source=new_control["profile_source"],
        plan_ref=new_control["plan"]["plan_ref"],
        subscription_status=new_control["subscription"]["status"],
        previous_state=previous_state,
        new_state=new_state,
        usage_snapshot=new_control["usage_limits"],
        enforcement_snapshot=new_control["enforcement"],
        event_snapshot=clean_event_snapshot,
    )


def snapshot_saas_commercial_usage(
    tenant: Tenant | None = None,
    *,
    source_ref: str = "saas.commercial_control.scheduled_snapshot.v1",
    actor_identifier: str = "system",
) -> dict:
    tenants = Tenant.objects.filter(id=tenant.id) if tenant else Tenant.objects.all()
    tenant_count = 0
    snapshot_count = 0
    for item in tenants:
        control = describe_saas_commercial_control(item, include_history=False)
        snapshots = record_saas_usage_meter_snapshots(
            item,
            control=control,
            source_ref=source_ref,
            actor_identifier=actor_identifier,
        )
        record_saas_commercial_audit_event(
            item,
            event_type="usage_snapshot_recorded",
            new_control=control,
            actor_identifier=actor_identifier,
            source_ref=source_ref,
            event_snapshot={"snapshot_count": len(snapshots)},
        )
        tenant_count += 1
        snapshot_count += len(snapshots)
    return {
        "tenant_count": tenant_count,
        "snapshot_count": snapshot_count,
        "source_ref": source_ref,
    }


TENANT_ADMIN_MEMBERSHIP_MUTATION_SOURCE_REF = "saas.tenant_admin.membership_mutation.v1"


def _tenant_admin_role_payload(role: Role) -> dict:
    return {
        "id": str(role.id),
        "code": role.code,
        "name": role.name,
        "is_system_role": role.is_system_role,
    }


def _tenant_admin_membership_payload(membership: TenantMembership) -> dict:
    user = membership.user
    role_links = list(membership.membership_roles.select_related("role").order_by("-is_primary", "role__name"))
    return {
        "id": str(membership.id),
        "user_id": str(user.id),
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name or user.get_full_name() or user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "is_user_active": user.is_active,
        "membership_status": membership.status,
        "is_default_membership": membership.is_default,
        "employee_code": membership.employee_code,
        "role_ids": [str(link.role_id) for link in role_links],
        "roles": [
            {
                "id": str(link.role_id),
                "code": link.role.code,
                "name": link.role.name,
                "is_primary": link.is_primary,
                "is_system_role": link.role.is_system_role,
            }
            for link in role_links
        ],
        "created_at": membership.created_at,
        "updated_at": membership.updated_at,
    }


def _tenant_admin_membership_management_payload(tenant) -> dict:
    roles = list(Role.objects.filter(tenant=tenant, is_active=True).order_by("name"))
    memberships = (
        TenantMembership.objects.filter(tenant=tenant)
        .select_related("user")
        .prefetch_related("membership_roles__role")
        .order_by("-updated_at", "user__username")[:8]
    )
    return {
        "status_options": [{"value": value, "label": label} for value, label in MembershipStatus.choices],
        "role_options": [_tenant_admin_role_payload(role) for role in roles],
        "recent_memberships": [_tenant_admin_membership_payload(membership) for membership in memberships],
        "available_actions": [
            {"value": "invite", "label": "Invite member"},
            {"value": "activate", "label": "Activate"},
            {"value": "suspend", "label": "Suspend"},
            {"value": "revoke", "label": "Revoke"},
            {"value": "update_roles", "label": "Update roles"},
        ],
    }


def _ensure_tenant_admin_subscription_allows_activation(tenant, control: dict) -> None:
    if tenant.status != TenantStatus.ACTIVE:
        raise ValueError("Tenant must be active before a membership can be activated.")
    subscription = control["subscription"]
    if subscription["status"] not in subscription["active_statuses"]:
        raise ValueError("Subscription must be active before a membership can be activated.")


def _ensure_tenant_admin_seat_capacity(tenant, *, membership: TenantMembership | None = None) -> dict:
    control = describe_saas_commercial_control(tenant, include_history=False)
    _ensure_tenant_admin_subscription_allows_activation(tenant, control)
    active_membership_usage = next((item for item in control["usage_limits"] if item["meter_ref"] == "active_memberships"), None)
    if not active_membership_usage:
        return control

    current_active_count = TenantMembership.objects.filter(tenant=tenant, status=MembershipStatus.ACTIVE).count()
    if membership and membership.status == MembershipStatus.ACTIVE:
        projected_active_count = current_active_count
    else:
        projected_active_count = current_active_count + 1
    limit_value = int(active_membership_usage.get("limit_value") or 0)
    if limit_value and projected_active_count > limit_value:
        raise ValueError(f"Activating this membership would exceed the configured active membership limit of {limit_value}.")
    return control


def _role_ids_for_tenant(tenant, role_ids: list) -> list[str]:
    clean_role_ids = [str(role_id) for role_id in role_ids]
    roles = list(Role.objects.filter(tenant=tenant, id__in=clean_role_ids, is_active=True).order_by("name"))
    if len(roles) != len(set(clean_role_ids)):
        raise ValueError("One or more selected roles are invalid for this tenant.")
    return clean_role_ids


def _tenant_admin_has_role(membership: TenantMembership, role_code: str) -> bool:
    return membership.membership_roles.filter(role__code=role_code).exists()


def _ensure_tenant_admin_not_orphaned(
    tenant,
    *,
    membership: TenantMembership,
    next_status: str | None = None,
    next_role_ids: list[str] | None = None,
) -> None:
    currently_active_tenant_admin = membership.status == MembershipStatus.ACTIVE and _tenant_admin_has_role(membership, "tenant-admin")
    if not currently_active_tenant_admin:
        return

    keeps_active_status = (next_status or membership.status) == MembershipStatus.ACTIVE
    keeps_tenant_admin_role = True
    if next_role_ids is not None:
        keeps_tenant_admin_role = Role.objects.filter(tenant=tenant, id__in=next_role_ids, code="tenant-admin").exists()
    if keeps_active_status and keeps_tenant_admin_role:
        return

    other_active_tenant_admins = TenantMembership.objects.filter(
        tenant=tenant,
        status=MembershipStatus.ACTIVE,
        membership_roles__role__code="tenant-admin",
    ).exclude(id=membership.id)
    if not other_active_tenant_admins.exists():
        raise ValueError("At least one active tenant-admin membership must remain.")


def _apply_tenant_admin_membership_roles(membership: TenantMembership, role_ids: list[str]) -> None:
    membership.membership_roles.exclude(role_id__in=role_ids).delete()
    for index, role_id in enumerate(role_ids):
        membership.membership_roles.update_or_create(
            role_id=role_id,
            defaults={"is_primary": index == 0},
        )
    membership.membership_roles.exclude(role_id=role_ids[0]).update(is_primary=False)


def invite_tenant_admin_membership(tenant, *, actor_identifier: str, payload: dict) -> dict:
    role_ids = _role_ids_for_tenant(tenant, payload.get("role_ids", []))
    if not role_ids:
        raise ValueError("Select at least one tenant role for the invited member.")
    target_status = payload.get("membership_status", MembershipStatus.INVITED)
    if target_status == MembershipStatus.ACTIVE:
        control = _ensure_tenant_admin_seat_capacity(tenant)
    else:
        control = describe_saas_commercial_control(tenant, include_history=False)

    username = payload["username"].strip()
    email = payload["email"].strip().lower()
    existing_username_user = User.objects.filter(username__iexact=username).first()
    existing_email_user = User.objects.filter(email__iexact=email).first()
    if existing_username_user and existing_email_user and existing_username_user.id != existing_email_user.id:
        raise ValueError("Username and email point to different existing users.")
    user = existing_username_user or existing_email_user
    if user and TenantMembership.objects.filter(tenant=tenant, user=user).exists():
        raise ValueError("This user already belongs to the current tenant.")

    generated_password = ""
    password = payload.get("password", "")
    if not user:
        user = User(username=username, email=email)
        if not password:
            generated_password = secrets.token_urlsafe(10)
            password = generated_password
        user.set_password(password)
    elif password:
        user.set_password(password)

    user.username = username
    user.email = email
    user.first_name = payload.get("first_name", user.first_name)
    user.last_name = payload.get("last_name", user.last_name)
    user.display_name = payload.get("display_name") or " ".join(part for part in [user.first_name, user.last_name] if part) or username
    user.phone_number = payload.get("phone_number", user.phone_number)
    user.is_active = payload.get("is_user_active", True)
    user.must_change_password = payload.get("must_change_password", True)
    user.save()

    if payload.get("is_default_membership", False):
        TenantMembership.objects.filter(user=user).update(is_default=False)
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        status=target_status,
        is_default=payload.get("is_default_membership", False),
    )
    _apply_tenant_admin_membership_roles(membership, role_ids)
    membership_payload = _tenant_admin_membership_payload(membership)
    record_saas_commercial_audit_event(
        tenant,
        event_type="tenant_membership_invited" if target_status == MembershipStatus.INVITED else "tenant_membership_created",
        new_control=control,
        actor_identifier=actor_identifier,
        source_ref=TENANT_ADMIN_MEMBERSHIP_MUTATION_SOURCE_REF,
        event_snapshot={
            "membership": membership_payload,
            "action": "invite",
            "role_ids": role_ids,
        },
    )
    return {
        "membership": membership_payload,
        "generated_password": generated_password,
        "password_was_set": bool(password),
        "console": get_tenant_admin_console_payload(tenant),
    }


def update_tenant_admin_membership(tenant, membership_id, *, actor_identifier: str, payload: dict) -> dict:
    membership = (
        TenantMembership.objects.filter(tenant=tenant, id=membership_id)
        .select_related("user")
        .prefetch_related("membership_roles__role")
        .first()
    )
    if not membership:
        raise ValueError("Membership not found.")

    action = payload["action"]
    previous_membership_payload = _tenant_admin_membership_payload(membership)
    previous_control = describe_saas_commercial_control(tenant, include_history=False)
    role_ids = None
    next_status = None

    if action == "activate":
        next_status = MembershipStatus.ACTIVE
        _ensure_tenant_admin_seat_capacity(tenant, membership=membership)
        membership.status = MembershipStatus.ACTIVE
        membership.user.is_active = True
        membership.user.save(update_fields=["is_active"])
    elif action == "suspend":
        next_status = MembershipStatus.SUSPENDED
        _ensure_tenant_admin_not_orphaned(tenant, membership=membership, next_status=next_status)
        membership.status = MembershipStatus.SUSPENDED
    elif action == "revoke":
        next_status = MembershipStatus.REVOKED
        _ensure_tenant_admin_not_orphaned(tenant, membership=membership, next_status=next_status)
        membership.status = MembershipStatus.REVOKED
        membership.ends_at = timezone.now()
    elif action == "update_roles":
        role_ids = _role_ids_for_tenant(tenant, payload.get("role_ids", []))
        if not role_ids:
            raise ValueError("Select at least one tenant role.")
        _ensure_tenant_admin_not_orphaned(tenant, membership=membership, next_role_ids=role_ids)
        _apply_tenant_admin_membership_roles(membership, role_ids)
    else:
        raise ValueError("Unsupported tenant membership action.")

    if next_status:
        membership.save()
    membership.refresh_from_db()
    next_membership_payload = _tenant_admin_membership_payload(membership)
    event_type_by_action = {
        "activate": "tenant_membership_activated",
        "suspend": "tenant_membership_suspended",
        "revoke": "tenant_membership_revoked",
        "update_roles": "tenant_membership_roles_updated",
    }
    record_saas_commercial_audit_event(
        tenant,
        event_type=event_type_by_action[action],
        previous_control=previous_control,
        actor_identifier=actor_identifier,
        source_ref=TENANT_ADMIN_MEMBERSHIP_MUTATION_SOURCE_REF,
        event_snapshot={
            "action": action,
            "note": payload.get("note", ""),
            "previous_membership": previous_membership_payload,
            "membership": next_membership_payload,
        },
    )
    return {
        "membership": next_membership_payload,
        "generated_password": "",
        "password_was_set": False,
        "console": get_tenant_admin_console_payload(tenant),
    }


TENANT_ADMIN_CHANGE_REQUEST_SOURCE_REF = "saas.tenant_admin.change_request.v1"


def _tenant_admin_change_request_config(tenant) -> dict:
    profile, profile_source = _resolve_saas_commercial_profile(tenant)
    raw_config = profile.get("tenant_admin_change_requests") if isinstance(profile.get("tenant_admin_change_requests"), dict) else {}
    request_types = raw_config.get("request_types") if isinstance(raw_config.get("request_types"), dict) else {}
    actions = raw_config.get("actions") if isinstance(raw_config.get("actions"), dict) else {}
    return {
        "enabled": raw_config.get("enabled", True),
        "profile_source": profile_source,
        "request_types": request_types,
        "actions": actions,
    }


def _tenant_admin_change_request_type_options(tenant) -> list[dict]:
    config = _tenant_admin_change_request_config(tenant)
    return [
        {
            "value": request_type,
            "label": details.get("label") or request_type.replace("_", " ").title(),
            "description": details.get("description", ""),
            "target_ref_required": bool(details.get("target_ref_required", False)),
            "allowed_payload_fields": details.get("allowed_payload_fields") if isinstance(details.get("allowed_payload_fields"), list) else [],
        }
        for request_type, details in config["request_types"].items()
        if isinstance(details, dict)
    ]


def _tenant_change_request_payload(item: SaasTenantChangeRequest) -> dict:
    return {
        "id": str(item.id),
        "request_type": item.request_type,
        "status": item.status,
        "title": item.title,
        "description": item.description,
        "target_ref": item.target_ref,
        "requested_by_identifier": item.requested_by_identifier,
        "decided_by_identifier": item.decided_by_identifier,
        "applied_by_identifier": item.applied_by_identifier,
        "requested_payload": item.requested_payload,
        "current_snapshot": item.current_snapshot,
        "decision_note": item.decision_note,
        "action_history": item.action_history,
        "requested_at": item.requested_at,
        "decided_at": item.decided_at,
        "applied_at": item.applied_at,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
    }


def _tenant_change_request_management_payload(tenant) -> dict:
    config = _tenant_admin_change_request_config(tenant)
    return {
        "enabled": bool(config["enabled"]),
        "profile_source": config["profile_source"],
        "request_type_options": _tenant_admin_change_request_type_options(tenant),
        "status_options": [{"value": value, "label": label} for value, label in SaasTenantChangeRequestStatus.choices],
        "action_options": [
            {"value": action, "label": details.get("label") or action.replace("_", " ").title()}
            for action, details in config["actions"].items()
            if isinstance(details, dict)
        ],
        "recent_requests": [
            _tenant_change_request_payload(item)
            for item in SaasTenantChangeRequest.objects.filter(tenant=tenant).order_by("-requested_at", "-updated_at")[:8]
        ],
    }


def _current_snapshot_for_tenant_change_request(tenant, request_type: str, target_ref: str) -> dict:
    commercial_control = describe_saas_commercial_control(tenant, include_history=False)
    if request_type == SaasTenantChangeRequestType.PLAN_CHANGE:
        return {
            "tenant": commercial_control["tenant"],
            "subscription": commercial_control["subscription"],
            "plan": commercial_control["plan"],
        }
    if request_type == SaasTenantChangeRequestType.BILLING_CONTACT:
        return {
            "tenant": {
                "primary_email": tenant.primary_email,
                "primary_phone": tenant.primary_phone,
            },
            "subscription": {
                "billing_provider_ref": commercial_control["subscription"]["billing_provider_ref"],
                "billing_account_ref": commercial_control["subscription"]["billing_account_ref"],
            },
        }
    if request_type == SaasTenantChangeRequestType.CONFIGURATION_CHANGE:
        tenant_config = (
            TenantConfiguration.objects.filter(tenant=tenant, definition__key=target_ref)
            .select_related("definition")
            .first()
        )
        return {
            "configuration_key": target_ref,
            "exists": bool(tenant_config),
            "status": tenant_config.status if tenant_config else "",
            "version": tenant_config.version if tenant_config else None,
            "definition_name": tenant_config.definition.name if tenant_config else "",
        }
    return {}


def _validate_tenant_change_request_payload(tenant, *, request_type: str, target_ref: str, requested_payload: dict) -> None:
    config = _tenant_admin_change_request_config(tenant)
    if not config["enabled"]:
        raise ValueError("Tenant-admin change requests are disabled by commercial profile.")
    request_type_config = config["request_types"].get(request_type)
    if not isinstance(request_type_config, dict):
        raise ValueError("This tenant-admin change request type is not configured.")
    if request_type_config.get("target_ref_required") and not target_ref:
        raise ValueError("Target reference is required for this change request type.")
    allowed_fields = request_type_config.get("allowed_payload_fields")
    if isinstance(allowed_fields, list) and allowed_fields:
        unknown_fields = sorted(set(requested_payload) - set(allowed_fields))
        if unknown_fields:
            raise ValueError(f"Requested payload contains fields that are not allowed for this request type: {', '.join(unknown_fields)}.")
    if request_type == SaasTenantChangeRequestType.PLAN_CHANGE:
        requested_plan = requested_payload.get("subscription_plan")
        if requested_plan:
            profile, _profile_source = _resolve_saas_commercial_profile(tenant)
            plans = profile.get("plans") if isinstance(profile.get("plans"), dict) else {}
            if requested_plan not in plans:
                raise ValueError("Requested subscription plan is not configured in the SaaS commercial profile.")


def create_tenant_admin_change_request(tenant, *, actor_identifier: str, payload: dict) -> dict:
    request_type = payload["request_type"]
    target_ref = payload.get("target_ref", "").strip()
    requested_payload = payload.get("requested_payload", {})
    _validate_tenant_change_request_payload(tenant, request_type=request_type, target_ref=target_ref, requested_payload=requested_payload)
    current_snapshot = json.loads(json.dumps(_current_snapshot_for_tenant_change_request(tenant, request_type, target_ref), sort_keys=True, default=str))
    item = SaasTenantChangeRequest.objects.create(
        tenant=tenant,
        request_type=request_type,
        status=SaasTenantChangeRequestStatus.SUBMITTED,
        title=payload["title"].strip(),
        description=payload.get("description", "").strip(),
        target_ref=target_ref,
        requested_by_identifier=actor_identifier,
        requested_payload=json.loads(json.dumps(requested_payload, sort_keys=True, default=str)),
        current_snapshot=current_snapshot,
        action_history=[
            {
                "action": "submit",
                "actor_identifier": actor_identifier,
                "occurred_at": timezone.now().isoformat(),
                "note": payload.get("description", "").strip(),
            }
        ],
        source_ref=TENANT_ADMIN_CHANGE_REQUEST_SOURCE_REF,
    )
    record_saas_commercial_audit_event(
        tenant,
        event_type="tenant_change_request_submitted",
        actor_identifier=actor_identifier,
        source_ref=TENANT_ADMIN_CHANGE_REQUEST_SOURCE_REF,
        event_snapshot={"change_request": _tenant_change_request_payload(item)},
    )
    return {"change_request": _tenant_change_request_payload(item), "console": get_tenant_admin_console_payload(tenant)}


def update_tenant_admin_change_request(tenant, item_id, *, actor_identifier: str, payload: dict) -> dict:
    item = SaasTenantChangeRequest.objects.filter(tenant=tenant, id=item_id).first()
    if not item:
        raise ValueError("Tenant change request not found.")
    action = payload["action"]
    decision_note = payload.get("decision_note", "").strip()
    previous_payload = _tenant_change_request_payload(item)
    now = timezone.now()
    if action == "approve":
        if item.status != SaasTenantChangeRequestStatus.SUBMITTED:
            raise ValueError("Only submitted change requests can be approved.")
        if not decision_note:
            raise ValueError("Decision note is required to approve this change request.")
        item.status = SaasTenantChangeRequestStatus.APPROVED
        item.decided_by_identifier = actor_identifier
        item.decided_at = now
        item.decision_note = decision_note
    elif action == "reject":
        if item.status not in {SaasTenantChangeRequestStatus.SUBMITTED, SaasTenantChangeRequestStatus.APPROVED}:
            raise ValueError("Only submitted or approved change requests can be rejected.")
        if not decision_note:
            raise ValueError("Decision note is required to reject this change request.")
        item.status = SaasTenantChangeRequestStatus.REJECTED
        item.decided_by_identifier = actor_identifier
        item.decided_at = now
        item.decision_note = decision_note
    elif action == "cancel":
        if item.status != SaasTenantChangeRequestStatus.SUBMITTED:
            raise ValueError("Only submitted change requests can be canceled.")
        item.status = SaasTenantChangeRequestStatus.CANCELED
        item.decided_by_identifier = actor_identifier
        item.decided_at = now
        item.decision_note = decision_note
    elif action == "apply":
        if item.status != SaasTenantChangeRequestStatus.APPROVED:
            raise ValueError("Only approved change requests can be marked applied.")
        if not decision_note:
            raise ValueError("Decision note is required to mark this change request applied.")
        item.status = SaasTenantChangeRequestStatus.APPLIED
        item.applied_by_identifier = actor_identifier
        item.applied_at = now
        item.decision_note = decision_note
    else:
        raise ValueError("Unsupported tenant change request action.")
    item.action_history = [
        *(item.action_history if isinstance(item.action_history, list) else []),
        {
            "action": action,
            "actor_identifier": actor_identifier,
            "occurred_at": now.isoformat(),
            "from_status": previous_payload["status"],
            "to_status": item.status,
            "note": decision_note,
        },
    ]
    item.save()
    refreshed_payload = _tenant_change_request_payload(item)
    event_type_by_action = {
        "approve": "tenant_change_request_approved",
        "reject": "tenant_change_request_rejected",
        "cancel": "tenant_change_request_canceled",
        "apply": "tenant_change_request_applied",
    }
    record_saas_commercial_audit_event(
        tenant,
        event_type=event_type_by_action[action],
        actor_identifier=actor_identifier,
        source_ref=TENANT_ADMIN_CHANGE_REQUEST_SOURCE_REF,
        event_snapshot={
            "previous_change_request": previous_payload,
            "change_request": refreshed_payload,
            "action": action,
        },
    )
    return {"change_request": refreshed_payload, "console": get_tenant_admin_console_payload(tenant)}


SUPPORT_ACCESS_GRANT_SOURCE_REF = "saas.support_access.grant.v1"
SUPPORT_ACCESS_RUNTIME_SOURCE_REF = "saas.support_access.runtime.v1"


def _support_access_config(tenant) -> dict:
    profile, profile_source = _resolve_saas_commercial_profile(tenant)
    raw_config = profile.get("support_access") if isinstance(profile.get("support_access"), dict) else {}
    scope_options = raw_config.get("scope_options") if isinstance(raw_config.get("scope_options"), dict) else {}
    actions = raw_config.get("actions") if isinstance(raw_config.get("actions"), dict) else {}
    configured_allowed_scope_refs = raw_config.get("allowed_scope_refs")
    allowed_scope_refs = configured_allowed_scope_refs if isinstance(configured_allowed_scope_refs, list) else list(scope_options.keys())
    return {
        "enabled": raw_config.get("enabled", True),
        "profile_source": profile_source,
        "max_duration_minutes": int(raw_config.get("max_duration_minutes") or 60),
        "scope_options": scope_options,
        "allowed_scope_refs": [str(item) for item in allowed_scope_refs],
        "actions": actions,
    }


def _support_access_scope_options(tenant) -> list[dict]:
    config = _support_access_config(tenant)
    return [
        {
            "value": scope_ref,
            "label": details.get("label") or scope_ref.replace("_", " ").title(),
            "description": details.get("description", ""),
        }
        for scope_ref, details in config["scope_options"].items()
        if isinstance(details, dict) and scope_ref in config["allowed_scope_refs"]
    ]


def _support_access_grant_payload(item: SaasSupportAccessGrant) -> dict:
    return {
        "id": str(item.id),
        "status": item.status,
        "support_agent_identifier": item.support_agent_identifier,
        "reason": item.reason,
        "scope_refs": item.scope_refs,
        "requested_duration_minutes": item.requested_duration_minutes,
        "approved_duration_minutes": item.approved_duration_minutes,
        "requested_by_identifier": item.requested_by_identifier,
        "approved_by_identifier": item.approved_by_identifier,
        "revoked_by_identifier": item.revoked_by_identifier,
        "started_by_identifier": item.started_by_identifier,
        "ended_by_identifier": item.ended_by_identifier,
        "requested_at": item.requested_at,
        "approved_at": item.approved_at,
        "access_starts_at": item.access_starts_at,
        "access_expires_at": item.access_expires_at,
        "started_at": item.started_at,
        "ended_at": item.ended_at,
        "revoked_at": item.revoked_at,
        "decision_note": item.decision_note,
        "session_ref": item.session_ref,
        "action_history": item.action_history,
        "request_snapshot": item.request_snapshot,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
    }


def _support_access_management_payload(tenant) -> dict:
    config = _support_access_config(tenant)
    return {
        "enabled": bool(config["enabled"]),
        "profile_source": config["profile_source"],
        "max_duration_minutes": config["max_duration_minutes"],
        "scope_options": _support_access_scope_options(tenant),
        "status_options": [{"value": value, "label": label} for value, label in SaasSupportAccessGrantStatus.choices],
        "action_options": [
            {"value": action, "label": details.get("label") or action.replace("_", " ").title()}
            for action, details in config["actions"].items()
            if isinstance(details, dict)
        ],
        "recent_grants": [
            _support_access_grant_payload(item)
            for item in SaasSupportAccessGrant.objects.filter(tenant=tenant).order_by("-requested_at", "-updated_at")[:8]
        ],
    }


def _validate_support_access_request(tenant, *, scope_refs: list[str], requested_duration_minutes: int) -> dict:
    config = _support_access_config(tenant)
    if not config["enabled"]:
        raise ValueError("Support access is disabled by commercial profile.")
    if requested_duration_minutes < 1 or requested_duration_minutes > config["max_duration_minutes"]:
        raise ValueError(f"Support access duration must be between 1 and {config['max_duration_minutes']} minutes.")
    allowed_scopes = set(config["allowed_scope_refs"])
    unknown_scopes = sorted(set(scope_refs) - allowed_scopes)
    if unknown_scopes:
        raise ValueError(f"Support access scope is not configured for this tenant: {', '.join(unknown_scopes)}.")
    if not scope_refs:
        raise ValueError("Select at least one support access scope.")
    return config


def create_support_access_grant(tenant, *, actor_identifier: str, payload: dict) -> dict:
    scope_refs = [str(item) for item in payload.get("scope_refs", [])]
    requested_duration_minutes = int(payload.get("requested_duration_minutes") or 60)
    config = _validate_support_access_request(
        tenant,
        scope_refs=scope_refs,
        requested_duration_minutes=requested_duration_minutes,
    )
    now = timezone.now()
    item = SaasSupportAccessGrant.objects.create(
        tenant=tenant,
        status=SaasSupportAccessGrantStatus.REQUESTED,
        support_agent_identifier=payload["support_agent_identifier"].strip(),
        reason=payload["reason"].strip(),
        scope_refs=scope_refs,
        requested_duration_minutes=requested_duration_minutes,
        requested_by_identifier=actor_identifier,
        request_snapshot={
            "scope_options": [
                scope for scope in _support_access_scope_options(tenant) if scope["value"] in scope_refs
            ],
            "max_duration_minutes": config["max_duration_minutes"],
            "commercial_profile_source": config["profile_source"],
        },
        action_history=[
            {
                "action": "request",
                "actor_identifier": actor_identifier,
                "occurred_at": now.isoformat(),
                "scope_refs": scope_refs,
                "requested_duration_minutes": requested_duration_minutes,
            }
        ],
        source_ref=SUPPORT_ACCESS_GRANT_SOURCE_REF,
    )
    record_saas_commercial_audit_event(
        tenant,
        event_type="support_access_requested",
        actor_identifier=actor_identifier,
        source_ref=SUPPORT_ACCESS_GRANT_SOURCE_REF,
        event_snapshot={"support_access_grant": _support_access_grant_payload(item)},
    )
    return {"support_access_grant": _support_access_grant_payload(item), "console": get_tenant_admin_console_payload(tenant)}


def update_support_access_grant(tenant, item_id, *, actor_identifier: str, payload: dict) -> dict:
    item = SaasSupportAccessGrant.objects.filter(tenant=tenant, id=item_id).first()
    if not item:
        raise ValueError("Support access grant not found.")
    action = payload["action"]
    decision_note = payload.get("decision_note", "").strip()
    previous_payload = _support_access_grant_payload(item)
    now = timezone.now()
    if item.access_expires_at and item.status in {SaasSupportAccessGrantStatus.APPROVED, SaasSupportAccessGrantStatus.ACTIVE} and item.access_expires_at <= now:
        item.status = SaasSupportAccessGrantStatus.EXPIRED

    if action == "approve":
        if item.status != SaasSupportAccessGrantStatus.REQUESTED:
            raise ValueError("Only requested support access grants can be approved.")
        if not decision_note:
            raise ValueError("Decision note is required to approve support access.")
        approved_duration = int(payload.get("approved_duration_minutes") or item.requested_duration_minutes)
        _validate_support_access_request(tenant, scope_refs=item.scope_refs, requested_duration_minutes=approved_duration)
        item.status = SaasSupportAccessGrantStatus.APPROVED
        item.approved_duration_minutes = approved_duration
        item.approved_by_identifier = actor_identifier
        item.approved_at = now
        item.access_starts_at = now
        item.access_expires_at = now + timedelta(minutes=approved_duration)
        item.decision_note = decision_note
    elif action == "reject":
        if item.status != SaasSupportAccessGrantStatus.REQUESTED:
            raise ValueError("Only requested support access grants can be rejected.")
        if not decision_note:
            raise ValueError("Decision note is required to reject support access.")
        item.status = SaasSupportAccessGrantStatus.REJECTED
        item.approved_by_identifier = actor_identifier
        item.approved_at = now
        item.decision_note = decision_note
    elif action == "start":
        if item.status != SaasSupportAccessGrantStatus.APPROVED:
            raise ValueError("Only approved support access grants can start a support session.")
        if item.access_expires_at and item.access_expires_at <= now:
            raise ValueError("Support access grant has expired.")
        item.status = SaasSupportAccessGrantStatus.ACTIVE
        item.started_by_identifier = actor_identifier
        item.started_at = now
        item.session_ref = payload.get("session_ref", "").strip() or f"support-session-{uuid.uuid4()}"
    elif action == "end":
        if item.status != SaasSupportAccessGrantStatus.ACTIVE:
            raise ValueError("Only active support access grants can be ended.")
        item.status = SaasSupportAccessGrantStatus.ENDED
        item.ended_by_identifier = actor_identifier
        item.ended_at = now
        item.decision_note = decision_note or item.decision_note
    elif action == "revoke":
        if item.status not in {SaasSupportAccessGrantStatus.REQUESTED, SaasSupportAccessGrantStatus.APPROVED, SaasSupportAccessGrantStatus.ACTIVE}:
            raise ValueError("Only requested, approved, or active support access grants can be revoked.")
        if not decision_note:
            raise ValueError("Decision note is required to revoke support access.")
        item.status = SaasSupportAccessGrantStatus.REVOKED
        item.revoked_by_identifier = actor_identifier
        item.revoked_at = now
        item.decision_note = decision_note
    else:
        raise ValueError("Unsupported support access action.")

    item.action_history = [
        *(item.action_history if isinstance(item.action_history, list) else []),
        {
            "action": action,
            "actor_identifier": actor_identifier,
            "occurred_at": now.isoformat(),
            "from_status": previous_payload["status"],
            "to_status": item.status,
            "decision_note": decision_note,
            "session_ref": item.session_ref,
        },
    ]
    item.save()
    refreshed_payload = _support_access_grant_payload(item)
    event_type_by_action = {
        "approve": "support_access_approved",
        "reject": "support_access_rejected",
        "start": "support_access_session_started",
        "end": "support_access_session_ended",
        "revoke": "support_access_revoked",
    }
    record_saas_commercial_audit_event(
        tenant,
        event_type=event_type_by_action[action],
        actor_identifier=actor_identifier,
        source_ref=SUPPORT_ACCESS_GRANT_SOURCE_REF,
        event_snapshot={
            "previous_support_access_grant": previous_payload,
            "support_access_grant": refreshed_payload,
            "action": action,
        },
    )
    return {"support_access_grant": refreshed_payload, "console": get_tenant_admin_console_payload(tenant)}


def _support_access_actor_identifier(user: User) -> str:
    return getattr(user, "username", "") or getattr(user, "email", "") or str(getattr(user, "id", ""))


def _support_access_user_identifiers(user: User) -> set[str]:
    return {
        str(item).strip().lower()
        for item in [
            getattr(user, "username", ""),
            getattr(user, "email", ""),
            getattr(user, "id", ""),
        ]
        if str(item).strip()
    }


def _support_access_runtime_payload(*, allowed: bool, detail: str, code: str, tenant: Tenant, actor_identifier: str, grant: SaasSupportAccessGrant | None = None, required_scope_ref: str = "", request_path: str = "", method: str = "") -> dict:
    return {
        "allowed": allowed,
        "detail": detail,
        "code": code,
        "tenant_code": tenant.code,
        "actor_identifier": actor_identifier,
        "required_scope_ref": required_scope_ref,
        "request_path": request_path,
        "method": (method or "GET").upper(),
        "grant": _support_access_grant_payload(grant) if grant else None,
        "scope_refs": grant.scope_refs if grant else [],
        "session_ref": grant.session_ref if grant else "",
        "access_expires_at": grant.access_expires_at if grant else None,
    }


def _record_support_access_runtime_event(tenant: Tenant, *, event_type: str, actor_identifier: str, decision: dict) -> None:
    record_saas_commercial_audit_event(
        tenant,
        event_type=event_type,
        actor_identifier=actor_identifier,
        source_ref=SUPPORT_ACCESS_RUNTIME_SOURCE_REF,
        event_snapshot={"support_access_runtime": decision},
    )


def evaluate_support_access_session(
    tenant: Tenant,
    *,
    user: User,
    session_ref: str,
    required_scope_ref: str,
    request_path: str = "",
    method: str = "GET",
    record_event: bool = True,
) -> dict:
    actor_identifier = _support_access_actor_identifier(user)
    normalized_session_ref = (session_ref or "").strip()
    normalized_scope_ref = (required_scope_ref or "").strip()
    normalized_method = (method or "GET").upper()

    if normalized_method not in {"GET", "HEAD", "OPTIONS"}:
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Support sessions are read-only.",
            code="support_session_read_only",
            tenant=tenant,
            actor_identifier=actor_identifier,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    if not normalized_session_ref:
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Support session ref is required.",
            code="support_session_ref_required",
            tenant=tenant,
            actor_identifier=actor_identifier,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    grant = (
        SaasSupportAccessGrant.objects.filter(tenant=tenant, session_ref=normalized_session_ref)
        .order_by("-started_at", "-approved_at", "-requested_at")
        .first()
    )
    if not grant:
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Active support session was not found.",
            code="support_session_not_found",
            tenant=tenant,
            actor_identifier=actor_identifier,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    now = timezone.now()
    if grant.access_expires_at and grant.access_expires_at <= now and grant.status in {SaasSupportAccessGrantStatus.APPROVED, SaasSupportAccessGrantStatus.ACTIVE}:
        previous_payload = _support_access_grant_payload(grant)
        grant.status = SaasSupportAccessGrantStatus.EXPIRED
        grant.action_history = [
            *(grant.action_history if isinstance(grant.action_history, list) else []),
            {
                "action": "expire",
                "actor_identifier": actor_identifier,
                "occurred_at": now.isoformat(),
                "from_status": previous_payload["status"],
                "to_status": SaasSupportAccessGrantStatus.EXPIRED,
                "session_ref": grant.session_ref,
            },
        ]
        grant.save()
        refreshed_payload = _support_access_grant_payload(grant)
        record_saas_commercial_audit_event(
            tenant,
            event_type="support_access_session_expired",
            actor_identifier=actor_identifier,
            source_ref=SUPPORT_ACCESS_RUNTIME_SOURCE_REF,
            event_snapshot={
                "previous_support_access_grant": previous_payload,
                "support_access_grant": refreshed_payload,
            },
        )

    if grant.status != SaasSupportAccessGrantStatus.ACTIVE:
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Support session is not active.",
            code="support_session_not_active",
            tenant=tenant,
            actor_identifier=actor_identifier,
            grant=grant,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    if grant.support_agent_identifier.strip().lower() not in _support_access_user_identifiers(user):
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Authenticated user does not match the approved support agent.",
            code="support_agent_mismatch",
            tenant=tenant,
            actor_identifier=actor_identifier,
            grant=grant,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    if normalized_scope_ref and normalized_scope_ref not in grant.scope_refs:
        decision = _support_access_runtime_payload(
            allowed=False,
            detail="Support session does not include the requested scope.",
            code="support_scope_denied",
            tenant=tenant,
            actor_identifier=actor_identifier,
            grant=grant,
            required_scope_ref=normalized_scope_ref,
            request_path=request_path,
            method=normalized_method,
        )
        if record_event:
            _record_support_access_runtime_event(tenant, event_type="support_access_session_denied", actor_identifier=actor_identifier, decision=decision)
        return decision

    decision = _support_access_runtime_payload(
        allowed=True,
        detail="Support session allowed.",
        code="support_session_allowed",
        tenant=tenant,
        actor_identifier=actor_identifier,
        grant=grant,
        required_scope_ref=normalized_scope_ref,
        request_path=request_path,
        method=normalized_method,
    )
    if record_event:
        _record_support_access_runtime_event(tenant, event_type="support_access_session_checked", actor_identifier=actor_identifier, decision=decision)
    return decision


def get_support_session_tenant_console_payload(tenant: Tenant, *, support_session: dict) -> dict:
    console = get_tenant_admin_console_payload(tenant)
    scope_refs = set(support_session.get("scope_refs") or [])
    payload = {
        "support_session": support_session,
        "tenant": {
            "id": console["tenant"]["id"],
            "code": console["tenant"]["code"],
            "name": console["tenant"]["name"],
        },
        "granted_sections": sorted(scope_refs),
        "account": None,
        "configuration_health": None,
        "commercial_evidence": None,
        "payroll_support": None,
    }
    if "read_only_account" in scope_refs:
        payload["account"] = {
            "summary": console["summary"],
            "commercial_control": {
                "profile_ref": console["commercial_control"]["profile_ref"],
                "profile_source": console["commercial_control"]["profile_source"],
                "subscription": console["commercial_control"]["subscription"],
                "plan": console["commercial_control"]["plan"],
                "summary": console["commercial_control"]["summary"],
            },
            "seat_usage": console["seat_usage"],
            "role_coverage": console["role_coverage"],
            "governance_checks": console["governance_checks"],
        }
    if "configuration_health" in scope_refs:
        payload["configuration_health"] = console["configuration_health"]
    if "commercial_evidence" in scope_refs:
        payload["commercial_evidence"] = {
            "recent_usage_snapshots": console["recent_usage_snapshots"],
            "recent_audit_events": console["recent_audit_events"],
        }
    if "payroll_support" in scope_refs:
        payload["payroll_support"] = {
            "readiness_ref": "payroll.readiness_profile.v1",
            "payroll_route_refs": [
                "/api/v1/hr-admin/payroll-readiness/",
                "/api/v1/hr-admin/payroll-calculation-setup/",
                "/api/v1/hr-admin/payroll-output-setup/",
            ],
        }
    return payload


def get_tenant_admin_console_payload(tenant) -> dict:
    commercial_control = describe_saas_commercial_control(tenant)
    active_memberships = TenantMembership.objects.filter(tenant=tenant, status=MembershipStatus.ACTIVE)
    membership_status_counts = {
        item["status"]: item["count"]
        for item in TenantMembership.objects.filter(tenant=tenant).values("status").annotate(count=Count("id")).order_by("status")
    }
    role_rows = (
        Role.objects.filter(tenant=tenant, is_active=True)
        .annotate(active_membership_count=Count("membership_roles", filter=Q(membership_roles__membership__status=MembershipStatus.ACTIVE), distinct=True))
        .order_by("name")
    )
    tenant_configs = TenantConfiguration.objects.filter(tenant=tenant).select_related("definition")
    config_status_counts = {
        item["status"]: item["count"]
        for item in tenant_configs.values("status").annotate(count=Count("id")).order_by("status")
    }
    active_membership_usage = next(
        (item for item in commercial_control["usage_limits"] if item["meter_ref"] == "active_memberships"),
        {
            "meter_ref": "active_memberships",
            "label": "Active Memberships",
            "current_value": active_memberships.count(),
            "limit_value": 0,
            "remaining_value": None,
            "status": "unlimited",
        },
    )
    active_subscription = commercial_control["subscription"]["status"] in commercial_control["subscription"]["active_statuses"]
    governance_checks = [
        {
            "ref": "tenant.status.active",
            "label": "Tenant active",
            "status": "ready" if tenant.status == TenantStatus.ACTIVE else "blocked",
            "value": tenant.status,
        },
        {
            "ref": "commercial.plan.configured",
            "label": "Plan configured",
            "status": "ready" if commercial_control["plan"]["configured"] else "blocked",
            "value": commercial_control["plan"]["plan_ref"] or "missing",
        },
        {
            "ref": "commercial.subscription.active",
            "label": "Subscription active",
            "status": "ready" if active_subscription else "blocked",
            "value": commercial_control["subscription"]["status"],
        },
        {
            "ref": "commercial.seats.within_limit",
            "label": "Seats within limit",
            "status": "ready" if active_membership_usage["status"] != "exceeded" else "blocked",
            "value": active_membership_usage["status"],
        },
        {
            "ref": "commercial.audit.history",
            "label": "Commercial audit history",
            "status": "ready" if commercial_control["recent_audit_events"] else "warning",
            "value": len(commercial_control["recent_audit_events"]),
        },
    ]
    blocked_check_count = sum(1 for item in governance_checks if item["status"] == "blocked")
    warning_check_count = sum(1 for item in governance_checks if item["status"] == "warning")
    return {
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "legal_name": tenant.legal_name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "country_code": tenant.country_code,
            "timezone": tenant.timezone,
            "is_sandbox": tenant.is_sandbox,
            "go_live_at": tenant.go_live_at,
            "onboarding_status": tenant.onboarding_status,
        },
        "summary": {
            "status": "blocked" if blocked_check_count else ("warning" if warning_check_count else "ready"),
            "blocked_check_count": blocked_check_count,
            "warning_check_count": warning_check_count,
            "active_membership_count": active_memberships.count(),
            "role_count": len(role_rows),
            "published_configuration_count": config_status_counts.get(ConfigStatus.PUBLISHED, 0),
            "commercial_can_launch": commercial_control["summary"]["can_launch"],
        },
        "commercial_control": commercial_control,
        "seat_usage": active_membership_usage,
        "membership_status_counts": membership_status_counts,
        "role_coverage": [
            {
                "role_ref": role.code,
                "label": role.name,
                "active_membership_count": role.active_membership_count,
                "is_system_role": role.is_system_role,
            }
            for role in role_rows
        ],
        "configuration_health": {
            "tenant_configuration_count": tenant_configs.count(),
            "published_count": config_status_counts.get(ConfigStatus.PUBLISHED, 0),
            "draft_count": config_status_counts.get(ConfigStatus.DRAFT, 0),
            "archived_count": config_status_counts.get(ConfigStatus.ARCHIVED, 0),
            "system_definition_count": ConfigurationDefinition.objects.filter(is_system_managed=True, is_active=True).count(),
            "recent_configurations": [
                {
                    "key": item.definition.key,
                    "name": item.definition.name,
                    "category": item.definition.category,
                    "status": item.status,
                    "version": item.version,
                    "updated_at": item.updated_at,
                }
                for item in tenant_configs.order_by("-updated_at")[:6]
            ],
        },
        "governance_checks": governance_checks,
        "membership_management": _tenant_admin_membership_management_payload(tenant),
        "change_request_management": _tenant_change_request_management_payload(tenant),
        "support_access_management": _support_access_management_payload(tenant),
        "recent_usage_snapshots": commercial_control["recent_usage_snapshots"],
        "recent_audit_events": commercial_control["recent_audit_events"],
    }


def _field_count_map(queryset, field_name: str) -> dict:
    return {
        item[field_name]: item["count"]
        for item in queryset.values(field_name).annotate(count=Count("id")).order_by(field_name)
    }


def get_support_domain_snapshot_options(tenant: Tenant) -> list[dict]:
    profile, profile_source = _resolve_saas_commercial_profile(tenant)
    support_access = profile.get("support_access") if isinstance(profile.get("support_access"), dict) else {}
    if not support_access.get("enabled", True):
        return []
    domain_snapshots = support_access.get("domain_snapshots") if isinstance(support_access.get("domain_snapshots"), dict) else {}
    allowed_scope_refs = {str(item).strip() for item in support_access.get("allowed_scope_refs", []) if str(item).strip()}
    options = []
    for domain_ref, config in domain_snapshots.items():
        if not isinstance(config, dict):
            continue
        normalized_domain_ref = str(domain_ref).strip()
        required_scope_ref = str(config.get("scope_ref") or "").strip()
        if not normalized_domain_ref or not required_scope_ref:
            continue
        if allowed_scope_refs and required_scope_ref not in allowed_scope_refs:
            continue
        options.append(
            {
                "domain_ref": normalized_domain_ref,
                "label": str(config.get("label") or normalized_domain_ref.replace("_", " ").title()),
                "description": str(config.get("description") or ""),
                "scope_ref": required_scope_ref,
                "profile_source": profile_source,
            }
        )
    return options


def get_support_domain_snapshot_option(tenant: Tenant, domain_ref: str) -> dict | None:
    normalized_domain_ref = (domain_ref or "").strip()
    return next((item for item in get_support_domain_snapshot_options(tenant) if item["domain_ref"] == normalized_domain_ref), None)


def _latest_payroll_run_payload(payroll_run: PayrollRun | None) -> dict | None:
    if not payroll_run:
        return None
    return {
        "id": str(payroll_run.id),
        "code": payroll_run.code,
        "status": payroll_run.status,
        "payroll_period_id": str(payroll_run.payroll_period_id) if payroll_run.payroll_period_id else None,
        "created_at": payroll_run.created_at,
        "updated_at": payroll_run.updated_at,
    }


def _build_support_domain_snapshot(tenant: Tenant, *, domain_ref: str) -> dict:
    console_payload = None
    commercial_control = None

    if domain_ref in {"tenant_account", "configuration_health", "commercial_audit"}:
        console_payload = get_tenant_admin_console_payload(tenant)
    if domain_ref in {"commercial_control", "commercial_audit"}:
        commercial_control = describe_saas_commercial_control(tenant)

    if domain_ref == "tenant_account":
        return {
            "summary": console_payload["summary"],
            "tenant": console_payload["tenant"],
            "seat_usage": console_payload["seat_usage"],
            "role_coverage": console_payload["role_coverage"],
            "governance_checks": console_payload["governance_checks"],
        }
    if domain_ref == "commercial_control":
        return {
            "profile_ref": commercial_control["profile_ref"],
            "profile_source": commercial_control["profile_source"],
            "subscription": commercial_control["subscription"],
            "plan": commercial_control["plan"],
            "summary": commercial_control["summary"],
            "entitlements": commercial_control["entitlements"],
            "usage_limits": commercial_control["usage_limits"],
            "recent_usage_snapshot_count": len(commercial_control["recent_usage_snapshots"]),
            "recent_audit_event_count": len(commercial_control["recent_audit_events"]),
        }
    if domain_ref == "commercial_audit":
        return {
            "recent_usage_snapshots": console_payload["recent_usage_snapshots"],
            "recent_audit_events": console_payload["recent_audit_events"],
        }
    if domain_ref == "configuration_health":
        return {
            "configuration_health": console_payload["configuration_health"],
            "governance_checks": console_payload["governance_checks"],
        }
    if domain_ref == "sla_operations":
        sla_operations = get_hr_admin_saas_sla_operations(tenant)
        return {
            "summary": sla_operations["summary"],
            "health_signals": sla_operations["health_signals"],
            "status_counts": sla_operations["status_counts"],
            "severity_counts": sla_operations["severity_counts"],
            "incidents": sla_operations["incidents"][:8],
        }
    if domain_ref == "resilience_readiness":
        resilience_readiness = get_hr_admin_saas_resilience_readiness(tenant)
        return {
            "summary": resilience_readiness["summary"],
            "backup": resilience_readiness["backup"],
            "restore": resilience_readiness["restore"],
            "retention": resilience_readiness["retention"],
            "checks": resilience_readiness["checks"],
        }
    if domain_ref == "payroll_readiness":
        payroll_runs = PayrollRun.objects.filter(tenant=tenant)
        latest_run = payroll_runs.order_by("-created_at").first()
        return {
            "summary": {
                "active_employee_count": Employee.objects.filter(tenant=tenant, employment_status=EmploymentStatus.ACTIVE).count(),
                "pay_group_count": PayGroup.objects.filter(tenant=tenant).count(),
                "active_pay_group_count": PayGroup.objects.filter(tenant=tenant, status=PayGroupStatus.ACTIVE).count(),
                "payroll_calendar_count": PayrollCalendar.objects.filter(tenant=tenant).count(),
                "salary_component_count": SalaryComponent.objects.filter(tenant=tenant).count(),
                "salary_structure_version_count": SalaryStructureVersion.objects.filter(tenant=tenant).count(),
                "active_rule_version_count": PayrollRuleVersion.objects.filter(tenant=tenant, status=PayrollRuleVersionStatus.ACTIVE).count(),
                "open_payroll_run_count": payroll_runs.exclude(status=PayrollRunStatus.CANCELLED).count(),
            },
            "payroll_run_status_counts": _field_count_map(payroll_runs, "status"),
            "latest_payroll_run": _latest_payroll_run_payload(latest_run),
        }
    if domain_ref == "payroll_outputs":
        output_batches = PayrollOutputBatch.objects.filter(tenant=tenant)
        output_artifacts = PayrollOutputArtifact.objects.filter(tenant=tenant)
        return {
            "summary": {
                "output_batch_count": output_batches.count(),
                "output_artifact_count": output_artifacts.count(),
                "downloadable_artifact_count": output_artifacts.filter(is_downloadable=True).count(),
                "signed_url_artifact_count": output_artifacts.filter(supports_signed_url=True).count(),
            },
            "batch_status_counts": _field_count_map(output_batches, "status"),
            "artifact_status_counts": _field_count_map(output_artifacts, "status"),
            "artifact_kind_counts": _field_count_map(output_artifacts, "kind"),
        }
    if domain_ref == "payroll_handoff":
        finance_handoffs = PayrollFinanceHandoff.objects.filter(tenant=tenant)
        provider_deliveries = PayrollProviderDelivery.objects.filter(tenant=tenant)
        return {
            "summary": {
                "finance_handoff_count": finance_handoffs.count(),
                "provider_delivery_count": provider_deliveries.count(),
                "failed_provider_delivery_count": provider_deliveries.filter(status=PayrollProviderDeliveryStatus.FAILED).count(),
            },
            "finance_handoff_status_counts": _field_count_map(finance_handoffs, "status"),
            "provider_delivery_status_counts": _field_count_map(provider_deliveries, "status"),
            "provider_delivery_kind_counts": _field_count_map(provider_deliveries, "artifact_kind"),
        }
    if domain_ref == "payroll_providers":
        provider_connections = PayrollProviderConnection.objects.filter(tenant=tenant)
        provider_jobs = PayrollProviderJob.objects.filter(tenant=tenant)
        retry_events = PayrollProviderRetryEvent.objects.filter(tenant=tenant)
        launch_rehearsals = PayrollProviderLaunchRehearsal.objects.filter(tenant=tenant)
        return {
            "summary": {
                "provider_connection_count": provider_connections.count(),
                "active_provider_connection_count": provider_connections.filter(status=PayrollProviderConnectionStatus.ACTIVE).count(),
                "provider_job_count": provider_jobs.count(),
                "queued_provider_job_count": provider_jobs.filter(status=PayrollProviderJobStatus.QUEUED).count(),
                "dead_lettered_provider_job_count": provider_jobs.filter(status=PayrollProviderJobStatus.DEAD_LETTERED).count(),
                "retry_event_count": retry_events.count(),
                "dead_lettered_retry_event_count": retry_events.filter(status=PayrollProviderRetryEventStatus.DEAD_LETTERED).count(),
                "launch_rehearsal_count": launch_rehearsals.count(),
                "ready_launch_rehearsal_count": launch_rehearsals.filter(status=PayrollProviderLaunchRehearsalStatus.READY).count(),
            },
            "connection_status_counts": _field_count_map(provider_connections, "status"),
            "provider_job_status_counts": _field_count_map(provider_jobs, "status"),
            "retry_event_status_counts": _field_count_map(retry_events, "status"),
            "launch_rehearsal_status_counts": _field_count_map(launch_rehearsals, "status"),
        }
    raise ValueError("Support domain snapshot is not implemented.")


def get_support_session_domain_snapshot_payload(tenant: Tenant, *, support_session: dict, domain_ref: str) -> dict:
    option = get_support_domain_snapshot_option(tenant, domain_ref)
    if not option:
        raise ValueError("Support domain snapshot is not configured.")
    snapshot = _build_support_domain_snapshot(tenant, domain_ref=option["domain_ref"])
    return {
        "support_session": support_session,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
        },
        "domain": option,
        "available_domains": get_support_domain_snapshot_options(tenant),
        "snapshot": snapshot,
    }


def update_saas_commercial_subscription(
    tenant,
    *,
    subscription_plan: str | None = None,
    status: str | None = None,
    billing_provider_ref: str | None = None,
    billing_account_ref: str | None = None,
    current_period_end: str | None = None,
    actor_identifier: str = "",
) -> dict:
    previous_control = describe_saas_commercial_control(tenant, include_history=False)
    profile, _profile_source = _resolve_saas_commercial_profile(tenant)
    plans = profile.get("plans") if isinstance(profile.get("plans"), dict) else {}
    if subscription_plan is not None:
        subscription_plan = subscription_plan.strip()
        if subscription_plan and subscription_plan not in plans:
            raise ValueError("Subscription plan is not configured in the SaaS commercial profile.")
        if subscription_plan:
            tenant.subscription_plan = subscription_plan
            tenant.save(update_fields=["subscription_plan", "updated_at"])

    definition, _created = ConfigurationDefinition.objects.update_or_create(
        key=SAAS_COMMERCIAL_PROFILE_CONFIG_KEY,
        defaults={
            "name": "SaaS commercial profile",
            "category": ConfigCategory.SECURITY,
            "data_type": ConfigDataType.JSON,
            "description": "Tenant commercial profile for plan, subscription, entitlement, usage-limit, and enforcement policy.",
            "default_value": DEFAULT_SAAS_COMMERCIAL_PROFILE,
            "is_system_managed": True,
        },
    )
    tenant_config, _created = TenantConfiguration.objects.get_or_create(
        tenant=tenant,
        definition=definition,
        defaults={
            "status": ConfigStatus.PUBLISHED,
            "current_value": {},
            "published_value": {},
            "published_at": timezone.now(),
            "published_by_note": actor_identifier,
        },
    )
    current_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(current_value, dict):
        current_value = {}
    current_value = deepcopy(current_value)
    subscription = current_value.get("subscription") if isinstance(current_value.get("subscription"), dict) else {}
    subscription = deepcopy(subscription)
    if status is not None:
        subscription["status"] = status.strip()
    if billing_provider_ref is not None:
        subscription["billing_provider_ref"] = billing_provider_ref.strip()
    if billing_account_ref is not None:
        subscription["billing_account_ref"] = billing_account_ref.strip()
    if current_period_end is not None:
        subscription["current_period_end"] = current_period_end.strip()
    current_value["subscription"] = subscription
    tenant_config.published_value = current_value
    tenant_config.current_value = current_value
    tenant_config.status = ConfigStatus.PUBLISHED
    tenant_config.published_at = timezone.now()
    tenant_config.published_by_note = actor_identifier
    tenant_config.version += 1
    tenant_config.save(
        update_fields=[
            "published_value",
            "current_value",
            "status",
            "published_at",
            "published_by_note",
            "version",
            "updated_at",
        ]
    )
    new_control = describe_saas_commercial_control(tenant, include_history=False)
    snapshots = record_saas_usage_meter_snapshots(
        tenant,
        control=new_control,
        source_ref="saas.commercial_control.lifecycle_update.v1",
        actor_identifier=actor_identifier,
    )
    record_saas_commercial_audit_event(
        tenant,
        event_type="subscription_updated",
        previous_control=previous_control,
        new_control=new_control,
        actor_identifier=actor_identifier,
        source_ref="saas.commercial_control.lifecycle_update.v1",
        event_snapshot={
            "updated_fields": [
                field
                for field, value in {
                    "subscription_plan": subscription_plan,
                    "status": status,
                    "billing_provider_ref": billing_provider_ref,
                    "billing_account_ref": billing_account_ref,
                    "current_period_end": current_period_end,
                }.items()
                if value is not None
            ],
            "usage_snapshot_count": len(snapshots),
        },
    )
    return describe_saas_commercial_control(tenant)


def _count_weekdays(start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days + 1
    return sum(1 for day_offset in range(days) if (start_date + timedelta(days=day_offset)).weekday() < 5)


def _payroll_readiness_field_value(item: Employee, field_name: str):
    return getattr(item, field_name, None)


def _launch_audit_gate(ref: str, label: str, severity: str, passed: bool, value, action: str = "", evidence_ref: str = "") -> dict:
    return {
        "ref": ref,
        "label": label,
        "severity": severity,
        "status": "passed" if passed else ("blocked" if severity == "blocker" else "warning"),
        "passed": bool(passed),
        "value": value,
        "action": action,
        "evidence_ref": evidence_ref,
    }


def _launch_audit_module(ref: str, label: str, gates: list[dict]) -> dict:
    blocker_count = sum(1 for gate in gates if gate["severity"] == "blocker" and not gate["passed"])
    warning_count = sum(1 for gate in gates if gate["severity"] == "warning" and not gate["passed"])
    passed_gate_count = sum(1 for gate in gates if gate["passed"])
    return {
        "module_ref": ref,
        "label": label,
        "status": "blocked" if blocker_count else ("warning" if warning_count else "ready"),
        "gate_count": len(gates),
        "passed_gate_count": passed_gate_count,
        "blocker_count": blocker_count,
        "warning_count": warning_count,
        "gates": gates,
    }


def _enrich_launch_audit_modules(modules: list[dict], profile: dict) -> list[dict]:
    module_defaults = profile.get("module_defaults") if isinstance(profile.get("module_defaults"), dict) else {}
    gate_overrides = profile.get("gate_overrides") if isinstance(profile.get("gate_overrides"), dict) else {}
    enriched_modules = []
    for module in modules:
        defaults = module_defaults.get(module["module_ref"], {}) if isinstance(module_defaults.get(module["module_ref"]), dict) else {}
        module_owner_role_ref = str(defaults.get("owner_role_ref") or "hr-admin")
        module_action_href = str(defaults.get("action_href") or "/hr-admin")
        module_action_label = str(defaults.get("action_label") or "Review")
        module_sla_days = int(defaults.get("sla_days") or 3)
        gates = []
        for gate in module["gates"]:
            override = gate_overrides.get(gate["ref"], {}) if isinstance(gate_overrides.get(gate["ref"]), dict) else {}
            severity = override.get("severity") if override.get("severity") in {"blocker", "warning"} else gate["severity"]
            enriched_gate = {
                **gate,
                "severity": severity,
                "status": "passed" if gate["passed"] else ("blocked" if severity == "blocker" else "warning"),
                "owner_role_ref": str(override.get("owner_role_ref") or module_owner_role_ref),
                "action_href": str(override.get("action_href") or module_action_href),
                "action_label": str(override.get("action_label") or module_action_label),
                "sla_days": int(override.get("sla_days") or module_sla_days),
                "remediation_state": "closed" if gate["passed"] else "open",
            }
            gates.append(enriched_gate)
        enriched_modules.append(
            {
                **_launch_audit_module(module["module_ref"], module["label"], gates),
                "owner_role_ref": module_owner_role_ref,
                "action_href": module_action_href,
                "action_label": module_action_label,
                "sla_days": module_sla_days,
            }
        )
    return enriched_modules


def _build_hrms_saas_launch_audit(tenant, dashboard: dict) -> dict:
    audit_profile, audit_profile_source = _resolve_hrms_saas_launch_audit_profile(tenant)
    active_employees = dashboard["overview"]["active_employees"]
    active_memberships = dashboard["overview"]["active_memberships"]
    active_roles = set(Role.objects.filter(tenant=tenant, is_active=True).values_list("code", flat=True))
    memberships = TenantMembership.objects.filter(tenant=tenant, status=MembershipStatus.ACTIVE)
    role_memberships = MembershipRole.objects.filter(membership__tenant=tenant, membership__status=MembershipStatus.ACTIVE)
    active_employee_ids = Employee.objects.filter(tenant=tenant, employment_status=EmploymentStatus.ACTIVE).values("id")
    employees_with_primary_bank = EmployeeBankAccount.objects.filter(employee__tenant=tenant, employee_id__in=active_employee_ids, is_primary=True).values("employee_id").distinct().count()
    latest_provider_rehearsal = PayrollProviderLaunchRehearsal.objects.filter(tenant=tenant).order_by("-generated_at", "-created_at").first()
    commercial_control = describe_saas_commercial_control(tenant, dashboard=dashboard)
    commercial_required_entitlements = commercial_control["required_entitlements"]

    modules = [
        _launch_audit_module(
            "tenant_foundation",
            "Tenant foundation",
            [
                _launch_audit_gate("tenant.status.active", "Tenant active", "blocker", tenant.status == TenantStatus.ACTIVE, tenant.status, "Activate tenant before launch."),
                _launch_audit_gate("tenant.country_configured", "Country configured", "blocker", bool(tenant.country_code), tenant.country_code or "missing", "Set tenant country code."),
                _launch_audit_gate("tenant.timezone_configured", "Timezone configured", "blocker", bool(tenant.timezone), tenant.timezone or "missing", "Set tenant timezone."),
                _launch_audit_gate("tenant.subscription_plan_configured", "Subscription plan configured", "blocker", bool(tenant.subscription_plan), tenant.subscription_plan or "missing", "Assign a subscription plan."),
            ],
        ),
        _launch_audit_module(
            "iam_workspace_access",
            "IAM workspace access",
            [
                _launch_audit_gate("iam.active_memberships", "Active memberships", "blocker", active_memberships > 0, active_memberships, "Create active tenant memberships."),
                _launch_audit_gate("iam.hr_admin_role", "HR admin role", "blocker", "hr-admin" in active_roles, "hr-admin" if "hr-admin" in active_roles else "missing", "Seed the HR admin role."),
                _launch_audit_gate("iam.employee_role", "Employee role", "blocker", "employee" in active_roles, "employee" if "employee" in active_roles else "missing", "Seed the employee role."),
                _launch_audit_gate("iam.manager_role", "Manager role", "blocker", "manager" in active_roles, "manager" if "manager" in active_roles else "missing", "Seed the manager role."),
                _launch_audit_gate(
                    "iam.hr_admin_membership",
                    "HR admin membership",
                    "blocker",
                    role_memberships.filter(role__code="hr-admin").exists(),
                    role_memberships.filter(role__code="hr-admin").count(),
                    "Assign at least one active HR admin.",
                ),
            ],
        ),
        _launch_audit_module(
            "organization_master",
            "Organization master",
            [
                _launch_audit_gate("org.legal_entities", "Legal entities", "blocker", LegalEntity.objects.filter(tenant=tenant, is_active=True).exists(), LegalEntity.objects.filter(tenant=tenant, is_active=True).count(), "Create active legal entities."),
                _launch_audit_gate("org.branches", "Branches", "blocker", Branch.objects.filter(tenant=tenant, is_active=True).exists(), dashboard["overview"]["active_branches"], "Create active branches."),
                _launch_audit_gate("org.locations", "Locations", "blocker", Location.objects.filter(tenant=tenant, is_active=True).exists(), Location.objects.filter(tenant=tenant, is_active=True).count(), "Create active locations."),
                _launch_audit_gate("org.departments", "Departments", "blocker", Department.objects.filter(tenant=tenant, is_active=True).exists(), dashboard["overview"]["configured_departments"], "Create active departments."),
                _launch_audit_gate("org.employment_types", "Employment types", "blocker", EmploymentType.objects.filter(tenant=tenant, is_active=True).exists(), EmploymentType.objects.filter(tenant=tenant, is_active=True).count(), "Create active employment types."),
            ],
        ),
        _launch_audit_module(
            "employee_master",
            "Employee master",
            [
                _launch_audit_gate("employees.total", "Employee records", "blocker", dashboard["overview"]["total_employees"] > 0, dashboard["overview"]["total_employees"], "Load employee records."),
                _launch_audit_gate("employees.active", "Active employees", "blocker", active_employees > 0, active_employees, "Activate launch-scope employees."),
                _launch_audit_gate("employees.membership_coverage", "Workspace access coverage", "blocker", memberships.exclude(employee_code="").exists(), memberships.exclude(employee_code="").count(), "Map memberships to employee codes."),
                _launch_audit_gate("employees.manager_mapping", "Manager mapping", "warning", dashboard["workforce"]["employees_without_manager"] <= 1, dashboard["workforce"]["employees_without_manager"], "Resolve missing reporting managers."),
                _launch_audit_gate("employees.primary_bank", "Primary bank coverage", "warning", employees_with_primary_bank >= active_employees, f"{employees_with_primary_bank}/{active_employees}", "Collect primary bank details for active employees."),
            ],
        ),
        _launch_audit_module(
            "ess_mss_workspaces",
            "ESS and MSS workspaces",
            [
                _launch_audit_gate("ess.employee_access", "Employee access", "blocker", role_memberships.filter(role__code="employee").exists(), role_memberships.filter(role__code="employee").count(), "Assign employee workspace access."),
                _launch_audit_gate("mss.manager_access", "Manager access", "blocker", role_memberships.filter(role__code="manager").exists(), role_memberships.filter(role__code="manager").count(), "Assign manager workspace access."),
                _launch_audit_gate("mss.reporting_graph", "Reporting graph", "warning", dashboard["workforce"]["managers_with_reports"] > 0, dashboard["workforce"]["managers_with_reports"], "Map direct reports for managers."),
            ],
        ),
        _launch_audit_module(
            "leave_governance",
            "Leave governance",
            [
                _launch_audit_gate("leave.types", "Leave types", "blocker", LeaveType.objects.filter(tenant=tenant, is_active=True).exists(), LeaveType.objects.filter(tenant=tenant, is_active=True).count(), "Create active leave types."),
                _launch_audit_gate("leave.policies", "Leave policies", "blocker", dashboard["governance"]["active_leave_policies"] > 0, dashboard["governance"]["active_leave_policies"], "Publish leave policies."),
                _launch_audit_gate("leave.balances", "Leave balances", "warning", LeaveBalance.objects.filter(tenant=tenant).exists(), LeaveBalance.objects.filter(tenant=tenant).count(), "Load opening leave balances."),
                _launch_audit_gate("leave.pending_requests", "Pending requests", "warning", dashboard["operations"]["pending_leave_requests"] == 0, dashboard["operations"]["pending_leave_requests"], "Clear pending leave approvals."),
            ],
        ),
        _launch_audit_module(
            "attendance_governance",
            "Attendance governance",
            [
                _launch_audit_gate("attendance.policies", "Attendance policies", "blocker", dashboard["governance"]["active_attendance_policies"] > 0, dashboard["governance"]["active_attendance_policies"], "Publish attendance policies."),
                _launch_audit_gate("attendance.records", "Attendance records", "warning", AttendanceRecord.objects.filter(tenant=tenant).exists(), AttendanceRecord.objects.filter(tenant=tenant).count(), "Load attendance records for pilot validation."),
                _launch_audit_gate("attendance.pending_regularizations", "Pending regularizations", "warning", dashboard["operations"]["pending_regularizations"] == 0, dashboard["operations"]["pending_regularizations"], "Clear pending regularization approvals."),
            ],
        ),
        _launch_audit_module(
            "lifecycle_workflows",
            "Lifecycle workflows",
            [
                _launch_audit_gate("lifecycle.onboarding_queue", "Onboarding queue", "warning", dashboard["operations"]["pending_onboardings"] == 0, dashboard["operations"]["pending_onboardings"], "Close blocked onboarding tasks before launch."),
                _launch_audit_gate("lifecycle.open_exits", "Open exits", "warning", dashboard["operations"]["open_exits"] == 0, dashboard["operations"]["open_exits"], "Review open exit cases."),
                _launch_audit_gate("workflows.active_templates", "Workflow templates", "blocker", dashboard["governance"]["workflow_templates"] > 0, dashboard["governance"]["workflow_templates"], "Publish workflow templates."),
            ],
        ),
        _launch_audit_module(
            "documents_compliance",
            "Documents compliance",
            [
                _launch_audit_gate("documents.categories", "Document categories", "blocker", dashboard["documents"]["active_document_categories"] > 0, dashboard["documents"]["active_document_categories"], "Create active document categories."),
                _launch_audit_gate("documents.mandatory_rules", "Mandatory rules", "blocker", dashboard["documents"]["mandatory_requirement_rules"] > 0, dashboard["documents"]["mandatory_requirement_rules"], "Configure mandatory document rules."),
                _launch_audit_gate("documents.pending_verification", "Pending verification", "warning", dashboard["documents"]["pending_verification"] == 0, dashboard["documents"]["pending_verification"], "Complete pending document verification."),
                _launch_audit_gate("documents.rejected", "Rejected documents", "warning", dashboard["documents"]["rejected_documents"] == 0, dashboard["documents"]["rejected_documents"], "Resolve rejected employee documents."),
            ],
        ),
        _launch_audit_module(
            "notifications_delivery",
            "Notifications delivery",
            [
                _launch_audit_gate("notifications.templates", "Notification templates", "blocker", dashboard["governance"]["active_notification_templates"] > 0, dashboard["governance"]["active_notification_templates"], "Activate notification templates."),
                _launch_audit_gate("notifications.events", "Event definitions", "blocker", dashboard["governance"]["active_notification_events"] > 0, dashboard["governance"]["active_notification_events"], "Activate notification event definitions."),
                _launch_audit_gate("notifications.failed", "Failed notifications", "warning", dashboard["delivery"]["failed_notifications"] == 0, dashboard["delivery"]["failed_notifications"], "Retry or close failed notifications."),
            ],
        ),
        _launch_audit_module(
            "saas_commercial_control",
            "SaaS commercial control",
            [
                _launch_audit_gate("commercial.profile_resolved", "Commercial profile resolved", "blocker", bool(commercial_control["profile_ref"]), commercial_control["profile_ref"], "Configure SaaS commercial profile."),
                _launch_audit_gate(
                    "commercial.subscription_active",
                    "Subscription active",
                    "blocker",
                    commercial_control["subscription"]["status"] in set(commercial_control["subscription"]["active_statuses"]),
                    commercial_control["subscription"]["status"],
                    "Activate tenant subscription.",
                ),
                _launch_audit_gate("commercial.plan_configured", "Plan configured", "blocker", commercial_control["plan"]["configured"], commercial_control["tenant"]["subscription_plan"] or "missing", "Assign a valid subscription plan."),
                _launch_audit_gate(
                    "commercial.required_entitlements",
                    "Required entitlements",
                    "blocker",
                    not commercial_control["missing_required_entitlements"],
                    f"{len(commercial_required_entitlements) - len(commercial_control['missing_required_entitlements'])}/{len(commercial_required_entitlements)}",
                    "Enable required launch entitlements.",
                ),
                _launch_audit_gate(
                    "commercial.usage_limits",
                    "Usage limits",
                    "blocker",
                    not commercial_control["exceeded_usage_limits"],
                    ",".join(commercial_control["exceeded_usage_limits"]) or "within_limits",
                    "Upgrade plan or reduce usage before launch.",
                ),
            ],
        ),
        _launch_audit_module(
            "payroll_core",
            "Payroll core",
            [
                _launch_audit_gate("payroll.calendars", "Payroll calendars", "blocker", PayrollCalendar.objects.filter(tenant=tenant, is_active=True).exists(), PayrollCalendar.objects.filter(tenant=tenant, is_active=True).count(), "Create active payroll calendars."),
                _launch_audit_gate("payroll.pay_groups", "Pay groups", "blocker", PayGroup.objects.filter(tenant=tenant, status=PayGroupStatus.ACTIVE).exists(), PayGroup.objects.filter(tenant=tenant, status=PayGroupStatus.ACTIVE).count(), "Activate pay groups."),
                _launch_audit_gate("payroll.salary_components", "Salary components", "blocker", SalaryComponent.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).exists(), SalaryComponent.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).count(), "Activate salary components."),
                _launch_audit_gate("payroll.structure_versions", "Salary structure versions", "blocker", SalaryStructureVersion.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).exists(), SalaryStructureVersion.objects.filter(tenant=tenant, status=PayrollConfigStatus.ACTIVE).count(), "Activate salary structures."),
                _launch_audit_gate("payroll.rule_versions", "Payroll rule versions", "blocker", PayrollRuleVersion.objects.filter(tenant=tenant, status=PayrollRuleVersionStatus.ACTIVE).exists(), PayrollRuleVersion.objects.filter(tenant=tenant, status=PayrollRuleVersionStatus.ACTIVE).count(), "Activate payroll rule versions."),
            ],
        ),
        _launch_audit_module(
            "provider_launch_history",
            "Provider launch history",
            [
                _launch_audit_gate("provider.rehearsal_recorded", "Rehearsal recorded", "warning", latest_provider_rehearsal is not None, latest_provider_rehearsal.status if latest_provider_rehearsal else "missing", "Run provider launch rehearsal.", "payroll.provider_launch_readiness.audit_pack.v1"),
                _launch_audit_gate(
                    "provider.rehearsal_ready",
                    "Ready rehearsal",
                    "warning",
                    bool(latest_provider_rehearsal and latest_provider_rehearsal.status == PayrollProviderLaunchRehearsalStatus.READY),
                    latest_provider_rehearsal.evidence_checksum_sha256[:12] if latest_provider_rehearsal and latest_provider_rehearsal.evidence_checksum_sha256 else "missing",
                    "Resolve provider blockers and record a ready rehearsal.",
                    "payroll.provider_launch_readiness.audit_pack.v1",
                ),
            ],
        ),
    ]
    modules = _enrich_launch_audit_modules(modules, audit_profile)
    gates = [gate for module in modules for gate in module["gates"]]
    release_blockers = [gate["ref"] for gate in gates if gate["severity"] == "blocker" and not gate["passed"]]
    release_warnings = [gate["ref"] for gate in gates if gate["severity"] == "warning" and not gate["passed"]]
    release_actions = [
        {
            "ref": gate["ref"],
            "label": gate["label"],
            "module_ref": module["module_ref"],
            "module_label": module["label"],
            "severity": gate["severity"],
            "status": gate["status"],
            "owner_role_ref": gate["owner_role_ref"],
            "action_href": gate["action_href"],
            "action_label": gate["action_label"],
            "sla_days": gate["sla_days"],
            "value": gate["value"],
            "evidence_ref": gate["evidence_ref"],
        }
        for module in modules
        for gate in module["gates"]
        if not gate["passed"]
    ]
    return {
        "audit_profile_ref": str(audit_profile.get("profile_ref") or HRMS_SAAS_LAUNCH_AUDIT_PROFILE_REF),
        "audit_profile_source": audit_profile_source,
        "status": "blocked" if release_blockers else ("warning" if release_warnings else "ready"),
        "module_count": len(modules),
        "gate_count": len(gates),
        "passed_gate_count": sum(1 for gate in gates if gate["passed"]),
        "blocker_count": len(release_blockers),
        "warning_count": len(release_warnings),
        "release_blocker_refs": release_blockers,
        "release_warning_refs": release_warnings,
        "release_actions": release_actions,
        "evidence_refs": [
            "docs.phase0_release_quality_baseline.v1",
            "docs.hrms_module_wise_vertical_coverage.v1",
            "payroll.provider_launch_readiness.audit_pack.v1",
        ],
        "modules": modules,
    }


def _lifecycle_owner_value_from_identifier(identifier: str) -> str:
    normalized = (identifier or "").strip()
    return f"identifier:{normalized.lower()}" if normalized else ""


def _lifecycle_owner_identifier_from_employee(employee: Employee | None) -> str:
    if not employee:
        return ""
    membership = getattr(employee, "membership", None)
    user = getattr(membership, "user", None) if membership else None
    return (getattr(user, "username", "") or employee.employee_code or "").strip()


def _lifecycle_owner_value_from_employee(employee: Employee | None) -> str:
    return _lifecycle_owner_value_from_identifier(_lifecycle_owner_identifier_from_employee(employee))


def _get_pending_workflow_instance_ids_for_actor(actor: Employee, *, subject_type: str) -> list[str]:
    membership = getattr(actor, "membership", None)
    actor_identifiers = [str(actor.id)]
    if membership and membership.user_id:
        actor_identifiers.append(str(membership.user_id))
    queryset = WorkflowAssignment.objects.filter(
        step_instance__workflow_instance__subject_type=subject_type,
        step_instance__status__in=[WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS],
    )
    if membership:
        queryset = queryset.filter(Q(membership=membership) | Q(actor_identifier__in=actor_identifiers))
    else:
        queryset = queryset.filter(actor_identifier__in=actor_identifiers)
    return list(
        queryset.values_list("step_instance__workflow_instance__id", flat=True).distinct()
    )


def get_default_membership_for_user(user) -> TenantMembership | None:
    """Returns the user's preferred active tenant membership."""

    memberships = (
        TenantMembership.objects.filter(
            user=user,
            status=MembershipStatus.ACTIVE,
        )
        .select_related("tenant")
        .order_by("-is_default", "created_at")
    )
    return memberships.first()


def get_employee_for_user(user) -> Employee | None:
    """Returns the employee linked to the user's active membership."""

    membership = get_default_membership_for_user(user)
    if not membership:
        return None
    return (
        Employee.objects.select_related(
            "tenant",
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "cost_center",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
        )
        .filter(membership=membership)
        .first()
    )


def get_employee_leave_summary(employee: Employee) -> dict:
    """Builds an employee leave summary for ESS dashboards."""

    today = timezone.localdate()
    resolved_policies = list(
        LeavePolicy.objects.filter(
            tenant=employee.tenant,
            status=LeavePolicyStatus.ACTIVE,
            assignments__is_active=True,
        )
        .select_related("leave_type")
        .distinct()
    )
    period_years = {get_leave_policy_period_year(leave_policy=policy, as_of=today) for policy in resolved_policies}
    balances = LeaveBalance.objects.filter(employee=employee, period_year__in=period_years or {today.year}).select_related("leave_policy__leave_type")
    pending_requests = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequestStatus.PENDING,
    ).count()
    recent_requests = list(
        LeaveRequest.objects.filter(employee=employee)
        .select_related("leave_type")
        .order_by("-created_at")[:5]
    )

    balance_items = [
        {
            "leave_type": balance.leave_policy.leave_type.name,
            "policy_name": balance.leave_policy.name,
            "closing_balance": balance.closing_balance,
            "consumed_amount": balance.consumed_amount,
            "reserved_amount": balance.reserved_amount,
        }
        for balance in balances
    ]

    recent_items = [
        {
            "id": str(request.id),
            "leave_type": request.leave_type.name,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "requested_units": request.requested_units,
        }
        for request in recent_requests
    ]

    return {
        "period_year": min(period_years) if period_years else today.year,
        "pending_requests_count": pending_requests,
        "balances": balance_items,
        "recent_requests": recent_items,
    }


def get_employee_attendance_summary(employee: Employee) -> dict:
    """Builds an employee attendance summary for ESS dashboards."""

    today = timezone.localdate()
    month_start = today.replace(day=1)
    records = AttendanceRecord.objects.filter(
        employee=employee,
        attendance_date__gte=month_start,
        attendance_date__lte=today,
    )
    today_record = records.filter(attendance_date=today).select_related("shift").first()
    regularization_count = AttendanceRegularization.objects.filter(
        employee=employee,
        status=RegularizationStatus.PENDING,
    ).count()
    status_counts = {
        "present_days": records.filter(status=AttendanceStatus.PRESENT).count(),
        "absent_days": records.filter(status=AttendanceStatus.ABSENT).count(),
        "half_days": records.filter(status=AttendanceStatus.HALF_DAY).count(),
        "late_days": records.filter(status=AttendanceStatus.LATE).count(),
    }
    work_duration = records.aggregate(total=Sum("work_duration_hours"))["total"] or 0
    overtime_duration = records.aggregate(total=Sum("overtime_hours"))["total"] or 0

    return {
        "today": {
            "date": today,
            "status": today_record.status if today_record else AttendanceStatus.UNKNOWN,
            "shift": today_record.shift.name if today_record and today_record.shift else None,
            "check_in_at": today_record.check_in_at if today_record else None,
            "check_out_at": today_record.check_out_at if today_record else None,
        },
        "month_to_date": {
            **status_counts,
            "work_duration_hours": work_duration,
            "overtime_hours": overtime_duration,
        },
        "pending_regularizations_count": regularization_count,
    }


def get_manager_team_summary(manager: Employee) -> dict:
    """Builds a manager summary for MSS dashboards."""

    team = Employee.objects.filter(reporting_manager=manager)
    team_ids = list(team.values_list("id", flat=True))
    today = timezone.localdate()

    employees_on_leave = LeaveRequest.objects.filter(
        employee_id__in=team_ids,
        status=LeaveRequestStatus.APPROVED,
        start_date__lte=today,
        end_date__gte=today,
    ).count()
    pending_leave_approvals = LeaveRequest.objects.filter(
        employee_id__in=team_ids,
        status=LeaveRequestStatus.PENDING,
    ).count()
    pending_regularizations = AttendanceRegularization.objects.filter(
        employee_id__in=team_ids,
        status=RegularizationStatus.PENDING,
    ).count()
    attendance_exceptions = AttendanceRecord.objects.filter(
        employee_id__in=team_ids,
        attendance_date=today,
        status__in=[AttendanceStatus.ABSENT, AttendanceStatus.HALF_DAY, AttendanceStatus.LATE, AttendanceStatus.UNKNOWN],
    ).count()

    return {
        "team_size": len(team_ids),
        "employees_on_leave_today": employees_on_leave,
        "pending_leave_approvals_count": pending_leave_approvals,
        "pending_attendance_regularizations_count": pending_regularizations,
        "attendance_exceptions_today": attendance_exceptions,
    }


def get_hr_admin_dashboard_for_tenant(tenant, *, include_launch_audit: bool = True) -> dict:
    """Builds a broad HR admin dashboard payload across operational modules."""

    today = timezone.localdate()
    now = timezone.now()
    month_start = today.replace(day=1)
    next_thirty_days = today + timedelta(days=30)

    employees = Employee.objects.filter(tenant=tenant)
    memberships = TenantMembership.objects.filter(tenant=tenant)

    employment_status_breakdown = [
        {
            "label": label,
            "value": employees.filter(employment_status=value).count(),
        }
        for value, label in EmploymentStatus.choices
    ]

    department_headcount = [
        {
            "label": item["department__name"] or "Unassigned",
            "value": item["count"],
        }
        for item in employees.values("department__name").annotate(count=Count("id")).order_by("-count", "department__name")[:6]
    ]

    pending_leave_requests = LeaveRequest.objects.filter(
        tenant=tenant,
        status=LeaveRequestStatus.PENDING,
    ).count()
    pending_regularizations = AttendanceRegularization.objects.filter(
        tenant=tenant,
        status=RegularizationStatus.PENDING,
    ).count()

    dashboard = {
        "overview": {
            "total_employees": employees.count(),
            "active_employees": employees.filter(employment_status=EmploymentStatus.ACTIVE).count(),
            "active_memberships": memberships.filter(status=MembershipStatus.ACTIVE).count(),
            "configured_departments": Department.objects.filter(tenant=tenant, is_active=True).count(),
            "active_branches": Branch.objects.filter(tenant=tenant, is_active=True).count(),
            "pending_approvals": pending_leave_requests + pending_regularizations,
        },
        "workforce": {
            "employment_status_breakdown": employment_status_breakdown,
            "department_headcount": department_headcount,
            "joiners_this_month": employees.filter(date_of_joining__gte=month_start, date_of_joining__lte=today).count(),
            "exits_this_month": EmployeeExit.objects.filter(
                tenant=tenant,
                actual_exit_date__gte=month_start,
                actual_exit_date__lte=today,
            ).count(),
            "managers_with_reports": employees.filter(direct_reports__isnull=False).distinct().count(),
            "employees_without_manager": employees.filter(
                employment_status__in=[EmploymentStatus.ACTIVE, EmploymentStatus.ON_NOTICE],
                reporting_manager__isnull=True,
            ).count(),
        },
        "operations": {
            "pending_leave_requests": pending_leave_requests,
            "pending_regularizations": pending_regularizations,
            "pending_onboardings": EmployeeOnboarding.objects.filter(
                tenant=tenant,
                status__in=[OnboardingStatus.NOT_STARTED, OnboardingStatus.IN_PROGRESS, OnboardingStatus.BLOCKED],
            ).count(),
            "pending_probation_reviews": ProbationReview.objects.filter(
                tenant=tenant,
                decision=ProbationDecision.PENDING,
            ).count(),
            "open_exits": EmployeeExit.objects.filter(
                tenant=tenant,
                status__in=[
                    ExitStatus.DRAFT,
                    ExitStatus.PENDING_APPROVAL,
                    ExitStatus.APPROVED,
                    ExitStatus.CLEARANCE_IN_PROGRESS,
                ],
            ).count(),
        },
        "documents": {
            "pending_verification": EmployeeDocument.objects.filter(
                tenant=tenant,
                verification_status=VerificationStatus.PENDING,
            ).count(),
            "rejected_documents": EmployeeDocument.objects.filter(
                tenant=tenant,
                verification_status=VerificationStatus.REJECTED,
            ).count(),
            "expiring_in_30_days": EmployeeDocument.objects.filter(
                tenant=tenant,
                expires_on__gte=today,
                expires_on__lte=next_thirty_days,
            ).count(),
            "mandatory_requirement_rules": DocumentRequirementRule.objects.filter(tenant=tenant, is_mandatory=True).count(),
            "active_document_categories": DocumentCategory.objects.filter(tenant=tenant, is_active=True).count(),
        },
        "governance": {
            "active_leave_policies": LeavePolicy.objects.filter(tenant=tenant, status=LeavePolicyStatus.ACTIVE).count(),
            "active_attendance_policies": AttendancePolicy.objects.filter(tenant=tenant, status=AttendancePolicyStatus.ACTIVE).count(),
            "workflow_templates": WorkflowTemplate.objects.filter(tenant=tenant, status=WorkflowStatus.ACTIVE).count(),
            "active_notification_templates": NotificationTemplate.objects.filter(
                tenant=tenant,
                status=NotificationTemplateStatus.ACTIVE,
            ).count(),
            "active_notification_events": NotificationEventDefinition.objects.filter(tenant=tenant, is_active=True).count(),
        },
        "delivery": {
            "pending_notifications": Notification.objects.filter(tenant=tenant, status=NotificationStatus.PENDING).count(),
            "sent_today": Notification.objects.filter(
                tenant=tenant,
                sent_at__date=today,
                status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ],
            ).count(),
            "failed_notifications": Notification.objects.filter(tenant=tenant, status=NotificationStatus.FAILED).count(),
            "documents_expiring_30_days": EmployeeDocument.objects.filter(
                tenant=tenant,
                expires_on__gte=today,
                expires_on__lte=next_thirty_days,
            ).count(),
            "latest_activity_at": now,
        },
    }
    if include_launch_audit:
        dashboard["launch_audit"] = _build_hrms_saas_launch_audit(tenant, dashboard)
    return dashboard


def get_hr_admin_dashboard(employee: Employee) -> dict:
    """Builds a broad HR admin dashboard payload for an HR admin actor."""

    return get_hr_admin_dashboard_for_tenant(employee.tenant)


def _coerce_positive_int(value, default_value: int = 0) -> int:
    try:
        parsed_value = int(value)
    except (TypeError, ValueError):
        return default_value
    return max(parsed_value, 0)


def _parse_profile_datetime(value):
    if not value:
        return None
    if hasattr(value, "date"):
        parsed_value = value
    elif isinstance(value, str):
        parsed_value = parse_datetime(value)
    else:
        parsed_value = None
    if not parsed_value:
        return None
    if timezone.is_naive(parsed_value):
        parsed_value = timezone.make_aware(parsed_value, timezone.get_current_timezone())
    return parsed_value


def _resilience_check(ref: str, label: str, passed: bool, severity: str, detail: str, value=None, action: dict | None = None) -> dict:
    normalized_severity = "warning" if severity == "warning" else "blocker"
    return {
        "ref": ref,
        "label": label,
        "status": "ready" if passed else ("warning" if normalized_severity == "warning" else "blocked"),
        "severity": normalized_severity,
        "passed": passed,
        "value": value,
        "detail": detail,
        "action_label": (action or {}).get("label", "Review"),
        "action_href": (action or {}).get("href", "/hr-admin/saas-resilience"),
    }


def get_hr_admin_saas_resilience_readiness(tenant: Tenant) -> dict:
    """Builds cloud-neutral backup, restore, and retention readiness from tenant configuration."""

    now = timezone.now()
    profile, profile_source = _resolve_saas_resilience_profile(tenant)
    backup = profile.get("backup") if isinstance(profile.get("backup"), dict) else {}
    restore = profile.get("restore") if isinstance(profile.get("restore"), dict) else {}
    retention = profile.get("retention") if isinstance(profile.get("retention"), dict) else {}
    evidence = profile.get("evidence") if isinstance(profile.get("evidence"), dict) else {}
    actions = profile.get("actions") if isinstance(profile.get("actions"), dict) else {}
    backup_action = actions.get("backup") if isinstance(actions.get("backup"), dict) else {}
    restore_action = actions.get("restore") if isinstance(actions.get("restore"), dict) else {}
    retention_action = actions.get("retention") if isinstance(actions.get("retention"), dict) else {}

    backup_enabled = bool(backup.get("enabled", True))
    backup_required = bool(backup.get("required", True))
    backup_severity = "blocker" if backup_required else "warning"
    backup_frequency_hours = _coerce_positive_int(backup.get("frequency_hours"), 24)
    backup_grace_hours = _coerce_positive_int(backup.get("grace_hours"), 0)
    backup_rpo_minutes = _coerce_positive_int(backup.get("recovery_point_objective_minutes"), 0)
    backup_status = str(backup.get("last_backup_status") or "missing").lower()
    backup_success_statuses = [str(item).lower() for item in backup.get("success_statuses", []) if str(item)]
    last_backup_at = _parse_profile_datetime(backup.get("last_successful_backup_at"))
    backup_window = timedelta(hours=backup_frequency_hours + backup_grace_hours)
    backup_is_recent = bool(last_backup_at and now - last_backup_at <= backup_window)
    backup_latest_passed = (not backup_required) or (backup_status in backup_success_statuses and backup_is_recent)
    backup_rpo_passed = (not backup_required) or (backup_rpo_minutes > 0 and backup_frequency_hours * 60 <= backup_rpo_minutes)
    encryption_required = bool(backup.get("encryption_required", True))
    encryption_passed = (not encryption_required) or bool(backup.get("encryption_enabled"))
    offsite_required = bool(backup.get("offsite_required", True))
    offsite_passed = (not offsite_required) or bool(backup.get("offsite_copy_enabled"))

    restore_required = bool(restore.get("required", True))
    restore_severity = "blocker" if restore_required else "warning"
    restore_interval_days = _coerce_positive_int(restore.get("restore_test_interval_days"), 30)
    restore_grace_days = _coerce_positive_int(restore.get("grace_days"), 0)
    restore_status = str(restore.get("last_restore_test_status") or "missing").lower()
    restore_success_statuses = [str(item).lower() for item in restore.get("success_statuses", []) if str(item)]
    last_restore_test_at = _parse_profile_datetime(restore.get("last_restore_test_at"))
    restore_window = timedelta(days=restore_interval_days + restore_grace_days)
    restore_is_recent = bool(last_restore_test_at and now - last_restore_test_at <= restore_window)
    restore_test_passed = (not restore_required) or (restore_status in restore_success_statuses and restore_is_recent)

    default_retention_days = _coerce_positive_int(retention.get("default_retention_days"), 0)
    payroll_retention_days = _coerce_positive_int(retention.get("payroll_retention_days"), 0)
    audit_retention_days = _coerce_positive_int(retention.get("audit_retention_days"), 0)
    support_retention_days = _coerce_positive_int(retention.get("support_session_retention_days"), 0)
    minimum_default_retention_days = _coerce_positive_int(retention.get("minimum_default_retention_days"), 0)
    minimum_payroll_retention_days = _coerce_positive_int(retention.get("minimum_payroll_retention_days"), 0)
    minimum_audit_retention_days = _coerce_positive_int(retention.get("minimum_audit_retention_days"), 0)
    minimum_support_retention_days = _coerce_positive_int(retention.get("minimum_support_session_retention_days"), 0)
    has_policy_refs = bool(retention.get("deletion_policy_ref")) and bool(retention.get("legal_hold_policy_ref"))
    has_runbook_refs = bool(backup.get("runbook_ref")) and bool(restore.get("runbook_ref")) and bool(evidence.get("retention_policy_ref"))

    checks = [
        _resilience_check(
            "backup.profile_enabled",
            "Backup profile enabled",
            backup_enabled,
            "blocker",
            "Backup controls are enabled for this tenant." if backup_enabled else "Enable tenant backup controls in the resilience profile.",
            backup_enabled,
            backup_action,
        ),
        _resilience_check(
            "backup.latest_successful",
            "Latest backup evidence",
            backup_latest_passed,
            backup_severity,
            "Latest successful backup is inside the configured recovery window." if backup_latest_passed else "Record a successful backup timestamp and status inside the configured recovery window.",
            last_backup_at,
            backup_action,
        ),
        _resilience_check(
            "backup.recovery_point_objective",
            "Recovery point objective",
            backup_rpo_passed,
            backup_severity,
            "Backup cadence satisfies the configured RPO." if backup_rpo_passed else "Set backup frequency at or below the configured RPO minutes.",
            f"{backup_frequency_hours}h / {backup_rpo_minutes}m",
            backup_action,
        ),
        _resilience_check(
            "backup.encryption",
            "Encrypted backup storage",
            encryption_passed,
            backup_severity,
            "Backup encryption evidence is present." if encryption_passed else "Mark encryption enabled or relax the tenant encryption requirement.",
            backup.get("encryption_enabled"),
            backup_action,
        ),
        _resilience_check(
            "backup.offsite_copy",
            "Offsite backup copy",
            offsite_passed,
            backup_severity,
            "Offsite copy evidence is present." if offsite_passed else "Mark offsite copy enabled or relax the tenant offsite requirement.",
            backup.get("offsite_copy_enabled"),
            backup_action,
        ),
        _resilience_check(
            "restore.last_test",
            "Restore test evidence",
            restore_test_passed,
            restore_severity,
            "Latest restore test is successful and inside the configured interval." if restore_test_passed else "Record a successful restore test inside the configured interval.",
            last_restore_test_at,
            restore_action,
        ),
        _resilience_check(
            "retention.default_window",
            "Default retention window",
            default_retention_days >= minimum_default_retention_days,
            "blocker",
            "Default retention meets the tenant minimum." if default_retention_days >= minimum_default_retention_days else "Increase the default retention window or lower the configured minimum.",
            f"{default_retention_days}d / {minimum_default_retention_days}d",
            retention_action,
        ),
        _resilience_check(
            "retention.payroll_window",
            "Payroll retention window",
            payroll_retention_days >= minimum_payroll_retention_days,
            "blocker",
            "Payroll retention meets the tenant minimum." if payroll_retention_days >= minimum_payroll_retention_days else "Increase payroll retention to satisfy the configured tenant minimum.",
            f"{payroll_retention_days}d / {minimum_payroll_retention_days}d",
            retention_action,
        ),
        _resilience_check(
            "retention.audit_window",
            "Audit retention window",
            audit_retention_days >= minimum_audit_retention_days,
            "blocker",
            "Audit retention meets the tenant minimum." if audit_retention_days >= minimum_audit_retention_days else "Increase audit retention to satisfy the configured tenant minimum.",
            f"{audit_retention_days}d / {minimum_audit_retention_days}d",
            retention_action,
        ),
        _resilience_check(
            "retention.support_session_window",
            "Support session retention",
            support_retention_days >= minimum_support_retention_days,
            "blocker",
            "Support-session retention meets the tenant minimum." if support_retention_days >= minimum_support_retention_days else "Increase support-session retention to satisfy the configured tenant minimum.",
            f"{support_retention_days}d / {minimum_support_retention_days}d",
            retention_action,
        ),
        _resilience_check(
            "retention.policy_refs",
            "Deletion and legal hold policy refs",
            has_policy_refs,
            "blocker",
            "Deletion and legal-hold policy references are configured." if has_policy_refs else "Configure deletion and legal-hold policy references for the tenant.",
            {
                "deletion_policy_ref": retention.get("deletion_policy_ref") or "",
                "legal_hold_policy_ref": retention.get("legal_hold_policy_ref") or "",
            },
            retention_action,
        ),
        _resilience_check(
            "evidence.runbook_refs",
            "Runbook and retention evidence refs",
            has_runbook_refs,
            "warning",
            "Backup, restore, and retention evidence references are configured." if has_runbook_refs else "Attach backup, restore, and retention evidence references.",
            {
                "backup_runbook_ref": backup.get("runbook_ref") or "",
                "restore_runbook_ref": restore.get("runbook_ref") or "",
                "retention_policy_ref": evidence.get("retention_policy_ref") or "",
            },
            retention_action,
        ),
    ]
    blocker_count = sum(1 for item in checks if item["status"] == "blocked")
    warning_count = sum(1 for item in checks if item["status"] == "warning")
    backup_check_refs = {item["ref"] for item in checks if item["ref"].startswith("backup.")}
    restore_check_refs = {item["ref"] for item in checks if item["ref"].startswith("restore.")}
    retention_check_refs = {item["ref"] for item in checks if item["ref"].startswith("retention.")}
    return {
        "profile_ref": SAAS_RESILIENCE_READINESS_REF,
        "resilience_profile_ref": profile.get("profile_ref") or SAAS_RESILIENCE_PROFILE_REF,
        "profile_source": profile_source,
        "generated_at": now,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "timezone": tenant.timezone,
        },
        "summary": {
            "status": "blocked" if blocker_count else ("warning" if warning_count else "ready"),
            "check_count": len(checks),
            "passed_check_count": sum(1 for item in checks if item["passed"]),
            "blocker_count": blocker_count,
            "warning_count": warning_count,
            "backup_ready": all(item["passed"] for item in checks if item["ref"] in backup_check_refs),
            "restore_ready": all(item["passed"] for item in checks if item["ref"] in restore_check_refs),
            "retention_ready": all(item["passed"] for item in checks if item["ref"] in retention_check_refs),
        },
        "backup": {
            "enabled": backup_enabled,
            "required": backup_required,
            "frequency_hours": backup_frequency_hours,
            "grace_hours": backup_grace_hours,
            "recovery_point_objective_minutes": backup_rpo_minutes,
            "last_successful_backup_at": last_backup_at,
            "last_backup_status": backup_status,
            "encryption_required": encryption_required,
            "encryption_enabled": bool(backup.get("encryption_enabled")),
            "offsite_required": offsite_required,
            "offsite_copy_enabled": bool(backup.get("offsite_copy_enabled")),
            "runbook_ref": backup.get("runbook_ref") or "",
        },
        "restore": {
            "required": restore_required,
            "restore_test_interval_days": restore_interval_days,
            "grace_days": restore_grace_days,
            "last_restore_test_at": last_restore_test_at,
            "last_restore_test_status": restore_status,
            "runbook_ref": restore.get("runbook_ref") or "",
        },
        "retention": {
            "default_retention_days": default_retention_days,
            "minimum_default_retention_days": minimum_default_retention_days,
            "payroll_retention_days": payroll_retention_days,
            "minimum_payroll_retention_days": minimum_payroll_retention_days,
            "audit_retention_days": audit_retention_days,
            "minimum_audit_retention_days": minimum_audit_retention_days,
            "support_session_retention_days": support_retention_days,
            "minimum_support_session_retention_days": minimum_support_retention_days,
            "deletion_policy_ref": retention.get("deletion_policy_ref") or "",
            "legal_hold_policy_ref": retention.get("legal_hold_policy_ref") or "",
        },
        "evidence": {
            "storage_policy_ref": evidence.get("storage_policy_ref") or "",
            "backup_job_ref": evidence.get("backup_job_ref") or "",
            "restore_test_ref": evidence.get("restore_test_ref") or "",
            "retention_policy_ref": evidence.get("retention_policy_ref") or "",
            "last_evidence_at": _parse_profile_datetime(evidence.get("last_evidence_at")),
        },
        "checks": checks,
    }


def _enterprise_security_check(
    ref: str,
    label: str,
    passed: bool,
    severity: str,
    detail: str,
    value=None,
    action: dict | None = None,
    owner_role_ref: str = "security-admin",
) -> dict:
    normalized_severity = "warning" if severity == "warning" else "blocker"
    return {
        "ref": ref,
        "label": label,
        "status": "ready" if passed else ("warning" if normalized_severity == "warning" else "blocked"),
        "severity": normalized_severity,
        "passed": passed,
        "value": value,
        "detail": detail,
        "action_label": (action or {}).get("label", "Review"),
        "action_href": (action or {}).get("href", "/tenant-admin/security-readiness"),
        "owner_role_ref": owner_role_ref,
    }


def _configured_action(actions: dict, key: str) -> dict:
    return actions.get(key) if isinstance(actions.get(key), dict) else {}


def get_tenant_admin_enterprise_security_readiness(tenant: Tenant) -> dict:
    """Builds tenant-visible MFA, SSO, SCIM, session, audit, and data-protection readiness."""

    now = timezone.now()
    profile, profile_source = _resolve_saas_enterprise_security_profile(tenant)
    mfa = profile.get("mfa") if isinstance(profile.get("mfa"), dict) else {}
    sso = profile.get("sso") if isinstance(profile.get("sso"), dict) else {}
    scim = profile.get("scim") if isinstance(profile.get("scim"), dict) else {}
    session = profile.get("session") if isinstance(profile.get("session"), dict) else {}
    audit = profile.get("audit") if isinstance(profile.get("audit"), dict) else {}
    data_protection = profile.get("data_protection") if isinstance(profile.get("data_protection"), dict) else {}
    actions = profile.get("actions") if isinstance(profile.get("actions"), dict) else {}

    mfa_required = bool(mfa.get("required", True))
    mfa_owner = str(mfa.get("owner_role_ref") or "security-admin")
    allowed_methods = [str(item) for item in mfa.get("allowed_methods", []) if str(item)]
    minimum_method_count = _coerce_positive_int(mfa.get("minimum_method_count"), 1)
    mfa_enforced = bool(mfa.get("enforced"))
    mfa_severity = "blocker" if mfa_required else "warning"

    sso_required = bool(sso.get("required", True))
    sso_owner = str(sso.get("owner_role_ref") or "security-admin")
    sso_enabled = bool(sso.get("enabled"))
    sso_protocol = str(sso.get("protocol") or "").lower()
    allowed_protocols = [str(item).lower() for item in sso.get("allowed_protocols", []) if str(item)]
    sso_last_tested_at = _parse_profile_datetime(sso.get("last_tested_at"))
    sso_test_interval_days = _coerce_positive_int(sso.get("test_interval_days"), 30)
    sso_test_is_recent = bool(sso_last_tested_at and now - sso_last_tested_at <= timedelta(days=sso_test_interval_days))
    certificate_rotation_due_at = _parse_profile_datetime(sso.get("certificate_rotation_due_at"))
    certificate_warning_days = _coerce_positive_int(sso.get("certificate_warning_days"), 30)
    certificate_in_warning_window = bool(
        certificate_rotation_due_at and certificate_rotation_due_at - now <= timedelta(days=certificate_warning_days)
    )
    certificate_is_current = bool(certificate_rotation_due_at and certificate_rotation_due_at >= now)
    sso_severity = "blocker" if sso_required else "warning"

    scim_required = bool(scim.get("required", True))
    scim_owner = str(scim.get("owner_role_ref") or "security-admin")
    scim_enabled = bool(scim.get("enabled"))
    scim_last_sync_at = _parse_profile_datetime(scim.get("last_sync_at"))
    scim_sync_interval_hours = _coerce_positive_int(scim.get("sync_interval_hours"), 24)
    scim_sync_is_recent = bool(scim_last_sync_at and now - scim_last_sync_at <= timedelta(hours=scim_sync_interval_hours))
    scim_error_count = _coerce_positive_int(scim.get("error_count"), 0)
    scim_max_error_count = _coerce_positive_int(scim.get("max_error_count"), 0)
    scim_deprovisioning_enabled = bool(scim.get("deprovisioning_enabled"))
    scim_severity = "blocker" if scim_required else "warning"

    idle_timeout_minutes = _coerce_positive_int(session.get("idle_timeout_minutes"), 0)
    max_idle_timeout_minutes = _coerce_positive_int(session.get("max_idle_timeout_minutes"), 60)
    absolute_timeout_hours = _coerce_positive_int(session.get("absolute_timeout_hours"), 0)
    max_absolute_timeout_hours = _coerce_positive_int(session.get("max_absolute_timeout_hours"), 12)
    device_trust_required = bool(session.get("device_trust_required"))
    device_trust_enabled = bool(session.get("device_trust_enabled"))
    session_owner = str(session.get("owner_role_ref") or "security-admin")

    audit_retention_days = _coerce_positive_int(audit.get("retention_days"), 0)
    minimum_audit_retention_days = _coerce_positive_int(audit.get("minimum_retention_days"), 2555)
    customer_export_enabled = bool(audit.get("customer_export_enabled"))
    immutable_export_ref = str(audit.get("immutable_export_ref") or "")
    audit_owner = str(audit.get("owner_role_ref") or "compliance-admin")

    encryption_at_rest = bool(data_protection.get("encryption_at_rest"))
    encryption_in_transit = bool(data_protection.get("encryption_in_transit"))
    customer_managed_key_ref = str(data_protection.get("customer_managed_key_ref") or "")
    data_residency_ref = str(data_protection.get("data_residency_ref") or "")
    data_owner = str(data_protection.get("owner_role_ref") or "security-admin")

    checks = [
        _enterprise_security_check(
            "mfa.enforced",
            "MFA enforcement",
            (not mfa_required) or mfa_enforced,
            mfa_severity,
            "MFA is enforced for tenant access." if mfa_enforced else "Enable MFA enforcement or relax the tenant MFA requirement.",
            mfa_enforced,
            _configured_action(actions, "mfa"),
            mfa_owner,
        ),
        _enterprise_security_check(
            "mfa.methods",
            "MFA method catalog",
            (not mfa_required) or len(allowed_methods) >= minimum_method_count,
            mfa_severity,
            "MFA methods satisfy the tenant minimum." if len(allowed_methods) >= minimum_method_count else "Configure allowed MFA methods for this tenant.",
            allowed_methods,
            _configured_action(actions, "mfa"),
            mfa_owner,
        ),
        _enterprise_security_check(
            "mfa.evidence",
            "MFA evidence reference",
            (not mfa_required) or bool(mfa.get("evidence_ref")),
            "warning",
            "MFA evidence reference is attached." if mfa.get("evidence_ref") else "Attach MFA policy evidence for customer review.",
            mfa.get("evidence_ref") or "",
            _configured_action(actions, "mfa"),
            mfa_owner,
        ),
        _enterprise_security_check(
            "sso.enabled",
            "SSO enabled",
            (not sso_required) or sso_enabled,
            sso_severity,
            "SSO is enabled for tenant authentication." if sso_enabled else "Enable SSO or relax the tenant SSO requirement.",
            sso_enabled,
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "sso.provider",
            "SSO provider and metadata",
            (not sso_required) or (bool(sso.get("provider_ref")) and bool(sso.get("metadata_ref"))),
            sso_severity,
            "SSO provider and metadata references are configured." if sso.get("provider_ref") and sso.get("metadata_ref") else "Configure provider_ref and metadata_ref for the tenant SSO profile.",
            {"provider_ref": sso.get("provider_ref") or "", "metadata_ref": sso.get("metadata_ref") or ""},
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "sso.protocol",
            "SSO protocol",
            (not sso_required) or (bool(sso_protocol) and (not allowed_protocols or sso_protocol in allowed_protocols)),
            sso_severity,
            "SSO protocol is tenant-approved." if sso_protocol and (not allowed_protocols or sso_protocol in allowed_protocols) else "Set an approved SSO protocol.",
            sso_protocol,
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "sso.tested",
            "SSO test evidence",
            (not sso_required) or sso_test_is_recent,
            sso_severity,
            "Latest SSO test is inside the configured interval." if sso_test_is_recent else "Record a successful SSO test inside the configured interval.",
            sso_last_tested_at,
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "sso.certificate_rotation",
            "SSO certificate rotation",
            (not sso_required) or certificate_is_current,
            "blocker",
            "SSO certificate rotation date is current." if certificate_is_current else "Configure a future SSO certificate rotation due date.",
            certificate_rotation_due_at,
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "sso.certificate_window",
            "Certificate rotation window",
            not certificate_in_warning_window,
            "warning",
            "Certificate rotation is outside the warning window." if not certificate_in_warning_window else "SSO certificate rotation is inside the configured warning window.",
            certificate_rotation_due_at,
            _configured_action(actions, "sso"),
            sso_owner,
        ),
        _enterprise_security_check(
            "scim.enabled",
            "SCIM enabled",
            (not scim_required) or scim_enabled,
            scim_severity,
            "SCIM provisioning is enabled." if scim_enabled else "Enable SCIM provisioning or relax the tenant SCIM requirement.",
            scim_enabled,
            _configured_action(actions, "scim"),
            scim_owner,
        ),
        _enterprise_security_check(
            "scim.sync",
            "SCIM sync freshness",
            (not scim_required) or scim_sync_is_recent,
            scim_severity,
            "Latest SCIM sync is inside the configured interval." if scim_sync_is_recent else "Record a successful SCIM sync inside the configured interval.",
            scim_last_sync_at,
            _configured_action(actions, "scim"),
            scim_owner,
        ),
        _enterprise_security_check(
            "scim.errors",
            "SCIM error budget",
            scim_error_count <= scim_max_error_count,
            scim_severity,
            "SCIM errors are within the configured limit." if scim_error_count <= scim_max_error_count else "Resolve SCIM sync errors before launch.",
            f"{scim_error_count} / {scim_max_error_count}",
            _configured_action(actions, "scim"),
            scim_owner,
        ),
        _enterprise_security_check(
            "scim.deprovisioning",
            "SCIM deprovisioning",
            (not scim_required) or scim_deprovisioning_enabled,
            scim_severity,
            "SCIM deprovisioning is enabled." if scim_deprovisioning_enabled else "Enable deprovisioning to close access on identity removal.",
            scim_deprovisioning_enabled,
            _configured_action(actions, "scim"),
            scim_owner,
        ),
        _enterprise_security_check(
            "session.idle_timeout",
            "Idle session timeout",
            bool(idle_timeout_minutes) and idle_timeout_minutes <= max_idle_timeout_minutes,
            "blocker",
            "Idle timeout satisfies the tenant limit." if idle_timeout_minutes and idle_timeout_minutes <= max_idle_timeout_minutes else "Configure an idle timeout within the tenant maximum.",
            f"{idle_timeout_minutes}m / {max_idle_timeout_minutes}m",
            _configured_action(actions, "session"),
            session_owner,
        ),
        _enterprise_security_check(
            "session.absolute_timeout",
            "Absolute session timeout",
            bool(absolute_timeout_hours) and absolute_timeout_hours <= max_absolute_timeout_hours,
            "blocker",
            "Absolute timeout satisfies the tenant limit." if absolute_timeout_hours and absolute_timeout_hours <= max_absolute_timeout_hours else "Configure an absolute session timeout within the tenant maximum.",
            f"{absolute_timeout_hours}h / {max_absolute_timeout_hours}h",
            _configured_action(actions, "session"),
            session_owner,
        ),
        _enterprise_security_check(
            "session.device_trust",
            "Device trust",
            (not device_trust_required) or device_trust_enabled,
            "warning",
            "Device trust satisfies the tenant requirement." if (not device_trust_required) or device_trust_enabled else "Enable device trust or relax the tenant requirement.",
            device_trust_enabled,
            _configured_action(actions, "session"),
            session_owner,
        ),
        _enterprise_security_check(
            "audit.retention",
            "Audit retention",
            audit_retention_days >= minimum_audit_retention_days,
            "blocker",
            "Audit retention meets the tenant minimum." if audit_retention_days >= minimum_audit_retention_days else "Increase audit retention to satisfy the tenant minimum.",
            f"{audit_retention_days}d / {minimum_audit_retention_days}d",
            _configured_action(actions, "audit"),
            audit_owner,
        ),
        _enterprise_security_check(
            "audit.customer_export",
            "Customer audit export",
            customer_export_enabled,
            "blocker",
            "Customer audit export is enabled." if customer_export_enabled else "Enable tenant-visible audit export.",
            customer_export_enabled,
            _configured_action(actions, "audit"),
            audit_owner,
        ),
        _enterprise_security_check(
            "audit.immutable_export",
            "Immutable export evidence",
            bool(immutable_export_ref),
            "warning",
            "Immutable export evidence is configured." if immutable_export_ref else "Attach immutable audit export evidence.",
            immutable_export_ref,
            _configured_action(actions, "audit"),
            audit_owner,
        ),
        _enterprise_security_check(
            "data.encryption_at_rest",
            "Encryption at rest",
            encryption_at_rest,
            "blocker",
            "Encryption at rest is enabled." if encryption_at_rest else "Enable or document encryption at rest for this tenant.",
            encryption_at_rest,
            _configured_action(actions, "data_protection"),
            data_owner,
        ),
        _enterprise_security_check(
            "data.encryption_in_transit",
            "Encryption in transit",
            encryption_in_transit,
            "blocker",
            "Encryption in transit is enabled." if encryption_in_transit else "Enable or document encryption in transit for this tenant.",
            encryption_in_transit,
            _configured_action(actions, "data_protection"),
            data_owner,
        ),
        _enterprise_security_check(
            "data.residency",
            "Data residency reference",
            bool(data_residency_ref),
            "warning",
            "Data residency reference is configured." if data_residency_ref else "Attach the tenant data residency reference.",
            data_residency_ref,
            _configured_action(actions, "data_protection"),
            data_owner,
        ),
    ]
    blocker_count = sum(1 for item in checks if item["status"] == "blocked")
    warning_count = sum(1 for item in checks if item["status"] == "warning")
    check_refs_by_group = {
        "mfa": {item["ref"] for item in checks if item["ref"].startswith("mfa.")},
        "sso": {item["ref"] for item in checks if item["ref"].startswith("sso.")},
        "scim": {item["ref"] for item in checks if item["ref"].startswith("scim.")},
        "session": {item["ref"] for item in checks if item["ref"].startswith("session.")},
        "audit": {item["ref"] for item in checks if item["ref"].startswith("audit.")},
        "data_protection": {item["ref"] for item in checks if item["ref"].startswith("data.")},
    }
    return {
        "profile_ref": SAAS_ENTERPRISE_SECURITY_READINESS_REF,
        "security_profile_ref": profile.get("profile_ref") or SAAS_ENTERPRISE_SECURITY_PROFILE_REF,
        "profile_source": profile_source,
        "generated_at": now,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "timezone": tenant.timezone,
        },
        "summary": {
            "status": "blocked" if blocker_count else ("warning" if warning_count else "ready"),
            "check_count": len(checks),
            "passed_check_count": sum(1 for item in checks if item["passed"]),
            "blocker_count": blocker_count,
            "warning_count": warning_count,
            "mfa_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["mfa"]),
            "sso_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["sso"]),
            "scim_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["scim"]),
            "session_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["session"]),
            "audit_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["audit"]),
            "data_protection_ready": all(item["passed"] for item in checks if item["ref"] in check_refs_by_group["data_protection"]),
            "launch_blocker_refs": [item["ref"] for item in checks if item["status"] == "blocked"],
        },
        "mfa": {
            "required": mfa_required,
            "enforced": mfa_enforced,
            "allowed_methods": allowed_methods,
            "exempt_role_refs": [str(item) for item in mfa.get("exempt_role_refs", []) if str(item)],
            "minimum_method_count": minimum_method_count,
            "evidence_ref": mfa.get("evidence_ref") or "",
            "owner_role_ref": mfa_owner,
        },
        "sso": {
            "required": sso_required,
            "enabled": sso_enabled,
            "provider_ref": sso.get("provider_ref") or "",
            "protocol": sso_protocol,
            "allowed_protocols": allowed_protocols,
            "metadata_ref": sso.get("metadata_ref") or "",
            "last_tested_at": sso_last_tested_at,
            "test_interval_days": sso_test_interval_days,
            "certificate_rotation_due_at": certificate_rotation_due_at,
            "certificate_warning_days": certificate_warning_days,
        },
        "scim": {
            "required": scim_required,
            "enabled": scim_enabled,
            "provider_ref": scim.get("provider_ref") or "",
            "last_sync_at": scim_last_sync_at,
            "sync_interval_hours": scim_sync_interval_hours,
            "error_count": scim_error_count,
            "max_error_count": scim_max_error_count,
            "deprovisioning_enabled": scim_deprovisioning_enabled,
        },
        "session": {
            "idle_timeout_minutes": idle_timeout_minutes,
            "max_idle_timeout_minutes": max_idle_timeout_minutes,
            "absolute_timeout_hours": absolute_timeout_hours,
            "max_absolute_timeout_hours": max_absolute_timeout_hours,
            "device_trust_required": device_trust_required,
            "device_trust_enabled": device_trust_enabled,
        },
        "audit": {
            "retention_days": audit_retention_days,
            "minimum_retention_days": minimum_audit_retention_days,
            "customer_export_enabled": customer_export_enabled,
            "immutable_export_ref": immutable_export_ref,
        },
        "data_protection": {
            "encryption_at_rest": encryption_at_rest,
            "encryption_in_transit": encryption_in_transit,
            "customer_managed_key_ref": customer_managed_key_ref,
            "data_residency_ref": data_residency_ref,
        },
        "checks": checks,
    }


def _sla_target_for_incident(profile: dict, incident: SaasIncidentRecord) -> dict:
    targets = profile.get("incident_targets") if isinstance(profile.get("incident_targets"), dict) else {}
    target = targets.get(incident.severity, {}) if isinstance(targets.get(incident.severity), dict) else {}
    return {
        "response_minutes": _coerce_positive_int(target.get("response_minutes"), incident.target_response_minutes),
        "resolution_minutes": _coerce_positive_int(target.get("resolution_minutes"), incident.target_resolution_minutes),
        "owner_role_ref": str(target.get("owner_role_ref") or incident.owner_role_ref or "operations-admin"),
    }


def _sla_state(now, due_at, completed_at=None) -> str:
    if completed_at:
        return "met" if completed_at <= due_at else "breached"
    if now > due_at:
        return "breached"
    if due_at - now <= timedelta(minutes=60):
        return "at_risk"
    return "open"


def _sla_health_signal(ref: str, label: str, status: str, value, detail: str, href: str, owner_role_ref: str) -> dict:
    return {
        "ref": ref,
        "label": label,
        "status": status,
        "value": value,
        "detail": detail,
        "href": href,
        "owner_role_ref": owner_role_ref,
    }


def _saas_incident_payload(item: SaasIncidentRecord, *, profile: dict, now=None) -> dict:
    now = now or timezone.now()
    target = _sla_target_for_incident(profile, item)
    response_due_at = item.detected_at + timedelta(minutes=target["response_minutes"])
    resolution_due_at = item.detected_at + timedelta(minutes=target["resolution_minutes"])
    response_state = _sla_state(now, response_due_at, item.acknowledged_at)
    resolution_completed_at = item.resolved_at if item.status in {SaasIncidentStatus.RESOLVED, SaasIncidentStatus.CANCELED} else None
    resolution_state = _sla_state(now, resolution_due_at, resolution_completed_at)
    impact_options = profile.get("impact_options") if isinstance(profile.get("impact_options"), dict) else {}
    impact_labels = []
    for impact_ref in item.impact_refs if isinstance(item.impact_refs, list) else []:
        option = impact_options.get(impact_ref, {}) if isinstance(impact_options.get(impact_ref), dict) else {}
        impact_labels.append(str(option.get("label") or str(impact_ref).replace("_", " ").title()))
    return {
        "id": str(item.id),
        "incident_ref": item.incident_ref,
        "title": item.title,
        "description": item.description,
        "severity": item.severity,
        "status": item.status,
        "impact_refs": item.impact_refs if isinstance(item.impact_refs, list) else [],
        "impact_labels": impact_labels,
        "owner_role_ref": item.owner_role_ref or target["owner_role_ref"],
        "detected_at": item.detected_at,
        "acknowledged_at": item.acknowledged_at,
        "mitigated_at": item.mitigated_at,
        "resolved_at": item.resolved_at,
        "target_response_minutes": target["response_minutes"],
        "target_resolution_minutes": target["resolution_minutes"],
        "response_due_at": response_due_at,
        "resolution_due_at": resolution_due_at,
        "response_state": response_state,
        "resolution_state": resolution_state,
        "breached": response_state == "breached" or resolution_state == "breached",
        "at_risk": response_state == "at_risk" or resolution_state == "at_risk",
        "action_history": item.action_history if isinstance(item.action_history, list) else [],
        "incident_snapshot": item.incident_snapshot if isinstance(item.incident_snapshot, dict) else {},
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_saas_sla_operations(tenant: Tenant) -> dict:
    """Builds tenant-scoped incident, SLA, and service-impact operations posture."""

    now = timezone.now()
    profile, profile_source = _resolve_saas_sla_profile(tenant)
    open_statuses = [str(item) for item in profile.get("open_statuses", []) if str(item)]
    resolved_statuses = [str(item) for item in profile.get("resolved_statuses", []) if str(item)]
    incident_queryset = SaasIncidentRecord.objects.filter(tenant=tenant)
    incident_payloads = [
        _saas_incident_payload(item, profile=profile, now=now)
        for item in incident_queryset.order_by("status", "-detected_at")[:25]
    ]
    open_incidents = [item for item in incident_payloads if item["status"] in open_statuses]
    breached_incidents = [item for item in open_incidents if item["breached"]]
    at_risk_incidents = [item for item in open_incidents if item["at_risk"] and not item["breached"]]
    launch_remediation_queryset = HrmsLaunchRemediationAssignment.objects.filter(tenant=tenant)
    overdue_remediations = launch_remediation_queryset.filter(status=HrmsLaunchRemediationStatus.OPEN, due_at__lt=now)
    provider_job_queryset = PayrollProviderJob.objects.filter(tenant=tenant)
    stale_provider_jobs = provider_job_queryset.filter(
        status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING],
        leased_until__lte=now,
    )
    notification_queryset = Notification.objects.filter(tenant=tenant)
    failed_notifications = notification_queryset.filter(status=NotificationStatus.FAILED)
    expired_support_grants = SaasSupportAccessGrant.objects.filter(
        tenant=tenant,
        status__in=[SaasSupportAccessGrantStatus.APPROVED, SaasSupportAccessGrantStatus.ACTIVE],
        access_expires_at__lte=now,
    )
    thresholds = profile.get("operational_thresholds") if isinstance(profile.get("operational_thresholds"), dict) else {}
    signal_counts = {
        "failed_notifications": failed_notifications.count(),
        "stale_provider_jobs": stale_provider_jobs.count(),
        "expired_support_grants": expired_support_grants.count(),
        "overdue_remediations": overdue_remediations.count(),
    }
    health_signals = [
        _sla_health_signal(
            "incident.response_resolution",
            "Incident SLA",
            "blocked" if breached_incidents else ("warning" if at_risk_incidents or open_incidents else "ready"),
            len(breached_incidents),
            f"{len(open_incidents)} open incidents, {len(at_risk_incidents)} at risk.",
            "/hr-admin/saas-sla-operations",
            "operations-admin",
        )
    ]
    for metric_ref, count in signal_counts.items():
        config = thresholds.get(metric_ref, {}) if isinstance(thresholds.get(metric_ref), dict) else {}
        max_count = _coerce_positive_int(config.get("max_count"), 0)
        severity = "warning" if config.get("severity") == "warning" else "blocker"
        status = "ready" if count <= max_count else ("warning" if severity == "warning" else "blocked")
        health_signals.append(
            _sla_health_signal(
                f"operational.{metric_ref}",
                str(metric_ref).replace("_", " ").title(),
                status,
                count,
                f"Configured threshold is {max_count}.",
                str(config.get("href") or "/hr-admin/saas-sla-operations"),
                str(config.get("owner_role_ref") or "operations-admin"),
            )
        )

    blocked_count = sum(1 for item in health_signals if item["status"] == "blocked")
    warning_count = sum(1 for item in health_signals if item["status"] == "warning")
    severity_counts = {
        item["severity"]: item["count"]
        for item in incident_queryset.values("severity").annotate(count=Count("id")).order_by("severity")
    }
    status_counts = {
        item["status"]: item["count"]
        for item in incident_queryset.values("status").annotate(count=Count("id")).order_by("status")
    }
    impact_counts = {}
    for item in incident_payloads:
        for impact_ref in item["impact_refs"]:
            impact_counts[impact_ref] = impact_counts.get(impact_ref, 0) + 1
    return {
        "profile_ref": SAAS_SLA_OPERATIONS_REF,
        "sla_profile_ref": profile.get("profile_ref") or SAAS_SLA_PROFILE_REF,
        "profile_source": profile_source,
        "generated_at": now,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "timezone": tenant.timezone,
        },
        "summary": {
            "status": "blocked" if blocked_count else ("warning" if warning_count else "ready"),
            "signal_count": len(health_signals),
            "blocked_signal_count": blocked_count,
            "warning_signal_count": warning_count,
            "incident_count": incident_queryset.count(),
            "open_incident_count": len(open_incidents),
            "breached_incident_count": len(breached_incidents),
            "at_risk_incident_count": len(at_risk_incidents),
            "failed_notification_count": failed_notifications.count(),
            "stale_provider_job_count": stale_provider_jobs.count(),
            "expired_support_grant_count": expired_support_grants.count(),
            "overdue_remediation_count": overdue_remediations.count(),
        },
        "incident_targets": profile.get("incident_targets") if isinstance(profile.get("incident_targets"), dict) else {},
        "impact_options": profile.get("impact_options") if isinstance(profile.get("impact_options"), dict) else {},
        "operational_thresholds": thresholds,
        "status_counts": status_counts,
        "severity_counts": severity_counts,
        "impact_counts": impact_counts,
        "health_signals": health_signals,
        "incidents": incident_payloads,
    }


def _operational_health_signal(ref: str, label: str, status: str, value, detail: str, href: str, owner_role_ref: str = "hr-admin") -> dict:
    return {
        "ref": ref,
        "label": label,
        "status": status,
        "value": value,
        "detail": detail,
        "href": href,
        "owner_role_ref": owner_role_ref,
    }


def get_hr_admin_saas_operational_health(tenant: Tenant) -> dict:
    """Builds tenant-scoped operational health across launch, delivery, queue, and support surfaces."""

    now = timezone.now()
    dashboard = get_hr_admin_dashboard_for_tenant(tenant)
    launch_audit = dashboard["launch_audit"]
    commercial_control = describe_saas_commercial_control(tenant)
    resilience_readiness = get_hr_admin_saas_resilience_readiness(tenant)
    sla_operations = get_hr_admin_saas_sla_operations(tenant)
    remediation_queryset = HrmsLaunchRemediationAssignment.objects.filter(tenant=tenant)
    open_remediations = remediation_queryset.filter(status=HrmsLaunchRemediationStatus.OPEN)
    overdue_remediations = open_remediations.filter(due_at__lt=now)
    support_grant_queryset = SaasSupportAccessGrant.objects.filter(tenant=tenant)
    active_support_grants = support_grant_queryset.filter(status=SaasSupportAccessGrantStatus.ACTIVE)
    expired_runtime_grants = support_grant_queryset.filter(
        status__in=[SaasSupportAccessGrantStatus.APPROVED, SaasSupportAccessGrantStatus.ACTIVE],
        access_expires_at__lte=now,
    )
    change_request_queryset = SaasTenantChangeRequest.objects.filter(tenant=tenant)
    provider_job_queryset = PayrollProviderJob.objects.filter(tenant=tenant)
    provider_retry_queryset = PayrollProviderRetryEvent.objects.filter(tenant=tenant)
    stale_provider_jobs = provider_job_queryset.filter(
        status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING],
        leased_until__lte=now,
    )
    notification_queryset = Notification.objects.filter(tenant=tenant)
    failed_notifications = notification_queryset.filter(status=NotificationStatus.FAILED)
    active_support_sessions = active_support_grants.filter(access_expires_at__gt=now)
    pending_change_requests = change_request_queryset.filter(
        status__in=[SaasTenantChangeRequestStatus.SUBMITTED, SaasTenantChangeRequestStatus.APPROVED]
    )
    dead_lettered_provider_jobs = provider_job_queryset.filter(status=PayrollProviderJobStatus.DEAD_LETTERED)
    dead_lettered_retry_events = provider_retry_queryset.filter(status=PayrollProviderRetryEventStatus.DEAD_LETTERED)
    latest_events = get_recent_saas_commercial_audit_events(tenant, limit=10)
    latest_snapshots = get_recent_saas_usage_meter_snapshots(tenant, limit=8)
    recent_support_grants = [
        _support_access_grant_payload(item)
        for item in support_grant_queryset.order_by("-requested_at", "-updated_at")[:8]
    ]
    signal_inputs = [
        _operational_health_signal(
            "launch.blockers",
            "Launch blockers",
            "blocked" if launch_audit["blocker_count"] else ("warning" if launch_audit["warning_count"] else "ready"),
            launch_audit["blocker_count"],
            f"{launch_audit['warning_count']} warnings remain across {launch_audit['module_count']} modules.",
            "/hr-admin/launch-remediation",
            "release-manager",
        ),
        _operational_health_signal(
            "commercial.control",
            "Commercial control",
            "ready" if commercial_control["summary"]["can_launch"] else "blocked",
            commercial_control["summary"]["exceeded_usage_limit_count"],
            f"{commercial_control['summary']['missing_required_entitlement_count']} required entitlements missing.",
            "/hr-admin/saas-control-plane",
        ),
        _operational_health_signal(
            "resilience.readiness",
            "Backup and retention",
            resilience_readiness["summary"]["status"],
            resilience_readiness["summary"]["blocker_count"],
            f"{resilience_readiness['summary']['warning_count']} warnings across backup, restore, and retention checks.",
            "/hr-admin/saas-resilience",
            "platform-owner",
        ),
        _operational_health_signal(
            "sla.operations",
            "SLA operations",
            sla_operations["summary"]["status"],
            sla_operations["summary"]["breached_incident_count"],
            f"{sla_operations['summary']['open_incident_count']} open incidents, {sla_operations['summary']['warning_signal_count']} warning signals.",
            "/hr-admin/saas-sla-operations",
            "operations-admin",
        ),
        _operational_health_signal(
            "notification.delivery",
            "Notification delivery",
            "blocked" if failed_notifications.count() else ("warning" if notification_queryset.filter(status=NotificationStatus.PENDING).count() else "ready"),
            failed_notifications.count(),
            f"{notification_queryset.filter(status=NotificationStatus.PENDING).count()} notifications are pending delivery.",
            "/hr-admin/notification-diagnostics",
        ),
        _operational_health_signal(
            "provider.queue",
            "Provider queue",
            "blocked" if dead_lettered_provider_jobs.count() or stale_provider_jobs.count() else ("warning" if provider_job_queryset.filter(status=PayrollProviderJobStatus.QUEUED).count() else "ready"),
            dead_lettered_provider_jobs.count() + stale_provider_jobs.count(),
            f"{provider_job_queryset.filter(status=PayrollProviderJobStatus.QUEUED).count()} jobs queued, {dead_lettered_retry_events.count()} retry events dead-lettered.",
            "/hr-admin/payroll-handoff",
            "payroll-admin",
        ),
        _operational_health_signal(
            "support.sessions",
            "Support sessions",
            "blocked" if expired_runtime_grants.count() else ("warning" if active_support_sessions.count() else "ready"),
            active_support_sessions.count(),
            f"{expired_runtime_grants.count()} approved or active grants have passed expiry.",
            "/tenant-admin",
            "tenant-admin",
        ),
        _operational_health_signal(
            "tenant.change_requests",
            "Tenant change requests",
            "warning" if pending_change_requests.count() else "ready",
            pending_change_requests.count(),
            "Submitted or approved tenant-owned changes awaiting decision/application.",
            "/tenant-admin",
            "tenant-admin",
        ),
        _operational_health_signal(
            "remediation.sla",
            "Remediation SLA",
            "blocked" if overdue_remediations.count() else ("warning" if open_remediations.count() else "ready"),
            overdue_remediations.count(),
            f"{open_remediations.count()} launch remediation assignments are open.",
            "/hr-admin/launch-remediation",
            "release-manager",
        ),
    ]
    blocked_count = sum(1 for item in signal_inputs if item["status"] == "blocked")
    warning_count = sum(1 for item in signal_inputs if item["status"] == "warning")
    status_value = "blocked" if blocked_count else ("warning" if warning_count else "ready")
    return {
        "profile_ref": SAAS_OPERATIONAL_HEALTH_REF,
        "generated_at": now,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "timezone": tenant.timezone,
        },
        "summary": {
            "status": status_value,
            "signal_count": len(signal_inputs),
            "blocked_signal_count": blocked_count,
            "warning_signal_count": warning_count,
            "ready_signal_count": sum(1 for item in signal_inputs if item["status"] == "ready"),
            "open_remediation_count": open_remediations.count(),
            "overdue_remediation_count": overdue_remediations.count(),
            "failed_notification_count": failed_notifications.count(),
            "pending_notification_count": notification_queryset.filter(status=NotificationStatus.PENDING).count(),
            "resilience_status": resilience_readiness["summary"]["status"],
            "resilience_blocker_count": resilience_readiness["summary"]["blocker_count"],
            "resilience_warning_count": resilience_readiness["summary"]["warning_count"],
            "sla_status": sla_operations["summary"]["status"],
            "sla_open_incident_count": sla_operations["summary"]["open_incident_count"],
            "sla_breached_incident_count": sla_operations["summary"]["breached_incident_count"],
            "queued_provider_job_count": provider_job_queryset.filter(status=PayrollProviderJobStatus.QUEUED).count(),
            "running_provider_job_count": provider_job_queryset.filter(status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING]).count(),
            "stale_provider_job_count": stale_provider_jobs.count(),
            "dead_lettered_provider_job_count": dead_lettered_provider_jobs.count(),
            "dead_lettered_provider_retry_event_count": dead_lettered_retry_events.count(),
            "active_support_session_count": active_support_sessions.count(),
            "expired_support_grant_count": expired_runtime_grants.count(),
            "pending_change_request_count": pending_change_requests.count(),
            "commercial_event_count": SaasCommercialAuditEvent.objects.filter(tenant=tenant).count(),
            "usage_snapshot_count": SaasUsageMeterSnapshot.objects.filter(tenant=tenant).count(),
        },
        "signals": signal_inputs,
        "launch_audit": {
            "audit_profile_ref": launch_audit["audit_profile_ref"],
            "status": launch_audit["status"],
            "blocker_count": launch_audit["blocker_count"],
            "warning_count": launch_audit["warning_count"],
            "release_blocker_refs": launch_audit["release_blocker_refs"],
            "release_warning_refs": launch_audit["release_warning_refs"],
        },
        "commercial_control": {
            "profile_ref": commercial_control["profile_ref"],
            "profile_source": commercial_control["profile_source"],
            "summary": commercial_control["summary"],
            "subscription": commercial_control["subscription"],
            "plan": commercial_control["plan"],
            "exceeded_usage_limits": commercial_control["exceeded_usage_limits"],
        },
        "resilience_readiness": {
            "profile_ref": resilience_readiness["profile_ref"],
            "resilience_profile_ref": resilience_readiness["resilience_profile_ref"],
            "profile_source": resilience_readiness["profile_source"],
            "summary": resilience_readiness["summary"],
            "backup": resilience_readiness["backup"],
            "restore": resilience_readiness["restore"],
            "retention": resilience_readiness["retention"],
        },
        "sla_operations": {
            "profile_ref": sla_operations["profile_ref"],
            "sla_profile_ref": sla_operations["sla_profile_ref"],
            "profile_source": sla_operations["profile_source"],
            "summary": sla_operations["summary"],
            "health_signals": sla_operations["health_signals"],
            "incidents": sla_operations["incidents"][:8],
        },
        "notification_delivery": {
            "pending_count": notification_queryset.filter(status=NotificationStatus.PENDING).count(),
            "failed_count": failed_notifications.count(),
            "sent_today_count": dashboard["delivery"]["sent_today"],
            "latest_activity_at": dashboard["delivery"]["latest_activity_at"],
        },
        "provider_queue": {
            "job_status_counts": {
                item["status"]: item["count"]
                for item in provider_job_queryset.values("status").annotate(count=Count("id")).order_by("status")
            },
            "retry_status_counts": {
                item["status"]: item["count"]
                for item in provider_retry_queryset.values("status").annotate(count=Count("id")).order_by("status")
            },
            "stale_job_count": stale_provider_jobs.count(),
            "dead_lettered_job_count": dead_lettered_provider_jobs.count(),
            "dead_lettered_retry_event_count": dead_lettered_retry_events.count(),
        },
        "support_access": {
            "active_session_count": active_support_sessions.count(),
            "expired_runtime_grant_count": expired_runtime_grants.count(),
            "status_counts": {
                item["status"]: item["count"]
                for item in support_grant_queryset.values("status").annotate(count=Count("id")).order_by("status")
            },
            "recent_grants": recent_support_grants,
        },
        "tenant_change_requests": {
            "pending_count": pending_change_requests.count(),
            "status_counts": {
                item["status"]: item["count"]
                for item in change_request_queryset.values("status").annotate(count=Count("id")).order_by("status")
            },
        },
        "recent_commercial_events": latest_events,
        "recent_usage_snapshots": latest_snapshots,
    }


def describe_hrms_saas_launch_audit_pack(
    tenant,
    *,
    generated_at=None,
    generated_by_ref: str = HRMS_SAAS_LAUNCH_AUDIT_COMMAND_REF,
) -> dict:
    """Builds an exportable launch audit pack for tenant go-live review."""

    generated_at = generated_at or timezone.now()
    dashboard = get_hr_admin_dashboard_for_tenant(tenant)
    launch_audit = dashboard["launch_audit"]
    audit_pack = {
        "audit_pack_ref": HRMS_SAAS_LAUNCH_AUDIT_PACK_REF,
        "audit_profile_ref": launch_audit["audit_profile_ref"],
        "audit_profile_source": launch_audit["audit_profile_source"],
        "generated_by_ref": generated_by_ref,
        "generated_at": generated_at,
        "tenant": {
            "id": str(tenant.id),
            "code": tenant.code,
            "name": tenant.name,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
            "country_code": tenant.country_code,
            "timezone": tenant.timezone,
            "is_sandbox": tenant.is_sandbox,
        },
        "status": launch_audit["status"],
        "can_launch": launch_audit["blocker_count"] == 0,
        "summary": {
            "module_count": launch_audit["module_count"],
            "gate_count": launch_audit["gate_count"],
            "passed_gate_count": launch_audit["passed_gate_count"],
            "blocker_count": launch_audit["blocker_count"],
            "warning_count": launch_audit["warning_count"],
            "release_action_count": len(launch_audit["release_actions"]),
        },
        "release_blocker_refs": launch_audit["release_blocker_refs"],
        "release_warning_refs": launch_audit["release_warning_refs"],
        "release_actions": launch_audit["release_actions"],
        "modules": launch_audit["modules"],
        "evidence_refs": launch_audit["evidence_refs"],
    }
    recompute_hrms_saas_launch_audit_pack_checksum(audit_pack)
    return audit_pack


def recompute_hrms_saas_launch_audit_pack_checksum(audit_pack: dict) -> str:
    checksum_payload = {key: value for key, value in audit_pack.items() if key != "evidence_checksum_sha256"}
    checksum = hashlib.sha256(json.dumps(checksum_payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    audit_pack["evidence_checksum_sha256"] = checksum
    return checksum


def _hrms_launch_remediation_due_state(item: HrmsLaunchRemediationAssignment, *, now=None) -> dict:
    if item.status != HrmsLaunchRemediationStatus.OPEN:
        return {
            "due_state": item.status,
            "days_until_due": None,
            "is_overdue": False,
            "is_due_soon": False,
        }
    if not item.due_at:
        return {
            "due_state": "unscheduled",
            "days_until_due": None,
            "is_overdue": False,
            "is_due_soon": False,
        }
    current_time = now or timezone.now()
    seconds_until_due = (item.due_at - current_time).total_seconds()
    days_until_due = int(seconds_until_due // 86400) if seconds_until_due >= 0 else -int(abs(seconds_until_due) // 86400) - 1
    is_overdue = item.due_at < current_time
    is_due_soon = not is_overdue and item.due_at <= current_time + timedelta(days=1)
    return {
        "due_state": "overdue" if is_overdue else "due_soon" if is_due_soon else "scheduled",
        "days_until_due": days_until_due,
        "is_overdue": is_overdue,
        "is_due_soon": is_due_soon,
    }


def _notify_hrms_launch_remediation_assignment(
    assignment: HrmsLaunchRemediationAssignment,
    *,
    trigger_key: str,
    actor_identifier: str,
    note: str = "",
) -> int:
    owner_role = Role.objects.filter(tenant=assignment.tenant, code=assignment.escalation_owner_role_ref or assignment.owner_role_ref).first()
    title = f"Launch remediation: {assignment.label}"
    body_parts = [
        f"{assignment.module_label} gate {assignment.gate_ref} needs launch attention.",
        f"Severity is {assignment.severity}.",
    ]
    if assignment.due_at:
        body_parts.append(f"Due at {assignment.due_at.isoformat()}.")
    if note:
        body_parts.append(note)
    notifications = trigger_notification_event(
        tenant=assignment.tenant,
        module="saas_operations",
        trigger_key=trigger_key,
        subject_type="hrms_launch_remediation_assignment",
        subject_identifier=str(assignment.id),
        recipient_role=owner_role,
        recipient_identifier=assignment.assigned_to_identifier or assignment.owner_role_ref,
        fallback_title=title,
        fallback_body=" ".join(body_parts),
        payload={
            "assignment_id": str(assignment.id),
            "gate_ref": assignment.gate_ref,
            "module_ref": assignment.module_ref,
            "module_label": assignment.module_label,
            "severity": assignment.severity,
            "status": assignment.status,
            "owner_role_ref": assignment.owner_role_ref,
            "assigned_to_identifier": assignment.assigned_to_identifier,
            "escalation_owner_role_ref": assignment.escalation_owner_role_ref,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else "",
            "actor_identifier": actor_identifier,
            "resolution_note": note,
        },
    )
    return len(notifications)


def _serialize_hrms_launch_remediation_assignment(item: HrmsLaunchRemediationAssignment) -> dict:
    due_runtime = _hrms_launch_remediation_due_state(item)
    return {
        "id": str(item.id),
        "gate_ref": item.gate_ref,
        "module_ref": item.module_ref,
        "module_label": item.module_label,
        "label": item.label,
        "severity": item.severity,
        "status": item.status,
        "owner_role_ref": item.owner_role_ref,
        "assigned_to_identifier": item.assigned_to_identifier,
        "action_href": item.action_href,
        "action_label": item.action_label,
        "sla_days": item.sla_days,
        "current_value": item.current_value,
        "evidence_ref": item.evidence_ref,
        "first_seen_at": item.first_seen_at,
        "last_seen_at": item.last_seen_at,
        "due_at": item.due_at,
        "due_source_ref": item.due_source_ref,
        "due_state": due_runtime["due_state"],
        "days_until_due": due_runtime["days_until_due"],
        "is_overdue": due_runtime["is_overdue"],
        "is_due_soon": due_runtime["is_due_soon"],
        "acknowledged_at": item.acknowledged_at,
        "acknowledged_by_identifier": item.acknowledged_by_identifier,
        "reminder_sent_at": item.reminder_sent_at,
        "reminder_count": item.reminder_count,
        "escalated_at": item.escalated_at,
        "escalated_by_identifier": item.escalated_by_identifier,
        "escalation_owner_role_ref": item.escalation_owner_role_ref,
        "ignored_at": item.ignored_at,
        "ignored_by_identifier": item.ignored_by_identifier,
        "resolved_at": item.resolved_at,
        "resolution_note": item.resolution_note,
        "action_history": item.action_history,
        "source_hash": item.source_hash,
    }


def sync_hrms_saas_launch_remediation_assignments(tenant, launch_audit: dict) -> dict:
    """Materializes open remediation rows from launch audit actions."""

    now = timezone.now()
    action_refs = set()
    opened_count = 0
    updated_count = 0
    for action in launch_audit.get("release_actions") or []:
        gate_ref = str(action.get("ref") or "").strip()
        if not gate_ref:
            continue
        action_refs.add(gate_ref)
        sla_days = int(action.get("sla_days") or 3)
        defaults = {
            "module_ref": str(action.get("module_ref") or ""),
            "module_label": str(action.get("module_label") or ""),
            "label": str(action.get("label") or ""),
            "severity": str(action.get("severity") or "warning"),
            "owner_role_ref": str(action.get("owner_role_ref") or "hr-admin"),
            "action_href": str(action.get("action_href") or "/hr-admin"),
            "action_label": str(action.get("action_label") or "Review"),
            "sla_days": sla_days,
            "current_value": str(action.get("value") if action.get("value") is not None else ""),
            "evidence_ref": str(action.get("evidence_ref") or ""),
            "last_seen_at": now,
            "assignment_snapshot": action,
        }
        try:
            assignment, created = HrmsLaunchRemediationAssignment.objects.get_or_create(
                tenant=tenant,
                gate_ref=gate_ref,
                defaults={
                    "status": HrmsLaunchRemediationStatus.OPEN,
                    "due_at": now + timedelta(days=sla_days),
                    "due_source_ref": "launch_audit.sla_days",
                    **defaults,
                },
            )
        except (IntegrityError, ValidationError):
            assignment = HrmsLaunchRemediationAssignment.objects.get(tenant=tenant, gate_ref=gate_ref)
            created = False
        if created:
            opened_count += 1
        else:
            for field, value in defaults.items():
                setattr(assignment, field, value)
            if assignment.status == HrmsLaunchRemediationStatus.CLOSED:
                assignment.status = HrmsLaunchRemediationStatus.OPEN
                assignment.resolved_at = None
            if assignment.status == HrmsLaunchRemediationStatus.OPEN and not assignment.due_at:
                assignment.due_at = assignment.first_seen_at + timedelta(days=sla_days)
                assignment.due_source_ref = "launch_audit.sla_days"
            assignment.save()
            updated_count += 1

    close_queryset = HrmsLaunchRemediationAssignment.objects.filter(
        tenant=tenant,
        status=HrmsLaunchRemediationStatus.OPEN,
    ).exclude(gate_ref__in=action_refs)
    closed_count = 0
    for assignment in close_queryset:
        assignment.status = HrmsLaunchRemediationStatus.CLOSED
        assignment.resolved_at = now
        assignment.last_seen_at = now
        assignment.save()
        closed_count += 1
    open_items = list(
        HrmsLaunchRemediationAssignment.objects.filter(
            tenant=tenant,
            status=HrmsLaunchRemediationStatus.OPEN,
        ).order_by("severity", "module_ref", "gate_ref")
    )
    return {
        "opened_count": opened_count,
        "updated_count": updated_count,
        "closed_count": closed_count,
        "open_count": len(open_items),
        "items": [_serialize_hrms_launch_remediation_assignment(item) for item in open_items],
    }


def get_hrms_saas_launch_remediation_assignments(
    tenant,
    *,
    status_filter: str = "open",
    severity: str = "",
    owner_role_ref: str = "",
    module_ref: str = "",
    due_state: str = "",
    query: str = "",
    page: int = 1,
    page_size: int = 20,
) -> dict:
    dashboard = get_hr_admin_dashboard_for_tenant(tenant)
    sync_hrms_saas_launch_remediation_assignments(tenant, dashboard["launch_audit"])

    queryset = HrmsLaunchRemediationAssignment.objects.filter(tenant=tenant)
    if status_filter and status_filter != "all":
        queryset = queryset.filter(status=status_filter)
    if severity:
        queryset = queryset.filter(severity=severity)
    if owner_role_ref:
        queryset = queryset.filter(owner_role_ref=owner_role_ref)
    if module_ref:
        queryset = queryset.filter(module_ref=module_ref)
    if due_state == "overdue":
        queryset = queryset.filter(status=HrmsLaunchRemediationStatus.OPEN, due_at__lt=timezone.now())
    elif due_state == "due_soon":
        now = timezone.now()
        queryset = queryset.filter(status=HrmsLaunchRemediationStatus.OPEN, due_at__gte=now, due_at__lte=now + timedelta(days=1))
    elif due_state == "scheduled":
        queryset = queryset.filter(status=HrmsLaunchRemediationStatus.OPEN, due_at__gt=timezone.now() + timedelta(days=1))
    elif due_state == "unscheduled":
        queryset = queryset.filter(status=HrmsLaunchRemediationStatus.OPEN, due_at__isnull=True)
    if query:
        queryset = queryset.filter(
            Q(gate_ref__icontains=query)
            | Q(label__icontains=query)
            | Q(module_label__icontains=query)
            | Q(owner_role_ref__icontains=query)
            | Q(assigned_to_identifier__icontains=query)
        )

    page = max(int(page or 1), 1)
    page_size = min(max(int(page_size or 20), 1), 100)
    total_count = queryset.count()
    offset = (page - 1) * page_size
    items = list(queryset.order_by("status", "severity", "module_ref", "gate_ref")[offset : offset + page_size])
    all_items = HrmsLaunchRemediationAssignment.objects.filter(tenant=tenant)
    status_counts = dict(all_items.values_list("status").annotate(count=Count("id")))
    severity_counts = dict(all_items.filter(status=HrmsLaunchRemediationStatus.OPEN).values_list("severity").annotate(count=Count("id")))
    current_time = timezone.now()
    open_items_for_due = all_items.filter(status=HrmsLaunchRemediationStatus.OPEN)
    owners = list(
        all_items.exclude(owner_role_ref="")
        .values_list("owner_role_ref", flat=True)
        .distinct()
        .order_by("owner_role_ref")
    )
    modules = [
        {"module_ref": row["module_ref"], "module_label": row["module_label"]}
        for row in all_items.exclude(module_ref="")
        .values("module_ref", "module_label")
        .distinct()
        .order_by("module_label", "module_ref")
    ]
    return {
        "summary": {
            "open_count": status_counts.get(HrmsLaunchRemediationStatus.OPEN, 0),
            "closed_count": status_counts.get(HrmsLaunchRemediationStatus.CLOSED, 0),
            "ignored_count": status_counts.get(HrmsLaunchRemediationStatus.IGNORED, 0),
            "blocker_count": severity_counts.get("blocker", 0),
            "warning_count": severity_counts.get("warning", 0),
            "overdue_count": open_items_for_due.filter(due_at__lt=current_time).count(),
            "due_soon_count": open_items_for_due.filter(due_at__gte=current_time, due_at__lte=current_time + timedelta(days=1)).count(),
            "unscheduled_count": open_items_for_due.filter(due_at__isnull=True).count(),
            "escalated_count": open_items_for_due.filter(escalated_at__isnull=False).count(),
            "owner_count": len(owners),
            "module_count": len(modules),
        },
        "filters": {
            "status": status_filter or "open",
            "severity": severity,
            "owner_role_ref": owner_role_ref,
            "module_ref": module_ref,
            "due_state": due_state,
            "q": query,
        },
        "options": {
            "statuses": [choice[0] for choice in HrmsLaunchRemediationStatus.choices],
            "severities": ["blocker", "warning"],
            "due_states": ["overdue", "due_soon", "scheduled", "unscheduled"],
            "owners": owners,
            "modules": modules,
        },
        "items": [_serialize_hrms_launch_remediation_assignment(item) for item in items],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
    }


def update_hrms_saas_launch_remediation_assignment(
    tenant,
    item_id,
    *,
    action: str,
    actor_identifier: str = "",
    owner_role_ref: str = "",
    assigned_to_identifier: str = "",
    due_at=None,
    escalation_owner_role_ref: str = "",
    resolution_note: str = "",
) -> dict:
    now = timezone.now()
    assignment = HrmsLaunchRemediationAssignment.objects.get(tenant=tenant, id=item_id)
    history = list(assignment.action_history or [])
    actor = actor_identifier or "system"
    entry = {
        "action": action,
        "actor_identifier": actor,
        "recorded_at": now.isoformat(),
    }

    if action == "acknowledge":
        assignment.acknowledged_at = now
        assignment.acknowledged_by_identifier = actor
    elif action == "assign":
        if owner_role_ref:
            assignment.owner_role_ref = owner_role_ref
        assignment.assigned_to_identifier = assigned_to_identifier
        entry["owner_role_ref"] = assignment.owner_role_ref
        entry["assigned_to_identifier"] = assigned_to_identifier
    elif action == "set_due_date":
        assignment.due_at = due_at
        assignment.due_source_ref = "manual_override"
        entry["due_at"] = due_at.isoformat() if due_at else ""
    elif action == "ignore":
        assignment.status = HrmsLaunchRemediationStatus.IGNORED
        assignment.ignored_at = now
        assignment.ignored_by_identifier = actor
        assignment.resolution_note = resolution_note
        entry["resolution_note"] = resolution_note
    elif action == "resolve":
        assignment.status = HrmsLaunchRemediationStatus.CLOSED
        assignment.resolved_at = now
        assignment.resolution_note = resolution_note
        entry["resolution_note"] = resolution_note
    elif action == "send_reminder":
        assignment.reminder_sent_at = now
        assignment.reminder_count += 1
        notification_count = _notify_hrms_launch_remediation_assignment(
            assignment,
            trigger_key="hrms.launch_remediation.reminder",
            actor_identifier=actor,
            note=resolution_note,
        )
        entry["notification_count"] = notification_count
        entry["resolution_note"] = resolution_note
    elif action == "escalate":
        assignment.escalated_at = now
        assignment.escalated_by_identifier = actor
        assignment.escalation_owner_role_ref = escalation_owner_role_ref or assignment.escalation_owner_role_ref or assignment.owner_role_ref
        notification_count = _notify_hrms_launch_remediation_assignment(
            assignment,
            trigger_key="hrms.launch_remediation.escalated",
            actor_identifier=actor,
            note=resolution_note,
        )
        entry["notification_count"] = notification_count
        entry["escalation_owner_role_ref"] = assignment.escalation_owner_role_ref
        entry["resolution_note"] = resolution_note
    elif action == "reopen":
        assignment.status = HrmsLaunchRemediationStatus.OPEN
        assignment.resolved_at = None
        assignment.ignored_at = None
        assignment.ignored_by_identifier = ""
        assignment.escalated_at = None
        assignment.escalated_by_identifier = ""
        entry["resolution_note"] = resolution_note
    else:
        raise ValueError("Unsupported launch remediation action.")

    if resolution_note and action not in {"ignore", "resolve"}:
        assignment.resolution_note = resolution_note
        entry["resolution_note"] = resolution_note
    history.append(entry)
    assignment.action_history = history[-25:]
    assignment.last_seen_at = now
    assignment.save()
    return _serialize_hrms_launch_remediation_assignment(assignment)


def process_hrms_saas_launch_remediation_sla(
    tenant,
    *,
    actor_identifier: str = "hrms.launch_remediation.sla_processor.v1",
    reminder_window_hours: int = 24,
    reminder_cooldown_hours: int = 24,
    escalation_owner_role_ref: str = "",
) -> dict:
    dashboard = get_hr_admin_dashboard_for_tenant(tenant)
    sync_hrms_saas_launch_remediation_assignments(tenant, dashboard["launch_audit"])
    now = timezone.now()
    reminder_window_end = now + timedelta(hours=max(int(reminder_window_hours), 1))
    reminder_cooldown_start = now - timedelta(hours=max(int(reminder_cooldown_hours), 1))
    reminded_count = 0
    escalated_count = 0

    reminder_queryset = HrmsLaunchRemediationAssignment.objects.filter(
        tenant=tenant,
        status=HrmsLaunchRemediationStatus.OPEN,
        due_at__gte=now,
        due_at__lte=reminder_window_end,
    ).filter(Q(reminder_sent_at__isnull=True) | Q(reminder_sent_at__lt=reminder_cooldown_start))
    for assignment in reminder_queryset:
        update_hrms_saas_launch_remediation_assignment(
            tenant,
            assignment.id,
            action="send_reminder",
            actor_identifier=actor_identifier,
            resolution_note="SLA reminder generated for launch remediation.",
        )
        reminded_count += 1

    escalation_queryset = HrmsLaunchRemediationAssignment.objects.filter(
        tenant=tenant,
        status=HrmsLaunchRemediationStatus.OPEN,
        due_at__lt=now,
        escalated_at__isnull=True,
    )
    for assignment in escalation_queryset:
        update_hrms_saas_launch_remediation_assignment(
            tenant,
            assignment.id,
            action="escalate",
            actor_identifier=actor_identifier,
            escalation_owner_role_ref=escalation_owner_role_ref or assignment.escalation_owner_role_ref or assignment.owner_role_ref,
            resolution_note="SLA escalation generated for overdue launch remediation.",
        )
        escalated_count += 1

    return {
        "tenant_code": tenant.code,
        "reminded_count": reminded_count,
        "escalated_count": escalated_count,
        "open_count": HrmsLaunchRemediationAssignment.objects.filter(tenant=tenant, status=HrmsLaunchRemediationStatus.OPEN).count(),
    }


def get_hr_admin_workforce_export(employee: Employee) -> list[dict]:
    """Builds workforce export rows for HR admin reporting."""

    rows = []
    queryset = (
        Employee.objects.filter(tenant=employee.tenant)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
            "membership",
            "membership__user",
        )
        .order_by("employee_code")
    )
    for item in queryset:
        rows.append(
            {
                "employee_code": item.employee_code,
                "full_name": _employee_display_name(item),
                "work_email": item.work_email,
                "phone_number": item.phone_number,
                "employment_status": item.employment_status,
                "date_of_joining": item.date_of_joining.isoformat() if item.date_of_joining else "",
                "legal_entity": item.legal_entity.name if item.legal_entity else "",
                "branch": item.branch.name if item.branch else "",
                "location": item.location.name if item.location else "",
                "department": item.department.name if item.department else "",
                "business_unit": item.business_unit.name if item.business_unit else "",
                "designation": item.designation.name if item.designation else "",
                "grade": item.grade.name if item.grade else "",
                "employment_type": item.employment_type.name if item.employment_type else "",
                "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else "",
                "has_access": "yes" if item.membership_id else "no",
                "membership_status": item.membership.status if item.membership else "",
                "username": item.membership.user.username if item.membership and item.membership.user else "",
            }
        )
    return rows


def get_hr_admin_pending_approvals_export(employee: Employee) -> list[dict]:
    """Builds a combined pending approvals export across leave and attendance."""

    rows = []
    tenant = employee.tenant
    leave_requests = (
        LeaveRequest.objects.filter(tenant=tenant, status=LeaveRequestStatus.PENDING)
        .select_related("employee", "employee__department", "employee__designation", "leave_type")
        .order_by("-created_at")
    )
    for item in leave_requests:
        rows.append(
            {
                "request_type": "leave",
                "request_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "request_label": item.leave_type.name,
                "start_date": item.start_date.isoformat(),
                "end_date": item.end_date.isoformat(),
                "requested_units": str(item.requested_units),
                "reason": item.reason,
                "submitted_at": item.created_at.isoformat(),
            }
        )

    regularizations = (
        AttendanceRegularization.objects.filter(tenant=tenant, status=RegularizationStatus.PENDING)
        .select_related("employee", "employee__department", "employee__designation", "attendance_record")
        .order_by("-created_at")
    )
    for item in regularizations:
        rows.append(
            {
                "request_type": "attendance_regularization",
                "request_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "request_label": item.requested_status,
                "start_date": item.attendance_record.attendance_date.isoformat() if item.attendance_record else "",
                "end_date": item.attendance_record.attendance_date.isoformat() if item.attendance_record else "",
                "requested_units": "",
                "reason": item.reason,
                "submitted_at": item.created_at.isoformat(),
            }
        )

    return rows


def get_hr_admin_document_compliance_export(employee: Employee) -> list[dict]:
    """Builds employee document compliance export rows."""

    rows = []
    queryset = (
        EmployeeDocument.objects.filter(tenant=employee.tenant)
        .select_related("employee", "employee__department", "category")
        .order_by("-created_at")
    )
    for item in queryset:
        rows.append(
            {
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "category": item.category.name,
                "title": item.title,
                "document_number": item.document_number,
                "status": item.status,
                "verification_status": item.verification_status,
                "issued_on": item.issued_on.isoformat() if item.issued_on else "",
                "expires_on": item.expires_on.isoformat() if item.expires_on else "",
                "verified_at": item.verified_at.isoformat() if item.verified_at else "",
                "rejection_reason": item.rejection_reason,
            }
        )
    return rows


def get_hr_admin_notification_queue_export(employee: Employee) -> list[dict]:
    """Builds notification queue export rows for delivery visibility."""

    rows = []
    queryset = (
        Notification.objects.filter(tenant=employee.tenant)
        .select_related("event_definition", "recipient_membership", "recipient_role")
        .order_by("-created_at")
    )
    for item in queryset:
        rows.append(
            {
                "notification_id": str(item.id),
                "event_definition": item.event_definition.name if item.event_definition else "",
                "channel": item.channel,
                "audience_type": item.audience_type,
                "subject_type": item.subject_type,
                "subject_identifier": item.subject_identifier,
                "recipient_identifier": item.recipient_identifier,
                "recipient_address": item.recipient_address,
                "status": item.status,
                "priority": item.priority,
                "scheduled_for": item.scheduled_for.isoformat() if item.scheduled_for else "",
                "sent_at": item.sent_at.isoformat() if item.sent_at else "",
                "delivered_at": item.delivered_at.isoformat() if item.delivered_at else "",
                "read_at": item.read_at.isoformat() if item.read_at else "",
                "title": item.title,
                "subject": item.subject,
            }
        )
    return rows


def get_hr_admin_lifecycle_queue_export(employee: Employee) -> list[dict]:
    """Builds lifecycle queue export rows across onboarding, probation, movement, and exits."""

    rows = []
    tenant = employee.tenant

    onboardings = (
        EmployeeOnboarding.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-created_at")
    )
    for item in onboardings:
        rows.append(
            {
                "item_type": "onboarding",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.expected_joining_date.isoformat() if item.expected_joining_date else "",
                "secondary_date": item.actual_joining_date.isoformat() if item.actual_joining_date else "",
                "owner_value": _lifecycle_owner_value_from_identifier(item.assigned_owner_identifier),
                "owner_label": item.assigned_owner_identifier,
                "workflow_reference": item.workflow_reference,
                "summary": item.notes,
                "created_at": item.created_at.isoformat(),
            }
        )

    probation_reviews = (
        ProbationReview.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-review_date", "-created_at")
    )
    for item in probation_reviews:
        rows.append(
            {
                "item_type": "probation",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.decision,
                "primary_date": item.review_date.isoformat(),
                "secondary_date": item.probation_end_date.isoformat() if item.probation_end_date else "",
                "owner_value": _lifecycle_owner_value_from_identifier(item.reviewer_identifier),
                "owner_label": item.reviewer_identifier,
                "workflow_reference": item.workflow_reference,
                "summary": item.remarks,
                "created_at": item.created_at.isoformat(),
            }
        )

    movements = (
        EmployeeMovement.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation", "to_manager__membership__user")
        .order_by("-effective_date", "-created_at")
    )
    for item in movements:
        rows.append(
            {
                "item_type": "movement",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.effective_date.isoformat(),
                "secondary_date": "",
                "owner_value": _lifecycle_owner_value_from_employee(item.to_manager),
                "owner_label": _employee_display_name(item.to_manager) if item.to_manager else "",
                "workflow_reference": item.workflow_reference,
                "summary": item.reason,
                "created_at": item.created_at.isoformat(),
            }
        )

    exits = (
        EmployeeExit.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-created_at")
    )
    for item in exits:
        rows.append(
            {
                "item_type": "exit",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.proposed_last_working_date.isoformat() if item.proposed_last_working_date else "",
                "secondary_date": item.actual_exit_date.isoformat() if item.actual_exit_date else "",
                "owner_value": "",
                "owner_label": "",
                "workflow_reference": item.workflow_reference,
                "summary": item.exit_reason_detail or item.handover_notes or item.exit_reason,
                "created_at": item.created_at.isoformat(),
            }
        )

    rows.sort(key=lambda item: item["created_at"], reverse=True)
    return rows


def get_employee_leave_requests(employee: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns employee leave request history for ESS screens."""

    queryset = (
        LeaveRequest.objects.filter(employee=employee)
        .select_related("leave_type", "leave_policy")
        .order_by("-created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": request.id,
            "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
            "leave_type": request.leave_type.name,
            "leave_type_code": request.leave_type.code,
            "policy_name": request.leave_policy.name if request.leave_policy else None,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "start_day_portion": request.start_day_portion,
            "end_day_portion": request.end_day_portion,
            "requested_units": request.requested_units,
            "approved_units": request.approved_units,
            "reason": request.reason,
            "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
            "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
            "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
            "manager_comment": request.manager_comment,
            "rejection_reason": request.rejection_reason,
            "workflow_reference": request.workflow_reference,
            "applied_at": request.applied_at,
            "approved_at": request.approved_at,
            "cancelled_at": request.cancelled_at,
            "can_withdraw": _get_leave_request_lifecycle_runtime(leave_request=request)["can_withdraw"],
            "withdraw_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_block_reason"],
            "withdraw_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_requires_attachment"],
            "withdraw_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_attachment_label"],
            "can_cancel": _get_leave_request_lifecycle_runtime(leave_request=request)["can_cancel"],
            "cancel_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_block_reason"],
            "cancel_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_requires_attachment"],
            "cancel_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_attachment_label"],
            "cancel_requires_reapproval": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approved_requires_reapproval"],
            "cancel_approval_route": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approval_route"],
            "created_at": request.created_at,
            "updated_at": request.updated_at,
        }
        for request in queryset
    ]


def get_employee_leave_request_detail(employee: Employee, request_id) -> dict | None:
    """Returns a single employee leave request detail payload."""

    request = (
        LeaveRequest.objects.filter(employee=employee, id=request_id)
        .select_related("leave_type", "leave_policy")
        .first()
    )
    if not request:
        return None
    lifecycle = _get_leave_request_lifecycle_runtime(leave_request=request)
    return {
        "id": request.id,
        "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
        "leave_type": request.leave_type.name,
        "leave_type_code": request.leave_type.code,
        "policy_name": request.leave_policy.name if request.leave_policy else None,
        "status": request.status,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "start_day_portion": request.start_day_portion,
        "end_day_portion": request.end_day_portion,
        "requested_units": request.requested_units,
        "approved_units": request.approved_units,
        "reason": request.reason,
        "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
        "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
        "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
        "manager_comment": request.manager_comment,
        "rejection_reason": request.rejection_reason,
        "workflow_reference": request.workflow_reference,
        "applied_at": request.applied_at,
        "approved_at": request.approved_at,
        "cancelled_at": request.cancelled_at,
        "can_withdraw": lifecycle["can_withdraw"],
        "withdraw_block_reason": lifecycle["withdraw_block_reason"],
        "withdraw_requires_attachment": lifecycle["withdraw_requires_attachment"],
        "withdraw_attachment_label": lifecycle["withdraw_attachment_label"],
        "can_cancel": lifecycle["can_cancel"],
        "cancel_block_reason": lifecycle["cancel_block_reason"],
        "cancel_requires_attachment": lifecycle["cancel_requires_attachment"],
        "cancel_attachment_label": lifecycle["cancel_attachment_label"],
        "cancel_requires_reapproval": lifecycle["cancel_approved_requires_reapproval"],
        "cancel_approval_route": lifecycle["cancel_approval_route"],
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }


def get_employee_attendance_regularizations(employee: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns employee regularization history for ESS screens."""

    queryset = (
        AttendanceRegularization.objects.filter(employee=employee)
        .select_related("attendance_record", "attendance_record__shift")
        .order_by("-created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": regularization.id,
            "attendance_record_id": regularization.attendance_record.id,
            "attendance_date": regularization.attendance_record.attendance_date,
            "current_status": regularization.attendance_record.status,
            "requested_status": regularization.requested_status,
            "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
            "requested_check_in_at": regularization.requested_check_in_at,
            "requested_check_out_at": regularization.requested_check_out_at,
            "actual_check_in_at": regularization.attendance_record.check_in_at,
            "actual_check_out_at": regularization.attendance_record.check_out_at,
            "status": regularization.status,
            "reason": regularization.reason,
            "manager_comment": regularization.manager_comment,
            "rejection_reason": regularization.rejection_reason,
            "workflow_reference": regularization.workflow_reference,
            "applied_at": regularization.applied_at,
            "resolved_at": regularization.resolved_at,
            "created_at": regularization.created_at,
            "updated_at": regularization.updated_at,
        }
        for regularization in queryset
    ]


def get_employee_attendance_regularization_detail(employee: Employee, regularization_id) -> dict | None:
    """Returns a single employee regularization detail payload."""

    regularization = (
        AttendanceRegularization.objects.filter(employee=employee, id=regularization_id)
        .select_related("attendance_record", "attendance_record__shift")
        .first()
    )
    if not regularization:
        return None
    return {
        "id": regularization.id,
        "attendance_record_id": regularization.attendance_record.id,
        "attendance_date": regularization.attendance_record.attendance_date,
        "current_status": regularization.attendance_record.status,
        "requested_status": regularization.requested_status,
        "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
        "requested_check_in_at": regularization.requested_check_in_at,
        "requested_check_out_at": regularization.requested_check_out_at,
        "actual_check_in_at": regularization.attendance_record.check_in_at,
        "actual_check_out_at": regularization.attendance_record.check_out_at,
        "status": regularization.status,
        "reason": regularization.reason,
        "manager_comment": regularization.manager_comment,
        "rejection_reason": regularization.rejection_reason,
        "workflow_reference": regularization.workflow_reference,
        "applied_at": regularization.applied_at,
        "resolved_at": regularization.resolved_at,
        "created_at": regularization.created_at,
        "updated_at": regularization.updated_at,
    }


def get_manager_pending_leave_requests(manager: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns workflow-assigned pending leave approvals for MSS inbox screens."""

    assigned_workflow_ids = _get_pending_workflow_instance_ids_for_actor(manager, subject_type="leave_request")
    queryset = (
        LeaveRequest.objects.filter(
            status=LeaveRequestStatus.PENDING,
        )
        .select_related("employee__department", "employee__designation", "leave_type", "leave_policy")
        .order_by("start_date", "created_at")
    )
    if assigned_workflow_ids:
        queryset = queryset.filter(workflow_reference__in=assigned_workflow_ids)
    else:
        queryset = queryset.filter(employee__reporting_manager=manager, workflow_reference="")
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": request.id,
            "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
            "employee_id": request.employee.id,
            "employee_code": request.employee.employee_code,
            "employee_name": _employee_display_name(request.employee),
            "department": request.employee.department.name if request.employee.department else None,
            "designation": request.employee.designation.name if request.employee.designation else None,
            "leave_type": request.leave_type.name,
            "leave_type_code": request.leave_type.code,
            "policy_name": request.leave_policy.name if request.leave_policy else None,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "start_day_portion": request.start_day_portion,
            "end_day_portion": request.end_day_portion,
            "requested_units": request.requested_units,
            "approved_units": request.approved_units,
            "reason": request.reason,
            "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
            "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
            "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
            "workflow_reference": request.workflow_reference,
            "applied_at": request.applied_at,
            "can_withdraw": _get_leave_request_lifecycle_runtime(leave_request=request)["can_withdraw"],
            "withdraw_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_block_reason"],
            "withdraw_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_requires_attachment"],
            "withdraw_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_attachment_label"],
            "can_cancel": _get_leave_request_lifecycle_runtime(leave_request=request)["can_cancel"],
            "cancel_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_block_reason"],
            "cancel_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_requires_attachment"],
            "cancel_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_attachment_label"],
            "cancel_requires_reapproval": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approved_requires_reapproval"],
            "cancel_approval_route": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approval_route"],
            "created_at": request.created_at,
        }
        for request in queryset
    ]


def get_manager_leave_request_detail(manager: Employee, request_id) -> dict | None:
    """Returns a workflow-assigned leave approval detail payload."""

    assigned_workflow_ids = set(_get_pending_workflow_instance_ids_for_actor(manager, subject_type="leave_request"))
    request = (
        LeaveRequest.objects.filter(
            id=request_id,
        )
        .select_related("employee__department", "employee__designation", "leave_type", "leave_policy")
        .first()
    )
    if not request:
        return None
    if request.workflow_reference:
        if request.workflow_reference not in assigned_workflow_ids:
            return None
    elif request.employee.reporting_manager_id != manager.id:
        return None
    lifecycle = _get_leave_request_lifecycle_runtime(leave_request=request)
    return {
        "id": request.id,
        "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
        "employee_id": request.employee.id,
        "employee_code": request.employee.employee_code,
        "employee_name": _employee_display_name(request.employee),
        "department": request.employee.department.name if request.employee.department else None,
        "designation": request.employee.designation.name if request.employee.designation else None,
        "leave_type": request.leave_type.name,
        "leave_type_code": request.leave_type.code,
        "policy_name": request.leave_policy.name if request.leave_policy else None,
        "status": request.status,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "start_day_portion": request.start_day_portion,
        "end_day_portion": request.end_day_portion,
        "requested_units": request.requested_units,
        "approved_units": request.approved_units,
        "reason": request.reason,
        "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
        "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
        "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
        "manager_comment": request.manager_comment,
        "rejection_reason": request.rejection_reason,
        "workflow_reference": request.workflow_reference,
        "applied_at": request.applied_at,
        "approved_at": request.approved_at,
        "cancelled_at": request.cancelled_at,
        "can_withdraw": lifecycle["can_withdraw"],
        "withdraw_block_reason": lifecycle["withdraw_block_reason"],
        "withdraw_requires_attachment": lifecycle["withdraw_requires_attachment"],
        "withdraw_attachment_label": lifecycle["withdraw_attachment_label"],
        "can_cancel": lifecycle["can_cancel"],
        "cancel_block_reason": lifecycle["cancel_block_reason"],
        "cancel_requires_attachment": lifecycle["cancel_requires_attachment"],
        "cancel_attachment_label": lifecycle["cancel_attachment_label"],
        "cancel_requires_reapproval": lifecycle["cancel_approved_requires_reapproval"],
        "cancel_approval_route": lifecycle["cancel_approval_route"],
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }


def get_manager_pending_attendance_regularizations(manager: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns manager-scoped pending regularization approvals for MSS inbox screens."""

    queryset = (
        AttendanceRegularization.objects.filter(
            employee__reporting_manager=manager,
            status=RegularizationStatus.PENDING,
        )
        .select_related(
            "employee__department",
            "employee__designation",
            "attendance_record",
            "attendance_record__shift",
        )
        .order_by("attendance_record__attendance_date", "created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": regularization.id,
            "employee_id": regularization.employee.id,
            "employee_code": regularization.employee.employee_code,
            "employee_name": _employee_display_name(regularization.employee),
            "department": regularization.employee.department.name if regularization.employee.department else None,
            "designation": regularization.employee.designation.name if regularization.employee.designation else None,
            "attendance_record_id": regularization.attendance_record.id,
            "attendance_date": regularization.attendance_record.attendance_date,
            "current_status": regularization.attendance_record.status,
            "requested_status": regularization.requested_status,
            "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
            "requested_check_in_at": regularization.requested_check_in_at,
            "requested_check_out_at": regularization.requested_check_out_at,
            "actual_check_in_at": regularization.attendance_record.check_in_at,
            "actual_check_out_at": regularization.attendance_record.check_out_at,
            "status": regularization.status,
            "reason": regularization.reason,
            "workflow_reference": regularization.workflow_reference,
            "applied_at": regularization.applied_at,
            "created_at": regularization.created_at,
        }
        for regularization in queryset
    ]


def get_manager_attendance_regularization_detail(manager: Employee, regularization_id) -> dict | None:
    """Returns a manager-scoped regularization approval detail payload."""

    regularization = (
        AttendanceRegularization.objects.filter(
            employee__reporting_manager=manager,
            id=regularization_id,
        )
        .select_related(
            "employee__department",
            "employee__designation",
            "attendance_record",
            "attendance_record__shift",
        )
        .first()
    )
    if not regularization:
        return None
    return {
        "id": regularization.id,
        "employee_id": regularization.employee.id,
        "employee_code": regularization.employee.employee_code,
        "employee_name": _employee_display_name(regularization.employee),
        "department": regularization.employee.department.name if regularization.employee.department else None,
        "designation": regularization.employee.designation.name if regularization.employee.designation else None,
        "attendance_record_id": regularization.attendance_record.id,
        "attendance_date": regularization.attendance_record.attendance_date,
        "current_status": regularization.attendance_record.status,
        "requested_status": regularization.requested_status,
        "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
        "requested_check_in_at": regularization.requested_check_in_at,
        "requested_check_out_at": regularization.requested_check_out_at,
        "actual_check_in_at": regularization.attendance_record.check_in_at,
        "actual_check_out_at": regularization.attendance_record.check_out_at,
        "status": regularization.status,
        "reason": regularization.reason,
        "manager_comment": regularization.manager_comment,
        "rejection_reason": regularization.rejection_reason,
        "workflow_reference": regularization.workflow_reference,
        "applied_at": regularization.applied_at,
        "resolved_at": regularization.resolved_at,
        "created_at": regularization.created_at,
        "updated_at": regularization.updated_at,
    }


def get_hr_admin_employee_list(employee: Employee) -> list[dict]:
    """Returns tenant-wide employee list for HR admin web surfaces."""

    queryset = (
        Employee.objects.filter(tenant=employee.tenant)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
            "membership",
        )
        .annotate(
            assigned_role_count=Count("membership__membership_roles", distinct=True),
            direct_reports_count=Count("direct_reports", distinct=True),
        )
        .order_by("employee_code")
    )

    return [
        {
            "id": item.id,
            "employee_code": item.employee_code,
            "full_name": _employee_display_name(item),
            "work_email": item.work_email,
            "phone_number": item.phone_number,
            "employment_status": item.employment_status,
            "date_of_joining": item.date_of_joining,
            "department": item.department.name if item.department else None,
            "business_unit": item.business_unit.name if item.business_unit else None,
            "legal_entity": item.legal_entity.name if item.legal_entity else None,
            "cost_center": item.cost_center.name if item.cost_center else None,
            "designation": item.designation.name if item.designation else None,
            "grade": item.grade.name if item.grade else None,
            "employment_type": item.employment_type.name if item.employment_type else None,
            "branch": item.branch.name if item.branch else None,
            "location": item.location.name if item.location else None,
            "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else None,
            "has_access": bool(item.membership_id),
            "membership_status": item.membership.status if item.membership else "",
            "assigned_role_count": item.assigned_role_count,
            "direct_reports_count": item.direct_reports_count,
        }
        for item in queryset
    ]


def get_hr_admin_payroll_readiness(
    employee: Employee,
    *,
    period_start: date,
    period_end: date,
    query: str = "",
    readiness_status: str = "all",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """Builds payroll source-data readiness from configurable tenant checks."""

    tenant = employee.tenant
    profile, profile_source = _resolve_payroll_readiness_profile(tenant)
    required_fields = [item for item in profile.get("employee_required_fields", []) if isinstance(item, dict)]
    bank_config = profile.get("bank_account") if isinstance(profile.get("bank_account"), dict) else {}
    pending_source_config = profile.get("pending_sources") if isinstance(profile.get("pending_sources"), dict) else {}
    included_statuses = set(profile.get("included_employment_statuses") or [])
    pending_leave_statuses = set(pending_source_config.get("leave_request_statuses") or [LeaveRequestStatus.PENDING])
    pending_regularization_statuses = set(pending_source_config.get("attendance_regularization_statuses") or [RegularizationStatus.PENDING])
    unknown_attendance_statuses = set(profile.get("attendance_unknown_statuses") or [AttendanceStatus.UNKNOWN])

    queryset = (
        Employee.objects.filter(tenant=tenant)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "cost_center",
            "designation",
            "grade",
            "employment_type",
            "exit_record",
        )
        .order_by("employee_code")
    )
    employee_ids = list(queryset.values_list("id", flat=True))

    leave_counts = {
        item["employee_id"]: item["count"]
        for item in LeaveRequest.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    pending_leave_counts = {
        item["employee_id"]: item["count"]
        for item in LeaveRequest.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            status__in=pending_leave_statuses,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    attendance_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRecord.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    unknown_attendance_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRecord.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
            status__in=unknown_attendance_statuses,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    regularization_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRegularization.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_record__attendance_date__gte=period_start,
            attendance_record__attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    pending_regularization_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRegularization.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            status__in=pending_regularization_statuses,
            attendance_record__attendance_date__gte=period_start,
            attendance_record__attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    document_counts = {
        item["employee_id"]: item["count"]
        for item in EmployeeDocument.objects.filter(tenant=tenant, employee_id__in=employee_ids)
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    lifecycle_counts = {
        item["employee_id"]: item["count"]
        for item in EmployeeMovement.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            effective_date__gte=period_start,
            effective_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    bank_account_employee_ids = set(
        EmployeeBankAccount.objects.filter(employee_id__in=employee_ids, is_primary=True).values_list("employee_id", flat=True)
    )

    period_days = (period_end - period_start).days + 1
    working_days = _count_weekdays(period_start, period_end)
    all_items = []
    for item in queryset:
        blockers: list[str] = []
        warnings: list[str] = []

        for field_config in required_fields:
            field_name = str(field_config.get("field") or "").strip()
            if not field_name:
                continue
            if _payroll_readiness_field_value(item, field_name):
                continue
            label = str(field_config.get("label") or field_name.replace("_", " ").title())
            if field_config.get("severity") == "warning":
                warnings.append(f"Missing {label.lower()}.")
            else:
                blockers.append(f"Missing {label.lower()}.")

        if bank_config.get("required") and item.id not in bank_account_employee_ids:
            label = str(bank_config.get("label") or "Primary bank account")
            if bank_config.get("severity") == "warning":
                warnings.append(f"Missing {label.lower()}.")
            else:
                blockers.append(f"Missing {label.lower()}.")

        if included_statuses and item.employment_status not in included_statuses:
            warnings.append("Employment status is outside the included payroll readiness profile.")
        if item.date_of_joining and item.date_of_joining > period_end:
            warnings.append("Joining date is after the selected period.")

        exit_record = getattr(item, "exit_record", None)
        exit_date = (
            exit_record.actual_exit_date
            or exit_record.approved_last_working_date
            or exit_record.proposed_last_working_date
            if exit_record
            else None
        )
        if exit_date and period_start <= exit_date <= period_end:
            warnings.append("Exit activity falls inside the selected period.")
        elif exit_date and exit_date < period_start:
            warnings.append("Exit date is before the selected period.")

        pending_leave_count = pending_leave_counts.get(item.id, 0)
        pending_regularization_count = pending_regularization_counts.get(item.id, 0)
        unknown_attendance_count = unknown_attendance_counts.get(item.id, 0)
        if pending_leave_count:
            warnings.append(f"{pending_leave_count} leave request(s) pending approval in period.")
        if pending_regularization_count:
            warnings.append(f"{pending_regularization_count} attendance regularization(s) pending approval in period.")
        if unknown_attendance_count:
            warnings.append(f"{unknown_attendance_count} attendance record(s) have unknown status in period.")

        status_value = "blocked" if blockers else "warning" if warnings else "ready"
        all_items.append(
            {
                "id": item.id,
                "employee_code": item.employee_code,
                "employee_name": _employee_display_name(item),
                "work_email": item.work_email,
                "readiness_status": status_value,
                "employment_status": item.employment_status,
                "date_of_joining": item.date_of_joining,
                "exit_date": exit_date,
                "legal_entity": item.legal_entity.name if item.legal_entity else None,
                "branch": item.branch.name if item.branch else None,
                "location": item.location.name if item.location else None,
                "department": item.department.name if item.department else None,
                "business_unit": item.business_unit.name if item.business_unit else None,
                "cost_center": item.cost_center.name if item.cost_center else None,
                "designation": item.designation.name if item.designation else None,
                "grade": item.grade.name if item.grade else None,
                "employment_type": item.employment_type.name if item.employment_type else None,
                "period_days": period_days,
                "working_days": working_days,
                "attendance_record_days": attendance_counts.get(item.id, 0),
                "pending_leave_requests": pending_leave_count,
                "pending_attendance_regularizations": pending_regularization_count,
                "unknown_attendance_records": unknown_attendance_count,
                "has_primary_bank_account": item.id in bank_account_employee_ids,
                "blockers": blockers,
                "warnings": warnings,
                "source_counts": {
                    "leave_requests": leave_counts.get(item.id, 0),
                    "attendance_records": attendance_counts.get(item.id, 0),
                    "attendance_regularizations": regularization_counts.get(item.id, 0),
                    "lifecycle_events": lifecycle_counts.get(item.id, 0) + (1 if exit_date and period_start <= exit_date <= period_end else 0),
                    "documents": document_counts.get(item.id, 0),
                    "bank_accounts": 1 if item.id in bank_account_employee_ids else 0,
                },
            }
        )

    normalized_query = (query or "").strip().lower()
    if normalized_query:
        all_items = [
            item
            for item in all_items
            if any(
                normalized_query in str(value or "").lower()
                for value in [
                    item["employee_code"],
                    item["employee_name"],
                    item["work_email"],
                    item["legal_entity"],
                    item["branch"],
                    item["location"],
                    item["department"],
                    item["business_unit"],
                    item["cost_center"],
                    item["designation"],
                    item["grade"],
                    item["employment_type"],
                    item["employment_status"],
                ]
            )
        ]

    status_counts = {
        "all": len(all_items),
        "ready": sum(1 for item in all_items if item["readiness_status"] == "ready"),
        "warning": sum(1 for item in all_items if item["readiness_status"] == "warning"),
        "blocked": sum(1 for item in all_items if item["readiness_status"] == "blocked"),
    }
    summary_items = list(all_items)
    if readiness_status and readiness_status != "all":
        all_items = [item for item in all_items if item["readiness_status"] == readiness_status]

    total_count = len(all_items)
    offset = (page - 1) * page_size
    items = all_items[offset : offset + page_size]
    summary = {
        "total_employees": status_counts["all"],
        "ready": status_counts["ready"],
        "warnings": status_counts["warning"],
        "blocked": status_counts["blocked"],
        "joiners": sum(
            1
            for item in summary_items
            if item["date_of_joining"] and period_start <= item["date_of_joining"] <= period_end
        ),
        "exits": sum(1 for item in summary_items if item["exit_date"] and period_start <= item["exit_date"] <= period_end),
        "pending_leave_requests": sum(item["pending_leave_requests"] for item in summary_items),
        "pending_attendance_regularizations": sum(item["pending_attendance_regularizations"] for item in summary_items),
        "missing_primary_bank_accounts": sum(1 for item in summary_items if not item["has_primary_bank_account"]),
    }

    return {
        "period": {
            "start": period_start,
            "end": period_end,
            "label": f"{period_start:%d %b %Y} - {period_end:%d %b %Y}",
            "days": period_days,
            "working_days": working_days,
        },
        "configuration": {
            "profile_key": profile.get("profile_key", PAYROLL_READINESS_CONFIG_KEY),
            "profile_name": profile.get("profile_name", "Source data readiness"),
            "version": profile.get("version", 1),
            "source": profile_source,
            "resolved_profile": profile,
        },
        "summary": summary,
        "items": items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
        "status_counts": status_counts,
    }


def get_hr_admin_employee_detail(employee: Employee, employee_id) -> dict | None:
    """Returns a single employee detail for HR admin web surfaces."""

    item = (
        Employee.objects.filter(tenant=employee.tenant, id=employee_id)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "cost_center",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
            "membership",
        )
        .annotate(
            assigned_role_count=Count("membership__membership_roles", distinct=True),
            direct_reports_count=Count("direct_reports", distinct=True),
        )
        .first()
    )
    if not item:
        return None

    return {
        "id": item.id,
        "employee_code": item.employee_code,
        "first_name": item.first_name,
        "middle_name": item.middle_name,
        "last_name": item.last_name,
        "full_name": _employee_display_name(item),
        "preferred_name": item.preferred_name,
        "work_email": item.work_email,
        "personal_email": item.personal_email,
        "phone_number": item.phone_number,
        "employment_status": item.employment_status,
        "date_of_birth": item.date_of_birth,
        "date_of_joining": item.date_of_joining,
        "probation_end_date": item.probation_end_date,
        "confirmation_date": item.confirmation_date,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "location_id": item.location_id,
        "location": item.location.name if item.location else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "business_unit_id": item.business_unit_id,
        "business_unit": item.business_unit.name if item.business_unit else None,
        "cost_center_id": item.cost_center_id,
        "cost_center": item.cost_center.name if item.cost_center else None,
        "designation_id": item.designation_id,
        "designation": item.designation.name if item.designation else None,
        "grade_id": item.grade_id,
        "grade": item.grade.name if item.grade else None,
        "employment_type_id": item.employment_type_id,
        "employment_type": item.employment_type.name if item.employment_type else None,
        "reporting_manager_id": item.reporting_manager_id,
        "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else None,
        "has_access": bool(item.membership_id),
        "membership_status": item.membership.status if item.membership else "",
        "assigned_role_count": item.assigned_role_count,
        "direct_reports_count": item.direct_reports_count,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_employee_form_options(employee: Employee) -> dict:
    """Returns tenant-scoped option lists for HR admin employee forms."""

    tenant = employee.tenant

    def build_options(queryset, *, extra_fields: tuple[str, ...] = ()):
        items = []
        for item in queryset:
            payload = {"id": item.id, "name": item.name}
            for field in extra_fields:
                payload[field] = getattr(item, field)
            items.append(payload)
        return items

    return {
        "employment_statuses": [{"value": value, "label": label} for value, label in Employee._meta.get_field("employment_status").choices],
        "legal_entities": build_options(LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "branches": build_options(
            Branch.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("legal_entity_id", "location_id"),
        ),
        "locations": build_options(Location.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "departments": build_options(
            Department.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("business_unit_id",),
        ),
        "business_units": build_options(BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "cost_centers": build_options(
            CostCenter.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("legal_entity_id",),
        ),
        "designations": build_options(
            Designation.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("grade_id",),
        ),
        "grades": build_options(Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "employment_types": build_options(EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "managers": [
            {
                "id": item.id,
                "name": _employee_display_name(item),
                "employee_code": item.employee_code,
            }
            for item in Employee.objects.filter(tenant=tenant).exclude(id=employee.id).order_by("employee_code")
        ],
    }


def get_hr_admin_employee_access_options(employee: Employee) -> dict:
    """Returns tenant-scoped access options for employee onboarding."""

    return {
        "membership_statuses": [{"value": value, "label": label} for value, label in MembershipStatus.choices],
        "roles": [
            {
                "id": role.id,
                "code": role.code,
                "name": role.name,
            }
            for role in Role.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")
        ],
    }


def get_hr_admin_employee_access_detail(employee: Employee, employee_id) -> dict | None:
    """Returns access and membership detail for an employee."""

    item = (
        Employee.objects.filter(tenant=employee.tenant, id=employee_id)
        .select_related("membership__user", "tenant")
        .prefetch_related("membership__membership_roles__role")
        .first()
    )
    if not item:
        return None

    membership = item.membership
    user = membership.user if membership else None
    membership_roles = list(membership.membership_roles.select_related("role").order_by("-is_primary", "role__name")) if membership else []

    return {
        "employee_id": item.id,
        "employee_code": item.employee_code,
        "employee_name": _employee_display_name(item),
        "has_access": bool(membership and user),
        "membership_id": membership.id if membership else None,
        "user_id": user.id if user else None,
        "username": user.username if user else "",
        "email": user.email if user else item.work_email,
        "first_name": user.first_name if user else item.first_name,
        "last_name": user.last_name if user else item.last_name,
        "display_name": user.display_name if user else _employee_display_name(item),
        "phone_number": user.phone_number if user else item.phone_number,
        "is_user_active": user.is_active if user else True,
        "must_change_password": user.must_change_password if user else True,
        "membership_status": membership.status if membership else MembershipStatus.ACTIVE,
        "is_default_membership": membership.is_default if membership else True,
        "role_ids": [membership_role.role_id for membership_role in membership_roles],
        "roles": [
            {
                "id": membership_role.role.id,
                "code": membership_role.role.code,
                "name": membership_role.role.name,
                "is_primary": membership_role.is_primary,
            }
            for membership_role in membership_roles
        ],
    }


def _organization_item_payload(item, *, extra: dict | None = None) -> dict:
    payload = {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "is_active": item.is_active,
    }
    if extra:
        payload.update(extra)
    return payload


def get_hr_admin_organization_form_options(employee: Employee) -> dict:
    """Returns tenant-scoped option lists for organization master forms."""

    tenant = employee.tenant

    def build_options(queryset):
        return [{"id": item.id, "name": item.name} for item in queryset]

    return {
        "legal_entities": build_options(LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "locations": build_options(Location.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "business_units": build_options(BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "departments": build_options(Department.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "grades": build_options(Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")),
    }


def get_hr_admin_organization_item_detail(employee: Employee, section: str, item_id) -> dict | None:
    """Returns detail payload for a single organization master item."""

    tenant = employee.tenant
    queryset_map = {
        "legal_entities": LegalEntity.objects.filter(tenant=tenant),
        "locations": Location.objects.filter(tenant=tenant),
        "branches": Branch.objects.filter(tenant=tenant).select_related("legal_entity", "location"),
        "business_units": BusinessUnit.objects.filter(tenant=tenant).select_related("parent"),
        "departments": Department.objects.filter(tenant=tenant).select_related("business_unit", "parent"),
        "cost_centers": CostCenter.objects.filter(tenant=tenant).select_related("legal_entity"),
        "grades": Grade.objects.filter(tenant=tenant),
        "designations": Designation.objects.filter(tenant=tenant).select_related("grade"),
        "employment_types": EmploymentType.objects.filter(tenant=tenant),
    }
    queryset = queryset_map.get(section)
    if queryset is None:
        return None
    item = queryset.filter(id=item_id).first()
    if not item:
        return None

    if section == "legal_entities":
        return _organization_item_payload(
            item,
            extra={
                "registered_name": item.registered_name,
                "country_code": item.country_code,
                "timezone": item.timezone,
                "primary_email": item.primary_email,
                "primary_phone": item.primary_phone,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, legal_entity=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, legal_entity=item).count(),
                "cost_centers_count": CostCenter.objects.filter(tenant=tenant, legal_entity=item).count(),
            },
        )
    if section == "locations":
        return _organization_item_payload(
            item,
            extra={
                "address_line_1": item.address_line_1,
                "address_line_2": item.address_line_2,
                "city": item.city,
                "state": item.state,
                "postal_code": item.postal_code,
                "country_code": item.country_code,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, location=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, location=item).count(),
            },
        )
    if section == "branches":
        return _organization_item_payload(
            item,
            extra={
                "legal_entity_id": item.legal_entity_id,
                "legal_entity": item.legal_entity.name,
                "location_id": item.location_id,
                "location": item.location.name if item.location else None,
                "branch_type": item.branch_type,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, branch=item).count(),
            },
        )
    if section == "business_units":
        return _organization_item_payload(
            item,
            extra={
                "parent_id": item.parent_id,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, business_unit=item).count(),
                "child_count": BusinessUnit.objects.filter(tenant=tenant, parent=item).count(),
                "departments_count": Department.objects.filter(tenant=tenant, business_unit=item).count(),
            },
        )
    if section == "departments":
        return _organization_item_payload(
            item,
            extra={
                "business_unit_id": item.business_unit_id,
                "business_unit": item.business_unit.name if item.business_unit else None,
                "parent_id": item.parent_id,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, department=item).count(),
                "child_count": Department.objects.filter(tenant=tenant, parent=item).count(),
            },
        )
    if section == "cost_centers":
        return _organization_item_payload(
            item,
            extra={
                "legal_entity_id": item.legal_entity_id,
                "legal_entity": item.legal_entity.name if item.legal_entity else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, cost_center=item).count(),
            },
        )
    if section == "grades":
        return _organization_item_payload(
            item,
            extra={
                "level": item.level,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, grade=item).count(),
                "designations_count": Designation.objects.filter(tenant=tenant, grade=item).count(),
            },
        )
    if section == "designations":
        return _organization_item_payload(
            item,
            extra={
                "grade_id": item.grade_id,
                "grade": item.grade.name if item.grade else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, designation=item).count(),
            },
        )
    if section == "employment_types":
        return _organization_item_payload(
            item,
            extra={
                "description": item.description,
                "is_payroll_eligible": item.is_payroll_eligible,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, employment_type=item).count(),
            },
        )
    return None


def get_hr_admin_organization_snapshot(employee: Employee) -> dict:
    """Returns tenant organization master data for HR admin web surfaces."""

    tenant = employee.tenant

    legal_entities = [
        _organization_item_payload(
            item,
            extra={
                "country_code": item.country_code,
                "timezone": item.timezone,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, legal_entity=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, legal_entity=item).count(),
                "cost_centers_count": CostCenter.objects.filter(tenant=tenant, legal_entity=item).count(),
            },
        )
        for item in LegalEntity.objects.filter(tenant=tenant).order_by("name")
    ]
    locations = [
        _organization_item_payload(
            item,
            extra={
                "city": item.city,
                "state": item.state,
                "country_code": item.country_code,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, location=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, location=item).count(),
            },
        )
        for item in Location.objects.filter(tenant=tenant).order_by("name")
    ]
    branches = [
        _organization_item_payload(
            item,
            extra={
                "legal_entity": item.legal_entity.name,
                "location": item.location.name if item.location else None,
                "branch_type": item.branch_type,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, branch=item).count(),
            },
        )
        for item in Branch.objects.filter(tenant=tenant).select_related("legal_entity", "location").order_by("name")
    ]
    business_units = [
        _organization_item_payload(
            item,
            extra={
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, business_unit=item).count(),
                "child_count": BusinessUnit.objects.filter(tenant=tenant, parent=item).count(),
                "departments_count": Department.objects.filter(tenant=tenant, business_unit=item).count(),
            },
        )
        for item in BusinessUnit.objects.filter(tenant=tenant).select_related("parent").order_by("name")
    ]
    departments = [
        _organization_item_payload(
            item,
            extra={
                "business_unit": item.business_unit.name if item.business_unit else None,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, department=item).count(),
                "child_count": Department.objects.filter(tenant=tenant, parent=item).count(),
            },
        )
        for item in Department.objects.filter(tenant=tenant).select_related("business_unit", "parent").order_by("name")
    ]
    cost_centers = [
        _organization_item_payload(
            item,
            extra={
                "legal_entity": item.legal_entity.name if item.legal_entity else None,
                "legal_entity_id": item.legal_entity_id,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, cost_center=item).count(),
            },
        )
        for item in CostCenter.objects.filter(tenant=tenant).select_related("legal_entity").order_by("name")
    ]
    grades = [
        _organization_item_payload(
            item,
            extra={
                "level": item.level,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, grade=item).count(),
                "designations_count": Designation.objects.filter(tenant=tenant, grade=item).count(),
            },
        )
        for item in Grade.objects.filter(tenant=tenant).order_by("name")
    ]
    designations = [
        _organization_item_payload(
            item,
            extra={
                "grade": item.grade.name if item.grade else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, designation=item).count(),
            },
        )
        for item in Designation.objects.filter(tenant=tenant).select_related("grade").order_by("name")
    ]
    employment_types = [
        _organization_item_payload(
            item,
            extra={
                "is_payroll_eligible": item.is_payroll_eligible,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, employment_type=item).count(),
            },
        )
        for item in EmploymentType.objects.filter(tenant=tenant).order_by("name")
    ]

    return {
        "summary": {
            "legal_entities_count": len(legal_entities),
            "locations_count": len(locations),
            "branches_count": len(branches),
            "business_units_count": len(business_units),
            "departments_count": len(departments),
            "cost_centers_count": len(cost_centers),
            "grades_count": len(grades),
            "designations_count": len(designations),
            "employment_types_count": len(employment_types),
        },
        "legal_entities": legal_entities,
        "locations": locations,
        "branches": branches,
        "business_units": business_units,
        "departments": departments,
        "cost_centers": cost_centers,
        "grades": grades,
        "designations": designations,
        "employment_types": employment_types,
    }
