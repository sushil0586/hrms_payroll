"""URL configuration for the HRMS backend."""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthcheck(_request):
    return JsonResponse({"status": "ok", "service": "hrms-backend"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.iam.api_urls")),
    path("api/v1/platform/", include("apps.tenant_onboarding.api_urls")),
    path("api/v1/platform-policy-packs/", include("apps.platform_policies.api_urls")),
    path("api/v1/", include("apps.common.api_urls")),
]
