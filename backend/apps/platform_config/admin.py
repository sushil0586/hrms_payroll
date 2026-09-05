from django.contrib import admin

from apps.platform_config.models import (
    ConfigurationChangeLog,
    ConfigurationDefinition,
    ScopedConfigurationOverride,
    SeedPackItem,
    SeedPackTemplate,
    TenantConfiguration,
)


@admin.register(ConfigurationDefinition)
class ConfigurationDefinitionAdmin(admin.ModelAdmin):
    list_display = ("key", "category", "data_type", "is_scoped", "is_sensitive", "is_active")
    list_filter = ("category", "data_type", "is_scoped", "is_sensitive", "is_active")
    search_fields = ("key", "name", "description")


class SeedPackItemInline(admin.TabularInline):
    model = SeedPackItem
    extra = 0


@admin.register(SeedPackTemplate)
class SeedPackTemplateAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    inlines = [SeedPackItemInline]


@admin.register(SeedPackItem)
class SeedPackItemAdmin(admin.ModelAdmin):
    list_display = ("seed_pack", "definition", "sort_order")
    list_filter = ("seed_pack", "definition__category")
    search_fields = ("seed_pack__name", "definition__key")


class ScopedConfigurationOverrideInline(admin.TabularInline):
    model = ScopedConfigurationOverride
    extra = 0


@admin.register(TenantConfiguration)
class TenantConfigurationAdmin(admin.ModelAdmin):
    list_display = ("tenant", "definition", "status", "version", "effective_from", "published_at")
    list_filter = ("status", "definition__category", "tenant")
    search_fields = ("tenant__name", "tenant__code", "definition__key")
    inlines = [ScopedConfigurationOverrideInline]


@admin.register(ScopedConfigurationOverride)
class ScopedConfigurationOverrideAdmin(admin.ModelAdmin):
    list_display = ("tenant_configuration", "scope_type", "status", "effective_from")
    list_filter = ("scope_type", "status")
    search_fields = ("tenant_configuration__tenant__name", "tenant_configuration__definition__key", "employee_identifier")


@admin.register(ConfigurationChangeLog)
class ConfigurationChangeLogAdmin(admin.ModelAdmin):
    list_display = ("tenant", "definition", "action", "scope_type", "actor_identifier", "created_at")
    list_filter = ("scope_type", "definition__category", "tenant")
    search_fields = ("tenant__name", "tenant__code", "definition__key", "action", "actor_identifier")
