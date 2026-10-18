from django.core.exceptions import PermissionDenied as DjangoPermissionDenied, ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import exceptions, response, serializers, status
from rest_framework.views import APIView

from apps.common.selectors import get_default_membership_for_user
from apps.iam.permission_checks import get_user_tenant_permission_keys
from apps.organizations.models import LegalEntity
from apps.tenant_onboarding.api_views import IsPlatformStaff
from apps.tenants.governance import (
    RECORD_CATEGORIES,
    approve_governance_request,
    create_governance_request,
    place_legal_hold,
    release_legal_hold,
    retention_preview,
)
from apps.tenants.models import (
    DataGovernanceRequest,
    GovernanceRequestStatus,
    GovernanceRequestType,
    LegalHold,
    RetentionPolicy,
    RetentionPolicyStatus,
    Tenant,
)
from apps.tenants.tasks import execute_data_governance_request_task


def _validation_error(exc):
    if hasattr(exc, "message_dict"):
        return exceptions.ValidationError(exc.message_dict)
    return exceptions.ValidationError({"detail": exc.messages if hasattr(exc, "messages") else str(exc)})


def serialize_policy(item):
    return {
        "id": str(item.id), "tenant_id": str(item.tenant_id) if item.tenant_id else None,
        "legal_entity_id": str(item.legal_entity_id) if item.legal_entity_id else None,
        "jurisdiction": item.jurisdiction, "record_category": item.record_category,
        "retention_days": item.retention_days, "lifecycle_date_field": item.lifecycle_date_field,
        "status": item.status, "effective_from": item.effective_from, "effective_to": item.effective_to,
        "legal_basis_ref": item.legal_basis_ref, "approval_ref": item.approval_ref,
    }


def serialize_hold(item):
    return {
        "id": str(item.id), "tenant_id": str(item.tenant_id), "legal_entity_id": str(item.legal_entity_id) if item.legal_entity_id else None,
        "record_category": item.record_category, "resource_type": item.resource_type,
        "resource_id": str(item.resource_id) if item.resource_id else None, "status": item.status,
        "reason": item.reason, "authority_ref": item.authority_ref,
        "placed_at": item.placed_at, "released_at": item.released_at, "release_reason": item.release_reason,
    }


def serialize_request(item):
    return {
        "id": str(item.id), "tenant_id": str(item.tenant_id), "request_type": item.request_type,
        "status": item.status, "scope": item.scope, "reason": item.reason,
        "requested_by_id": str(item.requested_by_id), "approved_by_id": str(item.approved_by_id) if item.approved_by_id else None,
        "approved_at": item.approved_at, "idempotency_key": item.idempotency_key,
        "preview_snapshot": item.preview_snapshot, "result_snapshot": item.result_snapshot,
        "attempt_count": item.attempt_count, "last_error_code": item.last_error_code,
        "last_error_message": item.last_error_message, "completed_at": item.completed_at,
        "created_at": item.created_at, "updated_at": item.updated_at,
    }


class TenantGovernanceMixin:
    required_permission = "tenant.retention.view"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        membership = get_default_membership_for_user(request.user)
        if not membership:
            raise exceptions.PermissionDenied("No active tenant membership found.")
        if self.required_permission not in get_user_tenant_permission_keys(request.user, membership.tenant):
            raise exceptions.PermissionDenied("Required data-governance permission is missing.")
        self.membership = membership


class TenantRetentionWorkspaceView(TenantGovernanceMixin, APIView):
    def get(self, request):
        tenant = self.membership.tenant
        return response.Response({
            "record_categories": list(RECORD_CATEGORIES),
            "policies": [serialize_policy(item) for item in RetentionPolicy.objects.filter(tenant__in=[tenant, None]).order_by("record_category", "-effective_from")],
            "legal_holds": [serialize_hold(item) for item in LegalHold.objects.filter(tenant=tenant).order_by("-placed_at")],
            "requests": [serialize_request(item) for item in DataGovernanceRequest.objects.filter(tenant=tenant).order_by("-created_at")[:100]],
            "preview": retention_preview(tenant),
        })


class TenantGovernanceRequestView(TenantGovernanceMixin, APIView):
    required_permission = "tenant.data_export.request"

    def post(self, request):
        request_type = request.data.get("request_type")
        required = "tenant.data_erasure.request" if request_type == GovernanceRequestType.ERASURE else "tenant.data_export.request"
        if required not in get_user_tenant_permission_keys(request.user, self.membership.tenant):
            raise exceptions.PermissionDenied("Required request permission is missing.")
        try:
            item, created = create_governance_request(
                tenant=self.membership.tenant, actor=request.user, request_type=request_type,
                reason=str(request.data.get("reason") or ""), scope=request.data.get("scope") or {},
                idempotency_key=str(request.data.get("idempotency_key") or ""),
            )
        except DjangoValidationError as exc:
            raise _validation_error(exc)
        return response.Response(serialize_request(item), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PlatformRetentionWorkspaceView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        tenant_id = request.query_params.get("tenant_id")
        selected_tenant = Tenant.objects.filter(id=tenant_id).first() if tenant_id else None
        policies = RetentionPolicy.objects.all()
        holds = LegalHold.objects.select_related("tenant")
        requests = DataGovernanceRequest.objects.select_related("tenant")
        if tenant_id:
            policies = policies.filter(tenant_id=tenant_id)
            holds = holds.filter(tenant_id=tenant_id)
            requests = requests.filter(tenant_id=tenant_id)
        return response.Response({
            "record_categories": list(RECORD_CATEGORIES),
            "policies": [serialize_policy(item) for item in policies.order_by("record_category", "-effective_from")[:200]],
            "legal_holds": [serialize_hold(item) for item in holds.order_by("-placed_at")[:200]],
            "requests": [serialize_request(item) for item in requests.order_by("-created_at")[:200]],
            "preview": retention_preview(selected_tenant) if selected_tenant else None,
        })

    def post(self, request):
        tenant = Tenant.objects.filter(id=request.data.get("tenant_id")).first() if request.data.get("tenant_id") else None
        legal_entity_id = request.data.get("legal_entity_id") or None
        if legal_entity_id and (not tenant or not LegalEntity.objects.filter(tenant=tenant, id=legal_entity_id).exists()):
            raise exceptions.ValidationError({"legal_entity_id": "Legal entity must belong to the selected tenant."})
        requested_status = request.data.get("status", RetentionPolicyStatus.DRAFT)
        approval_ref = str(request.data.get("approval_ref") or "")
        if requested_status == RetentionPolicyStatus.APPROVED and not approval_ref:
            raise exceptions.ValidationError({"approval_ref": "Approved policies require an approval reference."})
        try:
            item = RetentionPolicy.objects.create(
                tenant=tenant, legal_entity_id=legal_entity_id,
                jurisdiction=request.data.get("jurisdiction"), record_category=request.data.get("record_category"),
                retention_days=request.data.get("retention_days"), lifecycle_date_field=request.data.get("lifecycle_date_field"),
                status=requested_status, effective_from=request.data.get("effective_from"), effective_to=request.data.get("effective_to") or None,
                legal_basis_ref=request.data.get("legal_basis_ref"), approval_ref=approval_ref,
                approved_by_identifier=request.user.username if requested_status == RetentionPolicyStatus.APPROVED else "",
                approved_at=timezone.now() if requested_status == RetentionPolicyStatus.APPROVED else None,
            )
        except (IntegrityError, ValueError, TypeError) as exc:
            raise exceptions.ValidationError({"detail": "Retention policy scope or field values conflict with an existing policy."}) from exc
        return response.Response(serialize_policy(item), status=status.HTTP_201_CREATED)


class PlatformLegalHoldView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request):
        tenant = Tenant.objects.filter(id=request.data.get("tenant_id")).first()
        if not tenant:
            raise exceptions.ValidationError({"tenant_id": "Tenant not found."})
        try:
            hold = place_legal_hold(
                tenant=tenant, actor=request.user, reason=str(request.data.get("reason") or ""),
                authority_ref=str(request.data.get("authority_ref") or ""),
                legal_entity_id=request.data.get("legal_entity_id") or None,
                record_category=str(request.data.get("record_category") or ""),
                resource_type=str(request.data.get("resource_type") or ""), resource_id=request.data.get("resource_id") or None,
            )
        except DjangoValidationError as exc:
            raise _validation_error(exc)
        return response.Response(serialize_hold(hold), status=status.HTTP_201_CREATED)


class PlatformLegalHoldReleaseView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request, item_id):
        try:
            item = release_legal_hold(item_id, actor=request.user, reason=str(request.data.get("reason") or ""))
        except LegalHold.DoesNotExist:
            return response.Response({"detail": "Legal hold not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoPermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc))
        except DjangoValidationError as exc:
            raise _validation_error(exc)
        return response.Response(serialize_hold(item))


class PlatformGovernanceRequestActionView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request, item_id):
        action = request.data.get("action")
        try:
            if action == "approve":
                item, _ = approve_governance_request(item_id, actor=request.user)
            elif action == "dispatch":
                item = DataGovernanceRequest.objects.get(id=item_id)
                if item.status not in {GovernanceRequestStatus.APPROVED, GovernanceRequestStatus.FAILED}:
                    raise exceptions.ValidationError({"detail": "Only approved or failed requests can be dispatched."})
                item.status = GovernanceRequestStatus.QUEUED
                item.save(update_fields=["status", "updated_at"])
                transaction.on_commit(lambda: execute_data_governance_request_task.delay(str(item.id)))
            else:
                raise exceptions.ValidationError({"action": "Use approve or dispatch."})
        except DataGovernanceRequest.DoesNotExist:
            return response.Response({"detail": "Governance request not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoPermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc))
        except DjangoValidationError as exc:
            raise _validation_error(exc)
        return response.Response(serialize_request(item))


class PlatformRetentionPreviewView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request):
        tenant = Tenant.objects.filter(id=request.data.get("tenant_id")).first()
        if not tenant:
            raise exceptions.ValidationError({"tenant_id": "Tenant not found."})
        return response.Response(retention_preview(tenant, scope=request.data.get("scope") or {}))
