"""Employee master models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.iam.models import TenantMembership
from apps.organizations.models import (
    Branch,
    BusinessUnit,
    CostCenter,
    Department,
    Designation,
    EmploymentType,
    Grade,
    LegalEntity,
    Location,
)
from apps.tenants.models import Tenant


class EmploymentStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ON_NOTICE = "on_notice", "On Notice"
    EXITED = "exited", "Exited"
    INACTIVE = "inactive", "Inactive"


class Employee(UUIDPrimaryKeyModel, TimeStampedModel):
    """Core employee master record."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    membership = models.OneToOneField(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="employee",
        blank=True,
        null=True,
    )
    employee_code = models.CharField(max_length=50)
    first_name = models.CharField(max_length=120)
    middle_name = models.CharField(max_length=120, blank=True)
    last_name = models.CharField(max_length=120, blank=True)
    preferred_name = models.CharField(max_length=120, blank=True)
    work_email = models.EmailField(blank=True)
    personal_email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    date_of_joining = models.DateField(blank=True, null=True)
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.DRAFT,
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    designation = models.ForeignKey(
        Designation,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.SET_NULL,
        related_name="employees",
        blank=True,
        null=True,
    )
    reporting_manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="direct_reports",
        blank=True,
        null=True,
    )
    probation_end_date = models.DateField(blank=True, null=True)
    confirmation_date = models.DateField(blank=True, null=True)

    class Meta:
        ordering = ["employee_code"]
        unique_together = [("tenant", "employee_code")]
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self) -> str:
        full_name = " ".join(part for part in [self.first_name, self.last_name] if part)
        return f"{self.employee_code} - {full_name}"


class EmployeeAddressType(models.TextChoices):
    CURRENT = "current", "Current"
    PERMANENT = "permanent", "Permanent"
    OTHER = "other", "Other"


class EmployeeAddress(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores employee addresses."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    address_type = models.CharField(max_length=20, choices=EmployeeAddressType.choices)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country_code = models.CharField(max_length=2, default="IN")
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["employee", "address_type"]
        verbose_name = "Employee Address"
        verbose_name_plural = "Employee Addresses"

    def __str__(self) -> str:
        return f"{self.employee} - {self.address_type}"


class EmergencyContact(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores emergency contacts for an employee."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="emergency_contacts",
    )
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=120, blank=True)
    phone_number = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["employee", "name"]
        verbose_name = "Emergency Contact"
        verbose_name_plural = "Emergency Contacts"

    def __str__(self) -> str:
        return f"{self.employee} - {self.name}"


class EmployeeBankAccount(UUIDPrimaryKeyModel, TimeStampedModel):
    """Stores employee bank details for later payroll integration."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="bank_accounts",
    )
    account_holder_name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=64)
    ifsc_code = models.CharField(max_length=20, blank=True)
    branch_name = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=True)

    class Meta:
        ordering = ["employee", "-is_primary", "bank_name"]
        verbose_name = "Employee Bank Account"
        verbose_name_plural = "Employee Bank Accounts"

    def __str__(self) -> str:
        return f"{self.employee} - {self.bank_name}"
