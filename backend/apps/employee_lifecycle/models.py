"""Employee lifecycle models covering onboarding through exit."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.employees.models import Employee
from apps.organizations.models import (
    Branch,
    BusinessUnit,
    Department,
    Designation,
    EmploymentType,
    Grade,
    LegalEntity,
    Location,
)
from apps.tenants.models import Tenant


class LifecycleEventType(models.TextChoices):
    ONBOARDING = "onboarding", "Onboarding"
    PROBATION = "probation", "Probation"
    CONFIRMATION = "confirmation", "Confirmation"
    TRANSFER = "transfer", "Transfer"
    PROMOTION = "promotion", "Promotion"
    DESIGNATION_CHANGE = "designation_change", "Designation Change"
    REPORTING_CHANGE = "reporting_change", "Reporting Change"
    EMPLOYMENT_TYPE_CHANGE = "employment_type_change", "Employment Type Change"
    EXIT = "exit", "Exit"
    REHIRE = "rehire", "Rehire"
    OTHER = "other", "Other"


class LifecycleEventStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class OnboardingStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    BLOCKED = "blocked", "Blocked"
    CANCELLED = "cancelled", "Cancelled"


class ProbationDecision(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRM = "confirm", "Confirm"
    EXTEND = "extend", "Extend"
    SEPARATE = "separate", "Separate"


class ExitStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    CLEARANCE_IN_PROGRESS = "clearance_in_progress", "Clearance In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class MovementType(models.TextChoices):
    TRANSFER = "transfer", "Transfer"
    PROMOTION = "promotion", "Promotion"
    DESIGNATION_CHANGE = "designation_change", "Designation Change"
    REPORTING_CHANGE = "reporting_change", "Reporting Change"
    GRADE_CHANGE = "grade_change", "Grade Change"
    EMPLOYMENT_TYPE_CHANGE = "employment_type_change", "Employment Type Change"
    LOCATION_CHANGE = "location_change", "Location Change"
    OTHER = "other", "Other"


class EmployeeLifecycleEvent(UUIDPrimaryKeyModel, TimeStampedModel):
    """Generic lifecycle event ledger for auditability and future workflows."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="lifecycle_events",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="lifecycle_events",
    )
    event_type = models.CharField(max_length=40, choices=LifecycleEventType.choices)
    status = models.CharField(
        max_length=20,
        choices=LifecycleEventStatus.choices,
        default=LifecycleEventStatus.DRAFT,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    effective_date = models.DateField(blank=True, null=True)
    initiated_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Employee Lifecycle Event"
        verbose_name_plural = "Employee Lifecycle Events"

    def __str__(self) -> str:
        return f"{self.employee} - {self.event_type}"


class EmployeeOnboarding(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks pre-joining and onboarding execution."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employee_onboardings",
    )
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name="onboarding_record",
    )
    status = models.CharField(
        max_length=20,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.NOT_STARTED,
    )
    expected_joining_date = models.DateField(blank=True, null=True)
    actual_joining_date = models.DateField(blank=True, null=True)
    onboarding_template_code = models.CharField(max_length=80, blank=True)
    preboarding_started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    assigned_owner_identifier = models.CharField(max_length=120, blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    checklist_snapshot = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Employee Onboarding"
        verbose_name_plural = "Employee Onboardings"

    def __str__(self) -> str:
        return f"Onboarding - {self.employee}"


class ProbationReview(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks probation review cycles and outcomes."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="probation_reviews",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="probation_reviews",
    )
    review_date = models.DateField()
    probation_end_date = models.DateField(blank=True, null=True)
    decision = models.CharField(
        max_length=20,
        choices=ProbationDecision.choices,
        default=ProbationDecision.PENDING,
    )
    extension_end_date = models.DateField(blank=True, null=True)
    reviewer_identifier = models.CharField(max_length=120, blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-review_date", "-created_at"]
        verbose_name = "Probation Review"
        verbose_name_plural = "Probation Reviews"

    def __str__(self) -> str:
        return f"Probation Review - {self.employee} - {self.review_date}"


class EmployeeMovement(UUIDPrimaryKeyModel, TimeStampedModel):
    """Captures organization and role changes such as transfer and promotion."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employee_movements",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    status = models.CharField(
        max_length=20,
        choices=LifecycleEventStatus.choices,
        default=LifecycleEventStatus.DRAFT,
    )
    effective_date = models.DateField()
    reason = models.TextField(blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    current_snapshot = models.JSONField(default=dict, blank=True)

    from_legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.SET_NULL,
        related_name="movement_from_legal_entities",
        blank=True,
        null=True,
    )
    to_legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.SET_NULL,
        related_name="movement_to_legal_entities",
        blank=True,
        null=True,
    )
    from_branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="movement_from_branches",
        blank=True,
        null=True,
    )
    to_branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="movement_to_branches",
        blank=True,
        null=True,
    )
    from_location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        related_name="movement_from_locations",
        blank=True,
        null=True,
    )
    to_location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        related_name="movement_to_locations",
        blank=True,
        null=True,
    )
    from_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        related_name="movement_from_departments",
        blank=True,
        null=True,
    )
    to_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        related_name="movement_to_departments",
        blank=True,
        null=True,
    )
    from_business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        related_name="movement_from_business_units",
        blank=True,
        null=True,
    )
    to_business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        related_name="movement_to_business_units",
        blank=True,
        null=True,
    )
    from_designation = models.ForeignKey(
        Designation,
        on_delete=models.SET_NULL,
        related_name="movement_from_designations",
        blank=True,
        null=True,
    )
    to_designation = models.ForeignKey(
        Designation,
        on_delete=models.SET_NULL,
        related_name="movement_to_designations",
        blank=True,
        null=True,
    )
    from_grade = models.ForeignKey(
        Grade,
        on_delete=models.SET_NULL,
        related_name="movement_from_grades",
        blank=True,
        null=True,
    )
    to_grade = models.ForeignKey(
        Grade,
        on_delete=models.SET_NULL,
        related_name="movement_to_grades",
        blank=True,
        null=True,
    )
    from_employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.SET_NULL,
        related_name="movement_from_employment_types",
        blank=True,
        null=True,
    )
    to_employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.SET_NULL,
        related_name="movement_to_employment_types",
        blank=True,
        null=True,
    )
    from_manager = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="movement_from_manager_set",
        blank=True,
        null=True,
    )
    to_manager = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="movement_to_manager_set",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-effective_date", "-created_at"]
        verbose_name = "Employee Movement"
        verbose_name_plural = "Employee Movements"

    def __str__(self) -> str:
        return f"{self.employee} - {self.movement_type}"


class EmployeeExit(UUIDPrimaryKeyModel, TimeStampedModel):
    """Tracks employee exits, notice, and clearance progress."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employee_exits",
    )
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name="exit_record",
    )
    status = models.CharField(
        max_length=30,
        choices=ExitStatus.choices,
        default=ExitStatus.DRAFT,
    )
    resignation_date = models.DateField(blank=True, null=True)
    notice_start_date = models.DateField(blank=True, null=True)
    notice_end_date = models.DateField(blank=True, null=True)
    proposed_last_working_date = models.DateField(blank=True, null=True)
    approved_last_working_date = models.DateField(blank=True, null=True)
    actual_exit_date = models.DateField(blank=True, null=True)
    exit_reason = models.CharField(max_length=120, blank=True)
    exit_reason_detail = models.TextField(blank=True)
    is_regrettable = models.BooleanField(default=False)
    rehire_eligible = models.BooleanField(default=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    clearance_status_snapshot = models.JSONField(default=dict, blank=True)
    handover_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Employee Exit"
        verbose_name_plural = "Employee Exits"

    def __str__(self) -> str:
        return f"Exit - {self.employee}"
