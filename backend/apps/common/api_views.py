"""Views for the first ESS/MSS API slice."""

from datetime import date, datetime, timedelta
import csv
import json
import re
import secrets
from decimal import Decimal
from io import StringIO

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.http import FileResponse, HttpResponse
from django.db import IntegrityError, transaction
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.text import slugify
from rest_framework import exceptions, permissions, response, serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.common.models import HrmsLaunchRemediationAssignment
from apps.common.api_serializers import (
    LIFECYCLE_COMMON_DUE_ANCHORS,
    LIFECYCLE_EXIT_DUE_ANCHORS,
    LIFECYCLE_ONBOARDING_DUE_ANCHORS,
    HrAdminAttendancePolicySerializer,
    HrAdminAttendancePolicyPreviewRequestSerializer,
    HrAdminAttendancePolicyPreviewSerializer,
    HrAdminAttendancePolicyAssignmentWriteSerializer,
    HrAdminAttendancePolicyAssignmentConflictRequestSerializer,
    HrAdminAttendancePolicyAssignmentConflictSerializer,
    HrAdminAttendancePolicyAssignmentResolutionRequestSerializer,
    HrAdminAttendancePolicyAssignmentResolutionSerializer,
    HrAdminEmployeeShiftAssignmentSerializer,
    HrAdminEmployeeShiftAssignmentWriteSerializer,
    HrAdminEmployeeShiftAssignmentConflictRequestSerializer,
    HrAdminEmployeeShiftAssignmentConflictSerializer,
    HrAdminEmployeeShiftAssignmentResolutionRequestSerializer,
    HrAdminEmployeeShiftAssignmentResolutionSerializer,
    HrAdminShiftRosterTemplateSerializer,
    HrAdminShiftRosterTemplateWriteSerializer,
    HrAdminShiftRosterTemplateRolloutRequestSerializer,
    HrAdminShiftRosterTemplateRolloutSerializer,
    HrAdminShiftRosterRolloutSerializer,
    HrAdminAttendanceOperationOptionsSerializer,
    HrAdminAttendanceRecordSerializer,
    HrAdminAttendanceRecordListSerializer,
    HrAdminAttendanceRegularizationListSerializer,
    HrAdminAttendanceRecordBulkActionSerializer,
    HrAdminAttendanceRecordWriteSerializer,
    HrAdminLifecycleOwnerBulkActionSerializer,
    HrAdminLifecycleStatusBulkActionSerializer,
    HrAdminAttendancePolicyWriteSerializer,
    AttendanceRecordOptionSerializer,
    AttendanceRegularizationHistoryItemSerializer,
    AttendanceRegularizationHistoryListSerializer,
    AttendanceSummarySerializer,
    AttendanceRegularizationCreateSerializer,
    EmployeeDashboardSerializer,
    HrAdminEmployeeAccessDetailSerializer,
    HrAdminEmployeeAccessOptionsSerializer,
    HrAdminEmployeeAccessWriteSerializer,
    HrAdminEmployeeBankAccountSerializer,
    HrAdminEmployeeBankAccountWriteSerializer,
    HrAdminEmployeeSalaryAssignmentSerializer,
    HrAdminEmployeeSalaryAssignmentWriteSerializer,
    EmployeeProfileSerializer,
    HrAdminEmployeeDetailSerializer,
    HrAdminEmployeeFormOptionsSerializer,
    HrAdminEmployeeListItemSerializer,
    HrAdminEmployeeWriteSerializer,
    HrAdminLeavePolicyAssignmentWriteSerializer,
    HrAdminLeavePolicyAssignmentConflictRequestSerializer,
    HrAdminLeavePolicyAssignmentConflictSerializer,
    HrAdminLeavePolicyAssignmentResolutionRequestSerializer,
    HrAdminLeavePolicyAssignmentResolutionSerializer,
    HrAdminLeavePolicySerializer,
    HrAdminLeavePolicyPreviewRequestSerializer,
    HrAdminLeavePolicyPreviewSerializer,
    HrAdminLeavePolicyWriteSerializer,
    HrAdminLeaveBalanceSerializer,
    HrAdminLeaveBalanceTransactionSerializer,
    HrAdminLeaveBalanceActionSerializer,
    HrAdminLeaveBalanceActionResultSerializer,
    HrAdminLeaveBalanceTransactionReviewSerializer,
    HrAdminLeaveTypeSerializer,
    HrAdminLeaveTypeWriteSerializer,
    HrAdminOrganizationFormOptionsSerializer,
    HrAdminOrganizationItemSerializer,
    HrAdminPolicyOptionsSerializer,
    HrAdminScopedAssignmentSerializer,
    HrAdminWorkflowOptionsSerializer,
    HrAdminWorkflowTraceListSerializer,
    HrAdminWorkflowTraceSerializer,
    HrAdminWorkflowTemplateAssignmentSerializer,
    HrAdminWorkflowTemplateAssignmentWriteSerializer,
    HrAdminWorkflowTemplateSerializer,
    HrAdminWorkflowTemplateWriteSerializer,
    HrAdminOrganizationWriteSerializer,
    HrAdminOrganizationSnapshotSerializer,
    HrAdminDocumentCategorySerializer,
    HrAdminDocumentCategoryWriteSerializer,
    HrAdminDashboardSerializer,
    HrAdminDocumentOptionsSerializer,
    HrAdminDocumentRequirementRuleSerializer,
    HrAdminDocumentRequirementRuleWriteSerializer,
    HrAdminEmployeeDocumentSerializer,
    HrAdminEmployeeDocumentListSerializer,
    HrAdminEmployeeDocumentCreateSerializer,
    HrAdminEmployeeDocumentReminderActionResultSerializer,
    HrAdminEmployeeDocumentReminderActionSerializer,
    HrAdminEmployeeDocumentWriteSerializer,
    HrAdminGeneratedLetterSerializer,
    HrAdminGeneratedLetterListSerializer,
    HrAdminGeneratedLetterPreviewRequestSerializer,
    HrAdminGeneratedLetterPreviewSerializer,
    HrAdminLaunchRemediationActionSerializer,
    HrAdminLaunchRemediationAssignmentSerializer,
    HrAdminLaunchRemediationListSerializer,
    HrAdminSaasCommercialControlSerializer,
    HrAdminSaasCommercialSubscriptionUpdateSerializer,
    HrAdminSaasOperationalHealthSerializer,
    HrAdminSaasResilienceReadinessSerializer,
    HrAdminSaasSlaOperationsSerializer,
    TenantAdminConsoleSerializer,
    TenantAdminChangeRequestActionSerializer,
    TenantAdminChangeRequestCreateSerializer,
    TenantAdminChangeRequestMutationResultSerializer,
    TenantAdminMembershipActionSerializer,
    TenantAdminMembershipInviteSerializer,
    TenantAdminMembershipMutationResultSerializer,
    TenantAdminSupportAccessGrantActionSerializer,
    TenantAdminSupportAccessGrantCreateSerializer,
    TenantAdminSupportAccessGrantMutationResultSerializer,
    TenantAdminEnterpriseSecurityReadinessSerializer,
    TenantAdminTrustAuditReviewSerializer,
    SupportSessionDomainSnapshotSerializer,
    SupportSessionTenantConsoleSerializer,
    HrAdminGeneratedLetterWriteSerializer,
    HrAdminPayGroupAssignmentSerializer,
    HrAdminPayGroupAssignmentWriteSerializer,
    HrAdminPayGroupSerializer,
    HrAdminPayGroupWriteSerializer,
    HrAdminPayrollAdjustmentDecisionSerializer,
    HrAdminPayrollAdjustmentSerializer,
    HrAdminPayrollAdjustmentSetupSerializer,
    HrAdminPayrollAdjustmentWriteSerializer,
    HrAdminPayrollSettlementDecisionSerializer,
    HrAdminPayrollSettlementLineSerializer,
    HrAdminPayrollSettlementLineWriteSerializer,
    HrAdminPayrollSettlementSerializer,
    HrAdminPayrollSettlementSetupSerializer,
    HrAdminPayrollSettlementWriteSerializer,
    HrAdminEmployeeStatutoryDeclarationItemSerializer,
    HrAdminEmployeeStatutoryDeclarationItemVerifySerializer,
    HrAdminEmployeeStatutoryDeclarationItemWriteSerializer,
    HrAdminEmployeeStatutoryDeclarationRejectSerializer,
    HrAdminEmployeeStatutoryDeclarationSerializer,
    HrAdminEmployeeStatutoryDeclarationWriteSerializer,
    HrAdminEmployeeStatutoryProfileSerializer,
    HrAdminEmployeeStatutoryProfileWriteSerializer,
    HrAdminPayrollStatutoryComponentSerializer,
    HrAdminPayrollStatutoryComponentWriteSerializer,
    HrAdminPayrollStatutoryEmployerRegistrationSerializer,
    HrAdminPayrollStatutoryEmployerRegistrationWriteSerializer,
    HrAdminPayrollStatutoryFilingCalendarSerializer,
    HrAdminPayrollStatutoryFilingCalendarWriteSerializer,
    HrAdminPayrollStatutoryPackSerializer,
    HrAdminPayrollStatutoryPackWriteSerializer,
    HrAdminPayrollStatutorySetupSerializer,
    HrAdminPayrollStatutorySlabSerializer,
    HrAdminPayrollStatutorySlabWriteSerializer,
    HrAdminPayrollCalculationLineSerializer,
    HrAdminPayrollCalculationSetupSerializer,
    HrAdminPayrollCalendarSerializer,
    HrAdminPayrollCalendarWriteSerializer,
    HrAdminPayrollCreateExceptionRequestSerializer,
    HrAdminPayrollDraftCalculateRequestSerializer,
    HrAdminPayrollDraftCalculateResultSerializer,
    HrAdminPayrollExceptionDecisionRequestSerializer,
    HrAdminPayrollInputLockResultSerializer,
    HrAdminPayrollInputSnapshotSerializer,
    HrAdminPayrollInputSnapshotSetupSerializer,
    HrAdminPayrollInputSnapshotWriteSerializer,
    HrAdminPayrollFinanceHandoffAcknowledgeRequestSerializer,
    HrAdminPayrollFinanceHandoffActionResultSerializer,
    HrAdminPayrollFinanceHandoffSetupSerializer,
    HrAdminPayrollGenerateFinanceHandoffRequestSerializer,
    HrAdminPayrollGenerateProviderAuditPackRequestSerializer,
    HrAdminPayrollGenerateOutputsRequestSerializer,
    HrAdminPayrollOpenReviewRequestSerializer,
    HrAdminPayrollOutputActionResultSerializer,
    HrAdminPayrollOutputArtifactSerializer,
    HrAdminPayrollOutputBatchSerializer,
    HrAdminPayrollOutputSetupSerializer,
    HrAdminPayrollProviderConnectionActionResultSerializer,
    HrAdminPayrollProviderConnectionCertificationRequestSerializer,
    HrAdminPayrollProviderConnectionSerializer,
    HrAdminPayrollProviderConnectionSetupSerializer,
    HrAdminPayrollProviderConnectionWriteSerializer,
    HrAdminPayrollProviderCertificationRunActionResultSerializer,
    HrAdminPayrollProviderCertificationRunRequestSerializer,
    HrAdminPayrollProviderCertificationRunSerializer,
    HrAdminPayrollProviderJobSerializer,
    HrAdminPayrollProviderLaunchRehearsalActionResultSerializer,
    HrAdminPayrollProviderLaunchRehearsalSerializer,
    HrAdminPayrollProviderSchemaMappingPackActionResultSerializer,
    HrAdminPayrollProviderSchemaMappingPackExportSerializer,
    HrAdminPayrollProviderSchemaMappingPackImportSerializer,
    HrAdminPayrollProviderSchemaMappingPackLifecycleRequestSerializer,
    HrAdminPayrollProviderSchemaMappingPackSerializer,
    HrAdminPayrollProviderSchemaMappingPackSimulationRequestSerializer,
    HrAdminPayrollProviderSchemaMappingPackSimulationResultSerializer,
    HrAdminPayrollProviderSchemaMappingPackWriteSerializer,
    PayrollArtifactSignedAccessGrantIssueRequestSerializer,
    PayrollArtifactSignedAccessGrantIssueResultSerializer,
    PayrollArtifactSignedAccessGrantRevokeRequestSerializer,
    PayrollArtifactSignedAccessGrantSerializer,
    PayrollProviderCallbackRequestSerializer,
    PayrollProviderCallbackResultSerializer,
    HrAdminPayrollProviderRetryActionResultSerializer,
    HrAdminPayrollProviderRetryRequeueRequestSerializer,
    HrAdminPayrollProviderRetryScheduleRequestSerializer,
    HrAdminPayrollPeriodSerializer,
    HrAdminPayrollPeriodWriteSerializer,
    HrAdminPayrollReadinessListSerializer,
    HrAdminPayrollReviewActionResultSerializer,
    HrAdminPayrollReviewApprovalRequestSerializer,
    HrAdminPayrollReviewSetupSerializer,
    HrAdminPayrollRuleDefinitionSerializer,
    HrAdminPayrollRuleDefinitionWriteSerializer,
    HrAdminPayrollRuleEvaluateRequestSerializer,
    HrAdminPayrollRuleEvaluateResponseSerializer,
    HrAdminPayrollRuleEvaluationSerializer,
    HrAdminPayrollRulesSetupSerializer,
    HrAdminPayrollRuleVersionSerializer,
    HrAdminPayrollRuleVersionWriteSerializer,
    HrAdminPayrollRunCalculationSerializer,
    HrAdminPayrollRunExceptionSerializer,
    HrAdminPayrollRunSerializer,
    HrAdminPayrollRunWriteSerializer,
    HrAdminPayrollSetupSerializer,
    HrAdminPayrollValidationIssueSerializer,
    HrAdminSalaryComponentSerializer,
    HrAdminSalaryComponentWriteSerializer,
    HrAdminSalarySetupSerializer,
    HrAdminSalaryStructureComponentSerializer,
    HrAdminSalaryStructureComponentWriteSerializer,
    HrAdminSalaryStructureSerializer,
    HrAdminSalaryStructureVersionSerializer,
    HrAdminSalaryStructureVersionWriteSerializer,
    HrAdminSalaryStructureWriteSerializer,
    MeDocumentCenterSerializer,
    MeDocumentSummarySerializer,
    MeDocumentRequirementItemSerializer,
    MeEmployeeDocumentCreateSerializer,
    MePayrollPayslipSerializer,
    MePayrollPayslipListSerializer,
    MeStatutoryDeclarationItemSerializer,
    MeStatutoryDeclarationItemWriteSerializer,
    MeStatutoryDeclarationListSerializer,
    MeStatutoryDeclarationProofUploadSerializer,
    MeStatutoryDeclarationSerializer,
    MeStatutoryDeclarationWriteSerializer,
    HrAdminExitSerializer,
    HrAdminExitWriteSerializer,
    HrAdminHolidayCalendarSerializer,
    HrAdminHolidayCalendarWriteSerializer,
    HrAdminLifecycleQueueListSerializer,
    HrAdminLifecycleOptionsSerializer,
    HrAdminMovementSerializer,
    HrAdminMovementWriteSerializer,
    HrAdminNotificationEventDefinitionSerializer,
    HrAdminNotificationEventPreviewRequestSerializer,
    HrAdminNotificationEventDefinitionWriteSerializer,
    HrAdminNotificationChannelConfigurationSerializer,
    HrAdminNotificationChannelConfigurationWriteSerializer,
    HrAdminNotificationBulkRetrySerializer,
    HrAdminNotificationDiagnosticsSerializer,
    HrAdminNotificationListSerializer,
    HrAdminNotificationOptionsSerializer,
    HrAdminNotificationPreviewResponseSerializer,
    HrAdminNotificationRetrySerializer,
    HrAdminNotificationSerializer,
    HrAdminNotificationTemplateSerializer,
    HrAdminNotificationTemplatePreviewRequestSerializer,
    HrAdminNotificationTemplateWriteSerializer,
    HrAdminNotificationWriteSerializer,
    UserNotificationReadStateSerializer,
    HrAdminOnboardingListSerializer,
    HrAdminOnboardingSerializer,
    HrAdminOnboardingWriteSerializer,
    HrAdminProbationReviewListSerializer,
    HrAdminProbationReviewSerializer,
    HrAdminProbationReviewWriteSerializer,
    HrAdminMovementListSerializer,
    HrAdminShiftSerializer,
    HrAdminShiftWriteSerializer,
    HrAdminExitListSerializer,
    LeaveTypeOptionSerializer,
    LeaveRequestHistoryListSerializer,
    LeaveRequestHistoryItemSerializer,
    LeaveSummarySerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestLifecycleActionSerializer,
    ManagerAttendanceApprovalItemSerializer,
    ManagerLeaveApprovalListSerializer,
    ManagerLeaveApprovalItemSerializer,
    ManagerTeamSummarySerializer,
    ManagerDecisionSerializer,
    BulkMutationResultSerializer,
    MutationResultSerializer,
)
from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, ScopeType, TenantMembership, User
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryDeclarationItem,
    EmployeeStatutoryProfile,
    PayGroup,
    PayGroupAssignment,
    PayGroupStatus,
    PayrollAdjustment,
    PayrollAdjustmentDirection,
    PayrollAdjustmentKind,
    PayrollAdjustmentStatus,
    PayrollCalculationLine,
    PayrollCalculationLineSource,
    PayrollCalculationLineStatus,
    PayrollCalculationStatus,
    PayrollApprovalStatus,
    PayrollExceptionSeverity,
    PayrollExceptionStatus,
    PayrollFinanceHandoff,
    PayrollFinanceHandoffStatus,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollExpressionLanguage,
    PayrollArtifactAccessEvent,
    PayrollArtifactAccessEventType,
    PayrollArtifactSignedAccessGrant,
    PayrollArtifactSignedAccessGrantStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollProviderCallbackEvent,
    PayrollProviderCallbackEventStatus,
    PayrollProviderCertificationStatus,
    PayrollProviderCertificationRun,
    PayrollProviderCertificationRunStatus,
    PayrollProviderConnection,
    PayrollProviderConnectionKind,
    PayrollProviderConnectionStatus,
    PayrollProviderDelivery,
    PayrollProviderDeliveryStatus,
    PayrollProviderJob,
    PayrollProviderJobKind,
    PayrollProviderJobStatus,
    PayrollProviderLaunchRehearsal,
    PayrollProviderLaunchRehearsalStatus,
    PayrollProviderRetryEvent,
    PayrollProviderRetryEventStatus,
    PayrollProviderSchemaMappingSimulation,
    PayrollProviderSchemaMappingPack,
    PayrollProviderSchemaMappingPackStatus,
    PayrollReportExportAudit,
    PayrollReportExportAuditType,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollFrequency,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollReviewStatus,
    PayrollRuleDefinition,
    PayrollRuleEvaluation,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunApproval,
    PayrollRunCalculation,
    PayrollRunException,
    PayrollRunReview,
    PayrollRunStatus,
    PayrollSettlement,
    PayrollSettlementLine,
    PayrollSettlementLineKind,
    PayrollSettlementStatus,
    PayrollStatutoryCalculationMethod,
    PayrollStatutoryComponent,
    PayrollStatutoryComponentKind,
    PayrollStatutoryContributionOwner,
    PayrollStatutoryDeclarationItemKind,
    PayrollStatutoryDeclarationStatus,
    PayrollStatutoryEmployerRegistration,
    PayrollStatutoryFilingCalendar,
    PayrollStatutoryFilingStatus,
    PayrollStatutoryPack,
    PayrollStatutoryProofStatus,
    PayrollStatutorySlab,
    PayrollTaxRegime,
    PayrollDeclarationStatus,
    PayrollValidationCategory,
    PayrollValidationIssue,
    PayrollValidationIssueStatus,
    PayrollValidationSeverity,
    SalaryComponent,
    SalaryComponentType,
    SalaryComponentValueType,
    SalaryStructure,
    SalaryStructureComponent,
    SalaryStructureVersion,
)
from apps.common.selectors import (
    describe_hrms_saas_launch_audit_pack,
    describe_saas_commercial_support_audit_pack,
    describe_saas_commercial_control,
    evaluate_saas_commercial_access,
    get_employee_attendance_regularization_detail,
    get_employee_attendance_regularizations,
    get_employee_attendance_summary,
    get_employee_for_user,
    get_hr_admin_dashboard,
    get_hr_admin_document_compliance_export,
    get_hr_admin_employee_detail,
    get_hr_admin_employee_access_detail,
    get_hr_admin_employee_access_options,
    get_hr_admin_employee_form_options,
    get_hr_admin_employee_list,
    get_hr_admin_lifecycle_queue_export,
    get_hr_admin_notification_queue_export,
    get_hr_admin_organization_form_options,
    get_hr_admin_organization_item_detail,
    get_hr_admin_organization_snapshot,
    get_hr_admin_payroll_readiness,
    get_hr_admin_saas_operational_health,
    get_hr_admin_saas_resilience_readiness,
    get_hr_admin_saas_sla_operations,
    get_hr_admin_pending_approvals_export,
    get_hr_admin_workforce_export,
    get_hrms_saas_launch_remediation_assignments,
    get_tenant_admin_console_payload,
    get_tenant_admin_enterprise_security_readiness,
    get_support_domain_snapshot_option,
    get_support_session_domain_snapshot_payload,
    get_support_session_tenant_console_payload,
    get_tenant_admin_trust_audit_review,
    get_default_membership_for_user,
    get_employee_leave_request_detail,
    get_employee_leave_requests,
    get_employee_leave_summary,
    get_manager_attendance_regularization_detail,
    get_manager_pending_attendance_regularizations,
    get_manager_leave_request_detail,
    get_manager_pending_leave_requests,
    get_manager_team_summary,
    recompute_hrms_saas_launch_audit_pack_checksum,
    sync_hrms_saas_launch_remediation_assignments,
    create_tenant_admin_change_request,
    create_support_access_grant,
    evaluate_support_access_session,
    invite_tenant_admin_membership,
    update_tenant_admin_change_request,
    update_tenant_admin_membership,
    update_support_access_grant,
    update_hrms_saas_launch_remediation_assignment,
    update_saas_commercial_subscription,
)
from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    AttendanceSource,
    EmployeeShiftAssignment,
    EmployeeShiftAssignmentKind,
    ShiftRosterTemplate,
    ShiftRosterRollout,
    ShiftRosterTemplateStatus,
    AttendanceRecord,
    AttendanceRegularization,
    RegularizationStatus,
    AttendanceStatus,
    AttendanceUnit,
    HolidayType,
    Holiday,
    HolidayCalendar,
    Shift,
)
from apps.tenants.models import Tenant
from apps.attendance.services import (
    evaluate_attendance_runtime,
    normalize_employee_shift_assignment_config,
    normalize_attendance_policy_config,
    preview_attendance_policy_assignment_conflicts,
    preview_attendance_policy_assignment_resolution,
    preview_attendance_policy_configuration,
    preview_employee_shift_assignment_conflicts,
    preview_employee_shift_assignment_resolution,
    preview_shift_roster_template_rollout,
    get_shift_roster_rollout_employee_queryset,
    resolve_regularization,
    submit_regularization,
)
from apps.payroll.services import (
    PayrollAdjustmentError,
    PayrollCalculationError,
    PayrollFinanceHandoffError,
    PayrollOutputError,
    PayrollProviderCallbackError,
    PayrollProviderConnectionError,
    PayrollProviderRetryError,
    PayrollProviderSchemaMappingPackError,
    PayrollReviewError,
    PayrollRuleEvaluationError,
    PayrollSettlementError,
    apply_payroll_adjustment,
    apply_payroll_settlement,
    approve_payroll_run_review,
    approve_payroll_adjustment,
    approve_payroll_settlement,
    activate_payroll_provider_schema_mapping_pack_for_actor,
    archive_payroll_provider_schema_mapping_pack_for_actor,
    build_payroll_rule_context_from_snapshot,
    calculate_draft_payroll_run,
    clone_payroll_provider_schema_mapping_pack_for_actor,
    create_payroll_adjustment,
    create_payroll_artifact_access_event,
    create_payroll_settlement,
    create_payroll_settlement_line,
    create_payroll_run_exception,
    decide_payroll_run_exception,
    evaluate_payroll_rule_version,
    export_payroll_provider_schema_mapping_pack,
    generate_payroll_finance_handoff,
    generate_payroll_provider_audit_pack,
    generate_payroll_outputs,
    build_payroll_provider_schema_mapping_simulation_payload,
    ensure_default_payroll_provider_connections,
    ingest_payroll_provider_callback,
    import_payroll_provider_schema_mapping_pack_for_actor,
    issue_payroll_artifact_signed_access_grant,
    lock_approved_payroll_run_review,
    mark_payroll_artifact_signed_access_grant_used,
    open_payroll_run_review,
    payroll_artifact_access_audit_rows,
    publish_payroll_output_batch,
    reconcile_payroll_finance_handoff,
    record_payroll_provider_connection_certification,
    record_payroll_provider_launch_rehearsal,
    reject_payroll_adjustment,
    reject_payroll_run_review,
    reject_payroll_settlement,
    requeue_payroll_provider_delivery,
    revoke_payroll_artifact_signed_access_grant,
    run_payroll_provider_connection_certification,
    schedule_payroll_provider_delivery_retry,
    save_payroll_provider_schema_mapping_pack_for_actor,
    simulate_payroll_provider_schema_mapping_pack_for_actor,
    sync_payroll_provider_connection_readiness,
    submit_payroll_adjustment,
    submit_payroll_run_review,
    submit_payroll_settlement,
    transmit_payroll_finance_handoff,
    validate_payroll_artifact_signed_access_grant,
)
from apps.payroll.providers import (
    describe_payroll_provider_launch_rehearsal,
    describe_payroll_provider_adapter_registry,
    describe_payroll_provider_client_registry,
    describe_payroll_provider_package_registry,
)
from apps.payroll.storage import (
    PayrollArtifactStorageError,
    describe_payroll_artifact_storage_policy_registry,
    get_payroll_artifact_signed_url,
    read_payroll_artifact_payload,
)
from apps.leave_management.models import (
    AccrualFrequency,
    LeaveBalance,
    LeaveBalanceTransaction,
    LeaveCategory,
    LeavePolicy,
    LeavePolicyAssignment,
    LeavePolicyStatus,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    LeaveUnit,
)
from apps.leave_management.services import (
    _employee_can_review_leave_balance_transaction,
    apply_leave_balance_admin_action,
    cancel_leave_request,
    normalize_leave_policy_config,
    preview_leave_policy_configuration,
    preview_leave_policy_assignment_conflicts,
    preview_leave_policy_assignment_resolution,
    review_leave_balance_transaction,
    resolve_leave_request,
    submit_leave_request,
    withdraw_leave_request,
)
from apps.platform_policies.services import detach_runtime_item_from_platform_source
from apps.documents.models import (
    DocumentCategory,
    DocumentCategoryType,
    DocumentArtifact,
    DocumentArtifactSourceKind,
    DocumentRequirementRule,
    DocumentVerificationLog,
    EmployeeDocument,
    EmployeeDocumentStatus,
    GeneratedLetter,
    LetterType,
    VerificationStatus,
)
from apps.documents.services import (
    get_document_upload_max_bytes,
    store_document_artifact,
    validate_uploaded_document_file,
)
from apps.employee_lifecycle.models import (
    EmployeeLifecycleEvent,
    EmployeeExit,
    EmployeeMovement,
    EmployeeOnboarding,
    ExitStatus,
    LifecycleEventStatus,
    LifecycleEventType,
    MovementType,
    OnboardingStatus,
    ProbationDecision,
    ProbationReview,
)
from apps.notifications.models import (
    Notification,
    NotificationAudienceType,
    NotificationChannel,
    NotificationChannelConfiguration,
    NotificationDeliveryBackend,
    NotificationDeliveryLog,
    NotificationEventDefinition,
    NotificationPriority,
    NotificationStatus,
    NotificationTemplate,
    NotificationTemplateStatus,
)
from apps.notifications.services import (
    create_in_app_notification,
    get_default_backend_key,
    get_notification_retry_state,
    get_or_create_channel_configuration,
    get_registered_notification_backends,
    process_notification,
    resolve_notification_recipient_address,
    retry_notification,
    trigger_notification_event,
)
from apps.workflows.models import (
    WorkflowAssignment,
    WorkflowActorType,
    WorkflowActionLog,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowModule,
    WorkflowStatus,
    WorkflowStep,
    WorkflowStepMode,
    WorkflowTemplate,
    WorkflowTemplateAssignment,
)
from apps.workflows.services import create_workflow_instance


EMPLOYEE_INACTIVE_STATUSES = {
    EmploymentStatus.INACTIVE,
    EmploymentStatus.EXITED,
}

LIFECYCLE_RULE_WEEKDAY_OPTIONS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def _get_page_params(request, *, default_page_size: int = 25, max_page_size: int = 100) -> tuple[int, int]:
    try:
        page = max(int(request.query_params.get("page", 1) or 1), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(max(int(request.query_params.get("page_size", default_page_size) or default_page_size), 1), max_page_size)
    except (TypeError, ValueError):
        page_size = default_page_size
    return page, page_size


def _build_paginated_payload(items: list[dict], *, page: int, page_size: int, extra: dict | None = None) -> dict:
    total_count = len(items)
    offset = (page - 1) * page_size
    payload = {
        "items": items[offset : offset + page_size],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
    }
    if extra:
        payload.update(extra)
    return payload


def _employee_has_live_access(employee: Employee) -> bool:
    membership = getattr(employee, "membership", None)
    if not membership:
        return False
    user = getattr(membership, "user", None)
    return bool((user and user.is_active) or membership.status == MembershipStatus.ACTIVE)


def _validate_platform_managed_policy_edit(item, validated_data: dict, *, label: str) -> None:
    if not getattr(item, "managed_by_platform", False):
        return

    delegation_mode = getattr(item, "delegation_mode", "") or ""
    if delegation_mode == "locked":
        raise serializers.ValidationError(
            {"detail": f"{label} is platform-managed and locked. Request a platform-level change instead."}
        )
    if delegation_mode == "platform_approval_required":
        raise serializers.ValidationError(
            {"detail": f"{label} requires platform approval before tenant-side edits can be applied."}
        )
    if delegation_mode == "tenant_editable_after_clone":
        raise serializers.ValidationError(
            {"detail": f"{label} must be cloned or detached from the platform baseline before it can be edited."}
        )

    locked_paths = list(getattr(item, "platform_locked_fields", []) or [])
    blocked_fields: list[str] = []
    for field_name in validated_data.keys():
        if any(
            locked_path == field_name
            or locked_path.startswith(f"{field_name}.")
            or (field_name == "config_snapshot" and (locked_path == "config_snapshot" or locked_path.startswith("config_snapshot.")))
            for locked_path in locked_paths
        ):
            blocked_fields.append(field_name)

    if blocked_fields:
        raise serializers.ValidationError(
            {
                "detail": f"{label} contains platform-locked fields that cannot be edited here.",
                "locked_fields": sorted(set(blocked_fields)),
            }
        )


def _build_platform_governance_payload(item) -> dict:
    source_kind = getattr(item, "source_kind", "") or ""
    delegation_mode = getattr(item, "delegation_mode", "") or ""
    managed_by_platform = bool(getattr(item, "managed_by_platform", False))
    locked_fields = list(getattr(item, "platform_locked_fields", []) or [])
    is_platform_record = managed_by_platform and source_kind == "platform_pack"
    is_detached_clone = source_kind == "tenant_clone" and not managed_by_platform

    if is_detached_clone:
        governance_state = "tenant_detached_clone"
        governance_label = "Detached tenant clone"
        edit_mode = "editable"
        lineage_summary = "Originally cloned from a platform baseline and now detached into tenant ownership."
    elif not is_platform_record:
        governance_state = "tenant_native"
        governance_label = "Tenant-managed"
        edit_mode = "editable"
        lineage_summary = "Created and managed fully within the tenant workspace."
    elif delegation_mode == "locked":
        governance_state = "platform_locked"
        governance_label = "Platform locked"
        edit_mode = "blocked"
        lineage_summary = "Managed by the platform baseline and locked against tenant-side edits."
    elif delegation_mode == "platform_approval_required":
        governance_state = "platform_approval_required"
        governance_label = "Platform approval required"
        edit_mode = "approval_required"
        lineage_summary = "Managed by the platform baseline and requires platform approval before tenant changes."
    elif delegation_mode == "tenant_editable_after_clone":
        governance_state = "platform_clone_required"
        governance_label = "Detach before edit"
        edit_mode = "detach_required"
        lineage_summary = "Managed by the platform baseline and must be detached before tenant edits are allowed."
    else:
        governance_state = "platform_editable"
        governance_label = "Platform managed, tenant editable"
        edit_mode = "editable"
        lineage_summary = "Managed by the platform baseline but tenant edits are allowed except for locked fields."

    return {
        "governance_state": governance_state,
        "governance_label": governance_label,
        "edit_mode": edit_mode,
        "can_edit_directly": edit_mode == "editable",
        "can_detach_from_platform": is_platform_record,
        "requires_platform_change": governance_state in {"platform_locked", "platform_approval_required"},
        "is_detached_clone": is_detached_clone,
        "locked_field_count": len(locked_fields),
        "lineage_summary": lineage_summary,
    }


def _validate_employee_structure_consistency(item: Employee):
    if item.branch and item.legal_entity and item.branch.legal_entity_id != item.legal_entity_id:
        raise serializers.ValidationError(
            {"branch_id": "Selected branch does not belong to the selected legal entity."}
        )
    if item.branch and item.location and item.branch.location_id and item.branch.location_id != item.location_id:
        raise serializers.ValidationError(
            {"location_id": "Selected location does not match the branch location."}
        )
    if item.cost_center and item.legal_entity and item.cost_center.legal_entity_id and item.cost_center.legal_entity_id != item.legal_entity_id:
        raise serializers.ValidationError(
            {"cost_center_id": "Selected cost center does not belong to the selected legal entity."}
        )
    if item.department and item.business_unit and item.department.business_unit_id and item.department.business_unit_id != item.business_unit_id:
        raise serializers.ValidationError(
            {"business_unit_id": "Selected business unit does not match the department business unit."}
        )
    if item.designation and item.grade and item.designation.grade_id and item.designation.grade_id != item.grade_id:
        raise serializers.ValidationError(
            {"grade_id": "Selected grade does not match the designation grade."}
        )


def save_hr_admin_employee(actor, validated_data, *, item=None):
    tenant = actor.tenant
    model_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "location_id": Location,
        "department_id": Department,
        "business_unit_id": BusinessUnit,
        "cost_center_id": CostCenter,
        "designation_id": Designation,
        "grade_id": Grade,
        "employment_type_id": EmploymentType,
    }

    if item is None:
        item = Employee(tenant=tenant)

    employee_code = validated_data.get("employee_code")
    if employee_code:
        conflicting_employee = Employee.objects.filter(
            tenant=tenant,
            employee_code__iexact=employee_code,
        )
        if item.id:
            conflicting_employee = conflicting_employee.exclude(id=item.id)
        if conflicting_employee.exists():
            raise serializers.ValidationError({"employee_code": "This employee code is already in use."})

    requested_status = validated_data.get("employment_status")
    if item.id and requested_status in EMPLOYEE_INACTIVE_STATUSES and _employee_has_live_access(item):
        raise serializers.ValidationError(
            {
                "employment_status": "Deactivate employee access first before moving this employee to an inactive or exited status.",
            }
        )

    for field in [
        "employee_code",
        "first_name",
        "middle_name",
        "last_name",
        "preferred_name",
        "work_email",
        "personal_email",
        "phone_number",
        "date_of_birth",
        "date_of_joining",
        "employment_status",
        "probation_end_date",
        "confirmation_date",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    for field_name, model_class in model_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            if raw_value is None:
                setattr(item, relation_name, None)
            else:
                related = model_class.objects.filter(id=raw_value, tenant=tenant).first()
                if not related:
                    raise serializers.ValidationError({field_name: "Invalid selection."})
                setattr(item, relation_name, related)

    if "reporting_manager_id" in validated_data:
        reporting_manager_id = validated_data["reporting_manager_id"]
        if reporting_manager_id is None:
            item.reporting_manager = None
        else:
            if item.id and reporting_manager_id == item.id:
                raise serializers.ValidationError({"reporting_manager_id": "An employee cannot report to themselves."})
            manager = Employee.objects.filter(tenant=tenant, id=reporting_manager_id).first()
            if not manager:
                raise serializers.ValidationError({"reporting_manager_id": "Invalid selection."})
            item.reporting_manager = manager

    _validate_employee_structure_consistency(item)

    item.save()
    return item


def save_hr_admin_employee_access(actor, employee_id, validated_data):
    employee = Employee.objects.filter(tenant=actor.tenant, id=employee_id).select_related("membership__user").first()
    if not employee:
        raise serializers.ValidationError({"employee_id": "Employee not found."})

    membership = employee.membership
    user = membership.user if membership else None
    username = validated_data["username"]
    email = validated_data["email"]
    role_ids = validated_data.get("role_ids", [])
    if employee.employment_status in EMPLOYEE_INACTIVE_STATUSES:
        if validated_data.get("is_user_active", True):
            raise serializers.ValidationError(
                {"is_user_active": "Inactive or exited employees cannot keep an active user account."}
            )
        if validated_data.get("membership_status", MembershipStatus.ACTIVE) == MembershipStatus.ACTIVE:
            raise serializers.ValidationError(
                {"membership_status": "Inactive or exited employees cannot keep an active membership."}
            )
    if not role_ids:
        raise serializers.ValidationError({"role_ids": "Select at least one role."})
    valid_roles = list(Role.objects.filter(tenant=actor.tenant, id__in=role_ids, is_active=True))
    if len(valid_roles) != len(role_ids):
        raise serializers.ValidationError({"role_ids": "One or more selected roles are invalid."})

    conflicting_username = User.objects.filter(username__iexact=username)
    conflicting_email = User.objects.filter(email__iexact=email)
    if user:
        conflicting_username = conflicting_username.exclude(id=user.id)
        conflicting_email = conflicting_email.exclude(id=user.id)
    if not user:
        existing_username_user = conflicting_username.first()
        existing_email_user = conflicting_email.first()
        if existing_username_user and existing_email_user and existing_username_user != existing_email_user:
            raise serializers.ValidationError({"email": "Username and email point to different existing users."})
        reusable_user = existing_username_user or existing_email_user
        if reusable_user:
            existing_membership = TenantMembership.objects.filter(user=reusable_user, tenant=actor.tenant).exclude(id=membership.id if membership else None).first()
            if existing_membership:
                raise serializers.ValidationError({"email": "This user already belongs to the current tenant."})
            user = reusable_user
    if conflicting_username.exists() and (user is None or conflicting_username.exclude(id=user.id).exists()):
        raise serializers.ValidationError({"username": "This username is already in use."})
    if conflicting_email.exists() and (user is None or conflicting_email.exclude(id=user.id).exists()):
        raise serializers.ValidationError({"email": "This email is already in use."})

    generated_password = None
    password = validated_data.get("password") or ""
    if not user:
        user = User(
            username=username,
            email=email,
        )
        if not password:
            generated_password = secrets.token_urlsafe(10)
            password = generated_password
        user.set_password(password)
    elif password:
        user.set_password(password)

    user.username = username
    user.email = email
    user.first_name = validated_data.get("first_name", user.first_name)
    user.last_name = validated_data.get("last_name", user.last_name)
    user.display_name = validated_data.get("display_name") or " ".join(
        part for part in [validated_data.get("first_name", user.first_name), validated_data.get("last_name", user.last_name)] if part
    )
    user.phone_number = validated_data.get("phone_number", user.phone_number)
    user.is_active = validated_data.get("is_user_active", True)
    user.must_change_password = validated_data.get("must_change_password", True)
    user.save()

    if not membership:
        membership = TenantMembership(
            tenant=actor.tenant,
            user=user,
        )

    if validated_data.get("is_default_membership", True):
        TenantMembership.objects.filter(user=user).exclude(id=membership.id).update(is_default=False)

    membership.user = user
    membership.tenant = actor.tenant
    membership.employee_code = employee.employee_code
    membership.status = validated_data.get("membership_status", MembershipStatus.ACTIVE)
    membership.is_default = validated_data.get("is_default_membership", True)
    membership.save()

    employee.membership = membership
    employee.save(update_fields=["membership"])

    membership.membership_roles.exclude(role_id__in=role_ids).delete()
    for index, role_id in enumerate(role_ids):
        membership.membership_roles.update_or_create(
            role_id=role_id,
            defaults={"is_primary": index == 0},
        )
    if not role_ids:
        membership.membership_roles.all().delete()
    else:
        membership.membership_roles.exclude(role_id=role_ids[0]).update(is_primary=False)

    payload = get_hr_admin_employee_access_detail(actor, employee.id)
    payload["generated_password"] = generated_password
    payload["password_was_reset"] = bool(password)
    return payload


ORGANIZATION_MODEL_MAP = {
    "legal_entities": LegalEntity,
    "locations": Location,
    "branches": Branch,
    "business_units": BusinessUnit,
    "departments": Department,
    "cost_centers": CostCenter,
    "grades": Grade,
    "designations": Designation,
    "employment_types": EmploymentType,
}


def _get_organization_deactivation_conflicts(*, tenant, section: str, item) -> list[str]:
    if section == "legal_entities":
        conflicts = []
        if Employee.objects.filter(tenant=tenant, legal_entity=item).exists():
            conflicts.append("linked employees")
        if Branch.objects.filter(tenant=tenant, legal_entity=item).exists():
            conflicts.append("linked branches")
        if CostCenter.objects.filter(tenant=tenant, legal_entity=item).exists():
            conflicts.append("linked cost centers")
        return conflicts
    if section == "locations":
        conflicts = []
        if Employee.objects.filter(tenant=tenant, location=item).exists():
            conflicts.append("linked employees")
        if Branch.objects.filter(tenant=tenant, location=item).exists():
            conflicts.append("linked branches")
        return conflicts
    if section == "branches":
        return ["linked employees"] if Employee.objects.filter(tenant=tenant, branch=item).exists() else []
    if section == "business_units":
        conflicts = []
        if Employee.objects.filter(tenant=tenant, business_unit=item).exists():
            conflicts.append("linked employees")
        if BusinessUnit.objects.filter(tenant=tenant, parent=item).exists():
            conflicts.append("child business units")
        if Department.objects.filter(tenant=tenant, business_unit=item).exists():
            conflicts.append("linked departments")
        return conflicts
    if section == "departments":
        conflicts = []
        if Employee.objects.filter(tenant=tenant, department=item).exists():
            conflicts.append("linked employees")
        if Department.objects.filter(tenant=tenant, parent=item).exists():
            conflicts.append("child departments")
        return conflicts
    if section == "cost_centers":
        return ["linked employees"] if Employee.objects.filter(tenant=tenant, cost_center=item).exists() else []
    if section == "grades":
        conflicts = []
        if Employee.objects.filter(tenant=tenant, grade=item).exists():
            conflicts.append("linked employees")
        if Designation.objects.filter(tenant=tenant, grade=item).exists():
            conflicts.append("linked designations")
        return conflicts
    if section == "designations":
        return ["linked employees"] if Employee.objects.filter(tenant=tenant, designation=item).exists() else []
    if section == "employment_types":
        return ["linked employees"] if Employee.objects.filter(tenant=tenant, employment_type=item).exists() else []
    return []


def save_hr_admin_organization_item(actor, section: str, validated_data, *, item=None):
    model_class = ORGANIZATION_MODEL_MAP.get(section)
    if model_class is None:
        raise serializers.ValidationError({"section": "Unsupported organization section."})

    tenant = actor.tenant
    if item is None:
        item = model_class(tenant=tenant)

    code = validated_data.get("code")
    if code:
        conflicting_item = model_class.objects.filter(
            tenant=tenant,
            code__iexact=code,
        )
        if item.id:
            conflicting_item = conflicting_item.exclude(id=item.id)
        if conflicting_item.exists():
            raise serializers.ValidationError({"code": "This code is already in use."})

    if item.id and validated_data.get("is_active") is False:
        conflicts = _get_organization_deactivation_conflicts(tenant=tenant, section=section, item=item)
        if conflicts:
            raise serializers.ValidationError(
                {"is_active": f"Cannot deactivate this record while it still has {', '.join(conflicts)}."}
            )

    for field in ["code", "name", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if section == "legal_entities":
        for field in ["registered_name", "country_code", "timezone", "primary_email", "primary_phone"]:
            if field in validated_data:
                setattr(item, field, validated_data[field])
    elif section == "locations":
        for field in ["address_line_1", "address_line_2", "city", "state", "postal_code", "country_code"]:
            if field in validated_data:
                setattr(item, field, validated_data[field])
    elif section == "branches":
        if "legal_entity_id" in validated_data:
            legal_entity = LegalEntity.objects.filter(id=validated_data["legal_entity_id"], tenant=tenant).first() if validated_data["legal_entity_id"] else None
            if validated_data["legal_entity_id"] and not legal_entity:
                raise serializers.ValidationError({"legal_entity_id": "Invalid selection."})
            item.legal_entity = legal_entity
        if "location_id" in validated_data:
            location = Location.objects.filter(id=validated_data["location_id"], tenant=tenant).first() if validated_data["location_id"] else None
            if validated_data["location_id"] and not location:
                raise serializers.ValidationError({"location_id": "Invalid selection."})
            item.location = location
        if "branch_type" in validated_data:
            item.branch_type = validated_data["branch_type"]
        if item.legal_entity_id is None:
            raise serializers.ValidationError({"legal_entity_id": "This field is required."})
    elif section == "business_units":
        if "parent_id" in validated_data:
            if item.id and validated_data["parent_id"] == item.id:
                raise serializers.ValidationError({"parent_id": "A business unit cannot be its own parent."})
            parent = BusinessUnit.objects.filter(id=validated_data["parent_id"], tenant=tenant).first() if validated_data["parent_id"] else None
            if validated_data["parent_id"] and not parent:
                raise serializers.ValidationError({"parent_id": "Invalid selection."})
            item.parent = parent
    elif section == "departments":
        if "parent_id" in validated_data:
            if item.id and validated_data["parent_id"] == item.id:
                raise serializers.ValidationError({"parent_id": "A department cannot be its own parent."})
            parent = Department.objects.filter(id=validated_data["parent_id"], tenant=tenant).first() if validated_data["parent_id"] else None
            if validated_data["parent_id"] and not parent:
                raise serializers.ValidationError({"parent_id": "Invalid selection."})
            item.parent = parent
        if "business_unit_id" in validated_data:
            business_unit = BusinessUnit.objects.filter(id=validated_data["business_unit_id"], tenant=tenant).first() if validated_data["business_unit_id"] else None
            if validated_data["business_unit_id"] and not business_unit:
                raise serializers.ValidationError({"business_unit_id": "Invalid selection."})
            item.business_unit = business_unit
    elif section == "cost_centers":
        if "legal_entity_id" in validated_data:
            legal_entity = LegalEntity.objects.filter(id=validated_data["legal_entity_id"], tenant=tenant).first() if validated_data["legal_entity_id"] else None
            if validated_data["legal_entity_id"] and not legal_entity:
                raise serializers.ValidationError({"legal_entity_id": "Invalid selection."})
            item.legal_entity = legal_entity
    elif section == "grades":
        if "level" in validated_data:
            item.level = validated_data["level"]
    elif section == "designations":
        if "grade_id" in validated_data:
            grade = Grade.objects.filter(id=validated_data["grade_id"], tenant=tenant).first() if validated_data["grade_id"] else None
            if validated_data["grade_id"] and not grade:
                raise serializers.ValidationError({"grade_id": "Invalid selection."})
            item.grade = grade
    elif section == "employment_types":
        for field in ["description", "is_payroll_eligible"]:
            if field in validated_data:
                setattr(item, field, validated_data[field])

    item.save()
    return item


def build_hr_admin_leave_type_payload(item: LeaveType) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "short_code": item.short_code,
        "category": item.category,
        "unit": item.unit,
        "color_code": item.color_code,
        "description": item.description,
        "is_active": item.is_active,
        "requires_attachment": item.requires_attachment,
        "allow_negative_balance": item.allow_negative_balance,
        "is_approval_required": item.is_approval_required,
        "source_kind": item.source_kind,
        "source_pack_code": item.source_pack_code,
        "source_item_key": item.source_item_key,
        "source_version": item.source_version,
        "delegation_mode": item.delegation_mode,
        "managed_by_platform": item.managed_by_platform,
        "platform_locked_fields": item.platform_locked_fields,
        **_build_platform_governance_payload(item),
    }


def save_hr_admin_leave_type(actor, validated_data, *, item=None):
    if item is None:
        item = LeaveType(tenant=actor.tenant)
    else:
        _validate_platform_managed_policy_edit(item, validated_data, label="Leave type")

    for field in [
        "code",
        "name",
        "short_code",
        "category",
        "unit",
        "color_code",
        "description",
        "is_active",
        "requires_attachment",
        "allow_negative_balance",
        "is_approval_required",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    item.save()
    return item


def build_hr_admin_attendance_policy_payload(item: AttendancePolicy) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "status": item.status,
        "attendance_unit": item.attendance_unit,
        "default_shift_id": item.default_shift_id,
        "default_shift": item.default_shift.name if item.default_shift else None,
        "holiday_calendar_id": item.holiday_calendar_id,
        "holiday_calendar": item.holiday_calendar.name if item.holiday_calendar else None,
        "full_day_min_hours": item.full_day_min_hours,
        "half_day_min_hours": item.half_day_min_hours,
        "late_mark_after_minutes": item.late_mark_after_minutes,
        "max_late_marks_in_period": item.max_late_marks_in_period,
        "overtime_threshold_minutes": item.overtime_threshold_minutes,
        "allow_manual_entry": item.allow_manual_entry,
        "allow_web_checkin": item.allow_web_checkin,
        "allow_mobile_checkin": item.allow_mobile_checkin,
        "allow_geofenced_checkin": item.allow_geofenced_checkin,
        "allow_regularization": item.allow_regularization,
        "require_regularization_reason": item.require_regularization_reason,
        "config_snapshot": normalize_attendance_policy_config(item.config_snapshot),
        "source_kind": item.source_kind,
        "source_pack_code": item.source_pack_code,
        "source_item_key": item.source_item_key,
        "source_version": item.source_version,
        "delegation_mode": item.delegation_mode,
        "managed_by_platform": item.managed_by_platform,
        "platform_locked_fields": item.platform_locked_fields,
        **_build_platform_governance_payload(item),
    }


def save_hr_admin_attendance_policy(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = AttendancePolicy(tenant=tenant)
    else:
        _validate_platform_managed_policy_edit(item, validated_data, label="Attendance policy")

    for field in [
        "code",
        "name",
        "status",
        "attendance_unit",
        "full_day_min_hours",
        "half_day_min_hours",
        "late_mark_after_minutes",
        "max_late_marks_in_period",
        "overtime_threshold_minutes",
        "allow_manual_entry",
        "allow_web_checkin",
        "allow_mobile_checkin",
        "allow_geofenced_checkin",
        "allow_regularization",
        "require_regularization_reason",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "default_shift_id" in validated_data:
        shift = Shift.objects.filter(tenant=tenant, id=validated_data["default_shift_id"]).first() if validated_data["default_shift_id"] else None
        if validated_data["default_shift_id"] and not shift:
            raise serializers.ValidationError({"default_shift_id": "Invalid selection."})
        item.default_shift = shift

    if "holiday_calendar_id" in validated_data:
        calendar = HolidayCalendar.objects.filter(tenant=tenant, id=validated_data["holiday_calendar_id"]).first() if validated_data["holiday_calendar_id"] else None
        if validated_data["holiday_calendar_id"] and not calendar:
            raise serializers.ValidationError({"holiday_calendar_id": "Invalid selection."})
        item.holiday_calendar = calendar

    if "config_snapshot" in validated_data:
        item.config_snapshot = normalize_attendance_policy_config(validated_data.get("config_snapshot"))

    item.save()
    return item


def build_hr_admin_shift_payload(item: Shift) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "start_time": item.start_time,
        "end_time": item.end_time,
        "working_hours": item.working_hours,
        "break_minutes": item.break_minutes,
        "grace_in_minutes": item.grace_in_minutes,
        "grace_out_minutes": item.grace_out_minutes,
        "is_night_shift": item.is_night_shift,
        "is_flexible": item.is_flexible,
        "weekly_off_days": item.weekly_off_days,
        "is_active": item.is_active,
        "source_kind": item.source_kind,
        "source_pack_code": item.source_pack_code,
        "source_item_key": item.source_item_key,
        "source_version": item.source_version,
        "delegation_mode": item.delegation_mode,
        "managed_by_platform": item.managed_by_platform,
        "platform_locked_fields": item.platform_locked_fields,
        **_build_platform_governance_payload(item),
    }


def save_hr_admin_shift(actor, validated_data, *, item=None):
    if item is None:
        item = Shift(tenant=actor.tenant)
    else:
        _validate_platform_managed_policy_edit(item, validated_data, label="Shift")

    for field in [
        "code",
        "name",
        "start_time",
        "end_time",
        "working_hours",
        "break_minutes",
        "grace_in_minutes",
        "grace_out_minutes",
        "is_night_shift",
        "is_flexible",
        "weekly_off_days",
        "is_active",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    item.save()
    return item


def build_hr_admin_holiday_calendar_payload(item: HolidayCalendar) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "location_id": item.location_id,
        "location": item.location.name if item.location else None,
        "year": item.year,
        "is_active": item.is_active,
        "source_kind": item.source_kind,
        "source_pack_code": item.source_pack_code,
        "source_item_key": item.source_item_key,
        "source_version": item.source_version,
        "delegation_mode": item.delegation_mode,
        "managed_by_platform": item.managed_by_platform,
        "platform_locked_fields": item.platform_locked_fields,
        **_build_platform_governance_payload(item),
        "holidays": [
            {
                "id": holiday.id,
                "date": holiday.date,
                "name": holiday.name,
                "description": holiday.description,
                "holiday_type": holiday.holiday_type,
                "is_optional": holiday.is_optional,
            }
            for holiday in item.holidays.all().order_by("date", "name")
        ],
    }


def save_hr_admin_holiday_calendar(actor, validated_data, *, item=None):
    tenant = actor.tenant
    holiday_rows = validated_data.pop("holidays", None)
    if item is None:
        item = HolidayCalendar(tenant=tenant)
    else:
        _validate_platform_managed_policy_edit(item, validated_data, label="Holiday calendar")

    for field in ["code", "name", "year", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "location_id": Location,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, relation_name, related)

    item.save()

    if holiday_rows is not None:
        existing_by_id = {str(holiday.id): holiday for holiday in item.holidays.all()}
        incoming_ids = set()
        for holiday_data in holiday_rows:
            holiday_id = str(holiday_data.get("id")) if holiday_data.get("id") else None
            if holiday_id and holiday_id in existing_by_id:
                holiday = existing_by_id[holiday_id]
                incoming_ids.add(holiday_id)
            else:
                holiday = Holiday(calendar=item)
            holiday.date = holiday_data["date"]
            holiday.name = holiday_data["name"]
            holiday.description = holiday_data.get("description", "")
            holiday.holiday_type = holiday_data.get("holiday_type", HolidayType.GENERAL)
            holiday.is_optional = holiday_data.get("is_optional", False)
            holiday.save()
            incoming_ids.add(str(holiday.id))

        for holiday_id, holiday in existing_by_id.items():
            if holiday_id not in incoming_ids:
                holiday.delete()

    return item


def build_hr_admin_attendance_record_payload(item: AttendanceRecord) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.employee_code,
        "department": item.employee.department.name if item.employee.department else None,
        "designation": item.employee.designation.name if item.employee.designation else None,
        "attendance_date": item.attendance_date,
        "status": item.status,
        "source": item.source,
        "shift_id": item.shift_id,
        "shift": item.shift.name if item.shift else None,
        "holiday_id": item.holiday_id,
        "holiday": item.holiday.name if item.holiday else None,
        "check_in_at": item.check_in_at,
        "check_out_at": item.check_out_at,
        "work_duration_hours": item.work_duration_hours,
        "overtime_hours": item.overtime_hours,
        "late_minutes": item.late_minutes,
        "early_exit_minutes": item.early_exit_minutes,
        "is_regularized": item.is_regularized,
        "is_locked": item.is_locked,
        "notes": item.notes,
    }


def build_hr_admin_attendance_regularization_payload(item: AttendanceRegularization) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee.id,
        "employee_code": item.employee.employee_code,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.employee_code,
        "department": item.employee.department.name if item.employee.department else None,
        "designation": item.employee.designation.name if item.employee.designation else None,
        "attendance_record_id": item.attendance_record.id,
        "attendance_date": item.attendance_record.attendance_date,
        "current_status": item.attendance_record.status,
        "requested_status": item.requested_status,
        "shift": item.attendance_record.shift.name if item.attendance_record.shift else None,
        "requested_check_in_at": item.requested_check_in_at,
        "requested_check_out_at": item.requested_check_out_at,
        "actual_check_in_at": item.attendance_record.check_in_at,
        "actual_check_out_at": item.attendance_record.check_out_at,
        "status": item.status,
        "reason": item.reason,
        "manager_comment": item.manager_comment,
        "rejection_reason": item.rejection_reason,
        "workflow_reference": item.workflow_reference,
        "applied_at": item.applied_at,
        "resolved_at": item.resolved_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def save_hr_admin_attendance_record(actor, validated_data, *, item: AttendanceRecord):
    tenant = actor.tenant
    explicit_status = validated_data.get("status", item.status)
    next_check_in_at = validated_data.get("check_in_at", item.check_in_at)
    next_check_out_at = validated_data.get("check_out_at", item.check_out_at)

    for field in [
        "source",
        "is_regularized",
        "is_locked",
        "notes",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "shift_id" in validated_data:
        shift_id = validated_data["shift_id"]
        shift = Shift.objects.filter(tenant=tenant, id=shift_id).first() if shift_id else None
        if shift_id and not shift:
            raise serializers.ValidationError({"shift_id": "Invalid selection."})
        item.shift = shift
    runtime = evaluate_attendance_runtime(
        employee=item.employee,
        attendance_date=item.attendance_date,
        check_in_at=next_check_in_at,
        check_out_at=next_check_out_at,
        explicit_status=explicit_status,
        shift=item.shift,
    )
    item.status = runtime["status"]
    item.shift = runtime["shift"]
    item.holiday = runtime["holiday"]
    item.check_in_at = next_check_in_at
    item.check_out_at = next_check_out_at
    item.work_duration_hours = validated_data.get("work_duration_hours", runtime["work_duration_hours"])
    item.overtime_hours = validated_data.get("overtime_hours", runtime["overtime_hours"])
    item.late_minutes = validated_data.get("late_minutes", runtime["late_minutes"])
    item.early_exit_minutes = validated_data.get("early_exit_minutes", runtime["early_exit_minutes"])

    item.save()
    return item


def build_hr_admin_leave_policy_payload(item: LeavePolicy) -> dict:
    return {
        "id": item.id,
        "leave_type_id": item.leave_type_id,
        "leave_type": item.leave_type.name,
        "code": item.code,
        "name": item.name,
        "status": item.status,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "accrual_frequency": item.accrual_frequency,
        "annual_entitlement": item.annual_entitlement,
        "max_carry_forward": item.max_carry_forward,
        "max_consecutive_days": item.max_consecutive_days,
        "min_days_per_request": item.min_days_per_request,
        "notice_days_required": item.notice_days_required,
        "allow_half_day": item.allow_half_day,
        "allow_backdated_application": item.allow_backdated_application,
        "allow_weekend_holiday_overlap": item.allow_weekend_holiday_overlap,
        "sandwich_rule_enabled": item.sandwich_rule_enabled,
        "is_probation_eligible": item.is_probation_eligible,
        "gender_restriction": item.gender_restriction,
        "marital_status_restriction": item.marital_status_restriction,
        "minimum_service_days": item.minimum_service_days,
        "config_snapshot": normalize_leave_policy_config(item.config_snapshot),
        "source_kind": item.source_kind,
        "source_pack_code": item.source_pack_code,
        "source_item_key": item.source_item_key,
        "source_version": item.source_version,
        "delegation_mode": item.delegation_mode,
        "managed_by_platform": item.managed_by_platform,
        "platform_locked_fields": item.platform_locked_fields,
        **_build_platform_governance_payload(item),
    }


def save_hr_admin_leave_policy(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = LeavePolicy(tenant=tenant)
    else:
        _validate_platform_managed_policy_edit(item, validated_data, label="Leave policy")

    if "leave_type_id" in validated_data:
        leave_type = LeaveType.objects.filter(tenant=tenant, id=validated_data["leave_type_id"]).first() if validated_data["leave_type_id"] else None
        if validated_data["leave_type_id"] and not leave_type:
            raise serializers.ValidationError({"leave_type_id": "Invalid selection."})
        item.leave_type = leave_type

    for field in [
        "code",
        "name",
        "status",
        "effective_from",
        "effective_to",
        "accrual_frequency",
        "annual_entitlement",
        "max_carry_forward",
        "max_consecutive_days",
        "min_days_per_request",
        "notice_days_required",
        "allow_half_day",
        "allow_backdated_application",
        "allow_weekend_holiday_overlap",
        "sandwich_rule_enabled",
        "is_probation_eligible",
        "gender_restriction",
        "marital_status_restriction",
        "minimum_service_days",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    item.config_snapshot = normalize_leave_policy_config(
        validated_data["config_snapshot"] if "config_snapshot" in validated_data else item.config_snapshot
    )

    if item.leave_type_id is None:
        raise serializers.ValidationError({"leave_type_id": "This field is required."})

    item.save()
    return item


def build_hr_admin_assignment_payload(item, *, policy_id_field: str, policy_name: str, include_location: bool = False) -> dict:
    payload = {
        "id": item.id,
        "policy_id": getattr(item, policy_id_field),
        "policy_name": getattr(item, policy_name),
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "grade_id": item.grade_id,
        "grade": item.grade.name if item.grade else None,
        "employment_type_id": item.employment_type_id,
        "employment_type": item.employment_type.name if item.employment_type else None,
        "employee_id": item.employee_id,
        "employee": f"{item.employee.first_name} {item.employee.last_name}".strip() if item.employee else None,
        "priority": item.priority,
        "is_active": item.is_active,
    }
    if include_location:
        payload["location_id"] = item.location_id
        payload["location"] = item.location.name if item.location else None
    else:
        payload["location_id"] = None
        payload["location"] = None
    return payload


def save_hr_admin_leave_policy_assignment(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = LeavePolicyAssignment(tenant=tenant)

    if "leave_policy_id" in validated_data:
        leave_policy = LeavePolicy.objects.filter(tenant=tenant, id=validated_data["leave_policy_id"]).first() if validated_data["leave_policy_id"] else None
        if validated_data["leave_policy_id"] and not leave_policy:
            raise serializers.ValidationError({"leave_policy_id": "Invalid selection."})
        item.leave_policy = leave_policy

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "department_id": Department,
        "grade_id": Grade,
        "employment_type_id": EmploymentType,
        "employee_id": Employee,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, relation_name, related)

    for field in ["priority", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.leave_policy_id is None:
        raise serializers.ValidationError({"leave_policy_id": "This field is required."})
    conflict_check = preview_leave_policy_assignment_conflicts(
        tenant=tenant,
        leave_policy=item.leave_policy,
        scope_data={
            "legal_entity_id": item.legal_entity_id,
            "branch_id": item.branch_id,
            "department_id": item.department_id,
            "grade_id": item.grade_id,
            "employment_type_id": item.employment_type_id,
            "employee_id": item.employee_id,
        },
        priority=item.priority,
        item_id=str(item.id) if item.id else None,
    )
    if item.is_active and conflict_check["has_blocking_conflict"]:
        raise serializers.ValidationError(
            {
                "detail": conflict_check["summary"],
                "conflict_check": conflict_check,
            }
        )
    item.save()
    return item


def build_hr_admin_leave_assignment_governance_payload(*, tenant, item):
    conflict_check = preview_leave_policy_assignment_conflicts(
        tenant=tenant,
        leave_policy=item.leave_policy,
        scope_data={
            "legal_entity_id": item.legal_entity_id,
            "branch_id": item.branch_id,
            "department_id": item.department_id,
            "grade_id": item.grade_id,
            "employment_type_id": item.employment_type_id,
            "employee_id": item.employee_id,
        },
        priority=item.priority,
        item_id=str(item.id),
    )
    return {
        "leave_type_id": str(item.leave_policy.leave_type_id),
        "leave_type_name": item.leave_policy.leave_type.name,
        "scope_labels": conflict_check["candidate_scope"],
        "conflict_count": len(conflict_check["conflicts"]),
        "has_blocking_conflict": conflict_check["has_blocking_conflict"],
        "conflict_summary": conflict_check["summary"],
    }


def build_hr_admin_leave_balance_payload(item: LeaveBalance) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip(),
        "employee_code": item.employee.employee_code,
        "leave_policy_id": item.leave_policy_id,
        "leave_policy_name": item.leave_policy.name,
        "leave_type_id": item.leave_policy.leave_type_id,
        "leave_type_name": item.leave_policy.leave_type.name,
        "period_year": item.period_year,
        "opening_balance": item.opening_balance,
        "accrued_amount": item.accrued_amount,
        "carry_forward_amount": item.carry_forward_amount,
        "consumed_amount": item.consumed_amount,
        "reserved_amount": item.reserved_amount,
        "encashed_amount": item.encashed_amount,
        "adjustment_amount": item.adjustment_amount,
        "closing_balance": item.closing_balance,
    }


def build_hr_admin_leave_balance_transaction_payload(item: LeaveBalanceTransaction, *, actor=None) -> dict:
    performed_by = item.performed_by
    reviewed_by = item.reviewed_by
    return {
        "id": item.id,
        "leave_balance_id": item.leave_balance_id,
        "employee_id": item.employee_id,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip(),
        "employee_code": item.employee.employee_code,
        "leave_policy_id": item.leave_policy_id,
        "leave_policy_name": item.leave_policy.name,
        "status": item.status,
        "action": item.action,
        "units": item.units,
        "effective_date": item.effective_date,
        "reason": item.reason,
        "performed_by_id": performed_by.id if performed_by else None,
        "performed_by_name": f"{performed_by.first_name} {performed_by.last_name}".strip() if performed_by else None,
        "reviewed_by_id": reviewed_by.id if reviewed_by else None,
        "reviewed_by_name": f"{reviewed_by.first_name} {reviewed_by.last_name}".strip() if reviewed_by else None,
        "reviewed_at": item.reviewed_at,
        "rejection_reason": item.rejection_reason,
        "approval_reason": item.metadata.get("approval_reason"),
        "reviewer_employee_id": item.metadata.get("reviewer_employee_id"),
        "reviewer_employee_name": item.metadata.get("reviewer_employee_name"),
        "can_current_actor_review": bool(actor and _employee_can_review_leave_balance_transaction(employee=actor, transaction_item=item)),
        "closing_balance_before": item.closing_balance_before,
        "closing_balance_after": item.closing_balance_after,
        "created_at": item.created_at,
    }


def save_hr_admin_attendance_policy_assignment(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = AttendancePolicyAssignment(tenant=tenant)

    if "attendance_policy_id" in validated_data:
        attendance_policy = AttendancePolicy.objects.filter(tenant=tenant, id=validated_data["attendance_policy_id"]).first() if validated_data["attendance_policy_id"] else None
        if validated_data["attendance_policy_id"] and not attendance_policy:
            raise serializers.ValidationError({"attendance_policy_id": "Invalid selection."})
        item.attendance_policy = attendance_policy

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "location_id": Location,
        "department_id": Department,
        "grade_id": Grade,
        "employment_type_id": EmploymentType,
        "employee_id": Employee,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, relation_name, related)

    for field in ["priority", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.attendance_policy_id is None:
        raise serializers.ValidationError({"attendance_policy_id": "This field is required."})
    conflict_check = preview_attendance_policy_assignment_conflicts(
        tenant=tenant,
        attendance_policy=item.attendance_policy,
        scope_data={
            "legal_entity_id": item.legal_entity_id,
            "branch_id": item.branch_id,
            "location_id": item.location_id,
            "department_id": item.department_id,
            "grade_id": item.grade_id,
            "employment_type_id": item.employment_type_id,
            "employee_id": item.employee_id,
        },
        priority=item.priority,
        item_id=str(item.id) if item.id else None,
    )
    if item.is_active and conflict_check["has_blocking_conflict"]:
        raise serializers.ValidationError(
            {
                "detail": conflict_check["summary"],
                "conflict_check": conflict_check,
            }
        )
    item.save()
    return item


def build_hr_admin_attendance_assignment_governance_payload(*, tenant, item):
    conflict_check = preview_attendance_policy_assignment_conflicts(
        tenant=tenant,
        attendance_policy=item.attendance_policy,
        scope_data={
            "legal_entity_id": item.legal_entity_id,
            "branch_id": item.branch_id,
            "location_id": item.location_id,
            "department_id": item.department_id,
            "grade_id": item.grade_id,
            "employment_type_id": item.employment_type_id,
            "employee_id": item.employee_id,
        },
        priority=item.priority,
        item_id=str(item.id),
    )
    return {
        "scope_labels": conflict_check["candidate_scope"],
        "conflict_count": len(conflict_check["conflicts"]),
        "has_blocking_conflict": conflict_check["has_blocking_conflict"],
        "conflict_summary": conflict_check["summary"],
    }


def build_hr_admin_employee_shift_assignment_payload(*, tenant, item):
    conflict_check = preview_employee_shift_assignment_conflicts(
        tenant=tenant,
        employee=item.employee,
        shift=item.shift,
        effective_from=item.effective_from,
        effective_to=item.effective_to,
        is_primary=item.is_primary,
        assignment_kind=item.assignment_kind,
        item_id=str(item.id),
    )
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.employee_code,
        "employee_code": item.employee.employee_code,
        "shift_id": item.shift_id,
        "shift": item.shift.name,
        "assignment_kind": item.assignment_kind,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "is_primary": item.is_primary,
        "config_snapshot": normalize_employee_shift_assignment_config(
            getattr(item, "config_snapshot", {}),
            fallback_shift_id=str(item.shift_id),
            effective_from=item.effective_from,
        ),
        "scope_labels": conflict_check["candidate_scope"],
        "conflict_count": len(conflict_check["conflicts"]),
        "has_blocking_conflict": conflict_check["has_blocking_conflict"],
        "conflict_summary": conflict_check["summary"],
    }


def save_hr_admin_employee_shift_assignment(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = EmployeeShiftAssignment(tenant=tenant)

    if "employee_id" in validated_data:
        employee_item = Employee.objects.filter(tenant=tenant, id=validated_data["employee_id"]).first() if validated_data["employee_id"] else None
        if validated_data["employee_id"] and not employee_item:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = employee_item

    if "shift_id" in validated_data:
        shift = Shift.objects.filter(tenant=tenant, id=validated_data["shift_id"]).first() if validated_data["shift_id"] else None
        if validated_data["shift_id"] and not shift:
            raise serializers.ValidationError({"shift_id": "Invalid selection."})
        item.shift = shift

    for field in ["effective_from", "effective_to", "is_primary", "assignment_kind"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    if item.shift_id is None:
        raise serializers.ValidationError({"shift_id": "This field is required."})
    if not item.effective_from:
        raise serializers.ValidationError({"effective_from": "This field is required."})
    if item.effective_to and item.effective_to < item.effective_from:
        raise serializers.ValidationError({"effective_to": "Effective to must be on or after effective from."})

    normalized_config = normalize_employee_shift_assignment_config(
        validated_data.get("config_snapshot", getattr(item, "config_snapshot", {})),
        fallback_shift_id=str(item.shift_id),
        effective_from=item.effective_from,
    )
    if item.assignment_kind == EmployeeShiftAssignmentKind.WEEKLY_ROTATION:
        entries = normalized_config["rotation"]["entries"]
        if not entries:
            raise serializers.ValidationError({"config_snapshot": "Weekly rotation assignments need at least one rotation step."})
        requested_shift_ids = {entry["shift_id"] for entry in entries}
        valid_shift_ids = {str(shift_item.id) for shift_item in Shift.objects.filter(tenant=tenant, id__in=requested_shift_ids)}
        invalid_shift_ids = sorted(requested_shift_ids - valid_shift_ids)
        if invalid_shift_ids:
            raise serializers.ValidationError({"config_snapshot": f"Invalid rotation shift selection: {', '.join(invalid_shift_ids)}."})
    item.config_snapshot = normalized_config

    conflict_check = preview_employee_shift_assignment_conflicts(
        tenant=tenant,
        employee=item.employee,
        shift=item.shift,
        effective_from=item.effective_from,
        effective_to=item.effective_to,
        is_primary=item.is_primary,
        assignment_kind=item.assignment_kind,
        item_id=str(item.id) if item.id else None,
    )
    if conflict_check["has_blocking_conflict"]:
        raise serializers.ValidationError(
            {
                "detail": conflict_check["summary"],
                "conflict_check": conflict_check,
            }
        )
    item.save()
    return item


def build_hr_admin_shift_roster_template_payload(item: ShiftRosterTemplate) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "description": item.description,
        "status": item.status,
        "shift_id": item.shift_id,
        "shift": item.shift.name,
        "assignment_kind": item.assignment_kind,
        "config_snapshot": normalize_employee_shift_assignment_config(
            getattr(item, "config_snapshot", {}),
            fallback_shift_id=str(item.shift_id),
        ),
    }


def save_hr_admin_shift_roster_template(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = ShiftRosterTemplate(tenant=tenant)

    if item.id and item.status == ShiftRosterTemplateStatus.LOCKED:
        editable_fields = {"status"}
        attempted_fields = {field for field in validated_data.keys() if field not in editable_fields}
        if attempted_fields:
            raise serializers.ValidationError({"detail": "Locked roster templates must be unlocked before editing."})

    if "shift_id" in validated_data:
        shift = Shift.objects.filter(tenant=tenant, id=validated_data["shift_id"]).first() if validated_data["shift_id"] else None
        if validated_data["shift_id"] and not shift:
            raise serializers.ValidationError({"shift_id": "Invalid selection."})
        item.shift = shift

    for field in ["code", "name", "description", "status", "assignment_kind"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.shift_id is None:
        raise serializers.ValidationError({"shift_id": "This field is required."})
    if not item.code:
        raise serializers.ValidationError({"code": "This field is required."})
    if not item.name:
        raise serializers.ValidationError({"name": "This field is required."})

    normalized_config = normalize_employee_shift_assignment_config(
        validated_data.get("config_snapshot", getattr(item, "config_snapshot", {})),
        fallback_shift_id=str(item.shift_id),
    )
    if item.assignment_kind == EmployeeShiftAssignmentKind.WEEKLY_ROTATION:
        entries = normalized_config["rotation"]["entries"]
        if not entries:
            raise serializers.ValidationError({"config_snapshot": "Weekly rotation templates need at least one rotation step."})
        requested_shift_ids = {entry["shift_id"] for entry in entries}
        valid_shift_ids = {str(shift_item.id) for shift_item in Shift.objects.filter(tenant=tenant, id__in=requested_shift_ids)}
        invalid_shift_ids = sorted(requested_shift_ids - valid_shift_ids)
        if invalid_shift_ids:
            raise serializers.ValidationError({"config_snapshot": f"Invalid rotation shift selection: {', '.join(invalid_shift_ids)}."})
    item.config_snapshot = normalized_config
    item.save()
    return item


def _build_shift_roster_rollout_scope_labels(scope_snapshot: dict) -> list[str]:
    labels: list[str] = []
    if scope_snapshot.get("employee_ids"):
        labels.append(f"Employees: {len(scope_snapshot['employee_ids'])} selected")
    if scope_snapshot.get("legal_entity_name"):
        labels.append(f"Legal entity: {scope_snapshot['legal_entity_name']}")
    if scope_snapshot.get("branch_name"):
        labels.append(f"Branch: {scope_snapshot['branch_name']}")
    if scope_snapshot.get("location_name"):
        labels.append(f"Location: {scope_snapshot['location_name']}")
    if scope_snapshot.get("department_name"):
        labels.append(f"Department: {scope_snapshot['department_name']}")
    return labels or ["Manual selection"]


def build_hr_admin_shift_roster_rollout_payload(item: ShiftRosterRollout) -> dict:
    return {
        "id": item.id,
        "template_id": item.template_id,
        "template_name": item.template.name,
        "status": item.status,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "is_primary": item.is_primary,
        "target_count": item.target_count,
        "created_count": item.created_count,
        "skipped_count": item.skipped_count,
        "summary": item.summary,
        "created_at": item.created_at,
        "scope_labels": _build_shift_roster_rollout_scope_labels(item.scope_snapshot or {}),
    }


def build_hr_admin_workflow_template_payload(item: WorkflowTemplate) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "module": item.module,
        "trigger_key": item.trigger_key,
        "description": item.description,
        "status": item.status,
        "version": item.version,
        "is_system_seeded": item.is_system_seeded,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "condition_snapshot": item.condition_snapshot,
        "steps": [
            {
                "id": step.id,
                "step_order": step.step_order,
                "name": step.name,
                "mode": step.mode,
                "actor_type": step.actor_type,
                "role_id": step.role_id,
                "role": step.role.name if step.role else None,
                "membership_id": step.membership_id,
                "membership": (
                    step.membership.user.display_name
                    or step.membership.user.get_full_name()
                    or step.membership.user.username
                ) if step.membership else None,
                "permission_key": step.permission_key,
                "scope_type": step.scope_type,
                "auto_approve_after_hours": step.auto_approve_after_hours,
                "escalate_after_hours": step.escalate_after_hours,
                "allow_delegate": step.allow_delegate,
                "allow_send_back": step.allow_send_back,
                "allow_comment": step.allow_comment,
                "rule_snapshot": step.rule_snapshot,
            }
            for step in item.steps.select_related("role", "membership__user").order_by("step_order")
        ],
    }


def save_hr_admin_workflow_template(actor, validated_data, *, item=None):
    tenant = actor.tenant
    step_payloads = validated_data.pop("steps", None)
    if item is None:
        item = WorkflowTemplate(tenant=tenant)

    with transaction.atomic():
        for field in [
            "code",
            "name",
            "module",
            "trigger_key",
            "description",
            "status",
            "version",
            "is_system_seeded",
            "effective_from",
            "effective_to",
        ]:
            if field in validated_data:
                setattr(item, field, validated_data[field])

        if "condition_snapshot" in validated_data:
            item.condition_snapshot = validated_data["condition_snapshot"] or {}

        item.save()

        if step_payloads is not None:
            resolved_steps = []
            for index, step_payload in enumerate(step_payloads, start=1):
                role = None
                membership = None
                if step_payload.get("role_id"):
                    role = Role.objects.filter(tenant=tenant, id=step_payload["role_id"], is_active=True).first()
                    if not role:
                        raise serializers.ValidationError({"steps": [f"Invalid role for step {index}."]})
                if step_payload.get("membership_id"):
                    membership = (
                        TenantMembership.objects.filter(tenant=tenant, id=step_payload["membership_id"])
                        .select_related("user")
                        .first()
                    )
                    if not membership:
                        raise serializers.ValidationError({"steps": [f"Invalid membership for step {index}."]})
                resolved_steps.append((index, step_payload, role, membership))

            item.steps.all().delete()
            for index, step_payload, role, membership in resolved_steps:
                WorkflowStep.objects.create(
                    template=item,
                    step_order=step_payload.get("step_order") or index,
                    name=step_payload["name"],
                    mode=step_payload.get("mode", WorkflowStepMode.SEQUENTIAL),
                    actor_type=step_payload.get("actor_type", WorkflowActorType.ROLE),
                    role=role,
                    membership=membership,
                    permission_key=step_payload.get("permission_key", ""),
                    scope_type=step_payload.get("scope_type", ""),
                    auto_approve_after_hours=step_payload.get("auto_approve_after_hours", 0),
                    escalate_after_hours=step_payload.get("escalate_after_hours", 0),
                    allow_delegate=step_payload.get("allow_delegate", True),
                    allow_send_back=step_payload.get("allow_send_back", True),
                    allow_comment=step_payload.get("allow_comment", True),
                    rule_snapshot=step_payload.get("rule_snapshot") or {},
                )

    return item


def _build_workflow_rule_enum_options(values) -> list[dict]:
    return [{"value": value, "label": value.replace("_", " ").title()} for value in values]


def _build_lifecycle_rule_options() -> dict:
    default_anchors = sorted(
        LIFECYCLE_COMMON_DUE_ANCHORS
        | LIFECYCLE_ONBOARDING_DUE_ANCHORS
        | LIFECYCLE_EXIT_DUE_ANCHORS
    )
    return {
        "supported_rule_snapshot_fields": [
            "due_anchor",
            "due_anchor_candidates",
            "due_offset_days",
            "due_offset_unit",
            "non_working_weekdays",
        ],
        "due_offset_units": [
            {"value": "calendar_days", "label": "Calendar Days"},
            {"value": "business_days", "label": "Business Days"},
        ],
        "non_working_weekdays": _build_workflow_rule_enum_options(LIFECYCLE_RULE_WEEKDAY_OPTIONS),
        "common_due_anchors": _build_workflow_rule_enum_options(sorted(LIFECYCLE_COMMON_DUE_ANCHORS)),
        "trigger_presets": [
            {
                "key": "onboarding",
                "label": "Onboarding Trigger",
                "match_terms": ["onboarding"],
                "allowed_due_anchors": _build_workflow_rule_enum_options(
                    sorted(LIFECYCLE_COMMON_DUE_ANCHORS | LIFECYCLE_ONBOARDING_DUE_ANCHORS)
                ),
            },
            {
                "key": "exit",
                "label": "Exit Or Clearance Trigger",
                "match_terms": ["exit", "clearance", "offboarding"],
                "allowed_due_anchors": _build_workflow_rule_enum_options(
                    sorted(LIFECYCLE_COMMON_DUE_ANCHORS | LIFECYCLE_EXIT_DUE_ANCHORS)
                ),
            },
            {
                "key": "default",
                "label": "Generic Lifecycle Trigger",
                "match_terms": [],
                "allowed_due_anchors": _build_workflow_rule_enum_options(default_anchors),
            },
        ],
    }


def build_hr_admin_workflow_assignment_payload(item: WorkflowTemplateAssignment) -> dict:
    return {
        "id": item.id,
        "template_id": item.template_id,
        "template_name": item.template.name,
        "module": item.template.module,
        "trigger_key": item.template.trigger_key,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "business_unit_id": item.business_unit_id,
        "business_unit": item.business_unit.name if item.business_unit else None,
        "grade_id": item.grade_id,
        "grade": item.grade.name if item.grade else None,
        "priority": item.priority,
        "is_active": item.is_active,
    }


def _format_membership_label(membership) -> str:
    if not membership:
        return ""
    user = membership.user
    return (user.display_name or user.get_full_name() or user.username or membership.employee_code or "").strip()


def _format_employee_label(employee: Employee | None) -> tuple[str, str]:
    if not employee:
        return "", ""
    return employee.employee_code, (f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code)


def _resolve_workflow_employee(instance: WorkflowInstance) -> Employee | None:
    identifier = (instance.employee_identifier or "").strip()
    if not identifier:
        identifier = str((instance.payload_snapshot or {}).get("employee_id") or "").strip()
    if not identifier:
        identifier = str((instance.payload_snapshot or {}).get("employee_code") or "").strip()
    if not identifier:
        return None

    employee = Employee.objects.filter(tenant=instance.tenant, employee_code__iexact=identifier).first()
    if employee:
        return employee
    try:
        return Employee.objects.filter(tenant=instance.tenant, id=identifier).first()
    except (ValueError, DjangoValidationError):
        return None


def _build_workflow_subject_label(instance: WorkflowInstance, employee: Employee | None) -> str:
    payload = instance.payload_snapshot or {}
    for key in ["subject_label", "title", "label", "request_label", "employee_name"]:
        value = str(payload.get(key) or "").strip()
        if value:
            return value
    if employee:
        employee_code, employee_name = _format_employee_label(employee)
        return f"{employee_code} - {employee_name}".strip(" -")
    return instance.subject_identifier


def _build_workflow_trace_assignment_payload(assignment: WorkflowAssignment) -> dict:
    role_name = assignment.role.name if assignment.role else None
    membership_name = _format_membership_label(assignment.membership)
    actor_label = membership_name or role_name or assignment.actor_identifier or assignment.actor_type
    return {
        "id": assignment.id,
        "actor_type": assignment.actor_type,
        "actor_identifier": assignment.actor_identifier,
        "actor_label": actor_label,
        "role_id": assignment.role_id,
        "role": role_name,
        "membership_id": assignment.membership_id,
        "membership": membership_name or None,
        "is_delegated": assignment.is_delegated,
        "delegated_from_identifier": assignment.delegated_from_identifier,
        "responded_at": assignment.responded_at,
    }


def _build_workflow_trace_step_payload(step) -> dict:
    now = timezone.now()
    assignments = [
        _build_workflow_trace_assignment_payload(assignment)
        for assignment in step.assignments.select_related("membership__user", "role").order_by("created_at")
    ]
    return {
        "id": step.id,
        "step_order": step.step_order,
        "name": step.name,
        "mode": step.mode,
        "status": step.status,
        "started_at": step.started_at,
        "due_at": step.due_at,
        "completed_at": step.completed_at,
        "resolved_action": step.resolved_action,
        "resolution_comment": step.resolution_comment,
        "is_overdue": bool(step.due_at and step.due_at < now and step.status in {WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS}),
        "assignments": assignments,
    }


def _workflow_action_title(action: str) -> str:
    return (action or "event").replace("_", " ").title()


def _build_workflow_trace_timeline(instance: WorkflowInstance, step_payloads: list[dict]) -> list[dict]:
    events = []
    action_logs = list(instance.action_logs.select_related("step_instance").order_by("created_at"))
    if instance.submitted_at and not any(log.action == "submit" for log in action_logs):
        events.append(
            {
                "id": f"{instance.id}:submitted",
                "occurred_at": instance.submitted_at,
                "action": "submit",
                "actor_identifier": instance.initiated_by_identifier,
                "title": "Workflow submitted",
                "detail": f"{instance.subject_type.replace('_', ' ').title()} entered approval.",
                "from_status": "",
                "to_status": WorkflowInstanceStatus.PENDING,
                "step_order": None,
                "step_name": "",
            }
        )

    for step in step_payloads:
        if step["started_at"]:
            events.append(
                {
                    "id": f"{step['id']}:started",
                    "occurred_at": step["started_at"],
                    "action": "step_started",
                    "actor_identifier": "",
                    "title": f"Step {step['step_order']} started",
                    "detail": step["name"],
                    "from_status": "",
                    "to_status": step["status"],
                    "step_order": step["step_order"],
                    "step_name": step["name"],
                }
            )
        if step["due_at"]:
            events.append(
                {
                    "id": f"{step['id']}:due",
                    "occurred_at": step["due_at"],
                    "action": "step_due",
                    "actor_identifier": "",
                    "title": f"Step {step['step_order']} due",
                    "detail": "SLA milestone for this approval step.",
                    "from_status": "",
                    "to_status": step["status"],
                    "step_order": step["step_order"],
                    "step_name": step["name"],
                }
            )
        if step["completed_at"]:
            events.append(
                {
                    "id": f"{step['id']}:completed",
                    "occurred_at": step["completed_at"],
                    "action": step["resolved_action"] or "step_completed",
                    "actor_identifier": "",
                    "title": f"Step {step['step_order']} completed",
                    "detail": step["resolution_comment"] or step["name"],
                    "from_status": "",
                    "to_status": step["status"],
                    "step_order": step["step_order"],
                    "step_name": step["name"],
                }
            )

    for log in action_logs:
        step = log.step_instance
        events.append(
            {
                "id": str(log.id),
                "occurred_at": log.created_at,
                "action": log.action,
                "actor_identifier": log.actor_identifier,
                "title": _workflow_action_title(log.action),
                "detail": log.comment or str(log.payload.get("summary") or log.payload.get("reason") or ""),
                "from_status": log.from_status,
                "to_status": log.to_status,
                "step_order": step.step_order if step else None,
                "step_name": step.name if step else "",
            }
        )

    return sorted(events, key=lambda item: (item["occurred_at"] is None, item["occurred_at"]), reverse=True)


def build_hr_admin_workflow_trace_payload(item: WorkflowInstance) -> dict:
    employee = _resolve_workflow_employee(item)
    employee_code, employee_name = _format_employee_label(employee)
    steps = [_build_workflow_trace_step_payload(step) for step in item.step_instances.order_by("step_order")]
    current_step = next((step for step in steps if step["step_order"] == item.current_step_order), None)
    current_actor_summary = ""
    if current_step:
        current_actor_summary = ", ".join(
            assignment["actor_label"] for assignment in current_step["assignments"] if assignment["actor_label"]
        )
    timeline = _build_workflow_trace_timeline(item, steps)
    return {
        "id": item.id,
        "module": item.module,
        "trigger_key": item.trigger_key,
        "subject_type": item.subject_type,
        "subject_identifier": item.subject_identifier,
        "subject_label": _build_workflow_subject_label(item, employee),
        "employee_id": employee.id if employee else None,
        "employee_code": employee_code,
        "employee_name": employee_name,
        "status": item.status,
        "current_step_order": item.current_step_order,
        "current_step_name": current_step["name"] if current_step else "",
        "current_actor_summary": current_actor_summary,
        "template_id": item.template_id,
        "template_name": item.template.name if item.template else "",
        "initiated_by_identifier": item.initiated_by_identifier,
        "submitted_at": item.submitted_at,
        "completed_at": item.completed_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "total_steps": len(steps),
        "completed_steps": sum(1 for step in steps if step["status"] in {WorkflowInstanceStatus.APPROVED, WorkflowInstanceStatus.COMPLETED}),
        "pending_steps": sum(1 for step in steps if step["status"] in {WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS}),
        "overdue_steps": sum(1 for step in steps if step["is_overdue"]),
        "assignment_count": sum(len(step["assignments"]) for step in steps),
        "timeline_event_count": len(timeline),
        "steps": steps,
        "timeline": timeline,
    }


def save_hr_admin_workflow_assignment(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = WorkflowTemplateAssignment(tenant=tenant)

    if "template_id" in validated_data:
        template = WorkflowTemplate.objects.filter(tenant=tenant, id=validated_data["template_id"]).first() if validated_data["template_id"] else None
        if validated_data["template_id"] and not template:
            raise serializers.ValidationError({"template_id": "Invalid selection."})
        item.template = template

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "department_id": Department,
        "business_unit_id": BusinessUnit,
        "grade_id": Grade,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, relation_name, related)

    for field in ["priority", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.template_id is None:
        raise serializers.ValidationError({"template_id": "This field is required."})

    item.save()
    return item


def build_hr_admin_document_category_payload(item: DocumentCategory) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "category_type": item.category_type,
        "description": item.description,
        "is_active": item.is_active,
        "is_system_seeded": item.is_system_seeded,
        "requires_expiry_date": item.requires_expiry_date,
        "requires_verification": item.requires_verification,
        "allow_employee_upload": item.allow_employee_upload,
        "allow_multiple_files": item.allow_multiple_files,
        "visibility_rules": item.visibility_rules,
    }


def save_hr_admin_document_category(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = DocumentCategory(tenant=tenant)

    for field in [
        "code",
        "name",
        "category_type",
        "description",
        "is_active",
        "is_system_seeded",
        "requires_expiry_date",
        "requires_verification",
        "allow_employee_upload",
        "allow_multiple_files",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "visibility_rules" in validated_data:
        item.visibility_rules = validated_data["visibility_rules"] or {}

    item.save()
    return item


def build_hr_admin_document_requirement_payload(item: DocumentRequirementRule) -> dict:
    return {
        "id": item.id,
        "category_id": item.category_id,
        "category_name": item.category.name,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "grade_id": item.grade_id,
        "grade": item.grade.name if item.grade else None,
        "employment_type_id": item.employment_type_id,
        "employment_type": item.employment_type.name if item.employment_type else None,
        "is_mandatory": item.is_mandatory,
        "required_within_days_of_joining": item.required_within_days_of_joining,
        "priority": item.priority,
        "is_active": item.is_active,
    }


def save_hr_admin_document_requirement(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = DocumentRequirementRule(tenant=tenant)

    if "category_id" in validated_data:
        category = DocumentCategory.objects.filter(tenant=tenant, id=validated_data["category_id"]).first() if validated_data["category_id"] else None
        if validated_data["category_id"] and not category:
            raise serializers.ValidationError({"category_id": "Invalid selection."})
        item.category = category

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "department_id": Department,
        "grade_id": Grade,
        "employment_type_id": EmploymentType,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            relation_name = field_name.replace("_id", "")
            related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, relation_name, related)

    for field in ["is_mandatory", "required_within_days_of_joining", "priority", "is_active"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if item.category_id is None:
        raise serializers.ValidationError({"category_id": "This field is required."})

    item.save()
    return item


def build_hr_admin_employee_document_payload(item: EmployeeDocument) -> dict:
    artifact = item.artifact
    replaced_by = item.replacement_versions.order_by("-created_at").first()
    version_history_items = (
        EmployeeDocument.objects.filter(tenant=item.tenant, employee=item.employee, category=item.category)
        .select_related("artifact")
        .order_by("-version_number", "-created_at")
    )
    review_history_items = item.verification_logs.order_by("-created_at")
    expiry_runtime = _get_employee_document_expiry_runtime(item)
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.employee_code,
        "category_id": item.category_id,
        "category_name": item.category.name,
        "artifact_id": artifact.id if artifact else None,
        "previous_document_id": item.previous_document_id,
        "replaced_by_document_id": replaced_by.id if replaced_by else None,
        "version_number": item.version_number,
        "title": item.title,
        "file_name": item.file_name,
        "file_url": item.file_url,
        "file_path": item.file_path,
        "mime_type": item.mime_type,
        "file_size_bytes": item.file_size_bytes,
        "status": item.status,
        "verification_status": item.verification_status,
        "document_number": item.document_number,
        "issued_on": item.issued_on,
        "expires_on": item.expires_on,
        "expiry_state": expiry_runtime["state"],
        "expiry_label": expiry_runtime["label"],
        "days_until_expiry": expiry_runtime["days_until_expiry"],
        "is_expired": expiry_runtime["is_expired"],
        "is_expiring_soon": expiry_runtime["is_expiring_soon"],
        "uploaded_by_identifier": item.uploaded_by_identifier,
        "verified_by_identifier": item.verified_by_identifier,
        "verified_at": item.verified_at,
        "rejection_reason": item.rejection_reason,
        "reupload_requested": item.reupload_requested,
        "reupload_requested_at": item.reupload_requested_at,
        "reupload_requested_by_identifier": item.reupload_requested_by_identifier,
        "version_history": [
            {
                "id": version_item.id,
                "version_number": version_item.version_number,
                "title": version_item.title,
                "status": version_item.status,
                "verification_status": version_item.verification_status,
                "file_name": version_item.file_name,
                "created_at": version_item.created_at,
            }
            for version_item in version_history_items
        ],
        "review_history": [
            {
                "id": log.id,
                "previous_status": log.previous_status,
                "new_status": log.new_status,
                "actor_identifier": log.actor_identifier,
                "comment": log.comment,
                "created_at": log.created_at,
            }
            for log in review_history_items
        ],
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _get_employee_document_expiry_runtime(item: EmployeeDocument, *, today=None) -> dict:
    reference_date = today or timezone.localdate()
    if not item.expires_on:
        return {
            "state": "no_expiry",
            "label": "No expiry",
            "days_until_expiry": None,
            "is_expired": False,
            "is_expiring_soon": False,
        }

    days_until_expiry = (item.expires_on - reference_date).days
    if days_until_expiry < 0:
        return {
            "state": "expired",
            "label": "Expired",
            "days_until_expiry": days_until_expiry,
            "is_expired": True,
            "is_expiring_soon": False,
        }
    if days_until_expiry <= 30:
        return {
            "state": "expiring_soon",
            "label": "Expiring soon",
            "days_until_expiry": days_until_expiry,
            "is_expired": False,
            "is_expiring_soon": True,
        }
    return {
        "state": "valid",
        "label": "Valid",
        "days_until_expiry": days_until_expiry,
        "is_expired": False,
        "is_expiring_soon": False,
    }


def create_hr_admin_employee_document(actor, validated_data) -> EmployeeDocument:
    target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
    if not target_employee:
        raise serializers.ValidationError({"employee_id": "Employee not found."})
    return _create_employee_document(actor, validated_data, employee=target_employee)


def _create_employee_document(actor, validated_data, *, employee: Employee) -> EmployeeDocument:
    tenant = actor.tenant
    category = DocumentCategory.objects.filter(tenant=tenant, id=validated_data["category_id"], is_active=True).first()
    if not category:
        raise serializers.ValidationError({"category_id": "Document category not found."})

    uploaded_file = validated_data["file"]
    accepted_mime_types = category.visibility_rules.get("accepted_mime_types", []) if isinstance(category.visibility_rules, dict) else []
    try:
        validate_uploaded_document_file(uploaded_file, accepted_mime_types=accepted_mime_types if isinstance(accepted_mime_types, list) else None)
    except ValueError as exc:
        raise serializers.ValidationError({"file": str(exc)}) from exc

    if category.requires_expiry_date and not validated_data.get("expires_on"):
        raise serializers.ValidationError({"expires_on": "Expiry date is required for this document category."})

    replacement_document = None
    replace_document_id = validated_data.get("replace_document_id")
    existing_active_queryset = EmployeeDocument.objects.filter(
        tenant=tenant,
        employee=employee,
        category=category,
        status=EmployeeDocumentStatus.ACTIVE,
    ).order_by("-created_at")

    if replace_document_id:
        replacement_document = existing_active_queryset.filter(id=replace_document_id).first()
        if not replacement_document:
            raise serializers.ValidationError({"replace_document_id": "Replacement target not found for this employee and category."})

    if not category.allow_multiple_files:
        existing_active = existing_active_queryset.exists()
        auto_replace_candidate = None
        if not replacement_document:
            auto_replace_candidate = existing_active_queryset.filter(
                Q(verification_status=VerificationStatus.REJECTED) | Q(reupload_requested=True)
            ).first()
            replacement_document = auto_replace_candidate

        if existing_active and not replacement_document:
            raise serializers.ValidationError(
                {"category_id": "An active document already exists for this employee and category. Replace or archive it first."}
            )

    artifact = store_document_artifact(
        tenant=tenant,
        employee=employee,
        uploaded_file=uploaded_file,
        actor_identifier=actor.employee_code,
        metadata={
            "category_id": str(category.id),
            "category_code": category.code,
            "employee_id": str(employee.id),
            "replacement_document_id": str(replacement_document.id) if replacement_document else "",
        },
    )

    if replacement_document:
        replacement_document.status = EmployeeDocumentStatus.REPLACED
        replacement_document.reupload_requested = False
        replacement_document.reupload_requested_at = None
        replacement_document.reupload_requested_by_identifier = ""
        replacement_document.save(update_fields=["status", "reupload_requested", "reupload_requested_at", "reupload_requested_by_identifier", "updated_at"])

    item = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        artifact=artifact,
        previous_document=replacement_document,
        version_number=(replacement_document.version_number + 1) if replacement_document else 1,
        title=(validated_data.get("title") or artifact.original_filename).strip() or artifact.original_filename,
        file_name=artifact.original_filename,
        file_path=artifact.storage_key,
        mime_type=artifact.mime_type,
        file_size_bytes=artifact.file_size_bytes,
        document_number=validated_data.get("document_number", ""),
        issued_on=validated_data.get("issued_on"),
        expires_on=validated_data.get("expires_on"),
        uploaded_by_identifier=actor.employee_code,
        verification_status=VerificationStatus.PENDING if category.requires_verification else VerificationStatus.VERIFIED,
    )
    item.file_url = f"/api/v1/hr-admin/employee-documents/{item.id}/download/"
    if item.verification_status == VerificationStatus.VERIFIED:
        item.verified_at = timezone.now()
        item.verified_by_identifier = actor.employee_code
    item.save(update_fields=["file_url", "verification_status", "verified_at", "verified_by_identifier", "updated_at"])
    return item


def create_self_service_employee_document(actor, validated_data) -> EmployeeDocument:
    category = DocumentCategory.objects.filter(tenant=actor.tenant, id=validated_data["category_id"], is_active=True).first()
    if not category:
        raise serializers.ValidationError({"category_id": "Document category not found."})
    if not category.allow_employee_upload:
        raise serializers.ValidationError({"category_id": "Employees cannot upload this document category directly."})
    item = _create_employee_document(actor, validated_data, employee=actor)
    item.file_url = f"/api/v1/me/employee-documents/{item.id}/download/"
    item.save(update_fields=["file_url", "updated_at"])
    _notify_document_upload_submitted(document=item, actor=actor)
    return item


def save_hr_admin_employee_document(actor, validated_data, *, item: EmployeeDocument):
    previous_verification_status = item.verification_status
    previous_reupload_requested = item.reupload_requested
    verification_changed = False

    for field in [
        "title",
        "status",
        "document_number",
        "issued_on",
        "expires_on",
        "rejection_reason",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "reupload_requested" in validated_data:
        item.reupload_requested = bool(validated_data["reupload_requested"])
        if item.reupload_requested:
            item.reupload_requested_at = timezone.now()
            item.reupload_requested_by_identifier = actor.employee_code
        else:
            item.reupload_requested_at = None
            item.reupload_requested_by_identifier = ""

    if "verification_status" in validated_data:
        item.verification_status = validated_data["verification_status"]
        verification_changed = previous_verification_status != item.verification_status
        if item.verification_status == VerificationStatus.VERIFIED:
            item.verified_at = timezone.now()
            item.verified_by_identifier = actor.employee_code
            item.rejection_reason = ""
            item.reupload_requested = False
            item.reupload_requested_at = None
            item.reupload_requested_by_identifier = ""
        elif item.verification_status == VerificationStatus.REJECTED:
            item.verified_by_identifier = actor.employee_code
            if validated_data.get("reupload_requested") is None:
                item.reupload_requested = True
                item.reupload_requested_at = timezone.now()
                item.reupload_requested_by_identifier = actor.employee_code
        elif item.verification_status == VerificationStatus.PENDING:
            item.verified_at = None
            item.verified_by_identifier = ""

    item.save()

    if verification_changed:
        DocumentVerificationLog.objects.create(
            tenant=actor.tenant,
            employee_document=item,
            previous_status=previous_verification_status,
            new_status=item.verification_status,
            actor_identifier=actor.employee_code,
            comment=validated_data.get("rejection_reason", ""),
        )

    if item.reupload_requested and not previous_reupload_requested:
        _notify_document_reupload_requested(document=item)

    return item


LETTER_VARIABLE_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_.-]+)\s*}}")


def _generated_letter_employee_name(employee: Employee) -> str:
    return f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code


def _build_generated_letter_context(*, employee: Employee, issue_date_value=None, payload_values: dict | None = None) -> dict:
    issue_date_final = issue_date_value or timezone.localdate()
    context = {
        "employee_id": str(employee.id),
        "employee_code": employee.employee_code,
        "employee_name": _generated_letter_employee_name(employee),
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "work_email": employee.work_email,
        "date_of_joining": employee.date_of_joining.isoformat() if employee.date_of_joining else "",
        "issue_date": issue_date_final.isoformat(),
        "legal_entity": employee.legal_entity.name if employee.legal_entity else "",
        "branch": employee.branch.name if employee.branch else "",
        "location": employee.location.name if employee.location else "",
        "department": employee.department.name if employee.department else "",
        "business_unit": employee.business_unit.name if employee.business_unit else "",
        "cost_center": employee.cost_center.name if employee.cost_center else "",
        "designation": employee.designation.name if employee.designation else "",
        "grade": employee.grade.name if employee.grade else "",
        "employment_type": employee.employment_type.name if employee.employment_type else "",
        "reporting_manager": _generated_letter_employee_name(employee.reporting_manager) if employee.reporting_manager else "",
    }
    for key, value in (payload_values or {}).items():
        normalized_key = str(key or "").strip()
        if normalized_key:
            context[normalized_key] = "" if value is None else str(value)
    return context


def preview_hr_admin_generated_letter(actor, validated_data) -> dict:
    target_employee = (
        Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"])
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "cost_center",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
        )
        .first()
    )
    if not target_employee:
        raise serializers.ValidationError({"employee_id": "Employee not found."})

    template_body = validated_data["template_body"]
    used_variables = sorted(set(LETTER_VARIABLE_PATTERN.findall(template_body)))
    context = _build_generated_letter_context(
        employee=target_employee,
        issue_date_value=validated_data.get("issue_date"),
        payload_values=validated_data.get("payload_values") or {},
    )
    missing_variables = [variable for variable in used_variables if variable not in context or context[variable] == ""]
    if missing_variables:
        raise serializers.ValidationError({"template_body": f"Missing value for: {', '.join(missing_variables)}."})

    def replace_variable(match):
        return str(context.get(match.group(1), ""))

    rendered_text = LETTER_VARIABLE_PATTERN.sub(replace_variable, template_body)
    return {
        "rendered_text": rendered_text,
        "missing_variables": [],
        "used_variables": used_variables,
        "payload": {
            "letter_type": validated_data.get("letter_type") or LetterType.OTHER,
            "title": validated_data.get("title", ""),
            "template_code": validated_data.get("template_code", ""),
            "issue_date": context["issue_date"],
            "workflow_reference": validated_data.get("workflow_reference", ""),
            "context": context,
            "template_body": template_body,
        },
    }


def build_hr_admin_generated_letter_payload(item: GeneratedLetter) -> dict:
    snapshot = item.payload_snapshot if isinstance(item.payload_snapshot, dict) else {}
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": _generated_letter_employee_name(item.employee),
        "artifact_id": item.artifact_id,
        "letter_type": item.letter_type,
        "title": item.title,
        "template_code": item.template_code,
        "status": item.status,
        "issue_date": item.issue_date,
        "file_name": item.file_name,
        "file_url": item.file_url,
        "file_path": item.file_path,
        "workflow_reference": item.workflow_reference,
        "payload_snapshot": snapshot,
        "rendered_text": str(snapshot.get("rendered_text") or ""),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def create_hr_admin_generated_letter(actor, validated_data) -> GeneratedLetter:
    preview_payload = preview_hr_admin_generated_letter(actor, validated_data)
    target_employee = Employee.objects.get(tenant=actor.tenant, id=validated_data["employee_id"])
    title = validated_data["title"].strip()
    issue_date_value = validated_data.get("issue_date") or timezone.localdate()
    file_name = f"{slugify(title) or 'generated-letter'}-{issue_date_value.isoformat()}.txt"
    content_file = ContentFile(preview_payload["rendered_text"].encode("utf-8"), name=file_name)
    artifact = store_document_artifact(
        tenant=actor.tenant,
        employee=target_employee,
        uploaded_file=content_file,
        actor_identifier=actor.employee_code,
        source_kind=DocumentArtifactSourceKind.GENERATED,
        metadata={
            "source": "generated_letter",
            "letter_type": validated_data.get("letter_type") or LetterType.OTHER,
            "template_code": validated_data.get("template_code", ""),
        },
    )
    artifact.mime_type = "text/plain"
    artifact.save(update_fields=["mime_type", "updated_at"])

    item = GeneratedLetter.objects.create(
        tenant=actor.tenant,
        employee=target_employee,
        artifact=artifact,
        letter_type=validated_data.get("letter_type") or LetterType.OTHER,
        title=title,
        template_code=validated_data.get("template_code", ""),
        issue_date=issue_date_value,
        file_name=file_name,
        file_path=artifact.storage_key,
        workflow_reference=validated_data.get("workflow_reference", ""),
        payload_snapshot={
            **preview_payload["payload"],
            "rendered_text": preview_payload["rendered_text"],
            "used_variables": preview_payload["used_variables"],
            "generated_by_identifier": actor.employee_code,
        },
    )
    item.file_url = f"/api/v1/hr-admin/generated-letters/{item.id}/download/"
    item.save(update_fields=["file_url", "updated_at"])
    return item


def _lifecycle_employee_name(employee: Employee) -> str:
    return f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code


def _get_employee_document_requirement_summary(employee: Employee, *, joining_date=None) -> dict:
    today = timezone.localdate()
    rules = (
        DocumentRequirementRule.objects.filter(
            tenant=employee.tenant,
            is_active=True,
            is_mandatory=True,
            category__is_active=True,
        )
        .select_related("category")
        .filter(Q(legal_entity__isnull=True) | Q(legal_entity=employee.legal_entity))
        .filter(Q(branch__isnull=True) | Q(branch=employee.branch))
        .filter(Q(department__isnull=True) | Q(department=employee.department))
        .filter(Q(grade__isnull=True) | Q(grade=employee.grade))
        .filter(Q(employment_type__isnull=True) | Q(employment_type=employee.employment_type))
        .order_by("priority", "created_at")
    )
    required_categories = {}
    future_due_document_names = []
    for rule in rules:
        if rule.category_id in required_categories:
            continue
        if joining_date and rule.required_within_days_of_joining > 0:
            due_date = joining_date + timedelta(days=rule.required_within_days_of_joining)
            if due_date > today:
                future_due_document_names.append(rule.category.name)
                continue
        required_categories[rule.category_id] = rule.category

    category_ids = list(required_categories.keys())
    compliant_category_ids = set()
    if category_ids:
        document_queryset = EmployeeDocument.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            category_id__in=category_ids,
            status=EmployeeDocumentStatus.ACTIVE,
        ).select_related("category")
        for document in document_queryset:
            if document.category.requires_verification and document.verification_status != VerificationStatus.VERIFIED:
                continue
            compliant_category_ids.add(document.category_id)

    missing_required_document_names = [
        category.name
        for category_id, category in required_categories.items()
        if category_id not in compliant_category_ids
    ]
    return {
        "required_document_count": len(required_categories),
        "missing_required_document_count": len(missing_required_document_names),
        "future_due_document_count": len(future_due_document_names),
        "missing_required_document_names": missing_required_document_names,
        "future_due_document_names": future_due_document_names,
    }


def _get_employee_document_attention_summary(employee: Employee, *, joining_date=None) -> dict:
    requirement_summary = _get_employee_document_requirement_summary(employee, joining_date=joining_date)
    active_documents = EmployeeDocument.objects.filter(
        tenant=employee.tenant,
        employee=employee,
        status=EmployeeDocumentStatus.ACTIVE,
    ).select_related("category")

    expired_document_count = 0
    expiring_document_count = 0
    for document in active_documents:
        expiry_runtime = _get_employee_document_expiry_runtime(document)
        if expiry_runtime["is_expired"]:
            expired_document_count += 1
        elif expiry_runtime["is_expiring_soon"]:
            expiring_document_count += 1

    state = "clear"
    summary_parts = []
    if requirement_summary["missing_required_document_count"] > 0:
        state = "blocked"
        summary_parts.append(f"{requirement_summary['missing_required_document_count']} required missing")
    if expired_document_count > 0:
        state = "blocked"
        summary_parts.append(f"{expired_document_count} expired")
    if requirement_summary["future_due_document_count"] > 0:
        if state == "clear":
            state = "upcoming"
        summary_parts.append(f"{requirement_summary['future_due_document_count']} upcoming")
    if expiring_document_count > 0:
        if state == "clear":
            state = "warning"
        summary_parts.append(f"{expiring_document_count} expiring soon")

    summary = ", ".join(summary_parts) if summary_parts else "Documents are in a healthy state."
    return {
        "document_attention_state": state,
        "document_attention_summary": summary,
        "missing_required_document_count": requirement_summary["missing_required_document_count"],
        "future_due_document_count": requirement_summary["future_due_document_count"],
        "expired_document_count": expired_document_count,
        "expiring_document_count": expiring_document_count,
    }


def _get_employee_document_requirement_runtime(employee: Employee, *, joining_date=None) -> list[dict]:
    today = timezone.localdate()
    rules = (
        DocumentRequirementRule.objects.filter(
            tenant=employee.tenant,
            is_active=True,
            is_mandatory=True,
            category__is_active=True,
        )
        .select_related("category")
        .filter(Q(legal_entity__isnull=True) | Q(legal_entity=employee.legal_entity))
        .filter(Q(branch__isnull=True) | Q(branch=employee.branch))
        .filter(Q(department__isnull=True) | Q(department=employee.department))
        .filter(Q(grade__isnull=True) | Q(grade=employee.grade))
        .filter(Q(employment_type__isnull=True) | Q(employment_type=employee.employment_type))
        .order_by("priority", "created_at")
    )
    rules_by_category_id: dict = {}
    for rule in rules:
        if rule.category_id not in rules_by_category_id:
            rules_by_category_id[rule.category_id] = rule

    category_ids = list(rules_by_category_id.keys())
    compliant_category_ids = set()
    current_documents_by_category_id: dict = {}
    if category_ids:
        document_queryset = EmployeeDocument.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            category_id__in=category_ids,
            status=EmployeeDocumentStatus.ACTIVE,
        ).select_related("category").order_by("-created_at")
        for document in document_queryset:
            current_documents_by_category_id.setdefault(document.category_id, document)
            if document.category.requires_verification and document.verification_status != VerificationStatus.VERIFIED:
                continue
            compliant_category_ids.add(document.category_id)

    runtime_items = []
    for category_id, rule in rules_by_category_id.items():
        due_on = None
        if joining_date:
            due_on = joining_date + timedelta(days=rule.required_within_days_of_joining)
        is_future_due = bool(due_on and due_on > today)
        current_document = current_documents_by_category_id.get(category_id)
        current_expiry_runtime = _get_employee_document_expiry_runtime(current_document) if current_document else {
            "state": "no_document",
            "label": "No document",
            "days_until_expiry": None,
            "is_expired": False,
            "is_expiring_soon": False,
        }
        runtime_items.append(
            {
                "category_id": str(rule.category_id),
                "category_code": rule.category.code,
                "category_name": rule.category.name,
                "rule_id": str(rule.id),
                "required_within_days_of_joining": rule.required_within_days_of_joining,
                "due_on": due_on.isoformat() if due_on else "",
                "is_future_due": is_future_due,
                "is_compliant": category_id in compliant_category_ids,
                "allow_employee_upload": rule.category.allow_employee_upload,
                "requires_verification": rule.category.requires_verification,
                "requires_expiry_date": rule.category.requires_expiry_date,
                "current_document_id": current_document.id if current_document else None,
                "current_document_title": current_document.title if current_document else "",
                "current_verification_status": current_document.verification_status if current_document else "",
                "current_expires_on": current_document.expires_on if current_document else None,
                "current_expiry_state": current_expiry_runtime["state"],
                "current_expiry_label": current_expiry_runtime["label"],
                "current_days_until_expiry": current_expiry_runtime["days_until_expiry"],
                "current_is_expired": current_expiry_runtime["is_expired"],
                "current_is_expiring_soon": current_expiry_runtime["is_expiring_soon"],
                "current_rejection_reason": current_document.rejection_reason if current_document else "",
                "current_uploaded_at": current_document.created_at if current_document else None,
            }
        )
    return runtime_items


def _sync_onboarding_document_checklist_items(
    *,
    employee: Employee,
    joining_date,
    checklist_items: list[dict],
    assigned_owner_identifier: str,
) -> list[dict]:
    runtime_items = _get_employee_document_requirement_runtime(employee, joining_date=joining_date)
    if not runtime_items:
        return [dict(item) for item in checklist_items if item.get("due_date_source") != "document_rule"]

    owner_membership = _resolve_lifecycle_item_owner_membership(
        tenant=employee.tenant,
        owner_identifier=assigned_owner_identifier,
    ) if assigned_owner_identifier else None
    owner_label = ""
    if owner_membership:
        user = owner_membership.user
        owner_label = (user.display_name or user.get_full_name() or user.username or "").strip()

    existing_manual_items = []
    existing_document_items_by_category = {}
    for item in checklist_items:
        category_id = str(item.get("source_document_category_id") or "").strip()
        if item.get("due_date_source") == "document_rule" and category_id:
            existing_document_items_by_category[category_id] = dict(item)
        elif item.get("due_date_source") == "document_rule":
            continue
        else:
            existing_manual_items.append(dict(item))

    document_items = []
    for runtime in runtime_items:
        existing_item = existing_document_items_by_category.get(runtime["category_id"], {})
        due_on = runtime["due_on"]
        document_items.append(
            {
                **existing_item,
                "code": existing_item.get("code") or f"document-{slugify(runtime['category_code'] or runtime['category_name'])}",
                "label": existing_item.get("label") or f"Verify {runtime['category_name']}",
                "done": bool(runtime["is_compliant"]),
                "required": True,
                "blocking": not runtime["is_future_due"],
                "owner": existing_item.get("owner") or assigned_owner_identifier,
                "owner_label": existing_item.get("owner_label") or owner_label,
                "owner_source_type": existing_item.get("owner_source_type") or "document_rule",
                "escalation_owner": existing_item.get("escalation_owner") or "",
                "auto_reassign_on_escalation": bool(existing_item.get("auto_reassign_on_escalation", False)),
                "due_on": due_on,
                "escalate_after_days": existing_item.get("escalate_after_days"),
                "notes": existing_item.get("notes") or "",
                "due_date_source": "document_rule",
                "source_document_category_id": runtime["category_id"],
                "source_document_category_name": runtime["category_name"],
                "source_document_rule_id": runtime["rule_id"],
                "source_document_due_offset_days": runtime["required_within_days_of_joining"],
            }
        )

    return [*existing_manual_items, *document_items]


def _normalize_lifecycle_item_history(raw_history, *, field_name: str, code: str) -> list[dict]:
    if raw_history in (None, ""):
        return []
    if not isinstance(raw_history, list):
        raise serializers.ValidationError({field_name: f"History for item '{code}' must be a list."})

    normalized_history = []
    for index, raw_entry in enumerate(raw_history, start=1):
        if not isinstance(raw_entry, dict):
            raise serializers.ValidationError({field_name: f"History entry {index} for item '{code}' must be an object."})
        action = str(raw_entry.get("action") or "").strip()
        at_raw = str(raw_entry.get("at") or "").strip()
        if not action or not at_raw:
            raise serializers.ValidationError({field_name: f"History entry {index} for item '{code}' must include action and at."})
        normalized_history.append(
            {
                "action": action,
                "at": at_raw,
                "by": str(raw_entry.get("by") or "").strip(),
                "note": str(raw_entry.get("note") or "").strip(),
            }
        )
    return normalized_history


def _append_lifecycle_item_history(*, previous_items: list[dict], current_items: list[dict], actor_identifier: str) -> list[dict]:
    actor = (actor_identifier or "").strip()
    now_iso = timezone.now().isoformat()
    previous_map = {entry.get("code"): entry for entry in previous_items}
    enriched_items = []

    for item in current_items:
        previous = previous_map.get(item.get("code"))
        history = list(item.get("history") or [])
        if previous is None:
            history.append({"action": "created", "at": now_iso, "by": actor, "note": "Lifecycle item created."})
        else:
            if bool(previous.get("done")) != bool(item.get("done")):
                history.append(
                    {
                        "action": "completed" if item.get("done") else "reopened",
                        "at": now_iso,
                        "by": actor,
                        "note": "Completion state updated.",
                    }
                )
            if (previous.get("owner") or "") != (item.get("owner") or ""):
                history.append(
                    {
                        "action": "owner_changed",
                        "at": now_iso,
                        "by": actor,
                        "note": f"Owner changed from '{previous.get('owner') or ''}' to '{item.get('owner') or ''}'.",
                    }
                )
            if (previous.get("due_on") or "") != (item.get("due_on") or ""):
                history.append(
                    {
                        "action": "due_on_changed",
                        "at": now_iso,
                        "by": actor,
                        "note": f"Due date changed from '{previous.get('due_on') or ''}' to '{item.get('due_on') or ''}'.",
                    }
                )
            if (previous.get("escalation_owner") or "") != (item.get("escalation_owner") or ""):
                history.append(
                    {
                        "action": "escalation_owner_changed",
                        "at": now_iso,
                        "by": actor,
                        "note": (
                            f"Escalation owner changed from '{previous.get('escalation_owner') or ''}' "
                            f"to '{item.get('escalation_owner') or ''}'."
                        ),
                    }
                )
            if bool(previous.get("auto_reassign_on_escalation")) != bool(item.get("auto_reassign_on_escalation")):
                history.append(
                    {
                        "action": "auto_reassign_rule_changed",
                        "at": now_iso,
                        "by": actor,
                        "note": (
                            "Auto reassign on escalation changed from "
                            f"'{bool(previous.get('auto_reassign_on_escalation'))}' to "
                            f"'{bool(item.get('auto_reassign_on_escalation'))}'."
                        ),
                    }
                )

        updated_item = dict(item)
        updated_item["history"] = history
        last_entry = history[-1] if history else None
        updated_item["last_action_at"] = last_entry["at"] if last_entry else ""
        updated_item["last_action_by"] = last_entry["by"] if last_entry else ""
        enriched_items.append(updated_item)

    return enriched_items


def _resolve_lifecycle_item_owner_membership(*, tenant, owner_identifier: str):
    normalized = (owner_identifier or "").strip()
    if not normalized:
        return None
    return (
        TenantMembership.objects.filter(tenant=tenant)
        .select_related("user")
        .filter(Q(user__username__iexact=normalized) | Q(employee_code__iexact=normalized))
        .first()
    )


def _notify_lifecycle_item_attention(
    *,
    tenant,
    subject_type: str,
    subject_identifier: str,
    employee: Employee,
    item_kind: str,
    current_items: list[dict],
    previous_items: list[dict],
) -> list[dict]:
    previous_map = {entry.get("code"): entry for entry in previous_items}
    now_iso = timezone.now().isoformat()
    updated_items = []

    for item in current_items:
        previous = previous_map.get(item.get("code"))
        item = dict(item)
        history = list(item.get("history") or [])
        owner_changed = (previous.get("owner") if previous else "") != (item.get("owner") or "")
        owner_identifier = item.get("owner") or ""
        owner_membership = _resolve_lifecycle_item_owner_membership(tenant=tenant, owner_identifier=owner_identifier)
        escalation_owner_changed = (previous.get("escalation_owner") if previous else "") != (item.get("escalation_owner") or "")
        escalation_owner_identifier = item.get("escalation_owner") or owner_identifier
        escalation_owner_membership = _resolve_lifecycle_item_owner_membership(
            tenant=tenant,
            owner_identifier=escalation_owner_identifier,
        )
        auto_reassign_on_escalation = bool(item.get("auto_reassign_on_escalation"))
        was_escalated = bool(previous.get("is_escalated")) if previous else False
        is_escalation_due = bool(item.get("is_escalation_due"))
        item["is_escalated"] = bool(item.get("is_escalated")) and is_escalation_due
        if not item["is_escalated"] and not is_escalation_due:
            item["escalated_at"] = ""

        if item.get("is_overdue") and owner_identifier and (previous is None or not previous.get("is_overdue") or owner_changed):
            title = f"{item_kind} overdue: {item.get('label')}"
            body = (
                f"{employee.employee_code} has an overdue {item_kind.lower()} item: {item.get('label')}."
                f" Please review it."
            )
            create_in_app_notification(
                tenant=tenant,
                recipient_membership=owner_membership,
                recipient_identifier=owner_identifier,
                subject_type=subject_type,
                subject_identifier=subject_identifier,
                title=title,
                body=body,
                priority=NotificationPriority.HIGH,
                payload={
                    "employee_id": str(employee.id),
                    "employee_code": employee.employee_code,
                    "item_code": item.get("code"),
                    "item_kind": item_kind,
                    "attention_type": "overdue",
                },
            )
            history.append(
                {
                    "action": "reminder_sent",
                    "at": now_iso,
                    "by": "system",
                    "note": f"Overdue reminder sent to '{owner_identifier}'.",
                }
            )

        if is_escalation_due and escalation_owner_identifier and (
            previous is None
            or not previous.get("is_escalation_due")
            or owner_changed
            or escalation_owner_changed
            or not was_escalated
        ):
            if not item.get("is_escalated"):
                item["is_escalated"] = True
                item["escalated_at"] = item.get("escalated_at") or now_iso
                history.append(
                    {
                        "action": "escalated",
                        "at": now_iso,
                        "by": "system",
                        "note": f"Item escalated to '{escalation_owner_identifier}'.",
                    }
                )
            if auto_reassign_on_escalation and escalation_owner_identifier and escalation_owner_identifier != owner_identifier:
                item["owner"] = escalation_owner_identifier
                owner_identifier = escalation_owner_identifier
                owner_membership = escalation_owner_membership
                history.append(
                    {
                        "action": "owner_escalated",
                        "at": now_iso,
                        "by": "system",
                        "note": f"Ownership escalated to '{escalation_owner_identifier}'.",
                    }
                )
            title = f"{item_kind} escalation due: {item.get('label')}"
            body = (
                f"{employee.employee_code} has an escalated {item_kind.lower()} item: {item.get('label')}."
                f" Immediate follow-up is expected."
            )
            create_in_app_notification(
                tenant=tenant,
                recipient_membership=escalation_owner_membership,
                recipient_identifier=escalation_owner_identifier,
                subject_type=subject_type,
                subject_identifier=subject_identifier,
                title=title,
                body=body,
                priority=NotificationPriority.CRITICAL,
                payload={
                    "employee_id": str(employee.id),
                    "employee_code": employee.employee_code,
                    "item_code": item.get("code"),
                    "item_kind": item_kind,
                    "attention_type": "escalation_due",
                },
            )
            history.append(
                {
                    "action": "escalation_sent",
                    "at": now_iso,
                    "by": "system",
                    "note": f"Escalation reminder sent to '{escalation_owner_identifier}'.",
                }
            )

        updated_item = dict(item)
        updated_item["history"] = history
        last_entry = history[-1] if history else None
        updated_item["last_action_at"] = last_entry["at"] if last_entry else ""
        updated_item["last_action_by"] = last_entry["by"] if last_entry else ""
        updated_items.append(updated_item)

    return updated_items


def _notify_onboarding_document_attention(
    *,
    tenant,
    onboarding: EmployeeOnboarding,
    previous_attention: dict | None,
):
    if onboarding.employee_id is None:
        return
    current_attention = _get_employee_document_attention_summary(
        onboarding.employee,
        joining_date=onboarding.actual_joining_date or onboarding.expected_joining_date,
    )
    if current_attention["document_attention_state"] == "clear":
        return
    if previous_attention and previous_attention == current_attention:
        return

    owner_identifier = onboarding.assigned_owner_identifier or ""
    owner_membership = _get_lifecycle_hr_owner_membership(
        employee=onboarding.employee,
        preferred_identifier=owner_identifier,
    )
    attention_label_map = {
        "blocked": "Document blocker",
        "warning": "Document warning",
        "upcoming": "Upcoming document work",
    }
    label = attention_label_map.get(current_attention["document_attention_state"], "Document attention")
    title = f"{label}: {onboarding.employee.employee_code}"
    body = (
        f"{onboarding.employee.employee_code} onboarding needs document attention."
        f" {current_attention['document_attention_summary']}."
    )
    trigger_notification_event(
        tenant=tenant,
        module="documents",
        trigger_key="documents.onboarding.attention_required",
        subject_type="employee_onboarding",
        subject_identifier=str(onboarding.id),
        recipient_membership=owner_membership,
        recipient_identifier=owner_identifier,
        fallback_title=title,
        fallback_body=body,
        payload={
            "employee_id": str(onboarding.employee_id),
            "employee_code": onboarding.employee.employee_code,
            "onboarding_id": str(onboarding.id),
            "workflow_reference": onboarding.workflow_reference or "",
            **current_attention,
        },
    )


def _notify_document_upload_submitted(*, document: EmployeeDocument, actor: Employee):
    hr_owner_membership = _get_lifecycle_hr_owner_membership(employee=document.employee)
    trigger_notification_event(
        tenant=document.tenant,
        module="documents",
        trigger_key="documents.employee.upload_submitted",
        subject_type="employee_document",
        subject_identifier=str(document.id),
        recipient_membership=hr_owner_membership,
        recipient_identifier=hr_owner_membership.user.username if hr_owner_membership and hr_owner_membership.user_id else "",
        fallback_title=f"Document uploaded: {document.employee.employee_code}",
        fallback_body=(
            f"{document.employee.employee_code} uploaded {document.category.name} for review."
            f" Verification status is {document.verification_status}."
        ),
        payload={
            "employee_id": str(document.employee_id),
            "employee_code": document.employee.employee_code,
            "document_id": str(document.id),
            "category_id": str(document.category_id),
            "category_name": document.category.name,
            "verification_status": document.verification_status,
            "uploaded_by_identifier": actor.employee_code,
        },
    )


def _notify_document_reupload_requested(*, document: EmployeeDocument):
    employee_membership = document.employee.membership
    recipient_identifier = ""
    if employee_membership and employee_membership.user_id:
        recipient_identifier = employee_membership.user.username
    elif document.employee.work_email:
        recipient_identifier = document.employee.work_email

    trigger_notification_event(
        tenant=document.tenant,
        module="documents",
        trigger_key="documents.employee.reupload_requested",
        subject_type="employee_document",
        subject_identifier=str(document.id),
        recipient_membership=employee_membership,
        recipient_identifier=recipient_identifier,
        fallback_title=f"Re-upload requested: {document.category.name}",
        fallback_body=(
            f"Please upload a fresh copy of {document.category.name} for {document.employee.employee_code}."
            f" {document.rejection_reason or 'The last review needs follow-up.'}"
        ),
        payload={
            "employee_id": str(document.employee_id),
            "employee_code": document.employee.employee_code,
            "document_id": str(document.id),
            "category_id": str(document.category_id),
            "category_name": document.category.name,
            "verification_status": document.verification_status,
            "reupload_requested": document.reupload_requested,
            "reupload_requested_by_identifier": document.reupload_requested_by_identifier,
        },
    )


def _send_document_expiry_attention_reminder(*, document: EmployeeDocument, reminder_source: str = "manual_action") -> bool:
    expiry_runtime = _get_employee_document_expiry_runtime(document)
    if expiry_runtime["is_expired"]:
        title = f"Document expired: {document.category.name}"
        body = (
            f"Your document for {document.category.name} has expired for {document.employee.employee_code}."
            " Upload a fresh copy as soon as possible."
        )
    elif expiry_runtime["is_expiring_soon"]:
        title = f"Document expiring soon: {document.category.name}"
        body = (
            f"Your document for {document.category.name} will expire soon for {document.employee.employee_code}."
            " Upload a fresh copy before the deadline."
        )
    elif document.category.requires_expiry_date and not document.expires_on:
        title = f"Expiry date missing: {document.category.name}"
        body = (
            f"Your document for {document.category.name} is missing an expiry date for {document.employee.employee_code}."
            " Update the file with a valid expiry detail."
        )
    else:
        return False

    employee_membership = document.employee.membership
    recipient_identifier = ""
    if employee_membership and employee_membership.user_id:
        recipient_identifier = employee_membership.user.username
    elif document.employee.work_email:
        recipient_identifier = document.employee.work_email

    trigger_notification_event(
        tenant=document.tenant,
        module="documents",
        trigger_key="documents.employee.expiry_attention",
        subject_type="employee_document",
        subject_identifier=str(document.id),
        recipient_membership=employee_membership,
        recipient_identifier=recipient_identifier,
        fallback_title=title,
        fallback_body=body,
        payload={
            "employee_id": str(document.employee_id),
            "employee_code": document.employee.employee_code,
            "document_id": str(document.id),
            "category_id": str(document.category_id),
            "category_name": document.category.name,
            "expiry_state": expiry_runtime["state"],
            "expiry_label": expiry_runtime["label"],
            "days_until_expiry": expiry_runtime["days_until_expiry"],
            "expires_on": document.expires_on.isoformat() if document.expires_on else None,
            "reminder_source": reminder_source,
        },
    )
    return True


def _get_active_lifecycle_workflow_template(*, tenant, trigger_key: str) -> WorkflowTemplate | None:
    return (
        WorkflowTemplate.objects.filter(
            tenant=tenant,
            module=WorkflowModule.LIFECYCLE,
            trigger_key=trigger_key,
            status=WorkflowStatus.ACTIVE,
        )
        .prefetch_related("steps__role", "steps__membership__user")
        .order_by("-version", "-created_at")
        .first()
    )


def _to_local_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return parse_date(str(value).strip())


def _build_onboarding_due_context(item: EmployeeOnboarding) -> dict[str, date]:
    today = timezone.localdate()
    expected_joining_date = _to_local_date(item.expected_joining_date)
    actual_joining_date = _to_local_date(item.actual_joining_date)
    preboarding_started_on = _to_local_date(item.preboarding_started_at)
    return {
        "today": today,
        "record_created_on": today,
        "expected_joining_date": expected_joining_date,
        "actual_joining_date": actual_joining_date,
        "joining_date": actual_joining_date or expected_joining_date,
        "preboarding_started_on": preboarding_started_on,
        "_employee": item.employee,
    }


def _build_exit_due_context(item: EmployeeExit) -> dict[str, date]:
    today = timezone.localdate()
    resignation_date = _to_local_date(item.resignation_date)
    proposed_last_working_date = _to_local_date(item.proposed_last_working_date)
    approved_last_working_date = _to_local_date(item.approved_last_working_date)
    actual_exit_date = _to_local_date(item.actual_exit_date)
    return {
        "today": today,
        "record_created_on": today,
        "resignation_date": resignation_date,
        "proposed_last_working_date": proposed_last_working_date,
        "approved_last_working_date": approved_last_working_date,
        "last_working_date": approved_last_working_date or proposed_last_working_date,
        "actual_exit_date": actual_exit_date,
        "_employee": item.employee,
    }


def _resolve_lifecycle_holiday_calendar(employee: Employee, *, target_date: date):
    calendars = (
        HolidayCalendar.objects.filter(
            tenant=employee.tenant,
            year=target_date.year,
            is_active=True,
        )
        .prefetch_related("holidays")
        .order_by("created_at")
    )
    candidates: list[tuple[int, HolidayCalendar]] = []
    for calendar in calendars:
        if calendar.legal_entity_id and calendar.legal_entity_id != employee.legal_entity_id:
            continue
        if calendar.branch_id and calendar.branch_id != employee.branch_id:
            continue
        if calendar.location_id and calendar.location_id != employee.location_id:
            continue
        specificity = sum(1 for value in [calendar.legal_entity_id, calendar.branch_id, calendar.location_id] if value)
        candidates.append((specificity, calendar))
    if not candidates:
        return None
    candidates.sort(key=lambda item: (-item[0], str(item[1].created_at)))
    return candidates[0][1]


def _is_employee_holiday(employee: Employee, *, target_date: date) -> bool:
    calendar = _resolve_lifecycle_holiday_calendar(employee, target_date=target_date)
    if not calendar:
        return False
    return Holiday.objects.filter(calendar=calendar, date=target_date).exists()


def _normalize_non_working_weekdays(values) -> list[str]:
    normalized: list[str] = []
    seen = set()
    for value in values or []:
        weekday = str(value or "").strip().lower()
        if not weekday or weekday in seen:
            continue
        normalized.append(weekday)
        seen.add(weekday)
    return normalized


def _add_business_days(*, employee: Employee, anchor_date: date, offset_days: int, non_working_weekdays: set[str]) -> date:
    if offset_days == 0:
        return anchor_date
    step = 1 if offset_days > 0 else -1
    remaining = abs(offset_days)
    current = anchor_date
    while remaining > 0:
        current = current + timedelta(days=step)
        weekday_name = current.strftime("%A").lower()
        if weekday_name in non_working_weekdays:
            continue
        if _is_employee_holiday(employee, target_date=current):
            continue
        remaining -= 1
    return current


def _derive_lifecycle_due_rule(
    rule_snapshot,
    *,
    due_context: dict[str, date],
    employee: Employee,
) -> tuple[date | None, str, int | None]:
    rule_data = rule_snapshot if isinstance(rule_snapshot, dict) else {}
    anchors = []
    primary_anchor = str(rule_data.get("due_anchor") or "").strip()
    if primary_anchor:
        anchors.append(primary_anchor)
    due_anchor_candidates_raw = rule_data.get("due_anchor_candidates")
    if isinstance(due_anchor_candidates_raw, list):
        anchors.extend(str(value or "").strip() for value in due_anchor_candidates_raw if str(value or "").strip())
    if not anchors:
        return None, "", None
    offset_raw = rule_data.get("due_offset_days")
    if offset_raw in (None, ""):
        offset_days = 0
    else:
        try:
            offset_days = int(offset_raw)
        except (TypeError, ValueError):
            return None, anchors[0], None
    offset_unit = str(rule_data.get("due_offset_unit") or "calendar_days").strip() or "calendar_days"
    non_working_weekdays_raw = rule_data.get("non_working_weekdays")
    if isinstance(non_working_weekdays_raw, list) and non_working_weekdays_raw:
        non_working_weekdays = set(_normalize_non_working_weekdays(non_working_weekdays_raw))
    else:
        non_working_weekdays = {"saturday", "sunday"}
    for due_anchor in anchors:
        anchor_date = due_context.get(due_anchor)
        if anchor_date:
            derived_due_on = (
                _add_business_days(
                    employee=employee,
                    anchor_date=anchor_date,
                    offset_days=offset_days,
                    non_working_weekdays=non_working_weekdays,
                )
                if offset_unit == "business_days"
                else anchor_date + timedelta(days=offset_days)
            )
            return derived_due_on, due_anchor, offset_days
    return None, anchors[0], offset_days


def _get_active_lifecycle_membership_for_identifier(*, tenant, identifier: str) -> TenantMembership | None:
    normalized_identifier = (identifier or "").strip()
    if not normalized_identifier:
        return None
    employee = (
        Employee.objects.filter(tenant=tenant)
        .select_related("membership__user")
        .filter(Q(membership__user__username__iexact=normalized_identifier) | Q(employee_code__iexact=normalized_identifier))
        .first()
    )
    membership = getattr(employee, "membership", None) if employee else None
    if membership and membership.status == MembershipStatus.ACTIVE:
        return membership
    return None


def _get_lifecycle_hr_owner_membership(*, employee: Employee, preferred_identifier: str = "") -> TenantMembership | None:
    preferred_membership = _get_active_lifecycle_membership_for_identifier(
        tenant=employee.tenant,
        identifier=preferred_identifier,
    )
    if preferred_membership:
        return preferred_membership
    return (
        TenantMembership.objects.filter(
            tenant=employee.tenant,
            status=MembershipStatus.ACTIVE,
            membership_roles__role__code="hr-admin",
            membership_roles__role__is_active=True,
        )
        .select_related("user")
        .distinct()
        .order_by("created_at")
        .first()
    )


def _get_lifecycle_manager_membership(employee: Employee) -> TenantMembership | None:
    membership = getattr(getattr(employee, "reporting_manager", None), "membership", None)
    if membership and membership.status == MembershipStatus.ACTIVE:
        return membership
    return None


def _build_lifecycle_template_step_owner(
    *,
    employee: Employee,
    template_step,
    hr_owner_membership: TenantMembership | None = None,
) -> tuple[str, str, str]:
    if template_step.actor_type == WorkflowActorType.CONFIGURED_USER and template_step.membership_id and template_step.membership:
        membership = template_step.membership
        user = membership.user
        owner_identifier = (user.username or "").strip()
        owner_label = (user.display_name or user.get_full_name() or user.username or "").strip()
        return owner_identifier, owner_label, WorkflowActorType.CONFIGURED_USER
    if template_step.actor_type == WorkflowActorType.HR_OWNER:
        membership = template_step.membership if template_step.membership_id and template_step.membership else hr_owner_membership
        if membership:
            user = membership.user
            owner_identifier = (user.username or "").strip()
            owner_label = (user.display_name or user.get_full_name() or user.username or "").strip()
            return owner_identifier, owner_label, WorkflowActorType.HR_OWNER
        return "", "", WorkflowActorType.HR_OWNER
    if template_step.membership_id and template_step.membership:
        membership = template_step.membership
        user = membership.user
        owner_identifier = (user.username or "").strip()
        owner_label = (user.display_name or user.get_full_name() or user.username or "").strip()
        return owner_identifier, owner_label, WorkflowActorType.MEMBERSHIP
    if template_step.actor_type == WorkflowActorType.MANAGER:
        owner_identifier = _get_employee_owner_identifier(employee.reporting_manager)
        owner_label = _lifecycle_employee_name(employee.reporting_manager) if employee.reporting_manager else ""
        return owner_identifier, owner_label, WorkflowActorType.MANAGER
    if template_step.role_id and template_step.role:
        return (template_step.role.code or "").strip(), (template_step.role.name or "").strip(), WorkflowActorType.ROLE
    return "", "", template_step.actor_type or ""


def _build_lifecycle_items_from_template(
    *,
    tenant,
    employee: Employee,
    trigger_key: str,
    default_code_prefix: str,
    due_context: dict[str, date],
    hr_owner_membership: TenantMembership | None = None,
) -> list[dict]:
    template = _get_active_lifecycle_workflow_template(tenant=tenant, trigger_key=trigger_key)
    if not template:
        return []

    items = []
    for step in template.steps.order_by("step_order"):
        owner_identifier, owner_label, owner_source_type = _build_lifecycle_template_step_owner(
            employee=employee,
            template_step=step,
            hr_owner_membership=hr_owner_membership,
        )
        step_code = slugify(step.name or "").strip("-") or f"{default_code_prefix}-{step.step_order}"
        escalate_after_days = (step.escalate_after_hours + 23) // 24 if step.escalate_after_hours else None
        derived_due_on, source_due_anchor, source_due_offset_days = _derive_lifecycle_due_rule(
            step.rule_snapshot,
            due_context=due_context,
            employee=employee,
        )
        items.append(
            {
                "code": step_code,
                "label": step.name or f"Step {step.step_order}",
                "done": False,
                "required": True,
                "blocking": True,
                "owner": owner_identifier,
                "owner_label": owner_label,
                "owner_source_type": owner_source_type,
                "escalation_owner": "",
                "auto_reassign_on_escalation": False,
                "due_on": derived_due_on.isoformat() if derived_due_on else "",
                "escalate_after_days": escalate_after_days,
                "notes": "",
                "due_date_source": "template_rule" if derived_due_on else "",
                "source_due_offset_unit": str((step.rule_snapshot or {}).get("due_offset_unit") or "calendar_days"),
                "source_non_working_weekdays": _normalize_non_working_weekdays(
                    (step.rule_snapshot or {}).get("non_working_weekdays") or []
                ),
                "source_template_code": template.code,
                "source_template_name": template.name,
                "source_template_version": template.version,
                "source_step_id": str(step.id),
                "source_step_order": step.step_order,
                "source_step_name": step.name,
                "source_due_anchor": source_due_anchor,
                "source_due_offset_days": source_due_offset_days,
            }
        )
    return items


def _refresh_template_derived_due_dates(*, items: list[dict], due_context: dict[str, date]) -> list[dict]:
    refreshed_items = []
    for item in items:
        updated_item = dict(item)
        if updated_item.get("due_date_source") == "template_rule":
            due_anchor = str(updated_item.get("source_due_anchor") or "").strip()
            offset_raw = updated_item.get("source_due_offset_days")
            offset_unit = str(updated_item.get("source_due_offset_unit") or "calendar_days").strip() or "calendar_days"
            non_working_weekdays_raw = updated_item.get("source_non_working_weekdays")
            employee = due_context.get("_employee")
            if due_anchor:
                if offset_raw in (None, ""):
                    offset_days = 0
                else:
                    try:
                        offset_days = int(offset_raw)
                    except (TypeError, ValueError):
                        offset_days = None
                if isinstance(non_working_weekdays_raw, list) and non_working_weekdays_raw:
                    non_working_weekdays = set(_normalize_non_working_weekdays(non_working_weekdays_raw))
                else:
                    non_working_weekdays = {"saturday", "sunday"}
                anchor_date = due_context.get(due_anchor)
                updated_item["due_on"] = (
                    (
                        _add_business_days(
                            employee=employee,
                            anchor_date=anchor_date,
                            offset_days=offset_days,
                            non_working_weekdays=non_working_weekdays,
                        )
                        if offset_unit == "business_days" and employee
                        else anchor_date + timedelta(days=offset_days)
                    ).isoformat()
                    if anchor_date and offset_days is not None
                    else ""
                )
        refreshed_items.append(updated_item)
    return refreshed_items


def _normalize_onboarding_checklist_snapshot(raw_snapshot) -> list[dict]:
    today = timezone.localdate()
    if raw_snapshot in (None, ""):
        return []
    if not isinstance(raw_snapshot, list):
        raise serializers.ValidationError({"checklist_snapshot": "Checklist snapshot must be a list."})

    normalized = []
    seen_codes = set()
    for index, raw_entry in enumerate(raw_snapshot, start=1):
        if not isinstance(raw_entry, dict):
            raise serializers.ValidationError({"checklist_snapshot": f"Checklist item {index} must be an object."})
        code = str(raw_entry.get("code") or "").strip()
        label = str(raw_entry.get("label") or "").strip()
        if not code and not label:
            raise serializers.ValidationError({"checklist_snapshot": f"Checklist item {index} must include a code or label."})
        if not code:
            code = f"item-{index}"
        if code in seen_codes:
            raise serializers.ValidationError({"checklist_snapshot": f"Checklist item code '{code}' is duplicated."})
        seen_codes.add(code)
        due_on_raw = str(raw_entry.get("due_on") or "").strip()
        due_on_value = parse_date(due_on_raw) if due_on_raw else None
        if due_on_raw and due_on_value is None:
            raise serializers.ValidationError({"checklist_snapshot": f"Checklist item '{code}' has an invalid due_on value."})
        escalate_after_days_raw = raw_entry.get("escalate_after_days")
        if escalate_after_days_raw in (None, ""):
            escalate_after_days = None
        else:
            try:
                escalate_after_days = int(escalate_after_days_raw)
            except (TypeError, ValueError):
                raise serializers.ValidationError({"checklist_snapshot": f"Checklist item '{code}' has an invalid escalate_after_days value."})
            if escalate_after_days < 0:
                raise serializers.ValidationError({"checklist_snapshot": f"Checklist item '{code}' cannot have a negative escalate_after_days value."})
        done = bool(raw_entry.get("done", False))
        escalates_on = due_on_value + timedelta(days=escalate_after_days) if due_on_value and escalate_after_days is not None else None
        history = _normalize_lifecycle_item_history(raw_entry.get("history"), field_name="checklist_snapshot", code=code)
        last_entry = history[-1] if history else None
        normalized.append(
            {
                "code": code,
                "label": label or code.replace("-", " ").replace("_", " ").title(),
                "done": done,
                "required": bool(raw_entry.get("required", True)),
                "blocking": bool(raw_entry.get("blocking", raw_entry.get("required", True))),
                "owner": str(raw_entry.get("owner") or "").strip(),
                "owner_label": str(raw_entry.get("owner_label") or "").strip(),
                "owner_source_type": str(raw_entry.get("owner_source_type") or "").strip(),
                "escalation_owner": str(raw_entry.get("escalation_owner") or "").strip(),
                "auto_reassign_on_escalation": bool(raw_entry.get("auto_reassign_on_escalation", False)),
                "due_on": due_on_value.isoformat() if due_on_value else "",
                "escalate_after_days": escalate_after_days,
                "escalates_on": escalates_on.isoformat() if escalates_on else "",
                "is_overdue": bool(due_on_value and due_on_value < today and not done),
                "is_escalation_due": bool(escalates_on and escalates_on < today and not done),
                "is_escalated": bool(raw_entry.get("is_escalated", False)) and bool(escalates_on and escalates_on < today and not done),
                "escalated_at": str(raw_entry.get("escalated_at") or "").strip(),
                "notes": str(raw_entry.get("notes") or "").strip(),
                "due_date_source": str(raw_entry.get("due_date_source") or "").strip(),
                "source_document_category_id": str(raw_entry.get("source_document_category_id") or "").strip(),
                "source_document_category_name": str(raw_entry.get("source_document_category_name") or "").strip(),
                "source_document_rule_id": str(raw_entry.get("source_document_rule_id") or "").strip(),
                "source_document_due_offset_days": raw_entry.get("source_document_due_offset_days"),
                "source_due_offset_unit": str(raw_entry.get("source_due_offset_unit") or "").strip(),
                "source_non_working_weekdays": list(raw_entry.get("source_non_working_weekdays") or []),
                "source_template_code": str(raw_entry.get("source_template_code") or "").strip(),
                "source_template_name": str(raw_entry.get("source_template_name") or "").strip(),
                "source_template_version": raw_entry.get("source_template_version"),
                "source_step_id": str(raw_entry.get("source_step_id") or "").strip(),
                "source_step_order": raw_entry.get("source_step_order"),
                "source_step_name": str(raw_entry.get("source_step_name") or "").strip(),
                "source_due_anchor": str(raw_entry.get("source_due_anchor") or "").strip(),
                "source_due_offset_days": raw_entry.get("source_due_offset_days"),
                "history": history,
                "last_action_at": last_entry["at"] if last_entry else "",
                "last_action_by": last_entry["by"] if last_entry else "",
            }
        )
    return normalized


def _get_onboarding_checklist_progress(snapshot: list[dict]) -> dict:
    total = len(snapshot)
    completed = sum(1 for entry in snapshot if entry.get("done"))
    blocking_open = sum(1 for entry in snapshot if entry.get("blocking", entry.get("required", True)) and not entry.get("done"))
    overdue = sum(1 for entry in snapshot if entry.get("is_overdue"))
    escalation_due = sum(1 for entry in snapshot if entry.get("is_escalation_due"))
    return {
        "checklist_total_count": total,
        "checklist_completed_count": completed,
        "checklist_open_count": max(total - completed, 0),
        "blocking_open_count": blocking_open,
        "checklist_overdue_count": overdue,
        "checklist_escalation_due_count": escalation_due,
    }


def _normalize_exit_clearance_snapshot(raw_snapshot) -> dict:
    today = timezone.localdate()
    if raw_snapshot in (None, ""):
        return {"items": [], "workflow_template_code": "", "notes": ""}
    if isinstance(raw_snapshot, list):
        raw_snapshot = {"items": raw_snapshot}
    if not isinstance(raw_snapshot, dict):
        raise serializers.ValidationError({"clearance_status_snapshot": "Clearance snapshot must be an object or list."})

    raw_items = raw_snapshot.get("items", [])
    if raw_items in (None, ""):
        raw_items = []
    if not isinstance(raw_items, list):
        raise serializers.ValidationError({"clearance_status_snapshot": "Clearance items must be a list."})

    normalized_items = []
    seen_codes = set()
    for index, raw_entry in enumerate(raw_items, start=1):
        if not isinstance(raw_entry, dict):
            raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item {index} must be an object."})
        code = str(raw_entry.get("code") or "").strip()
        label = str(raw_entry.get("label") or "").strip()
        if not code and not label:
            raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item {index} must include a code or label."})
        if not code:
            code = f"clearance-{index}"
        if code in seen_codes:
            raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item code '{code}' is duplicated."})
        seen_codes.add(code)
        due_on_raw = str(raw_entry.get("due_on") or "").strip()
        due_on_value = parse_date(due_on_raw) if due_on_raw else None
        if due_on_raw and due_on_value is None:
            raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item '{code}' has an invalid due_on value."})
        escalate_after_days_raw = raw_entry.get("escalate_after_days")
        if escalate_after_days_raw in (None, ""):
            escalate_after_days = None
        else:
            try:
                escalate_after_days = int(escalate_after_days_raw)
            except (TypeError, ValueError):
                raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item '{code}' has an invalid escalate_after_days value."})
            if escalate_after_days < 0:
                raise serializers.ValidationError({"clearance_status_snapshot": f"Clearance item '{code}' cannot have a negative escalate_after_days value."})
        done = bool(raw_entry.get("done", False))
        escalates_on = due_on_value + timedelta(days=escalate_after_days) if due_on_value and escalate_after_days is not None else None
        history = _normalize_lifecycle_item_history(raw_entry.get("history"), field_name="clearance_status_snapshot", code=code)
        last_entry = history[-1] if history else None
        normalized_items.append(
            {
                "code": code,
                "label": label or code.replace("-", " ").replace("_", " ").title(),
                "done": done,
                "required": bool(raw_entry.get("required", True)),
                "blocking": bool(raw_entry.get("blocking", raw_entry.get("required", True))),
                "owner": str(raw_entry.get("owner") or "").strip(),
                "owner_label": str(raw_entry.get("owner_label") or "").strip(),
                "owner_source_type": str(raw_entry.get("owner_source_type") or "").strip(),
                "escalation_owner": str(raw_entry.get("escalation_owner") or "").strip(),
                "auto_reassign_on_escalation": bool(raw_entry.get("auto_reassign_on_escalation", False)),
                "due_on": due_on_value.isoformat() if due_on_value else "",
                "escalate_after_days": escalate_after_days,
                "escalates_on": escalates_on.isoformat() if escalates_on else "",
                "is_overdue": bool(due_on_value and due_on_value < today and not done),
                "is_escalation_due": bool(escalates_on and escalates_on < today and not done),
                "is_escalated": bool(raw_entry.get("is_escalated", False)) and bool(escalates_on and escalates_on < today and not done),
                "escalated_at": str(raw_entry.get("escalated_at") or "").strip(),
                "notes": str(raw_entry.get("notes") or "").strip(),
                "due_date_source": str(raw_entry.get("due_date_source") or "").strip(),
                "source_due_offset_unit": str(raw_entry.get("source_due_offset_unit") or "").strip(),
                "source_non_working_weekdays": list(raw_entry.get("source_non_working_weekdays") or []),
                "source_template_code": str(raw_entry.get("source_template_code") or "").strip(),
                "source_template_name": str(raw_entry.get("source_template_name") or "").strip(),
                "source_template_version": raw_entry.get("source_template_version"),
                "source_step_id": str(raw_entry.get("source_step_id") or "").strip(),
                "source_step_order": raw_entry.get("source_step_order"),
                "source_step_name": str(raw_entry.get("source_step_name") or "").strip(),
                "source_due_anchor": str(raw_entry.get("source_due_anchor") or "").strip(),
                "source_due_offset_days": raw_entry.get("source_due_offset_days"),
                "history": history,
                "last_action_at": last_entry["at"] if last_entry else "",
                "last_action_by": last_entry["by"] if last_entry else "",
            }
        )

    return {
        "items": normalized_items,
        "workflow_template_code": str(raw_snapshot.get("workflow_template_code") or "").strip(),
        "notes": str(raw_snapshot.get("notes") or "").strip(),
    }


def _get_exit_clearance_progress(snapshot: dict) -> dict:
    items = snapshot.get("items", [])
    total = len(items)
    completed = sum(1 for entry in items if entry.get("done"))
    blocking_open = sum(1 for entry in items if entry.get("blocking", entry.get("required", True)) and not entry.get("done"))
    overdue = sum(1 for entry in items if entry.get("is_overdue"))
    escalation_due = sum(1 for entry in items if entry.get("is_escalation_due"))
    return {
        "clearance_total_count": total,
        "clearance_completed_count": completed,
        "clearance_open_count": max(total - completed, 0),
        "blocking_open_count": blocking_open,
        "clearance_overdue_count": overdue,
        "clearance_escalation_due_count": escalation_due,
    }


LIFECYCLE_ATTENTION_RANKS = {
    "clear": 0,
    "scheduled": 1,
    "due_today": 2,
    "overdue": 3,
    "escalation_due": 4,
    "escalated": 5,
}


def _parse_lifecycle_iso_date(raw_value) -> date | None:
    value = str(raw_value or "").strip()
    return parse_date(value) if value else None


def _build_lifecycle_attention_metrics(
    *,
    items: list[dict],
    open_item_count: int | None = None,
    milestone_date=None,
    milestone_label: str = "",
) -> dict:
    today = timezone.localdate()
    open_items = [entry for entry in items if not entry.get("done")]
    open_count = open_item_count if open_item_count is not None else len(open_items)

    escalated_items = [entry for entry in open_items if entry.get("is_escalated")]
    escalation_due_items = [entry for entry in open_items if entry.get("is_escalation_due") and not entry.get("is_escalated")]
    overdue_items = [
        entry
        for entry in open_items
        if entry.get("is_overdue") and not entry.get("is_escalation_due") and not entry.get("is_escalated")
    ]
    due_today_items = [
        entry
        for entry in open_items
        if _parse_lifecycle_iso_date(entry.get("due_on")) == today
        and not entry.get("is_overdue")
        and not entry.get("is_escalation_due")
        and not entry.get("is_escalated")
    ]

    open_due_dates = sorted(
        due_date for due_date in (_parse_lifecycle_iso_date(entry.get("due_on")) for entry in open_items) if due_date
    )
    future_due_dates = [due_date for due_date in open_due_dates if due_date >= today]
    future_escalation_dates = sorted(
        escalation_date
        for escalation_date in (
            _parse_lifecycle_iso_date(entry.get("escalates_on"))
            for entry in open_items
            if not entry.get("is_escalated")
        )
        if escalation_date and escalation_date >= today
    )
    milestone_date_value = milestone_date if isinstance(milestone_date, date) else None

    attention_state = "clear"
    attention_due_on = None
    attention_item_count = 0
    attention_summary = "No open items"

    if escalated_items:
        attention_state = "escalated"
        attention_item_count = len(escalated_items)
        attention_due_on = min(
            (
                _parse_lifecycle_iso_date(entry.get("due_on"))
                or _parse_lifecycle_iso_date(entry.get("escalates_on"))
                for entry in escalated_items
            ),
            default=None,
        )
        attention_summary = (
            "1 escalated item needs attention"
            if attention_item_count == 1
            else f"{attention_item_count} escalated items need attention"
        )
    elif escalation_due_items:
        attention_state = "escalation_due"
        attention_item_count = len(escalation_due_items)
        attention_due_on = min(
            (
                _parse_lifecycle_iso_date(entry.get("escalates_on"))
                or _parse_lifecycle_iso_date(entry.get("due_on"))
                for entry in escalation_due_items
            ),
            default=None,
        )
        attention_summary = (
            "1 item is ready for escalation"
            if attention_item_count == 1
            else f"{attention_item_count} items are ready for escalation"
        )
    elif overdue_items:
        attention_state = "overdue"
        attention_item_count = len(overdue_items)
        attention_due_on = min(
            (_parse_lifecycle_iso_date(entry.get("due_on")) for entry in overdue_items),
            default=None,
        )
        attention_summary = (
            "1 overdue item needs action"
            if attention_item_count == 1
            else f"{attention_item_count} overdue items need action"
        )
    elif due_today_items or (open_count > 0 and milestone_date_value == today):
        attention_state = "due_today"
        attention_item_count = len(due_today_items) or open_count
        attention_due_on = today
        attention_summary = (
            "1 open item is due today"
            if attention_item_count == 1
            else f"{attention_item_count} open items are due today"
        )
    elif future_due_dates or (open_count > 0 and milestone_date_value and milestone_date_value > today):
        attention_state = "scheduled"
        attention_item_count = open_count
        attention_due_on = future_due_dates[0] if future_due_dates else milestone_date_value
        if future_due_dates:
            attention_summary = f"Next due on {attention_due_on.isoformat()}"
        elif milestone_date_value:
            label = milestone_label or "milestone"
            attention_summary = f"Next {label.lower()} on {milestone_date_value.isoformat()}"
        else:
            attention_summary = (
                "1 open item is scheduled"
                if open_count == 1
                else f"{open_count} open items are scheduled"
            )
    elif open_count > 0:
        attention_summary = (
            "1 open item has no SLA date"
            if open_count == 1
            else f"{open_count} open items have no SLA date"
        )

    return {
        "attention_state": attention_state,
        "attention_rank": LIFECYCLE_ATTENTION_RANKS[attention_state],
        "attention_item_count": attention_item_count,
        "attention_summary": attention_summary,
        "attention_due_on": attention_due_on,
        "next_due_on": future_due_dates[0] if future_due_dates else None,
        "next_escalation_on": future_escalation_dates[0] if future_escalation_dates else None,
    }


def _get_lifecycle_attention_sort_key(payload: dict) -> tuple:
    created_at = payload.get("created_at")
    created_at_timestamp = created_at.timestamp() if created_at else 0
    return (
        -int(payload.get("attention_rank", 0) or 0),
        payload.get("attention_due_on") or date.max,
        -created_at_timestamp,
    )


def _is_rehire_journey(employee: Employee) -> bool:
    return employee.employment_status == EmploymentStatus.EXITED


def _is_rehire_onboarding(item: EmployeeOnboarding) -> bool:
    if _is_rehire_journey(item.employee):
        return True
    exit_record = getattr(item.employee, "exit_record", None)
    if not exit_record:
        return False
    joining_date = item.actual_joining_date or item.expected_joining_date
    last_exit_date = exit_record.actual_exit_date or exit_record.approved_last_working_date or exit_record.proposed_last_working_date
    return bool(joining_date and last_exit_date and joining_date > last_exit_date)


def build_hr_admin_onboarding_payload(item: EmployeeOnboarding) -> dict:
    checklist_snapshot = _sync_onboarding_document_checklist_items(
        employee=item.employee,
        joining_date=item.actual_joining_date or item.expected_joining_date,
        checklist_items=_normalize_onboarding_checklist_snapshot(item.checklist_snapshot),
        assigned_owner_identifier=item.assigned_owner_identifier,
    )
    checklist_progress = _get_onboarding_checklist_progress(checklist_snapshot)
    document_summary = _get_employee_document_requirement_summary(
        item.employee,
        joining_date=item.actual_joining_date or item.expected_joining_date,
    )
    attention_metrics = _build_lifecycle_attention_metrics(
        items=checklist_snapshot,
        open_item_count=checklist_progress["checklist_open_count"],
        milestone_date=item.actual_joining_date or item.expected_joining_date,
        milestone_label="joining",
    )
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _lifecycle_employee_name(item.employee),
        "employee_code": item.employee.employee_code,
        "status": item.status,
        "expected_joining_date": item.expected_joining_date,
        "actual_joining_date": item.actual_joining_date,
        "onboarding_template_code": item.onboarding_template_code,
        "owner_value": _build_lifecycle_owner_value_from_identifier(item.assigned_owner_identifier),
        "assigned_owner_identifier": item.assigned_owner_identifier,
        "workflow_reference": item.workflow_reference,
        "checklist_snapshot": checklist_snapshot,
        "notes": item.notes,
        "preboarding_started_at": item.preboarding_started_at,
        "completed_at": item.completed_at,
        "is_rehire_journey": _is_rehire_onboarding(item),
        "checklist_total_count": checklist_progress["checklist_total_count"],
        "checklist_completed_count": checklist_progress["checklist_completed_count"],
        "checklist_open_count": checklist_progress["checklist_open_count"],
        "checklist_overdue_count": checklist_progress["checklist_overdue_count"],
        "checklist_escalation_due_count": checklist_progress["checklist_escalation_due_count"],
        "attention_state": attention_metrics["attention_state"],
        "attention_rank": attention_metrics["attention_rank"],
        "attention_item_count": attention_metrics["attention_item_count"],
        "attention_summary": attention_metrics["attention_summary"],
        "attention_due_on": attention_metrics["attention_due_on"],
        "next_due_on": attention_metrics["next_due_on"],
        "next_escalation_on": attention_metrics["next_escalation_on"],
        "required_document_count": document_summary["required_document_count"],
        "missing_required_document_count": document_summary["missing_required_document_count"],
        "future_due_document_count": document_summary["future_due_document_count"],
        "missing_required_document_names": document_summary["missing_required_document_names"],
    }


def save_hr_admin_onboarding(actor, validated_data, *, item=None):
    tenant = actor.tenant
    is_create = item is None
    previous_checklist_snapshot = _normalize_onboarding_checklist_snapshot(item.checklist_snapshot) if item else []
    previous_document_attention = (
        _get_employee_document_attention_summary(
            item.employee,
            joining_date=item.actual_joining_date or item.expected_joining_date,
        )
        if item and item.employee_id
        else None
    )
    if item is None:
        item = EmployeeOnboarding(tenant=tenant)

    if "employee_id" in validated_data:
        employee = Employee.objects.filter(tenant=tenant, id=validated_data["employee_id"]).first() if validated_data["employee_id"] else None
        if validated_data["employee_id"] and not employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = employee

    for field in [
        "status",
        "expected_joining_date",
        "actual_joining_date",
        "onboarding_template_code",
        "assigned_owner_identifier",
        "workflow_reference",
        "notes",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "owner_value" in validated_data:
        item.assigned_owner_identifier = _get_lifecycle_owner_identifier(validated_data["owner_value"])

    due_context = _build_onboarding_due_context(item)
    hr_owner_membership = _get_lifecycle_hr_owner_membership(
        employee=item.employee,
        preferred_identifier=item.assigned_owner_identifier,
    )
    normalized_snapshot = None
    if "checklist_snapshot" in validated_data:
        normalized_snapshot = _normalize_onboarding_checklist_snapshot(validated_data["checklist_snapshot"])
    elif is_create and item.onboarding_template_code:
        normalized_snapshot = _build_lifecycle_items_from_template(
            tenant=tenant,
            employee=item.employee,
            trigger_key=item.onboarding_template_code,
            default_code_prefix="onboarding-step",
            due_context=due_context,
            hr_owner_membership=hr_owner_membership,
        )
    elif previous_checklist_snapshot:
        normalized_snapshot = _refresh_template_derived_due_dates(
            items=previous_checklist_snapshot,
            due_context=due_context,
        )

    if is_create and not previous_checklist_snapshot and normalized_snapshot == [] and item.onboarding_template_code:
        normalized_snapshot = _build_lifecycle_items_from_template(
            tenant=tenant,
            employee=item.employee,
            trigger_key=item.onboarding_template_code,
            default_code_prefix="onboarding-step",
            due_context=due_context,
            hr_owner_membership=hr_owner_membership,
        )

    synced_snapshot = _sync_onboarding_document_checklist_items(
        employee=item.employee,
        joining_date=item.actual_joining_date or item.expected_joining_date,
        checklist_items=normalized_snapshot if normalized_snapshot is not None else previous_checklist_snapshot,
        assigned_owner_identifier=item.assigned_owner_identifier,
    )
    if normalized_snapshot is not None or synced_snapshot != previous_checklist_snapshot or (is_create and synced_snapshot):
        normalized_snapshot = synced_snapshot

    if normalized_snapshot is not None:
        item.checklist_snapshot = _append_lifecycle_item_history(
            previous_items=previous_checklist_snapshot,
            current_items=normalized_snapshot,
            actor_identifier=actor.employee_code,
        )
        item.checklist_snapshot = _notify_lifecycle_item_attention(
            tenant=tenant,
            subject_type="employee_onboarding",
            subject_identifier=str(item.id) if item.id else "",
            employee=item.employee,
            item_kind="Onboarding Checklist",
            current_items=item.checklist_snapshot,
            previous_items=previous_checklist_snapshot,
        )

    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})

    _validate_onboarding_status_metadata(item, "status")
    _apply_onboarding_status_metadata(item)
    with transaction.atomic():
        item.save()
        _ensure_onboarding_workflow(item)
        _sync_onboarding_employee_state(item)
        _notify_onboarding_document_attention(
            tenant=tenant,
            onboarding=item,
            previous_attention=previous_document_attention,
        )
    return item


def build_hr_admin_probation_review_payload(item: ProbationReview) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _lifecycle_employee_name(item.employee),
        "employee_code": item.employee.employee_code,
        "review_date": item.review_date,
        "probation_end_date": item.probation_end_date,
        "decision": item.decision,
        "extension_end_date": item.extension_end_date,
        "owner_value": _build_lifecycle_owner_value_from_identifier(item.reviewer_identifier),
        "reviewer_identifier": item.reviewer_identifier,
        "workflow_reference": item.workflow_reference,
        "remarks": item.remarks,
    }


def save_hr_admin_probation_review(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = ProbationReview(tenant=tenant)

    if "employee_id" in validated_data:
        employee = Employee.objects.filter(tenant=tenant, id=validated_data["employee_id"]).first() if validated_data["employee_id"] else None
        if validated_data["employee_id"] and not employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = employee

    for field in [
        "review_date",
        "probation_end_date",
        "decision",
        "extension_end_date",
        "reviewer_identifier",
        "workflow_reference",
        "remarks",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "owner_value" in validated_data:
        item.reviewer_identifier = _get_lifecycle_owner_identifier(validated_data["owner_value"])

    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    if item.review_date is None:
        raise serializers.ValidationError({"review_date": "This field is required."})

    _validate_probation_decision_metadata(item)
    with transaction.atomic():
        item.save()
        if item.decision == ProbationDecision.CONFIRM:
            employee = item.employee
            update_fields = []
            probation_end_date = item.probation_end_date or employee.probation_end_date or item.review_date
            confirmation_date = max(item.review_date, probation_end_date)
            if employee.probation_end_date != probation_end_date:
                employee.probation_end_date = probation_end_date
                update_fields.append("probation_end_date")
            if employee.confirmation_date != confirmation_date:
                employee.confirmation_date = confirmation_date
                update_fields.append("confirmation_date")
            if update_fields:
                employee.save(update_fields=[*update_fields, "updated_at"])
        elif item.decision == ProbationDecision.EXTEND and item.employee.probation_end_date != item.extension_end_date:
            item.employee.probation_end_date = item.extension_end_date
            item.employee.save(update_fields=["probation_end_date", "updated_at"])
    return item


def _resolve_lifecycle_relation(tenant, model_class, raw_value, field_name):
    related = model_class.objects.filter(tenant=tenant, id=raw_value).first() if raw_value else None
    if raw_value and not related:
        raise serializers.ValidationError({field_name: "Invalid selection."})
    return related


def _apply_onboarding_status_metadata(item: EmployeeOnboarding):
    if item.status == OnboardingStatus.IN_PROGRESS:
        if item.preboarding_started_at is None:
            item.preboarding_started_at = timezone.now()
        item.completed_at = None
    elif item.status == OnboardingStatus.COMPLETED:
        if item.preboarding_started_at is None:
            item.preboarding_started_at = timezone.now()
        if item.completed_at is None:
            item.completed_at = timezone.now()
    else:
        item.completed_at = None


def _ensure_onboarding_workflow(item: EmployeeOnboarding) -> None:
    if item.workflow_reference or not item.onboarding_template_code:
        return
    hr_owner_membership = _get_lifecycle_hr_owner_membership(
        employee=item.employee,
        preferred_identifier=item.assigned_owner_identifier,
    )
    workflow_instance = create_workflow_instance(
        tenant=item.tenant,
        module=WorkflowModule.LIFECYCLE,
        trigger_key=item.onboarding_template_code,
        subject_type="employee_onboarding",
        subject_identifier=str(item.id),
        initiated_by_identifier=item.assigned_owner_identifier or item.employee.employee_code,
        employee_identifier=str(item.employee_id),
        payload_snapshot={
            "employee_id": str(item.employee_id),
            "employee_code": item.employee.employee_code,
            "onboarding_template_code": item.onboarding_template_code,
            "is_rehire_journey": _is_rehire_onboarding(item),
        },
        manager_membership=_get_lifecycle_manager_membership(item.employee),
        hr_owner_membership=hr_owner_membership,
    )
    item.workflow_reference = str(workflow_instance.id)
    item.save(update_fields=["workflow_reference", "updated_at"])


def _get_onboarding_completion_warning(item: EmployeeOnboarding) -> str:
    checklist = _normalize_onboarding_checklist_snapshot(item.checklist_snapshot)
    open_checklist_count = sum(
        1
        for entry in checklist
        if entry.get("blocking", entry.get("required", True))
        and not entry.get("done")
        and entry.get("due_date_source") != "document_rule"
    )
    checklist_warning = (
        "1 onboarding checklist item is still open"
        if open_checklist_count == 1
        else f"{open_checklist_count} onboarding checklist items are still open"
    )
    if item.actual_joining_date is None and open_checklist_count > 0:
        return f"Actual joining date is required and {checklist_warning} before setting onboarding to Completed."
    if item.actual_joining_date is None:
        return "Actual joining date is required before setting onboarding to Completed."
    if open_checklist_count > 0:
        return f"{checklist_warning.capitalize()} before setting onboarding to Completed."
    document_summary = _get_employee_document_requirement_summary(item.employee, joining_date=item.actual_joining_date)
    if document_summary["missing_required_document_names"]:
        names = ", ".join(document_summary["missing_required_document_names"][:3])
        if len(document_summary["missing_required_document_names"]) > 3:
            names = f"{names} and more"
        return f"Verify required onboarding documents before setting onboarding to Completed: {names}."
    return ""


def _validate_onboarding_status_metadata(item: EmployeeOnboarding, field_name: str):
    if item.status == OnboardingStatus.COMPLETED:
        warning = _get_onboarding_completion_warning(item)
        if warning:
            raise serializers.ValidationError({field_name: warning})
    if _is_rehire_journey(item.employee) and item.status == OnboardingStatus.COMPLETED:
        exit_record = getattr(item.employee, "exit_record", None)
        if not exit_record:
            raise serializers.ValidationError({field_name: "This exited employee cannot be rehired because no exit record exists."})
        if not exit_record.rehire_eligible:
            raise serializers.ValidationError({field_name: "This employee is marked as not eligible for rehire."})
        last_exit_date = exit_record.actual_exit_date or exit_record.approved_last_working_date or exit_record.proposed_last_working_date
        if item.actual_joining_date is None:
            raise serializers.ValidationError({"actual_joining_date": "Actual joining date is required before completing a rehire onboarding."})
        if last_exit_date and item.actual_joining_date <= last_exit_date:
            raise serializers.ValidationError({"actual_joining_date": "Rehire joining date must be later than the employee's last exit date."})


def _validate_probation_decision_metadata(item: ProbationReview):
    if item.decision == ProbationDecision.EXTEND and item.extension_end_date is None:
        raise serializers.ValidationError({"status_value": "Extension end date is required before bulk-extending a probation review."})
    if item.decision == ProbationDecision.EXTEND:
        anchor_date = item.probation_end_date or item.review_date
        if anchor_date and item.extension_end_date and item.extension_end_date <= anchor_date:
            raise serializers.ValidationError(
                {"extension_end_date": "Extension end date must be later than the current probation end date."}
            )
    if item.decision == ProbationDecision.CONFIRM and item.probation_end_date and item.review_date < item.probation_end_date:
        raise serializers.ValidationError(
            {"review_date": "Confirmation review date cannot be earlier than the probation end date."}
        )


def _sync_onboarding_employee_state(item: EmployeeOnboarding) -> None:
    employee = item.employee
    was_rehire = _is_rehire_journey(employee)
    update_fields = []
    if item.status == OnboardingStatus.COMPLETED:
        if employee.date_of_joining != item.actual_joining_date:
            employee.date_of_joining = item.actual_joining_date
            update_fields.append("date_of_joining")
        if was_rehire:
            if employee.probation_end_date is not None:
                employee.probation_end_date = None
                update_fields.append("probation_end_date")
            if employee.confirmation_date is not None:
                employee.confirmation_date = None
                update_fields.append("confirmation_date")
        if employee.employment_status in {EmploymentStatus.DRAFT, EmploymentStatus.INACTIVE, EmploymentStatus.EXITED}:
            employee.employment_status = EmploymentStatus.ACTIVE
            update_fields.append("employment_status")
    if update_fields:
        employee.save(update_fields=[*update_fields, "updated_at"])
    if item.status == OnboardingStatus.COMPLETED and was_rehire:
        EmployeeLifecycleEvent.objects.create(
            tenant=employee.tenant,
            employee=employee,
            event_type=LifecycleEventType.REHIRE,
            status=LifecycleEventStatus.COMPLETED,
            title=f"Rehire completed for {employee.employee_code}",
            effective_date=item.actual_joining_date,
            initiated_at=timezone.now(),
            completed_at=timezone.now(),
            workflow_reference=item.workflow_reference,
            payload={
                "onboarding_id": str(item.id),
                "actual_joining_date": item.actual_joining_date.isoformat() if item.actual_joining_date else "",
            },
        )


def _movement_target_fields() -> list[str]:
    return [
        "to_legal_entity",
        "to_branch",
        "to_location",
        "to_department",
        "to_business_unit",
        "to_designation",
        "to_grade",
        "to_employment_type",
        "to_manager",
    ]


def _validate_movement_metadata(item: EmployeeMovement) -> None:
    target_fields = _movement_target_fields()
    if not any(getattr(item, field) is not None for field in target_fields):
        raise serializers.ValidationError({"detail": "Select at least one target change for this movement."})

    if item.to_manager_id and item.to_manager_id == item.employee_id:
        raise serializers.ValidationError({"to_manager_id": "An employee cannot become their own manager."})

    movement_required_targets = {
        MovementType.TRANSFER: {"to_legal_entity", "to_branch", "to_location", "to_department", "to_business_unit"},
        MovementType.PROMOTION: {"to_designation", "to_grade"},
        MovementType.DESIGNATION_CHANGE: {"to_designation"},
        MovementType.REPORTING_CHANGE: {"to_manager"},
        MovementType.GRADE_CHANGE: {"to_grade"},
        MovementType.EMPLOYMENT_TYPE_CHANGE: {"to_employment_type"},
        MovementType.LOCATION_CHANGE: {"to_location", "to_branch"},
    }
    required_targets = movement_required_targets.get(item.movement_type, set())
    if required_targets and not any(getattr(item, field) is not None for field in required_targets):
        readable_label = MOVEMENT_TYPE_LABELS.get(item.movement_type, "This movement")
        raise serializers.ValidationError(
            {"movement_type": f"{readable_label} requires at least one matching target field to be selected."}
        )

    proposed_values = {
        "legal_entity": item.to_legal_entity or item.employee.legal_entity,
        "branch": item.to_branch or item.employee.branch,
        "location": item.to_location or item.employee.location,
        "department": item.to_department or item.employee.department,
        "business_unit": item.to_business_unit or item.employee.business_unit,
        "cost_center": item.employee.cost_center,
        "designation": item.to_designation or item.employee.designation,
        "grade": item.to_grade or item.employee.grade,
        "employment_type": item.to_employment_type or item.employee.employment_type,
        "reporting_manager": item.to_manager if item.to_manager_id is not None else item.employee.reporting_manager,
    }
    probe = Employee(
        tenant=item.employee.tenant,
        employee_code=item.employee.employee_code,
        first_name=item.employee.first_name,
        last_name=item.employee.last_name,
        legal_entity=proposed_values["legal_entity"],
        branch=proposed_values["branch"],
        location=proposed_values["location"],
        department=proposed_values["department"],
        business_unit=proposed_values["business_unit"],
        cost_center=proposed_values["cost_center"],
        designation=proposed_values["designation"],
        grade=proposed_values["grade"],
        employment_type=proposed_values["employment_type"],
        reporting_manager=proposed_values["reporting_manager"],
    )
    _validate_employee_structure_consistency(probe)

    if item.status in {LifecycleEventStatus.APPROVED, LifecycleEventStatus.COMPLETED}:
        effective_changes = []
        employee_field_map = {
            "to_legal_entity": "legal_entity",
            "to_branch": "branch",
            "to_location": "location",
            "to_department": "department",
            "to_business_unit": "business_unit",
            "to_designation": "designation",
            "to_grade": "grade",
            "to_employment_type": "employment_type",
            "to_manager": "reporting_manager",
        }
        for field in target_fields:
            employee_field = employee_field_map[field]
            if getattr(item, field) != getattr(item.employee, employee_field):
                effective_changes.append(field)
        if not effective_changes:
            raise serializers.ValidationError({"detail": "Movement targets do not change the employee's current structure."})


def _apply_movement_to_employee(item: EmployeeMovement) -> None:
    if item.status != LifecycleEventStatus.COMPLETED:
        return

    employee = item.employee
    update_fields = []
    field_map = {
        "to_legal_entity": "legal_entity",
        "to_branch": "branch",
        "to_location": "location",
        "to_department": "department",
        "to_business_unit": "business_unit",
        "to_designation": "designation",
        "to_grade": "grade",
        "to_employment_type": "employment_type",
        "to_manager": "reporting_manager",
    }
    for source_field, employee_field in field_map.items():
        source_value = getattr(item, source_field)
        if source_value is not None and getattr(employee, employee_field) != source_value:
            setattr(employee, employee_field, source_value)
            update_fields.append(employee_field)

    if update_fields:
        _validate_employee_structure_consistency(employee)
        employee.save(update_fields=[*update_fields, "updated_at"])


def _validate_exit_metadata(item: EmployeeExit) -> None:
    clearance_snapshot = _normalize_exit_clearance_snapshot(item.clearance_status_snapshot)
    clearance_progress = _get_exit_clearance_progress(clearance_snapshot)
    if item.notice_start_date and item.resignation_date and item.notice_start_date < item.resignation_date:
        raise serializers.ValidationError({"notice_start_date": "Notice start date cannot be earlier than resignation date."})
    if item.notice_end_date and item.notice_start_date and item.notice_end_date < item.notice_start_date:
        raise serializers.ValidationError({"notice_end_date": "Notice end date cannot be earlier than notice start date."})
    if item.proposed_last_working_date and item.resignation_date and item.proposed_last_working_date < item.resignation_date:
        raise serializers.ValidationError(
            {"proposed_last_working_date": "Proposed last working date cannot be earlier than resignation date."}
        )
    if item.approved_last_working_date and item.proposed_last_working_date and item.approved_last_working_date < item.proposed_last_working_date:
        raise serializers.ValidationError(
            {"approved_last_working_date": "Approved last working date cannot be earlier than proposed last working date."}
        )
    if item.actual_exit_date and item.approved_last_working_date and item.actual_exit_date < item.approved_last_working_date:
        raise serializers.ValidationError({"actual_exit_date": "Actual exit date cannot be earlier than approved last working date."})

    if item.status == ExitStatus.APPROVED and item.approved_last_working_date is None:
        raise serializers.ValidationError({"approved_last_working_date": "Approved last working date is required before approving an exit."})
    if item.status == ExitStatus.CLEARANCE_IN_PROGRESS and item.approved_last_working_date is None:
        raise serializers.ValidationError(
            {"approved_last_working_date": "Approved last working date is required before starting exit clearance."}
        )
    if item.status == ExitStatus.CLEARANCE_IN_PROGRESS and not clearance_snapshot["items"]:
        raise serializers.ValidationError({"clearance_status_snapshot": "Add at least one clearance item before starting exit clearance."})
    if item.status == ExitStatus.COMPLETED:
        if item.actual_exit_date is None:
            raise serializers.ValidationError({"actual_exit_date": "Actual exit date is required before completing an exit."})
        if clearance_progress["blocking_open_count"] > 0:
            raise serializers.ValidationError({"clearance_status_snapshot": "Complete all blocking clearance items before completing an exit."})
        if _employee_has_live_access(item.employee):
            raise serializers.ValidationError(
                {"detail": "Deactivate employee access first before completing an exit for this employee."}
            )


def _ensure_exit_workflow(item: EmployeeExit) -> None:
    clearance_snapshot = _normalize_exit_clearance_snapshot(item.clearance_status_snapshot)
    trigger_key = clearance_snapshot.get("workflow_template_code", "")
    if item.workflow_reference or not trigger_key or item.status not in {ExitStatus.CLEARANCE_IN_PROGRESS, ExitStatus.COMPLETED}:
        return
    hr_owner_membership = _get_lifecycle_hr_owner_membership(employee=item.employee)
    workflow_instance = create_workflow_instance(
        tenant=item.tenant,
        module=WorkflowModule.LIFECYCLE,
        trigger_key=trigger_key,
        subject_type="employee_exit",
        subject_identifier=str(item.id),
        initiated_by_identifier=item.employee.employee_code,
        employee_identifier=str(item.employee_id),
        payload_snapshot={
            "employee_id": str(item.employee_id),
            "employee_code": item.employee.employee_code,
            "exit_reason": item.exit_reason,
            "status": item.status,
            "clearance_total_count": _get_exit_clearance_progress(clearance_snapshot)["clearance_total_count"],
        },
        manager_membership=_get_lifecycle_manager_membership(item.employee),
        hr_owner_membership=hr_owner_membership,
    )
    item.workflow_reference = str(workflow_instance.id)
    item.save(update_fields=["workflow_reference", "updated_at"])


def _sync_exit_employee_state(item: EmployeeExit) -> None:
    employee = item.employee
    if item.status == ExitStatus.COMPLETED and employee.employment_status != EmploymentStatus.EXITED:
        employee.employment_status = EmploymentStatus.EXITED
        employee.save(update_fields=["employment_status", "updated_at"])
    elif item.status in {ExitStatus.APPROVED, ExitStatus.CLEARANCE_IN_PROGRESS} and employee.employment_status == EmploymentStatus.ACTIVE:
        employee.employment_status = EmploymentStatus.ON_NOTICE
        employee.save(update_fields=["employment_status", "updated_at"])


def build_hr_admin_movement_payload(item: EmployeeMovement) -> dict:
    def employee_name(value):
        return _lifecycle_employee_name(value) if value else None

    def name(value):
        return value.name if value else None

    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _lifecycle_employee_name(item.employee),
        "employee_code": item.employee.employee_code,
        "movement_type": item.movement_type,
        "status": item.status,
        "effective_date": item.effective_date,
        "reason": item.reason,
        "workflow_reference": item.workflow_reference,
        "current_snapshot": item.current_snapshot,
        "from_legal_entity_id": item.from_legal_entity_id,
        "from_legal_entity": name(item.from_legal_entity),
        "to_legal_entity_id": item.to_legal_entity_id,
        "to_legal_entity": name(item.to_legal_entity),
        "from_branch_id": item.from_branch_id,
        "from_branch": name(item.from_branch),
        "to_branch_id": item.to_branch_id,
        "to_branch": name(item.to_branch),
        "from_location_id": item.from_location_id,
        "from_location": name(item.from_location),
        "to_location_id": item.to_location_id,
        "to_location": name(item.to_location),
        "from_department_id": item.from_department_id,
        "from_department": name(item.from_department),
        "to_department_id": item.to_department_id,
        "to_department": name(item.to_department),
        "from_business_unit_id": item.from_business_unit_id,
        "from_business_unit": name(item.from_business_unit),
        "to_business_unit_id": item.to_business_unit_id,
        "to_business_unit": name(item.to_business_unit),
        "from_designation_id": item.from_designation_id,
        "from_designation": name(item.from_designation),
        "to_designation_id": item.to_designation_id,
        "to_designation": name(item.to_designation),
        "from_grade_id": item.from_grade_id,
        "from_grade": name(item.from_grade),
        "to_grade_id": item.to_grade_id,
        "to_grade": name(item.to_grade),
        "from_employment_type_id": item.from_employment_type_id,
        "from_employment_type": name(item.from_employment_type),
        "to_employment_type_id": item.to_employment_type_id,
        "to_employment_type": name(item.to_employment_type),
        "from_manager_id": item.from_manager_id,
        "from_manager": employee_name(item.from_manager),
        "owner_value": _build_lifecycle_owner_value_from_employee(item.to_manager),
        "to_manager_id": item.to_manager_id,
        "to_manager": employee_name(item.to_manager),
    }


def save_hr_admin_movement(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = EmployeeMovement(tenant=tenant)

    if "employee_id" in validated_data:
        employee = Employee.objects.filter(tenant=tenant, id=validated_data["employee_id"]).first() if validated_data["employee_id"] else None
        if validated_data["employee_id"] and not employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = employee

    for field in ["movement_type", "status", "effective_date", "reason", "workflow_reference"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "current_snapshot" in validated_data:
        item.current_snapshot = validated_data["current_snapshot"] or {}

    relation_map = {
        "from_legal_entity_id": LegalEntity,
        "to_legal_entity_id": LegalEntity,
        "from_branch_id": Branch,
        "to_branch_id": Branch,
        "from_location_id": Location,
        "to_location_id": Location,
        "from_department_id": Department,
        "to_department_id": Department,
        "from_business_unit_id": BusinessUnit,
        "to_business_unit_id": BusinessUnit,
        "from_designation_id": Designation,
        "to_designation_id": Designation,
        "from_grade_id": Grade,
        "to_grade_id": Grade,
        "from_employment_type_id": EmploymentType,
        "to_employment_type_id": EmploymentType,
        "from_manager_id": Employee,
        "to_manager_id": Employee,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            relation_name = field_name.replace("_id", "")
            setattr(item, relation_name, _resolve_lifecycle_relation(tenant, model_class, validated_data[field_name], field_name))

    if "owner_value" in validated_data:
        item.to_manager = _resolve_lifecycle_owner_employee(tenant, validated_data["owner_value"])

    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    if item.effective_date is None:
        raise serializers.ValidationError({"effective_date": "This field is required."})

    _validate_movement_metadata(item)
    with transaction.atomic():
        item.save()
        _apply_movement_to_employee(item)
    return item


def build_hr_admin_exit_payload(item: EmployeeExit) -> dict:
    clearance_snapshot = _normalize_exit_clearance_snapshot(item.clearance_status_snapshot)
    clearance_progress = _get_exit_clearance_progress(clearance_snapshot)
    attention_metrics = _build_lifecycle_attention_metrics(
        items=clearance_snapshot.get("items", []),
        open_item_count=clearance_progress["clearance_open_count"],
        milestone_date=item.approved_last_working_date or item.proposed_last_working_date,
        milestone_label="last working date",
    )
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _lifecycle_employee_name(item.employee),
        "employee_code": item.employee.employee_code,
        "status": item.status,
        "resignation_date": item.resignation_date,
        "notice_start_date": item.notice_start_date,
        "notice_end_date": item.notice_end_date,
        "proposed_last_working_date": item.proposed_last_working_date,
        "approved_last_working_date": item.approved_last_working_date,
        "actual_exit_date": item.actual_exit_date,
        "exit_reason": item.exit_reason,
        "exit_reason_detail": item.exit_reason_detail,
        "is_regrettable": item.is_regrettable,
        "rehire_eligible": item.rehire_eligible,
        "workflow_reference": item.workflow_reference,
        "clearance_status_snapshot": clearance_snapshot,
        "clearance_total_count": clearance_progress["clearance_total_count"],
        "clearance_completed_count": clearance_progress["clearance_completed_count"],
        "clearance_open_count": clearance_progress["clearance_open_count"],
        "clearance_overdue_count": clearance_progress["clearance_overdue_count"],
        "clearance_escalation_due_count": clearance_progress["clearance_escalation_due_count"],
        "attention_state": attention_metrics["attention_state"],
        "attention_rank": attention_metrics["attention_rank"],
        "attention_item_count": attention_metrics["attention_item_count"],
        "attention_summary": attention_metrics["attention_summary"],
        "attention_due_on": attention_metrics["attention_due_on"],
        "next_due_on": attention_metrics["next_due_on"],
        "next_escalation_on": attention_metrics["next_escalation_on"],
        "handover_notes": item.handover_notes,
    }


def save_hr_admin_exit(actor, validated_data, *, item=None):
    tenant = actor.tenant
    is_create = item is None
    previous_clearance_snapshot = _normalize_exit_clearance_snapshot(item.clearance_status_snapshot) if item else {"items": []}
    if item is None:
        item = EmployeeExit(tenant=tenant)

    if "employee_id" in validated_data:
        employee = Employee.objects.filter(tenant=tenant, id=validated_data["employee_id"]).first() if validated_data["employee_id"] else None
        if validated_data["employee_id"] and not employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = employee

    for field in [
        "status",
        "resignation_date",
        "notice_start_date",
        "notice_end_date",
        "proposed_last_working_date",
        "approved_last_working_date",
        "actual_exit_date",
        "exit_reason",
        "exit_reason_detail",
        "is_regrettable",
        "rehire_eligible",
        "workflow_reference",
        "handover_notes",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    due_context = _build_exit_due_context(item)
    hr_owner_membership = _get_lifecycle_hr_owner_membership(employee=item.employee)
    normalized_snapshot = None
    if "clearance_status_snapshot" in validated_data:
        normalized_snapshot = _normalize_exit_clearance_snapshot(validated_data["clearance_status_snapshot"])
        trigger_key = normalized_snapshot.get("workflow_template_code", "")
        if is_create and not normalized_snapshot.get("items") and trigger_key:
            normalized_snapshot["items"] = _build_lifecycle_items_from_template(
                tenant=tenant,
                employee=item.employee,
                trigger_key=trigger_key,
                default_code_prefix="exit-step",
                due_context=due_context,
                hr_owner_membership=hr_owner_membership,
            )
    elif previous_clearance_snapshot.get("items"):
        normalized_snapshot = dict(previous_clearance_snapshot)
        normalized_snapshot["items"] = _refresh_template_derived_due_dates(
            items=previous_clearance_snapshot.get("items", []),
            due_context=due_context,
        )
    if normalized_snapshot is not None:
        normalized_snapshot["items"] = _append_lifecycle_item_history(
            previous_items=previous_clearance_snapshot.get("items", []),
            current_items=normalized_snapshot.get("items", []),
            actor_identifier=actor.employee_code,
        )
        normalized_snapshot["items"] = _notify_lifecycle_item_attention(
            tenant=tenant,
            subject_type="employee_exit",
            subject_identifier=str(item.id) if item.id else "",
            employee=item.employee,
            item_kind="Exit Clearance",
            current_items=normalized_snapshot["items"],
            previous_items=previous_clearance_snapshot.get("items", []),
        )
        item.clearance_status_snapshot = normalized_snapshot

    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})

    _validate_exit_metadata(item)
    with transaction.atomic():
        item.save()
        _ensure_exit_workflow(item)
        _sync_exit_employee_state(item)
    return item


def _build_lifecycle_choice_map(choices) -> dict[str, str]:
    return {value: label for value, label in choices}


def _get_lifecycle_owner_identifier(raw_value: str) -> str:
    return (raw_value or "").strip().removeprefix("identifier:").strip()


def _get_employee_owner_identifier(employee: Employee | None) -> str:
    if not employee:
        return ""
    membership = getattr(employee, "membership", None)
    user = getattr(membership, "user", None) if membership else None
    return (getattr(user, "username", "") or employee.employee_code or "").strip()


def _build_lifecycle_owner_value_from_identifier(identifier: str) -> str:
    normalized = (identifier or "").strip()
    return f"identifier:{normalized.lower()}" if normalized else ""


def _build_lifecycle_owner_value_from_employee(employee: Employee | None) -> str:
    return _build_lifecycle_owner_value_from_identifier(_get_employee_owner_identifier(employee))


def _resolve_lifecycle_owner_employee(tenant, owner_value: str) -> Employee | None:
    if (owner_value or "").startswith("employee:"):
        employee_id = owner_value.removeprefix("employee:").strip()
        return Employee.objects.filter(tenant=tenant, id=employee_id).select_related("membership__user").first() if employee_id else None
    owner_identifier = _get_lifecycle_owner_identifier(owner_value)
    if not owner_identifier:
        return None
    return (
        Employee.objects.filter(tenant=tenant)
        .select_related("membership__user")
        .filter(Q(membership__user__username__iexact=owner_identifier) | Q(employee_code__iexact=owner_identifier))
        .first()
    )


ONBOARDING_STATUS_LABELS = _build_lifecycle_choice_map(OnboardingStatus.choices)
PROBATION_DECISION_LABELS = _build_lifecycle_choice_map(ProbationDecision.choices)
MOVEMENT_TYPE_LABELS = _build_lifecycle_choice_map(MovementType.choices)
LIFECYCLE_STATUS_LABELS = _build_lifecycle_choice_map(LifecycleEventStatus.choices)
EXIT_STATUS_LABELS = _build_lifecycle_choice_map(ExitStatus.choices)


def build_hr_admin_lifecycle_queue_item(item_type: str, item, *, document_attention_cache=None) -> dict:
    joining_date = None
    if item_type == "onboarding":
        joining_date = item.actual_joining_date or item.expected_joining_date
    elif getattr(item.employee, "date_of_joining", None):
        joining_date = item.employee.date_of_joining

    document_attention_key = (
        str(item.employee_id),
        joining_date.isoformat() if joining_date else "",
    )
    if document_attention_cache is not None and document_attention_key in document_attention_cache:
        document_attention = document_attention_cache[document_attention_key]
    else:
        document_attention = _get_employee_document_attention_summary(item.employee, joining_date=joining_date)
        if document_attention_cache is not None:
            document_attention_cache[document_attention_key] = document_attention

    payload = {
        "id": item.id,
        "item_type": item_type,
        "employee_id": item.employee_id,
        "employee_name": _lifecycle_employee_name(item.employee),
        "employee_code": item.employee.employee_code,
        "workflow_reference": getattr(item, "workflow_reference", "") or "",
        "bulk_status_warning": "",
        "created_at": item.created_at,
        "attention_state": "clear",
        "attention_rank": 0,
        "attention_item_count": 0,
        "attention_summary": "No open items",
        "attention_due_on": None,
        "next_due_on": None,
        "next_escalation_on": None,
        **document_attention,
    }

    if item_type == "onboarding":
        checklist = _normalize_onboarding_checklist_snapshot(item.checklist_snapshot)
        checklist_progress = _get_onboarding_checklist_progress(checklist)
        attention_metrics = _build_lifecycle_attention_metrics(
            items=checklist,
            open_item_count=checklist_progress["checklist_open_count"],
            milestone_date=item.actual_joining_date or item.expected_joining_date,
            milestone_label="joining",
        )
        summary = item.notes or (
            f"Checklist progress {checklist_progress['checklist_completed_count']}/{checklist_progress['checklist_total_count']}"
            if checklist_progress["checklist_total_count"]
            else ""
        )
        if checklist_progress["checklist_overdue_count"] > 0:
            summary = (
                f"{summary} | {checklist_progress['checklist_overdue_count']} overdue"
                if summary
                else f"{checklist_progress['checklist_overdue_count']} overdue checklist items"
            )
        payload.update(
            {
                "item_label": "Onboarding",
                "detail_href": f"/hr-admin/onboardings/{item.id}/edit",
                "status": item.status,
                "status_label": ONBOARDING_STATUS_LABELS.get(item.status, item.status),
                "primary_date": item.expected_joining_date,
                "primary_date_label": "Expected joining",
                "secondary_date": item.actual_joining_date,
                "secondary_date_label": "Actual joining",
                "owner_value": _build_lifecycle_owner_value_from_identifier(item.assigned_owner_identifier),
                "owner_label": item.assigned_owner_identifier,
                "summary": summary,
                "bulk_status_warning": _get_onboarding_completion_warning(item),
                "attention_state": attention_metrics["attention_state"],
                "attention_rank": attention_metrics["attention_rank"],
                "attention_item_count": attention_metrics["attention_item_count"],
                "attention_summary": attention_metrics["attention_summary"],
                "attention_due_on": attention_metrics["attention_due_on"],
                "next_due_on": attention_metrics["next_due_on"],
                "next_escalation_on": attention_metrics["next_escalation_on"],
            }
        )
        return payload

    if item_type == "probation":
        payload.update(
            {
                "item_label": "Probation review",
                "detail_href": f"/hr-admin/probation-reviews/{item.id}/edit",
                "status": item.decision,
                "status_label": PROBATION_DECISION_LABELS.get(item.decision, item.decision),
                "primary_date": item.review_date,
                "primary_date_label": "Review date",
                "secondary_date": item.probation_end_date,
                "secondary_date_label": "Probation end",
                "owner_value": _build_lifecycle_owner_value_from_identifier(item.reviewer_identifier),
                "owner_label": item.reviewer_identifier,
                "summary": item.remarks,
                "bulk_status_warning": "Extension end date is required before setting decision to Extend." if item.extension_end_date is None else "",
            }
        )
        payload.update(
            _build_lifecycle_attention_metrics(
                items=[],
                open_item_count=1 if item.decision in {"", ProbationDecision.PENDING if hasattr(ProbationDecision, "PENDING") else ""} else 0,
                milestone_date=item.review_date,
                milestone_label="review date",
            )
        )
        return payload

    if item_type == "movement":
        summary_parts = [
            MOVEMENT_TYPE_LABELS.get(item.movement_type, item.movement_type),
            item.to_department.name if item.to_department else "",
            item.to_designation.name if item.to_designation else "",
        ]
        payload.update(
            {
                "item_label": "Movement",
                "detail_href": f"/hr-admin/movements/{item.id}/edit",
                "status": item.status,
                "status_label": LIFECYCLE_STATUS_LABELS.get(item.status, item.status),
                "primary_date": item.effective_date,
                "primary_date_label": "Effective date",
                "secondary_date": None,
                "secondary_date_label": "",
                "owner_value": _build_lifecycle_owner_value_from_employee(item.to_manager),
                "owner_label": _lifecycle_employee_name(item.to_manager) if item.to_manager else "",
                "summary": item.reason or " / ".join(part for part in summary_parts if part),
            }
        )
        payload.update(
            _build_lifecycle_attention_metrics(
                items=[],
                open_item_count=1 if item.status not in {LifecycleEventStatus.COMPLETED, LifecycleEventStatus.REJECTED} else 0,
                milestone_date=item.effective_date,
                milestone_label="effective date",
            )
        )
        return payload

    payload.update(
        {
            "item_label": "Exit",
            "detail_href": f"/hr-admin/exits/{item.id}/edit",
            "status": item.status,
            "status_label": EXIT_STATUS_LABELS.get(item.status, item.status),
            "primary_date": item.proposed_last_working_date,
            "primary_date_label": "Last working date",
            "secondary_date": item.actual_exit_date,
            "secondary_date_label": "Actual exit",
            "owner_value": "",
            "owner_label": "",
            "summary": item.exit_reason_detail or item.handover_notes or item.exit_reason,
        }
    )
    clearance_snapshot = _normalize_exit_clearance_snapshot(item.clearance_status_snapshot)
    clearance_progress = _get_exit_clearance_progress(clearance_snapshot)
    attention_metrics = _build_lifecycle_attention_metrics(
        items=clearance_snapshot.get("items", []),
        open_item_count=clearance_progress["clearance_open_count"],
        milestone_date=item.approved_last_working_date or item.proposed_last_working_date,
        milestone_label="last working date",
    )
    payload.update(attention_metrics)
    if clearance_progress["clearance_total_count"] > 0:
        clearance_summary = (
            f"Clearance {clearance_progress['clearance_completed_count']}/{clearance_progress['clearance_total_count']}"
        )
        if clearance_progress["clearance_overdue_count"] > 0:
            clearance_summary = f"{clearance_summary} | {clearance_progress['clearance_overdue_count']} overdue"
        payload["summary"] = payload["summary"] or clearance_summary
    return payload


def build_hr_admin_notification_template_payload(item: NotificationTemplate) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "channel": item.channel,
        "status": item.status,
        "subject_template": item.subject_template,
        "title_template": item.title_template,
        "body_template": item.body_template,
        "metadata_template": item.metadata_template,
        "is_system_seeded": item.is_system_seeded,
    }


def save_hr_admin_notification_template(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = NotificationTemplate(tenant=tenant)

    next_code = validated_data.get("code", item.code)
    next_channel = validated_data.get("channel", item.channel)
    if next_code and next_channel:
        duplicate = NotificationTemplate.objects.filter(
            tenant=tenant,
            code=next_code,
            channel=next_channel,
        )
        if item.id:
            duplicate = duplicate.exclude(id=item.id)
        if duplicate.exists():
            raise serializers.ValidationError({"code": "A notification template with this code and channel already exists."})

    for field in [
        "code",
        "name",
        "channel",
        "status",
        "subject_template",
        "title_template",
        "body_template",
        "is_system_seeded",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "metadata_template" in validated_data:
        item.metadata_template = validated_data["metadata_template"] or {}

    item.save()
    return item


def build_hr_admin_notification_event_payload(item: NotificationEventDefinition) -> dict:
    membership_name = None
    if item.membership:
        membership_name = item.membership.user.display_name or item.membership.user.get_full_name() or item.membership.user.username
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "module": item.module,
        "trigger_key": item.trigger_key,
        "audience_type": item.audience_type,
        "channel": item.channel,
        "template_id": item.template_id,
        "template_name": item.template.name if item.template else None,
        "role_id": item.role_id,
        "role_name": item.role.name if item.role else None,
        "membership_id": item.membership_id,
        "membership_name": membership_name,
        "is_active": item.is_active,
        "priority": item.priority,
        "delivery_delay_minutes": item.delivery_delay_minutes,
        "recipient_snapshot": item.recipient_snapshot,
    }


def save_hr_admin_notification_event(actor, validated_data, *, item=None):
    tenant = actor.tenant
    if item is None:
        item = NotificationEventDefinition(tenant=tenant)

    effective_channel = validated_data.get("channel", item.channel)
    next_code = validated_data.get("code", item.code)
    if next_code:
        duplicate = NotificationEventDefinition.objects.filter(tenant=tenant, code=next_code)
        if item.id:
            duplicate = duplicate.exclude(id=item.id)
        if duplicate.exists():
            raise serializers.ValidationError({"code": "A notification event with this code already exists."})

    if "template_id" in validated_data:
        template = NotificationTemplate.objects.filter(tenant=tenant, id=validated_data["template_id"]).first() if validated_data["template_id"] else None
        if validated_data["template_id"] and not template:
            raise serializers.ValidationError({"template_id": "Invalid selection."})
        if template and effective_channel and template.channel != effective_channel:
            raise serializers.ValidationError({"template_id": "Template channel must match the event delivery channel."})
        item.template = template

    if "role_id" in validated_data:
        role = Role.objects.filter(tenant=tenant, id=validated_data["role_id"], is_active=True).first() if validated_data["role_id"] else None
        if validated_data["role_id"] and not role:
            raise serializers.ValidationError({"role_id": "Invalid selection."})
        item.role = role

    if "membership_id" in validated_data:
        membership = TenantMembership.objects.filter(tenant=tenant, id=validated_data["membership_id"]).first() if validated_data["membership_id"] else None
        if validated_data["membership_id"] and not membership:
            raise serializers.ValidationError({"membership_id": "Invalid selection."})
        item.membership = membership

    for field in [
        "code",
        "name",
        "module",
        "trigger_key",
        "audience_type",
        "channel",
        "is_active",
        "priority",
        "delivery_delay_minutes",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "recipient_snapshot" in validated_data:
        item.recipient_snapshot = validated_data["recipient_snapshot"] or {}

    item.save()
    return item


def _render_notification_preview_value(value, payload: dict) -> str:
    if not isinstance(value, str) or not value:
        return "" if value is None else str(value)
    try:
        return value.format(**payload)
    except Exception:
        return value


def _render_notification_preview_json(value, payload: dict):
    if isinstance(value, dict):
        return {key: _render_notification_preview_json(item, payload) for key, item in value.items()}
    if isinstance(value, list):
        return [_render_notification_preview_json(item, payload) for item in value]
    if isinstance(value, str):
        return _render_notification_preview_value(value, payload)
    return value


def _get_notification_preview_membership(*, tenant, membership_id):
    if not membership_id:
        return None
    return TenantMembership.objects.filter(tenant=tenant, id=membership_id).select_related("user", "employee").first()


def _build_notification_preview_recipient_payload(membership: TenantMembership | None, *, channel: str, identifier: str = "", address: str = "") -> dict:
    preview_notification = Notification(
        tenant=membership.tenant if membership else None,
        channel=channel,
        recipient_membership=membership,
        recipient_identifier=identifier,
        recipient_address=address,
        payload={},
    )
    resolved_address = resolve_notification_recipient_address(preview_notification)
    membership_name = None
    if membership:
        membership_name = membership.user.display_name or membership.user.get_full_name() or membership.user.username
        if not identifier:
            identifier = membership.user.username
    return {
        "membership_id": membership.id if membership else None,
        "membership_name": membership_name,
        "identifier": identifier or "",
        "address": resolved_address or address or "",
    }


def _build_notification_preview_payload(
    *,
    channel: str,
    audience_type: str = "",
    title: str,
    subject: str,
    body: str,
    metadata: dict,
    payload: dict,
    routing_summary: str,
    membership: TenantMembership | None,
    identifier: str = "",
    address: str = "",
) -> dict:
    return {
        "channel": channel,
        "audience_type": audience_type,
        "title": title,
        "subject": subject,
        "body": body,
        "metadata": metadata,
        "payload": payload,
        "routing_summary": routing_summary,
        "resolved_recipient": _build_notification_preview_recipient_payload(
            membership,
            channel=channel,
            identifier=identifier,
            address=address,
        ),
    }


def _build_notification_template_preview(
    *,
    channel: str,
    subject_template: str,
    title_template: str,
    body_template: str,
    metadata_template: dict,
    sample_payload: dict,
    membership: TenantMembership | None,
) -> dict:
    rendered_metadata = _render_notification_preview_json(metadata_template, sample_payload)
    return _build_notification_preview_payload(
        channel=channel,
        title=_render_notification_preview_value(title_template, sample_payload),
        subject=_render_notification_preview_value(subject_template, sample_payload),
        body=_render_notification_preview_value(body_template, sample_payload),
        metadata=rendered_metadata if isinstance(rendered_metadata, dict) else {},
        payload=sample_payload,
        routing_summary="Preview rendered directly from template content.",
        membership=membership,
    )


def _create_test_notification_from_template(
    *,
    actor,
    channel: str,
    subject_template: str,
    title_template: str,
    body_template: str,
    metadata_template: dict,
    sample_payload: dict,
    membership: TenantMembership | None,
    process_now: bool,
) -> Notification:
    rendered_metadata = _render_notification_preview_json(metadata_template, sample_payload)
    notification = Notification.objects.create(
        tenant=actor.tenant,
        channel=channel,
        audience_type=NotificationAudienceType.MEMBERSHIP if membership else NotificationAudienceType.CUSTOM,
        recipient_membership=membership,
        recipient_identifier=membership.user.username if membership else "preview-target",
        subject_type="notification_template_preview",
        subject_identifier="template-preview",
        title=_render_notification_preview_value(title_template, sample_payload),
        subject=_render_notification_preview_value(subject_template, sample_payload),
        body=_render_notification_preview_value(body_template, sample_payload),
        status=NotificationStatus.PENDING,
        priority=NotificationPriority.NORMAL,
        payload={
            **sample_payload,
            "metadata_template": rendered_metadata,
            "preview_mode": "template_test_send",
        },
    )
    if process_now:
        notification = process_notification(notification)
    return notification


def _build_notification_event_preview(
    *,
    actor,
    validated_data: dict,
    sample_payload: dict,
) -> tuple[dict, TenantMembership | None, Role | None]:
    tenant = actor.tenant
    template = NotificationTemplate.objects.filter(tenant=tenant, id=validated_data.get("template_id")).first() if validated_data.get("template_id") else None
    role = Role.objects.filter(tenant=tenant, id=validated_data.get("role_id"), is_active=True).first() if validated_data.get("role_id") else None
    membership = _get_notification_preview_membership(tenant=tenant, membership_id=validated_data.get("membership_id"))
    recipient_snapshot = validated_data.get("recipient_snapshot") or {}
    rendered_snapshot = _render_notification_preview_json(recipient_snapshot, sample_payload)
    preview_payload = {
        **sample_payload,
        "event_code": validated_data.get("code", ""),
        "trigger_key": validated_data.get("trigger_key", ""),
    }
    routing_bits = [f"Audience: {validated_data['audience_type']}"]
    if role:
        routing_bits.append(f"Role: {role.name}")
    if membership:
        routing_bits.append(f"Fixed membership: {membership.user.display_name or membership.user.get_full_name() or membership.user.username}")
    if rendered_snapshot:
        routing_bits.append("Recipient snapshot included")
    preview = _build_notification_preview_payload(
        channel=validated_data["channel"],
        audience_type=validated_data["audience_type"],
        title=_render_notification_preview_value(template.title_template if template else validated_data.get("name", ""), preview_payload),
        subject=_render_notification_preview_value(template.subject_template if template else "", preview_payload),
        body=_render_notification_preview_value(
            template.body_template if template else f"Test notification for {validated_data.get('name', 'notification event')}.",
            preview_payload,
        ),
        metadata=rendered_snapshot if isinstance(rendered_snapshot, dict) else {},
        payload=preview_payload,
        routing_summary=" | ".join(routing_bits),
        membership=membership,
    )
    return preview, membership, role


def _create_test_notification_from_event(
    *,
    actor,
    validated_data: dict,
    sample_payload: dict,
    membership: TenantMembership | None,
    role: Role | None,
    process_now: bool,
) -> Notification:
    tenant = actor.tenant
    template = NotificationTemplate.objects.filter(tenant=tenant, id=validated_data.get("template_id")).first() if validated_data.get("template_id") else None
    preview_payload = {
        **sample_payload,
        "event_code": validated_data.get("code", ""),
        "trigger_key": validated_data.get("trigger_key", ""),
    }
    resolved_membership = membership or _get_notification_preview_membership(tenant=tenant, membership_id=validated_data.get("membership_id"))
    notification = Notification.objects.create(
        tenant=tenant,
        channel=validated_data["channel"],
        audience_type=validated_data["audience_type"],
        recipient_membership=resolved_membership,
        recipient_role=role,
        recipient_identifier=(resolved_membership.user.username if resolved_membership else validated_data.get("trigger_key", "preview-target")),
        subject_type=validated_data.get("subject_type", "notification_event_preview"),
        subject_identifier=validated_data.get("subject_identifier", "event-preview"),
        title=_render_notification_preview_value(template.title_template if template else validated_data.get("name", ""), preview_payload),
        subject=_render_notification_preview_value(template.subject_template if template else "", preview_payload),
        body=_render_notification_preview_value(
            template.body_template if template else f"Test notification for {validated_data.get('name', 'notification event')}.",
            preview_payload,
        ),
        status=NotificationStatus.PENDING,
        priority=validated_data.get("priority", NotificationPriority.NORMAL),
        scheduled_for=timezone.now() + timedelta(minutes=validated_data.get("delivery_delay_minutes", 0) or 0),
        payload={
            **preview_payload,
            "recipient_snapshot": validated_data.get("recipient_snapshot") or {},
            "preview_mode": "event_test_send",
        },
    )
    if process_now:
        notification = process_notification(notification)
    return notification


def build_hr_admin_notification_payload(item: Notification) -> dict:
    membership_name = None
    if item.recipient_membership:
        membership_name = item.recipient_membership.user.display_name or item.recipient_membership.user.get_full_name() or item.recipient_membership.user.username
    retry_state = get_notification_retry_state(item)
    delivery_logs = [
        {
            "id": log.id,
            "channel": log.channel,
            "status": log.status,
            "provider_name": log.provider_name,
            "provider_reference": log.provider_reference,
            "error_message": log.error_message,
            "response_payload": log.response_payload,
            "created_at": log.created_at,
        }
        for log in list(item.delivery_logs.all()[:10])
    ]
    return {
        "id": item.id,
        "event_definition_id": item.event_definition_id,
        "event_definition_name": item.event_definition.name if item.event_definition else None,
        "channel": item.channel,
        "audience_type": item.audience_type,
        "subject_type": item.subject_type,
        "subject_identifier": item.subject_identifier,
        "recipient_membership_id": item.recipient_membership_id,
        "recipient_membership_name": membership_name,
        "recipient_role_id": item.recipient_role_id,
        "recipient_role_name": item.recipient_role.name if item.recipient_role else None,
        "recipient_identifier": item.recipient_identifier,
        "recipient_address": item.recipient_address,
        "title": item.title,
        "subject": item.subject,
        "body": item.body,
        "status": item.status,
        "priority": item.priority,
        "scheduled_for": item.scheduled_for,
        "sent_at": item.sent_at,
        "delivered_at": item.delivered_at,
        "read_at": item.read_at,
        "attempt_count": retry_state["attempt_count"],
        "max_attempts": retry_state["max_attempts"],
        "retry_backoff_minutes": retry_state["retry_backoff_minutes"],
        "retry_limit_reached": retry_state["retry_limit_reached"],
        "can_retry": retry_state["can_retry"],
        "delivery_logs": delivery_logs,
        "payload": item.payload,
        "created_at": item.created_at,
    }


def build_hr_admin_notification_channel_diagnostics(*, tenant) -> list[dict]:
    channel_labels = dict(NotificationChannel.choices)
    channel_order = [value for value, _ in NotificationChannel.choices]
    channel_configurations = {
        item.channel: item
        for item in NotificationChannelConfiguration.objects.filter(tenant=tenant).order_by("channel")
    }
    channel_diagnostics = {
        channel: {
            "channel": channel,
            "label": channel_labels.get(channel, channel.replace("_", " ").title()),
            "is_enabled": channel_configurations.get(channel).is_enabled if channel_configurations.get(channel) else False,
            "backend_key": channel_configurations.get(channel).backend_key if channel_configurations.get(channel) else "",
            "sender_identifier": channel_configurations.get(channel).sender_identifier if channel_configurations.get(channel) else "",
            "sender_address": channel_configurations.get(channel).sender_address if channel_configurations.get(channel) else "",
            "live_notification_count": 0,
            "pending_notification_count": 0,
            "delivered_notification_count": 0,
            "read_notification_count": 0,
            "failed_notification_count": 0,
            "retry_ready_count": 0,
            "retry_capped_count": 0,
            "latest_notification_at": None,
            "latest_failure_at": None,
            "latest_failure_message": "",
            "provider_names": [],
        }
        for channel in channel_order
    }

    notifications = Notification.objects.filter(tenant=tenant).select_related(
        "event_definition",
        "recipient_membership__user",
        "recipient_role",
    ).prefetch_related("delivery_logs")
    delivered_statuses = {
        NotificationStatus.SENT,
        NotificationStatus.DELIVERED,
        NotificationStatus.READ,
    }

    for item in notifications:
        diagnostic = channel_diagnostics.setdefault(
            item.channel,
            {
                "channel": item.channel,
                "label": channel_labels.get(item.channel, item.channel.replace("_", " ").title()),
                "is_enabled": False,
                "backend_key": "",
                "sender_identifier": "",
                "sender_address": "",
                "live_notification_count": 0,
                "pending_notification_count": 0,
                "delivered_notification_count": 0,
                "read_notification_count": 0,
                "failed_notification_count": 0,
                "retry_ready_count": 0,
                "retry_capped_count": 0,
                "latest_notification_at": None,
                "latest_failure_at": None,
                "latest_failure_message": "",
                "provider_names": [],
            },
        )
        retry_state = get_notification_retry_state(item)
        diagnostic["live_notification_count"] += 1
        if item.status == NotificationStatus.PENDING:
            diagnostic["pending_notification_count"] += 1
        if item.status in delivered_statuses:
            diagnostic["delivered_notification_count"] += 1
        if item.status == NotificationStatus.READ or item.read_at:
            diagnostic["read_notification_count"] += 1
        if item.status == NotificationStatus.FAILED:
            diagnostic["failed_notification_count"] += 1
        if retry_state["can_retry"]:
            diagnostic["retry_ready_count"] += 1
        if retry_state["retry_limit_reached"]:
            diagnostic["retry_capped_count"] += 1

        latest_log = next(iter(item.delivery_logs.all()), None)
        latest_activity_at = (
            latest_log.created_at if latest_log else item.read_at or item.delivered_at or item.sent_at or item.scheduled_for or item.created_at
        )
        if latest_activity_at and (
            diagnostic["latest_notification_at"] is None or latest_activity_at > diagnostic["latest_notification_at"]
        ):
            diagnostic["latest_notification_at"] = latest_activity_at

        for log in item.delivery_logs.all():
            if log.provider_name and log.provider_name not in diagnostic["provider_names"]:
                diagnostic["provider_names"].append(log.provider_name)
            if log.status == NotificationStatus.FAILED or log.error_message:
                if diagnostic["latest_failure_at"] is None or log.created_at > diagnostic["latest_failure_at"]:
                    diagnostic["latest_failure_at"] = log.created_at
                    diagnostic["latest_failure_message"] = log.error_message or "Provider reported a failed delivery attempt."

        if item.status == NotificationStatus.FAILED and diagnostic["latest_failure_at"] is None:
            diagnostic["latest_failure_at"] = latest_activity_at
            diagnostic["latest_failure_message"] = "Notification is currently in failed state."

    return sorted(
        channel_diagnostics.values(),
        key=lambda item: (
            -item["failed_notification_count"],
            -item["pending_notification_count"],
            item["label"],
        ),
    )


def _matches_notification_retry_state(item: Notification, retry_state_filter: str) -> bool:
    if not retry_state_filter:
        return True
    retry_state = get_notification_retry_state(item)
    if retry_state_filter == "retry_ready":
        return retry_state["can_retry"]
    if retry_state_filter == "retry_capped":
        return retry_state["retry_limit_reached"]
    if retry_state_filter == "no_retry_needed":
        return not retry_state["can_retry"] and not retry_state["retry_limit_reached"]
    return True


def save_hr_admin_notification(actor, validated_data, *, item: Notification):
    for field in [
        "status",
        "recipient_address",
        "title",
        "subject",
        "body",
        "priority",
        "scheduled_for",
        "read_at",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def build_user_notification_queryset(employee: Employee, *, workspace: str = "ess"):
    membership = getattr(employee, "membership", None)
    if not membership or not membership.user_id:
        return Notification.objects.none()

    memberships = list(
        TenantMembership.objects.filter(
            tenant=employee.tenant,
            user_id=membership.user_id,
            status=MembershipStatus.ACTIVE,
        ).prefetch_related("membership_roles__role")
    )
    membership_ids = [item.id for item in memberships]
    role_ids = []
    for item in memberships:
        role_ids.extend([membership_role.role_id for membership_role in item.membership_roles.all()])

    recipient_filter = Q(recipient_membership_id__in=membership_ids)
    if role_ids:
        recipient_filter |= Q(recipient_role_id__in=role_ids)

    queryset = (
        Notification.objects.filter(tenant=employee.tenant)
        .filter(recipient_filter)
        .select_related("event_definition", "recipient_membership__user", "recipient_role")
        .prefetch_related("delivery_logs")
        .distinct()
    )

    if workspace == "mss":
        manager_scope = Q(audience_type="manager")
        if role_ids:
            manager_scope |= Q(recipient_role_id__in=role_ids)
        queryset = queryset.filter(manager_scope)
    else:
        queryset = queryset.exclude(audience_type="manager")

    return queryset


def filter_user_notification_queryset(queryset, request):
    search_value = (request.query_params.get("q") or "").strip()
    status_value = request.query_params.get("status") or ""
    channel_value = request.query_params.get("channel") or ""
    priority_value = request.query_params.get("priority") or ""
    subject_type_value = request.query_params.get("subject_type") or ""

    if status_value:
        queryset = queryset.filter(status=status_value)
    if channel_value:
        queryset = queryset.filter(channel=channel_value)
    if priority_value:
        queryset = queryset.filter(priority=priority_value)
    if subject_type_value:
        queryset = queryset.filter(subject_type=subject_type_value)
    if search_value:
        queryset = queryset.filter(
            Q(title__icontains=search_value)
            | Q(subject__icontains=search_value)
            | Q(body__icontains=search_value)
            | Q(subject_identifier__icontains=search_value)
            | Q(subject_type__icontains=search_value)
            | Q(event_definition__name__icontains=search_value)
        )

    return queryset.order_by("-created_at")


def build_hr_admin_notification_channel_configuration_payload(item: NotificationChannelConfiguration) -> dict:
    return {
        "id": item.id,
        "channel": item.channel,
        "is_enabled": item.is_enabled,
        "backend_key": item.backend_key,
        "sender_identifier": item.sender_identifier,
        "sender_address": item.sender_address,
        "provider_config": item.provider_config,
        "delivery_policy": item.delivery_policy,
    }


def save_hr_admin_notification_channel_configuration(actor, validated_data, *, item=None):
    tenant = actor.tenant
    channel = validated_data.get("channel") or (item.channel if item else None)
    if not channel:
        raise serializers.ValidationError({"channel": "Channel is required."})
    if item is None:
        item = NotificationChannelConfiguration.objects.filter(tenant=tenant, channel=channel).first()
    if item is None:
        item = NotificationChannelConfiguration(
            tenant=tenant,
            channel=channel,
            backend_key=get_default_backend_key(channel),
        )

    item.channel = channel
    item.backend_key = validated_data.get("backend_key", item.backend_key or get_default_backend_key(channel))
    item.is_enabled = validated_data.get("is_enabled", item.is_enabled)
    if "sender_identifier" in validated_data:
        item.sender_identifier = validated_data["sender_identifier"]
    if "sender_address" in validated_data:
        item.sender_address = validated_data["sender_address"]
    if "provider_config" in validated_data:
        item.provider_config = validated_data["provider_config"] or {}
    if "delivery_policy" in validated_data:
        item.delivery_policy = validated_data["delivery_policy"] or {}
    item.save()
    return item


class SaasCommercialAccessDenied(exceptions.APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = "saas_commercial_access_denied"


class EmployeeContextMixin:
    """Resolves the logged-in user into an employee record."""

    permission_classes = [permissions.IsAuthenticated]
    workspace_role_codes: tuple[str, ...] = ()

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not self.workspace_role_codes:
            return
        membership = get_default_membership_for_user(request.user)
        if not membership:
            raise exceptions.PermissionDenied("No active tenant membership found.")
        allowed = membership.membership_roles.filter(
            role__code__in=self.workspace_role_codes,
            role__is_active=True,
        ).exists()
        if not allowed:
            raise exceptions.PermissionDenied("You do not have access to this workspace.")

    def get_employee(self):
        employee = get_employee_for_user(self.request.user)
        if not employee:
            return None
        return employee

    def build_profile_payload(self, employee):
        manager_name = None
        if employee.reporting_manager:
            manager_name = " ".join(
                part for part in [employee.reporting_manager.first_name, employee.reporting_manager.last_name] if part
            )
        return {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": " ".join(part for part in [employee.first_name, employee.last_name] if part),
            "preferred_name": employee.preferred_name,
            "work_email": employee.work_email,
            "personal_email": employee.personal_email,
            "phone_number": employee.phone_number,
            "employment_status": employee.employment_status,
            "date_of_joining": employee.date_of_joining,
            "department": employee.department.name if employee.department else None,
            "designation": employee.designation.name if employee.designation else None,
            "legal_entity": employee.legal_entity.name if employee.legal_entity else None,
            "branch": employee.branch.name if employee.branch else None,
            "location": employee.location.name if employee.location else None,
            "reporting_manager": manager_name,
        }


class MeProfileView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = self.build_profile_payload(employee)
        return response.Response(EmployeeProfileSerializer(payload).data)


class HrAdminContextMixin(EmployeeContextMixin):
    workspace_role_codes = ("hr-admin",)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        membership = get_default_membership_for_user(request.user)
        if not membership:
            return
        commercial_access = evaluate_saas_commercial_access(
            membership.tenant,
            request_path=request.path,
            method=request.method,
        )
        if commercial_access["allowed"]:
            return
        raise SaasCommercialAccessDenied(
            {
                "detail": commercial_access["detail"],
                "code": "saas_commercial_access_denied",
                "matched_scopes": commercial_access["matched_scopes"],
                "blocking_scopes": commercial_access["blocking_scopes"],
            },
            code="saas_commercial_access_denied",
        )


class TenantAdminContextMixin(EmployeeContextMixin):
    workspace_role_codes = ("tenant-admin", "hr-admin")

    def get_tenant(self):
        membership = get_default_membership_for_user(self.request.user)
        return membership.tenant if membership else None


class MeLeaveSummaryView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_employee_leave_summary(employee)
        return response.Response(LeaveSummarySerializer(payload).data)


class MeLeaveTypeListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            {
                "id": leave_type.id,
                "code": leave_type.code,
                "name": leave_type.name,
                "short_code": leave_type.short_code,
                "category": leave_type.category,
                "unit": leave_type.unit,
                "requires_attachment": leave_type.requires_attachment,
                "allow_negative_balance": leave_type.allow_negative_balance,
            }
            for leave_type in LeaveType.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")
        ]
        return response.Response(LeaveTypeOptionSerializer(payload, many=True).data)


class MeAttendanceSummaryView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_employee_attendance_summary(employee)
        return response.Response(AttendanceSummarySerializer(payload).data)


class MeAttendanceRecordListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        records = (
            AttendanceRecord.objects.filter(employee=employee)
            .select_related("shift")
            .order_by("-attendance_date")[:30]
        )
        payload = [
            {
                "id": record.id,
                "attendance_date": record.attendance_date,
                "status": record.status,
                "shift": record.shift.name if record.shift else None,
                "check_in_at": record.check_in_at,
                "check_out_at": record.check_out_at,
                "is_regularized": record.is_regularized,
                "is_locked": record.is_locked,
                "late_minutes": record.late_minutes,
            }
            for record in records
        ]
        return response.Response(AttendanceRecordOptionSerializer(payload, many=True).data)


class MeDashboardView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = {
            "profile": self.build_profile_payload(employee),
            "leave": get_employee_leave_summary(employee),
            "attendance": get_employee_attendance_summary(employee),
        }
        return response.Response(EmployeeDashboardSerializer(payload).data)


def _build_employee_document_center_payload(employee: Employee, request) -> dict:
    page, page_size = _get_page_params(request)
    search_value = (request.query_params.get("q") or "").strip()
    verification_status_filter = (request.query_params.get("verification_status") or "").strip()
    category_id_filter = (request.query_params.get("category_id") or "").strip()
    joining_date = employee.date_of_joining

    summary = _get_employee_document_requirement_summary(employee, joining_date=joining_date)
    requirement_items = _get_employee_document_requirement_runtime(employee, joining_date=joining_date)

    queryset = EmployeeDocument.objects.filter(tenant=employee.tenant, employee=employee).select_related("employee", "category", "artifact")
    if verification_status_filter:
        queryset = queryset.filter(verification_status=verification_status_filter)
    if category_id_filter:
        queryset = queryset.filter(category_id=category_id_filter)
    expiry_filter = (request.query_params.get("expiry_filter") or "").strip()
    if search_value:
        search_query = (
            Q(category__name__icontains=search_value)
            | Q(title__icontains=search_value)
            | Q(document_number__icontains=search_value)
            | Q(rejection_reason__icontains=search_value)
            | Q(file_name__icontains=search_value)
        )
        queryset = queryset.filter(search_query)

    document_list = list(queryset.order_by("-created_at"))
    if expiry_filter:
        filtered_documents = []
        for document in document_list:
            expiry_runtime = _get_employee_document_expiry_runtime(document)
            if expiry_filter == "expired" and not expiry_runtime["is_expired"]:
                continue
            if expiry_filter == "expiring" and not expiry_runtime["is_expiring_soon"]:
                continue
            if expiry_filter == "missing_expiry" and document.expires_on is not None:
                continue
            filtered_documents.append(document)
        document_list = filtered_documents

    total_count = len(document_list)
    offset = (page - 1) * page_size
    items = document_list[offset : offset + page_size]

    all_documents = EmployeeDocument.objects.filter(tenant=employee.tenant, employee=employee)
    scoped_category_ids = {runtime["category_id"] for runtime in requirement_items}
    scoped_category_ids.update(str(item) for item in all_documents.values_list("category_id", flat=True))
    category_options = [
        {"id": item.id, "name": item.name}
        for item in DocumentCategory.objects.filter(tenant=employee.tenant, is_active=True, id__in=scoped_category_ids).order_by("name")
    ]
    uploadable_categories = [
        item
        for item in category_options
        if any(runtime["category_id"] == str(item["id"]) and runtime["allow_employee_upload"] for runtime in requirement_items)
    ]

    return {
        "summary": {
            **summary,
            "total_documents": all_documents.count(),
            "pending_documents": all_documents.filter(verification_status=VerificationStatus.PENDING).count(),
            "verified_documents": all_documents.filter(verification_status=VerificationStatus.VERIFIED).count(),
            "rejected_documents": all_documents.filter(verification_status=VerificationStatus.REJECTED).count(),
            "expiring_documents": sum(1 for document in all_documents if _get_employee_document_expiry_runtime(document)["is_expiring_soon"]),
            "expired_documents": sum(1 for document in all_documents if _get_employee_document_expiry_runtime(document)["is_expired"]),
        },
        "requirement_items": requirement_items,
        "verification_statuses": [{"value": value, "label": label} for value, label in VerificationStatus.choices],
        "categories": category_options,
        "uploadable_categories": uploadable_categories,
        "max_upload_size_bytes": get_document_upload_max_bytes(),
        "items": [build_hr_admin_employee_document_payload(item) for item in items],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
    }


class MeDocumentCenterView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = _build_employee_document_center_payload(employee, request)
        return response.Response(MeDocumentCenterSerializer(payload).data)


class MeEmployeeDocumentListCreateView(EmployeeContextMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeEmployeeDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_self_service_employee_document(employee, serializer.validated_data)
        item = EmployeeDocument.objects.select_related("employee", "category", "artifact").get(id=item.id)
        return response.Response(
            HrAdminEmployeeDocumentSerializer(build_hr_admin_employee_document_payload(item)).data,
            status=status.HTTP_201_CREATED,
        )


class MeEmployeeDocumentDownloadView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeDocument.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).select_related("artifact").first()
        if not item or not item.artifact_id or not item.artifact or not item.artifact.stored_file:
            return response.Response({"detail": "Document file not found."}, status=status.HTTP_404_NOT_FOUND)

        stored_file = item.artifact.stored_file
        response_file = FileResponse(
            stored_file.open("rb"),
            as_attachment=True,
            filename=item.artifact.original_filename or item.file_name or f"{item.title}.bin",
        )
        if item.artifact.mime_type:
            response_file["Content-Type"] = item.artifact.mime_type
        return response_file


def _payroll_access_event_payload(event: PayrollArtifactAccessEvent) -> dict:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "status": event.status,
        "event_profile_ref": event.event_profile_ref,
        "source_channel_ref": event.source_channel_ref,
        "actor_identifier": event.actor_identifier,
        "notification_id": event.notification_id,
        "signed_access_grant_id": event.signed_access_grant_id,
        "request_identifier": event.request_identifier,
        "storage_provider_ref": event.storage_provider_ref,
        "storage_object_version": event.storage_object_version,
        "download_strategy_ref": event.download_strategy_ref,
        "checksum_sha256": event.checksum_sha256,
        "read_at": event.read_at,
        "created_at": event.created_at,
        "metadata_snapshot": event.metadata_snapshot,
    }


def _payroll_signed_access_grant_payload(grant: PayrollArtifactSignedAccessGrant, *, signed_url: str | None = None) -> dict:
    issued_to_membership = grant.issued_to_membership
    return {
        "id": grant.id,
        "output_artifact_id": grant.output_artifact_id,
        "status": grant.status,
        "permission_scope": grant.permission_scope,
        "grant_profile_ref": grant.grant_profile_ref,
        "source_channel_ref": grant.source_channel_ref,
        "issued_to_membership_id": grant.issued_to_membership_id,
        "issued_to_membership_name": str(issued_to_membership) if issued_to_membership else None,
        "issued_by_name": str(grant.issued_by_user) if grant.issued_by_user else None,
        "token_prefix": grant.token_prefix,
        "signed_url": signed_url if signed_url is not None else grant.signed_url,
        "expires_at": grant.expires_at,
        "revoked_at": grant.revoked_at,
        "revocation_reason": grant.revocation_reason,
        "access_count": grant.access_count,
        "max_access_count": grant.max_access_count,
        "storage_provider_ref": grant.storage_provider_ref,
        "storage_object_version": grant.storage_object_version,
        "download_strategy_ref": grant.download_strategy_ref,
        "checksum_sha256": grant.checksum_sha256,
        "metadata_snapshot": grant.metadata_snapshot,
        "created_at": grant.created_at,
        "updated_at": grant.updated_at,
    }


def _payroll_artifact_access_summary(artifact: PayrollOutputArtifact) -> dict:
    events = artifact.access_events.all()
    grants = artifact.signed_access_grants.all()
    now = timezone.now()
    latest_download = events.filter(event_type=PayrollArtifactAccessEventType.DOWNLOADED).order_by("-created_at").first()
    first_read = events.filter(event_type=PayrollArtifactAccessEventType.READ_ACKNOWLEDGED).order_by("read_at", "created_at").first()
    latest_notification = events.filter(event_type=PayrollArtifactAccessEventType.NOTIFIED).order_by("-created_at").first()
    latest_signed_grant = grants.order_by("-created_at").first()
    latest_revoked_grant = grants.filter(status=PayrollArtifactSignedAccessGrantStatus.REVOKED).order_by("-revoked_at", "-created_at").first()
    return {
        "published_event_count": events.filter(event_type=PayrollArtifactAccessEventType.PUBLISHED).count(),
        "notification_count": events.filter(event_type=PayrollArtifactAccessEventType.NOTIFIED).count(),
        "signed_url_issued_count": events.filter(event_type=PayrollArtifactAccessEventType.SIGNED_URL_ISSUED).count(),
        "download_count": events.filter(event_type=PayrollArtifactAccessEventType.DOWNLOADED).count(),
        "read_acknowledgement_count": events.filter(event_type=PayrollArtifactAccessEventType.READ_ACKNOWLEDGED).count(),
        "revoked_event_count": events.filter(event_type=PayrollArtifactAccessEventType.REVOKED).count(),
        "active_signed_grant_count": grants.filter(status=PayrollArtifactSignedAccessGrantStatus.ACTIVE, expires_at__gt=now).count(),
        "revoked_signed_grant_count": grants.filter(status=PayrollArtifactSignedAccessGrantStatus.REVOKED).count(),
        "expired_signed_grant_count": grants.filter(Q(status=PayrollArtifactSignedAccessGrantStatus.EXPIRED) | Q(status=PayrollArtifactSignedAccessGrantStatus.ACTIVE, expires_at__lte=now)).count(),
        "latest_downloaded_at": latest_download.created_at if latest_download else None,
        "first_read_at": first_read.read_at if first_read else None,
        "latest_notification_at": latest_notification.created_at if latest_notification else None,
        "latest_signed_grant_expires_at": latest_signed_grant.expires_at if latest_signed_grant else None,
        "latest_revoked_at": latest_revoked_grant.revoked_at if latest_revoked_grant else None,
        "is_read_acknowledged": first_read is not None,
    }


def _payroll_request_metadata(request) -> dict:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip_address = (forwarded_for.split(",")[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR", "")) or ""
    return {
        "request_identifier": request.META.get("HTTP_X_REQUEST_ID", "") or request.META.get("HTTP_X_CORRELATION_ID", ""),
        "ip_address": ip_address,
        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
    }


def _payroll_signed_access_grant_from_request(artifact: PayrollOutputArtifact, request, *, actor_membership=None):
    grant_id = (request.query_params.get("grant_id") or "").strip()
    token = (request.query_params.get("token") or "").strip()
    if not grant_id and not token:
        return None
    grant = validate_payroll_artifact_signed_access_grant(
        artifact,
        grant_id=grant_id,
        token=token,
        actor_user=request.user,
        actor_membership=actor_membership,
    )
    return mark_payroll_artifact_signed_access_grant_used(grant)


def build_me_statutory_declaration_item_payload(item: EmployeeStatutoryDeclarationItem) -> dict:
    return {
        "id": item.id,
        "declaration_id": item.declaration_id,
        "financial_year_code": item.declaration.financial_year_code,
        "item_kind": item.item_kind,
        "item_kind_label": item.get_item_kind_display(),
        "section_code": item.section_code,
        "component_code": item.component_code,
        "name": item.name,
        "declared_amount": item.declared_amount,
        "verified_amount": item.verified_amount,
        "proof_status": item.proof_status,
        "proof_status_label": item.get_proof_status_display(),
        "proof_document_ref": item.proof_document_ref,
        "proof_artifact_key": item.proof_artifact_key,
        "proof_submitted_at": item.proof_submitted_at,
        "verified_at": item.verified_at,
        "rejected_at": item.rejected_at,
        "rejection_reason": item.rejection_reason,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_me_statutory_declaration_payload(item: EmployeeStatutoryDeclaration) -> dict:
    declaration_items = item.items.all()
    return {
        "id": item.id,
        "employee_statutory_profile_id": item.employee_statutory_profile_id,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name if item.statutory_pack else None,
        "financial_year_code": item.financial_year_code,
        "declaration_profile_ref": item.declaration_profile_ref,
        "proof_window_ref": item.proof_window_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "tax_regime": item.tax_regime,
        "tax_regime_label": item.get_tax_regime_display(),
        "declared_total_amount": item.declared_total_amount,
        "verified_total_amount": item.verified_total_amount,
        "submitted_at": item.submitted_at,
        "verified_at": item.verified_at,
        "rejected_at": item.rejected_at,
        "locked_at": item.locked_at,
        "rejection_reason": item.rejection_reason,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "items": [build_me_statutory_declaration_item_payload(child) for child in declaration_items.order_by("section_code", "component_code")],
        "item_count": declaration_items.count(),
        "submitted_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.SUBMITTED).count(),
        "verified_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.VERIFIED).count(),
        "rejected_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.REJECTED).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _build_me_statutory_declaration_list_payload(employee: Employee, request) -> dict:
    page, page_size = _get_page_params(request)
    search_value = (request.query_params.get("q") or "").strip()
    status_value = (request.query_params.get("status") or "").strip()
    financial_year_value = (request.query_params.get("financial_year") or "").strip().upper()
    declarations = EmployeeStatutoryDeclaration.objects.filter(
        tenant=employee.tenant,
        employee=employee,
    ).select_related(
        "employee_statutory_profile",
        "statutory_pack",
    ).prefetch_related("items")
    if search_value:
        declarations = declarations.filter(
            Q(financial_year_code__icontains=search_value)
            | Q(declaration_profile_ref__icontains=search_value)
            | Q(proof_window_ref__icontains=search_value)
            | Q(items__name__icontains=search_value)
            | Q(items__section_code__icontains=search_value)
        ).distinct()
    if status_value:
        declarations = declarations.filter(status=status_value)
    if financial_year_value:
        declarations = declarations.filter(financial_year_code=financial_year_value)

    all_declarations = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, employee=employee).prefetch_related("items")
    latest_profile = EmployeeStatutoryProfile.objects.filter(tenant=employee.tenant, employee=employee).select_related("statutory_pack").order_by("-effective_from", "-created_at").first()
    total_count = declarations.count()
    offset = (page - 1) * page_size
    items = list(declarations.order_by("-financial_year_code", "-submitted_at", "-created_at")[offset : offset + page_size])
    all_declaration_items = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, employee=employee)
    declared_total = all_declarations.aggregate(total=Sum("declared_total_amount"))["total"] or Decimal("0.00")
    verified_total = all_declarations.aggregate(total=Sum("verified_total_amount"))["total"] or Decimal("0.00")
    available_years = list(
        all_declarations.order_by("-financial_year_code").values_list("financial_year_code", flat=True).distinct()
    )
    profile_payload = build_hr_admin_employee_statutory_profile_payload(latest_profile) if latest_profile else None
    proof_upload_categories = DocumentCategory.objects.filter(
        tenant=employee.tenant,
        is_active=True,
        allow_employee_upload=True,
    ).order_by("name")
    preferred_proof_categories = proof_upload_categories.filter(
        Q(category_type=DocumentCategoryType.TAX)
        | Q(visibility_rules__statutory_proof=True)
    )
    if preferred_proof_categories.exists():
        proof_upload_categories = preferred_proof_categories
    active_document_category_ids = set(
        EmployeeDocument.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            status=EmployeeDocumentStatus.ACTIVE,
        ).values_list("category_id", flat=True)
    )
    proof_upload_category_options = [
        {"id": item.id, "name": item.name}
        for item in proof_upload_categories
        if item.allow_multiple_files or item.id not in active_document_category_ids
    ]
    return {
        "summary": {
            "declaration_count": all_declarations.count(),
            "draft_declaration_count": all_declarations.filter(status=PayrollStatutoryDeclarationStatus.DRAFT).count(),
            "submitted_declaration_count": all_declarations.filter(status=PayrollStatutoryDeclarationStatus.SUBMITTED).count(),
            "verified_declaration_count": all_declarations.filter(status=PayrollStatutoryDeclarationStatus.VERIFIED).count(),
            "locked_declaration_count": all_declarations.filter(status=PayrollStatutoryDeclarationStatus.LOCKED).count(),
            "declaration_item_count": all_declaration_items.count(),
            "submitted_item_count": all_declaration_items.filter(proof_status=PayrollStatutoryProofStatus.SUBMITTED).count(),
            "verified_item_count": all_declaration_items.filter(proof_status=PayrollStatutoryProofStatus.VERIFIED).count(),
            "rejected_item_count": all_declaration_items.filter(proof_status=PayrollStatutoryProofStatus.REJECTED).count(),
            "declared_total_amount": str(declared_total.quantize(Decimal("0.01"))),
            "verified_total_amount": str(verified_total.quantize(Decimal("0.01"))),
            "available_financial_years": available_years,
        },
        "profile": profile_payload,
        "items": [build_me_statutory_declaration_payload(item) for item in items],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
        "options": {
            "statutory_declaration_statuses": [{"value": value, "label": label} for value, label in PayrollStatutoryDeclarationStatus.choices],
            "statutory_declaration_item_kinds": [{"value": value, "label": label} for value, label in PayrollStatutoryDeclarationItemKind.choices],
            "statutory_proof_statuses": [{"value": value, "label": label} for value, label in PayrollStatutoryProofStatus.choices],
            "tax_regimes": [{"value": value, "label": label} for value, label in PayrollTaxRegime.choices],
            "proof_upload_categories": proof_upload_category_options,
        },
    }


def _get_me_statutory_profile(employee: Employee, profile_id=None) -> EmployeeStatutoryProfile | None:
    profiles = EmployeeStatutoryProfile.objects.filter(tenant=employee.tenant, employee=employee).select_related("statutory_pack")
    if profile_id:
        return profiles.filter(id=profile_id).first()
    return profiles.order_by("-effective_from", "-created_at").first()


def _assert_employee_statutory_declaration_editable(declaration: EmployeeStatutoryDeclaration):
    if declaration.status not in {PayrollStatutoryDeclarationStatus.DRAFT, PayrollStatutoryDeclarationStatus.REJECTED}:
        raise serializers.ValidationError({"status": "Only draft or rejected statutory declarations can be edited by employees."})


def save_me_statutory_declaration(employee: Employee, validated_data, *, item=None) -> EmployeeStatutoryDeclaration:
    if item is not None:
        _assert_employee_statutory_declaration_editable(item)
    profile = None
    if "employee_statutory_profile_id" in validated_data:
        profile = _get_me_statutory_profile(employee, validated_data["employee_statutory_profile_id"])
        if not profile:
            raise serializers.ValidationError({"employee_statutory_profile_id": "Invalid selection."})
    elif item is None:
        profile = _get_me_statutory_profile(employee)
        if not profile:
            raise serializers.ValidationError({"employee_statutory_profile_id": "No active employee statutory profile found."})

    if item is None:
        item = EmployeeStatutoryDeclaration(tenant=employee.tenant, employee=employee, employee_statutory_profile=profile)
        if profile and profile.statutory_pack_id:
            item.statutory_pack = profile.statutory_pack
        item.tax_regime = profile.tax_regime if profile else PayrollTaxRegime.NOT_DECLARED
    elif profile is not None:
        item.employee_statutory_profile = profile
        item.statutory_pack = profile.statutory_pack

    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=employee.tenant, id=validated_data["statutory_pack_id"]).first() if validated_data["statutory_pack_id"] else None
        if validated_data["statutory_pack_id"] and not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack

    for field in [
        "financial_year_code",
        "declaration_profile_ref",
        "proof_window_ref",
        "tax_regime",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if not item.source_ref:
        item.source_ref = f"employee.statutory.declaration:{employee.employee_code}:{item.financial_year_code}"
    if item.status == PayrollStatutoryDeclarationStatus.REJECTED:
        item.status = PayrollStatutoryDeclarationStatus.DRAFT
        item.rejected_at = None
        item.rejected_by = None
        item.rejection_reason = ""
        item.verified_at = None
        item.verified_by = None
    item.employee = employee
    item.tenant = employee.tenant
    item.save()
    return item


def save_me_statutory_declaration_item(employee: Employee, declaration: EmployeeStatutoryDeclaration, validated_data, *, item=None) -> EmployeeStatutoryDeclarationItem:
    if declaration.employee_id != employee.id or declaration.tenant_id != employee.tenant_id:
        raise serializers.ValidationError({"declaration": "Invalid selection."})
    _assert_employee_statutory_declaration_editable(declaration)
    if item is None:
        item = EmployeeStatutoryDeclarationItem(tenant=employee.tenant, declaration=declaration, employee=employee)
    for field in [
        "item_kind",
        "section_code",
        "component_code",
        "name",
        "declared_amount",
        "proof_document_ref",
        "proof_artifact_key",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])

    if "proof_status" in validated_data:
        item.proof_status = validated_data["proof_status"]
    elif item.proof_status in {PayrollStatutoryProofStatus.VERIFIED, PayrollStatutoryProofStatus.REJECTED}:
        item.proof_status = PayrollStatutoryProofStatus.PENDING

    if (item.proof_document_ref or item.proof_artifact_key) and item.proof_status == PayrollStatutoryProofStatus.PENDING:
        item.proof_status = PayrollStatutoryProofStatus.SUBMITTED
    if item.proof_status == PayrollStatutoryProofStatus.SUBMITTED and not item.proof_submitted_at:
        item.proof_submitted_at = timezone.now()
    if item.proof_status != PayrollStatutoryProofStatus.SUBMITTED:
        item.proof_submitted_at = None

    item.verified_amount = Decimal("0.00")
    item.verified_at = None
    item.verified_by = None
    item.rejected_at = None
    item.rejected_by = None
    item.rejection_reason = ""
    item.tenant = employee.tenant
    item.employee = employee
    item.declaration = declaration
    if not item.source_ref:
        item.source_ref = f"employee.statutory.proof:{employee.employee_code}:{declaration.financial_year_code}:{item.section_code}"
    item.save()
    _refresh_statutory_declaration_totals(declaration)
    return item


def upload_me_statutory_declaration_proof(employee: Employee, declaration: EmployeeStatutoryDeclaration, validated_data) -> tuple[EmployeeStatutoryDeclarationItem, EmployeeDocument]:
    if declaration.employee_id != employee.id or declaration.tenant_id != employee.tenant_id:
        raise serializers.ValidationError({"declaration": "Invalid selection."})
    _assert_employee_statutory_declaration_editable(declaration)

    with transaction.atomic():
        document = create_self_service_employee_document(
            employee,
            {
                "category_id": validated_data["category_id"],
                "replace_document_id": validated_data.get("replace_document_id"),
                "title": validated_data.get("title", ""),
                "document_number": validated_data.get("document_number", ""),
                "issued_on": validated_data.get("issued_on"),
                "expires_on": validated_data.get("expires_on"),
                "file": validated_data["file"],
            },
        )
        item = None
        if validated_data.get("item_id"):
            item = EmployeeStatutoryDeclarationItem.objects.filter(
                tenant=employee.tenant,
                employee=employee,
                declaration=declaration,
                id=validated_data["item_id"],
            ).first()
            if not item:
                raise serializers.ValidationError({"item_id": "Declaration item not found."})

        item_data = {
            "proof_status": PayrollStatutoryProofStatus.SUBMITTED,
            "proof_document_ref": f"employee-document:{document.id}",
            "proof_artifact_key": str(document.artifact_id or ""),
            "config_snapshot": {
                **(item.config_snapshot if item and isinstance(item.config_snapshot, dict) else {}),
                "proof_document_id": str(document.id),
                "proof_artifact_id": str(document.artifact_id or ""),
                "proof_category_id": str(document.category_id),
                "proof_upload_surface_ref": "ess.statutory-declarations",
            },
        }
        for field in ["item_kind", "section_code", "component_code", "name", "declared_amount"]:
            if field in validated_data:
                item_data[field] = validated_data[field]
        item = save_me_statutory_declaration_item(employee, declaration, item_data, item=item)
    return item, document


class MeStatutoryDeclarationListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = _build_me_statutory_declaration_list_payload(employee, request)
        return response.Response(MeStatutoryDeclarationListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeStatutoryDeclarationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_me_statutory_declaration(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(MeStatutoryDeclarationSerializer(build_me_statutory_declaration_payload(item)).data, status=status.HTTP_201_CREATED)


class MeStatutoryDeclarationDetailView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            id=item_id,
        ).select_related("employee_statutory_profile", "statutory_pack").prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(MeStatutoryDeclarationSerializer(build_me_statutory_declaration_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeStatutoryDeclarationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_me_statutory_declaration(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(MeStatutoryDeclarationSerializer(build_me_statutory_declaration_payload(item)).data)


class MeStatutoryDeclarationSubmitView(EmployeeContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            id=item_id,
        ).select_related("employee_statutory_profile", "statutory_pack").prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            item = submit_hr_admin_employee_statutory_declaration(item, submitted_by=request.user)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(MeStatutoryDeclarationSerializer(build_me_statutory_declaration_payload(item)).data)


class MeStatutoryDeclarationProofUploadView(EmployeeContextMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        declaration = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).first()
        if not declaration:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeStatutoryDeclarationProofUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item, document = upload_me_statutory_declaration_proof(employee, declaration, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        document = EmployeeDocument.objects.select_related("employee", "category", "artifact").get(id=document.id)
        return response.Response(
            {
                "item": MeStatutoryDeclarationItemSerializer(build_me_statutory_declaration_item_payload(item)).data,
                "document": HrAdminEmployeeDocumentSerializer(build_hr_admin_employee_document_payload(document)).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeStatutoryDeclarationItemListCreateView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        declaration = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).first()
        if not declaration:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, employee=employee, declaration=declaration).order_by("section_code", "component_code")
        return response.Response(MeStatutoryDeclarationItemSerializer([build_me_statutory_declaration_item_payload(item) for item in items], many=True).data)

    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        declaration = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).first()
        if not declaration:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeStatutoryDeclarationItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_me_statutory_declaration_item(employee, declaration, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(MeStatutoryDeclarationItemSerializer(build_me_statutory_declaration_item_payload(item)).data, status=status.HTTP_201_CREATED)


class MeStatutoryDeclarationItemDetailView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).select_related("declaration").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration item not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(MeStatutoryDeclarationItemSerializer(build_me_statutory_declaration_item_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, employee=employee, id=item_id).select_related("declaration").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration item not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MeStatutoryDeclarationItemWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_me_statutory_declaration_item(employee, item.declaration, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(MeStatutoryDeclarationItemSerializer(build_me_statutory_declaration_item_payload(item)).data)


def build_me_payroll_payslip_payload(item: PayrollOutputArtifact, *, include_detail: bool = True) -> dict:
    can_download = item.status == PayrollOutputArtifactStatus.PUBLISHED and item.is_downloadable
    signed_url = get_payroll_artifact_signed_url(item) if can_download and include_detail else None
    period = item.payroll_run.period if item.payroll_run_id else None
    recent_events = list(item.access_events.order_by("-created_at")[:8]) if include_detail else []
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "period_name": period.name if period else "",
        "period_start_date": period.start_date if period else None,
        "period_end_date": period.end_date if period else None,
        "pay_date": period.pay_date if period else None,
        "title": item.title,
        "file_name": item.file_name,
        "mime_type": item.mime_type or item.content_type,
        "file_size_bytes": item.file_size_bytes,
        "checksum_sha256": item.checksum_sha256,
        "storage_provider_ref": item.storage_provider_ref,
        "storage_object_version": item.storage_object_version,
        "download_strategy_ref": item.download_strategy_ref,
        "supports_signed_url": item.supports_signed_url,
        "signed_url_expires_in_seconds": item.signed_url_expires_in_seconds,
        "retention_policy_ref": item.retention_policy_ref,
        "download_url": f"/api/v1/me/payroll-payslips/{item.id}/download/" if can_download else None,
        "signed_download_url": signed_url.url if signed_url else None,
        "signed_download_expires_at": signed_url.expires_at if signed_url else None,
        "totals_snapshot": item.totals_snapshot,
        "line_snapshot": item.line_snapshot if include_detail else [],
        "access_summary": _payroll_artifact_access_summary(item),
        "access_events": [_payroll_access_event_payload(event) for event in recent_events],
        "source_hash": item.source_hash,
        "published_at": item.published_at,
        "published_by_name": str(item.published_by) if item.published_by else None,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _build_me_payroll_payslip_list_payload(employee: Employee, request) -> dict:
    page, page_size = _get_page_params(request)
    search_value = (request.query_params.get("q") or "").strip()
    year_value = (request.query_params.get("year") or "").strip()
    selected_payslip_id = (request.query_params.get("selected_id") or "").strip()
    queryset = PayrollOutputArtifact.objects.filter(
        tenant=employee.tenant,
        employee=employee,
        kind=PayrollOutputArtifactKind.PAYSLIP,
        status=PayrollOutputArtifactStatus.PUBLISHED,
    ).select_related("payroll_run", "payroll_run__period", "published_by")
    if search_value:
        queryset = queryset.filter(
            Q(title__icontains=search_value)
            | Q(file_name__icontains=search_value)
            | Q(payroll_run__name__icontains=search_value)
            | Q(payroll_run__period__name__icontains=search_value)
        )
    if year_value:
        if year_value.isdigit():
            queryset = queryset.filter(payroll_run__period__pay_date__year=int(year_value))
        else:
            queryset = queryset.none()

    all_payslips = PayrollOutputArtifact.objects.filter(
        tenant=employee.tenant,
        employee=employee,
        kind=PayrollOutputArtifactKind.PAYSLIP,
        status=PayrollOutputArtifactStatus.PUBLISHED,
    ).select_related("payroll_run", "payroll_run__period")
    total_count = queryset.count()
    offset = (page - 1) * page_size
    items = list(queryset.order_by("-payroll_run__period__pay_date", "-published_at", "-created_at")[offset : offset + page_size])
    latest = all_payslips.order_by("-payroll_run__period__pay_date", "-published_at", "-created_at").first()
    detail_item_id = selected_payslip_id or (str(items[0].id) if items else "")
    latest_net_pay = Decimal("0.00")
    if latest:
        try:
            latest_net_pay = Decimal(str((latest.totals_snapshot or {}).get("net_pay") or "0.00"))
        except (ArithmeticError, ValueError):
            latest_net_pay = Decimal("0.00")
    years = sorted(
        {
            item.payroll_run.period.pay_date.year
            for item in all_payslips
            if item.payroll_run_id and item.payroll_run.period_id and item.payroll_run.period.pay_date
        },
        reverse=True,
    )
    return {
        "summary": {
            "published_payslip_count": all_payslips.count(),
            "downloadable_payslip_count": all_payslips.filter(is_downloadable=True).count(),
            "latest_net_pay": str(latest_net_pay.quantize(Decimal("0.01")) if latest else Decimal("0.00")),
            "latest_pay_date": latest.payroll_run.period.pay_date if latest and latest.payroll_run.period_id else None,
            "latest_period_name": latest.payroll_run.period.name if latest and latest.payroll_run.period_id else "",
            "available_years": years,
        },
        "items": [build_me_payroll_payslip_payload(item, include_detail=str(item.id) == detail_item_id) for item in items],
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
    }


class MePayrollPayslipListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = _build_me_payroll_payslip_list_payload(employee, request)
        return response.Response(MePayrollPayslipListSerializer(payload).data)


class MePayrollPayslipDownloadView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            id=item_id,
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).select_related("payroll_run", "review").first()
        if not artifact:
            return response.Response({"detail": "Published payroll payslip not found."}, status=status.HTTP_404_NOT_FOUND)
        if not artifact.is_downloadable:
            return response.Response({"detail": "Payroll payslip file is not available for download."}, status=status.HTTP_400_BAD_REQUEST)
        actor_membership = getattr(employee, "membership", None)
        try:
            signed_access_grant = _payroll_signed_access_grant_from_request(artifact, request, actor_membership=actor_membership)
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            stored_payload = read_payroll_artifact_payload(artifact)
        except PayrollArtifactStorageError as exc:
            http_status = status.HTTP_409_CONFLICT if "checksum" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
            return response.Response({"detail": str(exc)}, status=http_status)
        request_metadata = _payroll_request_metadata(request)
        create_payroll_artifact_access_event(
            artifact,
            event_type=PayrollArtifactAccessEventType.DOWNLOADED,
            actor_user=request.user,
            actor_membership=actor_membership,
            actor_identifier=employee.employee_code,
            signed_access_grant=signed_access_grant,
            request_identifier=request_metadata["request_identifier"],
            ip_address=request_metadata["ip_address"],
            user_agent=request_metadata["user_agent"],
            metadata_snapshot={
                "content_type": stored_payload.content_type,
                "file_name": stored_payload.file_name,
                "file_size_bytes": len(stored_payload.payload),
                "download_surface": "ess",
                "signed_access_grant_id": str(signed_access_grant.id) if signed_access_grant else "",
            },
        )
        file_name = re.sub(r"[^A-Za-z0-9._-]+", "-", artifact.file_name or f"{artifact.artifact_key}.html").strip("-")
        download_response = HttpResponse(stored_payload.payload, content_type=stored_payload.content_type)
        download_response["Content-Disposition"] = f'attachment; filename="{file_name or "payroll-payslip.html"}"'
        download_response["X-Payroll-Artifact-Checksum"] = artifact.checksum_sha256 or stored_payload.checksum_sha256
        download_response["X-Payroll-Storage-Key"] = artifact.storage_key
        download_response["X-Payroll-Storage-Provider"] = artifact.storage_provider_ref
        download_response["X-Payroll-Storage-Version"] = artifact.storage_object_version
        download_response["X-Payroll-Download-Strategy"] = artifact.download_strategy_ref
        download_response["X-Payroll-Retention-Policy"] = artifact.retention_policy_ref
        return download_response


class MePayrollPayslipReadView(EmployeeContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            id=item_id,
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).select_related("output_batch", "payroll_run", "payroll_run__period", "review", "employee", "published_by").first()
        if not artifact:
            return response.Response({"detail": "Published payroll payslip not found."}, status=status.HTTP_404_NOT_FOUND)

        membership = getattr(employee, "membership", None)
        read_time = timezone.now()
        notification = Notification.objects.filter(
            tenant=employee.tenant,
            subject_type="payroll_payslip",
            subject_identifier=str(artifact.id),
            recipient_membership=membership,
        ).order_by("-created_at").first()
        if notification:
            notification.status = NotificationStatus.READ
            notification.read_at = notification.read_at or read_time
            notification.save(update_fields=["status", "read_at", "updated_at"])

        request_metadata = _payroll_request_metadata(request)
        create_payroll_artifact_access_event(
            artifact,
            event_type=PayrollArtifactAccessEventType.READ_ACKNOWLEDGED,
            actor_user=request.user,
            actor_membership=membership,
            actor_identifier=employee.employee_code,
            notification=notification,
            request_identifier=request_metadata["request_identifier"],
            ip_address=request_metadata["ip_address"],
            user_agent=request_metadata["user_agent"],
            read_at=read_time,
            metadata_snapshot={
                "read_surface": "ess",
                "notification_id": str(notification.id) if notification else "",
            },
        )
        return response.Response(MePayrollPayslipSerializer(build_me_payroll_payslip_payload(artifact)).data)


class MePayrollPayslipSignedAccessIssueView(EmployeeContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            id=item_id,
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).select_related("output_batch", "payroll_run", "review", "employee").first()
        if not artifact:
            return response.Response({"detail": "Published payroll payslip not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PayrollArtifactSignedAccessGrantIssueRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_metadata = _payroll_request_metadata(request)
        try:
            issue = issue_payroll_artifact_signed_access_grant(
                artifact,
                issued_by_user=request.user,
                issued_by_membership=getattr(employee, "membership", None),
                issued_to_user=request.user,
                issued_to_membership=getattr(employee, "membership", None),
                actor_identifier=employee.employee_code,
                source_channel_ref="employee.portal.v1",
                request_identifier=request_metadata["request_identifier"],
                ip_address=request_metadata["ip_address"],
                user_agent=request_metadata["user_agent"],
                expires_in_seconds=serializer.validated_data.get("expires_in_seconds"),
                max_access_count=serializer.validated_data.get("max_access_count"),
                permission_scope=serializer.validated_data.get("permission_scope") or "download",
                metadata_snapshot={"issue_surface": "ess"},
            )
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(
            PayrollArtifactSignedAccessGrantIssueResultSerializer({
                "grant": _payroll_signed_access_grant_payload(issue.grant),
                "signed_url": issue.signed_url,
                "expires_at": issue.grant.expires_at,
            }).data,
            status=status.HTTP_201_CREATED,
        )


class ManagerTeamSummaryView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_manager_team_summary(employee)
        return response.Response(ManagerTeamSummarySerializer(payload).data)


class HrAdminDashboardView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_dashboard(employee)
        sync_remediation = str(request.query_params.get("sync_remediation", "")).lower() in {"1", "true", "yes"}
        if sync_remediation:
            remediation_summary = sync_hrms_saas_launch_remediation_assignments(employee.tenant, payload["launch_audit"])
            payload["launch_audit"]["remediation_assignments"] = remediation_summary["items"]
            payload["launch_audit"]["remediation_assignment_summary"] = {
                "open_count": remediation_summary["open_count"],
                "opened_count": remediation_summary["opened_count"],
                "updated_count": remediation_summary["updated_count"],
                "closed_count": remediation_summary["closed_count"],
            }
        else:
            payload["launch_audit"]["remediation_assignments"] = []
            payload["launch_audit"]["remediation_assignment_summary"] = {
                "open_count": len(payload["launch_audit"].get("release_actions", [])),
                "opened_count": 0,
                "updated_count": 0,
                "closed_count": 0,
            }
        return response.Response(HrAdminDashboardSerializer(payload).data)


class HrAdminSaasLaunchAuditPackDownloadView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        audit_pack = describe_hrms_saas_launch_audit_pack(
            employee.tenant,
            generated_at=timezone.now(),
            generated_by_ref="hr_admin.hrms_saas_launch_audit.download.v1",
        )
        remediation_summary = sync_hrms_saas_launch_remediation_assignments(employee.tenant, {"release_actions": audit_pack["release_actions"]})
        audit_pack["remediation_assignment_summary"] = {
            "open_count": remediation_summary["open_count"],
            "opened_count": remediation_summary["opened_count"],
            "updated_count": remediation_summary["updated_count"],
            "closed_count": remediation_summary["closed_count"],
        }
        recompute_hrms_saas_launch_audit_pack_checksum(audit_pack)
        payload = json.dumps(audit_pack, sort_keys=True, indent=2, default=str)
        file_name = f"{slugify(employee.tenant.code)}-hrms-saas-launch-audit.json"
        download_response = HttpResponse(payload, content_type="application/json")
        download_response["Content-Disposition"] = f'attachment; filename="{file_name}"'
        download_response["X-HRMS-Launch-Audit-Checksum"] = audit_pack["evidence_checksum_sha256"]
        download_response["X-HRMS-Launch-Audit-Profile"] = audit_pack["audit_profile_ref"]
        return download_response


class HrAdminLaunchRemediationListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        payload = get_hrms_saas_launch_remediation_assignments(
            employee.tenant,
            status_filter=request.query_params.get("status", "open"),
            severity=request.query_params.get("severity", ""),
            owner_role_ref=request.query_params.get("owner_role_ref", ""),
            module_ref=request.query_params.get("module_ref", ""),
            due_state=request.query_params.get("due_state", ""),
            query=request.query_params.get("q", ""),
            page=page,
            page_size=page_size,
        )
        return response.Response(HrAdminLaunchRemediationListSerializer(payload).data)


class HrAdminLaunchRemediationDetailView(HrAdminContextMixin, APIView):
    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = HrAdminLaunchRemediationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        actor_identifier = (
            getattr(user, "username", "")
            or getattr(user, "email", "")
            or str(getattr(user, "id", ""))
            or "hr-admin"
        )
        try:
            assignment = update_hrms_saas_launch_remediation_assignment(
                employee.tenant,
                item_id,
                action=serializer.validated_data["action"],
                actor_identifier=actor_identifier,
                owner_role_ref=serializer.validated_data.get("owner_role_ref", ""),
                assigned_to_identifier=serializer.validated_data.get("assigned_to_identifier", ""),
                due_at=serializer.validated_data.get("due_at"),
                escalation_owner_role_ref=serializer.validated_data.get("escalation_owner_role_ref", ""),
                resolution_note=serializer.validated_data.get("resolution_note", ""),
            )
        except HrmsLaunchRemediationAssignment.DoesNotExist:
            return response.Response({"detail": "Launch remediation assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminLaunchRemediationAssignmentSerializer(assignment).data)


class HrAdminSaasCommercialControlView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = describe_saas_commercial_control(employee.tenant)
        return response.Response(HrAdminSaasCommercialControlSerializer(payload).data)

    def patch(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSaasCommercialSubscriptionUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            payload = update_saas_commercial_subscription(
                employee.tenant,
                subscription_plan=serializer.validated_data.get("subscription_plan"),
                status=serializer.validated_data.get("status"),
                billing_provider_ref=serializer.validated_data.get("billing_provider_ref"),
                billing_account_ref=serializer.validated_data.get("billing_account_ref"),
                current_period_end=serializer.validated_data.get("current_period_end"),
                actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminSaasCommercialControlSerializer(payload).data)


class HrAdminSaasOperationalHealthView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_saas_operational_health(employee.tenant)
        return response.Response(HrAdminSaasOperationalHealthSerializer(payload).data)


class HrAdminSaasResilienceReadinessView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_saas_resilience_readiness(employee.tenant)
        return response.Response(HrAdminSaasResilienceReadinessSerializer(payload).data)


class HrAdminSaasSlaOperationsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_saas_sla_operations(employee.tenant)
        return response.Response(HrAdminSaasSlaOperationsSerializer(payload).data)


class TenantAdminConsoleView(TenantAdminContextMixin, APIView):
    def get(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_tenant_admin_console_payload(tenant)
        return response.Response(TenantAdminConsoleSerializer(payload).data)


class TenantAdminCommercialSupportAuditPackDownloadView(TenantAdminContextMixin, APIView):
    def get(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        actor_identifier = getattr(request.user, "username", "") or getattr(request.user, "email", "")
        audit_pack = describe_saas_commercial_support_audit_pack(
            tenant,
            generated_at=timezone.now(),
            generated_by_ref="tenant_admin.commercial_support_audit.download.v1",
            actor_identifier=actor_identifier,
        )
        payload = json.dumps(audit_pack, sort_keys=True, indent=2, default=str)
        file_name = f"{slugify(tenant.code)}-commercial-support-audit-pack.json"
        download_response = HttpResponse(payload, content_type="application/json")
        download_response["Content-Disposition"] = f'attachment; filename="{file_name}"'
        download_response["X-SaaS-Audit-Pack-Checksum"] = audit_pack["evidence_checksum_sha256"]
        download_response["X-SaaS-Audit-Pack-Ref"] = audit_pack["audit_pack_ref"]
        return download_response


class TenantAdminTrustAuditReviewView(TenantAdminContextMixin, APIView):
    def get(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_tenant_admin_trust_audit_review(
            tenant,
            event_group=request.query_params.get("event_group") or "all",
            event_type=request.query_params.get("event_type") or "",
            actor=request.query_params.get("actor") or "",
            source_ref=request.query_params.get("source_ref") or "",
            support_session_ref=request.query_params.get("support_session_ref") or "",
            date_from=request.query_params.get("date_from") or "",
            date_to=request.query_params.get("date_to") or "",
            page=request.query_params.get("page") or 1,
            page_size=request.query_params.get("page_size") or None,
        )
        return response.Response(TenantAdminTrustAuditReviewSerializer(payload).data)


class TenantAdminEnterpriseSecurityReadinessView(TenantAdminContextMixin, APIView):
    def get(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_tenant_admin_enterprise_security_readiness(tenant)
        return response.Response(TenantAdminEnterpriseSecurityReadinessSerializer(payload).data)


class TenantAdminMembershipListCreateView(TenantAdminContextMixin, APIView):
    def post(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminMembershipInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = invite_tenant_admin_membership(
                    tenant,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminMembershipMutationResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class TenantAdminMembershipDetailView(TenantAdminContextMixin, APIView):
    def patch(self, request, membership_id):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminMembershipActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = update_tenant_admin_membership(
                    tenant,
                    membership_id,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminMembershipMutationResultSerializer(payload).data)


class TenantAdminChangeRequestListCreateView(TenantAdminContextMixin, APIView):
    def post(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminChangeRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = create_tenant_admin_change_request(
                    tenant,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminChangeRequestMutationResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class TenantAdminChangeRequestDetailView(TenantAdminContextMixin, APIView):
    def patch(self, request, item_id):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminChangeRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = update_tenant_admin_change_request(
                    tenant,
                    item_id,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminChangeRequestMutationResultSerializer(payload).data)


class TenantAdminSupportAccessGrantListCreateView(TenantAdminContextMixin, APIView):
    def post(self, request):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminSupportAccessGrantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = create_support_access_grant(
                    tenant,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminSupportAccessGrantMutationResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class TenantAdminSupportAccessGrantDetailView(TenantAdminContextMixin, APIView):
    def patch(self, request, item_id):
        tenant = self.get_tenant()
        if not tenant:
            return response.Response({"detail": "No active tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantAdminSupportAccessGrantActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                payload = update_support_access_grant(
                    tenant,
                    item_id,
                    actor_identifier=getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                    payload=serializer.validated_data,
                )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(TenantAdminSupportAccessGrantMutationResultSerializer(payload).data)


class SupportSessionTenantConsoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_code = (request.query_params.get("tenant_code") or request.headers.get("X-HRMS-Tenant-Code") or "").strip()
        scope_ref = (request.query_params.get("scope_ref") or request.headers.get("X-HRMS-Support-Scope") or "read_only_account").strip()
        session_ref = (request.headers.get("X-HRMS-Support-Session-Ref") or request.query_params.get("session_ref") or "").strip()
        if not tenant_code:
            return response.Response({"detail": "Tenant code is required.", "code": "tenant_code_required"}, status=status.HTTP_400_BAD_REQUEST)
        tenant = Tenant.objects.filter(code=tenant_code).first()
        if not tenant:
            return response.Response({"detail": "Tenant was not found.", "code": "tenant_not_found"}, status=status.HTTP_404_NOT_FOUND)

        support_session = evaluate_support_access_session(
            tenant,
            user=request.user,
            session_ref=session_ref,
            required_scope_ref=scope_ref,
            request_path=request.path,
            method=request.method,
        )
        if not support_session["allowed"]:
            return response.Response(support_session, status=status.HTTP_403_FORBIDDEN)

        payload = get_support_session_tenant_console_payload(tenant, support_session=support_session)
        return response.Response(SupportSessionTenantConsoleSerializer(payload).data)


class SupportSessionDomainSnapshotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_code = (request.query_params.get("tenant_code") or request.headers.get("X-HRMS-Tenant-Code") or "").strip()
        domain_ref = (request.query_params.get("domain_ref") or "tenant_account").strip()
        session_ref = (request.headers.get("X-HRMS-Support-Session-Ref") or request.query_params.get("session_ref") or "").strip()
        if not tenant_code:
            return response.Response({"detail": "Tenant code is required.", "code": "tenant_code_required"}, status=status.HTTP_400_BAD_REQUEST)
        tenant = Tenant.objects.filter(code=tenant_code).first()
        if not tenant:
            return response.Response({"detail": "Tenant was not found.", "code": "tenant_not_found"}, status=status.HTTP_404_NOT_FOUND)

        domain_option = get_support_domain_snapshot_option(tenant, domain_ref)
        if not domain_option:
            return response.Response({"detail": "Support domain snapshot is not configured.", "code": "support_domain_not_configured"}, status=status.HTTP_400_BAD_REQUEST)

        support_session = evaluate_support_access_session(
            tenant,
            user=request.user,
            session_ref=session_ref,
            required_scope_ref=domain_option["scope_ref"],
            request_path=request.path,
            method=request.method,
        )
        if not support_session["allowed"]:
            return response.Response(support_session, status=status.HTTP_403_FORBIDDEN)

        payload = get_support_session_domain_snapshot_payload(tenant, support_session=support_session, domain_ref=domain_ref)
        return response.Response(SupportSessionDomainSnapshotSerializer(payload).data)


class HrAdminPayrollReadinessView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.localdate()
        default_start = today.replace(day=1)
        next_month_start = (default_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        default_end = next_month_start - timedelta(days=1)

        period_start = parse_date(request.query_params.get("period_start") or "") or default_start
        period_end = parse_date(request.query_params.get("period_end") or "") or default_end
        if period_start > period_end:
            return response.Response(
                {"detail": "period_start must be on or before period_end."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page, page_size = _get_page_params(request, default_page_size=20, max_page_size=100)
        payload = get_hr_admin_payroll_readiness(
            employee,
            period_start=period_start,
            period_end=period_end,
            query=request.query_params.get("q", ""),
            readiness_status=request.query_params.get("status", "all"),
            page=page,
            page_size=page_size,
        )
        return response.Response(HrAdminPayrollReadinessListSerializer(payload).data)


def _django_validation_error_payload(exc: DjangoValidationError) -> dict:
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    return {"detail": exc.messages[0] if exc.messages else "Invalid payload."}


def _employee_display_name(item: Employee) -> str:
    return f"{item.first_name} {item.last_name}".strip() or item.employee_code


def build_hr_admin_payroll_calendar_payload(item: PayrollCalendar) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "frequency": item.frequency,
        "frequency_label": item.get_frequency_display(),
        "timezone": item.timezone,
        "currency_code": item.currency_code,
        "period_start_day": item.period_start_day,
        "is_active": item.is_active,
        "config_snapshot": item.config_snapshot,
        "active_pay_group_count": item.pay_groups.filter(status=PayGroupStatus.ACTIVE).count(),
        "open_period_count": item.periods.filter(status=PayrollPeriodStatus.OPEN).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_period_payload(item: PayrollPeriod) -> dict:
    return {
        "id": item.id,
        "calendar_id": item.calendar_id,
        "calendar_name": item.calendar.name,
        "code": item.code,
        "name": item.name,
        "start_date": item.start_date,
        "end_date": item.end_date,
        "pay_date": item.pay_date,
        "status": item.status,
        "status_label": item.get_status_display(),
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_pay_group_payload(item: PayGroup) -> dict:
    return {
        "id": item.id,
        "calendar_id": item.calendar_id,
        "calendar_name": item.calendar.name,
        "code": item.code,
        "name": item.name,
        "status": item.status,
        "status_label": item.get_status_display(),
        "default_currency_code": item.default_currency_code,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "location_id": item.location_id,
        "location": item.location.name if item.location else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "employment_type_id": item.employment_type_id,
        "employment_type": item.employment_type.name if item.employment_type else None,
        "config_snapshot": item.config_snapshot,
        "assignment_count": item.assignments.filter(status=PayGroupStatus.ACTIVE).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_pay_group_assignment_payload(item: PayGroupAssignment) -> dict:
    return {
        "id": item.id,
        "pay_group_id": item.pay_group_id,
        "pay_group_name": item.pay_group.name,
        "pay_group_code": item.pay_group.code,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "status": item.status,
        "status_label": item.get_status_display(),
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_setup_payload(actor) -> dict:
    tenant = actor.tenant
    calendars = PayrollCalendar.objects.filter(tenant=tenant).order_by("name")
    periods = PayrollPeriod.objects.filter(tenant=tenant).select_related("calendar").order_by("-start_date", "calendar__name")
    pay_groups = PayGroup.objects.filter(tenant=tenant).select_related(
        "calendar", "legal_entity", "branch", "location", "department", "employment_type"
    ).order_by("name")
    assignments = PayGroupAssignment.objects.filter(tenant=tenant).select_related("pay_group", "employee").order_by(
        "employee__employee_code", "-effective_from"
    )
    employees = Employee.objects.filter(tenant=tenant).order_by("employee_code")

    return {
        "summary": {
            "calendar_count": calendars.count(),
            "active_calendar_count": calendars.filter(is_active=True).count(),
            "open_period_count": periods.filter(status=PayrollPeriodStatus.OPEN).count(),
            "active_pay_group_count": pay_groups.filter(status=PayGroupStatus.ACTIVE).count(),
            "assigned_employee_count": assignments.filter(status=PayGroupStatus.ACTIVE).values("employee_id").distinct().count(),
            "unassigned_employee_count": max(employees.count() - assignments.filter(status=PayGroupStatus.ACTIVE).values("employee_id").distinct().count(), 0),
        },
        "calendars": [build_hr_admin_payroll_calendar_payload(item) for item in calendars],
        "periods": [build_hr_admin_payroll_period_payload(item) for item in periods],
        "pay_groups": [build_hr_admin_pay_group_payload(item) for item in pay_groups],
        "assignments": [build_hr_admin_pay_group_assignment_payload(item) for item in assignments[:100]],
        "options": {
            "payroll_frequencies": [{"value": value, "label": label} for value, label in PayrollFrequency.choices],
            "payroll_period_statuses": [{"value": value, "label": label} for value, label in PayrollPeriodStatus.choices],
            "pay_group_statuses": [{"value": value, "label": label} for value, label in PayGroupStatus.choices],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "locations": [{"id": item.id, "name": item.name} for item in Location.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "departments": [{"id": item.id, "name": item.name} for item in Department.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "employment_types": [{"id": item.id, "name": item.name} for item in EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "employees": [{"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code} for item in employees],
        },
    }


def save_hr_admin_payroll_calendar(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollCalendar(tenant=actor.tenant)
    for field in ["code", "name", "frequency", "timezone", "currency_code", "period_start_day", "is_active", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def save_hr_admin_payroll_period(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollPeriod(tenant=actor.tenant)
    if "calendar_id" in validated_data:
        calendar = PayrollCalendar.objects.filter(tenant=actor.tenant, id=validated_data["calendar_id"]).first()
        if not calendar:
            raise serializers.ValidationError({"calendar_id": "Invalid selection."})
        item.calendar = calendar
        item.tenant = actor.tenant
    for field in ["code", "name", "start_date", "end_date", "pay_date", "status", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.calendar_id is None:
        raise serializers.ValidationError({"calendar_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_pay_group(actor, validated_data, *, item=None):
    if item is None:
        item = PayGroup(tenant=actor.tenant)
    if "calendar_id" in validated_data:
        calendar = PayrollCalendar.objects.filter(tenant=actor.tenant, id=validated_data["calendar_id"]).first()
        if not calendar:
            raise serializers.ValidationError({"calendar_id": "Invalid selection."})
        item.calendar = calendar
        item.tenant = actor.tenant

    relation_map = {
        "legal_entity_id": LegalEntity,
        "branch_id": Branch,
        "location_id": Location,
        "department_id": Department,
        "employment_type_id": EmploymentType,
    }
    for field_name, model_class in relation_map.items():
        if field_name in validated_data:
            raw_value = validated_data[field_name]
            related = model_class.objects.filter(tenant=actor.tenant, id=raw_value).first() if raw_value else None
            if raw_value and not related:
                raise serializers.ValidationError({field_name: "Invalid selection."})
            setattr(item, field_name.replace("_id", ""), related)

    for field in ["code", "name", "status", "default_currency_code", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.calendar_id is None:
        raise serializers.ValidationError({"calendar_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_pay_group_assignment(actor, validated_data, *, item=None):
    if item is None:
        item = PayGroupAssignment(tenant=actor.tenant)
    if "pay_group_id" in validated_data:
        pay_group = PayGroup.objects.filter(tenant=actor.tenant, id=validated_data["pay_group_id"]).first()
        if not pay_group:
            raise serializers.ValidationError({"pay_group_id": "Invalid selection."})
        item.pay_group = pay_group
        item.tenant = actor.tenant
    if "employee_id" in validated_data:
        target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
        if not target_employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = target_employee
    for field in ["effective_from", "effective_to", "status", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.pay_group_id is None:
        raise serializers.ValidationError({"pay_group_id": "This field is required."})
    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    item.save()
    return item


class HrAdminPayrollSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollSetupSerializer(get_hr_admin_payroll_setup_payload(employee)).data)


class HrAdminPayrollCalendarListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [build_hr_admin_payroll_calendar_payload(item) for item in PayrollCalendar.objects.filter(tenant=employee.tenant).order_by("name")]
        return response.Response(HrAdminPayrollCalendarSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollCalendarWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_calendar(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollCalendarSerializer(build_hr_admin_payroll_calendar_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollCalendarDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollCalendar.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollCalendarSerializer(build_hr_admin_payroll_calendar_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollCalendar.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollCalendarWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_calendar(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollCalendarSerializer(build_hr_admin_payroll_calendar_payload(item)).data)


class HrAdminPayrollPeriodListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollPeriod.objects.filter(tenant=employee.tenant).select_related("calendar").order_by("-start_date", "calendar__name")
        return response.Response(HrAdminPayrollPeriodSerializer([build_hr_admin_payroll_period_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollPeriodWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_period(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayrollPeriod.objects.select_related("calendar").get(id=item.id)
        return response.Response(HrAdminPayrollPeriodSerializer(build_hr_admin_payroll_period_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollPeriodDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollPeriod.objects.filter(tenant=employee.tenant, id=item_id).select_related("calendar").first()
        if not item:
            return response.Response({"detail": "Payroll period not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollPeriodSerializer(build_hr_admin_payroll_period_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollPeriod.objects.filter(tenant=employee.tenant, id=item_id).select_related("calendar").first()
        if not item:
            return response.Response({"detail": "Payroll period not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollPeriodWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_period(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayrollPeriod.objects.select_related("calendar").get(id=item.id)
        return response.Response(HrAdminPayrollPeriodSerializer(build_hr_admin_payroll_period_payload(item)).data)


class HrAdminPayGroupListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayGroup.objects.filter(tenant=employee.tenant).select_related("calendar", "legal_entity", "branch", "location", "department", "employment_type")
        return response.Response(HrAdminPayGroupSerializer([build_hr_admin_pay_group_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayGroupWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_pay_group(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayGroup.objects.select_related("calendar", "legal_entity", "branch", "location", "department", "employment_type").get(id=item.id)
        return response.Response(HrAdminPayGroupSerializer(build_hr_admin_pay_group_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayGroupDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayGroup.objects.filter(tenant=employee.tenant, id=item_id).select_related("calendar", "legal_entity", "branch", "location", "department", "employment_type").first()
        if not item:
            return response.Response({"detail": "Pay group not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayGroupSerializer(build_hr_admin_pay_group_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayGroup.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Pay group not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayGroupWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_pay_group(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayGroup.objects.select_related("calendar", "legal_entity", "branch", "location", "department", "employment_type").get(id=item.id)
        return response.Response(HrAdminPayGroupSerializer(build_hr_admin_pay_group_payload(item)).data)


class HrAdminPayGroupAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayGroupAssignment.objects.filter(tenant=employee.tenant).select_related("pay_group", "employee").order_by("employee__employee_code", "-effective_from")
        return response.Response(HrAdminPayGroupAssignmentSerializer([build_hr_admin_pay_group_assignment_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayGroupAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_pay_group_assignment(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayGroupAssignment.objects.select_related("pay_group", "employee").get(id=item.id)
        return response.Response(HrAdminPayGroupAssignmentSerializer(build_hr_admin_pay_group_assignment_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayGroupAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayGroupAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related("pay_group", "employee").first()
        if not item:
            return response.Response({"detail": "Pay group assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayGroupAssignmentSerializer(build_hr_admin_pay_group_assignment_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayGroupAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Pay group assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayGroupAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_pay_group_assignment(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = PayGroupAssignment.objects.select_related("pay_group", "employee").get(id=item.id)
        return response.Response(HrAdminPayGroupAssignmentSerializer(build_hr_admin_pay_group_assignment_payload(item)).data)


def build_hr_admin_salary_component_payload(item: SalaryComponent) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "component_type": item.component_type,
        "component_type_label": item.get_component_type_display(),
        "value_type": item.value_type,
        "value_type_label": item.get_value_type_display(),
        "formula_ref": item.formula_ref,
        "applicability_rule_ref": item.applicability_rule_ref,
        "rounding_rule_ref": item.rounding_rule_ref,
        "accounting_mapping_ref": item.accounting_mapping_ref,
        "statutory_treatment_ref": item.statutory_treatment_ref,
        "is_taxable": item.is_taxable,
        "is_proratable": item.is_proratable,
        "payslip_visibility": item.payslip_visibility,
        "status": item.status,
        "status_label": item.get_status_display(),
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_salary_structure_payload(item: SalaryStructure) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "pay_group_id": item.pay_group_id,
        "pay_group_name": item.pay_group.name if item.pay_group else None,
        "currency_code": item.currency_code,
        "status": item.status,
        "status_label": item.get_status_display(),
        "description": item.description,
        "config_snapshot": item.config_snapshot,
        "version_count": item.versions.count(),
        "assignment_count": EmployeeSalaryAssignment.objects.filter(structure_version__structure=item, status=PayrollConfigStatus.ACTIVE).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_salary_structure_version_payload(item: SalaryStructureVersion) -> dict:
    return {
        "id": item.id,
        "structure_id": item.structure_id,
        "structure_name": item.structure.name,
        "version": item.version,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "status": item.status,
        "status_label": item.get_status_display(),
        "annual_ctc": item.annual_ctc,
        "currency_code": item.currency_code,
        "config_snapshot": item.config_snapshot,
        "component_count": item.components.filter(is_active=True).count(),
        "assignment_count": item.employee_assignments.filter(status=PayrollConfigStatus.ACTIVE).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_salary_structure_component_payload(item: SalaryStructureComponent) -> dict:
    return {
        "id": item.id,
        "structure_version_id": item.structure_version_id,
        "structure_name": item.structure_version.structure.name,
        "component_id": item.component_id,
        "component_code": item.component.code,
        "component_name": item.component.name,
        "component_type": item.component.component_type,
        "value_type": item.component.value_type,
        "display_order": item.display_order,
        "amount": item.amount,
        "percentage": item.percentage,
        "formula_ref": item.formula_ref or item.component.formula_ref,
        "calculation_rule_ref": item.calculation_rule_ref,
        "is_active": item.is_active,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_employee_salary_assignment_payload(item: EmployeeSalaryAssignment) -> dict:
    annual_ctc = item.annual_ctc_override if item.annual_ctc_override is not None else item.structure_version.annual_ctc
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "structure_version_id": item.structure_version_id,
        "structure_name": item.structure_version.structure.name,
        "structure_version": item.structure_version.version,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "status": item.status,
        "status_label": item.get_status_display(),
        "annual_ctc": annual_ctc,
        "annual_ctc_override": item.annual_ctc_override,
        "assignment_reason": item.assignment_reason,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_salary_setup_payload(actor) -> dict:
    tenant = actor.tenant
    components = SalaryComponent.objects.filter(tenant=tenant).order_by("component_type", "name")
    structures = SalaryStructure.objects.filter(tenant=tenant).select_related("pay_group").order_by("name")
    versions = SalaryStructureVersion.objects.filter(tenant=tenant).select_related("structure").order_by("structure__name", "-effective_from")
    structure_components = SalaryStructureComponent.objects.filter(tenant=tenant).select_related(
        "structure_version__structure", "component"
    ).order_by("structure_version__structure__name", "structure_version__version", "display_order")
    assignments = EmployeeSalaryAssignment.objects.filter(tenant=tenant).select_related(
        "employee", "structure_version__structure"
    ).order_by("employee__employee_code", "-effective_from")
    employees = Employee.objects.filter(tenant=tenant).order_by("employee_code")

    return {
        "summary": {
            "component_count": components.count(),
            "active_component_count": components.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "structure_count": structures.count(),
            "active_structure_count": structures.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "active_version_count": versions.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "assigned_employee_count": assignments.filter(status=PayrollConfigStatus.ACTIVE).values("employee_id").distinct().count(),
        },
        "components": [build_hr_admin_salary_component_payload(item) for item in components],
        "structures": [build_hr_admin_salary_structure_payload(item) for item in structures],
        "versions": [build_hr_admin_salary_structure_version_payload(item) for item in versions],
        "structure_components": [build_hr_admin_salary_structure_component_payload(item) for item in structure_components[:200]],
        "assignments": [build_hr_admin_employee_salary_assignment_payload(item) for item in assignments[:100]],
        "options": {
            "component_types": [{"value": value, "label": label} for value, label in SalaryComponentType.choices],
            "component_value_types": [{"value": value, "label": label} for value, label in SalaryComponentValueType.choices],
            "config_statuses": [{"value": value, "label": label} for value, label in PayrollConfigStatus.choices],
            "pay_groups": [{"id": item.id, "name": item.name} for item in PayGroup.objects.filter(tenant=tenant).order_by("name")],
            "employees": [{"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code} for item in employees],
        },
    }


def save_hr_admin_salary_component(actor, validated_data, *, item=None):
    if item is None:
        item = SalaryComponent(tenant=actor.tenant)
    for field in [
        "code",
        "name",
        "component_type",
        "value_type",
        "formula_ref",
        "applicability_rule_ref",
        "rounding_rule_ref",
        "accounting_mapping_ref",
        "statutory_treatment_ref",
        "is_taxable",
        "is_proratable",
        "payslip_visibility",
        "status",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def save_hr_admin_salary_structure(actor, validated_data, *, item=None):
    if item is None:
        item = SalaryStructure(tenant=actor.tenant)
    if "pay_group_id" in validated_data:
        pay_group = PayGroup.objects.filter(tenant=actor.tenant, id=validated_data["pay_group_id"]).first() if validated_data["pay_group_id"] else None
        if validated_data["pay_group_id"] and not pay_group:
            raise serializers.ValidationError({"pay_group_id": "Invalid selection."})
        item.pay_group = pay_group
    for field in ["code", "name", "currency_code", "status", "description", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def save_hr_admin_salary_structure_version(actor, validated_data, *, item=None):
    if item is None:
        item = SalaryStructureVersion(tenant=actor.tenant)
    if "structure_id" in validated_data:
        structure = SalaryStructure.objects.filter(tenant=actor.tenant, id=validated_data["structure_id"]).first()
        if not structure:
            raise serializers.ValidationError({"structure_id": "Invalid selection."})
        item.structure = structure
        item.tenant = actor.tenant
    for field in ["version", "effective_from", "effective_to", "status", "annual_ctc", "currency_code", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.structure_id is None:
        raise serializers.ValidationError({"structure_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_salary_structure_component(actor, validated_data, *, item=None):
    if item is None:
        item = SalaryStructureComponent(tenant=actor.tenant)
    if "structure_version_id" in validated_data:
        structure_version = SalaryStructureVersion.objects.filter(tenant=actor.tenant, id=validated_data["structure_version_id"]).first()
        if not structure_version:
            raise serializers.ValidationError({"structure_version_id": "Invalid selection."})
        item.structure_version = structure_version
        item.tenant = actor.tenant
    if "component_id" in validated_data:
        component = SalaryComponent.objects.filter(tenant=actor.tenant, id=validated_data["component_id"]).first()
        if not component:
            raise serializers.ValidationError({"component_id": "Invalid selection."})
        item.component = component
    for field in ["display_order", "amount", "percentage", "formula_ref", "calculation_rule_ref", "is_active", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.structure_version_id is None:
        raise serializers.ValidationError({"structure_version_id": "This field is required."})
    if item.component_id is None:
        raise serializers.ValidationError({"component_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_employee_salary_assignment(actor, validated_data, *, item=None):
    if item is None:
        item = EmployeeSalaryAssignment(tenant=actor.tenant)
    if "employee_id" in validated_data:
        target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
        if not target_employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = target_employee
    if "structure_version_id" in validated_data:
        structure_version = SalaryStructureVersion.objects.filter(tenant=actor.tenant, id=validated_data["structure_version_id"]).first()
        if not structure_version:
            raise serializers.ValidationError({"structure_version_id": "Invalid selection."})
        item.structure_version = structure_version
        item.tenant = actor.tenant
    for field in ["effective_from", "effective_to", "status", "annual_ctc_override", "assignment_reason", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    if item.structure_version_id is None:
        raise serializers.ValidationError({"structure_version_id": "This field is required."})
    item.save()
    return item


def build_hr_admin_payroll_statutory_pack_payload(item: PayrollStatutoryPack) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "country_code": item.country_code,
        "jurisdiction_ref": item.jurisdiction_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "currency_code": item.currency_code,
        "statutory_profile_ref": item.statutory_profile_ref,
        "validation_profile_ref": item.validation_profile_ref,
        "config_snapshot": item.config_snapshot,
        "component_count": item.components.count(),
        "active_component_count": item.components.filter(status=PayrollConfigStatus.ACTIVE).count(),
        "employee_profile_count": item.employee_profiles.count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_statutory_component_payload(item: PayrollStatutoryComponent) -> dict:
    return {
        "id": item.id,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name,
        "salary_component_id": item.salary_component_id,
        "salary_component_name": item.salary_component.name if item.salary_component else None,
        "code": item.code,
        "name": item.name,
        "statutory_type": item.statutory_type,
        "statutory_type_label": item.get_statutory_type_display(),
        "contribution_owner": item.contribution_owner,
        "contribution_owner_label": item.get_contribution_owner_display(),
        "calculation_method": item.calculation_method,
        "calculation_method_label": item.get_calculation_method_display(),
        "wage_base_ref": item.wage_base_ref,
        "statutory_treatment_ref": item.statutory_treatment_ref,
        "registration_ref": item.registration_ref,
        "applicability_profile_ref": item.applicability_profile_ref,
        "rounding_rule_ref": item.rounding_rule_ref,
        "formula_ref": item.formula_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "config_snapshot": item.config_snapshot,
        "slab_count": item.slabs.count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_statutory_slab_payload(item: PayrollStatutorySlab) -> dict:
    return {
        "id": item.id,
        "statutory_component_id": item.statutory_component_id,
        "statutory_component_name": item.statutory_component.name,
        "statutory_type": item.statutory_component.statutory_type,
        "code": item.code,
        "name": item.name,
        "slab_order": item.slab_order,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "min_amount": item.min_amount,
        "max_amount": item.max_amount,
        "employee_rate_percent": item.employee_rate_percent,
        "employer_rate_percent": item.employer_rate_percent,
        "fixed_employee_amount": item.fixed_employee_amount,
        "fixed_employer_amount": item.fixed_employer_amount,
        "wage_ceiling_amount": item.wage_ceiling_amount,
        "state_code": item.state_code,
        "applicability_profile_ref": item.applicability_profile_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_statutory_employer_registration_payload(item: PayrollStatutoryEmployerRegistration) -> dict:
    closed_statuses = [
        PayrollStatutoryFilingStatus.FILED,
        PayrollStatutoryFilingStatus.ACKNOWLEDGED,
        PayrollStatutoryFilingStatus.WAIVED,
    ]
    return {
        "id": item.id,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name,
        "statutory_component_id": item.statutory_component_id,
        "statutory_component_name": item.statutory_component.name if item.statutory_component else None,
        "statutory_type": item.statutory_component.statutory_type if item.statutory_component else "",
        "legal_entity_id": item.legal_entity_id,
        "legal_entity_name": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch_name": item.branch.name if item.branch else None,
        "location_id": item.location_id,
        "location_name": item.location.name if item.location else None,
        "code": item.code,
        "name": item.name,
        "registration_type_ref": item.registration_type_ref,
        "registration_number": item.registration_number,
        "employer_identifier": item.employer_identifier,
        "jurisdiction_ref": item.jurisdiction_ref,
        "filing_authority_ref": item.filing_authority_ref,
        "provider_ref": item.provider_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "filing_calendar_count": item.filing_calendars.count(),
        "open_filing_calendar_count": item.filing_calendars.exclude(status__in=closed_statuses).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_statutory_filing_calendar_payload(item: PayrollStatutoryFilingCalendar) -> dict:
    today = timezone.localdate()
    due_basis = item.grace_due_date or item.due_date
    days_until_due = (due_basis - today).days if due_basis else None
    is_closed = item.status in {
        PayrollStatutoryFilingStatus.FILED,
        PayrollStatutoryFilingStatus.ACKNOWLEDGED,
        PayrollStatutoryFilingStatus.WAIVED,
    }
    is_overdue = item.status == PayrollStatutoryFilingStatus.OVERDUE or (
        bool(due_basis) and due_basis < today and not is_closed
    )
    is_due = item.status == PayrollStatutoryFilingStatus.DUE or (
        bool(item.due_date) and item.due_date <= today and not is_closed
    )
    return {
        "id": item.id,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name,
        "statutory_component_id": item.statutory_component_id,
        "statutory_component_name": item.statutory_component.name if item.statutory_component else None,
        "statutory_type": item.statutory_component.statutory_type if item.statutory_component else "",
        "employer_registration_id": item.employer_registration_id,
        "employer_registration_name": item.employer_registration.name if item.employer_registration else None,
        "employer_registration_number": item.employer_registration.registration_number if item.employer_registration else "",
        "code": item.code,
        "name": item.name,
        "filing_type_ref": item.filing_type_ref,
        "filing_frequency": item.filing_frequency,
        "filing_frequency_label": item.get_filing_frequency_display(),
        "period_start": item.period_start,
        "period_end": item.period_end,
        "due_date": item.due_date,
        "grace_due_date": item.grace_due_date,
        "filing_window_start": item.filing_window_start,
        "filing_window_end": item.filing_window_end,
        "status": item.status,
        "status_label": item.get_status_display(),
        "filing_authority_ref": item.filing_authority_ref,
        "provider_ref": item.provider_ref,
        "output_profile_ref": item.output_profile_ref,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "days_until_due": days_until_due,
        "is_due": is_due,
        "is_overdue": is_overdue,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_employee_statutory_profile_payload(item: EmployeeStatutoryProfile) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name if item.statutory_pack else None,
        "profile_ref": item.profile_ref,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "status": item.status,
        "status_label": item.get_status_display(),
        "pan_number": item.pan_number,
        "uan_number": item.uan_number,
        "pf_number": item.pf_number,
        "esi_number": item.esi_number,
        "pf_applicable": item.pf_applicable,
        "esi_applicable": item.esi_applicable,
        "professional_tax_state": item.professional_tax_state,
        "lwf_state": item.lwf_state,
        "tax_regime": item.tax_regime,
        "tax_regime_label": item.get_tax_regime_display(),
        "declaration_status": item.declaration_status,
        "declaration_status_label": item.get_declaration_status_display(),
        "previous_employment_income": item.previous_employment_income,
        "previous_employment_tax_deducted": item.previous_employment_tax_deducted,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_employee_statutory_declaration_payload(item: EmployeeStatutoryDeclaration) -> dict:
    declaration_items = item.items.all()
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "employee_statutory_profile_id": item.employee_statutory_profile_id,
        "statutory_pack_id": item.statutory_pack_id,
        "statutory_pack_name": item.statutory_pack.name if item.statutory_pack else None,
        "financial_year_code": item.financial_year_code,
        "declaration_profile_ref": item.declaration_profile_ref,
        "proof_window_ref": item.proof_window_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "tax_regime": item.tax_regime,
        "tax_regime_label": item.get_tax_regime_display(),
        "declared_total_amount": item.declared_total_amount,
        "verified_total_amount": item.verified_total_amount,
        "submitted_at": item.submitted_at,
        "submitted_by_name": str(item.submitted_by) if item.submitted_by else None,
        "verified_at": item.verified_at,
        "verified_by_name": str(item.verified_by) if item.verified_by else None,
        "rejected_at": item.rejected_at,
        "rejected_by_name": str(item.rejected_by) if item.rejected_by else None,
        "locked_at": item.locked_at,
        "locked_by_name": str(item.locked_by) if item.locked_by else None,
        "rejection_reason": item.rejection_reason,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "item_count": declaration_items.count(),
        "submitted_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.SUBMITTED).count(),
        "verified_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.VERIFIED).count(),
        "rejected_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.REJECTED).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_employee_statutory_declaration_item_payload(item: EmployeeStatutoryDeclarationItem) -> dict:
    return {
        "id": item.id,
        "declaration_id": item.declaration_id,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "financial_year_code": item.declaration.financial_year_code,
        "item_kind": item.item_kind,
        "item_kind_label": item.get_item_kind_display(),
        "section_code": item.section_code,
        "component_code": item.component_code,
        "name": item.name,
        "declared_amount": item.declared_amount,
        "verified_amount": item.verified_amount,
        "proof_status": item.proof_status,
        "proof_status_label": item.get_proof_status_display(),
        "proof_document_ref": item.proof_document_ref,
        "proof_artifact_key": item.proof_artifact_key,
        "proof_submitted_at": item.proof_submitted_at,
        "verified_at": item.verified_at,
        "verified_by_name": str(item.verified_by) if item.verified_by else None,
        "rejected_at": item.rejected_at,
        "rejected_by_name": str(item.rejected_by) if item.rejected_by else None,
        "rejection_reason": item.rejection_reason,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_statutory_setup_payload(actor) -> dict:
    tenant = actor.tenant
    packs = PayrollStatutoryPack.objects.filter(tenant=tenant).order_by("country_code", "name", "-effective_from")
    statutory_components = PayrollStatutoryComponent.objects.filter(tenant=tenant).select_related(
        "statutory_pack", "salary_component"
    ).order_by("statutory_pack__name", "statutory_type", "name")
    slabs = PayrollStatutorySlab.objects.filter(tenant=tenant).select_related(
        "statutory_component"
    ).order_by("statutory_component__code", "slab_order", "min_amount")
    employer_registrations = PayrollStatutoryEmployerRegistration.objects.filter(tenant=tenant).select_related(
        "statutory_pack", "statutory_component", "legal_entity", "branch", "location"
    ).order_by("statutory_pack__name", "registration_type_ref", "name")
    filing_calendars = PayrollStatutoryFilingCalendar.objects.filter(tenant=tenant).select_related(
        "statutory_pack", "statutory_component", "employer_registration"
    ).order_by("due_date", "statutory_pack__name", "filing_type_ref")
    employee_profiles = EmployeeStatutoryProfile.objects.filter(tenant=tenant).select_related(
        "employee", "statutory_pack"
    ).order_by("employee__employee_code", "-effective_from")
    declarations = EmployeeStatutoryDeclaration.objects.filter(tenant=tenant).select_related(
        "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
    ).prefetch_related("items").order_by("employee__employee_code", "-financial_year_code")
    declaration_items = EmployeeStatutoryDeclarationItem.objects.filter(tenant=tenant).select_related(
        "declaration", "employee", "verified_by", "rejected_by"
    ).order_by("declaration__financial_year_code", "employee__employee_code", "section_code", "component_code")
    employees = Employee.objects.filter(tenant=tenant).order_by("employee_code")
    salary_components = SalaryComponent.objects.filter(tenant=tenant).order_by("component_type", "name")
    active_profiles = employee_profiles.filter(status=PayrollConfigStatus.ACTIVE)
    today = timezone.localdate()
    closed_filing_statuses = [
        PayrollStatutoryFilingStatus.FILED,
        PayrollStatutoryFilingStatus.ACKNOWLEDGED,
        PayrollStatutoryFilingStatus.WAIVED,
    ]

    return {
        "summary": {
            "pack_count": packs.count(),
            "active_pack_count": packs.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "statutory_component_count": statutory_components.count(),
            "active_statutory_component_count": statutory_components.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "slab_count": slabs.count(),
            "employee_profile_count": employee_profiles.count(),
            "active_employee_profile_count": active_profiles.count(),
            "pf_applicable_employee_count": active_profiles.filter(pf_applicable=True).count(),
            "esi_applicable_employee_count": active_profiles.filter(esi_applicable=True).count(),
            "declared_tax_profile_count": active_profiles.exclude(tax_regime=PayrollTaxRegime.NOT_DECLARED).count(),
            "declaration_count": declarations.count(),
            "submitted_declaration_count": declarations.filter(status=PayrollStatutoryDeclarationStatus.SUBMITTED).count(),
            "verified_declaration_count": declarations.filter(status=PayrollStatutoryDeclarationStatus.VERIFIED).count(),
            "locked_declaration_count": declarations.filter(status=PayrollStatutoryDeclarationStatus.LOCKED).count(),
            "declaration_item_count": declaration_items.count(),
            "verified_declaration_item_count": declaration_items.filter(proof_status=PayrollStatutoryProofStatus.VERIFIED).count(),
            "employer_registration_count": employer_registrations.count(),
            "active_employer_registration_count": employer_registrations.filter(status=PayrollConfigStatus.ACTIVE).count(),
            "filing_calendar_count": filing_calendars.count(),
            "due_filing_calendar_count": filing_calendars.filter(status=PayrollStatutoryFilingStatus.DUE).count()
            + filing_calendars.filter(status=PayrollStatutoryFilingStatus.UPCOMING, due_date__lte=today).count(),
            "overdue_filing_calendar_count": filing_calendars.filter(status=PayrollStatutoryFilingStatus.OVERDUE).count()
            + filing_calendars.exclude(status__in=closed_filing_statuses + [PayrollStatutoryFilingStatus.OVERDUE]).filter(
                Q(grace_due_date__lt=today) | Q(grace_due_date__isnull=True, due_date__lt=today)
            ).count(),
            "acknowledged_filing_calendar_count": filing_calendars.filter(status=PayrollStatutoryFilingStatus.ACKNOWLEDGED).count(),
        },
        "packs": [build_hr_admin_payroll_statutory_pack_payload(item) for item in packs],
        "statutory_components": [build_hr_admin_payroll_statutory_component_payload(item) for item in statutory_components],
        "slabs": [build_hr_admin_payroll_statutory_slab_payload(item) for item in slabs[:200]],
        "employer_registrations": [build_hr_admin_payroll_statutory_employer_registration_payload(item) for item in employer_registrations[:200]],
        "filing_calendars": [build_hr_admin_payroll_statutory_filing_calendar_payload(item) for item in filing_calendars[:300]],
        "employee_profiles": [build_hr_admin_employee_statutory_profile_payload(item) for item in employee_profiles[:200]],
        "declarations": [build_hr_admin_employee_statutory_declaration_payload(item) for item in declarations[:200]],
        "declaration_items": [build_hr_admin_employee_statutory_declaration_item_payload(item) for item in declaration_items[:300]],
        "options": {
            "config_statuses": [{"value": value, "label": label} for value, label in PayrollConfigStatus.choices],
            "statutory_component_types": [{"value": value, "label": label} for value, label in PayrollStatutoryComponentKind.choices],
            "contribution_owners": [{"value": value, "label": label} for value, label in PayrollStatutoryContributionOwner.choices],
            "calculation_methods": [{"value": value, "label": label} for value, label in PayrollStatutoryCalculationMethod.choices],
            "payroll_frequencies": [{"value": value, "label": label} for value, label in PayrollFrequency.choices],
            "tax_regimes": [{"value": value, "label": label} for value, label in PayrollTaxRegime.choices],
            "declaration_statuses": [{"value": value, "label": label} for value, label in PayrollDeclarationStatus.choices],
            "statutory_declaration_statuses": [{"value": value, "label": label} for value, label in PayrollStatutoryDeclarationStatus.choices],
            "statutory_declaration_item_kinds": [{"value": value, "label": label} for value, label in PayrollStatutoryDeclarationItemKind.choices],
            "statutory_proof_statuses": [{"value": value, "label": label} for value, label in PayrollStatutoryProofStatus.choices],
            "statutory_filing_statuses": [{"value": value, "label": label} for value, label in PayrollStatutoryFilingStatus.choices],
            "salary_components": [{"id": item.id, "code": item.code, "name": item.name, "component_type": item.component_type} for item in salary_components],
            "employees": [{"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code} for item in employees],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "locations": [{"id": item.id, "name": item.name} for item in Location.objects.filter(tenant=tenant, is_active=True).order_by("name")],
        },
    }


def save_hr_admin_payroll_statutory_pack(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollStatutoryPack(tenant=actor.tenant)
    for field in [
        "code",
        "name",
        "country_code",
        "jurisdiction_ref",
        "status",
        "effective_from",
        "effective_to",
        "currency_code",
        "statutory_profile_ref",
        "validation_profile_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def save_hr_admin_payroll_statutory_component(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollStatutoryComponent(tenant=actor.tenant)
    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=actor.tenant, id=validated_data["statutory_pack_id"]).first()
        if not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack
        item.tenant = actor.tenant
    if "salary_component_id" in validated_data:
        salary_component = SalaryComponent.objects.filter(tenant=actor.tenant, id=validated_data["salary_component_id"]).first() if validated_data["salary_component_id"] else None
        if validated_data["salary_component_id"] and not salary_component:
            raise serializers.ValidationError({"salary_component_id": "Invalid selection."})
        item.salary_component = salary_component
    for field in [
        "code",
        "name",
        "statutory_type",
        "contribution_owner",
        "calculation_method",
        "wage_base_ref",
        "statutory_treatment_ref",
        "registration_ref",
        "applicability_profile_ref",
        "rounding_rule_ref",
        "formula_ref",
        "status",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.statutory_pack_id is None:
        raise serializers.ValidationError({"statutory_pack_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_payroll_statutory_slab(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollStatutorySlab(tenant=actor.tenant)
    if "statutory_component_id" in validated_data:
        statutory_component = PayrollStatutoryComponent.objects.filter(tenant=actor.tenant, id=validated_data["statutory_component_id"]).first()
        if not statutory_component:
            raise serializers.ValidationError({"statutory_component_id": "Invalid selection."})
        item.statutory_component = statutory_component
        item.tenant = actor.tenant
    for field in [
        "code",
        "name",
        "slab_order",
        "effective_from",
        "effective_to",
        "min_amount",
        "max_amount",
        "employee_rate_percent",
        "employer_rate_percent",
        "fixed_employee_amount",
        "fixed_employer_amount",
        "wage_ceiling_amount",
        "state_code",
        "applicability_profile_ref",
        "status",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.statutory_component_id is None:
        raise serializers.ValidationError({"statutory_component_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_payroll_statutory_employer_registration(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollStatutoryEmployerRegistration(tenant=actor.tenant)
    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=actor.tenant, id=validated_data["statutory_pack_id"]).first()
        if not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack
        item.tenant = actor.tenant
    if "statutory_component_id" in validated_data:
        statutory_component = PayrollStatutoryComponent.objects.filter(tenant=actor.tenant, id=validated_data["statutory_component_id"]).first() if validated_data["statutory_component_id"] else None
        if validated_data["statutory_component_id"] and not statutory_component:
            raise serializers.ValidationError({"statutory_component_id": "Invalid selection."})
        item.statutory_component = statutory_component
    if "legal_entity_id" in validated_data:
        legal_entity = LegalEntity.objects.filter(tenant=actor.tenant, id=validated_data["legal_entity_id"]).first() if validated_data["legal_entity_id"] else None
        if validated_data["legal_entity_id"] and not legal_entity:
            raise serializers.ValidationError({"legal_entity_id": "Invalid selection."})
        item.legal_entity = legal_entity
    if "branch_id" in validated_data:
        branch = Branch.objects.filter(tenant=actor.tenant, id=validated_data["branch_id"]).first() if validated_data["branch_id"] else None
        if validated_data["branch_id"] and not branch:
            raise serializers.ValidationError({"branch_id": "Invalid selection."})
        item.branch = branch
    if "location_id" in validated_data:
        location = Location.objects.filter(tenant=actor.tenant, id=validated_data["location_id"]).first() if validated_data["location_id"] else None
        if validated_data["location_id"] and not location:
            raise serializers.ValidationError({"location_id": "Invalid selection."})
        item.location = location
    for field in [
        "code",
        "name",
        "registration_type_ref",
        "registration_number",
        "employer_identifier",
        "jurisdiction_ref",
        "filing_authority_ref",
        "provider_ref",
        "status",
        "effective_from",
        "effective_to",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.statutory_pack_id is None:
        raise serializers.ValidationError({"statutory_pack_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_payroll_statutory_filing_calendar(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollStatutoryFilingCalendar(tenant=actor.tenant)
    registration = None
    if "employer_registration_id" in validated_data:
        registration = PayrollStatutoryEmployerRegistration.objects.filter(
            tenant=actor.tenant,
            id=validated_data["employer_registration_id"],
        ).first() if validated_data["employer_registration_id"] else None
        if validated_data["employer_registration_id"] and not registration:
            raise serializers.ValidationError({"employer_registration_id": "Invalid selection."})
        item.employer_registration = registration
        if registration and "statutory_pack_id" not in validated_data:
            item.statutory_pack = registration.statutory_pack
        if registration and "statutory_component_id" not in validated_data and registration.statutory_component_id:
            item.statutory_component = registration.statutory_component
    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=actor.tenant, id=validated_data["statutory_pack_id"]).first()
        if not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack
        item.tenant = actor.tenant
    if "statutory_component_id" in validated_data:
        statutory_component = PayrollStatutoryComponent.objects.filter(tenant=actor.tenant, id=validated_data["statutory_component_id"]).first() if validated_data["statutory_component_id"] else None
        if validated_data["statutory_component_id"] and not statutory_component:
            raise serializers.ValidationError({"statutory_component_id": "Invalid selection."})
        item.statutory_component = statutory_component
    for field in [
        "code",
        "name",
        "filing_type_ref",
        "filing_frequency",
        "period_start",
        "period_end",
        "due_date",
        "grace_due_date",
        "filing_window_start",
        "filing_window_end",
        "status",
        "filing_authority_ref",
        "provider_ref",
        "output_profile_ref",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.statutory_pack_id is None:
        raise serializers.ValidationError({"statutory_pack_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_employee_statutory_profile(actor, validated_data, *, item=None):
    if item is None:
        item = EmployeeStatutoryProfile(tenant=actor.tenant)
    if "employee_id" in validated_data:
        target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
        if not target_employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = target_employee
        item.tenant = actor.tenant
    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=actor.tenant, id=validated_data["statutory_pack_id"]).first() if validated_data["statutory_pack_id"] else None
        if validated_data["statutory_pack_id"] and not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack
    for field in [
        "profile_ref",
        "effective_from",
        "effective_to",
        "status",
        "pan_number",
        "uan_number",
        "pf_number",
        "esi_number",
        "pf_applicable",
        "esi_applicable",
        "professional_tax_state",
        "lwf_state",
        "tax_regime",
        "declaration_status",
        "previous_employment_income",
        "previous_employment_tax_deducted",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    item.save()
    return item


def _refresh_statutory_declaration_totals(declaration: EmployeeStatutoryDeclaration) -> EmployeeStatutoryDeclaration:
    totals = declaration.items.aggregate(
        declared_total=Sum("declared_amount"),
        verified_total=Sum("verified_amount"),
    )
    declaration.declared_total_amount = totals["declared_total"] or Decimal("0.00")
    declaration.verified_total_amount = totals["verified_total"] or Decimal("0.00")
    declaration.save()
    return declaration


def save_hr_admin_employee_statutory_declaration(actor, validated_data, *, item=None):
    if item is not None and item.status == PayrollStatutoryDeclarationStatus.LOCKED:
        raise serializers.ValidationError({"status": "Locked statutory declarations cannot be edited."})
    if item is None:
        item = EmployeeStatutoryDeclaration(tenant=actor.tenant)
    if "employee_id" in validated_data:
        target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
        if not target_employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = target_employee
        item.tenant = actor.tenant
    if "employee_statutory_profile_id" in validated_data:
        profile = EmployeeStatutoryProfile.objects.filter(tenant=actor.tenant, id=validated_data["employee_statutory_profile_id"]).first()
        if not profile:
            raise serializers.ValidationError({"employee_statutory_profile_id": "Invalid selection."})
        item.employee_statutory_profile = profile
        item.employee = profile.employee
        item.tenant = actor.tenant
        if not item.statutory_pack_id:
            item.statutory_pack = profile.statutory_pack
    if "statutory_pack_id" in validated_data:
        statutory_pack = PayrollStatutoryPack.objects.filter(tenant=actor.tenant, id=validated_data["statutory_pack_id"]).first() if validated_data["statutory_pack_id"] else None
        if validated_data["statutory_pack_id"] and not statutory_pack:
            raise serializers.ValidationError({"statutory_pack_id": "Invalid selection."})
        item.statutory_pack = statutory_pack
    for field in [
        "financial_year_code",
        "declaration_profile_ref",
        "proof_window_ref",
        "status",
        "tax_regime",
        "declared_total_amount",
        "verified_total_amount",
        "rejection_reason",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    if item.employee_statutory_profile_id is None:
        raise serializers.ValidationError({"employee_statutory_profile_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_employee_statutory_declaration_item(actor, declaration: EmployeeStatutoryDeclaration, validated_data, *, item=None):
    if declaration.status == PayrollStatutoryDeclarationStatus.LOCKED:
        raise serializers.ValidationError({"declaration": "Locked statutory declarations cannot be edited."})
    if item is None:
        item = EmployeeStatutoryDeclarationItem(tenant=actor.tenant, declaration=declaration, employee=declaration.employee)
    for field in [
        "item_kind",
        "section_code",
        "component_code",
        "name",
        "declared_amount",
        "verified_amount",
        "proof_status",
        "proof_document_ref",
        "proof_artifact_key",
        "source_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.proof_status in {PayrollStatutoryProofStatus.SUBMITTED, PayrollStatutoryProofStatus.VERIFIED} and not item.proof_submitted_at:
        item.proof_submitted_at = timezone.now()
    item.save()
    _refresh_statutory_declaration_totals(declaration)
    return item


def submit_hr_admin_employee_statutory_declaration(declaration: EmployeeStatutoryDeclaration, *, submitted_by=None) -> EmployeeStatutoryDeclaration:
    if declaration.status not in {PayrollStatutoryDeclarationStatus.DRAFT, PayrollStatutoryDeclarationStatus.REJECTED}:
        raise serializers.ValidationError({"status": "Only draft or rejected statutory declarations can be submitted."})
    _refresh_statutory_declaration_totals(declaration)
    if not declaration.items.exists():
        raise serializers.ValidationError({"items": "At least one declaration item is required before submission."})
    declaration.status = PayrollStatutoryDeclarationStatus.SUBMITTED
    declaration.submitted_at = timezone.now()
    declaration.submitted_by = submitted_by
    declaration.rejected_at = None
    declaration.rejected_by = None
    declaration.rejection_reason = ""
    declaration.save()
    profile = declaration.employee_statutory_profile
    profile.declaration_status = PayrollDeclarationStatus.PROOFS_PENDING
    profile.tax_regime = declaration.tax_regime
    profile.save()
    return declaration


def verify_hr_admin_employee_statutory_declaration(declaration: EmployeeStatutoryDeclaration, *, verified_by=None) -> EmployeeStatutoryDeclaration:
    if declaration.status != PayrollStatutoryDeclarationStatus.SUBMITTED:
        raise serializers.ValidationError({"status": "Only submitted statutory declarations can be verified."})
    rejected_items = declaration.items.filter(proof_status=PayrollStatutoryProofStatus.REJECTED)
    if rejected_items.exists():
        raise serializers.ValidationError({"items": "Rejected proof items must be resolved before declaration verification."})
    now = timezone.now()
    for declaration_item in declaration.items.filter(proof_status__in=[PayrollStatutoryProofStatus.PENDING, PayrollStatutoryProofStatus.SUBMITTED]):
        if not (declaration_item.proof_document_ref or declaration_item.proof_artifact_key):
            raise serializers.ValidationError({"items": "Pending proof items require a proof reference before declaration verification."})
        declaration_item.proof_status = PayrollStatutoryProofStatus.VERIFIED
        if declaration_item.verified_amount == Decimal("0.00"):
            declaration_item.verified_amount = declaration_item.declared_amount
        declaration_item.verified_at = now
        declaration_item.verified_by = verified_by
        if not declaration_item.proof_submitted_at:
            declaration_item.proof_submitted_at = now
        declaration_item.save()
    _refresh_statutory_declaration_totals(declaration)
    declaration.status = PayrollStatutoryDeclarationStatus.VERIFIED
    declaration.verified_at = now
    declaration.verified_by = verified_by
    declaration.save()
    profile = declaration.employee_statutory_profile
    profile.declaration_status = PayrollDeclarationStatus.VERIFIED
    profile.tax_regime = declaration.tax_regime
    profile.save()
    return declaration


def reject_hr_admin_employee_statutory_declaration(declaration: EmployeeStatutoryDeclaration, *, rejected_by=None, reason: str = "") -> EmployeeStatutoryDeclaration:
    if declaration.status not in {PayrollStatutoryDeclarationStatus.SUBMITTED, PayrollStatutoryDeclarationStatus.VERIFIED}:
        raise serializers.ValidationError({"status": "Only submitted or verified statutory declarations can be rejected."})
    if not reason:
        raise serializers.ValidationError({"reason": "Rejection reason is required."})
    declaration.status = PayrollStatutoryDeclarationStatus.REJECTED
    declaration.rejected_at = timezone.now()
    declaration.rejected_by = rejected_by
    declaration.rejection_reason = reason
    declaration.verified_at = None
    declaration.verified_by = None
    declaration.save()
    profile = declaration.employee_statutory_profile
    profile.declaration_status = PayrollDeclarationStatus.PROOFS_PENDING
    profile.save()
    return declaration


def lock_hr_admin_employee_statutory_declaration(declaration: EmployeeStatutoryDeclaration, *, locked_by=None) -> EmployeeStatutoryDeclaration:
    if declaration.status != PayrollStatutoryDeclarationStatus.VERIFIED:
        raise serializers.ValidationError({"status": "Only verified statutory declarations can be locked."})
    declaration.status = PayrollStatutoryDeclarationStatus.LOCKED
    declaration.locked_at = timezone.now()
    declaration.locked_by = locked_by
    declaration.save()
    profile = declaration.employee_statutory_profile
    profile.declaration_status = PayrollDeclarationStatus.LOCKED
    profile.save()
    return declaration


def verify_hr_admin_employee_statutory_declaration_item(item: EmployeeStatutoryDeclarationItem, validated_data, *, verified_by=None):
    if item.declaration.status == PayrollStatutoryDeclarationStatus.LOCKED:
        raise serializers.ValidationError({"declaration": "Locked statutory declarations cannot be edited."})
    proof_status = validated_data.get("proof_status") or PayrollStatutoryProofStatus.VERIFIED
    if proof_status == PayrollStatutoryProofStatus.REJECTED:
        reason = validated_data.get("rejection_reason") or ""
        if not reason:
            raise serializers.ValidationError({"rejection_reason": "Rejection reason is required."})
        item.proof_status = PayrollStatutoryProofStatus.REJECTED
        item.rejection_reason = reason
        item.rejected_at = timezone.now()
        item.rejected_by = verified_by
        item.verified_at = None
        item.verified_by = None
        if "verified_amount" in validated_data:
            item.verified_amount = validated_data["verified_amount"]
    else:
        item.proof_status = PayrollStatutoryProofStatus.VERIFIED
        item.verified_amount = validated_data.get("verified_amount", item.declared_amount)
        item.verified_at = timezone.now()
        item.verified_by = verified_by
        item.rejected_at = None
        item.rejected_by = None
        item.rejection_reason = ""
        if not item.proof_submitted_at:
            item.proof_submitted_at = timezone.now()
    item.save()
    _refresh_statutory_declaration_totals(item.declaration)
    return item


def _snapshot_issues(item: PayrollInputSnapshot, key: str) -> list[str]:
    raw = item.validation_snapshot.get(key, []) if isinstance(item.validation_snapshot, dict) else []
    if isinstance(raw, list):
        return [str(value) for value in raw if str(value)]
    if raw:
        return [str(raw)]
    return []


def build_hr_admin_payroll_run_payload(item: PayrollRun) -> dict:
    snapshots = item.input_snapshots.all()
    return {
        "id": item.id,
        "period_id": item.period_id,
        "period_name": item.period.name,
        "pay_group_id": item.pay_group_id,
        "pay_group_name": item.pay_group.name if item.pay_group else None,
        "code": item.code,
        "name": item.name,
        "status": item.status,
        "status_label": item.get_status_display(),
        "input_profile_ref": item.input_profile_ref,
        "snapshot_schema_ref": item.snapshot_schema_ref,
        "locked_at": item.locked_at,
        "locked_by_name": str(item.locked_by) if item.locked_by else None,
        "final_locked_at": item.final_locked_at,
        "final_locked_by_name": str(item.final_locked_by) if item.final_locked_by else None,
        "config_snapshot": item.config_snapshot,
        "snapshot_count": snapshots.count(),
        "ready_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.READY).count(),
        "warning_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.WARNING).count(),
        "blocked_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.BLOCKED).count(),
        "locked_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.LOCKED).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_input_snapshot_payload(item: PayrollInputSnapshot) -> dict:
    salary_structure = item.salary_assignment.structure_version.structure if item.salary_assignment else None
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "employee_id": item.employee_id,
        "employee_name": _employee_display_name(item.employee),
        "employee_code": item.employee.employee_code,
        "pay_group_assignment_id": item.pay_group_assignment_id,
        "pay_group_name": item.pay_group_assignment.pay_group.name if item.pay_group_assignment else None,
        "salary_assignment_id": item.salary_assignment_id,
        "salary_structure_name": salary_structure.name if salary_structure else None,
        "salary_structure_version": item.salary_assignment.structure_version.version if item.salary_assignment else None,
        "snapshot_status": item.snapshot_status,
        "snapshot_status_label": item.get_snapshot_status_display(),
        "period_start": item.period_start,
        "period_end": item.period_end,
        "source_collected_at": item.source_collected_at,
        "locked_at": item.locked_at,
        "input_profile_ref": item.input_profile_ref,
        "employee_snapshot": item.employee_snapshot,
        "organization_snapshot": item.organization_snapshot,
        "salary_snapshot": item.salary_snapshot,
        "attendance_snapshot": item.attendance_snapshot,
        "leave_snapshot": item.leave_snapshot,
        "lifecycle_snapshot": item.lifecycle_snapshot,
        "document_snapshot": item.document_snapshot,
        "banking_snapshot": item.banking_snapshot,
        "validation_snapshot": item.validation_snapshot,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "blockers": _snapshot_issues(item, "blockers"),
        "warnings": _snapshot_issues(item, "warnings"),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_input_snapshot_setup_payload(actor) -> dict:
    tenant = actor.tenant
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by").order_by("-period__start_date", "name")
    snapshots = PayrollInputSnapshot.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "employee",
        "pay_group_assignment__pay_group",
        "salary_assignment__structure_version__structure",
    ).order_by("-payroll_run__created_at", "employee__employee_code")
    employees = Employee.objects.filter(tenant=tenant).order_by("employee_code")

    return {
        "summary": {
            "run_count": runs.count(),
            "collecting_run_count": runs.filter(status__in=[PayrollRunStatus.DRAFT, PayrollRunStatus.COLLECTING_INPUTS]).count(),
            "inputs_locked_run_count": runs.filter(status=PayrollRunStatus.INPUTS_LOCKED).count(),
            "snapshot_count": snapshots.count(),
            "locked_snapshot_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.LOCKED).count(),
            "blocked_snapshot_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.BLOCKED).count(),
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "snapshots": [build_hr_admin_payroll_input_snapshot_payload(item) for item in snapshots[:200]],
        "options": {
            "payroll_run_statuses": [{"value": value, "label": label} for value, label in PayrollRunStatus.choices],
            "payroll_input_snapshot_statuses": [{"value": value, "label": label} for value, label in PayrollInputSnapshotStatus.choices],
            "periods": [{"id": item.id, "name": item.name} for item in PayrollPeriod.objects.filter(tenant=tenant).order_by("-start_date")],
            "pay_groups": [{"id": item.id, "name": item.name} for item in PayGroup.objects.filter(tenant=tenant).order_by("name")],
            "employees": [{"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code} for item in employees],
        },
    }


def build_hr_admin_payroll_adjustment_payload(item: PayrollAdjustment) -> dict:
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": _employee_display_name(item.employee),
        "input_snapshot_id": item.input_snapshot_id,
        "salary_component_id": item.salary_component_id,
        "kind": item.kind,
        "kind_label": item.get_kind_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "direction": item.direction,
        "direction_label": item.get_direction_display(),
        "component_code": item.component_code,
        "component_name": item.component_name,
        "amount": item.amount,
        "currency_code": item.currency_code,
        "effective_date": item.effective_date,
        "source_period_start": item.source_period_start,
        "source_period_end": item.source_period_end,
        "adjustment_profile_ref": item.adjustment_profile_ref,
        "approval_profile_ref": item.approval_profile_ref,
        "source_ref": item.source_ref,
        "reason": item.reason,
        "submitted_at": item.submitted_at,
        "submitted_by_name": str(item.submitted_by) if item.submitted_by else None,
        "approved_at": item.approved_at,
        "approved_by_name": str(item.approved_by) if item.approved_by else None,
        "rejected_at": item.rejected_at,
        "rejected_by_name": str(item.rejected_by) if item.rejected_by else None,
        "applied_at": item.applied_at,
        "applied_by_name": str(item.applied_by) if item.applied_by else None,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_adjustment_setup_payload(actor) -> dict:
    tenant = actor.tenant
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by", "final_locked_by").order_by("-period__start_date", "name")
    snapshots = PayrollInputSnapshot.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "employee",
        "pay_group_assignment__pay_group",
        "salary_assignment__structure_version__structure",
    ).order_by("employee__employee_code")[:200]
    adjustments = PayrollAdjustment.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "payroll_run__period",
        "employee",
        "input_snapshot",
        "salary_component",
        "submitted_by",
        "approved_by",
        "rejected_by",
        "applied_by",
    ).order_by("-effective_date", "employee__employee_code")[:200]
    amount_total = sum((item.amount for item in adjustments), Decimal("0.00"))
    return {
        "summary": {
            "run_count": runs.count(),
            "adjustment_count": PayrollAdjustment.objects.filter(tenant=tenant).count(),
            "draft_count": PayrollAdjustment.objects.filter(tenant=tenant, status=PayrollAdjustmentStatus.DRAFT).count(),
            "submitted_count": PayrollAdjustment.objects.filter(tenant=tenant, status=PayrollAdjustmentStatus.SUBMITTED).count(),
            "approved_count": PayrollAdjustment.objects.filter(tenant=tenant, status=PayrollAdjustmentStatus.APPROVED).count(),
            "applied_count": PayrollAdjustment.objects.filter(tenant=tenant, status=PayrollAdjustmentStatus.APPLIED).count(),
            "total_amount": str(amount_total.quantize(Decimal("0.01"))),
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "snapshots": [build_hr_admin_payroll_input_snapshot_payload(item) for item in snapshots],
        "adjustments": [build_hr_admin_payroll_adjustment_payload(item) for item in adjustments],
        "options": {
            "adjustment_kinds": [{"value": value, "label": label} for value, label in PayrollAdjustmentKind.choices],
            "adjustment_statuses": [{"value": value, "label": label} for value, label in PayrollAdjustmentStatus.choices],
            "adjustment_directions": [{"value": value, "label": label} for value, label in PayrollAdjustmentDirection.choices],
            "salary_components": [
                {"id": item.id, "code": item.code, "name": item.name, "component_type": item.component_type}
                for item in SalaryComponent.objects.filter(tenant=tenant).order_by("component_type", "name")
            ],
            "employees": [
                {"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code}
                for item in Employee.objects.filter(tenant=tenant).order_by("employee_code")
            ],
        },
    }


def save_hr_admin_payroll_adjustment(actor, validated_data) -> PayrollAdjustment:
    payroll_run = PayrollRun.objects.filter(tenant=actor.tenant, id=validated_data["payroll_run_id"]).select_related("period__calendar").first()
    if not payroll_run:
        raise serializers.ValidationError({"payroll_run_id": "Invalid selection."})
    employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
    if not employee:
        raise serializers.ValidationError({"employee_id": "Invalid selection."})
    input_snapshot = None
    if validated_data.get("input_snapshot_id"):
        input_snapshot = PayrollInputSnapshot.objects.filter(tenant=actor.tenant, id=validated_data["input_snapshot_id"]).first()
        if not input_snapshot:
            raise serializers.ValidationError({"input_snapshot_id": "Invalid selection."})
    salary_component = None
    if validated_data.get("salary_component_id"):
        salary_component = SalaryComponent.objects.filter(tenant=actor.tenant, id=validated_data["salary_component_id"]).first()
        if not salary_component:
            raise serializers.ValidationError({"salary_component_id": "Invalid selection."})
    try:
        return create_payroll_adjustment(
            payroll_run,
            employee=employee,
            input_snapshot=input_snapshot,
            salary_component=salary_component,
            kind=validated_data["kind"],
            direction=validated_data["direction"],
            component_code=validated_data["component_code"],
            component_name=validated_data["component_name"],
            amount=validated_data["amount"],
            currency_code=validated_data.get("currency_code") or None,
            effective_date=validated_data["effective_date"],
            source_period_start=validated_data.get("source_period_start"),
            source_period_end=validated_data.get("source_period_end"),
            adjustment_profile_ref=validated_data.get("adjustment_profile_ref") or None,
            approval_profile_ref=validated_data.get("approval_profile_ref", ""),
            source_ref=validated_data.get("source_ref", ""),
            reason=validated_data.get("reason", ""),
            created_by=actor.membership.user if getattr(actor, "membership", None) else None,
            config_snapshot=validated_data.get("config_snapshot", {}),
        )
    except (DjangoValidationError, IntegrityError) as exc:
        raise serializers.ValidationError({"detail": "A payroll adjustment with this source reference and component already exists for this employee and run."}) from exc
    except PayrollAdjustmentError as exc:
        raise serializers.ValidationError({"detail": str(exc)}) from exc


class HrAdminPayrollAdjustmentSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollAdjustmentSetupSerializer(get_hr_admin_payroll_adjustment_setup_payload(employee)).data)


class HrAdminPayrollAdjustmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollAdjustment.objects.filter(tenant=employee.tenant).select_related("payroll_run", "employee", "input_snapshot", "salary_component")
        return response.Response(HrAdminPayrollAdjustmentSerializer([build_hr_admin_payroll_adjustment_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollAdjustmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_adjustment(employee, serializer.validated_data)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollAdjustmentSerializer(build_hr_admin_payroll_adjustment_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollAdjustmentActionView(HrAdminContextMixin, APIView):
    action = ""

    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollAdjustment.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "employee", "input_snapshot", "salary_component").first()
        if not item:
            return response.Response({"detail": "Payroll adjustment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollAdjustmentDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            if self.action == "submit":
                item = submit_payroll_adjustment(item, submitted_by=request.user)
            elif self.action == "approve":
                item = approve_payroll_adjustment(
                    item,
                    approved_by=request.user,
                    approval_profile_ref=serializer.validated_data.get("approval_profile_ref") or None,
                )
            elif self.action == "reject":
                item = reject_payroll_adjustment(item, rejected_by=request.user, reason=serializer.validated_data.get("reason", ""))
            elif self.action == "apply":
                item = apply_payroll_adjustment(item, applied_by=request.user)
            else:
                return response.Response({"detail": "Unsupported payroll adjustment action."}, status=status.HTTP_400_BAD_REQUEST)
        except PayrollAdjustmentError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollAdjustment.objects.select_related(
            "payroll_run",
            "employee",
            "input_snapshot",
            "salary_component",
            "submitted_by",
            "approved_by",
            "rejected_by",
            "applied_by",
        ).get(id=item.id)
        return response.Response(HrAdminPayrollAdjustmentSerializer(build_hr_admin_payroll_adjustment_payload(item)).data)


class HrAdminPayrollAdjustmentSubmitView(HrAdminPayrollAdjustmentActionView):
    action = "submit"


class HrAdminPayrollAdjustmentApproveView(HrAdminPayrollAdjustmentActionView):
    action = "approve"


class HrAdminPayrollAdjustmentRejectView(HrAdminPayrollAdjustmentActionView):
    action = "reject"


class HrAdminPayrollAdjustmentApplyView(HrAdminPayrollAdjustmentActionView):
    action = "apply"


def build_hr_admin_payroll_settlement_line_payload(item: PayrollSettlementLine) -> dict:
    return {
        "id": item.id,
        "settlement_id": item.settlement_id,
        "salary_component_id": item.salary_component_id,
        "line_kind": item.line_kind,
        "line_kind_label": item.get_line_kind_display(),
        "direction": item.direction,
        "direction_label": item.get_direction_display(),
        "component_code": item.component_code,
        "component_name": item.component_name,
        "amount": item.amount,
        "currency_code": item.currency_code,
        "calculation_order": item.calculation_order,
        "source_ref": item.source_ref,
        "source_hash": item.source_hash,
        "trace_snapshot": item.trace_snapshot,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_settlement_payload(item: PayrollSettlement) -> dict:
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": _employee_display_name(item.employee),
        "exit_record_id": item.exit_record_id,
        "input_snapshot_id": item.input_snapshot_id,
        "status": item.status,
        "status_label": item.get_status_display(),
        "settlement_profile_ref": item.settlement_profile_ref,
        "approval_profile_ref": item.approval_profile_ref,
        "calculation_profile_ref": item.calculation_profile_ref,
        "source_ref": item.source_ref,
        "reason": item.reason,
        "settlement_date": item.settlement_date,
        "last_working_date": item.last_working_date,
        "currency_code": item.currency_code,
        "totals_snapshot": item.totals_snapshot,
        "source_hash": item.source_hash,
        "config_snapshot": item.config_snapshot,
        "submitted_at": item.submitted_at,
        "submitted_by_name": str(item.submitted_by) if item.submitted_by else None,
        "approved_at": item.approved_at,
        "approved_by_name": str(item.approved_by) if item.approved_by else None,
        "rejected_at": item.rejected_at,
        "rejected_by_name": str(item.rejected_by) if item.rejected_by else None,
        "applied_at": item.applied_at,
        "applied_by_name": str(item.applied_by) if item.applied_by else None,
        "line_count": item.lines.count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_settlement_setup_payload(actor) -> dict:
    tenant = actor.tenant
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by", "final_locked_by").order_by("-period__start_date", "name")
    snapshots = PayrollInputSnapshot.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "employee",
        "pay_group_assignment__pay_group",
        "salary_assignment__structure_version__structure",
    ).order_by("employee__employee_code")[:200]
    settlements = PayrollSettlement.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "payroll_run__period",
        "employee",
        "exit_record",
        "input_snapshot",
        "submitted_by",
        "approved_by",
        "rejected_by",
        "applied_by",
    ).prefetch_related("lines").order_by("-settlement_date", "employee__employee_code")[:200]
    lines = PayrollSettlementLine.objects.filter(tenant=tenant).select_related("settlement", "salary_component").order_by("settlement__employee__employee_code", "calculation_order")[:400]
    return {
        "summary": {
            "run_count": runs.count(),
            "settlement_count": PayrollSettlement.objects.filter(tenant=tenant).count(),
            "draft_count": PayrollSettlement.objects.filter(tenant=tenant, status=PayrollSettlementStatus.DRAFT).count(),
            "submitted_count": PayrollSettlement.objects.filter(tenant=tenant, status=PayrollSettlementStatus.SUBMITTED).count(),
            "approved_count": PayrollSettlement.objects.filter(tenant=tenant, status=PayrollSettlementStatus.APPROVED).count(),
            "applied_count": PayrollSettlement.objects.filter(tenant=tenant, status=PayrollSettlementStatus.APPLIED).count(),
            "line_count": PayrollSettlementLine.objects.filter(tenant=tenant).count(),
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "snapshots": [build_hr_admin_payroll_input_snapshot_payload(item) for item in snapshots],
        "settlements": [build_hr_admin_payroll_settlement_payload(item) for item in settlements],
        "lines": [build_hr_admin_payroll_settlement_line_payload(item) for item in lines],
        "options": {
            "settlement_statuses": [{"value": value, "label": label} for value, label in PayrollSettlementStatus.choices],
            "settlement_line_kinds": [{"value": value, "label": label} for value, label in PayrollSettlementLineKind.choices],
            "settlement_directions": [{"value": value, "label": label} for value, label in PayrollAdjustmentDirection.choices],
            "salary_components": [
                {"id": item.id, "code": item.code, "name": item.name, "component_type": item.component_type}
                for item in SalaryComponent.objects.filter(tenant=tenant).order_by("component_type", "name")
            ],
            "employees": [
                {"id": item.id, "name": _employee_display_name(item), "employee_code": item.employee_code}
                for item in Employee.objects.filter(tenant=tenant).order_by("employee_code")
            ],
            "exit_records": [
                {
                    "id": item.id,
                    "employee_id": item.employee_id,
                    "employee_code": item.employee.employee_code,
                    "employee_name": _employee_display_name(item.employee),
                    "status": item.status,
                    "last_working_date": item.actual_exit_date or item.approved_last_working_date or item.proposed_last_working_date,
                }
                for item in EmployeeExit.objects.filter(tenant=tenant).select_related("employee").order_by("-updated_at")[:100]
            ],
        },
    }


def save_hr_admin_payroll_settlement(actor, validated_data) -> PayrollSettlement:
    payroll_run = PayrollRun.objects.filter(tenant=actor.tenant, id=validated_data["payroll_run_id"]).select_related("period__calendar").first()
    if not payroll_run:
        raise serializers.ValidationError({"payroll_run_id": "Invalid selection."})
    employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
    if not employee:
        raise serializers.ValidationError({"employee_id": "Invalid selection."})
    exit_record = None
    if validated_data.get("exit_record_id"):
        exit_record = EmployeeExit.objects.filter(tenant=actor.tenant, id=validated_data["exit_record_id"]).first()
        if not exit_record:
            raise serializers.ValidationError({"exit_record_id": "Invalid selection."})
    input_snapshot = None
    if validated_data.get("input_snapshot_id"):
        input_snapshot = PayrollInputSnapshot.objects.filter(tenant=actor.tenant, id=validated_data["input_snapshot_id"]).first()
        if not input_snapshot:
            raise serializers.ValidationError({"input_snapshot_id": "Invalid selection."})
    try:
        return create_payroll_settlement(
            payroll_run,
            employee=employee,
            exit_record=exit_record,
            input_snapshot=input_snapshot,
            settlement_date=validated_data["settlement_date"],
            last_working_date=validated_data.get("last_working_date"),
            currency_code=validated_data.get("currency_code", ""),
            settlement_profile_ref=validated_data.get("settlement_profile_ref") or None,
            approval_profile_ref=validated_data.get("approval_profile_ref", ""),
            calculation_profile_ref=validated_data.get("calculation_profile_ref", ""),
            source_ref=validated_data.get("source_ref", ""),
            reason=validated_data.get("reason", ""),
            created_by=actor.membership.user if getattr(actor, "membership", None) else None,
            config_snapshot=validated_data.get("config_snapshot", {}),
        )
    except (DjangoValidationError, IntegrityError) as exc:
        raise serializers.ValidationError({"detail": "A payroll settlement with this source reference already exists for this employee and run."}) from exc
    except PayrollSettlementError as exc:
        raise serializers.ValidationError({"detail": str(exc)}) from exc


def save_hr_admin_payroll_settlement_line(actor, settlement: PayrollSettlement, validated_data) -> PayrollSettlementLine:
    salary_component = None
    if validated_data.get("salary_component_id"):
        salary_component = SalaryComponent.objects.filter(tenant=actor.tenant, id=validated_data["salary_component_id"]).first()
        if not salary_component:
            raise serializers.ValidationError({"salary_component_id": "Invalid selection."})
    try:
        return create_payroll_settlement_line(
            settlement,
            salary_component=salary_component,
            line_kind=validated_data["line_kind"],
            direction=validated_data["direction"],
            component_code=validated_data["component_code"],
            component_name=validated_data["component_name"],
            amount=validated_data["amount"],
            currency_code=validated_data.get("currency_code", ""),
            calculation_order=validated_data.get("calculation_order", 900),
            source_ref=validated_data.get("source_ref", ""),
            trace_snapshot=validated_data.get("trace_snapshot", {}),
            config_snapshot=validated_data.get("config_snapshot", {}),
        )
    except (DjangoValidationError, IntegrityError) as exc:
        raise serializers.ValidationError({"detail": "A payroll settlement line with this source reference and component already exists."}) from exc
    except PayrollSettlementError as exc:
        raise serializers.ValidationError({"detail": str(exc)}) from exc


class HrAdminPayrollSettlementSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollSettlementSetupSerializer(get_hr_admin_payroll_settlement_setup_payload(employee)).data)


class HrAdminPayrollSettlementListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollSettlement.objects.filter(tenant=employee.tenant).select_related("payroll_run", "employee", "exit_record", "input_snapshot").prefetch_related("lines")
        return response.Response(HrAdminPayrollSettlementSerializer([build_hr_admin_payroll_settlement_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollSettlementWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_settlement(employee, serializer.validated_data)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollSettlementSerializer(build_hr_admin_payroll_settlement_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollSettlementLineListCreateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        settlement = PayrollSettlement.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "employee", "input_snapshot").first()
        if not settlement:
            return response.Response({"detail": "Payroll settlement not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollSettlementLineWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            line = save_hr_admin_payroll_settlement_line(employee, settlement, serializer.validated_data)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollSettlementLineSerializer(build_hr_admin_payroll_settlement_line_payload(line)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollSettlementActionView(HrAdminContextMixin, APIView):
    action = ""

    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollSettlement.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "employee", "input_snapshot").prefetch_related("lines").first()
        if not item:
            return response.Response({"detail": "Payroll settlement not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollSettlementDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            if self.action == "submit":
                item = submit_payroll_settlement(item, submitted_by=request.user)
            elif self.action == "approve":
                item = approve_payroll_settlement(
                    item,
                    approved_by=request.user,
                    approval_profile_ref=serializer.validated_data.get("approval_profile_ref") or None,
                )
            elif self.action == "reject":
                item = reject_payroll_settlement(item, rejected_by=request.user, reason=serializer.validated_data.get("reason", ""))
            elif self.action == "apply":
                item = apply_payroll_settlement(item, applied_by=request.user)
            else:
                return response.Response({"detail": "Unsupported payroll settlement action."}, status=status.HTTP_400_BAD_REQUEST)
        except PayrollSettlementError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollSettlement.objects.select_related(
            "payroll_run",
            "employee",
            "exit_record",
            "input_snapshot",
            "submitted_by",
            "approved_by",
            "rejected_by",
            "applied_by",
        ).prefetch_related("lines").get(id=item.id)
        return response.Response(HrAdminPayrollSettlementSerializer(build_hr_admin_payroll_settlement_payload(item)).data)


class HrAdminPayrollSettlementSubmitView(HrAdminPayrollSettlementActionView):
    action = "submit"


class HrAdminPayrollSettlementApproveView(HrAdminPayrollSettlementActionView):
    action = "approve"


class HrAdminPayrollSettlementRejectView(HrAdminPayrollSettlementActionView):
    action = "reject"


class HrAdminPayrollSettlementApplyView(HrAdminPayrollSettlementActionView):
    action = "apply"


def save_hr_admin_payroll_run(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollRun(tenant=actor.tenant)
    elif item.status == PayrollRunStatus.LOCKED:
        raise serializers.ValidationError({"detail": "Final locked payroll runs cannot be edited."})
    if "period_id" in validated_data:
        period = PayrollPeriod.objects.filter(tenant=actor.tenant, id=validated_data["period_id"]).first()
        if not period:
            raise serializers.ValidationError({"period_id": "Invalid selection."})
        item.period = period
        item.tenant = actor.tenant
    if "pay_group_id" in validated_data:
        pay_group = PayGroup.objects.filter(tenant=actor.tenant, id=validated_data["pay_group_id"]).first() if validated_data["pay_group_id"] else None
        if validated_data["pay_group_id"] and not pay_group:
            raise serializers.ValidationError({"pay_group_id": "Invalid selection."})
        item.pay_group = pay_group
    for field in ["code", "name", "status", "input_profile_ref", "snapshot_schema_ref", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.period_id is None:
        raise serializers.ValidationError({"period_id": "This field is required."})
    item.save()
    return item


def save_hr_admin_payroll_input_snapshot(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollInputSnapshot(tenant=actor.tenant)
    elif item.snapshot_status == PayrollInputSnapshotStatus.LOCKED:
        raise serializers.ValidationError({"detail": "Locked payroll input snapshots cannot be edited."})
    if "payroll_run_id" in validated_data:
        payroll_run = PayrollRun.objects.filter(tenant=actor.tenant, id=validated_data["payroll_run_id"]).select_related("period").first()
        if not payroll_run:
            raise serializers.ValidationError({"payroll_run_id": "Invalid selection."})
        item.payroll_run = payroll_run
        item.tenant = actor.tenant
    if "employee_id" in validated_data:
        target_employee = Employee.objects.filter(tenant=actor.tenant, id=validated_data["employee_id"]).first()
        if not target_employee:
            raise serializers.ValidationError({"employee_id": "Invalid selection."})
        item.employee = target_employee
    if "pay_group_assignment_id" in validated_data:
        pay_group_assignment = PayGroupAssignment.objects.filter(tenant=actor.tenant, id=validated_data["pay_group_assignment_id"]).first() if validated_data["pay_group_assignment_id"] else None
        if validated_data["pay_group_assignment_id"] and not pay_group_assignment:
            raise serializers.ValidationError({"pay_group_assignment_id": "Invalid selection."})
        item.pay_group_assignment = pay_group_assignment
    if "salary_assignment_id" in validated_data:
        salary_assignment = EmployeeSalaryAssignment.objects.filter(tenant=actor.tenant, id=validated_data["salary_assignment_id"]).first() if validated_data["salary_assignment_id"] else None
        if validated_data["salary_assignment_id"] and not salary_assignment:
            raise serializers.ValidationError({"salary_assignment_id": "Invalid selection."})
        item.salary_assignment = salary_assignment
    for field in [
        "snapshot_status",
        "input_profile_ref",
        "employee_snapshot",
        "organization_snapshot",
        "salary_snapshot",
        "attendance_snapshot",
        "leave_snapshot",
        "lifecycle_snapshot",
        "document_snapshot",
        "banking_snapshot",
        "validation_snapshot",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.payroll_run_id is None:
        raise serializers.ValidationError({"payroll_run_id": "This field is required."})
    if item.employee_id is None:
        raise serializers.ValidationError({"employee_id": "This field is required."})
    item.save()
    return item


class HrAdminPayrollInputSnapshotSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollInputSnapshotSetupSerializer(get_hr_admin_payroll_input_snapshot_setup_payload(employee)).data)


class HrAdminPayrollRunListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollRun.objects.filter(tenant=employee.tenant).select_related("period", "pay_group", "locked_by").order_by("-period__start_date", "name")
        return response.Response(HrAdminPayrollRunSerializer([build_hr_admin_payroll_run_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRunWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_run(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollRun.objects.select_related("period", "pay_group", "locked_by").get(id=item.id)
        return response.Response(HrAdminPayrollRunSerializer(build_hr_admin_payroll_run_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollRunDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRun.objects.filter(tenant=employee.tenant, id=item_id).select_related("period", "pay_group", "locked_by").first()
        if not item:
            return response.Response({"detail": "Payroll run not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollRunSerializer(build_hr_admin_payroll_run_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRun.objects.filter(tenant=employee.tenant, id=item_id).select_related("period", "pay_group").first()
        if not item:
            return response.Response({"detail": "Payroll run not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRunWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_run(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollRun.objects.select_related("period", "pay_group", "locked_by").get(id=item.id)
        return response.Response(HrAdminPayrollRunSerializer(build_hr_admin_payroll_run_payload(item)).data)


class HrAdminPayrollRunLockInputsView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payroll_run = PayrollRun.objects.filter(tenant=employee.tenant, id=item_id).select_related("period", "pay_group", "locked_by").first()
        if not payroll_run:
            return response.Response({"detail": "Payroll run not found."}, status=status.HTTP_404_NOT_FOUND)

        snapshots = PayrollInputSnapshot.objects.filter(tenant=employee.tenant, payroll_run=payroll_run)
        blocked_count = snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.BLOCKED).count()
        if blocked_count:
            payload = {
                "detail": "Cannot lock payroll inputs while blocked snapshots exist.",
                "blocked_count": blocked_count,
            }
            return response.Response(payload, status=status.HTTP_400_BAD_REQUEST)
        if not snapshots.exists():
            return response.Response({"detail": "Cannot lock payroll inputs before snapshots are collected."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            lock_time = timezone.now()
            lockable = snapshots.exclude(snapshot_status=PayrollInputSnapshotStatus.LOCKED)
            locked_count = 0
            for snapshot in lockable:
                snapshot.snapshot_status = PayrollInputSnapshotStatus.LOCKED
                snapshot.locked_at = lock_time
                snapshot.save()
                locked_count += 1
            payroll_run.status = PayrollRunStatus.INPUTS_LOCKED
            payroll_run.locked_at = lock_time
            payroll_run.locked_by = request.user
            payroll_run.save()

        payroll_run = PayrollRun.objects.select_related("period", "pay_group", "locked_by").get(id=payroll_run.id)
        result = {
            "payroll_run": build_hr_admin_payroll_run_payload(payroll_run),
            "locked_count": locked_count,
            "blocked_count": blocked_count,
            "skipped_count": snapshots.filter(snapshot_status=PayrollInputSnapshotStatus.LOCKED).count() - locked_count,
            "detail": "Payroll input snapshots locked for calculation.",
        }
        return response.Response(HrAdminPayrollInputLockResultSerializer(result).data)


class HrAdminPayrollInputSnapshotListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollInputSnapshot.objects.filter(tenant=employee.tenant).select_related(
            "payroll_run",
            "employee",
            "pay_group_assignment__pay_group",
            "salary_assignment__structure_version__structure",
        ).order_by("employee__employee_code")
        payroll_run_id = request.query_params.get("payroll_run_id")
        if payroll_run_id:
            items = items.filter(payroll_run_id=payroll_run_id)
        return response.Response(HrAdminPayrollInputSnapshotSerializer([build_hr_admin_payroll_input_snapshot_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollInputSnapshotWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_input_snapshot(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollInputSnapshot.objects.select_related(
            "payroll_run",
            "employee",
            "pay_group_assignment__pay_group",
            "salary_assignment__structure_version__structure",
        ).get(id=item.id)
        return response.Response(HrAdminPayrollInputSnapshotSerializer(build_hr_admin_payroll_input_snapshot_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollInputSnapshotDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollInputSnapshot.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "payroll_run",
            "employee",
            "pay_group_assignment__pay_group",
            "salary_assignment__structure_version__structure",
        ).first()
        if not item:
            return response.Response({"detail": "Payroll input snapshot not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollInputSnapshotSerializer(build_hr_admin_payroll_input_snapshot_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollInputSnapshot.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run__period").first()
        if not item:
            return response.Response({"detail": "Payroll input snapshot not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollInputSnapshotWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_input_snapshot(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollInputSnapshot.objects.select_related(
            "payroll_run",
            "employee",
            "pay_group_assignment__pay_group",
            "salary_assignment__structure_version__structure",
        ).get(id=item.id)
        return response.Response(HrAdminPayrollInputSnapshotSerializer(build_hr_admin_payroll_input_snapshot_payload(item)).data)


def build_hr_admin_payroll_rule_definition_payload(item: PayrollRuleDefinition) -> dict:
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "rule_type": item.rule_type,
        "rule_type_label": item.get_rule_type_display(),
        "description": item.description,
        "tags": item.tags,
        "config_snapshot": item.config_snapshot,
        "version_count": item.versions.count(),
        "active_version_count": item.versions.filter(status=PayrollRuleVersionStatus.ACTIVE).count(),
        "evaluation_count": PayrollRuleEvaluation.objects.filter(rule_version__rule=item).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_rule_version_payload(item: PayrollRuleVersion) -> dict:
    return {
        "id": item.id,
        "rule_id": item.rule_id,
        "rule_code": item.rule.code,
        "rule_name": item.rule.name,
        "rule_type": item.rule.rule_type,
        "version": item.version,
        "status": item.status,
        "status_label": item.get_status_display(),
        "expression_language": item.expression_language,
        "expression_language_label": item.get_expression_language_display(),
        "expression": item.expression,
        "effective_from": item.effective_from,
        "effective_to": item.effective_to,
        "input_schema": item.input_schema,
        "output_schema": item.output_schema,
        "rounding_rule_ref": item.rounding_rule_ref,
        "config_snapshot": item.config_snapshot,
        "evaluation_count": item.evaluations.count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_rule_evaluation_payload(item: PayrollRuleEvaluation) -> dict:
    input_snapshot = item.input_snapshot
    return {
        "id": item.id,
        "rule_version_id": item.rule_version_id,
        "rule_code": item.rule_version.rule.code,
        "rule_name": item.rule_version.rule.name,
        "rule_type": item.rule_version.rule.rule_type,
        "input_snapshot_id": item.input_snapshot_id,
        "employee_code": input_snapshot.employee.employee_code if input_snapshot else None,
        "employee_name": _employee_display_name(input_snapshot.employee) if input_snapshot else None,
        "expression": item.expression,
        "context_snapshot": item.context_snapshot,
        "result_snapshot": item.result_snapshot,
        "trace_snapshot": item.trace_snapshot,
        "evaluated_by_name": str(item.evaluated_by) if item.evaluated_by else None,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_rules_setup_payload(actor) -> dict:
    tenant = actor.tenant
    rules = PayrollRuleDefinition.objects.filter(tenant=tenant).order_by("rule_type", "name")
    versions = PayrollRuleVersion.objects.filter(tenant=tenant).select_related("rule").order_by("rule__code", "-version")
    evaluations = PayrollRuleEvaluation.objects.filter(tenant=tenant).select_related(
        "rule_version__rule",
        "input_snapshot__employee",
        "evaluated_by",
    ).order_by("-created_at")[:25]
    input_snapshots = PayrollInputSnapshot.objects.filter(
        tenant=tenant,
        snapshot_status=PayrollInputSnapshotStatus.LOCKED,
    ).select_related("employee", "payroll_run").order_by("-payroll_run__period__start_date", "employee__employee_code")[:50]

    return {
        "summary": {
            "rule_count": rules.count(),
            "active_version_count": versions.filter(status=PayrollRuleVersionStatus.ACTIVE).count(),
            "draft_version_count": versions.filter(status=PayrollRuleVersionStatus.DRAFT).count(),
            "formula_rule_count": rules.filter(rule_type=PayrollRuleType.FORMULA).count(),
            "evaluation_count": PayrollRuleEvaluation.objects.filter(tenant=tenant).count(),
            "locked_snapshot_count": PayrollInputSnapshot.objects.filter(tenant=tenant, snapshot_status=PayrollInputSnapshotStatus.LOCKED).count(),
        },
        "rules": [build_hr_admin_payroll_rule_definition_payload(item) for item in rules],
        "versions": [build_hr_admin_payroll_rule_version_payload(item) for item in versions],
        "evaluations": [build_hr_admin_payroll_rule_evaluation_payload(item) for item in evaluations],
        "options": {
            "rule_types": [{"value": value, "label": label} for value, label in PayrollRuleType.choices],
            "rule_version_statuses": [{"value": value, "label": label} for value, label in PayrollRuleVersionStatus.choices],
            "expression_languages": [{"value": value, "label": label} for value, label in PayrollExpressionLanguage.choices],
            "input_snapshots": [
                {
                    "id": item.id,
                    "employee_code": item.employee.employee_code,
                    "employee_name": _employee_display_name(item.employee),
                    "payroll_run_name": item.payroll_run.name,
                    "source_hash": item.source_hash,
                }
                for item in input_snapshots
            ],
        },
    }


def save_hr_admin_payroll_rule_definition(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollRuleDefinition(tenant=actor.tenant)
    for field in ["code", "name", "rule_type", "description", "tags", "config_snapshot"]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    item.save()
    return item


def save_hr_admin_payroll_rule_version(actor, validated_data, *, item=None):
    if item is None:
        item = PayrollRuleVersion(tenant=actor.tenant)
    if "rule_id" in validated_data:
        rule = PayrollRuleDefinition.objects.filter(tenant=actor.tenant, id=validated_data["rule_id"]).first()
        if not rule:
            raise serializers.ValidationError({"rule_id": "Invalid selection."})
        item.rule = rule
        item.tenant = actor.tenant
    for field in [
        "version",
        "status",
        "expression_language",
        "expression",
        "effective_from",
        "effective_to",
        "input_schema",
        "output_schema",
        "rounding_rule_ref",
        "config_snapshot",
    ]:
        if field in validated_data:
            setattr(item, field, validated_data[field])
    if item.rule_id is None:
        raise serializers.ValidationError({"rule_id": "This field is required."})
    item.save()
    return item


class HrAdminPayrollRulesSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollRulesSetupSerializer(get_hr_admin_payroll_rules_setup_payload(employee)).data)


class HrAdminPayrollRuleDefinitionListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollRuleDefinition.objects.filter(tenant=employee.tenant).order_by("rule_type", "name")
        return response.Response(HrAdminPayrollRuleDefinitionSerializer([build_hr_admin_payroll_rule_definition_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRuleDefinitionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_rule_definition(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollRuleDefinitionSerializer(build_hr_admin_payroll_rule_definition_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollRuleDefinitionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRuleDefinition.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll rule definition not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollRuleDefinitionSerializer(build_hr_admin_payroll_rule_definition_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRuleDefinition.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll rule definition not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRuleDefinitionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_rule_definition(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollRuleDefinitionSerializer(build_hr_admin_payroll_rule_definition_payload(item)).data)


class HrAdminPayrollRuleVersionListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollRuleVersion.objects.filter(tenant=employee.tenant).select_related("rule").order_by("rule__code", "-version")
        return response.Response(HrAdminPayrollRuleVersionSerializer([build_hr_admin_payroll_rule_version_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRuleVersionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_rule_version(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollRuleVersion.objects.select_related("rule").get(id=item.id)
        return response.Response(HrAdminPayrollRuleVersionSerializer(build_hr_admin_payroll_rule_version_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollRuleVersionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRuleVersion.objects.filter(tenant=employee.tenant, id=item_id).select_related("rule").first()
        if not item:
            return response.Response({"detail": "Payroll rule version not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollRuleVersionSerializer(build_hr_admin_payroll_rule_version_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollRuleVersion.objects.filter(tenant=employee.tenant, id=item_id).select_related("rule").first()
        if not item:
            return response.Response({"detail": "Payroll rule version not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRuleVersionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_rule_version(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        item = PayrollRuleVersion.objects.select_related("rule").get(id=item.id)
        return response.Response(HrAdminPayrollRuleVersionSerializer(build_hr_admin_payroll_rule_version_payload(item)).data)


class HrAdminPayrollRuleVersionEvaluateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        rule_version = PayrollRuleVersion.objects.filter(tenant=employee.tenant, id=item_id).select_related("rule").first()
        if not rule_version:
            return response.Response({"detail": "Payroll rule version not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollRuleEvaluateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_snapshot = None
        context = serializer.validated_data.get("context")
        if serializer.validated_data.get("input_snapshot_id"):
            input_snapshot = PayrollInputSnapshot.objects.filter(
                tenant=employee.tenant,
                id=serializer.validated_data["input_snapshot_id"],
                snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            ).select_related("employee", "payroll_run").first()
            if not input_snapshot:
                return response.Response({"input_snapshot_id": "Select a locked payroll input snapshot."}, status=status.HTTP_400_BAD_REQUEST)
            context = build_payroll_rule_context_from_snapshot(input_snapshot)

        try:
            evaluation_result = evaluate_payroll_rule_version(rule_version, context=context)
        except PayrollRuleEvaluationError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        evaluation_payload = None
        if serializer.validated_data.get("persist", True):
            evaluation = PayrollRuleEvaluation.objects.create(
                tenant=employee.tenant,
                rule_version=rule_version,
                input_snapshot=input_snapshot,
                expression=rule_version.expression,
                context_snapshot=context or {},
                result_snapshot={"result": evaluation_result.as_payload()["result"]},
                trace_snapshot={
                    "dependencies": evaluation_result.dependencies,
                    "trace": evaluation_result.as_payload()["trace"],
                    "source_hash": input_snapshot.source_hash if input_snapshot else "",
                },
                evaluated_by=request.user,
            )
            evaluation_payload = build_hr_admin_payroll_rule_evaluation_payload(evaluation)

        payload = {
            "result": evaluation_result.as_payload()["result"],
            "dependencies": evaluation_result.dependencies,
            "trace": evaluation_result.as_payload()["trace"],
            "evaluation": evaluation_payload,
        }
        return response.Response(HrAdminPayrollRuleEvaluateResponseSerializer(payload).data)


def build_hr_admin_payroll_calculation_payload(item: PayrollRunCalculation) -> dict:
    lines = item.lines.all()
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "payroll_run_status": item.payroll_run.status,
        "period_name": item.payroll_run.period.name,
        "pay_group_name": item.payroll_run.pay_group.name if item.payroll_run.pay_group else None,
        "attempt_number": item.attempt_number,
        "status": item.status,
        "status_label": item.get_status_display(),
        "calculation_profile_ref": item.calculation_profile_ref,
        "calculated_at": item.calculated_at,
        "calculated_by_name": str(item.calculated_by) if item.calculated_by else None,
        "rule_selection_snapshot": item.rule_selection_snapshot,
        "totals_snapshot": item.totals_snapshot,
        "error_snapshot": item.error_snapshot,
        "config_snapshot": item.config_snapshot,
        "line_count": lines.count(),
        "error_line_count": lines.filter(status=PayrollCalculationLineStatus.ERROR).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_calculation_line_payload(item: PayrollCalculationLine) -> dict:
    rule_version = item.rule_version
    return {
        "id": item.id,
        "calculation_id": item.calculation_id,
        "payroll_run_id": item.payroll_run_id,
        "input_snapshot_id": item.input_snapshot_id,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": _employee_display_name(item.employee),
        "rule_version_id": item.rule_version_id,
        "rule_code": rule_version.rule.code if rule_version else "",
        "rule_name": rule_version.rule.name if rule_version else "",
        "rule_version": rule_version.version if rule_version else None,
        "adjustment_id": item.adjustment_id,
        "line_source": item.line_source,
        "line_source_label": item.get_line_source_display(),
        "component_code": item.component_code,
        "component_name": item.component_name,
        "line_type": item.line_type,
        "calculation_order": item.calculation_order,
        "amount": item.amount,
        "currency_code": item.currency_code,
        "status": item.status,
        "status_label": item.get_status_display(),
        "expression": item.expression,
        "source_hash": item.source_hash,
        "context_snapshot": item.context_snapshot,
        "result_snapshot": item.result_snapshot,
        "trace_snapshot": item.trace_snapshot,
        "error_message": item.error_message,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_validation_issue_payload(item: PayrollValidationIssue) -> dict:
    employee = item.employee
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "calculation_id": item.calculation_id,
        "input_snapshot_id": item.input_snapshot_id,
        "employee_id": item.employee_id,
        "employee_code": employee.employee_code if employee else "",
        "employee_name": _employee_display_name(employee) if employee else "",
        "calculation_line_id": item.calculation_line_id,
        "severity": item.severity,
        "severity_label": item.get_severity_display(),
        "category": item.category,
        "category_label": item.get_category_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "issue_code": item.issue_code,
        "title": item.title,
        "detail": item.detail,
        "source_ref": item.source_ref,
        "validation_profile_ref": item.validation_profile_ref,
        "source_hash": item.source_hash,
        "context_snapshot": item.context_snapshot,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_payroll_calculation_setup_payload(actor, request=None) -> dict:
    tenant = actor.tenant
    selected_run_id = (request.query_params.get("run_id") or "").strip() if request else ""
    selected_calculation_id = (request.query_params.get("calculation_id") or "").strip() if request else ""
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by").order_by("-period__start_date", "name")
    calculations = PayrollRunCalculation.objects.filter(tenant=tenant).select_related(
        "payroll_run__period",
        "payroll_run__pay_group",
        "calculated_by",
    ).order_by("-created_at")
    latest_calculation = calculations.first()
    lines = PayrollCalculationLine.objects.filter(tenant=tenant).select_related(
        "calculation",
        "employee",
        "input_snapshot",
        "payroll_run",
        "rule_version__rule",
        "adjustment",
    ).order_by("-calculation__created_at", "employee__employee_code", "calculation_order", "component_code")
    selected_calculation = None
    if selected_calculation_id:
        selected_calculation = calculations.filter(id=selected_calculation_id).first()
    if not selected_calculation and selected_run_id:
        selected_calculation = calculations.filter(payroll_run_id=selected_run_id).first()
    if not selected_calculation:
        selected_calculation = latest_calculation
    if selected_calculation:
        lines = lines.filter(calculation=selected_calculation)
    active_versions = PayrollRuleVersion.objects.filter(
        tenant=tenant,
        status=PayrollRuleVersionStatus.ACTIVE,
    ).select_related("rule").order_by("rule__code", "-version")
    validation_issues = PayrollValidationIssue.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "employee",
        "input_snapshot",
        "calculation",
        "calculation_line",
    ).order_by("-created_at", "severity", "category", "issue_code")

    return {
        "summary": {
            "run_count": runs.count(),
            "calculable_run_count": runs.filter(status__in=[PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED]).count(),
            "calculation_count": calculations.count(),
            "completed_calculation_count": calculations.filter(status=PayrollCalculationStatus.COMPLETED).count(),
            "failed_calculation_count": calculations.filter(status=PayrollCalculationStatus.FAILED).count(),
            "line_count": PayrollCalculationLine.objects.filter(tenant=tenant).count(),
            "error_line_count": PayrollCalculationLine.objects.filter(tenant=tenant, status=PayrollCalculationLineStatus.ERROR).count(),
            "validation_issue_count": validation_issues.count(),
            "open_validation_issue_count": validation_issues.filter(status=PayrollValidationIssueStatus.OPEN).count(),
            "validation_warning_count": validation_issues.filter(severity=PayrollValidationSeverity.WARNING).count(),
            "validation_blocker_count": validation_issues.filter(severity=PayrollValidationSeverity.BLOCKER).count(),
            "latest_net_pay": latest_calculation.totals_snapshot.get("net_pay") if latest_calculation else "0.00",
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "calculations": [build_hr_admin_payroll_calculation_payload(item) for item in calculations[:50]],
        "lines": [build_hr_admin_payroll_calculation_line_payload(item) for item in lines[:500]],
        "validation_issues": [build_hr_admin_payroll_validation_issue_payload(item) for item in validation_issues[:200]],
        "options": {
            "payroll_run_statuses": [{"value": value, "label": label} for value, label in PayrollRunStatus.choices],
            "calculation_statuses": [{"value": value, "label": label} for value, label in PayrollCalculationStatus.choices],
            "line_statuses": [{"value": value, "label": label} for value, label in PayrollCalculationLineStatus.choices],
            "line_sources": [{"value": value, "label": label} for value, label in PayrollCalculationLineSource.choices],
            "validation_severities": [{"value": value, "label": label} for value, label in PayrollValidationSeverity.choices],
            "validation_categories": [{"value": value, "label": label} for value, label in PayrollValidationCategory.choices],
            "validation_statuses": [{"value": value, "label": label} for value, label in PayrollValidationIssueStatus.choices],
            "active_rule_versions": [
                {
                    "id": item.id,
                    "rule_code": item.rule.code,
                    "rule_name": item.rule.name,
                    "rule_type": item.rule.rule_type,
                    "version": item.version,
                    "effective_from": item.effective_from.isoformat(),
                    "effective_to": item.effective_to.isoformat() if item.effective_to else None,
                    "calculation_order": item.config_snapshot.get("calculation_order") if isinstance(item.config_snapshot, dict) else None,
                }
                for item in active_versions[:100]
            ],
        },
    }


class HrAdminPayrollCalculationSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollCalculationSetupSerializer(get_hr_admin_payroll_calculation_setup_payload(employee, request)).data)


class HrAdminPayrollRunDraftCalculateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payroll_run = PayrollRun.objects.filter(tenant=employee.tenant, id=item_id).select_related("period__calendar", "pay_group").first()
        if not payroll_run:
            return response.Response({"detail": "Payroll run not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollDraftCalculateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            calculation = calculate_draft_payroll_run(
                payroll_run,
                calculated_by=request.user,
                calculation_profile_ref=serializer.validated_data.get("calculation_profile_ref") or None,
            )
        except PayrollCalculationError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        calculation = PayrollRunCalculation.objects.select_related(
            "payroll_run__period",
            "payroll_run__pay_group",
            "calculated_by",
        ).get(id=calculation.id)
        lines = PayrollCalculationLine.objects.filter(calculation=calculation).select_related(
            "employee",
            "input_snapshot",
            "payroll_run",
            "rule_version__rule",
            "adjustment",
        ).order_by("employee__employee_code", "calculation_order", "component_code")
        payload = {
            "calculation": build_hr_admin_payroll_calculation_payload(calculation),
            "lines": [build_hr_admin_payroll_calculation_line_payload(item) for item in lines],
            "detail": "Draft payroll calculation completed." if calculation.status == PayrollCalculationStatus.COMPLETED else "Draft payroll calculation completed with errors.",
        }
        return response.Response(HrAdminPayrollDraftCalculateResultSerializer(payload).data)


def build_hr_admin_payroll_review_payload(item: PayrollRunReview) -> dict:
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "payroll_run_status": item.payroll_run.status,
        "calculation_id": item.calculation_id,
        "calculation_attempt_number": item.calculation.attempt_number,
        "status": item.status,
        "status_label": item.get_status_display(),
        "review_profile_ref": item.review_profile_ref,
        "opened_at": item.opened_at,
        "opened_by_name": str(item.opened_by) if item.opened_by else None,
        "submitted_at": item.submitted_at,
        "submitted_by_name": str(item.submitted_by) if item.submitted_by else None,
        "approved_at": item.approved_at,
        "approved_by_name": str(item.approved_by) if item.approved_by else None,
        "locked_at": item.locked_at,
        "locked_by_name": str(item.locked_by) if item.locked_by else None,
        "totals_snapshot": item.totals_snapshot,
        "exception_summary_snapshot": item.exception_summary_snapshot,
        "approval_snapshot": item.approval_snapshot,
        "config_snapshot": item.config_snapshot,
        "exception_count": item.exceptions.count(),
        "approval_count": item.approvals.count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_exception_payload(item: PayrollRunException) -> dict:
    employee = item.employee
    line = item.calculation_line
    return {
        "id": item.id,
        "review_id": item.review_id,
        "payroll_run_id": item.payroll_run_id,
        "calculation_line_id": item.calculation_line_id,
        "input_snapshot_id": item.input_snapshot_id,
        "employee_id": item.employee_id,
        "employee_code": employee.employee_code if employee else None,
        "employee_name": _employee_display_name(employee) if employee else None,
        "component_code": line.component_code if line else None,
        "category": item.category,
        "severity": item.severity,
        "severity_label": item.get_severity_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "title": item.title,
        "detail": item.detail,
        "decision_reason": item.decision_reason,
        "decided_at": item.decided_at,
        "decided_by_name": str(item.decided_by) if item.decided_by else None,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_approval_payload(item: PayrollRunApproval) -> dict:
    return {
        "id": item.id,
        "review_id": item.review_id,
        "payroll_run_id": item.payroll_run_id,
        "approver_name": str(item.approver) if item.approver else None,
        "status": item.status,
        "status_label": item.get_status_display(),
        "comment": item.comment,
        "decided_at": item.decided_at,
        "approval_profile_ref": item.approval_profile_ref,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_review_action_payload(review: PayrollRunReview, detail: str) -> dict:
    exceptions = PayrollRunException.objects.filter(review=review).select_related(
        "employee",
        "input_snapshot",
        "calculation_line",
        "decided_by",
    )
    approvals = PayrollRunApproval.objects.filter(review=review).select_related("approver")
    return {
        "review": build_hr_admin_payroll_review_payload(review),
        "exceptions": [build_hr_admin_payroll_exception_payload(item) for item in exceptions],
        "approvals": [build_hr_admin_payroll_approval_payload(item) for item in approvals],
        "detail": detail,
    }


def get_hr_admin_payroll_review_setup_payload(actor, request=None) -> dict:
    tenant = actor.tenant
    selected_review_id = (request.query_params.get("review_id") or "").strip() if request else ""
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by", "final_locked_by").order_by("-period__start_date", "name")
    calculations = PayrollRunCalculation.objects.filter(tenant=tenant).select_related(
        "payroll_run__period",
        "payroll_run__pay_group",
        "calculated_by",
    ).order_by("-created_at")
    reviews = PayrollRunReview.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "payroll_run__period",
        "payroll_run__pay_group",
        "calculation",
        "opened_by",
        "submitted_by",
        "approved_by",
        "locked_by",
    ).order_by("-created_at")
    selected_review = reviews.filter(id=selected_review_id).first() if selected_review_id else reviews.first()
    exceptions = PayrollRunException.objects.filter(tenant=tenant).select_related(
        "review",
        "employee",
        "input_snapshot",
        "calculation_line",
        "decided_by",
    ).order_by("severity", "employee__employee_code", "category")
    approvals = PayrollRunApproval.objects.filter(tenant=tenant).select_related("review", "approver").order_by("-created_at")
    if selected_review:
        exceptions = exceptions.filter(review=selected_review)
        approvals = approvals.filter(review=selected_review)
    latest_review = reviews.first()
    lines = PayrollCalculationLine.objects.filter(tenant=tenant).select_related(
        "calculation",
        "employee",
        "input_snapshot",
        "payroll_run",
        "rule_version__rule",
    ).order_by("-calculation__created_at", "employee__employee_code", "calculation_order", "component_code")
    if selected_review:
        lines = lines.filter(calculation=selected_review.calculation)
    elif latest_review:
        lines = lines.filter(calculation=latest_review.calculation)

    return {
        "summary": {
            "run_count": runs.count(),
            "review_count": reviews.count(),
            "open_review_count": reviews.filter(status__in=[PayrollReviewStatus.OPEN, PayrollReviewStatus.READY_FOR_APPROVAL]).count(),
            "approved_review_count": reviews.filter(status=PayrollReviewStatus.APPROVED).count(),
            "locked_review_count": reviews.filter(status=PayrollReviewStatus.LOCKED).count(),
            "exception_count": PayrollRunException.objects.filter(tenant=tenant).count(),
            "open_exception_count": PayrollRunException.objects.filter(tenant=tenant, status=PayrollExceptionStatus.OPEN).count(),
            "open_blocker_count": PayrollRunException.objects.filter(tenant=tenant, status=PayrollExceptionStatus.OPEN, severity=PayrollExceptionSeverity.BLOCKER).count(),
            "approval_count": PayrollRunApproval.objects.filter(tenant=tenant).count(),
            "latest_net_pay": latest_review.totals_snapshot.get("net_pay") if latest_review else "0.00",
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "calculations": [build_hr_admin_payroll_calculation_payload(item) for item in calculations[:50]],
        "reviews": [build_hr_admin_payroll_review_payload(item) for item in reviews[:50]],
        "exceptions": [build_hr_admin_payroll_exception_payload(item) for item in exceptions[:1000]],
        "approvals": [build_hr_admin_payroll_approval_payload(item) for item in approvals[:100]],
        "lines": [build_hr_admin_payroll_calculation_line_payload(item) for item in lines[:500]],
        "options": {
            "payroll_run_statuses": [{"value": value, "label": label} for value, label in PayrollRunStatus.choices],
            "review_statuses": [{"value": value, "label": label} for value, label in PayrollReviewStatus.choices],
            "exception_statuses": [{"value": value, "label": label} for value, label in PayrollExceptionStatus.choices],
            "exception_severities": [{"value": value, "label": label} for value, label in PayrollExceptionSeverity.choices],
            "approval_statuses": [{"value": value, "label": label} for value, label in PayrollApprovalStatus.choices],
        },
    }


class HrAdminPayrollReviewSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollReviewSetupSerializer(get_hr_admin_payroll_review_setup_payload(employee, request)).data)


class HrAdminPayrollRunOpenReviewView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payroll_run = PayrollRun.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not payroll_run:
            return response.Response({"detail": "Payroll run not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollOpenReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        calculation = None
        if serializer.validated_data.get("calculation_id"):
            calculation = PayrollRunCalculation.objects.filter(tenant=employee.tenant, payroll_run=payroll_run, id=serializer.validated_data["calculation_id"]).first()
        else:
            calculation = PayrollRunCalculation.objects.filter(
                tenant=employee.tenant,
                payroll_run=payroll_run,
                status=PayrollCalculationStatus.COMPLETED,
            ).order_by("-created_at").first()
        if not calculation:
            return response.Response({"detail": "Select a completed payroll calculation for review."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            review = open_payroll_run_review(
                calculation,
                opened_by=request.user,
                review_profile_ref=serializer.validated_data.get("review_profile_ref") or None,
            )
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        review = PayrollRunReview.objects.select_related("payroll_run", "calculation", "opened_by", "submitted_by", "approved_by", "locked_by").get(id=review.id)
        return response.Response(HrAdminPayrollReviewActionResultSerializer(build_hr_admin_payroll_review_action_payload(review, "Payroll review opened.")).data)


class HrAdminPayrollReviewSubmitView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            review = submit_payroll_run_review(review, submitted_by=request.user)
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollReviewActionResultSerializer(build_hr_admin_payroll_review_action_payload(review, "Payroll review submitted for approval.")).data)


class HrAdminPayrollReviewApproveView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollReviewApprovalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            approve_payroll_run_review(
                review,
                approved_by=request.user,
                comment=serializer.validated_data.get("comment", ""),
                approval_profile_ref=serializer.validated_data.get("approval_profile_ref") or None,
            )
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        review.refresh_from_db()
        return response.Response(HrAdminPayrollReviewActionResultSerializer(build_hr_admin_payroll_review_action_payload(review, "Payroll review approved.")).data)


class HrAdminPayrollReviewRejectView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollReviewApprovalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reject_payroll_run_review(
                review,
                rejected_by=request.user,
                comment=serializer.validated_data.get("comment", ""),
                approval_profile_ref=serializer.validated_data.get("approval_profile_ref") or None,
            )
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        review.refresh_from_db()
        return response.Response(HrAdminPayrollReviewActionResultSerializer(build_hr_admin_payroll_review_action_payload(review, "Payroll review rejected.")).data)


class HrAdminPayrollReviewLockView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            review = lock_approved_payroll_run_review(review, locked_by=request.user)
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollReviewActionResultSerializer(build_hr_admin_payroll_review_action_payload(review, "Payroll run final locked.")).data)


class HrAdminPayrollReviewExceptionListCreateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollCreateExceptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        calculation_line = PayrollCalculationLine.objects.filter(tenant=employee.tenant, id=serializer.validated_data["calculation_line_id"]).first() if serializer.validated_data.get("calculation_line_id") else None
        input_snapshot = PayrollInputSnapshot.objects.filter(tenant=employee.tenant, id=serializer.validated_data["input_snapshot_id"]).first() if serializer.validated_data.get("input_snapshot_id") else None
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first() if serializer.validated_data.get("employee_id") else None
        try:
            exception = create_payroll_run_exception(
                review,
                title=serializer.validated_data["title"],
                detail=serializer.validated_data.get("detail", ""),
                category=serializer.validated_data.get("category", "manual_review"),
                severity=serializer.validated_data.get("severity", PayrollExceptionSeverity.WARNING),
                calculation_line=calculation_line,
                input_snapshot=input_snapshot,
                employee=target_employee,
                created_by=request.user,
                config_snapshot=serializer.validated_data.get("config_snapshot") or {},
            )
        except (DjangoValidationError, PayrollReviewError) as exc:
            payload = _django_validation_error_payload(exc) if isinstance(exc, DjangoValidationError) else {"detail": str(exc)}
            return response.Response(payload, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollRunExceptionSerializer(build_hr_admin_payroll_exception_payload(exception)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollReviewExceptionDecisionView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        exception = PayrollRunException.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "review",
            "payroll_run",
            "employee",
            "input_snapshot",
            "calculation_line",
        ).first()
        if not exception:
            return response.Response({"detail": "Payroll exception not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollExceptionDecisionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            exception = decide_payroll_run_exception(
                exception,
                decision=serializer.validated_data["decision"],
                reason=serializer.validated_data.get("reason", ""),
                decided_by=request.user,
            )
        except PayrollReviewError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollRunExceptionSerializer(build_hr_admin_payroll_exception_payload(exception)).data)


def build_hr_admin_payroll_output_batch_payload(item: PayrollOutputBatch) -> dict:
    return {
        "id": item.id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "review_id": item.review_id,
        "review_status": item.review.status,
        "status": item.status,
        "status_label": item.get_status_display(),
        "output_profile_ref": item.output_profile_ref,
        "generated_at": item.generated_at,
        "generated_by_name": str(item.generated_by) if item.generated_by else None,
        "published_at": item.published_at,
        "published_by_name": str(item.published_by) if item.published_by else None,
        "totals_snapshot": item.totals_snapshot,
        "artifact_summary_snapshot": item.artifact_summary_snapshot,
        "config_snapshot": item.config_snapshot,
        "artifact_count": item.artifacts.count(),
        "payslip_count": item.artifacts.filter(kind=PayrollOutputArtifactKind.PAYSLIP).count(),
        "register_count": item.artifacts.filter(kind=PayrollOutputArtifactKind.REGISTER).count(),
        "published_artifact_count": item.artifacts.filter(status=PayrollOutputArtifactStatus.PUBLISHED).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_output_artifact_payload(item: PayrollOutputArtifact, *, include_detail: bool = True) -> dict:
    employee = item.employee
    can_download = item.status == PayrollOutputArtifactStatus.PUBLISHED and item.is_downloadable
    signed_url = get_payroll_artifact_signed_url(item) if can_download and include_detail else None
    recent_events = list(item.access_events.order_by("-created_at")[:8]) if include_detail else []
    return {
        "id": item.id,
        "output_batch_id": item.output_batch_id,
        "payroll_run_id": item.payroll_run_id,
        "review_id": item.review_id,
        "employee_id": item.employee_id,
        "employee_code": employee.employee_code if employee else None,
        "employee_name": _employee_display_name(employee) if employee else None,
        "input_snapshot_id": item.input_snapshot_id,
        "kind": item.kind,
        "kind_label": item.get_kind_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "artifact_key": item.artifact_key,
        "title": item.title,
        "file_name": item.file_name,
        "content_type": item.content_type,
        "storage_provider_ref": item.storage_provider_ref,
        "storage_key": item.storage_key,
        "storage_object_version": item.storage_object_version,
        "mime_type": item.mime_type,
        "file_size_bytes": item.file_size_bytes,
        "checksum_sha256": item.checksum_sha256,
        "is_downloadable": item.is_downloadable,
        "download_strategy_ref": item.download_strategy_ref,
        "supports_signed_url": item.supports_signed_url,
        "signed_url_expires_in_seconds": item.signed_url_expires_in_seconds,
        "retention_policy_ref": item.retention_policy_ref,
        "download_url": f"/api/v1/hr-admin/payroll-output-artifacts/{item.id}/download/" if can_download else None,
        "signed_download_url": signed_url.url if signed_url else None,
        "signed_download_expires_at": signed_url.expires_at if signed_url else None,
        "output_profile_ref": item.output_profile_ref,
        "totals_snapshot": item.totals_snapshot,
        "line_snapshot": item.line_snapshot if include_detail else [],
        "access_summary": _payroll_artifact_access_summary(item),
        "access_events": [_payroll_access_event_payload(event) for event in recent_events],
        "source_hash": item.source_hash,
        "published_at": item.published_at,
        "published_by_name": str(item.published_by) if item.published_by else None,
        "config_snapshot": item.config_snapshot if include_detail else {},
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_output_action_payload(batch: PayrollOutputBatch, detail: str) -> dict:
    artifacts = PayrollOutputArtifact.objects.filter(output_batch=batch).select_related("employee", "input_snapshot", "published_by")
    return {
        "output_batch": build_hr_admin_payroll_output_batch_payload(batch),
        "artifacts": [build_hr_admin_payroll_output_artifact_payload(item) for item in artifacts],
        "detail": detail,
    }


def get_hr_admin_payroll_output_setup_payload(actor, request=None) -> dict:
    tenant = actor.tenant
    selected_batch_id = (request.query_params.get("batch_id") or "").strip() if request else ""
    selected_artifact_id = (request.query_params.get("artifact_id") or "").strip() if request else ""
    runs = PayrollRun.objects.filter(tenant=tenant).select_related("period", "pay_group", "locked_by", "final_locked_by").order_by("-period__start_date", "name")
    reviews = PayrollRunReview.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "calculation",
        "opened_by",
        "submitted_by",
        "approved_by",
        "locked_by",
    ).order_by("-created_at")
    batches = PayrollOutputBatch.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "review",
        "generated_by",
        "published_by",
    ).order_by("-created_at")
    selected_batch = batches.filter(id=selected_batch_id).first() if selected_batch_id else batches.first()
    artifacts = PayrollOutputArtifact.objects.filter(tenant=tenant).select_related(
        "output_batch",
        "payroll_run",
        "review",
        "employee",
        "input_snapshot",
        "published_by",
    ).order_by("kind", "artifact_key")
    if selected_batch:
        artifacts = artifacts.filter(output_batch=selected_batch)
    artifacts = artifacts[:200]
    latest_batch = batches.first()
    detail_artifact_id = selected_artifact_id or (str(artifacts[0].id) if artifacts else "")
    return {
        "summary": {
            "run_count": runs.count(),
            "locked_review_count": reviews.filter(status=PayrollReviewStatus.LOCKED).count(),
            "output_batch_count": batches.count(),
            "generated_batch_count": batches.filter(status=PayrollOutputBatchStatus.GENERATED).count(),
            "published_batch_count": batches.filter(status=PayrollOutputBatchStatus.PUBLISHED).count(),
            "artifact_count": PayrollOutputArtifact.objects.filter(tenant=tenant).count(),
            "payslip_count": PayrollOutputArtifact.objects.filter(tenant=tenant, kind=PayrollOutputArtifactKind.PAYSLIP).count(),
            "register_count": PayrollOutputArtifact.objects.filter(tenant=tenant, kind=PayrollOutputArtifactKind.REGISTER).count(),
            "published_artifact_count": PayrollOutputArtifact.objects.filter(tenant=tenant, status=PayrollOutputArtifactStatus.PUBLISHED).count(),
            "latest_net_pay": latest_batch.totals_snapshot.get("net_pay") if latest_batch else "0.00",
        },
        "runs": [build_hr_admin_payroll_run_payload(item) for item in runs],
        "reviews": [build_hr_admin_payroll_review_payload(item) for item in reviews[:50]],
        "output_batches": [build_hr_admin_payroll_output_batch_payload(item) for item in batches[:50]],
        "artifacts": [build_hr_admin_payroll_output_artifact_payload(item, include_detail=str(item.id) == detail_artifact_id) for item in artifacts],
        "options": {
            "output_batch_statuses": [{"value": value, "label": label} for value, label in PayrollOutputBatchStatus.choices],
            "output_artifact_kinds": [{"value": value, "label": label} for value, label in PayrollOutputArtifactKind.choices],
            "output_artifact_statuses": [{"value": value, "label": label} for value, label in PayrollOutputArtifactStatus.choices],
        },
    }


class HrAdminPayrollOutputSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollOutputSetupSerializer(get_hr_admin_payroll_output_setup_payload(employee, request)).data)


class HrAdminPayrollReviewGenerateOutputsView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        review = PayrollRunReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "calculation").first()
        if not review:
            return response.Response({"detail": "Payroll review not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollGenerateOutputsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            batch = generate_payroll_outputs(
                review,
                generated_by=request.user,
                output_profile_ref=serializer.validated_data.get("output_profile_ref") or None,
            )
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        batch = PayrollOutputBatch.objects.select_related("payroll_run", "review", "generated_by", "published_by").get(id=batch.id)
        return response.Response(HrAdminPayrollOutputActionResultSerializer(build_hr_admin_payroll_output_action_payload(batch, "Payroll outputs generated.")).data)


class HrAdminPayrollOutputBatchPublishView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        batch = PayrollOutputBatch.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "review").first()
        if not batch:
            return response.Response({"detail": "Payroll output batch not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            batch = publish_payroll_output_batch(batch, published_by=request.user)
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        batch = PayrollOutputBatch.objects.select_related("payroll_run", "review", "generated_by", "published_by").get(id=batch.id)
        return response.Response(HrAdminPayrollOutputActionResultSerializer(build_hr_admin_payroll_output_action_payload(batch, "Payroll outputs published.")).data)


class HrAdminPayrollOutputArtifactSignedAccessIssueView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "output_batch",
            "payroll_run",
            "review",
            "employee",
            "employee__membership",
        ).first()
        if not artifact:
            return response.Response({"detail": "Payroll output artifact not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PayrollArtifactSignedAccessGrantIssueRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_metadata = _payroll_request_metadata(request)
        try:
            issue = issue_payroll_artifact_signed_access_grant(
                artifact,
                issued_by_user=request.user,
                issued_by_membership=getattr(employee, "membership", None),
                issued_to_user=request.user,
                issued_to_membership=getattr(employee, "membership", None),
                actor_identifier=employee.employee_code,
                source_channel_ref="hr_admin.payroll_outputs.v1",
                request_identifier=request_metadata["request_identifier"],
                ip_address=request_metadata["ip_address"],
                user_agent=request_metadata["user_agent"],
                expires_in_seconds=serializer.validated_data.get("expires_in_seconds"),
                max_access_count=serializer.validated_data.get("max_access_count"),
                permission_scope=serializer.validated_data.get("permission_scope") or "download",
                metadata_snapshot={"issue_surface": "hr_admin"},
            )
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(
            PayrollArtifactSignedAccessGrantIssueResultSerializer({
                "grant": _payroll_signed_access_grant_payload(issue.grant),
                "signed_url": issue.signed_url,
                "expires_at": issue.grant.expires_at,
            }).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminPayrollArtifactSignedAccessGrantRevokeView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        grant = PayrollArtifactSignedAccessGrant.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "output_artifact",
            "output_batch",
            "payroll_run",
            "review",
            "employee",
            "issued_to_membership",
            "issued_by_user",
        ).first()
        if not grant:
            return response.Response({"detail": "Payroll signed access grant not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PayrollArtifactSignedAccessGrantRevokeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_metadata = _payroll_request_metadata(request)
        try:
            grant = revoke_payroll_artifact_signed_access_grant(
                grant,
                revoked_by_user=request.user,
                revoked_by_membership=getattr(employee, "membership", None),
                actor_identifier=employee.employee_code,
                reason=serializer.validated_data["reason"],
                request_identifier=request_metadata["request_identifier"],
                ip_address=request_metadata["ip_address"],
                user_agent=request_metadata["user_agent"],
            )
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(PayrollArtifactSignedAccessGrantSerializer(_payroll_signed_access_grant_payload(grant)).data)


class HrAdminPayrollOutputArtifactAccessAuditExportView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "output_batch",
            "payroll_run",
            "review",
            "employee",
        ).first()
        if not artifact:
            return response.Response({"detail": "Payroll output artifact not found."}, status=status.HTTP_404_NOT_FOUND)
        rows = payroll_artifact_access_audit_rows(artifact)
        fieldnames = [
            "row_type",
            "artifact_id",
            "artifact_key",
            "event_or_grant_id",
            "event_type",
            "status",
            "source_channel_ref",
            "actor_identifier",
            "request_identifier",
            "signed_access_grant_id",
            "notification_id",
            "storage_provider_ref",
            "storage_object_version",
            "download_strategy_ref",
            "checksum_sha256",
            "occurred_at",
            "expires_at",
            "revoked_at",
            "access_count",
            "metadata_snapshot",
        ]
        csv_buffer = StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
        file_name = re.sub(r"[^A-Za-z0-9._-]+", "-", artifact.artifact_key or str(artifact.id)).strip("-")
        export_response = HttpResponse(csv_buffer.getvalue(), content_type="text/csv")
        export_response["Content-Disposition"] = f'attachment; filename="{file_name or "payroll-artifact"}-access-audit.csv"'
        export_response["X-Payroll-Artifact-Checksum"] = artifact.checksum_sha256
        export_response["X-Payroll-Access-Audit-Row-Count"] = str(len(rows))
        return export_response


class HrAdminPayrollOutputArtifactDownloadView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        artifact = PayrollOutputArtifact.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "output_batch",
            "payroll_run",
            "review",
        ).first()
        if not artifact:
            return response.Response({"detail": "Payroll output artifact not found."}, status=status.HTTP_404_NOT_FOUND)
        if artifact.status != PayrollOutputArtifactStatus.PUBLISHED:
            return response.Response({"detail": "Only published payroll artifacts can be downloaded."}, status=status.HTTP_400_BAD_REQUEST)
        if not artifact.is_downloadable:
            return response.Response({"detail": "Payroll artifact file is not available for download."}, status=status.HTTP_400_BAD_REQUEST)
        actor_membership = getattr(employee, "membership", None)
        try:
            signed_access_grant = _payroll_signed_access_grant_from_request(artifact, request, actor_membership=actor_membership)
        except PayrollOutputError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        try:
            stored_payload = read_payroll_artifact_payload(artifact)
        except PayrollArtifactStorageError as exc:
            http_status = status.HTTP_409_CONFLICT if "checksum" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
            return response.Response({"detail": str(exc)}, status=http_status)
        request_metadata = _payroll_request_metadata(request)
        create_payroll_artifact_access_event(
            artifact,
            event_type=PayrollArtifactAccessEventType.DOWNLOADED,
            actor_user=request.user,
            actor_membership=actor_membership,
            actor_identifier=employee.employee_code,
            signed_access_grant=signed_access_grant,
            request_identifier=request_metadata["request_identifier"],
            ip_address=request_metadata["ip_address"],
            user_agent=request_metadata["user_agent"],
            source_channel_ref="hr_admin.payroll_outputs.v1",
            metadata_snapshot={
                "content_type": stored_payload.content_type,
                "file_name": stored_payload.file_name,
                "file_size_bytes": len(stored_payload.payload),
                "download_surface": "hr_admin",
                "signed_access_grant_id": str(signed_access_grant.id) if signed_access_grant else "",
            },
        )
        file_name = re.sub(r"[^A-Za-z0-9._-]+", "-", artifact.file_name or f"{artifact.artifact_key}.txt").strip("-")
        download_response = HttpResponse(stored_payload.payload, content_type=stored_payload.content_type)
        download_response["Content-Disposition"] = f'attachment; filename="{file_name or "payroll-artifact.txt"}"'
        download_response["X-Payroll-Artifact-Checksum"] = artifact.checksum_sha256 or stored_payload.checksum_sha256
        download_response["X-Payroll-Storage-Key"] = artifact.storage_key
        download_response["X-Payroll-Storage-Provider"] = artifact.storage_provider_ref
        download_response["X-Payroll-Storage-Version"] = artifact.storage_object_version
        download_response["X-Payroll-Download-Strategy"] = artifact.download_strategy_ref
        download_response["X-Payroll-Retention-Policy"] = artifact.retention_policy_ref
        return download_response


def build_hr_admin_payroll_finance_handoff_payload(item: PayrollFinanceHandoff) -> dict:
    return {
        "id": item.id,
        "output_batch_id": item.output_batch_id,
        "payroll_run_id": item.payroll_run_id,
        "payroll_run_name": item.payroll_run.name,
        "review_id": item.review_id,
        "status": item.status,
        "status_label": item.get_status_display(),
        "handoff_profile_ref": item.handoff_profile_ref,
        "bank_file_profile_ref": item.bank_file_profile_ref,
        "accounting_export_profile_ref": item.accounting_export_profile_ref,
        "statutory_pack_ref": item.statutory_pack_ref,
        "generated_at": item.generated_at,
        "generated_by_name": str(item.generated_by) if item.generated_by else None,
        "transmitted_at": item.transmitted_at,
        "transmitted_by_name": str(item.transmitted_by) if item.transmitted_by else None,
        "accepted_at": item.accepted_at,
        "accepted_by_name": str(item.accepted_by) if item.accepted_by else None,
        "totals_snapshot": item.totals_snapshot,
        "handoff_summary_snapshot": item.handoff_summary_snapshot,
        "config_snapshot": item.config_snapshot,
        "artifact_count": PayrollOutputArtifact.objects.filter(
            output_batch=item.output_batch,
            kind__in=[
                PayrollOutputArtifactKind.BANK_ADVICE,
                PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
                PayrollOutputArtifactKind.STATUTORY_REPORT,
                PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
            ],
        ).count(),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_delivery_payload(item: PayrollProviderDelivery) -> dict:
    return {
        "id": item.id,
        "handoff_id": item.handoff_id,
        "output_artifact_id": item.output_artifact_id,
        "output_artifact_title": item.output_artifact.title,
        "output_batch_id": item.output_batch_id,
        "payroll_run_id": item.payroll_run_id,
        "review_id": item.review_id,
        "artifact_kind": item.artifact_kind,
        "artifact_kind_label": item.get_artifact_kind_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "provider_ref": item.provider_ref,
        "channel_ref": item.channel_ref,
        "external_reference": item.external_reference,
        "retry_policy_ref": item.retry_policy_ref,
        "attempt_count": item.attempt_count,
        "submitted_at": item.submitted_at,
        "submitted_by_name": str(item.submitted_by) if item.submitted_by else None,
        "acknowledged_at": item.acknowledged_at,
        "acknowledged_by_name": str(item.acknowledged_by) if item.acknowledged_by else None,
        "reconciled_at": item.reconciled_at,
        "reconciled_by_name": str(item.reconciled_by) if item.reconciled_by else None,
        "failure_code": item.failure_code,
        "failure_reason": item.failure_reason,
        "payload_checksum_sha256": item.payload_checksum_sha256,
        "request_snapshot": item.request_snapshot,
        "response_snapshot": item.response_snapshot,
        "reconciliation_snapshot": item.reconciliation_snapshot,
        "config_snapshot": item.config_snapshot,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_callback_event_payload(item: PayrollProviderCallbackEvent) -> dict:
    return {
        "id": item.id,
        "provider_delivery_id": item.provider_delivery_id,
        "handoff_id": item.handoff_id,
        "output_artifact_id": item.output_artifact_id,
        "output_artifact_title": item.output_artifact.title,
        "provider_ref": item.provider_ref,
        "external_reference": item.external_reference,
        "external_event_id": item.external_event_id,
        "idempotency_key": item.idempotency_key,
        "callback_profile_ref": item.callback_profile_ref,
        "callback_verification_ref": item.callback_verification_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "provider_status": item.provider_status,
        "provider_status_label": item.get_provider_status_display(),
        "payload_checksum_sha256": item.payload_checksum_sha256,
        "signature": item.signature,
        "verification_snapshot": item.verification_snapshot,
        "payload_snapshot": item.payload_snapshot,
        "processing_snapshot": item.processing_snapshot,
        "received_at": item.received_at,
        "processed_at": item.processed_at,
        "failure_code": item.failure_code,
        "failure_reason": item.failure_reason,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_retry_event_payload(item: PayrollProviderRetryEvent) -> dict:
    return {
        "id": item.id,
        "provider_delivery_id": item.provider_delivery_id,
        "handoff_id": item.handoff_id,
        "output_artifact_id": item.output_artifact_id,
        "output_artifact_title": item.output_artifact.title,
        "status": item.status,
        "status_label": item.get_status_display(),
        "retry_policy_ref": item.retry_policy_ref,
        "failure_taxonomy_ref": item.failure_taxonomy_ref,
        "failure_category_ref": item.failure_category_ref,
        "retry_reason": item.retry_reason,
        "attempt_number": item.attempt_number,
        "scheduled_for": item.scheduled_for,
        "executed_at": item.executed_at,
        "requested_by_name": str(item.requested_by) if item.requested_by else None,
        "executed_by_name": str(item.executed_by) if item.executed_by else None,
        "decision_snapshot": item.decision_snapshot,
        "request_snapshot": item.request_snapshot,
        "response_snapshot": item.response_snapshot,
        "failure_code": item.failure_code,
        "failure_reason": item.failure_reason,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_job_payload(item: PayrollProviderJob) -> dict:
    return {
        "id": item.id,
        "job_kind": item.job_kind,
        "job_kind_label": item.get_job_kind_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "queue_policy_ref": item.queue_policy_ref,
        "worker_profile_ref": item.worker_profile_ref,
        "idempotency_key": item.idempotency_key,
        "provider_ref": item.provider_ref,
        "provider_delivery_id": item.provider_delivery_id,
        "provider_connection_id": item.provider_connection_id,
        "retry_event_id": item.retry_event_id,
        "callback_event_id": item.callback_event_id,
        "certification_run_id": item.certification_run_id,
        "priority": item.priority,
        "attempt_count": item.attempt_count,
        "max_attempts": item.max_attempts,
        "scheduled_for": item.scheduled_for,
        "leased_at": item.leased_at,
        "leased_until": item.leased_until,
        "lease_owner_ref": item.lease_owner_ref,
        "heartbeat_at": item.heartbeat_at,
        "heartbeat_count": item.heartbeat_count,
        "recovery_count": item.recovery_count,
        "last_recovered_at": item.last_recovered_at,
        "started_at": item.started_at,
        "completed_at": item.completed_at,
        "requested_by_name": str(item.requested_by) if item.requested_by else None,
        "executed_by_name": str(item.executed_by) if item.executed_by else None,
        "request_snapshot": item.request_snapshot,
        "lease_snapshot": item.lease_snapshot,
        "response_snapshot": item.response_snapshot,
        "failure_code": item.failure_code,
        "failure_reason": item.failure_reason,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_launch_rehearsal_payload(item: PayrollProviderLaunchRehearsal) -> dict:
    return {
        "id": item.id,
        "rehearsal_profile_ref": item.rehearsal_profile_ref,
        "audit_pack_ref": item.audit_pack_ref,
        "generated_by_ref": item.generated_by_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "can_launch": item.can_launch,
        "ready_lane_count": item.ready_lane_count,
        "blocked_lane_count": item.blocked_lane_count,
        "launch_blocker_count": item.launch_blocker_count,
        "release_blocker_refs": item.release_blocker_refs,
        "audit_pack_snapshot": item.audit_pack_snapshot,
        "evidence_checksum_sha256": item.evidence_checksum_sha256,
        "generated_at": item.generated_at,
        "generated_by_name": str(item.generated_by) if item.generated_by else None,
        "source_hash": item.source_hash,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_connection_payload(item: PayrollProviderConnection) -> dict:
    return {
        "id": item.id,
        "provider_ref": item.provider_ref,
        "provider_name": item.provider_name,
        "provider_kind": item.provider_kind,
        "provider_kind_label": item.get_provider_kind_display(),
        "environment_ref": item.environment_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "adapter_ref": item.adapter_ref,
        "sandbox_adapter_ref": item.sandbox_adapter_ref,
        "channel_ref": item.channel_ref,
        "credential_ref": item.credential_ref,
        "credential_profile_ref": item.credential_profile_ref,
        "credential_required": item.credential_required,
        "callback_profile_ref": item.callback_profile_ref,
        "callback_verification_ref": item.callback_verification_ref,
        "retry_policy_ref": item.retry_policy_ref,
        "certification_status": item.certification_status,
        "certification_status_label": item.get_certification_status_display(),
        "certification_profile_ref": item.certification_profile_ref,
        "certified_at": item.certified_at,
        "certified_by_name": str(item.certified_by) if item.certified_by else None,
        "last_tested_at": item.last_tested_at,
        "last_tested_by_name": str(item.last_tested_by) if item.last_tested_by else None,
        "readiness_snapshot": item.readiness_snapshot,
        "certification_snapshot": item.certification_snapshot,
        "config_snapshot": item.config_snapshot,
        "created_by_name": str(item.created_by) if item.created_by else None,
        "updated_by_name": str(item.updated_by) if item.updated_by else None,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_certification_run_payload(item: PayrollProviderCertificationRun) -> dict:
    return {
        "id": item.id,
        "provider_connection_id": item.provider_connection_id,
        "provider_ref": item.provider_ref,
        "provider_kind": item.provider_kind,
        "provider_kind_label": item.get_provider_kind_display(),
        "environment_ref": item.environment_ref,
        "run_profile_ref": item.run_profile_ref,
        "certification_profile_ref": item.certification_profile_ref,
        "scenario_profile_ref": item.scenario_profile_ref,
        "status": item.status,
        "status_label": item.get_status_display(),
        "scenario_count": item.scenario_count,
        "passed_count": item.passed_count,
        "failed_count": item.failed_count,
        "blocker_count": item.blocker_count,
        "started_at": item.started_at,
        "completed_at": item.completed_at,
        "requested_by_name": str(item.requested_by) if item.requested_by else None,
        "executed_by_name": str(item.executed_by) if item.executed_by else None,
        "request_snapshot": item.request_snapshot,
        "response_snapshot": item.response_snapshot,
        "evidence_snapshot": item.evidence_snapshot,
        "error_snapshot": item.error_snapshot,
        "source_hash": item.source_hash,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_schema_mapping_pack_payload(item: PayrollProviderSchemaMappingPack) -> dict:
    return {
        "id": item.id,
        "provider_connection_id": item.provider_connection_id,
        "provider_ref": item.provider_ref,
        "provider_kind": item.provider_kind,
        "provider_kind_label": item.get_provider_kind_display(),
        "environment_ref": item.environment_ref,
        "artifact_kind": item.artifact_kind,
        "artifact_kind_label": item.get_artifact_kind_display(),
        "mapping_profile_ref": item.mapping_profile_ref,
        "version": item.version,
        "status": item.status,
        "status_label": item.get_status_display(),
        "source_schema_ref": item.source_schema_ref,
        "target_schema_ref": item.target_schema_ref,
        "transform_profile_ref": item.transform_profile_ref,
        "validation_profile_ref": item.validation_profile_ref,
        "enforcement_mode": item.enforcement_mode,
        "transform_rules": item.transform_rules,
        "validation_rules": item.validation_rules,
        "sample_request_snapshot": item.sample_request_snapshot,
        "sample_output_snapshot": item.sample_output_snapshot,
        "evidence_snapshot": item.evidence_snapshot,
        "source_hash": item.source_hash,
        "created_by_name": str(item.created_by) if item.created_by else None,
        "updated_by_name": str(item.updated_by) if item.updated_by else None,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def build_hr_admin_payroll_provider_schema_mapping_simulation_payload(item: PayrollProviderSchemaMappingSimulation) -> dict:
    return build_payroll_provider_schema_mapping_simulation_payload(item)


def _payroll_provider_client_refs_for_connections(connections: list[PayrollProviderConnection]) -> dict[str, str]:
    client_refs: dict[str, str] = {}
    adapter_config_families = {
        "bank_payout_adapter": "bank",
        "accounting_journal_adapter": "accounting",
        "statutory_filing_adapter": "statutory",
    }
    for connection in connections:
        config = connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}
        route = config.get("provider_route") if isinstance(config.get("provider_route"), dict) else {}
        for config_key, family in adapter_config_families.items():
            adapter_config = route.get(config_key) if isinstance(route.get(config_key), dict) else {}
            client_ref = str(adapter_config.get("client_ref") or "").strip()
            if client_ref:
                client_refs[client_ref] = family
    return client_refs


def _payroll_provider_routes_for_connections(connections: list[PayrollProviderConnection]) -> list[dict]:
    routes: list[dict] = []
    for connection in connections:
        config = connection.config_snapshot if isinstance(connection.config_snapshot, dict) else {}
        route = config.get("provider_route") if isinstance(config.get("provider_route"), dict) else {}
        if route:
            routes.append(route)
    return routes


def _payroll_storage_policy_refs_for_packages(package_registry: dict) -> list[str]:
    refs: set[str] = set()
    packages = package_registry.get("packages") if isinstance(package_registry, dict) else []
    for package in packages if isinstance(packages, list) else []:
        if not isinstance(package, dict):
            continue
        manifest = package.get("manifest") if isinstance(package.get("manifest"), dict) else {}
        storage_policy_refs = manifest.get("storage_policy_refs")
        if not isinstance(storage_policy_refs, list):
            capabilities = package.get("capabilities") if isinstance(package.get("capabilities"), dict) else {}
            storage_policy_refs = capabilities.get("storage_policy_refs")
        if isinstance(storage_policy_refs, list):
            refs.update(str(item).strip() for item in storage_policy_refs if str(item or "").strip())
    return sorted(refs)


def get_hr_admin_payroll_provider_connection_setup_payload(actor) -> dict:
    return get_hr_admin_payroll_provider_connection_setup_payload_for_tenant(
        actor.tenant,
        user=getattr(actor, "user", None),
    )


def get_hr_admin_payroll_provider_connection_setup_payload_for_tenant(tenant, *, user=None) -> dict:
    ensure_default_payroll_provider_connections(tenant, created_by=user)
    queryset = PayrollProviderConnection.objects.filter(tenant=tenant)
    connections = list(
        queryset.select_related("certified_by", "last_tested_by", "created_by", "updated_by").order_by(
            "provider_kind",
            "provider_name",
            "provider_ref",
        )
    )
    certification_run_queryset = PayrollProviderCertificationRun.objects.filter(tenant=tenant)
    certification_runs = list(
        certification_run_queryset.select_related("provider_connection", "requested_by", "executed_by").order_by(
            "-created_at",
            "-started_at",
        )[:50]
    )
    schema_mapping_pack_queryset = PayrollProviderSchemaMappingPack.objects.filter(tenant=tenant)
    schema_mapping_packs = list(
        schema_mapping_pack_queryset.select_related("provider_connection", "created_by", "updated_by").order_by(
            "provider_kind",
            "artifact_kind",
            "provider_ref",
            "-version",
        )[:100]
    )
    schema_mapping_simulation_queryset = PayrollProviderSchemaMappingSimulation.objects.filter(tenant=tenant)
    schema_mapping_simulations = list(
        schema_mapping_simulation_queryset.select_related(
            "mapping_pack",
            "baseline_mapping_pack",
            "provider_connection",
            "simulated_by",
        ).order_by("-simulated_at", "-created_at")[:100]
    )
    launch_rehearsal_queryset = PayrollProviderLaunchRehearsal.objects.filter(tenant=tenant)
    launch_rehearsals = list(
        launch_rehearsal_queryset.select_related("generated_by").order_by("-generated_at", "-created_at")[:25]
    )
    latest_launch_rehearsal = launch_rehearsals[0] if launch_rehearsals else None
    active_allowed_count = sum(
        1 for item in connections
        if isinstance(item.readiness_snapshot, dict) and item.readiness_snapshot.get("active_allowed")
    )
    provider_routes = _payroll_provider_routes_for_connections(connections)
    adapter_registry = describe_payroll_provider_adapter_registry(
        [
            adapter_ref
            for item in connections
            for adapter_ref in (item.adapter_ref, item.sandbox_adapter_ref)
            if adapter_ref
        ]
    )
    client_registry = describe_payroll_provider_client_registry(_payroll_provider_client_refs_for_connections(connections))
    package_registry = describe_payroll_provider_package_registry(
        route_snapshots=provider_routes,
    )
    storage_policy_registry = describe_payroll_artifact_storage_policy_registry(
        _payroll_storage_policy_refs_for_packages(package_registry)
    )
    connection_payloads = [build_hr_admin_payroll_provider_connection_payload(item) for item in connections]
    launch_rehearsal = describe_payroll_provider_launch_rehearsal(
        connections=connection_payloads,
        route_snapshots=provider_routes,
        adapter_registry=adapter_registry,
        client_registry=client_registry,
        package_registry=package_registry,
        storage_policy_registry=storage_policy_registry,
    )
    return {
        "summary": {
            "connection_count": len(connections),
            "active_connection_count": queryset.filter(status=PayrollProviderConnectionStatus.ACTIVE).count(),
            "certified_connection_count": queryset.filter(certification_status=PayrollProviderCertificationStatus.PASSED).count(),
            "sandbox_ready_connection_count": queryset.filter(status=PayrollProviderConnectionStatus.SANDBOX_READY).count(),
            "blocked_connection_count": queryset.filter(status=PayrollProviderConnectionStatus.BLOCKED).count(),
            "credential_required_count": queryset.filter(credential_required=True).count(),
            "active_allowed_count": active_allowed_count,
            "certification_run_count": certification_run_queryset.count(),
            "passed_certification_run_count": certification_run_queryset.filter(status=PayrollProviderCertificationRunStatus.PASSED).count(),
            "failed_certification_run_count": certification_run_queryset.filter(status=PayrollProviderCertificationRunStatus.FAILED).count(),
            "schema_mapping_pack_count": schema_mapping_pack_queryset.count(),
            "active_schema_mapping_pack_count": schema_mapping_pack_queryset.filter(status=PayrollProviderSchemaMappingPackStatus.ACTIVE).count(),
            "draft_schema_mapping_pack_count": schema_mapping_pack_queryset.filter(status=PayrollProviderSchemaMappingPackStatus.DRAFT).count(),
            "archived_schema_mapping_pack_count": schema_mapping_pack_queryset.filter(status=PayrollProviderSchemaMappingPackStatus.ARCHIVED).count(),
            "strict_schema_mapping_pack_count": schema_mapping_pack_queryset.filter(enforcement_mode="strict").count(),
            "schema_mapping_simulation_count": schema_mapping_simulation_queryset.count(),
            "passed_schema_mapping_simulation_count": schema_mapping_simulation_queryset.filter(status="passed").count(),
            "blocked_schema_mapping_simulation_count": schema_mapping_simulation_queryset.filter(status="blocked").count(),
            "changed_schema_mapping_simulation_count": schema_mapping_simulation_queryset.filter(comparison_status="changed").count(),
            "bank_connection_count": queryset.filter(provider_kind=PayrollProviderConnectionKind.BANK).count(),
            "accounting_connection_count": queryset.filter(provider_kind=PayrollProviderConnectionKind.ACCOUNTING).count(),
            "statutory_connection_count": queryset.filter(provider_kind=PayrollProviderConnectionKind.STATUTORY).count(),
            "adapter_registry_count": adapter_registry["adapter_count"],
            "ready_adapter_registry_count": adapter_registry["ready_adapter_count"],
            "blocked_adapter_registry_count": adapter_registry["blocked_adapter_count"],
            "configured_adapter_registry_count": adapter_registry["configured_adapter_count"],
            "production_pack_adapter_registry_count": adapter_registry["production_pack_adapter_count"],
            "client_registry_count": client_registry["client_count"],
            "ready_client_registry_count": client_registry["ready_client_count"],
            "blocked_client_registry_count": client_registry["blocked_client_count"],
            "configured_client_registry_count": client_registry["configured_client_count"],
            "fixture_client_registry_count": client_registry["fixture_client_count"],
            "package_registry_count": package_registry["package_count"],
            "ready_package_registry_count": package_registry["ready_package_count"],
            "blocked_package_registry_count": package_registry["blocked_package_count"],
            "configured_package_registry_count": package_registry["configured_package_count"],
            "fixture_package_registry_count": package_registry["fixture_package_count"],
            "storage_policy_registry_count": storage_policy_registry["storage_policy_count"],
            "ready_storage_policy_registry_count": storage_policy_registry["ready_storage_policy_count"],
            "blocked_storage_policy_registry_count": storage_policy_registry["blocked_storage_policy_count"],
            "configured_storage_policy_registry_count": storage_policy_registry["configured_storage_policy_count"],
            "required_storage_policy_registry_count": storage_policy_registry["required_storage_policy_count"],
            "launch_rehearsal_status": launch_rehearsal["status"],
            "launch_rehearsal_ready_lane_count": launch_rehearsal["ready_lane_count"],
            "launch_rehearsal_blocked_lane_count": launch_rehearsal["blocked_lane_count"],
            "launch_rehearsal_blocker_count": launch_rehearsal["launch_blocker_count"],
            "launch_rehearsal_run_count": launch_rehearsal_queryset.count(),
            "ready_launch_rehearsal_run_count": launch_rehearsal_queryset.filter(status=PayrollProviderLaunchRehearsalStatus.READY).count(),
            "blocked_launch_rehearsal_run_count": launch_rehearsal_queryset.filter(status=PayrollProviderLaunchRehearsalStatus.BLOCKED).count(),
            "latest_launch_rehearsal_status": latest_launch_rehearsal.status if latest_launch_rehearsal else "",
            "latest_launch_rehearsal_checksum": latest_launch_rehearsal.evidence_checksum_sha256 if latest_launch_rehearsal else "",
        },
        "connections": connection_payloads,
        "certification_runs": [build_hr_admin_payroll_provider_certification_run_payload(item) for item in certification_runs],
        "schema_mapping_packs": [build_hr_admin_payroll_provider_schema_mapping_pack_payload(item) for item in schema_mapping_packs],
        "schema_mapping_simulations": [build_hr_admin_payroll_provider_schema_mapping_simulation_payload(item) for item in schema_mapping_simulations],
        "launch_rehearsals": [build_hr_admin_payroll_provider_launch_rehearsal_payload(item) for item in launch_rehearsals],
        "adapter_registry": adapter_registry,
        "client_registry": client_registry,
        "package_registry": package_registry,
        "storage_policy_registry": storage_policy_registry,
        "launch_rehearsal": launch_rehearsal,
        "options": {
            "provider_kinds": [{"value": value, "label": label} for value, label in PayrollProviderConnectionKind.choices],
            "connection_statuses": [{"value": value, "label": label} for value, label in PayrollProviderConnectionStatus.choices],
            "certification_statuses": [{"value": value, "label": label} for value, label in PayrollProviderCertificationStatus.choices],
            "certification_run_statuses": [{"value": value, "label": label} for value, label in PayrollProviderCertificationRunStatus.choices],
            "schema_mapping_pack_statuses": [{"value": value, "label": label} for value, label in PayrollProviderSchemaMappingPackStatus.choices],
            "launch_rehearsal_statuses": [{"value": value, "label": label} for value, label in PayrollProviderLaunchRehearsalStatus.choices],
        },
    }


def save_hr_admin_payroll_provider_connection(actor, data: dict, item: PayrollProviderConnection | None = None) -> PayrollProviderConnection:
    create = item is None
    if create:
        if not data.get("provider_ref") or not data.get("provider_name"):
            raise DjangoValidationError({"provider_ref": "Provider ref and name are required."})
        item = PayrollProviderConnection(tenant=actor.tenant, created_by=getattr(actor, "user", None))
    for field_name in [
        "provider_ref",
        "provider_name",
        "provider_kind",
        "environment_ref",
        "status",
        "adapter_ref",
        "sandbox_adapter_ref",
        "channel_ref",
        "credential_ref",
        "credential_profile_ref",
        "credential_required",
        "callback_profile_ref",
        "callback_verification_ref",
        "retry_policy_ref",
        "certification_profile_ref",
        "config_snapshot",
    ]:
        if field_name in data:
            setattr(item, field_name, data[field_name])
    item.updated_by = getattr(actor, "user", None)
    item.save()
    return sync_payroll_provider_connection_readiness(item)


def get_hr_admin_payroll_provider_schema_mapping_pack_or_404(actor, item_id) -> PayrollProviderSchemaMappingPack | None:
    return PayrollProviderSchemaMappingPack.objects.filter(
        tenant=actor.tenant,
        id=item_id,
    ).select_related("provider_connection", "created_by", "updated_by").first()


def build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item: PayrollProviderSchemaMappingPack, detail: str) -> dict:
    return {
        "mapping_pack": build_hr_admin_payroll_provider_schema_mapping_pack_payload(item),
        "detail": detail,
    }


def build_hr_admin_payroll_finance_handoff_action_payload(handoff: PayrollFinanceHandoff, detail: str) -> dict:
    artifacts = PayrollOutputArtifact.objects.filter(
        output_batch=handoff.output_batch,
        kind__in=[
            PayrollOutputArtifactKind.BANK_ADVICE,
            PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            PayrollOutputArtifactKind.STATUTORY_REPORT,
            PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
        ],
    ).select_related("employee", "input_snapshot", "published_by")
    deliveries = PayrollProviderDelivery.objects.filter(handoff=handoff).select_related(
        "output_artifact",
        "submitted_by",
        "acknowledged_by",
        "reconciled_by",
    )
    callback_events = PayrollProviderCallbackEvent.objects.filter(handoff=handoff).select_related("provider_delivery", "output_artifact")[:100]
    retry_events = PayrollProviderRetryEvent.objects.filter(handoff=handoff).select_related("provider_delivery", "output_artifact", "requested_by", "executed_by")[:100]
    provider_jobs = PayrollProviderJob.objects.filter(
        tenant=handoff.tenant,
        provider_delivery__handoff=handoff,
    ).select_related("provider_delivery", "provider_connection", "retry_event", "callback_event", "certification_run", "requested_by", "executed_by")[:100]
    return {
        "handoff": build_hr_admin_payroll_finance_handoff_payload(handoff),
        "artifacts": [build_hr_admin_payroll_output_artifact_payload(item) for item in artifacts],
        "deliveries": [build_hr_admin_payroll_provider_delivery_payload(item) for item in deliveries],
        "callback_events": [build_hr_admin_payroll_provider_callback_event_payload(item) for item in callback_events],
        "retry_events": [build_hr_admin_payroll_provider_retry_event_payload(item) for item in retry_events],
        "provider_jobs": [build_hr_admin_payroll_provider_job_payload(item) for item in provider_jobs],
        "detail": detail,
    }


def get_hr_admin_payroll_finance_handoff_setup_payload(actor) -> dict:
    tenant = actor.tenant
    batches = PayrollOutputBatch.objects.filter(tenant=tenant).select_related(
        "payroll_run",
        "review",
        "generated_by",
        "published_by",
    ).order_by("-created_at")
    handoffs = PayrollFinanceHandoff.objects.filter(tenant=tenant).select_related(
        "output_batch",
        "payroll_run",
        "review",
        "generated_by",
        "transmitted_by",
        "accepted_by",
    ).order_by("-created_at")
    artifacts = PayrollOutputArtifact.objects.filter(
        tenant=tenant,
        kind__in=[
            PayrollOutputArtifactKind.BANK_ADVICE,
            PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            PayrollOutputArtifactKind.STATUTORY_REPORT,
            PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
        ],
    ).select_related(
        "output_batch",
        "payroll_run",
        "review",
        "employee",
        "input_snapshot",
        "published_by",
    ).order_by("kind", "artifact_key")[:200]
    delivery_queryset = PayrollProviderDelivery.objects.filter(tenant=tenant)
    deliveries = delivery_queryset.select_related(
        "handoff",
        "output_artifact",
        "submitted_by",
        "acknowledged_by",
        "reconciled_by",
    ).order_by("artifact_kind", "provider_ref")[:200]
    callback_event_queryset = PayrollProviderCallbackEvent.objects.filter(tenant=tenant)
    callback_events = callback_event_queryset.select_related("provider_delivery", "output_artifact").order_by("-received_at", "-created_at")[:200]
    retry_event_queryset = PayrollProviderRetryEvent.objects.filter(tenant=tenant)
    retry_events = retry_event_queryset.select_related("provider_delivery", "output_artifact", "requested_by", "executed_by").order_by("-scheduled_for", "-created_at")[:200]
    provider_job_queryset = PayrollProviderJob.objects.filter(tenant=tenant)
    provider_jobs = provider_job_queryset.select_related(
        "provider_delivery",
        "provider_connection",
        "retry_event",
        "callback_event",
        "certification_run",
        "requested_by",
        "executed_by",
    ).order_by("scheduled_for", "priority", "created_at")[:200]
    latest_handoff = handoffs.first()
    now = timezone.now()
    return {
        "summary": {
            "published_output_batch_count": batches.filter(status=PayrollOutputBatchStatus.PUBLISHED).count(),
            "handoff_count": handoffs.count(),
            "generated_handoff_count": handoffs.filter(status=PayrollFinanceHandoffStatus.GENERATED).count(),
            "transmitted_handoff_count": handoffs.filter(status=PayrollFinanceHandoffStatus.TRANSMITTED).count(),
            "accepted_handoff_count": handoffs.filter(status=PayrollFinanceHandoffStatus.ACCEPTED).count(),
            "submitted_delivery_count": delivery_queryset.filter(status=PayrollProviderDeliveryStatus.SUBMITTED).count(),
            "reconciled_delivery_count": delivery_queryset.filter(status=PayrollProviderDeliveryStatus.RECONCILED).count(),
            "failed_delivery_count": delivery_queryset.filter(status=PayrollProviderDeliveryStatus.FAILED).count(),
            "rejected_delivery_count": delivery_queryset.filter(status=PayrollProviderDeliveryStatus.REJECTED).count(),
            "provider_callback_event_count": callback_event_queryset.count(),
            "processed_provider_callback_event_count": callback_event_queryset.filter(status=PayrollProviderCallbackEventStatus.PROCESSED).count(),
            "rejected_provider_callback_event_count": callback_event_queryset.filter(status=PayrollProviderCallbackEventStatus.REJECTED).count(),
            "provider_retry_event_count": retry_event_queryset.count(),
            "scheduled_provider_retry_event_count": retry_event_queryset.filter(status=PayrollProviderRetryEventStatus.SCHEDULED).count(),
            "executed_provider_retry_event_count": retry_event_queryset.filter(status=PayrollProviderRetryEventStatus.EXECUTED).count(),
            "dead_lettered_provider_retry_event_count": retry_event_queryset.filter(status=PayrollProviderRetryEventStatus.DEAD_LETTERED).count(),
            "provider_job_count": provider_job_queryset.count(),
            "queued_provider_job_count": provider_job_queryset.filter(status=PayrollProviderJobStatus.QUEUED).count(),
            "running_provider_job_count": provider_job_queryset.filter(status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING]).count(),
            "completed_provider_job_count": provider_job_queryset.filter(status=PayrollProviderJobStatus.COMPLETED).count(),
            "dead_lettered_provider_job_count": provider_job_queryset.filter(status=PayrollProviderJobStatus.DEAD_LETTERED).count(),
            "recovered_provider_job_count": provider_job_queryset.filter(recovery_count__gt=0).count(),
            "heartbeat_provider_job_count": provider_job_queryset.filter(heartbeat_count__gt=0).count(),
            "stale_provider_job_count": provider_job_queryset.filter(
                status__in=[PayrollProviderJobStatus.LEASED, PayrollProviderJobStatus.RUNNING],
                leased_until__lte=now,
            ).count(),
            "finance_artifact_count": PayrollOutputArtifact.objects.filter(
                tenant=tenant,
                kind__in=[
                    PayrollOutputArtifactKind.BANK_ADVICE,
                    PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
                    PayrollOutputArtifactKind.STATUTORY_REPORT,
                ],
            ).count(),
            "provider_audit_pack_count": PayrollOutputArtifact.objects.filter(
                tenant=tenant,
                kind=PayrollOutputArtifactKind.PROVIDER_AUDIT_PACK,
            ).count(),
            "latest_net_pay": latest_handoff.totals_snapshot.get("net_pay") if latest_handoff else "0.00",
        },
        "output_batches": [build_hr_admin_payroll_output_batch_payload(item) for item in batches[:50]],
        "handoffs": [build_hr_admin_payroll_finance_handoff_payload(item) for item in handoffs[:50]],
        "artifacts": [build_hr_admin_payroll_output_artifact_payload(item) for item in artifacts],
        "deliveries": [build_hr_admin_payroll_provider_delivery_payload(item) for item in deliveries],
        "callback_events": [build_hr_admin_payroll_provider_callback_event_payload(item) for item in callback_events],
        "retry_events": [build_hr_admin_payroll_provider_retry_event_payload(item) for item in retry_events],
        "provider_jobs": [build_hr_admin_payroll_provider_job_payload(item) for item in provider_jobs],
        "options": {
            "handoff_statuses": [{"value": value, "label": label} for value, label in PayrollFinanceHandoffStatus.choices],
            "output_artifact_kinds": [{"value": value, "label": label} for value, label in PayrollOutputArtifactKind.choices],
            "output_artifact_statuses": [{"value": value, "label": label} for value, label in PayrollOutputArtifactStatus.choices],
            "provider_delivery_statuses": [{"value": value, "label": label} for value, label in PayrollProviderDeliveryStatus.choices],
            "provider_callback_event_statuses": [{"value": value, "label": label} for value, label in PayrollProviderCallbackEventStatus.choices],
            "provider_retry_event_statuses": [{"value": value, "label": label} for value, label in PayrollProviderRetryEventStatus.choices],
            "provider_job_kinds": [{"value": value, "label": label} for value, label in PayrollProviderJobKind.choices],
            "provider_job_statuses": [{"value": value, "label": label} for value, label in PayrollProviderJobStatus.choices],
        },
    }


class HrAdminPayrollFinanceHandoffSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollFinanceHandoffSetupSerializer(get_hr_admin_payroll_finance_handoff_setup_payload(employee)).data)


class HrAdminPayrollProviderConnectionSetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollProviderConnectionSetupSerializer(get_hr_admin_payroll_provider_connection_setup_payload(employee)).data)


class HrAdminPayrollProviderLaunchRehearsalRunView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        setup_payload = get_hr_admin_payroll_provider_connection_setup_payload(employee)
        rehearsal = record_payroll_provider_launch_rehearsal(
            employee.tenant,
            setup_payload=setup_payload,
            generated_by=request.user,
            generated_by_ref="hr_admin.payroll_providers.launch_rehearsal.v1",
        )
        refreshed_setup = get_hr_admin_payroll_provider_connection_setup_payload(employee)
        payload = {
            "launch_rehearsal_run": build_hr_admin_payroll_provider_launch_rehearsal_payload(rehearsal),
            "setup": refreshed_setup,
            "detail": "Payroll provider launch rehearsal recorded.",
        }
        return response.Response(HrAdminPayrollProviderLaunchRehearsalActionResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollProviderConnectionListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        connections = PayrollProviderConnection.objects.filter(tenant=employee.tenant).select_related(
            "certified_by",
            "last_tested_by",
            "created_by",
            "updated_by",
        )
        payload = [build_hr_admin_payroll_provider_connection_payload(item) for item in connections]
        return response.Response(HrAdminPayrollProviderConnectionSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderConnectionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_provider_connection(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        payload = {
            "connection": build_hr_admin_payroll_provider_connection_payload(item),
            "detail": "Payroll provider connection created.",
        }
        return response.Response(HrAdminPayrollProviderConnectionActionResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollProviderConnectionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollProviderConnection.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "certified_by",
            "last_tested_by",
            "created_by",
            "updated_by",
        ).first()
        if not item:
            return response.Response({"detail": "Payroll provider connection not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollProviderConnectionSerializer(build_hr_admin_payroll_provider_connection_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollProviderConnection.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll provider connection not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderConnectionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_provider_connection(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        payload = {
            "connection": build_hr_admin_payroll_provider_connection_payload(item),
            "detail": "Payroll provider connection updated.",
        }
        return response.Response(HrAdminPayrollProviderConnectionActionResultSerializer(payload).data)


class HrAdminPayrollProviderConnectionCertifyView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollProviderConnection.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll provider connection not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderConnectionCertificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = record_payroll_provider_connection_certification(
                item,
                certification_status=serializer.validated_data["certification_status"],
                evidence_snapshot=serializer.validated_data.get("evidence_snapshot") or {},
                tested_by=request.user,
            )
        except PayrollProviderConnectionError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = {
            "connection": build_hr_admin_payroll_provider_connection_payload(item),
            "detail": "Payroll provider connection certification recorded.",
        }
        return response.Response(HrAdminPayrollProviderConnectionActionResultSerializer(payload).data)


class HrAdminPayrollProviderConnectionRunCertificationView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollProviderConnection.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll provider connection not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderCertificationRunRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            certification_run = run_payroll_provider_connection_certification(
                item,
                requested_by=request.user,
                executed_by=request.user,
                scenario_refs=serializer.validated_data.get("scenario_refs") or None,
            )
        except PayrollProviderConnectionError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        item.refresh_from_db()
        payload = {
            "connection": build_hr_admin_payroll_provider_connection_payload(item),
            "certification_run": build_hr_admin_payroll_provider_certification_run_payload(certification_run),
            "detail": "Payroll provider certification run completed.",
        }
        return response.Response(HrAdminPayrollProviderCertificationRunActionResultSerializer(payload).data)


class HrAdminPayrollProviderSchemaMappingPackListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollProviderSchemaMappingPack.objects.filter(tenant=employee.tenant).select_related(
            "provider_connection",
            "created_by",
            "updated_by",
        ).order_by("provider_kind", "artifact_kind", "provider_ref", "-version")
        payload = [build_hr_admin_payroll_provider_schema_mapping_pack_payload(item) for item in items]
        return response.Response(HrAdminPayrollProviderSchemaMappingPackSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_payroll_provider_schema_mapping_pack_for_actor(employee, serializer.validated_data)
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item, "Payroll provider schema mapping pack created.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollProviderSchemaMappingPackImportView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = import_payroll_provider_schema_mapping_pack_for_actor(
                employee,
                serializer.validated_data["mapping_pack"],
                provider_connection_id=serializer.validated_data.get("provider_connection_id"),
            )
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item, "Payroll provider schema mapping pack imported as draft.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollProviderSchemaMappingPackDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollProviderSchemaMappingPackSerializer(build_hr_admin_payroll_provider_schema_mapping_pack_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_payroll_provider_schema_mapping_pack_for_actor(employee, serializer.validated_data, item=item)
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item, "Payroll provider schema mapping pack updated.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data)


class HrAdminPayrollProviderSchemaMappingPackCloneView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackLifecycleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cloned = clone_payroll_provider_schema_mapping_pack_for_actor(
                employee,
                item,
                overrides=serializer.validated_data.get("overrides") or {},
            )
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(cloned, "Payroll provider schema mapping pack cloned as a draft version.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollProviderSchemaMappingPackActivateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackLifecycleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        approval_snapshot = serializer.validated_data.get("approval_snapshot") or {}
        if serializer.validated_data.get("approval_reason"):
            approval_snapshot = {
                **approval_snapshot,
                "approval_reason": serializer.validated_data["approval_reason"],
            }
        try:
            item = activate_payroll_provider_schema_mapping_pack_for_actor(
                employee,
                item,
                approval_snapshot=approval_snapshot,
            )
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item, "Payroll provider schema mapping pack activated.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data)


class HrAdminPayrollProviderSchemaMappingPackArchiveView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackLifecycleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = archive_payroll_provider_schema_mapping_pack_for_actor(
                employee,
                item,
                archive_reason=serializer.validated_data.get("archive_reason") or "",
            )
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = build_hr_admin_payroll_provider_schema_mapping_pack_action_payload(item, "Payroll provider schema mapping pack archived.")
        return response.Response(HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(payload).data)


class HrAdminPayrollProviderSchemaMappingPackSimulateView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderSchemaMappingPackSimulationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            simulation = simulate_payroll_provider_schema_mapping_pack_for_actor(
                employee,
                item,
                request_snapshot=serializer.validated_data.get("request_snapshot"),
                mapping_contract_overrides=serializer.validated_data.get("mapping_contract") or {},
            )
        except PayrollProviderSchemaMappingPackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = {
            "mapping_pack": build_hr_admin_payroll_provider_schema_mapping_pack_payload(item),
            "simulation_run": build_hr_admin_payroll_provider_schema_mapping_simulation_payload(
                PayrollProviderSchemaMappingSimulation.objects.get(id=simulation["simulation_run_id"])
            ),
            "simulation": simulation,
            "detail": "Payroll provider schema mapping simulation completed.",
        }
        return response.Response(HrAdminPayrollProviderSchemaMappingPackSimulationResultSerializer(payload).data)


class HrAdminPayrollProviderSchemaMappingPackExportView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = get_hr_admin_payroll_provider_schema_mapping_pack_or_404(employee, item_id)
        if not item:
            return response.Response({"detail": "Payroll provider schema mapping pack not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = {
            "mapping_pack": build_hr_admin_payroll_provider_schema_mapping_pack_payload(item),
            "export_payload": export_payroll_provider_schema_mapping_pack(item),
            "detail": "Payroll provider schema mapping pack export prepared.",
        }
        return response.Response(HrAdminPayrollProviderSchemaMappingPackExportSerializer(payload).data)


class HrAdminPayrollOutputBatchGenerateFinanceHandoffView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        batch = PayrollOutputBatch.objects.filter(tenant=employee.tenant, id=item_id).select_related("payroll_run", "review").first()
        if not batch:
            return response.Response({"detail": "Payroll output batch not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollGenerateFinanceHandoffRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            handoff = generate_payroll_finance_handoff(
                batch,
                generated_by=request.user,
                handoff_profile_ref=serializer.validated_data.get("handoff_profile_ref") or None,
            )
        except PayrollFinanceHandoffError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        handoff = PayrollFinanceHandoff.objects.select_related(
            "output_batch",
            "payroll_run",
            "review",
            "generated_by",
            "transmitted_by",
            "accepted_by",
        ).get(id=handoff.id)
        return response.Response(HrAdminPayrollFinanceHandoffActionResultSerializer(build_hr_admin_payroll_finance_handoff_action_payload(handoff, "Payroll finance handoff generated.")).data)


class HrAdminPayrollFinanceHandoffTransmitView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        handoff = PayrollFinanceHandoff.objects.filter(tenant=employee.tenant, id=item_id).select_related("output_batch", "payroll_run", "review").first()
        if not handoff:
            return response.Response({"detail": "Payroll finance handoff not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            handoff = transmit_payroll_finance_handoff(handoff, transmitted_by=request.user)
        except PayrollFinanceHandoffError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        handoff = PayrollFinanceHandoff.objects.select_related(
            "output_batch",
            "payroll_run",
            "review",
            "generated_by",
            "transmitted_by",
            "accepted_by",
        ).get(id=handoff.id)
        return response.Response(HrAdminPayrollFinanceHandoffActionResultSerializer(build_hr_admin_payroll_finance_handoff_action_payload(handoff, "Payroll finance handoff transmitted.")).data)


class HrAdminPayrollFinanceHandoffGenerateAuditPackView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        handoff = PayrollFinanceHandoff.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "output_batch",
            "payroll_run",
            "review",
            "generated_by",
            "transmitted_by",
            "accepted_by",
        ).first()
        if not handoff:
            return response.Response({"detail": "Payroll finance handoff not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollGenerateProviderAuditPackRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            generate_payroll_provider_audit_pack(
                handoff,
                generated_by=request.user,
                audit_pack_profile_ref=serializer.validated_data.get("audit_pack_profile_ref") or None,
            )
        except PayrollFinanceHandoffError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        handoff = PayrollFinanceHandoff.objects.select_related(
            "output_batch",
            "payroll_run",
            "review",
            "generated_by",
            "transmitted_by",
            "accepted_by",
        ).get(id=handoff.id)
        return response.Response(HrAdminPayrollFinanceHandoffActionResultSerializer(build_hr_admin_payroll_finance_handoff_action_payload(handoff, "Payroll provider audit pack generated.")).data)


class HrAdminPayrollFinanceHandoffAcknowledgeView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        handoff = PayrollFinanceHandoff.objects.filter(tenant=employee.tenant, id=item_id).select_related("output_batch", "payroll_run", "review", "transmitted_by").first()
        if not handoff:
            return response.Response({"detail": "Payroll finance handoff not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollFinanceHandoffAcknowledgeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            handoff = reconcile_payroll_finance_handoff(
                handoff,
                reconciled_by=request.user,
                acknowledgement_profile_ref=serializer.validated_data.get("acknowledgement_profile_ref") or None,
                provider_status=serializer.validated_data.get("provider_status") or PayrollProviderDeliveryStatus.RECONCILED,
                failure_code=serializer.validated_data.get("failure_code") or "",
                failure_reason=serializer.validated_data.get("failure_reason") or "",
                response_snapshot=serializer.validated_data.get("response_snapshot") or None,
            )
        except PayrollFinanceHandoffError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        handoff = PayrollFinanceHandoff.objects.select_related(
            "output_batch",
            "payroll_run",
            "review",
            "generated_by",
            "transmitted_by",
            "accepted_by",
        ).get(id=handoff.id)
        return response.Response(HrAdminPayrollFinanceHandoffActionResultSerializer(build_hr_admin_payroll_finance_handoff_action_payload(handoff, "Payroll finance handoff acknowledgement recorded.")).data)


class PayrollProviderCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PayrollProviderCallbackRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        request_source_ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR", "")
        try:
            event, replayed = ingest_payroll_provider_callback(
                provider_delivery_id=str(serializer.validated_data.get("provider_delivery_id") or ""),
                provider_ref=serializer.validated_data["provider_ref"],
                external_reference=serializer.validated_data.get("external_reference") or "",
                external_event_id=serializer.validated_data.get("external_event_id") or "",
                idempotency_key=serializer.validated_data["idempotency_key"],
                event_timestamp=serializer.validated_data.get("event_timestamp"),
                source_ip=serializer.validated_data.get("source_ip") or request_source_ip,
                provider_status=serializer.validated_data["provider_status"],
                payload_snapshot=serializer.validated_data.get("payload_snapshot") or {},
                signature=serializer.validated_data["signature"],
            )
        except PayrollProviderCallbackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        event = PayrollProviderCallbackEvent.objects.select_related("provider_delivery", "output_artifact").get(id=event.id)
        payload = {
            "callback_event": build_hr_admin_payroll_provider_callback_event_payload(event),
            "delivery": build_hr_admin_payroll_provider_delivery_payload(event.provider_delivery),
            "replayed": replayed,
            "detail": "Provider callback replay ignored." if replayed else "Provider callback processed.",
        }
        response_status = status.HTTP_200_OK
        if event.status == PayrollProviderCallbackEventStatus.REJECTED:
            payload["detail"] = event.failure_reason or "Provider callback rejected."
            response_status = status.HTTP_400_BAD_REQUEST
        return response.Response(PayrollProviderCallbackResultSerializer(payload).data, status=response_status)


class HrAdminPayrollProviderDeliveryScheduleRetryView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        delivery = PayrollProviderDelivery.objects.filter(tenant=employee.tenant, id=item_id).select_related("handoff", "output_artifact").first()
        if not delivery:
            return response.Response({"detail": "Payroll provider delivery not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderRetryScheduleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            retry_event = schedule_payroll_provider_delivery_retry(
                delivery,
                requested_by=request.user,
                retry_reason=serializer.validated_data.get("retry_reason") or "",
                scheduled_for=serializer.validated_data.get("scheduled_for"),
            )
        except PayrollProviderRetryError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        retry_event = PayrollProviderRetryEvent.objects.select_related("provider_delivery", "output_artifact", "requested_by", "executed_by").get(id=retry_event.id)
        payload = {
            "retry_event": build_hr_admin_payroll_provider_retry_event_payload(retry_event),
            "delivery": build_hr_admin_payroll_provider_delivery_payload(retry_event.provider_delivery),
            "detail": "Payroll provider delivery retry scheduled." if retry_event.status == PayrollProviderRetryEventStatus.SCHEDULED else "Payroll provider delivery moved to dead letter.",
        }
        return response.Response(HrAdminPayrollProviderRetryActionResultSerializer(payload).data)


class HrAdminPayrollProviderDeliveryRequeueView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        delivery = PayrollProviderDelivery.objects.filter(tenant=employee.tenant, id=item_id).select_related("handoff", "output_artifact").first()
        if not delivery:
            return response.Response({"detail": "Payroll provider delivery not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollProviderRetryRequeueRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        retry_event = None
        if serializer.validated_data.get("retry_event_id"):
            retry_event = PayrollProviderRetryEvent.objects.filter(
                tenant=employee.tenant,
                id=serializer.validated_data["retry_event_id"],
                provider_delivery=delivery,
            ).select_related("provider_delivery", "output_artifact").first()
            if not retry_event:
                return response.Response({"detail": "Payroll provider retry event not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            retry_event = requeue_payroll_provider_delivery(delivery, executed_by=request.user, retry_event=retry_event)
        except PayrollProviderRetryError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        retry_event = PayrollProviderRetryEvent.objects.select_related("provider_delivery", "output_artifact", "requested_by", "executed_by").get(id=retry_event.id)
        payload = {
            "retry_event": build_hr_admin_payroll_provider_retry_event_payload(retry_event),
            "delivery": build_hr_admin_payroll_provider_delivery_payload(retry_event.provider_delivery),
            "detail": "Payroll provider delivery requeued.",
        }
        return response.Response(HrAdminPayrollProviderRetryActionResultSerializer(payload).data)


class HrAdminPayrollStatutorySetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutorySetupSerializer(get_hr_admin_payroll_statutory_setup_payload(employee)).data)


class HrAdminPayrollStatutoryPackListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollStatutoryPack.objects.filter(tenant=employee.tenant).order_by("country_code", "name", "-effective_from")
        return response.Response(HrAdminPayrollStatutoryPackSerializer([build_hr_admin_payroll_statutory_pack_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryPackWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_pack(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryPackSerializer(build_hr_admin_payroll_statutory_pack_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollStatutoryPackDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryPack.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory pack not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutoryPackSerializer(build_hr_admin_payroll_statutory_pack_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryPack.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory pack not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryPackWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_pack(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryPackSerializer(build_hr_admin_payroll_statutory_pack_payload(item)).data)


class HrAdminPayrollStatutoryComponentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollStatutoryComponent.objects.filter(tenant=employee.tenant).select_related(
            "statutory_pack", "salary_component"
        ).order_by("statutory_pack__name", "statutory_type", "name")
        return response.Response(HrAdminPayrollStatutoryComponentSerializer([build_hr_admin_payroll_statutory_component_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryComponentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_component(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryComponentSerializer(build_hr_admin_payroll_statutory_component_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollStatutoryComponentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryComponent.objects.filter(tenant=employee.tenant, id=item_id).select_related("statutory_pack", "salary_component").first()
        if not item:
            return response.Response({"detail": "Payroll statutory component not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutoryComponentSerializer(build_hr_admin_payroll_statutory_component_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryComponent.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory component not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryComponentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_component(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryComponentSerializer(build_hr_admin_payroll_statutory_component_payload(item)).data)


class HrAdminPayrollStatutorySlabListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollStatutorySlab.objects.filter(tenant=employee.tenant).select_related(
            "statutory_component"
        ).order_by("statutory_component__code", "slab_order", "min_amount")
        return response.Response(HrAdminPayrollStatutorySlabSerializer([build_hr_admin_payroll_statutory_slab_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutorySlabWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_slab(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutorySlabSerializer(build_hr_admin_payroll_statutory_slab_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminPayrollStatutorySlabDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutorySlab.objects.filter(tenant=employee.tenant, id=item_id).select_related("statutory_component").first()
        if not item:
            return response.Response({"detail": "Payroll statutory slab not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutorySlabSerializer(build_hr_admin_payroll_statutory_slab_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutorySlab.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory slab not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutorySlabWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_slab(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutorySlabSerializer(build_hr_admin_payroll_statutory_slab_payload(item)).data)


class HrAdminPayrollStatutoryEmployerRegistrationListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollStatutoryEmployerRegistration.objects.filter(tenant=employee.tenant).select_related(
            "statutory_pack", "statutory_component", "legal_entity", "branch", "location"
        ).order_by("statutory_pack__name", "registration_type_ref", "name")
        return response.Response(
            HrAdminPayrollStatutoryEmployerRegistrationSerializer(
                [build_hr_admin_payroll_statutory_employer_registration_payload(item) for item in items],
                many=True,
            ).data
        )

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryEmployerRegistrationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_employer_registration(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(
            HrAdminPayrollStatutoryEmployerRegistrationSerializer(
                build_hr_admin_payroll_statutory_employer_registration_payload(item)
            ).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminPayrollStatutoryEmployerRegistrationDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryEmployerRegistration.objects.filter(
            tenant=employee.tenant,
            id=item_id,
        ).select_related("statutory_pack", "statutory_component", "legal_entity", "branch", "location").first()
        if not item:
            return response.Response({"detail": "Payroll statutory employer registration not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutoryEmployerRegistrationSerializer(build_hr_admin_payroll_statutory_employer_registration_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryEmployerRegistration.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory employer registration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryEmployerRegistrationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_employer_registration(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryEmployerRegistrationSerializer(build_hr_admin_payroll_statutory_employer_registration_payload(item)).data)


class HrAdminPayrollStatutoryFilingCalendarListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = PayrollStatutoryFilingCalendar.objects.filter(tenant=employee.tenant).select_related(
            "statutory_pack", "statutory_component", "employer_registration"
        ).order_by("due_date", "statutory_pack__name", "filing_type_ref")
        return response.Response(
            HrAdminPayrollStatutoryFilingCalendarSerializer(
                [build_hr_admin_payroll_statutory_filing_calendar_payload(item) for item in items],
                many=True,
            ).data
        )

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryFilingCalendarWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_filing_calendar(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(
            HrAdminPayrollStatutoryFilingCalendarSerializer(
                build_hr_admin_payroll_statutory_filing_calendar_payload(item)
            ).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminPayrollStatutoryFilingCalendarDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryFilingCalendar.objects.filter(
            tenant=employee.tenant,
            id=item_id,
        ).select_related("statutory_pack", "statutory_component", "employer_registration").first()
        if not item:
            return response.Response({"detail": "Payroll statutory filing calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminPayrollStatutoryFilingCalendarSerializer(build_hr_admin_payroll_statutory_filing_calendar_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = PayrollStatutoryFilingCalendar.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Payroll statutory filing calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminPayrollStatutoryFilingCalendarWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_payroll_statutory_filing_calendar(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminPayrollStatutoryFilingCalendarSerializer(build_hr_admin_payroll_statutory_filing_calendar_payload(item)).data)


class HrAdminEmployeeStatutoryProfileListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeStatutoryProfile.objects.filter(tenant=employee.tenant).select_related(
            "employee", "statutory_pack"
        ).order_by("employee__employee_code", "-effective_from")
        return response.Response(HrAdminEmployeeStatutoryProfileSerializer([build_hr_admin_employee_statutory_profile_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryProfileWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_profile(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryProfileSerializer(build_hr_admin_employee_statutory_profile_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeStatutoryProfileDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryProfile.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "statutory_pack").first()
        if not item:
            return response.Response({"detail": "Employee statutory profile not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeStatutoryProfileSerializer(build_hr_admin_employee_statutory_profile_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryProfile.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Employee statutory profile not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryProfileWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_profile(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryProfileSerializer(build_hr_admin_employee_statutory_profile_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").order_by("employee__employee_code", "-financial_year_code")
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer([build_hr_admin_employee_statutory_declaration_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_declaration(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeStatutoryDeclarationDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_declaration(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationSubmitView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            item = submit_hr_admin_employee_statutory_declaration(item, submitted_by=request.user)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationVerifyView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            item = verify_hr_admin_employee_statutory_declaration(item, verified_by=request.user)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationRejectView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = reject_hr_admin_employee_statutory_declaration(item, rejected_by=request.user, reason=serializer.validated_data["reason"])
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationLockView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee", "employee_statutory_profile", "statutory_pack", "submitted_by", "verified_by", "rejected_by", "locked_by"
        ).prefetch_related("items").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            item = lock_hr_admin_employee_statutory_declaration(item, locked_by=request.user)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationSerializer(build_hr_admin_employee_statutory_declaration_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationItemListCreateView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        declaration = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not declaration:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, declaration=declaration).select_related(
            "declaration", "employee", "verified_by", "rejected_by"
        ).order_by("section_code", "component_code")
        return response.Response(HrAdminEmployeeStatutoryDeclarationItemSerializer([build_hr_admin_employee_statutory_declaration_item_payload(item) for item in items], many=True).data)

    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        declaration = EmployeeStatutoryDeclaration.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee").first()
        if not declaration:
            return response.Response({"detail": "Employee statutory declaration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_declaration_item(employee, declaration, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationItemSerializer(build_hr_admin_employee_statutory_declaration_item_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeStatutoryDeclarationItemDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "declaration", "employee", "verified_by", "rejected_by"
        ).first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration item not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeStatutoryDeclarationItemSerializer(build_hr_admin_employee_statutory_declaration_item_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, id=item_id).select_related("declaration", "employee").first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration item not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationItemWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_statutory_declaration_item(employee, item.declaration, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationItemSerializer(build_hr_admin_employee_statutory_declaration_item_payload(item)).data)


class HrAdminEmployeeStatutoryDeclarationItemVerifyView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeStatutoryDeclarationItem.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "declaration", "employee", "verified_by", "rejected_by"
        ).first()
        if not item:
            return response.Response({"detail": "Employee statutory declaration item not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeStatutoryDeclarationItemVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = verify_hr_admin_employee_statutory_declaration_item(item, serializer.validated_data, verified_by=request.user)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as exc:
            return response.Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminEmployeeStatutoryDeclarationItemSerializer(build_hr_admin_employee_statutory_declaration_item_payload(item)).data)


class HrAdminSalarySetupView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminSalarySetupSerializer(get_hr_admin_salary_setup_payload(employee)).data)


class HrAdminSalaryComponentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = SalaryComponent.objects.filter(tenant=employee.tenant).order_by("component_type", "name")
        return response.Response(HrAdminSalaryComponentSerializer([build_hr_admin_salary_component_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryComponentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_component(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminSalaryComponentSerializer(build_hr_admin_salary_component_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminSalaryComponentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryComponent.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Salary component not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminSalaryComponentSerializer(build_hr_admin_salary_component_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryComponent.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Salary component not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryComponentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_component(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        return response.Response(HrAdminSalaryComponentSerializer(build_hr_admin_salary_component_payload(item)).data)


class HrAdminSalaryStructureListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = SalaryStructure.objects.filter(tenant=employee.tenant).select_related("pay_group").order_by("name")
        return response.Response(HrAdminSalaryStructureSerializer([build_hr_admin_salary_structure_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructure.objects.select_related("pay_group").get(id=item.id)
        return response.Response(HrAdminSalaryStructureSerializer(build_hr_admin_salary_structure_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminSalaryStructureDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructure.objects.filter(tenant=employee.tenant, id=item_id).select_related("pay_group").first()
        if not item:
            return response.Response({"detail": "Salary structure not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminSalaryStructureSerializer(build_hr_admin_salary_structure_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructure.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Salary structure not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructure.objects.select_related("pay_group").get(id=item.id)
        return response.Response(HrAdminSalaryStructureSerializer(build_hr_admin_salary_structure_payload(item)).data)


class HrAdminSalaryStructureVersionListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = SalaryStructureVersion.objects.filter(tenant=employee.tenant).select_related("structure").order_by("structure__name", "-effective_from")
        return response.Response(HrAdminSalaryStructureVersionSerializer([build_hr_admin_salary_structure_version_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureVersionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure_version(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructureVersion.objects.select_related("structure").get(id=item.id)
        return response.Response(HrAdminSalaryStructureVersionSerializer(build_hr_admin_salary_structure_version_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminSalaryStructureVersionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructureVersion.objects.filter(tenant=employee.tenant, id=item_id).select_related("structure").first()
        if not item:
            return response.Response({"detail": "Salary structure version not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminSalaryStructureVersionSerializer(build_hr_admin_salary_structure_version_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructureVersion.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Salary structure version not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureVersionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure_version(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructureVersion.objects.select_related("structure").get(id=item.id)
        return response.Response(HrAdminSalaryStructureVersionSerializer(build_hr_admin_salary_structure_version_payload(item)).data)


class HrAdminSalaryStructureComponentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = SalaryStructureComponent.objects.filter(tenant=employee.tenant).select_related("structure_version__structure", "component")
        return response.Response(HrAdminSalaryStructureComponentSerializer([build_hr_admin_salary_structure_component_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureComponentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure_component(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructureComponent.objects.select_related("structure_version__structure", "component").get(id=item.id)
        return response.Response(HrAdminSalaryStructureComponentSerializer(build_hr_admin_salary_structure_component_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminSalaryStructureComponentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructureComponent.objects.filter(tenant=employee.tenant, id=item_id).select_related("structure_version__structure", "component").first()
        if not item:
            return response.Response({"detail": "Salary structure component not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminSalaryStructureComponentSerializer(build_hr_admin_salary_structure_component_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = SalaryStructureComponent.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Salary structure component not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminSalaryStructureComponentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_salary_structure_component(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = SalaryStructureComponent.objects.select_related("structure_version__structure", "component").get(id=item.id)
        return response.Response(HrAdminSalaryStructureComponentSerializer(build_hr_admin_salary_structure_component_payload(item)).data)


class HrAdminEmployeeSalaryAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeSalaryAssignment.objects.filter(tenant=employee.tenant).select_related("employee", "structure_version__structure")
        return response.Response(HrAdminEmployeeSalaryAssignmentSerializer([build_hr_admin_employee_salary_assignment_payload(item) for item in items], many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeSalaryAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_salary_assignment(employee, serializer.validated_data)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = EmployeeSalaryAssignment.objects.select_related("employee", "structure_version__structure").get(id=item.id)
        return response.Response(HrAdminEmployeeSalaryAssignmentSerializer(build_hr_admin_employee_salary_assignment_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeSalaryAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeSalaryAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "structure_version__structure").first()
        if not item:
            return response.Response({"detail": "Employee salary assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeSalaryAssignmentSerializer(build_hr_admin_employee_salary_assignment_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeSalaryAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Employee salary assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeSalaryAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            item = save_hr_admin_employee_salary_assignment(employee, serializer.validated_data, item=item)
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        item = EmployeeSalaryAssignment.objects.select_related("employee", "structure_version__structure").get(id=item.id)
        return response.Response(HrAdminEmployeeSalaryAssignmentSerializer(build_hr_admin_employee_salary_assignment_payload(item)).data)


class HrAdminReportExportView(HrAdminContextMixin, APIView):
    REPORT_EXPORTS = {
        "workforce": {
            "filename": "workforce-report.csv",
            "builder": get_hr_admin_workforce_export,
        },
        "pending-approvals": {
            "filename": "pending-approvals-report.csv",
            "builder": get_hr_admin_pending_approvals_export,
        },
        "document-compliance": {
            "filename": "document-compliance-report.csv",
            "builder": get_hr_admin_document_compliance_export,
        },
        "notification-queue": {
            "filename": "notification-queue-report.csv",
            "builder": get_hr_admin_notification_queue_export,
        },
        "lifecycle-queue": {
            "filename": "lifecycle-queue-report.csv",
            "builder": get_hr_admin_lifecycle_queue_export,
        },
    }

    def get(self, request, report_key):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        config = self.REPORT_EXPORTS.get(report_key)
        if not config:
            return response.Response({"detail": "Unknown report export."}, status=status.HTTP_404_NOT_FOUND)

        rows = config["builder"](employee)
        output = StringIO()
        fieldnames = list(rows[0].keys()) if rows else ["message"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        if rows:
            writer.writerows(rows)
        else:
            writer.writerow({"message": "No data available"})

        csv_response = HttpResponse(output.getvalue(), content_type="text/csv")
        csv_response["Content-Disposition"] = f'attachment; filename="{config["filename"]}"'
        return csv_response


class HrAdminReportExportAuditSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    actor_display = serializers.CharField(required=False, allow_blank=True)
    report_key = serializers.SlugField(max_length=120)
    export_type = serializers.ChoiceField(choices=PayrollReportExportAuditType.choices)
    filters = serializers.DictField(required=False)
    row_count = serializers.IntegerField(min_value=0)
    checksum_sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
    content_type = serializers.CharField(max_length=120)
    source_endpoints = serializers.ListField(child=serializers.CharField(), required=False)
    evidence_columns = serializers.ListField(child=serializers.CharField(), required=False)
    request_identifier = serializers.CharField(required=False, allow_blank=True, max_length=120)
    user_agent = serializers.CharField(required=False, allow_blank=True)
    generated_at = serializers.DateTimeField(required=False)
    source_hash = serializers.CharField(read_only=True)


def _payroll_report_export_audit_payload(item: PayrollReportExportAudit) -> dict:
    return {
        "id": item.id,
        "actor_display": item.actor_display,
        "report_key": item.report_key,
        "export_type": item.export_type,
        "filters": item.filters,
        "row_count": item.row_count,
        "checksum_sha256": item.checksum_sha256,
        "content_type": item.content_type,
        "source_endpoints": item.source_endpoints,
        "evidence_columns": item.evidence_columns,
        "request_identifier": item.request_identifier,
        "user_agent": item.user_agent,
        "generated_at": item.generated_at,
        "source_hash": item.source_hash,
    }


class HrAdminReportExportAuditListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = PayrollReportExportAudit.objects.filter(tenant=employee.tenant)
        report_key = request.query_params.get("report_key")
        export_type = request.query_params.get("export_type")
        query = request.query_params.get("q")
        if report_key:
            queryset = queryset.filter(report_key=report_key)
        if export_type:
            queryset = queryset.filter(export_type=export_type)
        if query:
            queryset = queryset.filter(
                Q(actor_display__icontains=query)
                | Q(report_key__icontains=query)
                | Q(checksum_sha256__icontains=query)
                | Q(request_identifier__icontains=query)
            )
        items = [_payroll_report_export_audit_payload(item) for item in queryset[:200]]
        return response.Response({
            "items": HrAdminReportExportAuditSerializer(items, many=True).data,
            "count": queryset.count(),
        })

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminReportExportAuditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = getattr(employee, "membership", None)
        item = PayrollReportExportAudit.objects.create(
            tenant=employee.tenant,
            actor_user=request.user,
            actor_membership_ref=str(membership.id) if membership else "",
            actor_display=serializer.validated_data.get("actor_display") or employee.employee_code,
            report_key=serializer.validated_data["report_key"],
            export_type=serializer.validated_data["export_type"],
            filters=serializer.validated_data.get("filters") or {},
            row_count=serializer.validated_data["row_count"],
            checksum_sha256=serializer.validated_data["checksum_sha256"],
            content_type=serializer.validated_data["content_type"],
            source_endpoints=serializer.validated_data.get("source_endpoints") or [],
            evidence_columns=serializer.validated_data.get("evidence_columns") or [],
            request_identifier=serializer.validated_data.get("request_identifier") or "",
            user_agent=serializer.validated_data.get("user_agent") or "",
            generated_at=serializer.validated_data.get("generated_at") or timezone.now(),
        )
        return response.Response(HrAdminReportExportAuditSerializer(_payroll_report_export_audit_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_employee_list(employee)
        return response.Response(HrAdminEmployeeListItemSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_employee(employee, serializer.validated_data)
        payload = get_hr_admin_employee_detail(employee, item.id)
        return response.Response(HrAdminEmployeeDetailSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeDetailView(HrAdminContextMixin, APIView):
    def get(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_employee_detail(employee, employee_id)
        if not payload:
            return response.Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeDetailSerializer(payload).data)

    def patch(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Employee.objects.filter(tenant=employee.tenant, id=employee_id).first()
        if not item:
            return response.Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_employee(employee, serializer.validated_data, item=item)
        payload = get_hr_admin_employee_detail(employee, item.id)
        return response.Response(HrAdminEmployeeDetailSerializer(payload).data)


def build_hr_admin_employee_bank_account_payload(item: EmployeeBankAccount) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_code": item.employee.employee_code,
        "employee_name": _employee_display_name(item.employee),
        "account_holder_name": item.account_holder_name,
        "bank_name": item.bank_name,
        "account_number": item.account_number,
        "ifsc_code": item.ifsc_code,
        "branch_name": item.branch_name,
        "is_primary": item.is_primary,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


class HrAdminEmployeeBankAccountListCreateView(HrAdminContextMixin, APIView):
    def get(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        employee_record = Employee.objects.filter(tenant=employee.tenant, id=employee_id).first()
        if not employee_record:
            return response.Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        items = employee_record.bank_accounts.select_related("employee").order_by("-is_primary", "bank_name", "created_at")
        return response.Response(HrAdminEmployeeBankAccountSerializer([build_hr_admin_employee_bank_account_payload(item) for item in items], many=True).data)

    @transaction.atomic
    def post(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        employee_record = Employee.objects.filter(tenant=employee.tenant, id=employee_id).first()
        if not employee_record:
            return response.Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeBankAccountWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get("is_primary", True):
            employee_record.bank_accounts.filter(is_primary=True).update(is_primary=False)
        item = EmployeeBankAccount.objects.create(
            employee=employee_record,
            account_holder_name=data["account_holder_name"],
            bank_name=data["bank_name"],
            account_number=data["account_number"],
            ifsc_code=data.get("ifsc_code", ""),
            branch_name=data.get("branch_name", ""),
            is_primary=data.get("is_primary", True),
        )
        return response.Response(HrAdminEmployeeBankAccountSerializer(build_hr_admin_employee_bank_account_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeBankAccountDetailView(HrAdminContextMixin, APIView):
    def _get_item(self, actor, employee_id, item_id):
        return EmployeeBankAccount.objects.filter(
            employee__tenant=actor.tenant,
            employee_id=employee_id,
            id=item_id,
        ).select_related("employee").first()

    @transaction.atomic
    def patch(self, request, employee_id, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = self._get_item(employee, employee_id, item_id)
        if not item:
            return response.Response({"detail": "Bank account not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeBankAccountWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get("is_primary") is True:
            item.employee.bank_accounts.exclude(id=item.id).filter(is_primary=True).update(is_primary=False)
        for field_name in ["account_holder_name", "bank_name", "account_number", "ifsc_code", "branch_name", "is_primary"]:
            if field_name in data:
                setattr(item, field_name, data[field_name])
        item.save()
        return response.Response(HrAdminEmployeeBankAccountSerializer(build_hr_admin_employee_bank_account_payload(item)).data)


class HrAdminEmployeeFormOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_employee_form_options(employee)
        return response.Response(HrAdminEmployeeFormOptionsSerializer(payload).data)


class HrAdminEmployeeAccessOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_employee_access_options(employee)
        return response.Response(HrAdminEmployeeAccessOptionsSerializer(payload).data)


class HrAdminEmployeeAccessDetailView(HrAdminContextMixin, APIView):
    def get(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_employee_access_detail(employee, employee_id)
        if not payload:
            return response.Response({"detail": "Employee access not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeAccessDetailSerializer(payload).data)

    def post(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeAccessWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = save_hr_admin_employee_access(employee, employee_id, serializer.validated_data)
        return response.Response(HrAdminEmployeeAccessDetailSerializer(payload).data, status=status.HTTP_201_CREATED)

    def patch(self, request, employee_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeAccessWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        detail = get_hr_admin_employee_access_detail(employee, employee_id)
        if not detail:
            return response.Response({"detail": "Employee access not found."}, status=status.HTTP_404_NOT_FOUND)
        merged_payload = {
            "username": detail["username"],
            "email": detail["email"],
            "first_name": detail["first_name"],
            "last_name": detail["last_name"],
            "display_name": detail["display_name"],
            "phone_number": detail["phone_number"],
            "is_user_active": detail["is_user_active"],
            "must_change_password": detail["must_change_password"],
            "membership_status": detail["membership_status"],
            "is_default_membership": detail["is_default_membership"],
            "role_ids": detail["role_ids"],
        }
        merged_payload.update(serializer.validated_data)
        payload = save_hr_admin_employee_access(employee, employee_id, merged_payload)
        return response.Response(HrAdminEmployeeAccessDetailSerializer(payload).data)


class HrAdminOrganizationSnapshotView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_organization_snapshot(employee)
        return response.Response(HrAdminOrganizationSnapshotSerializer(payload).data)


class HrAdminOrganizationFormOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_organization_form_options(employee)
        return response.Response(HrAdminOrganizationFormOptionsSerializer(payload).data)


class HrAdminOrganizationSectionListCreateView(HrAdminContextMixin, APIView):
    def post(self, request, section):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminOrganizationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_organization_item(employee, section, serializer.validated_data)
        payload = get_hr_admin_organization_item_detail(employee, section, item.id)
        return response.Response(HrAdminOrganizationItemSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminOrganizationSectionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, section, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_hr_admin_organization_item_detail(employee, section, item_id)
        if not payload:
            return response.Response({"detail": "Organization item not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminOrganizationItemSerializer(payload).data)

    def patch(self, request, section, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        model_class = ORGANIZATION_MODEL_MAP.get(section)
        if model_class is None:
            return response.Response({"detail": "Unsupported organization section."}, status=status.HTTP_400_BAD_REQUEST)
        item = model_class.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Organization item not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminOrganizationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_organization_item(employee, section, serializer.validated_data, item=item)
        payload = get_hr_admin_organization_item_detail(employee, section, item.id)
        return response.Response(HrAdminOrganizationItemSerializer(payload).data)


class HrAdminPolicyOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = {
            "leave_categories": [{"value": value, "label": label} for value, label in LeaveCategory.choices],
            "leave_units": [{"value": value, "label": label} for value, label in LeaveUnit.choices],
            "accrual_frequencies": [{"value": value, "label": label} for value, label in AccrualFrequency.choices],
            "leave_policy_statuses": [{"value": value, "label": label} for value, label in LeavePolicyStatus.choices],
            "attendance_statuses": [{"value": value, "label": label} for value, label in AttendanceStatus.choices],
            "attendance_units": [{"value": value, "label": label} for value, label in AttendanceUnit.choices],
            "attendance_policy_statuses": [{"value": value, "label": label} for value, label in AttendancePolicyStatus.choices],
            "leave_types": [{"id": item.id, "name": item.name} for item in LeaveType.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "leave_policies": [{"id": item.id, "name": item.name} for item in LeavePolicy.objects.filter(tenant=employee.tenant).order_by("name")],
            "attendance_policies": [{"id": item.id, "name": item.name} for item in AttendancePolicy.objects.filter(tenant=employee.tenant).order_by("name")],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "locations": [{"id": item.id, "name": item.name} for item in Location.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "departments": [{"id": item.id, "name": item.name} for item in Department.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "grades": [{"id": item.id, "name": item.name} for item in Grade.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "employment_types": [{"id": item.id, "name": item.name} for item in EmploymentType.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "employees": [{"id": item.id, "name": f"{item.first_name} {item.last_name}".strip() or item.employee_code} for item in Employee.objects.filter(tenant=employee.tenant).order_by("employee_code")],
            "shifts": [{"id": shift.id, "name": shift.name} for shift in Shift.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "holiday_calendars": [{"id": calendar.id, "name": calendar.name} for calendar in HolidayCalendar.objects.filter(tenant=employee.tenant, is_active=True).order_by("name", "year")],
        }
        return response.Response(HrAdminPolicyOptionsSerializer(payload).data)


class HrAdminAttendanceOperationOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = {
            "attendance_statuses": [{"value": value, "label": label} for value, label in AttendanceStatus.choices],
            "attendance_sources": [{"value": value, "label": label} for value, label in AttendanceSource.choices],
            "regularization_statuses": [{"value": value, "label": label} for value, label in AttendanceRegularization._meta.get_field("status").choices],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "locations": [{"id": item.id, "name": item.name} for item in Location.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")],
            "employees": [{"id": item.id, "name": f"{item.first_name} {item.last_name}".strip() or item.employee_code} for item in Employee.objects.filter(tenant=employee.tenant).order_by("employee_code")],
            "shifts": [{"id": item.id, "name": item.name} for item in Shift.objects.filter(tenant=employee.tenant).order_by("name")],
            "holiday_calendars": [{"id": item.id, "name": f"{item.name} ({item.year})"} for item in HolidayCalendar.objects.filter(tenant=employee.tenant).order_by("name", "year")],
        }
        return response.Response(HrAdminAttendanceOperationOptionsSerializer(payload).data)


class HrAdminShiftListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [build_hr_admin_shift_payload(item) for item in Shift.objects.filter(tenant=employee.tenant).order_by("name")]
        return response.Response(HrAdminShiftSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminShiftWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_shift(employee, serializer.validated_data)
        return response.Response(HrAdminShiftSerializer(build_hr_admin_shift_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminShiftDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Shift.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Shift not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminShiftSerializer(build_hr_admin_shift_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Shift.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Shift not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminShiftWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_shift(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminShiftSerializer(build_hr_admin_shift_payload(item)).data)


class HrAdminShiftDetachView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Shift.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Shift not found."}, status=status.HTTP_404_NOT_FOUND)
        item = detach_runtime_item_from_platform_source(
            policy_item=item,
            actor_identifier=employee.employee_code,
        )
        return response.Response(HrAdminShiftSerializer(build_hr_admin_shift_payload(item)).data)


class HrAdminHolidayCalendarListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = HolidayCalendar.objects.filter(tenant=employee.tenant).select_related("legal_entity", "branch", "location").prefetch_related("holidays").order_by("year", "name")
        payload = [build_hr_admin_holiday_calendar_payload(item) for item in items]
        return response.Response(HrAdminHolidayCalendarSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminHolidayCalendarWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_holiday_calendar(employee, serializer.validated_data)
        item = HolidayCalendar.objects.filter(id=item.id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        return response.Response(HrAdminHolidayCalendarSerializer(build_hr_admin_holiday_calendar_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminHolidayCalendarDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = HolidayCalendar.objects.filter(tenant=employee.tenant, id=item_id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        if not item:
            return response.Response({"detail": "Holiday calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminHolidayCalendarSerializer(build_hr_admin_holiday_calendar_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = HolidayCalendar.objects.filter(tenant=employee.tenant, id=item_id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        if not item:
            return response.Response({"detail": "Holiday calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminHolidayCalendarWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_holiday_calendar(employee, serializer.validated_data, item=item)
        item = HolidayCalendar.objects.filter(id=item.id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        return response.Response(HrAdminHolidayCalendarSerializer(build_hr_admin_holiday_calendar_payload(item)).data)


class HrAdminHolidayCalendarDetachView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = HolidayCalendar.objects.filter(tenant=employee.tenant, id=item_id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        if not item:
            return response.Response({"detail": "Holiday calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        item = detach_runtime_item_from_platform_source(
            policy_item=item,
            actor_identifier=employee.employee_code,
        )
        item = HolidayCalendar.objects.filter(id=item.id).select_related("legal_entity", "branch", "location").prefetch_related("holidays").first()
        return response.Response(HrAdminHolidayCalendarSerializer(build_hr_admin_holiday_calendar_payload(item)).data)


class HrAdminAttendanceRecordListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        source_filter = (request.query_params.get("source") or "").strip()
        lock_state = (request.query_params.get("lock_state") or "").strip()
        regularized_state = (request.query_params.get("regularized_state") or "").strip()
        late_only = (request.query_params.get("late_only") or "").strip().lower() in {"1", "true", "yes"}

        queryset = AttendanceRecord.objects.filter(tenant=employee.tenant).select_related(
            "employee__department",
            "employee__designation",
            "shift",
            "holiday",
        )

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if source_filter:
            queryset = queryset.filter(source=source_filter)
        if lock_state == "locked":
            queryset = queryset.filter(is_locked=True)
        elif lock_state == "open":
            queryset = queryset.filter(is_locked=False)
        if regularized_state == "regularized":
            queryset = queryset.filter(is_regularized=True)
        elif regularized_state == "not_regularized":
            queryset = queryset.filter(is_regularized=False)
        if late_only:
            queryset = queryset.filter(late_minutes__gt=0)
        if search_value:
            date_value = parse_date(search_value)
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(shift__name__icontains=search_value)
                | Q(source__icontains=search_value)
                | Q(status__icontains=search_value)
            )
            if date_value:
                search_query |= Q(attendance_date=date_value)
            queryset = queryset.filter(search_query)

        queryset = queryset.order_by("-attendance_date", "employee__employee_code")
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_attendance_record_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminAttendanceRecordListSerializer(payload).data)


class HrAdminAttendanceRecordBulkActionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendanceRecordBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        record_ids = serializer.validated_data["record_ids"]
        queryset = AttendanceRecord.objects.filter(tenant=employee.tenant, id__in=record_ids)
        update_kwargs = {"updated_at": timezone.now()}
        if action == "lock":
            update_kwargs["is_locked"] = True
        elif action == "unlock":
            update_kwargs["is_locked"] = False
        elif action == "set_status":
            update_kwargs["status"] = serializer.validated_data["status"]
        elif action == "mark_regularized":
            update_kwargs["is_regularized"] = True
        elif action == "clear_regularized":
            update_kwargs["is_regularized"] = False
        updated_count = queryset.update(**update_kwargs)
        payload = {"action": action, "updated_count": updated_count}
        return response.Response(BulkMutationResultSerializer(payload).data)


class HrAdminLifecycleOwnerBulkActionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLifecycleOwnerBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_type = serializer.validated_data["record_type"]
        record_ids = serializer.validated_data["record_ids"]
        owner_value = serializer.validated_data.get("owner_value", "")
        tenant = employee.tenant
        updated_at = timezone.now()

        if record_type == "onboarding":
            owner_identifier = _get_lifecycle_owner_identifier(owner_value)
            updated_count = EmployeeOnboarding.objects.filter(tenant=tenant, id__in=record_ids).update(
                assigned_owner_identifier=owner_identifier,
                updated_at=updated_at,
            )
        elif record_type == "probation":
            owner_identifier = _get_lifecycle_owner_identifier(owner_value)
            updated_count = ProbationReview.objects.filter(tenant=tenant, id__in=record_ids).update(
                reviewer_identifier=owner_identifier,
                updated_at=updated_at,
            )
        else:
            owner_employee = _resolve_lifecycle_owner_employee(tenant, owner_value)
            updated_count = EmployeeMovement.objects.filter(tenant=tenant, id__in=record_ids).update(
                to_manager=owner_employee,
                updated_at=updated_at,
            )

        payload = {"action": "assign_owner", "updated_count": updated_count}
        return response.Response(BulkMutationResultSerializer(payload).data)


class HrAdminLifecycleStatusBulkActionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLifecycleStatusBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_type = serializer.validated_data["record_type"]
        record_ids = serializer.validated_data["record_ids"]
        status_value = serializer.validated_data["status_value"]
        tenant = employee.tenant

        with transaction.atomic():
            if record_type == "onboarding":
                items = list(EmployeeOnboarding.objects.filter(tenant=tenant, id__in=record_ids))
                for item in items:
                    save_hr_admin_onboarding(employee, {"status": status_value}, item=item)
                updated_count = len(items)
            elif record_type == "probation":
                items = list(ProbationReview.objects.filter(tenant=tenant, id__in=record_ids))
                for item in items:
                    save_hr_admin_probation_review(employee, {"decision": status_value}, item=item)
                updated_count = len(items)
            else:
                items = list(EmployeeMovement.objects.filter(tenant=tenant, id__in=record_ids))
                for item in items:
                    save_hr_admin_movement(employee, {"status": status_value}, item=item)
                updated_count = len(items)

        payload = {"action": "set_status", "updated_count": updated_count}
        return response.Response(BulkMutationResultSerializer(payload).data)


class HrAdminAttendanceRecordDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = (
            AttendanceRecord.objects.filter(tenant=employee.tenant, id=item_id)
            .select_related("employee__department", "employee__designation", "shift", "holiday")
            .first()
        )
        if not item:
            return response.Response({"detail": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminAttendanceRecordSerializer(build_hr_admin_attendance_record_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = (
            AttendanceRecord.objects.filter(tenant=employee.tenant, id=item_id)
            .select_related("employee__department", "employee__designation", "shift", "holiday")
            .first()
        )
        if not item:
            return response.Response({"detail": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendanceRecordWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_attendance_record(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminAttendanceRecordSerializer(build_hr_admin_attendance_record_payload(item)).data)


class HrAdminAttendanceRegularizationListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        requested_status_filter = (request.query_params.get("requested_status") or "").strip()
        current_status_filter = (request.query_params.get("current_status") or "").strip()

        queryset = AttendanceRegularization.objects.filter(tenant=employee.tenant).select_related(
            "employee__department",
            "employee__designation",
            "attendance_record",
            "attendance_record__shift",
        )

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if requested_status_filter:
            queryset = queryset.filter(requested_status=requested_status_filter)
        if current_status_filter:
            queryset = queryset.filter(attendance_record__status=current_status_filter)
        if search_value:
            date_value = parse_date(search_value)
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(attendance_record__shift__name__icontains=search_value)
                | Q(reason__icontains=search_value)
                | Q(status__icontains=search_value)
                | Q(requested_status__icontains=search_value)
                | Q(attendance_record__status__icontains=search_value)
            )
            if date_value:
                search_query |= Q(attendance_record__attendance_date=date_value)
            queryset = queryset.filter(search_query)

        queryset = queryset.order_by("-created_at")
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_attendance_regularization_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminAttendanceRegularizationListSerializer(payload).data)


class HrAdminAttendanceRegularizationDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = (
            AttendanceRegularization.objects.filter(tenant=employee.tenant, id=item_id)
            .select_related("employee__department", "employee__designation", "attendance_record", "attendance_record__shift")
            .first()
        )
        if not item:
            return response.Response({"detail": "Attendance regularization not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(ManagerAttendanceApprovalItemSerializer(build_hr_admin_attendance_regularization_payload(item)).data)


class HrAdminAttendanceRegularizationApproveView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        regularization = AttendanceRegularization.objects.select_related(
            "employee__reporting_manager",
            "employee__membership",
            "attendance_record",
        ).filter(tenant=actor.tenant, id=item_id).first()
        if not regularization:
            return response.Response({"detail": "Attendance regularization not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regularization = resolve_regularization(
            regularization=regularization,
            actor_employee=actor,
            approve=True,
            comment=serializer.validated_data.get("comment", ""),
        )
        payload = {"id": regularization.id, "status": regularization.status, "workflow_reference": regularization.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class HrAdminAttendanceRegularizationRejectView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        regularization = AttendanceRegularization.objects.select_related(
            "employee__reporting_manager",
            "employee__membership",
            "attendance_record",
        ).filter(tenant=actor.tenant, id=item_id).first()
        if not regularization:
            return response.Response({"detail": "Attendance regularization not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regularization = resolve_regularization(
            regularization=regularization,
            actor_employee=actor,
            approve=False,
            comment=serializer.validated_data.get("comment", ""),
        )
        payload = {"id": regularization.id, "status": regularization.status, "workflow_reference": regularization.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class HrAdminLeaveTypeListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            build_hr_admin_leave_type_payload(item)
            for item in LeaveType.objects.filter(tenant=employee.tenant).order_by("name")
        ]
        return response.Response(HrAdminLeaveTypeSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeaveTypeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_type(employee, serializer.validated_data)
        return response.Response(HrAdminLeaveTypeSerializer(build_hr_admin_leave_type_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminLeaveTypeDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeaveType.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Leave type not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminLeaveTypeSerializer(build_hr_admin_leave_type_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeaveType.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Leave type not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeaveTypeWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_type(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminLeaveTypeSerializer(build_hr_admin_leave_type_payload(item)).data)


class HrAdminLeaveTypeDetachView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeaveType.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Leave type not found."}, status=status.HTTP_404_NOT_FOUND)
        item = detach_runtime_item_from_platform_source(
            policy_item=item,
            actor_identifier=employee.employee_code,
        )
        return response.Response(HrAdminLeaveTypeSerializer(build_hr_admin_leave_type_payload(item)).data)


class HrAdminAttendancePolicyListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            build_hr_admin_attendance_policy_payload(item)
            for item in AttendancePolicy.objects.filter(tenant=employee.tenant).select_related("default_shift", "holiday_calendar").order_by("name")
        ]
        return response.Response(HrAdminAttendancePolicySerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_attendance_policy(employee, serializer.validated_data)
        return response.Response(HrAdminAttendancePolicySerializer(build_hr_admin_attendance_policy_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminAttendancePolicyDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = AttendancePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("default_shift", "holiday_calendar").first()
        if not item:
            return response.Response({"detail": "Attendance policy not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminAttendancePolicySerializer(build_hr_admin_attendance_policy_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = AttendancePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("default_shift", "holiday_calendar").first()
        if not item:
            return response.Response({"detail": "Attendance policy not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_attendance_policy(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminAttendancePolicySerializer(build_hr_admin_attendance_policy_payload(item)).data)


class HrAdminAttendancePolicyDetachView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = AttendancePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("default_shift", "holiday_calendar").first()
        if not item:
            return response.Response({"detail": "Attendance policy not found."}, status=status.HTTP_404_NOT_FOUND)
        item = detach_runtime_item_from_platform_source(
            policy_item=item,
            actor_identifier=employee.employee_code,
        )
        return response.Response(HrAdminAttendancePolicySerializer(build_hr_admin_attendance_policy_payload(item)).data)


class HrAdminAttendancePolicyPreviewView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        preview_shift = None
        if serializer.validated_data.get("shift_id"):
            preview_shift = Shift.objects.filter(tenant=employee.tenant, id=serializer.validated_data["shift_id"]).first()
            if not preview_shift:
                return response.Response({"shift_id": ["Shift not found."]}, status=status.HTTP_400_BAD_REQUEST)
        default_shift = None
        if serializer.validated_data.get("default_shift_id"):
            default_shift = Shift.objects.filter(tenant=employee.tenant, id=serializer.validated_data["default_shift_id"]).first()
            if not default_shift:
                return response.Response({"default_shift_id": ["Default shift not found."]}, status=status.HTTP_400_BAD_REQUEST)
        holiday_calendar = None
        if serializer.validated_data.get("holiday_calendar_id"):
            holiday_calendar = HolidayCalendar.objects.filter(tenant=employee.tenant, id=serializer.validated_data["holiday_calendar_id"]).first()
            if not holiday_calendar:
                return response.Response({"holiday_calendar_id": ["Holiday calendar not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_attendance_policy_configuration(
            employee=target_employee,
            attendance_date=serializer.validated_data["attendance_date"],
            check_in_at=serializer.validated_data.get("requested_check_in_at"),
            check_out_at=serializer.validated_data.get("requested_check_out_at"),
            explicit_status=serializer.validated_data.get("requested_status"),
            preview_shift=preview_shift,
            default_shift=default_shift,
            holiday_calendar=holiday_calendar,
            full_day_min_hours=serializer.validated_data.get("full_day_min_hours"),
            half_day_min_hours=serializer.validated_data.get("half_day_min_hours"),
            late_mark_after_minutes=serializer.validated_data.get("late_mark_after_minutes"),
            overtime_threshold_minutes=serializer.validated_data.get("overtime_threshold_minutes"),
            config_snapshot=serializer.validated_data.get("config_snapshot", {}),
            policy_id=str(serializer.validated_data["policy_id"]) if serializer.validated_data.get("policy_id") else None,
        )
        return response.Response(HrAdminAttendancePolicyPreviewSerializer(payload).data)


class HrAdminLeavePolicyListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            build_hr_admin_leave_policy_payload(item)
            for item in LeavePolicy.objects.filter(tenant=employee.tenant).select_related("leave_type").order_by("name")
        ]
        return response.Response(HrAdminLeavePolicySerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_policy(employee, serializer.validated_data)
        return response.Response(HrAdminLeavePolicySerializer(build_hr_admin_leave_policy_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminLeavePolicyDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeavePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("leave_type").first()
        if not item:
            return response.Response({"detail": "Leave policy not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminLeavePolicySerializer(build_hr_admin_leave_policy_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeavePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("leave_type").first()
        if not item:
            return response.Response({"detail": "Leave policy not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_policy(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminLeavePolicySerializer(build_hr_admin_leave_policy_payload(item)).data)


class HrAdminLeavePolicyDetachView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeavePolicy.objects.filter(tenant=employee.tenant, id=item_id).select_related("leave_type").first()
        if not item:
            return response.Response({"detail": "Leave policy not found."}, status=status.HTTP_404_NOT_FOUND)
        item = detach_runtime_item_from_platform_source(
            policy_item=item,
            actor_identifier=employee.employee_code,
        )
        return response.Response(HrAdminLeavePolicySerializer(build_hr_admin_leave_policy_payload(item)).data)


class HrAdminLeavePolicyPreviewView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        leave_type = LeaveType.objects.filter(tenant=employee.tenant, id=serializer.validated_data["leave_type_id"]).first()
        if not leave_type:
            return response.Response({"leave_type_id": ["Leave type not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_leave_policy_configuration(
            employee=target_employee,
            leave_type=leave_type,
            requested_units=serializer.validated_data["requested_units"],
            config_snapshot=serializer.validated_data.get("config_snapshot", {}),
            policy_id=str(serializer.validated_data["policy_id"]) if serializer.validated_data.get("policy_id") else None,
        )
        return response.Response(HrAdminLeavePolicyPreviewSerializer(payload).data)


class HrAdminLeavePolicyAssignmentConflictView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyAssignmentConflictRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_policy = LeavePolicy.objects.filter(
            tenant=employee.tenant,
            id=serializer.validated_data["leave_policy_id"],
        ).select_related("leave_type").first()
        if not leave_policy:
            return response.Response({"leave_policy_id": ["Leave policy not found."]}, status=status.HTTP_400_BAD_REQUEST)

        payload = preview_leave_policy_assignment_conflicts(
            tenant=employee.tenant,
            leave_policy=leave_policy,
            scope_data={
                "legal_entity_id": serializer.validated_data.get("legal_entity_id"),
                "branch_id": serializer.validated_data.get("branch_id"),
                "department_id": serializer.validated_data.get("department_id"),
                "grade_id": serializer.validated_data.get("grade_id"),
                "employment_type_id": serializer.validated_data.get("employment_type_id"),
                "employee_id": serializer.validated_data.get("employee_id"),
            },
            priority=serializer.validated_data.get("priority", 100),
            item_id=str(serializer.validated_data["item_id"]) if serializer.validated_data.get("item_id") else None,
        )
        return response.Response(HrAdminLeavePolicyAssignmentConflictSerializer(payload).data)


class HrAdminLeavePolicyAssignmentResolutionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyAssignmentResolutionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(
            tenant=employee.tenant,
            id=serializer.validated_data["employee_id"],
        ).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        leave_type = LeaveType.objects.filter(
            tenant=employee.tenant,
            id=serializer.validated_data["leave_type_id"],
        ).first()
        if not leave_type:
            return response.Response({"leave_type_id": ["Leave type not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_leave_policy_assignment_resolution(
            employee=target_employee,
            leave_type=leave_type,
        )
        return response.Response(HrAdminLeavePolicyAssignmentResolutionSerializer(payload).data)


class HrAdminLeavePolicyAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = LeavePolicyAssignment.objects.filter(tenant=employee.tenant).select_related(
            "leave_policy", "leave_policy__leave_type", "legal_entity", "branch", "department", "grade", "employment_type", "employee"
        ).order_by("priority", "created_at")
        payload = []
        for item in items:
            row = build_hr_admin_assignment_payload(item, policy_id_field="leave_policy_id", policy_name="leave_policy")
            row["policy_name"] = item.leave_policy.name
            row.update(build_hr_admin_leave_assignment_governance_payload(tenant=employee.tenant, item=item))
            payload.append(row)
        return response.Response(HrAdminScopedAssignmentSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_policy_assignment(employee, serializer.validated_data)
        item = LeavePolicyAssignment.objects.select_related(
            "leave_policy",
            "leave_policy__leave_type",
            "legal_entity",
            "branch",
            "department",
            "grade",
            "employment_type",
            "employee",
        ).get(id=item.id)
        payload = build_hr_admin_assignment_payload(
            item,
            policy_id_field="leave_policy_id",
            policy_name="leave_policy",
        )
        payload["policy_name"] = item.leave_policy.name
        payload.update(build_hr_admin_leave_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminLeavePolicyAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeavePolicyAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "leave_policy",
            "leave_policy__leave_type",
            "legal_entity",
            "branch",
            "department",
            "grade",
            "employment_type",
            "employee",
        ).first()
        if not item:
            return response.Response({"detail": "Leave policy assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = build_hr_admin_assignment_payload(item, policy_id_field="leave_policy_id", policy_name="leave_policy")
        payload["policy_name"] = item.leave_policy.name
        payload.update(build_hr_admin_leave_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = LeavePolicyAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Leave policy assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeavePolicyAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_leave_policy_assignment(employee, serializer.validated_data, item=item)
        item = LeavePolicyAssignment.objects.select_related(
            "leave_policy",
            "leave_policy__leave_type",
            "legal_entity",
            "branch",
            "department",
            "grade",
            "employment_type",
            "employee",
        ).get(id=item.id)
        payload = build_hr_admin_assignment_payload(item, policy_id_field="leave_policy_id", policy_name="leave_policy")
        payload["policy_name"] = item.leave_policy.name
        payload.update(build_hr_admin_leave_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data)


class HrAdminLeaveBalanceListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = LeaveBalance.objects.filter(tenant=employee.tenant).select_related(
            "employee",
            "leave_policy",
            "leave_policy__leave_type",
        ).order_by("employee__first_name", "leave_policy__name", "-period_year")

        employee_id = request.query_params.get("employee_id")
        if employee_id:
            items = items.filter(employee_id=employee_id)
        leave_policy_id = request.query_params.get("leave_policy_id")
        if leave_policy_id:
            items = items.filter(leave_policy_id=leave_policy_id)
        q = (request.query_params.get("q") or "").strip()
        if q:
            items = items.filter(
                Q(employee__first_name__icontains=q)
                | Q(employee__last_name__icontains=q)
                | Q(employee__employee_code__icontains=q)
                | Q(leave_policy__name__icontains=q)
                | Q(leave_policy__leave_type__name__icontains=q)
            )

        payload = [build_hr_admin_leave_balance_payload(item) for item in items[:200]]
        return response.Response(HrAdminLeaveBalanceSerializer(payload, many=True).data)


class HrAdminLeaveBalanceTransactionListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = LeaveBalanceTransaction.objects.filter(tenant=employee.tenant).select_related(
            "employee",
            "leave_policy",
            "performed_by",
            "reviewed_by",
            "leave_balance",
        ).order_by("-created_at")

        employee_id = request.query_params.get("employee_id")
        if employee_id:
            items = items.filter(employee_id=employee_id)
        leave_policy_id = request.query_params.get("leave_policy_id")
        if leave_policy_id:
            items = items.filter(leave_policy_id=leave_policy_id)
        status_value = (request.query_params.get("status") or "").strip()
        if status_value:
            items = items.filter(status=status_value)
        q = (request.query_params.get("q") or "").strip()
        if q:
            items = items.filter(
                Q(employee__first_name__icontains=q)
                | Q(employee__last_name__icontains=q)
                | Q(employee__employee_code__icontains=q)
                | Q(leave_policy__name__icontains=q)
                | Q(reason__icontains=q)
            )

        payload = [build_hr_admin_leave_balance_transaction_payload(item, actor=employee) for item in items[:200]]
        return response.Response(HrAdminLeaveBalanceTransactionSerializer(payload, many=True).data)


class HrAdminLeaveBalanceActionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeaveBalanceActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        leave_policy = LeavePolicy.objects.filter(tenant=employee.tenant, id=serializer.validated_data["leave_policy_id"]).select_related("leave_type").first()
        if not leave_policy:
            return response.Response({"leave_policy_id": ["Leave policy not found."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mutation_result = apply_leave_balance_admin_action(
                actor=employee,
                employee=target_employee,
                leave_policy=leave_policy,
                action=serializer.validated_data["action"],
                units=serializer.validated_data["units"],
                effective_date=serializer.validated_data.get("effective_date") or timezone.localdate(),
                reason=serializer.validated_data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        balance = LeaveBalance.objects.select_related("employee", "leave_policy", "leave_policy__leave_type").get(id=mutation_result["balance"].id)
        transaction_item = (
            LeaveBalanceTransaction.objects.filter(id=mutation_result["transaction"].id)
            .select_related("employee", "leave_policy", "performed_by", "reviewed_by", "leave_balance")
            .first()
        )
        return response.Response(
            HrAdminLeaveBalanceActionResultSerializer(
                {
                    "balance": build_hr_admin_leave_balance_payload(balance),
                    "transaction": build_hr_admin_leave_balance_transaction_payload(transaction_item, actor=employee),
                    "applied": mutation_result["applied"],
                    "requires_review": mutation_result["requires_review"],
                    "message": mutation_result["message"],
                }
            ).data,
            status=status.HTTP_200_OK,
        )


class HrAdminLeaveBalanceTransactionReviewView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminLeaveBalanceTransactionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction_item = LeaveBalanceTransaction.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not transaction_item:
            return response.Response({"detail": "Leave balance transaction not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            mutation_result = review_leave_balance_transaction(
                actor=employee,
                transaction_item=transaction_item,
                decision=serializer.validated_data["decision"],
                rejection_reason=serializer.validated_data.get("rejection_reason", ""),
            )
        except DjangoValidationError as exc:
            return response.Response(_django_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)
        balance = LeaveBalance.objects.select_related("employee", "leave_policy", "leave_policy__leave_type").get(id=mutation_result["balance"].id)
        updated_transaction = (
            LeaveBalanceTransaction.objects.filter(id=mutation_result["transaction"].id)
            .select_related("employee", "leave_policy", "performed_by", "reviewed_by", "leave_balance")
            .first()
        )
        return response.Response(
            HrAdminLeaveBalanceActionResultSerializer(
                {
                    "balance": build_hr_admin_leave_balance_payload(balance),
                    "transaction": build_hr_admin_leave_balance_transaction_payload(updated_transaction, actor=employee),
                    "applied": mutation_result["applied"],
                    "requires_review": mutation_result["requires_review"],
                    "message": mutation_result["message"],
                }
            ).data,
            status=status.HTTP_200_OK,
        )


class HrAdminAttendancePolicyAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = AttendancePolicyAssignment.objects.filter(tenant=employee.tenant).select_related(
            "attendance_policy", "legal_entity", "branch", "location", "department", "grade", "employment_type", "employee"
        ).order_by("priority", "created_at")
        payload = []
        for item in items:
            row = build_hr_admin_assignment_payload(item, policy_id_field="attendance_policy_id", policy_name="attendance_policy", include_location=True)
            row["policy_name"] = item.attendance_policy.name
            row.update(build_hr_admin_attendance_assignment_governance_payload(tenant=employee.tenant, item=item))
            payload.append(row)
        return response.Response(HrAdminScopedAssignmentSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_attendance_policy_assignment(employee, serializer.validated_data)
        item = AttendancePolicyAssignment.objects.select_related(
            "attendance_policy", "legal_entity", "branch", "location", "department", "grade", "employment_type", "employee"
        ).get(id=item.id)
        payload = build_hr_admin_assignment_payload(item, policy_id_field="attendance_policy_id", policy_name="attendance_policy", include_location=True)
        payload["policy_name"] = item.attendance_policy.name
        payload.update(build_hr_admin_attendance_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminAttendancePolicyAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = AttendancePolicyAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "attendance_policy", "legal_entity", "branch", "location", "department", "grade", "employment_type", "employee"
        ).first()
        if not item:
            return response.Response({"detail": "Attendance policy assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = build_hr_admin_assignment_payload(item, policy_id_field="attendance_policy_id", policy_name="attendance_policy", include_location=True)
        payload["policy_name"] = item.attendance_policy.name
        payload.update(build_hr_admin_attendance_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = AttendancePolicyAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Attendance policy assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_attendance_policy_assignment(employee, serializer.validated_data, item=item)
        item = AttendancePolicyAssignment.objects.select_related(
            "attendance_policy", "legal_entity", "branch", "location", "department", "grade", "employment_type", "employee"
        ).get(id=item.id)
        payload = build_hr_admin_assignment_payload(item, policy_id_field="attendance_policy_id", policy_name="attendance_policy", include_location=True)
        payload["policy_name"] = item.attendance_policy.name
        payload.update(build_hr_admin_attendance_assignment_governance_payload(tenant=employee.tenant, item=item))
        return response.Response(HrAdminScopedAssignmentSerializer(payload).data)


class HrAdminAttendancePolicyAssignmentConflictView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyAssignmentConflictRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attendance_policy = AttendancePolicy.objects.filter(
            tenant=employee.tenant,
            id=serializer.validated_data["attendance_policy_id"],
        ).first()
        if not attendance_policy:
            return response.Response({"attendance_policy_id": ["Attendance policy not found."]}, status=status.HTTP_400_BAD_REQUEST)

        payload = preview_attendance_policy_assignment_conflicts(
            tenant=employee.tenant,
            attendance_policy=attendance_policy,
            scope_data={
                "legal_entity_id": serializer.validated_data.get("legal_entity_id"),
                "branch_id": serializer.validated_data.get("branch_id"),
                "location_id": serializer.validated_data.get("location_id"),
                "department_id": serializer.validated_data.get("department_id"),
                "grade_id": serializer.validated_data.get("grade_id"),
                "employment_type_id": serializer.validated_data.get("employment_type_id"),
                "employee_id": serializer.validated_data.get("employee_id"),
            },
            priority=serializer.validated_data.get("priority", 100),
            item_id=str(serializer.validated_data["item_id"]) if serializer.validated_data.get("item_id") else None,
        )
        return response.Response(HrAdminAttendancePolicyAssignmentConflictSerializer(payload).data)


class HrAdminAttendancePolicyAssignmentResolutionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminAttendancePolicyAssignmentResolutionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_attendance_policy_assignment_resolution(employee=target_employee)
        return response.Response(HrAdminAttendancePolicyAssignmentResolutionSerializer(payload).data)


class HrAdminEmployeeShiftAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = EmployeeShiftAssignment.objects.filter(tenant=employee.tenant).select_related("employee", "shift").order_by("employee__employee_code", "-effective_from", "created_at")
        payload = [
            build_hr_admin_employee_shift_assignment_payload(tenant=employee.tenant, item=item)
            for item in items
        ]
        return response.Response(HrAdminEmployeeShiftAssignmentSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeShiftAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_employee_shift_assignment(employee, serializer.validated_data)
        item = EmployeeShiftAssignment.objects.select_related("employee", "shift").get(id=item.id)
        payload = build_hr_admin_employee_shift_assignment_payload(tenant=employee.tenant, item=item)
        return response.Response(HrAdminEmployeeShiftAssignmentSerializer(payload).data, status=status.HTTP_201_CREATED)


class HrAdminEmployeeShiftAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeShiftAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "shift").first()
        if not item:
            return response.Response({"detail": "Employee shift assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = build_hr_admin_employee_shift_assignment_payload(tenant=employee.tenant, item=item)
        return response.Response(HrAdminEmployeeShiftAssignmentSerializer(payload).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeShiftAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Employee shift assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeShiftAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_employee_shift_assignment(employee, serializer.validated_data, item=item)
        item = EmployeeShiftAssignment.objects.select_related("employee", "shift").get(id=item.id)
        payload = build_hr_admin_employee_shift_assignment_payload(tenant=employee.tenant, item=item)
        return response.Response(HrAdminEmployeeShiftAssignmentSerializer(payload).data)


class HrAdminEmployeeShiftAssignmentConflictView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeShiftAssignmentConflictRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        shift = Shift.objects.filter(tenant=employee.tenant, id=serializer.validated_data["shift_id"]).first()
        if not shift:
            return response.Response({"shift_id": ["Shift not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_employee_shift_assignment_conflicts(
            tenant=employee.tenant,
            employee=target_employee,
            shift=shift,
            effective_from=serializer.validated_data["effective_from"],
            effective_to=serializer.validated_data.get("effective_to"),
            is_primary=serializer.validated_data.get("is_primary", True),
            assignment_kind=serializer.validated_data.get("assignment_kind", EmployeeShiftAssignmentKind.FIXED),
            item_id=str(serializer.validated_data["item_id"]) if serializer.validated_data.get("item_id") else None,
        )
        return response.Response(HrAdminEmployeeShiftAssignmentConflictSerializer(payload).data)


class HrAdminEmployeeShiftAssignmentResolutionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeShiftAssignmentResolutionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_employee = Employee.objects.filter(tenant=employee.tenant, id=serializer.validated_data["employee_id"]).first()
        if not target_employee:
            return response.Response({"employee_id": ["Employee not found."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = preview_employee_shift_assignment_resolution(
            employee=target_employee,
            attendance_date=serializer.validated_data["attendance_date"],
            end_date=serializer.validated_data.get("end_date"),
        )
        return response.Response(HrAdminEmployeeShiftAssignmentResolutionSerializer(payload).data)


class HrAdminShiftRosterTemplateListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            build_hr_admin_shift_roster_template_payload(item)
            for item in ShiftRosterTemplate.objects.filter(tenant=employee.tenant).select_related("shift").order_by("name")
        ]
        return response.Response(HrAdminShiftRosterTemplateSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminShiftRosterTemplateWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_shift_roster_template(employee, serializer.validated_data)
        item = ShiftRosterTemplate.objects.select_related("shift").get(id=item.id)
        return response.Response(HrAdminShiftRosterTemplateSerializer(build_hr_admin_shift_roster_template_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminShiftRosterTemplateDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = ShiftRosterTemplate.objects.filter(tenant=employee.tenant, id=item_id).select_related("shift").first()
        if not item:
            return response.Response({"detail": "Shift roster template not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminShiftRosterTemplateSerializer(build_hr_admin_shift_roster_template_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = ShiftRosterTemplate.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Shift roster template not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminShiftRosterTemplateWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_shift_roster_template(employee, serializer.validated_data, item=item)
        item = ShiftRosterTemplate.objects.select_related("shift").get(id=item.id)
        return response.Response(HrAdminShiftRosterTemplateSerializer(build_hr_admin_shift_roster_template_payload(item)).data)


class HrAdminShiftRosterTemplateRolloutView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminShiftRosterTemplateRolloutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = ShiftRosterTemplate.objects.filter(tenant=employee.tenant, id=serializer.validated_data["template_id"]).select_related("shift").first()
        if not template:
            return response.Response({"template_id": ["Shift roster template not found."]}, status=status.HTTP_400_BAD_REQUEST)
        if template.status == ShiftRosterTemplateStatus.DRAFT and not serializer.validated_data.get("dry_run", True):
            return response.Response({"detail": "Publish the roster template before rolling it out."}, status=status.HTTP_400_BAD_REQUEST)
        legal_entity = LegalEntity.objects.filter(tenant=employee.tenant, id=serializer.validated_data.get("legal_entity_id")).first() if serializer.validated_data.get("legal_entity_id") else None
        branch = Branch.objects.filter(tenant=employee.tenant, id=serializer.validated_data.get("branch_id")).first() if serializer.validated_data.get("branch_id") else None
        location = Location.objects.filter(tenant=employee.tenant, id=serializer.validated_data.get("location_id")).first() if serializer.validated_data.get("location_id") else None
        department = Department.objects.filter(tenant=employee.tenant, id=serializer.validated_data.get("department_id")).first() if serializer.validated_data.get("department_id") else None
        employee_queryset = get_shift_roster_rollout_employee_queryset(
            tenant=employee.tenant,
            employee_ids=serializer.validated_data.get("employee_ids"),
            legal_entity_id=serializer.validated_data.get("legal_entity_id"),
            branch_id=serializer.validated_data.get("branch_id"),
            location_id=serializer.validated_data.get("location_id"),
            department_id=serializer.validated_data.get("department_id"),
        )
        payload = preview_shift_roster_template_rollout(
            tenant=employee.tenant,
            template=template,
            employee_queryset=employee_queryset,
            effective_from=serializer.validated_data["effective_from"],
            effective_to=serializer.validated_data.get("effective_to"),
            is_primary=serializer.validated_data.get("is_primary", True),
            scope_snapshot={
                "employee_ids": [str(item) for item in serializer.validated_data.get("employee_ids", [])],
                "legal_entity_id": str(serializer.validated_data["legal_entity_id"]) if serializer.validated_data.get("legal_entity_id") else None,
                "legal_entity_name": legal_entity.name if legal_entity else None,
                "branch_id": str(serializer.validated_data["branch_id"]) if serializer.validated_data.get("branch_id") else None,
                "branch_name": branch.name if branch else None,
                "location_id": str(serializer.validated_data["location_id"]) if serializer.validated_data.get("location_id") else None,
                "location_name": location.name if location else None,
                "department_id": str(serializer.validated_data["department_id"]) if serializer.validated_data.get("department_id") else None,
                "department_name": department.name if department else None,
            },
            actor=employee,
            dry_run=serializer.validated_data.get("dry_run", True),
        )
        return response.Response(HrAdminShiftRosterTemplateRolloutSerializer(payload).data)


class HrAdminShiftRosterRolloutListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = [
            build_hr_admin_shift_roster_rollout_payload(item)
            for item in ShiftRosterRollout.objects.filter(tenant=employee.tenant).select_related("template").order_by("-created_at")[:25]
        ]
        return response.Response(HrAdminShiftRosterRolloutSerializer(payload, many=True).data)


class HrAdminWorkflowOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        tenant = employee.tenant
        payload = {
            "workflow_modules": [{"value": value, "label": label} for value, label in WorkflowModule.choices],
            "workflow_statuses": [{"value": value, "label": label} for value, label in WorkflowStatus.choices],
            "workflow_step_modes": [{"value": value, "label": label} for value, label in WorkflowStepMode.choices],
            "workflow_actor_types": [{"value": value, "label": label} for value, label in WorkflowActorType.choices],
            "workflow_scope_types": [{"value": value, "label": label} for value, label in ScopeType.choices],
            "roles": [{"id": item.id, "code": item.code, "name": item.name} for item in Role.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "memberships": [
                {
                    "id": item.id,
                    "name": item.user.display_name or item.user.get_full_name() or item.user.username,
                }
                for item in TenantMembership.objects.filter(tenant=tenant).select_related("user").order_by("user__username")
            ],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "departments": [{"id": item.id, "name": item.name} for item in Department.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "business_units": [{"id": item.id, "name": item.name} for item in BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "grades": [{"id": item.id, "name": item.name} for item in Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "templates": [{"id": item.id, "name": item.name} for item in WorkflowTemplate.objects.filter(tenant=tenant).order_by("name")],
            "lifecycle_rule_options": _build_lifecycle_rule_options(),
        }
        return response.Response(HrAdminWorkflowOptionsSerializer(payload).data)


class HrAdminWorkflowTraceListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        page, page_size = _get_page_params(request)
        module_filter = (request.query_params.get("module") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        q = (request.query_params.get("q") or "").strip().lower()

        queryset = (
            WorkflowInstance.objects.filter(tenant=employee.tenant)
            .select_related("template")
            .prefetch_related("step_instances__assignments__membership__user", "step_instances__assignments__role", "action_logs__step_instance")
            .order_by("-created_at")
        )
        if module_filter and module_filter != "all":
            queryset = queryset.filter(module=module_filter)

        all_items = [build_hr_admin_workflow_trace_payload(item) for item in queryset[:100]]
        if q:
            all_items = [
                item
                for item in all_items
                if any(
                    q in str(value or "").lower()
                    for value in [
                        item["module"],
                        item["trigger_key"],
                        item["subject_type"],
                        item["subject_identifier"],
                        item["subject_label"],
                        item["employee_code"],
                        item["employee_name"],
                        item["status"],
                        item["current_step_name"],
                        item["current_actor_summary"],
                        item["initiated_by_identifier"],
                    ]
                )
            ]

        status_counts = {"all": len(all_items)}
        for value, _label in WorkflowInstanceStatus.choices:
            status_counts[value] = sum(1 for item in all_items if item["status"] == value)

        visible_items = all_items
        if status_filter and status_filter != "all":
            visible_items = [item for item in visible_items if item["status"] == status_filter]

        payload = _build_paginated_payload(visible_items, page=page, page_size=page_size, extra={"status_counts": status_counts})
        return response.Response(HrAdminWorkflowTraceListSerializer(payload).data)


class HrAdminWorkflowTraceDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = (
            WorkflowInstance.objects.filter(tenant=employee.tenant, id=item_id)
            .select_related("template")
            .prefetch_related("step_instances__assignments__membership__user", "step_instances__assignments__role", "action_logs__step_instance")
            .first()
        )
        if not item:
            return response.Response({"detail": "Workflow trace not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminWorkflowTraceSerializer(build_hr_admin_workflow_trace_payload(item)).data)


class HrAdminWorkflowTemplateListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = WorkflowTemplate.objects.filter(tenant=employee.tenant).prefetch_related("steps__role", "steps__membership__user").order_by("module", "name", "version")
        payload = [build_hr_admin_workflow_template_payload(item) for item in items]
        return response.Response(HrAdminWorkflowTemplateSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminWorkflowTemplateWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_workflow_template(employee, serializer.validated_data)
        item = WorkflowTemplate.objects.filter(id=item.id).prefetch_related("steps__role", "steps__membership__user").get()
        return response.Response(HrAdminWorkflowTemplateSerializer(build_hr_admin_workflow_template_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminWorkflowTemplateDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = WorkflowTemplate.objects.filter(tenant=employee.tenant, id=item_id).prefetch_related("steps__role", "steps__membership__user").first()
        if not item:
            return response.Response({"detail": "Workflow template not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminWorkflowTemplateSerializer(build_hr_admin_workflow_template_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = WorkflowTemplate.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Workflow template not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminWorkflowTemplateWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_workflow_template(employee, serializer.validated_data, item=item)
        item = WorkflowTemplate.objects.filter(id=item.id).prefetch_related("steps__role", "steps__membership__user").get()
        return response.Response(HrAdminWorkflowTemplateSerializer(build_hr_admin_workflow_template_payload(item)).data)


class HrAdminWorkflowTemplateAssignmentListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = WorkflowTemplateAssignment.objects.filter(tenant=employee.tenant).select_related(
            "template", "legal_entity", "branch", "department", "business_unit", "grade"
        ).order_by("priority", "created_at")
        payload = [build_hr_admin_workflow_assignment_payload(item) for item in items]
        return response.Response(HrAdminWorkflowTemplateAssignmentSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminWorkflowTemplateAssignmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_workflow_assignment(employee, serializer.validated_data)
        item = WorkflowTemplateAssignment.objects.select_related("template", "legal_entity", "branch", "department", "business_unit", "grade").get(id=item.id)
        return response.Response(HrAdminWorkflowTemplateAssignmentSerializer(build_hr_admin_workflow_assignment_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminWorkflowTemplateAssignmentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = WorkflowTemplateAssignment.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "template", "legal_entity", "branch", "department", "business_unit", "grade"
        ).first()
        if not item:
            return response.Response({"detail": "Workflow assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminWorkflowTemplateAssignmentSerializer(build_hr_admin_workflow_assignment_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = WorkflowTemplateAssignment.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Workflow assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminWorkflowTemplateAssignmentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_workflow_assignment(employee, serializer.validated_data, item=item)
        item = WorkflowTemplateAssignment.objects.select_related("template", "legal_entity", "branch", "department", "business_unit", "grade").get(id=item.id)
        return response.Response(HrAdminWorkflowTemplateAssignmentSerializer(build_hr_admin_workflow_assignment_payload(item)).data)


class HrAdminDocumentOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        tenant = employee.tenant
        payload = {
            "document_category_types": [{"value": value, "label": label} for value, label in DocumentCategoryType.choices],
            "verification_statuses": [{"value": value, "label": label} for value, label in VerificationStatus.choices],
            "employee_document_statuses": [{"value": value, "label": label} for value, label in EmployeeDocumentStatus.choices],
            "letter_types": [{"value": value, "label": label} for value, label in LetterType.choices],
            "max_upload_size_bytes": get_document_upload_max_bytes(),
            "categories": [{"id": item.id, "name": item.name} for item in DocumentCategory.objects.filter(tenant=tenant).order_by("name")],
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "departments": [{"id": item.id, "name": item.name} for item in Department.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "grades": [{"id": item.id, "name": item.name} for item in Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "employment_types": [{"id": item.id, "name": item.name} for item in EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")],
        }
        return response.Response(HrAdminDocumentOptionsSerializer(payload).data)


class HrAdminDocumentCategoryListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = DocumentCategory.objects.filter(tenant=employee.tenant).order_by("name")
        payload = [build_hr_admin_document_category_payload(item) for item in items]
        return response.Response(HrAdminDocumentCategorySerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminDocumentCategoryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_document_category(employee, serializer.validated_data)
        return response.Response(HrAdminDocumentCategorySerializer(build_hr_admin_document_category_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminDocumentCategoryDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = DocumentCategory.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Document category not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminDocumentCategorySerializer(build_hr_admin_document_category_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = DocumentCategory.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Document category not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminDocumentCategoryWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_document_category(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminDocumentCategorySerializer(build_hr_admin_document_category_payload(item)).data)


class HrAdminDocumentRequirementRuleListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = DocumentRequirementRule.objects.filter(tenant=employee.tenant).select_related(
            "category", "legal_entity", "branch", "department", "grade", "employment_type"
        ).order_by("priority", "created_at")
        payload = [build_hr_admin_document_requirement_payload(item) for item in items]
        return response.Response(HrAdminDocumentRequirementRuleSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminDocumentRequirementRuleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_document_requirement(employee, serializer.validated_data)
        item = DocumentRequirementRule.objects.select_related("category", "legal_entity", "branch", "department", "grade", "employment_type").get(id=item.id)
        return response.Response(HrAdminDocumentRequirementRuleSerializer(build_hr_admin_document_requirement_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminDocumentRequirementRuleDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = DocumentRequirementRule.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "category", "legal_entity", "branch", "department", "grade", "employment_type"
        ).first()
        if not item:
            return response.Response({"detail": "Document requirement rule not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminDocumentRequirementRuleSerializer(build_hr_admin_document_requirement_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = DocumentRequirementRule.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Document requirement rule not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminDocumentRequirementRuleWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_document_requirement(employee, serializer.validated_data, item=item)
        item = DocumentRequirementRule.objects.select_related("category", "legal_entity", "branch", "department", "grade", "employment_type").get(id=item.id)
        return response.Response(HrAdminDocumentRequirementRuleSerializer(build_hr_admin_document_requirement_payload(item)).data)


class HrAdminEmployeeDocumentListView(HrAdminContextMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        verification_status_filter = (request.query_params.get("verification_status") or "").strip()
        record_status_filter = (request.query_params.get("status") or "").strip()
        category_id_filter = (request.query_params.get("category_id") or "").strip()
        expiry_filter = (request.query_params.get("expiry_filter") or "").strip()

        queryset = EmployeeDocument.objects.filter(tenant=employee.tenant).select_related("employee", "category", "artifact")

        if verification_status_filter:
            queryset = queryset.filter(verification_status=verification_status_filter)
        if record_status_filter:
            queryset = queryset.filter(status=record_status_filter)
        if category_id_filter:
            queryset = queryset.filter(category_id=category_id_filter)
        if search_value:
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(category__name__icontains=search_value)
                | Q(title__icontains=search_value)
                | Q(document_number__icontains=search_value)
                | Q(uploaded_by_identifier__icontains=search_value)
                | Q(verified_by_identifier__icontains=search_value)
                | Q(rejection_reason__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        documents = list(queryset.order_by("-created_at"))
        if expiry_filter:
            filtered_documents = []
            for document in documents:
                expiry_runtime = _get_employee_document_expiry_runtime(document)
                if expiry_filter == "expiring" and not expiry_runtime["is_expiring_soon"]:
                    continue
                if expiry_filter == "expired" and not expiry_runtime["is_expired"]:
                    continue
                if expiry_filter == "missing_expiry" and document.expires_on is not None:
                    continue
                filtered_documents.append(document)
            documents = filtered_documents

        total_count = len(documents)
        offset = (page - 1) * page_size
        items = documents[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_employee_document_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminEmployeeDocumentListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_hr_admin_employee_document(employee, serializer.validated_data)
        item = EmployeeDocument.objects.select_related("employee", "category", "artifact").get(id=item.id)
        return response.Response(
            HrAdminEmployeeDocumentSerializer(build_hr_admin_employee_document_payload(item)).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminEmployeeDocumentDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeDocument.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "category", "artifact").first()
        if not item:
            return response.Response({"detail": "Employee document not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminEmployeeDocumentSerializer(build_hr_admin_employee_document_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeDocument.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "category", "artifact").first()
        if not item:
            return response.Response({"detail": "Employee document not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeDocumentWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_employee_document(employee, serializer.validated_data, item=item)
        item = EmployeeDocument.objects.select_related("employee", "category", "artifact").get(id=item.id)
        return response.Response(HrAdminEmployeeDocumentSerializer(build_hr_admin_employee_document_payload(item)).data)


class HrAdminEmployeeDocumentDownloadView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeDocument.objects.filter(tenant=employee.tenant, id=item_id).select_related("artifact").first()
        if not item or not item.artifact_id or not item.artifact or not item.artifact.stored_file:
            return response.Response({"detail": "Document file not found."}, status=status.HTTP_404_NOT_FOUND)

        stored_file = item.artifact.stored_file
        response_file = FileResponse(
            stored_file.open("rb"),
            as_attachment=True,
            filename=item.artifact.original_filename or item.file_name or f"{item.title}.bin",
        )
        if item.artifact.mime_type:
            response_file["Content-Type"] = item.artifact.mime_type
        return response_file


class HrAdminEmployeeDocumentReminderActionView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminEmployeeDocumentReminderActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data["document_ids"]
        documents = list(
            EmployeeDocument.objects.filter(tenant=employee.tenant, id__in=document_ids)
            .select_related("employee__membership__user", "category")
        )

        reminder_count = 0
        for document in documents:
            if _send_document_expiry_attention_reminder(document=document):
                reminder_count += 1

        payload = {
            "processed_count": len(documents),
            "reminder_count": reminder_count,
            "skipped_count": len(documents) - reminder_count,
        }
        return response.Response(HrAdminEmployeeDocumentReminderActionResultSerializer(payload).data)


class HrAdminGeneratedLetterPreviewView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminGeneratedLetterPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = preview_hr_admin_generated_letter(employee, serializer.validated_data)
        return response.Response(HrAdminGeneratedLetterPreviewSerializer(payload).data)


class HrAdminGeneratedLetterListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        employee_id_filter = (request.query_params.get("employee_id") or "").strip()
        letter_type_filter = (request.query_params.get("letter_type") or "").strip()

        queryset = GeneratedLetter.objects.filter(tenant=employee.tenant).select_related("employee", "artifact")
        if employee_id_filter:
            queryset = queryset.filter(employee_id=employee_id_filter)
        if letter_type_filter:
            queryset = queryset.filter(letter_type=letter_type_filter)
        if search_value:
            queryset = queryset.filter(
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(title__icontains=search_value)
                | Q(template_code__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
            )

        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = list(queryset.order_by("-created_at")[offset : offset + page_size])
        payload = {
            "items": [build_hr_admin_generated_letter_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminGeneratedLetterListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminGeneratedLetterWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_hr_admin_generated_letter(employee, serializer.validated_data)
        item = GeneratedLetter.objects.select_related("employee", "artifact").get(id=item.id)
        return response.Response(
            HrAdminGeneratedLetterSerializer(build_hr_admin_generated_letter_payload(item)).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminGeneratedLetterDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = GeneratedLetter.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee", "artifact").first()
        if not item:
            return response.Response({"detail": "Generated letter not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminGeneratedLetterSerializer(build_hr_admin_generated_letter_payload(item)).data)


class HrAdminGeneratedLetterDownloadView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = GeneratedLetter.objects.filter(tenant=employee.tenant, id=item_id).select_related("artifact").first()
        if not item or not item.artifact_id or not item.artifact or not item.artifact.stored_file:
            return response.Response({"detail": "Generated letter file not found."}, status=status.HTTP_404_NOT_FOUND)

        response_file = FileResponse(
            item.artifact.stored_file.open("rb"),
            as_attachment=True,
            filename=item.artifact.original_filename or item.file_name or f"{item.title}.txt",
        )
        response_file["Content-Type"] = item.artifact.mime_type or "text/plain"
        return response_file


class HrAdminLifecycleOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        tenant = employee.tenant
        employee_queryset = Employee.objects.filter(tenant=tenant).select_related("membership__user").order_by("employee_code")
        employee_options = [
            {"id": item.id, "name": _lifecycle_employee_name(item), "employee_code": item.employee_code}
            for item in employee_queryset
        ]
        identifier_owners = {
            (item.assigned_owner_identifier or "").strip()
            for item in EmployeeOnboarding.objects.filter(tenant=tenant).only("assigned_owner_identifier")
        }
        identifier_owners.update(
            (item.reviewer_identifier or "").strip()
            for item in ProbationReview.objects.filter(tenant=tenant).only("reviewer_identifier")
        )
        lifecycle_owner_map = {
            _build_lifecycle_owner_value_from_identifier(identifier): identifier
            for identifier in sorted(value for value in identifier_owners if value)
        }
        for item in employee_queryset:
            owner_value = _build_lifecycle_owner_value_from_employee(item)
            if owner_value:
                lifecycle_owner_map[owner_value] = f"{_lifecycle_employee_name(item)} ({item.employee_code})"
        lifecycle_owners = [
            {"value": value, "label": label}
            for value, label in sorted(lifecycle_owner_map.items(), key=lambda item: item[1].lower())
        ]
        payload = {
            "onboarding_statuses": [{"value": value, "label": label} for value, label in OnboardingStatus.choices],
            "probation_decisions": [{"value": value, "label": label} for value, label in ProbationDecision.choices],
            "movement_types": [{"value": value, "label": label} for value, label in MovementType.choices],
            "lifecycle_event_statuses": [{"value": value, "label": label} for value, label in LifecycleEventStatus.choices],
            "exit_statuses": [{"value": value, "label": label} for value, label in ExitStatus.choices],
            "employees": employee_options,
            "legal_entities": [{"id": item.id, "name": item.name} for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "branches": [{"id": item.id, "name": item.name} for item in Branch.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "locations": [{"id": item.id, "name": item.name} for item in Location.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "departments": [{"id": item.id, "name": item.name} for item in Department.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "business_units": [{"id": item.id, "name": item.name} for item in BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "designations": [{"id": item.id, "name": item.name} for item in Designation.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "grades": [{"id": item.id, "name": item.name} for item in Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "employment_types": [{"id": item.id, "name": item.name} for item in EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "managers": employee_options,
            "lifecycle_owners": lifecycle_owners,
        }
        return response.Response(HrAdminLifecycleOptionsSerializer(payload).data)


class HrAdminLifecycleQueueView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25

        search_value = (request.query_params.get("q") or "").strip().lower()
        item_type_filter = (request.query_params.get("item_type") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        employee_id_filter = (request.query_params.get("employee_id") or "").strip()
        owner_filter = (request.query_params.get("owner") or "").strip()
        primary_date_from = parse_date((request.query_params.get("primary_date_from") or "").strip())
        primary_date_to = parse_date((request.query_params.get("primary_date_to") or "").strip())

        lifecycle_items = []
        document_attention_cache = {}

        onboardings = EmployeeOnboarding.objects.filter(tenant=employee.tenant).select_related("employee")
        if employee_id_filter:
            onboardings = onboardings.filter(employee_id=employee_id_filter)
        if status_filter:
            onboardings = onboardings.filter(status=status_filter)
        if owner_filter.startswith("identifier:"):
            onboarding_owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if onboarding_owner_identifier:
                onboardings = onboardings.filter(assigned_owner_identifier__iexact=onboarding_owner_identifier)
        elif owner_filter.startswith("employee:"):
            onboardings = onboardings.none()
        if primary_date_from:
            onboardings = onboardings.filter(expected_joining_date__gte=primary_date_from)
        if primary_date_to:
            onboardings = onboardings.filter(expected_joining_date__lte=primary_date_to)
        if search_value:
            onboardings = onboardings.filter(
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(onboarding_template_code__icontains=search_value)
                | Q(assigned_owner_identifier__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(notes__icontains=search_value)
            )
        if not item_type_filter or item_type_filter == "onboarding":
            lifecycle_items.extend(
                build_hr_admin_lifecycle_queue_item("onboarding", item, document_attention_cache=document_attention_cache)
                for item in onboardings
            )

        probation_reviews = ProbationReview.objects.filter(tenant=employee.tenant).select_related("employee")
        if employee_id_filter:
            probation_reviews = probation_reviews.filter(employee_id=employee_id_filter)
        if status_filter:
            probation_reviews = probation_reviews.filter(decision=status_filter)
        if owner_filter.startswith("identifier:"):
            probation_owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if probation_owner_identifier:
                probation_reviews = probation_reviews.filter(reviewer_identifier__iexact=probation_owner_identifier)
        elif owner_filter.startswith("employee:"):
            probation_reviews = probation_reviews.none()
        if primary_date_from:
            probation_reviews = probation_reviews.filter(review_date__gte=primary_date_from)
        if primary_date_to:
            probation_reviews = probation_reviews.filter(review_date__lte=primary_date_to)
        if search_value:
            probation_reviews = probation_reviews.filter(
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(reviewer_identifier__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(remarks__icontains=search_value)
            )
        if not item_type_filter or item_type_filter == "probation":
            lifecycle_items.extend(
                build_hr_admin_lifecycle_queue_item("probation", item, document_attention_cache=document_attention_cache)
                for item in probation_reviews
            )

        movements = EmployeeMovement.objects.filter(tenant=employee.tenant).select_related("employee", "to_department", "to_designation", "to_manager__membership__user")
        if employee_id_filter:
            movements = movements.filter(employee_id=employee_id_filter)
        if status_filter:
            movements = movements.filter(status=status_filter)
        if owner_filter.startswith("employee:"):
            movement_owner_id = owner_filter.removeprefix("employee:")
            if movement_owner_id:
                movements = movements.filter(to_manager_id=movement_owner_id)
        elif owner_filter.startswith("identifier:"):
            movement_owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if movement_owner_identifier:
                movements = movements.filter(
                    Q(to_manager__membership__user__username__iexact=movement_owner_identifier)
                    | Q(to_manager__employee_code__iexact=movement_owner_identifier)
                )
        if primary_date_from:
            movements = movements.filter(effective_date__gte=primary_date_from)
        if primary_date_to:
            movements = movements.filter(effective_date__lte=primary_date_to)
        if search_value:
            movements = movements.filter(
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(movement_type__icontains=search_value)
                | Q(reason__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(to_department__name__icontains=search_value)
                | Q(to_designation__name__icontains=search_value)
                | Q(to_manager__first_name__icontains=search_value)
                | Q(to_manager__last_name__icontains=search_value)
                | Q(to_manager__employee_code__icontains=search_value)
            )
        if not item_type_filter or item_type_filter == "movement":
            lifecycle_items.extend(
                build_hr_admin_lifecycle_queue_item("movement", item, document_attention_cache=document_attention_cache)
                for item in movements
            )

        exits = EmployeeExit.objects.filter(tenant=employee.tenant).select_related("employee")
        if employee_id_filter:
            exits = exits.filter(employee_id=employee_id_filter)
        if status_filter:
            exits = exits.filter(status=status_filter)
        if primary_date_from:
            exits = exits.filter(proposed_last_working_date__gte=primary_date_from)
        if primary_date_to:
            exits = exits.filter(proposed_last_working_date__lte=primary_date_to)
        if search_value:
            exits = exits.filter(
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(exit_reason__icontains=search_value)
                | Q(exit_reason_detail__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(handover_notes__icontains=search_value)
            )
        if not item_type_filter or item_type_filter == "exit":
            lifecycle_items.extend(
                build_hr_admin_lifecycle_queue_item("exit", item, document_attention_cache=document_attention_cache)
                for item in exits
            )

        lifecycle_items.sort(key=_get_lifecycle_attention_sort_key)
        total_count = len(lifecycle_items)
        offset = (page - 1) * page_size
        payload = {
            "items": lifecycle_items[offset : offset + page_size],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminLifecycleQueueListSerializer(payload).data)


class HrAdminOnboardingListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        owner_filter = (request.query_params.get("owner") or "").strip()

        queryset = EmployeeOnboarding.objects.filter(tenant=employee.tenant).select_related("employee")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if owner_filter.startswith("identifier:"):
            owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if owner_identifier:
                queryset = queryset.filter(assigned_owner_identifier__iexact=owner_identifier)
        elif owner_filter.startswith("employee:"):
            queryset = queryset.none()
        if search_value:
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(onboarding_template_code__icontains=search_value)
                | Q(assigned_owner_identifier__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(notes__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        payload_items = [build_hr_admin_onboarding_payload(item) for item in queryset]
        payload_items.sort(key=_get_lifecycle_attention_sort_key)
        total_count = len(payload_items)
        offset = (page - 1) * page_size
        payload = {
            "items": payload_items[offset : offset + page_size],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminOnboardingListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminOnboardingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_onboarding(employee, serializer.validated_data)
        item = EmployeeOnboarding.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminOnboardingSerializer(build_hr_admin_onboarding_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminOnboardingDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeOnboarding.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee").first()
        if not item:
            return response.Response({"detail": "Onboarding record not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminOnboardingSerializer(build_hr_admin_onboarding_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeOnboarding.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Onboarding record not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminOnboardingWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_onboarding(employee, serializer.validated_data, item=item)
        item = EmployeeOnboarding.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminOnboardingSerializer(build_hr_admin_onboarding_payload(item)).data)


class HrAdminProbationReviewListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        decision_filter = (request.query_params.get("decision") or "").strip()
        owner_filter = (request.query_params.get("owner") or "").strip()

        queryset = ProbationReview.objects.filter(tenant=employee.tenant).select_related("employee")
        if decision_filter:
            queryset = queryset.filter(decision=decision_filter)
        if owner_filter.startswith("identifier:"):
            owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if owner_identifier:
                queryset = queryset.filter(reviewer_identifier__iexact=owner_identifier)
        elif owner_filter.startswith("employee:"):
            queryset = queryset.none()
        if search_value:
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(reviewer_identifier__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(remarks__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        queryset = queryset.order_by("-review_date", "-created_at")
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_probation_review_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminProbationReviewListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminProbationReviewWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_probation_review(employee, serializer.validated_data)
        item = ProbationReview.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminProbationReviewSerializer(build_hr_admin_probation_review_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminProbationReviewDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = ProbationReview.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee").first()
        if not item:
            return response.Response({"detail": "Probation review not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminProbationReviewSerializer(build_hr_admin_probation_review_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = ProbationReview.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Probation review not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminProbationReviewWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_probation_review(employee, serializer.validated_data, item=item)
        item = ProbationReview.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminProbationReviewSerializer(build_hr_admin_probation_review_payload(item)).data)


class HrAdminMovementListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        movement_type_filter = (request.query_params.get("movement_type") or "").strip()
        owner_filter = (request.query_params.get("owner") or "").strip()

        queryset = EmployeeMovement.objects.filter(tenant=employee.tenant).select_related(
            "employee",
            "from_legal_entity", "to_legal_entity",
            "from_branch", "to_branch",
            "from_location", "to_location",
            "from_department", "to_department",
            "from_business_unit", "to_business_unit",
            "from_designation", "to_designation",
            "from_grade", "to_grade",
            "from_employment_type", "to_employment_type",
            "from_manager", "to_manager", "to_manager__membership__user",
        )
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if movement_type_filter:
            queryset = queryset.filter(movement_type=movement_type_filter)
        if owner_filter.startswith("employee:"):
            movement_owner_id = owner_filter.removeprefix("employee:")
            if movement_owner_id:
                queryset = queryset.filter(to_manager_id=movement_owner_id)
        elif owner_filter.startswith("identifier:"):
            movement_owner_identifier = _get_lifecycle_owner_identifier(owner_filter)
            if movement_owner_identifier:
                queryset = queryset.filter(
                    Q(to_manager__membership__user__username__iexact=movement_owner_identifier)
                    | Q(to_manager__employee_code__iexact=movement_owner_identifier)
                )
        if search_value:
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(reason__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(from_department__name__icontains=search_value)
                | Q(to_department__name__icontains=search_value)
                | Q(from_designation__name__icontains=search_value)
                | Q(to_designation__name__icontains=search_value)
                | Q(status__icontains=search_value)
                | Q(movement_type__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        queryset = queryset.order_by("-effective_date", "-created_at")
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_movement_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminMovementListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminMovementWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_movement(employee, serializer.validated_data)
        item = EmployeeMovement.objects.select_related(
            "employee",
            "from_legal_entity", "to_legal_entity",
            "from_branch", "to_branch",
            "from_location", "to_location",
            "from_department", "to_department",
            "from_business_unit", "to_business_unit",
            "from_designation", "to_designation",
            "from_grade", "to_grade",
            "from_employment_type", "to_employment_type",
            "from_manager", "to_manager", "to_manager__membership__user",
        ).get(id=item.id)
        return response.Response(HrAdminMovementSerializer(build_hr_admin_movement_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminMovementDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeMovement.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "employee",
            "from_legal_entity", "to_legal_entity",
            "from_branch", "to_branch",
            "from_location", "to_location",
            "from_department", "to_department",
            "from_business_unit", "to_business_unit",
            "from_designation", "to_designation",
            "from_grade", "to_grade",
            "from_employment_type", "to_employment_type",
            "from_manager", "to_manager", "to_manager__membership__user",
        ).first()
        if not item:
            return response.Response({"detail": "Movement record not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminMovementSerializer(build_hr_admin_movement_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeMovement.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Movement record not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminMovementWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_movement(employee, serializer.validated_data, item=item)
        item = EmployeeMovement.objects.select_related(
            "employee",
            "from_legal_entity", "to_legal_entity",
            "from_branch", "to_branch",
            "from_location", "to_location",
            "from_department", "to_department",
            "from_business_unit", "to_business_unit",
            "from_designation", "to_designation",
            "from_grade", "to_grade",
            "from_employment_type", "to_employment_type",
            "from_manager", "to_manager", "to_manager__membership__user",
        ).get(id=item.id)
        return response.Response(HrAdminMovementSerializer(build_hr_admin_movement_payload(item)).data)


class HrAdminExitListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        rehire_eligible_filter = (request.query_params.get("rehire_eligible") or "").strip().lower()

        queryset = EmployeeExit.objects.filter(tenant=employee.tenant).select_related("employee")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if rehire_eligible_filter in {"yes", "true", "1"}:
            queryset = queryset.filter(rehire_eligible=True)
        elif rehire_eligible_filter in {"no", "false", "0"}:
            queryset = queryset.filter(rehire_eligible=False)
        if search_value:
            search_query = (
                Q(employee__first_name__icontains=search_value)
                | Q(employee__last_name__icontains=search_value)
                | Q(employee__employee_code__icontains=search_value)
                | Q(exit_reason__icontains=search_value)
                | Q(exit_reason_detail__icontains=search_value)
                | Q(workflow_reference__icontains=search_value)
                | Q(handover_notes__icontains=search_value)
                | Q(status__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        payload_items = [build_hr_admin_exit_payload(item) for item in queryset]
        payload_items.sort(key=_get_lifecycle_attention_sort_key)
        total_count = len(payload_items)
        offset = (page - 1) * page_size
        payload = {
            "items": payload_items[offset : offset + page_size],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminExitListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminExitWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_exit(employee, serializer.validated_data)
        item = EmployeeExit.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminExitSerializer(build_hr_admin_exit_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminExitDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeExit.objects.filter(tenant=employee.tenant, id=item_id).select_related("employee").first()
        if not item:
            return response.Response({"detail": "Exit record not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminExitSerializer(build_hr_admin_exit_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = EmployeeExit.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Exit record not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminExitWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_exit(employee, serializer.validated_data, item=item)
        item = EmployeeExit.objects.select_related("employee").get(id=item.id)
        return response.Response(HrAdminExitSerializer(build_hr_admin_exit_payload(item)).data)


class HrAdminNotificationOptionsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        tenant = employee.tenant
        channel_configurations = [
            get_or_create_channel_configuration(tenant=tenant, channel=channel)
            for channel, _label in NotificationChannel.choices
        ]
        subject_types = sorted(
            {
                value
                for value in Notification.objects.filter(tenant=tenant)
                .exclude(subject_type="")
                .values_list("subject_type", flat=True)
            }
        )
        payload = {
            "notification_channels": [{"value": value, "label": label} for value, label in NotificationChannel.choices],
            "notification_delivery_backends": get_registered_notification_backends(),
            "notification_delivery_authoring": {
                "policy_fields": [
                    {
                        "key": "max_attempts",
                        "label": "Max attempts",
                        "description": "Caps how many delivery attempts one notification can make before retry is blocked.",
                        "input_type": "number",
                        "default_value": 3,
                        "min_value": 1,
                        "max_value": 20,
                    },
                    {
                        "key": "retry_backoff_minutes",
                        "label": "Retry backoff minutes",
                        "description": "Delays queued retries when delivery is rescheduled instead of processed immediately.",
                        "input_type": "number",
                        "default_value": 0,
                        "min_value": 0,
                        "max_value": 1440,
                    },
                ],
                "provider_fields": [
                    {
                        "backend_key": NotificationDeliveryBackend.EMAIL_SMTP,
                        "key": "reply_to",
                        "label": "Reply-to email",
                        "description": "Optional reply-to address used by SMTP-style providers for recipient responses.",
                        "input_type": "text",
                        "default_value": "",
                        "placeholder": "support@example.local",
                    },
                    {
                        "backend_key": NotificationDeliveryBackend.CONSOLE,
                        "key": "log_label",
                        "label": "Log label",
                        "description": "Short label to make console-delivered messages easier to scan during local development.",
                        "input_type": "text",
                        "default_value": "default",
                        "placeholder": "default",
                    },
                    {
                        "backend_key": NotificationDeliveryBackend.SMS_CONSOLE,
                        "key": "template_namespace",
                        "label": "Template namespace",
                        "description": "Namespace for SMS template routing once a real provider integration is introduced.",
                        "input_type": "text",
                        "default_value": "default",
                        "placeholder": "default",
                    },
                    {
                        "backend_key": NotificationDeliveryBackend.PUSH_CONSOLE,
                        "key": "app_segment",
                        "label": "App segment",
                        "description": "Logical push target or mobile app segment that future providers can use for routing.",
                        "input_type": "text",
                        "default_value": "employees",
                        "placeholder": "employees",
                    },
                    {
                        "backend_key": NotificationDeliveryBackend.WHATSAPP_CONSOLE,
                        "key": "template_language",
                        "label": "Template language",
                        "description": "Default WhatsApp template language code for future provider-backed template sends.",
                        "input_type": "text",
                        "default_value": "en",
                        "placeholder": "en",
                    },
                ],
                "channel_hints": [
                    {
                        "channel": NotificationChannel.IN_APP,
                        "sender_identifier_label": "Workspace sender key",
                        "sender_identifier_placeholder": "nexora-hrms",
                        "sender_address_label": "Sender address",
                        "sender_address_placeholder": "Not required for in-app delivery",
                        "provider_config_example": {},
                    },
                    {
                        "channel": NotificationChannel.EMAIL,
                        "sender_identifier_label": "From name or sender key",
                        "sender_identifier_placeholder": "nexora-hrms",
                        "sender_address_label": "From email",
                        "sender_address_placeholder": "notifications@example.local",
                        "provider_config_example": {"reply_to": "support@example.local"},
                    },
                    {
                        "channel": NotificationChannel.SMS,
                        "sender_identifier_label": "SMS sender ID",
                        "sender_identifier_placeholder": "NEXORA",
                        "sender_address_label": "Sender address",
                        "sender_address_placeholder": "Optional callback or route address",
                        "provider_config_example": {"template_namespace": "default"},
                    },
                    {
                        "channel": NotificationChannel.PUSH,
                        "sender_identifier_label": "Push app key",
                        "sender_identifier_placeholder": "nexora-mobile",
                        "sender_address_label": "Sender address",
                        "sender_address_placeholder": "Optional endpoint alias",
                        "provider_config_example": {"app_segment": "employees"},
                    },
                    {
                        "channel": NotificationChannel.WHATSAPP,
                        "sender_identifier_label": "WhatsApp business key",
                        "sender_identifier_placeholder": "nexora-wa",
                        "sender_address_label": "Sender address",
                        "sender_address_placeholder": "Optional business route address",
                        "provider_config_example": {"template_language": "en"},
                    },
                ],
            },
            "notification_catalog_authoring": {
                "template_channel_hints": [
                    {
                        "channel": NotificationChannel.IN_APP,
                        "subject_supported": False,
                        "title_supported": True,
                        "body_placeholder": "Your request was reviewed. Open the workspace to continue.",
                        "sample_variables": ["employee_name", "request_id", "status"],
                        "metadata_fields": [
                            {
                                "key": "action_path",
                                "label": "Action path",
                                "description": "Relative workspace path that in-app notifications can deep-link into.",
                                "input_type": "text",
                                "default_value": "",
                                "placeholder": "/hr-admin/notifications",
                            }
                        ],
                    },
                    {
                        "channel": NotificationChannel.EMAIL,
                        "subject_supported": True,
                        "title_supported": False,
                        "body_placeholder": "Hello {{ employee_name }},\n\nYour request status is now {{ status }}.",
                        "sample_variables": ["employee_name", "status", "effective_date"],
                        "metadata_fields": [
                            {
                                "key": "reply_to_label",
                                "label": "Reply-to label",
                                "description": "Optional display label paired with reply-to handling for later provider integrations.",
                                "input_type": "text",
                                "default_value": "",
                                "placeholder": "HR Helpdesk",
                            }
                        ],
                    },
                    {
                        "channel": NotificationChannel.SMS,
                        "subject_supported": False,
                        "title_supported": False,
                        "body_placeholder": "Hi {{ employee_name }}, your request is {{ status }}.",
                        "sample_variables": ["employee_name", "status", "short_code"],
                        "metadata_fields": [
                            {
                                "key": "sms_category",
                                "label": "SMS category",
                                "description": "Optional tag to separate OTP, transactional, or reminder style templates later.",
                                "input_type": "text",
                                "default_value": "transactional",
                                "placeholder": "transactional",
                            }
                        ],
                    },
                    {
                        "channel": NotificationChannel.PUSH,
                        "subject_supported": False,
                        "title_supported": True,
                        "body_placeholder": "{{ title }}\n{{ status_message }}",
                        "sample_variables": ["title", "status_message", "deep_link"],
                        "metadata_fields": [
                            {
                                "key": "deep_link",
                                "label": "Deep link",
                                "description": "Mobile or web destination used by future push providers when a user opens the notification.",
                                "input_type": "text",
                                "default_value": "",
                                "placeholder": "nexora://employee/requests",
                            }
                        ],
                    },
                    {
                        "channel": NotificationChannel.WHATSAPP,
                        "subject_supported": False,
                        "title_supported": False,
                        "body_placeholder": "Hello {{ employee_name }}, your document {{ document_name }} needs attention.",
                        "sample_variables": ["employee_name", "document_name", "deadline"],
                        "metadata_fields": [
                            {
                                "key": "template_name",
                                "label": "Provider template name",
                                "description": "External WhatsApp template identifier for future approved-provider integrations.",
                                "input_type": "text",
                                "default_value": "",
                                "placeholder": "document_expiry_alert",
                            }
                        ],
                    },
                ],
                "event_module_hints": [
                    {
                        "module": "leave",
                        "default_channel": NotificationChannel.IN_APP,
                        "default_audience_type": NotificationAudienceType.MANAGER,
                        "trigger_examples": [
                            {
                                "key": "leave.request.submitted",
                                "label": "Leave submitted",
                                "description": "Route a new leave request into the manager or HR approval queue.",
                            },
                            {
                                "key": "leave.request.decision_ready",
                                "label": "Leave decision ready",
                                "description": "Inform the employee that the request has been approved, rejected, or sent back.",
                            },
                        ],
                    },
                    {
                        "module": "attendance",
                        "default_channel": NotificationChannel.IN_APP,
                        "default_audience_type": NotificationAudienceType.MANAGER,
                        "trigger_examples": [
                            {
                                "key": "attendance.regularization.submitted",
                                "label": "Regularization submitted",
                                "description": "Alert the reviewer when an employee sends a new attendance correction request.",
                            },
                            {
                                "key": "attendance.regularization.decision_ready",
                                "label": "Regularization decision ready",
                                "description": "Inform the employee after the attendance review is completed.",
                            },
                        ],
                    },
                    {
                        "module": "lifecycle",
                        "default_channel": NotificationChannel.IN_APP,
                        "default_audience_type": NotificationAudienceType.CUSTOM,
                        "trigger_examples": [
                            {
                                "key": "lifecycle.onboarding.attention_required",
                                "label": "Onboarding attention required",
                                "description": "Route missing onboarding work items to HR or the assigned lifecycle owner.",
                            },
                            {
                                "key": "lifecycle.exit.clearance_pending",
                                "label": "Exit clearance pending",
                                "description": "Remind owners and employees about open exit or clearance tasks.",
                            },
                        ],
                    },
                    {
                        "module": "documents",
                        "default_channel": NotificationChannel.IN_APP,
                        "default_audience_type": NotificationAudienceType.EMPLOYEE,
                        "trigger_examples": [
                            {
                                "key": "documents.employee.upload_submitted",
                                "label": "Upload submitted",
                                "description": "Notify reviewers that a new employee document is waiting in the verification queue.",
                            },
                            {
                                "key": "documents.employee.reupload_requested",
                                "label": "Re-upload requested",
                                "description": "Tell the employee to upload a corrected document copy.",
                            },
                            {
                                "key": "documents.employee.expiry_attention",
                                "label": "Expiry attention",
                                "description": "Warn the employee that a document is expired or close to expiry.",
                            },
                        ],
                    },
                ],
                "audience_hints": [
                    {
                        "audience_type": NotificationAudienceType.EMPLOYEE,
                        "label": "Employee",
                        "description": "Target the employee tied to the event subject, such as a leave request owner or document owner.",
                        "role_supported": False,
                        "membership_supported": False,
                        "recipient_snapshot_example": {"routing": "employee_membership"},
                        "recipient_snapshot_fields": [
                            {
                                "key": "routing",
                                "label": "Routing key",
                                "description": "Optional explicit routing label used by downstream delivery logic and review tools.",
                                "input_type": "text",
                                "default_value": "employee_membership",
                                "placeholder": "employee_membership",
                            }
                        ],
                    },
                    {
                        "audience_type": NotificationAudienceType.MANAGER,
                        "label": "Manager",
                        "description": "Target the current reporting manager or designated approver connected to the event subject.",
                        "role_supported": False,
                        "membership_supported": False,
                        "recipient_snapshot_example": {"routing": "reporting_manager"},
                        "recipient_snapshot_fields": [
                            {
                                "key": "routing",
                                "label": "Routing key",
                                "description": "Use a stable label when manager routing should remain explicit in downstream review surfaces.",
                                "input_type": "text",
                                "default_value": "reporting_manager",
                                "placeholder": "reporting_manager",
                            }
                        ],
                    },
                    {
                        "audience_type": NotificationAudienceType.ROLE,
                        "label": "Role",
                        "description": "Target every active membership that currently holds the selected role in the tenant.",
                        "role_supported": True,
                        "membership_supported": False,
                        "recipient_snapshot_example": {"routing": "tenant_role", "scope": "active_memberships"},
                        "recipient_snapshot_fields": [
                            {
                                "key": "routing",
                                "label": "Routing key",
                                "description": "Optional role-routing label for queue visibility and future provider analytics.",
                                "input_type": "text",
                                "default_value": "tenant_role",
                                "placeholder": "tenant_role",
                            },
                            {
                                "key": "scope",
                                "label": "Scope",
                                "description": "Optional scope label to describe who inside the role should be targeted.",
                                "input_type": "text",
                                "default_value": "active_memberships",
                                "placeholder": "active_memberships",
                            },
                        ],
                    },
                    {
                        "audience_type": NotificationAudienceType.MEMBERSHIP,
                        "label": "Membership",
                        "description": "Send directly to one named tenant membership when the delivery target should be fixed.",
                        "role_supported": False,
                        "membership_supported": True,
                        "recipient_snapshot_example": {"routing": "fixed_membership"},
                        "recipient_snapshot_fields": [
                            {
                                "key": "routing",
                                "label": "Routing key",
                                "description": "Optional fixed-target label kept with the event for review and troubleshooting.",
                                "input_type": "text",
                                "default_value": "fixed_membership",
                                "placeholder": "fixed_membership",
                            }
                        ],
                    },
                    {
                        "audience_type": NotificationAudienceType.CUSTOM,
                        "label": "Custom",
                        "description": "Use custom routing when workflow owners, HR fallback, or event-specific resolution logic determines the final audience.",
                        "role_supported": True,
                        "membership_supported": True,
                        "recipient_snapshot_example": {"routing": "workflow_owner_or_hr", "fallback": "hr_admin"},
                        "recipient_snapshot_fields": [
                            {
                                "key": "routing",
                                "label": "Routing key",
                                "description": "Describe the custom resolver that downstream delivery or review logic should interpret.",
                                "input_type": "text",
                                "default_value": "workflow_owner_or_hr",
                                "placeholder": "workflow_owner_or_hr",
                            },
                            {
                                "key": "fallback",
                                "label": "Fallback target",
                                "description": "Optional fallback label used when the primary custom audience cannot be resolved.",
                                "input_type": "text",
                                "default_value": "hr_admin",
                                "placeholder": "hr_admin",
                            },
                        ],
                    },
                ],
            },
            "notification_audience_types": [{"value": value, "label": label} for value, label in NotificationAudienceType.choices],
            "notification_template_statuses": [{"value": value, "label": label} for value, label in NotificationTemplateStatus.choices],
            "notification_priorities": [{"value": value, "label": label} for value, label in NotificationPriority.choices],
            "notification_statuses": [{"value": value, "label": label} for value, label in NotificationStatus.choices],
            "notification_retry_states": [
                {"value": "retry_ready", "label": "Retry Ready"},
                {"value": "retry_capped", "label": "Retry Capped"},
                {"value": "no_retry_needed", "label": "No Retry Needed"},
            ],
            "notification_subject_types": [{"value": value, "label": value.replace("_", " ").title()} for value in subject_types],
            "workflow_modules": [{"value": value, "label": label} for value, label in WorkflowModule.choices],
            "templates": [
                {"id": item.id, "name": item.name, "channel": item.channel, "status": item.status}
                for item in NotificationTemplate.objects.filter(tenant=tenant).order_by("channel", "name")
            ],
            "roles": [{"id": item.id, "code": item.code, "name": item.name} for item in Role.objects.filter(tenant=tenant, is_active=True).order_by("name")],
            "memberships": [
                {"id": item.id, "name": item.user.display_name or item.user.get_full_name() or item.user.username}
                for item in TenantMembership.objects.filter(tenant=tenant).select_related("user").order_by("user__username")
            ],
            "channel_configurations": [
                build_hr_admin_notification_channel_configuration_payload(item) for item in channel_configurations
            ],
        }
        return response.Response(HrAdminNotificationOptionsSerializer(payload).data)


class HrAdminNotificationChannelConfigurationListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = [
            get_or_create_channel_configuration(tenant=employee.tenant, channel=channel)
            for channel, _label in NotificationChannel.choices
        ]
        payload = [build_hr_admin_notification_channel_configuration_payload(item) for item in items]
        return response.Response(HrAdminNotificationChannelConfigurationSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationChannelConfigurationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_channel_configuration(employee, serializer.validated_data)
        return response.Response(
            HrAdminNotificationChannelConfigurationSerializer(
                build_hr_admin_notification_channel_configuration_payload(item)
            ).data,
            status=status.HTTP_201_CREATED,
        )


class HrAdminNotificationChannelConfigurationDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationChannelConfiguration.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification channel configuration not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(
            HrAdminNotificationChannelConfigurationSerializer(
                build_hr_admin_notification_channel_configuration_payload(item)
            ).data
        )

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationChannelConfiguration.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification channel configuration not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationChannelConfigurationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_channel_configuration(employee, serializer.validated_data, item=item)
        return response.Response(
            HrAdminNotificationChannelConfigurationSerializer(
                build_hr_admin_notification_channel_configuration_payload(item)
            ).data
        )


class HrAdminNotificationTemplateListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = NotificationTemplate.objects.filter(tenant=employee.tenant).order_by("channel", "name")
        payload = [build_hr_admin_notification_template_payload(item) for item in items]
        return response.Response(HrAdminNotificationTemplateSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationTemplateWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_template(employee, serializer.validated_data)
        return response.Response(HrAdminNotificationTemplateSerializer(build_hr_admin_notification_template_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminNotificationTemplateDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationTemplate.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification template not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminNotificationTemplateSerializer(build_hr_admin_notification_template_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationTemplate.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification template not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationTemplateWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_template(employee, serializer.validated_data, item=item)
        return response.Response(HrAdminNotificationTemplateSerializer(build_hr_admin_notification_template_payload(item)).data)


class HrAdminNotificationTemplatePreviewView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationTemplatePreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        if not (validated.get("body_template") or "").strip():
            return response.Response(
                {"body_template": ["Template body is required for preview."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership = _get_notification_preview_membership(tenant=employee.tenant, membership_id=validated.get("membership_id"))
        preview = _build_notification_template_preview(
            channel=validated["channel"],
            subject_template=validated.get("subject_template", ""),
            title_template=validated.get("title_template", ""),
            body_template=validated.get("body_template", ""),
            metadata_template=validated.get("metadata_template") or {},
            sample_payload=validated.get("sample_payload") or {},
            membership=membership,
        )
        return response.Response(HrAdminNotificationPreviewResponseSerializer({"preview": preview, "test_notification": None}).data)


class HrAdminNotificationTemplateTestSendView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationTemplatePreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        if not (validated.get("body_template") or "").strip():
            return response.Response(
                {"body_template": ["Template body is required for preview."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership = _get_notification_preview_membership(tenant=employee.tenant, membership_id=validated.get("membership_id"))
        if not membership:
            return response.Response({"detail": "Choose a test membership before sending a template test notification."}, status=status.HTTP_400_BAD_REQUEST)
        preview = _build_notification_template_preview(
            channel=validated["channel"],
            subject_template=validated.get("subject_template", ""),
            title_template=validated.get("title_template", ""),
            body_template=validated.get("body_template", ""),
            metadata_template=validated.get("metadata_template") or {},
            sample_payload=validated.get("sample_payload") or {},
            membership=membership,
        )
        notification = _create_test_notification_from_template(
            actor=employee,
            channel=validated["channel"],
            subject_template=validated.get("subject_template", ""),
            title_template=validated.get("title_template", ""),
            body_template=validated.get("body_template", ""),
            metadata_template=validated.get("metadata_template") or {},
            sample_payload=validated.get("sample_payload") or {},
            membership=membership,
            process_now=validated.get("process_now", True),
        )
        notification = Notification.objects.select_related("event_definition", "recipient_membership__user", "recipient_role").prefetch_related("delivery_logs").get(id=notification.id)
        return response.Response(HrAdminNotificationPreviewResponseSerializer({"preview": preview, "test_notification": build_hr_admin_notification_payload(notification)}).data)


class HrAdminNotificationEventDefinitionListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        items = NotificationEventDefinition.objects.filter(tenant=employee.tenant).select_related("template", "role", "membership__user").order_by("module", "trigger_key", "channel")
        payload = [build_hr_admin_notification_event_payload(item) for item in items]
        return response.Response(HrAdminNotificationEventDefinitionSerializer(payload, many=True).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationEventDefinitionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_event(employee, serializer.validated_data)
        item = NotificationEventDefinition.objects.select_related("template", "role", "membership__user").get(id=item.id)
        return response.Response(HrAdminNotificationEventDefinitionSerializer(build_hr_admin_notification_event_payload(item)).data, status=status.HTTP_201_CREATED)


class HrAdminNotificationEventPreviewView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationEventPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preview, _, _ = _build_notification_event_preview(
            actor=employee,
            validated_data=serializer.validated_data,
            sample_payload=serializer.validated_data.get("sample_payload") or {},
        )
        return response.Response(HrAdminNotificationPreviewResponseSerializer({"preview": preview, "test_notification": None}).data)


class HrAdminNotificationEventTestSendView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationEventPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preview, membership, role = _build_notification_event_preview(
            actor=employee,
            validated_data=serializer.validated_data,
            sample_payload=serializer.validated_data.get("sample_payload") or {},
        )
        if not membership:
            return response.Response({"detail": "Choose a fixed or test membership before sending an event test notification."}, status=status.HTTP_400_BAD_REQUEST)
        notification = _create_test_notification_from_event(
            actor=employee,
            validated_data=serializer.validated_data,
            sample_payload=serializer.validated_data.get("sample_payload") or {},
            membership=membership,
            role=role,
            process_now=serializer.validated_data.get("process_now", True),
        )
        notification = Notification.objects.select_related("event_definition", "recipient_membership__user", "recipient_role").prefetch_related("delivery_logs").get(id=notification.id)
        return response.Response(HrAdminNotificationPreviewResponseSerializer({"preview": preview, "test_notification": build_hr_admin_notification_payload(notification)}).data)


class HrAdminNotificationEventDefinitionDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationEventDefinition.objects.filter(tenant=employee.tenant, id=item_id).select_related("template", "role", "membership__user").first()
        if not item:
            return response.Response({"detail": "Notification event definition not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminNotificationEventDefinitionSerializer(build_hr_admin_notification_event_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = NotificationEventDefinition.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification event definition not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationEventDefinitionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification_event(employee, serializer.validated_data, item=item)
        item = NotificationEventDefinition.objects.select_related("template", "role", "membership__user").get(id=item.id)
        return response.Response(HrAdminNotificationEventDefinitionSerializer(build_hr_admin_notification_event_payload(item)).data)


class HrAdminNotificationDiagnosticsView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)

        tenant = employee.tenant
        scope = (request.query_params.get("scope") or "").strip().lower()
        notifications = Notification.objects.filter(tenant=tenant)
        if scope == "delivery":
            payload = {
                "overview": {
                    "total_templates": NotificationTemplate.objects.filter(tenant=tenant).count(),
                    "active_templates": NotificationTemplate.objects.filter(tenant=tenant, status=NotificationTemplateStatus.ACTIVE).count(),
                    "total_events": NotificationEventDefinition.objects.filter(tenant=tenant).count(),
                    "active_events": NotificationEventDefinition.objects.filter(tenant=tenant, is_active=True).count(),
                    "live_notifications": notifications.count(),
                    "failed_notifications": notifications.filter(status=NotificationStatus.FAILED).count(),
                    "preview_test_notifications": notifications.filter(payload__preview_mode__in=["template_test_send", "event_test_send"]).count(),
                },
                "alerts": [],
                "recommendations": [],
                "channel_diagnostics": build_hr_admin_notification_channel_diagnostics(tenant=tenant),
                "template_diagnostics": [],
                "event_diagnostics": [],
                "recent_test_notifications": [],
            }
            return response.Response(HrAdminNotificationDiagnosticsSerializer(payload).data)

        templates = list(NotificationTemplate.objects.filter(tenant=tenant).order_by("channel", "name"))
        events = list(NotificationEventDefinition.objects.filter(tenant=tenant).select_related("template").order_by("module", "trigger_key", "channel"))

        template_usage = {
            row["event_definition__template_id"]: row
            for row in notifications.filter(event_definition__template_id__isnull=False)
            .values("event_definition__template_id")
            .annotate(
                live_notification_count=Count("id"),
                failed_notification_count=Count("id", filter=Q(status=NotificationStatus.FAILED)),
                last_notification_at=Max("created_at"),
            )
        }
        event_usage = {
            row["event_definition_id"]: row
            for row in notifications.filter(event_definition_id__isnull=False)
            .values("event_definition_id")
            .annotate(
                live_notification_count=Count("id"),
                failed_notification_count=Count("id", filter=Q(status=NotificationStatus.FAILED)),
                last_notification_at=Max("created_at"),
            )
        }
        event_test_usage = {
            row["payload__event_code"]: row["test_notification_count"]
            for row in notifications.filter(payload__preview_mode="event_test_send")
            .exclude(payload__event_code="")
            .values("payload__event_code")
            .annotate(test_notification_count=Count("id"))
        }
        template_diagnostics = [
            {
                "template_id": item.id,
                "template_name": item.name,
                "template_code": item.code,
                "channel": item.channel,
                "status": item.status,
                "linked_event_count": sum(1 for event in events if event.template_id == item.id),
                "active_event_count": sum(1 for event in events if event.template_id == item.id and event.is_active),
                "live_notification_count": template_usage.get(item.id, {}).get("live_notification_count", 0),
                "failed_notification_count": template_usage.get(item.id, {}).get("failed_notification_count", 0),
                "last_notification_at": template_usage.get(item.id, {}).get("last_notification_at"),
            }
            for item in templates
        ]
        event_diagnostics = [
            {
                "event_id": item.id,
                "event_name": item.name,
                "event_code": item.code,
                "module": item.module,
                "channel": item.channel,
                "audience_type": item.audience_type,
                "is_active": item.is_active,
                "template_name": item.template.name if item.template else None,
                "live_notification_count": event_usage.get(item.id, {}).get("live_notification_count", 0),
                "failed_notification_count": event_usage.get(item.id, {}).get("failed_notification_count", 0),
                "test_notification_count": event_test_usage.get(item.code, 0),
                "last_notification_at": event_usage.get(item.id, {}).get("last_notification_at"),
            }
            for item in events
        ]

        alerts: list[dict] = []
        recommendations: list[dict] = []
        inactive_templates = [item for item in template_diagnostics if item["linked_event_count"] == 0]
        failing_events = [item for item in event_diagnostics if item["failed_notification_count"] > 0]
        untested_active_events = [item for item in event_diagnostics if item["is_active"] and item["test_notification_count"] == 0]
        channel_diagnostics = build_hr_admin_notification_channel_diagnostics(tenant=tenant)
        if inactive_templates:
            alerts.append({
                "level": "medium",
                "title": "Templates without linked events",
                "description": f"{len(inactive_templates)} templates are not connected to any event definitions yet.",
                "href": "/hr-admin/notification-templates",
            })
        if failing_events:
            alerts.append({
                "level": "high",
                "title": "Events with failed delivery history",
                "description": f"{len(failing_events)} event definitions have generated failed notifications and need review.",
                "href": "/hr-admin/notifications",
            })
        if untested_active_events:
            alerts.append({
                "level": "info",
                "title": "Active events without test sends",
                "description": f"{len(untested_active_events)} active event definitions have never been verified through the preview/test flow.",
                "href": "/hr-admin/notification-events",
            })

        highest_failure_template = max(template_diagnostics, key=lambda item: item["failed_notification_count"], default=None)
        if highest_failure_template and highest_failure_template["failed_notification_count"] > 0:
            recommendations.append({
                "category": "Template quality",
                "title": f"Review template {highest_failure_template['template_name']}",
                "description": f"It is linked to {highest_failure_template['failed_notification_count']} failed notifications.",
                "href": f"/hr-admin/notification-templates/{highest_failure_template['template_id']}/edit",
            })
        highest_failure_event = max(event_diagnostics, key=lambda item: item["failed_notification_count"], default=None)
        if highest_failure_event and highest_failure_event["failed_notification_count"] > 0:
            recommendations.append({
                "category": "Event routing",
                "title": f"Inspect event {highest_failure_event['event_name']}",
                "description": f"It has {highest_failure_event['failed_notification_count']} failed notifications and may need routing or channel changes.",
                "href": f"/hr-admin/notification-events/{highest_failure_event['event_id']}/edit",
            })
        busiest_retry_channel = next(
            (item for item in channel_diagnostics if item["failed_notification_count"] > 0),
            None,
        )
        if busiest_retry_channel:
            recommendations.append({
                "category": "Delivery routing",
                "title": f"Check {busiest_retry_channel['label']} delivery settings",
                "description": f"This channel currently carries {busiest_retry_channel['failed_notification_count']} failed notifications.",
                "href": "/hr-admin/notification-delivery",
            })
        if not recommendations:
            recommendations.append({
                "category": "Health",
                "title": "Notification catalog looks healthy",
                "description": "No failing templates or events are currently standing out in diagnostics.",
                "href": "/hr-admin/notifications-admin",
            })

        payload = {
            "overview": {
                "total_templates": len(templates),
                "active_templates": sum(1 for item in templates if item.status == NotificationTemplateStatus.ACTIVE),
                "total_events": len(events),
                "active_events": sum(1 for item in events if item.is_active),
                "live_notifications": notifications.count(),
                "failed_notifications": notifications.filter(status=NotificationStatus.FAILED).count(),
                "preview_test_notifications": notifications.filter(payload__preview_mode__in=["template_test_send", "event_test_send"]).count(),
            },
            "alerts": alerts,
            "recommendations": recommendations,
            "channel_diagnostics": channel_diagnostics,
            "template_diagnostics": template_diagnostics,
            "event_diagnostics": event_diagnostics,
            "recent_test_notifications": [
                build_hr_admin_notification_payload(item)
                for item in notifications.filter(payload__preview_mode__in=["template_test_send", "event_test_send"])
                .select_related("event_definition", "recipient_membership__user", "recipient_role")
                .prefetch_related("delivery_logs")
                .order_by("-created_at")[:10]
            ],
        }
        return response.Response(HrAdminNotificationDiagnosticsSerializer(payload).data)


class HrAdminNotificationListView(HrAdminContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            page = max(int(request.query_params.get("page", 1) or 1), 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get("page_size", 25) or 25), 1), 100)
        except (TypeError, ValueError):
            page_size = 25
        search_value = (request.query_params.get("q") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        channel_filter = (request.query_params.get("channel") or "").strip()
        priority_filter = (request.query_params.get("priority") or "").strip()
        audience_type_filter = (request.query_params.get("audience_type") or "").strip()
        module_filter = (request.query_params.get("module") or "").strip()
        subject_type_filter = (request.query_params.get("subject_type") or "").strip()
        retry_state_filter = (request.query_params.get("retry_state") or "").strip()

        queryset = Notification.objects.filter(tenant=employee.tenant).select_related(
            "event_definition",
            "recipient_membership__user",
            "recipient_role",
        ).prefetch_related("delivery_logs")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if channel_filter:
            queryset = queryset.filter(channel=channel_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if audience_type_filter:
            queryset = queryset.filter(audience_type=audience_type_filter)
        if module_filter:
            queryset = queryset.filter(event_definition__module=module_filter)
        if subject_type_filter:
            queryset = queryset.filter(subject_type=subject_type_filter)
        if search_value:
            search_query = (
                Q(title__icontains=search_value)
                | Q(subject__icontains=search_value)
                | Q(body__icontains=search_value)
                | Q(subject_type__icontains=search_value)
                | Q(subject_identifier__icontains=search_value)
                | Q(recipient_identifier__icontains=search_value)
                | Q(recipient_address__icontains=search_value)
                | Q(status__icontains=search_value)
                | Q(channel__icontains=search_value)
                | Q(priority__icontains=search_value)
                | Q(event_definition__name__icontains=search_value)
                | Q(recipient_membership__user__username__icontains=search_value)
                | Q(recipient_role__name__icontains=search_value)
            )
            queryset = queryset.filter(search_query)

        ordered_items = list(queryset.order_by("-created_at"))
        filtered_items = [item for item in ordered_items if _matches_notification_retry_state(item, retry_state_filter)]
        total_count = len(filtered_items)
        offset = (page - 1) * page_size
        items = filtered_items[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_notification_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminNotificationListSerializer(payload).data)


class HrAdminNotificationDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Notification.objects.filter(tenant=employee.tenant, id=item_id).select_related("event_definition", "recipient_membership__user", "recipient_role").prefetch_related("delivery_logs").first()
        if not item:
            return response.Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Notification.objects.filter(tenant=employee.tenant, id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = save_hr_admin_notification(employee, serializer.validated_data, item=item)
        item = Notification.objects.select_related("event_definition", "recipient_membership__user", "recipient_role").prefetch_related("delivery_logs").get(id=item.id)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)


class HrAdminNotificationRetryView(HrAdminContextMixin, APIView):
    def post(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = Notification.objects.filter(tenant=employee.tenant, id=item_id).select_related(
            "event_definition",
            "recipient_membership__user",
            "recipient_role",
        ).prefetch_related("delivery_logs").first()
        if not item:
            return response.Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationRetrySerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        try:
            item = retry_notification(item, process_now=serializer.validated_data["process_now"])
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        item = Notification.objects.select_related("event_definition", "recipient_membership__user", "recipient_role").prefetch_related("delivery_logs").get(id=item.id)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)


class HrAdminNotificationBulkRetryView(HrAdminContextMixin, APIView):
    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HrAdminNotificationBulkRetrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification_ids = serializer.validated_data["notification_ids"]
        process_now = serializer.validated_data["process_now"]
        items = list(Notification.objects.filter(tenant=employee.tenant, id__in=notification_ids))
        updated_count = 0
        for item in items:
            try:
                retry_notification(item, process_now=process_now)
                updated_count += 1
            except ValueError:
                continue
        if items and updated_count == 0:
            return response.Response(
                {"detail": "Selected notifications have reached the configured retry limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = {
            "action": "retry_delivery",
            "updated_count": updated_count,
        }
        return response.Response(BulkMutationResultSerializer(payload).data)


class MeNotificationListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        queryset = filter_user_notification_queryset(build_user_notification_queryset(employee, workspace="ess"), request)
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_notification_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminNotificationListSerializer(payload).data)


class MeNotificationDetailView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = build_user_notification_queryset(employee, workspace="ess").filter(id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification not found for employee scope."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = build_user_notification_queryset(employee, workspace="ess").filter(id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification not found for employee scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserNotificationReadStateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.read_at = serializer.validated_data["read_at"]
        item.save()
        item = build_user_notification_queryset(employee, workspace="ess").get(id=item.id)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)


class ManagerNotificationListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        queryset = filter_user_notification_queryset(build_user_notification_queryset(employee, workspace="mss"), request)
        total_count = queryset.count()
        offset = (page - 1) * page_size
        items = queryset[offset : offset + page_size]
        payload = {
            "items": [build_hr_admin_notification_payload(item) for item in items],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next": offset + page_size < total_count,
            "has_previous": page > 1,
        }
        return response.Response(HrAdminNotificationListSerializer(payload).data)


class ManagerNotificationDetailView(EmployeeContextMixin, APIView):
    def get(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = build_user_notification_queryset(employee, workspace="mss").filter(id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)

    def patch(self, request, item_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        item = build_user_notification_queryset(employee, workspace="mss").filter(id=item_id).first()
        if not item:
            return response.Response({"detail": "Notification not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserNotificationReadStateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.read_at = serializer.validated_data["read_at"]
        item.save()
        item = build_user_notification_queryset(employee, workspace="mss").get(id=item.id)
        return response.Response(HrAdminNotificationSerializer(build_hr_admin_notification_payload(item)).data)


class MeLeaveRequestListCreateView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        status_filter = (request.query_params.get("status") or "").strip()
        all_items = get_employee_leave_requests(employee)
        items = all_items
        if status_filter and status_filter != "all":
            items = [item for item in all_items if item["status"] == status_filter]
        status_counts = {
            "all": len(all_items),
            "pending": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.PENDING),
            "approved": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.APPROVED),
            "rejected": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.REJECTED),
            "withdrawn": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.WITHDRAWN),
            "cancelled": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.CANCELLED),
            "partially_approved": sum(1 for item in all_items if item["status"] == LeaveRequestStatus.PARTIALLY_APPROVED),
        }
        payload = _build_paginated_payload(items, page=page, page_size=page_size, extra={"status_counts": status_counts})
        return response.Response(LeaveRequestHistoryListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaveRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        leave_type = LeaveType.objects.filter(id=payload.pop("leave_type_id"), tenant=employee.tenant).first()
        if not leave_type:
            return response.Response({"detail": "Leave type not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            leave_request = submit_leave_request(employee=employee, leave_type=leave_type, **payload)
        except DjangoValidationError as exc:
            error_payload = getattr(exc, "message_dict", None) or {"detail": exc.messages[0] if exc.messages else "Invalid leave request."}
            return response.Response(error_payload, status=status.HTTP_400_BAD_REQUEST)
        payload = {"id": leave_request.id, "status": leave_request.status, "workflow_reference": leave_request.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class MeLeaveRequestDetailView(EmployeeContextMixin, APIView):
    def get(self, request, request_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_employee_leave_request_detail(employee, request_id)
        if not payload:
            return response.Response({"detail": "Leave request not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(LeaveRequestHistoryItemSerializer(payload).data)


class MeLeaveRequestWithdrawView(EmployeeContextMixin, APIView):
    def post(self, request, request_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        leave_request = LeaveRequest.objects.filter(id=request_id, employee=employee).select_related("leave_policy", "leave_type").first()
        if not leave_request:
            return response.Response({"detail": "Leave request not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaveRequestLifecycleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            leave_request = withdraw_leave_request(
                leave_request=leave_request,
                actor_employee=employee,
                reason=serializer.validated_data.get("reason", ""),
                attachment_reference=serializer.validated_data.get("attachment_reference", ""),
            )
        except DjangoValidationError as exc:
            error_payload = getattr(exc, "message_dict", None) or {"detail": exc.messages[0] if exc.messages else "Invalid leave lifecycle action."}
            return response.Response(error_payload, status=status.HTTP_400_BAD_REQUEST)
        payload = {"id": leave_request.id, "status": leave_request.status, "workflow_reference": leave_request.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class MeLeaveRequestCancelView(EmployeeContextMixin, APIView):
    def post(self, request, request_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        leave_request = LeaveRequest.objects.filter(id=request_id, employee=employee).select_related("leave_policy", "leave_type").first()
        if not leave_request:
            return response.Response({"detail": "Leave request not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaveRequestLifecycleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            leave_request = cancel_leave_request(
                leave_request=leave_request,
                actor_employee=employee,
                reason=serializer.validated_data.get("reason", ""),
                attachment_reference=serializer.validated_data.get("attachment_reference", ""),
            )
        except DjangoValidationError as exc:
            error_payload = getattr(exc, "message_dict", None) or {"detail": exc.messages[0] if exc.messages else "Invalid leave lifecycle action."}
            return response.Response(error_payload, status=status.HTTP_400_BAD_REQUEST)
        payload = {"id": leave_request.id, "status": leave_request.status, "workflow_reference": leave_request.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class MeAttendanceRegularizationListCreateView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        status_filter = (request.query_params.get("status") or "").strip()
        all_items = get_employee_attendance_regularizations(employee)
        items = all_items
        if status_filter and status_filter != "all":
            items = [item for item in items if item["status"] == status_filter]
        status_counts = {
            "all": len(all_items),
            "pending": sum(1 for item in all_items if item["status"] == RegularizationStatus.PENDING),
            "approved": sum(1 for item in all_items if item["status"] == RegularizationStatus.APPROVED),
            "rejected": sum(1 for item in all_items if item["status"] == RegularizationStatus.REJECTED),
        }
        payload = _build_paginated_payload(items, page=page, page_size=page_size, extra={"status_counts": status_counts})
        return response.Response(AttendanceRegularizationHistoryListSerializer(payload).data)

    def post(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AttendanceRegularizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attendance_record = AttendanceRecord.objects.filter(
            id=serializer.validated_data["attendance_record_id"],
            employee=employee,
        ).first()
        if not attendance_record:
            return response.Response({"detail": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            regularization = submit_regularization(
                employee=employee,
                attendance_record=attendance_record,
                requested_status=serializer.validated_data["requested_status"],
                requested_check_in_at=serializer.validated_data.get("requested_check_in_at"),
                requested_check_out_at=serializer.validated_data.get("requested_check_out_at"),
                reason=serializer.validated_data.get("reason", ""),
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload = {"id": regularization.id, "status": regularization.status, "workflow_reference": regularization.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data, status=status.HTTP_201_CREATED)


class MeAttendanceRegularizationDetailView(EmployeeContextMixin, APIView):
    def get(self, request, regularization_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_employee_attendance_regularization_detail(employee, regularization_id)
        if not payload:
            return response.Response({"detail": "Attendance regularization not found."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(AttendanceRegularizationHistoryItemSerializer(payload).data)


class ManagerDecisionMixin(EmployeeContextMixin):
    def _is_current_workflow_approver(self, workflow_reference: str) -> bool:
        actor = self.get_employee()
        if not actor or not workflow_reference:
            return False
        actor_identifiers = [str(actor.id)]
        membership = getattr(actor, "membership", None)
        if membership and membership.user_id:
            actor_identifiers.append(str(membership.user_id))
        queryset = WorkflowAssignment.objects.filter(
            step_instance__workflow_instance__id=workflow_reference,
            step_instance__status__in=[WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS],
        )
        if membership:
            queryset = queryset.filter(Q(membership=membership) | Q(actor_identifier__in=actor_identifiers))
        else:
            queryset = queryset.filter(actor_identifier__in=actor_identifiers)
        return queryset.exists()

    def ensure_manager_scope(self, target_employee):
        actor = self.get_employee()
        if not actor:
            return False
        if target_employee.reporting_manager_id == actor.id:
            return True
        return False

    def ensure_leave_request_scope(self, leave_request):
        if leave_request.workflow_reference:
            return self._is_current_workflow_approver(leave_request.workflow_reference)
        return self.ensure_manager_scope(leave_request.employee)


class ManagerPendingLeaveRequestListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        items = get_manager_pending_leave_requests(employee)
        payload = _build_paginated_payload(items, page=page, page_size=page_size)
        return response.Response(ManagerLeaveApprovalListSerializer(payload).data)


class ManagerLeaveRequestDetailView(EmployeeContextMixin, APIView):
    def get(self, request, request_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_manager_leave_request_detail(employee, request_id)
        if not payload:
            return response.Response({"detail": "Leave request not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(ManagerLeaveApprovalItemSerializer(payload).data)


class ManagerLeaveRequestApproveView(ManagerDecisionMixin, APIView):
    def post(self, request, request_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        leave_request = LeaveRequest.objects.select_related("employee__reporting_manager", "employee__membership").filter(id=request_id).first()
        if not leave_request or not self.ensure_leave_request_scope(leave_request):
            return response.Response({"detail": "Leave request not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = resolve_leave_request(leave_request=leave_request, actor_employee=actor, approve=True, comment=serializer.validated_data.get("comment", ""))
        payload = {"id": leave_request.id, "status": leave_request.status, "workflow_reference": leave_request.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class ManagerLeaveRequestRejectView(ManagerDecisionMixin, APIView):
    def post(self, request, request_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        leave_request = LeaveRequest.objects.select_related("employee__reporting_manager", "employee__membership").filter(id=request_id).first()
        if not leave_request or not self.ensure_leave_request_scope(leave_request):
            return response.Response({"detail": "Leave request not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = resolve_leave_request(leave_request=leave_request, actor_employee=actor, approve=False, comment=serializer.validated_data.get("comment", ""))
        payload = {"id": leave_request.id, "status": leave_request.status, "workflow_reference": leave_request.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class ManagerAttendanceRegularizationApproveView(ManagerDecisionMixin, APIView):
    def post(self, request, regularization_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        regularization = AttendanceRegularization.objects.select_related("employee__reporting_manager", "employee__membership", "attendance_record").filter(id=regularization_id).first()
        if not regularization or not self.ensure_manager_scope(regularization.employee):
            return response.Response({"detail": "Attendance regularization not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regularization = resolve_regularization(regularization=regularization, actor_employee=actor, approve=True, comment=serializer.validated_data.get("comment", ""))
        payload = {"id": regularization.id, "status": regularization.status, "workflow_reference": regularization.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)


class ManagerPendingAttendanceRegularizationListView(EmployeeContextMixin, APIView):
    def get(self, request):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        page, page_size = _get_page_params(request)
        items = get_manager_pending_attendance_regularizations(employee)
        payload = _build_paginated_payload(items, page=page, page_size=page_size)
        return response.Response(HrAdminAttendanceRegularizationListSerializer(payload).data)


class ManagerAttendanceRegularizationDetailView(EmployeeContextMixin, APIView):
    def get(self, request, regularization_id):
        employee = self.get_employee()
        if not employee:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        payload = get_manager_attendance_regularization_detail(employee, regularization_id)
        if not payload:
            return response.Response({"detail": "Attendance regularization not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(ManagerAttendanceApprovalItemSerializer(payload).data)


class ManagerAttendanceRegularizationRejectView(ManagerDecisionMixin, APIView):
    def post(self, request, regularization_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=status.HTTP_404_NOT_FOUND)
        regularization = AttendanceRegularization.objects.select_related("employee__reporting_manager", "employee__membership", "attendance_record").filter(id=regularization_id).first()
        if not regularization or not self.ensure_manager_scope(regularization.employee):
            return response.Response({"detail": "Attendance regularization not found for manager scope."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ManagerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regularization = resolve_regularization(regularization=regularization, actor_employee=actor, approve=False, comment=serializer.validated_data.get("comment", ""))
        payload = {"id": regularization.id, "status": regularization.status, "workflow_reference": regularization.workflow_reference or ""}
        return response.Response(MutationResultSerializer(payload).data)
