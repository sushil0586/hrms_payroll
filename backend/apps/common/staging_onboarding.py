"""Exact-ID evidence and governed cleanup for staging onboarding QA runs."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.core.management.base import CommandError
from django.db import connection, transaction

from apps.attendance.models import AttendanceRecord
from apps.documents.models import EmployeeDocument
from apps.employees.models import Employee
from apps.iam.models import TenantMembership, User
from apps.leave_management.models import LeaveRequest
from apps.organizations.models import LegalEntity
from apps.payroll.models import PayrollRun
from apps.tenant_onboarding.models import TenantOnboardingEvent
from apps.tenants.models import SubscriptionPlan, Tenant
from apps.tenants.retention import authorized_synthetic_tenant_teardown


FROZEN_BATCH_1_IDS = {f"STG-E2E-010{number}" for number in range(1, 7)}
RUN_ID_PATTERN = re.compile(r"^stg1-[a-z0-9][a-z0-9-]{5,55}$")
DEFAULT_SYNTHETIC_DOMAINS = {"playwright.qa.invalid"}


@dataclass(frozen=True)
class RunResource:
    resource_type: str
    resource_id: UUID
    tenant_id: UUID | None
    ownership: str
    attributes: dict


@dataclass(frozen=True)
class RunManifest:
    run_id: str
    environment_fingerprint: str
    scenario_ids: frozenset[str]
    resources: tuple[RunResource, ...]
    events: tuple[dict, ...]

    def owned(self, resource_type: str) -> list[RunResource]:
        return [resource for resource in self.resources if resource.resource_type == resource_type and resource.ownership == "created"]


def load_run_manifest(path: Path, *, expected_run_id: str, expected_fingerprint: str) -> RunManifest:
    if not RUN_ID_PATTERN.fullmatch(expected_run_id):
        raise CommandError("run-id must use the approved stg1-<run> format.")
    if not path.is_file():
        raise CommandError("Ownership manifest does not exist.")
    events = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise CommandError(f"Ownership manifest is incomplete at line {line_number}.") from exc
        if event.get("schema_version") != 1 or event.get("run_id") != expected_run_id:
            raise CommandError("Ownership manifest schema or run identity mismatch.")
        deployment = event.get("deployment") or {}
        if deployment.get("environment_fingerprint") != expected_fingerprint:
            raise CommandError("Ownership manifest environment fingerprint mismatch.")
        events.append(event)
    if not events:
        raise CommandError("Ownership manifest is empty.")
    resources: dict[tuple[str, UUID], RunResource] = {}
    scenarios = set()
    for event in events:
        scenario_id = event.get("scenario_id")
        if scenario_id:
            if scenario_id not in FROZEN_BATCH_1_IDS:
                raise CommandError(f"Manifest contains non-frozen scenario {scenario_id}.")
            scenarios.add(scenario_id)
        raw = event.get("resource")
        if not raw:
            continue
        try:
            resource = RunResource(
                resource_type=str(raw["resource_type"]),
                resource_id=UUID(str(raw["resource_id"])),
                tenant_id=UUID(str(raw["tenant_id"])) if raw.get("tenant_id") else None,
                ownership=str(raw["ownership"]),
                attributes=dict(raw.get("attributes") or {}),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise CommandError("Manifest resource is missing an exact valid identifier.") from exc
        if resource.ownership not in {"created", "observed", "unowned"}:
            raise CommandError("Manifest resource has an invalid ownership classification.")
        key = (resource.resource_type, resource.resource_id)
        existing = resources.get(key)
        if existing and existing != resource:
            raise CommandError(f"Conflicting ownership registration for {key[0]}:{key[1]}.")
        resources[key] = resource
    return RunManifest(expected_run_id, expected_fingerprint, frozenset(scenarios), tuple(resources.values()), tuple(events))


def _single_owned(manifest: RunManifest, resource_type: str) -> RunResource:
    matches = manifest.owned(resource_type)
    if len(matches) != 1:
        raise CommandError(f"Manifest must contain exactly one owned {resource_type}; found {len(matches)}.")
    return matches[0]


def _approved_synthetic_domains() -> set[str]:
    configured = getattr(settings, "HRMS_STAGING_SYNTHETIC_EMAIL_DOMAINS", ())
    return {str(domain).strip().lower() for domain in configured if str(domain).strip()} or DEFAULT_SYNTHETIC_DOMAINS


def _assert_postgresql_read_only_role() -> str:
    if connection.vendor != "postgresql":
        raise CommandError("Staging evidence requires PostgreSQL.")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_user")
        current_user = cursor.fetchone()[0]
    required_role = getattr(settings, "HRMS_STAGING_EVIDENCE_DB_ROLE", "")
    if getattr(settings, "HRMS_ENVIRONMENT", "") == "staging" and not required_role:
        raise CommandError("HRMS_STAGING_EVIDENCE_DB_ROLE is required in staging.")
    if required_role and current_user != required_role:
        raise CommandError("Database connection is not using the approved evidence role.")
    return current_user


def _assert_staging_fingerprint(manifest: RunManifest) -> None:
    if getattr(settings, "HRMS_ENVIRONMENT", "") != "staging":
        return
    configured_fingerprint = getattr(settings, "HRMS_STAGING_ENVIRONMENT_FINGERPRINT", "")
    if not configured_fingerprint or configured_fingerprint != manifest.environment_fingerprint:
        raise CommandError("Staging evidence environment fingerprint is missing or mismatched.")


def collect_onboarding_evidence(manifest: RunManifest) -> dict:
    _assert_staging_fingerprint(manifest)
    tenant_resource = _single_owned(manifest, "tenant")
    with transaction.atomic():
        role = _assert_postgresql_read_only_role()
        with connection.cursor() as cursor:
            cursor.execute("SET TRANSACTION READ ONLY")
        tenant = Tenant.objects.filter(id=tenant_resource.resource_id).first()
        if tenant is None or tenant.code != tenant_resource.attributes.get("code"):
            raise CommandError("Exact tenant ID/code ownership check failed.")
        if not tenant.is_sandbox:
            raise CommandError("Owned tenant is not marked as sandbox.")
        if tenant.primary_email.rsplit("@", 1)[-1].lower() not in _approved_synthetic_domains():
            raise CommandError("Owned tenant recipient is not synthetic/approved.")
        admin_resources = manifest.owned("user")
        admin_ids = [resource.resource_id for resource in admin_resources]
        memberships = list(TenantMembership.objects.filter(tenant_id=tenant.id, user_id__in=admin_ids).values("id", "tenant_id", "user_id", "status"))
        if admin_ids and len(memberships) != len(admin_ids):
            raise CommandError("Administrator membership relationship is missing or ambiguous.")
        if TenantMembership.objects.filter(user_id__in=admin_ids).exclude(tenant_id=tenant.id).exists():
            raise CommandError("Generated administrator has a cross-tenant membership.")
        denied_codes = [resource.attributes.get("code") for resource in manifest.resources if resource.resource_type == "denied_tenant"]
        denied_codes = [code for code in denied_codes if code]
        if denied_codes and Tenant.objects.filter(code__in=denied_codes).exists():
            raise CommandError("A rejected tenant operation produced persistent state.")
        event_types = list(TenantOnboardingEvent.objects.filter(onboarding__tenant_id=tenant.id).values_list("event_type", flat=True))
        return {
            "schema_version": 1,
            "run_id": manifest.run_id,
            "environment_fingerprint": manifest.environment_fingerprint,
            "database_role": role,
            "scenario_ids": sorted(manifest.scenario_ids),
            "tenant": {
                "id": str(tenant.id),
                "code": tenant.code,
                "status": tenant.status,
                "subscription_plan": tenant.subscription_plan,
                "sandbox": tenant.is_sandbox,
                "domain_count": tenant.domains.count(),
            },
            "relationships": {"generated_admin_count": len(admin_ids), "membership_count": len(memberships)},
            "assertions": {
                "enterprise_entitlement": tenant.subscription_plan == SubscriptionPlan.ENTERPRISE,
                "tenant_created_audit": "tenant_created" in event_types,
                "tenant_updated_audit": "tenant_updated" in event_types,
                "first_admin_audit": "first_admin_provisioned" in event_types,
                "negative_tenant_absent": True,
                "cross_tenant_membership_absent": True,
            },
        }


def plan_onboarding_cleanup(manifest: RunManifest) -> dict:
    tenant_resource = _single_owned(manifest, "tenant")
    tenant = Tenant.objects.filter(id=tenant_resource.resource_id).first()
    if tenant is None:
        return {"run_id": manifest.run_id, "dry_run": True, "verified_absent": True, "actions": []}
    if tenant.code != tenant_resource.attributes.get("code") or not tenant.is_sandbox:
        raise CommandError("Tenant exact-ID ownership check failed.")
    expected_email = str(tenant_resource.attributes.get("primary_email") or "").lower()
    if not expected_email or tenant.primary_email.lower() != expected_email:
        raise CommandError("Tenant email ownership marker mismatch.")
    if expected_email.rsplit("@", 1)[-1] not in _approved_synthetic_domains():
        raise CommandError("Tenant ownership email is outside approved synthetic domains.")
    owned_membership_ids = {resource.resource_id for resource in manifest.owned("membership")}
    owned_employee_ids = set(
        Employee.objects.filter(tenant_id=tenant.id, membership_id__in=owned_membership_ids).values_list("id", flat=True)
    )
    unowned_employee_count = Employee.objects.filter(tenant_id=tenant.id).exclude(id__in=owned_employee_ids).count()
    protected = {
        "unowned_employees": unowned_employee_count,
        "legal_entities": LegalEntity.objects.filter(tenant_id=tenant.id).count(),
        "payroll_runs": PayrollRun.objects.filter(tenant_id=tenant.id).count(),
        "leave_requests": LeaveRequest.objects.filter(tenant_id=tenant.id).count(),
        "attendance_records": AttendanceRecord.objects.filter(tenant_id=tenant.id).count(),
        "employee_documents": EmployeeDocument.objects.filter(tenant_id=tenant.id).count(),
    }
    if any(protected.values()):
        raise CommandError(f"Cleanup refused because protected downstream records exist: {protected}")
    owned_user_ids = {resource.resource_id for resource in manifest.owned("user")}
    actual_user_ids = set(tenant.memberships.values_list("user_id", flat=True))
    if actual_user_ids - owned_user_ids:
        raise CommandError("Cleanup refused because tenant contains an unowned user membership.")
    if TenantMembership.objects.filter(user_id__in=owned_user_ids).exclude(tenant_id=tenant.id).exists():
        raise CommandError("Cleanup refused because an owned user has a foreign tenant membership.")
    return {
        "run_id": manifest.run_id,
        "dry_run": True,
        "verified_absent": False,
        "tenant_id": str(tenant.id),
        "actions": [
            {"action": "delete_tenant_graph", "resource_type": "tenant", "resource_id": str(tenant.id)},
            *[
                {"action": "delete_owned_admin_employee", "resource_type": "employee", "resource_id": str(employee_id)}
                for employee_id in sorted(owned_employee_ids, key=str)
            ],
            *[{"action": "delete_generated_user", "resource_type": "user", "resource_id": str(user_id)} for user_id in sorted(owned_user_ids, key=str)],
        ],
        "protected_counts": protected,
    }


def execute_onboarding_cleanup(manifest: RunManifest, *, actor_username: str, authorization_ref: str, recovery_ref: str) -> dict:
    if getattr(settings, "HRMS_ENVIRONMENT", "") != "staging":
        raise PermissionDenied("Synthetic cleanup is restricted to the staging environment.")
    configured_fingerprint = getattr(settings, "HRMS_STAGING_ENVIRONMENT_FINGERPRINT", "")
    if not configured_fingerprint or configured_fingerprint != manifest.environment_fingerprint:
        raise PermissionDenied("Synthetic cleanup environment fingerprint is not deployment-approved.")
    if not getattr(settings, "HRMS_STAGING_SYNTHETIC_CLEANUP_ENABLED", False):
        raise PermissionDenied("Synthetic staging cleanup is deployment-disabled.")
    actor = User.objects.filter(username=actor_username, is_active=True, is_superuser=True).first()
    if actor is None:
        raise PermissionDenied("Cleanup actor is not an active platform administrator.")
    if not authorization_ref.strip() or not recovery_ref.strip():
        raise PermissionDenied("Cleanup authorization and recovery references are required.")
    tenant_resource = _single_owned(manifest, "tenant")
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(hashtext(%s))", [manifest.run_id])
            if not cursor.fetchone()[0]:
                raise CommandError("Another cleanup attempt owns this run lock.")
        plan = plan_onboarding_cleanup(manifest)
        if plan.get("verified_absent"):
            return {**plan, "dry_run": False, "authorization_ref": authorization_ref, "recovery_ref": recovery_ref}
        tenant = Tenant.objects.select_for_update().get(id=tenant_resource.resource_id)
        owned_user_ids = [resource.resource_id for resource in manifest.owned("user")]
        with authorized_synthetic_tenant_teardown(tenant, expected_owner_email=tenant.primary_email):
            tenant.delete()
        User.objects.filter(id__in=owned_user_ids, tenant_memberships__isnull=True).delete()
        if Tenant.objects.filter(id=tenant_resource.resource_id).exists():
            raise CommandError("Tenant remained after cleanup.")
        return {
            **plan,
            "dry_run": False,
            "verified_absent": True,
            "authorization_ref": authorization_ref,
            "recovery_ref": recovery_ref,
            "actor_id": str(actor.id),
        }
