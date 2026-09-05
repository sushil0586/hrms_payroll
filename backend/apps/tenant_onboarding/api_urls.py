from django.urls import path

from apps.tenant_onboarding.api_views import (
    PlatformAdminContactProvisionView,
    PlatformTenantActivateView,
    PlatformTenantAdminContactCreateView,
    PlatformTenantDetailView,
    PlatformTenantListCreateView,
    PlatformTenantMarkBaselinePublishedView,
    PlatformTenantMarkHandoffReadyView,
    PlatformTenantOnboardingDetailView,
)


urlpatterns = [
    path("tenants/", PlatformTenantListCreateView.as_view(), name="platform-tenant-list-create"),
    path("tenants/<uuid:item_id>/", PlatformTenantDetailView.as_view(), name="platform-tenant-detail"),
    path("tenants/<uuid:item_id>/onboarding/", PlatformTenantOnboardingDetailView.as_view(), name="platform-tenant-onboarding-detail"),
    path("tenants/<uuid:item_id>/admin-contacts/", PlatformTenantAdminContactCreateView.as_view(), name="platform-tenant-admin-contact-create"),
    path("tenants/<uuid:item_id>/onboarding/mark-baseline-published/", PlatformTenantMarkBaselinePublishedView.as_view(), name="platform-tenant-mark-baseline-published"),
    path("tenants/<uuid:item_id>/onboarding/mark-handoff-ready/", PlatformTenantMarkHandoffReadyView.as_view(), name="platform-tenant-mark-handoff-ready"),
    path("tenants/<uuid:item_id>/onboarding/activate/", PlatformTenantActivateView.as_view(), name="platform-tenant-activate"),
    path("admin-contacts/<uuid:contact_id>/provision-user/", PlatformAdminContactProvisionView.as_view(), name="platform-admin-contact-provision-user"),
]
