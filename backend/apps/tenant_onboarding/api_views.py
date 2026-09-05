"""Platform-side tenant onboarding API views."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import exceptions, permissions, response, status
from rest_framework.views import APIView

from apps.tenant_onboarding.api_serializers import (
    PlatformMutationResultSerializer,
    PlatformOnboardingAdminContactSerializer,
    PlatformOnboardingAdminContactWriteSerializer,
    PlatformProvisionAdminResultSerializer,
    PlatformProvisionAdminSerializer,
    PlatformTenantListItemSerializer,
    PlatformTenantOnboardingSerializer,
    PlatformTenantOnboardingWriteSerializer,
    PlatformTenantWriteSerializer,
)
from apps.tenant_onboarding.models import (
    AdminProvisioningStatus,
    ChecklistStatus,
    TenantOnboarding,
    TenantOnboardingAdminContact,
)
from apps.tenant_onboarding.services import (
    add_onboarding_event,
    provision_tenant_admin_contact,
    set_checklist_item_status,
)
from apps.tenants.models import Tenant, TenantDomain, TenantOnboardingStatus, TenantStatus


class IsPlatformStaff(permissions.BasePermission):
    message = "Platform staff access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


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
                "membership_id": contact.membership_id,
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
            PlatformOnboardingAdminContactSerializer(
                {
                    "id": contact.id,
                    "full_name": contact.full_name,
                    "email": contact.email,
                    "phone_number": contact.phone_number,
                    "job_title": contact.job_title,
                    "is_primary": contact.is_primary,
                    "provisioning_status": contact.provisioning_status,
                    "user_id": contact.user_id,
                    "membership_id": contact.membership_id,
                    "invited_at": contact.invited_at,
                    "first_login_at": contact.first_login_at,
                    "notes": contact.notes,
                    "created_at": contact.created_at,
                    "updated_at": contact.updated_at,
                }
            ).data,
            status=status.HTTP_201_CREATED,
        )


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
