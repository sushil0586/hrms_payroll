#!/usr/bin/env python3
"""Validate the non-secret staging deployment contract without contacting providers."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urlparse


DIGEST_IMAGE = re.compile(r"^[^\s]+@sha256:[0-9a-f]{64}$")
PLACEHOLDER_MARKERS = (
    "change-me",
    "example.com",
    "registry.invalid",
    "replace-me",
    "replace-with",
    "secret-ref",
    "<",
    ">",
)


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    detail: str


def _env_file(path: Path | None) -> dict[str, str]:
    values: dict[str, str] = {}
    if path is None:
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def _is_true(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _is_false(value: str) -> bool:
    return value.strip().lower() in {"0", "false", "no", "off"}


def _non_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    return bool(lowered) and not any(marker in lowered for marker in PLACEHOLDER_MARKERS)


def _https_origin(value: str) -> bool:
    parsed = urlparse(value.strip())
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.path.rstrip("/")


def _json_object(value: str) -> bool:
    try:
        payload = json.loads(value)
        return isinstance(payload, dict) and bool(payload) and _non_placeholder(json.dumps(payload, sort_keys=True))
    except (TypeError, ValueError):
        return False


def validate(values: dict[str, str]) -> list[Check]:
    get = lambda key: values.get(key, os.environ.get(key, ""))
    checks = [
        Check("images.backend_digest", bool(DIGEST_IMAGE.fullmatch(get("HRMS_BACKEND_IMAGE"))) and _non_placeholder(get("HRMS_BACKEND_IMAGE")), "Backend image is pinned by sha256 digest."),
        Check("images.web_digest", bool(DIGEST_IMAGE.fullmatch(get("HRMS_WEB_IMAGE"))) and _non_placeholder(get("HRMS_WEB_IMAGE")), "Web image is pinned by sha256 digest."),
        Check("django.secret", len(get("DJANGO_SECRET_KEY")) >= 50 and _non_placeholder(get("DJANGO_SECRET_KEY")), "Django secret is externally injected and non-placeholder."),
        Check("django.hosts", _non_placeholder(get("DJANGO_ALLOWED_HOSTS")), "Allowed hosts are explicitly configured."),
        Check("django.csrf", all(_https_origin(origin) for origin in get("DJANGO_CSRF_TRUSTED_ORIGINS").split(",") if origin.strip()) and bool(get("DJANGO_CSRF_TRUSTED_ORIGINS").strip()), "CSRF origins are HTTPS origins."),
        Check("django.secure_cookies", _is_true(get("DJANGO_SESSION_COOKIE_SECURE")) and _is_true(get("DJANGO_CSRF_COOKIE_SECURE")), "Session and CSRF cookies are secure."),
        Check("django.ssl_redirect", _is_true(get("DJANGO_SECURE_SSL_REDIRECT")), "HTTPS redirect is enabled."),
        Check("django.hsts", int(get("DJANGO_SECURE_HSTS_SECONDS") or 0) >= 31536000 and _is_true(get("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS")) and _is_true(get("DJANGO_SECURE_HSTS_PRELOAD")), "One-year HSTS with subdomains and preload is configured."),
        Check("runtime.demo_disabled", _is_false(get("HRMS_ENABLE_DEMO_DATA")), "Demo data is disabled."),
        Check("runtime.erasure_disabled", _is_false(get("HRMS_DATA_ERASURE_EXECUTION_ENABLED")), "Irreversible erasure remains disabled."),
        Check("database.tls", get("DATABASE_URL").startswith("postgresql://") and "sslmode=" in get("DATABASE_URL") and "sslmode=disable" not in get("DATABASE_URL") and _non_placeholder(get("DATABASE_URL")), "PostgreSQL URL requires an explicit non-disabled SSL mode."),
        Check("broker.tls", get("REDIS_URL").startswith("rediss://") and _non_placeholder(get("REDIS_URL")), "Redis broker uses TLS."),
        Check("broker.managed", get("HRMS_BROKER_DURABILITY_MODE") == "managed-persistent", "Persistent managed broker mode is declared."),
        Check("storage.provider", get("HRMS_DOCUMENT_STORAGE_PROVIDER") not in {"", "local"}, "Employee documents use a non-local storage provider."),
        Check("storage.scanner", _non_placeholder(get("HRMS_DOCUMENT_MALWARE_SCANNER_REF")), "A malware scanner integration reference is configured."),
        Check("storage.payroll_strict", get("PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE") == "strict", "Payroll artifact storage verification is strict."),
        Check("storage.payroll_credentials", _json_object(get("HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON")), "Payroll storage credentials resolve through a non-empty secret-backed map."),
        Check("storage.payroll_policies", _json_object(get("HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON")), "Payroll storage policies are configured."),
        Check("backup.encryption", _non_placeholder(get("HRMS_BACKUP_AGE_RECIPIENT")), "Backup encryption recipient is externally configured."),
        Check("backup.offsite", _non_placeholder(get("HRMS_BACKUP_OFFSITE_URI")), "Encrypted backup off-site destination is configured."),
        Check("observability.logs", get("HRMS_CENTRAL_LOGGING_ENABLED").lower() == "true" and _non_placeholder(get("HRMS_CENTRAL_LOG_DESTINATION")), "Central logging destination is declared."),
        Check("observability.alerts", _non_placeholder(get("HRMS_ALERTMANAGER_ROUTE")) and _non_placeholder(get("HRMS_INCIDENT_OWNER")), "Alert route and incident owner are declared."),
        Check("deployment.strategy", get("HRMS_DEPLOYMENT_STRATEGY") in {"rolling", "blue-green"}, "A controlled deployment strategy is declared."),
    ]
    return checks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    checks = validate(_env_file(args.env_file))
    payload = {"status": "passed" if all(item.passed for item in checks) else "failed", "checks": [asdict(item) for item in checks]}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for item in checks:
            print(f"{'PASS' if item.passed else 'FAIL'} {item.name}: {item.detail}")
    return 0 if payload["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
