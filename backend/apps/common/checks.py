"""Project-specific deployment checks."""

from __future__ import annotations

import os

from django.conf import settings
from django.core.checks import Error, Warning, register


WEAK_SECRET_KEYS = {
    "",
    "change-me",
    "change-me-in-real-environments",
    "django-insecure-change-me",
}


@register(deploy=True)
def production_safety_checks(app_configs, **kwargs):  # noqa: ARG001
    issues = []

    if settings.DEBUG:
        issues.append(Error("DEBUG must be disabled for production.", id="hrms.E001"))

    if str(getattr(settings, "SECRET_KEY", "")).strip() in WEAK_SECRET_KEYS:
        issues.append(Error("DJANGO_SECRET_KEY is still using a placeholder value.", id="hrms.E002"))

    if not getattr(settings, "ALLOWED_HOSTS", []):
        issues.append(Error("DJANGO_ALLOWED_HOSTS must be configured for production.", id="hrms.E003"))

    if not getattr(settings, "CSRF_TRUSTED_ORIGINS", []):
        issues.append(Warning("DJANGO_CSRF_TRUSTED_ORIGINS should be configured for the production app URL.", id="hrms.W001"))

    if not getattr(settings, "SESSION_COOKIE_SECURE", False):
        issues.append(Error("SESSION_COOKIE_SECURE must be true for production.", id="hrms.E004"))

    if not getattr(settings, "CSRF_COOKIE_SECURE", False):
        issues.append(Error("CSRF_COOKIE_SECURE must be true for production.", id="hrms.E005"))

    if not getattr(settings, "SECURE_SSL_REDIRECT", False):
        issues.append(Warning("SECURE_SSL_REDIRECT should be true unless TLS is enforced before Django.", id="hrms.W002"))

    database = getattr(settings, "DATABASES", {}).get("default", {})
    if database.get("PASSWORD") in {"", "postgres", "password"}:
        issues.append(Warning("Default database password looks like a local placeholder.", id="hrms.W003"))

    auth_classes = settings.REST_FRAMEWORK.get("DEFAULT_AUTHENTICATION_CLASSES", [])
    if "rest_framework.authentication.BasicAuthentication" in auth_classes:
        issues.append(Error("DRF BasicAuthentication must not be enabled for production.", id="hrms.E006"))

    if os.getenv("HRMS_ENABLE_DEMO_DATA", "").strip().lower() in {"1", "true", "yes", "on"}:
        issues.append(Error("HRMS_ENABLE_DEMO_DATA must be false for production.", id="hrms.E007"))

    unsafe_email_backends = {
        "django.core.mail.backends.console.EmailBackend",
        "django.core.mail.backends.locmem.EmailBackend",
        "django.core.mail.backends.dummy.EmailBackend",
        "django.core.mail.backends.filebased.EmailBackend",
    }
    if getattr(settings, "EMAIL_BACKEND", "") in unsafe_email_backends:
        issues.append(Error("Production email must use a live provider backend.", id="hrms.E008"))

    if not getattr(settings, "NOTIFICATION_PROCESSOR_ENABLED", False):
        issues.append(Error("HRMS_NOTIFICATION_PROCESSOR_ENABLED must be true for production.", id="hrms.E009"))

    if getattr(settings, "PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE", "") != "strict":
        issues.append(Error("Payroll artifact storage control verification must be strict in production.", id="hrms.E010"))

    return issues
