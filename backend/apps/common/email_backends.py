"""Fail-closed outbound email controls for the staging environment."""

from __future__ import annotations

import hashlib
import logging
from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.utils.module_loading import import_string


logger = logging.getLogger("hrms.security.email")
BACKEND_PATH = "apps.common.email_backends.StagingRecipientAllowlistEmailBackend"


def _normalize_address(value: str) -> str:
    return parseaddr(str(value or ""))[1].strip().lower()


def _allowed_recipients() -> set[str]:
    configured = getattr(settings, "HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS", ())
    normalized = {_normalize_address(value) for value in configured}
    if not normalized or "" in normalized or any("*" in value or "@" not in value for value in normalized):
        return set()
    return normalized


class StagingRecipientAllowlistEmailBackend(BaseEmailBackend):
    """Delegates mail only when every staging recipient is explicitly approved."""

    def __init__(self, *args, **kwargs):
        super().__init__(fail_silently=kwargs.pop("fail_silently", False))
        transport_path = str(getattr(settings, "EMAIL_TRANSPORT_BACKEND", "")).strip()
        if not transport_path or transport_path == BACKEND_PATH:
            raise ImproperlyConfigured("A separate EMAIL_TRANSPORT_BACKEND is required for staging email.")
        transport_class = import_string(transport_path)
        self.transport = transport_class(*args, fail_silently=self.fail_silently, **kwargs)

    def open(self):
        return self.transport.open()

    def close(self):
        return self.transport.close()

    def send_messages(self, email_messages):
        messages = list(email_messages or ())
        if not messages:
            return 0
        if getattr(settings, "HRMS_ENVIRONMENT", "") != "staging":
            raise ImproperlyConfigured("The staging recipient backend may run only in the staging environment.")

        allowed = _allowed_recipients()
        for message in messages:
            recipients = {_normalize_address(value) for value in message.recipients()}
            denied = sorted(value for value in recipients if not value or value not in allowed)
            if not allowed or denied:
                recipient_hashes = [hashlib.sha256(value.encode("utf-8")).hexdigest() for value in denied]
                logger.warning(
                    "staging_email_recipient_denied",
                    extra={
                        "security_event": "staging_email_recipient_denied",
                        "denied_recipient_sha256": recipient_hashes,
                        "configured_recipient_count": len(allowed),
                    },
                )
                if self.fail_silently:
                    return 0
                raise PermissionError("Staging email contains an unapproved recipient.")

        return self.transport.send_messages(messages)
