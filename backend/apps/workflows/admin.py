from django.contrib import admin

from apps.workflows.models import (
    WorkflowActionLog,
    WorkflowAssignment,
    WorkflowInstance,
    WorkflowStep,
    WorkflowStepInstance,
    WorkflowTemplate,
    WorkflowTemplateAssignment,
)


class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    extra = 0


class WorkflowTemplateAssignmentInline(admin.TabularInline):
    model = WorkflowTemplateAssignment
    extra = 0


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "module", "trigger_key", "status", "version", "is_system_seeded")
    list_filter = ("module", "status", "is_system_seeded", "tenant")
    search_fields = ("name", "code", "trigger_key", "tenant__name")
    inlines = [WorkflowStepInline, WorkflowTemplateAssignmentInline]


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    list_display = ("template", "step_order", "name", "mode", "actor_type", "role", "membership")
    list_filter = ("mode", "actor_type", "template__tenant")
    search_fields = ("template__name", "name", "permission_key")


@admin.register(WorkflowTemplateAssignment)
class WorkflowTemplateAssignmentAdmin(admin.ModelAdmin):
    list_display = ("template", "tenant", "priority", "legal_entity", "branch", "department", "business_unit", "grade", "is_active")
    list_filter = ("is_active", "tenant", "template__module")
    search_fields = ("template__name", "tenant__name")


class WorkflowAssignmentInline(admin.TabularInline):
    model = WorkflowAssignment
    extra = 0


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ("module", "trigger_key", "subject_type", "subject_identifier", "status", "current_step_order", "submitted_at", "completed_at")
    list_filter = ("module", "status", "tenant")
    search_fields = ("subject_identifier", "employee_identifier", "initiated_by_identifier", "trigger_key")


@admin.register(WorkflowStepInstance)
class WorkflowStepInstanceAdmin(admin.ModelAdmin):
    list_display = ("workflow_instance", "step_order", "name", "mode", "status", "started_at", "completed_at")
    list_filter = ("mode", "status", "workflow_instance__tenant")
    search_fields = ("workflow_instance__subject_identifier", "name")
    inlines = [WorkflowAssignmentInline]


@admin.register(WorkflowAssignment)
class WorkflowAssignmentAdmin(admin.ModelAdmin):
    list_display = ("step_instance", "actor_type", "membership", "role", "actor_identifier", "is_delegated", "responded_at")
    list_filter = ("actor_type", "is_delegated")
    search_fields = ("actor_identifier", "membership__user__username", "role__name")


@admin.register(WorkflowActionLog)
class WorkflowActionLogAdmin(admin.ModelAdmin):
    list_display = ("workflow_instance", "action", "actor_identifier", "from_status", "to_status", "created_at")
    list_filter = ("action", "from_status", "to_status", "workflow_instance__tenant")
    search_fields = ("workflow_instance__subject_identifier", "actor_identifier", "comment")
