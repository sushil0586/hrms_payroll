"""Leave configuration, balances, and request models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.employees.models import Employee
from apps.organizations.models import Branch, Department, EmploymentType, Grade, LegalEntity
from apps.platform_policies.models import DelegationMode, PolicySourceKind
from apps.tenants.models import Tenant


class LeaveUnit(models.TextChoices):
    DAY = "day", "Day"
    HOUR = "hour", "Hour"


class LeaveCategory(models.TextChoices):
    PAID = "paid", "Paid"
    UNPAID = "unpaid", "Unpaid"
    SICK = "sick", "Sick"
    VACATION = "vacation", "Vacation"
    COMPENSATORY = "compensatory", "Compensatory"
    MATERNITY = "maternity", "Maternity"
    PATERNITY = "paternity", "Paternity"
    SPECIAL = "special", "Special"


class AccrualFrequency(models.TextChoices):
    NONE = "none", "None"
    MONTHLY = "monthly", "Monthly"
    QUARTERLY = "quarterly", "Quarterly"
    YEARLY = "yearly", "Yearly"


class LeavePolicyStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class LeaveRequestStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    PARTIALLY_APPROVED = "partially_approved", "Partially Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"
    WITHDRAWN = "withdrawn", "Withdrawn"


class LeaveDayPortion(models.TextChoices):
    FULL_DAY = "full_day", "Full Day"
    FIRST_HALF = "first_half", "First Half"
    SECOND_HALF = "second_half", "Second Half"


class LeaveType(UUIDPrimaryKeyModel, TimeStampedModel):
    """Configurable leave type master for a tenant."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_types",
    )
    code = models.SlugField(max_length=50)
    name = models.CharField(max_length=255)
    short_code = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=20, choices=LeaveCategory.choices, default=LeaveCategory.PAID)
    unit = models.CharField(max_length=10, choices=LeaveUnit.choices, default=LeaveUnit.DAY)
    color_code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_system_seeded = models.BooleanField(default=False)
    requires_attachment = models.BooleanField(default=False)
    allow_negative_balance = models.BooleanField(default=False)
    is_approval_required = models.BooleanField(default=True)
    source_kind = models.CharField(max_length=30, choices=PolicySourceKind.choices, default=PolicySourceKind.TENANT_NATIVE)
    source_pack_code = models.CharField(max_length=80, blank=True)
    source_item_key = models.CharField(max_length=120, blank=True)
    source_version = models.PositiveIntegerField(default=1)
    delegation_mode = models.CharField(max_length=40, choices=DelegationMode.choices, blank=True)
    managed_by_platform = models.BooleanField(default=False)
    platform_locked_fields = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Leave Type"
        verbose_name_plural = "Leave Types"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class LeavePolicy(UUIDPrimaryKeyModel, TimeStampedModel):
    """Policy definition for how a leave type behaves."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_policies",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name="policies",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=LeavePolicyStatus.choices, default=LeavePolicyStatus.DRAFT)
    effective_from = models.DateField(blank=True, null=True)
    effective_to = models.DateField(blank=True, null=True)
    accrual_frequency = models.CharField(max_length=20, choices=AccrualFrequency.choices, default=AccrualFrequency.NONE)
    annual_entitlement = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_carry_forward = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_consecutive_days = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    min_days_per_request = models.DecimalField(max_digits=8, decimal_places=2, default=0.5)
    notice_days_required = models.PositiveIntegerField(default=0)
    allow_half_day = models.BooleanField(default=False)
    allow_backdated_application = models.BooleanField(default=False)
    allow_weekend_holiday_overlap = models.BooleanField(default=False)
    sandwich_rule_enabled = models.BooleanField(default=False)
    is_probation_eligible = models.BooleanField(default=True)
    gender_restriction = models.CharField(max_length=30, blank=True)
    marital_status_restriction = models.CharField(max_length=30, blank=True)
    minimum_service_days = models.PositiveIntegerField(default=0)
    config_snapshot = models.JSONField(default=dict, blank=True)
    source_kind = models.CharField(max_length=30, choices=PolicySourceKind.choices, default=PolicySourceKind.TENANT_NATIVE)
    source_pack_code = models.CharField(max_length=80, blank=True)
    source_item_key = models.CharField(max_length=120, blank=True)
    source_version = models.PositiveIntegerField(default=1)
    delegation_mode = models.CharField(max_length=40, choices=DelegationMode.choices, blank=True)
    managed_by_platform = models.BooleanField(default=False)
    platform_locked_fields = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Leave Policy"
        verbose_name_plural = "Leave Policies"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class LeavePolicyAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assigns a leave policy to scoped organization segments."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
    )
    leave_policy = models.ForeignKey(
        LeavePolicy,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_policy_assignments",
        blank=True,
        null=True,
    )
    priority = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Leave Policy Assignment"
        verbose_name_plural = "Leave Policy Assignments"

    def __str__(self) -> str:
        return f"{self.leave_policy} -> {self.tenant.code}"


class LeaveBalance(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks employee leave balance by policy and period."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_policy = models.ForeignKey(
        LeavePolicy,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    period_year = models.PositiveIntegerField()
    opening_balance = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    accrued_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    consumed_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    reserved_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    carry_forward_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    encashed_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    adjustment_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ["employee", "period_year", "leave_policy"]
        unique_together = [("employee", "leave_policy", "period_year")]
        verbose_name = "Leave Balance"
        verbose_name_plural = "Leave Balances"

    def __str__(self) -> str:
        return f"{self.employee} - {self.leave_policy.name} - {self.period_year}"


class LeaveBalanceTransaction(UUIDPrimaryKeyModel, TimeStampedModel):
    """Audit ledger for leave balance mutations."""

    class ActionType(models.TextChoices):
        CREDIT_ADJUSTMENT = "credit_adjustment", "Credit Adjustment"
        DEBIT_ADJUSTMENT = "debit_adjustment", "Debit Adjustment"
        ENCASHMENT = "encashment", "Encashment"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPLIED = "applied", "Applied"
        REJECTED = "rejected", "Rejected"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_balance_transactions",
    )
    leave_balance = models.ForeignKey(
        LeaveBalance,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_balance_transactions",
    )
    leave_policy = models.ForeignKey(
        LeavePolicy,
        on_delete=models.CASCADE,
        related_name="leave_balance_transactions",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    action = models.CharField(max_length=30, choices=ActionType.choices)
    units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    effective_date = models.DateField()
    reason = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="performed_leave_balance_transactions",
        blank=True,
        null=True,
    )
    reviewed_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="reviewed_leave_balance_transactions",
        blank=True,
        null=True,
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True)
    closing_balance_before = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    closing_balance_after = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Leave Balance Transaction"
        verbose_name_plural = "Leave Balance Transactions"

    def __str__(self) -> str:
        return f"{self.leave_balance} - {self.action} - {self.units}"


class LeaveRequest(UUIDPrimaryKeyModel, TimeStampedModel):
    """Employee leave request with workflow-ready approval fields."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_policy = models.ForeignKey(
        LeavePolicy,
        on_delete=models.SET_NULL,
        related_name="leave_requests",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=30, choices=LeaveRequestStatus.choices, default=LeaveRequestStatus.DRAFT)
    start_date = models.DateField()
    end_date = models.DateField()
    start_day_portion = models.CharField(max_length=20, choices=LeaveDayPortion.choices, default=LeaveDayPortion.FULL_DAY)
    end_day_portion = models.CharField(max_length=20, choices=LeaveDayPortion.choices, default=LeaveDayPortion.FULL_DAY)
    requested_units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    approved_units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    reason = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    manager_comment = models.TextField(blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    applied_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Leave Request"
        verbose_name_plural = "Leave Requests"

    def __str__(self) -> str:
        return f"{self.employee} - {self.leave_type.name} - {self.start_date}"
