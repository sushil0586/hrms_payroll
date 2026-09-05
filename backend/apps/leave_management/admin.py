from django.contrib import admin

from apps.leave_management.models import (
    LeaveBalance,
    LeaveBalanceTransaction,
    LeavePolicy,
    LeavePolicyAssignment,
    LeaveRequest,
    LeaveType,
)


class LeavePolicyAssignmentInline(admin.TabularInline):
    model = LeavePolicyAssignment
    extra = 0


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "category", "unit", "is_active", "is_system_seeded")
    list_filter = ("category", "unit", "is_active", "is_system_seeded", "tenant")
    search_fields = ("name", "code", "short_code", "tenant__name")


@admin.register(LeavePolicy)
class LeavePolicyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "tenant",
        "leave_type",
        "status",
        "accrual_frequency",
        "annual_entitlement",
        "effective_from",
    )
    list_filter = ("status", "accrual_frequency", "leave_type", "tenant")
    search_fields = ("name", "code", "leave_type__name", "tenant__name")
    inlines = [LeavePolicyAssignmentInline]


@admin.register(LeavePolicyAssignment)
class LeavePolicyAssignmentAdmin(admin.ModelAdmin):
    list_display = ("leave_policy", "tenant", "priority", "legal_entity", "branch", "department", "employee", "is_active")
    list_filter = ("is_active", "tenant")
    search_fields = ("leave_policy__name", "tenant__name", "employee__employee_code")


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_policy", "period_year", "opening_balance", "accrued_amount", "consumed_amount", "closing_balance")
    list_filter = ("period_year", "tenant", "leave_policy")
    search_fields = ("employee__employee_code", "employee__first_name", "leave_policy__name")


@admin.register(LeaveBalanceTransaction)
class LeaveBalanceTransactionAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_policy", "action", "units", "effective_date", "closing_balance_before", "closing_balance_after", "performed_by")
    list_filter = ("action", "tenant", "leave_policy", "effective_date")
    search_fields = ("employee__employee_code", "employee__first_name", "leave_policy__name", "reason")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_type", "status", "start_date", "end_date", "requested_units", "approved_units")
    list_filter = ("status", "tenant", "leave_type")
    search_fields = ("employee__employee_code", "employee__first_name", "workflow_reference")
