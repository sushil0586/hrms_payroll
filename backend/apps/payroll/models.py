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
from apps.payroll.providers import PayrollProviderAdapterError, validate_payroll_provider_route_config
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
    STATUTORY = "statutory", "Statutory"


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


class PayrollProviderDeliveryStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    SUBMITTED = "submitted", "Submitted"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    REJECTED = "rejected", "Rejected"
    FAILED = "failed", "Failed"
    RECONCILED = "reconciled", "Reconciled"


class PayrollProviderCallbackEventStatus(models.TextChoices):
    RECEIVED = "received", "Received"
    PROCESSED = "processed", "Processed"
    REPLAYED = "replayed", "Replayed"
    REJECTED = "rejected", "Rejected"


class PayrollProviderRetryEventStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    EXECUTED = "executed", "Executed"
    DEAD_LETTERED = "dead_lettered", "Dead Lettered"
    SKIPPED = "skipped", "Skipped"


class PayrollProviderConnectionKind(models.TextChoices):
    BANK = "bank", "Bank"
    ACCOUNTING = "accounting", "Accounting"
    STATUTORY = "statutory", "Statutory"
    OTHER = "other", "Other"


class PayrollProviderConnectionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CONFIGURED = "configured", "Configured"
    SANDBOX_READY = "sandbox_ready", "Sandbox Ready"
    CERTIFIED = "certified", "Certified"
    ACTIVE = "active", "Active"
    BLOCKED = "blocked", "Blocked"
    ARCHIVED = "archived", "Archived"


class PayrollProviderCertificationStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    PENDING = "pending", "Pending"
    PASSED = "passed", "Passed"
    FAILED = "failed", "Failed"
    EXPIRED = "expired", "Expired"


class PayrollArtifactAccessEventType(models.TextChoices):
    PUBLISHED = "published", "Published"
    NOTIFIED = "notified", "Notified"
    SIGNED_URL_ISSUED = "signed_url_issued", "Signed URL Issued"
    DOWNLOADED = "downloaded", "Downloaded"
    READ_ACKNOWLEDGED = "read_acknowledged", "Read Acknowledged"
    REVOKED = "revoked", "Revoked"


class PayrollArtifactAccessEventStatus(models.TextChoices):
    RECORDED = "recorded", "Recorded"
    FAILED = "failed", "Failed"
    REVOKED = "revoked", "Revoked"


class PayrollArtifactSignedAccessGrantStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    REVOKED = "revoked", "Revoked"
    EXPIRED = "expired", "Expired"


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


class PayrollStatutoryComponentKind(models.TextChoices):
    PROVIDENT_FUND = "provident_fund", "Provident Fund"
    EMPLOYEE_STATE_INSURANCE = "employee_state_insurance", "Employee State Insurance"
    PROFESSIONAL_TAX = "professional_tax", "Professional Tax"
    LABOUR_WELFARE_FUND = "labour_welfare_fund", "Labour Welfare Fund"
    TAX_DEDUCTED_AT_SOURCE = "tax_deducted_at_source", "Tax Deducted At Source"
    GRATUITY = "gratuity", "Gratuity"
    OTHER = "other", "Other"


class PayrollStatutoryContributionOwner(models.TextChoices):
    EMPLOYEE = "employee", "Employee"
    EMPLOYER = "employer", "Employer"
    BOTH = "both", "Both"
    INFORMATIONAL = "informational", "Informational"


class PayrollStatutoryCalculationMethod(models.TextChoices):
    FIXED_AMOUNT = "fixed_amount", "Fixed Amount"
    PERCENTAGE = "percentage", "Percentage"
    SLAB = "slab", "Slab"
    FORMULA = "formula", "Formula"


class PayrollTaxRegime(models.TextChoices):
    OLD = "old", "Old Regime"
    NEW = "new", "New Regime"
    NOT_DECLARED = "not_declared", "Not Declared"


class PayrollDeclarationStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    DECLARED = "declared", "Declared"
    PROOFS_PENDING = "proofs_pending", "Proofs Pending"
    VERIFIED = "verified", "Verified"
    LOCKED = "locked", "Locked"


class PayrollStatutoryDeclarationStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"
    LOCKED = "locked", "Locked"


class PayrollStatutoryDeclarationItemKind(models.TextChoices):
    PREVIOUS_EMPLOYMENT = "previous_employment", "Previous Employment"
    INVESTMENT = "investment", "Investment"
    EXEMPTION = "exemption", "Exemption"
    DEDUCTION = "deduction", "Deduction"
    RENTAL = "rental", "Rental"
    OTHER = "other", "Other"


class PayrollStatutoryProofStatus(models.TextChoices):
    NOT_REQUIRED = "not_required", "Not Required"
    PENDING = "pending", "Pending"
    SUBMITTED = "submitted", "Submitted"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"


class PayrollStatutoryFilingStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    UPCOMING = "upcoming", "Upcoming"
    DUE = "due", "Due"
    FILED = "filed", "Filed"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    OVERDUE = "overdue", "Overdue"
    WAIVED = "waived", "Waived"


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


class PayrollStatutoryPack(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-owned statutory pack that groups country/state payroll compliance settings."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_statutory_packs")
    code = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    country_code = models.CharField(max_length=2, default="IN")
    jurisdiction_ref = models.CharField(max_length=160, default="country:IN")
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.DRAFT)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    currency_code = models.CharField(max_length=3, default="INR")
    statutory_profile_ref = models.CharField(max_length=160, default="payroll.statutory.india.default.v1")
    validation_profile_ref = models.CharField(max_length=160, default="payroll.statutory.validation.india.default.v1")
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["country_code", "name", "-effective_from"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Statutory Pack"
        verbose_name_plural = "Payroll Statutory Packs"

    def clean(self):
        errors = {}
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.country_code and len(self.country_code.strip()) != 2:
            errors["country_code"] = "Country code must be a two-letter ISO code."
        if self.tenant_id and self.code and self.status == PayrollConfigStatus.ACTIVE and self.effective_from:
            overlap = PayrollStatutoryPack.objects.filter(
                tenant=self.tenant,
                code=self.code,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Active statutory pack version overlaps an existing active pack for this code."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.country_code = (self.country_code or "IN").upper()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}"


class PayrollStatutoryComponent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Configurable statutory component definition such as PF, ESI, PT, LWF, or TDS."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_statutory_components")
    statutory_pack = models.ForeignKey(PayrollStatutoryPack, on_delete=models.CASCADE, related_name="components")
    salary_component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.SET_NULL,
        related_name="statutory_component_links",
        blank=True,
        null=True,
    )
    code = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    statutory_type = models.CharField(max_length=40, choices=PayrollStatutoryComponentKind.choices)
    contribution_owner = models.CharField(max_length=20, choices=PayrollStatutoryContributionOwner.choices, default=PayrollStatutoryContributionOwner.EMPLOYEE)
    calculation_method = models.CharField(max_length=30, choices=PayrollStatutoryCalculationMethod.choices, default=PayrollStatutoryCalculationMethod.SLAB)
    wage_base_ref = models.CharField(max_length=160, default="payroll.wage_base.gross.v1")
    statutory_treatment_ref = models.CharField(max_length=160)
    registration_ref = models.CharField(max_length=160, blank=True)
    applicability_profile_ref = models.CharField(max_length=160, blank=True)
    rounding_rule_ref = models.CharField(max_length=160, blank=True)
    formula_ref = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.DRAFT)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["statutory_pack__name", "statutory_type", "name"]
        unique_together = [("statutory_pack", "code")]
        verbose_name = "Payroll Statutory Component"
        verbose_name_plural = "Payroll Statutory Components"

    def clean(self):
        errors = {}
        if self.statutory_pack_id and self.tenant_id and self.statutory_pack.tenant_id != self.tenant_id:
            errors["statutory_pack"] = "Statutory pack must belong to the same tenant."
        if self.salary_component_id and self.tenant_id and self.salary_component.tenant_id != self.tenant_id:
            errors["salary_component"] = "Salary component must belong to the same tenant."
        if self.calculation_method == PayrollStatutoryCalculationMethod.FORMULA and not self.formula_ref:
            errors["formula_ref"] = "Formula reference is required for formula statutory components."
        if self.calculation_method != PayrollStatutoryCalculationMethod.FORMULA and self.formula_ref:
            errors["formula_ref"] = "Formula reference is only allowed for formula statutory components."
        if not self.statutory_treatment_ref:
            errors["statutory_treatment_ref"] = "Statutory treatment reference is required."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.statutory_pack_id and not self.tenant_id:
            self.tenant = self.statutory_pack.tenant
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.statutory_pack.code}:{self.code}"


class PayrollStatutorySlab(UUIDPrimaryKeyModel, TimeStampedModel):
    """Amount/rate slab for a statutory component, optionally scoped by state or profile."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_statutory_slabs")
    statutory_component = models.ForeignKey(PayrollStatutoryComponent, on_delete=models.CASCADE, related_name="slabs")
    code = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    slab_order = models.PositiveSmallIntegerField(default=100)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    min_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    max_amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    employee_rate_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    employer_rate_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    fixed_employee_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    fixed_employer_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    wage_ceiling_amount = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    state_code = models.CharField(max_length=10, blank=True)
    applicability_profile_ref = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.ACTIVE)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["statutory_component__code", "slab_order", "min_amount"]
        unique_together = [("statutory_component", "code")]
        verbose_name = "Payroll Statutory Slab"
        verbose_name_plural = "Payroll Statutory Slabs"

    def clean(self):
        errors = {}
        if self.statutory_component_id and self.tenant_id and self.statutory_component.tenant_id != self.tenant_id:
            errors["statutory_component"] = "Statutory component must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.max_amount is not None and self.min_amount is not None and self.max_amount < self.min_amount:
            errors["max_amount"] = "Maximum amount must be greater than or equal to minimum amount."
        for field_name in ["min_amount", "employee_rate_percent", "employer_rate_percent", "fixed_employee_amount", "fixed_employer_amount"]:
            value = getattr(self, field_name)
            if value is not None and value < 0:
                errors[field_name] = "Value cannot be negative."
        if self.wage_ceiling_amount is not None and self.wage_ceiling_amount < 0:
            errors["wage_ceiling_amount"] = "Wage ceiling cannot be negative."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.statutory_component_id and not self.tenant_id:
            self.tenant = self.statutory_component.tenant
        self.state_code = (self.state_code or "").upper()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.statutory_component.code}:{self.code}"


class PayrollStatutoryEmployerRegistration(UUIDPrimaryKeyModel, TimeStampedModel):
    """Employer statutory registration/account used for filings and provider handoff."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_statutory_employer_registrations")
    statutory_pack = models.ForeignKey(PayrollStatutoryPack, on_delete=models.PROTECT, related_name="employer_registrations")
    statutory_component = models.ForeignKey(
        PayrollStatutoryComponent,
        on_delete=models.PROTECT,
        related_name="employer_registrations",
        blank=True,
        null=True,
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.PROTECT,
        related_name="payroll_statutory_employer_registrations",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="payroll_statutory_employer_registrations",
        blank=True,
        null=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="payroll_statutory_employer_registrations",
        blank=True,
        null=True,
    )
    code = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    registration_type_ref = models.CharField(max_length=160)
    registration_number = models.CharField(max_length=120)
    employer_identifier = models.CharField(max_length=120, blank=True)
    jurisdiction_ref = models.CharField(max_length=160, blank=True)
    filing_authority_ref = models.CharField(max_length=160, blank=True)
    provider_ref = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.ACTIVE)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["statutory_pack__name", "registration_type_ref", "name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Statutory Employer Registration"
        verbose_name_plural = "Payroll Statutory Employer Registrations"

    def _registration_digest(self) -> str:
        def date_value(value):
            return value.isoformat() if hasattr(value, "isoformat") else value

        payload = {
            "statutory_pack_id": str(self.statutory_pack_id or ""),
            "statutory_component_id": str(self.statutory_component_id or ""),
            "legal_entity_id": str(self.legal_entity_id or ""),
            "branch_id": str(self.branch_id or ""),
            "location_id": str(self.location_id or ""),
            "code": self.code,
            "registration_type_ref": self.registration_type_ref,
            "registration_number": self.registration_number,
            "employer_identifier": self.employer_identifier,
            "jurisdiction_ref": self.jurisdiction_ref,
            "filing_authority_ref": self.filing_authority_ref,
            "provider_ref": self.provider_ref,
            "status": self.status,
            "effective_from": date_value(self.effective_from) if self.effective_from else None,
            "effective_to": date_value(self.effective_to) if self.effective_to else None,
            "source_ref": self.source_ref,
            "config_snapshot": self.config_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if self.statutory_pack_id and self.tenant_id and self.statutory_pack.tenant_id != self.tenant_id:
            errors["statutory_pack"] = "Statutory pack must belong to the same tenant."
        if self.statutory_component_id and self.tenant_id and self.statutory_component.tenant_id != self.tenant_id:
            errors["statutory_component"] = "Statutory component must belong to the same tenant."
        if self.statutory_component_id and self.statutory_pack_id and self.statutory_component.statutory_pack_id != self.statutory_pack_id:
            errors["statutory_component"] = "Statutory component must belong to the selected statutory pack."
        for field_name in ["legal_entity", "branch", "location"]:
            related_item = getattr(self, field_name)
            if related_item and self.tenant_id and related_item.tenant_id != self.tenant_id:
                errors[field_name] = "Selected organization record must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.status == PayrollConfigStatus.ACTIVE and self.tenant_id and self.registration_type_ref and self.registration_number and self.effective_from:
            overlap = PayrollStatutoryEmployerRegistration.objects.filter(
                tenant=self.tenant,
                registration_type_ref=self.registration_type_ref,
                registration_number=self.registration_number,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["registration_number"] = "Active employer registration overlaps an existing registration for this number."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.statutory_pack_id and not self.tenant_id:
            self.tenant = self.statutory_pack.tenant
        self.jurisdiction_ref = self.jurisdiction_ref or (self.statutory_pack.jurisdiction_ref if self.statutory_pack_id else "")
        self.registration_number = (self.registration_number or "").strip().upper()
        self.employer_identifier = (self.employer_identifier or "").strip().upper()
        self.source_hash = self._registration_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code}:{self.registration_number}"


class PayrollStatutoryFilingCalendar(UUIDPrimaryKeyModel, TimeStampedModel):
    """Configured statutory filing obligation for a payroll jurisdiction and period."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_statutory_filing_calendars")
    statutory_pack = models.ForeignKey(PayrollStatutoryPack, on_delete=models.PROTECT, related_name="filing_calendars")
    statutory_component = models.ForeignKey(
        PayrollStatutoryComponent,
        on_delete=models.PROTECT,
        related_name="filing_calendars",
        blank=True,
        null=True,
    )
    employer_registration = models.ForeignKey(
        PayrollStatutoryEmployerRegistration,
        on_delete=models.PROTECT,
        related_name="filing_calendars",
        blank=True,
        null=True,
    )
    code = models.SlugField(max_length=120)
    name = models.CharField(max_length=255)
    filing_type_ref = models.CharField(max_length=160)
    filing_frequency = models.CharField(max_length=30, choices=PayrollFrequency.choices, default=PayrollFrequency.MONTHLY)
    period_start = models.DateField()
    period_end = models.DateField()
    due_date = models.DateField()
    grace_due_date = models.DateField(blank=True, null=True)
    filing_window_start = models.DateField(blank=True, null=True)
    filing_window_end = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayrollStatutoryFilingStatus.choices, default=PayrollStatutoryFilingStatus.UPCOMING)
    filing_authority_ref = models.CharField(max_length=160, blank=True)
    provider_ref = models.CharField(max_length=160, blank=True)
    output_profile_ref = models.CharField(max_length=160, blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["due_date", "statutory_pack__name", "filing_type_ref"]
        unique_together = [("tenant", "code")]
        verbose_name = "Payroll Statutory Filing Calendar"
        verbose_name_plural = "Payroll Statutory Filing Calendars"

    def _filing_digest(self) -> str:
        def date_value(value):
            return value.isoformat() if hasattr(value, "isoformat") else value

        payload = {
            "statutory_pack_id": str(self.statutory_pack_id or ""),
            "statutory_component_id": str(self.statutory_component_id or ""),
            "employer_registration_id": str(self.employer_registration_id or ""),
            "code": self.code,
            "filing_type_ref": self.filing_type_ref,
            "filing_frequency": self.filing_frequency,
            "period_start": date_value(self.period_start) if self.period_start else None,
            "period_end": date_value(self.period_end) if self.period_end else None,
            "due_date": date_value(self.due_date) if self.due_date else None,
            "grace_due_date": date_value(self.grace_due_date) if self.grace_due_date else None,
            "filing_window_start": date_value(self.filing_window_start) if self.filing_window_start else None,
            "filing_window_end": date_value(self.filing_window_end) if self.filing_window_end else None,
            "status": self.status,
            "filing_authority_ref": self.filing_authority_ref,
            "provider_ref": self.provider_ref,
            "output_profile_ref": self.output_profile_ref,
            "source_ref": self.source_ref,
            "config_snapshot": self.config_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def clean(self):
        errors = {}
        if self.statutory_pack_id and self.tenant_id and self.statutory_pack.tenant_id != self.tenant_id:
            errors["statutory_pack"] = "Statutory pack must belong to the same tenant."
        if self.statutory_component_id and self.tenant_id and self.statutory_component.tenant_id != self.tenant_id:
            errors["statutory_component"] = "Statutory component must belong to the same tenant."
        if self.statutory_component_id and self.statutory_pack_id and self.statutory_component.statutory_pack_id != self.statutory_pack_id:
            errors["statutory_component"] = "Statutory component must belong to the selected statutory pack."
        if self.employer_registration_id and self.tenant_id and self.employer_registration.tenant_id != self.tenant_id:
            errors["employer_registration"] = "Employer registration must belong to the same tenant."
        if self.employer_registration_id and self.statutory_pack_id and self.employer_registration.statutory_pack_id != self.statutory_pack_id:
            errors["employer_registration"] = "Employer registration must belong to the selected statutory pack."
        if self.period_end and self.period_start and self.period_end < self.period_start:
            errors["period_end"] = "Period end date must be on or after period start date."
        if self.grace_due_date and self.due_date and self.grace_due_date < self.due_date:
            errors["grace_due_date"] = "Grace due date must be on or after due date."
        if self.filing_window_end and self.filing_window_start and self.filing_window_end < self.filing_window_start:
            errors["filing_window_end"] = "Filing window end date must be on or after filing window start date."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.statutory_pack_id and not self.tenant_id:
            self.tenant = self.statutory_pack.tenant
        self.filing_authority_ref = self.filing_authority_ref or (
            self.employer_registration.filing_authority_ref if self.employer_registration_id else ""
        )
        self.provider_ref = self.provider_ref or (self.employer_registration.provider_ref if self.employer_registration_id else "")
        self.source_hash = self._filing_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code}:{self.due_date}"


class EmployeeStatutoryProfile(UUIDPrimaryKeyModel, TimeStampedModel):
    """Employee-level statutory applicability, identities, and tax declaration state."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="employee_statutory_profiles")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="statutory_profiles")
    statutory_pack = models.ForeignKey(
        PayrollStatutoryPack,
        on_delete=models.PROTECT,
        related_name="employee_profiles",
        blank=True,
        null=True,
    )
    profile_ref = models.CharField(max_length=160, default="payroll.employee_statutory_profile.india.default.v1")
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayrollConfigStatus.choices, default=PayrollConfigStatus.ACTIVE)
    pan_number = models.CharField(max_length=20, blank=True)
    uan_number = models.CharField(max_length=30, blank=True)
    pf_number = models.CharField(max_length=40, blank=True)
    esi_number = models.CharField(max_length=40, blank=True)
    pf_applicable = models.BooleanField(default=False)
    esi_applicable = models.BooleanField(default=False)
    professional_tax_state = models.CharField(max_length=10, blank=True)
    lwf_state = models.CharField(max_length=10, blank=True)
    tax_regime = models.CharField(max_length=20, choices=PayrollTaxRegime.choices, default=PayrollTaxRegime.NOT_DECLARED)
    declaration_status = models.CharField(max_length=30, choices=PayrollDeclarationStatus.choices, default=PayrollDeclarationStatus.NOT_STARTED)
    previous_employment_income = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    previous_employment_tax_deducted = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "-effective_from"]
        verbose_name = "Employee Statutory Profile"
        verbose_name_plural = "Employee Statutory Profiles"

    def _profile_digest(self) -> str:
        def date_value(value):
            return value.isoformat() if hasattr(value, "isoformat") else value

        payload = {
            "employee_id": str(self.employee_id or ""),
            "statutory_pack_id": str(self.statutory_pack_id or ""),
            "profile_ref": self.profile_ref,
            "effective_from": date_value(self.effective_from) if self.effective_from else None,
            "effective_to": date_value(self.effective_to) if self.effective_to else None,
            "pan_number": self.pan_number,
            "uan_number": self.uan_number,
            "pf_applicable": self.pf_applicable,
            "esi_applicable": self.esi_applicable,
            "professional_tax_state": self.professional_tax_state,
            "lwf_state": self.lwf_state,
            "tax_regime": self.tax_regime,
            "declaration_status": self.declaration_status,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.statutory_pack_id and self.tenant_id and self.statutory_pack.tenant_id != self.tenant_id:
            errors["statutory_pack"] = "Statutory pack must belong to the same tenant."
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective-to date must be on or after effective-from date."
        if self.previous_employment_income is not None and self.previous_employment_income < 0:
            errors["previous_employment_income"] = "Previous employment income cannot be negative."
        if self.previous_employment_tax_deducted is not None and self.previous_employment_tax_deducted < 0:
            errors["previous_employment_tax_deducted"] = "Previous employment tax deducted cannot be negative."
        if self.pan_number and len(self.pan_number.strip()) != 10:
            errors["pan_number"] = "PAN number must be 10 characters when provided."
        if self.uan_number and len(self.uan_number.strip()) != 12:
            errors["uan_number"] = "UAN number must be 12 characters when provided."
        if self.pf_applicable and not self.uan_number:
            errors["uan_number"] = "UAN number is required when PF is applicable."
        if self.esi_applicable and not self.esi_number:
            errors["esi_number"] = "ESI number is required when ESI is applicable."
        if self.tenant_id and self.employee_id and self.effective_from and self.status == PayrollConfigStatus.ACTIVE:
            overlap = EmployeeStatutoryProfile.objects.filter(
                tenant=self.tenant,
                employee=self.employee,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=self.effective_to or date.max,
            ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.effective_from))
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                errors["effective_from"] = "Employee already has an active statutory profile in this effective window."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.employee_id and not self.tenant_id:
            self.tenant = self.employee.tenant
        self.pan_number = (self.pan_number or "").upper()
        self.uan_number = (self.uan_number or "").strip()
        self.professional_tax_state = (self.professional_tax_state or "").upper()
        self.lwf_state = (self.lwf_state or "").upper()
        self.source_hash = self._profile_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee.employee_code}:{self.profile_ref}"


class EmployeeStatutoryDeclaration(UUIDPrimaryKeyModel, TimeStampedModel):
    """Annual employee statutory/tax declaration package with HR verification state."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="employee_statutory_declarations")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="statutory_declarations")
    employee_statutory_profile = models.ForeignKey(
        EmployeeStatutoryProfile,
        on_delete=models.PROTECT,
        related_name="declarations",
    )
    statutory_pack = models.ForeignKey(
        PayrollStatutoryPack,
        on_delete=models.PROTECT,
        related_name="employee_declarations",
        blank=True,
        null=True,
    )
    financial_year_code = models.CharField(max_length=40)
    declaration_profile_ref = models.CharField(max_length=160, default="payroll.statutory.declaration.india.default.v1")
    proof_window_ref = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=PayrollStatutoryDeclarationStatus.choices, default=PayrollStatutoryDeclarationStatus.DRAFT)
    tax_regime = models.CharField(max_length=20, choices=PayrollTaxRegime.choices, default=PayrollTaxRegime.NOT_DECLARED)
    declared_total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    verified_total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    submitted_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_statutory_declarations",
        blank=True,
        null=True,
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="verified_statutory_declarations",
        blank=True,
        null=True,
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_statutory_declarations",
        blank=True,
        null=True,
    )
    locked_at = models.DateTimeField(blank=True, null=True)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="locked_statutory_declarations",
        blank=True,
        null=True,
    )
    rejection_reason = models.TextField(blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "-financial_year_code", "declaration_profile_ref"]
        unique_together = [("tenant", "employee", "financial_year_code", "declaration_profile_ref")]
        verbose_name = "Employee Statutory Declaration"
        verbose_name_plural = "Employee Statutory Declarations"

    def _declaration_digest(self) -> str:
        payload = {
            "employee_id": str(self.employee_id or ""),
            "employee_statutory_profile_id": str(self.employee_statutory_profile_id or ""),
            "statutory_pack_id": str(self.statutory_pack_id or ""),
            "financial_year_code": self.financial_year_code,
            "declaration_profile_ref": self.declaration_profile_ref,
            "proof_window_ref": self.proof_window_ref,
            "status": self.status,
            "tax_regime": self.tax_regime,
            "declared_total_amount": str(self.declared_total_amount),
            "verified_total_amount": str(self.verified_total_amount),
            "source_ref": self.source_ref,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.employee_statutory_profile_id and self.tenant_id and self.employee_statutory_profile.tenant_id != self.tenant_id:
            errors["employee_statutory_profile"] = "Employee statutory profile must belong to the same tenant."
        if self.employee_statutory_profile_id and self.employee_id and self.employee_statutory_profile.employee_id != self.employee_id:
            errors["employee_statutory_profile"] = "Employee statutory profile must belong to the same employee."
        if self.statutory_pack_id and self.tenant_id and self.statutory_pack.tenant_id != self.tenant_id:
            errors["statutory_pack"] = "Statutory pack must belong to the same tenant."
        if not self.financial_year_code:
            errors["financial_year_code"] = "Financial year code is required."
        if self.declared_total_amount is not None and self.declared_total_amount < 0:
            errors["declared_total_amount"] = "Declared total amount cannot be negative."
        if self.verified_total_amount is not None and self.verified_total_amount < 0:
            errors["verified_total_amount"] = "Verified total amount cannot be negative."
        if self.status in {PayrollStatutoryDeclarationStatus.SUBMITTED, PayrollStatutoryDeclarationStatus.VERIFIED, PayrollStatutoryDeclarationStatus.LOCKED} and not self.submitted_at:
            errors["submitted_at"] = "Submitted timestamp is required for submitted, verified, or locked declarations."
        if self.status in {PayrollStatutoryDeclarationStatus.VERIFIED, PayrollStatutoryDeclarationStatus.LOCKED} and not self.verified_at:
            errors["verified_at"] = "Verified timestamp is required for verified or locked declarations."
        if self.status == PayrollStatutoryDeclarationStatus.REJECTED and not self.rejection_reason:
            errors["rejection_reason"] = "Rejection reason is required for rejected declarations."
        if self.status == PayrollStatutoryDeclarationStatus.LOCKED and not self.locked_at:
            errors["locked_at"] = "Locked timestamp is required for locked declarations."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.employee_id and not self.tenant_id:
            self.tenant = self.employee.tenant
        if self.employee_statutory_profile_id and not self.statutory_pack_id:
            self.statutory_pack = self.employee_statutory_profile.statutory_pack
        self.financial_year_code = (self.financial_year_code or "").strip().upper()
        self.source_hash = self._declaration_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee.employee_code}:{self.financial_year_code}:{self.declaration_profile_ref}"


class EmployeeStatutoryDeclarationItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Individual declared statutory/tax item and proof verification state."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="employee_statutory_declaration_items")
    declaration = models.ForeignKey(EmployeeStatutoryDeclaration, on_delete=models.CASCADE, related_name="items")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="statutory_declaration_items")
    item_kind = models.CharField(max_length=30, choices=PayrollStatutoryDeclarationItemKind.choices, default=PayrollStatutoryDeclarationItemKind.INVESTMENT)
    section_code = models.CharField(max_length=80)
    component_code = models.CharField(max_length=120, blank=True)
    name = models.CharField(max_length=255)
    declared_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    verified_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    proof_status = models.CharField(max_length=20, choices=PayrollStatutoryProofStatus.choices, default=PayrollStatutoryProofStatus.PENDING)
    proof_document_ref = models.CharField(max_length=180, blank=True)
    proof_artifact_key = models.CharField(max_length=240, blank=True)
    proof_submitted_at = models.DateTimeField(blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="verified_statutory_declaration_items",
        blank=True,
        null=True,
    )
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_statutory_declaration_items",
        blank=True,
        null=True,
    )
    rejection_reason = models.TextField(blank=True)
    source_ref = models.CharField(max_length=180, blank=True)
    source_hash = models.CharField(max_length=64, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["declaration__financial_year_code", "employee__employee_code", "section_code", "component_code"]
        unique_together = [("declaration", "section_code", "component_code")]
        verbose_name = "Employee Statutory Declaration Item"
        verbose_name_plural = "Employee Statutory Declaration Items"

    def _item_digest(self) -> str:
        payload = {
            "declaration_id": str(self.declaration_id or ""),
            "employee_id": str(self.employee_id or ""),
            "item_kind": self.item_kind,
            "section_code": self.section_code,
            "component_code": self.component_code,
            "name": self.name,
            "declared_amount": str(self.declared_amount),
            "verified_amount": str(self.verified_amount),
            "proof_status": self.proof_status,
            "proof_document_ref": self.proof_document_ref,
            "proof_artifact_key": self.proof_artifact_key,
            "source_ref": self.source_ref,
            "config_snapshot": self.config_snapshot,
        }
        encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def clean(self):
        errors = {}
        if self.declaration_id and self.tenant_id and self.declaration.tenant_id != self.tenant_id:
            errors["declaration"] = "Statutory declaration must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.declaration_id and self.employee_id and self.declaration.employee_id != self.employee_id:
            errors["employee"] = "Declaration item employee must match the declaration employee."
        if self.declaration_id and self.declaration.status == PayrollStatutoryDeclarationStatus.LOCKED:
            errors["declaration"] = "Locked statutory declarations cannot be edited."
        if self.declared_amount is not None and self.declared_amount < 0:
            errors["declared_amount"] = "Declared amount cannot be negative."
        if self.verified_amount is not None and self.verified_amount < 0:
            errors["verified_amount"] = "Verified amount cannot be negative."
        if self.proof_status in {PayrollStatutoryProofStatus.SUBMITTED, PayrollStatutoryProofStatus.VERIFIED} and not (self.proof_document_ref or self.proof_artifact_key):
            errors["proof_document_ref"] = "Proof reference is required when proof is submitted or verified."
        if self.proof_status == PayrollStatutoryProofStatus.VERIFIED and not self.verified_at:
            errors["verified_at"] = "Verified timestamp is required for verified proof items."
        if self.proof_status == PayrollStatutoryProofStatus.REJECTED and not self.rejection_reason:
            errors["rejection_reason"] = "Rejection reason is required for rejected proof items."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.declaration_id and not self.tenant_id:
            self.tenant = self.declaration.tenant
        if self.declaration_id and not self.employee_id:
            self.employee = self.declaration.employee
        self.section_code = (self.section_code or "").strip().upper()
        self.component_code = (self.component_code or "").strip().upper()
        self.source_hash = self._item_digest()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.declaration.financial_year_code}:{self.employee.employee_code}:{self.section_code}:{self.component_code}"


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
    storage_object_version = models.CharField(max_length=180, blank=True)
    mime_type = models.CharField(max_length=120, default="application/json")
    file_size_bytes = models.PositiveIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    is_downloadable = models.BooleanField(default=False)
    download_strategy_ref = models.CharField(max_length=160, default="payroll.download.stream.local.v1")
    supports_signed_url = models.BooleanField(default=False)
    signed_url_expires_in_seconds = models.PositiveIntegerField(default=900)
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
        "storage_object_version",
        "mime_type",
        "file_size_bytes",
        "checksum_sha256",
        "is_downloadable",
        "download_strategy_ref",
        "supports_signed_url",
        "signed_url_expires_in_seconds",
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
        if not self.download_strategy_ref:
            self.download_strategy_ref = "payroll.download.signed_url.v1" if self.supports_signed_url else "payroll.download.stream.local.v1"
        if not self.signed_url_expires_in_seconds:
            self.signed_url_expires_in_seconds = 900
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


class PayrollArtifactSignedAccessGrant(UUIDPrimaryKeyModel, TimeStampedModel):
    """Permission-bound signed access grant for a payroll artifact download."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_artifact_signed_access_grants")
    output_artifact = models.ForeignKey(PayrollOutputArtifact, on_delete=models.CASCADE, related_name="signed_access_grants")
    output_batch = models.ForeignKey(PayrollOutputBatch, on_delete=models.PROTECT, related_name="artifact_signed_access_grants")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="artifact_signed_access_grants")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="artifact_signed_access_grants")
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    issued_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="issued_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    issued_to_membership = models.ForeignKey(
        "iam.TenantMembership",
        on_delete=models.SET_NULL,
        related_name="issued_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    issued_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    issued_by_membership = models.ForeignKey(
        "iam.TenantMembership",
        on_delete=models.SET_NULL,
        related_name="created_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=PayrollArtifactSignedAccessGrantStatus.choices, default=PayrollArtifactSignedAccessGrantStatus.ACTIVE)
    permission_scope = models.CharField(max_length=80, default="download")
    grant_profile_ref = models.CharField(max_length=160, default="payroll.signed_access.profile.default.v1")
    source_channel_ref = models.CharField(max_length=160, default="employee.portal.v1")
    token_hash = models.CharField(max_length=64)
    token_prefix = models.CharField(max_length=16, blank=True)
    signed_url = models.CharField(max_length=1000, blank=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(blank=True, null=True)
    revoked_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="revoked_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    revoked_by_membership = models.ForeignKey(
        "iam.TenantMembership",
        on_delete=models.SET_NULL,
        related_name="revoked_payroll_artifact_signed_access_grants",
        blank=True,
        null=True,
    )
    revocation_reason = models.CharField(max_length=255, blank=True)
    access_count = models.PositiveIntegerField(default=0)
    max_access_count = models.PositiveIntegerField(blank=True, null=True)
    last_accessed_at = models.DateTimeField(blank=True, null=True)
    storage_provider_ref = models.CharField(max_length=160, blank=True)
    storage_key = models.CharField(max_length=500, blank=True)
    storage_object_version = models.CharField(max_length=180, blank=True)
    download_strategy_ref = models.CharField(max_length=160, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    metadata_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payroll Artifact Signed Access Grant"
        verbose_name_plural = "Payroll Artifact Signed Access Grants"

    def clean(self):
        errors = {}
        if self.output_artifact_id and self.tenant_id and self.output_artifact.tenant_id != self.tenant_id:
            errors["output_artifact"] = "Signed access grant must belong to the same tenant as the artifact."
        if self.output_batch_id and self.tenant_id and self.output_batch.tenant_id != self.tenant_id:
            errors["output_batch"] = "Signed access grant batch must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Signed access grant payroll run must belong to the same tenant."
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Signed access grant review must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Signed access grant employee must belong to the same tenant."
        if self.output_artifact_id and self.output_batch_id and self.output_artifact.output_batch_id != self.output_batch_id:
            errors["output_batch"] = "Signed access grant batch must match the artifact batch."
        if self.output_artifact_id and self.payroll_run_id and self.output_artifact.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Signed access grant payroll run must match the artifact payroll run."
        if self.output_artifact_id and self.review_id and self.output_artifact.review_id != self.review_id:
            errors["review"] = "Signed access grant review must match the artifact review."
        if self.output_artifact_id and self.employee_id and self.output_artifact.employee_id and self.output_artifact.employee_id != self.employee_id:
            errors["employee"] = "Signed access grant employee must match the artifact employee."
        if self.output_artifact_id and self.output_artifact.status == PayrollOutputArtifactStatus.PUBLISHED and not self.output_artifact.is_downloadable:
            errors["output_artifact"] = "Signed access grants require a downloadable payroll artifact."
        if self.status == PayrollArtifactSignedAccessGrantStatus.REVOKED:
            if not self.revoked_at:
                errors["revoked_at"] = "Revoked signed access grants require a revocation timestamp."
            if not self.revocation_reason:
                errors["revocation_reason"] = "Revoked signed access grants require a revocation reason."
        if self.status == PayrollArtifactSignedAccessGrantStatus.ACTIVE and self.revoked_at:
            errors["status"] = "Active signed access grants cannot have revocation metadata."
        if self.max_access_count is not None and self.access_count > self.max_access_count:
            errors["access_count"] = "Signed access grant access count cannot exceed its configured maximum."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.output_artifact_id:
            if not self.tenant_id:
                self.tenant = self.output_artifact.tenant
            if not self.output_batch_id:
                self.output_batch = self.output_artifact.output_batch
            if not self.payroll_run_id:
                self.payroll_run = self.output_artifact.payroll_run
            if not self.review_id:
                self.review = self.output_artifact.review
            if self.output_artifact.employee_id and not self.employee_id:
                self.employee = self.output_artifact.employee
            if not self.storage_provider_ref:
                self.storage_provider_ref = self.output_artifact.storage_provider_ref
            if not self.storage_key:
                self.storage_key = self.output_artifact.storage_key
            if not self.storage_object_version:
                self.storage_object_version = self.output_artifact.storage_object_version
            if not self.download_strategy_ref:
                self.download_strategy_ref = self.output_artifact.download_strategy_ref
            if not self.checksum_sha256:
                self.checksum_sha256 = self.output_artifact.checksum_sha256
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.output_artifact}:{self.status}:{self.expires_at:%Y-%m-%d %H:%M:%S}"


class PayrollArtifactAccessEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Append-only event trail for payroll artifact publish, notification, and employee access."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_artifact_access_events")
    output_artifact = models.ForeignKey(PayrollOutputArtifact, on_delete=models.CASCADE, related_name="access_events")
    output_batch = models.ForeignKey(PayrollOutputBatch, on_delete=models.PROTECT, related_name="artifact_access_events")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="artifact_access_events")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="artifact_access_events")
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payroll_artifact_access_events",
        blank=True,
        null=True,
    )
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="payroll_artifact_access_events",
        blank=True,
        null=True,
    )
    actor_membership = models.ForeignKey(
        "iam.TenantMembership",
        on_delete=models.SET_NULL,
        related_name="payroll_artifact_access_events",
        blank=True,
        null=True,
    )
    notification = models.ForeignKey(
        "notifications.Notification",
        on_delete=models.SET_NULL,
        related_name="payroll_artifact_access_events",
        blank=True,
        null=True,
    )
    signed_access_grant = models.ForeignKey(
        PayrollArtifactSignedAccessGrant,
        on_delete=models.SET_NULL,
        related_name="access_events",
        blank=True,
        null=True,
    )
    event_type = models.CharField(max_length=40, choices=PayrollArtifactAccessEventType.choices)
    status = models.CharField(max_length=20, choices=PayrollArtifactAccessEventStatus.choices, default=PayrollArtifactAccessEventStatus.RECORDED)
    event_profile_ref = models.CharField(max_length=160, default="payroll.artifact_access.profile.default.v1")
    source_channel_ref = models.CharField(max_length=160, default="employee.portal.v1")
    actor_identifier = models.CharField(max_length=180, blank=True)
    request_identifier = models.CharField(max_length=180, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    storage_provider_ref = models.CharField(max_length=160, blank=True)
    storage_key = models.CharField(max_length=500, blank=True)
    storage_object_version = models.CharField(max_length=180, blank=True)
    download_strategy_ref = models.CharField(max_length=160, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    read_at = models.DateTimeField(blank=True, null=True)
    metadata_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payroll Artifact Access Event"
        verbose_name_plural = "Payroll Artifact Access Events"

    def clean(self):
        errors = {}
        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).first()
            if previous:
                immutable_changes = []
                for field in self._meta.fields:
                    if field.name in {"id", "created_at", "updated_at"}:
                        continue
                    if getattr(previous, field.attname) != getattr(self, field.attname):
                        immutable_changes.append(field.name)
                if immutable_changes:
                    errors["__all__"] = (
                        "Payroll artifact access events are append-only and cannot be changed after creation. "
                        f"Changed fields: {', '.join(immutable_changes)}."
                    )
        if self.output_artifact_id and self.tenant_id and self.output_artifact.tenant_id != self.tenant_id:
            errors["output_artifact"] = "Payroll artifact access event must belong to the same tenant."
        if self.output_batch_id and self.tenant_id and self.output_batch.tenant_id != self.tenant_id:
            errors["output_batch"] = "Payroll output batch must belong to the same tenant."
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            errors["payroll_run"] = "Payroll run must belong to the same tenant."
        if self.review_id and self.tenant_id and self.review.tenant_id != self.tenant_id:
            errors["review"] = "Payroll review must belong to the same tenant."
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            errors["employee"] = "Employee must belong to the same tenant."
        if self.signed_access_grant_id and self.tenant_id and self.signed_access_grant.tenant_id != self.tenant_id:
            errors["signed_access_grant"] = "Signed access grant must belong to the same tenant."
        if self.output_artifact_id and self.output_batch_id and self.output_artifact.output_batch_id != self.output_batch_id:
            errors["output_batch"] = "Access event batch must match the artifact batch."
        if self.output_artifact_id and self.payroll_run_id and self.output_artifact.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Access event payroll run must match the artifact payroll run."
        if self.output_artifact_id and self.review_id and self.output_artifact.review_id != self.review_id:
            errors["review"] = "Access event review must match the artifact review."
        if self.output_artifact_id and self.employee_id and self.output_artifact.employee_id and self.output_artifact.employee_id != self.employee_id:
            errors["employee"] = "Access event employee must match the artifact employee."
        if self.signed_access_grant_id and self.output_artifact_id and self.signed_access_grant.output_artifact_id != self.output_artifact_id:
            errors["signed_access_grant"] = "Access event signed grant must match the artifact."
        if self.signed_access_grant_id and self.payroll_run_id and self.signed_access_grant.payroll_run_id != self.payroll_run_id:
            errors["signed_access_grant"] = "Access event signed grant must match the payroll run."
        if self.signed_access_grant_id and self.employee_id and self.signed_access_grant.employee_id and self.signed_access_grant.employee_id != self.employee_id:
            errors["signed_access_grant"] = "Access event signed grant must match the employee."
        if self.event_type == PayrollArtifactAccessEventType.READ_ACKNOWLEDGED and not self.read_at:
            errors["read_at"] = "Read acknowledgement events require a read timestamp."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.output_artifact_id:
            if not self.tenant_id:
                self.tenant = self.output_artifact.tenant
            if not self.output_batch_id:
                self.output_batch = self.output_artifact.output_batch
            if not self.payroll_run_id:
                self.payroll_run = self.output_artifact.payroll_run
            if not self.review_id:
                self.review = self.output_artifact.review
            if self.output_artifact.employee_id and not self.employee_id:
                self.employee = self.output_artifact.employee
            if not self.storage_provider_ref:
                self.storage_provider_ref = self.output_artifact.storage_provider_ref
            if not self.storage_key:
                self.storage_key = self.output_artifact.storage_key
            if not self.storage_object_version:
                self.storage_object_version = self.output_artifact.storage_object_version
            if not self.download_strategy_ref:
                self.download_strategy_ref = self.output_artifact.download_strategy_ref
            if not self.checksum_sha256:
                self.checksum_sha256 = self.output_artifact.checksum_sha256
        if self.signed_access_grant_id:
            if not self.storage_provider_ref:
                self.storage_provider_ref = self.signed_access_grant.storage_provider_ref
            if not self.storage_key:
                self.storage_key = self.signed_access_grant.storage_key
            if not self.storage_object_version:
                self.storage_object_version = self.signed_access_grant.storage_object_version
            if not self.download_strategy_ref:
                self.download_strategy_ref = self.signed_access_grant.download_strategy_ref
            if not self.checksum_sha256:
                self.checksum_sha256 = self.signed_access_grant.checksum_sha256
        if self.actor_user_id and not self.actor_identifier:
            self.actor_identifier = getattr(self.actor_user, "username", "") or getattr(self.actor_user, "email", "") or str(self.actor_user_id)
        if self.event_type == PayrollArtifactAccessEventType.READ_ACKNOWLEDGED and not self.read_at:
            self.read_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.output_artifact}:{self.event_type}:{self.status}"


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


class PayrollProviderDelivery(UUIDPrimaryKeyModel, TimeStampedModel):
    """Provider-facing delivery ledger for finance handoff artifacts."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_provider_deliveries")
    handoff = models.ForeignKey(PayrollFinanceHandoff, on_delete=models.CASCADE, related_name="provider_deliveries")
    output_artifact = models.ForeignKey(PayrollOutputArtifact, on_delete=models.PROTECT, related_name="provider_deliveries")
    output_batch = models.ForeignKey(PayrollOutputBatch, on_delete=models.PROTECT, related_name="provider_deliveries")
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.PROTECT, related_name="provider_deliveries")
    review = models.ForeignKey(PayrollRunReview, on_delete=models.PROTECT, related_name="provider_deliveries")
    artifact_kind = models.CharField(max_length=40, choices=PayrollOutputArtifactKind.choices)
    status = models.CharField(
        max_length=20,
        choices=PayrollProviderDeliveryStatus.choices,
        default=PayrollProviderDeliveryStatus.QUEUED,
    )
    provider_ref = models.CharField(max_length=160, default="payroll.provider.manual.v1")
    channel_ref = models.CharField(max_length=160, default="payroll.channel.manual.v1")
    external_reference = models.CharField(max_length=180, blank=True)
    retry_policy_ref = models.CharField(max_length=160, default="payroll.delivery.retry.standard.v1")
    attempt_count = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_payroll_provider_deliveries",
        blank=True,
        null=True,
    )
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="acknowledged_payroll_provider_deliveries",
        blank=True,
        null=True,
    )
    reconciled_at = models.DateTimeField(blank=True, null=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reconciled_payroll_provider_deliveries",
        blank=True,
        null=True,
    )
    failure_code = models.CharField(max_length=80, blank=True)
    failure_reason = models.TextField(blank=True)
    payload_checksum_sha256 = models.CharField(max_length=64, blank=True)
    request_snapshot = models.JSONField(default=dict, blank=True)
    response_snapshot = models.JSONField(default=dict, blank=True)
    reconciliation_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    RECONCILED_IMMUTABLE_FIELDS = [
        "tenant_id",
        "handoff_id",
        "output_artifact_id",
        "output_batch_id",
        "payroll_run_id",
        "review_id",
        "artifact_kind",
        "status",
        "provider_ref",
        "channel_ref",
        "external_reference",
        "retry_policy_ref",
        "attempt_count",
        "submitted_at",
        "submitted_by_id",
        "acknowledged_at",
        "acknowledged_by_id",
        "reconciled_at",
        "reconciled_by_id",
        "failure_code",
        "failure_reason",
        "payload_checksum_sha256",
        "request_snapshot",
        "response_snapshot",
        "reconciliation_snapshot",
        "config_snapshot",
    ]

    class Meta:
        ordering = ["artifact_kind", "provider_ref", "created_at"]
        unique_together = [("handoff", "output_artifact", "provider_ref")]
        verbose_name = "Payroll Provider Delivery"
        verbose_name_plural = "Payroll Provider Deliveries"

    def clean(self):
        errors = {}
        if self.handoff_id and self.tenant_id and self.handoff.tenant_id != self.tenant_id:
            errors["handoff"] = "Provider delivery handoff must belong to the same tenant."
        if self.output_artifact_id and self.tenant_id and self.output_artifact.tenant_id != self.tenant_id:
            errors["output_artifact"] = "Provider delivery artifact must belong to the same tenant."
        if self.output_batch_id and self.handoff_id and self.handoff.output_batch_id != self.output_batch_id:
            errors["output_batch"] = "Provider delivery must belong to the same output batch as the handoff."
        if self.output_artifact_id and self.output_batch_id and self.output_artifact.output_batch_id != self.output_batch_id:
            errors["output_artifact"] = "Provider delivery artifact must belong to the same output batch."
        if self.payroll_run_id and self.handoff_id and self.handoff.payroll_run_id != self.payroll_run_id:
            errors["payroll_run"] = "Provider delivery must belong to the same payroll run as the handoff."
        if self.review_id and self.handoff_id and self.handoff.review_id != self.review_id:
            errors["review"] = "Provider delivery must belong to the same review as the handoff."
        if self.output_artifact_id:
            if self.output_artifact.kind not in {
                PayrollOutputArtifactKind.BANK_ADVICE,
                PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
                PayrollOutputArtifactKind.STATUTORY_REPORT,
            }:
                errors["output_artifact"] = "Provider deliveries are only supported for finance handoff artifacts."
            if self.output_artifact.status != PayrollOutputArtifactStatus.PUBLISHED:
                errors["output_artifact"] = "Provider deliveries require published output artifacts."
            if self.artifact_kind and self.output_artifact.kind != self.artifact_kind:
                errors["artifact_kind"] = "Provider delivery artifact kind must match the output artifact."
        if self.status in {
            PayrollProviderDeliveryStatus.SUBMITTED,
            PayrollProviderDeliveryStatus.ACKNOWLEDGED,
            PayrollProviderDeliveryStatus.REJECTED,
            PayrollProviderDeliveryStatus.FAILED,
            PayrollProviderDeliveryStatus.RECONCILED,
        } and not self.submitted_at:
            errors["submitted_at"] = "Submitted provider deliveries must have a submission timestamp."
        if self.status in {PayrollProviderDeliveryStatus.ACKNOWLEDGED, PayrollProviderDeliveryStatus.RECONCILED} and not self.acknowledged_at:
            errors["acknowledged_at"] = "Acknowledged provider deliveries must have an acknowledgement timestamp."
        if self.status == PayrollProviderDeliveryStatus.RECONCILED and not self.reconciled_at:
            errors["reconciled_at"] = "Reconciled provider deliveries must have a reconciliation timestamp."
        if self.status in {PayrollProviderDeliveryStatus.REJECTED, PayrollProviderDeliveryStatus.FAILED} and not (self.failure_code or self.failure_reason):
            errors["failure_reason"] = "Rejected or failed provider deliveries require failure evidence."
        if self.pk:
            previous = PayrollProviderDelivery.objects.filter(pk=self.pk).first()
            if previous and previous.status == PayrollProviderDeliveryStatus.RECONCILED:
                changed_fields = [
                    field for field in self.RECONCILED_IMMUTABLE_FIELDS
                    if getattr(previous, field) != getattr(self, field)
                ]
                if changed_fields:
                    errors["status"] = "Reconciled payroll provider deliveries are immutable."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.handoff_id:
            if not self.output_batch_id:
                self.output_batch = self.handoff.output_batch
            if not self.payroll_run_id:
                self.payroll_run = self.handoff.payroll_run
            if not self.review_id:
                self.review = self.handoff.review
            if not self.tenant_id:
                self.tenant = self.handoff.tenant
        if self.output_artifact_id and not self.artifact_kind:
            self.artifact_kind = self.output_artifact.kind
        if self.output_artifact_id and not self.payload_checksum_sha256:
            self.payload_checksum_sha256 = self.output_artifact.checksum_sha256
        now = timezone.now()
        if self.status in {
            PayrollProviderDeliveryStatus.SUBMITTED,
            PayrollProviderDeliveryStatus.ACKNOWLEDGED,
            PayrollProviderDeliveryStatus.REJECTED,
            PayrollProviderDeliveryStatus.FAILED,
            PayrollProviderDeliveryStatus.RECONCILED,
        } and not self.submitted_at:
            self.submitted_at = now
        if self.status in {PayrollProviderDeliveryStatus.ACKNOWLEDGED, PayrollProviderDeliveryStatus.RECONCILED} and not self.acknowledged_at:
            self.acknowledged_at = now
        if self.status == PayrollProviderDeliveryStatus.RECONCILED and not self.reconciled_at:
            self.reconciled_at = now
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.payroll_run.code}:{self.artifact_kind}:{self.provider_ref}:{self.status}"


class PayrollProviderCallbackEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Durable inbound callback ledger for provider delivery webhooks."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_provider_callback_events")
    provider_delivery = models.ForeignKey(PayrollProviderDelivery, on_delete=models.CASCADE, related_name="callback_events")
    handoff = models.ForeignKey(PayrollFinanceHandoff, on_delete=models.CASCADE, related_name="provider_callback_events")
    output_artifact = models.ForeignKey(PayrollOutputArtifact, on_delete=models.PROTECT, related_name="provider_callback_events")
    provider_ref = models.CharField(max_length=160)
    external_reference = models.CharField(max_length=180, blank=True)
    external_event_id = models.CharField(max_length=180, blank=True)
    idempotency_key = models.CharField(max_length=180)
    callback_profile_ref = models.CharField(max_length=160, default="payroll.callback.manual.v1")
    callback_verification_ref = models.CharField(max_length=160, default="payroll.callback.verification.manual.v1")
    status = models.CharField(
        max_length=20,
        choices=PayrollProviderCallbackEventStatus.choices,
        default=PayrollProviderCallbackEventStatus.RECEIVED,
    )
    provider_status = models.CharField(max_length=20, choices=PayrollProviderDeliveryStatus.choices)
    payload_checksum_sha256 = models.CharField(max_length=64)
    signature = models.CharField(max_length=160, blank=True)
    verification_snapshot = models.JSONField(default=dict, blank=True)
    payload_snapshot = models.JSONField(default=dict, blank=True)
    processing_snapshot = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(blank=True, null=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    failure_code = models.CharField(max_length=80, blank=True)
    failure_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_at", "-created_at"]
        unique_together = [("provider_ref", "idempotency_key")]
        verbose_name = "Payroll Provider Callback Event"
        verbose_name_plural = "Payroll Provider Callback Events"

    def clean(self):
        errors = {}
        if self.provider_delivery_id and self.tenant_id and self.provider_delivery.tenant_id != self.tenant_id:
            errors["provider_delivery"] = "Provider callback delivery must belong to the same tenant."
        if self.handoff_id and self.provider_delivery_id and self.provider_delivery.handoff_id != self.handoff_id:
            errors["handoff"] = "Provider callback handoff must match the delivery handoff."
        if self.output_artifact_id and self.provider_delivery_id and self.provider_delivery.output_artifact_id != self.output_artifact_id:
            errors["output_artifact"] = "Provider callback artifact must match the delivery artifact."
        if self.provider_ref and self.provider_delivery_id and self.provider_delivery.provider_ref != self.provider_ref:
            errors["provider_ref"] = "Provider callback ref must match the delivery provider ref."
        if self.status == PayrollProviderCallbackEventStatus.PROCESSED and not self.processed_at:
            errors["processed_at"] = "Processed provider callbacks must have a processed timestamp."
        if self.status == PayrollProviderCallbackEventStatus.REJECTED and not (self.failure_code or self.failure_reason):
            errors["failure_reason"] = "Rejected provider callbacks require failure evidence."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.provider_delivery_id:
            if not self.tenant_id:
                self.tenant = self.provider_delivery.tenant
            if not self.handoff_id:
                self.handoff = self.provider_delivery.handoff
            if not self.output_artifact_id:
                self.output_artifact = self.provider_delivery.output_artifact
            if not self.provider_ref:
                self.provider_ref = self.provider_delivery.provider_ref
            if not self.external_reference:
                self.external_reference = self.provider_delivery.external_reference
        if not self.received_at:
            self.received_at = timezone.now()
        if self.status == PayrollProviderCallbackEventStatus.PROCESSED and not self.processed_at:
            self.processed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.provider_ref}:{self.idempotency_key}:{self.status}"


class PayrollProviderRetryEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Retry/dead-letter event ledger for provider delivery execution."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_provider_retry_events")
    provider_delivery = models.ForeignKey(PayrollProviderDelivery, on_delete=models.CASCADE, related_name="retry_events")
    handoff = models.ForeignKey(PayrollFinanceHandoff, on_delete=models.CASCADE, related_name="provider_retry_events")
    output_artifact = models.ForeignKey(PayrollOutputArtifact, on_delete=models.PROTECT, related_name="provider_retry_events")
    status = models.CharField(
        max_length=20,
        choices=PayrollProviderRetryEventStatus.choices,
        default=PayrollProviderRetryEventStatus.SCHEDULED,
    )
    retry_policy_ref = models.CharField(max_length=160, default="payroll.delivery.retry.standard.v1")
    failure_taxonomy_ref = models.CharField(max_length=160, default="payroll.delivery.failure_taxonomy.default.v1")
    failure_category_ref = models.CharField(max_length=160, blank=True)
    retry_reason = models.TextField(blank=True)
    attempt_number = models.PositiveIntegerField(default=1)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    executed_at = models.DateTimeField(blank=True, null=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="requested_payroll_provider_retries",
        blank=True,
        null=True,
    )
    executed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="executed_payroll_provider_retries",
        blank=True,
        null=True,
    )
    decision_snapshot = models.JSONField(default=dict, blank=True)
    request_snapshot = models.JSONField(default=dict, blank=True)
    response_snapshot = models.JSONField(default=dict, blank=True)
    failure_code = models.CharField(max_length=80, blank=True)
    failure_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_for", "-created_at"]
        verbose_name = "Payroll Provider Retry Event"
        verbose_name_plural = "Payroll Provider Retry Events"

    def clean(self):
        errors = {}
        if self.provider_delivery_id and self.tenant_id and self.provider_delivery.tenant_id != self.tenant_id:
            errors["provider_delivery"] = "Provider retry delivery must belong to the same tenant."
        if self.handoff_id and self.provider_delivery_id and self.provider_delivery.handoff_id != self.handoff_id:
            errors["handoff"] = "Provider retry handoff must match the delivery handoff."
        if self.output_artifact_id and self.provider_delivery_id and self.provider_delivery.output_artifact_id != self.output_artifact_id:
            errors["output_artifact"] = "Provider retry artifact must match the delivery artifact."
        if self.status == PayrollProviderRetryEventStatus.EXECUTED and not self.executed_at:
            errors["executed_at"] = "Executed provider retries must have an execution timestamp."
        if self.status in {PayrollProviderRetryEventStatus.DEAD_LETTERED, PayrollProviderRetryEventStatus.SKIPPED} and not (self.failure_code or self.failure_reason):
            errors["failure_reason"] = "Skipped or dead-lettered provider retries require failure evidence."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.provider_delivery_id:
            if not self.tenant_id:
                self.tenant = self.provider_delivery.tenant
            if not self.handoff_id:
                self.handoff = self.provider_delivery.handoff
            if not self.output_artifact_id:
                self.output_artifact = self.provider_delivery.output_artifact
            if not self.retry_policy_ref:
                self.retry_policy_ref = self.provider_delivery.retry_policy_ref
        now = timezone.now()
        if not self.scheduled_for:
            self.scheduled_for = now
        if self.status == PayrollProviderRetryEventStatus.EXECUTED and not self.executed_at:
            self.executed_at = now
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.provider_delivery_id}:{self.status}:attempt-{self.attempt_number}"


class PayrollProviderConnection(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tenant-level provider onboarding, readiness, and certification record."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payroll_provider_connections")
    provider_ref = models.CharField(max_length=160)
    provider_name = models.CharField(max_length=160)
    provider_kind = models.CharField(
        max_length=24,
        choices=PayrollProviderConnectionKind.choices,
        default=PayrollProviderConnectionKind.OTHER,
    )
    environment_ref = models.CharField(max_length=80, default="sandbox")
    status = models.CharField(
        max_length=24,
        choices=PayrollProviderConnectionStatus.choices,
        default=PayrollProviderConnectionStatus.DRAFT,
    )
    adapter_ref = models.CharField(max_length=180, blank=True)
    sandbox_adapter_ref = models.CharField(max_length=180, blank=True)
    channel_ref = models.CharField(max_length=180, blank=True)
    credential_ref = models.CharField(max_length=180, blank=True)
    credential_profile_ref = models.CharField(max_length=180, blank=True)
    credential_required = models.BooleanField(default=False)
    callback_profile_ref = models.CharField(max_length=180, blank=True)
    callback_verification_ref = models.CharField(max_length=180, blank=True)
    retry_policy_ref = models.CharField(max_length=180, blank=True)
    certification_status = models.CharField(
        max_length=24,
        choices=PayrollProviderCertificationStatus.choices,
        default=PayrollProviderCertificationStatus.NOT_STARTED,
    )
    certification_profile_ref = models.CharField(max_length=180, blank=True)
    certified_at = models.DateTimeField(blank=True, null=True)
    certified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="certified_payroll_provider_connections",
        blank=True,
        null=True,
    )
    last_tested_at = models.DateTimeField(blank=True, null=True)
    last_tested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="tested_payroll_provider_connections",
        blank=True,
        null=True,
    )
    readiness_snapshot = models.JSONField(default=dict, blank=True)
    certification_snapshot = models.JSONField(default=dict, blank=True)
    config_snapshot = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_payroll_provider_connections",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_payroll_provider_connections",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["provider_kind", "provider_name", "provider_ref"]
        unique_together = [("tenant", "provider_ref")]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "provider_kind"]),
            models.Index(fields=["tenant", "certification_status"]),
        ]
        verbose_name = "Payroll Provider Connection"
        verbose_name_plural = "Payroll Provider Connections"

    def clean(self):
        errors = {}
        for field_name in ("config_snapshot", "readiness_snapshot", "certification_snapshot"):
            value = getattr(self, field_name)
            if isinstance(value, dict):
                try:
                    validate_payroll_provider_route_config(value)
                except PayrollProviderAdapterError as exc:
                    errors[field_name] = str(exc)
        if self.credential_required and not self.credential_ref:
            errors["credential_ref"] = "Credential-required provider connections must use a credential_ref."
        if self.status == PayrollProviderConnectionStatus.ACTIVE:
            required_refs = {
                "adapter_ref": self.adapter_ref,
                "channel_ref": self.channel_ref,
                "callback_profile_ref": self.callback_profile_ref,
                "callback_verification_ref": self.callback_verification_ref,
                "retry_policy_ref": self.retry_policy_ref,
            }
            missing = [field_name for field_name, value in required_refs.items() if not str(value or "").strip()]
            if missing:
                errors["status"] = f"Active provider connections require {', '.join(missing)}."
            if self.certification_status != PayrollProviderCertificationStatus.PASSED:
                errors["certification_status"] = "Active provider connections require passed certification."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.provider_ref = str(self.provider_ref or "").strip()
        self.provider_name = str(self.provider_name or "").strip()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.provider_name}:{self.provider_ref}:{self.status}"
