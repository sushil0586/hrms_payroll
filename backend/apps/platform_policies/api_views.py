"""Platform policy pack API views."""

from django.db import transaction
from rest_framework import exceptions, permissions, response, status
from rest_framework.views import APIView

from apps.platform_policies.api_serializers import (
    PolicyPackAdoptionPreviewSerializer,
    PolicyPackUpgradeCompareSerializer,
    PlatformPolicyPackItemWriteSerializer,
    PlatformPolicyPackListItemSerializer,
    PlatformPolicyPackPublishSerializer,
    PlatformPolicyPackWriteSerializer,
    TenantPolicyPackAdoptionSerializer,
    TenantPolicyPackAdoptionWriteSerializer,
)
from apps.platform_policies.models import PlatformPolicyPack, PlatformPolicyPackItem, PlatformPolicyPackStatus
from apps.platform_policies.services import adopt_policy_pack_for_tenant, clone_policy_pack_new_version, compare_policy_pack_upgrade, mark_policy_pack_published, preview_policy_pack_adoption, upgrade_policy_pack_for_tenant
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


def _get_policy_pack_item_or_404(policy_pack: PlatformPolicyPack, item_id):
    try:
        return policy_pack.items.get(id=item_id)
    except PlatformPolicyPackItem.DoesNotExist as exc:
        raise exceptions.NotFound("Policy pack item not found.") from exc


def _ensure_policy_pack_is_draft(policy_pack: PlatformPolicyPack):
    if policy_pack.status != PlatformPolicyPackStatus.DRAFT:
        raise exceptions.ValidationError({
            "status": "Published or archived setup templates cannot be changed. Create a new version before editing items."
        })


def _get_tenant_or_404(tenant_id):
    try:
        return Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist as exc:
        raise exceptions.ValidationError({"tenant_id": "Tenant not found."}) from exc


def _serialize_policy_pack(item: PlatformPolicyPack) -> dict:
    items = [
        {
            "id": pack_item.id,
            "item_type": pack_item.item_type,
            "item_key": pack_item.item_key,
            "name": pack_item.name,
            "payload": pack_item.payload,
            "dependency_keys": pack_item.dependency_keys,
            "sort_order": pack_item.sort_order,
            "is_required": pack_item.is_required,
        }
        for pack_item in item.items.all()
    ]
    return {
        "id": item.id,
        "source_pack_id": item.source_pack_id,
        "source_pack_code": item.source_pack.code if item.source_pack_id else "",
        "source_pack_version": item.source_pack.version if item.source_pack_id else None,
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
        "item_count": len(items),
        "adoption_count": item.tenant_adoptions.count(),
        "items": items,
    }


class PlatformPolicyPackListCreateView(APIView):
    permission_classes = [IsPlatformStaff]

    def get(self, request):
        items = PlatformPolicyPack.objects.select_related("source_pack").order_by("domain", "name").prefetch_related("items", "tenant_adoptions")
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
        if not policy_pack.items.exists() and not serializer.validated_data["allow_header_only"]:
            raise exceptions.ValidationError({
                "allow_header_only": "This setup template has no items. Confirm header-only publishing to create evidence-only baselines."
            })
        item = mark_policy_pack_published(policy_pack, actor_identifier=_actor_identifier(request))
        return response.Response(PlatformPolicyPackListItemSerializer(_serialize_policy_pack(item)).data)


class PlatformPolicyPackCloneVersionView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        cloned_pack = clone_policy_pack_new_version(policy_pack)
        cloned_pack = PlatformPolicyPack.objects.select_related("source_pack").prefetch_related("items", "tenant_adoptions").get(id=cloned_pack.id)
        return response.Response(
            PlatformPolicyPackListItemSerializer(_serialize_policy_pack(cloned_pack)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformPolicyPackItemCreateView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        _ensure_policy_pack_is_draft(policy_pack)
        serializer = PlatformPolicyPackItemWriteSerializer(data=request.data, context={"policy_pack": policy_pack})
        serializer.is_valid(raise_exception=True)
        PlatformPolicyPackItem.objects.create(policy_pack=policy_pack, **serializer.validated_data)
        policy_pack = PlatformPolicyPack.objects.prefetch_related("items", "tenant_adoptions").get(id=policy_pack.id)
        return response.Response(
            PlatformPolicyPackListItemSerializer(_serialize_policy_pack(policy_pack)).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformPolicyPackItemDetailView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def patch(self, request, item_id, policy_item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        _ensure_policy_pack_is_draft(policy_pack)
        policy_pack_item = _get_policy_pack_item_or_404(policy_pack, policy_item_id)
        serializer = PlatformPolicyPackItemWriteSerializer(
            data=request.data,
            partial=True,
            context={"policy_pack": policy_pack, "current_item": policy_pack_item},
        )
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(policy_pack_item, field, value)
        policy_pack_item.save()
        policy_pack = PlatformPolicyPack.objects.prefetch_related("items", "tenant_adoptions").get(id=policy_pack.id)
        return response.Response(PlatformPolicyPackListItemSerializer(_serialize_policy_pack(policy_pack)).data)

    @transaction.atomic
    def delete(self, request, item_id, policy_item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        _ensure_policy_pack_is_draft(policy_pack)
        policy_pack_item = _get_policy_pack_item_or_404(policy_pack, policy_item_id)
        policy_pack_item.delete()
        policy_pack = PlatformPolicyPack.objects.prefetch_related("items", "tenant_adoptions").get(id=policy_pack.id)
        return response.Response(PlatformPolicyPackListItemSerializer(_serialize_policy_pack(policy_pack)).data)


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
            "result_summary": getattr(adoption, "result_summary", {}),
            "created_at": adoption.created_at,
        }
        return response.Response(TenantPolicyPackAdoptionSerializer(payload).data, status=status.HTTP_201_CREATED)


class PlatformPolicyPackAdoptionPreviewView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        serializer = TenantPolicyPackAdoptionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = _get_tenant_or_404(serializer.validated_data["tenant_id"])
        preview = preview_policy_pack_adoption(
            tenant=tenant,
            policy_pack=policy_pack,
            adoption_mode=serializer.validated_data["adoption_mode"],
        )
        return response.Response(PolicyPackAdoptionPreviewSerializer(preview).data)


class PlatformPolicyPackUpgradeCompareView(APIView):
    permission_classes = [IsPlatformStaff]

    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        tenant = _get_tenant_or_404(request.data.get("tenant_id"))
        comparison = compare_policy_pack_upgrade(
            tenant=tenant,
            target_policy_pack=policy_pack,
        )
        return response.Response(PolicyPackUpgradeCompareSerializer(comparison).data)


class PlatformPolicyPackUpgradeApplyView(APIView):
    permission_classes = [IsPlatformStaff]

    @transaction.atomic
    def post(self, request, item_id):
        policy_pack = _get_policy_pack_or_404(item_id)
        tenant = _get_tenant_or_404(request.data.get("tenant_id"))
        adoption = upgrade_policy_pack_for_tenant(
            tenant=tenant,
            target_policy_pack=policy_pack,
            notes=request.data.get("notes", ""),
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
            "result_summary": getattr(adoption, "result_summary", {}),
            "created_at": adoption.created_at,
        }
        return response.Response(TenantPolicyPackAdoptionSerializer(payload).data, status=status.HTTP_201_CREATED)
