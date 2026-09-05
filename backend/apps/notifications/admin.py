from django.contrib import admin

from apps.notifications.models import (
    Notification,
    NotificationChannelConfiguration,
    NotificationDeliveryLog,
    NotificationEventDefinition,
    NotificationTemplate,
)


@admin.register(NotificationChannelConfiguration)
class NotificationChannelConfigurationAdmin(admin.ModelAdmin):
    list_display = ("tenant", "channel", "backend_key", "is_enabled", "sender_identifier", "sender_address")
    list_filter = ("channel", "backend_key", "is_enabled", "tenant")
    search_fields = ("tenant__name", "sender_identifier", "sender_address")


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "channel", "status", "is_system_seeded")
    list_filter = ("channel", "status", "is_system_seeded", "tenant")
    search_fields = ("name", "code", "tenant__name")


@admin.register(NotificationEventDefinition)
class NotificationEventDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "module", "trigger_key", "channel", "audience_type", "is_active", "priority")
    list_filter = ("module", "channel", "audience_type", "is_active", "priority", "tenant")
    search_fields = ("name", "code", "trigger_key", "tenant__name")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "channel",
        "audience_type",
        "recipient_identifier",
        "recipient_address",
        "status",
        "priority",
        "scheduled_for",
        "sent_at",
        "read_at",
    )
    list_filter = ("channel", "audience_type", "status", "priority", "tenant")
    search_fields = ("recipient_identifier", "recipient_address", "subject_identifier", "subject_type")


@admin.register(NotificationDeliveryLog)
class NotificationDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("notification", "channel", "status", "provider_name", "provider_reference", "created_at")
    list_filter = ("channel", "status", "tenant")
    search_fields = ("provider_name", "provider_reference", "notification__recipient_identifier", "notification__recipient_address")
