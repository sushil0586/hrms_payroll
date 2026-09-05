from django.contrib import admin

from apps.employee_lifecycle.models import (
    EmployeeExit,
    EmployeeLifecycleEvent,
    EmployeeMovement,
    EmployeeOnboarding,
    ProbationReview,
)


@admin.register(EmployeeLifecycleEvent)
class EmployeeLifecycleEventAdmin(admin.ModelAdmin):
    list_display = ("employee", "tenant", "event_type", "status", "effective_date", "created_at")
    list_filter = ("event_type", "status", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "title", "workflow_reference")


@admin.register(EmployeeOnboarding)
class EmployeeOnboardingAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "tenant",
        "status",
        "expected_joining_date",
        "actual_joining_date",
        "completed_at",
    )
    list_filter = ("status", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "onboarding_template_code", "workflow_reference")


@admin.register(ProbationReview)
class ProbationReviewAdmin(admin.ModelAdmin):
    list_display = ("employee", "tenant", "review_date", "decision", "probation_end_date", "extension_end_date")
    list_filter = ("decision", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "workflow_reference")


@admin.register(EmployeeMovement)
class EmployeeMovementAdmin(admin.ModelAdmin):
    list_display = ("employee", "tenant", "movement_type", "status", "effective_date", "to_department", "to_designation")
    list_filter = ("movement_type", "status", "tenant")
    search_fields = ("employee__employee_code", "employee__first_name", "workflow_reference")


@admin.register(EmployeeExit)
class EmployeeExitAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "tenant",
        "status",
        "resignation_date",
        "approved_last_working_date",
        "actual_exit_date",
    )
    list_filter = ("status", "tenant", "rehire_eligible", "is_regrettable")
    search_fields = ("employee__employee_code", "employee__first_name", "workflow_reference", "exit_reason")
