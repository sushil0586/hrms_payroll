"""Attendance policies, shifts, records, and regularization."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.employees.models import Employee
from apps.organizations.models import Branch, Department, EmploymentType, Grade, LegalEntity, Location
from apps.platform_policies.models import DelegationMode, PolicySourceKind
from apps.tenants.models import Tenant


class AttendanceUnit(models.TextChoices):
    DAY = "day", "Day"
    HOUR = "hour", "Hour"


class AttendancePolicyStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    HALF_DAY = "half_day", "Half Day"
    WEEKLY_OFF = "weekly_off", "Weekly Off"
    HOLIDAY = "holiday", "Holiday"
    ON_LEAVE = "on_leave", "On Leave"
    LATE = "late", "Late"
    REMOTE = "remote", "Remote"
    UNKNOWN = "unknown", "Unknown"


class AttendanceSource(models.TextChoices):
    MANUAL = "manual", "Manual"
    WEB = "web", "Web"
    MOBILE = "mobile", "Mobile"
    BIOMETRIC = "biometric", "Biometric"
    IMPORT = "import", "Import"
    API = "api", "API"
    SYSTEM = "system", "System"


class RegularizationStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"


class HolidayType(models.TextChoices):
    GENERAL = "general", "General Holiday"
    COMPULSORY = "compulsory", "Compulsory Holiday"
    RESTRICTED = "restricted", "Restricted Holiday"


class EmployeeShiftAssignmentKind(models.TextChoices):
    FIXED = "fixed", "Fixed"
    WEEKLY_ROTATION = "weekly_rotation", "Weekly Rotation"
    TEMPORARY_OVERRIDE = "temporary_override", "Temporary Override"


class ShiftRosterTemplateStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    LOCKED = "locked", "Locked"


class Shift(UUIDPrimaryKeyModel, TimeStampedModel):
    """Configurable shift definition."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="shifts",
    )
    code = models.SlugField(max_length=50)
    name = models.CharField(max_length=255)
    start_time = models.TimeField()
    end_time = models.TimeField()
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    break_minutes = models.PositiveIntegerField(default=0)
    grace_in_minutes = models.PositiveIntegerField(default=0)
    grace_out_minutes = models.PositiveIntegerField(default=0)
    is_night_shift = models.BooleanField(default=False)
    is_flexible = models.BooleanField(default=False)
    weekly_off_days = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
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
        verbose_name = "Shift"
        verbose_name_plural = "Shifts"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class HolidayCalendar(UUIDPrimaryKeyModel, TimeStampedModel):
    """Holiday calendar that can be scoped by entity, branch, or location."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="holiday_calendars",
    )
    code = models.SlugField(max_length=50)
    name = models.CharField(max_length=255)
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="holiday_calendars",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="holiday_calendars",
        blank=True,
        null=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="holiday_calendars",
        blank=True,
        null=True,
    )
    year = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    source_kind = models.CharField(max_length=30, choices=PolicySourceKind.choices, default=PolicySourceKind.TENANT_NATIVE)
    source_pack_code = models.CharField(max_length=80, blank=True)
    source_item_key = models.CharField(max_length=120, blank=True)
    source_version = models.PositiveIntegerField(default=1)
    delegation_mode = models.CharField(max_length=40, choices=DelegationMode.choices, blank=True)
    managed_by_platform = models.BooleanField(default=False)
    platform_locked_fields = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["name", "year"]
        unique_together = [("tenant", "code", "year")]
        verbose_name = "Holiday Calendar"
        verbose_name_plural = "Holiday Calendars"

    def __str__(self) -> str:
        return f"{self.name} ({self.year})"


class Holiday(UUIDPrimaryKeyModel, TimeStampedModel):
    """Specific holiday under a calendar."""

    calendar = models.ForeignKey(
        HolidayCalendar,
        on_delete=models.CASCADE,
        related_name="holidays",
    )
    date = models.DateField()
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    holiday_type = models.CharField(max_length=20, choices=HolidayType.choices, default=HolidayType.GENERAL)
    is_optional = models.BooleanField(default=False)

    class Meta:
        ordering = ["date"]
        unique_together = [("calendar", "date", "name")]
        verbose_name = "Holiday"
        verbose_name_plural = "Holidays"

    def __str__(self) -> str:
        return f"{self.calendar.name} - {self.date}"


class AttendancePolicy(UUIDPrimaryKeyModel, TimeStampedModel):
    """Policy for attendance calculation and operational rules."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="attendance_policies",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=AttendancePolicyStatus.choices, default=AttendancePolicyStatus.DRAFT)
    attendance_unit = models.CharField(max_length=10, choices=AttendanceUnit.choices, default=AttendanceUnit.DAY)
    default_shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        related_name="attendance_policies",
        blank=True,
        null=True,
    )
    holiday_calendar = models.ForeignKey(
        HolidayCalendar,
        on_delete=models.SET_NULL,
        related_name="attendance_policies",
        blank=True,
        null=True,
    )
    full_day_min_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    half_day_min_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    late_mark_after_minutes = models.PositiveIntegerField(default=0)
    max_late_marks_in_period = models.PositiveIntegerField(default=0)
    overtime_threshold_minutes = models.PositiveIntegerField(default=0)
    allow_manual_entry = models.BooleanField(default=True)
    allow_web_checkin = models.BooleanField(default=True)
    allow_mobile_checkin = models.BooleanField(default=True)
    allow_geofenced_checkin = models.BooleanField(default=False)
    allow_regularization = models.BooleanField(default=True)
    require_regularization_reason = models.BooleanField(default=True)
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
        verbose_name = "Attendance Policy"
        verbose_name_plural = "Attendance Policies"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class AttendancePolicyAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assigns attendance policies to organization scopes or an employee."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
    )
    attendance_policy = models.ForeignKey(
        AttendancePolicy,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_policy_assignments",
        blank=True,
        null=True,
    )
    priority = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Attendance Policy Assignment"
        verbose_name_plural = "Attendance Policy Assignments"

    def __str__(self) -> str:
        return f"{self.attendance_policy} -> {self.tenant.code}"


class EmployeeShiftAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assigns a shift to an employee for a period."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="employee_shift_assignments",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="shift_assignments",
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="employee_assignments",
    )
    assignment_kind = models.CharField(
        max_length=30,
        choices=EmployeeShiftAssignmentKind.choices,
        default=EmployeeShiftAssignmentKind.FIXED,
    )
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    is_primary = models.BooleanField(default=True)
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["employee", "-effective_from"]
        verbose_name = "Employee Shift Assignment"
        verbose_name_plural = "Employee Shift Assignments"

    def __str__(self) -> str:
        return f"{self.employee} - {self.shift.name}"


class ShiftRosterTemplate(UUIDPrimaryKeyModel, TimeStampedModel):
    """Reusable shift pattern that can be rolled out across employees in bulk."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="shift_roster_templates",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ShiftRosterTemplateStatus.choices,
        default=ShiftRosterTemplateStatus.DRAFT,
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="roster_templates",
    )
    assignment_kind = models.CharField(
        max_length=30,
        choices=EmployeeShiftAssignmentKind.choices,
        default=EmployeeShiftAssignmentKind.FIXED,
    )
    config_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("tenant", "code")]
        verbose_name = "Shift Roster Template"
        verbose_name_plural = "Shift Roster Templates"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.name}"


class ShiftRosterRolloutStatus(models.TextChoices):
    COMPLETED = "completed", "Completed"
    PREVIEW = "preview", "Preview"


class ShiftRosterRollout(UUIDPrimaryKeyModel, TimeStampedModel):
    """Audit record for roster-template rollouts."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="shift_roster_rollouts",
    )
    template = models.ForeignKey(
        ShiftRosterTemplate,
        on_delete=models.CASCADE,
        related_name="rollouts",
    )
    initiated_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="initiated_shift_roster_rollouts",
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=20,
        choices=ShiftRosterRolloutStatus.choices,
        default=ShiftRosterRolloutStatus.COMPLETED,
    )
    scope_snapshot = models.JSONField(default=dict, blank=True)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    is_primary = models.BooleanField(default=True)
    target_count = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    summary = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Shift Roster Rollout"
        verbose_name_plural = "Shift Roster Rollouts"

    def __str__(self) -> str:
        return f"{self.template.name} rollout @ {self.created_at:%Y-%m-%d %H:%M}"


class ShiftRosterRolloutItem(UUIDPrimaryKeyModel, TimeStampedModel):
    """Per-employee result for a shift roster rollout."""

    rollout = models.ForeignKey(
        ShiftRosterRollout,
        on_delete=models.CASCADE,
        related_name="items",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="shift_roster_rollout_items",
        blank=True,
        null=True,
    )
    assignment = models.ForeignKey(
        EmployeeShiftAssignment,
        on_delete=models.SET_NULL,
        related_name="roster_rollout_items",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["employee__employee_code", "created_at"]
        verbose_name = "Shift Roster Rollout Item"
        verbose_name_plural = "Shift Roster Rollout Items"

    def __str__(self) -> str:
        return f"{self.rollout.template.name} -> {self.employee or 'unknown'}"


class AttendanceRecord(UUIDPrimaryKeyModel, TimeStampedModel):
    """Daily attendance record for an employee."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    attendance_date = models.DateField()
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.UNKNOWN)
    source = models.CharField(max_length=20, choices=AttendanceSource.choices, default=AttendanceSource.SYSTEM)
    shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        related_name="attendance_records",
        blank=True,
        null=True,
    )
    holiday = models.ForeignKey(
        Holiday,
        on_delete=models.SET_NULL,
        related_name="attendance_records",
        blank=True,
        null=True,
    )
    check_in_at = models.DateTimeField(blank=True, null=True)
    check_out_at = models.DateTimeField(blank=True, null=True)
    work_duration_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    late_minutes = models.PositiveIntegerField(default=0)
    early_exit_minutes = models.PositiveIntegerField(default=0)
    is_regularized = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    geo_metadata = models.JSONField(default=dict, blank=True)
    source_payload = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-attendance_date", "employee"]
        unique_together = [("employee", "attendance_date")]
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"

    def __str__(self) -> str:
        return f"{self.employee} - {self.attendance_date}"


class AttendanceRegularization(UUIDPrimaryKeyModel, TimeStampedModel):
    """Employee request to correct or justify attendance."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="attendance_regularizations",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_regularizations",
    )
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="regularization_requests",
    )
    status = models.CharField(max_length=20, choices=RegularizationStatus.choices, default=RegularizationStatus.DRAFT)
    requested_status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    requested_check_in_at = models.DateTimeField(blank=True, null=True)
    requested_check_out_at = models.DateTimeField(blank=True, null=True)
    reason = models.TextField(blank=True)
    manager_comment = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    workflow_reference = models.CharField(max_length=120, blank=True)
    applied_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    evidence_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Attendance Regularization"
        verbose_name_plural = "Attendance Regularizations"

    def __str__(self) -> str:
        return f"{self.employee} - {self.attendance_record.attendance_date}"
