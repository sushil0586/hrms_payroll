from django.urls import path

from apps.platform_policies.api_views import (
    PlatformPolicyPackAdoptForTenantView,
    PlatformPolicyPackListCreateView,
    PlatformPolicyPackPublishView,
)


urlpatterns = [
    path("", PlatformPolicyPackListCreateView.as_view(), name="platform-policy-pack-list-create"),
    path("<uuid:item_id>/publish/", PlatformPolicyPackPublishView.as_view(), name="platform-policy-pack-publish"),
    path("<uuid:item_id>/adopt-for-tenant/", PlatformPolicyPackAdoptForTenantView.as_view(), name="platform-policy-pack-adopt-for-tenant"),
]
