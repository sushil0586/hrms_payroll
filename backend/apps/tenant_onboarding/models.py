"""Platform-side tenant onboarding models."""

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.iam.models import TenantMembership
from apps.tenants.models import Tenant


class OnboardingOwnerMode(models.TextChoices):
    COMBINED_PLATFORM_ADMIN = "combined_platform_admin", "Combined Platform Admin"
    SPLIT_PLATFORM_ROLES = "split_platform_roles", "Split Platform Roles"


class OnboardingSetupStyle(models.TextChoices):
    PLATFORM_ASSISTED = "platform_assisted", "Platform Assisted"
    SHARED = "shared", "Shared"
    CUSTOMER_LED = "customer_led", "Customer Led"


class DataSetupStyle(models.TextChoices):
    MANUAL = "manual", "Manual"
    IMPORT_LED = "import_led", "Import Led"
    SEEDED_DEMO = "seeded_demo", "Seeded Demo"


class PolicyControlStyle(models.TextChoices):
    MOSTLY_LOCKED = "mostly_locked", "Mostly Locked"
    MOSTLY_DELEGATED = "mostly_delegated", "Mostly Delegated"
    MIXED = "mixed", "Mixed"


class AdminProvisioningStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    PROVISIONED = "provisioned", "Provisioned"
    INVITED = "invited", "Invited"
    ACTIVATED = "activated", "Activated"
    SUPERSEDED = "superseded", "Superseded"


class ChecklistStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    SKIPPED = "skipped", "Skipped"


class TenantOnboarding(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks the platform-side onboarding state for a tenant."""

    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="onboarding_record",
    )
    owner_mode = models.CharField(
        max_length=30,
        choices=OnboardingOwnerMode.choices,
        default=OnboardingOwnerMode.COMBINED_PLATFORM_ADMIN,
    )
    setup_style = models.CharField(
        max_length=30,
        choices=OnboardingSetupStyle.choices,
        default=OnboardingSetupStyle.PLATFORM_ASSISTED,
    )
    data_setup_style = models.CharField(
        max_length=30,
        choices=DataSetupStyle.choices,
        default=DataSetupStyle.MANUAL,
    )
    policy_control_style = models.CharField(
        max_length=30,
        choices=PolicyControlStyle.choices,
        default=PolicyControlStyle.MIXED,
    )
    country_context = models.CharField(max_length=2, blank=True)
    industry_context = models.CharField(max_length=80, blank=True)
    notes = models.TextField(blank=True)
    internal_handoff_notes = models.TextField(blank=True)
    customer_handoff_notes = models.TextField(blank=True)
    first_login_verified_at = models.DateTimeField(blank=True, null=True)
    baseline_published_at = models.DateTimeField(blank=True, null=True)
    handoff_completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["tenant__name"]
        verbose_name = "Tenant Onboarding"
        verbose_name_plural = "Tenant Onboarding"

    def __str__(self) -> str:
        return f"Onboarding - {self.tenant.name}"


class TenantOnboardingAdminContact(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks intended and provisioned customer admin contacts for a tenant."""

    onboarding = models.ForeignKey(
        TenantOnboarding,
        on_delete=models.CASCADE,
        related_name="admin_contacts",
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30, blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    is_primary = models.BooleanField(default=False)
    provisioning_status = models.CharField(
        max_length=20,
        choices=AdminProvisioningStatus.choices,
        default=AdminProvisioningStatus.PLANNED,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="tenant_onboarding_contacts",
        blank=True,
        null=True,
    )
    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="tenant_onboarding_contacts",
        blank=True,
        null=True,
    )
    invited_at = models.DateTimeField(blank=True, null=True)
    first_login_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-is_primary", "full_name"]
        verbose_name = "Tenant Onboarding Admin Contact"
        verbose_name_plural = "Tenant Onboarding Admin Contacts"

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email})"


class TenantOnboardingChecklistItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks key onboarding completion markers without a workflow engine."""

    onboarding = models.ForeignKey(
        TenantOnboarding,
        on_delete=models.CASCADE,
        related_name="checklist_items",
    )
    code = models.CharField(max_length=80)
    label = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=ChecklistStatus.choices,
        default=ChecklistStatus.PENDING,
    )
    completed_at = models.DateTimeField(blank=True, null=True)
    completed_by_identifier = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "label"]
        unique_together = [("onboarding", "code")]
        verbose_name = "Tenant Onboarding Checklist Item"
        verbose_name_plural = "Tenant Onboarding Checklist Items"

    def __str__(self) -> str:
        return f"{self.onboarding.tenant.code}:{self.code}"


class TenantOnboardingEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Auditable event stream for important onboarding actions."""

    onboarding = models.ForeignKey(
        TenantOnboarding,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.CharField(max_length=50)
    summary = models.CharField(max_length=255, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    actor_identifier = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Tenant Onboarding Event"
        verbose_name_plural = "Tenant Onboarding Events"

    def __str__(self) -> str:
        return f"{self.onboarding.tenant.code}:{self.event_type}"
