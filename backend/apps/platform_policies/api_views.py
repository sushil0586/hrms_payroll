"""Platform policy pack API views."""

from django.db import transaction
from rest_framework import exceptions, permissions, response, status
from rest_framework.views import APIView

from apps.platform_policies.api_serializers import (
    PlatformPolicyPackListItemSerializer,
    PlatformPolicyPackPublishSerializer,
    PlatformPolicyPackWriteSerializer,
    TenantPolicyPackAdoptionSerializer,
    TenantPolicyPackAdoptionWriteSerializer,
)
from apps.platform_policies.models import PlatformPolicyPack
from apps.platform_policies.services import adopt_policy_pack_for_tenant, mark_policy_pack_published
from apps.tenants.models import Tenant


class IsPlatformStaff(permissions.BasePermission):
    message = "Platform admin access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_superuser)


def _actor_identifier(request) -> str:
    return request.user.username or request.user.email or str(request.user.id)


def _get_policy_pack_or_404(item_id):
    try:
        return PlatformPolicyPack.objects.get(id=item_id)
    except PlatformPolicyPack.DoesNotExist as exc:
        raise exceptions.NotFound("Policy pack not found.") from exc


def _get_tenant_or_404(tenant_id):
    try:
        return Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist as exc:
        raise exceptions.ValidationError({"tenant_id": "Tenant not found."}) from exc


def _serialize_policy_pack(item: PlatformPolicyPack) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "domain": item.domain,
        "country_code": item.country_code,
        "industry_tag": item.industry_tag,
        "description": item.description,
        "status": item.status,
        "version": item.version,
        "is_active": item.is_active,
        "published_at": item.published_at,
        "published_by_identifier": item.published_by_identifier,
        "item_count": item.items.count(),
        "adoption_count": item.tenant_adoptions.count(),
    }


class PlatformPolicyPackListCreateView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        items = PlatformPolicyPack.objects.order_by("domain", "name").prefetch_related("items", "tenant_adoptions")
        payload = [_serialize_policy_pack(item) for item in items]
        return response.Response(PlatformPolicyPackListItemSerializer(payload, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = PlatformPolicyPackWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = PlatformPolicyPack.objects.create(**serializer.validated_data)
        return response.Response(
            PlatformPolicyPackListItemSerializer(_serialize_policy_pack(item)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformPolicyPackPublishView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        serializer = PlatformPolicyPackPublishSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        item = mark_policy_pack_published(policy_pack, actor_identifier=_actor_identifier(request))
        return response.Response(PlatformPolicyPackListItemSerializer(_serialize_policy_pack(item)).data)


class PlatformPolicyPackAdoptForTenantView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        serializer = TenantPolicyPackAdoptionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = _get_tenant_or_404(serializer.validated_data["tenant_id"])
        adoption = adopt_policy_pack_for_tenant(
            tenant=tenant,
            policy_pack=policy_pack,
            adoption_mode=serializer.validated_data["adoption_mode"],
            notes=serializer.validated_data.get("notes", ""),
            actor_identifier=_actor_identifier(request),
        )
        payload = {
            "id": adoption.id,
            "tenant_id": adoption.tenant_id,
            "tenant_code": adoption.tenant.code,
            "policy_pack_id": adoption.policy_pack_id,
            "policy_pack_code": adoption.policy_pack.code,
            "policy_pack_name": adoption.policy_pack.name,
            "status": adoption.status,
            "adoption_mode": adoption.adoption_mode,
            "adopted_at": adoption.adopted_at,
            "adopted_by_identifier": adoption.adopted_by_identifier,
            "notes": adoption.notes,
            "created_at": adoption.created_at,
        }
        return response.Response(TenantPolicyPackAdoptionSerializer(payload).data, status=status.HTTP_201_CREATED)
