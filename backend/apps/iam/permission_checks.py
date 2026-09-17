"""Helpers for resolving tenant-scoped RBAC permissions."""

from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from apps.iam.models import MembershipStatus, Role, TenantMembership, User
from apps.iam.permission_catalog import get_permission_catalog
from apps.tenants.models import Tenant


def _default_permission_keys_by_role_code() -> dict[str, set[str]]:
    defaults: dict[str, set[str]] = {}
    for permission in get_permission_catalog():
        for role_code in permission.get("default_role_codes", []):
            defaults.setdefault(role_code, set()).add(permission["key"])
    return defaults


DEFAULT_PERMISSION_KEYS_BY_ROLE_CODE = _default_permission_keys_by_role_code()


def get_role_permission_keys(role: Role) -> set[str]:
    """Return effective permission keys for a role.

    Explicit RolePermission rows win. Roles without explicit rows fall back to
    the product-owned catalog defaults so existing system roles continue to
    work during the RBAC rollout.
    """

    explicit_keys = set(role.permissions.values_list("permission_key", flat=True))
    if explicit_keys:
        return explicit_keys
    return set(DEFAULT_PERMISSION_KEYS_BY_ROLE_CODE.get(role.code, set()))


def get_user_tenant_permission_keys(user: User | AnonymousUser, tenant: Tenant) -> set[str]:
    if not getattr(user, "is_authenticated", False):
        return set()
    membership = (
        TenantMembership.objects.filter(tenant=tenant, user=user, status=MembershipStatus.ACTIVE)
        .prefetch_related("membership_roles__role__permissions")
        .first()
    )
    if not membership:
        return set()
    permission_keys: set[str] = set()
    for membership_role in membership.membership_roles.all():
        role = membership_role.role
        if role.is_active:
            permission_keys.update(get_role_permission_keys(role))
    return permission_keys


def user_has_tenant_permission(user: User | AnonymousUser, tenant: Tenant, permission_key: str) -> bool:
    return permission_key in get_user_tenant_permission_keys(user, tenant)
