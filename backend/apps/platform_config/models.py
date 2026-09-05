"""Configuration and seed-pack models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.organizations.models import Branch, Department, EmploymentType, Grade, LegalEntity
from apps.tenants.models import SeedPack, Tenant


class ConfigCategory(models.TextChoices):
    ORGANIZATION = "organization", "Organization"
    EMPLOYEE = "employee", "Employee"
    LIFECYCLE = "lifecycle", "Lifecycle"
    LEAVE = "leave", "Leave"
    ATTENDANCE = "attendance", "Attendance"
    WORKFLOW = "workflow", "Workflow"
    NOTIFICATION = "notification", "Notification"
    REPORTING = "reporting", "Reporting"
    DOCUMENT = "document", "Document"
    SECURITY = "security", "Security"


class ConfigDataType(models.TextChoices):
    STRING = "string", "String"
    INTEGER = "integer", "Integer"
    BOOLEAN = "boolean", "Boolean"
    DECIMAL = "decimal", "Decimal"
    JSON = "json", "JSON"
    ARRAY = "array", "Array"


class ConfigStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class ConfigScopeType(models.TextChoices):
    TENANT = "tenant", "Tenant"
    LEGAL_ENTITY = "legal_entity", "Legal Entity"
    BRANCH = "branch", "Branch"
    DEPARTMENT = "department", "Department"
    GRADE = "grade", "Grade"
    EMPLOYMENT_TYPE = "employment_type", "Employment Type"
    EMPLOYEE = "employee", "Employee"


class ConfigurationDefinition(UUIDPrimaryKeyModel, TimeStampedModel):
    """Defines a configurable key and its expected behavior."""

    key = models.CharField(max_length=120, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=ConfigCategory.choices)
    data_type = models.CharField(max_length=20, choices=ConfigDataType.choices)
    description = models.TextField(blank=True)
    default_value = models.JSONField(default=dict, blank=True)
    validation_schema = models.JSONField(default=dict, blank=True)
    is_scoped = models.BooleanField(default=True)
    is_sensitive = models.BooleanField(default=False)
    is_system_managed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category", "key"]
        verbose_name = "Configuration Definition"
        verbose_name_plural = "Configuration Definitions"

    def __str__(self) -> str:
        return self.key


class SeedPackTemplate(UUIDPrimaryKeyModel, TimeStampedModel):
    """Represents a reusable seed pack template."""

    code = models.CharField(max_length=60, unique=True, choices=SeedPack.choices)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Seed Pack Template"
        verbose_name_plural = "Seed Pack Templates"

    def __str__(self) -> str:
        return self.name


class SeedPackItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Maps seed pack templates to configuration definitions and values."""

    seed_pack = models.ForeignKey(
        SeedPackTemplate,
        on_delete=models.CASCADE,
        related_name="items",
    )
    definition = models.ForeignKey(
        ConfigurationDefinition,
        on_delete=models.CASCADE,
        related_name="seed_items",
    )
    value = models.JSONField(default=dict, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["seed_pack", "sort_order", "definition__key"]
        unique_together = [("seed_pack", "definition")]
        verbose_name = "Seed Pack Item"
        verbose_name_plural = "Seed Pack Items"

    def __str__(self) -> str:
        return f"{self.seed_pack.code}:{self.definition.key}"


class TenantConfiguration(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores publishable tenant-level config values."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="configurations",
    )
    definition = models.ForeignKey(
        ConfigurationDefinition,
        on_delete=models.CASCADE,
        related_name="tenant_configurations",
    )
    status = models.CharField(max_length=20, choices=ConfigStatus.choices, default=ConfigStatus.DRAFT)
    current_value = models.JSONField(default=dict, blank=True)
    published_value = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    effective_from = models.DateTimeField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)
    published_by_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["tenant", "definition__key"]
        unique_together = [("tenant", "definition")]
        verbose_name = "Tenant Configuration"
        verbose_name_plural = "Tenant Configurations"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.definition.key}"


class ScopedConfigurationOverride(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores scoped overrides beneath tenant-level configuration."""

    tenant_configuration = models.ForeignKey(
        TenantConfiguration,
        on_delete=models.CASCADE,
        related_name="overrides",
    )
    scope_type = models.CharField(max_length=30, choices=ConfigScopeType.choices)
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="config_overrides",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="config_overrides",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="config_overrides",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="config_overrides",
        blank=True,
        null=True,
    )
    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.CASCADE,
        related_name="config_overrides",
        blank=True,
        null=True,
    )
    employee_identifier = models.CharField(max_length=120, blank=True)
    override_value = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=ConfigStatus.choices, default=ConfigStatus.DRAFT)
    effective_from = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["tenant_configuration", "scope_type", "created_at"]
        verbose_name = "Scoped Configuration Override"
        verbose_name_plural = "Scoped Configuration Overrides"

    def __str__(self) -> str:
        return f"{self.tenant_configuration} -> {self.scope_type}"


class ConfigurationChangeLog(UUIDPrimaryKeyModel, TimeStampedModel):
    """Auditable record of configuration changes and publishing actions."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="configuration_change_logs",
    )
    definition = models.ForeignKey(
        ConfigurationDefinition,
        on_delete=models.CASCADE,
        related_name="change_logs",
    )
    action = models.CharField(max_length=50)
    summary = models.CharField(max_length=255, blank=True)
    before_value = models.JSONField(default=dict, blank=True)
    after_value = models.JSONField(default=dict, blank=True)
    scope_type = models.CharField(max_length=30, choices=ConfigScopeType.choices, default=ConfigScopeType.TENANT)
    actor_identifier = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Configuration Change Log"
        verbose_name_plural = "Configuration Change Logs"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.definition.key}:{self.action}"
