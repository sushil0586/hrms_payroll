"""Tenant-safe, read-only evidence API for the frozen staging onboarding batch."""

from __future__ import annotations

import hashlib
import logging
import re

from django.conf import settings
from django.db import connection, transaction
from rest_framework import exceptions, permissions, response, serializers, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.views import APIView

from apps.iam.models import MembershipStatus, TenantMembership
from apps.tenant_onboarding.models import TenantOnboardingAdminContact, TenantOnboardingEvent
from apps.tenants.models import SubscriptionPlan, Tenant


logger = logging.getLogger("hrms.security.staging_evidence")
PERMISSION_KEY = "platform.qa_evidence.view"
FROZEN_SCENARIO_IDS = {f"STG-E2E-010{number}" for number in range(1, 7)}
RUN_ID_PATTERN = re.compile(r"^stg1-[a-z0-9][a-z0-9-]{5,55}$")
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
MAX_CONTACT_IDS = 10


def _actor_identifier(request) -> str:
    user = getattr(request, "user", None)
    value = getattr(user, "username", "") or getattr(user, "email", "") or "anonymous"
    return str(value)


def _audit(request, *, outcome: str, reason: str, run_id: str = "", scenario_id: str = "", tenant_id: str = "") -> None:
    logger.info(
        "staging_evidence_access",
        extra={
            "security_event": "staging_evidence_access",
            "outcome": outcome,
            "reason": reason,
            "actor": _actor_identifier(request),
            "run_id": run_id,
            "scenario_id": scenario_id,
            "tenant_id": tenant_id,
            "request_path": request.path,
        },
    )


class IsConfiguredStagingEvidenceActor(permissions.BasePermission):
    message = "Staging QA evidence permission is required."

    def has_permission(self, request, view):
        user = request.user
        actors = {str(value).strip().lower() for value in getattr(settings, "HRMS_STAGING_EVIDENCE_API_ACTORS", ()) if str(value).strip()}
        actor = (getattr(user, "username", "") or "").strip().lower()
        allowed = bool(user and user.is_authenticated and user.is_active and user.is_superuser and actors and actor in actors)
        if not allowed:
            _audit(request, outcome="denied", reason="identity_or_permission")
        return allowed


class StagingOnboardingEvidenceQuerySerializer(serializers.Serializer):
    run_id = serializers.RegexField(RUN_ID_PATTERN)
    scenario_id = serializers.ChoiceField(choices=sorted(FROZEN_SCENARIO_IDS))
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.RegexField(re.compile(r"^pw-qa-stg1-[a-z0-9-]+$"), max_length=80)
    admin_user_id = serializers.UUIDField(required=False)
    admin_membership_id = serializers.UUIDField(required=False)
    admin_contact_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, max_length=MAX_CONTACT_IDS,
    )
    denied_tenant_code = serializers.RegexField(
        re.compile(r"^pw-qa-stg1-[a-z0-9-]+-denied$"), required=False, max_length=90,
    )

    def validate(self, attrs):
        expected_code = f"pw-qa-{attrs['run_id']}"
        if attrs["tenant_code"] != expected_code:
            raise serializers.ValidationError({"tenant_code": "Tenant code is not owned by this run."})
        scenario_id = attrs["scenario_id"]
        if scenario_id in {"STG-E2E-0103", "STG-E2E-0105", "STG-E2E-0106"}:
            for field in ("admin_user_id", "admin_membership_id"):
                if not attrs.get(field):
                    raise serializers.ValidationError({field: "This identifier is required for the scenario."})
        if scenario_id == "STG-E2E-0103" and not attrs.get("admin_contact_ids"):
            raise serializers.ValidationError({"admin_contact_ids": "At least one exact contact identifier is required."})
        if scenario_id == "STG-E2E-0106" and not attrs.get("denied_tenant_code"):
            raise serializers.ValidationError({"denied_tenant_code": "The rejected tenant code is required."})
        return attrs


def _parse_query_params(request) -> dict:
    data = request.query_params.copy()
    contact_values = request.query_params.getlist("admin_contact_id")
    if contact_values:
        data.setlist("admin_contact_ids", contact_values)
    serializer = StagingOnboardingEvidenceQuerySerializer(data=data)
    if not serializer.is_valid():
        _audit(request, outcome="denied", reason="invalid_query")
        raise exceptions.ValidationError(serializer.errors)
    return serializer.validated_data


def _require_scoped_resources(*, tenant: Tenant, query: dict) -> tuple[TenantMembership | None, list[TenantOnboardingAdminContact]]:
    membership = None
    if query.get("admin_membership_id"):
        membership = (
            TenantMembership.objects.filter(
                id=query["admin_membership_id"],
                tenant_id=tenant.id,
                user_id=query.get("admin_user_id"),
            )
            .prefetch_related("membership_roles__role")
            .first()
        )
        if membership is None:
            raise exceptions.PermissionDenied("Administrator identifiers are outside the owned tenant scope.")

    contact_ids = query.get("admin_contact_ids") or []
    contacts = list(
        TenantOnboardingAdminContact.objects.filter(
            id__in=contact_ids,
            onboarding__tenant_id=tenant.id,
        ).only("id", "user_id", "membership_id")
    )
    if len(contacts) != len(set(contact_ids)):
        raise exceptions.PermissionDenied("Contact identifiers are outside the owned tenant scope.")
    return membership, contacts


def _scenario_assertions(*, tenant: Tenant, query: dict, membership, contacts) -> dict[str, bool]:
    scenario_id = query["scenario_id"]
    event_types = set(
        TenantOnboardingEvent.objects.filter(onboarding__tenant_id=tenant.id).values_list("event_type", flat=True)
    )
    if scenario_id == "STG-E2E-0101":
        return {
            "owned_sandbox_tenant": tenant.is_sandbox,
            "enterprise_entitlement": tenant.subscription_plan == SubscriptionPlan.ENTERPRISE,
            "tenant_created_audit": "tenant_created" in event_types,
            "one_primary_domain": tenant.domains.filter(is_primary=True).count() == 1,
        }
    if scenario_id == "STG-E2E-0102":
        return {"single_tenant_code": Tenant.objects.filter(code__iexact=tenant.code).count() == 1}
    if scenario_id == "STG-E2E-0103":
        provisioned = [item for item in contacts if item.user_id and item.membership_id]
        unprovisioned = [item for item in contacts if not item.user_id and not item.membership_id]
        return {
            "one_owned_admin_membership": membership is not None,
            "one_provisioned_contact": len(provisioned) == 1,
            "duplicate_contact_unprovisioned": len(unprovisioned) >= 1,
            "first_admin_audit": "first_admin_provisioned" in event_types,
        }
    if scenario_id == "STG-E2E-0104":
        return {
            "tenant_active": tenant.status == "active",
            "enterprise_entitlement": tenant.subscription_plan == SubscriptionPlan.ENTERPRISE,
            "tenant_updated_audit": "tenant_updated" in event_types,
        }
    if scenario_id == "STG-E2E-0105":
        role_codes = {
            link.role.code for link in membership.membership_roles.all()
        } if membership else set()
        return {
            "membership_active": bool(membership and membership.status == MembershipStatus.ACTIVE),
            "membership_default": bool(membership and membership.is_default),
            "tenant_admin_role": "tenant-admin" in role_codes,
        }
    return {
        "denied_tenant_absent": not Tenant.objects.filter(code=query["denied_tenant_code"]).exists(),
        "admin_has_no_foreign_membership": not TenantMembership.objects.filter(
            user_id=query.get("admin_user_id")
        ).exclude(tenant_id=tenant.id).exists(),
    }


class PlatformStagingOnboardingEvidenceView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsConfiguredStagingEvidenceActor]
    http_method_names = ["get", "head", "options"]

    def get(self, request):
        if getattr(settings, "HRMS_ENVIRONMENT", "") != "staging" or not getattr(settings, "HRMS_STAGING_EVIDENCE_API_ENABLED", False):
            _audit(request, outcome="denied", reason="disabled")
            raise exceptions.NotFound()

        configured_fingerprint = str(getattr(settings, "HRMS_STAGING_ENVIRONMENT_FINGERPRINT", ""))
        supplied_fingerprint = request.headers.get("X-HRMS-Environment-Fingerprint", "")
        manifest_hash = request.headers.get("X-HRMS-Manifest-SHA256", "").lower()
        if not configured_fingerprint or supplied_fingerprint != configured_fingerprint:
            _audit(request, outcome="denied", reason="fingerprint")
            raise exceptions.PermissionDenied("Environment fingerprint is missing or mismatched.")
        if not SHA256_PATTERN.fullmatch(manifest_hash):
            _audit(request, outcome="denied", reason="manifest_hash")
            raise exceptions.ValidationError({"manifest_sha256": "A valid manifest SHA-256 is required."})

        query = _parse_query_params(request)
        tenant = Tenant.objects.filter(
            id=query["tenant_id"], code=query["tenant_code"], is_sandbox=True,
        ).first()
        if tenant is None:
            _audit(
                request, outcome="denied", reason="tenant_scope", run_id=query["run_id"],
                scenario_id=query["scenario_id"], tenant_id=str(query["tenant_id"]),
            )
            raise exceptions.PermissionDenied("Tenant identifiers are outside the approved run scope.")

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("SET TRANSACTION READ ONLY")
                membership, contacts = _require_scoped_resources(tenant=tenant, query=query)
                assertions = _scenario_assertions(
                    tenant=tenant, query=query, membership=membership, contacts=contacts,
                )
        except exceptions.PermissionDenied:
            _audit(
                request, outcome="denied", reason="resource_scope", run_id=query["run_id"],
                scenario_id=query["scenario_id"], tenant_id=str(tenant.id),
            )
            raise

        payload = {
            "schema_version": 1,
            "permission": PERMISSION_KEY,
            "run_id": query["run_id"],
            "scenario_id": query["scenario_id"],
            "environment_fingerprint_sha256": hashlib.sha256(configured_fingerprint.encode("utf-8")).hexdigest(),
            "manifest_sha256": manifest_hash,
            "tenant": {
                "id": str(tenant.id),
                "code": tenant.code,
                "status": tenant.status,
                "subscription_plan": tenant.subscription_plan,
                "sandbox": tenant.is_sandbox,
            },
            "assertions": assertions,
            "passed": all(assertions.values()),
        }
        _audit(
            request, outcome="allowed", reason="evidence_collected", run_id=query["run_id"],
            scenario_id=query["scenario_id"], tenant_id=str(tenant.id),
        )
        return response.Response(payload, status=status.HTTP_200_OK)
