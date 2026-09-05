from django.contrib import admin

from apps.tenant_onboarding.models import (
    TenantOnboarding,
    TenantOnboardingAdminContact,
    TenantOnboardingChecklistItem,
    TenantOnboardingEvent,
)


class TenantOnboardingAdminContactInline(admin.TabularInline):
    model = TenantOnboardingAdminContact
    extra = 0


class TenantOnboardingChecklistItemInline(admin.TabularInline):
    model = TenantOnboardingChecklistItem
    extra = 0


class TenantOnboardingEventInline(admin.TabularInline):
    model = TenantOnboardingEvent
    extra = 0
    readonly_fields = ("event_type", "summary", "payload", "actor_identifier", "created_at", "updated_at")


@admin.register(TenantOnboarding)
class TenantOnboardingAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "owner_mode",
        "setup_style",
        "data_setup_style",
        "policy_control_style",
        "baseline_published_at",
        "handoff_completed_at",
    )
    list_filter = ("owner_mode", "setup_style", "data_setup_style", "policy_control_style")
    search_fields = ("tenant__name", "tenant__code", "industry_context", "notes")
    inlines = [TenantOnboardingAdminContactInline, TenantOnboardingChecklistItemInline, TenantOnboardingEventInline]


@admin.register(TenantOnboardingAdminContact)
class TenantOnboardingAdminContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "onboarding", "is_primary", "provisioning_status", "user", "membership")
    list_filter = ("is_primary", "provisioning_status")
    search_fields = ("full_name", "email", "onboarding__tenant__name", "onboarding__tenant__code")


@admin.register(TenantOnboardingChecklistItem)
class TenantOnboardingChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("label", "code", "onboarding", "status", "completed_by_identifier", "sort_order")
    list_filter = ("status",)
    search_fields = ("label", "code", "onboarding__tenant__name", "onboarding__tenant__code")


@admin.register(TenantOnboardingEvent)
class TenantOnboardingEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "onboarding", "summary", "actor_identifier", "created_at")
    list_filter = ("event_type",)
    search_fields = ("event_type", "summary", "onboarding__tenant__name", "onboarding__tenant__code")
    readonly_fields = ("payload",)
