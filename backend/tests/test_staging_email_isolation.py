import logging

import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage, get_connection
from django.test import override_settings


PROTECTED_BACKEND = "apps.common.email_backends.StagingRecipientAllowlistEmailBackend"
LOCMEM_BACKEND = "django.core.mail.backends.locmem.EmailBackend"


def _connection(*, allowed, fail_silently=False, allow_registered_users=False):
    settings = override_settings(
        HRMS_ENVIRONMENT="staging",
        HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS=allowed,
        HRMS_STAGING_EMAIL_ALLOW_REGISTERED_USERS=allow_registered_users,
        EMAIL_BACKEND=PROTECTED_BACKEND,
        EMAIL_TRANSPORT_BACKEND=LOCMEM_BACKEND,
    )
    settings.enable()
    connection = get_connection(fail_silently=fail_silently)
    return settings, connection


def test_staging_email_allows_only_exact_configured_recipients():
    override, connection = _connection(allowed=["qa.hrms@playwright.qa.invalid"])
    try:
        mail.outbox = []
        delivered = connection.send_messages(
            [EmailMessage(subject="Allowed", body="Synthetic", to=["QA.HRMS@playwright.qa.invalid"])]
        )
        assert delivered == 1
        assert len(mail.outbox) == 1
    finally:
        override.disable()


@pytest.mark.parametrize("allowed", [[], ["*@playwright.qa.invalid"], ["playwright.qa.invalid"]])
def test_staging_email_fails_closed_for_missing_or_non_exact_configuration(allowed):
    override, connection = _connection(allowed=allowed)
    try:
        with pytest.raises(PermissionError, match="unapproved recipient"):
            connection.send_messages(
                [EmailMessage(subject="Denied", body="Synthetic", to=["qa.hrms@playwright.qa.invalid"])]
            )
    finally:
        override.disable()


def test_staging_email_rejects_any_unapproved_to_cc_or_bcc_and_audits_hashes(caplog):
    override, connection = _connection(allowed=["qa.hrms@playwright.qa.invalid"])
    try:
        mail.outbox = []
        with caplog.at_level(logging.WARNING, logger="hrms.security.email"):
            with pytest.raises(PermissionError, match="unapproved recipient"):
                connection.send_messages(
                    [
                        EmailMessage(
                            subject="Denied",
                            body="Synthetic",
                            to=["qa.hrms@playwright.qa.invalid"],
                            cc=["real.employee@example.com"],
                        )
                    ]
                )
        assert mail.outbox == []
        record = next(record for record in caplog.records if record.message == "staging_email_recipient_denied")
        assert record.security_event == "staging_email_recipient_denied"
        assert len(record.denied_recipient_sha256) == 1
        assert "real.employee@example.com" not in caplog.text
    finally:
        override.disable()


def test_staging_email_fail_silently_blocks_delivery():
    override, connection = _connection(allowed=["qa.hrms@playwright.qa.invalid"], fail_silently=True)
    try:
        mail.outbox = []
        assert connection.send_messages(
            [EmailMessage(subject="Denied", body="Synthetic", to=["other@playwright.qa.invalid"])]
        ) == 0
        assert mail.outbox == []
    finally:
        override.disable()


@pytest.mark.django_db
def test_staging_email_allows_newly_registered_user_without_static_allowlist(django_user_model):
    django_user_model.objects.create_user(
        username="new-staging-user",
        email="new.user@example.test",
        password="not-used",
    )
    override, connection = _connection(allowed=[], allow_registered_users=True)
    try:
        mail.outbox = []
        delivered = connection.send_messages(
            [EmailMessage(subject="Allowed", body="Synthetic", to=["NEW.USER@example.test"])]
        )
        assert delivered == 1
        assert len(mail.outbox) == 1
    finally:
        override.disable()


@pytest.mark.django_db
def test_staging_email_still_rejects_unregistered_recipient(django_user_model):
    django_user_model.objects.create_user(
        username="registered-staging-user",
        email="registered.user@example.test",
        password="not-used",
    )
    override, connection = _connection(allowed=[], allow_registered_users=True)
    try:
        with pytest.raises(PermissionError, match="unapproved recipient"):
            connection.send_messages(
                [EmailMessage(subject="Denied", body="Synthetic", to=["external@example.test"])]
            )
    finally:
        override.disable()


@override_settings(
    HRMS_ENVIRONMENT="production",
    EMAIL_BACKEND=PROTECTED_BACKEND,
    EMAIL_TRANSPORT_BACKEND=LOCMEM_BACKEND,
    HRMS_STAGING_EMAIL_ALLOWED_RECIPIENTS=["qa.hrms@playwright.qa.invalid"],
)
def test_staging_backend_refuses_non_staging_use():
    connection = get_connection()
    with pytest.raises(ImproperlyConfigured, match="only in the staging environment"):
        connection.send_messages(
            [EmailMessage(subject="Denied", body="Synthetic", to=["qa.hrms@playwright.qa.invalid"])]
        )
