"""Identity, roles, and tenant membership models."""

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.tenants.models import Tenant


class User(UUIDPrimaryKeyModel, AbstractUser):
    """Base user model for all platform and tenant users."""

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=30, blank=True)
    display_name = models.CharField(max_length=255, blank=True)
    must_change_password = models.BooleanField(default=False)

    class Meta:
        ordering = ["username"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.display_name or self.get_full_name() or self.username


class MembershipStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    REVOKED = "revoked", "Revoked"


class ScopeType(models.TextChoices):
    SELF = "self", "Self"
    DIRECT_REPORTS = "direct_reports", "Direct Reports"
    INDIRECT_REPORTS = "indirect_reports", "Indirect Reports"
    DEPARTMENT = "department", "Department"
    BRANCH = "branch", "Branch"
    LEGAL_ENTITY = "legal_entity", "Legal Entity"
    BUSINESS_UNIT = "business_unit", "Business Unit"
    GRADE = "grade", "Grade"
    EXPLICIT_ASSIGNMENT = "explicit_assignment", "Explicit Assignment"
    TENANT_ALL = "tenant_all", "Tenant Wide"


class PermissionCatalogEntry(UUIDPrimaryKeyModel, TimeStampedModel):
    """Platform-owned catalog row for RBAC permission definitions."""

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    key = models.CharField(max_length=120, unique=True)
    label = models.CharField(max_length=255)
    module = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.MEDIUM)
    tenant_assignable = models.BooleanField(default=True)
    required_module = models.CharField(max_length=120, blank=True)
    required_plan = models.CharField(max_length=120, blank=True)
    default_role_codes = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    managed_by_platform = models.BooleanField(default=True)
    source_ref = models.CharField(max_length=120, blank=True, default="code_catalog")

    class Meta:
        ordering = ["module", "key"]
        verbose_name = "Permission Catalog Entry"
        verbose_name_plural = "Permission Catalog Entries"

    def __str__(self) -> str:
        return self.key

    def as_catalog_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "module": self.module,
            "description": self.description,
            "risk_level": self.risk_level,
            "tenant_assignable": self.tenant_assignable,
            "required_module": self.required_module,
            "required_plan": self.required_plan,
            "default_role_codes": list(self.default_role_codes or []),
            "catalog_source": "database",
            "is_active": self.is_active,
        }


class MenuCatalogEntry(UUIDPrimaryKeyModel, TimeStampedModel):
    """Database-managed workspace navigation entry with permission metadata."""

    class MenuKind(models.TextChoices):
        SIDEBAR = "sidebar", "Sidebar"
        QUICK_LINK = "quick_link", "Quick Link"

    workspace = models.CharField(max_length=80)
    group = models.CharField(max_length=120, blank=True)
    kind = models.CharField(max_length=20, choices=MenuKind.choices, default=MenuKind.SIDEBAR)
    href = models.CharField(max_length=255)
    label = models.CharField(max_length=120)
    short_label = models.CharField(max_length=12, blank=True)
    blurb = models.CharField(max_length=255, blank=True)
    permission_keys = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    source_ref = models.CharField(max_length=120, blank=True, default="code_catalog")

    class Meta:
        ordering = ["workspace", "kind", "group", "sort_order", "label"]
        unique_together = [("workspace", "kind", "href")]
        verbose_name = "Menu Catalog Entry"
        verbose_name_plural = "Menu Catalog Entries"

    def __str__(self) -> str:
        return f"{self.workspace}:{self.label}"

    def as_catalog_dict(self) -> dict:
        return {
            "id": str(self.id),
            "workspace": self.workspace,
            "group": self.group,
            "kind": self.kind,
            "href": self.href,
            "label": self.label,
            "short_label": self.short_label,
            "blurb": self.blurb,
            "permission_keys": list(self.permission_keys or []),
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "catalog_source": "database",
        }


class Role(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-scoped business role used for HRMS access control."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="roles",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Role"
        verbose_name_plural = "Roles"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class RolePermission(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores action-level permission keys attached to tenant roles."""

    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    permission_key = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["permission_key"]
        unique_together = [("role", "permission_key")]
        verbose_name = "Role Permission"
        verbose_name_plural = "Role Permissions"

    def __str__(self) -> str:
        return f"{self.role} -> {self.permission_key}"


class TenantMembership(UUIDPrimaryKeyModel, TimeStampedModel):
    """Links a user to a tenant with status and access metadata."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tenant_memberships",
    )
    employee_code = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20,
        choices=MembershipStatus.choices,
        default=MembershipStatus.INVITED,
    )
    is_default = models.BooleanField(default=False)
    allowed_legal_entities = models.JSONField(default=list, blank=True)
    allowed_branches = models.JSONField(default=list, blank=True)
    allowed_departments = models.JSONField(default=list, blank=True)
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = [("tenant", "user")]
        verbose_name = "Tenant Membership"
        verbose_name_plural = "Tenant Memberships"

    def __str__(self) -> str:
        return f"{self.user} @ {self.tenant}"


class MembershipRole(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assigns one or more tenant roles to a membership."""

    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.CASCADE,
        related_name="membership_roles",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="membership_roles",
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        unique_together = [("membership", "role")]
        verbose_name = "Membership Role"
        verbose_name_plural = "Membership Roles"

    def __str__(self) -> str:
        return f"{self.membership} -> {self.role.name}"


class MembershipScope(UUIDPrimaryKeyModel, TimeStampedModel):
    """Scope constraints applied to a membership."""

    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.CASCADE,
        related_name="scopes",
    )
    scope_type = models.CharField(max_length=40, choices=ScopeType.choices)
    scope_value = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = [("membership", "scope_type", "scope_value")]
        verbose_name = "Membership Scope"
        verbose_name_plural = "Membership Scopes"

    def __str__(self) -> str:
        return f"{self.membership} -> {self.scope_type}:{self.scope_value}"
