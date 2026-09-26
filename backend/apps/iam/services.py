"""Account email and password reset helpers."""

from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage
from django.utils.encoding import DjangoUnicodeDecodeError, force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.notifications.models import (
    Notification,
    NotificationAudienceType,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
)


PASSWORD_RESET_REQUEST_DETAIL = (
    "If the account exists, a secure password setup link will be sent shortly."
)


def _public_app_url() -> str:
    return str(getattr(settings, "HRMS_PUBLIC_APP_URL", "http://localhost:3000")).rstrip("/")


def build_password_reset_link(user: User) -> str:
    """Builds a browser URL for password setup/reset using Django's signed token."""

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    return f"{_public_app_url()}/reset-password?{query}"


def resolve_password_reset_user(*, uid: str, token: str) -> User | None:
    """Returns the user only when the reset token is still valid."""

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
    except (DjangoUnicodeDecodeError, ValueError, TypeError, UnicodeDecodeError):
        return None
    user = User.objects.filter(id=user_id, is_active=True).first()
    if not user or not default_token_generator.check_token(user, token):
        return None
    return user


def _best_membership_for_account_email(user: User) -> TenantMembership | None:
    return (
        TenantMembership.objects.filter(
            user=user,
            status__in=[MembershipStatus.ACTIVE, MembershipStatus.INVITED],
        )
        .select_related("tenant")
        .order_by("-is_default", "created_at")
        .first()
    )


def _queue_account_notification(
    *,
    user: User,
    subject_type: str,
    subject: str,
    body: str,
    payload: dict,
    membership: TenantMembership | None = None,
) -> Notification | None:
    resolved_membership = membership or _best_membership_for_account_email(user)
    if resolved_membership:
        return Notification.objects.create(
            tenant=resolved_membership.tenant,
            channel=NotificationChannel.EMAIL,
            audience_type=NotificationAudienceType.MEMBERSHIP,
            recipient_membership=resolved_membership,
            recipient_identifier=user.username,
            recipient_address=user.email,
            subject_type=subject_type,
            subject_identifier=str(user.id),
            title=subject,
            subject=subject,
            body=body,
            status=NotificationStatus.PENDING,
            priority=NotificationPriority.NORMAL,
            payload=payload,
        )

    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[user.email],
    )
    message.send(fail_silently=False)
    return None


def queue_password_reset_email(user: User) -> Notification | None:
    reset_link = build_password_reset_link(user)
    subject = "Reset your Accerio HRMS password"
    body = (
        f"Hello {user.display_name or user.first_name or user.username},\n\n"
        "Use the secure link below to set a new password for your Accerio HRMS account.\n\n"
        f"{reset_link}\n\n"
        "This link expires automatically. If you did not request this, you can ignore this email."
    )
    notification = _queue_account_notification(
        user=user,
        subject_type="account_password_reset",
        subject=subject,
        body=body,
        payload={"account_email_type": "password_reset", "user_id": str(user.id)},
    )
    _record_account_audit_event(user=user, event_type="account_password_reset_requested")
    return notification


def queue_invite_email(*, membership: TenantMembership, generated_password: str = "") -> Notification | None:
    user = membership.user
    setup_link = build_password_reset_link(user)
    workspace_name = membership.tenant.name
    subject = f"You are invited to {workspace_name} on Accerio HRMS"
    body = (
        f"Hello {user.display_name or user.first_name or user.username},\n\n"
        f"You have been invited to the {workspace_name} workspace on Accerio HRMS.\n\n"
        f"Username: {user.username}\n"
        f"Workspace: {workspace_name}\n\n"
        "Set your password and sign in using this secure setup link:\n"
        f"{setup_link}\n\n"
        "For security, temporary passwords are not included in this email."
    )
    return _queue_account_notification(
        user=user,
        membership=membership,
        subject_type="account_invite",
        subject=subject,
        body=body,
        payload={
            "account_email_type": "invite",
            "membership_id": str(membership.id),
            "tenant_code": membership.tenant.code,
            "generated_password_was_created": bool(generated_password),
        },
    )


def complete_password_reset(*, uid: str, token: str, password: str, password_confirm: str) -> User | None:
    if password != password_confirm:
        raise ValueError("Passwords do not match.")
    user = resolve_password_reset_user(uid=uid, token=token)
    if not user:
        return None
    password_validation.validate_password(password, user=user)
    user.set_password(password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])

    from rest_framework.authtoken.models import Token

    Token.objects.filter(user=user).delete()
    _record_account_audit_event(user=user, event_type="account_password_reset_completed")
    return user


def _record_account_audit_event(*, user: User, event_type: str) -> None:
    membership = _best_membership_for_account_email(user)
    if not membership:
        return
    try:
        from apps.common.selectors import record_saas_commercial_audit_event

        record_saas_commercial_audit_event(
            membership.tenant,
            event_type=event_type,
            actor_identifier=user.username,
            source_ref="iam.account_email.v1",
            event_snapshot={
                "user_id": str(user.id),
                "username": user.username,
                "email": user.email,
            },
        )
    except Exception:
        return
