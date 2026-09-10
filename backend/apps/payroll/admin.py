"""Admin registrations for payroll configuration."""

from django.contrib import admin

from apps.payroll.models import (
    EmployeeSalaryAssignment,
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryDeclarationItem,
    EmployeeStatutoryProfile,
    PayGroup,
    PayGroupAssignment,
    PayrollAdjustment,
    PayrollArtifactAccessEvent,
    PayrollArtifactSignedAccessGrant,
    PayrollCalculationLine,
    PayrollFinanceHandoff,
    PayrollProviderCallbackEvent,
    PayrollProviderCertificationRun,
    PayrollProviderConnection,
    PayrollProviderDelivery,
    PayrollProviderJob,
    PayrollProviderLaunchRehearsal,
    PayrollProviderRetryEvent,
    PayrollProviderSchemaMappingSimulation,
    PayrollProviderSchemaMappingPack,
    PayrollReportExportAudit,
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
    PayrollStatutoryComponent,
    PayrollStatutoryEmployerRegistration,
    PayrollStatutoryFilingCalendar,
    PayrollStatutoryPack,
    PayrollStatutorySlab,
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


@admin.register(PayrollStatutoryPack)
class PayrollStatutoryPackAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "code", "country_code", "status", "effective_from", "effective_to")
    list_filter = ("country_code", "status", "jurisdiction_ref")
    search_fields = ("name", "code", "tenant__name", "statutory_profile_ref")


@admin.register(PayrollStatutoryComponent)
class PayrollStatutoryComponentAdmin(admin.ModelAdmin):
    list_display = ("name", "statutory_pack", "tenant", "statutory_type", "contribution_owner", "calculation_method", "status")
    list_filter = ("statutory_type", "contribution_owner", "calculation_method", "status")
    search_fields = ("name", "code", "statutory_treatment_ref", "statutory_pack__name")


@admin.register(PayrollStatutorySlab)
class PayrollStatutorySlabAdmin(admin.ModelAdmin):
    list_display = ("name", "statutory_component", "tenant", "slab_order", "min_amount", "max_amount", "state_code", "status")
    list_filter = ("status", "state_code", "statutory_component__statutory_type")
    search_fields = ("name", "code", "statutory_component__name", "applicability_profile_ref")


@admin.register(PayrollStatutoryEmployerRegistration)
class PayrollStatutoryEmployerRegistrationAdmin(admin.ModelAdmin):
    list_display = ("name", "statutory_pack", "tenant", "registration_type_ref", "registration_number", "status", "effective_from")
    list_filter = ("status", "registration_type_ref", "jurisdiction_ref", "filing_authority_ref", "provider_ref")
    search_fields = ("name", "code", "registration_number", "employer_identifier", "statutory_pack__name", "tenant__name")


@admin.register(PayrollStatutoryFilingCalendar)
class PayrollStatutoryFilingCalendarAdmin(admin.ModelAdmin):
    list_display = ("name", "statutory_pack", "tenant", "filing_type_ref", "filing_frequency", "due_date", "status")
    list_filter = ("status", "filing_frequency", "filing_type_ref", "filing_authority_ref", "provider_ref")
    search_fields = ("name", "code", "filing_type_ref", "employer_registration__registration_number", "statutory_pack__name")


@admin.register(EmployeeStatutoryProfile)
class EmployeeStatutoryProfileAdmin(admin.ModelAdmin):
    list_display = ("employee", "tenant", "statutory_pack", "status", "effective_from", "tax_regime", "declaration_status", "pf_applicable", "esi_applicable")
    list_filter = ("status", "tax_regime", "declaration_status", "pf_applicable", "esi_applicable", "professional_tax_state")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "pan_number", "uan_number", "pf_number", "esi_number")


@admin.register(EmployeeStatutoryDeclaration)
class EmployeeStatutoryDeclarationAdmin(admin.ModelAdmin):
    list_display = ("employee", "tenant", "financial_year_code", "status", "tax_regime", "declared_total_amount", "verified_total_amount")
    list_filter = ("status", "tax_regime", "financial_year_code")
    search_fields = ("employee__employee_code", "employee__first_name", "employee__last_name", "financial_year_code", "declaration_profile_ref")


@admin.register(EmployeeStatutoryDeclarationItem)
class EmployeeStatutoryDeclarationItemAdmin(admin.ModelAdmin):
    list_display = ("declaration", "employee", "section_code", "component_code", "proof_status", "declared_amount", "verified_amount")
    list_filter = ("item_kind", "proof_status", "section_code")
    search_fields = ("employee__employee_code", "section_code", "component_code", "name", "proof_document_ref", "proof_artifact_key")


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
    list_display = ("title", "output_batch", "tenant", "kind", "status", "storage_provider_ref", "download_strategy_ref", "employee", "published_at")
    list_filter = ("kind", "status", "output_profile_ref", "storage_provider_ref", "download_strategy_ref", "supports_signed_url")
    search_fields = ("title", "artifact_key", "file_name", "storage_key", "storage_object_version", "employee__employee_code", "employee__first_name", "employee__last_name")


@admin.register(PayrollArtifactAccessEvent)
class PayrollArtifactAccessEventAdmin(admin.ModelAdmin):
    list_display = ("output_artifact", "tenant", "event_type", "status", "employee", "actor_identifier", "source_channel_ref", "signed_access_grant", "created_at")
    list_filter = ("event_type", "status", "source_channel_ref", "event_profile_ref")
    search_fields = ("output_artifact__title", "employee__employee_code", "actor_identifier", "request_identifier", "checksum_sha256", "signed_access_grant__token_prefix")


@admin.register(PayrollArtifactSignedAccessGrant)
class PayrollArtifactSignedAccessGrantAdmin(admin.ModelAdmin):
    list_display = ("output_artifact", "tenant", "status", "permission_scope", "source_channel_ref", "issued_to_membership", "expires_at", "access_count", "revoked_at")
    list_filter = ("status", "permission_scope", "source_channel_ref", "grant_profile_ref", "storage_provider_ref", "download_strategy_ref")
    search_fields = ("output_artifact__title", "employee__employee_code", "token_prefix", "storage_key", "checksum_sha256", "revocation_reason")


@admin.register(PayrollFinanceHandoff)
class PayrollFinanceHandoffAdmin(admin.ModelAdmin):
    list_display = ("payroll_run", "tenant", "output_batch", "status", "handoff_profile_ref", "generated_at", "transmitted_at")
    list_filter = ("status", "handoff_profile_ref", "bank_file_profile_ref", "accounting_export_profile_ref")
    search_fields = ("payroll_run__name", "payroll_run__code", "tenant__name", "handoff_profile_ref")


@admin.register(PayrollProviderDelivery)
class PayrollProviderDeliveryAdmin(admin.ModelAdmin):
    list_display = ("handoff", "output_artifact", "tenant", "artifact_kind", "status", "provider_ref", "attempt_count", "submitted_at", "acknowledged_at", "reconciled_at")
    list_filter = ("status", "artifact_kind", "provider_ref", "channel_ref")
    search_fields = ("handoff__payroll_run__name", "output_artifact__title", "provider_ref", "external_reference", "failure_code")


@admin.register(PayrollProviderCallbackEvent)
class PayrollProviderCallbackEventAdmin(admin.ModelAdmin):
    list_display = ("provider_delivery", "tenant", "provider_ref", "provider_status", "status", "idempotency_key", "received_at", "processed_at")
    list_filter = ("status", "provider_status", "provider_ref", "callback_verification_ref")
    search_fields = ("provider_delivery__output_artifact__title", "provider_ref", "external_reference", "external_event_id", "idempotency_key", "failure_code")


@admin.register(PayrollProviderRetryEvent)
class PayrollProviderRetryEventAdmin(admin.ModelAdmin):
    list_display = ("provider_delivery", "tenant", "status", "retry_policy_ref", "failure_category_ref", "attempt_number", "scheduled_for", "executed_at")
    list_filter = ("status", "retry_policy_ref", "failure_taxonomy_ref", "failure_category_ref")
    search_fields = ("provider_delivery__output_artifact__title", "retry_policy_ref", "failure_taxonomy_ref", "failure_category_ref", "failure_code")


@admin.register(PayrollProviderJob)
class PayrollProviderJobAdmin(admin.ModelAdmin):
    list_display = ("job_kind", "tenant", "status", "provider_ref", "queue_policy_ref", "attempt_count", "recovery_count", "scheduled_for", "leased_until", "heartbeat_at", "completed_at")
    list_filter = ("job_kind", "status", "queue_policy_ref", "worker_profile_ref")
    search_fields = ("idempotency_key", "provider_ref", "failure_code", "failure_reason")


@admin.register(PayrollProviderLaunchRehearsal)
class PayrollProviderLaunchRehearsalAdmin(admin.ModelAdmin):
    list_display = ("tenant", "status", "can_launch", "ready_lane_count", "blocked_lane_count", "launch_blocker_count", "generated_at", "generated_by")
    list_filter = ("status", "can_launch", "rehearsal_profile_ref", "audit_pack_ref")
    search_fields = ("tenant__name", "tenant__code", "evidence_checksum_sha256", "source_hash")


@admin.register(PayrollProviderConnection)
class PayrollProviderConnectionAdmin(admin.ModelAdmin):
    list_display = ("provider_name", "tenant", "provider_kind", "environment_ref", "status", "certification_status", "adapter_ref")
    list_filter = ("provider_kind", "environment_ref", "status", "certification_status")
    search_fields = ("provider_name", "provider_ref", "tenant__name", "adapter_ref", "channel_ref", "credential_ref")


@admin.register(PayrollProviderSchemaMappingPack)
class PayrollProviderSchemaMappingPackAdmin(admin.ModelAdmin):
    list_display = ("mapping_profile_ref", "tenant", "provider_ref", "artifact_kind", "version", "status", "enforcement_mode")
    list_filter = ("status", "provider_kind", "artifact_kind", "environment_ref", "enforcement_mode")
    search_fields = ("mapping_profile_ref", "provider_ref", "source_schema_ref", "target_schema_ref", "source_hash")


@admin.register(PayrollProviderSchemaMappingSimulation)
class PayrollProviderSchemaMappingSimulationAdmin(admin.ModelAdmin):
    list_display = ("mapping_profile_ref", "tenant", "provider_ref", "artifact_kind", "mapping_pack_version", "status", "comparison_status", "simulated_at")
    list_filter = ("status", "comparison_status", "provider_kind", "artifact_kind", "environment_ref")
    search_fields = ("mapping_profile_ref", "provider_ref", "source_hash")


@admin.register(PayrollProviderCertificationRun)
class PayrollProviderCertificationRunAdmin(admin.ModelAdmin):
    list_display = ("provider_connection", "tenant", "status", "scenario_count", "passed_count", "failed_count", "started_at", "completed_at")
    list_filter = ("status", "provider_kind", "environment_ref", "certification_profile_ref")
    search_fields = ("provider_connection__provider_name", "provider_ref", "run_profile_ref", "scenario_profile_ref", "source_hash")


@admin.register(PayrollReportExportAudit)
class PayrollReportExportAuditAdmin(admin.ModelAdmin):
    list_display = ("report_key", "tenant", "export_type", "row_count", "actor_display", "generated_at", "checksum_sha256")
    list_filter = ("export_type", "report_key", "generated_at")
    search_fields = ("report_key", "tenant__name", "tenant__code", "actor_display", "checksum_sha256", "request_identifier", "source_hash")
