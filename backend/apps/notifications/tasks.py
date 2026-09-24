"""Celery tasks for notification delivery."""

from __future__ import annotations

from celery import shared_task

from apps.tenants.models import Tenant

from .models import NotificationChannel
from .services import process_pending_notifications


@shared_task(name="notifications.process_pending")
def process_pending_notifications_task(
    *,
    tenant_code: str | None = None,
    limit: int = 100,
    channels: list[str] | None = None,
) -> dict:
    """Processes due notifications from Celery beat or an explicit worker call."""

    tenant = None
    if tenant_code:
        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            return {"processed": 0, "tenant_code": tenant_code, "status": "tenant_not_found"}

    valid_channels = set(NotificationChannel.values)
    filtered_channels = [channel for channel in (channels or []) if channel in valid_channels] or None
    processed = process_pending_notifications(
        tenant=tenant,
        limit=max(1, limit),
        channels=filtered_channels,
    )
    return {
        "processed": len(processed),
        "tenant_code": tenant_code or "",
        "channels": filtered_channels or [],
        "status": "processed",
    }
