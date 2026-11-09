from django.utils import timezone
from django import forms
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


class EmployeeShiftAssignmentAdminForm(forms.ModelForm):
    class Meta:
        model = EmployeeShiftAssignment
        fields = "__all__"

    def clean(self):
        from apps.attendance.services import (
            lock_employee_shift_assignment_scope,
            preview_employee_shift_assignment_conflicts,
        )
        data = super().clean()
        tenant, employee, shift = (data.get(key) for key in ("tenant", "employee", "shift"))
        if not tenant or not employee or not shift or not data.get("effective_from"):
            return data
        if employee.tenant_id != tenant.id or shift.tenant_id != tenant.id:
            raise forms.ValidationError("Employee and shift must belong to the selected organization.")
        # Django's POST changeform_view holds an atomic transaction through save.
        # Match API lock order: existing assignment, then UUID-ordered parents.
        original = EmployeeShiftAssignment.objects.select_for_update().filter(pk=self.instance.pk).first()
        lock_employee_shift_assignment_scope(
            tenant=tenant, employee_ids=[employee.id, original.employee_id if original else None],
        )
        if original and (original.cancelled_at or original.lifecycle_snapshot or original.effective_from <= timezone.localdate()):
            raise forms.ValidationError("Historical and lifecycle-controlled assignments must be preserved. Use the HR assignment lifecycle workspace.")
        if data.get("effective_to") and data["effective_to"] < data["effective_from"]:
            self.add_error("effective_to", "Effective to must be on or after Effective from.")
            return data
        coverage = {"employee", "shift", "effective_from", "effective_to", "is_primary", "assignment_kind", "tenant"}
        # Preserve legacy exceptions when an edit does not alter coverage.
        if not original or coverage.intersection(self.changed_data):
            check = preview_employee_shift_assignment_conflicts(
                tenant=tenant, employee=employee, shift=shift,
                effective_from=data["effective_from"], effective_to=data.get("effective_to"),
                is_primary=data.get("is_primary", True), assignment_kind=data.get("assignment_kind", "fixed"),
                item_id=str(original.id) if original else None,
            )
            if check["has_blocking_conflict"]:
                raise forms.ValidationError(check["summary"])
        return data


@admin.register(EmployeeShiftAssignment)
class EmployeeShiftAssignmentAdmin(admin.ModelAdmin):
    form = EmployeeShiftAssignmentAdminForm
    readonly_fields = ("cancelled_at", "lifecycle_snapshot")

    def has_delete_permission(self, request, obj=None):
        return False
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
