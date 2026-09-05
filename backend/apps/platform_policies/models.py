"""Platform policy baseline and tenant adoption models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.tenants.models import Tenant


class PlatformPolicyDomain(models.TextChoices):
    LEAVE = "leave", "Leave"
    ATTENDANCE = "attendance", "Attendance"
    WORKFLOW = "workflow", "Workflow"
    DOCUMENT = "document", "Document"


class PlatformPolicyPackStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class PlatformPolicyItemType(models.TextChoices):
    LEAVE_TYPE = "leave_type", "Leave Type"
    LEAVE_POLICY = "leave_policy", "Leave Policy"
    LEAVE_POLICY_ASSIGNMENT_RULE = "leave_policy_assignment_rule", "Leave Policy Assignment Rule"
    SHIFT = "shift", "Shift"
    HOLIDAY_CALENDAR = "holiday_calendar", "Holiday Calendar"
    ATTENDANCE_POLICY = "attendance_policy", "Attendance Policy"
    ATTENDANCE_POLICY_ASSIGNMENT_RULE = "attendance_policy_assignment_rule", "Attendance Policy Assignment Rule"


class DelegationMode(models.TextChoices):
    LOCKED = "locked", "Locked"
    TENANT_EDITABLE = "tenant_editable", "Tenant Editable"
    TENANT_EDITABLE_AFTER_CLONE = "tenant_editable_after_clone", "Tenant Editable After Clone"
    PLATFORM_APPROVAL_REQUIRED = "platform_approval_required", "Platform Approval Required"


class PolicySourceKind(models.TextChoices):
    TENANT_NATIVE = "tenant_native", "Tenant Native"
    PLATFORM_PACK = "platform_pack", "Platform Pack"
    TENANT_CLONE = "tenant_clone", "Tenant Clone"


class TenantPolicyAdoptionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ADOPTED = "adopted", "Adopted"
    SUPERSEDED = "superseded", "Superseded"


class AdoptionMode(models.TextChoices):
    BASELINE_ONLY = "baseline_only", "Baseline Only"
    BASELINE_PLUS_TENANT_OVERRIDES = "baseline_plus_tenant_overrides", "Baseline Plus Tenant Overrides"
    CLONE_TO_TENANT_RECORDS = "clone_to_tenant_records", "Clone To Tenant Records"


class PlatformPolicyPack(UUIDPrimaryKeyModel, TimeStampedModel):
    """A publishable baseline pack owned by the platform."""

    code = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=30, choices=PlatformPolicyDomain.choices)
    country_code = models.CharField(max_length=2, blank=True)
    industry_tag = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=PlatformPolicyPackStatus.choices,
        default=PlatformPolicyPackStatus.DRAFT,
    )
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    published_at = models.DateTimeField(blank=True, null=True)
    published_by_identifier = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["domain", "name"]
        indexes = [
            models.Index(fields=["domain", "status", "is_active"]),
        ]
        verbose_name = "Platform Policy Pack"
        verbose_name_plural = "Platform Policy Packs"

    def __str__(self) -> str:
        return f"{self.code}:v{self.version}"


class PlatformPolicyPackItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Artifact snapshot inside a platform policy pack."""

    policy_pack = models.ForeignKey(
        PlatformPolicyPack,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item_type = models.CharField(max_length=50, choices=PlatformPolicyItemType.choices)
    item_key = models.CharField(max_length=120)
    name = models.CharField(max_length=255, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    dependency_keys = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        ordering = ["policy_pack", "sort_order", "item_key"]
        unique_together = [("policy_pack", "item_key")]
        indexes = [
            models.Index(fields=["item_type", "sort_order"]),
        ]
        verbose_name = "Platform Policy Pack Item"
        verbose_name_plural = "Platform Policy Pack Items"

    def __str__(self) -> str:
        return f"{self.policy_pack.code}:{self.item_key}"


class PlatformPolicyDelegationRule(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant editability and lock metadata for a pack or item."""

    policy_pack = models.ForeignKey(
        PlatformPolicyPack,
        on_delete=models.CASCADE,
        related_name="delegation_rules",
    )
    item_key = models.CharField(max_length=120, blank=True)
    delegation_mode = models.CharField(max_length=40, choices=DelegationMode.choices)
    editable_paths = models.JSONField(default=list, blank=True)
    locked_paths = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["policy_pack", "item_key"]
        unique_together = [("policy_pack", "item_key")]
        verbose_name = "Platform Policy Delegation Rule"
        verbose_name_plural = "Platform Policy Delegation Rules"

    def __str__(self) -> str:
        return f"{self.policy_pack.code}:{self.item_key or 'pack'}"


class TenantPolicyPackAdoption(UUIDPrimaryKeyModel, TimeStampedModel):
    """Records tenant adoption of a platform-owned policy pack."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="policy_pack_adoptions",
    )
    policy_pack = models.ForeignKey(
        PlatformPolicyPack,
        on_delete=models.CASCADE,
        related_name="tenant_adoptions",
    )
    status = models.CharField(
        max_length=20,
        choices=TenantPolicyAdoptionStatus.choices,
        default=TenantPolicyAdoptionStatus.DRAFT,
    )
    adoption_mode = models.CharField(
        max_length=40,
        choices=AdoptionMode.choices,
        default=AdoptionMode.CLONE_TO_TENANT_RECORDS,
    )
    adopted_at = models.DateTimeField(blank=True, null=True)
    adopted_by_identifier = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["tenant__name", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
        ]
        verbose_name = "Tenant Policy Pack Adoption"
        verbose_name_plural = "Tenant Policy Pack Adoptions"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.policy_pack.code}:{self.status}"


class TenantPolicyPackItemLink(UUIDPrimaryKeyModel, TimeStampedModel):
    """Traceability link from a platform pack item to a tenant runtime record."""

    tenant_adoption = models.ForeignKey(
        TenantPolicyPackAdoption,
        on_delete=models.CASCADE,
        related_name="item_links",
    )
    platform_item = models.ForeignKey(
        PlatformPolicyPackItem,
        on_delete=models.CASCADE,
        related_name="tenant_links",
    )
    target_model = models.CharField(max_length=120)
    target_record_id = models.UUIDField()
    source_version = models.PositiveIntegerField(default=1)
    is_detached_from_source = models.BooleanField(default=False)

    class Meta:
        ordering = ["tenant_adoption", "platform_item__sort_order", "target_model"]
        unique_together = [("tenant_adoption", "platform_item", "target_model", "target_record_id")]
        indexes = [
            models.Index(fields=["target_model", "target_record_id"]),
        ]
        verbose_name = "Tenant Policy Pack Item Link"
        verbose_name_plural = "Tenant Policy Pack Item Links"

    def __str__(self) -> str:
        return f"{self.tenant_adoption.tenant.code}:{self.platform_item.item_key}:{self.target_model}"
