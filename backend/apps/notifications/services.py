"""Notification creation and delivery processing helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
import logging
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.notifications.models import (
    Notification,
    NotificationAudienceType,
    NotificationChannel,
    NotificationChannelConfiguration,
    NotificationDeliveryBackend,
    NotificationDeliveryLog,
    NotificationEventDefinition,
    NotificationPriority,
    NotificationStatus,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class DeliveryResult:
    """Normalized result returned by a notification delivery backend."""

    status: str
    provider_name: str
    provider_reference: str = ""
    response_payload: dict[str, Any] | None = None
    error_message: str = ""


def get_normalized_delivery_policy(configuration: NotificationChannelConfiguration) -> dict[str, int]:
    """Returns the normalized retry policy for a channel configuration."""

    policy = configuration.delivery_policy if isinstance(configuration.delivery_policy, dict) else {}
    max_attempts_raw = policy.get("max_attempts", 3)
    retry_backoff_minutes_raw = policy.get("retry_backoff_minutes", 0)
    try:
        max_attempts = max(1, int(max_attempts_raw))
    except (TypeError, ValueError):
        max_attempts = 3
    try:
        retry_backoff_minutes = max(0, int(retry_backoff_minutes_raw))
    except (TypeError, ValueError):
        retry_backoff_minutes = 0
    return {
        "max_attempts": max_attempts,
        "retry_backoff_minutes": retry_backoff_minutes,
    }


def get_notification_retry_state(
    notification: Notification,
    *,
    configuration: NotificationChannelConfiguration | None = None,
) -> dict[str, int | bool]:
    """Returns queue-facing retry state for one notification."""

    config = configuration or get_or_create_channel_configuration(tenant=notification.tenant, channel=notification.channel)
    policy = get_normalized_delivery_policy(config)
    attempt_count = notification.delivery_logs.count()
    retry_limit_reached = attempt_count >= policy["max_attempts"]
    return {
        "attempt_count": attempt_count,
        "max_attempts": policy["max_attempts"],
        "retry_backoff_minutes": policy["retry_backoff_minutes"],
        "retry_limit_reached": retry_limit_reached,
        "can_retry": not retry_limit_reached,
    }


class BaseNotificationDeliveryBackend:
    """Base contract for channel delivery providers."""

    key = ""
    label = ""
    supported_channels: tuple[str, ...] = ()

    def send(
        self,
        *,
        notification: Notification,
        configuration: NotificationChannelConfiguration,
        recipient_address: str,
    ) -> DeliveryResult:
        raise NotImplementedError


class InAppDefaultBackend(BaseNotificationDeliveryBackend):
    key = NotificationDeliveryBackend.IN_APP_DEFAULT
    label = "In-App Default"
    supported_channels = (NotificationChannel.IN_APP,)

    def send(
        self,
        *,
        notification: Notification,
        configuration: NotificationChannelConfiguration,
        recipient_address: str,
    ) -> DeliveryResult:
        return DeliveryResult(
            status=NotificationStatus.DELIVERED,
            provider_name=self.key,
            response_payload={"channel": notification.channel, "mode": "in_app"},
        )


class ConsoleDeliveryBackend(BaseNotificationDeliveryBackend):
    label = "Console"
    supported_channels = (
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.PUSH,
        NotificationChannel.WHATSAPP,
    )

    def send(
        self,
        *,
        notification: Notification,
        configuration: NotificationChannelConfiguration,
        recipient_address: str,
    ) -> DeliveryResult:
        if notification.channel in {NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WHATSAPP} and not recipient_address:
            return DeliveryResult(
                status=NotificationStatus.FAILED,
                provider_name=self.key,
                error_message="Recipient address is required for this channel.",
                response_payload={"channel": notification.channel},
            )

        payload = {
            "channel": notification.channel,
            "recipient": recipient_address or notification.recipient_identifier,
            "title": notification.title,
            "subject": notification.subject,
            "body": notification.body,
        }
        logger.info("Notification console delivery [%s]: %s", self.key, payload)
        return DeliveryResult(
            status=NotificationStatus.DELIVERED,
            provider_name=self.key,
            response_payload=payload,
        )


class ConsoleBackend(ConsoleDeliveryBackend):
    key = NotificationDeliveryBackend.CONSOLE


class SmsConsoleBackend(ConsoleDeliveryBackend):
    key = NotificationDeliveryBackend.SMS_CONSOLE


class PushConsoleBackend(ConsoleDeliveryBackend):
    key = NotificationDeliveryBackend.PUSH_CONSOLE


class WhatsAppConsoleBackend(ConsoleDeliveryBackend):
    key = NotificationDeliveryBackend.WHATSAPP_CONSOLE


class EmailSmtpBackend(BaseNotificationDeliveryBackend):
    key = NotificationDeliveryBackend.EMAIL_SMTP
    label = "Email SMTP"
    supported_channels = (NotificationChannel.EMAIL,)

    def send(
        self,
        *,
        notification: Notification,
        configuration: NotificationChannelConfiguration,
        recipient_address: str,
    ) -> DeliveryResult:
        if not recipient_address:
            return DeliveryResult(
                status=NotificationStatus.FAILED,
                provider_name=self.key,
                error_message="Recipient email address is required.",
                response_payload={"channel": notification.channel},
            )

        from_email = configuration.sender_address or getattr(settings, "DEFAULT_FROM_EMAIL", "hrms@example.local")
        subject = notification.subject or notification.title or "Notification"
        send_mail(
            subject=subject,
            message=notification.body or notification.title,
            from_email=from_email,
            recipient_list=[recipient_address],
            fail_silently=False,
        )
        return DeliveryResult(
            status=NotificationStatus.DELIVERED,
            provider_name=self.key,
            response_payload={"recipient": recipient_address, "from_email": from_email},
        )


_BACKEND_REGISTRY: dict[str, BaseNotificationDeliveryBackend] = {}


def register_notification_backend(backend: BaseNotificationDeliveryBackend) -> None:
    """Registers a delivery backend implementation."""

    _BACKEND_REGISTRY[backend.key] = backend


def get_registered_notification_backends() -> list[dict[str, Any]]:
    """Returns metadata for the built-in delivery backends."""

    _register_builtin_backends()
    return [
        {
            "value": backend.key,
            "label": backend.label,
            "supported_channels": list(backend.supported_channels),
        }
        for backend in _BACKEND_REGISTRY.values()
    ]


def _register_builtin_backends() -> None:
    if _BACKEND_REGISTRY:
        return
    for backend in [
        InAppDefaultBackend(),
        EmailSmtpBackend(),
        ConsoleBackend(),
        SmsConsoleBackend(),
        PushConsoleBackend(),
        WhatsAppConsoleBackend(),
    ]:
        register_notification_backend(backend)


def get_delivery_backend(backend_key: str) -> BaseNotificationDeliveryBackend:
    """Looks up a registered delivery backend by key."""

    _register_builtin_backends()
    try:
        return _BACKEND_REGISTRY[backend_key]
    except KeyError as exc:
        raise ValueError(f"Unsupported notification backend '{backend_key}'.") from exc


def get_default_backend_key(channel: str) -> str:
    """Returns the default backend key for a notification channel."""

    return {
        NotificationChannel.IN_APP: NotificationDeliveryBackend.IN_APP_DEFAULT,
        NotificationChannel.EMAIL: NotificationDeliveryBackend.EMAIL_SMTP,
        NotificationChannel.SMS: NotificationDeliveryBackend.SMS_CONSOLE,
        NotificationChannel.PUSH: NotificationDeliveryBackend.PUSH_CONSOLE,
        NotificationChannel.WHATSAPP: NotificationDeliveryBackend.WHATSAPP_CONSOLE,
    }.get(channel, NotificationDeliveryBackend.CONSOLE)


def get_or_create_channel_configuration(*, tenant, channel: str) -> NotificationChannelConfiguration:
    """Returns the tenant channel configuration, creating a safe default if needed."""

    defaults = {
        "is_enabled": True,
        "backend_key": get_default_backend_key(channel),
        "sender_identifier": "",
        "sender_address": "",
        "provider_config": {},
        "delivery_policy": {},
    }
    config, _ = NotificationChannelConfiguration.objects.get_or_create(
        tenant=tenant,
        channel=channel,
        defaults=defaults,
    )
    return config


def resolve_notification_recipient_address(notification: Notification) -> str:
    """Derives the best recipient address for the target delivery channel."""

    if notification.recipient_address:
        return notification.recipient_address

    membership = notification.recipient_membership
    employee = getattr(membership, "employee", None) if membership else None
    user = membership.user if membership else None

    if notification.channel == NotificationChannel.EMAIL:
        return (
            (employee.work_email if employee and employee.work_email else "")
            or (employee.personal_email if employee and employee.personal_email else "")
            or (user.email if user and user.email else "")
        )
    if notification.channel in {NotificationChannel.SMS, NotificationChannel.WHATSAPP}:
        return (
            (employee.phone_number if employee and employee.phone_number else "")
            or (user.phone_number if user and user.phone_number else "")
        )
    if notification.channel == NotificationChannel.PUSH:
        push_token = notification.payload.get("push_token") if isinstance(notification.payload, dict) else ""
        return str(push_token or notification.recipient_identifier or "")
    return notification.recipient_identifier or ""


def _render_template_value(template_value: str, payload: dict[str, Any]) -> str:
    if not template_value:
        return ""
    try:
        return template_value.format(**payload)
    except Exception:
        return template_value


def create_in_app_notification(
    *,
    tenant,
    recipient_membership=None,
    recipient_identifier: str = "",
    subject_type: str = "",
    subject_identifier: str = "",
    title: str,
    body: str,
    priority: str = NotificationPriority.NORMAL,
    payload: dict[str, Any] | None = None,
) -> Notification:
    """Creates a basic in-app notification record."""

    return Notification.objects.create(
        tenant=tenant,
        channel=NotificationChannel.IN_APP,
        audience_type=NotificationAudienceType.MEMBERSHIP if recipient_membership else NotificationAudienceType.CUSTOM,
        recipient_membership=recipient_membership,
        recipient_identifier=recipient_identifier,
        subject_type=subject_type,
        subject_identifier=subject_identifier,
        title=title,
        body=body,
        priority=priority,
        payload=payload or {},
    )


def trigger_notification_event(
    *,
    tenant,
    module: str,
    trigger_key: str,
    subject_type: str = "",
    subject_identifier: str = "",
    recipient_membership=None,
    recipient_role=None,
    recipient_identifier: str = "",
    recipient_address: str = "",
    fallback_title: str = "",
    fallback_subject: str = "",
    fallback_body: str = "",
    payload: dict[str, Any] | None = None,
) -> list[Notification]:
    """Creates configured notifications for a module trigger, falling back when none are configured."""

    definitions = list(
        NotificationEventDefinition.objects.filter(
            tenant=tenant,
            module=module,
            trigger_key=trigger_key,
            is_active=True,
        ).select_related("template", "role", "membership")
    )
    created: list[Notification] = []
    base_payload = payload or {}

    if not definitions:
        if fallback_title or fallback_body:
            created.append(
                Notification.objects.create(
                    tenant=tenant,
                    channel=NotificationChannel.IN_APP,
                    audience_type=NotificationAudienceType.MEMBERSHIP if recipient_membership else NotificationAudienceType.CUSTOM,
                    subject_type=subject_type,
                    subject_identifier=subject_identifier,
                    recipient_membership=recipient_membership,
                    recipient_role=recipient_role,
                    recipient_identifier=recipient_identifier,
                    recipient_address=recipient_address,
                    title=fallback_title,
                    subject=fallback_subject,
                    body=fallback_body,
                    priority=NotificationPriority.NORMAL,
                    payload=base_payload,
                )
            )
        return created

    for definition in definitions:
        template = definition.template
        scheduled_for = timezone.now()
        if definition.delivery_delay_minutes:
            scheduled_for = scheduled_for + timedelta(minutes=definition.delivery_delay_minutes)

        payload_snapshot = {
            **base_payload,
            "event_code": definition.code,
        }
        created.append(
            Notification.objects.create(
                tenant=tenant,
                event_definition=definition,
                channel=definition.channel,
                audience_type=definition.audience_type,
                subject_type=subject_type,
                subject_identifier=subject_identifier,
                recipient_membership=definition.membership or recipient_membership,
                recipient_role=definition.role or recipient_role,
                recipient_identifier=recipient_identifier,
                recipient_address=recipient_address,
                title=_render_template_value(template.title_template if template and template.title_template else fallback_title, payload_snapshot),
                subject=_render_template_value(template.subject_template if template and template.subject_template else fallback_subject, payload_snapshot),
                body=_render_template_value(template.body_template if template and template.body_template else fallback_body, payload_snapshot),
                status=NotificationStatus.PENDING,
                priority=definition.priority,
                scheduled_for=scheduled_for,
                payload=payload_snapshot,
            )
        )

    return created


def _build_delivery_log_payload(notification: Notification, result: DeliveryResult) -> dict[str, Any]:
    return {
        "notification": notification,
        "tenant": notification.tenant,
        "channel": notification.channel,
        "status": result.status,
        "provider_name": result.provider_name,
        "provider_reference": result.provider_reference,
        "error_message": result.error_message,
        "response_payload": result.response_payload or {},
    }


@transaction.atomic
def process_notification(notification: Notification) -> Notification:
    """Processes one pending notification through its configured backend."""

    config = get_or_create_channel_configuration(tenant=notification.tenant, channel=notification.channel)
    delivery_policy = get_normalized_delivery_policy(config)
    existing_attempts = notification.delivery_logs.count()
    if existing_attempts >= delivery_policy["max_attempts"]:
        if notification.status != NotificationStatus.FAILED:
            notification.status = NotificationStatus.FAILED
            notification.save(update_fields=["status", "updated_at"])
        return notification
    if not config.is_enabled:
        result = DeliveryResult(
            status=NotificationStatus.CANCELLED,
            provider_name=config.backend_key,
            error_message="Channel is disabled for this tenant.",
            response_payload={"channel": notification.channel},
        )
    else:
        backend = get_delivery_backend(config.backend_key)
        recipient_address = resolve_notification_recipient_address(notification)
        if recipient_address and notification.recipient_address != recipient_address:
            notification.recipient_address = recipient_address
            notification.save(update_fields=["recipient_address", "updated_at"])
        try:
            result = backend.send(
                notification=notification,
                configuration=config,
                recipient_address=recipient_address,
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.exception("Notification delivery failed for %s", notification.id)
            result = DeliveryResult(
                status=NotificationStatus.FAILED,
                provider_name=config.backend_key,
                error_message=str(exc),
                response_payload={"channel": notification.channel},
            )

    NotificationDeliveryLog.objects.create(**_build_delivery_log_payload(notification, result))

    now = timezone.now()
    notification.status = result.status
    if result.status in {NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ}:
        notification.sent_at = notification.sent_at or now
    if result.status in {NotificationStatus.DELIVERED, NotificationStatus.READ}:
        notification.delivered_at = notification.delivered_at or now
    notification.save(update_fields=["status", "sent_at", "delivered_at", "updated_at"])
    return notification


def process_pending_notifications(*, tenant=None, limit: int = 100, channels: list[str] | None = None) -> list[Notification]:
    """Processes due pending notifications for the tenant and optional channel subset."""

    _register_builtin_backends()
    queryset = Notification.objects.filter(status=NotificationStatus.PENDING).select_related(
        "recipient_membership__user",
        "recipient_membership__employee",
        "event_definition",
    )
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)
    if channels:
        queryset = queryset.filter(channel__in=channels)
    now = timezone.now()
    queryset = queryset.filter(Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=now))
    items = list(queryset.order_by("scheduled_for", "created_at")[: max(1, limit)])
    return [process_notification(item) for item in items]


@transaction.atomic
def retry_notification(notification: Notification, *, process_now: bool = True) -> Notification:
    """Re-queues a notification and optionally processes it immediately."""

    config = get_or_create_channel_configuration(tenant=notification.tenant, channel=notification.channel)
    delivery_policy = get_normalized_delivery_policy(config)
    existing_attempts = notification.delivery_logs.count()
    if existing_attempts >= delivery_policy["max_attempts"]:
        raise ValueError("Retry limit reached for this notification channel configuration.")

    scheduled_for = timezone.now()
    if not process_now and delivery_policy["retry_backoff_minutes"] > 0:
        scheduled_for = scheduled_for + timedelta(minutes=delivery_policy["retry_backoff_minutes"])
    notification.status = NotificationStatus.PENDING
    notification.sent_at = None
    notification.delivered_at = None
    notification.read_at = None
    notification.scheduled_for = scheduled_for
    notification.save(update_fields=["status", "sent_at", "delivered_at", "read_at", "scheduled_for", "updated_at"])
    if process_now:
        return process_notification(notification)
    return notification
