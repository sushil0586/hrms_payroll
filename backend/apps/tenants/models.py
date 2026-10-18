"""Tenant domain models."""

from django.db import models
from django.conf import settings

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel


class TenantStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    ARCHIVED = "archived", "Archived"


class TenantOnboardingStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CREATED = "created", "Created"
    PREPARED = "prepared", "Prepared"
    BASELINE_PUBLISHED = "baseline_published", "Baseline Published"
    HANDOFF_READY = "handoff_ready", "Handoff Ready"
    ACTIVE = "active", "Active"


class SubscriptionPlan(models.TextChoices):
    STARTER = "starter", "Starter"
    GROWTH = "growth", "Growth"
    ENTERPRISE = "enterprise", "Enterprise"


class SeedPack(models.TextChoices):
    STANDARD_OFFICE = "standard_office", "Standard Office"
    SHIFT_BASED = "shift_based", "Shift Based Operations"
    RETAIL_FIELD = "retail_field", "Retail or Field Workforce"
    PROFESSIONAL_SERVICES = "professional_services", "Professional Services"


class Tenant(UUIDPrimaryKeyModel, TimeStampedModel):
    """Top-level customer record for SaaS tenant isolation."""

    code = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TenantStatus.choices,
        default=TenantStatus.DRAFT,
    )
    subscription_plan = models.CharField(
        max_length=20,
        choices=SubscriptionPlan.choices,
        default=SubscriptionPlan.STARTER,
    )
    seed_pack = models.CharField(
        max_length=40,
        choices=SeedPack.choices,
        default=SeedPack.STANDARD_OFFICE,
    )
    primary_email = models.EmailField(blank=True)
    primary_phone = models.CharField(max_length=30, blank=True)
    timezone = models.CharField(max_length=64, default="UTC")
    country_code = models.CharField(max_length=2, default="IN")
    is_sandbox = models.BooleanField(default=False)
    go_live_at = models.DateTimeField(blank=True, null=True)
    onboarding_status = models.CharField(
        max_length=30,
        choices=TenantOnboardingStatus.choices,
        default=TenantOnboardingStatus.DRAFT,
    )
    onboarding_started_at = models.DateTimeField(blank=True, null=True)
    onboarding_completed_at = models.DateTimeField(blank=True, null=True)
    prepared_by_identifier = models.CharField(max_length=120, blank=True)
    activated_by_identifier = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self) -> str:
        return self.name


class TenantDomain(UUIDPrimaryKeyModel, TimeStampedModel):
    """Maps custom domains or workspaces to a tenant."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="domains",
    )
    domain = models.CharField(max_length=255, unique=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["domain"]
        verbose_name = "Tenant Domain"
        verbose_name_plural = "Tenant Domains"

    def __str__(self) -> str:
        return self.domain


class RetentionPolicyStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    APPROVED = "approved", "Approved"
    RETIRED = "retired", "Retired"


class RetentionPolicy(UUIDPrimaryKeyModel, TimeStampedModel):
    """Approved, effective-dated retention rule; durations are never inferred."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="retention_policies", blank=True, null=True)
    legal_entity = models.ForeignKey("organizations.LegalEntity", on_delete=models.PROTECT, related_name="retention_policies", blank=True, null=True)
    jurisdiction = models.CharField(max_length=32)
    record_category = models.CharField(max_length=80)
    retention_days = models.PositiveIntegerField()
    lifecycle_date_field = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=RetentionPolicyStatus.choices, default=RetentionPolicyStatus.DRAFT)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    legal_basis_ref = models.CharField(max_length=180)
    approval_ref = models.CharField(max_length=180)
    approved_by_identifier = models.CharField(max_length=160, blank=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(retention_days__gt=0), name="retention_days_positive"),
            models.UniqueConstraint(fields=["tenant", "legal_entity", "jurisdiction", "record_category", "effective_from"], name="unique_retention_policy_scope_start", nulls_distinct=False),
        ]
        indexes = [models.Index(fields=["tenant", "record_category", "status"])]


class LegalHoldStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    RELEASED = "released", "Released"


class LegalHold(UUIDPrimaryKeyModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="legal_holds")
    legal_entity = models.ForeignKey("organizations.LegalEntity", on_delete=models.PROTECT, related_name="legal_holds", blank=True, null=True)
    record_category = models.CharField(max_length=80, blank=True)
    resource_type = models.CharField(max_length=120, blank=True)
    resource_id = models.UUIDField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=LegalHoldStatus.choices, default=LegalHoldStatus.ACTIVE)
    reason = models.TextField()
    authority_ref = models.CharField(max_length=180)
    placed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="placed_legal_holds")
    placed_at = models.DateTimeField(auto_now_add=True)
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="released_legal_holds", blank=True, null=True)
    released_at = models.DateTimeField(blank=True, null=True)
    release_reason = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "status", "record_category"])]


class GovernanceRequestType(models.TextChoices):
    EXPORT = "export", "Export"
    ERASURE = "erasure", "Erasure"


class GovernanceRequestStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    APPROVED = "approved", "Approved"
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    BLOCKED = "blocked", "Blocked"
    CANCELLED = "cancelled", "Cancelled"


class DataGovernanceRequest(UUIDPrimaryKeyModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="data_governance_requests")
    request_type = models.CharField(max_length=20, choices=GovernanceRequestType.choices)
    status = models.CharField(max_length=20, choices=GovernanceRequestStatus.choices, default=GovernanceRequestStatus.REQUESTED)
    scope = models.JSONField(default=dict)
    reason = models.TextField()
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_data_governance_actions")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="approved_data_governance_actions", blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    idempotency_key = models.CharField(max_length=120)
    preview_snapshot = models.JSONField(default=dict)
    result_snapshot = models.JSONField(default=dict)
    task_id = models.CharField(max_length=180, blank=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    last_error_code = models.CharField(max_length=80, blank=True)
    last_error_message = models.TextField(blank=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant", "request_type", "idempotency_key"], name="unique_governance_request_idempotency")]
        indexes = [models.Index(fields=["tenant", "request_type", "status"])]


class DataGovernanceEvent(UUIDPrimaryKeyModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="data_governance_events")
    request = models.ForeignKey(DataGovernanceRequest, on_delete=models.CASCADE, related_name="events", blank=True, null=True)
    legal_hold = models.ForeignKey(LegalHold, on_delete=models.CASCADE, related_name="events", blank=True, null=True)
    event_type = models.CharField(max_length=80)
    actor_identifier = models.CharField(max_length=160)
    occurred_at = models.DateTimeField(auto_now_add=True)
    evidence = models.JSONField(default=dict)
    evidence_hash = models.CharField(max_length=64)

    class Meta:
        indexes = [models.Index(fields=["tenant", "occurred_at"])]
