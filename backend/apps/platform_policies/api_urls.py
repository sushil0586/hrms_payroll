from django.urls import path

from apps.platform_policies.api_views import (
    PlatformPolicyPackAdoptForTenantView,
    PlatformPolicyPackAdoptionPreviewView,
    PlatformPolicyPackCloneVersionView,
    PlatformPolicyPackItemCreateView,
    PlatformPolicyPackItemDetailView,
    PlatformPolicyPackListCreateView,
    PlatformPolicyPackPublishView,
    PlatformPolicyPackUpgradeApplyView,
    PlatformPolicyPackUpgradeCompareView,
)


urlpatterns = [
    path("", PlatformPolicyPackListCreateView.as_view(), name="platform-policy-pack-list-create"),
    path("<uuid:item_id>/items/", PlatformPolicyPackItemCreateView.as_view(), name="platform-policy-pack-item-create"),
    path("<uuid:item_id>/items/<uuid:policy_item_id>/", PlatformPolicyPackItemDetailView.as_view(), name="platform-policy-pack-item-detail"),
    path("<uuid:item_id>/clone-version/", PlatformPolicyPackCloneVersionView.as_view(), name="platform-policy-pack-clone-version"),
    path("<uuid:item_id>/adoption-preview/", PlatformPolicyPackAdoptionPreviewView.as_view(), name="platform-policy-pack-adoption-preview"),
    path("<uuid:item_id>/upgrade-compare/", PlatformPolicyPackUpgradeCompareView.as_view(), name="platform-policy-pack-upgrade-compare"),
    path("<uuid:item_id>/upgrade-apply/", PlatformPolicyPackUpgradeApplyView.as_view(), name="platform-policy-pack-upgrade-apply"),
    path("<uuid:item_id>/publish/", PlatformPolicyPackPublishView.as_view(), name="platform-policy-pack-publish"),
    path("<uuid:item_id>/adopt-for-tenant/", PlatformPolicyPackAdoptForTenantView.as_view(), name="platform-policy-pack-adopt-for-tenant"),
]
