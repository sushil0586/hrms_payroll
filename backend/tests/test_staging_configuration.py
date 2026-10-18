from pathlib import Path
import importlib.util
import sys


SCRIPT = Path(__file__).resolve().parents[2] / "ops" / "staging" / "validate_staging_config.py"
SPEC = importlib.util.spec_from_file_location("staging_config", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)


def _valid_values():
    values = module._env_file(SCRIPT.parent / "staging.env.example")
    values.update(
        {
            "HRMS_BACKEND_IMAGE": "registry.internal/hrms-backend@sha256:" + "a" * 64,
            "HRMS_WEB_IMAGE": "registry.internal/hrms-web@sha256:" + "b" * 64,
            "DJANGO_SECRET_KEY": "s" * 64,
            "DJANGO_ALLOWED_HOSTS": "stage.hrms.test",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "https://stage.hrms.test",
            "DATABASE_URL": "postgresql://app@postgres.internal/hrms?sslmode=verify-full",
            "REDIS_URL": "rediss://app@redis.internal:6379/0",
            "HRMS_DOCUMENT_MALWARE_SCANNER_REF": "scanner.clamav.v1",
            "HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON": '{"staging-object-store":{"provider_family":"s3","use_default_credentials":true}}',
            "HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON": '{"staging-private-artifacts":{"status":"verified"}}',
            "HRMS_BACKUP_AGE_RECIPIENT": "age1validrecipient",
            "HRMS_BACKUP_OFFSITE_URI": "s3://private-backups/hrms",
            "HRMS_CENTRAL_LOG_DESTINATION": "otel-collector.internal:4317",
            "HRMS_ALERTMANAGER_ROUTE": "security-and-payroll-oncall",
            "HRMS_INCIDENT_OWNER": "platform-oncall",
        }
    )
    return values


def test_staging_contract_accepts_safe_complete_configuration():
    assert all(check.passed for check in module.validate(_valid_values()))


def test_staging_contract_fails_closed_for_local_storage_plaintext_services_and_mutable_images():
    values = _valid_values()
    values.update(
        {
            "HRMS_BACKEND_IMAGE": "hrms-backend:latest",
            "DATABASE_URL": "postgresql://db/hrms?sslmode=disable",
            "REDIS_URL": "redis://redis:6379/0",
            "HRMS_DOCUMENT_STORAGE_PROVIDER": "local",
        }
    )
    failed = {check.name for check in module.validate(values) if not check.passed}
    assert {"images.backend_digest", "database.tls", "broker.tls", "storage.provider"} <= failed


def test_staging_contract_keeps_irreversible_erasure_disabled():
    values = _valid_values()
    values["HRMS_DATA_ERASURE_EXECUTION_ENABLED"] = "true"
    failed = {check.name for check in module.validate(values) if not check.passed}
    assert "runtime.erasure_disabled" in failed


def test_checked_in_placeholder_contract_is_rejected_across_external_dependencies():
    values = module._env_file(SCRIPT.parent / "staging.env.example")
    failed = {check.name for check in module.validate(values) if not check.passed}
    assert {
        "images.backend_digest",
        "images.web_digest",
        "django.secret",
        "django.hosts",
        "database.tls",
        "broker.tls",
        "storage.scanner",
        "storage.payroll_credentials",
        "storage.payroll_policies",
        "backup.encryption",
        "backup.offsite",
        "observability.logs",
        "observability.alerts",
    } <= failed
