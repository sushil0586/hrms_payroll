"""Tenant domain models."""

from django.db import models

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
