from django.contrib import admin

from apps.tenants.models import Tenant, TenantDomain


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "status", "onboarding_status", "subscription_plan", "seed_pack", "is_sandbox")
    list_filter = ("status", "onboarding_status", "subscription_plan", "seed_pack", "is_sandbox")
    search_fields = ("name", "code", "legal_name", "primary_email")


@admin.register(TenantDomain)
class TenantDomainAdmin(admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("domain", "tenant__name", "tenant__code")
