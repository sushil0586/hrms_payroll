"""Platform-side tenant onboarding API views."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import exceptions, permissions, response, status
from rest_framework.views import APIView

from apps.common.tenant_launch.preview import build_launch_preview
from apps.common.tenant_launch.registry import get_blueprint, list_blueprints, serialize_blueprint
from apps.common.tenant_launch.seeders import SAFE_APPLY_MODULES, SEEDER_BY_MODULE
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
    PlatformTenantLaunchHandoffRequestSerializer,
    PlatformTenantLaunchPreviewRequestSerializer,
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
                    evidence={"source": "platform_launch_safe_apply", "preview_run_id": str(preview_run.id)},
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
                    evidence={"source": "platform_launch_safe_apply", "preview_run_id": str(preview_run.id)},
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
                evidence={"source": "platform_launch_safe_apply", "preview_run_id": str(preview_run.id)},
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
