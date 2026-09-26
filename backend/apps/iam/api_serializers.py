"""Serializers for authentication and session APIs."""

from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import serializers

from apps.workflows.models import WorkflowAssignment, WorkflowInstanceStatus
from apps.iam.models import MembershipStatus, TenantMembership, User
from apps.iam.permission_catalog import get_permission_catalog
from apps.iam.permission_checks import get_user_tenant_permission_keys


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        password = attrs["password"]

        lookup_field = "email__iexact" if "@" in identifier else "username__iexact"
        user = User.objects.filter(**{lookup_field: identifier}).first()
        if not user:
            raise serializers.ValidationError("Invalid credentials.")

        authenticated_user = authenticate(
            request=self.context.get("request"),
            username=user.username,
            password=password,
        )
        if not authenticated_user or not authenticated_user.is_active:
            raise serializers.ValidationError("Invalid credentials.")

        attrs["user"] = authenticated_user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class MembershipSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    tenant_name = serializers.CharField()
    employee_code = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    is_default = serializers.BooleanField()
    role_codes = serializers.ListField(child=serializers.CharField())


class WorkspaceAccessSerializer(serializers.Serializer):
    ess = serializers.BooleanField()
    mss = serializers.BooleanField()
    hr_admin = serializers.BooleanField()
    tenant_admin = serializers.BooleanField()
    platform_admin = serializers.BooleanField()


class SessionUserSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    username = serializers.CharField()
    email = serializers.EmailField()
    display_name = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    must_change_password = serializers.BooleanField()
    default_membership = MembershipSummarySerializer(allow_null=True)
    memberships = MembershipSummarySerializer(many=True)
    workspace_access = WorkspaceAccessSerializer()
    effective_permissions = serializers.ListField(child=serializers.CharField())


class MenuCatalogEntrySerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    workspace = serializers.CharField()
    group = serializers.CharField(allow_blank=True)
    kind = serializers.CharField()
    href = serializers.CharField()
    label = serializers.CharField()
    short_label = serializers.CharField(allow_blank=True)
    blurb = serializers.CharField(allow_blank=True)
    permission_keys = serializers.ListField(child=serializers.CharField())
    sort_order = serializers.IntegerField()
    is_active = serializers.BooleanField()
    catalog_source = serializers.CharField(required=False, default="code")


def _membership_role_codes(membership: TenantMembership | None) -> list[str]:
    if not membership:
        return []
    return [
        membership_role.role.code
        for membership_role in membership.membership_roles.select_related("role")
        .filter(role__is_active=True)
        .order_by("-is_primary", "role__name")
    ]


def _membership_has_pending_mss_assignment(membership: TenantMembership | None) -> bool:
    if not membership:
        return False

    employee = getattr(membership, "employee", None)
    actor_identifiers = [str(membership.user_id)]
    if employee:
        actor_identifiers.append(str(employee.id))

    return WorkflowAssignment.objects.filter(
        step_instance__workflow_instance__subject_type__in=["leave_request", "attendance_regularization"],
        step_instance__status__in=[WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS],
    ).filter(Q(membership=membership) | Q(actor_identifier__in=actor_identifiers)).exists()


def build_workspace_access_payload(
    user: User,
    default_membership: TenantMembership | None,
    effective_permissions: list[str] | None = None,
) -> dict:
    role_codes = set(_membership_role_codes(default_membership))
    effective_permission_keys = set(effective_permissions or [])
    has_employee_context = bool(default_membership and getattr(default_membership, "employee", None))
    hr_permission_prefixes = (
        "employees.",
        "organization.",
        "documents.",
        "leave.",
        "attendance.",
        "lifecycle.",
        "letters.",
        "notifications.",
        "payroll.",
        "finance.",
        "statutory.",
        "reports.",
        "audit.hr.",
    )
    legacy_hr_admin_access = "hr-admin" in role_codes
    hr_admin_access = legacy_hr_admin_access or any(
        permission_key.startswith(hr_permission_prefixes)
        for permission_key in effective_permission_keys
    )
    tenant_admin_access = (
        legacy_hr_admin_access
        or "tenant-admin" in role_codes
        or any(permission_key.startswith("tenant.") for permission_key in effective_permission_keys)
    )
    mss_access = (
        legacy_hr_admin_access
        or "manager" in role_codes
        or "leave.requests.approve" in effective_permission_keys
        or "attendance.regularization.review" in effective_permission_keys
        or _membership_has_pending_mss_assignment(default_membership)
    )

    return {
        "ess": has_employee_context,
        "mss": mss_access,
        "hr_admin": hr_admin_access,
        "tenant_admin": tenant_admin_access,
        "platform_admin": bool(user.is_superuser),
    }


def build_membership_payload(membership: TenantMembership) -> dict:
    return {
        "id": membership.id,
        "tenant_id": membership.tenant_id,
        "tenant_code": membership.tenant.code,
        "tenant_name": membership.tenant.name,
        "employee_code": membership.employee_code,
        "status": membership.status,
        "is_default": membership.is_default,
        "role_codes": _membership_role_codes(membership),
    }


def build_session_user_payload(user: User) -> dict:
    memberships = list(
        TenantMembership.objects.filter(user=user, status=MembershipStatus.ACTIVE)
        .select_related("tenant")
        .prefetch_related("membership_roles__role", "employee")
        .order_by("-is_default", "created_at")
    )
    default_membership = memberships[0] if memberships else None
    effective_permissions = (
        sorted(get_user_tenant_permission_keys(user, default_membership.tenant))
        if default_membership
        else []
    )
    if user.is_superuser:
        platform_permissions = [
            item["key"]
            for item in get_permission_catalog()
            if "platform-admin" in item.get("default_role_codes", [])
        ]
        effective_permissions = sorted(set(effective_permissions) | set(platform_permissions))

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "must_change_password": user.must_change_password,
        "default_membership": build_membership_payload(default_membership) if default_membership else None,
        "memberships": [build_membership_payload(membership) for membership in memberships],
        "workspace_access": build_workspace_access_payload(user, default_membership, effective_permissions),
        "effective_permissions": effective_permissions,
    }
