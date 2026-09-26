import pytest
from rest_framework.test import APIClient

from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.iam.services import build_password_reset_link, queue_invite_email
from apps.notifications.models import Notification, NotificationChannel, NotificationStatus
from apps.tenants.models import Tenant, TenantStatus


PASSWORD = "Password@123"
NEW_PASSWORD = "BetterPass@456"


@pytest.fixture()
def tenant_user(db):
    tenant = Tenant.objects.create(
        code="emailco",
        name="Email Co",
        status=TenantStatus.ACTIVE,
        primary_email="owner@emailco.test",
    )
    user = User.objects.create_user(
        username="email.user",
        email="email.user@example.com",
        password=PASSWORD,
        is_active=True,
        display_name="Email User",
    )
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        employee_code="EMAIL-001",
        status=MembershipStatus.ACTIVE,
        is_default=True,
    )
    return tenant, user, membership


@pytest.mark.django_db
def test_password_reset_request_queues_email_and_confirm_resets_password(settings, tenant_user):
    settings.HRMS_PUBLIC_APP_URL = "https://hrms.accerio.in"
    _, user, _ = tenant_user
    client = APIClient()

    request_response = client.post(
        "/api/v1/auth/password-reset/request/",
        {"identifier": "EMAIL.USER@example.com"},
        format="json",
    )

    assert request_response.status_code == 200
    notification = Notification.objects.get(subject_type="account_password_reset")
    assert notification.channel == NotificationChannel.EMAIL
    assert notification.status == NotificationStatus.PENDING
    assert notification.recipient_address == user.email
    assert "https://hrms.accerio.in/reset-password?" in notification.body

    reset_link = build_password_reset_link(user)
    query = dict(item.split("=", 1) for item in reset_link.split("?", 1)[1].split("&"))
    confirm_response = client.post(
        "/api/v1/auth/password-reset/confirm/",
        {
            "uid": query["uid"],
            "token": query["token"],
            "password": NEW_PASSWORD,
            "password_confirm": NEW_PASSWORD,
        },
        format="json",
    )

    assert confirm_response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(PASSWORD)
    assert user.must_change_password is False

    reused_response = client.post(
        "/api/v1/auth/password-reset/confirm/",
        {
            "uid": query["uid"],
            "token": query["token"],
            "password": "AnotherPass@789",
            "password_confirm": "AnotherPass@789",
        },
        format="json",
    )
    assert reused_response.status_code == 400


@pytest.mark.django_db
def test_password_reset_request_does_not_disclose_missing_accounts(tenant_user):
    client = APIClient()

    response = client.post(
        "/api/v1/auth/password-reset/request/",
        {"identifier": "missing@example.com"},
        format="json",
    )

    assert response.status_code == 200
    assert Notification.objects.count() == 0


@pytest.mark.django_db
def test_invite_email_queues_secure_setup_link(settings, tenant_user):
    settings.HRMS_PUBLIC_APP_URL = "https://hrms.accerio.in"
    _, user, membership = tenant_user

    generated_password = "SecretValue123!"
    notification = queue_invite_email(membership=membership, generated_password=generated_password)

    assert notification is not None
    assert notification.subject_type == "account_invite"
    assert notification.recipient_address == user.email
    assert "https://hrms.accerio.in/reset-password?" in notification.body
    assert generated_password not in notification.body
    assert notification.payload["generated_password_was_created"] is True
