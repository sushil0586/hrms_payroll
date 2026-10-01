import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership, User
from apps.iam.services import build_password_reset_link, queue_invite_email
from apps.notifications.models import Notification, NotificationChannel, NotificationEventDefinition, NotificationStatus
from apps.notifications.services import trigger_notification_event
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


@pytest.mark.django_db
def test_seed_operational_email_notifications_creates_launch_email_catalog(tenant_user):
    tenant, _, _ = tenant_user

    call_command("seed_operational_email_notifications", tenant_code=tenant.code)

    email_events = NotificationEventDefinition.objects.filter(
        tenant=tenant,
        channel=NotificationChannel.EMAIL,
        is_active=True,
    )
    trigger_keys = set(email_events.values_list("trigger_key", flat=True))

    assert "leave.request.manager_pending" in trigger_keys
    assert "leave.request.employee_updated" in trigger_keys
    assert "attendance.regularization.manager_pending" in trigger_keys
    assert "attendance.regularization.employee_updated" in trigger_keys
    assert "documents.employee.reupload_requested" in trigger_keys
    assert "documents.employee.expiry_attention" in trigger_keys
    assert "payroll_payslip_published" in trigger_keys
    assert "hrms.launch_remediation.reminder" in trigger_keys
    assert "hrms.launch_remediation.escalated" in trigger_keys
    assert all(event.template and event.template.status == "active" for event in email_events)


@pytest.mark.django_db
def test_role_targeted_email_event_fans_out_to_active_role_members(tenant_user):
    tenant, _, _ = tenant_user
    call_command("seed_operational_email_notifications", tenant_code=tenant.code)
    role = Role.objects.create(tenant=tenant, code="payroll-admin", name="Payroll Admin")
    users = [
        User.objects.create_user(
            username="payroll.owner.one",
            email="payroll.owner.one@example.com",
            password=PASSWORD,
            is_active=True,
        ),
        User.objects.create_user(
            username="payroll.owner.two",
            email="payroll.owner.two@example.com",
            password=PASSWORD,
            is_active=True,
        ),
    ]
    for index, user in enumerate(users):
        membership = TenantMembership.objects.create(
            tenant=tenant,
            user=user,
            employee_code=f"PAY-{index + 1:03d}",
            status=MembershipStatus.ACTIVE,
        )
        MembershipRole.objects.create(membership=membership, role=role, is_primary=True)

    created = trigger_notification_event(
        tenant=tenant,
        module="saas_operations",
        trigger_key="hrms.launch_remediation.reminder",
        subject_type="hrms_launch_remediation_assignment",
        subject_identifier="assignment-1",
        recipient_role=role,
        recipient_identifier=role.code,
        fallback_title="Launch remediation reminder",
        fallback_body="Resolve this launch action.",
        payload={"assignment_id": "assignment-1"},
    )

    assert len(created) == 2
    assert {item.recipient_membership.user.email for item in created} == {
        "payroll.owner.one@example.com",
        "payroll.owner.two@example.com",
    }
    assert all(item.channel == NotificationChannel.EMAIL for item in created)
