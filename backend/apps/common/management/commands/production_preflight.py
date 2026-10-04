"""Fail-fast production readiness checks for the HRMS/payroll runtime."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.core.mail import get_connection
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from apps.payroll.providers import describe_payroll_provider_adapter_registry
from apps.payroll.storage import (
    describe_payroll_artifact_storage_policy_registry,
    resolve_payroll_artifact_storage_credential,
)


@dataclass(frozen=True)
class Gate:
    ref: str
    status: str
    detail: str
    severity: str = "blocker"

    def as_dict(self) -> dict[str, str]:
        return {
            "ref": self.ref,
            "status": self.status,
            "severity": self.severity,
            "detail": self.detail,
        }


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _configured_json_env(name: str) -> dict[str, Any]:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return {}
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise CommandError(f"{name} is not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise CommandError(f"{name} must be a JSON object.")
    return parsed


def _gate(ref: str, passed: bool, detail: str, *, severity: str = "blocker") -> Gate:
    return Gate(ref=ref, status="passed" if passed else "failed", detail=detail, severity=severity)


class Command(BaseCommand):
    help = "Runs fail-fast production readiness checks for external services and unsafe runtime modes."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Treat all production launch gates as required even outside config.settings.production.",
        )
        parser.add_argument(
            "--skip-network",
            action="store_true",
            help="Skip network connection probes. Intended only for static CI preflight.",
        )

    def handle(self, *args, **options):
        strict = bool(options["strict"] or getattr(settings, "HRMS_ENVIRONMENT", "") == "production")
        skip_network = bool(options["skip_network"])
        gates: list[Gate] = []

        gates.extend(self._settings_gates(strict=strict))
        gates.extend(self._database_gates(skip_network=skip_network))
        gates.extend(self._redis_gates(strict=strict, skip_network=skip_network))
        gates.extend(self._email_gates(strict=strict, skip_network=skip_network))
        gates.extend(self._worker_gates(strict=strict))
        gates.extend(self._provider_gates(strict=strict))
        gates.extend(self._storage_gates(strict=strict))

        failed_blockers = [gate for gate in gates if gate.status != "passed" and gate.severity == "blocker"]
        payload = {
            "status": "failed" if failed_blockers else "passed",
            "strict": strict,
            "skip_network": skip_network,
            "failed_blocker_count": len(failed_blockers),
            "gates": [gate.as_dict() for gate in gates],
        }

        if options["as_json"]:
            self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
        else:
            for gate in gates:
                style = self.style.SUCCESS if gate.status == "passed" else self.style.ERROR
                self.stdout.write(style(f"{gate.status.upper()} {gate.ref}: {gate.detail}"))
            self.stdout.write(
                (self.style.ERROR if failed_blockers else self.style.SUCCESS)(
                    f"Production preflight {payload['status']} with {len(failed_blockers)} blocker(s)."
                )
            )

        if failed_blockers:
            raise CommandError("Production preflight failed.")

    def _settings_gates(self, *, strict: bool) -> list[Gate]:
        auth_classes = list(settings.REST_FRAMEWORK.get("DEFAULT_AUTHENTICATION_CLASSES", []))
        demo_enabled = _env_bool("HRMS_ENABLE_DEMO_DATA", False)
        gates = [
            _gate("django.debug_disabled", not settings.DEBUG, "DEBUG is disabled."),
            _gate("demo.disabled", not demo_enabled, "HRMS_ENABLE_DEMO_DATA is false."),
            _gate(
                "auth.basic_disabled",
                "rest_framework.authentication.BasicAuthentication" not in auth_classes,
                "DRF BasicAuthentication is not enabled.",
            ),
        ]
        if strict:
            gates.extend(
                [
                    _gate("cookies.session_secure", bool(getattr(settings, "SESSION_COOKIE_SECURE", False)), "Session cookie is secure."),
                    _gate("cookies.csrf_secure", bool(getattr(settings, "CSRF_COOKIE_SECURE", False)), "CSRF cookie is secure."),
                    _gate("hosts.configured", bool(getattr(settings, "ALLOWED_HOSTS", [])), "Allowed hosts configured."),
                    _gate(
                        "enterprise_identity.scope_declared",
                        os.getenv("HRMS_ENTERPRISE_IDENTITY_STATUS", "").strip().lower() in {"verified", "not_in_scope"},
                        "Enterprise identity status is declared as verified or not_in_scope.",
                    ),
                ]
            )
        return gates

    def _database_gates(self, *, skip_network: bool) -> list[Gate]:
        engine = connection.settings_dict.get("ENGINE", "")
        gates = [
            _gate(
                "db.postgres_engine",
                "postgresql" in engine,
                f"Database engine is {engine}.",
                severity="blocker",
            )
        ]
        if not skip_network:
            try:
                connection.ensure_connection()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                gates.append(_gate("db.connectivity", True, "Database connection succeeded."))
            except Exception as exc:  # pragma: no cover - depends on deployment.
                gates.append(_gate("db.connectivity", False, f"Database connection failed: {exc.__class__.__name__}: {exc}"))
        return gates

    def _redis_gates(self, *, strict: bool, skip_network: bool) -> list[Gate]:
        broker_url = str(getattr(settings, "CELERY_BROKER_URL", "") or "")
        gates = [_gate("redis.broker_url", broker_url.startswith("redis://") or broker_url.startswith("rediss://"), "Redis broker URL configured.")]
        if skip_network:
            return gates
        try:
            import redis

            redis.Redis.from_url(broker_url, socket_connect_timeout=3, socket_timeout=3).ping()
            gates.append(_gate("redis.ping", True, "Redis ping succeeded."))
        except Exception as exc:  # pragma: no cover - depends on deployment.
            gates.append(_gate("redis.ping", not strict, f"Redis ping failed: {exc.__class__.__name__}: {exc}"))
        return gates

    def _email_gates(self, *, strict: bool, skip_network: bool) -> list[Gate]:
        backend = str(getattr(settings, "EMAIL_BACKEND", ""))
        unsafe_backends = {
            "django.core.mail.backends.console.EmailBackend",
            "django.core.mail.backends.locmem.EmailBackend",
            "django.core.mail.backends.dummy.EmailBackend",
            "django.core.mail.backends.filebased.EmailBackend",
        }
        gates = [
            _gate("email.backend_live", backend not in unsafe_backends, f"Email backend is {backend}."),
            _gate("email.from_configured", bool(str(getattr(settings, "DEFAULT_FROM_EMAIL", "")).strip()), "Default sender configured."),
        ]
        if skip_network or backend in unsafe_backends:
            return gates
        try:
            connection_obj = get_connection(timeout=10)
            connection_obj.open()
            connection_obj.close()
            gates.append(_gate("email.connectivity", True, "Email provider connection opened."))
        except Exception as exc:  # pragma: no cover - depends on deployment.
            gates.append(_gate("email.connectivity", not strict, f"Email connection failed: {exc.__class__.__name__}: {exc}"))
        return gates

    def _worker_gates(self, *, strict: bool) -> list[Gate]:
        beat_schedule = getattr(settings, "CELERY_BEAT_SCHEDULE", {}) or {}
        return [
            _gate(
                "notifications.processor_enabled",
                bool(getattr(settings, "NOTIFICATION_PROCESSOR_ENABLED", False)),
                "Notification processor is enabled.",
                severity="blocker" if strict else "warning",
            ),
            _gate(
                "notifications.beat_scheduled",
                "process-pending-notifications" in beat_schedule,
                "Notification Celery beat schedule is registered.",
                severity="blocker" if strict else "warning",
            ),
            _gate(
                "payroll.worker_declared",
                _env_bool("HRMS_PAYROLL_PROVIDER_WORKER_ENABLED", False),
                "Payroll provider worker deployment is declared by HRMS_PAYROLL_PROVIDER_WORKER_ENABLED.",
                severity="blocker" if strict else "warning",
            ),
        ]

    def _provider_gates(self, *, strict: bool) -> list[Gate]:
        credential_entries = _configured_json_env("HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON")
        registry = describe_payroll_provider_adapter_registry()
        has_runtime_credentials = bool(credential_entries or getattr(settings, "PAYROLL_PROVIDER_CREDENTIALS", {}))
        production_ready_adapters = [
            item
            for item in registry["adapters"]
            if item.get("status") == "ready"
            and (
                item.get("capabilities", {}).get("is_production_pack")
                or item.get("capabilities", {}).get("is_bank_live_payout")
                or item.get("capabilities", {}).get("is_accounting_live_journal")
                or item.get("capabilities", {}).get("is_statutory_live_filing")
                or item.get("capabilities", {}).get("is_http_json")
            )
        ]
        return [
            _gate("payroll.providers.credentials", has_runtime_credentials, "Payroll provider runtime credentials configured."),
            _gate("payroll.providers.registry", bool(production_ready_adapters), "Production-capable payroll provider adapter is registered."),
            _gate(
                "payroll.providers.no_blocked_adapters",
                not registry.get("blocked_adapter_refs"),
                "No payroll provider adapters are blocked.",
                severity="blocker" if strict else "warning",
            ),
        ]

    def _storage_gates(self, *, strict: bool) -> list[Gate]:
        credential_entries = _configured_json_env("HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON")
        policy_registry = describe_payroll_artifact_storage_policy_registry()
        mode = str(getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE", "")).lower()
        credential_gate = bool(credential_entries or getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CREDENTIALS", {}))
        credential_refs_ready = True
        credential_refs = list(credential_entries or getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CREDENTIALS", {}))
        for credential_ref in credential_refs:
            entry = (credential_entries or getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CREDENTIALS", {})).get(credential_ref, {})
            family = str(entry.get("provider_family") or entry.get("family") or "").strip().lower()
            if family:
                try:
                    resolve_payroll_artifact_storage_credential(credential_ref, provider_family=family)
                except Exception:
                    credential_refs_ready = False
        return [
            _gate("payroll.storage.credentials", credential_gate, "Payroll artifact storage credentials configured."),
            _gate("payroll.storage.credential_refs", credential_refs_ready, "Configured storage credential refs resolve."),
            _gate("payroll.storage.policies", policy_registry["configured_storage_policy_count"] > 0, "Storage policies configured."),
            _gate("payroll.storage.strict_controls", mode == "strict", f"Storage control verification mode is {mode}."),
            _gate(
                "payroll.storage.no_blocked_policies",
                not policy_registry["blocked_storage_policy_refs"],
                "No storage policies are blocked.",
                severity="blocker" if strict else "warning",
            ),
        ]
