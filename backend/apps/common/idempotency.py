"""Transactional idempotency for authenticated HTTP mutations."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Mapping
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from rest_framework import response, status

from apps.common.models import MutationIdempotencyRecord, MutationIdempotencyStatus


IDEMPOTENCY_HEADER = "HTTP_IDEMPOTENCY_KEY"


def request_fingerprint(payload: Mapping | list) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _conflict(detail: str, *, retry_after: int | None = None):
    result = response.Response({"detail": detail}, status=status.HTTP_409_CONFLICT)
    if retry_after is not None:
        result["Retry-After"] = str(retry_after)
    return result


def _lock_key(key: str) -> None:
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", [key])


def execute_idempotent_mutation(
    *,
    request,
    tenant,
    action: str,
    fingerprint_payload: Mapping | list,
    operation: Callable[[], response.Response],
):
    """Execute and persist an HTTP mutation/result atomically when a key exists."""

    key = str(request.META.get(IDEMPOTENCY_HEADER, "") or "").strip()
    if not key:
        return operation()
    if len(key) < 16 or len(key) > 160:
        return response.Response(
            {"detail": "Idempotency-Key must contain between 16 and 160 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    fingerprint = request_fingerprint(fingerprint_payload)
    retention_seconds = int(getattr(settings, "MUTATION_IDEMPOTENCY_REPLAY_SECONDS", 86400))

    with transaction.atomic():
        _lock_key(key)
        record = MutationIdempotencyRecord.objects.select_for_update().filter(idempotency_key=key).first()
        if record:
            if record.tenant_id != tenant.id or record.actor_identifier != str(request.user.id) or record.action != action:
                return _conflict("This idempotency key belongs to a different mutation scope.")
            if record.request_fingerprint != fingerprint:
                return _conflict("This idempotency key was already used with a different request payload.")
            if record.expires_at <= timezone.now():
                return _conflict("This idempotency key has expired and cannot be reused.")
            if record.status == MutationIdempotencyStatus.IN_PROGRESS:
                return _conflict("The original request is still in progress.", retry_after=1)
            if record.status == MutationIdempotencyStatus.SUCCEEDED or not record.is_retryable:
                replay = response.Response(record.response_payload, status=record.response_status)
                replay["Idempotency-Replayed"] = "true"
                return replay
            record.status = MutationIdempotencyStatus.IN_PROGRESS
            record.attempt_count += 1
            record.save(update_fields=["status", "attempt_count", "updated_at"])
        else:
            record = MutationIdempotencyRecord.objects.create(
                tenant=tenant,
                actor=request.user,
                actor_identifier=str(request.user.id),
                idempotency_key=key,
                action=action,
                request_fingerprint=fingerprint,
                expires_at=timezone.now() + timedelta(seconds=retention_seconds),
            )

        result = operation()
        payload = result.data if isinstance(result.data, (dict, list)) else {"detail": str(result.data)}
        record.response_status = result.status_code
        record.response_payload = payload
        record.resource_id = str(payload.get("id", "")) if isinstance(payload, dict) else ""
        record.status = (
            MutationIdempotencyStatus.SUCCEEDED
            if result.status_code < 400
            else MutationIdempotencyStatus.FAILED
        )
        record.is_retryable = result.status_code >= 500
        record.completed_at = timezone.now()
        record.save(
            update_fields=[
                "response_status", "response_payload", "resource_id", "status",
                "is_retryable", "completed_at", "updated_at",
            ]
        )
        result["Idempotency-Replayed"] = "false"
        return result
