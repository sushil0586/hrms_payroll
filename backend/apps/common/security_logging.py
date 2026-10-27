"""Structured, allowlisted security audit logging."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone


class SecurityAuditJsonFormatter(logging.Formatter):
    """Serialize only the approved security-audit fields."""

    fields = (
        "security_event",
        "outcome",
        "reason",
        "actor_ref",
        "authorization_ref",
        "run_id",
        "scenario_id",
        "environment",
        "correlation_id",
        "tenant_ref",
    )

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        payload.update({field: getattr(record, field, "") for field in self.fields})
        return json.dumps(payload, separators=(",", ":"), sort_keys=True)
