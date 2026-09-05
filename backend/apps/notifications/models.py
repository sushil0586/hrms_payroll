"""Notification templates, event definitions, delivery configuration, and tracking."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.iam.models import Role, TenantMembership
from apps.tenants.models import Tenant


class NotificationChannel(models.TextChoices):
    IN_APP = "in_app", "In-App"
    EMAIL = "email", "Email"
    SMS = "sms", "SMS"
    PUSH = "push", "Push"
    WHATSAPP = "whatsapp", "WhatsApp"


class NotificationDeliveryBackend(models.TextChoices):
    IN_APP_DEFAULT = "in_app_default", "In-App Default"
    EMAIL_SMTP = "email_smtp", "Email SMTP"
    CONSOLE = "console", "Console"
    SMS_CONSOLE = "sms_console", "SMS Console"
    PUSH_CONSOLE = "push_console", "Push Console"
    WHATSAPP_CONSOLE = "whatsapp_console", "WhatsApp Console"


class NotificationAudienceType(models.TextChoices):
    EMPLOYEE = "employee", "Employee"
    MANAGER = "manager", "Manager"
    ROLE = "role", "Role"
    MEMBERSHIP = "membership", "Membership"
    CUSTOM = "custom", "Custom"


class NotificationTemplateStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class NotificationPriority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class NotificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    DELIVERED = "delivered", "Delivered"
    READ = "read", "Read"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class NotificationChannelConfiguration(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-scoped delivery configuration for each notification channel."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notification_channel_configurations",
    )
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    is_enabled = models.BooleanField(default=True)
    backend_key = models.CharField(max_length=60, choices=NotificationDeliveryBackend.choices)
    sender_identifier = models.CharField(max_length=120, blank=True)
    sender_address = models.CharField(max_length=255, blank=True)
    provider_config = models.JSONField(default=dict, blank=True)
    delivery_policy = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["channel"]
        unique_together = [("tenant", "channel")]
        verbose_name = "Notification Channel Configuration"
        verbose_name_plural = "Notification Channel Configurations"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.channel}:{self.backend_key}"


class NotificationTemplate(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-scoped template for one notification channel."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notification_templates",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    status = models.CharField(max_length=20, choices=NotificationTemplateStatus.choices, default=NotificationTemplateStatus.DRAFT)
    subject_template = models.CharField(max_length=255, blank=True)
    title_template = models.CharField(max_length=255, blank=True)
    body_template = models.TextField()
    metadata_template = models.JSONField(default=dict, blank=True)
    is_system_seeded = models.BooleanField(default=False)

    class Meta:
        ordering = ["channel", "name"]
        unique_together = [("tenant", "code", "channel")]
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}:{self.channel}"


class NotificationEventDefinition(UUIDPrimaryKeyModel, TimeStampedModel):
    """Defines when notifications should be triggered and to whom."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notification_event_definitions",
    )
    code = models.SlugField(max_length=80)
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=30)
    trigger_key = models.CharField(max_length=120)
    audience_type = models.CharField(max_length=20, choices=NotificationAudienceType.choices)
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        related_name="event_definitions",
        blank=True,
        null=True,
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="notification_event_definitions",
        blank=True,
        null=True,
    )
    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="notification_event_definitions",
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(default=True)
    priority = models.CharField(max_length=20, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    delivery_delay_minutes = models.PositiveIntegerField(default=0)
    recipient_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["module", "trigger_key", "channel"]
        unique_together = [("tenant", "code")]
        verbose_name = "Notification Event Definition"
        verbose_name_plural = "Notification Event Definitions"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class Notification(UUIDPrimaryKeyModel, TimeStampedModel):
    """Actual notification event generated for one audience target."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_definition = models.ForeignKey(
        NotificationEventDefinition,
        on_delete=models.SET_NULL,
        related_name="notifications",
        blank=True,
        null=True,
    )
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    audience_type = models.CharField(max_length=20, choices=NotificationAudienceType.choices)
    subject_type = models.CharField(max_length=120, blank=True)
    subject_identifier = models.CharField(max_length=120, blank=True)
    recipient_membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="notifications",
        blank=True,
        null=True,
    )
    recipient_role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="notifications",
        blank=True,
        null=True,
    )
    recipient_identifier = models.CharField(max_length=120, blank=True)
    recipient_address = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=NotificationStatus.choices, default=NotificationStatus.PENDING)
    priority = models.CharField(max_length=20, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self) -> str:
        return f"{self.channel}:{self.recipient_identifier or self.recipient_address}"


class NotificationDeliveryLog(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores provider-level delivery attempts and outcomes."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notification_delivery_logs",
    )
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="delivery_logs",
    )
    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)
    status = models.CharField(max_length=20, choices=NotificationStatus.choices)
    provider_name = models.CharField(max_length=120, blank=True)
    provider_reference = models.CharField(max_length=120, blank=True)
    error_message = models.TextField(blank=True)
    response_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification Delivery Log"
        verbose_name_plural = "Notification Delivery Logs"

    def __str__(self) -> str:
        return f"{self.notification} - {self.status}"
