"""Platform-side tenant onboarding API views."""

from __future__ import annotations

from datetime import date, time
from decimal import Decimal

from django.apps import apps
from django.db import transaction
from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import exceptions, permissions, response, status
from rest_framework.views import APIView

from apps.common.tenant_launch.preview import build_launch_preview
from apps.common.tenant_launch.registry import get_blueprint, list_blueprints, serialize_blueprint
from apps.common.tenant_launch.seeders import (
    DESIGNATION_DEFINITIONS,
    DOCUMENT_CATEGORY_DEFINITIONS,
    EMPLOYMENT_TYPE_DEFINITIONS,
    FIXED_IN_HOLIDAYS,
    GRADE_DEFINITIONS,
    LEAVE_TYPE_DEFINITIONS,
    REGIONAL_FIXED_HOLIDAYS,
    SAFE_APPLY_MODULES,
    SEEDER_BY_MODULE,
    WORKFLOW_TEMPLATE_DEFINITIONS,
)
from apps.iam.models import MembershipStatus, PermissionCatalogEntry
from apps.iam.permission_catalog import get_permission_catalog
from apps.tenant_onboarding.api_serializers import (
    PlatformLaunchBlueprintSerializer,
    PlatformMutationResultSerializer,
    PlatformOnboardingAdminContactSerializer,
    PlatformOnboardingAdminContactWriteSerializer,
    PlatformPermissionCatalogItemSerializer,
    PlatformPermissionCatalogUpdateSerializer,
    PlatformProvisionAdminResultSerializer,
    PlatformProvisionAdminSerializer,
    PlatformTenantListItemSerializer,
    PlatformTenantLaunchApplyRequestSerializer,
    PlatformTenantLaunchDriftRequestSerializer,
    PlatformTenantLaunchHandoffRequestSerializer,
    PlatformTenantLaunchPreviewRequestSerializer,
    PlatformTenantLaunchRepairRequestSerializer,
    PlatformTenantLaunchUpgradeRequestSerializer,
    PlatformTenantLaunchPreviewSerializer,
    PlatformTenantLaunchRunSerializer,
    PlatformTenantOnboardingSerializer,
    PlatformTenantOnboardingWriteSerializer,
    PlatformTenantWriteSerializer,
    PublicTenantLeadConvertSerializer,
    PublicTenantLeadCreateSerializer,
    PublicTenantLeadSerializer,
    PublicTenantLeadUpdateSerializer,
)
from apps.tenant_onboarding.models import (
    AdminProvisioningStatus,
    ChecklistStatus,
    LaunchReadinessStatus,
    PublicLeadStatus,
    PublicTenantLead,
    TenantLaunchRun,
    TenantLaunchRunStatus,
    TenantLaunchRunType,
    TenantLaunchItemAction,
    TenantLaunchItemStatus,
    TenantLaunchSeededItem,
    TenantOnboarding,
    TenantOnboardingChecklistItem,
    TenantOnboardingAdminContact,
)
from apps.tenant_onboarding.services import (
    add_onboarding_event,
    provision_tenant_admin_contact,
    set_checklist_item_status,
)
from apps.platform_policies.models import PlatformPolicyPack, PlatformPolicyPackStatus
from apps.tenants.models import Tenant, TenantDomain, TenantOnboardingStatus, TenantStatus


class IsPlatformStaff(permissions.BasePermission):
    message = "Platform admin access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_superuser)


def _actor_identifier(request) -> str:
    return request.user.username or request.user.email or str(request.user.id)


def _serialize_tenant(item: Tenant) -> dict:
    primary_domain = item.domains.filter(is_primary=True).values_list("domain", flat=True).first() or ""
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "legal_name": item.legal_name,
        "status": item.status,
        "onboarding_status": item.onboarding_status,
        "subscription_plan": item.subscription_plan,
        "seed_pack": item.seed_pack,
        "primary_email": item.primary_email,
        "primary_phone": item.primary_phone,
        "timezone": item.timezone,
        "country_code": item.country_code,
        "is_sandbox": item.is_sandbox,
        "go_live_at": item.go_live_at,
        "primary_domain": primary_domain,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _serialize_onboarding(item: TenantOnboarding) -> dict:
    contacts = item.admin_contacts.select_related("user", "membership").order_by("-is_primary", "full_name")
    checklist_items = item.checklist_items.order_by("sort_order", "label")
    recent_events = item.events.order_by("-created_at")[:10]
    return {
        "id": item.id,
        "tenant_id": item.tenant_id,
        "tenant_code": item.tenant.code,
        "tenant_name": item.tenant.name,
        "tenant_status": item.tenant.status,
        "tenant_onboarding_status": item.tenant.onboarding_status,
        "owner_mode": item.owner_mode,
        "setup_style": item.setup_style,
        "data_setup_style": item.data_setup_style,
        "policy_control_style": item.policy_control_style,
        "launch_blueprint_ref": item.launch_blueprint_ref,
        "launch_blueprint_version": item.launch_blueprint_version,
        "launch_readiness_status": item.launch_readiness_status,
        "launch_subscription_plan_snapshot": item.launch_subscription_plan_snapshot,
        "launch_preview_payload": item.launch_preview_payload,
        "launch_selected_at": item.launch_selected_at,
        "launch_applied_at": item.launch_applied_at,
        "launch_verified_at": item.launch_verified_at,
        "launch_status_notes": item.launch_status_notes,
        "country_context": item.country_context,
        "industry_context": item.industry_context,
        "notes": item.notes,
        "internal_handoff_notes": item.internal_handoff_notes,
        "customer_handoff_notes": item.customer_handoff_notes,
        "first_login_verified_at": item.first_login_verified_at,
        "baseline_published_at": item.baseline_published_at,
        "handoff_completed_at": item.handoff_completed_at,
        "admin_contacts": [
            {
                "id": contact.id,
                "full_name": contact.full_name,
                "email": contact.email,
                "phone_number": contact.phone_number,
                "job_title": contact.job_title,
                "is_primary": contact.is_primary,
                "provisioning_status": contact.provisioning_status,
                "user_id": contact.user_id,
                "user_is_active": contact.user.is_active if contact.user_id and contact.user else None,
                "membership_id": contact.membership_id,
                "membership_status": contact.membership.status if contact.membership_id and contact.membership else "",
                "invited_at": contact.invited_at,
                "first_login_at": contact.first_login_at,
                "notes": contact.notes,
                "created_at": contact.created_at,
                "updated_at": contact.updated_at,
            }
            for contact in contacts
        ],
        "checklist_items": [
            {
                "id": checklist_item.id,
                "code": checklist_item.code,
                "label": checklist_item.label,
                "status": checklist_item.status,
                "completed_at": checklist_item.completed_at,
                "completed_by_identifier": checklist_item.completed_by_identifier,
                "notes": checklist_item.notes,
                "sort_order": checklist_item.sort_order,
            }
            for checklist_item in checklist_items
        ],
        "recent_events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "summary": event.summary,
                "payload": event.payload,
                "actor_identifier": event.actor_identifier,
                "created_at": event.created_at,
            }
            for event in recent_events
        ],
    }


def _get_tenant_or_404(item_id):
    try:
        return Tenant.objects.prefetch_related("domains").get(id=item_id)
    except Tenant.DoesNotExist as exc:
        raise exceptions.NotFound("Tenant not found.") from exc


def _get_contact_or_404(contact_id):
    try:
        return TenantOnboardingAdminContact.objects.select_related("onboarding__tenant").get(id=contact_id)
    except TenantOnboardingAdminContact.DoesNotExist as exc:
        raise exceptions.NotFound("Admin contact not found.") from exc


def _serialize_admin_contact(contact: TenantOnboardingAdminContact) -> dict:
    return {
        "id": contact.id,
        "full_name": contact.full_name,
        "email": contact.email,
        "phone_number": contact.phone_number,
        "job_title": contact.job_title,
        "is_primary": contact.is_primary,
        "provisioning_status": contact.provisioning_status,
        "user_id": contact.user_id,
        "user_is_active": contact.user.is_active if contact.user_id and contact.user else None,
        "membership_id": contact.membership_id,
        "membership_status": contact.membership.status if contact.membership_id and contact.membership else "",
        "invited_at": contact.invited_at,
        "first_login_at": contact.first_login_at,
        "notes": contact.notes,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
    }


def _client_ip(request) -> str:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _serialize_public_lead(item: PublicTenantLead) -> dict:
    return {
        "id": item.id,
        "intent": item.intent,
        "status": item.status,
        "company_name": item.company_name,
        "contact_name": item.contact_name,
        "work_email": item.work_email,
        "phone_number": item.phone_number,
        "employee_count": item.employee_count,
        "industry": item.industry,
        "country_code": item.country_code,
        "preferred_plan": item.preferred_plan,
        "message": item.message,
        "source_path": item.source_path,
        "reviewed_by_identifier": item.reviewed_by_identifier,
        "reviewed_at": item.reviewed_at,
        "converted_tenant_id": item.converted_tenant_id,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _serialize_launch_run(item: TenantLaunchRun) -> dict:
    return {
        "id": item.id,
        "tenant_id": item.tenant_id,
        "blueprint_ref": item.blueprint_ref,
        "blueprint_version": item.blueprint_version,
        "subscription_plan": item.subscription_plan,
        "run_type": item.run_type,
        "status": item.status,
        "requested_by_identifier": item.requested_by_identifier,
        "idempotency_key": item.idempotency_key,
        "started_at": item.started_at,
        "finished_at": item.finished_at,
        "input_payload": item.input_payload,
        "plan_snapshot": item.plan_snapshot,
        "result_payload": item.result_payload,
        "errors": item.errors,
        "evidence": item.evidence,
        "seeded_items": [_serialize_launch_seeded_item(seeded_item) for seeded_item in item.seeded_items.all()],
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _serialize_launch_seeded_item(item: TenantLaunchSeededItem) -> dict:
    return {
        "id": item.id,
        "item_key": item.item_key,
        "item_kind": item.item_kind,
        "module_ref": item.module_ref,
        "action": item.action,
        "status": item.status,
        "ownership_mode": item.ownership_mode,
        "object_ref": item.object_ref,
        "checksum_sha256": item.checksum_sha256,
        "message": item.message,
        "payload": item.payload,
        "evidence": item.evidence,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _create_preview_seeded_items(*, run: TenantLaunchRun, preview_payload: dict) -> None:
    evidence = {
        "source": "platform_launch_preview",
        "launch_run_id": str(run.id),
        "governance_summary": preview_payload.get("governance_summary", {}),
    }
    items = []
    for module in preview_payload.get("planned_modules", []):
        has_missing_inputs = bool(module.get("missing_inputs"))
        items.append(
            TenantLaunchSeededItem(
                launch_run=run,
                tenant=run.tenant,
                item_key=module["ref"],
                item_kind="launch_module",
                module_ref=module["ref"],
                action=TenantLaunchItemAction.BLOCK if has_missing_inputs else TenantLaunchItemAction.PLAN,
                status=TenantLaunchItemStatus.BLOCKED if has_missing_inputs else TenantLaunchItemStatus.PLANNED,
                ownership_mode=module.get("ownership_mode", ""),
                message=module.get("action_needed", ""),
                payload=module,
                evidence=evidence,
            )
        )
    for module in preview_payload.get("skipped_modules", []):
        items.append(
            TenantLaunchSeededItem(
                launch_run=run,
                tenant=run.tenant,
                item_key=module["ref"],
                item_kind="launch_module",
                module_ref=module["ref"],
                action=TenantLaunchItemAction.SKIP,
                status=TenantLaunchItemStatus.SKIPPED,
                ownership_mode=module.get("ownership_mode", ""),
                message=module.get("skip_reason", module.get("action_needed", "")),
                payload=module,
                evidence=evidence,
            )
        )
    if items:
        TenantLaunchSeededItem.objects.bulk_create(items)


def _latest_apply_ready_preview(tenant: Tenant) -> TenantLaunchRun | None:
    previews = (
        TenantLaunchRun.objects.filter(
            tenant=tenant,
            run_type=TenantLaunchRunType.PREVIEW,
            status=TenantLaunchRunStatus.SUCCEEDED,
        )
        .order_by("-created_at")
    )
    for preview in previews:
        if preview.plan_snapshot.get("can_apply") is True:
            return preview
    return None


def _module_payloads_by_ref(preview_payload: dict) -> dict[str, dict]:
    payloads = {}
    for module in preview_payload.get("planned_modules", []):
        payloads[module["ref"]] = module
    for module in preview_payload.get("skipped_modules", []):
        payloads[module["ref"]] = module
    return payloads


def _latest_successful_apply_run(tenant: Tenant) -> TenantLaunchRun | None:
    return (
        TenantLaunchRun.objects.filter(
            tenant=tenant,
            run_type=TenantLaunchRunType.APPLY,
            status=TenantLaunchRunStatus.SUCCEEDED,
        )
        .order_by("-created_at")
        .first()
    )


def _latest_successful_baseline_run(tenant: Tenant) -> TenantLaunchRun | None:
    runs = (
        TenantLaunchRun.objects.filter(
            tenant=tenant,
            run_type__in=[TenantLaunchRunType.APPLY, TenantLaunchRunType.UPGRADE],
            status=TenantLaunchRunStatus.SUCCEEDED,
        )
        .order_by("-created_at")
    )
    for run in runs:
        if run.run_type == TenantLaunchRunType.APPLY or run.result_payload.get("mode") == "apply":
            return run
    return None


def _latest_launch_run(
    *,
    tenant: Tenant,
    run_type: str,
    mode: str | None = None,
    status_value: str = TenantLaunchRunStatus.SUCCEEDED,
) -> TenantLaunchRun | None:
    runs = TenantLaunchRun.objects.filter(
        tenant=tenant,
        run_type=run_type,
        status=status_value,
    ).order_by("-created_at")
    for run in runs:
        if mode is None or run.result_payload.get("mode") == mode:
            return run
    return None


def _version_sort_key(version: str) -> tuple[int, str]:
    digits = "".join(character for character in version if character.isdigit())
    return (int(digits) if digits else 0, version)


def _module_governance_evidence(module_payload: dict) -> dict:
    return {
        "post_onboarding_owner": module_payload.get("post_onboarding_owner", ""),
        "editable_by_roles": module_payload.get("editable_by_roles", []),
        "customer_editable_after_handoff": module_payload.get("customer_editable_after_handoff", False),
        "post_apply_action": module_payload.get("post_apply_action", ""),
    }


def _model_has_tenant_code(app_label: str, model_name: str, tenant: Tenant, code: str) -> bool:
    model = apps.get_model(app_label, model_name)
    return model.objects.filter(tenant=tenant, code=code).exists()


def _launch_ref_exists(*, tenant: Tenant, onboarding: TenantOnboarding, input_payload: dict, module_ref: str, ref: str) -> tuple[bool, bool]:
    if module_ref == "roles_users" and ":" not in ref:
        return apps.get_model("iam", "Role").objects.filter(tenant=tenant, code=ref).exists(), True
    if module_ref == "launch_checklist" and ":" not in ref:
        return (
            TenantOnboardingChecklistItem.objects.filter(onboarding=onboarding, code=ref).exists(),
            True,
        )
    if module_ref == "notifications" and ":" not in ref:
        template_exists = apps.get_model("notifications", "NotificationTemplate").objects.filter(
            tenant=tenant,
            code=ref,
        ).exists()
        return template_exists, True
    if ":" not in ref:
        return False, False

    prefix, value = ref.split(":", 1)
    simple_code_models = {
        "legal_entity": ("organizations", "LegalEntity"),
        "location": ("organizations", "Location"),
        "branch": ("organizations", "Branch"),
        "business_unit": ("organizations", "BusinessUnit"),
        "department": ("organizations", "Department"),
        "cost_center": ("organizations", "CostCenter"),
        "grade": ("organizations", "Grade"),
        "designation": ("organizations", "Designation"),
        "employment_type": ("organizations", "EmploymentType"),
        "leave_type": ("leave_management", "LeaveType"),
        "leave_policy": ("leave_management", "LeavePolicy"),
        "shift": ("attendance", "Shift"),
        "attendance_policy": ("attendance", "AttendancePolicy"),
        "document_category": ("documents", "DocumentCategory"),
        "workflow_template": ("workflows", "WorkflowTemplate"),
        "payroll_calendar": ("payroll", "PayrollCalendar"),
        "pay_group": ("payroll", "PayGroup"),
        "salary_component": ("payroll", "SalaryComponent"),
        "salary_structure": ("payroll", "SalaryStructure"),
        "statutory_pack": ("payroll", "PayrollStatutoryPack"),
        "statutory_component": ("payroll", "PayrollStatutoryComponent"),
    }
    if prefix in simple_code_models:
        app_label, model_name = simple_code_models[prefix]
        return _model_has_tenant_code(app_label, model_name, tenant, value), True

    related_lookups = {
        "leave_assignment": ("leave_management", "LeavePolicyAssignment", {"leave_policy__code": value}),
        "attendance_assignment": ("attendance", "AttendancePolicyAssignment", {"attendance_policy__code": value}),
        "document_rule": ("documents", "DocumentRequirementRule", {"category__code": value}),
        "workflow_assignment": ("workflows", "WorkflowTemplateAssignment", {"template__code": value}),
        "salary_structure_component": ("payroll", "SalaryStructureComponent", {"component__code": value}),
    }
    if prefix in related_lookups:
        app_label, model_name, lookup = related_lookups[prefix]
        model = apps.get_model(app_label, model_name)
        return model.objects.filter(tenant=tenant, **lookup).exists(), True

    if prefix == "workflow_step":
        parts = value.split(":")
        if len(parts) != 2 or not parts[1].isdigit():
            return False, False
        model = apps.get_model("workflows", "WorkflowStep")
        return model.objects.filter(template__tenant=tenant, template__code=parts[0], step_order=int(parts[1])).exists(), True

    if prefix == "salary_structure_version":
        parts = value.split(":")
        if len(parts) != 2:
            return False, False
        version_text = parts[1].removeprefix("v")
        if not version_text.isdigit():
            return False, False
        model = apps.get_model("payroll", "SalaryStructureVersion")
        return model.objects.filter(tenant=tenant, structure__code=parts[0], version=int(version_text)).exists(), True

    if prefix == "holiday_calendar":
        region = str(input_payload.get("holiday_region") or "IN").lower()
        if not value.isdigit():
            return False, False
        model = apps.get_model("attendance", "HolidayCalendar")
        return model.objects.filter(tenant=tenant, code=f"in-{region}-holidays", year=int(value)).exists(), True

    return False, False


def _launch_repair_plan(*, tenant: Tenant, onboarding: TenantOnboarding, apply_run: TenantLaunchRun) -> dict:
    module_payloads = _module_payloads_by_ref(apply_run.plan_snapshot)
    modules = []
    repairable_modules = []
    total_missing = 0
    total_unchecked = 0
    item_by_module = {item.module_ref or item.item_key: item for item in apply_run.seeded_items.all()}
    for module_ref, module_payload in sorted(module_payloads.items()):
        item = item_by_module.get(module_ref)
        result = item.payload.get("result", {}) if item and isinstance(item.payload, dict) else {}
        baseline_refs = []
        if isinstance(result, dict):
            baseline_refs = [
                ref
                for ref in [*(result.get("created") or []), *(result.get("existing") or [])]
                if isinstance(ref, str)
            ]
        present_refs = []
        missing_refs = []
        unchecked_refs = []
        for ref in sorted(dict.fromkeys(baseline_refs)):
            exists, checked = _launch_ref_exists(
                tenant=tenant,
                onboarding=onboarding,
                input_payload=apply_run.input_payload,
                module_ref=module_ref,
                ref=ref,
            )
            if not checked:
                unchecked_refs.append(ref)
            elif exists:
                present_refs.append(ref)
            else:
                missing_refs.append(ref)
        if missing_refs:
            repairable_modules.append(module_ref)
        total_missing += len(missing_refs)
        total_unchecked += len(unchecked_refs)
        modules.append(
            {
                **module_payload,
                "baseline_ref_count": len(baseline_refs),
                "present_refs": present_refs,
                "missing_refs": missing_refs,
                "unchecked_refs": unchecked_refs,
                "repair_status": "repair_needed" if missing_refs else "unchecked_refs" if unchecked_refs else "healthy",
                "repair_allowed": bool(missing_refs and module_ref in SAFE_APPLY_MODULES),
                "governance": _module_governance_evidence(module_payload),
            }
        )
    return {
        "can_repair": bool(repairable_modules),
        "repairable_modules": sorted(repairable_modules),
        "missing_ref_count": total_missing,
        "unchecked_ref_count": total_unchecked,
        "modules": modules,
        "latest_apply_run_id": str(apply_run.id),
        "governance_summary": apply_run.plan_snapshot.get("governance_summary", {}),
        "repair_policy": (
            "Repair recreates missing baseline records from the last successful safe apply. "
            "Existing customer-owned records are not overwritten silently."
        ),
    }


def _launch_input_value(input_payload: dict, key: str, fallback: str = "") -> str:
    value = input_payload.get(key)
    if value is None:
        return fallback
    cleaned = str(value).strip()
    return cleaned or fallback


def _field_drift(record_ref: str, field: str, expected, actual) -> dict | None:
    if actual == expected:
        return None
    return {
        "record_ref": record_ref,
        "field": field,
        "expected": _json_safe_drift_value(expected),
        "actual": _json_safe_drift_value(actual),
    }


def _json_safe_drift_value(value):
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (date, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe_drift_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe_drift_value(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe_drift_value(item) for item in value]
    return value


def _append_field_drift(drifts: list[dict], record_ref: str, field: str, expected, actual) -> None:
    drift = _field_drift(record_ref, field, expected, actual)
    if drift:
        drifts.append(drift)


def _org_master_field_drifts(*, tenant: Tenant, input_payload: dict) -> list[dict]:
    drifts: list[dict] = []
    legal_entity_name = _launch_input_value(input_payload, "legal_entity", tenant.legal_name or tenant.name)
    branch_name = _launch_input_value(input_payload, "default_branch", "Head Office")
    department_name = _launch_input_value(input_payload, "default_department", "Operations")
    registered_address = _launch_input_value(input_payload, "registered_address")

    LegalEntity = apps.get_model("organizations", "LegalEntity")
    Location = apps.get_model("organizations", "Location")
    Branch = apps.get_model("organizations", "Branch")
    BusinessUnit = apps.get_model("organizations", "BusinessUnit")
    Department = apps.get_model("organizations", "Department")
    CostCenter = apps.get_model("organizations", "CostCenter")
    Grade = apps.get_model("organizations", "Grade")
    Designation = apps.get_model("organizations", "Designation")
    EmploymentType = apps.get_model("organizations", "EmploymentType")

    legal_entity = LegalEntity.objects.filter(tenant=tenant, code="default-legal-entity").first()
    if legal_entity:
        _append_field_drift(drifts, "legal_entity:default-legal-entity", "name", legal_entity_name, legal_entity.name)
        _append_field_drift(
            drifts,
            "legal_entity:default-legal-entity",
            "registered_name",
            legal_entity_name,
            legal_entity.registered_name,
        )
        _append_field_drift(
            drifts,
            "legal_entity:default-legal-entity",
            "country_code",
            tenant.country_code or "IN",
            legal_entity.country_code,
        )
        _append_field_drift(
            drifts,
            "legal_entity:default-legal-entity",
            "timezone",
            tenant.timezone or "Asia/Kolkata",
            legal_entity.timezone,
        )

    location = Location.objects.filter(tenant=tenant, code="head-office").first()
    if location:
        _append_field_drift(drifts, "location:head-office", "name", branch_name, location.name)
        _append_field_drift(drifts, "location:head-office", "address_line_1", registered_address[:255], location.address_line_1)
        _append_field_drift(drifts, "location:head-office", "city", branch_name[:120], location.city)
        _append_field_drift(drifts, "location:head-office", "country_code", tenant.country_code or "IN", location.country_code)

    branch = Branch.objects.filter(tenant=tenant, code="default-branch").first()
    if branch:
        _append_field_drift(drifts, "branch:default-branch", "name", branch_name, branch.name)
        _append_field_drift(drifts, "branch:default-branch", "branch_type", "head_office", branch.branch_type)

    business_unit = BusinessUnit.objects.filter(tenant=tenant, code="corporate").first()
    if business_unit:
        _append_field_drift(drifts, "business_unit:corporate", "name", "Corporate", business_unit.name)

    department_code = _stable_launch_code(department_name, "operations")
    department = Department.objects.filter(tenant=tenant, code=department_code).first()
    if department:
        _append_field_drift(drifts, f"department:{department_code}", "name", department_name, department.name)

    cost_center = CostCenter.objects.filter(tenant=tenant, code="default-cost-center").first()
    if cost_center:
        expected_name = f"{department.name if department else department_name} Cost Center"
        _append_field_drift(drifts, "cost_center:default-cost-center", "name", expected_name, cost_center.name)

    for code, name, level in GRADE_DEFINITIONS:
        grade = Grade.objects.filter(tenant=tenant, code=code).first()
        if grade:
            _append_field_drift(drifts, f"grade:{code}", "name", name, grade.name)
            _append_field_drift(drifts, f"grade:{code}", "level", level, grade.level)

    for code, name, grade_code in DESIGNATION_DEFINITIONS:
        designation = Designation.objects.filter(tenant=tenant, code=code).select_related("grade").first()
        if designation:
            _append_field_drift(drifts, f"designation:{code}", "name", name, designation.name)
            _append_field_drift(
                drifts,
                f"designation:{code}",
                "grade_code",
                grade_code,
                designation.grade.code if designation.grade_id else "",
            )

    for code, name, description, payroll_eligible in EMPLOYMENT_TYPE_DEFINITIONS:
        employment_type = EmploymentType.objects.filter(tenant=tenant, code=code).first()
        if employment_type:
            _append_field_drift(drifts, f"employment_type:{code}", "name", name, employment_type.name)
            _append_field_drift(
                drifts,
                f"employment_type:{code}",
                "description",
                description,
                employment_type.description,
            )
            _append_field_drift(
                drifts,
                f"employment_type:{code}",
                "is_payroll_eligible",
                payroll_eligible,
                employment_type.is_payroll_eligible,
            )
    return drifts


def _document_field_drifts(*, tenant: Tenant) -> list[dict]:
    drifts: list[dict] = []
    DocumentCategory = apps.get_model("documents", "DocumentCategory")
    DocumentRequirementRule = apps.get_model("documents", "DocumentRequirementRule")
    for definition in DOCUMENT_CATEGORY_DEFINITIONS:
        if not _plan_allows_launch_module(tenant.subscription_plan, definition.get("minimum_plan", "starter")):
            continue
        code = definition["code"]
        category = DocumentCategory.objects.filter(tenant=tenant, code=code).first()
        if category:
            record_ref = f"document_category:{code}"
            _append_field_drift(drifts, record_ref, "name", definition["name"], category.name)
            _append_field_drift(drifts, record_ref, "category_type", definition["category_type"], category.category_type)
            _append_field_drift(drifts, record_ref, "description", definition["description"], category.description)
            _append_field_drift(drifts, record_ref, "is_active", True, category.is_active)
            _append_field_drift(drifts, record_ref, "is_system_seeded", True, category.is_system_seeded)
            _append_field_drift(
                drifts,
                record_ref,
                "requires_expiry_date",
                definition["requires_expiry_date"],
                category.requires_expiry_date,
            )
            _append_field_drift(drifts, record_ref, "requires_verification", True, category.requires_verification)
            _append_field_drift(drifts, record_ref, "allow_employee_upload", True, category.allow_employee_upload)
            _append_field_drift(drifts, record_ref, "allow_multiple_files", False, category.allow_multiple_files)
        rule = DocumentRequirementRule.objects.filter(tenant=tenant, category__code=code).first()
        if rule:
            record_ref = f"document_rule:{code}"
            _append_field_drift(drifts, record_ref, "is_mandatory", True, rule.is_mandatory)
            _append_field_drift(
                drifts,
                record_ref,
                "required_within_days_of_joining",
                definition["required_within_days"],
                rule.required_within_days_of_joining,
            )
            _append_field_drift(drifts, record_ref, "priority", definition["priority"], rule.priority)
            _append_field_drift(drifts, record_ref, "is_active", True, rule.is_active)
    return drifts


def _leave_attendance_field_drifts(*, tenant: Tenant, input_payload: dict) -> list[dict]:
    drifts: list[dict] = []
    current_year = timezone.now().date().year
    work_week = _launch_input_value(input_payload, "work_week", "mon_fri")
    region = _launch_input_value(input_payload, "holiday_region", "IN").upper()[:10] or "IN"

    LeaveType = apps.get_model("leave_management", "LeaveType")
    LeavePolicy = apps.get_model("leave_management", "LeavePolicy")
    LeavePolicyAssignment = apps.get_model("leave_management", "LeavePolicyAssignment")
    Shift = apps.get_model("attendance", "Shift")
    HolidayCalendar = apps.get_model("attendance", "HolidayCalendar")
    Holiday = apps.get_model("attendance", "Holiday")
    AttendancePolicy = apps.get_model("attendance", "AttendancePolicy")
    AttendancePolicyAssignment = apps.get_model("attendance", "AttendancePolicyAssignment")

    for definition in LEAVE_TYPE_DEFINITIONS:
        leave_type = LeaveType.objects.filter(tenant=tenant, code=definition["code"]).first()
        if leave_type:
            record_ref = f"leave_type:{definition['code']}"
            _append_field_drift(drifts, record_ref, "name", definition["name"], leave_type.name)
            _append_field_drift(drifts, record_ref, "short_code", definition["short_code"], leave_type.short_code)
            _append_field_drift(drifts, record_ref, "category", definition["category"], leave_type.category)
            _append_field_drift(drifts, record_ref, "unit", "day", leave_type.unit)
            _append_field_drift(drifts, record_ref, "description", definition["description"], leave_type.description)
            _append_field_drift(drifts, record_ref, "is_system_seeded", True, leave_type.is_system_seeded)
            _append_field_drift(drifts, record_ref, "is_approval_required", True, leave_type.is_approval_required)

        policy = LeavePolicy.objects.filter(tenant=tenant, code=definition["policy_code"]).first()
        if policy:
            record_ref = f"leave_policy:{definition['policy_code']}"
            _append_field_drift(drifts, record_ref, "leave_type_code", definition["code"], policy.leave_type.code)
            _append_field_drift(drifts, record_ref, "name", f"{definition['name']} Policy", policy.name)
            _append_field_drift(drifts, record_ref, "status", "active", policy.status)
            _append_field_drift(drifts, record_ref, "effective_from", date(current_year, 1, 1), policy.effective_from)
            _append_field_drift(drifts, record_ref, "accrual_frequency", definition["accrual_frequency"], policy.accrual_frequency)
            _append_field_drift(drifts, record_ref, "annual_entitlement", definition["annual_entitlement"], policy.annual_entitlement)
            _append_field_drift(drifts, record_ref, "max_carry_forward", definition["max_carry_forward"], policy.max_carry_forward)
            _append_field_drift(drifts, record_ref, "min_days_per_request", Decimal("0.50"), policy.min_days_per_request)
            _append_field_drift(drifts, record_ref, "notice_days_required", definition["notice_days_required"], policy.notice_days_required)
            _append_field_drift(drifts, record_ref, "allow_half_day", definition["allow_half_day"], policy.allow_half_day)
            _append_field_drift(drifts, record_ref, "allow_backdated_application", True, policy.allow_backdated_application)
            _append_field_drift(drifts, record_ref, "is_probation_eligible", True, policy.is_probation_eligible)

        assignment = LeavePolicyAssignment.objects.filter(tenant=tenant, leave_policy__code=definition["policy_code"]).first()
        if assignment:
            record_ref = f"leave_assignment:{definition['policy_code']}"
            _append_field_drift(drifts, record_ref, "priority", 100, assignment.priority)
            _append_field_drift(drifts, record_ref, "is_active", True, assignment.is_active)

    shift = Shift.objects.filter(tenant=tenant, code="general-shift").first()
    if shift:
        _append_field_drift(drifts, "shift:general-shift", "name", "General Shift", shift.name)
        _append_field_drift(drifts, "shift:general-shift", "start_time", time(9, 30), shift.start_time)
        _append_field_drift(drifts, "shift:general-shift", "end_time", time(18, 30), shift.end_time)
        _append_field_drift(drifts, "shift:general-shift", "working_hours", Decimal("8.00"), shift.working_hours)
        _append_field_drift(drifts, "shift:general-shift", "break_minutes", 60, shift.break_minutes)
        _append_field_drift(drifts, "shift:general-shift", "grace_in_minutes", 10, shift.grace_in_minutes)
        _append_field_drift(drifts, "shift:general-shift", "grace_out_minutes", 10, shift.grace_out_minutes)
        _append_field_drift(drifts, "shift:general-shift", "weekly_off_days", _weekly_off_days_for_launch(work_week), shift.weekly_off_days)

    holiday_definitions = FIXED_IN_HOLIDAYS + REGIONAL_FIXED_HOLIDAYS.get(region, ())
    for year in (current_year, current_year + 1):
        calendar = HolidayCalendar.objects.filter(tenant=tenant, code=f"in-{region.lower()}-holidays", year=year).first()
        if calendar:
            record_ref = f"holiday_calendar:{year}"
            _append_field_drift(drifts, record_ref, "name", f"India {region} Holidays", calendar.name)
            _append_field_drift(drifts, record_ref, "is_active", True, calendar.is_active)
            for month, day, name, holiday_type, is_optional in holiday_definitions:
                holiday = Holiday.objects.filter(calendar=calendar, date=date(year, month, day), name=name).first()
                if holiday:
                    holiday_ref = f"holiday:{year}:{_stable_launch_code(name, 'holiday')}"
                    _append_field_drift(drifts, holiday_ref, "holiday_type", holiday_type, holiday.holiday_type)
                    _append_field_drift(drifts, holiday_ref, "is_optional", is_optional, holiday.is_optional)

    attendance_policy = AttendancePolicy.objects.filter(tenant=tenant, code="standard-attendance-policy").first()
    if attendance_policy:
        record_ref = "attendance_policy:standard-attendance-policy"
        _append_field_drift(drifts, record_ref, "name", "Standard Attendance Policy", attendance_policy.name)
        _append_field_drift(drifts, record_ref, "status", "active", attendance_policy.status)
        _append_field_drift(drifts, record_ref, "attendance_unit", "day", attendance_policy.attendance_unit)
        _append_field_drift(
            drifts,
            record_ref,
            "default_shift_code",
            "general-shift",
            attendance_policy.default_shift.code if attendance_policy.default_shift_id else "",
        )
        _append_field_drift(drifts, record_ref, "full_day_min_hours", Decimal("8.00"), attendance_policy.full_day_min_hours)
        _append_field_drift(drifts, record_ref, "half_day_min_hours", Decimal("4.00"), attendance_policy.half_day_min_hours)
        _append_field_drift(drifts, record_ref, "late_mark_after_minutes", 15, attendance_policy.late_mark_after_minutes)
        _append_field_drift(drifts, record_ref, "max_late_marks_in_period", 3, attendance_policy.max_late_marks_in_period)
        _append_field_drift(drifts, record_ref, "overtime_threshold_minutes", 0, attendance_policy.overtime_threshold_minutes)
        _append_field_drift(drifts, record_ref, "allow_manual_entry", True, attendance_policy.allow_manual_entry)
        _append_field_drift(drifts, record_ref, "allow_web_checkin", True, attendance_policy.allow_web_checkin)
        _append_field_drift(drifts, record_ref, "allow_mobile_checkin", True, attendance_policy.allow_mobile_checkin)
        _append_field_drift(drifts, record_ref, "allow_geofenced_checkin", False, attendance_policy.allow_geofenced_checkin)
        _append_field_drift(drifts, record_ref, "allow_regularization", True, attendance_policy.allow_regularization)
        _append_field_drift(drifts, record_ref, "require_regularization_reason", True, attendance_policy.require_regularization_reason)

    assignment = AttendancePolicyAssignment.objects.filter(
        tenant=tenant,
        attendance_policy__code="standard-attendance-policy",
    ).first()
    if assignment:
        _append_field_drift(drifts, "attendance_assignment:standard-attendance-policy", "priority", 100, assignment.priority)
        _append_field_drift(drifts, "attendance_assignment:standard-attendance-policy", "is_active", True, assignment.is_active)
    return drifts


def _workflow_field_drifts(*, tenant: Tenant) -> list[dict]:
    drifts: list[dict] = []
    current_year = timezone.now().date().year
    WorkflowTemplate = apps.get_model("workflows", "WorkflowTemplate")
    WorkflowStep = apps.get_model("workflows", "WorkflowStep")
    WorkflowTemplateAssignment = apps.get_model("workflows", "WorkflowTemplateAssignment")
    for definition in WORKFLOW_TEMPLATE_DEFINITIONS:
        if not _plan_allows_launch_module(tenant.subscription_plan, definition.get("minimum_plan", "starter")):
            continue
        template = WorkflowTemplate.objects.filter(tenant=tenant, code=definition["code"], version=1).first()
        if not template:
            continue
        record_ref = f"workflow_template:{definition['code']}"
        _append_field_drift(drifts, record_ref, "name", definition["name"], template.name)
        _append_field_drift(drifts, record_ref, "module", definition["module"], template.module)
        _append_field_drift(drifts, record_ref, "trigger_key", definition["trigger_key"], template.trigger_key)
        _append_field_drift(drifts, record_ref, "description", definition["description"], template.description)
        _append_field_drift(drifts, record_ref, "status", "active", template.status)
        _append_field_drift(drifts, record_ref, "is_system_seeded", True, template.is_system_seeded)
        _append_field_drift(drifts, record_ref, "effective_from", date(current_year, 1, 1), template.effective_from)

        for index, step_definition in enumerate(definition["steps"], start=1):
            step = WorkflowStep.objects.filter(template=template, step_order=index).select_related("role").first()
            if not step:
                continue
            step_ref = f"workflow_step:{definition['code']}:{index}"
            _append_field_drift(drifts, step_ref, "name", step_definition["name"], step.name)
            _append_field_drift(drifts, step_ref, "mode", "sequential", step.mode)
            _append_field_drift(drifts, step_ref, "actor_type", step_definition["actor_type"], step.actor_type)
            _append_field_drift(drifts, step_ref, "role_code", step_definition.get("role_code", ""), step.role.code if step.role_id else "")
            _append_field_drift(drifts, step_ref, "permission_key", step_definition["permission_key"], step.permission_key)
            _append_field_drift(drifts, step_ref, "scope_type", step_definition["scope_type"], step.scope_type)
            _append_field_drift(drifts, step_ref, "auto_approve_after_hours", 0, step.auto_approve_after_hours)
            _append_field_drift(drifts, step_ref, "escalate_after_hours", step_definition["escalate_after_hours"], step.escalate_after_hours)
            _append_field_drift(drifts, step_ref, "allow_delegate", True, step.allow_delegate)
            _append_field_drift(drifts, step_ref, "allow_send_back", True, step.allow_send_back)
            _append_field_drift(drifts, step_ref, "allow_comment", True, step.allow_comment)
            _append_field_drift(drifts, step_ref, "rule_snapshot", step_definition["rule_snapshot"], step.rule_snapshot)

        assignment = WorkflowTemplateAssignment.objects.filter(tenant=tenant, template=template).first()
        if assignment:
            assignment_ref = f"workflow_assignment:{definition['code']}"
            _append_field_drift(drifts, assignment_ref, "priority", 100, assignment.priority)
            _append_field_drift(drifts, assignment_ref, "is_active", True, assignment.is_active)
    return drifts


def _weekly_off_days_for_launch(work_week: str) -> list[str]:
    if work_week == "mon_fri":
        return ["saturday", "sunday"]
    if work_week == "mon_sat":
        return ["sunday"]
    return ["sunday"]


def _stable_launch_code(value: str, fallback: str) -> str:
    from django.utils.text import slugify

    code = slugify(value)[:60]
    return code or fallback


def _plan_allows_launch_module(tenant_plan: str, minimum_plan: str) -> bool:
    return {"starter": 1, "growth": 2, "enterprise": 3}.get(tenant_plan, 0) >= {
        "starter": 1,
        "growth": 2,
        "enterprise": 3,
    }.get(minimum_plan, 0)


def _launch_field_drifts(*, tenant: Tenant, module_ref: str, input_payload: dict) -> list[dict]:
    if module_ref == "org_masters":
        return _org_master_field_drifts(tenant=tenant, input_payload=input_payload)
    if module_ref == "documents":
        return _document_field_drifts(tenant=tenant)
    if module_ref == "leave_attendance":
        return _leave_attendance_field_drifts(tenant=tenant, input_payload=input_payload)
    if module_ref == "workflows":
        return _workflow_field_drifts(tenant=tenant)
    return []


def _launch_drift_plan(*, tenant: Tenant, onboarding: TenantOnboarding, baseline_run: TenantLaunchRun) -> dict:
    repair_plan = _launch_repair_plan(tenant=tenant, onboarding=onboarding, apply_run=baseline_run)
    modules = []
    for module in repair_plan["modules"]:
        missing_count = len(module.get("missing_refs") or [])
        unchecked_count = len(module.get("unchecked_refs") or [])
        present_count = len(module.get("present_refs") or [])
        field_drifts = _launch_field_drifts(
            tenant=tenant,
            module_ref=module["ref"],
            input_payload=baseline_run.input_payload,
        )
        field_drift_count = len(field_drifts)
        customer_editable = bool(module.get("customer_editable_after_handoff"))
        drift_status = (
            "missing_baseline"
            if missing_count
            else "field_drift"
            if field_drift_count
            else "needs_manual_review"
            if unchecked_count
            else "in_sync"
        )
        modules.append(
            {
                **module,
                "drift_status": drift_status,
                "missing_count": missing_count,
                "unchecked_count": unchecked_count,
                "field_drift_count": field_drift_count,
                "field_drifts": field_drifts,
                "present_count": present_count,
                "customer_owned_present_count": present_count if customer_editable else 0,
                "drift_action": (
                    "repair"
                    if missing_count
                    else "manual_review"
                    if field_drift_count
                    else "manual_review"
                    if unchecked_count
                    else "leave_as_is"
                ),
            }
        )
    counts = {
        "modules_total": len(modules),
        "modules_in_sync": sum(1 for module in modules if module["drift_status"] == "in_sync"),
        "modules_missing_baseline": sum(1 for module in modules if module["drift_status"] == "missing_baseline"),
        "modules_with_field_drift": sum(1 for module in modules if module["drift_status"] == "field_drift"),
        "modules_needing_manual_review": sum(1 for module in modules if module["drift_status"] == "needs_manual_review"),
        "missing_ref_count": repair_plan["missing_ref_count"],
        "unchecked_ref_count": repair_plan["unchecked_ref_count"],
        "field_drift_count": sum(module["field_drift_count"] for module in modules),
        "customer_owned_present_ref_count": sum(module["customer_owned_present_count"] for module in modules),
    }
    return {
        "mode": "drift_check",
        "can_repair": repair_plan["can_repair"],
        "repairable_modules": repair_plan["repairable_modules"],
        "counts": counts,
        "modules": modules,
        "latest_baseline_run_id": str(baseline_run.id),
        "current_blueprint_ref": baseline_run.blueprint_ref,
        "current_blueprint_version": baseline_run.blueprint_version,
        "governance_summary": repair_plan.get("governance_summary", {}),
        "drift_policy": (
            "Drift check verifies baseline refs and selected seeded fields from launch evidence. Missing refs can be "
            "repaired; field drift and unchecked refs need manual evidence review; present customer-owned refs are left untouched."
        ),
    }


def _module_changed_fields(current_module: dict, target_module: dict) -> list[str]:
    fields = (
        "label",
        "minimum_plan",
        "ownership_mode",
        "post_onboarding_owner",
        "editable_by_roles",
        "customer_editable_after_handoff",
        "required_inputs",
        "description",
        "post_apply_action",
        "child_seeder",
    )
    return [field for field in fields if current_module.get(field) != target_module.get(field)]


def _launch_upgrade_plan(
    *,
    tenant: Tenant,
    onboarding: TenantOnboarding,
    baseline_run: TenantLaunchRun,
    target_preview_payload: dict,
) -> dict:
    current_modules = _module_payloads_by_ref(baseline_run.plan_snapshot)
    target_modules = _module_payloads_by_ref(target_preview_payload)
    repair_plan = _launch_repair_plan(tenant=tenant, onboarding=onboarding, apply_run=baseline_run)
    missing_baseline_modules = set(repair_plan["repairable_modules"])
    module_refs = sorted(set(current_modules) | set(target_modules))
    items = []
    for module_ref in module_refs:
        current_module = current_modules.get(module_ref)
        target_module = target_modules.get(module_ref)
        if target_module and not current_module:
            action = "add"
            severity = "success"
            changed_fields = []
            message = "New module exists in the target launch blueprint version."
        elif current_module and not target_module:
            action = "remove"
            severity = "warning"
            changed_fields = []
            message = "Current baseline module is not present in the target launch blueprint version."
        elif current_module and target_module:
            changed_fields = _module_changed_fields(current_module, target_module)
            action = "change" if changed_fields else "unchanged"
            severity = "warning" if changed_fields else "info"
            message = f"Target version changes: {', '.join(changed_fields)}." if changed_fields else "No module change detected."
        else:
            continue

        governance_source = target_module or current_module or {}
        customer_owned_change = bool(
            action in {"change", "remove"}
            and (current_module or {}).get("customer_editable_after_handoff") is True
        )
        baseline_missing = module_ref in missing_baseline_modules
        safe_apply_enabled = bool((target_module or current_module or {}).get("safe_apply_enabled"))
        items.append(
            {
                "module_ref": module_ref,
                "label": governance_source.get("label", module_ref),
                "action": action,
                "severity": "warning" if baseline_missing else severity,
                "message": "Current baseline is missing records; repair before upgrade." if baseline_missing else message,
                "changed_fields": changed_fields,
                "current_version": baseline_run.blueprint_version,
                "target_version": target_preview_payload.get("blueprint_version", ""),
                "customer_owned_change": customer_owned_change,
                "baseline_missing": baseline_missing,
                "safe_apply_enabled": safe_apply_enabled,
                "plan_allowed": (target_module or current_module or {}).get("plan_allowed", True),
                "governance": _module_governance_evidence(governance_source),
            }
        )

    counts = {
        "total": len(items),
        "add": sum(1 for item in items if item["action"] == "add"),
        "change": sum(1 for item in items if item["action"] == "change"),
        "remove": sum(1 for item in items if item["action"] == "remove"),
        "unchanged": sum(1 for item in items if item["action"] == "unchanged"),
        "baseline_missing": sum(1 for item in items if item["baseline_missing"]),
        "customer_owned_change": sum(1 for item in items if item["customer_owned_change"]),
    }
    actionable_modules = [
        item["module_ref"]
        for item in items
        if item["action"] in {"add", "change"} and item["safe_apply_enabled"] and item["plan_allowed"] is not False
    ]
    is_same_version = (
        baseline_run.blueprint_ref == target_preview_payload.get("blueprint_ref")
        and baseline_run.blueprint_version == target_preview_payload.get("blueprint_version")
    )
    blockers = []
    if is_same_version:
        blockers.append("Tenant is already on the target launch blueprint version.")
    if counts["remove"]:
        blockers.append("Target blueprint removes modules; manual migration review is required.")
    if counts["baseline_missing"]:
        blockers.append("Repair missing launch baseline records before upgrade.")
    if not actionable_modules and not blockers:
        blockers.append("No safe launch blueprint upgrade actions are available.")
    return {
        "can_upgrade": not blockers,
        "requires_change_reason": counts["customer_owned_change"] > 0,
        "blockers": blockers,
        "counts": counts,
        "items": items,
        "actionable_modules": sorted(actionable_modules),
        "current_blueprint_ref": baseline_run.blueprint_ref,
        "current_blueprint_version": baseline_run.blueprint_version,
        "target_blueprint_ref": target_preview_payload.get("blueprint_ref", ""),
        "target_blueprint_version": target_preview_payload.get("blueprint_version", ""),
        "latest_baseline_run_id": str(baseline_run.id),
        "governance_summary": target_preview_payload.get("governance_summary", {}),
    }


def _launch_change_reasons(*, onboarding: TenantOnboarding, tenant: Tenant, preview_payload: dict, input_payload: dict) -> list[str]:
    if not onboarding.launch_applied_at:
        return []

    latest_apply = _latest_successful_apply_run(tenant)
    reasons = []
    if latest_apply is None:
        reasons.append("launch setup was marked applied but no successful apply evidence exists")
    elif latest_apply.input_payload != input_payload:
        reasons.append("launch input payload changed after safe apply")

    if onboarding.launch_blueprint_ref and preview_payload.get("blueprint_ref") != onboarding.launch_blueprint_ref:
        reasons.append("launch blueprint changed after safe apply")
    if onboarding.launch_blueprint_version and preview_payload.get("blueprint_version") != onboarding.launch_blueprint_version:
        reasons.append("launch blueprint version changed after safe apply")
    if onboarding.launch_subscription_plan_snapshot and tenant.subscription_plan != onboarding.launch_subscription_plan_snapshot:
        reasons.append("tenant subscription plan changed after safe apply")
    return reasons


def _certification_check(
    *,
    ref: str,
    label: str,
    status_value: str,
    message: str,
    evidence_run_id: str = "",
    next_action: str = "",
) -> dict:
    return {
        "ref": ref,
        "label": label,
        "status": status_value,
        "message": message,
        "evidence_run_id": evidence_run_id,
        "next_action": next_action,
    }


def _launch_certification_report(*, tenant: Tenant, onboarding: TenantOnboarding) -> dict:
    checks: list[dict] = []
    blockers: list[str] = []
    warnings: list[str] = []
    info: list[str] = []
    preview_payload = onboarding.launch_preview_payload if isinstance(onboarding.launch_preview_payload, dict) else {}

    if onboarding.launch_blueprint_ref and onboarding.launch_blueprint_version:
        checks.append(
            _certification_check(
                ref="blueprint_selected",
                label="Blueprint selected",
                status_value="passed",
                message=f"{onboarding.launch_blueprint_ref} {onboarding.launch_blueprint_version} selected.",
            )
        )
    else:
        blockers.append("No launch blueprint has been selected.")
        checks.append(
            _certification_check(
                ref="blueprint_selected",
                label="Blueprint selected",
                status_value="blocked",
                message="No launch blueprint has been selected.",
                next_action="Run launch preview for the selected tenant template.",
            )
        )

    missing_inputs = preview_payload.get("missing_inputs") or []
    preview_blockers = preview_payload.get("blockers") or []
    can_apply = preview_payload.get("can_apply") is True
    if can_apply and not missing_inputs and not preview_blockers:
        checks.append(
            _certification_check(
                ref="preview_apply_ready",
                label="Preview apply-ready",
                status_value="passed",
                message="Latest stored launch preview is apply-ready.",
            )
        )
    else:
        message = "Launch preview is not apply-ready."
        if missing_inputs:
            message = f"Launch preview is missing inputs: {', '.join(missing_inputs)}."
        elif preview_blockers:
            message = f"Launch preview has blockers: {'; '.join(preview_blockers)}."
        blockers.append(message)
        checks.append(
            _certification_check(
                ref="preview_apply_ready",
                label="Preview apply-ready",
                status_value="blocked",
                message=message,
                next_action="Resolve inputs/blockers and rerun launch preview.",
            )
        )

    baseline_run = _latest_successful_baseline_run(tenant)
    if baseline_run:
        checks.append(
            _certification_check(
                ref="safe_apply",
                label="Safe baseline applied",
                status_value="passed",
                message=f"Baseline evidence exists from {baseline_run.run_type} {baseline_run.blueprint_version}.",
                evidence_run_id=str(baseline_run.id),
            )
        )
    else:
        blockers.append("Certified safe launch setup has not been applied.")
        checks.append(
            _certification_check(
                ref="safe_apply",
                label="Safe baseline applied",
                status_value="blocked",
                message="Certified safe launch setup has not been applied.",
                next_action="Apply safe launch setup after an apply-ready preview.",
            )
        )

    latest_drift = _latest_launch_run(tenant=tenant, run_type=TenantLaunchRunType.VERIFY, mode="drift_check")
    latest_repair_apply = _latest_launch_run(tenant=tenant, run_type=TenantLaunchRunType.REPAIR, mode="apply")
    if baseline_run is None:
        checks.append(
            _certification_check(
                ref="drift_clear",
                label="Seed drift clear",
                status_value="blocked",
                message="Drift cannot be checked before safe baseline apply.",
                next_action="Apply safe launch setup, then run seed drift check.",
            )
        )
        blockers.append("Seed drift has not been checked against an applied baseline.")
    elif latest_drift is None:
        blockers.append("Seed drift check has not been run after baseline apply.")
        checks.append(
            _certification_check(
                ref="drift_clear",
                label="Seed drift clear",
                status_value="blocked",
                message="Seed drift check has not been run.",
                next_action="Run seed drift check.",
            )
        )
    elif latest_drift.created_at < baseline_run.created_at or (
        latest_repair_apply and latest_drift.created_at < latest_repair_apply.created_at
    ):
        blockers.append("Seed drift check is stale.")
        checks.append(
            _certification_check(
                ref="drift_clear",
                label="Seed drift clear",
                status_value="blocked",
                message="Seed drift check is older than the latest baseline/repair evidence.",
                evidence_run_id=str(latest_drift.id),
                next_action="Rerun seed drift check.",
            )
        )
    else:
        drift_counts = latest_drift.result_payload.get("counts", {})
        missing_refs = drift_counts.get("missing_ref_count", 0) or 0
        field_drifts = drift_counts.get("field_drift_count", 0) or 0
        unchecked_refs = drift_counts.get("unchecked_ref_count", 0) or 0
        if missing_refs or field_drifts:
            message = (
                f"Seed drift is not clear: {missing_refs} missing refs, "
                f"{field_drifts} field differences, {unchecked_refs} unchecked refs."
            )
            blockers.append(message)
            checks.append(
                _certification_check(
                    ref="drift_clear",
                    label="Seed drift clear",
                    status_value="blocked",
                    message=message,
                    evidence_run_id=str(latest_drift.id),
                    next_action="Repair missing refs or manually review field/unchecked drift, then rerun drift check.",
                )
            )
        else:
            checks.append(
                _certification_check(
                    ref="drift_clear",
                    label="Seed drift clear",
                    status_value="passed",
                    message="Latest seed drift check has no missing refs or field differences.",
                    evidence_run_id=str(latest_drift.id),
                )
            )
            if unchecked_refs:
                message = f"Seed drift has {unchecked_refs} unchecked refs that require manual evidence review."
                warnings.append(message)
                checks.append(
                    _certification_check(
                        ref="unchecked_refs_reviewed",
                        label="Unchecked refs reviewed",
                        status_value="warning",
                        message=message,
                        evidence_run_id=str(latest_drift.id),
                        next_action="Review unchecked refs in drift evidence before final production signoff.",
                    )
                )

    plan_gated_modules = preview_payload.get("plan_gated_modules") or []
    if plan_gated_modules:
        info_message = f"Subscription-gated modules are out of scope for {tenant.subscription_plan}: {', '.join(plan_gated_modules)}."
        info.append(info_message)
        checks.append(
            _certification_check(
                ref="subscription_scope",
                label="Subscription scope",
                status_value="info",
                message=info_message,
            )
        )
    else:
        checks.append(
            _certification_check(
                ref="subscription_scope",
                label="Subscription scope",
                status_value="passed",
                message="No launch modules are gated by the current subscription.",
            )
        )

    newer_versions = []
    if onboarding.launch_blueprint_ref and onboarding.launch_blueprint_version:
        current_version_key = _version_sort_key(onboarding.launch_blueprint_version)
        newer_versions = [
            blueprint.version
            for blueprint in list_blueprints()
            if blueprint.ref == onboarding.launch_blueprint_ref
            and _version_sort_key(blueprint.version) > current_version_key
        ]
    if newer_versions:
        message = f"Newer blueprint version available: {sorted(newer_versions, key=_version_sort_key)[-1]}."
        warnings.append(message)
        checks.append(
            _certification_check(
                ref="template_version",
                label="Template version",
                status_value="warning",
                message=message,
                next_action="Run template upgrade compare when customer is ready.",
            )
        )
    else:
        checks.append(
            _certification_check(
                ref="template_version",
                label="Template version",
                status_value="passed",
                message="Tenant is on the latest known blueprint version.",
            )
        )

    if onboarding.handoff_completed_at:
        checks.append(
            _certification_check(
                ref="customer_handoff",
                label="Customer handoff",
                status_value="passed",
                message="Customer handoff is complete.",
            )
        )
    else:
        blockers.append("Customer handoff is not complete.")
        checks.append(
            _certification_check(
                ref="customer_handoff",
                label="Customer handoff",
                status_value="blocked",
                message="Customer handoff is not complete.",
                next_action="Complete customer handoff with notes after QA review.",
            )
        )

    failed_runs = TenantLaunchRun.objects.filter(
        tenant=tenant,
        status=TenantLaunchRunStatus.FAILED,
        run_type__in=[
            TenantLaunchRunType.PREVIEW,
            TenantLaunchRunType.APPLY,
            TenantLaunchRunType.VERIFY,
            TenantLaunchRunType.REPAIR,
            TenantLaunchRunType.UPGRADE,
        ],
    ).count()
    if failed_runs:
        message = f"{failed_runs} failed launch run(s) exist and should be reviewed."
        warnings.append(message)
        checks.append(
            _certification_check(
                ref="failed_runs_reviewed",
                label="Failed launch runs",
                status_value="warning",
                message=message,
                next_action="Review failed launch evidence before production signoff.",
            )
        )
    else:
        checks.append(
            _certification_check(
                ref="failed_runs_reviewed",
                label="Failed launch runs",
                status_value="passed",
                message="No failed launch runs found.",
            )
        )

    status_value = "pass" if not blockers else "fail"
    return {
        "tenant_id": str(tenant.id),
        "tenant_code": tenant.code,
        "status": status_value,
        "blueprint_ref": onboarding.launch_blueprint_ref,
        "blueprint_version": onboarding.launch_blueprint_version,
        "subscription_plan": tenant.subscription_plan,
        "blocker_count": len(blockers),
        "warning_count": len(warnings),
        "info_count": len(info),
        "checks": checks,
        "blockers": blockers,
        "warnings": warnings,
        "info": info,
        "latest_baseline_run_id": str(baseline_run.id) if baseline_run else "",
        "latest_drift_run_id": str(latest_drift.id) if latest_drift else "",
        "generated_at": timezone.now().isoformat(),
    }


def _validate_apply_ready_preview_is_current(*, onboarding: TenantOnboarding, tenant: Tenant, preview_run: TenantLaunchRun) -> None:
    preview_payload = preview_run.plan_snapshot
    if preview_run.subscription_plan != tenant.subscription_plan or preview_payload.get("subscription_plan") != tenant.subscription_plan:
        raise exceptions.ValidationError("Tenant subscription changed after preview. Run a new launch preview before applying safe modules.")
    if onboarding.launch_subscription_plan_snapshot != tenant.subscription_plan:
        raise exceptions.ValidationError("Tenant launch plan snapshot is stale. Run a new launch preview before applying safe modules.")
    if onboarding.launch_blueprint_ref != preview_run.blueprint_ref or onboarding.launch_blueprint_version != preview_run.blueprint_version:
        raise exceptions.ValidationError("Launch blueprint changed after preview. Run a new launch preview before applying safe modules.")
    if onboarding.launch_preview_payload != preview_payload:
        raise exceptions.ValidationError("Launch preview evidence is stale. Run a new launch preview before applying safe modules.")


class PlatformPermissionCatalogListView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        try:
            entries = list(PermissionCatalogEntry.objects.order_by("module", "key"))
        except (OperationalError, ProgrammingError):
            entries = []
        payload = [entry.as_catalog_dict() for entry in entries]
        if not payload:
            payload = [
                {**item, "catalog_source": "code"}
                for item in sorted(get_permission_catalog(), key=lambda item: (item["module"], item["key"]))
            ]
        return response.Response(PlatformPermissionCatalogItemSerializer(payload, many=True).data)


class PlatformLaunchBlueprintListView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        country_code = request.query_params.get("country_code", "").strip().upper()
        subscription_plan = request.query_params.get("subscription_plan", "").strip()
        blueprints = list_blueprints()
        if country_code:
            blueprints = [blueprint for blueprint in blueprints if blueprint.country_code == country_code]
        payload = [
            serialize_blueprint(
                blueprint,
                subscription_plan=subscription_plan,
                country_code=country_code,
            )
            for blueprint in blueprints
        ]
        return response.Response(PlatformLaunchBlueprintSerializer(payload, many=True).data)


class PlatformLaunchBlueprintDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request, blueprint_ref: str):
        version = request.query_params.get("version", "").strip()
        blueprint = get_blueprint(blueprint_ref, version or None)
        if blueprint is None:
            raise exceptions.NotFound("Launch blueprint not found.")
        payload = serialize_blueprint(
            blueprint,
            subscription_plan=request.query_params.get("subscription_plan", "").strip(),
            country_code=request.query_params.get("country_code", "").strip().upper(),
        )
        return response.Response(PlatformLaunchBlueprintSerializer(payload).data)


def _catalog_entry_from_code(permission_key: str) -> PermissionCatalogEntry | None:
    item = next((catalog_item for catalog_item in get_permission_catalog() if catalog_item["key"] == permission_key), None)
    if not item:
        return None
    entry, _ = PermissionCatalogEntry.objects.get_or_create(
        key=item["key"],
        defaults={
            "label": item["label"],
            "module": item["module"],
            "description": item.get("description", ""),
            "risk_level": item.get("risk_level", "medium"),
            "tenant_assignable": item.get("tenant_assignable", True),
            "required_module": item.get("required_module", ""),
            "required_plan": item.get("required_plan", ""),
            "default_role_codes": item.get("default_role_codes", []),
            "is_active": True,
            "managed_by_platform": True,
            "source_ref": "code_catalog",
        },
    )
    return entry


class PlatformPermissionCatalogDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    def patch(self, request, permission_key: str):
        serializer = PlatformPermissionCatalogUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            entry = PermissionCatalogEntry.objects.filter(key=permission_key).first() or _catalog_entry_from_code(permission_key)
        except (OperationalError, ProgrammingError) as exc:
            raise exceptions.APIException("Permission catalog table is not available. Run database migrations and sync the catalog first.") from exc
        if entry is None:
            raise exceptions.NotFound("Permission key is not in the platform catalog.")

        changes = []
        for field, value in serializer.validated_data.items():
            if getattr(entry, field) != value:
                changes.append(field)
                setattr(entry, field, value)
        if changes:
            entry.source_ref = f"platform_update:{_actor_identifier(request)}"
            entry.save(update_fields=[*changes, "source_ref", "updated_at"])

        return response.Response(PlatformPermissionCatalogItemSerializer(entry.as_catalog_dict()).data)


def _get_public_lead_or_404(item_id):
    try:
        return PublicTenantLead.objects.get(id=item_id)
    except PublicTenantLead.DoesNotExist as exc:
        raise exceptions.NotFound("Public lead not found.") from exc


class PublicTenantLeadCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = PublicTenantLeadCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data.pop("website", None)
        lead = PublicTenantLead.objects.create(
            **data,
            ip_address=_client_ip(request) or None,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:2000],
        )
        return response.Response(
            {
                "detail": "Request received. Our team will review it and contact you.",
                "lead_id": str(lead.id),
                "status": lead.status,
            },
            status=status.HTTP_201_CREATED,
        )


class PlatformPublicLeadListView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        lead_status = request.query_params.get("status", "").strip()
        queryset = PublicTenantLead.objects.order_by("-created_at")
        if lead_status:
            queryset = queryset.filter(status=lead_status)
        payload = [_serialize_public_lead(item) for item in queryset[:100]]
        return response.Response(PublicTenantLeadSerializer(payload, many=True).data)


class PlatformPublicLeadDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def patch(self, request, item_id):
        lead = _get_public_lead_or_404(item_id)
        serializer = PublicTenantLeadUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        lead.status = serializer.validated_data["status"]
        lead.reviewed_by_identifier = serializer.validated_data.get("reviewed_by_identifier") or _actor_identifier(request)
        lead.reviewed_at = timezone.now()
        lead.save(update_fields=["status", "reviewed_by_identifier", "reviewed_at", "updated_at"])
        return response.Response(PublicTenantLeadSerializer(_serialize_public_lead(lead)).data)


class PlatformPublicLeadConvertView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        lead = _get_public_lead_or_404(item_id)
        if lead.converted_tenant_id:
            raise exceptions.ValidationError("This lead has already been converted to a tenant.")

        serializer = PublicTenantLeadConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        actor_identifier = _actor_identifier(request)

        if Tenant.objects.filter(code__iexact=data["code"]).exists():
            raise exceptions.ValidationError({"code": "A tenant with this code already exists."})
        primary_domain = data.get("primary_domain", "")
        if primary_domain and TenantDomain.objects.filter(domain__iexact=primary_domain).exists():
            raise exceptions.ValidationError({"primary_domain": "This domain is already mapped to a tenant."})

        tenant = Tenant.objects.create(
            code=data["code"],
            name=lead.company_name,
            legal_name=lead.company_name,
            status=TenantStatus.DRAFT,
            subscription_plan=data.get("subscription_plan"),
            seed_pack=data.get("seed_pack"),
            primary_email=lead.work_email,
            primary_phone=lead.phone_number,
            timezone="Asia/Kolkata",
            country_code=lead.country_code or "IN",
            is_sandbox=data.get("is_sandbox", True),
            onboarding_status=TenantOnboardingStatus.CREATED,
            onboarding_started_at=timezone.now(),
            prepared_by_identifier=actor_identifier,
        )
        if primary_domain:
            TenantDomain.objects.create(tenant=tenant, domain=primary_domain, is_primary=True)

        onboarding = tenant.onboarding_record
        onboarding.country_context = lead.country_code or tenant.country_code
        onboarding.industry_context = lead.industry
        onboarding.notes = data.get("notes", "") or lead.message
        for field in ["owner_mode", "setup_style", "data_setup_style", "policy_control_style"]:
            if field in data:
                setattr(onboarding, field, data[field])
        onboarding.save(
            update_fields=[
                "country_context",
                "industry_context",
                "notes",
                "owner_mode",
                "setup_style",
                "data_setup_style",
                "policy_control_style",
                "updated_at",
            ]
        )

        set_checklist_item_status(
            onboarding,
            code="tenant_created",
            status=ChecklistStatus.COMPLETED,
            actor_identifier=actor_identifier,
        )
        if primary_domain:
            set_checklist_item_status(
                onboarding,
                code="domain_mapped",
                status=ChecklistStatus.COMPLETED,
                actor_identifier=actor_identifier,
            )

        contact = TenantOnboardingAdminContact.objects.create(
            onboarding=onboarding,
            full_name=lead.contact_name,
            email=lead.work_email,
            phone_number=lead.phone_number,
            job_title=data.get("admin_job_title", ""),
            is_primary=True,
            notes="Created from public lead conversion.",
        )
        add_onboarding_event(
            onboarding,
            event_type="public_lead_converted",
            summary=f"Converted public lead {lead.work_email} into tenant {tenant.code}.",
            actor_identifier=actor_identifier,
            payload={
                "lead_id": str(lead.id),
                "contact_id": str(contact.id),
                "employee_count": lead.employee_count,
                "preferred_plan": lead.preferred_plan,
            },
        )

        lead.status = PublicLeadStatus.CONVERTED
        lead.reviewed_by_identifier = actor_identifier
        lead.reviewed_at = timezone.now()
        lead.converted_tenant = tenant
        lead.save(update_fields=["status", "reviewed_by_identifier", "reviewed_at", "converted_tenant", "updated_at"])

        return response.Response(
            {
                "detail": "Lead converted to tenant.",
                "lead": PublicTenantLeadSerializer(_serialize_public_lead(lead)).data,
                "tenant": PlatformTenantListItemSerializer(_serialize_tenant(tenant)).data,
                "admin_contact": PlatformOnboardingAdminContactSerializer(
                    {
                        "id": contact.id,
                        "full_name": contact.full_name,
                        "email": contact.email,
                        "phone_number": contact.phone_number,
                        "job_title": contact.job_title,
                        "is_primary": contact.is_primary,
                        "provisioning_status": contact.provisioning_status,
                        "user_id": contact.user_id,
                        "user_is_active": contact.user.is_active if contact.user_id else None,
                        "membership_id": contact.membership_id,
                        "membership_status": contact.membership.status if contact.membership_id else "",
                        "invited_at": contact.invited_at,
                        "first_login_at": contact.first_login_at,
                        "notes": contact.notes,
                        "created_at": contact.created_at,
                        "updated_at": contact.updated_at,
                    }
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantListCreateView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        items = Tenant.objects.prefetch_related("domains").order_by("name")
        payload = [_serialize_tenant(item) for item in items]
        return response.Response(PlatformTenantListItemSerializer(payload, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = PlatformTenantWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = Tenant.objects.create(
            code=data["code"],
            name=data["name"],
            legal_name=data.get("legal_name", ""),
            status=data.get("status", TenantStatus.DRAFT),
            subscription_plan=data.get("subscription_plan"),
            seed_pack=data.get("seed_pack"),
            primary_email=data.get("primary_email", ""),
            primary_phone=data.get("primary_phone", ""),
            timezone=data.get("timezone", "UTC"),
            country_code=data.get("country_code", "IN"),
            is_sandbox=data.get("is_sandbox", False),
            onboarding_status=TenantOnboardingStatus.CREATED,
            onboarding_started_at=timezone.now(),
            prepared_by_identifier=_actor_identifier(request),
        )
        primary_domain = data.get("primary_domain")
        if primary_domain:
            TenantDomain.objects.create(
                tenant=tenant,
                domain=primary_domain,
                is_primary=True,
            )
        onboarding = tenant.onboarding_record
        set_checklist_item_status(
            onboarding,
            code="tenant_created",
            status=ChecklistStatus.COMPLETED,
            actor_identifier=_actor_identifier(request),
        )
        if primary_domain:
            set_checklist_item_status(
                onboarding,
                code="domain_mapped",
                status=ChecklistStatus.COMPLETED,
                actor_identifier=_actor_identifier(request),
            )
        add_onboarding_event(
            onboarding,
            event_type="tenant_created",
            summary=f"Tenant {tenant.code} created.",
            actor_identifier=_actor_identifier(request),
            payload={"tenant_id": str(tenant.id), "primary_domain": primary_domain or ""},
        )
        return response.Response(
            PlatformTenantListItemSerializer(_serialize_tenant(tenant)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformSummaryView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        tenants = Tenant.objects.prefetch_related("domains").order_by("name")
        first_tenant = tenants.first()
        tenant_status_counts = {
            item["status"]: item["count"]
            for item in Tenant.objects.values("status").annotate(count=Count("id"))
        }
        onboarding_status_counts = {
            item["onboarding_status"]: item["count"]
            for item in Tenant.objects.values("onboarding_status").annotate(count=Count("id"))
        }
        lead_status_counts = {
            item["status"]: item["count"]
            for item in PublicTenantLead.objects.values("status").annotate(count=Count("id"))
        }
        active_lead_statuses = [
            PublicLeadStatus.NEW,
            PublicLeadStatus.REVIEWING,
            PublicLeadStatus.QUALIFIED,
        ]
        policy_pack_status_counts = {
            item["status"]: item["count"]
            for item in PlatformPolicyPack.objects.values("status").annotate(count=Count("id"))
        }
        lead_queue = list(
            PublicTenantLead.objects.filter(status__in=active_lead_statuses)
            .order_by("status", "-created_at")[:5]
        )
        stale_tenants = list(
            tenants.exclude(onboarding_status__in=[TenantOnboardingStatus.ACTIVE, TenantOnboardingStatus.HANDOFF_READY])[:5]
        )
        return response.Response(
            {
                "counts": {
                    "tenants": tenants.count(),
                    "active_tenants": tenant_status_counts.get(TenantStatus.ACTIVE, 0),
                    "sandbox_tenants": Tenant.objects.filter(is_sandbox=True).count(),
                    "onboarding_tenants": tenants.exclude(onboarding_status=TenantOnboardingStatus.ACTIVE).count(),
                    "handoff_ready_tenants": onboarding_status_counts.get(TenantOnboardingStatus.HANDOFF_READY, 0),
                    "baseline_pending_tenants": sum(
                        onboarding_status_counts.get(status_key, 0)
                        for status_key in [TenantOnboardingStatus.CREATED, TenantOnboardingStatus.PREPARED]
                    ),
                    "leads": PublicTenantLead.objects.count(),
                    "active_leads": PublicTenantLead.objects.filter(status__in=active_lead_statuses).count(),
                    "new_leads": lead_status_counts.get(PublicLeadStatus.NEW, 0),
                    "qualified_leads": lead_status_counts.get(PublicLeadStatus.QUALIFIED, 0),
                    "policy_packs": PlatformPolicyPack.objects.count(),
                    "published_policy_packs": policy_pack_status_counts.get(PlatformPolicyPackStatus.PUBLISHED, 0),
                },
                "first_tenant": PlatformTenantListItemSerializer(_serialize_tenant(first_tenant)).data if first_tenant else None,
                "lead_queue": PublicTenantLeadSerializer([_serialize_public_lead(item) for item in lead_queue], many=True).data,
                "stale_onboarding_tenants": PlatformTenantListItemSerializer(
                    [_serialize_tenant(item) for item in stale_tenants],
                    many=True,
                ).data,
            }
        )


class PlatformTenantDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        return response.Response(PlatformTenantListItemSerializer(_serialize_tenant(tenant)).data)

    @transaction.atomic
    def patch(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        serializer = PlatformTenantWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        simple_fields = [
            "code",
            "name",
            "legal_name",
            "status",
            "subscription_plan",
            "seed_pack",
            "primary_email",
            "primary_phone",
            "timezone",
            "country_code",
            "is_sandbox",
        ]
        updated_fields = []
        for field in simple_fields:
            if field in data:
                setattr(tenant, field, data[field])
                updated_fields.append(field)
        if updated_fields:
            tenant.save(update_fields=updated_fields + ["updated_at"])

        if "primary_domain" in data:
            domain = data.get("primary_domain", "")
            current_primary = tenant.domains.filter(is_primary=True).first()
            if current_primary and current_primary.domain != domain:
                current_primary.is_primary = False
                current_primary.save(update_fields=["is_primary", "updated_at"])
            if domain:
                TenantDomain.objects.update_or_create(
                    domain=domain,
                    defaults={"tenant": tenant, "is_primary": True},
                )
                set_checklist_item_status(
                    tenant.onboarding_record,
                    code="domain_mapped",
                    status=ChecklistStatus.COMPLETED,
                    actor_identifier=_actor_identifier(request),
                )

        add_onboarding_event(
            tenant.onboarding_record,
            event_type="tenant_updated",
            summary=f"Tenant {tenant.code} updated.",
            actor_identifier=_actor_identifier(request),
            payload={"fields": sorted(list(data.keys()))},
        )
        tenant.refresh_from_db()
        return response.Response(PlatformTenantListItemSerializer(_serialize_tenant(tenant)).data)


class PlatformTenantOnboardingDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        return response.Response(PlatformTenantOnboardingSerializer(_serialize_onboarding(onboarding)).data)

    @transaction.atomic
    def patch(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantOnboardingWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(onboarding, field, value)
        onboarding.save(update_fields=list(serializer.validated_data.keys()) + ["updated_at"])
        if tenant.onboarding_status == TenantOnboardingStatus.CREATED:
            tenant.onboarding_status = TenantOnboardingStatus.PREPARED
            tenant.save(update_fields=["onboarding_status", "updated_at"])
        add_onboarding_event(
            onboarding,
            event_type="tenant_prepared",
            summary=f"Onboarding details updated for {tenant.code}.",
            actor_identifier=_actor_identifier(request),
            payload={"fields": sorted(list(serializer.validated_data.keys()))},
        )
        return response.Response(PlatformTenantOnboardingSerializer(_serialize_onboarding(onboarding)).data)


class PlatformTenantLaunchRunListView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        runs = TenantLaunchRun.objects.filter(tenant=tenant).prefetch_related("seeded_items").order_by("-created_at")[:50]
        payload = [_serialize_launch_run(item) for item in runs]
        return response.Response(PlatformTenantLaunchRunSerializer(payload, many=True).data)


class PlatformTenantLaunchCertificationReportView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        report = _launch_certification_report(tenant=tenant, onboarding=tenant.onboarding_record)
        return response.Response(report)


class PlatformTenantLaunchPreviewView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        started_at = timezone.now()
        preview = build_launch_preview(
            tenant=tenant,
            blueprint_ref=data["blueprint_ref"],
            blueprint_version=data.get("blueprint_version") or None,
            input_payload=data.get("input_payload") or {},
        )
        preview_payload = preview.as_dict()
        input_payload = data.get("input_payload") or {}
        change_reason = data.get("change_reason", "").strip()
        change_reasons = _launch_change_reasons(
            onboarding=onboarding,
            tenant=tenant,
            preview_payload=preview_payload,
            input_payload=input_payload,
        )
        if change_reasons and not change_reason:
            raise exceptions.ValidationError(
                {
                    "change_reason": (
                        "A change reason is required after safe launch setup has been applied. "
                        f"Detected: {', '.join(change_reasons)}."
                    )
                }
            )
        finished_at = timezone.now()
        errors = [{"message": blocker} for blocker in preview.blockers]
        run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=preview.blueprint_ref,
            blueprint_version=preview.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.PREVIEW,
            status=TenantLaunchRunStatus.SUCCEEDED if not preview.blockers else TenantLaunchRunStatus.FAILED,
            requested_by_identifier=_actor_identifier(request),
            idempotency_key=data.get("idempotency_key", ""),
            started_at=started_at,
            finished_at=finished_at,
            input_payload=input_payload,
            plan_snapshot=preview_payload,
            result_payload={"can_apply": preview.can_apply, "change_reasons": change_reasons},
            errors=errors,
            evidence={
                "source": "platform_launch_preview",
                "recorded_at": finished_at.isoformat(),
                "change_reason": change_reason,
                "change_reasons": change_reasons,
                "requires_change_reason": bool(change_reasons),
                "governance_summary": preview_payload.get("governance_summary", {}),
            },
        )
        _create_preview_seeded_items(run=run, preview_payload=preview_payload)

        if not preview.blockers:
            onboarding.launch_blueprint_ref = preview.blueprint_ref
            onboarding.launch_blueprint_version = preview.blueprint_version
            onboarding.launch_subscription_plan_snapshot = tenant.subscription_plan
            onboarding.launch_preview_payload = preview_payload
            onboarding.launch_selected_at = finished_at
            onboarding.launch_readiness_status = (
                LaunchReadinessStatus.CONFIGURED
                if preview.can_apply
                else LaunchReadinessStatus.BLOCKED
            )
            onboarding.launch_status_notes = (
                "Launch preview is apply-ready."
                if preview.can_apply and not change_reasons
                else "Launch change preview is apply-ready and requires review before handoff."
                if preview.can_apply
                else "Launch preview has missing customer inputs."
            )
            onboarding.save(
                update_fields=[
                    "launch_blueprint_ref",
                    "launch_blueprint_version",
                    "launch_subscription_plan_snapshot",
                    "launch_preview_payload",
                    "launch_selected_at",
                    "launch_readiness_status",
                    "launch_status_notes",
                    "updated_at",
                ]
            )
        add_onboarding_event(
            onboarding,
            event_type="launch_blueprint_previewed",
            summary=f"Previewed launch blueprint {preview.blueprint_ref} for {tenant.code}.",
            actor_identifier=_actor_identifier(request),
            payload={
                "launch_run_id": str(run.id),
                "blueprint_ref": preview.blueprint_ref,
                "blueprint_version": preview.blueprint_version,
                "can_apply": preview.can_apply,
                "missing_inputs": list(preview.missing_inputs),
                "blockers": list(preview.blockers),
                "change_reason": change_reason,
                "change_reasons": change_reasons,
            },
        )
        return response.Response(
            {
                "preview": PlatformTenantLaunchPreviewSerializer(preview_payload).data,
                "launch_run": PlatformTenantLaunchRunSerializer(_serialize_launch_run(run)).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchApplyView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchApplyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        actor_identifier = _actor_identifier(request)
        idempotency_key = data.get("idempotency_key", "")

        if idempotency_key:
            existing_run = (
                TenantLaunchRun.objects.filter(
                    tenant=tenant,
                    run_type=TenantLaunchRunType.APPLY,
                    idempotency_key=idempotency_key,
                )
                .prefetch_related("seeded_items")
                .order_by("-created_at")
                .first()
            )
            if existing_run:
                return response.Response(PlatformTenantLaunchRunSerializer(_serialize_launch_run(existing_run)).data)

        preview_run = _latest_apply_ready_preview(tenant)
        if preview_run is None:
            raise exceptions.ValidationError("Run an apply-ready launch preview before applying safe modules.")
        _validate_apply_ready_preview_is_current(onboarding=onboarding, tenant=tenant, preview_run=preview_run)

        preview_payload = preview_run.plan_snapshot
        module_payloads = _module_payloads_by_ref(preview_payload)
        requested_modules = set(data.get("requested_modules") or [])
        apply_allowed_modules = set(preview_payload.get("safe_apply_modules") or [])
        unknown_requested = sorted(module for module in requested_modules if module not in module_payloads)
        if unknown_requested:
            raise exceptions.ValidationError(
                {"requested_modules": f"These modules are not in the latest launch preview: {', '.join(unknown_requested)}."}
            )
        modules_to_apply = requested_modules or apply_allowed_modules
        disallowed_requested = sorted(modules_to_apply - apply_allowed_modules)
        if disallowed_requested:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": (
                            "Launch apply is only enabled for modules allowed by the latest preview, "
                            "current subscription, and certified safe seeder list. "
                            f"These modules are gated: {', '.join(disallowed_requested)}."
                        ),
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )

        started_at = timezone.now()
        apply_run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=preview_run.blueprint_ref,
            blueprint_version=preview_run.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.APPLY,
            status=TenantLaunchRunStatus.RUNNING,
            requested_by_identifier=actor_identifier,
            idempotency_key=idempotency_key,
            started_at=started_at,
            input_payload=preview_run.input_payload,
            plan_snapshot=preview_payload,
            evidence={
                "source": "platform_launch_safe_apply",
                "preview_run_id": str(preview_run.id),
                "requested_modules": sorted(requested_modules),
                "safe_modules": sorted(SAFE_APPLY_MODULES),
                "apply_allowed_modules": sorted(apply_allowed_modules),
                "plan_gated_modules": sorted(preview_payload.get("plan_gated_modules") or []),
                "uncertified_modules": sorted(preview_payload.get("uncertified_modules") or []),
                "subscription_plan": tenant.subscription_plan,
                "governance_summary": preview_payload.get("governance_summary", {}),
            },
        )

        results = []
        errors = []
        applied_modules = set()
        for module_ref in sorted(modules_to_apply):
            seeder = SEEDER_BY_MODULE[module_ref]
            module_payload = module_payloads.get(module_ref, {"ref": module_ref})
            try:
                result = seeder(onboarding, preview_run.input_payload)
                results.append(result.as_dict())
                applied_modules.add(module_ref)
                TenantLaunchSeededItem.objects.create(
                    launch_run=apply_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=TenantLaunchItemAction.UPDATE if result.existing else TenantLaunchItemAction.CREATE,
                    status=TenantLaunchItemStatus.SUCCEEDED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=result.message,
                    payload={**module_payload, "result": result.as_dict()},
                    evidence={
                        "source": "platform_launch_safe_apply",
                        "preview_run_id": str(preview_run.id),
                        "governance": {
                            "post_onboarding_owner": module_payload.get("post_onboarding_owner", ""),
                            "editable_by_roles": module_payload.get("editable_by_roles", []),
                            "customer_editable_after_handoff": module_payload.get(
                                "customer_editable_after_handoff",
                                False,
                            ),
                            "post_apply_action": module_payload.get("post_apply_action", ""),
                        },
                    },
                )
            except Exception as exc:
                errors.append({"module_ref": module_ref, "message": str(exc)})
                TenantLaunchSeededItem.objects.create(
                    launch_run=apply_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=TenantLaunchItemAction.UPDATE,
                    status=TenantLaunchItemStatus.FAILED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=str(exc)[:255],
                    payload=module_payload,
                    evidence={
                        "source": "platform_launch_safe_apply",
                        "preview_run_id": str(preview_run.id),
                        "governance": {
                            "post_onboarding_owner": module_payload.get("post_onboarding_owner", ""),
                            "editable_by_roles": module_payload.get("editable_by_roles", []),
                            "customer_editable_after_handoff": module_payload.get(
                                "customer_editable_after_handoff",
                                False,
                            ),
                            "post_apply_action": module_payload.get("post_apply_action", ""),
                        },
                    },
                )

        for module_ref, module_payload in module_payloads.items():
            if module_ref in applied_modules:
                continue
            if apply_run.seeded_items.filter(item_key=module_ref).exists():
                continue
            if module_ref in SAFE_APPLY_MODULES:
                message = "Safe module was not requested in this apply run."
            elif module_payload.get("plan_allowed") is False:
                message = module_payload.get("skip_reason") or "Module is gated by the current subscription."
            else:
                message = "Module remains gated until its child seeder is certified."
            TenantLaunchSeededItem.objects.create(
                launch_run=apply_run,
                tenant=tenant,
                item_key=module_ref,
                item_kind="launch_module",
                module_ref=module_ref,
                action=TenantLaunchItemAction.SKIP,
                status=TenantLaunchItemStatus.SKIPPED,
                ownership_mode=module_payload.get("ownership_mode", ""),
                message=message,
                payload=module_payload,
                evidence={
                    "source": "platform_launch_safe_apply",
                    "preview_run_id": str(preview_run.id),
                    "governance": {
                        "post_onboarding_owner": module_payload.get("post_onboarding_owner", ""),
                        "editable_by_roles": module_payload.get("editable_by_roles", []),
                        "customer_editable_after_handoff": module_payload.get("customer_editable_after_handoff", False),
                        "post_apply_action": module_payload.get("post_apply_action", ""),
                    },
                },
            )

        finished_at = timezone.now()
        apply_run.status = TenantLaunchRunStatus.FAILED if errors else TenantLaunchRunStatus.SUCCEEDED
        apply_run.finished_at = finished_at
        apply_run.result_payload = {
            "applied_modules": sorted(applied_modules),
            "gated_modules": sorted(set(module_payloads) - applied_modules),
            "plan_gated_modules": sorted(preview_payload.get("plan_gated_modules") or []),
            "uncertified_modules": sorted(preview_payload.get("uncertified_modules") or []),
            "safe_apply_modules": sorted(apply_allowed_modules),
            "governance_summary": preview_payload.get("governance_summary", {}),
            "results": results,
        }
        apply_run.errors = errors
        apply_run.save(update_fields=["status", "finished_at", "result_payload", "errors", "updated_at"])

        if not errors:
            onboarding.launch_applied_at = finished_at
            onboarding.launch_readiness_status = LaunchReadinessStatus.STAGE_READY
            onboarding.launch_status_notes = "Certified safe launch modules have been applied."
            onboarding.save(
                update_fields=[
                    "launch_applied_at",
                    "launch_readiness_status",
                    "launch_status_notes",
                    "updated_at",
                ]
            )
            add_onboarding_event(
                onboarding,
                event_type="launch_safe_modules_applied",
                summary=f"Applied certified safe launch modules for {tenant.code}.",
                actor_identifier=actor_identifier,
                payload={
                    "launch_run_id": str(apply_run.id),
                    "preview_run_id": str(preview_run.id),
                    "applied_modules": sorted(applied_modules),
                },
            )

        apply_run = TenantLaunchRun.objects.prefetch_related("seeded_items").get(id=apply_run.id)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(apply_run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchDriftCheckView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchDriftRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        baseline_run = _latest_successful_baseline_run(tenant)
        if baseline_run is None:
            raise exceptions.ValidationError("Apply certified safe launch setup before checking launch drift.")

        idempotency_key = data.get("idempotency_key", "")
        if idempotency_key:
            existing_run = (
                TenantLaunchRun.objects.filter(
                    tenant=tenant,
                    run_type=TenantLaunchRunType.VERIFY,
                    idempotency_key=idempotency_key,
                )
                .prefetch_related("seeded_items")
                .order_by("-created_at")
                .first()
            )
            if existing_run:
                return response.Response(PlatformTenantLaunchRunSerializer(_serialize_launch_run(existing_run)).data)

        plan = _launch_drift_plan(tenant=tenant, onboarding=onboarding, baseline_run=baseline_run)
        started_at = timezone.now()
        finished_at = timezone.now()
        run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=baseline_run.blueprint_ref,
            blueprint_version=baseline_run.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.VERIFY,
            status=TenantLaunchRunStatus.SUCCEEDED,
            requested_by_identifier=_actor_identifier(request),
            idempotency_key=idempotency_key,
            started_at=started_at,
            finished_at=finished_at,
            input_payload=baseline_run.input_payload,
            plan_snapshot=baseline_run.plan_snapshot,
            result_payload=plan,
            evidence={
                "source": "platform_launch_drift_check",
                "baseline_run_id": str(baseline_run.id),
                "drift_policy": plan["drift_policy"],
                "governance_summary": plan.get("governance_summary", {}),
            },
        )
        items = []
        for module in plan["modules"]:
            missing_count = module.get("missing_count") or 0
            unchecked_count = module.get("unchecked_count") or 0
            message = (
                f"{missing_count} baseline refs are missing."
                if missing_count
                else f"{unchecked_count} baseline refs need manual evidence review."
                if unchecked_count
                else "Baseline refs are present."
            )
            items.append(
                TenantLaunchSeededItem(
                    launch_run=run,
                    tenant=tenant,
                    item_key=module["ref"],
                    item_kind="launch_module",
                    module_ref=module["ref"],
                    action=TenantLaunchItemAction.BLOCK if missing_count else TenantLaunchItemAction.NOOP,
                    status=TenantLaunchItemStatus.BLOCKED if missing_count else TenantLaunchItemStatus.SKIPPED,
                    ownership_mode=module.get("ownership_mode", ""),
                    message=message,
                    payload=module,
                    evidence={
                        "source": "platform_launch_drift_check",
                        "baseline_run_id": str(baseline_run.id),
                        "governance": _module_governance_evidence(module),
                    },
                )
            )
        if items:
            TenantLaunchSeededItem.objects.bulk_create(items)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchRepairPreviewView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchRepairRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        latest_apply = _latest_successful_baseline_run(tenant)
        if latest_apply is None:
            raise exceptions.ValidationError("Apply certified safe launch setup before running launch repair.")

        plan = _launch_repair_plan(tenant=tenant, onboarding=onboarding, apply_run=latest_apply)
        module_refs = {module["ref"] for module in plan["modules"]}
        requested_modules = set(data.get("requested_modules") or [])
        unknown_requested = sorted(requested_modules - module_refs)
        if unknown_requested:
            raise exceptions.ValidationError(
                {"requested_modules": f"These modules are not in the launch baseline: {', '.join(unknown_requested)}."}
            )

        started_at = timezone.now()
        finished_at = timezone.now()
        run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=latest_apply.blueprint_ref,
            blueprint_version=latest_apply.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.REPAIR,
            status=TenantLaunchRunStatus.SUCCEEDED,
            requested_by_identifier=_actor_identifier(request),
            idempotency_key=data.get("idempotency_key", ""),
            started_at=started_at,
            finished_at=finished_at,
            input_payload=latest_apply.input_payload,
            plan_snapshot=latest_apply.plan_snapshot,
            result_payload={
                "mode": "preview",
                "requested_modules": sorted(requested_modules),
                **plan,
            },
            evidence={
                "source": "platform_launch_repair_preview",
                "latest_apply_run_id": str(latest_apply.id),
                "change_reason": data.get("change_reason", ""),
                "governance_summary": plan.get("governance_summary", {}),
            },
        )
        items = []
        for module in plan["modules"]:
            missing_refs = module.get("missing_refs") or []
            unchecked_refs = module.get("unchecked_refs") or []
            message = (
                f"{len(missing_refs)} missing baseline refs can be repaired."
                if missing_refs
                else f"{len(unchecked_refs)} refs need manual evidence review."
                if unchecked_refs
                else "Baseline refs are present."
            )
            items.append(
                TenantLaunchSeededItem(
                    launch_run=run,
                    tenant=tenant,
                    item_key=module["ref"],
                    item_kind="launch_module",
                    module_ref=module["ref"],
                    action=TenantLaunchItemAction.PLAN if missing_refs else TenantLaunchItemAction.NOOP,
                    status=TenantLaunchItemStatus.PLANNED if missing_refs else TenantLaunchItemStatus.SKIPPED,
                    ownership_mode=module.get("ownership_mode", ""),
                    message=message,
                    payload=module,
                    evidence={"source": "platform_launch_repair_preview", "latest_apply_run_id": str(latest_apply.id)},
                )
            )
        if items:
            TenantLaunchSeededItem.objects.bulk_create(items)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchRepairApplyView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchRepairRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        actor_identifier = _actor_identifier(request)
        idempotency_key = data.get("idempotency_key", "")
        if idempotency_key:
            existing_run = (
                TenantLaunchRun.objects.filter(
                    tenant=tenant,
                    run_type=TenantLaunchRunType.REPAIR,
                    idempotency_key=idempotency_key,
                )
                .prefetch_related("seeded_items")
                .order_by("-created_at")
                .first()
            )
            if existing_run:
                return response.Response(PlatformTenantLaunchRunSerializer(_serialize_launch_run(existing_run)).data)

        latest_apply = _latest_successful_baseline_run(tenant)
        if latest_apply is None:
            raise exceptions.ValidationError("Apply certified safe launch setup before running launch repair.")

        plan = _launch_repair_plan(tenant=tenant, onboarding=onboarding, apply_run=latest_apply)
        module_payloads = _module_payloads_by_ref(latest_apply.plan_snapshot)
        module_refs = set(module_payloads)
        repairable_modules = set(plan["repairable_modules"])
        requested_modules = set(data.get("requested_modules") or [])
        unknown_requested = sorted(requested_modules - module_refs)
        if unknown_requested:
            raise exceptions.ValidationError(
                {"requested_modules": f"These modules are not in the launch baseline: {', '.join(unknown_requested)}."}
            )
        modules_to_apply = requested_modules or repairable_modules
        disallowed_safe = sorted(module for module in modules_to_apply if module not in SAFE_APPLY_MODULES)
        if disallowed_safe:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": f"Launch repair can only run certified safe modules: {', '.join(disallowed_safe)}.",
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )
        forced_modules = sorted(modules_to_apply - repairable_modules)
        change_reason = data.get("change_reason", "").strip()
        if forced_modules and not change_reason:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": (
                            "A change reason is required to rerun launch modules that do not have missing baseline refs: "
                            f"{', '.join(forced_modules)}."
                        ),
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )
        if not modules_to_apply:
            raise exceptions.ValidationError("No missing launch baseline records are available for repair.")

        started_at = timezone.now()
        repair_run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=latest_apply.blueprint_ref,
            blueprint_version=latest_apply.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.REPAIR,
            status=TenantLaunchRunStatus.RUNNING,
            requested_by_identifier=actor_identifier,
            idempotency_key=idempotency_key,
            started_at=started_at,
            input_payload=latest_apply.input_payload,
            plan_snapshot=latest_apply.plan_snapshot,
            evidence={
                "source": "platform_launch_repair_apply",
                "latest_apply_run_id": str(latest_apply.id),
                "change_reason": change_reason,
                "repairable_modules": sorted(repairable_modules),
                "forced_modules": forced_modules,
                "governance_summary": plan.get("governance_summary", {}),
            },
        )

        results = []
        errors = []
        repaired_modules = set()
        for module_ref in sorted(modules_to_apply):
            module_payload = module_payloads.get(module_ref, {"ref": module_ref})
            try:
                result = SEEDER_BY_MODULE[module_ref](onboarding, latest_apply.input_payload)
                results.append(result.as_dict())
                repaired_modules.add(module_ref)
                action = (
                    TenantLaunchItemAction.CREATE
                    if result.created
                    else TenantLaunchItemAction.UPDATE
                    if result.existing
                    else TenantLaunchItemAction.NOOP
                )
                TenantLaunchSeededItem.objects.create(
                    launch_run=repair_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=action,
                    status=TenantLaunchItemStatus.SUCCEEDED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=result.message,
                    payload={**module_payload, "result": result.as_dict()},
                    evidence={
                        "source": "platform_launch_repair_apply",
                        "latest_apply_run_id": str(latest_apply.id),
                        "change_reason": change_reason,
                        "forced": module_ref in forced_modules,
                        "governance": _module_governance_evidence(module_payload),
                    },
                )
            except Exception as exc:
                errors.append({"module_ref": module_ref, "message": str(exc)})
                TenantLaunchSeededItem.objects.create(
                    launch_run=repair_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=TenantLaunchItemAction.UPDATE,
                    status=TenantLaunchItemStatus.FAILED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=str(exc)[:255],
                    payload=module_payload,
                    evidence={
                        "source": "platform_launch_repair_apply",
                        "latest_apply_run_id": str(latest_apply.id),
                        "change_reason": change_reason,
                        "forced": module_ref in forced_modules,
                        "governance": _module_governance_evidence(module_payload),
                    },
                )

        for module_ref, module_payload in module_payloads.items():
            if module_ref in repaired_modules or repair_run.seeded_items.filter(item_key=module_ref).exists():
                continue
            TenantLaunchSeededItem.objects.create(
                launch_run=repair_run,
                tenant=tenant,
                item_key=module_ref,
                item_kind="launch_module",
                module_ref=module_ref,
                action=TenantLaunchItemAction.NOOP,
                status=TenantLaunchItemStatus.SKIPPED,
                ownership_mode=module_payload.get("ownership_mode", ""),
                message="No missing baseline refs were selected for repair.",
                payload=module_payload,
                evidence={
                    "source": "platform_launch_repair_apply",
                    "latest_apply_run_id": str(latest_apply.id),
                    "governance": _module_governance_evidence(module_payload),
                },
            )

        finished_at = timezone.now()
        repair_run.status = TenantLaunchRunStatus.FAILED if errors else TenantLaunchRunStatus.SUCCEEDED
        repair_run.finished_at = finished_at
        repair_run.result_payload = {
            "mode": "apply",
            "repaired_modules": sorted(repaired_modules),
            "forced_modules": forced_modules,
            "repairable_modules": sorted(repairable_modules),
            "governance_summary": plan.get("governance_summary", {}),
            "results": results,
        }
        repair_run.errors = errors
        repair_run.save(update_fields=["status", "finished_at", "result_payload", "errors", "updated_at"])

        if not errors:
            onboarding.launch_status_notes = "Launch baseline repair applied."
            onboarding.save(update_fields=["launch_status_notes", "updated_at"])
            add_onboarding_event(
                onboarding,
                event_type="launch_baseline_repaired",
                summary=f"Repaired launch baseline modules for {tenant.code}.",
                actor_identifier=actor_identifier,
                payload={
                    "launch_run_id": str(repair_run.id),
                    "latest_apply_run_id": str(latest_apply.id),
                    "repaired_modules": sorted(repaired_modules),
                    "forced_modules": forced_modules,
                    "change_reason": change_reason,
                },
            )

        repair_run = TenantLaunchRun.objects.prefetch_related("seeded_items").get(id=repair_run.id)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(repair_run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchUpgradeCompareView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchUpgradeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        baseline_run = _latest_successful_baseline_run(tenant)
        if baseline_run is None:
            raise exceptions.ValidationError("Apply certified safe launch setup before comparing a launch upgrade.")
        target_ref = data.get("target_blueprint_ref") or baseline_run.blueprint_ref
        target_preview = build_launch_preview(
            tenant=tenant,
            blueprint_ref=target_ref,
            blueprint_version=data["target_blueprint_version"],
            input_payload=baseline_run.input_payload,
        )
        target_preview_payload = target_preview.as_dict()
        if target_preview.blockers:
            raise exceptions.ValidationError({"detail": "; ".join(target_preview.blockers)})
        plan = _launch_upgrade_plan(
            tenant=tenant,
            onboarding=onboarding,
            baseline_run=baseline_run,
            target_preview_payload=target_preview_payload,
        )
        requested_modules = set(data.get("requested_modules") or [])
        known_modules = {item["module_ref"] for item in plan["items"]}
        unknown_requested = sorted(requested_modules - known_modules)
        if unknown_requested:
            raise exceptions.ValidationError(
                {"requested_modules": f"These modules are not in the upgrade comparison: {', '.join(unknown_requested)}."}
            )

        started_at = timezone.now()
        finished_at = timezone.now()
        run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=target_preview.blueprint_ref,
            blueprint_version=target_preview.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.UPGRADE,
            status=TenantLaunchRunStatus.SUCCEEDED,
            requested_by_identifier=_actor_identifier(request),
            idempotency_key=data.get("idempotency_key", ""),
            started_at=started_at,
            finished_at=finished_at,
            input_payload=baseline_run.input_payload,
            plan_snapshot=target_preview_payload,
            result_payload={
                "mode": "compare",
                "requested_modules": sorted(requested_modules),
                **plan,
            },
            evidence={
                "source": "platform_launch_upgrade_compare",
                "baseline_run_id": str(baseline_run.id),
                "change_reason": data.get("change_reason", ""),
                "governance_summary": plan.get("governance_summary", {}),
            },
        )
        items = []
        for item in plan["items"]:
            status_value = TenantLaunchItemStatus.PLANNED if item["action"] in {"add", "change"} else TenantLaunchItemStatus.SKIPPED
            items.append(
                TenantLaunchSeededItem(
                    launch_run=run,
                    tenant=tenant,
                    item_key=item["module_ref"],
                    item_kind="launch_module",
                    module_ref=item["module_ref"],
                    action=TenantLaunchItemAction.PLAN if status_value == TenantLaunchItemStatus.PLANNED else TenantLaunchItemAction.NOOP,
                    status=status_value,
                    ownership_mode=(target_preview_payload and _module_payloads_by_ref(target_preview_payload).get(item["module_ref"], {})).get("ownership_mode", ""),
                    message=item["message"],
                    payload=item,
                    evidence={"source": "platform_launch_upgrade_compare", "baseline_run_id": str(baseline_run.id)},
                )
            )
        if items:
            TenantLaunchSeededItem.objects.bulk_create(items)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchUpgradeApplyView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchUpgradeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        actor_identifier = _actor_identifier(request)
        idempotency_key = data.get("idempotency_key", "")
        if idempotency_key:
            existing_run = (
                TenantLaunchRun.objects.filter(
                    tenant=tenant,
                    run_type=TenantLaunchRunType.UPGRADE,
                    idempotency_key=idempotency_key,
                )
                .prefetch_related("seeded_items")
                .order_by("-created_at")
                .first()
            )
            if existing_run:
                return response.Response(PlatformTenantLaunchRunSerializer(_serialize_launch_run(existing_run)).data)

        baseline_run = _latest_successful_baseline_run(tenant)
        if baseline_run is None:
            raise exceptions.ValidationError("Apply certified safe launch setup before applying a launch upgrade.")
        target_ref = data.get("target_blueprint_ref") or baseline_run.blueprint_ref
        target_preview = build_launch_preview(
            tenant=tenant,
            blueprint_ref=target_ref,
            blueprint_version=data["target_blueprint_version"],
            input_payload=baseline_run.input_payload,
        )
        target_preview_payload = target_preview.as_dict()
        if target_preview.blockers:
            raise exceptions.ValidationError({"detail": "; ".join(target_preview.blockers)})
        plan = _launch_upgrade_plan(
            tenant=tenant,
            onboarding=onboarding,
            baseline_run=baseline_run,
            target_preview_payload=target_preview_payload,
        )
        requested_modules = set(data.get("requested_modules") or [])
        known_modules = {item["module_ref"] for item in plan["items"]}
        unknown_requested = sorted(requested_modules - known_modules)
        if unknown_requested:
            raise exceptions.ValidationError(
                {"requested_modules": f"These modules are not in the upgrade comparison: {', '.join(unknown_requested)}."}
            )
        modules_to_apply = requested_modules or set(plan["actionable_modules"])
        disallowed_modules = sorted(modules_to_apply - set(plan["actionable_modules"]))
        if disallowed_modules:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": f"These modules are not safe actionable upgrade modules: {', '.join(disallowed_modules)}.",
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )
        if plan["blockers"]:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": "; ".join(plan["blockers"]),
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )
        change_reason = data.get("change_reason", "").strip()
        selected_customer_owned_changes = [
            item["module_ref"]
            for item in plan["items"]
            if item["module_ref"] in modules_to_apply and item["customer_owned_change"]
        ]
        if selected_customer_owned_changes and not change_reason:
            return response.Response(
                PlatformMutationResultSerializer(
                    {
                        "detail": (
                            "A change reason is required to upgrade customer-owned launch modules: "
                            f"{', '.join(sorted(selected_customer_owned_changes))}."
                        ),
                        "tenant_status": tenant.status,
                        "onboarding_status": tenant.onboarding_status,
                    }
                ).data,
                status=status.HTTP_409_CONFLICT,
            )

        target_module_payloads = _module_payloads_by_ref(target_preview_payload)
        started_at = timezone.now()
        upgrade_run = TenantLaunchRun.objects.create(
            onboarding=onboarding,
            tenant=tenant,
            blueprint_ref=target_preview.blueprint_ref,
            blueprint_version=target_preview.blueprint_version,
            subscription_plan=tenant.subscription_plan,
            run_type=TenantLaunchRunType.UPGRADE,
            status=TenantLaunchRunStatus.RUNNING,
            requested_by_identifier=actor_identifier,
            idempotency_key=idempotency_key,
            started_at=started_at,
            input_payload=baseline_run.input_payload,
            plan_snapshot=target_preview_payload,
            evidence={
                "source": "platform_launch_upgrade_apply",
                "baseline_run_id": str(baseline_run.id),
                "change_reason": change_reason,
                "target_blueprint_ref": target_preview.blueprint_ref,
                "target_blueprint_version": target_preview.blueprint_version,
                "governance_summary": plan.get("governance_summary", {}),
            },
        )

        results = []
        errors = []
        upgraded_modules = set()
        for module_ref in sorted(modules_to_apply):
            module_payload = target_module_payloads.get(module_ref, {"ref": module_ref})
            try:
                result = SEEDER_BY_MODULE[module_ref](onboarding, baseline_run.input_payload)
                results.append(result.as_dict())
                upgraded_modules.add(module_ref)
                TenantLaunchSeededItem.objects.create(
                    launch_run=upgrade_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=TenantLaunchItemAction.UPDATE if result.existing else TenantLaunchItemAction.CREATE,
                    status=TenantLaunchItemStatus.SUCCEEDED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=result.message,
                    payload={**module_payload, "result": result.as_dict()},
                    evidence={
                        "source": "platform_launch_upgrade_apply",
                        "baseline_run_id": str(baseline_run.id),
                        "change_reason": change_reason,
                        "governance": _module_governance_evidence(module_payload),
                    },
                )
            except Exception as exc:
                errors.append({"module_ref": module_ref, "message": str(exc)})
                TenantLaunchSeededItem.objects.create(
                    launch_run=upgrade_run,
                    tenant=tenant,
                    item_key=module_ref,
                    item_kind="launch_module",
                    module_ref=module_ref,
                    action=TenantLaunchItemAction.UPDATE,
                    status=TenantLaunchItemStatus.FAILED,
                    ownership_mode=module_payload.get("ownership_mode", ""),
                    message=str(exc)[:255],
                    payload=module_payload,
                    evidence={
                        "source": "platform_launch_upgrade_apply",
                        "baseline_run_id": str(baseline_run.id),
                        "change_reason": change_reason,
                        "governance": _module_governance_evidence(module_payload),
                    },
                )

        for module_ref, module_payload in target_module_payloads.items():
            if module_ref in upgraded_modules or upgrade_run.seeded_items.filter(item_key=module_ref).exists():
                continue
            TenantLaunchSeededItem.objects.create(
                launch_run=upgrade_run,
                tenant=tenant,
                item_key=module_ref,
                item_kind="launch_module",
                module_ref=module_ref,
                action=TenantLaunchItemAction.NOOP,
                status=TenantLaunchItemStatus.SKIPPED,
                ownership_mode=module_payload.get("ownership_mode", ""),
                message="Module was not selected for upgrade apply.",
                payload=module_payload,
                evidence={
                    "source": "platform_launch_upgrade_apply",
                    "baseline_run_id": str(baseline_run.id),
                    "governance": _module_governance_evidence(module_payload),
                },
            )

        finished_at = timezone.now()
        upgrade_run.status = TenantLaunchRunStatus.FAILED if errors else TenantLaunchRunStatus.SUCCEEDED
        upgrade_run.finished_at = finished_at
        upgrade_run.result_payload = {
            "mode": "apply",
            "upgraded_modules": sorted(upgraded_modules),
            "target_blueprint_ref": target_preview.blueprint_ref,
            "target_blueprint_version": target_preview.blueprint_version,
            "governance_summary": plan.get("governance_summary", {}),
            "results": results,
        }
        upgrade_run.errors = errors
        upgrade_run.save(update_fields=["status", "finished_at", "result_payload", "errors", "updated_at"])

        if not errors:
            onboarding.launch_blueprint_ref = target_preview.blueprint_ref
            onboarding.launch_blueprint_version = target_preview.blueprint_version
            onboarding.launch_preview_payload = target_preview_payload
            onboarding.launch_subscription_plan_snapshot = tenant.subscription_plan
            onboarding.launch_status_notes = "Launch blueprint upgrade applied."
            onboarding.save(
                update_fields=[
                    "launch_blueprint_ref",
                    "launch_blueprint_version",
                    "launch_preview_payload",
                    "launch_subscription_plan_snapshot",
                    "launch_status_notes",
                    "updated_at",
                ]
            )
            add_onboarding_event(
                onboarding,
                event_type="launch_blueprint_upgraded",
                summary=f"Upgraded launch blueprint baseline for {tenant.code}.",
                actor_identifier=actor_identifier,
                payload={
                    "launch_run_id": str(upgrade_run.id),
                    "baseline_run_id": str(baseline_run.id),
                    "target_blueprint_ref": target_preview.blueprint_ref,
                    "target_blueprint_version": target_preview.blueprint_version,
                    "upgraded_modules": sorted(upgraded_modules),
                    "change_reason": change_reason,
                },
            )

        upgrade_run = TenantLaunchRun.objects.prefetch_related("seeded_items").get(id=upgrade_run.id)
        return response.Response(
            PlatformTenantLaunchRunSerializer(_serialize_launch_run(upgrade_run)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformTenantLaunchHandoffView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformTenantLaunchHandoffRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        handoff_notes = serializer.validated_data["handoff_notes"].strip()
        latest_apply = _latest_successful_apply_run(tenant)
        if latest_apply is None:
            raise exceptions.ValidationError("Certified safe launch setup must be applied before customer handoff.")
        if onboarding.launch_readiness_status not in {
            LaunchReadinessStatus.STAGE_READY,
            LaunchReadinessStatus.CUSTOMER_READY,
            LaunchReadinessStatus.PAYROLL_REHEARSAL_READY,
            LaunchReadinessStatus.PRODUCTION_READY,
        }:
            raise exceptions.ValidationError("Launch readiness must be stage ready before customer handoff.")

        completed_at = timezone.now()
        onboarding.launch_readiness_status = LaunchReadinessStatus.CUSTOMER_READY
        onboarding.handoff_completed_at = completed_at
        onboarding.customer_handoff_notes = handoff_notes
        onboarding.launch_status_notes = "Customer handoff completed. Customer-owned setup can continue."
        onboarding.save(
            update_fields=[
                "launch_readiness_status",
                "handoff_completed_at",
                "customer_handoff_notes",
                "launch_status_notes",
                "updated_at",
            ]
        )
        tenant.onboarding_status = TenantOnboardingStatus.HANDOFF_READY
        tenant.save(update_fields=["onboarding_status", "updated_at"])
        set_checklist_item_status(
            onboarding,
            code="handoff_completed",
            status=ChecklistStatus.COMPLETED,
            actor_identifier=_actor_identifier(request),
        )
        add_onboarding_event(
            onboarding,
            event_type="launch_customer_handoff_completed",
            summary=f"Customer handoff completed for {tenant.code}.",
            actor_identifier=_actor_identifier(request),
            payload={
                "apply_run_id": str(latest_apply.id),
                "handoff_completed_at": completed_at.isoformat(),
                "handoff_notes": handoff_notes,
                "launch_readiness_status": onboarding.launch_readiness_status,
            },
        )
        return response.Response(PlatformTenantOnboardingSerializer(_serialize_onboarding(onboarding)).data)


class PlatformTenantAdminContactCreateView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        serializer = PlatformOnboardingAdminContactWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("is_primary", True):
            onboarding.admin_contacts.filter(is_primary=True).update(is_primary=False)
        contact = TenantOnboardingAdminContact.objects.create(
            onboarding=onboarding,
            **data,
        )
        add_onboarding_event(
            onboarding,
            event_type="admin_contact_added",
            summary=f"Added onboarding contact {contact.email}.",
            actor_identifier=_actor_identifier(request),
            payload={"contact_id": str(contact.id), "is_primary": contact.is_primary},
        )
        return response.Response(
            PlatformOnboardingAdminContactSerializer(_serialize_admin_contact(contact)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformAdminContactDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def patch(self, request, contact_id):
        contact = _get_contact_or_404(contact_id)
        serializer = PlatformOnboardingAdminContactWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        onboarding = contact.onboarding

        if data.get("is_primary"):
            onboarding.admin_contacts.exclude(id=contact.id).filter(is_primary=True).update(is_primary=False)
        for field, value in data.items():
            setattr(contact, field, value)
        contact.save(update_fields=list(data.keys()) + ["updated_at"])
        add_onboarding_event(
            onboarding,
            event_type="admin_contact_updated",
            summary=f"Updated onboarding contact {contact.email}.",
            actor_identifier=_actor_identifier(request),
            payload={"contact_id": str(contact.id), "fields": sorted(list(data.keys()))},
        )
        return response.Response(PlatformOnboardingAdminContactSerializer(_serialize_admin_contact(contact)).data)


class PlatformAdminContactProvisionView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, contact_id):
        contact = _get_contact_or_404(contact_id)
        serializer = PlatformProvisionAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, membership, role, generated_password = provision_tenant_admin_contact(
            contact,
            username=serializer.validated_data["username"],
            role_code=serializer.validated_data["role_code"],
            role_name=serializer.validated_data.get("role_name", ""),
            password=serializer.validated_data.get("password", ""),
            must_change_password=serializer.validated_data.get("must_change_password", True),
            is_user_active=serializer.validated_data.get("is_user_active", True),
            membership_status=serializer.validated_data.get("membership_status", "active"),
            actor_identifier=_actor_identifier(request),
        )
        return response.Response(
            PlatformProvisionAdminResultSerializer(
                {
                    "contact_id": contact.id,
                    "user_id": user.id,
                    "membership_id": membership.id,
                    "role_code": role.code,
                    "generated_password": generated_password if "password" not in serializer.validated_data or not serializer.validated_data["password"] else "",
                    "provisioning_status": AdminProvisioningStatus.PROVISIONED,
                }
            ).data
        )


class PlatformTenantMarkBaselinePublishedView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        if not tenant.policy_pack_adoptions.filter(status="adopted").exists():
            raise exceptions.ValidationError("At least one adopted policy pack is required before baseline publication can be confirmed.")
        latest_adoption = tenant.policy_pack_adoptions.filter(status="adopted").order_by("-adopted_at", "-created_at").first()
        if onboarding.baseline_published_at is None and latest_adoption:
            onboarding.baseline_published_at = latest_adoption.adopted_at or timezone.now()
            onboarding.save(update_fields=["baseline_published_at", "updated_at"])
        if tenant.onboarding_status != TenantOnboardingStatus.BASELINE_PUBLISHED:
            tenant.onboarding_status = TenantOnboardingStatus.BASELINE_PUBLISHED
            tenant.save(update_fields=["onboarding_status", "updated_at"])
        return response.Response(
            PlatformMutationResultSerializer(
                {
                    "detail": "Baseline publication confirmed from adopted policy packs.",
                    "tenant_status": tenant.status,
                    "onboarding_status": tenant.onboarding_status,
                }
            ).data
        )


class PlatformTenantMarkHandoffReadyView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        primary_contact = onboarding.admin_contacts.filter(is_primary=True).first()
        if onboarding.baseline_published_at is None:
            raise exceptions.ValidationError("Baseline must be published before handoff is marked ready.")
        if not primary_contact or not primary_contact.membership_id:
            raise exceptions.ValidationError("Primary tenant admin must be provisioned before handoff is marked ready.")
        if primary_contact.user and not primary_contact.user.is_active:
            raise exceptions.ValidationError("Primary tenant admin login must be active before handoff is marked ready.")
        if primary_contact.membership and primary_contact.membership.status in {MembershipStatus.SUSPENDED, MembershipStatus.REVOKED}:
            raise exceptions.ValidationError("Primary tenant admin membership must be active or invited before handoff is marked ready.")
        onboarding.handoff_completed_at = timezone.now()
        onboarding.save(update_fields=["handoff_completed_at", "updated_at"])
        tenant.onboarding_status = TenantOnboardingStatus.HANDOFF_READY
        tenant.save(update_fields=["onboarding_status", "updated_at"])
        set_checklist_item_status(
            onboarding,
            code="handoff_completed",
            status=ChecklistStatus.COMPLETED,
            actor_identifier=_actor_identifier(request),
        )
        add_onboarding_event(
            onboarding,
            event_type="handoff_marked_ready",
            summary=f"Handoff marked ready for {tenant.code}.",
            actor_identifier=_actor_identifier(request),
            payload={"primary_contact_id": str(primary_contact.id)},
        )
        return response.Response(
            PlatformMutationResultSerializer(
                {
                    "detail": "Tenant handoff marked ready.",
                    "tenant_status": tenant.status,
                    "onboarding_status": tenant.onboarding_status,
                }
            ).data
        )


class PlatformTenantActivateView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        tenant = _get_tenant_or_404(item_id)
        onboarding = tenant.onboarding_record
        primary_contact = onboarding.admin_contacts.filter(is_primary=True).first()
        if tenant.onboarding_status != TenantOnboardingStatus.HANDOFF_READY:
            raise exceptions.ValidationError("Tenant handoff must be ready before activation.")
        if not primary_contact or primary_contact.provisioning_status not in {
            AdminProvisioningStatus.PROVISIONED,
            AdminProvisioningStatus.INVITED,
            AdminProvisioningStatus.ACTIVATED,
        }:
            raise exceptions.ValidationError("Primary tenant admin must be provisioned before activation.")
        if primary_contact.user and not primary_contact.user.is_active:
            raise exceptions.ValidationError("Primary tenant admin login must be active before activation.")
        if primary_contact.membership and primary_contact.membership.status in {MembershipStatus.SUSPENDED, MembershipStatus.REVOKED}:
            raise exceptions.ValidationError("Primary tenant admin membership must be active or invited before activation.")
        tenant.status = TenantStatus.ACTIVE
        tenant.onboarding_status = TenantOnboardingStatus.ACTIVE
        tenant.onboarding_completed_at = timezone.now()
        tenant.activated_by_identifier = _actor_identifier(request)
        tenant.save(
            update_fields=[
                "status",
                "onboarding_status",
                "onboarding_completed_at",
                "activated_by_identifier",
                "updated_at",
            ]
        )
        add_onboarding_event(
            onboarding,
            event_type="tenant_activated",
            summary=f"Tenant {tenant.code} activated.",
            actor_identifier=_actor_identifier(request),
            payload={
                "tenant_id": str(tenant.id),
                "tenant_code": tenant.code,
                "tenant_status": tenant.status,
                "tenant_onboarding_status": tenant.onboarding_status,
                "activated_by_identifier": tenant.activated_by_identifier,
                "onboarding_completed_at": tenant.onboarding_completed_at.isoformat() if tenant.onboarding_completed_at else "",
            },
        )
        return response.Response(
            PlatformMutationResultSerializer(
                {
                    "detail": "Tenant activated.",
                    "tenant_status": tenant.status,
                    "onboarding_status": tenant.onboarding_status,
                }
            ).data
        )
