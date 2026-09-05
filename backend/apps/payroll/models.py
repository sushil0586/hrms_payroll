"""Payroll configuration models."""

import hashlib
import json
from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.employee_lifecycle.models import EmployeeExit
from apps.employees.models import Employee
from apps.organizations.models import Branch, Department, EmploymentType, LegalEntity, Location
from apps.tenants.models import Tenant


class PayrollFrequency(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    SEMI_MONTHLY = "semi_monthly", "Semi Monthly"
    BIWEEKLY = "biweekly", "Biweekly"
    WEEKLY = "weekly", "Weekly"
    CUSTOM = "custom", "Custom"


class PayrollPeriodStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    LOCKED = "locked", "Locked"
    CLOSED = "closed", "Closed"


class PayGroupStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    ARCHIVED = "archived", "Archived"


class SalaryComponentType(models.TextChoices):
    EARNING = "earning", "Earning"
    DEDUCTION = "deduction", "Deduction"
    EMPLOYER_CONTRIBUTION = "employer_contribution", "Employer Contribution"
    REIMBURSEMENT = "reimbursement", "Reimbursement"
    TAX = "tax", "Tax"
    INFORMATIONAL = "informational", "Informational"


class SalaryComponentValueType(models.TextChoices):
    FIXED_AMOUNT = "fixed_amount", "Fixed Amount"
    PERCENTAGE = "percentage", "Percentage"
    FORMULA = "formula", "Formula"
    SLAB = "slab", "Slab"
    EXTERNAL_INPUT = "external_input", "External Input"


class PayrollConfigStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    RETIRED = "retired", "Retired"


class PayrollRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    COLLECTING_INPUTS = "collecting_inputs", "Collecting Inputs"
    INPUTS_LOCKED = "inputs_locked", "Inputs Locked"
    CALCULATED = "calculated", "Calculated"
    REVIEW = "review", "Review"
    APPROVED = "approved", "Approved"
    LOCKED = "locked", "Locked"
    CANCELLED = "cancelled", "Cancelled"


class PayrollCalculationStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    SUPERSEDED = "superseded", "Superseded"


class PayrollCalculationLineStatus(models.TextChoices):
    CALCULATED = "calculated", "Calculated"
    ERROR = "error", "Error"
    SKIPPED = "skipped", "Skipped"


class PayrollCalculationLineSource(models.TextChoices):
    RULE = "rule", "Rule"
    ADJUSTMENT = "adjustment", "Adjustment"


class PayrollValidationSeverity(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    BLOCKER = "blocker", "Blocker"


class PayrollValidationIssueStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACCEPTED = "accepted", "Accepted"
    RESOLVED = "resolved", "Resolved"


class PayrollValidationCategory(models.TextChoices):
    SOURCE_DATA = "source_data", "Source Data"
    SALARY_SETUP = "salary_setup", "Salary Setup"
    RULE_SETUP = "rule_setup", "Rule Setup"
    STATUTORY_SETUP = "statutory_setup", "Statutory Setup"
    ADJUSTMENT = "adjustment", "Adjustment"
    SETTLEMENT = "settlement", "Settlement"
    OUTPUT_READINESS = "output_readiness", "Output Readiness"


class PayrollReviewStatus(models.TextChoices):
    OPEN = "open", "Open"
    READY_FOR_APPROVAL = "ready_for_approval", "Ready For Approval"
    APPROVED = "approved", "Approved"
    LOCKED = "locked", "Locked"
    REJECTED = "rejected", "Rejected"


class PayrollExceptionSeverity(models.TextChoices):
    INFO = "info", "Info"
    WARNING = "warning", "Warning"
    BLOCKER = "blocker", "Blocker"


class PayrollExceptionStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACCEPTED = "accepted", "Accepted"
    RESOLVED = "resolved", "Resolved"
    REJECTED = "rejected", "Rejected"


class PayrollApprovalStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class PayrollOutputBatchStatus(models.TextChoices):
    GENERATED = "generated", "Generated"
    PUBLISHED = "published", "Published"
    SUPERSEDED = "superseded", "Superseded"


class PayrollOutputArtifactKind(models.TextChoices):
    PAYSLIP = "payslip", "Payslip"
    REGISTER = "register", "Register"
    BANK_ADVICE = "bank_advice", "Bank Advice"
    ACCOUNTING_EXPORT = "accounting_export", "Accounting Export"
    STATUTORY_REPORT = "statutory_report", "Statutory Report"


class PayrollOutputArtifactStatus(models.TextChoices):
    GENERATED = "generated", "Generated"
    PUBLISHED = "published", "Published"
    VOIDED = "voided", "Voided"


class PayrollFinanceHandoffStatus(models.TextChoices):
    GENERATED = "generated", "Generated"
    TRANSMITTED = "transmitted", "Transmitted"
    ACCEPTED = "accepted", "Accepted"
    FAILED = "failed", "Failed"


class PayrollAdjustmentKind(models.TextChoices):
    ARREAR = "arrear", "Arrear"
    BONUS = "bonus", "Bonus"
    INCENTIVE = "incentive", "Incentive"
    REIMBURSEMENT = "reimbursement", "Reimbursement"
    LOAN = "loan", "Loan"
    ADVANCE = "advance", "Advance"
    DEDUCTION = "deduction", "Deduction"
    CORRECTION = "correction", "Correction"
    SETTLEMENT = "settlement", "Settlement"


class PayrollAdjustmentStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    APPLIED = "applied", "Applied"
    VOIDED = "voided", "Voided"


class PayrollAdjustmentDirection(models.TextChoices):
    EARNING = "earning", "Earning"
    DEDUCTION = "deduction", "Deduction"
    REIMBURSEMENT = "reimbursement", "Reimbursement"
    EMPLOYER_CONTRIBUTION = "employer_contribution", "Employer Contribution"
    TAX = "tax", "Tax"
    INFORMATIONAL = "informational", "Informational"


class PayrollSettlementStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    APPLIED = "applied", "Applied"
    VOIDED = "voided", "Voided"


class PayrollSettlementLineKind(models.TextChoices):
    SALARY_PRORATION = "salary_proration", "Salary Proration"
    LEAVE_ENCASHMENT = "leave_encashment", "Leave Encashment"
    NOTICE_RECOVERY = "notice_recovery", "Notice Recovery"
    LOAN_RECOVERY = "loan_recovery", "Loan Recovery"
    ADVANCE_RECOVERY = "advance_recovery", "Advance Recovery"
    BONUS = "bonus", "Bonus"
    ARREAR = "arrear", "Arrear"
    GRATUITY = "gratuity", "Gratuity"
    STATUTORY = "statutory", "Statutory"
    OTHER = "other", "Other"


class PayrollInputSnapshotStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    READY = "ready", "Ready"
    WARNING = "warning", "Warning"
    BLOCKED = "blocked", "Blocked"
    LOCKED = "locked", "Locked"


class PayrollRuleType(models.TextChoices):
    FORMULA = "formula", "Formula"
    APPLICABILITY = "applicability", "Applicability"
    ROUNDING = "rounding", "Rounding"
    PRORATION = "proration", "Proration"
    VALIDATION = "validation", "Validation"
    STATUTORY = "statutory", "Statutory"
    ACCOUNTING = "accounting", "Accounting"


class PayrollRuleVersionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    RETIRED = "retired", "Retired"


class PayrollExpressionLanguage(models.TextChoices):
    SAFE_EXPR_V1 = "safe_expr_v1", "Safe Expression V1"


class PayrollCalendar(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-owned calendar that defines pay period cadence."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_calendars")
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    frequency = models.CharField(max_length=30, choices=PayrollFrequency.choices, default=PayrollFrequency.MONTHLY)
    timezone = models.CharField(max_length=64, default="UTC")
    currency_code = models.CharField(max_length=3, default="INR")
    period_start_day = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Calendar"
        verbose_name_plural = "Payroll Calendars"

    def clean(self):
        if not 1 <= self.period_start_day <= 31:
            raise ValidationError({"period_start_day": "Period start day must be between 1 and 31."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class PayrollPeriod(UUIDPrimaryKeyModel, TimeStampedModel):
    """A single payroll period under a tenant calendar."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_periods")
    calendar = models.ForeignKey(PayrollCalendar, on_delete=models.CASCADE, related_name="periods")
    code = models.SlugField(max_length=80)
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    status = models.CharField(max_length=20, choices=PayrollPeriodStatus.choices, default=PayrollPeriodStatus.DRAFT)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-start_date", "calendar__name"]
        unique_together = [("calendar", "code")]
        verbose_name = "Payroll Period"
        verbose_name_plural = "Payroll Periods"

    def clean(self):
        errors = {}
        if self.calendar_id and self.tenant_id and self.calendar.tenant_id != self.tenant_id:
            errors["calendar"] = "Payroll calendar must belong to the same tenant."
        if self.start_date and self.end_date and self.start_date > self.end_date:
            errors["end_date"] = "Period end date must be on or after the start date."
        if self.calendar_id and self.start_date and self.end_date:
            overlap = PayrollPeriod.objects.filter(
                calendar=self.calendar,
                start_date__lte=self.end_date,
                end_date__gte=self.start_date,
            )
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["start_date"] = "Payroll period overlaps an existing period for this calendar."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.calendar_id and not self.tenant_id:
            self.tenant = self.calendar.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.calendar.code}:{self.code}"


class PayGroup(UUIDPrimaryKeyModel, TimeStampedModel):
    """Groups employees that share payroll calendar and payroll controls."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="pay_groups")
    calendar = models.ForeignKey(PayrollCalendar, on_delete=models.PROTECT, related_name="pay_groups")
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=PayGroupStatus.choices, default=PayGroupStatus.DRAFT)
    default_currency_code = models.CharField(max_length=3, default="INR")
    legal_entity = models.ForeignKey(LegalEntity, on_delete=models.SET_NULL, related_name="pay_groups", blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, related_name="pay_groups", blank=True, null=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, related_name="pay_groups", blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, related_name="pay_groups", blank=True, null=True)
    employment_type = models.ForeignKey(EmploymentType, on_delete=models.SET_NULL, related_name="pay_groups", blank=True, null=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Pay Group"
        verbose_name_plural = "Pay Groups"

    def clean(self):
        errors = {}
        if self.calendar_id and self.tenant_id and self.calendar.tenant_id != self.tenant_id:
            errors["calendar"] = "Payroll calendar must belong to the same tenant."
        for field_name in ["legal_entity", "branch", "location", "department", "employment_type"]:
            related = getattr(self, field_name, None)
            if related and related.tenant_id != self.tenant_id:
                errors[field_name] = "Scope must belong to the same tenant."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.calendar_id and not self.tenant_id:
            self.tenant = self.calendar.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class PayGroupAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Effective-dated employee assignment to a pay group."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="pay_group_assignments")
    pay_group = models.ForeignKey(PayGroup, on_delete=models.CASCADE, related_name="assignments")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="pay_group_assignments")
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayGroupStatus.choices, default=PayGroupStatus.ACTIVE)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "-effective_from"]
        verbose_name = "Pay Group Assignment"
        verbose_name_plural = "Pay Group Assignments"

    def clean(self):
        errors = {}
        if self.pay_group_id and self.tenant_id and self.pay_group.tenant_id != self.tenant_id:
            errors["pay_group"] = "Pay group must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."

        if self.tenant_id and self.employee_id and self.effective_from and self.status == PayGroupStatus.ACTIVE:
            overlap = PayGroupAssignment.objects.filter(
                tenant=self.tenant,
                employee=self.employee,
                status=PayGroupStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Employee already has an active pay group assignment in this effective window."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.pay_group_id and not self.tenant_id:
            self.tenant = self.pay_group.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee.employee_code}:{self.pay_group.code}"


class SalaryComponent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Reusable tenant component definition for earnings, deductions, and statutory lines."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="salary_components")
    code = models.SlugField(max_length=80)
    name = models.CharField(max_length=255)
    component_type = models.CharField(max_length=40, choices=SalaryComponentType.choices)
    value_type = models.CharField(max_length=40, choices=SalaryComponentValueType.choices)
    formula_ref = models.CharField(max_length=160, blank=True)
    applicability_rule_ref = models.CharField(max_length=160, blank=True)
    rounding_rule_ref = models.CharField(max_length=160, blank=True)
    accounting_mapping_ref = models.CharField(max_length=160, blank=True)
    statutory_treatment_ref = models.CharField(max_length=160, blank=True)
    is_taxable = models.BooleanField(default=False)
    is_proratable = models.BooleanField(default=True)
    payslip_visibility = models.CharField(max_length=40, default="visible")
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.DRAFT)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["component_type", "name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Salary Component"
        verbose_name_plural = "Salary Components"

    def clean(self):
        errors = {}
        if self.value_type == SalaryComponentValueType.FORMULA and not self.formula_ref:
            errors["formula_ref"] = "Formula reference is required for formula-based components."
        if self.value_type != SalaryComponentValueType.FORMULA and self.formula_ref:
            errors["formula_ref"] = "Formula reference is only allowed for formula-based components."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class SalaryStructure(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant salary structure shell that can have multiple effective versions."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="salary_structures")
    code = models.SlugField(max_length=80)
    name = models.CharField(max_length=255)
    pay_group = models.ForeignKey(PayGroup, on_delete=models.PROTECT, related_name="salary_structures", blank=True, null=True)
    currency_code = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.DRAFT)
    description = models.TextField(blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Salary Structure"
        verbose_name_plural = "Salary Structures"

    def clean(self):
        if self.pay_group_id and self.tenant_id and self.pay_group.tenant_id != self.tenant_id:
            raise ValidationError({"pay_group": "Pay group must belong to the same tenant."})

    def save(self, *args, **kwargs):
        if self.pay_group_id and not self.tenant_id:
            self.tenant = self.pay_group.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class SalaryStructureVersion(UUIDPrimaryKeyModel, TimeStampedModel):
    """Effective-dated structure version used for salary assignment and future run snapshots."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="salary_structure_versions")
    structure = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name="versions")
    version = models.PositiveIntegerField(default=1)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.DRAFT)
    annual_ctc = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency_code = models.CharField(max_length=3, default="INR")
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["structure__name", "-effective_from"]
        unique_together = [("structure", "version")]
        verbose_name = "Salary Structure Version"
        verbose_name_plural = "Salary Structure Versions"

    def clean(self):
        errors = {}
        if self.structure_id and self.tenant_id and self.structure.tenant_id != self.tenant_id:
            errors["structure"] = "Salary structure must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.annual_ctc is not None and self.annual_ctc < 0:
            errors["annual_ctc"] = "Annual CTC cannot be negative."
        if self.structure_id and self.effective_from and self.status == PayrollConfigStatus.ACTIVE:
            overlap = SalaryStructureVersion.objects.filter(
                structure=self.structure,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Active structure version overlaps an existing active version."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.structure_id and not self.tenant_id:
            self.tenant = self.structure.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.structure.code}:v{self.version}"


class SalaryStructureComponent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Component line inside a salary structure version."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="salary_structure_components")
    structure_version = models.ForeignKey(SalaryStructureVersion, on_delete=models.CASCADE, related_name="components")
    component = models.ForeignKey(SalaryComponent, on_delete=models.PROTECT, related_name="structure_lines")
    display_order = models.PositiveSmallIntegerField(default=100)
    amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    percentage = models.DecimalField(max_digits=7, decimal_places=4, blank=True, null=True)
    formula_ref = models.CharField(max_length=160, blank=True)
    calculation_rule_ref = models.CharField(max_length=160, blank=True)
    is_active = models.BooleanField(default=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["display_order", "component__name"]
        unique_together = [("structure_version", "component")]
        verbose_name = "Salary Structure Component"
        verbose_name_plural = "Salary Structure Components"

    def clean(self):
        errors = {}
        if self.structure_version_id and self.tenant_id and self.structure_version.tenant_id != self.tenant_id:
            errors["structure_version"] = "Salary structure version must belong to the same tenant."
        if self.component_id and self.tenant_id and self.component.tenant_id != self.tenant_id:
            errors["component"] = "Salary component must belong to the same tenant."
        if self.amount is not None and self.amount < 0:
            errors["amount"] = "Amount cannot be negative."
        if self.percentage is not None and self.percentage < 0:
            errors["percentage"] = "Percentage cannot be negative."
        if self.component_id:
            value_type = self.component.value_type
            if value_type == SalaryComponentValueType.FIXED_AMOUNT and self.amount is None:
                errors["amount"] = "Amount is required for fixed amount components."
            if value_type == SalaryComponentValueType.PERCENTAGE and self.percentage is None:
                errors["percentage"] = "Percentage is required for percentage components."
            if value_type == SalaryComponentValueType.FORMULA and not (self.formula_ref or self.component.formula_ref):
                errors["formula_ref"] = "Formula reference is required for formula components."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.structure_version_id and not self.tenant_id:
            self.tenant = self.structure_version.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.structure_version}:{self.component.code}"


class EmployeeSalaryAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Effective-dated employee assignment to a salary structure version."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="employee_salary_assignments")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_assignments")
    structure_version = models.ForeignKey(SalaryStructureVersion, on_delete=models.PROTECT, related_name="employee_assignments")
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.ACTIVE)
    annual_ctc_override = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    assignment_reason = models.CharField(max_length=255, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "-effective_from"]
        verbose_name = "Employee Salary Assignment"
        verbose_name_plural = "Employee Salary Assignments"

    def clean(self):
        errors = {}
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.structure_version_id and self.tenant_id and self.structure_version.tenant_id != self.tenant_id:
            errors["structure_version"] = "Salary structure version must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.annual_ctc_override is not None and self.annual_ctc_override < 0:
            errors["annual_ctc_override"] = "Annual CTC override cannot be negative."
        if self.tenant_id and self.employee_id and self.effective_from and self.status == PayrollConfigStatus.ACTIVE:
            overlap = EmployeeSalaryAssignment.objects.filter(
                tenant=self.tenant,
                employee=self.employee,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Employee already has an active salary assignment in this effective window."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.structure_version_id and not self.tenant_id:
            self.tenant = self.structure_version.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee.employee_code}:{self.structure_version}"


class PayrollRun(UUIDPrimaryKeyModel, TimeStampedModel):
    """Period-scoped payroll run shell that owns immutable input snapshots."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_runs")
    period = models.ForeignKey(PayrollPeriod, on_delete=models.PROTECT, related_name="runs")
    pay_group = models.ForeignKey(PayGroup, on_delete=models.PROTECT, related_name="payroll_runs", blank=True, null=True)
    code = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=30, choices=PayrollRunStatus.choices, default=PayrollRunStatus.DRAFT)
    input_profile_ref = models.CharField(max_length=160, default="payroll.input.profile.default.v1")
    snapshot_schema_ref = models.CharField(max_length=160, default="payroll.input.snapshot.v1")
    locked_at = models.DateTimeField(blank=True, null=True)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="locked_payroll_runs",
        blank=True,
        null=True,
    )
    final_locked_at = models.DateTimeField(blank=True, null=True)
    final_locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="final_locked_payroll_runs",
        blank=True,
        null=True,
    )
    config_snapshot = models.JSONField(default=dict, blank=True)

    LOCKED_IMMUTABLE_FIELDS = [
        "period_id",
        "pay_group_id",
        "code",
        "name",
        "input_profile_ref",
        "snapshot_schema_ref",
        "locked_at",
        "locked_by_id",
        "final_locked_at",
        "final_locked_by_id",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["-period__start_date", "name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Run"
        verbose_name_plural = "Payroll Runs"

    def clean(self):
        errors = {}
        if self.period_id and self.tenant_id and self.period.tenant_id != self.tenant_id:
            errors["period"] = "Payroll period must belong to the same tenant."
        if self.pay_group_id and self.tenant_id and self.pay_group.tenant_id != self.tenant_id:
            errors["pay_group"] = "Pay group must belong to the same tenant."
        if self.pay_group_id and self.period_id and self.pay_group.calendar_id != self.period.calendar_id:
            errors["pay_group"] = "Pay group must use the same calendar as the payroll period."
        if self.status in {PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED, PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED} and not self.locked_at:
            errors["locked_at"] = "A locked or post-lock payroll run must have a lock timestamp."
        if self.status == PayrollRunStatus.LOCKED and not self.final_locked_at:
            errors["final_locked_at"] = "A final locked payroll run must have a final lock timestamp."
        if self.pk:
            previous = PayrollRun.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollRunStatus.LOCKED:
                changed_fields = [
                    field for field in self.LOCKED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields or self.status != PayrollRunStatus.LOCKED:
                    errors["status"] = "Final locked payroll runs are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.period_id and not self.tenant_id:
            self.tenant = self.period.tenant
        if self.status in {PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED, PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED} and not self.locked_at:
            self.locked_at = timezone.now()
        if self.status == PayrollRunStatus.LOCKED and not self.final_locked_at:
            self.final_locked_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class PayrollInputSnapshot(UUIDPrimaryKeyModel, TimeStampedModel):
    """Immutable employee source snapshot used as payroll calculation input."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_input_snapshots")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="input_snapshots")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_input_snapshots")
    pay_group_assignment = models.ForeignKey(
        PayGroupAssignment,
        on_delete=models.SET_NULL,
        related_name="payroll_input_snapshots",
        blank=True,
        null=True,
    )
    salary_assignment = models.ForeignKey(
        EmployeeSalaryAssignment,
        on_delete=models.SET_NULL,
        related_name="payroll_input_snapshots",
        blank=True,
        null=True,
    )
    snapshot_status = models.CharField(max_length=20, choices=PayrollInputSnapshotStatus.choices, default=PayrollInputSnapshotStatus.DRAFT)
    period_start = models.DateField()
    period_end = models.DateField()
    source_collected_at = models.DateTimeField(default=timezone.now)
    locked_at = models.DateTimeField(blank=True, null=True)
    input_profile_ref = models.CharField(max_length=160, default="payroll.input.profile.default.v1")
    employee_snapshot = models.JSONField(default=dict, blank=True)
    organization_snapshot = models.JSONField(default=dict, blank=True)
    salary_snapshot = models.JSONField(default=dict, blank=True)
    attendance_snapshot = models.JSONField(default=dict, blank=True)
    leave_snapshot = models.JSONField(default=dict, blank=True)
    lifecycle_snapshot = models.JSONField(default=dict, blank=True)
    document_snapshot = models.JSONField(default=dict, blank=True)
    banking_snapshot = models.JSONField(default=dict, blank=True)
    validation_snapshot = models.JSONField(default=dict, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    IMMUTABLE_FIELDS = [
        "payroll_run_id",
        "employee_id",
        "pay_group_assignment_id",
        "salary_assignment_id",
        "period_start",
        "period_end",
        "input_profile_ref",
        "employee_snapshot",
        "organization_snapshot",
        "salary_snapshot",
        "attendance_snapshot",
        "leave_snapshot",
        "lifecycle_snapshot",
        "document_snapshot",
        "banking_snapshot",
        "validation_snapshot",
        "source_hash",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["employee__employee_code"]
        unique_together = [("payroll_run", "employee")]
        verbose_name = "Payroll Input Snapshot"
        verbose_name_plural = "Payroll Input Snapshots"

    def _snapshot_digest(self) -> str:
        payload = {
            "employee": self.employee_snapshot,
            "organization": self.organization_snapshot,
            "salary": self.salary_snapshot,
            "attendance": self.attendance_snapshot,
            "leave": self.leave_snapshot,
            "lifecycle": self.lifecycle_snapshot,
            "document": self.document_snapshot,
            "banking": self.banking_snapshot,
            "validation": self.validation_snapshot,
            "config": self.config_snapshot,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "input_profile_ref": self.input_profile_ref,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.pay_group_assignment_id and self.tenant_id and self.pay_group_assignment.tenant_id != self.tenant_id:
            errors["pay_group_assignment"] = "Pay group assignment must belong to the same tenant."
        if self.salary_assignment_id and self.tenant_id and self.salary_assignment.tenant_id != self.tenant_id:
            errors["salary_assignment"] = "Salary assignment must belong to the same tenant."
        if self.period_start and self.period_end and self.period_start > self.period_end:
            errors["period_end"] = "Snapshot period end must be on or after period start."
        if self.payroll_run_id:
            if self.period_start and self.period_start != self.payroll_run.period.start_date:
                errors["period_start"] = "Snapshot start must match the payroll run period."
            if self.period_end and self.period_end != self.payroll_run.period.end_date:
                errors["period_end"] = "Snapshot end must match the payroll run period."
        if self.snapshot_status == PayrollInputSnapshotStatus.LOCKED and not self.locked_at:
            errors["locked_at"] = "A locked input snapshot must have a lock timestamp."

        if self.pk:
            previous = PayrollInputSnapshot.objects.filter(pk=self.pk).first()
            if previous and previous.snapshot_status == PayrollInputSnapshotStatus.LOCKED:
                changed_fields = [
                    field for field in self.IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["snapshot_status"] = "Locked payroll input snapshots are immutable."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        if self.payroll_run_id:
            self.period_start = self.payroll_run.period.start_date
            self.period_end = self.payroll_run.period.end_date
            if not self.input_profile_ref:
                self.input_profile_ref = self.payroll_run.input_profile_ref
        self.source_hash = self._snapshot_digest()
        if self.snapshot_status == PayrollInputSnapshotStatus.LOCKED and not self.locked_at:
            self.locked_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.employee.employee_code}"


class PayrollRuleDefinition(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-owned rule catalog entry used by salary and run calculation logic."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_rule_definitions")
    code = models.SlugField(max_length=120)
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=30, choices=PayrollRuleType.choices, default=PayrollRuleType.FORMULA)
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["rule_type", "name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Rule Definition"
        verbose_name_plural = "Payroll Rule Definitions"

    def clean(self):
        if self.tags is not None and not isinstance(self.tags, list):
            raise ValidationError({"tags": "Rule tags must be stored as a list."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class PayrollRuleVersion(UUIDPrimaryKeyModel, TimeStampedModel):
    """Versioned safe expression for a payroll rule definition."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_rule_versions")
    rule = models.ForeignKey(PayrollRuleDefinition, on_delete=models.CASCADE, related_name="versions")
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=PayrollRuleVersionStatus.choices, default=PayrollRuleVersionStatus.DRAFT)
    expression_language = models.CharField(max_length=30, choices=PayrollExpressionLanguage.choices, default=PayrollExpressionLanguage.SAFE_EXPR_V1)
    expression = models.TextField()
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    input_schema = models.JSONField(default=dict, blank=True)
    output_schema = models.JSONField(default=dict, blank=True)
    rounding_rule_ref = models.CharField(max_length=160, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["rule__code", "-version"]
        unique_together = [("rule", "version")]
        verbose_name = "Payroll Rule Version"
        verbose_name_plural = "Payroll Rule Versions"

    def clean(self):
        errors = {}
        if self.rule_id and self.tenant_id and self.rule.tenant_id != self.tenant_id:
            errors["rule"] = "Payroll rule must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if not (self.expression or "").strip():
            errors["expression"] = "Rule expression is required."
        if self.expression_language != PayrollExpressionLanguage.SAFE_EXPR_V1:
            errors["expression_language"] = "Unsupported expression language."
        if self.rule_id and self.effective_from and self.status == PayrollRuleVersionStatus.ACTIVE:
            overlap = PayrollRuleVersion.objects.filter(
                rule=self.rule,
                status=PayrollRuleVersionStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Active rule version overlaps an existing active version."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.rule_id and not self.tenant_id:
            self.tenant = self.rule.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.rule.code}:v{self.version}"


class PayrollRuleEvaluation(UUIDPrimaryKeyModel, TimeStampedModel):
    """Persisted preview trace for safe payroll rule evaluation."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_rule_evaluations")
    rule_version = models.ForeignKey(PayrollRuleVersion, on_delete=models.PROTECT, related_name="evaluations")
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.SET_NULL,
        related_name="rule_evaluations",
        blank=True,
        null=True,
    )
    expression = models.TextField()
    context_snapshot = models.JSONField(default=dict, blank=True)
    result_snapshot = models.JSONField(default=dict, blank=True)
    trace_snapshot = models.JSONField(default=dict, blank=True)
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="payroll_rule_evaluations",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payroll Rule Evaluation"
        verbose_name_plural = "Payroll Rule Evaluations"

    def clean(self):
        errors = {}
        if self.rule_version_id and self.tenant_id and self.rule_version.tenant_id != self.tenant_id:
            errors["rule_version"] = "Payroll rule version must belong to the same tenant."
        if self.input_snapshot_id and self.tenant_id and self.input_snapshot.tenant_id != self.tenant_id:
            errors["input_snapshot"] = "Payroll input snapshot must belong to the same tenant."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.rule_version_id and not self.tenant_id:
            self.tenant = self.rule_version.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.rule_version}:{self.created_at:%Y-%m-%d %H:%M:%S}"


class PayrollRunCalculation(UUIDPrimaryKeyModel, TimeStampedModel):
    """Draft calculation attempt for a payroll run."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_run_calculations")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="calculations")
    attempt_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=PayrollCalculationStatus.choices, default=PayrollCalculationStatus.DRAFT)
    calculation_profile_ref = models.CharField(max_length=160, default="payroll.calculation.profile.default.v1")
    calculated_at = models.DateTimeField(blank=True, null=True)
    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="payroll_run_calculations",
        blank=True,
        null=True,
    )
    rule_selection_snapshot = models.JSONField(default=dict, blank=True)
    totals_snapshot = models.JSONField(default=dict, blank=True)
    error_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("payroll_run", "attempt_number")]
        verbose_name = "Payroll Run Calculation"
        verbose_name_plural = "Payroll Run Calculations"

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.status in {PayrollCalculationStatus.COMPLETED, PayrollCalculationStatus.FAILED} and not self.calculated_at:
            errors["calculated_at"] = "Completed or failed calculations must have a calculation timestamp."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:attempt-{self.attempt_number}"


class PayrollCalculationLine(UUIDPrimaryKeyModel, TimeStampedModel):
    """Employee/component calculation line generated from a locked source snapshot."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_calculation_lines")
    calculation = models.ForeignKey(PayrollRunCalculation, on_delete=models.CASCADE, related_name="lines")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="calculation_lines")
    input_snapshot = models.ForeignKey(PayrollInputSnapshot, on_delete=models.PROTECT, related_name="calculation_lines")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_calculation_lines")
    rule_version = models.ForeignKey(
        PayrollRuleVersion,
        on_delete=models.PROTECT,
        related_name="calculation_lines",
        blank=True,
        null=True,
    )
    adjustment = models.ForeignKey(
        "PayrollAdjustment",
        on_delete=models.PROTECT,
        related_name="calculation_lines",
        blank=True,
        null=True,
    )
    line_source = models.CharField(max_length=30, choices=PayrollCalculationLineSource.choices, default=PayrollCalculationLineSource.RULE)
    component_code = models.CharField(max_length=120)
    component_name = models.CharField(max_length=255)
    line_type = models.CharField(max_length=60, default="formula")
    calculation_order = models.PositiveSmallIntegerField(default=100)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency_code = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=20, choices=PayrollCalculationLineStatus.choices, default=PayrollCalculationLineStatus.CALCULATED)
    expression = models.TextField(blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    context_snapshot = models.JSONField(default=dict, blank=True)
    result_snapshot = models.JSONField(default=dict, blank=True)
    trace_snapshot = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "calculation_order", "component_code"]
        unique_together = [
            ("calculation", "input_snapshot", "rule_version"),
            ("calculation", "input_snapshot", "adjustment"),
        ]
        verbose_name = "Payroll Calculation Line"
        verbose_name_plural = "Payroll Calculation Lines"

    def clean(self):
        errors = {}
        if self.calculation_id and self.tenant_id and self.calculation.tenant_id != self.tenant_id:
            errors["calculation"] = "Payroll calculation must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.input_snapshot_id and self.tenant_id and self.input_snapshot.tenant_id != self.tenant_id:
            errors["input_snapshot"] = "Payroll input snapshot must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.rule_version_id and self.tenant_id and self.rule_version.tenant_id != self.tenant_id:
            errors["rule_version"] = "Payroll rule version must belong to the same tenant."
        if self.adjustment_id and self.tenant_id and self.adjustment.tenant_id != self.tenant_id:
            errors["adjustment"] = "Payroll adjustment must belong to the same tenant."
        if self.calculation_id and self.payroll_run_id and self.calculation.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Calculation line must belong to the same payroll run as the calculation."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Calculation line input snapshot must belong to the same payroll run."
        if self.input_snapshot_id and self.employee_id and self.input_snapshot.employee_id != self.employee_id:
            errors["employee"] = "Calculation line employee must match the input snapshot employee."
        if self.adjustment_id and self.payroll_run_id and self.adjustment.payroll_run_id != self.payroll_run_id:
            errors["adjustment"] = "Calculation line adjustment must belong to the same payroll run."
        if self.adjustment_id and self.employee_id and self.adjustment.employee_id != self.employee_id:
            errors["adjustment"] = "Calculation line adjustment must belong to the same employee."
        if self.adjustment_id and self.adjustment.status != PayrollAdjustmentStatus.APPLIED:
            errors["adjustment"] = "Calculation line adjustments must be applied before calculation."
        if self.line_source == PayrollCalculationLineSource.RULE and not self.rule_version_id:
            errors["rule_version"] = "Rule-sourced calculation lines require a rule version."
        if self.line_source == PayrollCalculationLineSource.ADJUSTMENT and not self.adjustment_id:
            errors["adjustment"] = "Adjustment-sourced calculation lines require an adjustment."
        if self.rule_version_id and self.adjustment_id:
            errors["line_source"] = "Calculation lines cannot use both a rule version and an adjustment."
        if self.input_snapshot_id and self.input_snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            errors["input_snapshot"] = "Payroll calculation lines can only use locked input snapshots."
        if self.amount is not None and self.amount < 0 and self.status == PayrollCalculationLineStatus.CALCULATED:
            errors["amount"] = "Calculated payroll line amounts cannot be negative."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.calculation_id and not self.tenant_id:
            self.tenant = self.calculation.tenant
        if self.calculation_id and not self.payroll_run_id:
            self.payroll_run = self.calculation.payroll_run
        if self.input_snapshot_id and not self.employee_id:
            self.employee = self.input_snapshot.employee
        if self.adjustment_id and not self.rule_version_id and self.line_source == PayrollCalculationLineSource.RULE:
            self.line_source = PayrollCalculationLineSource.ADJUSTMENT
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.employee.employee_code}:{self.component_code}"


class PayrollValidationIssue(UUIDPrimaryKeyModel, TimeStampedModel):
    """Persisted pre-calculation and calculation validation issue."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_validation_issues")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="validation_issues")
    calculation = models.ForeignKey(
        PayrollRunCalculation,
        on_delete=models.CASCADE,
        related_name="validation_issues",
        blank=True,
        null=True,
    )
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.SET_NULL,
        related_name="validation_issues",
        blank=True,
        null=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="payroll_validation_issues",
        blank=True,
        null=True,
    )
    calculation_line = models.ForeignKey(
        PayrollCalculationLine,
        on_delete=models.SET_NULL,
        related_name="validation_issues",
        blank=True,
        null=True,
    )
    severity = models.CharField(max_length=20, choices=PayrollValidationSeverity.choices, default=PayrollValidationSeverity.WARNING)
    category = models.CharField(max_length=40, choices=PayrollValidationCategory.choices, default=PayrollValidationCategory.SOURCE_DATA)
    status = models.CharField(max_length=20, choices=PayrollValidationIssueStatus.choices, default=PayrollValidationIssueStatus.OPEN)
    issue_code = models.CharField(max_length=120)
    title = models.CharField(max_length=255)
    detail = models.TextField(blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    validation_profile_ref = models.CharField(max_length=160, default="payroll.validation.profile.default.v1")
    source_hash = models.CharField(max_length=64, blank=True)
    context_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at", "severity", "category", "issue_code"]
        verbose_name = "Payroll Validation Issue"
        verbose_name_plural = "Payroll Validation Issues"

    def _issue_digest(self) -> str:
        payload = {
            "payroll_run_id": str(self.payroll_run_id or ""),
            "calculation_id": str(self.calculation_id or ""),
            "input_snapshot_id": str(self.input_snapshot_id or ""),
            "employee_id": str(self.employee_id or ""),
            "calculation_line_id": str(self.calculation_line_id or ""),
            "severity": self.severity,
            "category": self.category,
            "status": self.status,
            "issue_code": self.issue_code,
            "title": self.title,
            "detail": self.detail,
            "source_ref": self.source_ref,
            "validation_profile_ref": self.validation_profile_ref,
            "context_snapshot": self.context_snapshot,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.calculation_id and self.tenant_id and self.calculation.tenant_id != self.tenant_id:
            errors["calculation"] = "Payroll calculation must belong to the same tenant."
        if self.input_snapshot_id and self.tenant_id and self.input_snapshot.tenant_id != self.tenant_id:
            errors["input_snapshot"] = "Payroll input snapshot must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.calculation_line_id and self.tenant_id and self.calculation_line.tenant_id != self.tenant_id:
            errors["calculation_line"] = "Calculation line must belong to the same tenant."
        if self.calculation_id and self.payroll_run_id and self.calculation.payroll_run_id != self.payroll_run_id:
            errors["calculation"] = "Validation issue calculation must belong to the same payroll run."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Validation issue input snapshot must belong to the same payroll run."
        if self.input_snapshot_id and self.employee_id and self.input_snapshot.employee_id != self.employee_id:
            errors["employee"] = "Validation issue employee must match the input snapshot employee."
        if self.calculation_line_id and self.payroll_run_id and self.calculation_line.payroll_run_id != self.payroll_run_id:
            errors["calculation_line"] = "Validation issue line must belong to the same payroll run."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        if self.input_snapshot_id and not self.employee_id:
            self.employee = self.input_snapshot.employee
        if not self.validation_profile_ref:
            self.validation_profile_ref = "payroll.validation.profile.default.v1"
        if not self.source_hash:
            self.source_hash = self._issue_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        employee_code = self.employee.employee_code if self.employee_id else "run"
        return f"{self.payroll_run.code}:{employee_code}:{self.issue_code}:{self.status}"


class PayrollAdjustment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Configurable one-time payroll input for arrears, bonuses, reimbursements, loans, and corrections."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_adjustments")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="adjustments")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_adjustments")
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.PROTECT,
        related_name="payroll_adjustments",
        blank=True,
        null=True,
    )
    salary_component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.PROTECT,
        related_name="payroll_adjustments",
        blank=True,
        null=True,
    )
    kind = models.CharField(max_length=30, choices=PayrollAdjustmentKind.choices, default=PayrollAdjustmentKind.CORRECTION)
    status = models.CharField(max_length=20, choices=PayrollAdjustmentStatus.choices, default=PayrollAdjustmentStatus.DRAFT)
    direction = models.CharField(max_length=40, choices=PayrollAdjustmentDirection.choices, default=PayrollAdjustmentDirection.EARNING)
    component_code = models.CharField(max_length=120)
    component_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency_code = models.CharField(max_length=3, default="INR")
    effective_date = models.DateField()
    source_period_start = models.DateField(blank=True, null=True)
    source_period_end = models.DateField(blank=True, null=True)
    adjustment_profile_ref = models.CharField(max_length=160, default="payroll.adjustment.profile.default.v1")
    approval_profile_ref = models.CharField(max_length=160, blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_payroll_adjustments",
        blank=True,
        null=True,
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_payroll_adjustments",
        blank=True,
        null=True,
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_payroll_adjustments",
        blank=True,
        null=True,
    )
    applied_at = models.DateTimeField(blank=True, null=True)
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="applied_payroll_adjustments",
        blank=True,
        null=True,
    )
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    LOCKED_IMMUTABLE_FIELDS = [
        "payroll_run_id",
        "employee_id",
        "input_snapshot_id",
        "salary_component_id",
        "kind",
        "status",
        "direction",
        "component_code",
        "component_name",
        "amount",
        "currency_code",
        "effective_date",
        "source_period_start",
        "source_period_end",
        "adjustment_profile_ref",
        "approval_profile_ref",
        "source_ref",
        "reason",
        "submitted_at",
        "submitted_by_id",
        "approved_at",
        "approved_by_id",
        "rejected_at",
        "rejected_by_id",
        "applied_at",
        "applied_by_id",
        "source_hash",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["-effective_date", "employee__employee_code", "component_code"]
        unique_together = [("payroll_run", "employee", "source_ref", "component_code")]
        verbose_name = "Payroll Adjustment"
        verbose_name_plural = "Payroll Adjustments"

    def _adjustment_digest(self) -> str:
        payload = {
            "payroll_run_id": str(self.payroll_run_id or ""),
            "employee_id": str(self.employee_id or ""),
            "input_snapshot_id": str(self.input_snapshot_id or ""),
            "salary_component_id": str(self.salary_component_id or ""),
            "kind": self.kind,
            "direction": self.direction,
            "component_code": self.component_code,
            "component_name": self.component_name,
            "amount": str(self.amount),
            "currency_code": self.currency_code,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "source_period_start": self.source_period_start.isoformat() if self.source_period_start else None,
            "source_period_end": self.source_period_end.isoformat() if self.source_period_end else None,
            "adjustment_profile_ref": self.adjustment_profile_ref,
            "approval_profile_ref": self.approval_profile_ref,
            "source_ref": self.source_ref,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.input_snapshot_id and self.tenant_id and self.input_snapshot.tenant_id != self.tenant_id:
            errors["input_snapshot"] = "Payroll input snapshot must belong to the same tenant."
        if self.salary_component_id and self.tenant_id and self.salary_component.tenant_id != self.tenant_id:
            errors["salary_component"] = "Salary component must belong to the same tenant."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Adjustment snapshot must belong to the same payroll run."
        if self.input_snapshot_id and self.employee_id and self.input_snapshot.employee_id != self.employee_id:
            errors["employee"] = "Adjustment employee must match the input snapshot employee."
        if self.amount is not None and self.amount < 0:
            errors["amount"] = "Payroll adjustment amount cannot be negative."
        if self.source_period_start and self.source_period_end and self.source_period_start > self.source_period_end:
            errors["source_period_end"] = "Source period end must be on or after source period start."
        if self.effective_date and self.payroll_run_id:
            period = self.payroll_run.period
            if not period.start_date <= self.effective_date <= period.end_date:
                errors["effective_date"] = "Adjustment effective date must fall inside the payroll run period."
        if self.payroll_run_id and self.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED} and self.status not in {PayrollAdjustmentStatus.APPLIED, PayrollAdjustmentStatus.VOIDED}:
            errors["payroll_run"] = "Payroll adjustments must be applied or voided before run review or final lock."
        if self.status in {PayrollAdjustmentStatus.SUBMITTED, PayrollAdjustmentStatus.APPROVED, PayrollAdjustmentStatus.APPLIED} and not self.submitted_at:
            errors["submitted_at"] = "Submitted payroll adjustments must have a submission timestamp."
        if self.status in {PayrollAdjustmentStatus.APPROVED, PayrollAdjustmentStatus.APPLIED} and not self.approved_at:
            errors["approved_at"] = "Approved payroll adjustments must have an approval timestamp."
        if self.status == PayrollAdjustmentStatus.REJECTED and not self.rejected_at:
            errors["rejected_at"] = "Rejected payroll adjustments must have a rejection timestamp."
        if self.status == PayrollAdjustmentStatus.APPLIED and not self.applied_at:
            errors["applied_at"] = "Applied payroll adjustments must have an applied timestamp."
        if self.pk:
            previous = PayrollAdjustment.objects.filter(pk=self.pk).first()
            if previous and previous.status in {PayrollAdjustmentStatus.APPLIED, PayrollAdjustmentStatus.VOIDED}:
                changed_fields = [
                    field for field in self.LOCKED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Applied or voided payroll adjustments are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        if self.salary_component_id:
            if not self.component_code:
                self.component_code = self.salary_component.code
            if not self.component_name:
                self.component_name = self.salary_component.name
        if not self.source_hash:
            self.source_hash = self._adjustment_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.employee.employee_code}:{self.component_code}:{self.status}"


class PayrollSettlement(UUIDPrimaryKeyModel, TimeStampedModel):
    """Full-and-final settlement package composed from configurable settlement lines."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_settlements")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="settlements")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_settlements")
    exit_record = models.ForeignKey(
        EmployeeExit,
        on_delete=models.PROTECT,
        related_name="payroll_settlements",
        blank=True,
        null=True,
    )
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.PROTECT,
        related_name="payroll_settlements",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=PayrollSettlementStatus.choices, default=PayrollSettlementStatus.DRAFT)
    settlement_profile_ref = models.CharField(max_length=160, default="payroll.settlement.profile.default.v1")
    approval_profile_ref = models.CharField(max_length=160, blank=True)
    calculation_profile_ref = models.CharField(max_length=160, blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    reason = models.TextField(blank=True)
    settlement_date = models.DateField()
    last_working_date = models.DateField(blank=True, null=True)
    currency_code = models.CharField(max_length=3, default="INR")
    totals_snapshot = models.JSONField(default=dict, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_payroll_settlements",
        blank=True,
        null=True,
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_payroll_settlements",
        blank=True,
        null=True,
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_payroll_settlements",
        blank=True,
        null=True,
    )
    applied_at = models.DateTimeField(blank=True, null=True)
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="applied_payroll_settlements",
        blank=True,
        null=True,
    )

    LOCKED_IMMUTABLE_FIELDS = [
        "payroll_run_id",
        "employee_id",
        "exit_record_id",
        "input_snapshot_id",
        "status",
        "settlement_profile_ref",
        "approval_profile_ref",
        "calculation_profile_ref",
        "source_ref",
        "reason",
        "settlement_date",
        "last_working_date",
        "currency_code",
        "totals_snapshot",
        "source_hash",
        "config_snapshot",
        "submitted_at",
        "submitted_by_id",
        "approved_at",
        "approved_by_id",
        "rejected_at",
        "rejected_by_id",
        "applied_at",
        "applied_by_id",
    ]

    class Meta:
        ordering = ["-settlement_date", "employee__employee_code"]
        unique_together = [("payroll_run", "employee", "source_ref")]
        verbose_name = "Payroll Settlement"
        verbose_name_plural = "Payroll Settlements"

    def _settlement_digest(self) -> str:
        payload = {
            "payroll_run_id": str(self.payroll_run_id or ""),
            "employee_id": str(self.employee_id or ""),
            "exit_record_id": str(self.exit_record_id or ""),
            "input_snapshot_id": str(self.input_snapshot_id or ""),
            "status": self.status,
            "settlement_profile_ref": self.settlement_profile_ref,
            "approval_profile_ref": self.approval_profile_ref,
            "calculation_profile_ref": self.calculation_profile_ref,
            "source_ref": self.source_ref,
            "settlement_date": self.settlement_date.isoformat() if self.settlement_date else None,
            "last_working_date": self.last_working_date.isoformat() if self.last_working_date else None,
            "currency_code": self.currency_code,
            "totals_snapshot": self.totals_snapshot,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.exit_record_id and self.tenant_id and self.exit_record.tenant_id != self.tenant_id:
            errors["exit_record"] = "Exit record must belong to the same tenant."
        if self.input_snapshot_id and self.tenant_id and self.input_snapshot.tenant_id != self.tenant_id:
            errors["input_snapshot"] = "Payroll input snapshot must belong to the same tenant."
        if self.exit_record_id and self.employee_id and self.exit_record.employee_id != self.employee_id:
            errors["exit_record"] = "Settlement exit record must belong to the same employee."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Settlement snapshot must belong to the same payroll run."
        if self.input_snapshot_id and self.employee_id and self.input_snapshot.employee_id != self.employee_id:
            errors["employee"] = "Settlement employee must match the input snapshot employee."
        if self.settlement_date and self.payroll_run_id:
            period = self.payroll_run.period
            if not period.start_date <= self.settlement_date <= period.end_date:
                errors["settlement_date"] = "Settlement date must fall inside the payroll run period."
        if self.payroll_run_id and self.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED} and self.status not in {PayrollSettlementStatus.APPLIED, PayrollSettlementStatus.VOIDED}:
            errors["payroll_run"] = "Payroll settlements must be applied or voided before run review or final lock."
        if self.status in {PayrollSettlementStatus.SUBMITTED, PayrollSettlementStatus.APPROVED, PayrollSettlementStatus.APPLIED} and not self.submitted_at:
            errors["submitted_at"] = "Submitted payroll settlements must have a submission timestamp."
        if self.status in {PayrollSettlementStatus.APPROVED, PayrollSettlementStatus.APPLIED} and not self.approved_at:
            errors["approved_at"] = "Approved payroll settlements must have an approval timestamp."
        if self.status == PayrollSettlementStatus.REJECTED and not self.rejected_at:
            errors["rejected_at"] = "Rejected payroll settlements must have a rejection timestamp."
        if self.status == PayrollSettlementStatus.APPLIED and not self.applied_at:
            errors["applied_at"] = "Applied payroll settlements must have an applied timestamp."
        if self.pk:
            previous = PayrollSettlement.objects.filter(pk=self.pk).first()
            if previous and previous.status in {PayrollSettlementStatus.APPLIED, PayrollSettlementStatus.VOIDED}:
                changed_fields = [
                    field for field in self.LOCKED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Applied or voided payroll settlements are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        if not self.source_ref and self.employee_id and self.settlement_date:
            self.source_ref = f"settlement:{self.employee.employee_code}:{self.settlement_date}"
        if not self.currency_code and self.payroll_run_id:
            self.currency_code = self.payroll_run.period.calendar.currency_code or "INR"
        if not self.source_hash:
            self.source_hash = self._settlement_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.employee.employee_code}:settlement:{self.status}"


class PayrollSettlementLine(UUIDPrimaryKeyModel, TimeStampedModel):
    """A configurable full-and-final settlement component line."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_settlement_lines")
    settlement = models.ForeignKey(PayrollSettlement, on_delete=models.CASCADE, related_name="lines")
    salary_component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.PROTECT,
        related_name="payroll_settlement_lines",
        blank=True,
        null=True,
    )
    line_kind = models.CharField(max_length=40, choices=PayrollSettlementLineKind.choices, default=PayrollSettlementLineKind.OTHER)
    direction = models.CharField(max_length=40, choices=PayrollAdjustmentDirection.choices, default=PayrollAdjustmentDirection.EARNING)
    component_code = models.CharField(max_length=120)
    component_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency_code = models.CharField(max_length=3, default="INR")
    calculation_order = models.PositiveIntegerField(default=900)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    trace_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    LOCKED_IMMUTABLE_FIELDS = [
        "salary_component_id",
        "line_kind",
        "direction",
        "component_code",
        "component_name",
        "amount",
        "currency_code",
        "calculation_order",
        "source_ref",
        "source_hash",
        "trace_snapshot",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["calculation_order", "component_code"]
        unique_together = [("settlement", "source_ref", "component_code")]
        verbose_name = "Payroll Settlement Line"
        verbose_name_plural = "Payroll Settlement Lines"

    def _line_digest(self) -> str:
        payload = {
            "settlement_id": str(self.settlement_id or ""),
            "salary_component_id": str(self.salary_component_id or ""),
            "line_kind": self.line_kind,
            "direction": self.direction,
            "component_code": self.component_code,
            "component_name": self.component_name,
            "amount": str(self.amount),
            "currency_code": self.currency_code,
            "calculation_order": self.calculation_order,
            "source_ref": self.source_ref,
            "trace_snapshot": self.trace_snapshot,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.settlement_id and self.tenant_id and self.settlement.tenant_id != self.tenant_id:
            errors["settlement"] = "Settlement line must belong to the same tenant."
        if self.salary_component_id and self.tenant_id and self.salary_component.tenant_id != self.tenant_id:
            errors["salary_component"] = "Salary component must belong to the same tenant."
        if self.amount is not None and self.amount < 0:
            errors["amount"] = "Settlement line amount cannot be negative."
        if self.pk:
            previous = PayrollSettlementLine.objects.filter(pk=self.pk).select_related("settlement").first()
            if previous and previous.settlement.status in {PayrollSettlementStatus.APPLIED, PayrollSettlementStatus.VOIDED}:
                changed_fields = [
                    field for field in self.LOCKED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["settlement"] = "Applied or voided payroll settlement lines are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.settlement_id and not self.tenant_id:
            self.tenant = self.settlement.tenant
        if self.salary_component_id:
            if not self.component_code:
                self.component_code = self.salary_component.code
            if not self.component_name:
                self.component_name = self.salary_component.name
        if not self.currency_code and self.settlement_id:
            self.currency_code = self.settlement.currency_code
        if not self.source_ref and self.settlement_id:
            self.source_ref = f"{self.settlement.source_ref}:{self.line_kind}:{self.component_code}"
        if not self.source_hash:
            self.source_hash = self._line_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.settlement}:{self.component_code}:{self.amount}"


class PayrollRunReview(UUIDPrimaryKeyModel, TimeStampedModel):
    """Review cycle for a completed draft payroll calculation."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_run_reviews")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="reviews")
    calculation = models.OneToOneField(PayrollRunCalculation, on_delete=models.PROTECT, related_name="review")
    status = models.CharField(max_length=30, choices=PayrollReviewStatus.choices, default=PayrollReviewStatus.OPEN)
    review_profile_ref = models.CharField(max_length=160, default="payroll.review.profile.default.v1")
    opened_at = models.DateTimeField(default=timezone.now)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="opened_payroll_reviews",
        blank=True,
        null=True,
    )
    submitted_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_payroll_reviews",
        blank=True,
        null=True,
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_payroll_reviews",
        blank=True,
        null=True,
    )
    locked_at = models.DateTimeField(blank=True, null=True)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="locked_payroll_reviews",
        blank=True,
        null=True,
    )
    totals_snapshot = models.JSONField(default=dict, blank=True)
    exception_summary_snapshot = models.JSONField(default=dict, blank=True)
    approval_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payroll Run Review"
        verbose_name_plural = "Payroll Run Reviews"

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.calculation_id and self.tenant_id and self.calculation.tenant_id != self.tenant_id:
            errors["calculation"] = "Payroll calculation must belong to the same tenant."
        if self.calculation_id and self.payroll_run_id and self.calculation.payroll_run_id != self.payroll_run_id:
            errors["calculation"] = "Payroll review calculation must belong to the same payroll run."
        if self.calculation_id and self.calculation.status != PayrollCalculationStatus.COMPLETED:
            errors["calculation"] = "Payroll review requires a completed calculation."
        if self.status == PayrollReviewStatus.READY_FOR_APPROVAL and not self.submitted_at:
            errors["submitted_at"] = "Submitted reviews must have a submission timestamp."
        if self.status == PayrollReviewStatus.APPROVED and not self.approved_at:
            errors["approved_at"] = "Approved reviews must have an approval timestamp."
        if self.status == PayrollReviewStatus.LOCKED and not self.locked_at:
            errors["locked_at"] = "Locked reviews must have a lock timestamp."
        if self.pk:
            previous = PayrollRunReview.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollReviewStatus.LOCKED and self.status != PayrollReviewStatus.LOCKED:
                errors["status"] = "Locked payroll reviews are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.calculation_id and not self.payroll_run_id:
            self.payroll_run = self.calculation.payroll_run
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:review-{self.calculation.attempt_number}"


class PayrollRunException(UUIDPrimaryKeyModel, TimeStampedModel):
    """Review exception or accepted variance for a payroll calculation."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_run_exceptions")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.CASCADE, related_name="exceptions")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="exceptions")
    calculation_line = models.ForeignKey(
        PayrollCalculationLine,
        on_delete=models.SET_NULL,
        related_name="review_exceptions",
        blank=True,
        null=True,
    )
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.SET_NULL,
        related_name="review_exceptions",
        blank=True,
        null=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="payroll_run_exceptions",
        blank=True,
        null=True,
    )
    category = models.CharField(max_length=80, default="review")
    severity = models.CharField(max_length=20, choices=PayrollExceptionSeverity.choices, default=PayrollExceptionSeverity.WARNING)
    status = models.CharField(max_length=20, choices=PayrollExceptionStatus.choices, default=PayrollExceptionStatus.OPEN)
    title = models.CharField(max_length=255)
    detail = models.TextField(blank=True)
    decision_reason = models.TextField(blank=True)
    decided_at = models.DateTimeField(blank=True, null=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="decided_payroll_exceptions",
        blank=True,
        null=True,
    )
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["severity", "employee__employee_code", "category", "title"]
        verbose_name = "Payroll Run Exception"
        verbose_name_plural = "Payroll Run Exceptions"

    def clean(self):
        errors = {}
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.payroll_run_id and self.review.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Payroll exception must belong to the same payroll run as the review."
        if self.calculation_line_id and self.review_id and self.calculation_line.calculation_id != self.review.calculation_id:
            errors["calculation_line"] = "Payroll exception line must belong to the reviewed calculation."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Payroll exception snapshot must belong to the same payroll run."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.status in {PayrollExceptionStatus.ACCEPTED, PayrollExceptionStatus.RESOLVED, PayrollExceptionStatus.REJECTED} and not self.decided_at:
            errors["decided_at"] = "Decided exceptions must have a decision timestamp."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.review_id and not self.payroll_run_id:
            self.payroll_run = self.review.payroll_run
        if self.review_id and not self.tenant_id:
            self.tenant = self.review.tenant
        if self.calculation_line_id:
            if not self.input_snapshot_id:
                self.input_snapshot = self.calculation_line.input_snapshot
            if not self.employee_id:
                self.employee = self.calculation_line.employee
        if self.input_snapshot_id and not self.employee_id:
            self.employee = self.input_snapshot.employee
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.category}:{self.title}"


class PayrollRunApproval(UUIDPrimaryKeyModel, TimeStampedModel):
    """Approval decision captured during payroll review."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_run_approvals")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.CASCADE, related_name="approvals")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="payroll_run_approvals",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=PayrollApprovalStatus.choices, default=PayrollApprovalStatus.PENDING)
    comment = models.TextField(blank=True)
    decided_at = models.DateTimeField(blank=True, null=True)
    approval_profile_ref = models.CharField(max_length=160, default="payroll.approval.profile.default.v1")
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payroll Run Approval"
        verbose_name_plural = "Payroll Run Approvals"

    def clean(self):
        errors = {}
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.payroll_run_id and self.review.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Payroll approval must belong to the same payroll run as the review."
        if self.status in {PayrollApprovalStatus.APPROVED, PayrollApprovalStatus.REJECTED} and not self.decided_at:
            errors["decided_at"] = "Approval decisions must have a decision timestamp."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.review_id and not self.payroll_run_id:
            self.payroll_run = self.review.payroll_run
        if self.review_id and not self.tenant_id:
            self.tenant = self.review.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.status}"


class PayrollOutputBatch(UUIDPrimaryKeyModel, TimeStampedModel):
    """Generated output bundle for a final-locked payroll review."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_output_batches")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="output_batches")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="output_batches")
    status = models.CharField(max_length=20, choices=PayrollOutputBatchStatus.choices, default=PayrollOutputBatchStatus.GENERATED)
    output_profile_ref = models.CharField(max_length=160, default="payroll.output.profile.default.v1")
    generated_at = models.DateTimeField(blank=True, null=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="generated_payroll_output_batches",
        blank=True,
        null=True,
    )
    published_at = models.DateTimeField(blank=True, null=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="published_payroll_output_batches",
        blank=True,
        null=True,
    )
    totals_snapshot = models.JSONField(default=dict, blank=True)
    artifact_summary_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    PUBLISHED_IMMUTABLE_FIELDS = [
        "payroll_run_id",
        "review_id",
        "status",
        "output_profile_ref",
        "generated_at",
        "generated_by_id",
        "published_at",
        "published_by_id",
        "totals_snapshot",
        "artifact_summary_snapshot",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("review", "output_profile_ref")]
        verbose_name = "Payroll Output Batch"
        verbose_name_plural = "Payroll Output Batches"

    def clean(self):
        errors = {}
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.review_id and self.payroll_run_id and self.review.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Payroll output batch must belong to the same payroll run as the review."
        if self.review_id and self.review.status != PayrollReviewStatus.LOCKED:
            errors["review"] = "Payroll outputs require a final-locked review."
        if self.payroll_run_id and self.payroll_run.status != PayrollRunStatus.LOCKED:
            errors["payroll_run"] = "Payroll outputs require a final-locked payroll run."
        if self.status in {PayrollOutputBatchStatus.GENERATED, PayrollOutputBatchStatus.PUBLISHED} and not self.generated_at:
            errors["generated_at"] = "Generated output batches must have a generation timestamp."
        if self.status == PayrollOutputBatchStatus.PUBLISHED and not self.published_at:
            errors["published_at"] = "Published output batches must have a publish timestamp."
        if self.pk:
            previous = PayrollOutputBatch.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollOutputBatchStatus.PUBLISHED:
                changed_fields = [
                    field for field in self.PUBLISHED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Published payroll output batches are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.review_id and not self.payroll_run_id:
            self.payroll_run = self.review.payroll_run
        if self.payroll_run_id and not self.tenant_id:
            self.tenant = self.payroll_run.tenant
        if self.status in {PayrollOutputBatchStatus.GENERATED, PayrollOutputBatchStatus.PUBLISHED} and not self.generated_at:
            self.generated_at = timezone.now()
        if self.status == PayrollOutputBatchStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.output_profile_ref}:{self.status}"


class PayrollOutputArtifact(UUIDPrimaryKeyModel, TimeStampedModel):
    """Generated payroll output artifact metadata and immutable payload snapshot."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_output_artifacts")
    output_batch = models.ForeignKey(PayrollOutputBatch, on_delete=models.CASCADE, related_name="artifacts")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="output_artifacts")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="output_artifacts")
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payroll_output_artifacts",
        blank=True,
        null=True,
    )
    input_snapshot = models.ForeignKey(
        PayrollInputSnapshot,
        on_delete=models.PROTECT,
        related_name="output_artifacts",
        blank=True,
        null=True,
    )
    kind = models.CharField(max_length=40, choices=PayrollOutputArtifactKind.choices, default=PayrollOutputArtifactKind.PAYSLIP)
    status = models.CharField(max_length=20, choices=PayrollOutputArtifactStatus.choices, default=PayrollOutputArtifactStatus.GENERATED)
    artifact_key = models.CharField(max_length=180)
    title = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=120, default="application/json")
    storage_provider_ref = models.CharField(max_length=160, default="payroll.storage.local.generated.v1")
    storage_key = models.CharField(max_length=500, blank=True)
    mime_type = models.CharField(max_length=120, default="application/json")
    file_size_bytes = models.PositiveIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    is_downloadable = models.BooleanField(default=False)
    retention_policy_ref = models.CharField(max_length=160, default="payroll.retention.7y.v1")
    file_payload = models.TextField(blank=True)
    output_profile_ref = models.CharField(max_length=160, default="payroll.output.profile.default.v1")
    totals_snapshot = models.JSONField(default=dict, blank=True)
    line_snapshot = models.JSONField(default=list, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    published_at = models.DateTimeField(blank=True, null=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="published_payroll_output_artifacts",
        blank=True,
        null=True,
    )
    config_snapshot = models.JSONField(default=dict, blank=True)

    PUBLISHED_IMMUTABLE_FIELDS = [
        "output_batch_id",
        "payroll_run_id",
        "review_id",
        "employee_id",
        "input_snapshot_id",
        "kind",
        "status",
        "artifact_key",
        "title",
        "file_name",
        "content_type",
        "storage_provider_ref",
        "storage_key",
        "mime_type",
        "file_size_bytes",
        "checksum_sha256",
        "is_downloadable",
        "retention_policy_ref",
        "file_payload",
        "output_profile_ref",
        "totals_snapshot",
        "line_snapshot",
        "source_hash",
        "published_at",
        "published_by_id",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["kind", "artifact_key"]
        unique_together = [("output_batch", "kind", "artifact_key")]
        verbose_name = "Payroll Output Artifact"
        verbose_name_plural = "Payroll Output Artifacts"

    def _artifact_digest(self) -> str:
        payload = {
            "artifact_key": self.artifact_key,
            "kind": self.kind,
            "output_profile_ref": self.output_profile_ref,
            "totals_snapshot": self.totals_snapshot,
            "line_snapshot": self.line_snapshot,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.output_batch_id and self.tenant_id and self.output_batch.tenant_id != self.tenant_id:
            errors["output_batch"] = "Payroll output batch must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.output_batch_id and self.payroll_run_id and self.output_batch.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Payroll artifact must belong to the same payroll run as the output batch."
        if self.output_batch_id and self.review_id and self.output_batch.review_id != self.review_id:
            errors["review"] = "Payroll artifact must belong to the same review as the output batch."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.input_snapshot_id and self.payroll_run_id and self.input_snapshot.payroll_run_id != self.payroll_run_id:
            errors["input_snapshot"] = "Payroll artifact snapshot must belong to the same payroll run."
        if self.input_snapshot_id and self.employee_id and self.input_snapshot.employee_id != self.employee_id:
            errors["employee"] = "Payroll artifact employee must match the input snapshot employee."
        if self.status == PayrollOutputArtifactStatus.PUBLISHED and not self.published_at:
            errors["published_at"] = "Published payroll artifacts must have a publish timestamp."
        if self.kind == PayrollOutputArtifactKind.PAYSLIP and not self.employee_id:
            errors["employee"] = "Payslip artifacts require an employee."
        if self.is_downloadable and not self.storage_key:
            errors["storage_key"] = "Downloadable payroll artifacts require a storage key."
        if self.is_downloadable and not self.checksum_sha256:
            errors["checksum_sha256"] = "Downloadable payroll artifacts require a checksum."
        if self.pk:
            previous = PayrollOutputArtifact.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollOutputArtifactStatus.PUBLISHED:
                changed_fields = [
                    field for field in self.PUBLISHED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Published payroll output artifacts are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.output_batch_id:
            if not self.payroll_run_id:
                self.payroll_run = self.output_batch.payroll_run
            if not self.review_id:
                self.review = self.output_batch.review
            if not self.tenant_id:
                self.tenant = self.output_batch.tenant
            if not self.output_profile_ref:
                self.output_profile_ref = self.output_batch.output_profile_ref
        if self.input_snapshot_id and not self.employee_id:
            self.employee = self.input_snapshot.employee
        if not self.mime_type:
            self.mime_type = self.content_type or "application/json"
        if not self.content_type:
            self.content_type = self.mime_type
        if self.file_payload:
            payload_bytes = self.file_payload.encode("utf-8")
            self.file_size_bytes = len(payload_bytes)
            self.checksum_sha256 = hashlib.sha256(payload_bytes).hexdigest()
            self.is_downloadable = True
        if not self.storage_provider_ref:
            self.storage_provider_ref = "payroll.storage.local.generated.v1"
        if not self.retention_policy_ref:
            self.retention_policy_ref = "payroll.retention.7y.v1"
        if self.is_downloadable and not self.storage_key:
            run_code = self.payroll_run.code if self.payroll_run_id else "payroll-run"
            safe_artifact_key = self.artifact_key.replace(":", "/").replace(" ", "-")
            self.storage_key = f"payroll/{run_code}/{self.kind}/{safe_artifact_key}"
        if not self.source_hash:
            self.source_hash = self._artifact_digest()
        if self.status == PayrollOutputArtifactStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.kind}:{self.artifact_key}"


class PayrollFinanceHandoff(UUIDPrimaryKeyModel, TimeStampedModel):
    """Finance-facing handoff package for a published payroll output batch."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_finance_handoffs")
    output_batch = models.ForeignKey(PayrollOutputBatch, on_delete=models.PROTECT, related_name="finance_handoffs")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="finance_handoffs")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="finance_handoffs")
    status = models.CharField(max_length=20, choices=PayrollFinanceHandoffStatus.choices, default=PayrollFinanceHandoffStatus.GENERATED)
    handoff_profile_ref = models.CharField(max_length=160, default="payroll.finance_handoff.profile.default.v1")
    bank_file_profile_ref = models.CharField(max_length=160, default="payroll.bank_file.profile.default.v1")
    accounting_export_profile_ref = models.CharField(max_length=160, default="payroll.accounting_export.profile.default.v1")
    statutory_pack_ref = models.CharField(max_length=160, default="payroll.statutory_pack.default.v1")
    generated_at = models.DateTimeField(blank=True, null=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="generated_payroll_finance_handoffs",
        blank=True,
        null=True,
    )
    transmitted_at = models.DateTimeField(blank=True, null=True)
    transmitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="transmitted_payroll_finance_handoffs",
        blank=True,
        null=True,
    )
    accepted_at = models.DateTimeField(blank=True, null=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="accepted_payroll_finance_handoffs",
        blank=True,
        null=True,
    )
    totals_snapshot = models.JSONField(default=dict, blank=True)
    handoff_summary_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    ACCEPTED_IMMUTABLE_FIELDS = [
        "output_batch_id",
        "payroll_run_id",
        "review_id",
        "status",
        "handoff_profile_ref",
        "bank_file_profile_ref",
        "accounting_export_profile_ref",
        "statutory_pack_ref",
        "generated_at",
        "generated_by_id",
        "transmitted_at",
        "transmitted_by_id",
        "accepted_at",
        "accepted_by_id",
        "totals_snapshot",
        "handoff_summary_snapshot",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("output_batch", "handoff_profile_ref")]
        verbose_name = "Payroll Finance Handoff"
        verbose_name_plural = "Payroll Finance Handoffs"

    def clean(self):
        errors = {}
        if self.output_batch_id and self.tenant_id and self.output_batch.tenant_id != self.tenant_id:
            errors["output_batch"] = "Payroll output batch must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.output_batch_id and self.payroll_run_id and self.output_batch.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Finance handoff must belong to the same payroll run as the output batch."
        if self.output_batch_id and self.review_id and self.output_batch.review_id != self.review_id:
            errors["review"] = "Finance handoff must belong to the same review as the output batch."
        if self.output_batch_id and self.output_batch.status != PayrollOutputBatchStatus.PUBLISHED:
            errors["output_batch"] = "Finance handoff requires a published payroll output batch."
        if self.status in {
            PayrollFinanceHandoffStatus.GENERATED,
            PayrollFinanceHandoffStatus.TRANSMITTED,
            PayrollFinanceHandoffStatus.ACCEPTED,
            PayrollFinanceHandoffStatus.FAILED,
        } and not self.generated_at:
            errors["generated_at"] = "Generated finance handoffs must have a generation timestamp."
        if self.status in {PayrollFinanceHandoffStatus.TRANSMITTED, PayrollFinanceHandoffStatus.ACCEPTED} and not self.transmitted_at:
            errors["transmitted_at"] = "Transmitted finance handoffs must have a transmission timestamp."
        if self.status == PayrollFinanceHandoffStatus.ACCEPTED and not self.accepted_at:
            errors["accepted_at"] = "Accepted finance handoffs must have an acceptance timestamp."
        if self.pk:
            previous = PayrollFinanceHandoff.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollFinanceHandoffStatus.ACCEPTED:
                changed_fields = [
                    field for field in self.ACCEPTED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Accepted payroll finance handoffs are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.output_batch_id:
            if not self.payroll_run_id:
                self.payroll_run = self.output_batch.payroll_run
            if not self.review_id:
                self.review = self.output_batch.review
            if not self.tenant_id:
                self.tenant = self.output_batch.tenant
        if self.status in {
            PayrollFinanceHandoffStatus.GENERATED,
            PayrollFinanceHandoffStatus.TRANSMITTED,
            PayrollFinanceHandoffStatus.ACCEPTED,
            PayrollFinanceHandoffStatus.FAILED,
        } and not self.generated_at:
            self.generated_at = timezone.now()
        if self.status in {PayrollFinanceHandoffStatus.TRANSMITTED, PayrollFinanceHandoffStatus.ACCEPTED} and not self.transmitted_at:
            self.transmitted_at = timezone.now()
        if self.status == PayrollFinanceHandoffStatus.ACCEPTED and not self.accepted_at:
            self.accepted_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.handoff_profile_ref}:{self.status}"
