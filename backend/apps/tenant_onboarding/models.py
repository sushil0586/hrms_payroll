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


class LaunchReadinessStatus(models.TextChoices):
    NOT_CONFIGURED = "not_configured", "Not Configured"
    CONFIGURED = "configured", "Configured"
    STAGE_READY = "stage_ready", "Stage Ready"
    CUSTOMER_READY = "customer_ready", "Customer Ready"
    PAYROLL_REHEARSAL_READY = "payroll_rehearsal_ready", "Payroll Rehearsal Ready"
    PRODUCTION_READY = "production_ready", "Production Ready"
    BLOCKED = "blocked", "Blocked"


class TenantLaunchRunType(models.TextChoices):
    PREVIEW = "preview", "Preview"
    APPLY = "apply", "Apply"
    VERIFY = "verify", "Verify"
    REPAIR = "repair", "Repair"
    UPGRADE = "upgrade", "Upgrade"


class TenantLaunchRunStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class TenantLaunchItemAction(models.TextChoices):
    PLAN = "plan", "Plan"
    CREATE = "create", "Create"
    UPDATE = "update", "Update"
    SKIP = "skip", "Skip"
    NOOP = "noop", "No-op"
    BLOCK = "block", "Block"


class TenantLaunchItemStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    SUCCEEDED = "succeeded", "Succeeded"
    SKIPPED = "skipped", "Skipped"
    BLOCKED = "blocked", "Blocked"
    FAILED = "failed", "Failed"


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


class PublicLeadIntent(models.TextChoices):
    SIGNUP = "signup", "Signup"
    CONTACT = "contact", "Contact"


class PublicLeadStatus(models.TextChoices):
    NEW = "new", "New"
    REVIEWING = "reviewing", "Reviewing"
    QUALIFIED = "qualified", "Qualified"
    CONVERTED = "converted", "Converted"
    CLOSED = "closed", "Closed"


class PublicTenantLead(UUIDPrimaryKeyModel, TimeStampedModel):
    """Public signup/contact request that platform admins qualify before tenant creation."""

    intent = models.CharField(max_length=20, choices=PublicLeadIntent.choices, default=PublicLeadIntent.SIGNUP)
    status = models.CharField(max_length=20, choices=PublicLeadStatus.choices, default=PublicLeadStatus.NEW)
    company_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255)
    work_email = models.EmailField()
    phone_number = models.CharField(max_length=30, blank=True)
    employee_count = models.PositiveIntegerField(blank=True, null=True)
    industry = models.CharField(max_length=80, blank=True)
    country_code = models.CharField(max_length=2, default="IN")
    preferred_plan = models.CharField(max_length=40, blank=True)
    message = models.TextField(blank=True)
    source_path = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    reviewed_by_identifier = models.CharField(max_length=120, blank=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    converted_tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        related_name="public_leads",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Public Tenant Lead"
        verbose_name_plural = "Public Tenant Leads"

    def __str__(self) -> str:
        return f"{self.company_name} - {self.work_email}"


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
    launch_blueprint_ref = models.CharField(max_length=120, blank=True)
    launch_blueprint_version = models.CharField(max_length=40, blank=True)
    launch_readiness_status = models.CharField(
        max_length=40,
        choices=LaunchReadinessStatus.choices,
        default=LaunchReadinessStatus.NOT_CONFIGURED,
    )
    launch_subscription_plan_snapshot = models.CharField(max_length=40, blank=True)
    launch_preview_payload = models.JSONField(default=dict, blank=True)
    launch_selected_at = models.DateTimeField(blank=True, null=True)
    launch_applied_at = models.DateTimeField(blank=True, null=True)
    launch_verified_at = models.DateTimeField(blank=True, null=True)
    launch_status_notes = models.TextField(blank=True)
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


class TenantLaunchRun(UUIDPrimaryKeyModel, TimeStampedModel):
    """Auditable execution record for tenant launch blueprint operations."""

    onboarding = models.ForeignKey(
        TenantOnboarding,
        on_delete=models.CASCADE,
        related_name="launch_runs",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="launch_runs",
    )
    blueprint_ref = models.CharField(max_length=120)
    blueprint_version = models.CharField(max_length=40)
    subscription_plan = models.CharField(max_length=40)
    run_type = models.CharField(
        max_length=20,
        choices=TenantLaunchRunType.choices,
        default=TenantLaunchRunType.PREVIEW,
    )
    status = models.CharField(
        max_length=20,
        choices=TenantLaunchRunStatus.choices,
        default=TenantLaunchRunStatus.PENDING,
    )
    requested_by_identifier = models.CharField(max_length=120, blank=True)
    idempotency_key = models.CharField(max_length=120, blank=True)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    input_payload = models.JSONField(default=dict, blank=True)
    plan_snapshot = models.JSONField(default=dict, blank=True)
    result_payload = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    evidence = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "run_type", "status"]),
            models.Index(fields=["tenant", "blueprint_ref", "blueprint_version"]),
            models.Index(fields=["tenant", "idempotency_key"]),
        ]
        verbose_name = "Tenant Launch Run"
        verbose_name_plural = "Tenant Launch Runs"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.blueprint_ref}:{self.run_type}:{self.status}"


class TenantLaunchSeededItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Planned or applied item inside a launch run, with ownership and evidence."""

    launch_run = models.ForeignKey(
        TenantLaunchRun,
        on_delete=models.CASCADE,
        related_name="seeded_items",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="launch_seeded_items",
    )
    item_key = models.CharField(max_length=180)
    item_kind = models.CharField(max_length=80)
    module_ref = models.CharField(max_length=80)
    action = models.CharField(
        max_length=20,
        choices=TenantLaunchItemAction.choices,
        default=TenantLaunchItemAction.PLAN,
    )
    status = models.CharField(
        max_length=20,
        choices=TenantLaunchItemStatus.choices,
        default=TenantLaunchItemStatus.PLANNED,
    )
    ownership_mode = models.CharField(max_length=40, blank=True)
    object_ref = models.CharField(max_length=180, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    message = models.CharField(max_length=255, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    evidence = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["module_ref", "item_kind", "item_key"]
        unique_together = [("launch_run", "item_key")]
        indexes = [
            models.Index(fields=["tenant", "module_ref", "status"]),
            models.Index(fields=["tenant", "item_kind"]),
            models.Index(fields=["tenant", "object_ref"]),
        ]
        verbose_name = "Tenant Launch Seeded Item"
        verbose_name_plural = "Tenant Launch Seeded Items"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.item_key}:{self.status}"


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
