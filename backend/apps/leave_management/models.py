"""Leave configuration, balances, and request models."""

from django.conf import settings
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


class LeavePolicyPeriodStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"
    LOCKED = "locked", "Locked"


class LeavePolicyPeriodAction(models.TextChoices):
    CLOSE = "close", "Close"
    REOPEN = "reopen", "Reopen"
    LOCK = "lock", "Lock"


class LeaveYearCloseRunStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"


class LeaveYearCloseItemStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"


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
    effective_from = models.DateField(blank=True, null=True)
    effective_to = models.DateField(blank=True, null=True)
    resolution_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Leave Policy Assignment"
        verbose_name_plural = "Leave Policy Assignments"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(effective_to__isnull=True) | models.Q(effective_from__isnull=True) | models.Q(effective_to__gte=models.F("effective_from")),
                name="leave_policy_assignment_dates_ordered",
            )
        ]

    def __str__(self) -> str:
        return f"{self.leave_policy} -> {self.tenant.code}"


class LeavePolicyPeriod(UUIDPrimaryKeyModel, TimeStampedModel):
    """Persisted leave-year boundary for one effective policy scope."""

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_policy_periods")
    leave_policy = models.ForeignKey(LeavePolicy, on_delete=models.PROTECT, related_name="periods")
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.PROTECT,
        related_name="leave_policy_periods",
        blank=True,
        null=True,
    )
    code = models.CharField(max_length=60)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=LeavePolicyPeriodStatus.choices,
        default=LeavePolicyPeriodStatus.PLANNED,
    )
    policy_snapshot = models.JSONField(default=dict, blank=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    closed_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="closed_leave_policy_periods",
        blank=True,
        null=True,
    )
    reopened_at = models.DateTimeField(blank=True, null=True)
    reopened_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="reopened_leave_policy_periods",
        blank=True,
        null=True,
    )
    reopen_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["leave_policy", "start_date", "legal_entity"]
        constraints = [
            models.UniqueConstraint(
                fields=["leave_policy", "legal_entity", "code"],
                name="uniq_leave_policy_period_scope_code",
            ),
        ]


class LeaveYearCloseRun(UUIDPrimaryKeyModel, TimeStampedModel):
    """Durable, resumable and tenant-scoped leave-year rollover command."""

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_year_close_runs")
    leave_policy = models.ForeignKey(LeavePolicy, on_delete=models.PROTECT, related_name="year_close_runs")
    source_period = models.ForeignKey(
        LeavePolicyPeriod,
        on_delete=models.PROTECT,
        related_name="source_close_runs",
    )
    target_period = models.ForeignKey(
        LeavePolicyPeriod,
        on_delete=models.PROTECT,
        related_name="target_close_runs",
    )
    status = models.CharField(
        max_length=20,
        choices=LeaveYearCloseRunStatus.choices,
        default=LeaveYearCloseRunStatus.QUEUED,
    )
    idempotency_key = models.CharField(max_length=160)
    requested_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="requested_leave_year_close_runs",
        blank=True,
        null=True,
    )
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    dispatched_at = models.DateTimeField(blank=True, null=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    processed_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    request_snapshot = models.JSONField(default=dict, blank=True)
    result_snapshot = models.JSONField(default=dict, blank=True)
    error_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "idempotency_key"], name="uniq_leave_year_close_command"),
        ]


class LeavePolicyPeriodStatusEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_policy_period_status_events")
    policy_period = models.ForeignKey(LeavePolicyPeriod, on_delete=models.PROTECT, related_name="status_events")
    action = models.CharField(max_length=20, choices=LeavePolicyPeriodAction.choices)
    previous_status = models.CharField(max_length=20, choices=LeavePolicyPeriodStatus.choices)
    next_status = models.CharField(max_length=20, choices=LeavePolicyPeriodStatus.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="leave_policy_period_status_events",
    )
    reason = models.TextField()
    idempotency_key = models.CharField(max_length=160)
    authorization_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "idempotency_key"],
                name="uniq_leave_period_status_command",
            ),
        ]


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
    policy_period = models.ForeignKey(
        LeavePolicyPeriod,
        on_delete=models.PROTECT,
        related_name="leave_balances",
        blank=True,
        null=True,
    )
    period_year = models.PositiveIntegerField()
    opening_balance = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    accrued_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    consumed_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    reserved_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    carry_forward_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    encashed_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    adjustment_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    expired_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    forfeited_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    ledger_version = models.PositiveIntegerField(default=0)
    ledger_checksum = models.CharField(max_length=64, blank=True)

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
        OPENING = "opening", "Opening"
        ACCRUAL = "accrual", "Accrual"
        RESERVATION = "reservation", "Reservation"
        RESERVATION_RELEASE = "reservation_release", "Reservation Release"
        CONSUMPTION = "consumption", "Consumption"
        CONSUMPTION_REVERSAL = "consumption_reversal", "Consumption Reversal"
        CREDIT_ADJUSTMENT = "credit_adjustment", "Credit Adjustment"
        DEBIT_ADJUSTMENT = "debit_adjustment", "Debit Adjustment"
        CARRY_FORWARD = "carry_forward", "Carry Forward"
        EXPIRY = "expiry", "Expiry"
        FORFEITURE = "forfeiture", "Forfeiture"
        ENCASHMENT = "encashment", "Encashment"
        ENCASHMENT_REVERSAL = "encashment_reversal", "Encashment Reversal"
        CORRECTION = "correction", "Correction"

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
    policy_period = models.ForeignKey(
        LeavePolicyPeriod,
        on_delete=models.PROTECT,
        related_name="transactions",
        blank=True,
        null=True,
    )
    close_run = models.ForeignKey(
        LeaveYearCloseRun,
        on_delete=models.PROTECT,
        related_name="transactions",
        blank=True,
        null=True,
    )
    leave_request = models.ForeignKey(
        "LeaveRequest",
        on_delete=models.PROTECT,
        related_name="balance_transactions",
        blank=True,
        null=True,
    )
    source_transaction = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="compensating_transactions",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    action = models.CharField(max_length=30, choices=ActionType.choices)
    units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    delta_units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    idempotency_key = models.CharField(max_length=180, blank=True, null=True)
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
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "idempotency_key"],
                condition=models.Q(idempotency_key__isnull=False),
                name="uniq_leave_ledger_command",
            ),
        ]

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


class LeaveYearCloseItem(UUIDPrimaryKeyModel, TimeStampedModel):
    close_run = models.ForeignKey(LeaveYearCloseRun, on_delete=models.PROTECT, related_name="items")
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_year_close_items")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="leave_year_close_items")
    source_balance = models.ForeignKey(
        LeaveBalance,
        on_delete=models.PROTECT,
        related_name="source_close_items",
    )
    target_balance = models.ForeignKey(
        LeaveBalance,
        on_delete=models.PROTECT,
        related_name="target_close_items",
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=20,
        choices=LeaveYearCloseItemStatus.choices,
        default=LeaveYearCloseItemStatus.PENDING,
    )
    carry_forward_units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    forfeited_units = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    result_snapshot = models.JSONField(default=dict, blank=True)
    error_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["close_run", "employee"], name="uniq_leave_close_employee"),
        ]


class LeaveEntitlementLot(UUIDPrimaryKeyModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_entitlement_lots")
    leave_balance = models.ForeignKey(LeaveBalance, on_delete=models.PROTECT, related_name="entitlement_lots")
    policy_period = models.ForeignKey(LeavePolicyPeriod, on_delete=models.PROTECT, related_name="entitlement_lots")
    source_transaction = models.ForeignKey(
        LeaveBalanceTransaction,
        on_delete=models.PROTECT,
        related_name="entitlement_lots",
    )
    granted_units = models.DecimalField(max_digits=8, decimal_places=2)
    remaining_units = models.DecimalField(max_digits=8, decimal_places=2)
    effective_date = models.DateField()
    expiry_date = models.DateField(blank=True, null=True)
    priority = models.PositiveIntegerField(default=100)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["expiry_date", "effective_date", "priority", "created_at"]


class LeaveRequestAllocation(UUIDPrimaryKeyModel, TimeStampedModel):
    class Status(models.TextChoices):
        RESERVED = "reserved", "Reserved"
        CONSUMED = "consumed", "Consumed"
        RELEASED = "released", "Released"
        REVERSED = "reversed", "Reversed"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="leave_request_allocations")
    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.PROTECT, related_name="allocations")
    leave_balance = models.ForeignKey(LeaveBalance, on_delete=models.PROTECT, related_name="request_allocations")
    policy_period = models.ForeignKey(LeavePolicyPeriod, on_delete=models.PROTECT, related_name="request_allocations")
    entitlement_lot = models.ForeignKey(
        LeaveEntitlementLot,
        on_delete=models.PROTECT,
        related_name="request_allocations",
        blank=True,
        null=True,
    )
    allocation_date = models.DateField()
    units = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RESERVED)
    idempotency_key = models.CharField(max_length=180)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["allocation_date", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "idempotency_key"], name="uniq_leave_request_allocation_command"),
        ]
