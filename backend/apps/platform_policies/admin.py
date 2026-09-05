from django.contrib import admin

from apps.platform_policies.models import (
    PlatformPolicyDelegationRule,
    PlatformPolicyPack,
    PlatformPolicyPackItem,
    TenantPolicyPackAdoption,
    TenantPolicyPackItemLink,
)


class PlatformPolicyPackItemInline(admin.TabularInline):
    model = PlatformPolicyPackItem
    extra = 0


class PlatformPolicyDelegationRuleInline(admin.TabularInline):
    model = PlatformPolicyDelegationRule
    extra = 0


@admin.register(PlatformPolicyPack)
class PlatformPolicyPackAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "domain", "status", "version", "is_active", "published_at")
    list_filter = ("domain", "status", "is_active")
    search_fields = ("code", "name", "industry_tag", "description")
    inlines = [PlatformPolicyPackItemInline, PlatformPolicyDelegationRuleInline]


@admin.register(PlatformPolicyPackItem)
class PlatformPolicyPackItemAdmin(admin.ModelAdmin):
    list_display = ("item_key", "policy_pack", "item_type", "sort_order", "is_required")
    list_filter = ("item_type", "is_required")
    search_fields = ("item_key", "name", "policy_pack__code")


@admin.register(PlatformPolicyDelegationRule)
class PlatformPolicyDelegationRuleAdmin(admin.ModelAdmin):
    list_display = ("policy_pack", "item_key", "delegation_mode")
    list_filter = ("delegation_mode",)
    search_fields = ("policy_pack__code", "item_key", "notes")


@admin.register(TenantPolicyPackAdoption)
class TenantPolicyPackAdoptionAdmin(admin.ModelAdmin):
    list_display = ("tenant", "policy_pack", "status", "adoption_mode", "adopted_at")
    list_filter = ("status", "adoption_mode", "policy_pack__domain")
    search_fields = ("tenant__name", "tenant__code", "policy_pack__code", "policy_pack__name")


@admin.register(TenantPolicyPackItemLink)
class TenantPolicyPackItemLinkAdmin(admin.ModelAdmin):
    list_display = ("tenant_adoption", "platform_item", "target_model", "target_record_id", "source_version", "is_detached_from_source")
    list_filter = ("target_model", "is_detached_from_source")
    search_fields = ("tenant_adoption__tenant__name", "tenant_adoption__tenant__code", "platform_item__item_key", "target_model")
