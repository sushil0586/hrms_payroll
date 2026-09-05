"""Organization master data models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.tenants.models import Tenant


class OrganizationScopedModel(UUIDPrimaryKeyModel, TimeStampedModel):
    """Base class for tenant-owned organization masters."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True

    def __str__(self) -> str:
        return self.name


class LegalEntity(OrganizationScopedModel):
    """Represents a company or legal entity within a tenant."""

    registered_name = models.CharField(max_length=255, blank=True)
    country_code = models.CharField(max_length=2, default="IN")
    timezone = models.CharField(max_length=64, default="UTC")
    primary_email = models.EmailField(blank=True)
    primary_phone = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Legal Entity"
        verbose_name_plural = "Legal Entities"


class Location(OrganizationScopedModel):
    """Represents a physical or logical work location."""

    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country_code = models.CharField(max_length=2, default="IN")

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Location"
        verbose_name_plural = "Locations"


class Branch(OrganizationScopedModel):
    """Represents an operating branch under a legal entity."""

    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="branches",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        related_name="branches",
        blank=True,
        null=True,
    )
    branch_type = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Branch"
        verbose_name_plural = "Branches"


class BusinessUnit(OrganizationScopedModel):
    """Represents a business unit within the organization."""

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Business Unit"
        verbose_name_plural = "Business Units"


class Department(OrganizationScopedModel):
    """Represents a department and supports hierarchical structure."""

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        blank=True,
        null=True,
    )
    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        related_name="departments",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Department"
        verbose_name_plural = "Departments"


class CostCenter(OrganizationScopedModel):
    """Represents a finance-facing cost center."""

    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.SET_NULL,
        related_name="cost_centers",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Cost Center"
        verbose_name_plural = "Cost Centers"


class Grade(OrganizationScopedModel):
    """Represents a grade or band used for policies and hierarchy."""

    level = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Grade"
        verbose_name_plural = "Grades"


class Designation(OrganizationScopedModel):
    """Represents a job title or designation."""

    grade = models.ForeignKey(
        Grade,
        on_delete=models.SET_NULL,
        related_name="designations",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Designation"
        verbose_name_plural = "Designations"


class EmploymentType(OrganizationScopedModel):
    """Represents configurable employment categories."""

    description = models.TextField(blank=True)
    is_payroll_eligible = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Employment Type"
        verbose_name_plural = "Employment Types"
