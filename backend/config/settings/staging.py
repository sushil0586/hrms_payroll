"""Staging settings."""

from .base import *  # noqa: F403,F401


DEBUG = False
HRMS_ENVIRONMENT = "staging"
EMAIL_TRANSPORT_BACKEND = os.getenv("DJANGO_EMAIL_TRANSPORT_BACKEND", EMAIL_BACKEND)  # noqa: F405
EMAIL_BACKEND = "apps.common.email_backends.StagingRecipientAllowlistEmailBackend"
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", False)  # noqa: F405
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", False)  # noqa: F405
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)  # noqa: F405

REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
}
