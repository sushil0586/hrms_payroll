"""Admin registrations for payroll configuration."""

from django.contrib import admin

from apps.payroll.models import (
    EmployeeSalaryAssignment,
    PayGroup,
    PayGroupAssignment,
    PayrollAdjustment,
    PayrollCalculationLine,
    PayrollFinanceHandoff,
    PayrollRunCalculation,
    PayrollInputSnapshot,
    PayrollOutputArtifact,
    PayrollOutputBatch,
    PayrollCalendar,
    PayrollPeriod,
    PayrollRuleDefinition,
    PayrollRuleEvaluation,
    PayrollRuleVersion,
    PayrollRun,
    PayrollRunApproval,
    SalaryComponent,
    SalaryStructure,
    SalaryStructureComponent,
    SalaryStructureVersion,
    PayrollRunException,
    PayrollRunReview,
    PayrollSettlement,
    PayrollSettlementLine,
)


@admin.register(PayrollCalendar)
class PayrollCalendarAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "frequency", "currency_code", "is_active")
    list_filter = ("frequency", "is_active")
    search_fields = ("name", "code", "tenant__name")


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ("name", "calendar", "tenant", "start_date", "end_date", "pay_date", "status")
    list_filter = ("status", "calendar")
    search_fields = ("name", "code", "calendar__name", "tenant__name")


@admin.register(PayGroup)
class PayGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "calendar", "status", "default_currency_code")
    list_filter = ("status", "calendar")
    search_fields = ("name", "code", "tenant__name")


@admin.register(PayGroupAssignment)
class PayGroupAssignmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "pay_group", "tenant", "effective_from", "effective_to", "status")
    list_filter = ("status", "pay_group")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "pay_group__name")


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "component_type", "value_type", "status")
    list_filter = ("component_type", "value_type", "status")
    search_fields = ("name", "code", "tenant__name")


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "pay_group", "currency_code", "status")
    list_filter = ("status", "pay_group")
    search_fields = ("name", "code", "tenant__name", "pay_group__name")


@admin.register(SalaryStructureVersion)
class SalaryStructureVersionAdmin(admin.ModelAdmin):
    list_display = ("structure", "version", "tenant", "effective_from", "effective_to", "annual_ctc", "status")
    list_filter = ("status", "structure")
    search_fields = ("structure__name", "structure__code", "tenant__name")


@admin.register(SalaryStructureComponent)
class SalaryStructureComponentAdmin(admin.ModelAdmin):
    list_display = ("structure_version", "component", "tenant", "display_order", "amount", "percentage", "is_active")
    list_filter = ("is_active", "component__component_type")
    search_fields = ("structure_version__structure__name", "component__name", "component__code")


@admin.register(EmployeeSalaryAssignment)
class EmployeeSalaryAssignmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "structure_version", "tenant", "effective_from", "effective_to", "annual_ctc_override", "status")
    list_filter = ("status", "structure_version__structure")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "structure_version__structure__name")


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "period", "pay_group", "status", "locked_at")
    list_filter = ("status", "period", "pay_group")
    search_fields = ("name", "code", "tenant__name", "period__name", "pay_group__name")


@admin.register(PayrollInputSnapshot)
class PayrollInputSnapshotAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "tenant", "snapshot_status", "source_collected_at", "locked_at")
    list_filter = ("snapshot_status", "payroll_run")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "payroll_run__name")


@admin.register(PayrollRuleDefinition)
class PayrollRuleDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "rule_type")
    list_filter = ("rule_type",)
    search_fields = ("name", "code", "tenant__name")


@admin.register(PayrollRuleVersion)
class PayrollRuleVersionAdmin(admin.ModelAdmin):
    list_display = ("rule", "version", "tenant", "status", "expression_language", "effective_from", "effective_to")
    list_filter = ("status", "expression_language", "rule__rule_type")
    search_fields = ("rule__name", "rule__code", "expression", "tenant__name")


@admin.register(PayrollRuleEvaluation)
class PayrollRuleEvaluationAdmin(admin.ModelAdmin):
    list_display = ("rule_version", "tenant", "input_snapshot", "evaluated_by", "created_at")
    list_filter = ("rule_version__rule__rule_type", "created_at")
    search_fields = ("rule_version__rule__name", "rule_version__rule__code", "input_snapshot__employee__employee_code")


@admin.register(PayrollRunCalculation)
class PayrollRunCalculationAdmin(admin.ModelAdmin):
    list_display = ("payroll_run", "tenant", "attempt_number", "status", "calculation_profile_ref", "calculated_at")
    list_filter = ("status", "payroll_run")
    search_fields = ("payroll_run__name", "payroll_run__code", "tenant__name", "calculation_profile_ref")


@admin.register(PayrollCalculationLine)
class PayrollCalculationLineAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "component_code", "line_type", "amount", "currency_code", "status")
    list_filter = ("status", "line_type", "payroll_run")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "component_code", "component_name")


@admin.register(PayrollAdjustment)
class PayrollAdjustmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "kind", "direction", "component_code", "amount", "status", "effective_date")
    list_filter = ("kind", "direction", "status", "adjustment_profile_ref")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "component_code", "component_name", "source_ref")


@admin.register(PayrollSettlement)
class PayrollSettlementAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "status", "settlement_profile_ref", "settlement_date", "last_working_date")
    list_filter = ("status", "settlement_profile_ref", "payroll_run")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "source_ref", "settlement_profile_ref")


@admin.register(PayrollSettlementLine)
class PayrollSettlementLineAdmin(admin.ModelAdmin):
    list_display = ("settlement", "line_kind", "direction", "component_code", "amount", "currency_code")
    list_filter = ("line_kind", "direction", "currency_code")
    search_fields = ("settlement__employee__employee_code", "component_code", "component_name", "source_ref")


@admin.register(PayrollRunReview)
class PayrollRunReviewAdmin(admin.ModelAdmin):
    list_display = ("payroll_run", "tenant", "calculation", "status", "opened_at", "locked_at")
    list_filter = ("status", "payroll_run")
    search_fields = ("payroll_run__name", "payroll_run__code", "tenant__name", "review_profile_ref")


@admin.register(PayrollRunException)
class PayrollRunExceptionAdmin(admin.ModelAdmin):
    list_display = ("title", "review", "tenant", "severity", "status", "employee", "decided_at")
    list_filter = ("severity", "status", "category")
    search_fields = ("title", "detail", "employee__employee_code", "employee__first_name", "employee__last_name")


@admin.register(PayrollRunApproval)
class PayrollRunApprovalAdmin(admin.ModelAdmin):
    list_display = ("review", "tenant", "approver", "status", "decided_at", "approval_profile_ref")
    list_filter = ("status", "approval_profile_ref")
    search_fields = ("review__payroll_run__name", "tenant__name", "approver__email", "approval_profile_ref")


@admin.register(PayrollOutputBatch)
class PayrollOutputBatchAdmin(admin.ModelAdmin):
    list_display = ("payroll_run", "tenant", "review", "status", "output_profile_ref", "generated_at", "published_at")
    list_filter = ("status", "output_profile_ref")
    search_fields = ("payroll_run__name", "payroll_run__code", "tenant__name", "output_profile_ref")


@admin.register(PayrollOutputArtifact)
class PayrollOutputArtifactAdmin(admin.ModelAdmin):
    list_display = ("title", "output_batch", "tenant", "kind", "status", "employee", "published_at")
    list_filter = ("kind", "status", "output_profile_ref")
    search_fields = ("title", "artifact_key", "file_name", "employee__employee_code", "employee__first_name", "employee__last_name")


@admin.register(PayrollFinanceHandoff)
class PayrollFinanceHandoffAdmin(admin.ModelAdmin):
    list_display = ("payroll_run", "tenant", "output_batch", "status", "handoff_profile_ref", "generated_at", "transmitted_at")
    list_filter = ("status", "handoff_profile_ref", "bank_file_profile_ref", "accounting_export_profile_ref")
    search_fields = ("payroll_run__name", "payroll_run__code", "tenant__name", "handoff_profile_ref")
