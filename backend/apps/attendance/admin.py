from django.contrib import admin

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendanceRecord,
    AttendanceRegularization,
    EmployeeShiftAssignment,
    Holiday,
    HolidayCalendar,
    Shift,
    ShiftRosterRollout,
    ShiftRosterRolloutItem,
    ShiftRosterTemplate,
)


class AttendancePolicyAssignmentInline(admin.TabularInline):
    model = AttendancePolicyAssignment
    extra = 0


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "start_time", "end_time", "is_night_shift", "is_flexible", "is_active")
    list_filter = ("is_night_shift", "is_flexible", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")


class HolidayInline(admin.TabularInline):
    model = Holiday
    extra = 0


@admin.register(HolidayCalendar)
class HolidayCalendarAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "year", "legal_entity", "branch", "location", "is_active")
    list_filter = ("year", "is_active", "tenant")
    search_fields = ("name", "code", "tenant__name")
    inlines = [HolidayInline]


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "calendar", "date", "is_optional")
    list_filter = ("is_optional", "calendar__year")
    search_fields = ("name", "calendar__name")


@admin.register(AttendancePolicy)
class AttendancePolicyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "tenant",
        "status",
        "attendance_unit",
        "default_shift",
        "holiday_calendar",
        "allow_mobile_checkin",
        "allow_regularization",
    )
    list_filter = ("status", "attendance_unit", "allow_mobile_checkin", "allow_regularization", "tenant")
    search_fields = ("name", "code", "tenant__name")
    inlines = [AttendancePolicyAssignmentInline]


@admin.register(AttendancePolicyAssignment)
class AttendancePolicyAssignmentAdmin(admin.ModelAdmin):
    list_display = ("attendance_policy", "tenant", "priority", "legal_entity", "branch", "department", "employee", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("attendance_policy__name", "tenant__name", "employee__employee_code")


@admin.register(EmployeeShiftAssignment)
class EmployeeShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "shift", "effective_from", "effective_to", "is_primary")
    list_filter = ("is_primary", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "shift__name")


@admin.register(ShiftRosterTemplate)
class ShiftRosterTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "status", "shift", "assignment_kind")
    list_filter = ("status", "assignment_kind", "tenant")
    search_fields = ("name", "code", "tenant__name", "shift__name")


class ShiftRosterRolloutItemInline(admin.TabularInline):
    model = ShiftRosterRolloutItem
    extra = 0


@admin.register(ShiftRosterRollout)
class ShiftRosterRolloutAdmin(admin.ModelAdmin):
    list_display = ("template", "tenant", "status", "effective_from", "effective_to", "created_count", "skipped_count", "created_at")
    list_filter = ("status", "tenant", "template__assignment_kind")
    search_fields = ("template__name", "template__code", "initiated_by__employee_code")
    inlines = [ShiftRosterRolloutItemInline]


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "attendance_date", "status", "source", "shift", "work_duration_hours", "late_minutes", "is_regularized")
    list_filter = ("status", "source", "tenant", "is_regularized")
    search_fields = ("employee__employee_code", "employee__first_name")


@admin.register(AttendanceRegularization)
class AttendanceRegularizationAdmin(admin.ModelAdmin):
    list_display = ("employee", "attendance_record", "status", "requested_status", "applied_at", "resolved_at")
    list_filter = ("status", "tenant", "requested_status")
    search_fields = ("employee__employee_code", "employee__first_name", "workflow_reference")
