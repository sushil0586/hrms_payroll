"""Serializers for the first ESS/MSS API slice."""

from decimal import Decimal

from rest_framework import serializers

from apps.attendance.models import AttendancePolicyStatus, AttendanceSource, AttendanceStatus, AttendanceUnit, HolidayType
from apps.employees.models import EmploymentStatus
from apps.common.models import SaasTenantChangeRequestType
from apps.iam.models import MembershipStatus, ScopeType
from apps.leave_management.models import AccrualFrequency, LeaveCategory, LeavePolicyStatus, LeaveUnit
from apps.documents.models import DocumentCategoryType, EmployeeDocumentStatus, LetterType, VerificationStatus
from apps.employee_lifecycle.models import ExitStatus, LifecycleEventStatus, MovementType, OnboardingStatus, ProbationDecision
from apps.notifications.models import (
    NotificationAudienceType,
    NotificationChannel,
    NotificationDeliveryBackend,
    NotificationPriority,
    NotificationStatus,
    NotificationTemplateStatus,
)
from apps.payroll.models import (
    PayrollAdjustmentDirection,
    PayrollAdjustmentKind,
    PayrollAdjustmentStatus,
    PayrollCalculationLineStatus,
    PayrollCalculationStatus,
    PayrollApprovalStatus,
    PayrollExceptionSeverity,
    PayrollExceptionStatus,
    PayrollFinanceHandoffStatus,
    PayrollInputSnapshotStatus,
    PayrollExpressionLanguage,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatchStatus,
    PayrollProviderCallbackEventStatus,
    PayrollProviderCertificationStatus,
    PayrollProviderCertificationRunStatus,
    PayrollProviderConnectionKind,
    PayrollProviderConnectionStatus,
    PayrollProviderDeliveryStatus,
    PayrollProviderJobKind,
    PayrollProviderJobStatus,
    PayrollProviderRetryEventStatus,
    PayrollProviderSchemaMappingSimulationStatus,
    PayrollProviderSchemaMappingPackStatus,
    PayrollReviewStatus,
    PayrollSettlementLineKind,
    PayrollSettlementStatus,
    PayrollStatutoryCalculationMethod,
    PayrollStatutoryComponentKind,
    PayrollStatutoryContributionOwner,
    PayrollStatutoryDeclarationItemKind,
    PayrollStatutoryDeclarationStatus,
    PayrollStatutoryFilingStatus,
    PayrollStatutoryProofStatus,
    PayrollTaxRegime,
    PayrollDeclarationStatus,
    PayrollValidationCategory,
    PayrollValidationIssueStatus,
    PayrollValidationSeverity,
    PayGroupStatus,
    PayrollConfigStatus,
    PayrollFrequency,
    PayrollPeriodStatus,
    PayrollRuleType,
    PayrollRuleVersionStatus,
    PayrollRunStatus,
    SalaryComponentType,
    SalaryComponentValueType,
)
from apps.workflows.models import WorkflowActorType, WorkflowModule, WorkflowStatus, WorkflowStepMode


LIFECYCLE_COMMON_DUE_ANCHORS = {"today", "record_created_on"}
LIFECYCLE_ONBOARDING_DUE_ANCHORS = {
    "preboarding_started_on",
    "expected_joining_date",
    "actual_joining_date",
    "joining_date",
}
LIFECYCLE_EXIT_DUE_ANCHORS = {
    "resignation_date",
    "proposed_last_working_date",
    "approved_last_working_date",
    "last_working_date",
    "actual_exit_date",
}


def _allowed_lifecycle_due_anchors(trigger_key: str) -> set[str]:
    normalized = (trigger_key or "").strip().lower()
    if "onboarding" in normalized:
        return LIFECYCLE_COMMON_DUE_ANCHORS | LIFECYCLE_ONBOARDING_DUE_ANCHORS
    if "exit" in normalized or "clearance" in normalized or "offboarding" in normalized:
        return LIFECYCLE_COMMON_DUE_ANCHORS | LIFECYCLE_EXIT_DUE_ANCHORS
    return (
        LIFECYCLE_COMMON_DUE_ANCHORS
        | LIFECYCLE_ONBOARDING_DUE_ANCHORS
        | LIFECYCLE_EXIT_DUE_ANCHORS
    )


def _validate_workflow_step_rule_snapshot(*, module: str, trigger_key: str, rule_snapshot, step_index: int) -> None:
    if rule_snapshot in (None, ""):
        return
    if not isinstance(rule_snapshot, dict):
        raise serializers.ValidationError({"steps": [f"Rule snapshot for step {step_index} must be an object."]})
    if module != WorkflowModule.LIFECYCLE:
        return

    due_anchor = str(rule_snapshot.get("due_anchor") or "").strip()
    due_anchor_candidates_raw = rule_snapshot.get("due_anchor_candidates")
    if due_anchor_candidates_raw in (None, ""):
        due_anchor_candidates: list[str] = []
    else:
        if not isinstance(due_anchor_candidates_raw, list):
            raise serializers.ValidationError({"steps": [f"due_anchor_candidates for step {step_index} must be a list."]})
        due_anchor_candidates = [str(value or "").strip() for value in due_anchor_candidates_raw if str(value or "").strip()]
        if not due_anchor_candidates:
            raise serializers.ValidationError({"steps": [f"due_anchor_candidates for step {step_index} cannot be empty."]})

    if not due_anchor and not due_anchor_candidates and "due_offset_days" in rule_snapshot:
        raise serializers.ValidationError({"steps": [f"Step {step_index} defines due_offset_days without a due anchor."]})

    allowed_anchors = _allowed_lifecycle_due_anchors(trigger_key)
    anchors_to_check = ([due_anchor] if due_anchor else []) + due_anchor_candidates
    invalid_anchors = sorted({anchor for anchor in anchors_to_check if anchor and anchor not in allowed_anchors})
    if invalid_anchors:
        raise serializers.ValidationError(
            {
                "steps": [
                    f"Invalid lifecycle due anchor(s) for step {step_index}: {', '.join(invalid_anchors)}."
                ]
            }
        )

    offset_raw = rule_snapshot.get("due_offset_days")
    if offset_raw not in (None, ""):
        try:
            int(offset_raw)
        except (TypeError, ValueError):
            raise serializers.ValidationError({"steps": [f"due_offset_days for step {step_index} must be an integer."]})
    offset_unit = str(rule_snapshot.get("due_offset_unit") or "calendar_days").strip()
    if offset_unit not in {"calendar_days", "business_days"}:
        raise serializers.ValidationError(
            {"steps": [f"due_offset_unit for step {step_index} must be 'calendar_days' or 'business_days'."]}
        )
    non_working_weekdays_raw = rule_snapshot.get("non_working_weekdays")
    if non_working_weekdays_raw not in (None, ""):
        if not isinstance(non_working_weekdays_raw, list):
            raise serializers.ValidationError({"steps": [f"non_working_weekdays for step {step_index} must be a list."]})
        allowed_weekdays = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
        invalid_weekdays = sorted(
            {str(value or "").strip().lower() for value in non_working_weekdays_raw if str(value or "").strip().lower() not in allowed_weekdays}
        )
        if invalid_weekdays:
            raise serializers.ValidationError(
                {"steps": [f"Invalid non_working_weekdays for step {step_index}: {', '.join(invalid_weekdays)}."]}
            )


class EmployeeProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_code = serializers.CharField()
    full_name = serializers.CharField()
    preferred_name = serializers.CharField(allow_blank=True)
    work_email = serializers.EmailField(allow_blank=True)
    personal_email = serializers.EmailField(allow_blank=True)
    phone_number = serializers.CharField(allow_blank=True)
    employment_status = serializers.CharField()
    date_of_joining = serializers.DateField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    reporting_manager = serializers.CharField(allow_null=True)


class HrAdminEmployeeListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_code = serializers.CharField()
    full_name = serializers.CharField()
    work_email = serializers.EmailField(allow_blank=True)
    phone_number = serializers.CharField(allow_blank=True)
    employment_status = serializers.CharField()
    date_of_joining = serializers.DateField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    business_unit = serializers.CharField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    cost_center = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    reporting_manager = serializers.CharField(allow_null=True)
    has_access = serializers.BooleanField()
    membership_status = serializers.CharField(allow_blank=True)
    assigned_role_count = serializers.IntegerField()
    direct_reports_count = serializers.IntegerField()


class HrAdminEmployeeDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_code = serializers.CharField()
    first_name = serializers.CharField()
    middle_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    full_name = serializers.CharField()
    preferred_name = serializers.CharField(allow_blank=True)
    work_email = serializers.EmailField(allow_blank=True)
    personal_email = serializers.EmailField(allow_blank=True)
    phone_number = serializers.CharField(allow_blank=True)
    employment_status = serializers.CharField()
    date_of_birth = serializers.DateField(allow_null=True)
    date_of_joining = serializers.DateField(allow_null=True)
    probation_end_date = serializers.DateField(allow_null=True)
    confirmation_date = serializers.DateField(allow_null=True)
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location_id = serializers.UUIDField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    department_id = serializers.UUIDField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    business_unit_id = serializers.UUIDField(allow_null=True)
    business_unit = serializers.CharField(allow_null=True)
    cost_center_id = serializers.UUIDField(allow_null=True)
    cost_center = serializers.CharField(allow_null=True)
    designation_id = serializers.UUIDField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    grade_id = serializers.UUIDField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    employment_type_id = serializers.UUIDField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    reporting_manager_id = serializers.UUIDField(allow_null=True)
    reporting_manager = serializers.CharField(allow_null=True)
    has_access = serializers.BooleanField()
    membership_status = serializers.CharField(allow_blank=True)
    assigned_role_count = serializers.IntegerField()
    direct_reports_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminOptionItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    location_id = serializers.UUIDField(required=False, allow_null=True)
    business_unit_id = serializers.UUIDField(required=False, allow_null=True)
    grade_id = serializers.UUIDField(required=False, allow_null=True)


class HrAdminManagerOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    employee_code = serializers.CharField()


class HrAdminEmploymentStatusOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class HrAdminEmployeeFormOptionsSerializer(serializers.Serializer):
    employment_statuses = HrAdminEmploymentStatusOptionSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    business_units = HrAdminOptionItemSerializer(many=True)
    cost_centers = HrAdminOptionItemSerializer(many=True)
    designations = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)
    employment_types = HrAdminOptionItemSerializer(many=True)
    managers = HrAdminManagerOptionSerializer(many=True)


class HrAdminRoleOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()


class HrAdminMembershipStatusOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class HrAdminEmployeeAccessOptionsSerializer(serializers.Serializer):
    membership_statuses = HrAdminMembershipStatusOptionSerializer(many=True)
    roles = HrAdminRoleOptionSerializer(many=True)


class HrAdminEmployeeAccessRoleSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    is_primary = serializers.BooleanField()


class HrAdminEmployeeAccessDetailSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    has_access = serializers.BooleanField()
    membership_id = serializers.UUIDField(allow_null=True)
    user_id = serializers.UUIDField(allow_null=True)
    username = serializers.CharField(allow_blank=True)
    email = serializers.EmailField(allow_blank=True)
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    display_name = serializers.CharField(allow_blank=True)
    phone_number = serializers.CharField(allow_blank=True)
    is_user_active = serializers.BooleanField()
    must_change_password = serializers.BooleanField()
    membership_status = serializers.CharField()
    is_default_membership = serializers.BooleanField()
    role_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)
    roles = HrAdminEmployeeAccessRoleSerializer(many=True)
    generated_password = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    password_was_reset = serializers.BooleanField(required=False)


class HrAdminEmployeeAccessWriteSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    display_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_user_active = serializers.BooleanField(required=False, default=True)
    must_change_password = serializers.BooleanField(required=False, default=True)
    membership_status = serializers.ChoiceField(choices=MembershipStatus.values, required=False, default=MembershipStatus.ACTIVE)
    is_default_membership = serializers.BooleanField(required=False, default=True)
    role_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=True, required=False, default=list)
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)

    def validate_username(self, value):
        return value.strip()

    def validate_email(self, value):
        return value.strip().lower()


class HrAdminEmployeeWriteSerializer(serializers.Serializer):
    employee_code = serializers.CharField(max_length=50, required=False)
    first_name = serializers.CharField(max_length=120, required=False)
    middle_name = serializers.CharField(max_length=120, allow_blank=True, required=False)
    last_name = serializers.CharField(max_length=120, allow_blank=True, required=False)
    preferred_name = serializers.CharField(max_length=120, allow_blank=True, required=False)
    work_email = serializers.EmailField(allow_blank=True, required=False)
    personal_email = serializers.EmailField(allow_blank=True, required=False)
    phone_number = serializers.CharField(max_length=30, allow_blank=True, required=False)
    date_of_birth = serializers.DateField(allow_null=True, required=False)
    date_of_joining = serializers.DateField(allow_null=True, required=False)
    employment_status = serializers.ChoiceField(choices=EmploymentStatus.values, required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    business_unit_id = serializers.UUIDField(allow_null=True, required=False)
    cost_center_id = serializers.UUIDField(allow_null=True, required=False)
    designation_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    reporting_manager_id = serializers.UUIDField(allow_null=True, required=False)
    probation_end_date = serializers.DateField(allow_null=True, required=False)
    confirmation_date = serializers.DateField(allow_null=True, required=False)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("employee_code"):
                raise serializers.ValidationError({"employee_code": "This field is required."})
            if not attrs.get("first_name"):
                raise serializers.ValidationError({"first_name": "This field is required."})
        date_of_birth = attrs.get("date_of_birth")
        date_of_joining = attrs.get("date_of_joining")
        probation_end_date = attrs.get("probation_end_date")
        confirmation_date = attrs.get("confirmation_date")
        if date_of_birth and date_of_joining and date_of_birth >= date_of_joining:
            raise serializers.ValidationError({"date_of_birth": "Date of birth must be earlier than date of joining."})
        if date_of_joining and probation_end_date and probation_end_date < date_of_joining:
            raise serializers.ValidationError({"probation_end_date": "Probation end date cannot be earlier than date of joining."})
        if date_of_joining and confirmation_date and confirmation_date < date_of_joining:
            raise serializers.ValidationError({"confirmation_date": "Confirmation date cannot be earlier than date of joining."})
        if probation_end_date and confirmation_date and confirmation_date < probation_end_date:
            raise serializers.ValidationError({"confirmation_date": "Confirmation date cannot be earlier than probation end date."})
        return attrs


class HrAdminOrganizationItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    is_active = serializers.BooleanField()
    country_code = serializers.CharField(required=False)
    timezone = serializers.CharField(required=False)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    legal_entity = serializers.CharField(required=False)
    location = serializers.CharField(required=False, allow_null=True)
    branch_type = serializers.CharField(required=False, allow_blank=True)
    parent = serializers.CharField(required=False, allow_null=True)
    business_unit = serializers.CharField(required=False, allow_null=True)
    level = serializers.IntegerField(required=False, allow_null=True)
    grade = serializers.CharField(required=False, allow_null=True)
    is_payroll_eligible = serializers.BooleanField(required=False)
    registered_name = serializers.CharField(required=False, allow_blank=True)
    primary_email = serializers.CharField(required=False, allow_blank=True)
    primary_phone = serializers.CharField(required=False, allow_blank=True)
    address_line_1 = serializers.CharField(required=False, allow_blank=True)
    address_line_2 = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    location_id = serializers.UUIDField(required=False, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    business_unit_id = serializers.UUIDField(required=False, allow_null=True)
    grade_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    linked_employees_count = serializers.IntegerField(required=False)
    child_count = serializers.IntegerField(required=False)
    branches_count = serializers.IntegerField(required=False)
    departments_count = serializers.IntegerField(required=False)
    designations_count = serializers.IntegerField(required=False)
    cost_centers_count = serializers.IntegerField(required=False)


class HrAdminOrganizationFormOptionsSerializer(serializers.Serializer):
    legal_entities = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    business_units = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)


class HrAdminOrganizationWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    is_active = serializers.BooleanField(required=False)
    registered_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    country_code = serializers.CharField(max_length=2, allow_blank=True, required=False)
    timezone = serializers.CharField(max_length=64, allow_blank=True, required=False)
    primary_email = serializers.EmailField(allow_blank=True, required=False)
    primary_phone = serializers.CharField(max_length=30, allow_blank=True, required=False)
    address_line_1 = serializers.CharField(max_length=255, allow_blank=True, required=False)
    address_line_2 = serializers.CharField(max_length=255, allow_blank=True, required=False)
    city = serializers.CharField(max_length=120, allow_blank=True, required=False)
    state = serializers.CharField(max_length=120, allow_blank=True, required=False)
    postal_code = serializers.CharField(max_length=20, allow_blank=True, required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    branch_type = serializers.CharField(max_length=60, allow_blank=True, required=False)
    parent_id = serializers.UUIDField(allow_null=True, required=False)
    business_unit_id = serializers.UUIDField(allow_null=True, required=False)
    level = serializers.IntegerField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    is_payroll_eligible = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("code"):
                raise serializers.ValidationError({"code": "This field is required."})
            if not attrs.get("name"):
                raise serializers.ValidationError({"name": "This field is required."})
        if "level" in attrs and attrs["level"] is not None and attrs["level"] < 1:
            raise serializers.ValidationError({"level": "Level must be 1 or higher."})
        return attrs


class HrAdminOrganizationSummarySerializer(serializers.Serializer):
    legal_entities_count = serializers.IntegerField()
    locations_count = serializers.IntegerField()
    branches_count = serializers.IntegerField()
    business_units_count = serializers.IntegerField()
    departments_count = serializers.IntegerField()
    cost_centers_count = serializers.IntegerField()
    grades_count = serializers.IntegerField()
    designations_count = serializers.IntegerField()
    employment_types_count = serializers.IntegerField()


class HrAdminOrganizationSnapshotSerializer(serializers.Serializer):
    summary = HrAdminOrganizationSummarySerializer()
    legal_entities = HrAdminOrganizationItemSerializer(many=True)
    locations = HrAdminOrganizationItemSerializer(many=True)
    branches = HrAdminOrganizationItemSerializer(many=True)
    business_units = HrAdminOrganizationItemSerializer(many=True)
    departments = HrAdminOrganizationItemSerializer(many=True)
    cost_centers = HrAdminOrganizationItemSerializer(many=True)
    grades = HrAdminOrganizationItemSerializer(many=True)
    designations = HrAdminOrganizationItemSerializer(many=True)
    employment_types = HrAdminOrganizationItemSerializer(many=True)


class HrAdminDashboardBreakdownItemSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()


class HrAdminDashboardOverviewSerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    active_employees = serializers.IntegerField()
    active_memberships = serializers.IntegerField()
    configured_departments = serializers.IntegerField()
    active_branches = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()


class HrAdminDashboardWorkforceSerializer(serializers.Serializer):
    employment_status_breakdown = HrAdminDashboardBreakdownItemSerializer(many=True)
    department_headcount = HrAdminDashboardBreakdownItemSerializer(many=True)
    joiners_this_month = serializers.IntegerField()
    exits_this_month = serializers.IntegerField()
    managers_with_reports = serializers.IntegerField()
    employees_without_manager = serializers.IntegerField()


class HrAdminDashboardOperationsSerializer(serializers.Serializer):
    pending_leave_requests = serializers.IntegerField()
    pending_regularizations = serializers.IntegerField()
    pending_onboardings = serializers.IntegerField()
    pending_probation_reviews = serializers.IntegerField()
    open_exits = serializers.IntegerField()


class HrAdminDashboardDocumentsSerializer(serializers.Serializer):
    pending_verification = serializers.IntegerField()
    rejected_documents = serializers.IntegerField()
    expiring_in_30_days = serializers.IntegerField()
    mandatory_requirement_rules = serializers.IntegerField()
    active_document_categories = serializers.IntegerField()


class HrAdminDashboardGovernanceSerializer(serializers.Serializer):
    active_leave_policies = serializers.IntegerField()
    active_attendance_policies = serializers.IntegerField()
    workflow_templates = serializers.IntegerField()
    active_notification_templates = serializers.IntegerField()
    active_notification_events = serializers.IntegerField()


class HrAdminDashboardDeliverySerializer(serializers.Serializer):
    pending_notifications = serializers.IntegerField()
    sent_today = serializers.IntegerField()
    failed_notifications = serializers.IntegerField()
    documents_expiring_30_days = serializers.IntegerField()
    latest_activity_at = serializers.DateTimeField()


class HrAdminDashboardSerializer(serializers.Serializer):
    overview = HrAdminDashboardOverviewSerializer()
    workforce = HrAdminDashboardWorkforceSerializer()
    operations = HrAdminDashboardOperationsSerializer()
    documents = HrAdminDashboardDocumentsSerializer()
    governance = HrAdminDashboardGovernanceSerializer()
    delivery = HrAdminDashboardDeliverySerializer()
    launch_audit = serializers.JSONField()


class HrAdminLaunchRemediationAssignmentSerializer(serializers.Serializer):
    id = serializers.CharField()
    gate_ref = serializers.CharField()
    module_ref = serializers.CharField()
    module_label = serializers.CharField()
    label = serializers.CharField()
    severity = serializers.CharField()
    status = serializers.CharField()
    owner_role_ref = serializers.CharField()
    assigned_to_identifier = serializers.CharField(allow_blank=True)
    action_href = serializers.CharField()
    action_label = serializers.CharField()
    sla_days = serializers.IntegerField()
    current_value = serializers.CharField(allow_blank=True)
    evidence_ref = serializers.CharField(allow_blank=True)
    first_seen_at = serializers.DateTimeField()
    last_seen_at = serializers.DateTimeField()
    due_at = serializers.DateTimeField(allow_null=True)
    due_source_ref = serializers.CharField()
    due_state = serializers.CharField()
    days_until_due = serializers.IntegerField(allow_null=True)
    is_overdue = serializers.BooleanField()
    is_due_soon = serializers.BooleanField()
    acknowledged_at = serializers.DateTimeField(allow_null=True)
    acknowledged_by_identifier = serializers.CharField(allow_blank=True)
    reminder_sent_at = serializers.DateTimeField(allow_null=True)
    reminder_count = serializers.IntegerField()
    escalated_at = serializers.DateTimeField(allow_null=True)
    escalated_by_identifier = serializers.CharField(allow_blank=True)
    escalation_owner_role_ref = serializers.CharField(allow_blank=True)
    ignored_at = serializers.DateTimeField(allow_null=True)
    ignored_by_identifier = serializers.CharField(allow_blank=True)
    resolved_at = serializers.DateTimeField(allow_null=True)
    resolution_note = serializers.CharField(allow_blank=True)
    action_history = serializers.JSONField()
    source_hash = serializers.CharField()


class HrAdminLaunchRemediationListSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    filters = serializers.JSONField()
    options = serializers.JSONField()
    items = HrAdminLaunchRemediationAssignmentSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminLaunchRemediationActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["acknowledge", "assign", "set_due_date", "send_reminder", "escalate", "ignore", "resolve", "reopen"])
    owner_role_ref = serializers.CharField(required=False, allow_blank=True, max_length=120)
    assigned_to_identifier = serializers.CharField(required=False, allow_blank=True, max_length=160)
    due_at = serializers.DateTimeField(required=False, allow_null=True)
    escalation_owner_role_ref = serializers.CharField(required=False, allow_blank=True, max_length=120)
    resolution_note = serializers.CharField(required=False, allow_blank=True, max_length=1200)

    def validate(self, attrs):
        action = attrs["action"]
        owner_role_ref = attrs.get("owner_role_ref", "").strip()
        assigned_to_identifier = attrs.get("assigned_to_identifier", "").strip()
        escalation_owner_role_ref = attrs.get("escalation_owner_role_ref", "").strip()
        resolution_note = attrs.get("resolution_note", "").strip()
        if action == "assign" and not owner_role_ref and not assigned_to_identifier:
            raise serializers.ValidationError({"assigned_to_identifier": "Provide an owner role or assignee identifier."})
        if action == "set_due_date" and not attrs.get("due_at"):
            raise serializers.ValidationError({"due_at": "Provide a due date for this assignment."})
        if action == "escalate" and not escalation_owner_role_ref and not owner_role_ref:
            raise serializers.ValidationError({"escalation_owner_role_ref": "Provide an escalation owner role."})
        if action in {"ignore", "resolve"} and not resolution_note:
            raise serializers.ValidationError({"resolution_note": "Add a short note for this launch decision."})
        attrs["owner_role_ref"] = owner_role_ref
        attrs["assigned_to_identifier"] = assigned_to_identifier
        attrs["escalation_owner_role_ref"] = escalation_owner_role_ref
        attrs["resolution_note"] = resolution_note
        return attrs


class HrAdminSaasCommercialControlSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    profile_source = serializers.CharField()
    profile_name = serializers.CharField()
    version = serializers.IntegerField()
    tenant = serializers.JSONField()
    subscription = serializers.JSONField()
    plan = serializers.JSONField()
    available_plans = serializers.JSONField()
    summary = serializers.JSONField()
    entitlements = serializers.JSONField()
    usage_limits = serializers.JSONField()
    required_entitlements = serializers.JSONField()
    missing_required_entitlements = serializers.JSONField()
    exceeded_usage_limits = serializers.JSONField()
    blocking_usage_limits = serializers.JSONField()
    enforcement = serializers.JSONField()
    recent_usage_snapshots = serializers.JSONField()
    recent_audit_events = serializers.JSONField()


class HrAdminSaasCommercialSubscriptionUpdateSerializer(serializers.Serializer):
    subscription_plan = serializers.CharField(required=False, allow_blank=True, max_length=40)
    status = serializers.CharField(required=False, allow_blank=True, max_length=40)
    billing_provider_ref = serializers.CharField(required=False, allow_blank=True, max_length=120)
    billing_account_ref = serializers.CharField(required=False, allow_blank=True, max_length=160)
    current_period_end = serializers.CharField(required=False, allow_blank=True, max_length=80)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one commercial subscription field.")
        return attrs


class TenantAdminConsoleSerializer(serializers.Serializer):
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    commercial_control = serializers.JSONField()
    seat_usage = serializers.JSONField()
    membership_status_counts = serializers.JSONField()
    role_coverage = serializers.JSONField()
    configuration_health = serializers.JSONField()
    governance_checks = serializers.JSONField()
    membership_management = serializers.JSONField()
    change_request_management = serializers.JSONField()
    support_access_management = serializers.JSONField()
    recent_usage_snapshots = serializers.JSONField()
    recent_audit_events = serializers.JSONField()


class TenantAdminMembershipInviteSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    display_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_user_active = serializers.BooleanField(required=False, default=True)
    must_change_password = serializers.BooleanField(required=False, default=True)
    membership_status = serializers.ChoiceField(choices=[MembershipStatus.INVITED, MembershipStatus.ACTIVE], required=False, default=MembershipStatus.INVITED)
    is_default_membership = serializers.BooleanField(required=False, default=False)
    role_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)

    def validate_username(self, value):
        return value.strip()

    def validate_email(self, value):
        return value.strip().lower()


class TenantAdminMembershipActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["activate", "suspend", "revoke", "update_roles"])
    role_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False, required=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=1200)

    def validate(self, attrs):
        if attrs["action"] == "update_roles" and not attrs.get("role_ids"):
            raise serializers.ValidationError({"role_ids": "Select at least one tenant role."})
        attrs["note"] = attrs.get("note", "").strip()
        return attrs


class TenantAdminMembershipMutationResultSerializer(serializers.Serializer):
    membership = serializers.JSONField()
    generated_password = serializers.CharField(required=False, allow_blank=True)
    password_was_set = serializers.BooleanField()
    console = serializers.JSONField()


class TenantAdminChangeRequestCreateSerializer(serializers.Serializer):
    request_type = serializers.ChoiceField(choices=SaasTenantChangeRequestType.values)
    title = serializers.CharField(max_length=180)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2400)
    target_ref = serializers.CharField(required=False, allow_blank=True, max_length=180)
    requested_payload = serializers.JSONField(required=False, default=dict)

    def validate(self, attrs):
        if not isinstance(attrs.get("requested_payload", {}), dict):
            raise serializers.ValidationError({"requested_payload": "Requested payload must be an object."})
        attrs["title"] = attrs["title"].strip()
        attrs["description"] = attrs.get("description", "").strip()
        attrs["target_ref"] = attrs.get("target_ref", "").strip()
        if not attrs["title"]:
            raise serializers.ValidationError({"title": "Title is required."})
        return attrs


class TenantAdminChangeRequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "cancel", "apply"])
    decision_note = serializers.CharField(required=False, allow_blank=True, max_length=1200)

    def validate(self, attrs):
        attrs["decision_note"] = attrs.get("decision_note", "").strip()
        return attrs


class TenantAdminChangeRequestMutationResultSerializer(serializers.Serializer):
    change_request = serializers.JSONField()
    console = serializers.JSONField()


class TenantAdminSupportAccessGrantCreateSerializer(serializers.Serializer):
    support_agent_identifier = serializers.CharField(max_length=160)
    reason = serializers.CharField(max_length=2400)
    scope_refs = serializers.ListField(child=serializers.CharField(max_length=120), allow_empty=False)
    requested_duration_minutes = serializers.IntegerField(required=False, min_value=1, default=60)

    def validate(self, attrs):
        attrs["support_agent_identifier"] = attrs["support_agent_identifier"].strip()
        attrs["reason"] = attrs["reason"].strip()
        attrs["scope_refs"] = [item.strip() for item in attrs.get("scope_refs", []) if item.strip()]
        if not attrs["support_agent_identifier"]:
            raise serializers.ValidationError({"support_agent_identifier": "Support agent identifier is required."})
        if not attrs["reason"]:
            raise serializers.ValidationError({"reason": "Reason is required."})
        if not attrs["scope_refs"]:
            raise serializers.ValidationError({"scope_refs": "Select at least one support access scope."})
        return attrs


class TenantAdminSupportAccessGrantActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "start", "end", "revoke"])
    decision_note = serializers.CharField(required=False, allow_blank=True, max_length=1200)
    approved_duration_minutes = serializers.IntegerField(required=False, min_value=1)
    session_ref = serializers.CharField(required=False, allow_blank=True, max_length=180)

    def validate(self, attrs):
        attrs["decision_note"] = attrs.get("decision_note", "").strip()
        attrs["session_ref"] = attrs.get("session_ref", "").strip()
        return attrs


class TenantAdminSupportAccessGrantMutationResultSerializer(serializers.Serializer):
    support_access_grant = serializers.JSONField()
    console = serializers.JSONField()


class TenantAdminTrustAuditReviewSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    profile_source = serializers.CharField()
    generated_at = serializers.DateTimeField()
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    filters = serializers.JSONField()
    options = serializers.JSONField()
    events = serializers.JSONField()
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class TenantAdminEnterpriseSecurityReadinessSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    security_profile_ref = serializers.CharField()
    profile_source = serializers.CharField()
    generated_at = serializers.DateTimeField()
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    mfa = serializers.JSONField()
    sso = serializers.JSONField()
    scim = serializers.JSONField()
    session = serializers.JSONField()
    audit = serializers.JSONField()
    data_protection = serializers.JSONField()
    checks = serializers.JSONField()


class SupportSessionTenantConsoleSerializer(serializers.Serializer):
    support_session = serializers.JSONField()
    tenant = serializers.JSONField()
    granted_sections = serializers.JSONField()
    account = serializers.JSONField(allow_null=True)
    configuration_health = serializers.JSONField(allow_null=True)
    commercial_evidence = serializers.JSONField(allow_null=True)
    payroll_support = serializers.JSONField(allow_null=True)


class SupportSessionDomainSnapshotSerializer(serializers.Serializer):
    support_session = serializers.JSONField()
    tenant = serializers.JSONField()
    domain = serializers.JSONField()
    available_domains = serializers.JSONField()
    snapshot = serializers.JSONField()


class HrAdminSaasOperationalHealthSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    generated_at = serializers.DateTimeField()
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    signals = serializers.JSONField()
    launch_audit = serializers.JSONField()
    commercial_control = serializers.JSONField()
    resilience_readiness = serializers.JSONField()
    sla_operations = serializers.JSONField()
    notification_delivery = serializers.JSONField()
    provider_queue = serializers.JSONField()
    support_access = serializers.JSONField()
    tenant_change_requests = serializers.JSONField()
    recent_commercial_events = serializers.JSONField()
    recent_usage_snapshots = serializers.JSONField()


class HrAdminSaasResilienceReadinessSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    resilience_profile_ref = serializers.CharField()
    profile_source = serializers.CharField()
    generated_at = serializers.DateTimeField()
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    backup = serializers.JSONField()
    restore = serializers.JSONField()
    retention = serializers.JSONField()
    evidence = serializers.JSONField()
    checks = serializers.JSONField()


class HrAdminSaasSlaOperationsSerializer(serializers.Serializer):
    profile_ref = serializers.CharField()
    sla_profile_ref = serializers.CharField()
    profile_source = serializers.CharField()
    generated_at = serializers.DateTimeField()
    tenant = serializers.JSONField()
    summary = serializers.JSONField()
    incident_targets = serializers.JSONField()
    impact_options = serializers.JSONField()
    operational_thresholds = serializers.JSONField()
    status_counts = serializers.JSONField()
    severity_counts = serializers.JSONField()
    impact_counts = serializers.JSONField()
    health_signals = serializers.JSONField()
    incidents = serializers.JSONField()


class HrAdminPayrollReadinessPeriodSerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()
    label = serializers.CharField()
    days = serializers.IntegerField()
    working_days = serializers.IntegerField()


class HrAdminPayrollReadinessConfigurationSerializer(serializers.Serializer):
    profile_key = serializers.CharField()
    profile_name = serializers.CharField()
    version = serializers.IntegerField()
    source = serializers.CharField()
    resolved_profile = serializers.JSONField()


class HrAdminPayrollReadinessSummarySerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    ready = serializers.IntegerField()
    warnings = serializers.IntegerField()
    blocked = serializers.IntegerField()
    joiners = serializers.IntegerField()
    exits = serializers.IntegerField()
    pending_leave_requests = serializers.IntegerField()
    pending_attendance_regularizations = serializers.IntegerField()
    missing_primary_bank_accounts = serializers.IntegerField()


class HrAdminPayrollReadinessItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    work_email = serializers.EmailField(allow_blank=True)
    readiness_status = serializers.CharField()
    employment_status = serializers.CharField()
    date_of_joining = serializers.DateField(allow_null=True)
    exit_date = serializers.DateField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    business_unit = serializers.CharField(allow_null=True)
    cost_center = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    period_days = serializers.IntegerField()
    working_days = serializers.IntegerField()
    attendance_record_days = serializers.IntegerField()
    pending_leave_requests = serializers.IntegerField()
    pending_attendance_regularizations = serializers.IntegerField()
    unknown_attendance_records = serializers.IntegerField()
    has_primary_bank_account = serializers.BooleanField()
    blockers = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    source_counts = serializers.DictField(child=serializers.IntegerField())


class HrAdminPayrollReadinessListSerializer(serializers.Serializer):
    period = HrAdminPayrollReadinessPeriodSerializer()
    configuration = HrAdminPayrollReadinessConfigurationSerializer()
    summary = HrAdminPayrollReadinessSummarySerializer()
    items = HrAdminPayrollReadinessItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()
    status_counts = serializers.DictField(child=serializers.IntegerField())


class HrAdminEnumOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class HrAdminPayrollCalendarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    frequency = serializers.CharField()
    frequency_label = serializers.CharField()
    timezone = serializers.CharField()
    currency_code = serializers.CharField()
    period_start_day = serializers.IntegerField()
    is_active = serializers.BooleanField()
    config_snapshot = serializers.JSONField()
    active_pay_group_count = serializers.IntegerField()
    open_period_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollCalendarWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    frequency = serializers.ChoiceField(choices=PayrollFrequency.values, required=False)
    timezone = serializers.CharField(max_length=64, required=False)
    currency_code = serializers.CharField(max_length=3, required=False)
    period_start_day = serializers.IntegerField(min_value=1, max_value=31, required=False)
    is_active = serializers.BooleanField(required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name", "frequency"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollPeriodSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    calendar_id = serializers.UUIDField()
    calendar_name = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    pay_date = serializers.DateField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollPeriodWriteSerializer(serializers.Serializer):
    calendar_id = serializers.UUIDField(required=False)
    code = serializers.SlugField(max_length=80, required=False)
    name = serializers.CharField(max_length=255, required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    pay_date = serializers.DateField(required=False)
    status = serializers.ChoiceField(choices=PayrollPeriodStatus.values, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["calendar_id", "code", "name", "start_date", "end_date", "pay_date"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayGroupSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    calendar_id = serializers.UUIDField()
    calendar_name = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    default_currency_code = serializers.CharField()
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location_id = serializers.UUIDField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    department_id = serializers.UUIDField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    employment_type_id = serializers.UUIDField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    config_snapshot = serializers.JSONField()
    assignment_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayGroupWriteSerializer(serializers.Serializer):
    calendar_id = serializers.UUIDField(required=False)
    code = serializers.SlugField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    status = serializers.ChoiceField(choices=PayGroupStatus.values, required=False)
    default_currency_code = serializers.CharField(max_length=3, required=False)
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    branch_id = serializers.UUIDField(required=False, allow_null=True)
    location_id = serializers.UUIDField(required=False, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    employment_type_id = serializers.UUIDField(required=False, allow_null=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["calendar_id", "code", "name"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayGroupAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    pay_group_id = serializers.UUIDField()
    pay_group_name = serializers.CharField()
    pay_group_code = serializers.CharField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayGroupAssignmentWriteSerializer(serializers.Serializer):
    pay_group_id = serializers.UUIDField(required=False)
    employee_id = serializers.UUIDField(required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=PayGroupStatus.values, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["pay_group_id", "employee_id", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollSetupOptionsSerializer(serializers.Serializer):
    payroll_frequencies = HrAdminEnumOptionSerializer(many=True)
    payroll_period_statuses = HrAdminEnumOptionSerializer(many=True)
    pay_group_statuses = HrAdminEnumOptionSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    employment_types = HrAdminOptionItemSerializer(many=True)
    employees = HrAdminManagerOptionSerializer(many=True)


class HrAdminPayrollSetupSerializer(serializers.Serializer):
    summary = serializers.DictField(child=serializers.IntegerField())
    calendars = HrAdminPayrollCalendarSerializer(many=True)
    periods = HrAdminPayrollPeriodSerializer(many=True)
    pay_groups = HrAdminPayGroupSerializer(many=True)
    assignments = HrAdminPayGroupAssignmentSerializer(many=True)
    options = HrAdminPayrollSetupOptionsSerializer()


class HrAdminSalaryComponentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    component_type = serializers.CharField()
    component_type_label = serializers.CharField()
    value_type = serializers.CharField()
    value_type_label = serializers.CharField()
    formula_ref = serializers.CharField(allow_blank=True)
    applicability_rule_ref = serializers.CharField(allow_blank=True)
    rounding_rule_ref = serializers.CharField(allow_blank=True)
    accounting_mapping_ref = serializers.CharField(allow_blank=True)
    statutory_treatment_ref = serializers.CharField(allow_blank=True)
    is_taxable = serializers.BooleanField()
    is_proratable = serializers.BooleanField()
    payslip_visibility = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminSalaryComponentWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=80, required=False)
    name = serializers.CharField(max_length=255, required=False)
    component_type = serializers.ChoiceField(choices=SalaryComponentType.values, required=False)
    value_type = serializers.ChoiceField(choices=SalaryComponentValueType.values, required=False)
    formula_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    applicability_rule_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    rounding_rule_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    accounting_mapping_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    statutory_treatment_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    is_taxable = serializers.BooleanField(required=False)
    is_proratable = serializers.BooleanField(required=False)
    payslip_visibility = serializers.CharField(max_length=40, required=False)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name", "component_type", "value_type"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminSalaryStructureSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    pay_group_id = serializers.UUIDField(allow_null=True)
    pay_group_name = serializers.CharField(allow_null=True)
    currency_code = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    version_count = serializers.IntegerField()
    assignment_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminSalaryStructureWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=80, required=False)
    name = serializers.CharField(max_length=255, required=False)
    pay_group_id = serializers.UUIDField(required=False, allow_null=True)
    currency_code = serializers.CharField(max_length=3, required=False)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminSalaryStructureVersionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    structure_id = serializers.UUIDField()
    structure_name = serializers.CharField()
    version = serializers.IntegerField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    annual_ctc = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField()
    config_snapshot = serializers.JSONField()
    component_count = serializers.IntegerField()
    assignment_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminSalaryStructureVersionWriteSerializer(serializers.Serializer):
    structure_id = serializers.UUIDField(required=False)
    version = serializers.IntegerField(min_value=1, required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    annual_ctc = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    currency_code = serializers.CharField(max_length=3, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["structure_id", "version", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminSalaryStructureComponentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    structure_version_id = serializers.UUIDField()
    structure_name = serializers.CharField()
    component_id = serializers.UUIDField()
    component_code = serializers.CharField()
    component_name = serializers.CharField()
    component_type = serializers.CharField()
    value_type = serializers.CharField()
    display_order = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    percentage = serializers.DecimalField(max_digits=7, decimal_places=4, allow_null=True)
    formula_ref = serializers.CharField(allow_blank=True)
    calculation_rule_ref = serializers.CharField(allow_blank=True)
    is_active = serializers.BooleanField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminSalaryStructureComponentWriteSerializer(serializers.Serializer):
    structure_version_id = serializers.UUIDField(required=False)
    component_id = serializers.UUIDField(required=False)
    display_order = serializers.IntegerField(min_value=1, required=False)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True)
    percentage = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"), required=False, allow_null=True)
    formula_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    calculation_rule_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["structure_version_id", "component_id"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminEmployeeSalaryAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    structure_version_id = serializers.UUIDField()
    structure_name = serializers.CharField()
    structure_version = serializers.IntegerField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    annual_ctc = serializers.DecimalField(max_digits=14, decimal_places=2)
    annual_ctc_override = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    assignment_reason = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminEmployeeSalaryAssignmentWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    structure_version_id = serializers.UUIDField(required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    annual_ctc_override = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True)
    assignment_reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["employee_id", "structure_version_id", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminSalarySetupOptionsSerializer(serializers.Serializer):
    component_types = HrAdminEnumOptionSerializer(many=True)
    component_value_types = HrAdminEnumOptionSerializer(many=True)
    config_statuses = HrAdminEnumOptionSerializer(many=True)
    pay_groups = HrAdminOptionItemSerializer(many=True)
    employees = HrAdminManagerOptionSerializer(many=True)


class HrAdminSalarySetupSerializer(serializers.Serializer):
    summary = serializers.DictField(child=serializers.IntegerField())
    components = HrAdminSalaryComponentSerializer(many=True)
    structures = HrAdminSalaryStructureSerializer(many=True)
    versions = HrAdminSalaryStructureVersionSerializer(many=True)
    structure_components = HrAdminSalaryStructureComponentSerializer(many=True)
    assignments = HrAdminEmployeeSalaryAssignmentSerializer(many=True)
    options = HrAdminSalarySetupOptionsSerializer()


class HrAdminPayrollStatutoryPackSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    country_code = serializers.CharField()
    jurisdiction_ref = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    currency_code = serializers.CharField()
    statutory_profile_ref = serializers.CharField()
    validation_profile_ref = serializers.CharField()
    config_snapshot = serializers.JSONField()
    component_count = serializers.IntegerField()
    active_component_count = serializers.IntegerField()
    employee_profile_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollStatutoryPackWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=100, required=False)
    name = serializers.CharField(max_length=255, required=False)
    country_code = serializers.CharField(max_length=2, required=False)
    jurisdiction_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    currency_code = serializers.CharField(max_length=3, required=False)
    statutory_profile_ref = serializers.CharField(max_length=160, required=False)
    validation_profile_ref = serializers.CharField(max_length=160, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollStatutoryComponentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    statutory_pack_id = serializers.UUIDField()
    statutory_pack_name = serializers.CharField()
    salary_component_id = serializers.UUIDField(allow_null=True)
    salary_component_name = serializers.CharField(allow_null=True)
    code = serializers.CharField()
    name = serializers.CharField()
    statutory_type = serializers.CharField()
    statutory_type_label = serializers.CharField()
    contribution_owner = serializers.CharField()
    contribution_owner_label = serializers.CharField()
    calculation_method = serializers.CharField()
    calculation_method_label = serializers.CharField()
    wage_base_ref = serializers.CharField()
    statutory_treatment_ref = serializers.CharField()
    registration_ref = serializers.CharField(allow_blank=True)
    applicability_profile_ref = serializers.CharField(allow_blank=True)
    rounding_rule_ref = serializers.CharField(allow_blank=True)
    formula_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    config_snapshot = serializers.JSONField()
    slab_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollStatutoryComponentWriteSerializer(serializers.Serializer):
    statutory_pack_id = serializers.UUIDField(required=False)
    salary_component_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.SlugField(max_length=100, required=False)
    name = serializers.CharField(max_length=255, required=False)
    statutory_type = serializers.ChoiceField(choices=PayrollStatutoryComponentKind.values, required=False)
    contribution_owner = serializers.ChoiceField(choices=PayrollStatutoryContributionOwner.values, required=False)
    calculation_method = serializers.ChoiceField(choices=PayrollStatutoryCalculationMethod.values, required=False)
    wage_base_ref = serializers.CharField(max_length=160, required=False)
    statutory_treatment_ref = serializers.CharField(max_length=160, required=False)
    registration_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    applicability_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    rounding_rule_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    formula_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["statutory_pack_id", "code", "name", "statutory_type", "statutory_treatment_ref"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollStatutorySlabSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    statutory_component_id = serializers.UUIDField()
    statutory_component_name = serializers.CharField()
    statutory_type = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    slab_order = serializers.IntegerField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    min_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    max_amount = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    employee_rate_percent = serializers.DecimalField(max_digits=7, decimal_places=4)
    employer_rate_percent = serializers.DecimalField(max_digits=7, decimal_places=4)
    fixed_employee_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    fixed_employer_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    wage_ceiling_amount = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    state_code = serializers.CharField(allow_blank=True)
    applicability_profile_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollStatutorySlabWriteSerializer(serializers.Serializer):
    statutory_component_id = serializers.UUIDField(required=False)
    code = serializers.SlugField(max_length=100, required=False)
    name = serializers.CharField(max_length=255, required=False)
    slab_order = serializers.IntegerField(min_value=1, required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    min_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    max_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True)
    employee_rate_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"), required=False)
    employer_rate_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"), required=False)
    fixed_employee_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    fixed_employer_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    wage_ceiling_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True)
    state_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    applicability_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["statutory_component_id", "code", "name", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollStatutoryEmployerRegistrationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    statutory_pack_id = serializers.UUIDField()
    statutory_pack_name = serializers.CharField()
    statutory_component_id = serializers.UUIDField(allow_null=True)
    statutory_component_name = serializers.CharField(allow_null=True)
    statutory_type = serializers.CharField(allow_blank=True)
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity_name = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch_name = serializers.CharField(allow_null=True)
    location_id = serializers.UUIDField(allow_null=True)
    location_name = serializers.CharField(allow_null=True)
    code = serializers.CharField()
    name = serializers.CharField()
    registration_type_ref = serializers.CharField()
    registration_number = serializers.CharField()
    employer_identifier = serializers.CharField(allow_blank=True)
    jurisdiction_ref = serializers.CharField(allow_blank=True)
    filing_authority_ref = serializers.CharField(allow_blank=True)
    provider_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    filing_calendar_count = serializers.IntegerField()
    open_filing_calendar_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollStatutoryEmployerRegistrationWriteSerializer(serializers.Serializer):
    statutory_pack_id = serializers.UUIDField(required=False)
    statutory_component_id = serializers.UUIDField(required=False, allow_null=True)
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    branch_id = serializers.UUIDField(required=False, allow_null=True)
    location_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.SlugField(max_length=100, required=False)
    name = serializers.CharField(max_length=255, required=False)
    registration_type_ref = serializers.CharField(max_length=160, required=False)
    registration_number = serializers.CharField(max_length=120, required=False)
    employer_identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)
    jurisdiction_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    filing_authority_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    provider_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["statutory_pack_id", "code", "name", "registration_type_ref", "registration_number", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollStatutoryFilingCalendarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    statutory_pack_id = serializers.UUIDField()
    statutory_pack_name = serializers.CharField()
    statutory_component_id = serializers.UUIDField(allow_null=True)
    statutory_component_name = serializers.CharField(allow_null=True)
    statutory_type = serializers.CharField(allow_blank=True)
    employer_registration_id = serializers.UUIDField(allow_null=True)
    employer_registration_name = serializers.CharField(allow_null=True)
    employer_registration_number = serializers.CharField(allow_blank=True)
    code = serializers.CharField()
    name = serializers.CharField()
    filing_type_ref = serializers.CharField()
    filing_frequency = serializers.CharField()
    filing_frequency_label = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    due_date = serializers.DateField()
    grace_due_date = serializers.DateField(allow_null=True)
    filing_window_start = serializers.DateField(allow_null=True)
    filing_window_end = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    filing_authority_ref = serializers.CharField(allow_blank=True)
    provider_ref = serializers.CharField(allow_blank=True)
    output_profile_ref = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    days_until_due = serializers.IntegerField(allow_null=True)
    is_due = serializers.BooleanField()
    is_overdue = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollStatutoryFilingCalendarWriteSerializer(serializers.Serializer):
    statutory_pack_id = serializers.UUIDField(required=False)
    statutory_component_id = serializers.UUIDField(required=False, allow_null=True)
    employer_registration_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.SlugField(max_length=120, required=False)
    name = serializers.CharField(max_length=255, required=False)
    filing_type_ref = serializers.CharField(max_length=160, required=False)
    filing_frequency = serializers.ChoiceField(choices=PayrollFrequency.values, required=False)
    period_start = serializers.DateField(required=False)
    period_end = serializers.DateField(required=False)
    due_date = serializers.DateField(required=False)
    grace_due_date = serializers.DateField(required=False, allow_null=True)
    filing_window_start = serializers.DateField(required=False, allow_null=True)
    filing_window_end = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=PayrollStatutoryFilingStatus.values, required=False)
    filing_authority_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    provider_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    output_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name", "filing_type_ref", "period_start", "period_end", "due_date"] if field not in attrs]
            if "statutory_pack_id" not in attrs and "employer_registration_id" not in attrs:
                missing.append("statutory_pack_id")
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminEmployeeStatutoryProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    statutory_pack_id = serializers.UUIDField(allow_null=True)
    statutory_pack_name = serializers.CharField(allow_null=True)
    profile_ref = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    pan_number = serializers.CharField(allow_blank=True)
    uan_number = serializers.CharField(allow_blank=True)
    pf_number = serializers.CharField(allow_blank=True)
    esi_number = serializers.CharField(allow_blank=True)
    pf_applicable = serializers.BooleanField()
    esi_applicable = serializers.BooleanField()
    professional_tax_state = serializers.CharField(allow_blank=True)
    lwf_state = serializers.CharField(allow_blank=True)
    tax_regime = serializers.CharField()
    tax_regime_label = serializers.CharField()
    declaration_status = serializers.CharField()
    declaration_status_label = serializers.CharField()
    previous_employment_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    previous_employment_tax_deducted = serializers.DecimalField(max_digits=14, decimal_places=2)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminEmployeeStatutoryProfileWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    statutory_pack_id = serializers.UUIDField(required=False, allow_null=True)
    profile_ref = serializers.CharField(max_length=160, required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=PayrollConfigStatus.values, required=False)
    pan_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    uan_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    pf_number = serializers.CharField(max_length=40, required=False, allow_blank=True)
    esi_number = serializers.CharField(max_length=40, required=False, allow_blank=True)
    pf_applicable = serializers.BooleanField(required=False)
    esi_applicable = serializers.BooleanField(required=False)
    professional_tax_state = serializers.CharField(max_length=10, required=False, allow_blank=True)
    lwf_state = serializers.CharField(max_length=10, required=False, allow_blank=True)
    tax_regime = serializers.ChoiceField(choices=PayrollTaxRegime.values, required=False)
    declaration_status = serializers.ChoiceField(choices=PayrollDeclarationStatus.values, required=False)
    previous_employment_income = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    previous_employment_tax_deducted = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["employee_id", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminEmployeeStatutoryDeclarationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    employee_statutory_profile_id = serializers.UUIDField()
    statutory_pack_id = serializers.UUIDField(allow_null=True)
    statutory_pack_name = serializers.CharField(allow_null=True)
    financial_year_code = serializers.CharField()
    declaration_profile_ref = serializers.CharField()
    proof_window_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    tax_regime = serializers.CharField()
    tax_regime_label = serializers.CharField()
    declared_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    verified_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by_name = serializers.CharField(allow_null=True)
    verified_at = serializers.DateTimeField(allow_null=True)
    verified_by_name = serializers.CharField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    rejected_by_name = serializers.CharField(allow_null=True)
    locked_at = serializers.DateTimeField(allow_null=True)
    locked_by_name = serializers.CharField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    item_count = serializers.IntegerField()
    submitted_item_count = serializers.IntegerField()
    verified_item_count = serializers.IntegerField()
    rejected_item_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminEmployeeStatutoryDeclarationWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    employee_statutory_profile_id = serializers.UUIDField(required=False)
    statutory_pack_id = serializers.UUIDField(required=False, allow_null=True)
    financial_year_code = serializers.CharField(max_length=40, required=False)
    declaration_profile_ref = serializers.CharField(max_length=160, required=False)
    proof_window_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PayrollStatutoryDeclarationStatus.values, required=False)
    tax_regime = serializers.ChoiceField(choices=PayrollTaxRegime.values, required=False)
    declared_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    verified_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["employee_id", "employee_statutory_profile_id", "financial_year_code"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminEmployeeStatutoryDeclarationItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    declaration_id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    financial_year_code = serializers.CharField()
    item_kind = serializers.CharField()
    item_kind_label = serializers.CharField()
    section_code = serializers.CharField()
    component_code = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    declared_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    verified_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    proof_status = serializers.CharField()
    proof_status_label = serializers.CharField()
    proof_document_ref = serializers.CharField(allow_blank=True)
    proof_artifact_key = serializers.CharField(allow_blank=True)
    proof_submitted_at = serializers.DateTimeField(allow_null=True)
    verified_at = serializers.DateTimeField(allow_null=True)
    verified_by_name = serializers.CharField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    rejected_by_name = serializers.CharField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminEmployeeStatutoryDeclarationItemWriteSerializer(serializers.Serializer):
    item_kind = serializers.ChoiceField(choices=PayrollStatutoryDeclarationItemKind.values, required=False)
    section_code = serializers.CharField(max_length=80, required=False)
    component_code = serializers.CharField(max_length=120, required=False, allow_blank=True)
    name = serializers.CharField(max_length=255, required=False)
    declared_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    verified_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    proof_status = serializers.ChoiceField(choices=PayrollStatutoryProofStatus.values, required=False)
    proof_document_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    proof_artifact_key = serializers.CharField(max_length=240, required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["section_code", "name", "declared_amount"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminEmployeeStatutoryDeclarationRejectSerializer(serializers.Serializer):
    reason = serializers.CharField()


class HrAdminEmployeeStatutoryDeclarationItemVerifySerializer(serializers.Serializer):
    verified_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    proof_status = serializers.ChoiceField(choices=[PayrollStatutoryProofStatus.VERIFIED, PayrollStatutoryProofStatus.REJECTED], required=False)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class HrAdminPayrollStatutoryOptionsSerializer(serializers.Serializer):
    config_statuses = HrAdminEnumOptionSerializer(many=True)
    statutory_component_types = HrAdminEnumOptionSerializer(many=True)
    contribution_owners = HrAdminEnumOptionSerializer(many=True)
    calculation_methods = HrAdminEnumOptionSerializer(many=True)
    payroll_frequencies = HrAdminEnumOptionSerializer(many=True)
    tax_regimes = HrAdminEnumOptionSerializer(many=True)
    declaration_statuses = HrAdminEnumOptionSerializer(many=True)
    statutory_declaration_statuses = HrAdminEnumOptionSerializer(many=True)
    statutory_declaration_item_kinds = HrAdminEnumOptionSerializer(many=True)
    statutory_proof_statuses = HrAdminEnumOptionSerializer(many=True)
    statutory_filing_statuses = HrAdminEnumOptionSerializer(many=True)
    salary_components = serializers.JSONField()
    employees = serializers.JSONField()
    legal_entities = serializers.JSONField()
    branches = serializers.JSONField()
    locations = serializers.JSONField()


class HrAdminPayrollStatutorySetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    packs = HrAdminPayrollStatutoryPackSerializer(many=True)
    statutory_components = HrAdminPayrollStatutoryComponentSerializer(many=True)
    slabs = HrAdminPayrollStatutorySlabSerializer(many=True)
    employer_registrations = HrAdminPayrollStatutoryEmployerRegistrationSerializer(many=True)
    filing_calendars = HrAdminPayrollStatutoryFilingCalendarSerializer(many=True)
    employee_profiles = HrAdminEmployeeStatutoryProfileSerializer(many=True)
    declarations = HrAdminEmployeeStatutoryDeclarationSerializer(many=True)
    declaration_items = HrAdminEmployeeStatutoryDeclarationItemSerializer(many=True)
    options = HrAdminPayrollStatutoryOptionsSerializer()


class MeStatutoryDeclarationItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    declaration_id = serializers.UUIDField()
    financial_year_code = serializers.CharField()
    item_kind = serializers.CharField()
    item_kind_label = serializers.CharField()
    section_code = serializers.CharField()
    component_code = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    declared_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    verified_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    proof_status = serializers.CharField()
    proof_status_label = serializers.CharField()
    proof_document_ref = serializers.CharField(allow_blank=True)
    proof_artifact_key = serializers.CharField(allow_blank=True)
    proof_submitted_at = serializers.DateTimeField(allow_null=True)
    verified_at = serializers.DateTimeField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class MeStatutoryDeclarationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_statutory_profile_id = serializers.UUIDField()
    statutory_pack_id = serializers.UUIDField(allow_null=True)
    statutory_pack_name = serializers.CharField(allow_null=True)
    financial_year_code = serializers.CharField()
    declaration_profile_ref = serializers.CharField()
    proof_window_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    tax_regime = serializers.CharField()
    tax_regime_label = serializers.CharField()
    declared_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    verified_total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    submitted_at = serializers.DateTimeField(allow_null=True)
    verified_at = serializers.DateTimeField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    locked_at = serializers.DateTimeField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    items = MeStatutoryDeclarationItemSerializer(many=True)
    item_count = serializers.IntegerField()
    submitted_item_count = serializers.IntegerField()
    verified_item_count = serializers.IntegerField()
    rejected_item_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class MeStatutoryDeclarationListSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    profile = HrAdminEmployeeStatutoryProfileSerializer(allow_null=True)
    items = MeStatutoryDeclarationSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()
    options = serializers.JSONField()


class MeStatutoryDeclarationWriteSerializer(serializers.Serializer):
    employee_statutory_profile_id = serializers.UUIDField(required=False)
    statutory_pack_id = serializers.UUIDField(required=False, allow_null=True)
    financial_year_code = serializers.CharField(max_length=40, required=False)
    declaration_profile_ref = serializers.CharField(max_length=160, required=False)
    proof_window_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    tax_regime = serializers.ChoiceField(choices=PayrollTaxRegime.values, required=False)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial and "financial_year_code" not in attrs:
            raise serializers.ValidationError({"financial_year_code": "This field is required."})
        return attrs


class MeStatutoryDeclarationItemWriteSerializer(serializers.Serializer):
    item_kind = serializers.ChoiceField(choices=PayrollStatutoryDeclarationItemKind.values, required=False)
    section_code = serializers.CharField(max_length=80, required=False)
    component_code = serializers.CharField(max_length=120, required=False, allow_blank=True)
    name = serializers.CharField(max_length=255, required=False)
    declared_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    proof_status = serializers.ChoiceField(
        choices=[
            PayrollStatutoryProofStatus.NOT_REQUIRED,
            PayrollStatutoryProofStatus.PENDING,
            PayrollStatutoryProofStatus.SUBMITTED,
        ],
        required=False,
    )
    proof_document_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    proof_artifact_key = serializers.CharField(max_length=240, required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["section_code", "name", "declared_amount"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class MeStatutoryDeclarationProofUploadSerializer(serializers.Serializer):
    category_id = serializers.UUIDField()
    replace_document_id = serializers.UUIDField(required=False, allow_null=True)
    item_id = serializers.UUIDField(required=False, allow_null=True)
    item_kind = serializers.ChoiceField(choices=PayrollStatutoryDeclarationItemKind.values, required=False)
    section_code = serializers.CharField(max_length=80, required=False)
    component_code = serializers.CharField(max_length=120, required=False, allow_blank=True)
    name = serializers.CharField(max_length=255, required=False)
    declared_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    document_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    issued_on = serializers.DateField(required=False, allow_null=True)
    expires_on = serializers.DateField(required=False, allow_null=True)
    file = serializers.FileField()

    def validate(self, attrs):
        if not attrs.get("item_id"):
            missing = [field for field in ["section_code", "name", "declared_amount"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required when item_id is not provided." for field in missing})
        return attrs


class HrAdminPayrollRunSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    period_id = serializers.UUIDField()
    period_name = serializers.CharField()
    pay_group_id = serializers.UUIDField(allow_null=True)
    pay_group_name = serializers.CharField(allow_null=True)
    code = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    input_profile_ref = serializers.CharField()
    snapshot_schema_ref = serializers.CharField()
    locked_at = serializers.DateTimeField(allow_null=True)
    locked_by_name = serializers.CharField(allow_null=True)
    final_locked_at = serializers.DateTimeField(allow_null=True)
    final_locked_by_name = serializers.CharField(allow_null=True)
    config_snapshot = serializers.JSONField()
    snapshot_count = serializers.IntegerField()
    ready_count = serializers.IntegerField()
    warning_count = serializers.IntegerField()
    blocked_count = serializers.IntegerField()
    locked_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRunWriteSerializer(serializers.Serializer):
    period_id = serializers.UUIDField(required=False)
    pay_group_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.SlugField(max_length=100, required=False)
    name = serializers.CharField(max_length=255, required=False)
    status = serializers.ChoiceField(choices=PayrollRunStatus.values, required=False)
    input_profile_ref = serializers.CharField(max_length=160, required=False)
    snapshot_schema_ref = serializers.CharField(max_length=160, required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["period_id", "code", "name"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollInputSnapshotSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    pay_group_assignment_id = serializers.UUIDField(allow_null=True)
    pay_group_name = serializers.CharField(allow_null=True)
    salary_assignment_id = serializers.UUIDField(allow_null=True)
    salary_structure_name = serializers.CharField(allow_null=True)
    salary_structure_version = serializers.IntegerField(allow_null=True)
    snapshot_status = serializers.CharField()
    snapshot_status_label = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    source_collected_at = serializers.DateTimeField()
    locked_at = serializers.DateTimeField(allow_null=True)
    input_profile_ref = serializers.CharField()
    employee_snapshot = serializers.JSONField()
    organization_snapshot = serializers.JSONField()
    salary_snapshot = serializers.JSONField()
    attendance_snapshot = serializers.JSONField()
    leave_snapshot = serializers.JSONField()
    lifecycle_snapshot = serializers.JSONField()
    document_snapshot = serializers.JSONField()
    banking_snapshot = serializers.JSONField()
    validation_snapshot = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    blockers = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollInputSnapshotWriteSerializer(serializers.Serializer):
    payroll_run_id = serializers.UUIDField(required=False)
    employee_id = serializers.UUIDField(required=False)
    pay_group_assignment_id = serializers.UUIDField(required=False, allow_null=True)
    salary_assignment_id = serializers.UUIDField(required=False, allow_null=True)
    snapshot_status = serializers.ChoiceField(choices=PayrollInputSnapshotStatus.values, required=False)
    input_profile_ref = serializers.CharField(max_length=160, required=False)
    employee_snapshot = serializers.JSONField(required=False)
    organization_snapshot = serializers.JSONField(required=False)
    salary_snapshot = serializers.JSONField(required=False)
    attendance_snapshot = serializers.JSONField(required=False)
    leave_snapshot = serializers.JSONField(required=False)
    lifecycle_snapshot = serializers.JSONField(required=False)
    document_snapshot = serializers.JSONField(required=False)
    banking_snapshot = serializers.JSONField(required=False)
    validation_snapshot = serializers.JSONField(required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["payroll_run_id", "employee_id"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollInputLockResultSerializer(serializers.Serializer):
    payroll_run = HrAdminPayrollRunSerializer()
    locked_count = serializers.IntegerField()
    blocked_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    detail = serializers.CharField()


class HrAdminPayrollInputSnapshotOptionsSerializer(serializers.Serializer):
    payroll_run_statuses = HrAdminEnumOptionSerializer(many=True)
    payroll_input_snapshot_statuses = HrAdminEnumOptionSerializer(many=True)
    periods = HrAdminOptionItemSerializer(many=True)
    pay_groups = HrAdminOptionItemSerializer(many=True)
    employees = HrAdminManagerOptionSerializer(many=True)


class HrAdminPayrollInputSnapshotSetupSerializer(serializers.Serializer):
    summary = serializers.DictField(child=serializers.IntegerField())
    runs = HrAdminPayrollRunSerializer(many=True)
    snapshots = HrAdminPayrollInputSnapshotSerializer(many=True)
    options = HrAdminPayrollInputSnapshotOptionsSerializer()


class HrAdminPayrollRuleDefinitionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    rule_type = serializers.CharField()
    rule_type_label = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    tags = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    version_count = serializers.IntegerField()
    active_version_count = serializers.IntegerField()
    evaluation_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRuleDefinitionWriteSerializer(serializers.Serializer):
    code = serializers.SlugField(max_length=120, required=False)
    name = serializers.CharField(max_length=255, required=False)
    rule_type = serializers.ChoiceField(choices=PayrollRuleType.values, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.JSONField(required=False)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["code", "name", "rule_type"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollRuleVersionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    rule_id = serializers.UUIDField()
    rule_code = serializers.CharField()
    rule_name = serializers.CharField()
    rule_type = serializers.CharField()
    version = serializers.IntegerField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    expression_language = serializers.CharField()
    expression_language_label = serializers.CharField()
    expression = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    input_schema = serializers.JSONField()
    output_schema = serializers.JSONField()
    rounding_rule_ref = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    evaluation_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRuleVersionWriteSerializer(serializers.Serializer):
    rule_id = serializers.UUIDField(required=False)
    version = serializers.IntegerField(min_value=1, required=False)
    status = serializers.ChoiceField(choices=PayrollRuleVersionStatus.values, required=False)
    expression_language = serializers.ChoiceField(choices=PayrollExpressionLanguage.values, required=False)
    expression = serializers.CharField(required=False)
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    input_schema = serializers.JSONField(required=False)
    output_schema = serializers.JSONField(required=False)
    rounding_rule_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            missing = [field for field in ["rule_id", "version", "expression", "effective_from"] if field not in attrs]
            if missing:
                raise serializers.ValidationError({field: "This field is required." for field in missing})
        return attrs


class HrAdminPayrollRuleEvaluationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    rule_version_id = serializers.UUIDField()
    rule_code = serializers.CharField()
    rule_name = serializers.CharField()
    rule_type = serializers.CharField()
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    employee_code = serializers.CharField(allow_null=True)
    employee_name = serializers.CharField(allow_null=True)
    expression = serializers.CharField()
    context_snapshot = serializers.JSONField()
    result_snapshot = serializers.JSONField()
    trace_snapshot = serializers.JSONField()
    evaluated_by_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRuleEvaluateRequestSerializer(serializers.Serializer):
    input_snapshot_id = serializers.UUIDField(required=False, allow_null=True)
    context = serializers.JSONField(required=False)
    persist = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not attrs.get("input_snapshot_id") and "context" not in attrs:
            raise serializers.ValidationError({"context": "Provide context or input_snapshot_id."})
        return attrs


class HrAdminPayrollRuleEvaluateResponseSerializer(serializers.Serializer):
    result = serializers.JSONField()
    dependencies = serializers.ListField(child=serializers.CharField())
    trace = serializers.JSONField()
    evaluation = HrAdminPayrollRuleEvaluationSerializer(allow_null=True)


class HrAdminPayrollRulesOptionsSerializer(serializers.Serializer):
    rule_types = HrAdminEnumOptionSerializer(many=True)
    rule_version_statuses = HrAdminEnumOptionSerializer(many=True)
    expression_languages = HrAdminEnumOptionSerializer(many=True)
    input_snapshots = serializers.ListField(child=serializers.DictField())


class HrAdminPayrollRulesSetupSerializer(serializers.Serializer):
    summary = serializers.DictField(child=serializers.IntegerField())
    rules = HrAdminPayrollRuleDefinitionSerializer(many=True)
    versions = HrAdminPayrollRuleVersionSerializer(many=True)
    evaluations = HrAdminPayrollRuleEvaluationSerializer(many=True)
    options = HrAdminPayrollRulesOptionsSerializer()


class HrAdminPayrollRunCalculationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    payroll_run_status = serializers.CharField()
    period_name = serializers.CharField()
    pay_group_name = serializers.CharField(allow_null=True)
    attempt_number = serializers.IntegerField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    calculation_profile_ref = serializers.CharField()
    calculated_at = serializers.DateTimeField(allow_null=True)
    calculated_by_name = serializers.CharField(allow_null=True)
    rule_selection_snapshot = serializers.JSONField()
    totals_snapshot = serializers.JSONField()
    error_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    line_count = serializers.IntegerField()
    error_line_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollCalculationLineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    calculation_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    input_snapshot_id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    rule_version_id = serializers.UUIDField(allow_null=True)
    rule_code = serializers.CharField(allow_blank=True)
    rule_name = serializers.CharField(allow_blank=True)
    rule_version = serializers.IntegerField(allow_null=True)
    adjustment_id = serializers.UUIDField(allow_null=True)
    line_source = serializers.CharField()
    line_source_label = serializers.CharField()
    component_code = serializers.CharField()
    component_name = serializers.CharField()
    line_type = serializers.CharField()
    calculation_order = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    expression = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    context_snapshot = serializers.JSONField()
    result_snapshot = serializers.JSONField()
    trace_snapshot = serializers.JSONField()
    error_message = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollDraftCalculateRequestSerializer(serializers.Serializer):
    calculation_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollValidationIssueSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    calculation_id = serializers.UUIDField(allow_null=True)
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    employee_id = serializers.UUIDField(allow_null=True)
    employee_code = serializers.CharField(allow_blank=True)
    employee_name = serializers.CharField(allow_blank=True)
    calculation_line_id = serializers.UUIDField(allow_null=True)
    severity = serializers.CharField()
    severity_label = serializers.CharField()
    category = serializers.CharField()
    category_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    issue_code = serializers.CharField()
    title = serializers.CharField()
    detail = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    validation_profile_ref = serializers.CharField()
    source_hash = serializers.CharField(allow_blank=True)
    context_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollDraftCalculateResultSerializer(serializers.Serializer):
    calculation = HrAdminPayrollRunCalculationSerializer()
    lines = HrAdminPayrollCalculationLineSerializer(many=True)
    detail = serializers.CharField()


class HrAdminPayrollCalculationOptionsSerializer(serializers.Serializer):
    payroll_run_statuses = HrAdminEnumOptionSerializer(many=True)
    calculation_statuses = HrAdminEnumOptionSerializer(many=True)
    line_statuses = HrAdminEnumOptionSerializer(many=True)
    line_sources = HrAdminEnumOptionSerializer(many=True)
    validation_severities = HrAdminEnumOptionSerializer(many=True)
    validation_categories = HrAdminEnumOptionSerializer(many=True)
    validation_statuses = HrAdminEnumOptionSerializer(many=True)
    active_rule_versions = serializers.ListField(child=serializers.DictField())


class HrAdminPayrollCalculationSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    runs = HrAdminPayrollRunSerializer(many=True)
    calculations = HrAdminPayrollRunCalculationSerializer(many=True)
    lines = HrAdminPayrollCalculationLineSerializer(many=True)
    validation_issues = HrAdminPayrollValidationIssueSerializer(many=True)
    options = HrAdminPayrollCalculationOptionsSerializer()


class HrAdminPayrollRunReviewSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    payroll_run_status = serializers.CharField()
    calculation_id = serializers.UUIDField()
    calculation_attempt_number = serializers.IntegerField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    review_profile_ref = serializers.CharField()
    opened_at = serializers.DateTimeField()
    opened_by_name = serializers.CharField(allow_null=True)
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by_name = serializers.CharField(allow_null=True)
    approved_at = serializers.DateTimeField(allow_null=True)
    approved_by_name = serializers.CharField(allow_null=True)
    locked_at = serializers.DateTimeField(allow_null=True)
    locked_by_name = serializers.CharField(allow_null=True)
    totals_snapshot = serializers.JSONField()
    exception_summary_snapshot = serializers.JSONField()
    approval_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    exception_count = serializers.IntegerField()
    approval_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRunExceptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    review_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    calculation_line_id = serializers.UUIDField(allow_null=True)
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    employee_id = serializers.UUIDField(allow_null=True)
    employee_code = serializers.CharField(allow_null=True)
    employee_name = serializers.CharField(allow_null=True)
    component_code = serializers.CharField(allow_null=True)
    category = serializers.CharField()
    severity = serializers.CharField()
    severity_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    title = serializers.CharField()
    detail = serializers.CharField(allow_blank=True)
    decision_reason = serializers.CharField(allow_blank=True)
    decided_at = serializers.DateTimeField(allow_null=True)
    decided_by_name = serializers.CharField(allow_null=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollRunApprovalSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    review_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    approver_name = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    comment = serializers.CharField(allow_blank=True)
    decided_at = serializers.DateTimeField(allow_null=True)
    approval_profile_ref = serializers.CharField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollOpenReviewRequestSerializer(serializers.Serializer):
    calculation_id = serializers.UUIDField(required=False)
    review_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollCreateExceptionRequestSerializer(serializers.Serializer):
    calculation_line_id = serializers.UUIDField(required=False, allow_null=True)
    input_snapshot_id = serializers.UUIDField(required=False, allow_null=True)
    employee_id = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.CharField(max_length=80, required=False, default="manual_review")
    severity = serializers.ChoiceField(choices=PayrollExceptionSeverity.values, required=False, default=PayrollExceptionSeverity.WARNING)
    title = serializers.CharField(max_length=255)
    detail = serializers.CharField(required=False, allow_blank=True, default="")
    config_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollExceptionDecisionRequestSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[
        PayrollExceptionStatus.ACCEPTED,
        PayrollExceptionStatus.RESOLVED,
        PayrollExceptionStatus.REJECTED,
    ])
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class HrAdminPayrollReviewApprovalRequestSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    approval_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollReviewActionResultSerializer(serializers.Serializer):
    review = HrAdminPayrollRunReviewSerializer()
    exceptions = HrAdminPayrollRunExceptionSerializer(many=True)
    approvals = HrAdminPayrollRunApprovalSerializer(many=True)
    detail = serializers.CharField()


class HrAdminPayrollReviewOptionsSerializer(serializers.Serializer):
    payroll_run_statuses = HrAdminEnumOptionSerializer(many=True)
    review_statuses = HrAdminEnumOptionSerializer(many=True)
    exception_statuses = HrAdminEnumOptionSerializer(many=True)
    exception_severities = HrAdminEnumOptionSerializer(many=True)
    approval_statuses = HrAdminEnumOptionSerializer(many=True)


class HrAdminPayrollReviewSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    runs = HrAdminPayrollRunSerializer(many=True)
    calculations = HrAdminPayrollRunCalculationSerializer(many=True)
    reviews = HrAdminPayrollRunReviewSerializer(many=True)
    exceptions = HrAdminPayrollRunExceptionSerializer(many=True)
    approvals = HrAdminPayrollRunApprovalSerializer(many=True)
    lines = HrAdminPayrollCalculationLineSerializer(many=True)
    options = HrAdminPayrollReviewOptionsSerializer()


class HrAdminPayrollOutputBatchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    review_id = serializers.UUIDField()
    review_status = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    output_profile_ref = serializers.CharField()
    generated_at = serializers.DateTimeField(allow_null=True)
    generated_by_name = serializers.CharField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)
    published_by_name = serializers.CharField(allow_null=True)
    totals_snapshot = serializers.JSONField()
    artifact_summary_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    artifact_count = serializers.IntegerField()
    payslip_count = serializers.IntegerField()
    register_count = serializers.IntegerField()
    published_artifact_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollOutputArtifactSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    output_batch_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    review_id = serializers.UUIDField()
    employee_id = serializers.UUIDField(allow_null=True)
    employee_code = serializers.CharField(allow_null=True)
    employee_name = serializers.CharField(allow_null=True)
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    kind = serializers.CharField()
    kind_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    artifact_key = serializers.CharField()
    title = serializers.CharField()
    file_name = serializers.CharField(allow_blank=True)
    content_type = serializers.CharField()
    storage_provider_ref = serializers.CharField()
    storage_key = serializers.CharField(allow_blank=True)
    storage_object_version = serializers.CharField(allow_blank=True)
    mime_type = serializers.CharField()
    file_size_bytes = serializers.IntegerField()
    checksum_sha256 = serializers.CharField(allow_blank=True)
    is_downloadable = serializers.BooleanField()
    download_strategy_ref = serializers.CharField()
    supports_signed_url = serializers.BooleanField()
    signed_url_expires_in_seconds = serializers.IntegerField()
    retention_policy_ref = serializers.CharField()
    download_url = serializers.CharField(allow_null=True)
    signed_download_url = serializers.CharField(allow_null=True)
    signed_download_expires_at = serializers.DateTimeField(allow_null=True)
    output_profile_ref = serializers.CharField()
    totals_snapshot = serializers.JSONField()
    line_snapshot = serializers.JSONField()
    access_summary = serializers.JSONField()
    access_events = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    published_at = serializers.DateTimeField(allow_null=True)
    published_by_name = serializers.CharField(allow_null=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PayrollArtifactSignedAccessGrantSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    output_artifact_id = serializers.UUIDField()
    status = serializers.CharField()
    permission_scope = serializers.CharField()
    grant_profile_ref = serializers.CharField()
    source_channel_ref = serializers.CharField()
    issued_to_membership_id = serializers.UUIDField(allow_null=True)
    issued_to_membership_name = serializers.CharField(allow_null=True)
    issued_by_name = serializers.CharField(allow_null=True)
    token_prefix = serializers.CharField(allow_blank=True)
    signed_url = serializers.CharField(allow_blank=True)
    expires_at = serializers.DateTimeField()
    revoked_at = serializers.DateTimeField(allow_null=True)
    revocation_reason = serializers.CharField(allow_blank=True)
    access_count = serializers.IntegerField()
    max_access_count = serializers.IntegerField(allow_null=True)
    storage_provider_ref = serializers.CharField(allow_blank=True)
    storage_object_version = serializers.CharField(allow_blank=True)
    download_strategy_ref = serializers.CharField(allow_blank=True)
    checksum_sha256 = serializers.CharField(allow_blank=True)
    metadata_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PayrollArtifactSignedAccessGrantIssueRequestSerializer(serializers.Serializer):
    expires_in_seconds = serializers.IntegerField(min_value=60, max_value=86400, required=False)
    max_access_count = serializers.IntegerField(min_value=1, max_value=100, required=False)
    permission_scope = serializers.CharField(max_length=80, required=False, allow_blank=True)


class PayrollArtifactSignedAccessGrantIssueResultSerializer(serializers.Serializer):
    grant = PayrollArtifactSignedAccessGrantSerializer()
    signed_url = serializers.CharField()
    expires_at = serializers.DateTimeField()


class PayrollArtifactSignedAccessGrantRevokeRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)


class HrAdminPayrollGenerateOutputsRequestSerializer(serializers.Serializer):
    output_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollOutputActionResultSerializer(serializers.Serializer):
    output_batch = HrAdminPayrollOutputBatchSerializer()
    artifacts = HrAdminPayrollOutputArtifactSerializer(many=True)
    detail = serializers.CharField()


class HrAdminPayrollOutputOptionsSerializer(serializers.Serializer):
    output_batch_statuses = HrAdminEnumOptionSerializer(many=True)
    output_artifact_kinds = HrAdminEnumOptionSerializer(many=True)
    output_artifact_statuses = HrAdminEnumOptionSerializer(many=True)


class HrAdminPayrollOutputSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    runs = HrAdminPayrollRunSerializer(many=True)
    reviews = HrAdminPayrollRunReviewSerializer(many=True)
    output_batches = HrAdminPayrollOutputBatchSerializer(many=True)
    artifacts = HrAdminPayrollOutputArtifactSerializer(many=True)
    options = HrAdminPayrollOutputOptionsSerializer()


class HrAdminPayrollFinanceHandoffSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    output_batch_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    review_id = serializers.UUIDField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    handoff_profile_ref = serializers.CharField()
    bank_file_profile_ref = serializers.CharField()
    accounting_export_profile_ref = serializers.CharField()
    statutory_pack_ref = serializers.CharField()
    generated_at = serializers.DateTimeField(allow_null=True)
    generated_by_name = serializers.CharField(allow_null=True)
    transmitted_at = serializers.DateTimeField(allow_null=True)
    transmitted_by_name = serializers.CharField(allow_null=True)
    accepted_at = serializers.DateTimeField(allow_null=True)
    accepted_by_name = serializers.CharField(allow_null=True)
    totals_snapshot = serializers.JSONField()
    handoff_summary_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    artifact_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderDeliverySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    handoff_id = serializers.UUIDField()
    output_artifact_id = serializers.UUIDField()
    output_artifact_title = serializers.CharField()
    output_batch_id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    review_id = serializers.UUIDField()
    artifact_kind = serializers.CharField()
    artifact_kind_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    provider_ref = serializers.CharField()
    channel_ref = serializers.CharField()
    external_reference = serializers.CharField(allow_blank=True)
    retry_policy_ref = serializers.CharField()
    attempt_count = serializers.IntegerField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by_name = serializers.CharField(allow_null=True)
    acknowledged_at = serializers.DateTimeField(allow_null=True)
    acknowledged_by_name = serializers.CharField(allow_null=True)
    reconciled_at = serializers.DateTimeField(allow_null=True)
    reconciled_by_name = serializers.CharField(allow_null=True)
    failure_code = serializers.CharField(allow_blank=True)
    failure_reason = serializers.CharField(allow_blank=True)
    payload_checksum_sha256 = serializers.CharField(allow_blank=True)
    request_snapshot = serializers.JSONField()
    response_snapshot = serializers.JSONField()
    reconciliation_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderCallbackEventSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    provider_delivery_id = serializers.UUIDField()
    handoff_id = serializers.UUIDField()
    output_artifact_id = serializers.UUIDField()
    output_artifact_title = serializers.CharField()
    provider_ref = serializers.CharField()
    external_reference = serializers.CharField(allow_blank=True)
    external_event_id = serializers.CharField(allow_blank=True)
    idempotency_key = serializers.CharField()
    callback_profile_ref = serializers.CharField()
    callback_verification_ref = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    provider_status = serializers.CharField()
    provider_status_label = serializers.CharField()
    payload_checksum_sha256 = serializers.CharField()
    signature = serializers.CharField(allow_blank=True)
    verification_snapshot = serializers.JSONField()
    payload_snapshot = serializers.JSONField()
    processing_snapshot = serializers.JSONField()
    received_at = serializers.DateTimeField(allow_null=True)
    processed_at = serializers.DateTimeField(allow_null=True)
    failure_code = serializers.CharField(allow_blank=True)
    failure_reason = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderRetryEventSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    provider_delivery_id = serializers.UUIDField()
    handoff_id = serializers.UUIDField()
    output_artifact_id = serializers.UUIDField()
    output_artifact_title = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    retry_policy_ref = serializers.CharField()
    failure_taxonomy_ref = serializers.CharField()
    failure_category_ref = serializers.CharField(allow_blank=True)
    retry_reason = serializers.CharField(allow_blank=True)
    attempt_number = serializers.IntegerField()
    scheduled_for = serializers.DateTimeField(allow_null=True)
    executed_at = serializers.DateTimeField(allow_null=True)
    requested_by_name = serializers.CharField(allow_null=True)
    executed_by_name = serializers.CharField(allow_null=True)
    decision_snapshot = serializers.JSONField()
    request_snapshot = serializers.JSONField()
    response_snapshot = serializers.JSONField()
    failure_code = serializers.CharField(allow_blank=True)
    failure_reason = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderJobSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    job_kind = serializers.CharField()
    job_kind_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    queue_policy_ref = serializers.CharField()
    worker_profile_ref = serializers.CharField()
    idempotency_key = serializers.CharField()
    provider_ref = serializers.CharField(allow_blank=True)
    provider_delivery_id = serializers.UUIDField(allow_null=True)
    provider_connection_id = serializers.UUIDField(allow_null=True)
    retry_event_id = serializers.UUIDField(allow_null=True)
    callback_event_id = serializers.UUIDField(allow_null=True)
    certification_run_id = serializers.UUIDField(allow_null=True)
    priority = serializers.IntegerField()
    attempt_count = serializers.IntegerField()
    max_attempts = serializers.IntegerField()
    scheduled_for = serializers.DateTimeField(allow_null=True)
    leased_at = serializers.DateTimeField(allow_null=True)
    leased_until = serializers.DateTimeField(allow_null=True)
    lease_owner_ref = serializers.CharField(allow_blank=True)
    heartbeat_at = serializers.DateTimeField(allow_null=True)
    heartbeat_count = serializers.IntegerField()
    recovery_count = serializers.IntegerField()
    last_recovered_at = serializers.DateTimeField(allow_null=True)
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    requested_by_name = serializers.CharField(allow_null=True)
    executed_by_name = serializers.CharField(allow_null=True)
    request_snapshot = serializers.JSONField()
    lease_snapshot = serializers.JSONField()
    response_snapshot = serializers.JSONField()
    failure_code = serializers.CharField(allow_blank=True)
    failure_reason = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderLaunchRehearsalSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    rehearsal_profile_ref = serializers.CharField()
    audit_pack_ref = serializers.CharField()
    generated_by_ref = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    can_launch = serializers.BooleanField()
    ready_lane_count = serializers.IntegerField()
    blocked_lane_count = serializers.IntegerField()
    launch_blocker_count = serializers.IntegerField()
    release_blocker_refs = serializers.JSONField()
    audit_pack_snapshot = serializers.JSONField()
    evidence_checksum_sha256 = serializers.CharField()
    generated_at = serializers.DateTimeField()
    generated_by_name = serializers.CharField(allow_null=True)
    source_hash = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollFinanceHandoffAcknowledgeRequestSerializer(serializers.Serializer):
    acknowledgement_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    provider_status = serializers.CharField(max_length=20, required=False, allow_blank=True)
    failure_code = serializers.CharField(max_length=80, required=False, allow_blank=True)
    failure_reason = serializers.CharField(required=False, allow_blank=True)
    response_snapshot = serializers.JSONField(required=False)


class PayrollProviderCallbackRequestSerializer(serializers.Serializer):
    provider_delivery_id = serializers.UUIDField(required=False)
    provider_ref = serializers.CharField(max_length=160)
    external_reference = serializers.CharField(max_length=180, required=False, allow_blank=True)
    external_event_id = serializers.CharField(max_length=180, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=180)
    event_timestamp = serializers.DateTimeField(required=False, allow_null=True)
    source_ip = serializers.CharField(max_length=80, required=False, allow_blank=True)
    provider_status = serializers.ChoiceField(choices=[
        PayrollProviderDeliveryStatus.ACKNOWLEDGED,
        PayrollProviderDeliveryStatus.RECONCILED,
        PayrollProviderDeliveryStatus.REJECTED,
        PayrollProviderDeliveryStatus.FAILED,
    ])
    payload_snapshot = serializers.JSONField(required=False)
    signature = serializers.CharField(max_length=1024)


class PayrollProviderCallbackResultSerializer(serializers.Serializer):
    callback_event = HrAdminPayrollProviderCallbackEventSerializer()
    delivery = HrAdminPayrollProviderDeliverySerializer()
    replayed = serializers.BooleanField()
    detail = serializers.CharField()


class HrAdminPayrollProviderRetryScheduleRequestSerializer(serializers.Serializer):
    retry_reason = serializers.CharField(required=False, allow_blank=True)
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)


class HrAdminPayrollProviderRetryRequeueRequestSerializer(serializers.Serializer):
    retry_event_id = serializers.UUIDField(required=False)


class HrAdminPayrollProviderRetryActionResultSerializer(serializers.Serializer):
    retry_event = HrAdminPayrollProviderRetryEventSerializer()
    delivery = HrAdminPayrollProviderDeliverySerializer()
    detail = serializers.CharField()


class HrAdminPayrollProviderConnectionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    provider_ref = serializers.CharField()
    provider_name = serializers.CharField()
    provider_kind = serializers.CharField()
    provider_kind_label = serializers.CharField()
    environment_ref = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    adapter_ref = serializers.CharField(allow_blank=True)
    sandbox_adapter_ref = serializers.CharField(allow_blank=True)
    channel_ref = serializers.CharField(allow_blank=True)
    credential_ref = serializers.CharField(allow_blank=True)
    credential_profile_ref = serializers.CharField(allow_blank=True)
    credential_required = serializers.BooleanField()
    callback_profile_ref = serializers.CharField(allow_blank=True)
    callback_verification_ref = serializers.CharField(allow_blank=True)
    retry_policy_ref = serializers.CharField(allow_blank=True)
    certification_status = serializers.CharField()
    certification_status_label = serializers.CharField()
    certification_profile_ref = serializers.CharField(allow_blank=True)
    certified_at = serializers.DateTimeField(allow_null=True)
    certified_by_name = serializers.CharField(allow_null=True)
    last_tested_at = serializers.DateTimeField(allow_null=True)
    last_tested_by_name = serializers.CharField(allow_null=True)
    readiness_snapshot = serializers.JSONField()
    certification_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    created_by_name = serializers.CharField(allow_null=True)
    updated_by_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderCertificationRunSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    provider_connection_id = serializers.UUIDField()
    provider_ref = serializers.CharField()
    provider_kind = serializers.CharField()
    provider_kind_label = serializers.CharField()
    environment_ref = serializers.CharField()
    run_profile_ref = serializers.CharField()
    certification_profile_ref = serializers.CharField(allow_blank=True)
    scenario_profile_ref = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    scenario_count = serializers.IntegerField()
    passed_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    blocker_count = serializers.IntegerField()
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    requested_by_name = serializers.CharField(allow_null=True)
    executed_by_name = serializers.CharField(allow_null=True)
    request_snapshot = serializers.JSONField()
    response_snapshot = serializers.JSONField()
    evidence_snapshot = serializers.JSONField()
    error_snapshot = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderSchemaMappingPackSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    provider_connection_id = serializers.UUIDField(allow_null=True)
    provider_ref = serializers.CharField()
    provider_kind = serializers.CharField()
    provider_kind_label = serializers.CharField()
    environment_ref = serializers.CharField()
    artifact_kind = serializers.CharField()
    artifact_kind_label = serializers.CharField()
    mapping_profile_ref = serializers.CharField()
    version = serializers.IntegerField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    source_schema_ref = serializers.CharField(allow_blank=True)
    target_schema_ref = serializers.CharField(allow_blank=True)
    transform_profile_ref = serializers.CharField()
    validation_profile_ref = serializers.CharField()
    enforcement_mode = serializers.CharField()
    transform_rules = serializers.JSONField()
    validation_rules = serializers.JSONField()
    sample_request_snapshot = serializers.JSONField()
    sample_output_snapshot = serializers.JSONField()
    evidence_snapshot = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    created_by_name = serializers.CharField(allow_null=True)
    updated_by_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderSchemaMappingSimulationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    mapping_pack_id = serializers.UUIDField()
    baseline_mapping_pack_id = serializers.UUIDField(allow_null=True)
    provider_connection_id = serializers.UUIDField(allow_null=True)
    provider_ref = serializers.CharField()
    provider_kind = serializers.CharField()
    provider_kind_label = serializers.CharField()
    environment_ref = serializers.CharField()
    artifact_kind = serializers.CharField()
    artifact_kind_label = serializers.CharField()
    mapping_profile_ref = serializers.CharField()
    mapping_pack_version = serializers.IntegerField()
    baseline_mapping_pack_version = serializers.IntegerField()
    simulation_profile_ref = serializers.CharField()
    comparison_profile_ref = serializers.CharField()
    status = serializers.ChoiceField(choices=PayrollProviderSchemaMappingSimulationStatus.choices)
    status_label = serializers.CharField()
    comparison_status = serializers.CharField()
    gate_count = serializers.IntegerField()
    passed_gate_count = serializers.IntegerField()
    blocker_count = serializers.IntegerField()
    changed_path_count = serializers.IntegerField()
    added_path_count = serializers.IntegerField()
    removed_path_count = serializers.IntegerField()
    request_snapshot = serializers.JSONField()
    provider_payload_snapshot = serializers.JSONField()
    baseline_payload_snapshot = serializers.JSONField()
    gate_snapshot = serializers.JSONField()
    blocking_gate_refs = serializers.JSONField()
    comparison_snapshot = serializers.JSONField()
    evidence_snapshot = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    simulated_by_name = serializers.CharField(allow_null=True)
    simulated_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollProviderSchemaMappingPackWriteSerializer(serializers.Serializer):
    provider_connection_id = serializers.UUIDField(required=False, allow_null=True)
    provider_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    provider_kind = serializers.ChoiceField(choices=PayrollProviderConnectionKind.choices, required=False)
    environment_ref = serializers.CharField(max_length=80, required=False, allow_blank=True)
    artifact_kind = serializers.ChoiceField(choices=PayrollOutputArtifactKind.choices, required=False)
    mapping_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    version = serializers.IntegerField(required=False, min_value=1)
    source_schema_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    target_schema_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    transform_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    validation_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    enforcement_mode = serializers.ChoiceField(choices=[("disabled", "Disabled"), ("warn", "Warn"), ("strict", "Strict")], required=False)
    transform_rules = serializers.JSONField(required=False)
    validation_rules = serializers.JSONField(required=False)
    sample_request_snapshot = serializers.JSONField(required=False)
    sample_output_snapshot = serializers.JSONField(required=False)
    change_reason = serializers.CharField(required=False, allow_blank=True)

    def validate_transform_rules(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Transform rules must be a list.")
        return value

    def validate_validation_rules(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Validation rules must be a list.")
        return value

    def validate_sample_request_snapshot(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Sample request snapshot must be an object.")
        return value

    def validate_sample_output_snapshot(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Sample output snapshot must be an object.")
        return value


class HrAdminPayrollProviderSchemaMappingPackLifecycleRequestSerializer(serializers.Serializer):
    approval_reason = serializers.CharField(required=False, allow_blank=True)
    archive_reason = serializers.CharField(required=False, allow_blank=True)
    approval_snapshot = serializers.JSONField(required=False)
    overrides = serializers.JSONField(required=False)

    def validate_approval_snapshot(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Approval snapshot must be an object.")
        return value

    def validate_overrides(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Overrides must be an object.")
        return value


class HrAdminPayrollProviderSchemaMappingPackSimulationRequestSerializer(serializers.Serializer):
    request_snapshot = serializers.JSONField(required=False)
    mapping_contract = serializers.JSONField(required=False)

    def validate_request_snapshot(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Simulation request snapshot must be an object.")
        return value

    def validate_mapping_contract(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Simulation mapping contract must be an object.")
        return value


class HrAdminPayrollProviderSchemaMappingPackSimulationResultSerializer(serializers.Serializer):
    mapping_pack = HrAdminPayrollProviderSchemaMappingPackSerializer()
    simulation_run = HrAdminPayrollProviderSchemaMappingSimulationSerializer()
    simulation = serializers.JSONField()
    detail = serializers.CharField()


class HrAdminPayrollProviderSchemaMappingPackImportSerializer(serializers.Serializer):
    provider_connection_id = serializers.UUIDField(required=False, allow_null=True)
    mapping_pack = serializers.JSONField()

    def validate_mapping_pack(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Mapping pack import payload must be an object.")
        return value


class HrAdminPayrollProviderSchemaMappingPackActionResultSerializer(serializers.Serializer):
    mapping_pack = HrAdminPayrollProviderSchemaMappingPackSerializer()
    detail = serializers.CharField()


class HrAdminPayrollProviderSchemaMappingPackExportSerializer(serializers.Serializer):
    mapping_pack = HrAdminPayrollProviderSchemaMappingPackSerializer()
    export_payload = serializers.JSONField()
    detail = serializers.CharField()


class HrAdminPayrollProviderConnectionWriteSerializer(serializers.Serializer):
    provider_ref = serializers.CharField(max_length=160, required=False)
    provider_name = serializers.CharField(max_length=160, required=False)
    provider_kind = serializers.ChoiceField(choices=PayrollProviderConnectionKind.choices, required=False)
    environment_ref = serializers.CharField(max_length=80, required=False)
    status = serializers.ChoiceField(choices=PayrollProviderConnectionStatus.choices, required=False)
    adapter_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    sandbox_adapter_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    channel_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    credential_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    credential_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    credential_required = serializers.BooleanField(required=False)
    callback_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    callback_verification_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    retry_policy_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    certification_profile_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollProviderConnectionCertificationRequestSerializer(serializers.Serializer):
    certification_status = serializers.ChoiceField(choices=PayrollProviderCertificationStatus.choices)
    evidence_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollProviderCertificationRunRequestSerializer(serializers.Serializer):
    scenario_refs = serializers.ListField(child=serializers.CharField(max_length=120), required=False, allow_empty=True)


class HrAdminPayrollProviderConnectionOptionsSerializer(serializers.Serializer):
    provider_kinds = HrAdminEnumOptionSerializer(many=True)
    connection_statuses = HrAdminEnumOptionSerializer(many=True)
    certification_statuses = HrAdminEnumOptionSerializer(many=True)
    certification_run_statuses = HrAdminEnumOptionSerializer(many=True)
    schema_mapping_pack_statuses = HrAdminEnumOptionSerializer(many=True)
    launch_rehearsal_statuses = HrAdminEnumOptionSerializer(many=True)


class HrAdminPayrollProviderConnectionSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    connections = HrAdminPayrollProviderConnectionSerializer(many=True)
    certification_runs = HrAdminPayrollProviderCertificationRunSerializer(many=True)
    schema_mapping_packs = HrAdminPayrollProviderSchemaMappingPackSerializer(many=True)
    schema_mapping_simulations = HrAdminPayrollProviderSchemaMappingSimulationSerializer(many=True)
    launch_rehearsals = HrAdminPayrollProviderLaunchRehearsalSerializer(many=True)
    adapter_registry = serializers.JSONField()
    client_registry = serializers.JSONField()
    package_registry = serializers.JSONField()
    storage_policy_registry = serializers.JSONField()
    launch_rehearsal = serializers.JSONField()
    options = HrAdminPayrollProviderConnectionOptionsSerializer()


class HrAdminPayrollProviderConnectionActionResultSerializer(serializers.Serializer):
    connection = HrAdminPayrollProviderConnectionSerializer()
    detail = serializers.CharField()


class HrAdminPayrollProviderCertificationRunActionResultSerializer(serializers.Serializer):
    connection = HrAdminPayrollProviderConnectionSerializer()
    certification_run = HrAdminPayrollProviderCertificationRunSerializer()
    detail = serializers.CharField()


class HrAdminPayrollProviderLaunchRehearsalActionResultSerializer(serializers.Serializer):
    launch_rehearsal_run = HrAdminPayrollProviderLaunchRehearsalSerializer()
    setup = HrAdminPayrollProviderConnectionSetupSerializer()
    detail = serializers.CharField()


class HrAdminPayrollGenerateFinanceHandoffRequestSerializer(serializers.Serializer):
    handoff_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollGenerateProviderAuditPackRequestSerializer(serializers.Serializer):
    audit_pack_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollFinanceHandoffActionResultSerializer(serializers.Serializer):
    handoff = HrAdminPayrollFinanceHandoffSerializer()
    artifacts = HrAdminPayrollOutputArtifactSerializer(many=True)
    deliveries = HrAdminPayrollProviderDeliverySerializer(many=True)
    callback_events = HrAdminPayrollProviderCallbackEventSerializer(many=True, required=False)
    retry_events = HrAdminPayrollProviderRetryEventSerializer(many=True, required=False)
    provider_jobs = HrAdminPayrollProviderJobSerializer(many=True, required=False)
    detail = serializers.CharField()


class HrAdminPayrollFinanceHandoffOptionsSerializer(serializers.Serializer):
    handoff_statuses = HrAdminEnumOptionSerializer(many=True)
    output_artifact_kinds = HrAdminEnumOptionSerializer(many=True)
    output_artifact_statuses = HrAdminEnumOptionSerializer(many=True)
    provider_delivery_statuses = HrAdminEnumOptionSerializer(many=True)
    provider_callback_event_statuses = HrAdminEnumOptionSerializer(many=True)
    provider_retry_event_statuses = HrAdminEnumOptionSerializer(many=True)
    provider_job_kinds = HrAdminEnumOptionSerializer(many=True)
    provider_job_statuses = HrAdminEnumOptionSerializer(many=True)


class HrAdminPayrollFinanceHandoffSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    output_batches = HrAdminPayrollOutputBatchSerializer(many=True)
    handoffs = HrAdminPayrollFinanceHandoffSerializer(many=True)
    artifacts = HrAdminPayrollOutputArtifactSerializer(many=True)
    deliveries = HrAdminPayrollProviderDeliverySerializer(many=True)
    callback_events = HrAdminPayrollProviderCallbackEventSerializer(many=True)
    retry_events = HrAdminPayrollProviderRetryEventSerializer(many=True)
    provider_jobs = HrAdminPayrollProviderJobSerializer(many=True)
    options = HrAdminPayrollFinanceHandoffOptionsSerializer()


class HrAdminPayrollAdjustmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    salary_component_id = serializers.UUIDField(allow_null=True)
    kind = serializers.CharField()
    kind_label = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    direction = serializers.CharField()
    direction_label = serializers.CharField()
    component_code = serializers.CharField()
    component_name = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField()
    effective_date = serializers.DateField()
    source_period_start = serializers.DateField(allow_null=True)
    source_period_end = serializers.DateField(allow_null=True)
    adjustment_profile_ref = serializers.CharField()
    approval_profile_ref = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    reason = serializers.CharField(allow_blank=True)
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by_name = serializers.CharField(allow_null=True)
    approved_at = serializers.DateTimeField(allow_null=True)
    approved_by_name = serializers.CharField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    rejected_by_name = serializers.CharField(allow_null=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    applied_by_name = serializers.CharField(allow_null=True)
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollAdjustmentWriteSerializer(serializers.Serializer):
    payroll_run_id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    input_snapshot_id = serializers.UUIDField(required=False, allow_null=True)
    salary_component_id = serializers.UUIDField(required=False, allow_null=True)
    kind = serializers.ChoiceField(choices=PayrollAdjustmentKind.choices)
    direction = serializers.ChoiceField(choices=PayrollAdjustmentDirection.choices)
    component_code = serializers.CharField(max_length=120)
    component_name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField(max_length=3, required=False, allow_blank=True)
    effective_date = serializers.DateField()
    source_period_start = serializers.DateField(required=False, allow_null=True)
    source_period_end = serializers.DateField(required=False, allow_null=True)
    adjustment_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    approval_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollAdjustmentDecisionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
    approval_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollAdjustmentSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    runs = HrAdminPayrollRunSerializer(many=True)
    snapshots = HrAdminPayrollInputSnapshotSerializer(many=True)
    adjustments = HrAdminPayrollAdjustmentSerializer(many=True)
    options = serializers.JSONField()


class HrAdminPayrollSettlementLineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    settlement_id = serializers.UUIDField()
    salary_component_id = serializers.UUIDField(allow_null=True)
    line_kind = serializers.CharField()
    line_kind_label = serializers.CharField()
    direction = serializers.CharField()
    direction_label = serializers.CharField()
    component_code = serializers.CharField()
    component_name = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField()
    calculation_order = serializers.IntegerField()
    source_ref = serializers.CharField(allow_blank=True)
    source_hash = serializers.CharField(allow_blank=True)
    trace_snapshot = serializers.JSONField()
    config_snapshot = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollSettlementSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    exit_record_id = serializers.UUIDField(allow_null=True)
    input_snapshot_id = serializers.UUIDField(allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()
    settlement_profile_ref = serializers.CharField()
    approval_profile_ref = serializers.CharField(allow_blank=True)
    calculation_profile_ref = serializers.CharField(allow_blank=True)
    source_ref = serializers.CharField(allow_blank=True)
    reason = serializers.CharField(allow_blank=True)
    settlement_date = serializers.DateField()
    last_working_date = serializers.DateField(allow_null=True)
    currency_code = serializers.CharField()
    totals_snapshot = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    config_snapshot = serializers.JSONField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by_name = serializers.CharField(allow_null=True)
    approved_at = serializers.DateTimeField(allow_null=True)
    approved_by_name = serializers.CharField(allow_null=True)
    rejected_at = serializers.DateTimeField(allow_null=True)
    rejected_by_name = serializers.CharField(allow_null=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    applied_by_name = serializers.CharField(allow_null=True)
    line_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminPayrollSettlementWriteSerializer(serializers.Serializer):
    payroll_run_id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    exit_record_id = serializers.UUIDField(required=False, allow_null=True)
    input_snapshot_id = serializers.UUIDField(required=False, allow_null=True)
    settlement_date = serializers.DateField()
    last_working_date = serializers.DateField(required=False, allow_null=True)
    currency_code = serializers.CharField(max_length=3, required=False, allow_blank=True)
    settlement_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    approval_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    calculation_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    config_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollSettlementLineWriteSerializer(serializers.Serializer):
    salary_component_id = serializers.UUIDField(required=False, allow_null=True)
    line_kind = serializers.ChoiceField(choices=PayrollSettlementLineKind.choices)
    direction = serializers.ChoiceField(choices=PayrollAdjustmentDirection.choices)
    component_code = serializers.CharField(max_length=120)
    component_name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency_code = serializers.CharField(max_length=3, required=False, allow_blank=True)
    calculation_order = serializers.IntegerField(required=False, min_value=1)
    source_ref = serializers.CharField(max_length=180, required=False, allow_blank=True)
    trace_snapshot = serializers.JSONField(required=False)
    config_snapshot = serializers.JSONField(required=False)


class HrAdminPayrollSettlementDecisionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
    approval_profile_ref = serializers.CharField(max_length=160, required=False, allow_blank=True)


class HrAdminPayrollSettlementSetupSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    runs = HrAdminPayrollRunSerializer(many=True)
    snapshots = HrAdminPayrollInputSnapshotSerializer(many=True)
    settlements = HrAdminPayrollSettlementSerializer(many=True)
    lines = HrAdminPayrollSettlementLineSerializer(many=True)
    options = serializers.JSONField()


class HrAdminLeaveTypeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    short_code = serializers.CharField(allow_blank=True)
    category = serializers.CharField()
    unit = serializers.CharField()
    color_code = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    is_active = serializers.BooleanField()
    requires_attachment = serializers.BooleanField()
    allow_negative_balance = serializers.BooleanField()
    is_approval_required = serializers.BooleanField()
    source_kind = serializers.CharField(required=False, allow_blank=True)
    source_pack_code = serializers.CharField(required=False, allow_blank=True)
    source_item_key = serializers.CharField(required=False, allow_blank=True)
    source_version = serializers.IntegerField(required=False)
    delegation_mode = serializers.CharField(required=False, allow_blank=True)
    managed_by_platform = serializers.BooleanField(required=False)
    platform_locked_fields = serializers.ListField(child=serializers.CharField(), required=False)
    governance_state = serializers.CharField(required=False)
    governance_label = serializers.CharField(required=False)
    edit_mode = serializers.CharField(required=False)
    can_edit_directly = serializers.BooleanField(required=False)
    can_detach_from_platform = serializers.BooleanField(required=False)
    requires_platform_change = serializers.BooleanField(required=False)
    is_detached_clone = serializers.BooleanField(required=False)
    locked_field_count = serializers.IntegerField(required=False)
    lineage_summary = serializers.CharField(required=False)


class HrAdminLeaveTypeWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=False)
    name = serializers.CharField(max_length=255, required=False)
    short_code = serializers.CharField(max_length=20, allow_blank=True, required=False)
    category = serializers.ChoiceField(choices=LeaveCategory.values, required=False, default=LeaveCategory.PAID)
    unit = serializers.ChoiceField(choices=LeaveUnit.values, required=False, default=LeaveUnit.DAY)
    color_code = serializers.CharField(max_length=20, allow_blank=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)
    is_active = serializers.BooleanField(required=False, default=True)
    requires_attachment = serializers.BooleanField(required=False, default=False)
    allow_negative_balance = serializers.BooleanField(required=False, default=False)
    is_approval_required = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("code"):
                raise serializers.ValidationError({"code": "This field is required."})
            if not attrs.get("name"):
                raise serializers.ValidationError({"name": "This field is required."})
        return attrs


class HrAdminAttendancePolicySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    attendance_unit = serializers.CharField()
    default_shift_id = serializers.UUIDField(allow_null=True)
    default_shift = serializers.CharField(allow_null=True)
    holiday_calendar_id = serializers.UUIDField(allow_null=True)
    holiday_calendar = serializers.CharField(allow_null=True)
    full_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    half_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    late_mark_after_minutes = serializers.IntegerField()
    max_late_marks_in_period = serializers.IntegerField()
    overtime_threshold_minutes = serializers.IntegerField()
    allow_manual_entry = serializers.BooleanField()
    allow_web_checkin = serializers.BooleanField()
    allow_mobile_checkin = serializers.BooleanField()
    allow_geofenced_checkin = serializers.BooleanField()
    allow_regularization = serializers.BooleanField()
    require_regularization_reason = serializers.BooleanField()
    config_snapshot = serializers.JSONField()
    source_kind = serializers.CharField(required=False, allow_blank=True)
    source_pack_code = serializers.CharField(required=False, allow_blank=True)
    source_item_key = serializers.CharField(required=False, allow_blank=True)
    source_version = serializers.IntegerField(required=False)
    delegation_mode = serializers.CharField(required=False, allow_blank=True)
    managed_by_platform = serializers.BooleanField(required=False)
    platform_locked_fields = serializers.ListField(child=serializers.CharField(), required=False)
    governance_state = serializers.CharField(required=False)
    governance_label = serializers.CharField(required=False)
    edit_mode = serializers.CharField(required=False)
    can_edit_directly = serializers.BooleanField(required=False)
    can_detach_from_platform = serializers.BooleanField(required=False)
    requires_platform_change = serializers.BooleanField(required=False)
    is_detached_clone = serializers.BooleanField(required=False)
    locked_field_count = serializers.IntegerField(required=False)
    lineage_summary = serializers.CharField(required=False)


class HrAdminAttendancePolicyDerivationConfigSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False, default=False)
    auto_mark_holiday = serializers.BooleanField(required=False, default=True)
    auto_mark_weekly_off = serializers.BooleanField(required=False, default=True)
    missing_punch_status = serializers.ChoiceField(
        choices=["unknown", "absent"],
        required=False,
        default="unknown",
    )
    late_status_mode = serializers.ChoiceField(
        choices=["present", "late"],
        required=False,
        default="present",
    )
    derive_overtime = serializers.BooleanField(required=False, default=True)


class HrAdminAttendancePolicyAdvancedConfigSerializer(serializers.Serializer):
    derivation = HrAdminAttendancePolicyDerivationConfigSerializer(required=False)


class HrAdminAttendancePolicyPreviewRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    attendance_date = serializers.DateField()
    requested_status = serializers.ChoiceField(
        choices=["present", "absent", "half_day", "late", "weekly_off", "holiday", "remote", "unknown"],
        required=False,
        allow_null=True,
    )
    requested_check_in_at = serializers.DateTimeField(required=False, allow_null=True)
    requested_check_out_at = serializers.DateTimeField(required=False, allow_null=True)
    shift_id = serializers.UUIDField(required=False, allow_null=True)
    policy_id = serializers.UUIDField(required=False, allow_null=True)
    default_shift_id = serializers.UUIDField(required=False, allow_null=True)
    holiday_calendar_id = serializers.UUIDField(required=False, allow_null=True)
    full_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    half_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    late_mark_after_minutes = serializers.IntegerField(required=False, allow_null=True)
    overtime_threshold_minutes = serializers.IntegerField(required=False, allow_null=True)
    config_snapshot = HrAdminAttendancePolicyAdvancedConfigSerializer(required=False, default=dict)


class HrAdminAttendancePolicyPreviewSerializer(serializers.Serializer):
    current_resolved_policy_id = serializers.CharField(allow_null=True, required=False)
    current_resolved_policy_name = serializers.CharField(allow_null=True, required=False)
    current_assignment_id = serializers.CharField(allow_null=True, required=False)
    current_assignment_priority = serializers.IntegerField(allow_null=True, required=False)
    current_assignment_scope = serializers.ListField(child=serializers.CharField(), required=False)
    draft_policy_matches_current_resolution = serializers.BooleanField(required=False)
    resolved_config = serializers.JSONField()
    derived_status = serializers.CharField()
    resolved_shift_id = serializers.CharField(allow_null=True, required=False)
    resolved_shift_name = serializers.CharField(allow_null=True, required=False)
    matched_holiday_id = serializers.CharField(allow_null=True, required=False)
    matched_holiday_name = serializers.CharField(allow_null=True, required=False)
    matched_holiday_type = serializers.CharField(allow_null=True, required=False)
    work_duration_hours = serializers.CharField()
    overtime_hours = serializers.CharField()
    late_minutes = serializers.IntegerField()
    early_exit_minutes = serializers.IntegerField()


class HrAdminAttendancePolicyWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    status = serializers.ChoiceField(choices=AttendancePolicyStatus.values, required=False, default=AttendancePolicyStatus.DRAFT)
    attendance_unit = serializers.ChoiceField(choices=AttendanceUnit.values, required=False, default=AttendanceUnit.DAY)
    default_shift_id = serializers.UUIDField(allow_null=True, required=False)
    holiday_calendar_id = serializers.UUIDField(allow_null=True, required=False)
    full_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    half_day_min_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    late_mark_after_minutes = serializers.IntegerField(required=False, default=0)
    max_late_marks_in_period = serializers.IntegerField(required=False, default=0)
    overtime_threshold_minutes = serializers.IntegerField(required=False, default=0)
    allow_manual_entry = serializers.BooleanField(required=False, default=True)
    allow_web_checkin = serializers.BooleanField(required=False, default=True)
    allow_mobile_checkin = serializers.BooleanField(required=False, default=True)
    allow_geofenced_checkin = serializers.BooleanField(required=False, default=False)
    allow_regularization = serializers.BooleanField(required=False, default=True)
    require_regularization_reason = serializers.BooleanField(required=False, default=True)
    config_snapshot = HrAdminAttendancePolicyAdvancedConfigSerializer(required=False)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("code"):
                raise serializers.ValidationError({"code": "This field is required."})
            if not attrs.get("name"):
                raise serializers.ValidationError({"name": "This field is required."})
        return attrs


class HrAdminLeavePolicySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    leave_type_id = serializers.UUIDField()
    leave_type = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    effective_from = serializers.DateField(allow_null=True)
    effective_to = serializers.DateField(allow_null=True)
    accrual_frequency = serializers.CharField()
    annual_entitlement = serializers.DecimalField(max_digits=8, decimal_places=2)
    max_carry_forward = serializers.DecimalField(max_digits=8, decimal_places=2)
    max_consecutive_days = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    min_days_per_request = serializers.DecimalField(max_digits=8, decimal_places=2)
    notice_days_required = serializers.IntegerField()
    allow_half_day = serializers.BooleanField()
    allow_backdated_application = serializers.BooleanField()
    allow_weekend_holiday_overlap = serializers.BooleanField()
    sandwich_rule_enabled = serializers.BooleanField()
    is_probation_eligible = serializers.BooleanField()
    gender_restriction = serializers.CharField(allow_blank=True)
    marital_status_restriction = serializers.CharField(allow_blank=True)
    minimum_service_days = serializers.IntegerField()
    config_snapshot = serializers.JSONField()
    source_kind = serializers.CharField(required=False, allow_blank=True)
    source_pack_code = serializers.CharField(required=False, allow_blank=True)
    source_item_key = serializers.CharField(required=False, allow_blank=True)
    source_version = serializers.IntegerField(required=False)
    delegation_mode = serializers.CharField(required=False, allow_blank=True)
    managed_by_platform = serializers.BooleanField(required=False)
    platform_locked_fields = serializers.ListField(child=serializers.CharField(), required=False)
    governance_state = serializers.CharField(required=False)
    governance_label = serializers.CharField(required=False)
    edit_mode = serializers.CharField(required=False)
    can_edit_directly = serializers.BooleanField(required=False)
    can_detach_from_platform = serializers.BooleanField(required=False)
    requires_platform_change = serializers.BooleanField(required=False)
    is_detached_clone = serializers.BooleanField(required=False)
    locked_field_count = serializers.IntegerField(required=False)
    lineage_summary = serializers.CharField(required=False)


class HrAdminLeaveApprovalConfigSerializer(serializers.Serializer):
    default_route = serializers.ChoiceField(
        choices=[
            "manager_only",
            "manager_then_second_level",
            "manager_then_hr",
            "manager_second_level_hr",
        ]
    )
    escalation_route = serializers.ChoiceField(
        choices=[
            "manager_only",
            "manager_then_second_level",
            "manager_then_hr",
            "manager_second_level_hr",
        ],
        allow_null=True,
        required=False,
    )
    escalate_when_units_gte = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    second_level_owner_employee_id = serializers.UUIDField(allow_null=True, required=False)
    hr_owner_employee_id = serializers.UUIDField(allow_null=True, required=False)


class HrAdminLeaveEvidenceConfigSerializer(serializers.Serializer):
    attachment_required = serializers.BooleanField(required=False, default=False)
    attachment_label = serializers.CharField(required=False, allow_blank=True, default="supporting document")
    required_when_units_gte = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    medical_certificate_when_units_gte = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    approval_route_when_evidence_required = serializers.ChoiceField(
        choices=[
            "manager_only",
            "manager_then_second_level",
            "manager_then_hr",
            "manager_second_level_hr",
        ],
        allow_null=True,
        required=False,
    )


class HrAdminLeaveEntitlementConfigSerializer(serializers.Serializer):
    grant_mode = serializers.ChoiceField(choices=["upfront", "scheduled"], required=False)
    proration_mode = serializers.ChoiceField(choices=["none", "by_join_month"], required=False)
    policy_year_start_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    policy_year_start_day = serializers.IntegerField(min_value=1, max_value=28, required=False)
    carry_forward_mode = serializers.ChoiceField(choices=["none", "limited"], required=False)
    carry_forward_cap = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    encashment_allowed = serializers.BooleanField(required=False)
    encashment_cap = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    probation_accrual_mode = serializers.ChoiceField(choices=["accrue", "defer"], required=False)


class HrAdminLeaveOperationGovernanceConfigSerializer(serializers.Serializer):
    reviewer_employee_id = serializers.UUIDField(allow_null=True, required=False)
    approval_required_for_encashment = serializers.BooleanField(required=False, default=False)
    approval_required_for_debit_adjustment = serializers.BooleanField(required=False, default=False)
    credit_adjustment_requires_approval_over_units = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    debit_adjustment_requires_approval_over_units = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    encashment_requires_approval_over_units = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        allow_null=True,
        required=False,
    )


class HrAdminLeaveLifecycleConfigSerializer(serializers.Serializer):
    allow_employee_withdraw_pending = serializers.BooleanField(required=False, default=True)
    withdraw_notice_hours_before_start = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    withdraw_requires_attachment = serializers.BooleanField(required=False, default=False)
    withdraw_attachment_label = serializers.CharField(required=False, allow_blank=True, default="withdrawal evidence")
    allow_employee_cancel_approved = serializers.BooleanField(required=False, default=False)
    cancel_approved_requires_reapproval = serializers.BooleanField(required=False, default=False)
    cancel_approval_route = serializers.ChoiceField(
        choices=[
            "manager_only",
            "manager_then_second_level",
            "manager_then_hr",
            "manager_second_level_hr",
        ],
        allow_null=True,
        required=False,
    )
    cancel_notice_hours_before_start = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    cancel_requires_attachment = serializers.BooleanField(required=False, default=False)
    cancel_attachment_label = serializers.CharField(required=False, allow_blank=True, default="cancellation evidence")


class HrAdminLeaveHolidayGovernanceConfigSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False, default=False)
    allowed_holiday_types = serializers.ListField(
        child=serializers.ChoiceField(choices=HolidayType.values),
        required=False,
        allow_empty=True,
    )
    require_matching_holiday_dates = serializers.BooleanField(required=False, default=True)
    max_paid_units_per_period = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    count_pending_requests_towards_cap = serializers.BooleanField(required=False, default=True)
    paid_cap_exhaustion_action = serializers.ChoiceField(choices=["block"], required=False, default="block")


class HrAdminLeavePolicyAdvancedConfigSerializer(serializers.Serializer):
    version = serializers.IntegerField(required=False, default=1)
    approval = HrAdminLeaveApprovalConfigSerializer(required=False)
    evidence = HrAdminLeaveEvidenceConfigSerializer(required=False)
    entitlement = HrAdminLeaveEntitlementConfigSerializer(required=False)
    operations = HrAdminLeaveOperationGovernanceConfigSerializer(required=False)
    lifecycle = HrAdminLeaveLifecycleConfigSerializer(required=False)
    holiday_governance = HrAdminLeaveHolidayGovernanceConfigSerializer(required=False)


class HrAdminLeavePolicyPreviewRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    leave_type_id = serializers.UUIDField()
    requested_units = serializers.DecimalField(max_digits=8, decimal_places=2)
    policy_id = serializers.UUIDField(required=False, allow_null=True)
    config_snapshot = HrAdminLeavePolicyAdvancedConfigSerializer(required=False, default=dict)


class HrAdminLeavePolicyPreviewStepSerializer(serializers.Serializer):
    step_order = serializers.IntegerField()
    name = serializers.CharField()
    actor_type = serializers.CharField()
    actor_identifier = serializers.CharField(allow_blank=True)
    actor_name = serializers.CharField(allow_blank=True)


class HrAdminLeavePolicyPreviewSerializer(serializers.Serializer):
    approval_route = serializers.CharField()
    required_attachment_label = serializers.CharField(allow_null=True, required=False)
    required_attachment_reason = serializers.CharField(allow_null=True, required=False)
    current_resolved_policy_id = serializers.CharField(allow_null=True, required=False)
    current_resolved_policy_name = serializers.CharField(allow_null=True, required=False)
    current_assignment_id = serializers.CharField(allow_null=True, required=False)
    current_assignment_priority = serializers.IntegerField(allow_null=True, required=False)
    current_assignment_scope = serializers.ListField(child=serializers.CharField(), required=False)
    draft_policy_matches_current_resolution = serializers.BooleanField(required=False)
    steps = HrAdminLeavePolicyPreviewStepSerializer(many=True)
    resolved_config = serializers.JSONField()
    entitlement_preview = serializers.JSONField(required=False)


class HrAdminLeavePolicyWriteSerializer(serializers.Serializer):
    leave_type_id = serializers.UUIDField(required=False)
    code = serializers.CharField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    status = serializers.ChoiceField(choices=LeavePolicyStatus.values, required=False, default=LeavePolicyStatus.DRAFT)
    effective_from = serializers.DateField(allow_null=True, required=False)
    effective_to = serializers.DateField(allow_null=True, required=False)
    accrual_frequency = serializers.ChoiceField(choices=AccrualFrequency.values, required=False, default=AccrualFrequency.NONE)
    annual_entitlement = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    max_carry_forward = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    max_consecutive_days = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    min_days_per_request = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0.5)
    notice_days_required = serializers.IntegerField(required=False, default=0)
    allow_half_day = serializers.BooleanField(required=False, default=False)
    allow_backdated_application = serializers.BooleanField(required=False, default=False)
    allow_weekend_holiday_overlap = serializers.BooleanField(required=False, default=False)
    sandwich_rule_enabled = serializers.BooleanField(required=False, default=False)
    is_probation_eligible = serializers.BooleanField(required=False, default=True)
    gender_restriction = serializers.CharField(max_length=30, allow_blank=True, required=False)
    marital_status_restriction = serializers.CharField(max_length=30, allow_blank=True, required=False)
    minimum_service_days = serializers.IntegerField(required=False, default=0)
    config_snapshot = HrAdminLeavePolicyAdvancedConfigSerializer(required=False, default=dict)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("leave_type_id"):
                raise serializers.ValidationError({"leave_type_id": "This field is required."})
            if not attrs.get("code"):
                raise serializers.ValidationError({"code": "This field is required."})
            if not attrs.get("name"):
                raise serializers.ValidationError({"name": "This field is required."})
        return attrs


class HrAdminScopedAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    policy_id = serializers.UUIDField()
    policy_name = serializers.CharField()
    leave_type_id = serializers.UUIDField(required=False, allow_null=True)
    leave_type_name = serializers.CharField(required=False, allow_null=True)
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    location = serializers.CharField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    grade_id = serializers.UUIDField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    employment_type_id = serializers.UUIDField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    employee_id = serializers.UUIDField(allow_null=True)
    employee = serializers.CharField(allow_null=True)
    priority = serializers.IntegerField()
    is_active = serializers.BooleanField()
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True, required=False)
    conflict_count = serializers.IntegerField(required=False)
    has_blocking_conflict = serializers.BooleanField(required=False)
    conflict_summary = serializers.CharField(required=False)


class HrAdminLeavePolicyAssignmentWriteSerializer(serializers.Serializer):
    leave_policy_id = serializers.UUIDField(required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    employee_id = serializers.UUIDField(allow_null=True, required=False)
    priority = serializers.IntegerField(required=False, default=100)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("leave_policy_id"):
            raise serializers.ValidationError({"leave_policy_id": "This field is required."})
        return attrs


class HrAdminLeavePolicyAssignmentConflictRequestSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(required=False, allow_null=True)
    leave_policy_id = serializers.UUIDField(required=True)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    employee_id = serializers.UUIDField(allow_null=True, required=False)
    priority = serializers.IntegerField(required=False, default=100)
    is_active = serializers.BooleanField(required=False, default=True)


class HrAdminLeavePolicyAssignmentConflictItemSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    policy_id = serializers.UUIDField()
    policy_name = serializers.CharField()
    leave_type_id = serializers.UUIDField()
    leave_type_name = serializers.CharField()
    priority = serializers.IntegerField()
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    overlap_kind = serializers.CharField()
    priority_effect = serializers.CharField()
    is_exact_scope = serializers.BooleanField()
    is_same_priority = serializers.BooleanField()
    is_same_granularity = serializers.BooleanField(required=False)


class HrAdminLeavePolicyAssignmentConflictSerializer(serializers.Serializer):
    has_conflicts = serializers.BooleanField()
    has_blocking_conflict = serializers.BooleanField()
    summary = serializers.CharField()
    candidate_scope = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    conflicts = HrAdminLeavePolicyAssignmentConflictItemSerializer(many=True)


class HrAdminLeavePolicyAssignmentResolutionRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=True)
    leave_type_id = serializers.UUIDField(required=True)


class HrAdminLeavePolicyAssignmentResolutionSerializer(serializers.Serializer):
    has_resolution = serializers.BooleanField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    leave_type_id = serializers.UUIDField()
    leave_type_name = serializers.CharField()
    policy_id = serializers.UUIDField(allow_null=True)
    policy_name = serializers.CharField(allow_null=True)
    assignment_id = serializers.UUIDField(allow_null=True)
    priority = serializers.IntegerField(allow_null=True)
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    summary = serializers.CharField()


class HrAdminAttendancePolicyAssignmentWriteSerializer(serializers.Serializer):
    attendance_policy_id = serializers.UUIDField(required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    employee_id = serializers.UUIDField(allow_null=True, required=False)
    priority = serializers.IntegerField(required=False, default=100)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("attendance_policy_id"):
            raise serializers.ValidationError({"attendance_policy_id": "This field is required."})
        return attrs


class HrAdminAttendancePolicyAssignmentConflictRequestSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(required=False, allow_null=True)
    attendance_policy_id = serializers.UUIDField(required=True)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    employee_id = serializers.UUIDField(allow_null=True, required=False)
    priority = serializers.IntegerField(required=False, default=100)
    is_active = serializers.BooleanField(required=False, default=True)


class HrAdminAttendancePolicyAssignmentConflictItemSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    policy_id = serializers.UUIDField()
    policy_name = serializers.CharField()
    priority = serializers.IntegerField()
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    overlap_kind = serializers.CharField()
    priority_effect = serializers.CharField()
    is_exact_scope = serializers.BooleanField()
    is_same_priority = serializers.BooleanField()
    is_same_granularity = serializers.BooleanField(required=False)


class HrAdminAttendancePolicyAssignmentConflictSerializer(serializers.Serializer):
    has_conflicts = serializers.BooleanField()
    has_blocking_conflict = serializers.BooleanField()
    summary = serializers.CharField()
    candidate_scope = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    conflicts = HrAdminAttendancePolicyAssignmentConflictItemSerializer(many=True)


class HrAdminAttendancePolicyAssignmentResolutionRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=True)


class HrAdminAttendancePolicyAssignmentResolutionSerializer(serializers.Serializer):
    has_resolution = serializers.BooleanField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    policy_id = serializers.UUIDField(allow_null=True)
    policy_name = serializers.CharField(allow_null=True)
    assignment_id = serializers.UUIDField(allow_null=True)
    priority = serializers.IntegerField(allow_null=True)
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    summary = serializers.CharField()


class HrAdminEmployeeShiftAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee = serializers.CharField()
    employee_code = serializers.CharField()
    shift_id = serializers.UUIDField()
    shift = serializers.CharField()
    assignment_kind = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    is_primary = serializers.BooleanField()
    config_snapshot = serializers.JSONField(required=False)
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True, required=False)
    conflict_count = serializers.IntegerField(required=False)
    has_blocking_conflict = serializers.BooleanField(required=False)
    conflict_summary = serializers.CharField(required=False)


class HrAdminEmployeeShiftAssignmentWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    shift_id = serializers.UUIDField(required=False)
    assignment_kind = serializers.ChoiceField(
        choices=["fixed", "weekly_rotation", "temporary_override"],
        required=False,
        default="fixed",
    )
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(required=False, default=True)
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            for field_name in ["employee_id", "shift_id", "effective_from"]:
                if not attrs.get(field_name):
                    raise serializers.ValidationError({field_name: "This field is required."})
        effective_from = attrs.get("effective_from")
        effective_to = attrs.get("effective_to")
        if effective_from and effective_to and effective_to < effective_from:
            raise serializers.ValidationError({"effective_to": "Effective to must be on or after effective from."})
        return attrs


class HrAdminEmployeeShiftAssignmentConflictRequestSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(required=False, allow_null=True)
    employee_id = serializers.UUIDField(required=True)
    shift_id = serializers.UUIDField(required=True)
    assignment_kind = serializers.ChoiceField(
        choices=["fixed", "weekly_rotation", "temporary_override"],
        required=False,
        default="fixed",
    )
    effective_from = serializers.DateField(required=True)
    effective_to = serializers.DateField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(required=False, default=True)


class HrAdminEmployeeShiftAssignmentConflictItemSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField()
    shift_id = serializers.UUIDField()
    shift_name = serializers.CharField()
    assignment_kind = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    is_primary = serializers.BooleanField()
    overlap_kind = serializers.CharField()
    is_exact_window = serializers.BooleanField()
    is_primary_conflict = serializers.BooleanField()


class HrAdminEmployeeShiftAssignmentConflictSerializer(serializers.Serializer):
    has_conflicts = serializers.BooleanField()
    has_blocking_conflict = serializers.BooleanField()
    summary = serializers.CharField()
    candidate_scope = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    conflicts = HrAdminEmployeeShiftAssignmentConflictItemSerializer(many=True)


class HrAdminEmployeeShiftAssignmentResolutionRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=True)
    attendance_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        attendance_date = attrs.get("attendance_date")
        end_date = attrs.get("end_date")
        if attendance_date and end_date and end_date < attendance_date:
            raise serializers.ValidationError({"end_date": "End date must be on or after attendance date."})
        return attrs


class HrAdminEmployeeShiftAssignmentResolutionSequenceItemSerializer(serializers.Serializer):
    attendance_date = serializers.DateField()
    assignment_id = serializers.UUIDField(allow_null=True)
    assignment_kind = serializers.CharField(allow_null=True)
    shift_id = serializers.UUIDField(allow_null=True)
    shift_name = serializers.CharField(allow_null=True)
    sequence_summary = serializers.CharField()


class HrAdminEmployeeShiftAssignmentResolutionSerializer(serializers.Serializer):
    has_resolution = serializers.BooleanField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    attendance_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True, required=False)
    shift_id = serializers.UUIDField(allow_null=True)
    shift_name = serializers.CharField(allow_null=True)
    assignment_id = serializers.UUIDField(allow_null=True)
    assignment_kind = serializers.CharField(allow_null=True)
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    sequence_summary = serializers.CharField(allow_null=True, required=False)
    config_snapshot = serializers.JSONField(required=False)
    sequence = HrAdminEmployeeShiftAssignmentResolutionSequenceItemSerializer(many=True, required=False)
    summary = serializers.CharField()


class HrAdminShiftRosterTemplateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    shift_id = serializers.UUIDField()
    shift = serializers.CharField()
    assignment_kind = serializers.CharField()
    config_snapshot = serializers.JSONField(required=False)


class HrAdminShiftRosterTemplateWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60, required=False)
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=["draft", "published", "locked"], required=False, default="draft")
    shift_id = serializers.UUIDField(required=False)
    assignment_kind = serializers.ChoiceField(choices=["fixed", "weekly_rotation", "temporary_override"], required=False, default="fixed")
    config_snapshot = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not self.partial:
            for field_name in ["code", "name", "shift_id"]:
                if not attrs.get(field_name):
                    raise serializers.ValidationError({field_name: "This field is required."})
        return attrs


class HrAdminShiftRosterTemplateRolloutRequestSerializer(serializers.Serializer):
    template_id = serializers.UUIDField(required=True)
    employee_ids = serializers.ListField(child=serializers.UUIDField(), required=False, allow_empty=True)
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    branch_id = serializers.UUIDField(required=False, allow_null=True)
    location_id = serializers.UUIDField(required=False, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    effective_from = serializers.DateField(required=True)
    effective_to = serializers.DateField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(required=False, default=True)
    dry_run = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if attrs.get("effective_to") and attrs["effective_to"] < attrs["effective_from"]:
            raise serializers.ValidationError({"effective_to": "Effective to must be on or after effective from."})
        if not attrs.get("employee_ids") and not any(
            attrs.get(field_name) for field_name in ["legal_entity_id", "branch_id", "location_id", "department_id"]
        ):
            raise serializers.ValidationError({"detail": "Choose employees directly or provide a scope for bulk rollout."})
        return attrs


class HrAdminShiftRosterTemplateRolloutItemSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    status = serializers.CharField()
    reason = serializers.CharField()
    assignment_id = serializers.UUIDField(allow_null=True)


class HrAdminShiftRosterTemplateRolloutSerializer(serializers.Serializer):
    rollout_id = serializers.UUIDField(allow_null=True, required=False)
    template_id = serializers.UUIDField()
    template_name = serializers.CharField()
    target_count = serializers.IntegerField()
    created_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    has_blocking_conflicts = serializers.BooleanField()
    summary = serializers.CharField()
    items = HrAdminShiftRosterTemplateRolloutItemSerializer(many=True)


class HrAdminShiftRosterRolloutSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    template_id = serializers.UUIDField()
    template_name = serializers.CharField()
    status = serializers.CharField()
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(allow_null=True)
    is_primary = serializers.BooleanField()
    target_count = serializers.IntegerField()
    created_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    summary = serializers.CharField()
    created_at = serializers.DateTimeField()
    scope_labels = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class HrAdminPolicyOptionsSerializer(serializers.Serializer):
    leave_categories = HrAdminEnumOptionSerializer(many=True)
    leave_units = HrAdminEnumOptionSerializer(many=True)
    accrual_frequencies = HrAdminEnumOptionSerializer(many=True)
    attendance_statuses = HrAdminEnumOptionSerializer(many=True)
    attendance_units = HrAdminEnumOptionSerializer(many=True)
    attendance_policy_statuses = HrAdminEnumOptionSerializer(many=True)
    leave_policy_statuses = HrAdminEnumOptionSerializer(many=True)
    leave_types = HrAdminOptionItemSerializer(many=True)
    leave_policies = HrAdminOptionItemSerializer(many=True)
    attendance_policies = HrAdminOptionItemSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)
    employment_types = HrAdminOptionItemSerializer(many=True)
    employees = HrAdminOptionItemSerializer(many=True)
    shifts = HrAdminOptionItemSerializer(many=True)
    holiday_calendars = HrAdminOptionItemSerializer(many=True)


class HrAdminShiftSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    working_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    break_minutes = serializers.IntegerField()
    grace_in_minutes = serializers.IntegerField()
    grace_out_minutes = serializers.IntegerField()
    is_night_shift = serializers.BooleanField()
    is_flexible = serializers.BooleanField()
    weekly_off_days = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    is_active = serializers.BooleanField()
    source_kind = serializers.CharField(required=False, allow_blank=True)
    source_pack_code = serializers.CharField(required=False, allow_blank=True)
    source_item_key = serializers.CharField(required=False, allow_blank=True)
    source_version = serializers.IntegerField(required=False)
    delegation_mode = serializers.CharField(required=False, allow_blank=True)
    managed_by_platform = serializers.BooleanField(required=False)
    platform_locked_fields = serializers.ListField(child=serializers.CharField(), required=False)
    governance_state = serializers.CharField(required=False)
    governance_label = serializers.CharField(required=False)
    edit_mode = serializers.CharField(required=False)
    can_edit_directly = serializers.BooleanField(required=False)
    can_detach_from_platform = serializers.BooleanField(required=False)
    requires_platform_change = serializers.BooleanField(required=False)
    is_detached_clone = serializers.BooleanField(required=False)
    locked_field_count = serializers.IntegerField(required=False)
    lineage_summary = serializers.CharField(required=False)


class HrAdminShiftWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=False)
    name = serializers.CharField(max_length=255, required=False)
    start_time = serializers.TimeField(required=False)
    end_time = serializers.TimeField(required=False)
    working_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    break_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    grace_in_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    grace_out_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    is_night_shift = serializers.BooleanField(required=False, default=False)
    is_flexible = serializers.BooleanField(required=False, default=False)
    weekly_off_days = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True, default=list)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("code"):
                raise serializers.ValidationError({"code": "This field is required."})
            if not attrs.get("name"):
                raise serializers.ValidationError({"name": "This field is required."})
            if "start_time" not in attrs:
                raise serializers.ValidationError({"start_time": "This field is required."})
            if "end_time" not in attrs:
                raise serializers.ValidationError({"end_time": "This field is required."})
        return attrs


class HrAdminHolidaySerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    date = serializers.DateField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    holiday_type = serializers.ChoiceField(choices=HolidayType.values)
    is_optional = serializers.BooleanField()


class HrAdminHolidayWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    date = serializers.DateField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    holiday_type = serializers.ChoiceField(choices=HolidayType.values, required=False, default=HolidayType.GENERAL)
    is_optional = serializers.BooleanField(required=False, default=False)


class HrAdminHolidayCalendarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    location_id = serializers.UUIDField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    year = serializers.IntegerField()
    is_active = serializers.BooleanField()
    source_kind = serializers.CharField(required=False, allow_blank=True)
    source_pack_code = serializers.CharField(required=False, allow_blank=True)
    source_item_key = serializers.CharField(required=False, allow_blank=True)
    source_version = serializers.IntegerField(required=False)
    delegation_mode = serializers.CharField(required=False, allow_blank=True)
    managed_by_platform = serializers.BooleanField(required=False)
    platform_locked_fields = serializers.ListField(child=serializers.CharField(), required=False)
    governance_state = serializers.CharField(required=False)
    governance_label = serializers.CharField(required=False)
    edit_mode = serializers.CharField(required=False)
    can_edit_directly = serializers.BooleanField(required=False)
    can_detach_from_platform = serializers.BooleanField(required=False)
    requires_platform_change = serializers.BooleanField(required=False)
    is_detached_clone = serializers.BooleanField(required=False)
    locked_field_count = serializers.IntegerField(required=False)
    lineage_summary = serializers.CharField(required=False)
    holidays = HrAdminHolidaySerializer(many=True)


class HrAdminHolidayCalendarWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=False)
    name = serializers.CharField(max_length=255, required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    location_id = serializers.UUIDField(allow_null=True, required=False)
    year = serializers.IntegerField(required=False, min_value=2000)
    is_active = serializers.BooleanField(required=False, default=True)
    holidays = HrAdminHolidayWriteSerializer(many=True, required=False)

    def validate(self, attrs):
        if not self.partial:
            for field in ["code", "name", "year"]:
                if field not in attrs or attrs.get(field) in [None, ""]:
                    raise serializers.ValidationError({field: "This field is required."})
        return attrs


class HrAdminAttendanceRecordSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    attendance_date = serializers.DateField()
    status = serializers.CharField()
    source = serializers.CharField()
    shift_id = serializers.UUIDField(allow_null=True)
    shift = serializers.CharField(allow_null=True)
    holiday_id = serializers.UUIDField(allow_null=True)
    holiday = serializers.CharField(allow_null=True)
    check_in_at = serializers.DateTimeField(allow_null=True)
    check_out_at = serializers.DateTimeField(allow_null=True)
    work_duration_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    late_minutes = serializers.IntegerField()
    early_exit_minutes = serializers.IntegerField()
    is_regularized = serializers.BooleanField()
    is_locked = serializers.BooleanField()
    notes = serializers.CharField(allow_blank=True)


class HrAdminAttendanceRecordWriteSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AttendanceStatus.choices, required=False)
    source = serializers.ChoiceField(choices=AttendanceSource.choices, required=False)
    shift_id = serializers.UUIDField(required=False, allow_null=True)
    check_in_at = serializers.DateTimeField(required=False, allow_null=True)
    check_out_at = serializers.DateTimeField(required=False, allow_null=True)
    work_duration_hours = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    overtime_hours = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    late_minutes = serializers.IntegerField(required=False, min_value=0)
    early_exit_minutes = serializers.IntegerField(required=False, min_value=0)
    is_regularized = serializers.BooleanField(required=False)
    is_locked = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class HrAdminAttendanceOperationOptionsSerializer(serializers.Serializer):
    attendance_statuses = HrAdminEnumOptionSerializer(many=True)
    attendance_sources = HrAdminEnumOptionSerializer(many=True)
    regularization_statuses = HrAdminEnumOptionSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    employees = HrAdminOptionItemSerializer(many=True)
    shifts = HrAdminOptionItemSerializer(many=True)
    holiday_calendars = HrAdminOptionItemSerializer(many=True)


class HrAdminWorkflowStepSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    step_order = serializers.IntegerField()
    name = serializers.CharField()
    mode = serializers.CharField()
    actor_type = serializers.CharField()
    role_id = serializers.UUIDField(allow_null=True)
    role = serializers.CharField(allow_null=True)
    membership_id = serializers.UUIDField(allow_null=True)
    membership = serializers.CharField(allow_null=True)
    permission_key = serializers.CharField(allow_blank=True)
    scope_type = serializers.CharField(allow_blank=True)
    auto_approve_after_hours = serializers.IntegerField()
    escalate_after_hours = serializers.IntegerField()
    allow_delegate = serializers.BooleanField()
    allow_send_back = serializers.BooleanField()
    allow_comment = serializers.BooleanField()
    rule_snapshot = serializers.JSONField()


class HrAdminWorkflowTemplateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    module = serializers.CharField()
    trigger_key = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    version = serializers.IntegerField()
    is_system_seeded = serializers.BooleanField()
    effective_from = serializers.DateField(allow_null=True)
    effective_to = serializers.DateField(allow_null=True)
    condition_snapshot = serializers.JSONField()
    steps = HrAdminWorkflowStepSerializer(many=True)


class HrAdminWorkflowStepWriteSerializer(serializers.Serializer):
    step_order = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=255)
    mode = serializers.ChoiceField(choices=WorkflowStepMode.values, required=False, default=WorkflowStepMode.SEQUENTIAL)
    actor_type = serializers.ChoiceField(choices=WorkflowActorType.values, required=False, default=WorkflowActorType.ROLE)
    role_id = serializers.UUIDField(allow_null=True, required=False)
    membership_id = serializers.UUIDField(allow_null=True, required=False)
    permission_key = serializers.CharField(max_length=120, required=False, allow_blank=True)
    scope_type = serializers.ChoiceField(choices=ScopeType.values, required=False, allow_blank=True)
    auto_approve_after_hours = serializers.IntegerField(required=False, min_value=0, default=0)
    escalate_after_hours = serializers.IntegerField(required=False, min_value=0, default=0)
    allow_delegate = serializers.BooleanField(required=False, default=True)
    allow_send_back = serializers.BooleanField(required=False, default=True)
    allow_comment = serializers.BooleanField(required=False, default=True)
    rule_snapshot = serializers.JSONField(required=False)


class HrAdminWorkflowTemplateWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60)
    name = serializers.CharField(max_length=255)
    module = serializers.ChoiceField(choices=WorkflowModule.values)
    trigger_key = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=WorkflowStatus.values, required=False, default=WorkflowStatus.DRAFT)
    version = serializers.IntegerField(required=False, min_value=1, default=1)
    is_system_seeded = serializers.BooleanField(required=False, default=False)
    effective_from = serializers.DateField(required=False, allow_null=True)
    effective_to = serializers.DateField(required=False, allow_null=True)
    condition_snapshot = serializers.JSONField(required=False)
    steps = HrAdminWorkflowStepWriteSerializer(many=True, required=False, allow_empty=False)

    def validate(self, attrs):
        if not self.partial and not attrs.get("steps"):
            raise serializers.ValidationError({"steps": "At least one workflow step is required."})
        module = attrs.get("module") if "module" in attrs else getattr(self.instance, "module", "")
        trigger_key = attrs.get("trigger_key") if "trigger_key" in attrs else getattr(self.instance, "trigger_key", "")
        step_payloads = attrs.get("steps")
        if step_payloads:
            for index, step_payload in enumerate(step_payloads, start=1):
                _validate_workflow_step_rule_snapshot(
                    module=module,
                    trigger_key=trigger_key,
                    rule_snapshot=step_payload.get("rule_snapshot"),
                    step_index=index,
                )
        return attrs


class HrAdminWorkflowTemplateAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    template_id = serializers.UUIDField()
    template_name = serializers.CharField()
    module = serializers.CharField()
    trigger_key = serializers.CharField()
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    department_id = serializers.UUIDField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    business_unit_id = serializers.UUIDField(allow_null=True)
    business_unit = serializers.CharField(allow_null=True)
    grade_id = serializers.UUIDField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    priority = serializers.IntegerField()
    is_active = serializers.BooleanField()


class HrAdminWorkflowTemplateAssignmentWriteSerializer(serializers.Serializer):
    template_id = serializers.UUIDField(required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    business_unit_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    priority = serializers.IntegerField(required=False, min_value=0, default=100)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("template_id"):
            raise serializers.ValidationError({"template_id": "This field is required."})
        return attrs


class HrAdminWorkflowTraceAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    actor_type = serializers.CharField()
    actor_identifier = serializers.CharField(allow_blank=True)
    actor_label = serializers.CharField(allow_blank=True)
    role_id = serializers.UUIDField(allow_null=True)
    role = serializers.CharField(allow_null=True)
    membership_id = serializers.UUIDField(allow_null=True)
    membership = serializers.CharField(allow_null=True)
    is_delegated = serializers.BooleanField()
    delegated_from_identifier = serializers.CharField(allow_blank=True)
    responded_at = serializers.DateTimeField(allow_null=True)


class HrAdminWorkflowTraceStepSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    step_order = serializers.IntegerField()
    name = serializers.CharField()
    mode = serializers.CharField()
    status = serializers.CharField()
    started_at = serializers.DateTimeField(allow_null=True)
    due_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    resolved_action = serializers.CharField(allow_blank=True)
    resolution_comment = serializers.CharField(allow_blank=True)
    is_overdue = serializers.BooleanField()
    assignments = HrAdminWorkflowTraceAssignmentSerializer(many=True)


class HrAdminWorkflowTraceEventSerializer(serializers.Serializer):
    id = serializers.CharField()
    occurred_at = serializers.DateTimeField(allow_null=True)
    action = serializers.CharField()
    actor_identifier = serializers.CharField(allow_blank=True)
    title = serializers.CharField()
    detail = serializers.CharField(allow_blank=True)
    from_status = serializers.CharField(allow_blank=True)
    to_status = serializers.CharField(allow_blank=True)
    step_order = serializers.IntegerField(allow_null=True)
    step_name = serializers.CharField(allow_blank=True)


class HrAdminWorkflowTraceSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    module = serializers.CharField()
    trigger_key = serializers.CharField()
    subject_type = serializers.CharField()
    subject_identifier = serializers.CharField()
    subject_label = serializers.CharField()
    employee_id = serializers.UUIDField(allow_null=True)
    employee_code = serializers.CharField(allow_blank=True)
    employee_name = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    current_step_order = serializers.IntegerField()
    current_step_name = serializers.CharField(allow_blank=True)
    current_actor_summary = serializers.CharField(allow_blank=True)
    template_id = serializers.UUIDField(allow_null=True)
    template_name = serializers.CharField(allow_blank=True)
    initiated_by_identifier = serializers.CharField(allow_blank=True)
    submitted_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    total_steps = serializers.IntegerField()
    completed_steps = serializers.IntegerField()
    pending_steps = serializers.IntegerField()
    overdue_steps = serializers.IntegerField()
    assignment_count = serializers.IntegerField()
    timeline_event_count = serializers.IntegerField()
    steps = HrAdminWorkflowTraceStepSerializer(many=True)
    timeline = HrAdminWorkflowTraceEventSerializer(many=True)


class HrAdminWorkflowTraceListSerializer(serializers.Serializer):
    items = HrAdminWorkflowTraceSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    status_counts = serializers.DictField(child=serializers.IntegerField())


class HrAdminWorkflowOptionsSerializer(serializers.Serializer):
    workflow_modules = HrAdminEnumOptionSerializer(many=True)
    workflow_statuses = HrAdminEnumOptionSerializer(many=True)
    workflow_step_modes = HrAdminEnumOptionSerializer(many=True)
    workflow_actor_types = HrAdminEnumOptionSerializer(many=True)
    workflow_scope_types = HrAdminEnumOptionSerializer(many=True)
    roles = HrAdminRoleOptionSerializer(many=True)
    memberships = HrAdminOptionItemSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    business_units = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)
    templates = HrAdminOptionItemSerializer(many=True)
    lifecycle_rule_options = serializers.JSONField()


class HrAdminDocumentCategorySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    category_type = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    is_active = serializers.BooleanField()
    is_system_seeded = serializers.BooleanField()
    requires_expiry_date = serializers.BooleanField()
    requires_verification = serializers.BooleanField()
    allow_employee_upload = serializers.BooleanField()
    allow_multiple_files = serializers.BooleanField()
    visibility_rules = serializers.JSONField()


class HrAdminDocumentCategoryWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60)
    name = serializers.CharField(max_length=255)
    category_type = serializers.ChoiceField(choices=DocumentCategoryType.values, required=False, default=DocumentCategoryType.OTHER)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)
    is_system_seeded = serializers.BooleanField(required=False, default=False)
    requires_expiry_date = serializers.BooleanField(required=False, default=False)
    requires_verification = serializers.BooleanField(required=False, default=True)
    allow_employee_upload = serializers.BooleanField(required=False, default=True)
    allow_multiple_files = serializers.BooleanField(required=False, default=False)
    visibility_rules = serializers.JSONField(required=False)


class HrAdminDocumentRequirementRuleSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    category_id = serializers.UUIDField()
    category_name = serializers.CharField()
    legal_entity_id = serializers.UUIDField(allow_null=True)
    legal_entity = serializers.CharField(allow_null=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch = serializers.CharField(allow_null=True)
    department_id = serializers.UUIDField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    grade_id = serializers.UUIDField(allow_null=True)
    grade = serializers.CharField(allow_null=True)
    employment_type_id = serializers.UUIDField(allow_null=True)
    employment_type = serializers.CharField(allow_null=True)
    is_mandatory = serializers.BooleanField()
    required_within_days_of_joining = serializers.IntegerField()
    priority = serializers.IntegerField()
    is_active = serializers.BooleanField()


class HrAdminDocumentRequirementRuleWriteSerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=False)
    legal_entity_id = serializers.UUIDField(allow_null=True, required=False)
    branch_id = serializers.UUIDField(allow_null=True, required=False)
    department_id = serializers.UUIDField(allow_null=True, required=False)
    grade_id = serializers.UUIDField(allow_null=True, required=False)
    employment_type_id = serializers.UUIDField(allow_null=True, required=False)
    is_mandatory = serializers.BooleanField(required=False, default=True)
    required_within_days_of_joining = serializers.IntegerField(required=False, min_value=0, default=0)
    priority = serializers.IntegerField(required=False, min_value=0, default=100)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("category_id"):
            raise serializers.ValidationError({"category_id": "This field is required."})
        return attrs


class HrAdminEmployeeDocumentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    category_id = serializers.UUIDField()
    category_name = serializers.CharField()
    artifact_id = serializers.UUIDField(allow_null=True)
    previous_document_id = serializers.UUIDField(allow_null=True)
    replaced_by_document_id = serializers.UUIDField(allow_null=True)
    version_number = serializers.IntegerField()
    title = serializers.CharField()
    file_name = serializers.CharField()
    file_url = serializers.CharField(allow_blank=True)
    file_path = serializers.CharField(allow_blank=True)
    mime_type = serializers.CharField(allow_blank=True)
    file_size_bytes = serializers.IntegerField()
    status = serializers.CharField()
    verification_status = serializers.CharField()
    document_number = serializers.CharField(allow_blank=True)
    issued_on = serializers.DateField(allow_null=True)
    expires_on = serializers.DateField(allow_null=True)
    expiry_state = serializers.CharField()
    expiry_label = serializers.CharField()
    days_until_expiry = serializers.IntegerField(allow_null=True)
    is_expired = serializers.BooleanField()
    is_expiring_soon = serializers.BooleanField()
    uploaded_by_identifier = serializers.CharField(allow_blank=True)
    verified_by_identifier = serializers.CharField(allow_blank=True)
    verified_at = serializers.DateTimeField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    reupload_requested = serializers.BooleanField()
    reupload_requested_at = serializers.DateTimeField(allow_null=True)
    reupload_requested_by_identifier = serializers.CharField(allow_blank=True)
    version_history = serializers.JSONField()
    review_history = serializers.JSONField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminEmployeeDocumentListSerializer(serializers.Serializer):
    items = HrAdminEmployeeDocumentSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminEmployeeDocumentWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    status = serializers.ChoiceField(choices=EmployeeDocumentStatus.values, required=False)
    verification_status = serializers.ChoiceField(choices=VerificationStatus.values, required=False)
    document_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    issued_on = serializers.DateField(required=False, allow_null=True)
    expires_on = serializers.DateField(required=False, allow_null=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    reupload_requested = serializers.BooleanField(required=False)


class HrAdminEmployeeDocumentCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    category_id = serializers.UUIDField()
    replace_document_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    document_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    issued_on = serializers.DateField(required=False, allow_null=True)
    expires_on = serializers.DateField(required=False, allow_null=True)
    file = serializers.FileField()


class HrAdminEmployeeDocumentReminderActionSerializer(serializers.Serializer):
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class HrAdminEmployeeDocumentReminderActionResultSerializer(serializers.Serializer):
    processed_count = serializers.IntegerField()
    reminder_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()


class HrAdminGeneratedLetterSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    artifact_id = serializers.UUIDField(allow_null=True)
    letter_type = serializers.CharField()
    title = serializers.CharField()
    template_code = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    issue_date = serializers.DateField(allow_null=True)
    file_name = serializers.CharField(allow_blank=True)
    file_url = serializers.CharField(allow_blank=True)
    file_path = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    payload_snapshot = serializers.JSONField()
    rendered_text = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class HrAdminGeneratedLetterListSerializer(serializers.Serializer):
    items = HrAdminGeneratedLetterSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminGeneratedLetterPreviewRequestSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    letter_type = serializers.ChoiceField(choices=LetterType.values, required=False, default=LetterType.OTHER)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    template_code = serializers.CharField(max_length=80, required=False, allow_blank=True)
    issue_date = serializers.DateField(required=False, allow_null=True)
    workflow_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    template_body = serializers.CharField()
    payload_values = serializers.JSONField(required=False)

    def validate_payload_values(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Payload values must be an object.")
        return value


class HrAdminGeneratedLetterWriteSerializer(HrAdminGeneratedLetterPreviewRequestSerializer):
    title = serializers.CharField(max_length=255)


class HrAdminGeneratedLetterPreviewSerializer(serializers.Serializer):
    rendered_text = serializers.CharField()
    missing_variables = serializers.ListField(child=serializers.CharField())
    used_variables = serializers.ListField(child=serializers.CharField())
    payload = serializers.JSONField()


class HrAdminDocumentOptionsSerializer(serializers.Serializer):
    document_category_types = HrAdminEnumOptionSerializer(many=True)
    verification_statuses = HrAdminEnumOptionSerializer(many=True)
    employee_document_statuses = HrAdminEnumOptionSerializer(many=True)
    letter_types = HrAdminEnumOptionSerializer(many=True)
    max_upload_size_bytes = serializers.IntegerField()
    categories = HrAdminOptionItemSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)
    employment_types = HrAdminOptionItemSerializer(many=True)


class MeDocumentRequirementItemSerializer(serializers.Serializer):
    category_id = serializers.UUIDField()
    category_code = serializers.CharField()
    category_name = serializers.CharField()
    rule_id = serializers.UUIDField()
    required_within_days_of_joining = serializers.IntegerField()
    due_on = serializers.CharField(allow_blank=True)
    is_future_due = serializers.BooleanField()
    is_compliant = serializers.BooleanField()
    allow_employee_upload = serializers.BooleanField()
    requires_verification = serializers.BooleanField()
    requires_expiry_date = serializers.BooleanField()
    current_document_id = serializers.UUIDField(allow_null=True)
    current_document_title = serializers.CharField(allow_blank=True)
    current_verification_status = serializers.CharField(allow_blank=True)
    current_expires_on = serializers.DateField(allow_null=True)
    current_expiry_state = serializers.CharField()
    current_expiry_label = serializers.CharField()
    current_days_until_expiry = serializers.IntegerField(allow_null=True)
    current_is_expired = serializers.BooleanField()
    current_is_expiring_soon = serializers.BooleanField()
    current_rejection_reason = serializers.CharField(allow_blank=True)
    current_uploaded_at = serializers.DateTimeField(allow_null=True)


class MeDocumentSummarySerializer(serializers.Serializer):
    required_document_count = serializers.IntegerField()
    missing_required_document_count = serializers.IntegerField()
    future_due_document_count = serializers.IntegerField()
    missing_required_document_names = serializers.ListField(child=serializers.CharField())
    future_due_document_names = serializers.ListField(child=serializers.CharField())
    total_documents = serializers.IntegerField()
    pending_documents = serializers.IntegerField()
    verified_documents = serializers.IntegerField()
    rejected_documents = serializers.IntegerField()
    expiring_documents = serializers.IntegerField()
    expired_documents = serializers.IntegerField()


class MeDocumentCenterSerializer(serializers.Serializer):
    summary = MeDocumentSummarySerializer()
    requirement_items = MeDocumentRequirementItemSerializer(many=True)
    verification_statuses = HrAdminEnumOptionSerializer(many=True)
    categories = HrAdminOptionItemSerializer(many=True)
    uploadable_categories = HrAdminOptionItemSerializer(many=True)
    max_upload_size_bytes = serializers.IntegerField()
    items = HrAdminEmployeeDocumentSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class MeEmployeeDocumentCreateSerializer(serializers.Serializer):
    category_id = serializers.UUIDField()
    replace_document_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    document_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    issued_on = serializers.DateField(required=False, allow_null=True)
    expires_on = serializers.DateField(required=False, allow_null=True)
    file = serializers.FileField()


class HrAdminLifecycleEmployeeOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    employee_code = serializers.CharField()


class HrAdminLifecycleOwnerOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class HrAdminLifecycleQueueItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    item_type = serializers.CharField()
    item_label = serializers.CharField()
    detail_href = serializers.CharField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    primary_date = serializers.DateField(allow_null=True)
    primary_date_label = serializers.CharField()
    secondary_date = serializers.DateField(allow_null=True)
    secondary_date_label = serializers.CharField(allow_blank=True)
    owner_value = serializers.CharField(allow_blank=True)
    owner_label = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    summary = serializers.CharField(allow_blank=True)
    bulk_status_warning = serializers.CharField(allow_blank=True)
    document_attention_state = serializers.CharField()
    document_attention_summary = serializers.CharField()
    missing_required_document_count = serializers.IntegerField()
    future_due_document_count = serializers.IntegerField()
    expired_document_count = serializers.IntegerField()
    expiring_document_count = serializers.IntegerField()
    attention_state = serializers.CharField()
    attention_rank = serializers.IntegerField()
    attention_item_count = serializers.IntegerField()
    attention_summary = serializers.CharField()
    attention_due_on = serializers.DateField(allow_null=True)
    next_due_on = serializers.DateField(allow_null=True)
    next_escalation_on = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField()


class HrAdminLifecycleQueueListSerializer(serializers.Serializer):
    items = HrAdminLifecycleQueueItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminOnboardingSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    status = serializers.CharField()
    expected_joining_date = serializers.DateField(allow_null=True)
    actual_joining_date = serializers.DateField(allow_null=True)
    onboarding_template_code = serializers.CharField(allow_blank=True)
    owner_value = serializers.CharField(allow_blank=True)
    assigned_owner_identifier = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    checklist_snapshot = serializers.JSONField()
    notes = serializers.CharField(allow_blank=True)
    preboarding_started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    is_rehire_journey = serializers.BooleanField()
    checklist_total_count = serializers.IntegerField()
    checklist_completed_count = serializers.IntegerField()
    checklist_open_count = serializers.IntegerField()
    checklist_overdue_count = serializers.IntegerField()
    checklist_escalation_due_count = serializers.IntegerField()
    attention_state = serializers.CharField()
    attention_rank = serializers.IntegerField()
    attention_item_count = serializers.IntegerField()
    attention_summary = serializers.CharField()
    attention_due_on = serializers.DateField(allow_null=True)
    next_due_on = serializers.DateField(allow_null=True)
    next_escalation_on = serializers.DateField(allow_null=True)
    required_document_count = serializers.IntegerField()
    missing_required_document_count = serializers.IntegerField()
    future_due_document_count = serializers.IntegerField()
    missing_required_document_names = serializers.ListField(child=serializers.CharField())


class HrAdminOnboardingListSerializer(serializers.Serializer):
    items = HrAdminOnboardingSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminOnboardingWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=OnboardingStatus.values, required=False, default=OnboardingStatus.NOT_STARTED)
    expected_joining_date = serializers.DateField(required=False, allow_null=True)
    actual_joining_date = serializers.DateField(required=False, allow_null=True)
    onboarding_template_code = serializers.CharField(max_length=80, required=False, allow_blank=True)
    owner_value = serializers.CharField(max_length=160, required=False, allow_blank=True)
    assigned_owner_identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)
    workflow_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    checklist_snapshot = serializers.JSONField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("employee_id"):
            raise serializers.ValidationError({"employee_id": "This field is required."})
        return attrs


class HrAdminProbationReviewSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    review_date = serializers.DateField()
    probation_end_date = serializers.DateField(allow_null=True)
    decision = serializers.CharField()
    extension_end_date = serializers.DateField(allow_null=True)
    owner_value = serializers.CharField(allow_blank=True)
    reviewer_identifier = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    remarks = serializers.CharField(allow_blank=True)


class HrAdminProbationReviewListSerializer(serializers.Serializer):
    items = HrAdminProbationReviewSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminProbationReviewWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    review_date = serializers.DateField(required=False)
    probation_end_date = serializers.DateField(required=False, allow_null=True)
    decision = serializers.ChoiceField(choices=ProbationDecision.values, required=False, default=ProbationDecision.PENDING)
    extension_end_date = serializers.DateField(required=False, allow_null=True)
    owner_value = serializers.CharField(max_length=160, required=False, allow_blank=True)
    reviewer_identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)
    workflow_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("employee_id"):
                raise serializers.ValidationError({"employee_id": "This field is required."})
            if not attrs.get("review_date"):
                raise serializers.ValidationError({"review_date": "This field is required."})
        return attrs


class HrAdminMovementSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    movement_type = serializers.CharField()
    status = serializers.CharField()
    effective_date = serializers.DateField()
    reason = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    current_snapshot = serializers.JSONField()
    from_legal_entity_id = serializers.UUIDField(allow_null=True)
    from_legal_entity = serializers.CharField(allow_null=True)
    to_legal_entity_id = serializers.UUIDField(allow_null=True)
    to_legal_entity = serializers.CharField(allow_null=True)
    from_branch_id = serializers.UUIDField(allow_null=True)
    from_branch = serializers.CharField(allow_null=True)
    to_branch_id = serializers.UUIDField(allow_null=True)
    to_branch = serializers.CharField(allow_null=True)
    from_location_id = serializers.UUIDField(allow_null=True)
    from_location = serializers.CharField(allow_null=True)
    to_location_id = serializers.UUIDField(allow_null=True)
    to_location = serializers.CharField(allow_null=True)
    from_department_id = serializers.UUIDField(allow_null=True)
    from_department = serializers.CharField(allow_null=True)
    to_department_id = serializers.UUIDField(allow_null=True)
    to_department = serializers.CharField(allow_null=True)
    from_business_unit_id = serializers.UUIDField(allow_null=True)
    from_business_unit = serializers.CharField(allow_null=True)
    to_business_unit_id = serializers.UUIDField(allow_null=True)
    to_business_unit = serializers.CharField(allow_null=True)
    from_designation_id = serializers.UUIDField(allow_null=True)
    from_designation = serializers.CharField(allow_null=True)
    to_designation_id = serializers.UUIDField(allow_null=True)
    to_designation = serializers.CharField(allow_null=True)
    from_grade_id = serializers.UUIDField(allow_null=True)
    from_grade = serializers.CharField(allow_null=True)
    to_grade_id = serializers.UUIDField(allow_null=True)
    to_grade = serializers.CharField(allow_null=True)
    from_employment_type_id = serializers.UUIDField(allow_null=True)
    from_employment_type = serializers.CharField(allow_null=True)
    to_employment_type_id = serializers.UUIDField(allow_null=True)
    to_employment_type = serializers.CharField(allow_null=True)
    from_manager_id = serializers.UUIDField(allow_null=True)
    from_manager = serializers.CharField(allow_null=True)
    owner_value = serializers.CharField(allow_blank=True)
    to_manager_id = serializers.UUIDField(allow_null=True)
    to_manager = serializers.CharField(allow_null=True)


class HrAdminMovementListSerializer(serializers.Serializer):
    items = HrAdminMovementSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminMovementWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    movement_type = serializers.ChoiceField(choices=MovementType.values, required=False, default=MovementType.TRANSFER)
    status = serializers.ChoiceField(choices=LifecycleEventStatus.values, required=False, default=LifecycleEventStatus.DRAFT)
    effective_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    workflow_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    current_snapshot = serializers.JSONField(required=False)
    from_legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    to_legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    from_branch_id = serializers.UUIDField(required=False, allow_null=True)
    to_branch_id = serializers.UUIDField(required=False, allow_null=True)
    from_location_id = serializers.UUIDField(required=False, allow_null=True)
    to_location_id = serializers.UUIDField(required=False, allow_null=True)
    from_department_id = serializers.UUIDField(required=False, allow_null=True)
    to_department_id = serializers.UUIDField(required=False, allow_null=True)
    from_business_unit_id = serializers.UUIDField(required=False, allow_null=True)
    to_business_unit_id = serializers.UUIDField(required=False, allow_null=True)
    from_designation_id = serializers.UUIDField(required=False, allow_null=True)
    to_designation_id = serializers.UUIDField(required=False, allow_null=True)
    from_grade_id = serializers.UUIDField(required=False, allow_null=True)
    to_grade_id = serializers.UUIDField(required=False, allow_null=True)
    from_employment_type_id = serializers.UUIDField(required=False, allow_null=True)
    to_employment_type_id = serializers.UUIDField(required=False, allow_null=True)
    from_manager_id = serializers.UUIDField(required=False, allow_null=True)
    owner_value = serializers.CharField(max_length=160, required=False, allow_blank=True)
    to_manager_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        if not self.partial:
            if not attrs.get("employee_id"):
                raise serializers.ValidationError({"employee_id": "This field is required."})
            if not attrs.get("effective_date"):
                raise serializers.ValidationError({"effective_date": "This field is required."})
        return attrs


class HrAdminExitSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    status = serializers.CharField()
    resignation_date = serializers.DateField(allow_null=True)
    notice_start_date = serializers.DateField(allow_null=True)
    notice_end_date = serializers.DateField(allow_null=True)
    proposed_last_working_date = serializers.DateField(allow_null=True)
    approved_last_working_date = serializers.DateField(allow_null=True)
    actual_exit_date = serializers.DateField(allow_null=True)
    exit_reason = serializers.CharField(allow_blank=True)
    exit_reason_detail = serializers.CharField(allow_blank=True)
    is_regrettable = serializers.BooleanField()
    rehire_eligible = serializers.BooleanField()
    workflow_reference = serializers.CharField(allow_blank=True)
    clearance_status_snapshot = serializers.JSONField()
    clearance_total_count = serializers.IntegerField()
    clearance_completed_count = serializers.IntegerField()
    clearance_open_count = serializers.IntegerField()
    clearance_overdue_count = serializers.IntegerField()
    clearance_escalation_due_count = serializers.IntegerField()
    attention_state = serializers.CharField()
    attention_rank = serializers.IntegerField()
    attention_item_count = serializers.IntegerField()
    attention_summary = serializers.CharField()
    attention_due_on = serializers.DateField(allow_null=True)
    next_due_on = serializers.DateField(allow_null=True)
    next_escalation_on = serializers.DateField(allow_null=True)
    handover_notes = serializers.CharField(allow_blank=True)


class HrAdminExitListSerializer(serializers.Serializer):
    items = HrAdminExitSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminExitWriteSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=ExitStatus.values, required=False, default=ExitStatus.DRAFT)
    resignation_date = serializers.DateField(required=False, allow_null=True)
    notice_start_date = serializers.DateField(required=False, allow_null=True)
    notice_end_date = serializers.DateField(required=False, allow_null=True)
    proposed_last_working_date = serializers.DateField(required=False, allow_null=True)
    approved_last_working_date = serializers.DateField(required=False, allow_null=True)
    actual_exit_date = serializers.DateField(required=False, allow_null=True)
    exit_reason = serializers.CharField(max_length=120, required=False, allow_blank=True)
    exit_reason_detail = serializers.CharField(required=False, allow_blank=True)
    is_regrettable = serializers.BooleanField(required=False, default=False)
    rehire_eligible = serializers.BooleanField(required=False, default=True)
    workflow_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    clearance_status_snapshot = serializers.JSONField(required=False)
    handover_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not self.partial and not attrs.get("employee_id"):
            raise serializers.ValidationError({"employee_id": "This field is required."})
        return attrs


class HrAdminLifecycleOptionsSerializer(serializers.Serializer):
    onboarding_statuses = HrAdminEnumOptionSerializer(many=True)
    probation_decisions = HrAdminEnumOptionSerializer(many=True)
    movement_types = HrAdminEnumOptionSerializer(many=True)
    lifecycle_event_statuses = HrAdminEnumOptionSerializer(many=True)
    exit_statuses = HrAdminEnumOptionSerializer(many=True)
    employees = HrAdminLifecycleEmployeeOptionSerializer(many=True)
    legal_entities = HrAdminOptionItemSerializer(many=True)
    branches = HrAdminOptionItemSerializer(many=True)
    locations = HrAdminOptionItemSerializer(many=True)
    departments = HrAdminOptionItemSerializer(many=True)
    business_units = HrAdminOptionItemSerializer(many=True)
    designations = HrAdminOptionItemSerializer(many=True)
    grades = HrAdminOptionItemSerializer(many=True)
    employment_types = HrAdminOptionItemSerializer(many=True)
    managers = HrAdminLifecycleEmployeeOptionSerializer(many=True)
    lifecycle_owners = HrAdminLifecycleOwnerOptionSerializer(many=True)


class HrAdminNotificationTemplateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    channel = serializers.CharField()
    status = serializers.CharField()
    subject_template = serializers.CharField(allow_blank=True)
    title_template = serializers.CharField(allow_blank=True)
    body_template = serializers.CharField()
    metadata_template = serializers.JSONField()
    is_system_seeded = serializers.BooleanField()


class HrAdminNotificationTemplateWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=60)
    name = serializers.CharField(max_length=255)
    channel = serializers.ChoiceField(choices=NotificationChannel.values)
    status = serializers.ChoiceField(choices=NotificationTemplateStatus.values, required=False, default=NotificationTemplateStatus.DRAFT)
    subject_template = serializers.CharField(max_length=255, required=False, allow_blank=True)
    title_template = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body_template = serializers.CharField()
    metadata_template = serializers.JSONField(required=False)
    is_system_seeded = serializers.BooleanField(required=False, default=False)


class HrAdminNotificationTemplatePreviewRequestSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=NotificationChannel.values)
    subject_template = serializers.CharField(max_length=255, required=False, allow_blank=True)
    title_template = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body_template = serializers.CharField(required=False, allow_blank=True)
    metadata_template = serializers.JSONField(required=False)
    sample_payload = serializers.JSONField(required=False)
    membership_id = serializers.UUIDField(required=False, allow_null=True)
    process_now = serializers.BooleanField(required=False, default=True)


class HrAdminNotificationEventDefinitionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    module = serializers.CharField()
    trigger_key = serializers.CharField()
    audience_type = serializers.CharField()
    channel = serializers.CharField()
    template_id = serializers.UUIDField(allow_null=True)
    template_name = serializers.CharField(allow_null=True)
    role_id = serializers.UUIDField(allow_null=True)
    role_name = serializers.CharField(allow_null=True)
    membership_id = serializers.UUIDField(allow_null=True)
    membership_name = serializers.CharField(allow_null=True)
    is_active = serializers.BooleanField()
    priority = serializers.CharField()
    delivery_delay_minutes = serializers.IntegerField()
    recipient_snapshot = serializers.JSONField()


class HrAdminNotificationEventDefinitionWriteSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=80)
    name = serializers.CharField(max_length=255)
    module = serializers.CharField(max_length=30)
    trigger_key = serializers.CharField(max_length=120)
    audience_type = serializers.ChoiceField(choices=NotificationAudienceType.values)
    channel = serializers.ChoiceField(choices=NotificationChannel.values)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    role_id = serializers.UUIDField(required=False, allow_null=True)
    membership_id = serializers.UUIDField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)
    priority = serializers.ChoiceField(choices=NotificationPriority.values, required=False, default=NotificationPriority.NORMAL)
    delivery_delay_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    recipient_snapshot = serializers.JSONField(required=False)


class HrAdminNotificationEventPreviewRequestSerializer(serializers.Serializer):
    module = serializers.CharField(max_length=30)
    trigger_key = serializers.CharField(max_length=120)
    audience_type = serializers.ChoiceField(choices=NotificationAudienceType.values)
    channel = serializers.ChoiceField(choices=NotificationChannel.values)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    role_id = serializers.UUIDField(required=False, allow_null=True)
    membership_id = serializers.UUIDField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=NotificationPriority.values, required=False, default=NotificationPriority.NORMAL)
    delivery_delay_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    recipient_snapshot = serializers.JSONField(required=False)
    sample_payload = serializers.JSONField(required=False)
    subject_type = serializers.CharField(required=False, allow_blank=True)
    subject_identifier = serializers.CharField(required=False, allow_blank=True)
    process_now = serializers.BooleanField(required=False, default=True)


class HrAdminNotificationTemplateOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    channel = serializers.CharField()
    status = serializers.CharField()


class HrAdminNotificationPreviewResolvedRecipientSerializer(serializers.Serializer):
    membership_id = serializers.UUIDField(allow_null=True)
    membership_name = serializers.CharField(allow_null=True)
    identifier = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)


class HrAdminNotificationPreviewSerializer(serializers.Serializer):
    channel = serializers.CharField()
    audience_type = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(allow_blank=True)
    subject = serializers.CharField(allow_blank=True)
    body = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField()
    payload = serializers.JSONField()
    routing_summary = serializers.CharField()
    resolved_recipient = HrAdminNotificationPreviewResolvedRecipientSerializer()


class HrAdminNotificationPreviewResponseSerializer(serializers.Serializer):
    preview = HrAdminNotificationPreviewSerializer()
    test_notification = serializers.JSONField(allow_null=True)

class HrAdminNotificationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    event_definition_id = serializers.UUIDField(allow_null=True)
    event_definition_name = serializers.CharField(allow_null=True)
    channel = serializers.CharField()
    audience_type = serializers.CharField()
    subject_type = serializers.CharField(allow_blank=True)
    subject_identifier = serializers.CharField(allow_blank=True)
    recipient_membership_id = serializers.UUIDField(allow_null=True)
    recipient_membership_name = serializers.CharField(allow_null=True)
    recipient_role_id = serializers.UUIDField(allow_null=True)
    recipient_role_name = serializers.CharField(allow_null=True)
    recipient_identifier = serializers.CharField(allow_blank=True)
    recipient_address = serializers.CharField(allow_blank=True)
    title = serializers.CharField(allow_blank=True)
    subject = serializers.CharField(allow_blank=True)
    body = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    priority = serializers.CharField()
    scheduled_for = serializers.DateTimeField(allow_null=True)
    sent_at = serializers.DateTimeField(allow_null=True)
    delivered_at = serializers.DateTimeField(allow_null=True)
    read_at = serializers.DateTimeField(allow_null=True)
    attempt_count = serializers.IntegerField()
    max_attempts = serializers.IntegerField()
    retry_backoff_minutes = serializers.IntegerField()
    retry_limit_reached = serializers.BooleanField()
    can_retry = serializers.BooleanField()
    delivery_logs = serializers.JSONField()
    payload = serializers.JSONField()
    created_at = serializers.DateTimeField()


class HrAdminNotificationDiagnosticsSerializer(serializers.Serializer):
    overview = serializers.JSONField()
    alerts = serializers.JSONField()
    recommendations = serializers.JSONField()
    channel_diagnostics = serializers.JSONField()
    template_diagnostics = serializers.JSONField()
    event_diagnostics = serializers.JSONField()
    recent_test_notifications = HrAdminNotificationSerializer(many=True)


class HrAdminNotificationChannelConfigurationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    channel = serializers.CharField()
    is_enabled = serializers.BooleanField()
    backend_key = serializers.CharField()
    sender_identifier = serializers.CharField(allow_blank=True)
    sender_address = serializers.CharField(allow_blank=True)
    provider_config = serializers.JSONField()
    delivery_policy = serializers.JSONField()


class HrAdminNotificationChannelConfigurationWriteSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=NotificationChannel.values)
    is_enabled = serializers.BooleanField(required=False, default=True)
    backend_key = serializers.ChoiceField(choices=NotificationDeliveryBackend.values, required=False)
    sender_identifier = serializers.CharField(max_length=120, required=False, allow_blank=True)
    sender_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    provider_config = serializers.JSONField(required=False)
    delivery_policy = serializers.JSONField(required=False)


class HrAdminNotificationListSerializer(serializers.Serializer):
    items = HrAdminNotificationSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminNotificationWriteSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=NotificationStatus.values, required=False)
    recipient_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=NotificationPriority.values, required=False)
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)
    read_at = serializers.DateTimeField(required=False, allow_null=True)


class UserNotificationReadStateSerializer(serializers.Serializer):
    read_at = serializers.DateTimeField(required=True, allow_null=True)


class HrAdminNotificationRetrySerializer(serializers.Serializer):
    process_now = serializers.BooleanField(required=False, default=True)


class HrAdminNotificationBulkRetrySerializer(serializers.Serializer):
    notification_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    process_now = serializers.BooleanField(required=False, default=True)


class HrAdminNotificationOptionsSerializer(serializers.Serializer):
    notification_channels = HrAdminEnumOptionSerializer(many=True)
    notification_delivery_backends = serializers.JSONField()
    notification_delivery_authoring = serializers.JSONField()
    notification_catalog_authoring = serializers.JSONField()
    notification_audience_types = HrAdminEnumOptionSerializer(many=True)
    notification_template_statuses = HrAdminEnumOptionSerializer(many=True)
    notification_priorities = HrAdminEnumOptionSerializer(many=True)
    notification_statuses = HrAdminEnumOptionSerializer(many=True)
    notification_retry_states = HrAdminEnumOptionSerializer(many=True)
    notification_subject_types = HrAdminEnumOptionSerializer(many=True)
    workflow_modules = HrAdminEnumOptionSerializer(many=True)
    templates = HrAdminNotificationTemplateOptionSerializer(many=True)
    roles = HrAdminRoleOptionSerializer(many=True)
    memberships = HrAdminOptionItemSerializer(many=True)
    channel_configurations = HrAdminNotificationChannelConfigurationSerializer(many=True)


class LeaveBalanceItemSerializer(serializers.Serializer):
    leave_type = serializers.CharField()
    policy_name = serializers.CharField()
    closing_balance = serializers.DecimalField(max_digits=8, decimal_places=2)
    consumed_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    reserved_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    period_year = serializers.IntegerField(required=False)
    accrued_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    carry_forward_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    encashed_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    adjustment_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)


class HrAdminLeaveBalanceSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    leave_policy_id = serializers.UUIDField()
    leave_policy_name = serializers.CharField()
    leave_type_id = serializers.UUIDField()
    leave_type_name = serializers.CharField()
    period_year = serializers.IntegerField()
    opening_balance = serializers.DecimalField(max_digits=8, decimal_places=2)
    accrued_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    carry_forward_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    consumed_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    reserved_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    encashed_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    adjustment_amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    closing_balance = serializers.DecimalField(max_digits=8, decimal_places=2)


class HrAdminLeaveBalanceTransactionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    leave_balance_id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    leave_policy_id = serializers.UUIDField()
    leave_policy_name = serializers.CharField()
    status = serializers.CharField()
    action = serializers.CharField()
    units = serializers.DecimalField(max_digits=8, decimal_places=2)
    effective_date = serializers.DateField()
    reason = serializers.CharField(allow_blank=True)
    performed_by_id = serializers.UUIDField(allow_null=True)
    performed_by_name = serializers.CharField(allow_null=True)
    reviewed_by_id = serializers.UUIDField(allow_null=True)
    reviewed_by_name = serializers.CharField(allow_null=True)
    reviewed_at = serializers.DateTimeField(allow_null=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    approval_reason = serializers.CharField(allow_null=True, required=False)
    reviewer_employee_id = serializers.UUIDField(allow_null=True)
    reviewer_employee_name = serializers.CharField(allow_null=True)
    can_current_actor_review = serializers.BooleanField(required=False)
    closing_balance_before = serializers.DecimalField(max_digits=8, decimal_places=2)
    closing_balance_after = serializers.DecimalField(max_digits=8, decimal_places=2)
    created_at = serializers.DateTimeField()


class HrAdminLeaveBalanceActionSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    leave_policy_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=["credit_adjustment", "debit_adjustment", "encashment"])
    units = serializers.DecimalField(max_digits=8, decimal_places=2)
    effective_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)


class HrAdminLeaveBalanceActionResultSerializer(serializers.Serializer):
    balance = HrAdminLeaveBalanceSerializer()
    transaction = HrAdminLeaveBalanceTransactionSerializer()
    applied = serializers.BooleanField()
    requires_review = serializers.BooleanField()
    message = serializers.CharField()


class HrAdminLeaveBalanceTransactionReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approve", "reject"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class LeaveTypeOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    short_code = serializers.CharField(allow_blank=True)
    category = serializers.CharField()
    unit = serializers.CharField()
    requires_attachment = serializers.BooleanField()
    allow_negative_balance = serializers.BooleanField()


class LeaveRequestSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    leave_type = serializers.CharField()
    status = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    requested_units = serializers.DecimalField(max_digits=8, decimal_places=2)


class LeaveRequestHistoryItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    request_action = serializers.CharField(required=False)
    leave_type = serializers.CharField()
    leave_type_code = serializers.CharField()
    policy_name = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_day_portion = serializers.CharField()
    end_day_portion = serializers.CharField()
    requested_units = serializers.DecimalField(max_digits=8, decimal_places=2)
    approved_units = serializers.DecimalField(max_digits=8, decimal_places=2)
    reason = serializers.CharField(allow_blank=True)
    attachment_reference = serializers.CharField(allow_blank=True)
    approval_route = serializers.CharField(allow_blank=True)
    required_attachment_label = serializers.CharField(allow_null=True, required=False)
    manager_comment = serializers.CharField(allow_blank=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    approved_at = serializers.DateTimeField(allow_null=True)
    cancelled_at = serializers.DateTimeField(allow_null=True)
    can_withdraw = serializers.BooleanField(required=False)
    withdraw_block_reason = serializers.CharField(required=False, allow_null=True)
    withdraw_requires_attachment = serializers.BooleanField(required=False)
    withdraw_attachment_label = serializers.CharField(required=False, allow_null=True)
    can_cancel = serializers.BooleanField(required=False)
    cancel_block_reason = serializers.CharField(required=False, allow_null=True)
    cancel_requires_attachment = serializers.BooleanField(required=False)
    cancel_attachment_label = serializers.CharField(required=False, allow_null=True)
    cancel_requires_reapproval = serializers.BooleanField(required=False)
    cancel_approval_route = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class LeaveSummarySerializer(serializers.Serializer):
    period_year = serializers.IntegerField()
    pending_requests_count = serializers.IntegerField()
    balances = LeaveBalanceItemSerializer(many=True)
    recent_requests = LeaveRequestSummarySerializer(many=True)


class AttendanceTodaySerializer(serializers.Serializer):
    date = serializers.DateField()
    status = serializers.CharField()
    shift = serializers.CharField(allow_null=True)
    check_in_at = serializers.DateTimeField(allow_null=True)
    check_out_at = serializers.DateTimeField(allow_null=True)


class AttendanceMonthSerializer(serializers.Serializer):
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    half_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    work_duration_hours = serializers.DecimalField(max_digits=10, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=10, decimal_places=2)


class AttendanceSummarySerializer(serializers.Serializer):
    today = AttendanceTodaySerializer()
    month_to_date = AttendanceMonthSerializer()
    pending_regularizations_count = serializers.IntegerField()


class AttendanceRecordOptionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    attendance_date = serializers.DateField()
    status = serializers.CharField()
    shift = serializers.CharField(allow_null=True)
    check_in_at = serializers.DateTimeField(allow_null=True)
    check_out_at = serializers.DateTimeField(allow_null=True)
    is_regularized = serializers.BooleanField()
    is_locked = serializers.BooleanField()
    late_minutes = serializers.IntegerField()


class HrAdminAttendanceRecordListSerializer(serializers.Serializer):
    items = HrAdminAttendanceRecordSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class AttendanceRegularizationHistoryItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    attendance_record_id = serializers.UUIDField()
    attendance_date = serializers.DateField()
    current_status = serializers.CharField()
    requested_status = serializers.CharField()
    shift = serializers.CharField(allow_null=True)
    requested_check_in_at = serializers.DateTimeField(allow_null=True)
    requested_check_out_at = serializers.DateTimeField(allow_null=True)
    actual_check_in_at = serializers.DateTimeField(allow_null=True)
    actual_check_out_at = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
    reason = serializers.CharField(allow_blank=True)
    manager_comment = serializers.CharField(allow_blank=True)
    rejection_reason = serializers.CharField(allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    resolved_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PagedStatusCountSerializer(serializers.Serializer):
    all = serializers.IntegerField()
    pending = serializers.IntegerField(required=False)
    approved = serializers.IntegerField(required=False)
    rejected = serializers.IntegerField(required=False)
    withdrawn = serializers.IntegerField(required=False)
    cancelled = serializers.IntegerField(required=False)
    partially_approved = serializers.IntegerField(required=False)


class LeaveRequestHistoryListSerializer(serializers.Serializer):
    items = LeaveRequestHistoryItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()
    status_counts = PagedStatusCountSerializer()


class AttendanceRegularizationHistoryListSerializer(serializers.Serializer):
    items = AttendanceRegularizationHistoryItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()
    status_counts = PagedStatusCountSerializer()

class EmployeeDashboardSerializer(serializers.Serializer):
    profile = EmployeeProfileSerializer()
    leave = LeaveSummarySerializer()
    attendance = AttendanceSummarySerializer()


class MePayrollPayslipSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    payroll_run_id = serializers.UUIDField()
    payroll_run_name = serializers.CharField()
    period_name = serializers.CharField()
    period_start_date = serializers.DateField(allow_null=True)
    period_end_date = serializers.DateField(allow_null=True)
    pay_date = serializers.DateField(allow_null=True)
    title = serializers.CharField()
    file_name = serializers.CharField(allow_blank=True)
    mime_type = serializers.CharField()
    file_size_bytes = serializers.IntegerField()
    checksum_sha256 = serializers.CharField(allow_blank=True)
    storage_provider_ref = serializers.CharField()
    storage_object_version = serializers.CharField(allow_blank=True)
    download_strategy_ref = serializers.CharField()
    supports_signed_url = serializers.BooleanField()
    signed_url_expires_in_seconds = serializers.IntegerField()
    retention_policy_ref = serializers.CharField()
    download_url = serializers.CharField(allow_null=True)
    signed_download_url = serializers.CharField(allow_null=True)
    signed_download_expires_at = serializers.DateTimeField(allow_null=True)
    totals_snapshot = serializers.JSONField()
    line_snapshot = serializers.JSONField()
    access_summary = serializers.JSONField()
    access_events = serializers.JSONField()
    source_hash = serializers.CharField(allow_blank=True)
    published_at = serializers.DateTimeField(allow_null=True)
    published_by_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class MePayrollPayslipListSerializer(serializers.Serializer):
    summary = serializers.JSONField()
    items = MePayrollPayslipSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class ManagerApprovalEmployeeSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)


class ManagerLeaveApprovalItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    leave_type = serializers.CharField()
    leave_type_code = serializers.CharField()
    policy_name = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_day_portion = serializers.CharField()
    end_day_portion = serializers.CharField()
    requested_units = serializers.DecimalField(max_digits=8, decimal_places=2)
    approved_units = serializers.DecimalField(max_digits=8, decimal_places=2)
    reason = serializers.CharField(allow_blank=True)
    attachment_reference = serializers.CharField(required=False, allow_blank=True)
    approval_route = serializers.CharField(required=False, allow_blank=True)
    required_attachment_label = serializers.CharField(required=False, allow_null=True)
    manager_comment = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    approved_at = serializers.DateTimeField(required=False, allow_null=True)
    cancelled_at = serializers.DateTimeField(required=False, allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField(required=False)


class ManagerAttendanceApprovalItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    employee_id = serializers.UUIDField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField(allow_null=True)
    designation = serializers.CharField(allow_null=True)
    attendance_record_id = serializers.UUIDField()
    attendance_date = serializers.DateField()
    current_status = serializers.CharField()
    requested_status = serializers.CharField()
    shift = serializers.CharField(allow_null=True)
    requested_check_in_at = serializers.DateTimeField(allow_null=True)
    requested_check_out_at = serializers.DateTimeField(allow_null=True)
    actual_check_in_at = serializers.DateTimeField(allow_null=True)
    actual_check_out_at = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
    reason = serializers.CharField(allow_blank=True)
    manager_comment = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    workflow_reference = serializers.CharField(allow_blank=True)
    applied_at = serializers.DateTimeField(allow_null=True)
    resolved_at = serializers.DateTimeField(required=False, allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField(required=False)


class ManagerLeaveApprovalListSerializer(serializers.Serializer):
    items = ManagerLeaveApprovalItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class HrAdminAttendanceRegularizationListSerializer(serializers.Serializer):
    items = ManagerAttendanceApprovalItemSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class ManagerTeamSummarySerializer(serializers.Serializer):
    team_size = serializers.IntegerField()
    employees_on_leave_today = serializers.IntegerField()
    pending_leave_approvals_count = serializers.IntegerField()
    pending_attendance_regularizations_count = serializers.IntegerField()
    attendance_exceptions_today = serializers.IntegerField()


class LeaveRequestCreateSerializer(serializers.Serializer):
    leave_type_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_day_portion = serializers.ChoiceField(
        choices=["full_day", "first_half", "second_half"],
        default="full_day",
    )
    end_day_portion = serializers.ChoiceField(
        choices=["full_day", "first_half", "second_half"],
        default="full_day",
    )
    reason = serializers.CharField(required=False, allow_blank=True)
    attachment_reference = serializers.CharField(required=False, allow_blank=True)


class LeaveRequestLifecycleActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
    attachment_reference = serializers.CharField(required=False, allow_blank=True)


class AttendanceRegularizationCreateSerializer(serializers.Serializer):
    attendance_record_id = serializers.UUIDField()
    requested_status = serializers.ChoiceField(
        choices=["present", "absent", "half_day", "late", "remote"],
        default="present",
    )
    requested_check_in_at = serializers.DateTimeField(required=False, allow_null=True)
    requested_check_out_at = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        requested_check_in_at = attrs.get("requested_check_in_at")
        requested_check_out_at = attrs.get("requested_check_out_at")
        if requested_check_in_at and requested_check_out_at and requested_check_out_at < requested_check_in_at:
            raise serializers.ValidationError(
                {"requested_check_out_at": "Requested check-out cannot be earlier than requested check-in."}
            )
        return attrs


class ManagerDecisionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class HrAdminAttendanceRecordBulkActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["lock", "unlock", "set_status", "mark_regularized", "clear_regularized"])
    record_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    status = serializers.ChoiceField(choices=AttendanceStatus.choices, required=False)

    def validate(self, attrs):
        if attrs["action"] == "set_status" and not attrs.get("status"):
            raise serializers.ValidationError({"status": "This field is required for set_status."})
        return attrs


class HrAdminLifecycleOwnerBulkActionSerializer(serializers.Serializer):
    record_type = serializers.ChoiceField(choices=["onboarding", "probation", "movement"])
    record_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    owner_value = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")


class HrAdminLifecycleStatusBulkActionSerializer(serializers.Serializer):
    record_type = serializers.ChoiceField(choices=["onboarding", "probation", "movement"])
    record_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    status_value = serializers.CharField(max_length=40)

    def validate(self, attrs):
        status_value = attrs["status_value"]
        record_type = attrs["record_type"]
        valid_choices = {
            "onboarding": set(OnboardingStatus.values),
            "probation": set(ProbationDecision.values),
            "movement": set(LifecycleEventStatus.values),
        }
        if status_value not in valid_choices[record_type]:
            raise serializers.ValidationError({"status_value": "Invalid selection for this lifecycle record type."})
        return attrs


class MutationResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    workflow_reference = serializers.CharField(allow_blank=True)


class BulkMutationResultSerializer(serializers.Serializer):
    action = serializers.CharField()
    updated_count = serializers.IntegerField()
