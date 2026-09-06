from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta
from decimal import Decimal
from io import StringIO
from uuid import uuid4

import pytest
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    AttendanceRecord,
    AttendanceRegularization,
    AttendanceStatus,
    EmployeeShiftAssignment,
    EmployeeShiftAssignmentKind,
    Holiday,
    HolidayCalendar,
    RegularizationStatus,
    Shift,
)
from apps.documents.models import DocumentArtifact, DocumentCategory, DocumentCategoryType, DocumentRequirementRule, EmployeeDocument, EmployeeDocumentStatus, GeneratedLetter, VerificationStatus
from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.employee_lifecycle.models import EmployeeExit, EmployeeLifecycleEvent, ExitStatus, LifecycleEventStatus, LifecycleEventType, OnboardingStatus, ProbationDecision
from apps.iam.models import MembershipStatus, Role, TenantMembership, User
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeavePolicyStatus, LeaveRequest, LeaveRequestStatus, LeaveType
from apps.notifications.models import (
    Notification,
    NotificationChannelConfiguration,
    NotificationDeliveryBackend,
    NotificationDeliveryLog,
    NotificationEventDefinition,
    NotificationPriority,
    NotificationStatus,
    NotificationTemplate,
)
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, Grade, LegalEntity, Location
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
    PayrollArtifactAccessEvent,
    PayrollArtifactAccessEventType,
    PayrollArtifactSignedAccessGrant,
    PayrollArtifactSignedAccessGrantStatus,
    PayrollCalculationLine,
    PayrollCalculationLineSource,
    PayrollCalculationStatus,
    PayrollRunCalculation,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollExpressionLanguage,
    PayrollFinanceHandoff,
    PayrollFinanceHandoffStatus,
    PayrollFrequency,
    PayrollApprovalStatus,
    PayrollExceptionSeverity,
    PayrollExceptionStatus,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollProviderCallbackEvent,
    PayrollProviderCallbackEventStatus,
    PayrollProviderCertificationStatus,
    PayrollProviderCertificationRun,
    PayrollProviderCertificationRunStatus,
    PayrollProviderConnection,
    PayrollProviderConnectionStatus,
    PayrollProviderDelivery,
    PayrollProviderDeliveryStatus,
    PayrollProviderRetryEvent,
    PayrollProviderRetryEventStatus,
    PayrollReviewStatus,
    PayrollRuleDefinition,
    PayrollRuleEvaluation,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunApproval,
    PayrollRunException,
    PayrollRunReview,
    PayrollRunStatus,
    PayrollSettlement,
    PayrollSettlementLine,
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
from apps.payroll.providers import (
    PayrollProviderAdapterError,
    validate_payroll_provider_route_config,
)
from apps.payroll.services import expected_provider_callback_signature
from apps.platform_config.models import ConfigCategory, ConfigDataType, ConfigStatus, ConfigurationDefinition, TenantConfiguration
from apps.workflows.models import WorkflowAction, WorkflowActionLog, WorkflowActorType, WorkflowAssignment, WorkflowInstance, WorkflowInstanceStatus, WorkflowStep, WorkflowStepInstance, WorkflowStatus, WorkflowTemplate


PASSWORD = "Password@123"


def login(client: APIClient, identifier: str, password: str = PASSWORD) -> str:
    response = client.post(
        "/api/v1/auth/login/",
        {"identifier": identifier, "password": password},
        format="json",
    )
    assert response.status_code == 200, response.json()
    return response.json()["token"]


def create_employee_scoped_leave_policy(
    *,
    employee: Employee,
    leave_type: LeaveType,
    code: str,
    name: str,
    annual_entitlement: str = "12.00",
    notice_days_required: int = 0,
    allow_backdated_application: bool = True,
    is_probation_eligible: bool = True,
):
    policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code=code,
        name=name,
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal(annual_entitlement),
        min_days_per_request=Decimal("0.50"),
        notice_days_required=notice_days_required,
        allow_half_day=True,
        allow_backdated_application=allow_backdated_application,
        is_probation_eligible=is_probation_eligible,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=1,
        is_active=True,
    )
    return policy


def create_assignment_test_leave_type(*, employee: Employee, label: str) -> LeaveType:
    slug = f"{label}-{uuid4().hex[:8]}"
    return LeaveType.objects.create(
        tenant=employee.tenant,
        code=slug,
        name=slug.replace("-", " ").title(),
        category="paid",
        unit="day",
        allow_negative_balance=True,
        is_active=True,
    )


def create_assignment_test_leave_policy(
    *,
    employee: Employee,
    leave_type: LeaveType,
    label: str,
    allow_backdated_application: bool = True,
    config_snapshot: dict | None = None,
) -> LeavePolicy:
    slug = f"{label}-{uuid4().hex[:8]}"
    return LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code=slug,
        name=slug.replace("-", " ").title(),
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=allow_backdated_application,
        is_probation_eligible=True,
        config_snapshot=config_snapshot or {},
    )


def create_employee_scoped_attendance_policy(
    *,
    employee: Employee,
    code: str,
    name: str,
    default_shift: Shift | None = None,
    holiday_calendar: HolidayCalendar | None = None,
    full_day_min_hours: str = "8.00",
    half_day_min_hours: str = "4.00",
    late_mark_after_minutes: int = 15,
    overtime_threshold_minutes: int = 30,
    allow_regularization: bool = True,
    require_regularization_reason: bool = True,
    config_snapshot: dict | None = None,
):
    policy = AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code=code,
        name=name,
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
        default_shift=default_shift,
        holiday_calendar=holiday_calendar,
        full_day_min_hours=Decimal(full_day_min_hours),
        half_day_min_hours=Decimal(half_day_min_hours),
        late_mark_after_minutes=late_mark_after_minutes,
        overtime_threshold_minutes=overtime_threshold_minutes,
        allow_regularization=allow_regularization,
        require_regularization_reason=require_regularization_reason,
        config_snapshot=config_snapshot or {},
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=policy,
        employee=employee,
        priority=1,
        is_active=True,
    )
    return policy


def create_assignment_test_attendance_policy(
    *,
    employee: Employee,
    label: str,
    full_day_min_hours: str = "8.00",
    half_day_min_hours: str = "4.00",
    late_mark_after_minutes: int = 15,
    overtime_threshold_minutes: int = 30,
    allow_regularization: bool = True,
    require_regularization_reason: bool = True,
    config_snapshot: dict | None = None,
    default_shift: Shift | None = None,
    holiday_calendar: HolidayCalendar | None = None,
) -> AttendancePolicy:
    slug = f"{label}-{uuid4().hex[:8]}"
    return AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code=slug,
        name=slug.replace("-", " ").title(),
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
        default_shift=default_shift,
        holiday_calendar=holiday_calendar,
        full_day_min_hours=Decimal(full_day_min_hours),
        half_day_min_hours=Decimal(half_day_min_hours),
        late_mark_after_minutes=late_mark_after_minutes,
        overtime_threshold_minutes=overtime_threshold_minutes,
        allow_regularization=allow_regularization,
        require_regularization_reason=require_regularization_reason,
        config_snapshot=config_snapshot
        or {
            "derivation": {
                "enabled": True,
                "missing_punch_status": "absent",
                "late_status_mode": "present",
                "derive_overtime": True,
            }
        },
    )


@pytest.fixture()
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture()
def bootstrapped_workspace(db):
    call_command("bootstrap_demo_workspace", password=PASSWORD)
    return {
        "pending_leave": LeaveRequest.objects.get(
            employee__employee_code="EMP-0042",
            status=LeaveRequestStatus.PENDING,
        ),
        "pending_regularization": AttendanceRegularization.objects.get(
            employee__employee_code="EMP-0044",
            status=RegularizationStatus.PENDING,
        ),
        "riya_today_record": AttendanceRecord.objects.get(
            employee__employee_code="EMP-0042",
            attendance_date=timezone.localdate(),
        ),
        "earned_leave_type": LeaveType.objects.get(
            tenant__code="northstar-foods",
            code="earned-leave",
        ),
    }


@pytest.mark.django_db
def test_auth_login_session_logout_round_trip(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    session_response = api_client.get("/api/v1/auth/session/")
    assert session_response.status_code == 200
    payload = session_response.json()
    assert payload["username"] == "riya.sharma"
    assert payload["default_membership"]["tenant_code"] == "northstar-foods"
    assert payload["default_membership"]["role_codes"] == ["employee"]

    logout_response = api_client.post("/api/v1/auth/logout/")
    assert logout_response.status_code == 204

    session_after_logout_response = api_client.get("/api/v1/auth/session/")
    assert session_after_logout_response.status_code == 401


@pytest.mark.django_db
def test_employee_cannot_access_hr_admin_dashboard(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/dashboard/")

    assert response.status_code == 403


def test_employee_cannot_access_hr_admin_payroll_readiness(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-readiness/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_payroll_readiness_returns_source_status_and_summary(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-readiness/?q=EMP-0042&page=1&page_size=5")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["configuration"]["profile_key"] == "payroll.readiness_profile.v1"
    assert payload["configuration"]["source"] == "platform_default"
    assert payload["summary"]["total_employees"] == 1
    assert payload["summary"]["pending_leave_requests"] == 1
    assert payload["status_counts"]["warning"] == 1
    assert payload["total_count"] == 1

    item = payload["items"][0]
    assert item["employee_code"] == "EMP-0042"
    assert item["readiness_status"] == "warning"
    assert item["pending_leave_requests"] == 1
    assert item["source_counts"]["leave_requests"] >= 1
    assert "leave request(s) pending approval" in " ".join(item["warnings"])


def test_hr_admin_payroll_readiness_uses_tenant_configuration(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    EmployeeBankAccount.objects.filter(employee=employee).delete()
    definition = ConfigurationDefinition.objects.create(
        key="payroll.readiness_profile.v1",
        name="Payroll readiness profile",
        category=ConfigCategory.REPORTING,
        data_type=ConfigDataType.JSON,
        default_value={},
        is_scoped=True,
    )
    TenantConfiguration.objects.create(
        tenant=tenant,
        definition=definition,
        status=ConfigStatus.PUBLISHED,
        current_value={},
        published_value={
            "profile_name": "Payroll India pilot readiness",
            "employee_required_fields": [{"field": "date_of_joining", "label": "Date of joining", "severity": "blocker"}],
            "bank_account": {"required": True, "severity": "blocker", "label": "Configured payout account"},
        },
    )

    response = api_client.get("/api/v1/hr-admin/payroll-readiness/?q=EMP-0042")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["configuration"]["source"] == ConfigStatus.PUBLISHED
    assert payload["configuration"]["profile_name"] == "Payroll India pilot readiness"
    assert payload["items"][0]["readiness_status"] == "blocked"
    assert "configured payout account" in " ".join(payload["items"][0]["blockers"])


def test_employee_cannot_access_hr_admin_payroll_setup(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-setup/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_payroll_setup_returns_configuration_foundation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="monthly-core",
        name="Monthly Core Payroll",
        frequency=PayrollFrequency.MONTHLY,
        timezone="Asia/Kolkata",
        currency_code="INR",
        period_start_day=1,
        config_snapshot={"cutoff_day": 25},
    )
    PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="sep-2026",
        name="September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="india-staff",
        name="India Staff",
        status=PayGroupStatus.ACTIVE,
        default_currency_code="INR",
        legal_entity=employee.legal_entity,
        branch=employee.branch,
        location=employee.location,
        department=employee.department,
        employment_type=employee.employment_type,
        config_snapshot={"earning_structure_key": "india.staff.v1"},
    )
    PayGroupAssignment.objects.create(
        tenant=tenant,
        pay_group=pay_group,
        employee=employee,
        effective_from="2026-09-01",
        status=PayGroupStatus.ACTIVE,
    )

    response = api_client.get("/api/v1/hr-admin/payroll-setup/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["summary"]["calendar_count"] == 1
    assert payload["summary"]["open_period_count"] == 1
    assert payload["summary"]["active_pay_group_count"] == 1
    assert payload["summary"]["assigned_employee_count"] == 1
    assert payload["calendars"][0]["config_snapshot"]["cutoff_day"] == 25
    assert payload["periods"][0]["calendar_name"] == "Monthly Core Payroll"
    assert payload["pay_groups"][0]["config_snapshot"]["earning_structure_key"] == "india.staff.v1"
    assert payload["assignments"][0]["employee_code"] == "EMP-0042"
    assert payload["options"]["payroll_frequencies"][0]["value"] == PayrollFrequency.MONTHLY


def test_hr_admin_payroll_period_blocks_calendar_overlap(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="monthly-overlap",
        name="Monthly Payroll Overlap",
        frequency=PayrollFrequency.MONTHLY,
    )

    first_response = api_client.post(
        "/api/v1/hr-admin/payroll-periods/",
        {
            "calendar_id": str(calendar.id),
            "code": "sep-2026",
            "name": "September 2026",
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "pay_date": "2026-10-01",
            "status": PayrollPeriodStatus.OPEN,
        },
        format="json",
    )
    second_response = api_client.post(
        "/api/v1/hr-admin/payroll-periods/",
        {
            "calendar_id": str(calendar.id),
            "code": "sep-overlap-2026",
            "name": "September Overlap 2026",
            "start_date": "2026-09-15",
            "end_date": "2026-10-15",
            "pay_date": "2026-10-16",
            "status": PayrollPeriodStatus.DRAFT,
        },
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 400
    assert "overlaps an existing period" in str(second_response.json())


def test_hr_admin_pay_group_assignment_blocks_active_overlap(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="monthly-assignment",
        name="Monthly Assignment Payroll",
        frequency=PayrollFrequency.MONTHLY,
    )
    first_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="staff-a",
        name="Staff A",
        status=PayGroupStatus.ACTIVE,
    )
    second_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="staff-b",
        name="Staff B",
        status=PayGroupStatus.ACTIVE,
    )

    first_response = api_client.post(
        "/api/v1/hr-admin/pay-group-assignments/",
        {
            "pay_group_id": str(first_group.id),
            "employee_id": str(employee.id),
            "effective_from": "2026-09-01",
            "effective_to": "2026-09-30",
            "status": PayGroupStatus.ACTIVE,
        },
        format="json",
    )
    second_response = api_client.post(
        "/api/v1/hr-admin/pay-group-assignments/",
        {
            "pay_group_id": str(second_group.id),
            "employee_id": str(employee.id),
            "effective_from": "2026-09-15",
            "status": PayGroupStatus.ACTIVE,
        },
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 400
    assert "already has an active pay group assignment" in str(second_response.json())


def test_employee_cannot_access_hr_admin_salary_setup(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/salary-setup/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_salary_setup_returns_configurable_structure_foundation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="monthly-salary",
        name="Monthly Salary Payroll",
        frequency=PayrollFrequency.MONTHLY,
    )
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="salary-staff",
        name="Salary Staff",
        status=PayGroupStatus.ACTIVE,
    )
    basic = SalaryComponent.objects.create(
        tenant=tenant,
        code="basic",
        name="Basic",
        component_type=SalaryComponentType.EARNING,
        value_type=SalaryComponentValueType.PERCENTAGE,
        is_taxable=True,
        is_proratable=True,
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={"basis": "annual_ctc"},
    )
    hra = SalaryComponent.objects.create(
        tenant=tenant,
        code="hra",
        name="House Rent Allowance",
        component_type=SalaryComponentType.EARNING,
        value_type=SalaryComponentValueType.FORMULA,
        formula_ref="hra.india.metro.v1",
        is_taxable=True,
        status=PayrollConfigStatus.ACTIVE,
    )
    structure = SalaryStructure.objects.create(
        tenant=tenant,
        pay_group=pay_group,
        code="staff-standard",
        name="Staff Standard",
        status=PayrollConfigStatus.ACTIVE,
        currency_code="INR",
        config_snapshot={"approval_policy_key": "salary.structure.review.v1"},
    )
    version = SalaryStructureVersion.objects.create(
        tenant=tenant,
        structure=structure,
        version=1,
        effective_from="2026-09-01",
        annual_ctc=Decimal("600000.00"),
        currency_code="INR",
        status=PayrollConfigStatus.ACTIVE,
    )
    SalaryStructureComponent.objects.create(
        tenant=tenant,
        structure_version=version,
        component=basic,
        percentage=Decimal("40.0000"),
        display_order=10,
    )
    SalaryStructureComponent.objects.create(
        tenant=tenant,
        structure_version=version,
        component=hra,
        formula_ref="hra.india.metro.v1",
        display_order=20,
    )
    EmployeeSalaryAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        structure_version=version,
        effective_from="2026-09-01",
        status=PayrollConfigStatus.ACTIVE,
        assignment_reason="Initial payroll setup",
    )

    response = api_client.get("/api/v1/hr-admin/salary-setup/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["summary"]["component_count"] == 2
    assert payload["summary"]["active_structure_count"] == 1
    assert payload["summary"]["assigned_employee_count"] == 1
    assert payload["components"][0]["config_snapshot"] or payload["components"][1]["formula_ref"] == "hra.india.metro.v1"
    assert payload["structures"][0]["config_snapshot"]["approval_policy_key"] == "salary.structure.review.v1"
    assert payload["versions"][0]["annual_ctc"] == "600000.00"
    assert len(payload["structure_components"]) == 2
    assert payload["assignments"][0]["employee_code"] == "EMP-0042"
    assert payload["options"]["component_types"][0]["value"] == SalaryComponentType.EARNING


def test_hr_admin_salary_component_requires_formula_reference_for_formula_value(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/salary-components/",
        {
            "code": "hra-formula",
            "name": "HRA Formula",
            "component_type": SalaryComponentType.EARNING,
            "value_type": SalaryComponentValueType.FORMULA,
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Formula reference is required" in str(response.json())


def test_hr_admin_salary_structure_version_blocks_active_overlap(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    structure = SalaryStructure.objects.create(
        tenant=tenant,
        code="overlap-structure",
        name="Overlap Structure",
        status=PayrollConfigStatus.ACTIVE,
    )

    first_response = api_client.post(
        "/api/v1/hr-admin/salary-structure-versions/",
        {
            "structure_id": str(structure.id),
            "version": 1,
            "effective_from": "2026-09-01",
            "effective_to": "2026-12-31",
            "annual_ctc": "600000.00",
            "currency_code": "INR",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )
    second_response = api_client.post(
        "/api/v1/hr-admin/salary-structure-versions/",
        {
            "structure_id": str(structure.id),
            "version": 2,
            "effective_from": "2026-10-01",
            "annual_ctc": "650000.00",
            "currency_code": "INR",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 400
    assert "overlaps an existing active version" in str(second_response.json())


def test_hr_admin_employee_salary_assignment_blocks_active_overlap(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    structure = SalaryStructure.objects.create(
        tenant=tenant,
        code="assignment-structure",
        name="Assignment Structure",
        status=PayrollConfigStatus.ACTIVE,
    )
    first_version = SalaryStructureVersion.objects.create(
        tenant=tenant,
        structure=structure,
        version=1,
        effective_from="2026-09-01",
        effective_to="2026-12-31",
        annual_ctc=Decimal("600000.00"),
        status=PayrollConfigStatus.ACTIVE,
    )
    second_version = SalaryStructureVersion.objects.create(
        tenant=tenant,
        structure=structure,
        version=2,
        effective_from="2027-01-01",
        annual_ctc=Decimal("720000.00"),
        status=PayrollConfigStatus.ACTIVE,
    )

    first_response = api_client.post(
        "/api/v1/hr-admin/employee-salary-assignments/",
        {
            "employee_id": str(employee.id),
            "structure_version_id": str(first_version.id),
            "effective_from": "2026-09-01",
            "effective_to": "2026-12-31",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )
    second_response = api_client.post(
        "/api/v1/hr-admin/employee-salary-assignments/",
        {
            "employee_id": str(employee.id),
            "structure_version_id": str(second_version.id),
            "effective_from": "2026-10-01",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 400
    assert "already has an active salary assignment" in str(second_response.json())


def test_hr_admin_payroll_statutory_setup_supports_india_pack_component_slab_and_employee_profile(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    pf_salary_component = SalaryComponent.objects.create(
        tenant=tenant,
        code="pf-employee",
        name="PF Employee",
        component_type=SalaryComponentType.DEDUCTION,
        value_type=SalaryComponentValueType.FORMULA,
        formula_ref="india.pf.employee.v1",
        statutory_treatment_ref="india.epf.employee.v1",
        status=PayrollConfigStatus.ACTIVE,
    )

    pack_response = api_client.post(
        "/api/v1/hr-admin/payroll-statutory-packs/",
        {
            "code": "india-fy-2026",
            "name": "India FY 2026 Statutory Pack",
            "country_code": "in",
            "jurisdiction_ref": "country:IN",
            "status": PayrollConfigStatus.ACTIVE,
            "effective_from": "2026-04-01",
            "effective_to": "2027-03-31",
            "currency_code": "INR",
            "statutory_profile_ref": "payroll.statutory.india.fy2026.v1",
            "validation_profile_ref": "payroll.statutory.validation.india.fy2026.v1",
            "config_snapshot": {"country_pack": "india", "financial_year": "2026-27"},
        },
        format="json",
    )
    assert pack_response.status_code == 201, pack_response.json()
    pack_payload = pack_response.json()
    assert pack_payload["country_code"] == "IN"
    assert pack_payload["status"] == PayrollConfigStatus.ACTIVE

    component_response = api_client.post(
        "/api/v1/hr-admin/payroll-statutory-components/",
        {
            "statutory_pack_id": pack_payload["id"],
            "salary_component_id": str(pf_salary_component.id),
            "code": "epf-employee",
            "name": "Employee Provident Fund",
            "statutory_type": PayrollStatutoryComponentKind.PROVIDENT_FUND,
            "contribution_owner": PayrollStatutoryContributionOwner.EMPLOYEE,
            "calculation_method": PayrollStatutoryCalculationMethod.PERCENTAGE,
            "wage_base_ref": "payroll.wage_base.pf_basic.v1",
            "statutory_treatment_ref": "india.epf.employee.v1",
            "registration_ref": "india.epfo.establishment.default.v1",
            "rounding_rule_ref": "payroll.rounding.nearest_rupee.v1",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )
    assert component_response.status_code == 201, component_response.json()
    component_payload = component_response.json()
    assert component_payload["statutory_type"] == PayrollStatutoryComponentKind.PROVIDENT_FUND
    assert component_payload["salary_component_name"] == "PF Employee"

    slab_response = api_client.post(
        "/api/v1/hr-admin/payroll-statutory-slabs/",
        {
            "statutory_component_id": component_payload["id"],
            "code": "pf-12-percent-ceiling",
            "name": "PF 12 Percent With Wage Ceiling",
            "slab_order": 10,
            "effective_from": "2026-04-01",
            "min_amount": "0.00",
            "max_amount": None,
            "employee_rate_percent": "12.0000",
            "employer_rate_percent": "12.0000",
            "wage_ceiling_amount": "15000.00",
            "state_code": "mh",
            "applicability_profile_ref": "india.epf.standard.v1",
            "status": PayrollConfigStatus.ACTIVE,
        },
        format="json",
    )
    assert slab_response.status_code == 201, slab_response.json()
    slab_payload = slab_response.json()
    assert slab_payload["state_code"] == "MH"
    assert slab_payload["employee_rate_percent"] == "12.0000"
    assert slab_payload["wage_ceiling_amount"] == "15000.00"

    employee_profile_response = api_client.post(
        "/api/v1/hr-admin/employee-statutory-profiles/",
        {
            "employee_id": str(employee.id),
            "statutory_pack_id": pack_payload["id"],
            "profile_ref": "payroll.employee_statutory.india.standard.v1",
            "effective_from": "2026-09-01",
            "pan_number": "abcde1234f",
            "uan_number": "123456789012",
            "pf_number": "MH/BAN/12345/678",
            "pf_applicable": True,
            "esi_applicable": False,
            "professional_tax_state": "mh",
            "lwf_state": "mh",
            "tax_regime": PayrollTaxRegime.NEW,
            "declaration_status": PayrollDeclarationStatus.DECLARED,
            "previous_employment_income": "120000.00",
            "previous_employment_tax_deducted": "8000.00",
            "source_ref": "employee.tax.declaration:2026",
            "config_snapshot": {"proof_window_ref": "india.tax.proofs.fy2026.v1"},
        },
        format="json",
    )
    assert employee_profile_response.status_code == 201, employee_profile_response.json()
    employee_profile_payload = employee_profile_response.json()
    assert employee_profile_payload["employee_code"] == "EMP-0042"
    assert employee_profile_payload["pan_number"] == "ABCDE1234F"
    assert employee_profile_payload["professional_tax_state"] == "MH"
    assert employee_profile_payload["tax_regime"] == PayrollTaxRegime.NEW
    assert len(employee_profile_payload["source_hash"]) == 64

    setup_response = api_client.get("/api/v1/hr-admin/payroll-statutory-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["pack_count"] == 1
    assert setup_payload["summary"]["active_statutory_component_count"] == 1
    assert setup_payload["summary"]["slab_count"] == 1
    assert setup_payload["summary"]["pf_applicable_employee_count"] == 1
    assert setup_payload["packs"][0]["component_count"] == 1
    assert setup_payload["statutory_components"][0]["slab_count"] == 1
    assert setup_payload["employee_profiles"][0]["config_snapshot"]["proof_window_ref"] == "india.tax.proofs.fy2026.v1"
    assert setup_payload["options"]["statutory_component_types"][0]["value"] == PayrollStatutoryComponentKind.PROVIDENT_FUND

    assert PayrollStatutoryPack.objects.filter(tenant=tenant, code="india-fy-2026").exists()
    assert PayrollStatutoryComponent.objects.filter(tenant=tenant, code="epf-employee").exists()
    assert PayrollStatutorySlab.objects.filter(tenant=tenant, code="pf-12-percent-ceiling").exists()
    assert EmployeeStatutoryProfile.objects.filter(tenant=tenant, employee=employee, pan_number="ABCDE1234F").exists()


def test_hr_admin_payroll_statutory_setup_supports_employer_registrations_and_filing_calendar(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    legal_entity = LegalEntity.objects.filter(tenant=tenant).first()
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-registration-pack-2026",
        name="India Registration Pack 2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
        jurisdiction_ref="country:IN/state:MH",
    )
    component = PayrollStatutoryComponent.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        code="pt-mh-registration",
        name="Maharashtra Professional Tax",
        statutory_type=PayrollStatutoryComponentKind.PROFESSIONAL_TAX,
        contribution_owner=PayrollStatutoryContributionOwner.EMPLOYEE,
        calculation_method=PayrollStatutoryCalculationMethod.SLAB,
        wage_base_ref="payroll.wage_base.gross_monthly.v1",
        statutory_treatment_ref="india.professional_tax.mh.v1",
        status=PayrollConfigStatus.ACTIVE,
    )

    registration_response = api_client.post(
        "/api/v1/hr-admin/payroll-statutory-employer-registrations/",
        {
            "statutory_pack_id": str(pack.id),
            "statutory_component_id": str(component.id),
            "legal_entity_id": str(legal_entity.id) if legal_entity else None,
            "code": "mh-pt-main-registration",
            "name": "Maharashtra PT Main Registration",
            "registration_type_ref": "india.professional_tax.maharashtra.ptrc",
            "registration_number": "ptrc/mah/99881",
            "employer_identifier": "tan-mum-4455",
            "filing_authority_ref": "maharashtra-pt-department",
            "provider_ref": "clear-statutory",
            "effective_from": "2026-04-01",
            "source_ref": "tenant-onboarding:statutory-registration",
            "config_snapshot": {"portal_profile_ref": "mh.pt.portal.default.v1"},
        },
        format="json",
    )
    assert registration_response.status_code == 201, registration_response.json()
    registration_payload = registration_response.json()
    assert registration_payload["registration_number"] == "PTRC/MAH/99881"
    assert registration_payload["employer_identifier"] == "TAN-MUM-4455"
    assert registration_payload["jurisdiction_ref"] == "country:IN/state:MH"
    assert registration_payload["filing_authority_ref"] == "maharashtra-pt-department"
    assert len(registration_payload["source_hash"]) == 64

    filing_response = api_client.post(
        "/api/v1/hr-admin/payroll-statutory-filing-calendars/",
        {
            "employer_registration_id": registration_payload["id"],
            "code": "mh-pt-aug-2026-return",
            "name": "Maharashtra PT August 2026 Return",
            "filing_type_ref": "india.professional_tax.maharashtra.monthly_return",
            "filing_frequency": PayrollFrequency.MONTHLY,
            "period_start": "2026-08-01",
            "period_end": "2026-08-31",
            "due_date": "2026-09-20",
            "grace_due_date": "2026-09-25",
            "filing_window_start": "2026-09-01",
            "filing_window_end": "2026-09-25",
            "status": PayrollStatutoryFilingStatus.UPCOMING,
            "output_profile_ref": "india.pt.mh.return.file.v1",
            "source_ref": "statutory-calendar-seed:fy2026",
            "config_snapshot": {"challan_profile_ref": "india.pt.mh.challan.v1"},
        },
        format="json",
    )
    assert filing_response.status_code == 201, filing_response.json()
    filing_payload = filing_response.json()
    assert filing_payload["statutory_pack_id"] == str(pack.id)
    assert filing_payload["statutory_component_id"] == str(component.id)
    assert filing_payload["employer_registration_number"] == "PTRC/MAH/99881"
    assert filing_payload["filing_authority_ref"] == "maharashtra-pt-department"
    assert filing_payload["provider_ref"] == "clear-statutory"
    assert filing_payload["days_until_due"] is not None
    assert filing_payload["is_due"] is False

    setup_response = api_client.get("/api/v1/hr-admin/payroll-statutory-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["employer_registration_count"] == 1
    assert setup_payload["summary"]["active_employer_registration_count"] == 1
    assert setup_payload["summary"]["filing_calendar_count"] == 1
    assert setup_payload["summary"]["acknowledged_filing_calendar_count"] == 0
    assert setup_payload["employer_registrations"][0]["open_filing_calendar_count"] == 1
    assert setup_payload["filing_calendars"][0]["output_profile_ref"] == "india.pt.mh.return.file.v1"
    assert setup_payload["options"]["statutory_filing_statuses"][0]["value"] == PayrollStatutoryFilingStatus.DRAFT
    assert setup_payload["options"]["payroll_frequencies"][0]["value"] == PayrollFrequency.MONTHLY
    assert setup_payload["options"]["legal_entities"]

    assert PayrollStatutoryEmployerRegistration.objects.filter(tenant=tenant, code="mh-pt-main-registration").exists()
    assert PayrollStatutoryFilingCalendar.objects.filter(tenant=tenant, code="mh-pt-aug-2026-return").exists()


def test_hr_admin_employee_statutory_profile_requires_uan_when_pf_applicable(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")

    response = api_client.post(
        "/api/v1/hr-admin/employee-statutory-profiles/",
        {
            "employee_id": str(employee.id),
            "effective_from": "2026-09-01",
            "pan_number": "ABCDE1234F",
            "pf_applicable": True,
            "tax_regime": PayrollTaxRegime.NEW,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "UAN number is required" in str(response.json())
    assert EmployeeStatutoryProfile.objects.count() == 0


def test_employee_cannot_access_hr_admin_payroll_statutory_setup(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-statutory-setup/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_employee_statutory_declaration_proof_workflow(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-declaration-2026",
        name="India Tax Declaration 2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
    )

    declaration_response = api_client.post(
        "/api/v1/hr-admin/employee-statutory-declarations/",
        {
            "employee_id": str(employee.id),
            "employee_statutory_profile_id": str(profile.id),
            "financial_year_code": "fy2026-27",
            "declaration_profile_ref": "india.tax.declaration.fy2026.v1",
            "proof_window_ref": "india.tax.proof-window.fy2026.v1",
            "tax_regime": PayrollTaxRegime.OLD,
            "source_ref": "employee.tax.declaration:EMP-0042:fy2026",
            "config_snapshot": {"submission_channel_ref": "hr_admin.seeded.v1"},
        },
        format="json",
    )
    assert declaration_response.status_code == 201, declaration_response.json()
    declaration_payload = declaration_response.json()
    declaration_id = declaration_payload["id"]
    assert declaration_payload["financial_year_code"] == "FY2026-27"
    assert declaration_payload["status"] == PayrollStatutoryDeclarationStatus.DRAFT
    assert len(declaration_payload["source_hash"]) == 64

    item_response = api_client.post(
        f"/api/v1/hr-admin/employee-statutory-declarations/{declaration_id}/items/",
        {
            "item_kind": PayrollStatutoryDeclarationItemKind.INVESTMENT,
            "section_code": "80c",
            "component_code": "lic",
            "name": "Life Insurance Premium",
            "declared_amount": "60000.00",
            "proof_status": PayrollStatutoryProofStatus.SUBMITTED,
            "proof_document_ref": "employee-document:lic-premium-fy2026",
            "source_ref": "tax-proof:EMP-0042:lic",
            "config_snapshot": {"proof_type_ref": "insurance.receipt.v1"},
        },
        format="json",
    )
    assert item_response.status_code == 201, item_response.json()
    item_payload = item_response.json()
    item_id = item_payload["id"]
    assert item_payload["section_code"] == "80C"
    assert item_payload["component_code"] == "LIC"
    assert item_payload["proof_status"] == PayrollStatutoryProofStatus.SUBMITTED
    assert item_payload["proof_submitted_at"] is not None
    assert len(item_payload["source_hash"]) == 64

    exemption_response = api_client.post(
        f"/api/v1/hr-admin/employee-statutory-declarations/{declaration_id}/items/",
        {
            "item_kind": PayrollStatutoryDeclarationItemKind.EXEMPTION,
            "section_code": "hra",
            "component_code": "rent",
            "name": "House Rent Exemption",
            "declared_amount": "120000.00",
            "verified_amount": "120000.00",
            "proof_status": PayrollStatutoryProofStatus.NOT_REQUIRED,
            "source_ref": "tax-proof:EMP-0042:rent",
        },
        format="json",
    )
    assert exemption_response.status_code == 201, exemption_response.json()

    item_verify_response = api_client.post(
        f"/api/v1/hr-admin/employee-statutory-declaration-items/{item_id}/verify/",
        {"verified_amount": "55000.00"},
        format="json",
    )
    assert item_verify_response.status_code == 200, item_verify_response.json()
    assert item_verify_response.json()["proof_status"] == PayrollStatutoryProofStatus.VERIFIED
    assert item_verify_response.json()["verified_amount"] == "55000.00"

    submit_response = api_client.post(f"/api/v1/hr-admin/employee-statutory-declarations/{declaration_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    assert submit_response.json()["status"] == PayrollStatutoryDeclarationStatus.SUBMITTED
    assert submit_response.json()["declared_total_amount"] == "180000.00"
    profile.refresh_from_db()
    assert profile.declaration_status == PayrollDeclarationStatus.PROOFS_PENDING

    verify_response = api_client.post(f"/api/v1/hr-admin/employee-statutory-declarations/{declaration_id}/verify/", {}, format="json")
    assert verify_response.status_code == 200, verify_response.json()
    assert verify_response.json()["status"] == PayrollStatutoryDeclarationStatus.VERIFIED
    assert verify_response.json()["verified_total_amount"] == "175000.00"
    profile.refresh_from_db()
    assert profile.declaration_status == PayrollDeclarationStatus.VERIFIED

    lock_response = api_client.post(f"/api/v1/hr-admin/employee-statutory-declarations/{declaration_id}/lock/", {}, format="json")
    assert lock_response.status_code == 200, lock_response.json()
    assert lock_response.json()["status"] == PayrollStatutoryDeclarationStatus.LOCKED
    profile.refresh_from_db()
    assert profile.declaration_status == PayrollDeclarationStatus.LOCKED

    locked_edit_response = api_client.patch(
        f"/api/v1/hr-admin/employee-statutory-declaration-items/{item_id}/",
        {"declared_amount": "70000.00"},
        format="json",
    )
    assert locked_edit_response.status_code == 400
    assert "Locked statutory declarations cannot be edited" in str(locked_edit_response.json())

    setup_response = api_client.get("/api/v1/hr-admin/payroll-statutory-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["declaration_count"] == 1
    assert setup_payload["summary"]["locked_declaration_count"] == 1
    assert setup_payload["summary"]["declaration_item_count"] == 2
    assert setup_payload["declarations"][0]["verified_total_amount"] == "175000.00"
    assert setup_payload["declaration_items"][0]["employee_code"] == "EMP-0042"
    assert setup_payload["options"]["statutory_proof_statuses"][0]["value"] == PayrollStatutoryProofStatus.NOT_REQUIRED
    assert EmployeeStatutoryDeclaration.objects.filter(tenant=tenant, employee=employee, status=PayrollStatutoryDeclarationStatus.LOCKED).exists()
    assert EmployeeStatutoryDeclarationItem.objects.filter(tenant=tenant, declaration_id=declaration_id).count() == 2


def test_employee_statutory_declarations_returns_only_current_employee(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    other_employee = Employee.objects.filter(tenant=tenant).exclude(id=employee.id).order_by("employee_code").first()
    assert other_employee is not None
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-declarations-fy2026",
        name="India Tax Declarations FY2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
        declaration_status=PayrollDeclarationStatus.VERIFIED,
        source_ref="employee.tax.profile:EMP-0042:fy2026",
    )
    other_profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=other_employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="PQRST1234F",
        tax_regime=PayrollTaxRegime.NEW,
        declaration_status=PayrollDeclarationStatus.DECLARED,
    )
    declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=employee,
        employee_statutory_profile=profile,
        statutory_pack=pack,
        financial_year_code="FY2026-27",
        declaration_profile_ref="india.tax.declaration.fy2026.v1",
        proof_window_ref="india.tax.proof-window.fy2026.v1",
        status=PayrollStatutoryDeclarationStatus.VERIFIED,
        tax_regime=PayrollTaxRegime.OLD,
        declared_total_amount=Decimal("180000.00"),
        verified_total_amount=Decimal("175000.00"),
        submitted_at=timezone.now() - timedelta(days=2),
        verified_at=timezone.now() - timedelta(days=1),
        source_ref="employee.tax.declaration:EMP-0042:fy2026",
    )
    EmployeeStatutoryDeclarationItem.objects.create(
        tenant=tenant,
        declaration=declaration,
        employee=employee,
        item_kind=PayrollStatutoryDeclarationItemKind.INVESTMENT,
        section_code="80c",
        component_code="lic",
        name="Life Insurance Premium",
        declared_amount=Decimal("60000.00"),
        verified_amount=Decimal("55000.00"),
        proof_status=PayrollStatutoryProofStatus.VERIFIED,
        proof_document_ref="employee-document:lic-premium-fy2026",
        proof_submitted_at=timezone.now() - timedelta(days=2),
        verified_at=timezone.now() - timedelta(days=1),
        source_ref="tax-proof:EMP-0042:lic",
    )
    other_declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=other_employee,
        employee_statutory_profile=other_profile,
        statutory_pack=pack,
        financial_year_code="FY2026-27",
        status=PayrollStatutoryDeclarationStatus.SUBMITTED,
        tax_regime=PayrollTaxRegime.NEW,
        declared_total_amount=Decimal("50000.00"),
        submitted_at=timezone.now() - timedelta(days=1),
        source_ref=f"employee.tax.declaration:{other_employee.employee_code}:fy2026",
    )
    EmployeeStatutoryDeclarationItem.objects.create(
        tenant=tenant,
        declaration=other_declaration,
        employee=other_employee,
        section_code="80c",
        name="Other Employee Proof",
        declared_amount=Decimal("50000.00"),
        proof_status=PayrollStatutoryProofStatus.SUBMITTED,
        proof_document_ref="employee-document:other-proof-fy2026",
    )

    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.get("/api/v1/me/statutory-declarations/?q=Life&page=1&page_size=5")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["summary"]["declaration_count"] == 1
    assert payload["summary"]["verified_declaration_count"] == 1
    assert payload["summary"]["verified_item_count"] == 1
    assert payload["summary"]["declared_total_amount"] == "180000.00"
    assert payload["profile"]["employee_code"] == "EMP-0042"
    assert payload["items"][0]["financial_year_code"] == "FY2026-27"
    assert payload["items"][0]["items"][0]["name"] == "Life Insurance Premium"
    assert "Other Employee Proof" not in str(payload)


def test_employee_can_create_update_and_submit_own_statutory_declaration(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-ess-fy2027",
        name="India Tax ESS FY2027",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2027-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2027-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
        source_ref="employee.tax.profile:EMP-0042:fy2027",
    )

    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    create_response = api_client.post(
        "/api/v1/me/statutory-declarations/",
        {
            "employee_statutory_profile_id": str(profile.id),
            "financial_year_code": "fy2027-28",
            "declaration_profile_ref": "india.tax.declaration.employee-editable.v1",
            "proof_window_ref": "tenant.proof-window.fy2027.q4",
            "tax_regime": PayrollTaxRegime.OLD,
            "config_snapshot": {"submission_policy_ref": "employee.tax.proof.self-service.v1"},
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    declaration_payload = create_response.json()
    assert declaration_payload["financial_year_code"] == "FY2027-28"
    assert declaration_payload["status"] == PayrollStatutoryDeclarationStatus.DRAFT
    declaration_id = declaration_payload["id"]

    item_response = api_client.post(
        f"/api/v1/me/statutory-declarations/{declaration_id}/items/",
        {
            "item_kind": PayrollStatutoryDeclarationItemKind.INVESTMENT,
            "section_code": "80c",
            "component_code": "lic",
            "name": "Life Insurance Premium",
            "declared_amount": "60000.00",
            "proof_document_ref": "employee-document:lic-premium-fy2027",
            "config_snapshot": {"proof_category_ref": "tax.investment.80c"},
        },
        format="json",
    )
    assert item_response.status_code == 201, item_response.json()
    item_payload = item_response.json()
    assert item_payload["proof_status"] == PayrollStatutoryProofStatus.SUBMITTED
    assert item_payload["proof_submitted_at"] is not None
    assert item_payload["section_code"] == "80C"
    item_id = item_payload["id"]

    patch_response = api_client.patch(
        f"/api/v1/me/statutory-declaration-items/{item_id}/",
        {"declared_amount": "65000.00"},
        format="json",
    )
    assert patch_response.status_code == 200, patch_response.json()
    assert patch_response.json()["declared_amount"] == "65000.00"
    assert patch_response.json()["verified_amount"] == "0.00"

    submit_response = api_client.post(f"/api/v1/me/statutory-declarations/{declaration_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    submitted_payload = submit_response.json()
    assert submitted_payload["status"] == PayrollStatutoryDeclarationStatus.SUBMITTED
    assert submitted_payload["declared_total_amount"] == "65000.00"
    profile.refresh_from_db()
    assert profile.declaration_status == PayrollDeclarationStatus.PROOFS_PENDING
    declaration = EmployeeStatutoryDeclaration.objects.get(id=declaration_id)
    assert declaration.submitted_by.username == "riya.sharma"


def test_employee_statutory_declaration_proof_upload_creates_document_and_links_item(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="employee-statutory-proof-upload",
        name="Employee Statutory Proof Upload",
        category_type=DocumentCategoryType.TAX,
        requires_verification=True,
        allow_employee_upload=True,
        allow_multiple_files=True,
        is_active=True,
        visibility_rules={"statutory_proof": True},
    )
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-upload-fy2027",
        name="India Tax Upload FY2027",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2027-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2027-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
    )
    declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=employee,
        employee_statutory_profile=profile,
        statutory_pack=pack,
        financial_year_code="FY2027-28",
        tax_regime=PayrollTaxRegime.OLD,
    )

    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.post(
        f"/api/v1/me/statutory-declarations/{declaration.id}/proof-upload/",
        {
            "category_id": str(category.id),
            "item_kind": PayrollStatutoryDeclarationItemKind.INVESTMENT,
            "section_code": "80c",
            "component_code": "elss",
            "name": "ELSS Investment",
            "declared_amount": "70000.00",
            "file": SimpleUploadedFile("elss-proof.pdf", b"%PDF-1.4 statutory proof upload\n", content_type="application/pdf"),
        },
        format="multipart",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    item_payload = payload["item"]
    document_payload = payload["document"]
    document = EmployeeDocument.objects.get(id=document_payload["id"])
    declaration_item = EmployeeStatutoryDeclarationItem.objects.get(id=item_payload["id"])

    assert document.employee == employee
    assert document.category == category
    assert document.artifact_id
    assert document_payload["verification_status"] == VerificationStatus.PENDING
    assert item_payload["proof_status"] == PayrollStatutoryProofStatus.SUBMITTED
    assert item_payload["proof_document_ref"] == f"employee-document:{document.id}"
    assert item_payload["proof_artifact_key"] == str(document.artifact_id)
    assert declaration_item.proof_document_ref == f"employee-document:{document.id}"
    assert declaration_item.config_snapshot["proof_upload_surface_ref"] == "ess.statutory-declarations"


def test_employee_statutory_declaration_write_scope_and_lock_guards(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    other_employee = Employee.objects.filter(tenant=tenant).exclude(id=employee.id).order_by("employee_code").first()
    assert other_employee is not None
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-ess-guard-fy2027",
        name="India Tax ESS Guard FY2027",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2027-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2027-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
    )
    other_profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=other_employee,
        statutory_pack=pack,
        effective_from="2027-04-01",
        pan_number="PQRST1234F",
        tax_regime=PayrollTaxRegime.NEW,
    )
    other_declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=other_employee,
        employee_statutory_profile=other_profile,
        statutory_pack=pack,
        financial_year_code="FY2027-28",
        tax_regime=PayrollTaxRegime.NEW,
    )
    locked_declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=employee,
        employee_statutory_profile=profile,
        statutory_pack=pack,
        financial_year_code="FY2027-28",
        declaration_profile_ref="employee.locked.guard.v1",
        status=PayrollStatutoryDeclarationStatus.LOCKED,
        tax_regime=PayrollTaxRegime.OLD,
        submitted_at=timezone.now() - timedelta(days=3),
        verified_at=timezone.now() - timedelta(days=2),
        locked_at=timezone.now() - timedelta(days=1),
    )

    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    other_patch = api_client.patch(
        f"/api/v1/me/statutory-declarations/{other_declaration.id}/",
        {"tax_regime": PayrollTaxRegime.OLD},
        format="json",
    )
    assert other_patch.status_code == 404

    locked_patch = api_client.patch(
        f"/api/v1/me/statutory-declarations/{locked_declaration.id}/",
        {"tax_regime": PayrollTaxRegime.NEW},
        format="json",
    )
    assert locked_patch.status_code == 400
    assert "Only draft or rejected statutory declarations can be edited by employees" in str(locked_patch.json())


def test_hr_admin_employee_statutory_declaration_rejection_requires_reason(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tax-reject-2026",
        name="India Tax Reject 2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.NEW,
    )
    declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=employee,
        employee_statutory_profile=profile,
        statutory_pack=pack,
        financial_year_code="FY2026-27",
        tax_regime=PayrollTaxRegime.NEW,
    )
    EmployeeStatutoryDeclarationItem.objects.create(
        tenant=tenant,
        declaration=declaration,
        employee=employee,
        item_kind=PayrollStatutoryDeclarationItemKind.DEDUCTION,
        section_code="80D",
        component_code="MEDICAL",
        name="Medical Insurance",
        declared_amount="25000.00",
        proof_status=PayrollStatutoryProofStatus.SUBMITTED,
        proof_document_ref="employee-document:medical-fy2026",
    )
    submit_response = api_client.post(f"/api/v1/hr-admin/employee-statutory-declarations/{declaration.id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()

    missing_reason_response = api_client.post(
        f"/api/v1/hr-admin/employee-statutory-declarations/{declaration.id}/reject/",
        {"reason": ""},
        format="json",
    )
    assert missing_reason_response.status_code == 400

    reject_response = api_client.post(
        f"/api/v1/hr-admin/employee-statutory-declarations/{declaration.id}/reject/",
        {"reason": "Medical insurance proof is not readable."},
        format="json",
    )
    assert reject_response.status_code == 200, reject_response.json()
    assert reject_response.json()["status"] == PayrollStatutoryDeclarationStatus.REJECTED
    assert reject_response.json()["rejection_reason"] == "Medical insurance proof is not readable."
    profile.refresh_from_db()
    assert profile.declaration_status == PayrollDeclarationStatus.PROOFS_PENDING


def test_employee_cannot_access_hr_admin_payroll_input_snapshot_setup(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-input-snapshot-setup/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_can_create_and_lock_payroll_input_snapshots(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="snapshot-monthly",
        name="Snapshot Monthly",
        frequency=PayrollFrequency.MONTHLY,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="snapshot-sep-2026",
        name="Snapshot September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="snapshot-staff",
        name="Snapshot Staff",
        status=PayGroupStatus.ACTIVE,
    )
    pay_group_assignment = PayGroupAssignment.objects.create(
        tenant=tenant,
        pay_group=pay_group,
        employee=employee,
        effective_from="2026-09-01",
        status=PayGroupStatus.ACTIVE,
    )
    structure = SalaryStructure.objects.create(
        tenant=tenant,
        pay_group=pay_group,
        code="snapshot-structure",
        name="Snapshot Structure",
        status=PayrollConfigStatus.ACTIVE,
    )
    version = SalaryStructureVersion.objects.create(
        tenant=tenant,
        structure=structure,
        version=1,
        effective_from="2026-09-01",
        annual_ctc=Decimal("600000.00"),
        status=PayrollConfigStatus.ACTIVE,
    )
    salary_assignment = EmployeeSalaryAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        structure_version=version,
        effective_from="2026-09-01",
        status=PayrollConfigStatus.ACTIVE,
    )

    run_response = api_client.post(
        "/api/v1/hr-admin/payroll-runs/",
        {
            "period_id": str(period.id),
            "pay_group_id": str(pay_group.id),
            "code": "snapshot-run-sep-2026",
            "name": "Snapshot Run September 2026",
            "status": PayrollRunStatus.COLLECTING_INPUTS,
            "input_profile_ref": "india.monthly.input.profile.v1",
            "snapshot_schema_ref": "payroll.input.snapshot.v1",
            "config_snapshot": {"collection_policy_ref": "payroll.collection.default.v1"},
        },
        format="json",
    )
    assert run_response.status_code == 201, run_response.json()
    payroll_run_id = run_response.json()["id"]

    snapshot_response = api_client.post(
        "/api/v1/hr-admin/payroll-input-snapshots/",
        {
            "payroll_run_id": payroll_run_id,
            "employee_id": str(employee.id),
            "pay_group_assignment_id": str(pay_group_assignment.id),
            "salary_assignment_id": str(salary_assignment.id),
            "snapshot_status": PayrollInputSnapshotStatus.READY,
            "input_profile_ref": "india.monthly.input.profile.v1",
            "employee_snapshot": {"employee_code": employee.employee_code, "employment_status": employee.employment_status},
            "organization_snapshot": {"legal_entity": employee.legal_entity.name if employee.legal_entity else None},
            "salary_snapshot": {"structure": structure.code, "annual_ctc": "600000.00"},
            "attendance_snapshot": {"present_days": 22, "source_policy_ref": "attendance.monthly.v1"},
            "leave_snapshot": {"paid_leave_days": 1},
            "lifecycle_snapshot": {"joiner": False, "exit": False},
            "document_snapshot": {"missing_required_count": 0},
            "banking_snapshot": {"primary_account": True},
            "validation_snapshot": {"blockers": [], "warnings": ["Review overtime import before calculation"]},
        },
        format="json",
    )
    assert snapshot_response.status_code == 201, snapshot_response.json()
    snapshot_payload = snapshot_response.json()
    assert snapshot_payload["period_start"] == "2026-09-01"
    assert snapshot_payload["pay_group_name"] == "Snapshot Staff"
    assert snapshot_payload["salary_structure_name"] == "Snapshot Structure"
    assert snapshot_payload["source_hash"]
    assert snapshot_payload["warnings"] == ["Review overtime import before calculation"]

    setup_response = api_client.get("/api/v1/hr-admin/payroll-input-snapshot-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["run_count"] == 1
    assert setup_payload["summary"]["snapshot_count"] == 1
    assert setup_payload["runs"][0]["input_profile_ref"] == "india.monthly.input.profile.v1"
    assert setup_payload["snapshots"][0]["employee_code"] == "EMP-0042"

    lock_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run_id}/lock-inputs/")
    assert lock_response.status_code == 200, lock_response.json()
    lock_payload = lock_response.json()
    assert lock_payload["locked_count"] == 1
    assert lock_payload["payroll_run"]["status"] == PayrollRunStatus.INPUTS_LOCKED
    assert lock_payload["payroll_run"]["locked_count"] == 1

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/payroll-input-snapshots/{snapshot_payload['id']}/",
        {"employee_snapshot": {"employee_code": employee.employee_code, "employment_status": EmploymentStatus.INACTIVE}},
        format="json",
    )
    assert patch_response.status_code == 400
    assert "immutable" in str(patch_response.json()).lower()


def test_hr_admin_payroll_input_lock_blocks_on_blocked_snapshot(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="blocked-snapshot-monthly",
        name="Blocked Snapshot Monthly",
        frequency=PayrollFrequency.MONTHLY,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="blocked-snapshot-sep-2026",
        name="Blocked Snapshot September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="blocked-snapshot-run",
        name="Blocked Snapshot Run",
        status=PayrollRunStatus.COLLECTING_INPUTS,
    )
    PayrollInputSnapshot.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        snapshot_status=PayrollInputSnapshotStatus.BLOCKED,
        validation_snapshot={"blockers": ["Missing primary bank account"], "warnings": []},
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/lock-inputs/")

    assert response.status_code == 400
    assert response.json()["blocked_count"] == 1
    payroll_run.refresh_from_db()
    assert payroll_run.status == PayrollRunStatus.COLLECTING_INPUTS


def test_employee_cannot_access_hr_admin_payroll_rules_setup(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/payroll-rules-setup/")

    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have access to this workspace."


def test_hr_admin_payroll_rules_setup_returns_formula_catalog(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    rule = PayrollRuleDefinition.objects.create(
        tenant=tenant,
        code="basic-pay",
        name="Basic Pay",
        rule_type=PayrollRuleType.FORMULA,
        tags=["salary", "monthly"],
        config_snapshot={"owner": "payroll"},
    )
    PayrollRuleVersion.objects.create(
        tenant=tenant,
        rule=rule,
        version=1,
        status=PayrollRuleVersionStatus.ACTIVE,
        expression_language=PayrollExpressionLanguage.SAFE_EXPR_V1,
        expression="round_decimal(salary.annual_ctc * 0.40 / 12, 2)",
        effective_from="2026-09-01",
        input_schema={"required": ["salary.annual_ctc"]},
        output_schema={"type": "decimal"},
    )

    response = api_client.get("/api/v1/hr-admin/payroll-rules-setup/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["summary"]["rule_count"] == 1
    assert payload["summary"]["active_version_count"] == 1
    assert payload["rules"][0]["code"] == "basic-pay"
    assert payload["rules"][0]["tags"] == ["salary", "monthly"]
    assert payload["versions"][0]["expression"] == "round_decimal(salary.annual_ctc * 0.40 / 12, 2)"
    assert payload["options"]["rule_types"][0]["value"] == PayrollRuleType.FORMULA


def test_hr_admin_payroll_rule_preview_evaluates_safe_expression(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    rule = PayrollRuleDefinition.objects.create(
        tenant=tenant,
        code="hra",
        name="House Rent Allowance",
        rule_type=PayrollRuleType.FORMULA,
    )
    version = PayrollRuleVersion.objects.create(
        tenant=tenant,
        rule=rule,
        version=1,
        status=PayrollRuleVersionStatus.ACTIVE,
        expression="round_decimal(min(salary.basic_monthly * 0.50, salary.annual_ctc * 0.20 / 12), 2)",
        effective_from="2026-09-01",
    )

    response = api_client.post(
        f"/api/v1/hr-admin/payroll-rule-versions/{version.id}/evaluate/",
        {
            "persist": False,
            "context": {
                "salary": {
                    "annual_ctc": "600000.00",
                    "basic_monthly": "20000.00",
                }
            },
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["result"] == "10000.00"
    assert payload["evaluation"] is None
    assert "salary.annual_ctc" in payload["dependencies"]
    assert "salary.basic_monthly" in payload["dependencies"]


def test_hr_admin_payroll_rule_preview_rejects_unsafe_expression(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    rule = PayrollRuleDefinition.objects.create(
        tenant=tenant,
        code="unsafe",
        name="Unsafe",
        rule_type=PayrollRuleType.FORMULA,
    )
    version = PayrollRuleVersion.objects.create(
        tenant=tenant,
        rule=rule,
        version=1,
        status=PayrollRuleVersionStatus.DRAFT,
        expression="__import__('os').system('date')",
        effective_from="2026-09-01",
    )

    response = api_client.post(
        f"/api/v1/hr-admin/payroll-rule-versions/{version.id}/evaluate/",
        {"persist": False, "context": {"salary": {"annual_ctc": "600000.00"}}},
        format="json",
    )

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"]


def test_hr_admin_payroll_rule_version_blocks_active_overlap(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    rule = PayrollRuleDefinition.objects.create(
        tenant=tenant,
        code="overlap-formula",
        name="Overlap Formula",
        rule_type=PayrollRuleType.FORMULA,
    )

    first_response = api_client.post(
        "/api/v1/hr-admin/payroll-rule-versions/",
        {
            "rule_id": str(rule.id),
            "version": 1,
            "status": PayrollRuleVersionStatus.ACTIVE,
            "expression": "salary.annual_ctc / 12",
            "effective_from": "2026-09-01",
            "effective_to": "2026-12-31",
        },
        format="json",
    )
    second_response = api_client.post(
        "/api/v1/hr-admin/payroll-rule-versions/",
        {
            "rule_id": str(rule.id),
            "version": 2,
            "status": PayrollRuleVersionStatus.ACTIVE,
            "expression": "salary.annual_ctc / 12",
            "effective_from": "2026-10-01",
        },
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 400
    assert "overlaps an existing active version" in str(second_response.json())


def test_hr_admin_payroll_rule_preview_persists_locked_snapshot_trace(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="rule-snapshot-monthly",
        name="Rule Snapshot Monthly",
        frequency=PayrollFrequency.MONTHLY,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="rule-snapshot-sep-2026",
        name="Rule Snapshot September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="rule-snapshot-run",
        name="Rule Snapshot Run",
        status=PayrollRunStatus.INPUTS_LOCKED,
    )
    snapshot = PayrollInputSnapshot.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        snapshot_status=PayrollInputSnapshotStatus.LOCKED,
        salary_snapshot={"annual_ctc": "600000.00", "basic_percentage": "0.40"},
        attendance_snapshot={"paid_days": "30", "period_days": "30"},
        validation_snapshot={"blockers": [], "warnings": []},
    )
    rule = PayrollRuleDefinition.objects.create(
        tenant=tenant,
        code="locked-basic",
        name="Locked Basic",
        rule_type=PayrollRuleType.FORMULA,
    )
    version = PayrollRuleVersion.objects.create(
        tenant=tenant,
        rule=rule,
        version=1,
        status=PayrollRuleVersionStatus.ACTIVE,
        expression="round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)",
        effective_from="2026-09-01",
    )

    response = api_client.post(
        f"/api/v1/hr-admin/payroll-rule-versions/{version.id}/evaluate/",
        {"input_snapshot_id": str(snapshot.id), "persist": True},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["result"] == "20000.00"
    assert payload["evaluation"]["employee_code"] == "EMP-0042"
    assert payload["evaluation"]["result_snapshot"]["result"] == "20000.00"
    assert PayrollRuleEvaluation.objects.filter(rule_version=version, input_snapshot=snapshot).count() == 1


def create_calculable_payroll_run(*, tenant, employee):
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="calc-monthly",
        name="Calculation Monthly",
        frequency=PayrollFrequency.MONTHLY,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="calc-sep-2026",
        name="Calculation September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="calc-run-sep-2026",
        name="Calculation Run September 2026",
        status=PayrollRunStatus.INPUTS_LOCKED,
        config_snapshot={
            "calculation_profile_ref": "india.monthly.calc.profile.v1",
            "calculation_profile": {
                "rule_codes": ["calc-basic", "calc-hra", "calc-pf"],
            },
        },
    )
    snapshot = PayrollInputSnapshot.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        snapshot_status=PayrollInputSnapshotStatus.LOCKED,
        salary_snapshot={"annual_ctc": "600000.00", "basic_percentage": "0.40"},
        attendance_snapshot={"paid_days": "30", "period_days": "30"},
        validation_snapshot={"blockers": [], "warnings": []},
    )
    rule_configs = [
        (
            "calc-basic",
            "Calculation Basic",
            PayrollRuleType.FORMULA,
            "round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)",
            {"component_code": "BASIC", "line_type": "earning", "calculation_order": 10, "output_path": "salary.basic_monthly"},
        ),
        (
            "calc-hra",
            "Calculation HRA",
            PayrollRuleType.FORMULA,
            "round_decimal(salary.basic_monthly * 0.50, 2)",
            {"component_code": "HRA", "line_type": "earning", "calculation_order": 20},
        ),
        (
            "calc-pf",
            "Calculation PF",
            PayrollRuleType.STATUTORY,
            "round_decimal(min(salary.basic_monthly, 15000) * 0.12, 2)",
            {"component_code": "PF_EMPLOYEE", "line_type": "deduction", "calculation_order": 30},
        ),
    ]
    for code, name, rule_type, expression, config_snapshot in rule_configs:
        rule = PayrollRuleDefinition.objects.create(
            tenant=tenant,
            code=code,
            name=name,
            rule_type=rule_type,
            config_snapshot=config_snapshot,
        )
        PayrollRuleVersion.objects.create(
            tenant=tenant,
            rule=rule,
            version=1,
            status=PayrollRuleVersionStatus.ACTIVE,
            expression_language=PayrollExpressionLanguage.SAFE_EXPR_V1,
            expression=expression,
            effective_from="2026-09-01",
            config_snapshot=config_snapshot,
        )
    return payroll_run, snapshot


def test_hr_admin_payroll_draft_calculation_creates_lines_and_trace(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/",
        {"calculation_profile_ref": "india.monthly.calc.profile.v1"},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["calculation"]["status"] == PayrollCalculationStatus.COMPLETED
    assert payload["calculation"]["totals_snapshot"]["gross_earnings"] == "30000.00"
    assert payload["calculation"]["totals_snapshot"]["employee_deductions"] == "1800.00"
    assert payload["calculation"]["totals_snapshot"]["net_pay"] == "28200.00"
    assert len(payload["lines"]) == 3
    hra_line = next(item for item in payload["lines"] if item["component_code"] == "HRA")
    pf_line = next(item for item in payload["lines"] if item["component_code"] == "PF_EMPLOYEE")
    assert hra_line["amount"] == "10000.00"
    assert "salary.basic_monthly" in hra_line["trace_snapshot"]["dependencies"]
    assert pf_line["amount"] == "1800.00"
    assert pf_line["source_hash"] == snapshot.source_hash

    payroll_run.refresh_from_db()
    assert payroll_run.status == PayrollRunStatus.CALCULATED
    assert PayrollCalculationLine.objects.filter(payroll_run=payroll_run).count() == 3

    setup_response = api_client.get("/api/v1/hr-admin/payroll-calculation-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["calculation_count"] == 1
    assert setup_payload["summary"]["latest_net_pay"] == "28200.00"
    assert setup_payload["lines"][0]["employee_code"] == "EMP-0042"


def test_hr_admin_payroll_draft_calculation_consumes_configured_statutory_components(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    payroll_run.config_snapshot["calculation_profile"] = {
        "rule_codes": ["calc-basic", "calc-hra"],
        "statutory_profile": {
            "enabled": True,
            "pack_codes": ["india-statutory-calc-2026"],
            "component_codes": ["epf-calc"],
            "require_statutory_components": True,
            "require_employee_statutory_profile": True,
        },
    }
    payroll_run.save()
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-statutory-calc-2026",
        name="India Statutory Calc 2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
        statutory_profile_ref="india.payroll.statutory.calc.fy2026.v1",
    )
    component = PayrollStatutoryComponent.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        code="epf-calc",
        name="Employee Provident Fund",
        statutory_type=PayrollStatutoryComponentKind.PROVIDENT_FUND,
        contribution_owner=PayrollStatutoryContributionOwner.BOTH,
        calculation_method=PayrollStatutoryCalculationMethod.SLAB,
        wage_base_ref="payroll.wage_base.basic_monthly.v1",
        statutory_treatment_ref="india.epf.standard.v1",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={
            "wage_base_path": "salary.basic_monthly",
            "employee_profile_applicability_path": "pf_applicable",
            "employee_component_code": "PF_EMPLOYEE",
            "employer_component_code": "PF_EMPLOYER",
            "calculation_order": 40,
        },
    )
    PayrollStatutorySlab.objects.create(
        tenant=tenant,
        statutory_component=component,
        code="epf-12-ceiling",
        name="EPF 12 Percent Ceiling",
        effective_from="2026-04-01",
        min_amount="0.00",
        employee_rate_percent="12.0000",
        employer_rate_percent="12.0000",
        wage_ceiling_amount="15000.00",
        status=PayrollConfigStatus.ACTIVE,
    )
    EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        uan_number="123456789012",
        pf_applicable=True,
        tax_regime=PayrollTaxRegime.NEW,
        declaration_status=PayrollDeclarationStatus.VERIFIED,
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["calculation"]["totals_snapshot"]["gross_earnings"] == "30000.00"
    assert payload["calculation"]["totals_snapshot"]["employee_deductions"] == "1800.00"
    assert payload["calculation"]["totals_snapshot"]["employer_contributions"] == "1800.00"
    assert payload["calculation"]["totals_snapshot"]["net_pay"] == "28200.00"
    assert payload["calculation"]["error_snapshot"]["statutory_component_count"] == 1
    assert payload["calculation"]["error_snapshot"]["statutory_line_count"] == 2
    statutory_lines = [item for item in payload["lines"] if item["line_source"] == PayrollCalculationLineSource.STATUTORY]
    assert {item["component_code"] for item in statutory_lines} == {"PF_EMPLOYEE", "PF_EMPLOYER"}
    employee_pf_line = next(item for item in statutory_lines if item["component_code"] == "PF_EMPLOYEE")
    assert employee_pf_line["amount"] == "1800.00"
    assert employee_pf_line["config_snapshot"]["statutory_component_code"] == "epf-calc"
    assert employee_pf_line["config_snapshot"]["statutory_slab_code"] == "epf-12-ceiling"
    assert employee_pf_line["config_snapshot"]["employee_statutory_profile_hash"]
    assert "salary.basic_monthly" in employee_pf_line["trace_snapshot"]["dependencies"]


def test_hr_admin_payroll_draft_calculation_annualizes_tds_with_verified_declaration_caps(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    payroll_run.config_snapshot["calculation_profile"] = {
        "rule_codes": ["calc-basic", "calc-hra"],
        "statutory_profile": {
            "enabled": True,
            "pack_codes": ["india-tds-annualized-fy2026"],
            "component_codes": ["tds-annualized"],
            "require_statutory_components": True,
            "require_employee_statutory_profile": True,
        },
    }
    payroll_run.save()
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-tds-annualized-fy2026",
        name="India TDS Annualized FY2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
        statutory_profile_ref="india.payroll.statutory.tds.fy2026.v1",
    )
    component = PayrollStatutoryComponent.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        code="tds-annualized",
        name="Tax Deducted At Source",
        statutory_type=PayrollStatutoryComponentKind.TAX_DEDUCTED_AT_SOURCE,
        contribution_owner=PayrollStatutoryContributionOwner.EMPLOYEE,
        calculation_method=PayrollStatutoryCalculationMethod.SLAB,
        wage_base_ref="payroll.wage_base.basic_monthly.v1",
        statutory_treatment_ref="india.tds.annualized.v1",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={
            "wage_base_path": "salary.basic_monthly",
            "employee_component_code": "TDS",
            "employee_line_type": "tax",
            "calculation_order": 45,
            "annualization_profile": {
                "enabled": True,
                "financial_year_code": "FY2026-27",
                "annualization_multiplier": "12",
                "remaining_period_count": "8",
                "tax_method": "progressive_slabs",
                "compare_tax_regimes": True,
                "tax_regime_selection_mode": "profile",
                "tax_regime_candidates": [PayrollTaxRegime.OLD, PayrollTaxRegime.NEW],
                "declaration_cap_rules": [
                    {
                        "cap_ref": "old-regime-section-80c",
                        "section_code": "80C",
                        "item_kind": PayrollStatutoryDeclarationItemKind.INVESTMENT,
                        "tax_regimes": [PayrollTaxRegime.OLD],
                        "max_amount": "50000.00",
                    }
                ],
            },
        },
    )
    PayrollStatutorySlab.objects.create(
        tenant=tenant,
        statutory_component=component,
        code="tds-zero-band",
        name="TDS Zero Band",
        slab_order=10,
        effective_from="2026-04-01",
        min_amount="0.00",
        max_amount="150000.00",
        employee_rate_percent="0.0000",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={"tax_regimes": [PayrollTaxRegime.OLD]},
    )
    PayrollStatutorySlab.objects.create(
        tenant=tenant,
        statutory_component=component,
        code="tds-ten-percent-band",
        name="TDS Ten Percent Band",
        slab_order=20,
        effective_from="2026-04-01",
        min_amount="150000.00",
        employee_rate_percent="10.0000",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={"tax_regimes": [PayrollTaxRegime.OLD]},
    )
    PayrollStatutorySlab.objects.create(
        tenant=tenant,
        statutory_component=component,
        code="tds-new-zero-band",
        name="TDS New Regime Zero Band",
        slab_order=30,
        effective_from="2026-04-01",
        min_amount="0.00",
        max_amount="250000.00",
        employee_rate_percent="0.0000",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={"tax_regimes": [PayrollTaxRegime.NEW]},
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        tax_regime=PayrollTaxRegime.OLD,
        declaration_status=PayrollDeclarationStatus.VERIFIED,
    )
    verified_at = timezone.now()
    declaration = EmployeeStatutoryDeclaration.objects.create(
        tenant=tenant,
        employee=employee,
        employee_statutory_profile=profile,
        statutory_pack=pack,
        financial_year_code="FY2026-27",
        declaration_profile_ref="india.employee.tax.declaration.fy2026.v1",
        status=PayrollStatutoryDeclarationStatus.VERIFIED,
        tax_regime=PayrollTaxRegime.OLD,
        declared_total_amount="75000.00",
        verified_total_amount="75000.00",
        submitted_at=verified_at,
        verified_at=verified_at,
    )
    EmployeeStatutoryDeclarationItem.objects.create(
        tenant=tenant,
        declaration=declaration,
        employee=employee,
        item_kind=PayrollStatutoryDeclarationItemKind.INVESTMENT,
        section_code="80C",
        component_code="ELSS",
        name="ELSS Mutual Fund",
        declared_amount="75000.00",
        verified_amount="75000.00",
        proof_status=PayrollStatutoryProofStatus.VERIFIED,
        proof_document_ref="employee-document:elss-proof",
        verified_at=verified_at,
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["calculation"]["totals_snapshot"]["gross_earnings"] == "30000.00"
    assert payload["calculation"]["totals_snapshot"]["employee_deductions"] == "500.00"
    assert payload["calculation"]["totals_snapshot"]["net_pay"] == "29500.00"
    tds_line = next(item for item in payload["lines"] if item["component_code"] == "TDS")
    annualization = tds_line["config_snapshot"]["annualization"]
    assert tds_line["line_source"] == PayrollCalculationLineSource.STATUTORY
    assert tds_line["line_type"] == "tax"
    assert tds_line["amount"] == "500.00"
    assert annualization["annualized_wage_base"] == "240000.00"
    assert annualization["declaration_adjustment"] == "50000.00"
    assert annualization["taxable_annual_amount"] == "190000.00"
    assert annualization["annual_tax"] == "4000.00"
    assert annualization["remaining_period_count"] == "8"
    assert annualization["selected_tax_regime"] == PayrollTaxRegime.OLD
    assert annualization["tax_regime_selection_mode"] == "profile"
    assert annualization["declaration_cap_evidence"][0]["raw_amount"] == "75000.00"
    assert annualization["declaration_cap_evidence"][0]["capped_amount"] == "50000.00"
    comparison_by_regime = {item["tax_regime"]: item for item in annualization["regime_comparisons"]}
    assert comparison_by_regime[PayrollTaxRegime.OLD]["period_tax_amount"] == "500.00"
    assert comparison_by_regime[PayrollTaxRegime.OLD]["is_selected"] is True
    assert comparison_by_regime[PayrollTaxRegime.NEW]["declaration_adjustment"] == "0.00"
    assert comparison_by_regime[PayrollTaxRegime.NEW]["period_tax_amount"] == "0.00"
    assert comparison_by_regime[PayrollTaxRegime.NEW]["period_tax_delta"] == "-500.00"
    assert tds_line["trace_snapshot"]["dependencies"] == [
        "salary.basic_monthly",
        "employee_statutory_profile",
        "employee_statutory_declarations",
    ]


def test_hr_admin_payroll_draft_calculation_blocks_missing_employee_statutory_profile(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    payroll_run.config_snapshot["calculation_profile"] = {
        "rule_codes": ["calc-basic", "calc-hra"],
        "statutory_profile": {
            "enabled": True,
            "pack_codes": ["india-missing-profile-calc"],
            "component_codes": ["missing-profile-epf"],
            "require_employee_statutory_profile": True,
        },
    }
    payroll_run.save()
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-missing-profile-calc",
        name="India Missing Profile Calc",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
    )
    component = PayrollStatutoryComponent.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        code="missing-profile-epf",
        name="Missing Profile EPF",
        statutory_type=PayrollStatutoryComponentKind.PROVIDENT_FUND,
        contribution_owner=PayrollStatutoryContributionOwner.EMPLOYEE,
        calculation_method=PayrollStatutoryCalculationMethod.SLAB,
        wage_base_ref="payroll.wage_base.basic_monthly.v1",
        statutory_treatment_ref="india.epf.standard.v1",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={"wage_base_path": "salary.basic_monthly", "employee_component_code": "PF_EMPLOYEE"},
    )
    PayrollStatutorySlab.objects.create(
        tenant=tenant,
        statutory_component=component,
        code="missing-profile-epf-slab",
        name="Missing Profile EPF Slab",
        effective_from="2026-04-01",
        employee_rate_percent="12.0000",
        wage_ceiling_amount="15000.00",
        status=PayrollConfigStatus.ACTIVE,
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    assert "blocker validation issue" in response.json()["detail"]
    issue = PayrollValidationIssue.objects.get(payroll_run=payroll_run, issue_code="MISSING_EMPLOYEE_STATUTORY_PROFILE")
    assert issue.severity == PayrollValidationSeverity.BLOCKER
    assert issue.category == PayrollValidationCategory.STATUTORY_SETUP
    assert issue.employee == employee
    assert PayrollCalculationLine.objects.filter(payroll_run=payroll_run, line_source=PayrollCalculationLineSource.STATUTORY).count() == 0


def test_hr_admin_payroll_draft_calculation_persists_validation_warnings(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    PayrollInputSnapshot.objects.filter(id=snapshot.id).update(
        validation_snapshot={"blockers": [], "warnings": ["Pending attendance regularization accepted by payroll admin."]},
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 200, response.json()
    payload = response.json()
    calculation_id = payload["calculation"]["id"]
    assert payload["calculation"]["error_snapshot"]["validation_issue_count"] == 1
    assert payload["calculation"]["error_snapshot"]["validation_warning_count"] == 1
    assert payload["calculation"]["rule_selection_snapshot"]["validation_profile_ref"] == "payroll.validation.profile.default.v1"

    issue = PayrollValidationIssue.objects.get(payroll_run=payroll_run)
    assert str(issue.calculation_id) == calculation_id
    assert issue.input_snapshot_id == snapshot.id
    assert issue.severity == PayrollValidationSeverity.WARNING
    assert issue.category == PayrollValidationCategory.SOURCE_DATA
    assert issue.status == PayrollValidationIssueStatus.OPEN
    assert issue.source_hash

    setup_response = api_client.get("/api/v1/hr-admin/payroll-calculation-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["validation_issue_count"] == 1
    assert setup_payload["summary"]["validation_warning_count"] == 1
    assert setup_payload["validation_issues"][0]["issue_code"] == "SNAPSHOT_WARNINGS"
    assert setup_payload["validation_issues"][0]["calculation_id"] == calculation_id


def test_hr_admin_payroll_draft_calculation_blocks_without_active_rules(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    PayrollRuleVersion.objects.filter(tenant=tenant, rule__code__in=["calc-basic", "calc-hra", "calc-pf"]).update(status=PayrollRuleVersionStatus.RETIRED)

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    assert "blocker validation issue" in response.json()["detail"]
    assert PayrollRunCalculation.objects.filter(payroll_run=payroll_run).count() == 0

    issue = PayrollValidationIssue.objects.get(payroll_run=payroll_run)
    assert issue.calculation_id is None
    assert issue.severity == PayrollValidationSeverity.BLOCKER
    assert issue.category == PayrollValidationCategory.RULE_SETUP
    assert issue.issue_code == "NO_ACTIVE_RULE_VERSIONS"

    setup_response = api_client.get("/api/v1/hr-admin/payroll-calculation-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["validation_blocker_count"] == 1
    assert setup_payload["validation_issues"][0]["status"] == PayrollValidationIssueStatus.OPEN


def test_hr_admin_payroll_draft_calculation_blocks_missing_required_component(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    payroll_run.config_snapshot["validation_profile"] = {
        "required_component_codes": ["BASIC", "HRA", "PF_EMPLOYEE", "TDS"],
        "required_component_severity": PayrollValidationSeverity.BLOCKER,
    }
    payroll_run.save()

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    issue = PayrollValidationIssue.objects.get(payroll_run=payroll_run, issue_code="REQUIRED_COMPONENT_MISSING")
    assert issue.severity == PayrollValidationSeverity.BLOCKER
    assert issue.category == PayrollValidationCategory.RULE_SETUP
    assert issue.context_snapshot["required_component_code"] == "TDS"
    assert "PF_EMPLOYEE" in issue.context_snapshot["available_component_codes"]


def test_hr_admin_payroll_draft_calculation_blocks_missing_statutory_profile(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    PayrollRuleVersion.objects.filter(tenant=tenant, rule__code="calc-pf").update(
        config_snapshot={
            "component_code": "PF_EMPLOYEE",
            "line_type": "deduction",
            "calculation_order": 30,
            "statutory_pack_ref": "india.pf.v1",
        },
    )
    payroll_run.config_snapshot["validation_profile"] = {
        "required_statutory_profile_refs": ["india.pf.v1", "india.esi.v1"],
        "required_statutory_profile_severity": PayrollValidationSeverity.BLOCKER,
    }
    payroll_run.save()

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    issue = PayrollValidationIssue.objects.get(payroll_run=payroll_run, issue_code="REQUIRED_STATUTORY_PROFILE_MISSING")
    assert issue.severity == PayrollValidationSeverity.BLOCKER
    assert issue.category == PayrollValidationCategory.STATUTORY_SETUP
    assert issue.context_snapshot["missing_statutory_refs"] == ["india.esi.v1"]
    assert issue.context_snapshot["available_statutory_refs"] == ["india.pf.v1"]


def test_hr_admin_payroll_draft_calculation_blocks_rule_dependency_order(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    PayrollRuleVersion.objects.filter(tenant=tenant, rule__code="calc-basic").update(
        config_snapshot={
            "component_code": "BASIC",
            "line_type": "earning",
            "calculation_order": 40,
            "output_path": "salary.basic_monthly",
        },
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    issues = PayrollValidationIssue.objects.filter(payroll_run=payroll_run, issue_code="RULE_DEPENDENCY_ORDER").order_by("source_ref")
    assert issues.count() == 2
    first_issue = issues.first()
    assert first_issue.severity == PayrollValidationSeverity.BLOCKER
    assert first_issue.category == PayrollValidationCategory.RULE_SETUP
    assert first_issue.context_snapshot["future_dependencies"][0]["dependency"] == "salary.basic_monthly"
    assert first_issue.context_snapshot["future_dependencies"][0]["producer_rule_code"] == "calc-basic"
    assert PayrollRunCalculation.objects.filter(payroll_run=payroll_run).count() == 0


def test_hr_admin_payroll_draft_calculation_requires_locked_inputs(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    calendar = PayrollCalendar.objects.create(
        tenant=tenant,
        code="calc-unlocked-monthly",
        name="Calculation Unlocked Monthly",
        frequency=PayrollFrequency.MONTHLY,
    )
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="calc-unlocked-sep-2026",
        name="Calculation Unlocked September 2026",
        start_date="2026-09-01",
        end_date="2026-09-30",
        pay_date="2026-10-01",
        status=PayrollPeriodStatus.OPEN,
    )
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="calc-unlocked-run",
        name="Calculation Unlocked Run",
        status=PayrollRunStatus.COLLECTING_INPUTS,
    )
    PayrollInputSnapshot.objects.create(
        tenant=tenant,
        payroll_run=payroll_run,
        employee=employee,
        snapshot_status=PayrollInputSnapshotStatus.READY,
        validation_snapshot={"blockers": [], "warnings": []},
    )

    response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert response.status_code == 400
    assert "locked before draft calculation" in response.json()["detail"]
    assert PayrollRunCalculation.objects.filter(payroll_run=payroll_run).count() == 0


def test_hr_admin_payroll_adjustment_create_approve_and_apply(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    create_response = api_client.post(
        "/api/v1/hr-admin/payroll-adjustments/",
        {
            "payroll_run_id": str(payroll_run.id),
            "employee_id": str(employee.id),
            "input_snapshot_id": str(snapshot.id),
            "kind": PayrollAdjustmentKind.BONUS,
            "direction": PayrollAdjustmentDirection.EARNING,
            "component_code": "PERFORMANCE_BONUS",
            "component_name": "Performance Bonus",
            "amount": "7500.00",
            "currency_code": "INR",
            "effective_date": "2026-09-15",
            "source_period_start": "2026-08-01",
            "source_period_end": "2026-08-31",
            "adjustment_profile_ref": "india.monthly.adjustments.v1",
            "approval_profile_ref": "payroll.adjustment.approval.v1",
            "source_ref": "bonus:EMP-0042:aug-2026",
            "reason": "Approved monthly performance bonus.",
            "config_snapshot": {"source_system_ref": "hrms.performance.adjustments.v1"},
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    payload = create_response.json()
    adjustment_id = payload["id"]
    assert payload["status"] == PayrollAdjustmentStatus.DRAFT
    assert payload["amount"] == "7500.00"
    assert payload["source_hash"]

    submit_response = api_client.post(f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    assert submit_response.json()["status"] == PayrollAdjustmentStatus.SUBMITTED

    approve_response = api_client.post(
        f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/approve/",
        {"approval_profile_ref": "payroll.adjustment.approval.v2"},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()
    assert approve_response.json()["status"] == PayrollAdjustmentStatus.APPROVED
    assert approve_response.json()["approval_profile_ref"] == "payroll.adjustment.approval.v2"

    apply_response = api_client.post(f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/apply/", {}, format="json")
    assert apply_response.status_code == 200, apply_response.json()
    assert apply_response.json()["status"] == PayrollAdjustmentStatus.APPLIED
    assert apply_response.json()["applied_at"] is not None

    setup_response = api_client.get("/api/v1/hr-admin/payroll-adjustment-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["adjustment_count"] == 1
    assert setup_payload["summary"]["applied_count"] == 1
    assert setup_payload["summary"]["total_amount"] == "7500.00"
    assert PayrollAdjustment.objects.filter(id=adjustment_id, status=PayrollAdjustmentStatus.APPLIED).exists()


def test_hr_admin_payroll_draft_calculation_consumes_applied_adjustments(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    create_response = api_client.post(
        "/api/v1/hr-admin/payroll-adjustments/",
        {
            "payroll_run_id": str(payroll_run.id),
            "employee_id": str(employee.id),
            "input_snapshot_id": str(snapshot.id),
            "kind": PayrollAdjustmentKind.BONUS,
            "direction": PayrollAdjustmentDirection.EARNING,
            "component_code": "PERFORMANCE_BONUS",
            "component_name": "Performance Bonus",
            "amount": "7500.00",
            "currency_code": "INR",
            "effective_date": "2026-09-15",
            "adjustment_profile_ref": "india.monthly.adjustments.v1",
            "approval_profile_ref": "payroll.adjustment.approval.v1",
            "source_ref": "bonus:EMP-0042:calc-consumption",
            "config_snapshot": {"calculation_order": 80},
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    adjustment_id = create_response.json()["id"]
    assert api_client.post(f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/submit/", {}, format="json").status_code == 200
    assert api_client.post(f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/approve/", {}, format="json").status_code == 200
    apply_response = api_client.post(f"/api/v1/hr-admin/payroll-adjustments/{adjustment_id}/apply/", {}, format="json")
    assert apply_response.status_code == 200, apply_response.json()
    adjustment_hash = apply_response.json()["source_hash"]

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    payload = calculate_response.json()
    assert payload["calculation"]["totals_snapshot"]["gross_earnings"] == "37500.00"
    assert payload["calculation"]["totals_snapshot"]["employee_deductions"] == "1800.00"
    assert payload["calculation"]["totals_snapshot"]["net_pay"] == "35700.00"
    assert payload["calculation"]["error_snapshot"]["applied_adjustment_count"] == 1
    assert len(payload["lines"]) == 4
    adjustment_line = next(item for item in payload["lines"] if item["line_source"] == PayrollCalculationLineSource.ADJUSTMENT)
    assert adjustment_line["adjustment_id"] == adjustment_id
    assert adjustment_line["rule_code"] == ""
    assert adjustment_line["rule_version"] is None
    assert adjustment_line["component_code"] == "PERFORMANCE_BONUS"
    assert adjustment_line["amount"] == "7500.00"
    assert adjustment_line["source_hash"] == adjustment_hash

    setup_response = api_client.get("/api/v1/hr-admin/payroll-calculation-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["latest_net_pay"] == "35700.00"
    assert any(item["line_source"] == PayrollCalculationLineSource.ADJUSTMENT for item in setup_payload["lines"])


def test_hr_admin_payroll_settlement_lifecycle_applies_to_calculation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    exit_record, _created = EmployeeExit.objects.get_or_create(
        tenant=tenant,
        employee=employee,
        defaults={
            "status": ExitStatus.COMPLETED,
            "approved_last_working_date": "2026-09-12",
            "actual_exit_date": "2026-09-12",
            "exit_reason": "Resignation",
        },
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/payroll-settlements/",
        {
            "payroll_run_id": str(payroll_run.id),
            "employee_id": str(employee.id),
            "exit_record_id": str(exit_record.id),
            "input_snapshot_id": str(snapshot.id),
            "settlement_date": "2026-09-15",
            "last_working_date": "2026-09-12",
            "currency_code": "INR",
            "settlement_profile_ref": "india.full-final.settlement.v1",
            "approval_profile_ref": "payroll.settlement.approval.v1",
            "calculation_profile_ref": "india.monthly.calc.profile.v1",
            "source_ref": "settlement:EMP-0042:sep-2026",
            "reason": "Full-and-final settlement after approved exit.",
            "config_snapshot": {"leave_encashment_policy_ref": "india.leave.encashment.v1"},
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    settlement_id = create_response.json()["id"]

    line_payloads = [
        {
            "line_kind": "salary_proration",
            "direction": PayrollAdjustmentDirection.EARNING,
            "component_code": "FINAL_EARNED_SALARY",
            "component_name": "Final Earned Salary",
            "amount": "15000.00",
            "calculation_order": 70,
            "source_ref": "settlement:EMP-0042:salary-proration",
            "trace_snapshot": {"dependencies": ["exit.actual_exit_date", "salary.monthly_gross"]},
        },
        {
            "line_kind": "leave_encashment",
            "direction": PayrollAdjustmentDirection.EARNING,
            "component_code": "LEAVE_ENCASHMENT",
            "component_name": "Leave Encashment",
            "amount": "5000.00",
            "calculation_order": 71,
            "source_ref": "settlement:EMP-0042:leave-encashment",
            "trace_snapshot": {"dependencies": ["leave.balance.encashable_days"]},
        },
        {
            "line_kind": "notice_recovery",
            "direction": PayrollAdjustmentDirection.DEDUCTION,
            "component_code": "NOTICE_RECOVERY",
            "component_name": "Notice Recovery",
            "amount": "2500.00",
            "calculation_order": 72,
            "source_ref": "settlement:EMP-0042:notice-recovery",
            "trace_snapshot": {"dependencies": ["exit.notice_shortfall_days"]},
        },
    ]
    for line_payload in line_payloads:
        line_response = api_client.post(f"/api/v1/hr-admin/payroll-settlements/{settlement_id}/lines/", line_payload, format="json")
        assert line_response.status_code == 201, line_response.json()

    setup_response = api_client.get("/api/v1/hr-admin/payroll-settlement-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["settlement_count"] == 1
    assert setup_payload["summary"]["line_count"] == 3
    assert setup_payload["settlements"][0]["totals_snapshot"]["net_settlement"] == "17500.00"

    assert api_client.post(f"/api/v1/hr-admin/payroll-settlements/{settlement_id}/submit/", {}, format="json").status_code == 200
    approve_response = api_client.post(f"/api/v1/hr-admin/payroll-settlements/{settlement_id}/approve/", {}, format="json")
    assert approve_response.status_code == 200, approve_response.json()
    assert approve_response.json()["status"] == PayrollSettlementStatus.APPROVED
    apply_response = api_client.post(f"/api/v1/hr-admin/payroll-settlements/{settlement_id}/apply/", {}, format="json")
    assert apply_response.status_code == 200, apply_response.json()
    assert apply_response.json()["status"] == PayrollSettlementStatus.APPLIED

    assert PayrollSettlement.objects.filter(id=settlement_id, status=PayrollSettlementStatus.APPLIED).exists()
    assert PayrollSettlementLine.objects.filter(settlement_id=settlement_id).count() == 3
    assert PayrollAdjustment.objects.filter(payroll_run=payroll_run, kind=PayrollAdjustmentKind.SETTLEMENT, status=PayrollAdjustmentStatus.APPLIED).count() == 3

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    payload = calculate_response.json()
    assert payload["calculation"]["totals_snapshot"]["gross_earnings"] == "50000.00"
    assert payload["calculation"]["totals_snapshot"]["employee_deductions"] == "4300.00"
    assert payload["calculation"]["totals_snapshot"]["net_pay"] == "45700.00"
    assert payload["calculation"]["error_snapshot"]["applied_adjustment_count"] == 3
    adjustment_lines = [item for item in payload["lines"] if item["line_source"] == PayrollCalculationLineSource.ADJUSTMENT]
    assert {item["component_code"] for item in adjustment_lines} == {"FINAL_EARNED_SALARY", "LEAVE_ENCASHMENT", "NOTICE_RECOVERY"}


def test_hr_admin_payroll_adjustment_blocks_after_review_starts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculate_response.json()["calculation"]["id"]},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()

    create_response = api_client.post(
        "/api/v1/hr-admin/payroll-adjustments/",
        {
            "payroll_run_id": str(payroll_run.id),
            "employee_id": str(employee.id),
            "input_snapshot_id": str(snapshot.id),
            "kind": PayrollAdjustmentKind.CORRECTION,
            "direction": PayrollAdjustmentDirection.DEDUCTION,
            "component_code": "MEAL_RECOVERY",
            "component_name": "Meal Recovery",
            "amount": "500.00",
            "effective_date": "2026-09-20",
            "source_ref": "correction:EMP-0042:meal",
        },
        format="json",
    )
    assert create_response.status_code == 400
    assert "after run review starts" in str(create_response.json())
    assert PayrollAdjustment.objects.count() == 0


def test_hr_admin_payroll_draft_calculation_rerun_supersedes_prior_attempt(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    first_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    second_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")

    assert first_response.status_code == 200, first_response.json()
    assert second_response.status_code == 200, second_response.json()
    assert second_response.json()["calculation"]["attempt_number"] == 2
    assert PayrollRunCalculation.objects.filter(payroll_run=payroll_run, status=PayrollCalculationStatus.SUPERSEDED).count() == 1
    assert PayrollRunCalculation.objects.filter(payroll_run=payroll_run, status=PayrollCalculationStatus.COMPLETED).count() == 1


def test_hr_admin_payroll_review_approves_and_final_locks_run(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    calculation_id = calculate_response.json()["calculation"]["id"]

    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculation_id, "review_profile_ref": "india.monthly.review.profile.v1"},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()
    review_id = open_response.json()["review"]["id"]
    assert open_response.json()["review"]["status"] == PayrollReviewStatus.OPEN

    submit_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    assert submit_response.json()["review"]["status"] == PayrollReviewStatus.READY_FOR_APPROVAL

    approve_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review_id}/approve/",
        {"comment": "Finance controls reviewed.", "approval_profile_ref": "india.monthly.approval.profile.v1"},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()
    assert approve_response.json()["review"]["status"] == PayrollReviewStatus.APPROVED
    assert PayrollRunApproval.objects.filter(review_id=review_id, status=PayrollApprovalStatus.APPROVED).count() == 1

    lock_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/lock/", {}, format="json")
    assert lock_response.status_code == 200, lock_response.json()
    assert lock_response.json()["review"]["status"] == PayrollReviewStatus.LOCKED
    payroll_run.refresh_from_db()
    assert payroll_run.status == PayrollRunStatus.LOCKED
    assert payroll_run.final_locked_at is not None

    edit_response = api_client.patch(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/",
        {"name": "Edited Locked Payroll Run"},
        format="json",
    )
    assert edit_response.status_code == 400
    assert "immutable" in str(edit_response.json()).lower()


def test_hr_admin_payroll_review_blocks_submit_until_blocker_exception_decided(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculate_response.json()["calculation"]["id"]},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()
    review_id = open_response.json()["review"]["id"]

    exception_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review_id}/exceptions/",
        {
            "title": "Missing overtime approval",
            "detail": "Overtime import is pending finance validation.",
            "category": "input_variance",
            "severity": PayrollExceptionSeverity.BLOCKER,
        },
        format="json",
    )
    assert exception_response.status_code == 201, exception_response.json()
    exception_id = exception_response.json()["id"]

    blocked_submit_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/submit/", {}, format="json")
    assert blocked_submit_response.status_code == 400
    assert "blocker" in blocked_submit_response.json()["detail"].lower()

    decision_response = api_client.post(
        f"/api/v1/hr-admin/payroll-review-exceptions/{exception_id}/decision/",
        {"decision": PayrollExceptionStatus.ACCEPTED, "reason": "Finance confirmed no payout impact for this run."},
        format="json",
    )
    assert decision_response.status_code == 200, decision_response.json()
    assert decision_response.json()["status"] == PayrollExceptionStatus.ACCEPTED

    submit_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    assert submit_response.json()["review"]["status"] == PayrollReviewStatus.READY_FOR_APPROVAL
    assert PayrollRunException.objects.filter(review_id=review_id, severity=PayrollExceptionSeverity.BLOCKER, status=PayrollExceptionStatus.ACCEPTED).count() == 1


def test_hr_admin_payroll_review_setup_returns_review_register(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)

    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculate_response.json()["calculation"]["id"]},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()

    setup_response = api_client.get("/api/v1/hr-admin/payroll-review-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    payload = setup_response.json()
    assert payload["summary"]["review_count"] == 1
    assert payload["summary"]["latest_net_pay"] == "28200.00"
    assert payload["reviews"][0]["status"] == PayrollReviewStatus.OPEN
    assert payload["runs"][0]["final_locked_at"] is None
    assert payload["lines"][0]["employee_code"] == "EMP-0042"
    assert PayrollRunReview.objects.filter(payroll_run=payroll_run).count() == 1


def create_locked_payroll_review(api_client: APIClient, *, tenant, employee, run_config: dict | None = None):
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    if run_config:
        payroll_run.config_snapshot = {**payroll_run.config_snapshot, **run_config}
        payroll_run.save()
    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculate_response.json()["calculation"]["id"]},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()
    review_id = open_response.json()["review"]["id"]
    submit_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/submit/", {}, format="json")
    assert submit_response.status_code == 200, submit_response.json()
    approve_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/approve/", {}, format="json")
    assert approve_response.status_code == 200, approve_response.json()
    lock_response = api_client.post(f"/api/v1/hr-admin/payroll-reviews/{review_id}/lock/", {}, format="json")
    assert lock_response.status_code == 200, lock_response.json()
    return PayrollRunReview.objects.get(id=review_id)


def test_hr_admin_payroll_outputs_generate_and_publish_locked_review(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_response.status_code == 200, generate_response.json()
    payload = generate_response.json()
    batch_id = payload["output_batch"]["id"]
    assert payload["output_batch"]["status"] == PayrollOutputBatchStatus.GENERATED
    assert payload["output_batch"]["payslip_count"] == 1
    assert payload["output_batch"]["register_count"] == 1
    assert len(payload["artifacts"]) == 2
    payslip = next(item for item in payload["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert payslip["employee_code"] == "EMP-0042"
    assert payslip["totals_snapshot"]["net_pay"] == "28200.00"
    assert payslip["source_hash"]
    assert payslip["file_name"].endswith(".html")
    assert payslip["mime_type"] == "text/html"
    assert payslip["storage_provider_ref"] == "payroll.storage.local.generated.v1"
    assert payslip["storage_key"]
    assert payslip["storage_object_version"]
    assert payslip["file_size_bytes"] > 0
    assert len(payslip["checksum_sha256"]) == 64
    assert payslip["is_downloadable"] is True
    assert payslip["download_strategy_ref"] == "payroll.download.stream.local.v1"
    assert payslip["supports_signed_url"] is False
    assert payslip["signed_url_expires_in_seconds"] == 900
    assert payslip["retention_policy_ref"] == "payroll.retention.7y.v1"
    assert payslip["download_url"] is None
    assert payslip["signed_download_url"] is None
    assert payslip["signed_download_expires_at"] is None

    blocked_download_response = api_client.get(f"/api/v1/hr-admin/payroll-output-artifacts/{payslip['id']}/download/")
    assert blocked_download_response.status_code == 400
    assert "published" in blocked_download_response.json()["detail"]

    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    publish_payload = publish_response.json()
    assert publish_payload["output_batch"]["status"] == PayrollOutputBatchStatus.PUBLISHED
    assert publish_payload["output_batch"]["published_artifact_count"] == 2
    assert all(item["status"] == PayrollOutputArtifactStatus.PUBLISHED for item in publish_payload["artifacts"])
    published_payslip = next(item for item in publish_payload["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert published_payslip["download_url"]

    download_response = api_client.get(published_payslip["download_url"])
    assert download_response.status_code == 200
    assert download_response["Content-Type"].startswith("text/html")
    assert "attachment;" in download_response["Content-Disposition"]
    assert download_response["X-Payroll-Artifact-Checksum"] == published_payslip["checksum_sha256"]
    assert download_response["X-Payroll-Storage-Provider"] == "payroll.storage.local.generated.v1"
    assert download_response["X-Payroll-Storage-Version"] == published_payslip["storage_object_version"]
    assert download_response["X-Payroll-Download-Strategy"] == "payroll.download.stream.local.v1"
    assert b"Payslip" in download_response.content
    assert b"EMP-0042" in download_response.content

    setup_response = api_client.get("/api/v1/hr-admin/payroll-output-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["output_batch_count"] == 1
    assert setup_payload["summary"]["published_batch_count"] == 1
    assert setup_payload["summary"]["payslip_count"] == 1
    assert setup_payload["summary"]["latest_net_pay"] == "28200.00"
    assert PayrollOutputBatch.objects.filter(id=batch_id, status=PayrollOutputBatchStatus.PUBLISHED).exists()
    assert PayrollOutputArtifact.objects.filter(output_batch_id=batch_id, status=PayrollOutputArtifactStatus.PUBLISHED).count() == 2


def test_hr_admin_payroll_outputs_support_configured_signed_url_storage_strategy(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.signed_url.placeholder.v1",
                    "download_strategy_ref": "payroll.download.signed_url.v1",
                    "signed_url_expires_in_seconds": 300,
                    "key_prefix": "signed-payroll",
                    "retention_policy_ref": "payroll.retention.10y.v1",
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.signed.output.profile.v1"},
        format="json",
    )
    assert generate_response.status_code == 200, generate_response.json()
    batch_id = generate_response.json()["output_batch"]["id"]
    generated_payslip = next(item for item in generate_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert generated_payslip["storage_provider_ref"] == "payroll.storage.signed_url.placeholder.v1"
    assert generated_payslip["storage_key"].startswith("signed-payroll/")
    assert generated_payslip["download_strategy_ref"] == "payroll.download.signed_url.v1"
    assert generated_payslip["supports_signed_url"] is True
    assert generated_payslip["signed_url_expires_in_seconds"] == 300
    assert generated_payslip["signed_download_url"] is None
    assert generated_payslip["retention_policy_ref"] == "payroll.retention.10y.v1"

    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    published_payslip = next(item for item in publish_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert published_payslip["signed_download_url"]
    assert published_payslip["signed_download_expires_at"]
    assert "signature=placeholder" in published_payslip["signed_download_url"]

    download_response = api_client.get(published_payslip["download_url"])
    assert download_response.status_code == 200
    assert download_response["X-Payroll-Storage-Provider"] == "payroll.storage.signed_url.placeholder.v1"
    assert download_response["X-Payroll-Download-Strategy"] == "payroll.download.signed_url.v1"
    assert download_response["X-Payroll-Retention-Policy"] == "payroll.retention.10y.v1"
    assert b"EMP-0042" in download_response.content

    signed_issue_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-artifacts/{published_payslip['id']}/signed-access/",
        {"expires_in_seconds": 120, "max_access_count": 1},
        format="json",
        HTTP_X_REQUEST_ID="signed-grant-test-1",
    )
    assert signed_issue_response.status_code == 201, signed_issue_response.json()
    signed_issue_payload = signed_issue_response.json()
    assert "grant_id=" in signed_issue_payload["signed_url"]
    assert "token=" in signed_issue_payload["signed_url"]
    assert signed_issue_payload["grant"]["status"] == PayrollArtifactSignedAccessGrantStatus.ACTIVE
    assert signed_issue_payload["grant"]["access_count"] == 0
    assert signed_issue_payload["grant"]["max_access_count"] == 1
    grant = PayrollArtifactSignedAccessGrant.objects.get(id=signed_issue_payload["grant"]["id"])
    assert grant.token_hash
    assert grant.token_prefix
    assert grant.signed_url.endswith("...")
    assert signed_issue_payload["signed_url"] != grant.signed_url
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact_id=published_payslip["id"],
        signed_access_grant=grant,
        event_type=PayrollArtifactAccessEventType.SIGNED_URL_ISSUED,
    ).exists()

    signed_download_response = api_client.get(signed_issue_payload["signed_url"], HTTP_X_REQUEST_ID="signed-grant-test-download")
    assert signed_download_response.status_code == 200
    assert signed_download_response["X-Payroll-Download-Strategy"] == "payroll.download.signed_url.v1"
    grant.refresh_from_db()
    assert grant.access_count == 1
    assert grant.last_accessed_at is not None
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact_id=published_payslip["id"],
        signed_access_grant=grant,
        event_type=PayrollArtifactAccessEventType.DOWNLOADED,
        request_identifier="signed-grant-test-download",
    ).exists()

    second_signed_download_response = api_client.get(signed_issue_payload["signed_url"])
    assert second_signed_download_response.status_code == 403
    assert "access limit" in second_signed_download_response.json()["detail"]

    revoke_response = api_client.post(
        f"/api/v1/hr-admin/payroll-signed-access-grants/{grant.id}/revoke/",
        {"reason": "Payroll close audit test revocation."},
        format="json",
    )
    assert revoke_response.status_code == 200, revoke_response.json()
    assert revoke_response.json()["status"] == PayrollArtifactSignedAccessGrantStatus.REVOKED
    assert revoke_response.json()["revocation_reason"] == "Payroll close audit test revocation."
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact_id=published_payslip["id"],
        signed_access_grant=grant,
        event_type=PayrollArtifactAccessEventType.REVOKED,
    ).exists()

    audit_export_response = api_client.get(f"/api/v1/hr-admin/payroll-output-artifacts/{published_payslip['id']}/access-audit-export/")
    assert audit_export_response.status_code == 200
    assert audit_export_response["Content-Type"].startswith("text/csv")
    audit_csv = audit_export_response.content.decode("utf-8")
    assert "signed_url_issued" in audit_csv
    assert "signed_access_grant" in audit_csv
    assert "Payroll close audit test revocation." in audit_csv


def test_hr_admin_payroll_outputs_reject_uninstalled_object_storage_adapter(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "key_prefix": "tenant-payroll",
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 400
    assert "missing required field" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


def test_hr_admin_payroll_outputs_support_s3_object_storage_contract_profile(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/payroll-s3-writer",
                    "key_prefix": "tenant-payroll",
                    "retention_policy_ref": "payroll.retention.10y.v1",
                    "signed_url_expires_in_seconds": 240,
                    "encryption_ref": "tenant-managed-kms/payroll",
                    "contract_test_mode": True,
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.s3.output.profile.v1"},
        format="json",
    )
    assert generate_response.status_code == 200, generate_response.json()
    batch_id = generate_response.json()["output_batch"]["id"]
    generated_payslip = next(item for item in generate_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert generated_payslip["storage_provider_ref"] == "payroll.storage.s3.private.v1"
    assert generated_payslip["storage_key"].startswith("tenant-payroll/")
    assert generated_payslip["storage_object_version"].startswith("s3-")
    assert generated_payslip["download_strategy_ref"] == "payroll.download.s3.signed_url.v1"
    assert generated_payslip["supports_signed_url"] is True
    assert generated_payslip["signed_url_expires_in_seconds"] == 240
    assert generated_payslip["config_snapshot"]["storage_profile"]["credential_ref"] == "tenant:northstar:secret/payroll-s3-writer"
    assert "secret_key" not in generated_payslip["config_snapshot"]["storage_profile"]

    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    published_payslip = next(item for item in publish_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
    assert "tenant-payroll-private.s3.ap-south-1.amazonaws.com" in published_payslip["signed_download_url"]
    assert "X-Amz-Expires=240" in published_payslip["signed_download_url"]
    assert "tenant%3Anorthstar%3Asecret/payroll-s3-writer" in published_payslip["signed_download_url"]

    download_response = api_client.get(published_payslip["download_url"])
    assert download_response.status_code == 200
    assert download_response["X-Payroll-Storage-Provider"] == "payroll.storage.s3.private.v1"
    assert download_response["X-Payroll-Download-Strategy"] == "payroll.download.s3.signed_url.v1"
    assert download_response["X-Payroll-Retention-Policy"] == "payroll.retention.10y.v1"


def test_hr_admin_payroll_outputs_reject_raw_object_storage_credentials(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/payroll-s3-writer",
                    "secret_key": "should-not-be-in-config",
                    "contract_test_mode": True,
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 400
    assert "raw credentials are not allowed" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


def test_hr_admin_payroll_outputs_reject_missing_storage_policy_ref(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/payroll-s3-writer",
                    "storage_policy_ref": "payroll.storage.policy.strict.missing.v1",
                    "contract_test_mode": True,
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 400
    assert "storage policy payroll.storage.policy.strict.missing.v1 is not configured" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


def test_hr_admin_payroll_outputs_enforce_storage_policy_encryption(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/payroll-s3-writer",
                    "key_prefix": "tenant-payroll",
                    "storage_policy_ref": "payroll.storage.policy.strict.v1",
                    "contract_test_mode": True,
                }
            }
        },
    )

    with override_settings(
        PAYROLL_ARTIFACT_STORAGE_POLICIES={
            "payroll.storage.policy.strict.v1": {
                "allowed_provider_families": ["s3"],
                "allowed_bucket_names": ["tenant-payroll-private"],
                "allowed_credential_refs": ["tenant:northstar:secret/payroll-s3-writer"],
                "allowed_retention_policy_refs": ["payroll.retention.7y.v1"],
                "required_key_prefix": "tenant-payroll",
                "require_encryption_ref": True,
                "max_signed_url_expires_in_seconds": 300,
            }
        },
    ):
        generate_response = api_client.post(
            f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
            {},
            format="json",
        )
    assert generate_response.status_code == 400
    assert "requires encryption_ref" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


def test_hr_admin_payroll_outputs_reject_unresolved_object_storage_credential_ref(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/missing-payroll-s3-writer",
                    "key_prefix": "tenant-payroll",
                    "retention_policy_ref": "payroll.retention.10y.v1",
                }
            }
        },
    )

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 400
    assert "is not configured in the runtime credential resolver" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


class _FakePayrollS3Body:
    def __init__(self, payload: bytes):
        self.payload = payload

    def read(self) -> bytes:
        return self.payload


class _FakePayrollS3Client:
    def __init__(self):
        self.objects: dict[tuple[str, str], dict[str, object]] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str, Metadata: dict[str, str]):
        version = f"runtime-{len(self.objects) + 1}"
        self.objects[(Bucket, Key)] = {
            "body": Body,
            "content_type": ContentType,
            "metadata": Metadata,
            "version": version,
        }
        return {"VersionId": version}

    def get_object(self, *, Bucket: str, Key: str):
        stored = self.objects[(Bucket, Key)]
        return {
            "Body": _FakePayrollS3Body(stored["body"]),
            "ContentType": stored["content_type"],
        }

    def generate_presigned_url(self, operation_name: str, *, Params: dict[str, str], ExpiresIn: int):
        assert operation_name == "get_object"
        return (
            f"https://{Params['Bucket']}.s3.ap-south-1.amazonaws.com/{Params['Key']}"
            f"?runtime-signature=fake&expires={ExpiresIn}"
        )


def test_hr_admin_payroll_outputs_store_read_and_sign_with_s3_sdk_runtime(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    fake_client = _FakePayrollS3Client()

    def fake_s3_factory(*, profile, credential):
        assert profile.provider_family == "s3"
        assert credential.credential_ref == "tenant:northstar:secret/payroll-s3-runtime"
        assert credential.snapshot()["metadata"]["rotation_policy_ref"] == "payroll.secret.rotation.90d.v1"
        return fake_client

    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "output_profile": {
                "storage_profile": {
                    "provider_ref": "payroll.storage.s3.private.v1",
                    "bucket_name": "tenant-payroll-private",
                    "region": "ap-south-1",
                    "credential_ref": "tenant:northstar:secret/payroll-s3-runtime",
                    "key_prefix": "tenant-payroll",
                    "retention_policy_ref": "payroll.retention.10y.v1",
                    "signed_url_expires_in_seconds": 180,
                    "encryption_ref": "tenant-managed-kms/payroll",
                    "storage_policy_ref": "payroll.storage.policy.strict-runtime.v1",
                    "lifecycle_policy_ref": "payroll.lifecycle.retention.10y.v1",
                    "malware_scan_profile_ref": "payroll.malware.scan.sync.v1",
                    "durability_policy_ref": "payroll.durability.multi-region.v1",
                }
            }
        },
    )

    with override_settings(
        PAYROLL_ARTIFACT_STORAGE_CREDENTIALS={
            "tenant:northstar:secret/payroll-s3-runtime": {
                "provider_family": "s3",
                "source_ref": "unit-test-secret-resolver",
                "metadata": {"rotation_policy_ref": "payroll.secret.rotation.90d.v1"},
                "credentials": {
                    "access_key_id": "runtime-access-key",
                    "secret_access_key": "runtime-secret-key",
                },
            }
        },
        PAYROLL_ARTIFACT_STORAGE_CLIENT_FACTORIES={"s3": fake_s3_factory},
        PAYROLL_ARTIFACT_STORAGE_POLICIES={
            "payroll.storage.policy.strict-runtime.v1": {
                "allowed_provider_families": ["s3"],
                "allowed_provider_refs": ["payroll.storage.s3.private.v1"],
                "allowed_credential_refs": ["tenant:northstar:secret/payroll-s3-runtime"],
                "allowed_bucket_names": ["tenant-payroll-private"],
                "allowed_retention_policy_refs": ["payroll.retention.10y.v1"],
                "allowed_encryption_refs": ["tenant-managed-kms/payroll"],
                "required_key_prefix": "tenant-payroll",
                "require_encryption_ref": True,
                "require_runtime_credentials": True,
                "max_signed_url_expires_in_seconds": 180,
                "max_file_size_bytes": 100000,
                "lifecycle_policy_ref": "payroll.lifecycle.retention.10y.v1",
                "malware_scan_profile_ref": "payroll.malware.scan.sync.v1",
                "durability_policy_ref": "payroll.durability.multi-region.v1",
            }
        },
    ):
        generate_response = api_client.post(
            f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
            {"output_profile_ref": "india.s3.runtime.output.profile.v1"},
            format="json",
        )
        assert generate_response.status_code == 200, generate_response.json()
        batch_id = generate_response.json()["output_batch"]["id"]
        generated_payslip = next(item for item in generate_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
        stored_payslip = PayrollOutputArtifact.objects.get(id=generated_payslip["id"])
        assert stored_payslip.file_payload == ""
        assert stored_payslip.storage_object_version.startswith("s3-runtime-")
        assert stored_payslip.supports_signed_url is True
        assert stored_payslip.signed_url_expires_in_seconds == 180
        assert stored_payslip.config_snapshot["storage_profile"]["credential_ref"] == "tenant:northstar:secret/payroll-s3-runtime"
        assert stored_payslip.config_snapshot["storage_profile"]["storage_policy_ref"] == "payroll.storage.policy.strict-runtime.v1"
        assert stored_payslip.config_snapshot["storage_profile"]["lifecycle_policy_ref"] == "payroll.lifecycle.retention.10y.v1"
        assert stored_payslip.config_snapshot["storage_profile"]["malware_scan_profile_ref"] == "payroll.malware.scan.sync.v1"
        assert stored_payslip.config_snapshot["storage_profile"]["durability_policy_ref"] == "payroll.durability.multi-region.v1"
        assert "secret_access_key" not in stored_payslip.config_snapshot["storage_profile"]
        assert ("tenant-payroll-private", stored_payslip.storage_key) in fake_client.objects
        assert fake_client.objects[("tenant-payroll-private", stored_payslip.storage_key)]["metadata"]["checksum-sha256"] == stored_payslip.checksum_sha256

        publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
        assert publish_response.status_code == 200, publish_response.json()
        published_payslip = next(item for item in publish_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)
        assert "runtime-signature=fake" in published_payslip["signed_download_url"]
        assert "expires=180" in published_payslip["signed_download_url"]

        download_response = api_client.get(published_payslip["download_url"])
        assert download_response.status_code == 200
        assert download_response["X-Payroll-Storage-Provider"] == "payroll.storage.s3.private.v1"
        assert download_response["X-Payroll-Download-Strategy"] == "payroll.download.s3.signed_url.v1"
        assert download_response["X-Payroll-Artifact-Checksum"] == stored_payslip.checksum_sha256
        assert b"EMP-0042" in download_response.content


def test_employee_can_list_and_download_published_payroll_payslip(api_client: APIClient, bootstrapped_workspace):
    hr_token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {hr_token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)
    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_response.status_code == 200, generate_response.json()
    batch_id = generate_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    published_artifact = PayrollOutputArtifact.objects.get(
        output_batch_id=batch_id,
        kind=PayrollOutputArtifactKind.PAYSLIP,
        employee__employee_code="EMP-0042",
    )
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact=published_artifact,
        event_type=PayrollArtifactAccessEventType.PUBLISHED,
    ).count() == 1
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact=published_artifact,
        event_type=PayrollArtifactAccessEventType.NOTIFIED,
    ).count() == 1
    publish_notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="payroll_payslip",
        subject_identifier=str(published_artifact.id),
        recipient_membership=employee.membership,
    ).first()
    assert publish_notification is not None
    assert publish_notification.status == NotificationStatus.DELIVERED
    assert publish_notification.payload["download_strategy_ref"] == "payroll.download.stream.local.v1"

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    list_response = api_client.get("/api/v1/me/payroll-payslips/")
    assert list_response.status_code == 200, list_response.json()
    payload = list_response.json()
    assert payload["summary"]["published_payslip_count"] == 1
    assert payload["summary"]["downloadable_payslip_count"] == 1
    assert payload["summary"]["latest_net_pay"] == "28200.00"
    assert payload["items"][0]["payroll_run_name"] == "Calculation Run September 2026"
    assert payload["items"][0]["period_name"] == "Calculation September 2026"
    assert payload["items"][0]["download_url"].endswith(f"/me/payroll-payslips/{payload['items'][0]['id']}/download/")
    assert payload["items"][0]["storage_object_version"]
    assert payload["items"][0]["download_strategy_ref"] == "payroll.download.stream.local.v1"
    assert payload["items"][0]["supports_signed_url"] is False
    assert payload["items"][0]["line_snapshot"][0]["component_code"] == "BASIC"
    assert payload["items"][0]["access_summary"]["published_event_count"] == 1
    assert payload["items"][0]["access_summary"]["notification_count"] == 1
    assert payload["items"][0]["access_summary"]["download_count"] == 0
    assert payload["items"][0]["access_summary"]["is_read_acknowledged"] is False
    assert {item["event_type"] for item in payload["items"][0]["access_events"]} >= {
        PayrollArtifactAccessEventType.PUBLISHED,
        PayrollArtifactAccessEventType.NOTIFIED,
    }

    invalid_year_response = api_client.get("/api/v1/me/payroll-payslips/?year=not-a-year")
    assert invalid_year_response.status_code == 200, invalid_year_response.json()
    assert invalid_year_response.json()["total_count"] == 0

    download_response = api_client.get(payload["items"][0]["download_url"])
    assert download_response.status_code == 200
    assert download_response["Content-Type"].startswith("text/html")
    assert download_response["X-Payroll-Artifact-Checksum"] == payload["items"][0]["checksum_sha256"]
    assert download_response["X-Payroll-Storage-Version"] == payload["items"][0]["storage_object_version"]
    assert b"EMP-0042" in download_response.content
    assert PayrollArtifactAccessEvent.objects.filter(
        output_artifact=published_artifact,
        event_type=PayrollArtifactAccessEventType.DOWNLOADED,
        source_channel_ref="employee.portal.v1",
    ).count() == 1

    read_response = api_client.post(f"/api/v1/me/payroll-payslips/{payload['items'][0]['id']}/read/", {}, format="json")
    assert read_response.status_code == 200, read_response.json()
    assert read_response.json()["access_summary"]["is_read_acknowledged"] is True
    assert read_response.json()["access_summary"]["read_acknowledgement_count"] == 1
    publish_notification.refresh_from_db()
    assert publish_notification.status == NotificationStatus.READ
    assert publish_notification.read_at is not None
    read_event = PayrollArtifactAccessEvent.objects.get(
        output_artifact=published_artifact,
        event_type=PayrollArtifactAccessEventType.READ_ACKNOWLEDGED,
    )
    read_event.actor_identifier = "tampered-actor"
    with pytest.raises(ValidationError, match="append-only"):
        read_event.save()

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    denied_response = api_client.get(payload["items"][0]["download_url"])
    assert denied_response.status_code == 404
    denied_read_response = api_client.post(f"/api/v1/me/payroll-payslips/{payload['items'][0]['id']}/read/", {}, format="json")
    assert denied_read_response.status_code == 404
    manager_list_response = api_client.get("/api/v1/me/payroll-payslips/")
    assert manager_list_response.status_code == 200, manager_list_response.json()
    assert manager_list_response.json()["summary"]["published_payslip_count"] == 0


def test_employee_payroll_payslips_hide_unpublished_artifacts(api_client: APIClient, bootstrapped_workspace):
    hr_token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {hr_token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)
    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 200, generate_response.json()
    generated_payslip = next(item for item in generate_response.json()["artifacts"] if item["kind"] == PayrollOutputArtifactKind.PAYSLIP)

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    list_response = api_client.get("/api/v1/me/payroll-payslips/")
    assert list_response.status_code == 200, list_response.json()
    assert list_response.json()["summary"]["published_payslip_count"] == 0
    download_response = api_client.get(f"/api/v1/me/payroll-payslips/{generated_payslip['id']}/download/")
    assert download_response.status_code == 404


def test_hr_admin_payroll_outputs_require_final_locked_review(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    payroll_run, _snapshot = create_calculable_payroll_run(tenant=tenant, employee=employee)
    calculate_response = api_client.post(f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/calculate-draft/", {}, format="json")
    assert calculate_response.status_code == 200, calculate_response.json()
    open_response = api_client.post(
        f"/api/v1/hr-admin/payroll-runs/{payroll_run.id}/open-review/",
        {"calculation_id": calculate_response.json()["calculation"]["id"]},
        format="json",
    )
    assert open_response.status_code == 200, open_response.json()

    generate_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{open_response.json()['review']['id']}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_response.status_code == 400
    assert "final-locked" in generate_response.json()["detail"]
    assert PayrollOutputBatch.objects.count() == 0


def test_hr_admin_payroll_finance_handoff_generate_and_transmit(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()

    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {"handoff_profile_ref": "india.monthly.finance.handoff.v1"},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_payload = handoff_response.json()
    handoff_id = handoff_payload["handoff"]["id"]
    assert handoff_payload["handoff"]["status"] == PayrollFinanceHandoffStatus.GENERATED
    assert handoff_payload["handoff"]["handoff_profile_ref"] == "india.monthly.finance.handoff.v1"
    assert handoff_payload["handoff"]["artifact_count"] == 3
    assert handoff_payload["handoff"]["totals_snapshot"]["net_pay"] == "28200.00"
    assert {item["kind"] for item in handoff_payload["artifacts"]} == {
        PayrollOutputArtifactKind.BANK_ADVICE,
        PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
        PayrollOutputArtifactKind.STATUTORY_REPORT,
    }
    bank_advice = next(item for item in handoff_payload["artifacts"] if item["kind"] == PayrollOutputArtifactKind.BANK_ADVICE)
    assert bank_advice["line_snapshot"][0]["employee_code"] == "EMP-0042"
    assert bank_advice["line_snapshot"][0]["net_pay"] == "28200.00"
    assert bank_advice["source_hash"]
    assert bank_advice["file_name"].endswith(".csv")
    assert bank_advice["mime_type"] == "text/csv"
    assert bank_advice["file_size_bytes"] > 0
    assert bank_advice["download_url"] is None

    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    transmit_payload = transmit_response.json()
    assert transmit_payload["handoff"]["status"] == PayrollFinanceHandoffStatus.TRANSMITTED
    assert transmit_payload["handoff"]["handoff_summary_snapshot"]["published_count"] == 3
    assert transmit_payload["handoff"]["handoff_summary_snapshot"]["delivery_count"] == 3
    assert transmit_payload["handoff"]["handoff_summary_snapshot"]["submitted_delivery_count"] == 3
    assert all(item["status"] == PayrollOutputArtifactStatus.PUBLISHED for item in transmit_payload["artifacts"])
    assert len(transmit_payload["deliveries"]) == 3
    assert {item["status"] for item in transmit_payload["deliveries"]} == {PayrollProviderDeliveryStatus.SUBMITTED}
    assert all(item["provider_ref"].startswith("payroll.provider.") for item in transmit_payload["deliveries"])
    assert all(item["payload_checksum_sha256"] for item in transmit_payload["deliveries"])
    transmitted_bank_advice = next(item for item in transmit_payload["artifacts"] if item["kind"] == PayrollOutputArtifactKind.BANK_ADVICE)
    assert transmitted_bank_advice["download_url"]

    finance_download_response = api_client.get(transmitted_bank_advice["download_url"])
    assert finance_download_response.status_code == 200
    assert finance_download_response["Content-Type"].startswith("text/csv")
    assert finance_download_response["X-Payroll-Artifact-Checksum"] == transmitted_bank_advice["checksum_sha256"]
    assert finance_download_response["X-Payroll-Storage-Version"] == transmitted_bank_advice["storage_object_version"]
    assert finance_download_response["X-Payroll-Download-Strategy"] == transmitted_bank_advice["download_strategy_ref"]
    assert b"employee_code" in finance_download_response.content
    assert b"EMP-0042" in finance_download_response.content

    acknowledge_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/acknowledge/",
        {
            "acknowledgement_profile_ref": "india.monthly.provider.ack.v1",
            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
            "response_snapshot": {"provider_batch_ref": "BANK-ACK-2026-08"},
        },
        format="json",
    )
    assert acknowledge_response.status_code == 200, acknowledge_response.json()
    acknowledge_payload = acknowledge_response.json()
    assert acknowledge_payload["handoff"]["status"] == PayrollFinanceHandoffStatus.ACCEPTED
    assert acknowledge_payload["handoff"]["handoff_summary_snapshot"]["reconciled_delivery_count"] == 3
    assert len(acknowledge_payload["deliveries"]) == 3
    assert {item["status"] for item in acknowledge_payload["deliveries"]} == {PayrollProviderDeliveryStatus.RECONCILED}
    bank_delivery = next(item for item in acknowledge_payload["deliveries"] if item["artifact_kind"] == PayrollOutputArtifactKind.BANK_ADVICE)
    assert bank_delivery["response_snapshot"]["provider_batch_ref"] == "BANK-ACK-2026-08"
    assert bank_delivery["request_snapshot"]["storage_object_version"] == transmitted_bank_advice["storage_object_version"]
    assert bank_delivery["request_snapshot"]["download_strategy_ref"] == transmitted_bank_advice["download_strategy_ref"]
    assert bank_delivery["reconciliation_snapshot"]["checksum_matched"] is True
    assert bank_delivery["reconciled_by_name"]

    setup_response = api_client.get("/api/v1/hr-admin/payroll-finance-handoff-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["handoff_count"] == 1
    assert setup_payload["summary"]["transmitted_handoff_count"] == 0
    assert setup_payload["summary"]["accepted_handoff_count"] == 1
    assert setup_payload["summary"]["reconciled_delivery_count"] == 3
    assert setup_payload["summary"]["finance_artifact_count"] == 3
    assert PayrollFinanceHandoff.objects.filter(id=handoff_id, status=PayrollFinanceHandoffStatus.ACCEPTED).exists()
    assert PayrollProviderDelivery.objects.filter(handoff_id=handoff_id, status=PayrollProviderDeliveryStatus.RECONCILED).count() == 3


def test_payroll_provider_callback_endpoint_verifies_idempotent_delivery_updates(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {"handoff_profile_ref": "india.monthly.finance.handoff.v1"},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE)
    assert delivery.request_snapshot["submission_contract"]["idempotency_key"]

    payload_snapshot = {
        "provider_batch_ref": "BANK-CALLBACK-2026-08",
        "settlement_reference": "UTR-4488122",
        "line_count": delivery.request_snapshot["line_count"],
    }
    payload_checksum = hashlib.sha256(json.dumps(payload_snapshot, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")).hexdigest()
    idempotency_key = "bank-callback-aug-2026-001"
    signature = expected_provider_callback_signature(
        delivery,
        idempotency_key=idempotency_key,
        payload_checksum_sha256=payload_checksum,
    )
    api_client.credentials()
    callback_response = api_client.post(
        "/api/v1/payroll-provider-callbacks/",
        {
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "external_reference": delivery.external_reference,
            "external_event_id": "evt-bank-aug-2026-001",
            "idempotency_key": idempotency_key,
            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
            "payload_snapshot": payload_snapshot,
            "signature": signature,
        },
        format="json",
    )
    assert callback_response.status_code == 200, callback_response.json()
    callback_payload = callback_response.json()
    assert callback_payload["replayed"] is False
    assert callback_payload["callback_event"]["status"] == PayrollProviderCallbackEventStatus.PROCESSED
    assert callback_payload["callback_event"]["verification_snapshot"]["signature_valid"] is True
    assert callback_payload["callback_event"]["verification_snapshot"]["callback_security"]["passed"] is True
    assert callback_payload["callback_event"]["verification_snapshot"]["callback_security"]["gates"][0]["ref"] == "callback_signature_matched"
    assert callback_payload["callback_event"]["payload_checksum_sha256"] == payload_checksum
    assert callback_payload["delivery"]["status"] == PayrollProviderDeliveryStatus.RECONCILED
    assert callback_payload["delivery"]["response_snapshot"]["external_event_id"] == "evt-bank-aug-2026-001"
    assert callback_payload["delivery"]["reconciliation_snapshot"]["callback_event_id"] == callback_payload["callback_event"]["id"]
    assert PayrollProviderCallbackEvent.objects.filter(provider_ref=delivery.provider_ref, idempotency_key=idempotency_key).count() == 1

    replay_response = api_client.post(
        "/api/v1/payroll-provider-callbacks/",
        {
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "external_reference": delivery.external_reference,
            "external_event_id": "evt-bank-aug-2026-001",
            "idempotency_key": idempotency_key,
            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
            "payload_snapshot": payload_snapshot,
            "signature": signature,
        },
        format="json",
    )
    assert replay_response.status_code == 200, replay_response.json()
    assert replay_response.json()["replayed"] is True
    assert PayrollProviderCallbackEvent.objects.filter(provider_ref=delivery.provider_ref, idempotency_key=idempotency_key).count() == 1

    rejected_response = api_client.post(
        "/api/v1/payroll-provider-callbacks/",
        {
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "external_reference": delivery.external_reference,
            "external_event_id": "evt-bank-aug-2026-bad-signature",
            "idempotency_key": "bank-callback-aug-2026-bad-signature",
            "provider_status": PayrollProviderDeliveryStatus.FAILED,
            "payload_snapshot": {"failure_code": "bad_signature_probe"},
            "signature": "invalid-signature",
        },
        format="json",
    )
    assert rejected_response.status_code == 400, rejected_response.json()
    assert rejected_response.json()["callback_event"]["status"] == PayrollProviderCallbackEventStatus.REJECTED
    assert rejected_response.json()["callback_event"]["verification_snapshot"]["signature_valid"] is False
    assert "callback_signature_matched" in rejected_response.json()["callback_event"]["verification_snapshot"]["callback_security"]["blocking_gate_refs"]
    assert rejected_response.json()["delivery"]["status"] == PayrollProviderDeliveryStatus.RECONCILED

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    setup_response = api_client.get("/api/v1/hr-admin/payroll-finance-handoff-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    assert setup_response.json()["summary"]["provider_callback_event_count"] == 2
    assert setup_response.json()["summary"]["processed_provider_callback_event_count"] == 1
    assert setup_response.json()["summary"]["rejected_provider_callback_event_count"] == 1


def test_payroll_provider_callback_endpoint_enforces_strict_security_policy(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {"handoff_profile_ref": "india.monthly.finance.handoff.v1"},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.STATUTORY_REPORT)
    config_snapshot = delivery.config_snapshot
    config_snapshot["submission_contract"]["callback_security_policy"] = {
        "security_policy_ref": "tenant.callback_security.strict.v1",
        "enforcement_mode": "strict",
        "signature_algorithm_ref": "payroll.callback.signature.sha256.v1",
        "secret_rotation_ref": "tenant.callback_secret_rotation.quarterly.v1",
        "replay_window_seconds": 60,
        "timestamp_required": True,
        "source_ip_required": True,
        "allowed_source_ips": ["203.0.113.10"],
        "rate_limit_policy_ref": "tenant.callback_rate_limit.strict.v1",
        "rate_limit_window_seconds": 60,
        "rate_limit_max_events": 10,
    }
    delivery.config_snapshot = config_snapshot
    delivery.save()

    payload_snapshot = {
        "provider_batch_ref": "PT-CALLBACK-2026-08",
        "certification_evidence_refs": ["clear://certificates/pt-aug-2026.pdf"],
    }
    payload_checksum = hashlib.sha256(json.dumps(payload_snapshot, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")).hexdigest()
    idempotency_key = "statutory-callback-aug-2026-strict"
    signature = expected_provider_callback_signature(
        delivery,
        idempotency_key=idempotency_key,
        payload_checksum_sha256=payload_checksum,
    )
    api_client.credentials()
    rejected_response = api_client.post(
        "/api/v1/payroll-provider-callbacks/",
        {
            "provider_delivery_id": str(delivery.id),
            "provider_ref": delivery.provider_ref,
            "external_reference": delivery.external_reference,
            "external_event_id": "evt-pt-aug-2026-strict",
            "idempotency_key": idempotency_key,
            "event_timestamp": (timezone.now() - timedelta(minutes=5)).isoformat(),
            "source_ip": "198.51.100.50",
            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
            "payload_snapshot": payload_snapshot,
            "signature": signature,
        },
        format="json",
    )
    assert rejected_response.status_code == 400, rejected_response.json()
    callback_event = rejected_response.json()["callback_event"]
    assert callback_event["status"] == PayrollProviderCallbackEventStatus.REJECTED
    assert callback_event["failure_code"] == "callback_security_policy_failed"
    callback_security = callback_event["verification_snapshot"]["callback_security"]
    assert callback_security["security_policy_ref"] == "tenant.callback_security.strict.v1"
    assert "callback_replay_window" in callback_security["blocking_gate_refs"]
    assert "callback_source_policy" in callback_security["blocking_gate_refs"]
    assert rejected_response.json()["delivery"]["status"] == PayrollProviderDeliveryStatus.SUBMITTED


def test_hr_admin_payroll_provider_delivery_retry_and_dead_letter_contract(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "payroll.provider.bank.manual.v1",
                        "retry_policy_ref": "bank.retry.short.v1",
                        "retry_policy": {
                            "max_attempts": 3,
                            "backoff_seconds": 60,
                            "failure_taxonomy_ref": "bank.failure.taxonomy.v1",
                            "failure_categories": {"BANK_TIMEOUT": "transient_network"},
                        },
                    },
                },
            },
        },
    )

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/", {}, format="json")
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    failure_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/acknowledge/",
        {
            "provider_status": PayrollProviderDeliveryStatus.FAILED,
            "failure_code": "BANK_TIMEOUT",
            "failure_reason": "Bank SFTP timed out.",
        },
        format="json",
    )
    assert failure_response.status_code == 200, failure_response.json()
    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE)
    assert delivery.status == PayrollProviderDeliveryStatus.FAILED

    schedule_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-deliveries/{delivery.id}/schedule-retry/",
        {"retry_reason": "Transient bank timeout."},
        format="json",
    )
    assert schedule_response.status_code == 200, schedule_response.json()
    schedule_payload = schedule_response.json()
    assert schedule_payload["retry_event"]["status"] == PayrollProviderRetryEventStatus.SCHEDULED
    assert schedule_payload["retry_event"]["attempt_number"] == 2
    assert schedule_payload["retry_event"]["failure_taxonomy_ref"] == "bank.failure.taxonomy.v1"
    assert schedule_payload["retry_event"]["failure_category_ref"] == "transient_network"
    assert schedule_payload["delivery"]["config_snapshot"]["retry_state"]["eligible"] is True

    requeue_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-deliveries/{delivery.id}/requeue/",
        {"retry_event_id": schedule_payload["retry_event"]["id"]},
        format="json",
    )
    assert requeue_response.status_code == 200, requeue_response.json()
    requeue_payload = requeue_response.json()
    assert requeue_payload["retry_event"]["status"] == PayrollProviderRetryEventStatus.EXECUTED
    assert requeue_payload["delivery"]["status"] == PayrollProviderDeliveryStatus.SUBMITTED
    assert requeue_payload["delivery"]["attempt_count"] == 2
    assert requeue_payload["delivery"]["request_snapshot"]["retry_context"]["state"] == "requeued"

    delivery.refresh_from_db()
    delivery.status = PayrollProviderDeliveryStatus.FAILED
    delivery.failure_code = "BANK_TIMEOUT"
    delivery.failure_reason = "Bank SFTP timed out after retries."
    delivery.attempt_count = 3
    delivery.save()
    dead_letter_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-deliveries/{delivery.id}/schedule-retry/",
        {"retry_reason": "Retry budget exhausted."},
        format="json",
    )
    assert dead_letter_response.status_code == 200, dead_letter_response.json()
    dead_letter_payload = dead_letter_response.json()
    assert dead_letter_payload["retry_event"]["status"] == PayrollProviderRetryEventStatus.DEAD_LETTERED
    assert dead_letter_payload["retry_event"]["failure_code"] == "retry_exhausted"
    assert dead_letter_payload["delivery"]["config_snapshot"]["retry_state"]["state"] == "dead_lettered"
    assert PayrollProviderRetryEvent.objects.filter(provider_delivery=delivery).count() == 2

    setup_response = api_client.get("/api/v1/hr-admin/payroll-finance-handoff-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    assert setup_response.json()["summary"]["provider_retry_event_count"] == 2
    assert setup_response.json()["summary"]["executed_provider_retry_event_count"] == 1
    assert setup_response.json()["summary"]["dead_lettered_provider_retry_event_count"] == 1


def test_payroll_provider_retry_worker_processes_due_events(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "payroll.provider.bank.manual.v1",
                        "retry_policy_ref": "bank.retry.worker.v1",
                        "retry_policy": {
                            "max_attempts": 3,
                            "backoff_seconds": 60,
                            "failure_taxonomy_ref": "bank.failure.taxonomy.v1",
                            "failure_categories": {"BANK_TIMEOUT": "transient_network"},
                        },
                        "execution_adapter": {
                            "worker_profile_ref": "bank.retry.worker.manual.v1",
                            "adapter_ref": "bank-neft.manual.adapter.v1",
                            "execution_mode": "manual_requeue",
                            "execution_strategy_ref": "bank.sftp.retry.manual.v1",
                            "dispatch_mode": "submitted_then_callback",
                        },
                    },
                },
            },
        },
    )

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/", {}, format="json")
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    failure_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/acknowledge/",
        {
            "provider_status": PayrollProviderDeliveryStatus.FAILED,
            "failure_code": "BANK_TIMEOUT",
            "failure_reason": "Bank SFTP timed out.",
        },
        format="json",
    )
    assert failure_response.status_code == 200, failure_response.json()
    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE)
    due_at = timezone.now() - timedelta(minutes=5)
    schedule_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-deliveries/{delivery.id}/schedule-retry/",
        {"retry_reason": "Worker should pick this up.", "scheduled_for": due_at.isoformat()},
        format="json",
    )
    assert schedule_response.status_code == 200, schedule_response.json()
    retry_event_id = schedule_response.json()["retry_event"]["id"]

    stdout = StringIO()
    call_command("process_payroll_provider_retries", tenant_code=tenant.code, limit=5, stdout=stdout)
    assert "1 executed, 0 skipped" in stdout.getvalue()

    retry_event = PayrollProviderRetryEvent.objects.get(id=retry_event_id)
    delivery.refresh_from_db()
    assert retry_event.status == PayrollProviderRetryEventStatus.EXECUTED
    assert retry_event.response_snapshot["adapter_execution"]["worker_profile_ref"] == "bank.retry.worker.manual.v1"
    assert retry_event.response_snapshot["adapter_execution"]["adapter_ref"] == "bank-neft.manual.adapter.v1"
    assert retry_event.response_snapshot["adapter_execution"]["execution_strategy_ref"] == "bank.sftp.retry.manual.v1"
    assert delivery.status == PayrollProviderDeliveryStatus.SUBMITTED
    assert delivery.attempt_count == 2
    assert delivery.request_snapshot["retry_context"]["state"] == "requeued"

    stale_event = PayrollProviderRetryEvent.objects.create(
        tenant=tenant,
        provider_delivery=delivery,
        handoff=delivery.handoff,
        output_artifact=delivery.output_artifact,
        status=PayrollProviderRetryEventStatus.SCHEDULED,
        retry_policy_ref=delivery.retry_policy_ref,
        failure_taxonomy_ref="bank.failure.taxonomy.v1",
        failure_category_ref="transient_network",
        retry_reason="Delivery already requeued.",
        attempt_number=3,
        scheduled_for=timezone.now() - timedelta(minutes=1),
    )
    stdout = StringIO()
    call_command("process_payroll_provider_retries", tenant_code=tenant.code, limit=5, stdout=stdout)
    assert "0 executed, 1 skipped" in stdout.getvalue()
    stale_event.refresh_from_db()
    assert stale_event.status == PayrollProviderRetryEventStatus.SKIPPED
    assert stale_event.failure_code == "delivery_not_retryable"


@override_settings(
    PAYROLL_PROVIDER_CREDENTIALS={
        "bank-sandbox-credential": {
            "provider_ref": "payroll.provider.bank.manual.v1",
            "use_sandbox": True,
            "credentials": {"api_key": "super-secret-provider-key"},
            "metadata": {"environment": "sandbox", "owner": "payroll-ops"},
        },
    },
)
def test_payroll_provider_adapter_boundary_resolves_sandbox_credentials(api_client: APIClient, bootstrapped_workspace):
    with pytest.raises(PayrollProviderAdapterError):
        validate_payroll_provider_route_config({"execution_adapter": {"api_key": "do-not-store"}})

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "payroll.provider.bank.manual.v1",
                        "channel_ref": "payroll.channel.bank.sandbox.v1",
                        "adapter_ref": "payroll.provider_adapter.sandbox.v1",
                        "submission_mode": "sandbox_api",
                        "submission_profile_ref": "bank-neft.sandbox.submit.v1",
                        "request_schema_ref": "bank-neft.sandbox.request.v1",
                        "response_schema_ref": "bank-neft.sandbox.response.v1",
                        "callback_profile_ref": "bank-neft.sandbox.callback.v1",
                        "callback_verification_ref": "bank-neft.sandbox.callback.hmac.v1",
                        "credential_ref": "bank-sandbox-credential",
                        "credential_required": True,
                        "sandbox_response": {
                            "provider_status": PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                            "provider_batch_ref": "BANK-SANDBOX-ACK-2026-08",
                            "external_reference": "BANK-SANDBOX-EXT-2026-08",
                        },
                    },
                },
            },
        },
    )

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/", {}, format="json")
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()

    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE)
    assert delivery.status == PayrollProviderDeliveryStatus.ACKNOWLEDGED
    assert delivery.external_reference == "BANK-SANDBOX-EXT-2026-08"
    adapter_submission = delivery.response_snapshot["adapter_submission"]
    credential_snapshot = adapter_submission["request"]["credential_snapshot"]
    assert credential_snapshot["credential_ref"] == "bank-sandbox-credential"
    assert credential_snapshot["resolved"] is True
    assert credential_snapshot["metadata"] == {"environment": "sandbox", "owner": "payroll-ops"}
    assert delivery.response_snapshot["provider_batch_ref"] == "BANK-SANDBOX-ACK-2026-08"
    assert delivery.response_snapshot["response_schema_ref"] == "bank-neft.sandbox.response.v1"
    assert "super-secret-provider-key" not in json.dumps(delivery.request_snapshot)
    assert "super-secret-provider-key" not in json.dumps(delivery.response_snapshot)
    assert "super-secret-provider-key" not in json.dumps(delivery.config_snapshot)
    contract_validation = adapter_submission["request"]["adapter_contract_validation"]
    assert contract_validation["request"]["status"] == "passed"
    assert contract_validation["result"]["status"] == "passed"


def test_payroll_provider_adapter_strict_contract_blocks_invalid_result(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "payroll.provider.bank.strict-contract.v1",
                        "channel_ref": "payroll.channel.bank.strict-contract.v1",
                        "adapter_ref": "payroll.provider_adapter.manual.v1",
                        "submission_mode": "api",
                        "submission_profile_ref": "bank.strict-contract.submit.v1",
                        "request_schema_ref": "bank.strict-contract.request.v1",
                        "response_schema_ref": "bank.strict-contract.response.v1",
                        "callback_profile_ref": "bank.strict-contract.callback.v1",
                        "callback_verification_ref": "bank.strict-contract.callback.hmac.v1",
                        "adapter_contract": {
                            "contract_profile_ref": "bank.strict-contract.adapter.v1",
                            "enforcement_mode": "strict",
                            "expected_adapter_ref": "payroll.provider_adapter.manual.v1",
                            "expected_provider_ref": "payroll.provider.bank.strict-contract.v1",
                            "response_snapshot_required_fields": ["domain_contract_ref"],
                        },
                    },
                },
            },
        },
    )

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/", {}, format="json")
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()

    delivery = PayrollProviderDelivery.objects.get(handoff_id=handoff_id, artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE)
    assert delivery.status == PayrollProviderDeliveryStatus.FAILED
    assert delivery.failure_code == "provider_adapter_result_contract_failed"
    assert delivery.request_snapshot["provider_submission_request"]["adapter_contract_validation"]["request"]["status"] == "passed"
    assert "response_snapshot:domain_contract_ref" in delivery.failure_reason
    assert delivery.config_snapshot["submission_contract"]["adapter_contract"]["enforcement_mode"] == "strict"


def test_payroll_provider_specific_sandbox_adapters_stamp_domain_contracts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "payroll.provider.bank.sandbox.v1",
                        "channel_ref": "payroll.channel.bank.sandbox.v1",
                        "adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
                        "submission_mode": "sandbox_api",
                        "submission_profile_ref": "bank-neft.sandbox.submit.v1",
                        "request_schema_ref": "bank-neft.sandbox.request.v1",
                        "response_schema_ref": "bank-neft.sandbox.response.v1",
                        "sandbox_response": {
                            "provider_status": PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                            "provider_batch_ref": "BANK-DOMAIN-SANDBOX",
                        },
                    },
                    "accounting_export": {
                        "provider_ref": "payroll.provider.accounting.sandbox.v1",
                        "channel_ref": "payroll.channel.accounting.sandbox.v1",
                        "adapter_ref": "payroll.provider_adapter.accounting.sandbox.v1",
                        "submission_mode": "sandbox_api",
                        "submission_profile_ref": "accounting-journal.sandbox.submit.v1",
                        "request_schema_ref": "accounting-journal.sandbox.request.v1",
                        "response_schema_ref": "accounting-journal.sandbox.response.v1",
                        "sandbox_response": {
                            "provider_status": PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                            "provider_batch_ref": "LEDGER-DOMAIN-SANDBOX",
                        },
                    },
                    "statutory_report": {
                        "provider_ref": "payroll.provider.statutory.sandbox.v1",
                        "channel_ref": "payroll.channel.statutory.sandbox.v1",
                        "adapter_ref": "payroll.provider_adapter.statutory.sandbox.v1",
                        "submission_mode": "sandbox_api",
                        "submission_profile_ref": "statutory-filing.sandbox.submit.v1",
                        "request_schema_ref": "statutory-filing.sandbox.request.v1",
                        "response_schema_ref": "statutory-filing.sandbox.response.v1",
                        "sandbox_response": {
                            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
                            "provider_batch_ref": "STAT-DOMAIN-SANDBOX",
                            "certification_evidence_refs": ["sandbox://statutory/receipt/aug-2026"],
                        },
                    },
                },
            },
        },
    )

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/", {}, format="json")
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()

    deliveries = {
        item.artifact_kind: item
        for item in PayrollProviderDelivery.objects.filter(handoff_id=handoff_id).select_related("output_artifact")
    }
    bank_delivery = deliveries[PayrollOutputArtifactKind.BANK_ADVICE]
    accounting_delivery = deliveries[PayrollOutputArtifactKind.ACCOUNTING_EXPORT]
    statutory_delivery = deliveries[PayrollOutputArtifactKind.STATUTORY_REPORT]

    assert bank_delivery.response_snapshot["adapter_family"] == "bank"
    assert bank_delivery.response_snapshot["domain_contract_ref"] == "payroll.provider_contract.bank_payment_instruction.v1"
    assert bank_delivery.response_snapshot["payment_file_name"].endswith("bank-advice.csv")
    assert bank_delivery.response_snapshot["provider_batch_ref"] == "BANK-DOMAIN-SANDBOX"

    assert accounting_delivery.response_snapshot["adapter_family"] == "accounting"
    assert accounting_delivery.response_snapshot["domain_contract_ref"] == "payroll.provider_contract.accounting_journal_import.v1"
    assert accounting_delivery.response_snapshot["ledger_file_name"].endswith("accounting-export.csv")
    assert accounting_delivery.response_snapshot["provider_batch_ref"] == "LEDGER-DOMAIN-SANDBOX"

    assert statutory_delivery.status == PayrollProviderDeliveryStatus.RECONCILED
    assert statutory_delivery.response_snapshot["adapter_family"] == "statutory"
    assert statutory_delivery.response_snapshot["domain_contract_ref"] == "payroll.provider_contract.statutory_filing_upload.v1"
    assert statutory_delivery.response_snapshot["filing_file_name"].endswith("statutory-summary.csv")
    assert statutory_delivery.config_snapshot["certification_evidence"]["evidence_refs"] == ["sandbox://statutory/receipt/aug-2026"]


def test_hr_admin_payroll_provider_connection_setup_certification_and_activation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant

    setup_response = api_client.get("/api/v1/hr-admin/payroll-provider-connection-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    setup_payload = setup_response.json()
    assert setup_payload["summary"]["connection_count"] >= 3
    assert "clear-statutory.portal.v1" in {item["provider_ref"] for item in setup_payload["connections"]}
    assert PayrollProviderConnection.objects.filter(tenant=tenant, provider_ref="clear-statutory.portal.v1").exists()

    raw_secret_response = api_client.post(
        "/api/v1/hr-admin/payroll-provider-connections/",
        {
            "provider_ref": "unsafe.provider.v1",
            "provider_name": "Unsafe provider",
            "provider_kind": "bank",
            "credential_required": True,
            "config_snapshot": {"provider_route": {"api_key": "do-not-store"}},
        },
        format="json",
    )
    assert raw_secret_response.status_code == 400
    assert "raw credentials" in json.dumps(raw_secret_response.json()).lower()

    invalid_active_response = api_client.post(
        "/api/v1/hr-admin/payroll-provider-connections/",
        {
            "provider_ref": "custom.bank.provider.v1",
            "provider_name": "Custom Bank Provider",
            "provider_kind": "bank",
            "environment_ref": "sandbox",
            "status": PayrollProviderConnectionStatus.ACTIVE,
            "adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
            "sandbox_adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
            "channel_ref": "bank.sftp.channel.custom.v1",
            "credential_ref": "custom-bank-sandbox-credential",
            "credential_profile_ref": "bank.credentials.sandbox.v1",
            "credential_required": True,
            "callback_profile_ref": "bank.sftp.callback.v1",
            "callback_verification_ref": "bank.sftp.callback.hmac.v1",
            "retry_policy_ref": "payroll.delivery.retry.bank.v1",
            "certification_profile_ref": "bank.neft.certification.v1",
        },
        format="json",
    )
    assert invalid_active_response.status_code == 400
    assert "passed certification" in json.dumps(invalid_active_response.json()).lower()

    create_response = api_client.post(
        "/api/v1/hr-admin/payroll-provider-connections/",
        {
            "provider_ref": "custom.bank.provider.v1",
            "provider_name": "Custom Bank Provider",
            "provider_kind": "bank",
            "environment_ref": "sandbox",
            "status": PayrollProviderConnectionStatus.CONFIGURED,
            "adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
            "sandbox_adapter_ref": "payroll.provider_adapter.bank.sandbox.v1",
            "channel_ref": "bank.sftp.channel.custom.v1",
            "credential_ref": "custom-bank-sandbox-credential",
            "credential_profile_ref": "bank.credentials.sandbox.v1",
            "credential_required": True,
            "callback_profile_ref": "bank.sftp.callback.v1",
            "callback_verification_ref": "bank.sftp.callback.hmac.v1",
            "retry_policy_ref": "payroll.delivery.retry.bank.v1",
            "certification_profile_ref": "bank.neft.certification.v1",
            "config_snapshot": {"provider_route": {"credential_ref": "custom-bank-sandbox-credential"}},
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    connection_payload = create_response.json()["connection"]
    assert connection_payload["status"] == PayrollProviderConnectionStatus.SANDBOX_READY
    assert connection_payload["readiness_snapshot"]["ready_gate_count"] == 5
    assert connection_payload["readiness_snapshot"]["active_allowed"] is False

    connection_id = connection_payload["id"]
    certify_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-connections/{connection_id}/certify/",
        {
            "certification_status": PayrollProviderCertificationStatus.PASSED,
            "evidence_snapshot": {
                "test_pack_ref": "bank.neft.certification_pack.v1",
                "sandbox_delivery_count": 3,
                "callback_verified": True,
            },
        },
        format="json",
    )
    assert certify_response.status_code == 200, certify_response.json()
    certified_payload = certify_response.json()["connection"]
    assert certified_payload["certification_status"] == PayrollProviderCertificationStatus.PASSED
    assert certified_payload["status"] == PayrollProviderConnectionStatus.CERTIFIED
    assert certified_payload["readiness_snapshot"]["active_allowed"] is True
    assert certified_payload["certification_snapshot"]["evidence_hash"]

    activate_response = api_client.patch(
        f"/api/v1/hr-admin/payroll-provider-connections/{connection_id}/",
        {"status": PayrollProviderConnectionStatus.ACTIVE},
        format="json",
    )
    assert activate_response.status_code == 200, activate_response.json()
    assert activate_response.json()["connection"]["status"] == PayrollProviderConnectionStatus.ACTIVE


def test_hr_admin_payroll_provider_connection_runs_automated_certification(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant

    setup_response = api_client.get("/api/v1/hr-admin/payroll-provider-connection-setup/")
    assert setup_response.status_code == 200, setup_response.json()
    accounting_connection = PayrollProviderConnection.objects.get(
        tenant=tenant,
        provider_ref="payroll.provider.accounting.sandbox.v1",
    )

    run_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-connections/{accounting_connection.id}/run-certification/",
        {},
        format="json",
    )
    assert run_response.status_code == 200, run_response.json()
    payload = run_response.json()
    run_payload = payload["certification_run"]
    assert run_payload["status"] == PayrollProviderCertificationRunStatus.PASSED
    assert run_payload["scenario_count"] == 2
    assert run_payload["passed_count"] == 2
    assert run_payload["failed_count"] == 0
    assert run_payload["evidence_snapshot"]["scenario_results"][0]["adapter_ref"] == "payroll.provider_adapter.accounting.sandbox.v1"
    assert run_payload["evidence_snapshot"]["sandbox_delivery_count"] == 2
    assert payload["connection"]["certification_status"] == PayrollProviderCertificationStatus.PASSED
    assert payload["connection"]["status"] == PayrollProviderConnectionStatus.CERTIFIED
    assert payload["connection"]["readiness_snapshot"]["active_allowed"] is True

    setup_after_run = api_client.get("/api/v1/hr-admin/payroll-provider-connection-setup/")
    assert setup_after_run.status_code == 200, setup_after_run.json()
    assert setup_after_run.json()["summary"]["certification_run_count"] >= 1
    assert any(
        item["id"] == run_payload["id"]
        for item in setup_after_run.json()["certification_runs"]
    )


def test_hr_admin_payroll_provider_connection_failed_certification_blocks_connection(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    connection = PayrollProviderConnection.objects.create(
        tenant=tenant,
        provider_ref="failing.bank.provider.v1",
        provider_name="Failing Bank Provider",
        provider_kind="bank",
        environment_ref="sandbox",
        status=PayrollProviderConnectionStatus.SANDBOX_READY,
        adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        sandbox_adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        channel_ref="bank.sftp.channel.failing.v1",
        credential_required=False,
        callback_profile_ref="bank.sftp.callback.v1",
        callback_verification_ref="bank.sftp.callback.hmac.v1",
        retry_policy_ref="payroll.delivery.retry.bank.v1",
        certification_status=PayrollProviderCertificationStatus.PENDING,
        certification_profile_ref="bank.neft.certification.v1",
        config_snapshot={
            "certification_scenarios": [
                {
                    "scenario_ref": "bank_rejection_simulation",
                    "label": "Bank rejection simulation",
                    "artifact_kind": PayrollOutputArtifactKind.BANK_ADVICE,
                    "route_key": "bank_advice:rejection",
                    "expected_provider_status": "submitted",
                    "sandbox_response": {
                        "provider_status": "rejected",
                        "failure_code": "sandbox_rejected",
                        "failure_reason": "Simulated certification rejection.",
                    },
                }
            ],
        },
    )

    run_response = api_client.post(
        f"/api/v1/hr-admin/payroll-provider-connections/{connection.id}/run-certification/",
        {},
        format="json",
    )
    assert run_response.status_code == 200, run_response.json()
    payload = run_response.json()
    assert payload["certification_run"]["status"] == PayrollProviderCertificationRunStatus.FAILED
    assert payload["certification_run"]["failed_count"] == 1
    assert payload["certification_run"]["error_snapshot"]["failed_scenario_refs"] == ["bank_rejection_simulation"]
    assert payload["connection"]["certification_status"] == PayrollProviderCertificationStatus.FAILED
    assert payload["connection"]["status"] == PayrollProviderConnectionStatus.BLOCKED

    connection.refresh_from_db()
    assert PayrollProviderCertificationRun.objects.filter(provider_connection=connection, status=PayrollProviderCertificationRunStatus.FAILED).exists()
    assert connection.certification_snapshot["evidence_snapshot"]["scenario_results"][0]["failure_code"] == "sandbox_rejected"


def test_payroll_finance_handoff_blocks_uncertified_provider_connection(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    PayrollProviderConnection.objects.create(
        tenant=tenant,
        provider_ref="blocked.bank.provider.v1",
        provider_name="Blocked Bank Provider",
        provider_kind="bank",
        environment_ref="sandbox",
        status=PayrollProviderConnectionStatus.SANDBOX_READY,
        adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        sandbox_adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        channel_ref="bank.sftp.channel.blocked.v1",
        credential_required=False,
        callback_profile_ref="bank.sftp.callback.v1",
        callback_verification_ref="bank.sftp.callback.hmac.v1",
        retry_policy_ref="payroll.delivery.retry.bank.v1",
        certification_status=PayrollProviderCertificationStatus.PENDING,
        certification_profile_ref="bank.neft.certification.v1",
    )
    blocked_review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "blocked.bank.provider.v1",
                        "provider_connection_policy": {"enforcement_mode": "certified"},
                    },
                },
            },
        },
    )
    blocked_outputs = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{blocked_review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert blocked_outputs.status_code == 200, blocked_outputs.json()
    blocked_batch_id = blocked_outputs.json()["output_batch"]["id"]
    blocked_publish = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{blocked_batch_id}/publish/", {}, format="json")
    assert blocked_publish.status_code == 200, blocked_publish.json()
    blocked_handoff = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{blocked_batch_id}/generate-finance-handoff/", {}, format="json")
    assert blocked_handoff.status_code == 200, blocked_handoff.json()
    blocked_transmit = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{blocked_handoff.json()['handoff']['id']}/transmit/",
        {},
        format="json",
    )
    assert blocked_transmit.status_code == 400
    assert "must pass certification" in blocked_transmit.json()["detail"]


def test_payroll_finance_handoff_resolves_active_provider_connection_refs(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    active_connection = PayrollProviderConnection.objects.create(
        tenant=tenant,
        provider_ref="active.bank.provider.v1",
        provider_name="Active Bank Provider",
        provider_kind="bank",
        environment_ref="sandbox",
        status=PayrollProviderConnectionStatus.ACTIVE,
        adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        sandbox_adapter_ref="payroll.provider_adapter.bank.sandbox.v1",
        channel_ref="bank.sftp.channel.active.v1",
        credential_required=False,
        callback_profile_ref="bank.sftp.callback.v1",
        callback_verification_ref="bank.sftp.callback.hmac.v1",
        retry_policy_ref="payroll.delivery.retry.bank.v1",
        certification_status=PayrollProviderCertificationStatus.PASSED,
        certification_profile_ref="bank.neft.certification.v1",
    )

    active_review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "finance_handoff_profile": {
                "provider_routes": {
                    "bank_advice": {
                        "provider_ref": "active.bank.provider.v1",
                        "provider_connection_policy": {"enforcement_mode": "active"},
                        "sandbox_response": {
                            "provider_status": PayrollProviderDeliveryStatus.ACKNOWLEDGED,
                            "provider_batch_ref": "ACTIVE-CONNECTION-BATCH",
                        },
                    },
                },
            },
        },
    )
    active_outputs = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{active_review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert active_outputs.status_code == 200, active_outputs.json()
    active_batch_id = active_outputs.json()["output_batch"]["id"]
    active_publish = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{active_batch_id}/publish/", {}, format="json")
    assert active_publish.status_code == 200, active_publish.json()
    active_handoff = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{active_batch_id}/generate-finance-handoff/", {}, format="json")
    assert active_handoff.status_code == 200, active_handoff.json()
    active_transmit = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{active_handoff.json()['handoff']['id']}/transmit/",
        {},
        format="json",
    )
    assert active_transmit.status_code == 200, active_transmit.json()
    delivery = PayrollProviderDelivery.objects.get(
        handoff_id=active_handoff.json()["handoff"]["id"],
        artifact_kind=PayrollOutputArtifactKind.BANK_ADVICE,
    )
    provider_route = delivery.config_snapshot["provider_route"]
    provider_gate = provider_route["provider_connection_gate"]
    assert provider_route["adapter_ref"] == active_connection.adapter_ref
    assert provider_route["channel_ref"] == active_connection.channel_ref
    assert provider_route["callback_verification_ref"] == active_connection.callback_verification_ref
    assert provider_route["retry_policy_ref"] == active_connection.retry_policy_ref
    assert provider_gate["enforcement_mode"] == "active"
    assert provider_gate["provider_connection_id"] == str(active_connection.id)
    assert provider_gate["active_allowed"] is True
    assert delivery.response_snapshot["provider_batch_ref"] == "ACTIVE-CONNECTION-BATCH"


def test_hr_admin_payroll_finance_handoff_generates_statutory_filing_artifacts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="india-filing-output-pack-2026",
        name="India Filing Output Pack 2026",
        status=PayrollConfigStatus.ACTIVE,
        effective_from="2026-04-01",
        jurisdiction_ref="country:IN/state:MH",
    )
    component = PayrollStatutoryComponent.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        code="pt-mh-filing-output",
        name="Maharashtra Professional Tax",
        statutory_type=PayrollStatutoryComponentKind.PROFESSIONAL_TAX,
        contribution_owner=PayrollStatutoryContributionOwner.EMPLOYEE,
        calculation_method=PayrollStatutoryCalculationMethod.FIXED_AMOUNT,
        wage_base_ref="payroll.wage_base.basic_monthly.v1",
        statutory_treatment_ref="india.professional_tax.mh.v1",
        status=PayrollConfigStatus.ACTIVE,
        config_snapshot={
            "wage_base_path": "salary.basic_monthly",
            "employee_component_code": "PT_MH",
            "fixed_employee_amount": "200.00",
            "calculation_order": 44,
        },
    )
    profile = EmployeeStatutoryProfile.objects.create(
        tenant=tenant,
        employee=employee,
        statutory_pack=pack,
        effective_from="2026-04-01",
        pan_number="ABCDE1234F",
        professional_tax_state="MH",
        tax_regime=PayrollTaxRegime.NEW,
        declaration_status=PayrollDeclarationStatus.VERIFIED,
    )
    registration = PayrollStatutoryEmployerRegistration.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        statutory_component=component,
        code="mh-pt-filing-output-registration",
        name="Maharashtra PT Filing Registration",
        registration_type_ref="india.professional_tax.maharashtra.ptrc",
        registration_number="ptrc/mah/99881",
        employer_identifier="tan-mum-4455",
        filing_authority_ref="maharashtra-pt-department",
        provider_ref="clear-statutory",
        effective_from="2026-04-01",
    )
    filing = PayrollStatutoryFilingCalendar.objects.create(
        tenant=tenant,
        statutory_pack=pack,
        statutory_component=component,
        employer_registration=registration,
        code="mh-pt-sep-2026-return",
        name="Maharashtra PT September 2026 Return",
        filing_type_ref="india.professional_tax.maharashtra.monthly_return",
        filing_frequency=PayrollFrequency.MONTHLY,
        period_start="2026-09-01",
        period_end="2026-09-30",
        due_date="2026-10-20",
        grace_due_date="2026-10-25",
        status=PayrollStatutoryFilingStatus.DUE,
        output_profile_ref="india.pt.mh.return.file.v1",
    )

    review = create_locked_payroll_review(
        api_client,
        tenant=tenant,
        employee=employee,
        run_config={
            "calculation_profile": {
                "rule_codes": ["calc-basic", "calc-hra"],
                "statutory_profile": {
                    "enabled": True,
                    "pack_codes": [pack.code],
                    "component_codes": [component.code],
                    "require_employee_statutory_profile": True,
                },
            },
            "finance_handoff_profile": {
                "statutory_pack_ref": "india.statutory.filing.output.v1",
                "provider_routes": {
                    "statutory_report:statutory_return": {
                        "provider_ref": "clear-statutory",
                        "channel_ref": "clear-statutory.api.return.v1",
                        "adapter_ref": "clear-statutory.return.adapter.v1",
                        "submission_mode": "api",
                        "submission_profile_ref": "clear-statutory.pt.return.submit.v1",
                        "request_schema_ref": "clear-statutory.pt.return.request.v1",
                        "response_schema_ref": "clear-statutory.pt.return.response.v1",
                        "callback_profile_ref": "clear-statutory.callback.v1",
                        "callback_verification_ref": "clear-statutory.callback.hmac.v1",
                        "certification_profile_ref": "clear-statutory.pt.return.certificate.v1",
                        "certification_required": True,
                    },
                    "statutory_report:statutory_challan": {
                        "provider_ref": "clear-statutory",
                        "channel_ref": "clear-statutory.api.challan.v1",
                        "adapter_ref": "clear-statutory.challan.adapter.v1",
                        "submission_mode": "api",
                        "submission_profile_ref": "clear-statutory.pt.challan.submit.v1",
                        "callback_profile_ref": "clear-statutory.callback.v1",
                        "callback_verification_ref": "clear-statutory.callback.hmac.v1",
                        "certification_profile_ref": "clear-statutory.pt.challan.receipt.v1",
                        "certification_required": True,
                    },
                },
                "statutory_filing_profile": {
                    "enabled": True,
                    "generate_return_artifacts": True,
                    "generate_challan_artifacts": True,
                    "statutory_component_codes": [component.code],
                },
            },
        },
    )
    profile.refresh_from_db()
    assert profile.source_hash

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {"output_profile_ref": "india.monthly.output.profile.v1"},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()

    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {"handoff_profile_ref": "india.monthly.finance.handoff.v1"},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_payload = handoff_response.json()
    statutory_artifacts = [item for item in handoff_payload["artifacts"] if item["kind"] == PayrollOutputArtifactKind.STATUTORY_REPORT]
    filing_artifacts = [item for item in statutory_artifacts if item["config_snapshot"].get("statutory_filing_calendar_id") == str(filing.id)]
    return_artifact = next(item for item in filing_artifacts if item["config_snapshot"]["artifact_subtype"] == "statutory_return")
    challan_artifact = next(item for item in filing_artifacts if item["config_snapshot"]["artifact_subtype"] == "statutory_challan")

    assert handoff_payload["handoff"]["artifact_count"] == 5
    assert handoff_payload["handoff"]["totals_snapshot"]["statutory_total"] == "200.00"
    assert handoff_payload["handoff"]["totals_snapshot"]["statutory_filing_count"] == 1
    assert handoff_payload["handoff"]["handoff_summary_snapshot"]["statutory_filing_artifact_count"] == 2
    assert return_artifact["title"].endswith("Return")
    assert return_artifact["output_profile_ref"] == "india.pt.mh.return.file.v1"
    assert return_artifact["totals_snapshot"]["statutory_total"] == "200.00"
    assert return_artifact["line_snapshot"][0]["employee_code"] == "EMP-0042"
    assert return_artifact["line_snapshot"][0]["statutory_component_code"] == component.code
    assert return_artifact["line_snapshot"][0]["registration_number"] == "PTRC/MAH/99881"
    assert return_artifact["config_snapshot"]["filing_authority_ref"] == "maharashtra-pt-department"
    assert return_artifact["config_snapshot"]["provider_ref"] == "clear-statutory"
    assert challan_artifact["title"].endswith("Challan")
    assert challan_artifact["totals_snapshot"]["payable_amount"] == "200.00"
    assert challan_artifact["line_snapshot"][0]["payable_amount"] == "200.00"
    assert challan_artifact["line_snapshot"][0]["source_row_count"] == 1

    filing.refresh_from_db()
    assert filing.config_snapshot["latest_generation"]["statutory_total"] == "200.00"
    assert set(filing.config_snapshot["latest_generation"]["artifact_ids"]) == {return_artifact["id"], challan_artifact["id"]}

    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_payload['handoff']['id']}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()
    transmit_payload = transmit_response.json()
    assert transmit_payload["handoff"]["handoff_summary_snapshot"]["delivery_count"] == 5
    filing_delivery = next(item for item in transmit_payload["deliveries"] if item["output_artifact_id"] == return_artifact["id"])
    assert filing_delivery["status"] == PayrollProviderDeliveryStatus.SUBMITTED
    assert filing_delivery["provider_ref"] == "clear-statutory"
    assert filing_delivery["channel_ref"] == "clear-statutory.api.return.v1"
    submission_contract = filing_delivery["request_snapshot"]["submission_contract"]
    assert submission_contract["adapter_ref"] == "clear-statutory.return.adapter.v1"
    assert submission_contract["submission_mode"] == "api"
    assert submission_contract["submission_profile_ref"] == "clear-statutory.pt.return.submit.v1"
    assert submission_contract["request_schema_ref"] == "clear-statutory.pt.return.request.v1"
    assert submission_contract["response_schema_ref"] == "clear-statutory.pt.return.response.v1"
    assert submission_contract["callback_verification_ref"] == "clear-statutory.callback.hmac.v1"
    assert submission_contract["certification_profile_ref"] == "clear-statutory.pt.return.certificate.v1"
    assert submission_contract["certification_required"] is True
    assert submission_contract["statutory_context"]["statutory_filing_calendar_id"] == str(filing.id)
    assert filing_delivery["config_snapshot"]["certification_evidence"]["status"] == "pending"

    acknowledge_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_payload['handoff']['id']}/acknowledge/",
        {
            "provider_status": PayrollProviderDeliveryStatus.RECONCILED,
            "response_snapshot": {
                "provider_batch_ref": "CLEAR-PT-SEP-2026",
                "certification_evidence_refs": ["clear://certificates/pt/sep-2026/receipt.pdf"],
            },
        },
        format="json",
    )
    assert acknowledge_response.status_code == 200, acknowledge_response.json()
    acknowledged_delivery = next(item for item in acknowledge_response.json()["deliveries"] if item["output_artifact_id"] == return_artifact["id"])
    assert acknowledged_delivery["response_snapshot"]["callback_verification_ref"] == "clear-statutory.callback.hmac.v1"
    assert acknowledged_delivery["reconciliation_snapshot"]["certification_profile_ref"] == "clear-statutory.pt.return.certificate.v1"
    assert acknowledged_delivery["config_snapshot"]["certification_evidence"]["status"] == "recorded"
    assert acknowledged_delivery["config_snapshot"]["certification_evidence"]["evidence_refs"] == ["clear://certificates/pt/sep-2026/receipt.pdf"]
    assert filing_delivery["request_snapshot"]["totals_snapshot"]["statutory_total"] == "200.00"


def test_hr_admin_payroll_finance_handoff_requires_published_output_batch(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]

    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {},
        format="json",
    )
    assert handoff_response.status_code == 400
    assert "published payroll output batch" in handoff_response.json()["detail"]
    assert PayrollFinanceHandoff.objects.count() == 0


def test_hr_admin_payroll_finance_handoff_failure_acknowledgement_requires_evidence(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    review = create_locked_payroll_review(api_client, tenant=tenant, employee=employee)

    generate_outputs_response = api_client.post(
        f"/api/v1/hr-admin/payroll-reviews/{review.id}/generate-outputs/",
        {},
        format="json",
    )
    assert generate_outputs_response.status_code == 200, generate_outputs_response.json()
    batch_id = generate_outputs_response.json()["output_batch"]["id"]
    publish_response = api_client.post(f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/publish/", {}, format="json")
    assert publish_response.status_code == 200, publish_response.json()
    handoff_response = api_client.post(
        f"/api/v1/hr-admin/payroll-output-batches/{batch_id}/generate-finance-handoff/",
        {},
        format="json",
    )
    assert handoff_response.status_code == 200, handoff_response.json()
    handoff_id = handoff_response.json()["handoff"]["id"]
    transmit_response = api_client.post(f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/transmit/", {}, format="json")
    assert transmit_response.status_code == 200, transmit_response.json()

    invalid_failure_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/acknowledge/",
        {"provider_status": PayrollProviderDeliveryStatus.FAILED},
        format="json",
    )
    assert invalid_failure_response.status_code == 400
    assert "failure evidence" in invalid_failure_response.json()["detail"]

    failure_response = api_client.post(
        f"/api/v1/hr-admin/payroll-finance-handoffs/{handoff_id}/acknowledge/",
        {
            "provider_status": PayrollProviderDeliveryStatus.FAILED,
            "failure_code": "BANK_FILE_REJECTED",
            "failure_reason": "Provider rejected the checksum envelope.",
        },
        format="json",
    )
    assert failure_response.status_code == 200, failure_response.json()
    failure_payload = failure_response.json()
    assert failure_payload["handoff"]["status"] == PayrollFinanceHandoffStatus.FAILED
    assert failure_payload["handoff"]["handoff_summary_snapshot"]["failed_delivery_count"] == 3
    assert {item["failure_code"] for item in failure_payload["deliveries"]} == {"BANK_FILE_REJECTED"}


@pytest.mark.django_db
def test_unauthenticated_workspace_reads_are_rejected(api_client: APIClient, bootstrapped_workspace):
    ess_response = api_client.get("/api/v1/me/dashboard/")
    hr_admin_response = api_client.get("/api/v1/hr-admin/dashboard/")
    manager_response = api_client.get("/api/v1/manager/team-summary/")

    assert ess_response.status_code == 401
    assert hr_admin_response.status_code == 401
    assert manager_response.status_code == 401


@pytest.mark.django_db
def test_manager_session_exposes_workspace_role_codes(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/auth/session/")

    assert response.status_code == 200
    assert response.json()["default_membership"]["role_codes"] == ["manager"]
    assert response.json()["workspace_access"] == {
        "ess": True,
        "mss": True,
        "hr_admin": False,
    }


@pytest.mark.django_db
def test_workflow_approver_session_gets_mss_workspace_access(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    user = User.objects.create_user(
        username="workflow.approver",
        email="workflow.approver@northstar.example",
        password=PASSWORD,
        first_name="Workflow",
        last_name="Approver",
        display_name="Workflow Approver",
    )
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        employee_code="EMP-0099",
        status=MembershipStatus.ACTIVE,
        is_default=True,
    )
    employee = Employee.objects.create(
        tenant=tenant,
        membership=membership,
        employee_code="EMP-0099",
        first_name="Workflow",
        last_name="Approver",
        preferred_name="Workflow",
        work_email="workflow.approver@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    workflow_instance = WorkflowInstance.objects.create(
        tenant=tenant,
        module="leave",
        trigger_key="phase0-mss-access",
        subject_type="leave_request",
        subject_identifier="phase0-leave-request",
        employee_identifier=str(employee.id),
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=1,
        initiated_by_identifier="phase0-test",
    )
    step_instance = WorkflowStepInstance.objects.create(
        workflow_instance=workflow_instance,
        step_order=1,
        name="Approver review",
        status=WorkflowInstanceStatus.PENDING,
    )
    WorkflowAssignment.objects.create(
        step_instance=step_instance,
        actor_type=WorkflowActorType.MEMBERSHIP,
        membership=membership,
    )

    token = login(api_client, "workflow.approver")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/auth/session/")

    assert response.status_code == 200
    assert response.json()["default_membership"]["role_codes"] == []
    assert response.json()["workspace_access"] == {
        "ess": True,
        "mss": True,
        "hr_admin": False,
    }


@pytest.mark.django_db
def test_hr_admin_workflow_trace_returns_steps_assignments_and_ordered_timeline(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    manager_membership = TenantMembership.objects.select_related("user").get(tenant=tenant, user__username="karan.mehta")
    role = Role.objects.get(tenant=tenant, code="hr-admin")
    now = timezone.now()

    leave_instance = WorkflowInstance.objects.create(
        tenant=tenant,
        module="leave",
        trigger_key="traceability-test",
        subject_type="leave_request",
        subject_identifier="TRACE-LEAVE-001",
        employee_identifier=str(employee.id),
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=2,
        initiated_by_identifier="riya.sharma",
        submitted_at=now - timedelta(hours=5),
        payload_snapshot={"subject_label": "Trace Leave Request"},
    )
    first_step = WorkflowStepInstance.objects.create(
        workflow_instance=leave_instance,
        step_order=1,
        name="Manager review",
        status=WorkflowInstanceStatus.APPROVED,
        started_at=now - timedelta(hours=5),
        due_at=now - timedelta(hours=4),
        completed_at=now - timedelta(hours=3),
        resolved_action=WorkflowAction.APPROVE,
        resolution_comment="Manager approved with note.",
    )
    second_step = WorkflowStepInstance.objects.create(
        workflow_instance=leave_instance,
        step_order=2,
        name="HR assurance",
        status=WorkflowInstanceStatus.PENDING,
        started_at=now - timedelta(hours=2),
        due_at=now - timedelta(hours=1),
    )
    WorkflowAssignment.objects.create(
        step_instance=first_step,
        actor_type=WorkflowActorType.MANAGER,
        membership=manager_membership,
        actor_identifier=str(manager_membership.user_id),
        responded_at=now - timedelta(hours=3),
    )
    WorkflowAssignment.objects.create(
        step_instance=second_step,
        actor_type=WorkflowActorType.ROLE,
        role=role,
        actor_identifier=role.code,
    )
    submit_log = WorkflowActionLog.objects.create(
        workflow_instance=leave_instance,
        action=WorkflowAction.SUBMIT,
        actor_identifier="riya.sharma",
        to_status=WorkflowInstanceStatus.PENDING,
        payload={"summary": "Trace request submitted."},
    )
    approve_log = WorkflowActionLog.objects.create(
        workflow_instance=leave_instance,
        step_instance=first_step,
        action=WorkflowAction.APPROVE,
        actor_identifier="karan.mehta",
        from_status=WorkflowInstanceStatus.PENDING,
        to_status=WorkflowInstanceStatus.PENDING,
        comment="Manager approved with note.",
    )
    escalate_log = WorkflowActionLog.objects.create(
        workflow_instance=leave_instance,
        step_instance=second_step,
        action=WorkflowAction.ESCALATE,
        actor_identifier="system",
        from_status=WorkflowInstanceStatus.PENDING,
        to_status=WorkflowInstanceStatus.PENDING,
        comment="SLA crossed for HR assurance.",
    )
    WorkflowActionLog.objects.filter(id=submit_log.id).update(created_at=now - timedelta(hours=5))
    WorkflowActionLog.objects.filter(id=approve_log.id).update(created_at=now - timedelta(hours=3))
    WorkflowActionLog.objects.filter(id=escalate_log.id).update(created_at=now - timedelta(minutes=30))

    WorkflowInstance.objects.create(
        tenant=tenant,
        module="attendance",
        trigger_key="traceability-test",
        subject_type="regularization",
        subject_identifier="TRACE-ATT-001",
        employee_identifier=employee.employee_code,
        status=WorkflowInstanceStatus.REJECTED,
        current_step_order=1,
        initiated_by_identifier="riya.sharma",
        submitted_at=now - timedelta(days=1),
        payload_snapshot={"subject_label": "Trace Attendance Request"},
    )

    response = api_client.get("/api/v1/hr-admin/workflow-traces/?module=leave&q=Trace%20Leave&page=1&page_size=5")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["total_count"] == 1
    assert payload["status_counts"]["pending"] == 1
    item = payload["items"][0]
    assert item["subject_label"] == "Trace Leave Request"
    assert item["employee_code"] == "EMP-0042"
    assert item["current_step_name"] == "HR assurance"
    assert item["current_actor_summary"] == "HR Admin"
    assert item["total_steps"] == 2
    assert item["completed_steps"] == 1
    assert item["pending_steps"] == 1
    assert item["overdue_steps"] == 1
    assert item["assignment_count"] == 2
    assert item["timeline_event_count"] >= 5
    assert item["steps"][0]["assignments"][0]["actor_label"] == "Karan Mehta"
    timeline_times = [datetime.fromisoformat(event["occurred_at"].replace("Z", "+00:00")) for event in item["timeline"]]
    assert timeline_times == sorted(timeline_times, reverse=True)
    assert {event["action"] for event in item["timeline"]} >= {"submit", "approve", "escalate", "step_due"}

    detail_response = api_client.get(f"/api/v1/hr-admin/workflow-traces/{item['id']}/")

    assert detail_response.status_code == 200, detail_response.json()
    assert detail_response.json()["id"] == item["id"]
    assert detail_response.json()["steps"][1]["is_overdue"] is True


@pytest.mark.django_db
def test_employee_leave_history_returns_paginated_payload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/me/leave-requests/?status=pending&page=1&page_size=1")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 1
    assert "items" in payload
    assert "status_counts" in payload
    assert payload["status_counts"]["all"] >= payload["status_counts"]["pending"]


@pytest.mark.django_db
def test_employee_regularization_history_returns_paginated_payload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/me/attendance-regularizations/?status=pending&page=1&page_size=1")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 1
    assert "items" in payload
    assert "status_counts" in payload
    assert payload["status_counts"]["all"] >= payload["status_counts"]["pending"]


@pytest.mark.django_db
def test_manager_pending_leave_history_returns_paginated_payload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/manager/leave-requests/pending/?page=1&page_size=1")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 1
    assert "items" in payload
    assert isinstance(payload["items"], list)


@pytest.mark.django_db
def test_manager_pending_regularizations_return_paginated_payload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/manager/attendance-regularizations/pending/?page=1&page_size=1")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 1
    assert "items" in payload
    assert isinstance(payload["items"], list)


@pytest.mark.django_db
def test_employee_cannot_use_manager_approval_actions(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    leave_response = api_client.post(
        f"/api/v1/manager/leave-requests/{bootstrapped_workspace['pending_leave'].id}/approve/",
        {"comment": "Trying to approve without manager scope."},
        format="json",
    )
    regularization_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{bootstrapped_workspace['pending_regularization'].id}/approve/",
        {"comment": "Trying to approve without manager scope."},
        format="json",
    )

    assert leave_response.status_code == 404
    assert leave_response.json()["detail"] == "Leave request not found for manager scope."
    assert regularization_response.status_code == 404
    assert regularization_response.json()["detail"] == "Attendance regularization not found for manager scope."


@pytest.mark.django_db
def test_employee_can_submit_leave_request(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    start_date = timezone.localdate() + timedelta(days=30)
    end_date = start_date + timedelta(days=1)

    before_count = LeaveRequest.objects.filter(employee__employee_code="EMP-0042").count()
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(bootstrapped_workspace["earned_leave_type"].id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Phase 0 API smoke test leave request.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["status"] == LeaveRequestStatus.PENDING
    assert LeaveRequest.objects.filter(employee__employee_code="EMP-0042").count() == before_count + 1


@pytest.mark.django_db
def test_employee_cannot_submit_backdated_leave_when_policy_blocks_it(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.get(code="earned-leave", tenant=employee.tenant)
    create_employee_scoped_leave_policy(
        employee=employee,
        leave_type=leave_type,
        code="earned-leave-no-backdated",
        name="Earned Leave No Backdated",
        allow_backdated_application=False,
    )

    start_date = timezone.localdate() - timedelta(days=2)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Trying a backdated leave request.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Backdated leave requests are not allowed under this policy." in str(response.json()["start_date"])


@pytest.mark.django_db
def test_employee_cannot_submit_leave_without_required_notice(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.get(code="earned-leave", tenant=employee.tenant)
    create_employee_scoped_leave_policy(
        employee=employee,
        leave_type=leave_type,
        code="earned-leave-notice-policy",
        name="Earned Leave Notice Policy",
        notice_days_required=5,
    )

    start_date = timezone.localdate() + timedelta(days=2)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Trying a short-notice leave request.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "This policy requires at least 5 days of notice." in str(response.json()["start_date"])


@pytest.mark.django_db
def test_employee_cannot_submit_leave_without_required_attachment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.get(code="earned-leave", tenant=employee.tenant)
    leave_type.requires_attachment = True
    leave_type.save(update_fields=["requires_attachment", "updated_at"])
    create_employee_scoped_leave_policy(
        employee=employee,
        leave_type=leave_type,
        code="earned-leave-attachment-policy",
        name="Earned Leave Attachment Policy",
    )

    start_date = timezone.localdate() + timedelta(days=10)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Trying a leave request without the required document.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Supporting document is required for this leave type." in str(response.json()["attachment_reference"])


@pytest.mark.django_db
def test_employee_cannot_submit_leave_during_probation_when_policy_blocks_it(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    employee.confirmation_date = None
    employee.probation_end_date = timezone.localdate() + timedelta(days=30)
    employee.save(update_fields=["confirmation_date", "probation_end_date", "updated_at"])
    leave_type = LeaveType.objects.get(code="earned-leave", tenant=employee.tenant)
    create_employee_scoped_leave_policy(
        employee=employee,
        leave_type=leave_type,
        code="earned-leave-no-probation",
        name="Earned Leave No Probation",
        is_probation_eligible=False,
    )

    start_date = timezone.localdate() + timedelta(days=7)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Trying leave during probation.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "This leave policy is not available during probation." in str(response.json()["leave_type_id"])


@pytest.mark.django_db
def test_employee_cannot_submit_leave_when_balance_is_insufficient(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.get(code="earned-leave", tenant=employee.tenant)
    leave_type.allow_negative_balance = False
    leave_type.save(update_fields=["allow_negative_balance", "updated_at"])
    create_employee_scoped_leave_policy(
        employee=employee,
        leave_type=leave_type,
        code="earned-leave-low-balance",
        name="Earned Leave Low Balance",
        annual_entitlement="1.00",
    )

    start_date = timezone.localdate() + timedelta(days=10)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": (start_date + timedelta(days=1)).isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Trying to exceed available leave balance.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Insufficient balance. Available balance is 1.00 units." in str(response.json()["leave_type_id"])


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_resolution_prefers_highest_priority_scope(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.create(
        tenant=employee.tenant,
        code="assignment-resolution-leave",
        name="Assignment Resolution Leave",
        category="paid",
        unit="day",
        allow_negative_balance=True,
        is_active=True,
    )
    department_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="department-resolution-leave-policy",
        name="Department Resolution Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=True,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )
    employee_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="employee-resolution-leave-policy",
        name="Employee Resolution Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=False,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=employee_policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(employee_policy.id)
    assert payload["policy_name"] == employee_policy.name
    assert payload["priority"] == 10
    assert any("Employee:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_employee_leave_request_uses_resolved_employee_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.create(
        tenant=employee.tenant,
        code="assignment-runtime-leave",
        name="Assignment Runtime Leave",
        category="paid",
        unit="day",
        allow_negative_balance=True,
        is_active=True,
    )
    department_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="department-runtime-leave-policy",
        name="Department Runtime Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=True,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )
    employee_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="employee-runtime-leave-policy",
        name="Employee Runtime Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=False,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=employee_policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    start_date = timezone.localdate() - timedelta(days=2)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Testing winning leave assignment behavior.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Backdated leave requests are not allowed under this policy." in str(response.json()["start_date"])
    assert LeaveRequest.objects.filter(employee=employee, leave_type=leave_type).count() == 0


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_resolution_prefers_branch_over_legal_entity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.create(
        tenant=employee.tenant,
        code="branch-vs-entity-resolution-leave",
        name="Branch Vs Entity Resolution Leave",
        category="paid",
        unit="day",
        allow_negative_balance=True,
        is_active=True,
    )
    legal_entity_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="legal-entity-resolution-leave-policy",
        name="Legal Entity Resolution Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=True,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=50,
        is_active=True,
    )
    branch_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="branch-resolution-leave-policy",
        name="Branch Resolution Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=False,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_policy,
        branch=employee.branch,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(branch_policy.id)
    assert payload["policy_name"] == branch_policy.name
    assert payload["priority"] == 10
    assert any("Branch:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_employee_leave_request_uses_resolved_branch_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = LeaveType.objects.create(
        tenant=employee.tenant,
        code="branch-runtime-leave",
        name="Branch Runtime Leave",
        category="paid",
        unit="day",
        allow_negative_balance=True,
        is_active=True,
    )
    legal_entity_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="legal-entity-runtime-leave-policy",
        name="Legal Entity Runtime Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=True,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=50,
        is_active=True,
    )
    branch_policy = LeavePolicy.objects.create(
        tenant=employee.tenant,
        leave_type=leave_type,
        code="branch-runtime-leave-policy",
        name="Branch Runtime Leave Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("12.00"),
        min_days_per_request=Decimal("0.50"),
        allow_half_day=True,
        allow_backdated_application=False,
        is_probation_eligible=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_policy,
        branch=employee.branch,
        priority=10,
        is_active=True,
    )

    start_date = timezone.localdate() + timedelta(days=14)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Testing winning branch assignment behavior.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    leave_request = LeaveRequest.objects.get(id=payload["id"])

    assert payload["status"] == LeaveRequestStatus.PENDING
    assert leave_request.leave_policy_id == branch_policy.id
    assert leave_request.leave_type_id == leave_type.id


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_resolution_prefers_grade_over_branch(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="grade-vs-branch-resolution-leave")
    branch_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="branch-resolution-leave-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_policy,
        branch=employee.branch,
        priority=50,
        is_active=True,
    )
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-resolution-leave-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(grade_policy.id)
    assert payload["policy_name"] == grade_policy.name
    assert payload["priority"] == 10
    assert any("Grade:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_employee_leave_request_uses_resolved_grade_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="grade-runtime-leave")
    branch_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="branch-runtime-leave-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_policy,
        branch=employee.branch,
        priority=50,
        is_active=True,
    )
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-runtime-leave-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=10,
        is_active=True,
    )

    start_date = timezone.localdate() + timedelta(days=16)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Testing winning grade assignment behavior.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    leave_request = LeaveRequest.objects.get(id=payload["id"])

    assert payload["status"] == LeaveRequestStatus.PENDING
    assert leave_request.leave_policy_id == grade_policy.id
    assert leave_request.leave_type_id == leave_type.id


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_resolution_prefers_employment_type_over_legal_entity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="employment-type-vs-entity-resolution-leave")
    legal_entity_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="legal-entity-resolution-leave-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=50,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="employment-type-resolution-leave-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=employment_type_policy,
        employment_type=employee.employment_type,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(employment_type_policy.id)
    assert payload["policy_name"] == employment_type_policy.name
    assert payload["priority"] == 10
    assert any("Employment type:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_employee_leave_request_uses_resolved_employment_type_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="employment-type-runtime-leave")
    legal_entity_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="legal-entity-runtime-leave-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=50,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="employment-type-runtime-leave-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=employment_type_policy,
        employment_type=employee.employment_type,
        priority=10,
        is_active=True,
    )

    start_date = timezone.localdate() + timedelta(days=18)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Testing winning employment type assignment behavior.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    leave_request = LeaveRequest.objects.get(id=payload["id"])

    assert payload["status"] == LeaveRequestStatus.PENDING
    assert leave_request.leave_policy_id == employment_type_policy.id
    assert leave_request.leave_type_id == leave_type.id


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_prefers_more_granular_scope_when_priorities_match(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="granularity-default-resolution-leave")
    branch_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="branch-default-resolution-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_policy,
        branch=employee.branch,
        priority=100,
        is_active=True,
    )
    department_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="department-default-resolution-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=department_policy,
        department=employee.department,
        priority=100,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(department_policy.id)
    assert any("Department:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_allows_manual_priority_override_over_granularity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="granularity-override-resolution-leave")
    legal_entity_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="legal-entity-override-resolution-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=10,
        is_active=True,
    )
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-override-resolution-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=50,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(legal_entity_policy.id)
    assert any("Legal entity:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_leave_policy_assignment_prefers_multi_field_scope_over_broader_single_scope(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="multi-field-resolution-leave")
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-single-resolution-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=100,
        is_active=True,
    )
    branch_department_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="branch-department-resolution-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_department_policy,
        branch=employee.branch,
        department=employee.department,
        priority=100,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "leave_type_id": str(leave_type.id),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(branch_department_policy.id)
    assert any("Branch:" in label for label in payload["scope_labels"])
    assert any("Department:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_employee_leave_request_uses_resolved_multi_field_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="multi-field-runtime-leave")
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-single-runtime-policy",
        allow_backdated_application=True,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=100,
        is_active=True,
    )
    branch_department_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="branch-department-runtime-policy",
        allow_backdated_application=False,
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=branch_department_policy,
        branch=employee.branch,
        department=employee.department,
        priority=100,
        is_active=True,
    )

    start_date = timezone.localdate() + timedelta(days=20)
    response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Testing winning multi-field assignment behavior.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    leave_request = LeaveRequest.objects.get(id=response.json()["id"])
    assert leave_request.leave_policy_id == branch_department_policy.id


@pytest.mark.django_db
def test_employee_can_withdraw_pending_leave_request(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    leave_request = bootstrapped_workspace["pending_leave"]
    response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request.id}/withdraw/",
        {"reason": "Plans changed before travel."},
        format="json",
    )

    assert response.status_code == 200, response.json()
    leave_request.refresh_from_db()
    assert response.json()["status"] == LeaveRequestStatus.WITHDRAWN
    assert leave_request.status == LeaveRequestStatus.WITHDRAWN
    assert leave_request.metadata["withdrawal"]["reason"] == "Plans changed before travel."


@pytest.mark.django_db
def test_employee_cannot_withdraw_pending_leave_when_policy_disables_it(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="withdraw-disabled-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="withdraw-disabled-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_withdraw_pending": False,
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )
    start_date = timezone.localdate() + timedelta(days=25)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Submitting a leave that should not be withdrawable.",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]
    withdraw_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/withdraw/",
        {"reason": "Trying to withdraw against policy."},
        format="json",
    )

    assert withdraw_response.status_code == 400
    assert "does not allow employee withdrawal" in str(withdraw_response.json()["status"])


@pytest.mark.django_db
def test_employee_can_cancel_approved_leave_directly_when_policy_allows_it(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="direct-cancel-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="direct-cancel-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": False,
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    start_date = timezone.localdate() + timedelta(days=28)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need an approvable leave for direct cancellation.",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Approved for direct cancellation test."},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    cancel_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/cancel/",
        {"reason": "No longer needed after reschedule."},
        format="json",
    )

    assert cancel_response.status_code == 200, cancel_response.json()
    leave_request = LeaveRequest.objects.get(id=leave_request_id)
    assert cancel_response.json()["status"] == LeaveRequestStatus.CANCELLED
    assert leave_request.status == LeaveRequestStatus.CANCELLED
    assert leave_request.metadata["cancellation"]["reason"] == "No longer needed after reschedule."


@pytest.mark.django_db
def test_employee_cancellation_request_can_require_reapproval(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="reapproval-cancel-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="reapproval-cancel-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": True,
                "cancel_approval_route": "manager_only",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    start_date = timezone.localdate() + timedelta(days=32)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need an approvable leave for reapproval cancellation.",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Approved before cancellation request."},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    cancel_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/cancel/",
        {"reason": "Need cancellation approval."},
        format="json",
    )

    assert cancel_response.status_code == 200, cancel_response.json()
    leave_request = LeaveRequest.objects.get(id=leave_request_id)
    assert cancel_response.json()["status"] == LeaveRequestStatus.PENDING
    assert leave_request.status == LeaveRequestStatus.PENDING
    assert leave_request.metadata["request_action"] == "cancellation_request"
    assert leave_request.workflow_reference

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    final_approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Cancellation approved."},
        format="json",
    )

    assert final_approve_response.status_code == 200, final_approve_response.json()
    leave_request.refresh_from_db()
    assert leave_request.status == LeaveRequestStatus.CANCELLED
    assert leave_request.metadata["request_action"] == "leave_request"
    assert leave_request.metadata["cancellation_resolution"]["approved"] is True


@pytest.mark.django_db
def test_employee_cancellation_request_rejection_restores_approved_leave(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="reapproval-cancel-reject-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="reapproval-cancel-reject-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": True,
                "cancel_approval_route": "manager_only",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    start_date = timezone.localdate() + timedelta(days=34)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need approved leave before cancellation rejection.",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Approved before cancellation rejection path."},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    cancel_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/cancel/",
        {"reason": "Need cancellation review."},
        format="json",
    )
    assert cancel_response.status_code == 200, cancel_response.json()

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    reject_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/reject/",
        {"comment": "Cancellation rejected."},
        format="json",
    )

    assert reject_response.status_code == 200, reject_response.json()
    leave_request = LeaveRequest.objects.get(id=leave_request_id)
    assert leave_request.status == LeaveRequestStatus.APPROVED
    assert leave_request.metadata["request_action"] == "leave_request"
    assert leave_request.metadata["cancellation_resolution"]["approved"] is False
    assert leave_request.rejection_reason == "Cancellation rejected."


@pytest.mark.django_db
def test_employee_cannot_withdraw_pending_leave_within_notice_window(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="withdraw-notice-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="withdraw-notice-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_withdraw_pending": True,
                "withdraw_notice_hours_before_start": "72.00",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )
    start_date = timezone.localdate() + timedelta(days=2)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Submitting a leave close to notice cutoff.",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()

    withdraw_response = api_client.post(
        f"/api/v1/me/leave-requests/{create_response.json()['id']}/withdraw/",
        {"reason": "Too late to withdraw under policy."},
        format="json",
    )

    assert withdraw_response.status_code == 400
    assert "Withdrawal is blocked within 72.00 hours" in str(withdraw_response.json()["status"])


@pytest.mark.django_db
def test_employee_cannot_cancel_approved_leave_within_notice_window(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="cancel-notice-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="cancel-notice-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": False,
                "cancel_notice_hours_before_start": "72.00",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    start_date = timezone.localdate() + timedelta(days=2)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need approved leave close to cancel cutoff.",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Approved before cancellation notice test."},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    cancel_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/cancel/",
        {"reason": "Too late to cancel under policy."},
        format="json",
    )

    assert cancel_response.status_code == 400
    assert "Cancellation is blocked within 72.00 hours" in str(cancel_response.json()["status"])


@pytest.mark.django_db
def test_employee_cannot_cancel_approved_leave_without_required_attachment(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="cancel-attachment-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="cancel-attachment-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_cancel_approved": True,
                "cancel_approved_requires_reapproval": False,
                "cancel_requires_attachment": True,
                "cancel_attachment_label": "doctor note",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    start_date = timezone.localdate() + timedelta(days=40)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need approved leave for attachment test.",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    leave_request_id = create_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/leave-requests/{leave_request_id}/approve/",
        {"comment": "Approved before cancellation attachment test."},
        format="json",
    )
    assert approve_response.status_code == 200, approve_response.json()

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    cancel_response = api_client.post(
        f"/api/v1/me/leave-requests/{leave_request_id}/cancel/",
        {"reason": "Missing required attachment."},
        format="json",
    )

    assert cancel_response.status_code == 400
    assert "Doctor note is required to cancel this leave request." in str(cancel_response.json()["attachment_reference"])


@pytest.mark.django_db
def test_employee_cannot_withdraw_pending_leave_without_required_attachment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="withdraw-attachment-leave")
    policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="withdraw-attachment-policy",
        config_snapshot={
            "lifecycle": {
                "allow_employee_withdraw_pending": True,
                "withdraw_requires_attachment": True,
                "withdraw_attachment_label": "manager email",
            }
        },
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=policy,
        employee=employee,
        priority=10,
        is_active=True,
    )
    start_date = timezone.localdate() + timedelta(days=45)
    create_response = api_client.post(
        "/api/v1/me/leave-requests/",
        {
            "leave_type_id": str(leave_type.id),
            "start_date": start_date.isoformat(),
            "end_date": start_date.isoformat(),
            "start_day_portion": "full_day",
            "end_day_portion": "full_day",
            "reason": "Need pending leave for withdrawal attachment test.",
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()

    withdraw_response = api_client.post(
        f"/api/v1/me/leave-requests/{create_response.json()['id']}/withdraw/",
        {"reason": "Missing required withdrawal attachment."},
        format="json",
    )

    assert withdraw_response.status_code == 400
    assert "Manager email is required to withdraw this leave request." in str(withdraw_response.json()["attachment_reference"])


@pytest.mark.django_db
def test_hr_admin_cannot_create_ambiguous_same_priority_leave_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    leave_type = create_assignment_test_leave_type(employee=employee, label="ambiguous-leave-assignment")
    grade_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="grade-ambiguous-leave-policy",
    )
    LeavePolicyAssignment.objects.create(
        tenant=employee.tenant,
        leave_policy=grade_policy,
        grade=employee.grade,
        priority=100,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_leave_policy(
        employee=employee,
        leave_type=leave_type,
        label="employment-type-ambiguous-leave-policy",
    )

    response = api_client.post(
        "/api/v1/hr-admin/leave-policy-assignments/",
        {
            "leave_policy_id": str(employment_type_policy.id),
            "employment_type_id": str(employee.employment_type_id),
            "priority": 100,
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "same priority and effective granularity" in str(response.json()["detail"])
    assert str(response.json()["conflict_check"]["has_blocking_conflict"]) == "True"
    assert str(response.json()["conflict_check"]["conflicts"][0]["is_same_granularity"]) == "True"


@pytest.mark.django_db
def test_employee_can_submit_attendance_regularization(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    before_count = AttendanceRegularization.objects.filter(employee__employee_code="EMP-0042").count()
    response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(bootstrapped_workspace["riya_today_record"].id),
            "requested_status": "present",
            "requested_check_in_at": f"{timezone.localdate().isoformat()}T09:05:00+05:30",
            "requested_check_out_at": f"{timezone.localdate().isoformat()}T18:10:00+05:30",
            "reason": "Phase 0 API smoke test regularization.",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["status"] == RegularizationStatus.PENDING
    assert AttendanceRegularization.objects.filter(employee__employee_code="EMP-0042").count() == before_count + 1


@pytest.mark.django_db
def test_employee_cannot_submit_regularization_for_locked_attendance_record(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    record = bootstrapped_workspace["riya_today_record"]
    record.is_locked = True
    record.save(update_fields=["is_locked", "updated_at"])

    response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{timezone.localdate().isoformat()}T09:05:00+05:30",
            "requested_check_out_at": f"{timezone.localdate().isoformat()}T18:10:00+05:30",
            "reason": "Trying to regularize a locked attendance row.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Attendance regularization is blocked because the attendance record is locked."


@pytest.mark.django_db
def test_employee_cannot_submit_duplicate_pending_regularization_for_same_record(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    record = bootstrapped_workspace["riya_today_record"]
    AttendanceRegularization.objects.create(
        tenant=record.tenant,
        employee=record.employee,
        attendance_record=record,
        status=RegularizationStatus.PENDING,
        requested_status="present",
        reason="Existing pending regularization.",
        applied_at=timezone.now(),
    )

    response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{timezone.localdate().isoformat()}T09:05:00+05:30",
            "requested_check_out_at": f"{timezone.localdate().isoformat()}T18:10:00+05:30",
            "reason": "Trying to create a duplicate pending regularization.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "A pending attendance regularization already exists for this attendance record."


@pytest.mark.django_db
def test_employee_cannot_submit_regularization_with_checkout_before_checkin(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    record = bootstrapped_workspace["riya_today_record"]
    response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{timezone.localdate().isoformat()}T18:10:00+05:30",
            "requested_check_out_at": f"{timezone.localdate().isoformat()}T09:05:00+05:30",
            "reason": "Bad timestamp order.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Requested check-out cannot be earlier than requested check-in." in str(response.json()["requested_check_out_at"])


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_resolution_prefers_highest_priority_scope(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    department_policy = AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code="department-resolution-policy",
        name="Department Resolution Policy",
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )
    employee_policy = AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code="employee-resolution-policy",
        name="Employee Resolution Policy",
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=employee_policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(employee_policy.id)
    assert payload["policy_name"] == employee_policy.name
    assert payload["priority"] == 10
    assert any("Employee:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_shift_assignment_resolution_prefers_temporary_override(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=6)
    fixed_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="fixed-resolution-shift",
        name="Fixed Resolution Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    override_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="override-resolution-shift",
        name="Override Resolution Shift",
        start_time=datetime.strptime("12:00", "%H:%M").time(),
        end_time=datetime.strptime("20:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=fixed_shift,
        assignment_kind=EmployeeShiftAssignmentKind.FIXED,
        effective_from=attendance_date - timedelta(days=7),
        effective_to=None,
        is_primary=True,
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=override_shift,
        assignment_kind=EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE,
        effective_from=attendance_date,
        effective_to=attendance_date,
        is_primary=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/employee-shift-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "end_date": attendance_date.isoformat(),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["shift_id"] == str(override_shift.id)
    assert payload["shift_name"] == override_shift.name
    assert payload["assignment_kind"] == EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE
    assert len(payload["sequence"]) == 1
    assert payload["sequence"][0]["shift_id"] == str(override_shift.id)


@pytest.mark.django_db
def test_hr_admin_shift_assignment_resolution_expands_weekly_rotation_sequence(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=8)
    shift_a = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-sequence-a",
        name="Rotation Sequence A",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    shift_b = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-sequence-b",
        name="Rotation Sequence B",
        start_time=datetime.strptime("12:00", "%H:%M").time(),
        end_time=datetime.strptime("20:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=shift_a,
        assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
        effective_from=attendance_date,
        effective_to=attendance_date + timedelta(days=3),
        is_primary=True,
        config_snapshot={
            "rotation": {
                "anchor_date": attendance_date.isoformat(),
                "entries": [
                    {"shift_id": str(shift_a.id), "span_days": 2},
                    {"shift_id": str(shift_b.id), "span_days": 2},
                ],
            }
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/employee-shift-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "end_date": (attendance_date + timedelta(days=3)).isoformat(),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["assignment_kind"] == EmployeeShiftAssignmentKind.WEEKLY_ROTATION
    assert payload["shift_id"] == str(shift_a.id)
    assert len(payload["sequence"]) == 4
    assert [item["shift_id"] for item in payload["sequence"]] == [
        str(shift_a.id),
        str(shift_a.id),
        str(shift_b.id),
        str(shift_b.id),
    ]


@pytest.mark.django_db
def test_hr_admin_shift_assignment_resolution_expands_longer_weekly_rotation_cycle(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=9)
    shift_a = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-cycle-a",
        name="Rotation Cycle A",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    shift_b = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-cycle-b",
        name="Rotation Cycle B",
        start_time=datetime.strptime("10:00", "%H:%M").time(),
        end_time=datetime.strptime("19:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    shift_c = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-cycle-c",
        name="Rotation Cycle C",
        start_time=datetime.strptime("12:00", "%H:%M").time(),
        end_time=datetime.strptime("20:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=shift_a,
        assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
        effective_from=attendance_date,
        effective_to=attendance_date + timedelta(days=5),
        is_primary=True,
        config_snapshot={
            "rotation": {
                "anchor_date": attendance_date.isoformat(),
                "entries": [
                    {"shift_id": str(shift_a.id), "span_days": 1},
                    {"shift_id": str(shift_b.id), "span_days": 2},
                    {"shift_id": str(shift_c.id), "span_days": 3},
                ],
            }
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/employee-shift-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "end_date": (attendance_date + timedelta(days=5)).isoformat(),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["assignment_kind"] == EmployeeShiftAssignmentKind.WEEKLY_ROTATION
    assert len(payload["sequence"]) == 6
    assert [item["shift_id"] for item in payload["sequence"]] == [
        str(shift_a.id),
        str(shift_b.id),
        str(shift_b.id),
        str(shift_c.id),
        str(shift_c.id),
        str(shift_c.id),
    ]


@pytest.mark.django_db
def test_hr_admin_shift_assignment_resolution_applies_temporary_override_across_multi_day_window(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=12)
    rotation_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-window-base-shift",
        name="Rotation Window Base Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    override_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-window-override-shift",
        name="Rotation Window Override Shift",
        start_time=datetime.strptime("12:00", "%H:%M").time(),
        end_time=datetime.strptime("20:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=rotation_shift,
        assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
        effective_from=attendance_date - timedelta(days=1),
        effective_to=attendance_date + timedelta(days=3),
        is_primary=True,
        config_snapshot={
            "rotation": {
                "anchor_date": (attendance_date - timedelta(days=1)).isoformat(),
                "entries": [
                    {"shift_id": str(rotation_shift.id), "span_days": 5},
                ],
            }
        },
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=override_shift,
        assignment_kind=EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE,
        effective_from=attendance_date,
        effective_to=attendance_date + timedelta(days=1),
        is_primary=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/employee-shift-assignments/resolve/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "end_date": (attendance_date + timedelta(days=1)).isoformat(),
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["assignment_kind"] == EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE
    assert len(payload["sequence"]) == 2
    assert [item["shift_id"] for item in payload["sequence"]] == [
        str(override_shift.id),
        str(override_shift.id),
    ]


@pytest.mark.django_db
def test_hr_admin_attendance_policy_preview_marks_matching_holiday(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=3)
    shift = Shift.objects.create(
        tenant=employee.tenant,
        code="preview-day-shift",
        name="Preview Day Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        grace_in_minutes=10,
        grace_out_minutes=15,
        is_active=True,
    )
    holiday_calendar = HolidayCalendar.objects.create(
        tenant=employee.tenant,
        code="preview-holiday-calendar",
        name="Preview Holiday Calendar",
        legal_entity=employee.legal_entity,
        branch=employee.branch,
        location=employee.location,
        year=attendance_date.year,
        is_active=True,
    )
    holiday = Holiday.objects.create(
        calendar=holiday_calendar,
        date=attendance_date,
        name="Foundation Day",
        holiday_type="general",
    )
    policy = create_employee_scoped_attendance_policy(
        employee=employee,
        code="preview-holiday-policy",
        name="Preview Holiday Policy",
        default_shift=shift,
        holiday_calendar=holiday_calendar,
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policies/preview/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "policy_id": str(policy.id),
            "shift_id": str(shift.id),
            "default_shift_id": str(shift.id),
            "holiday_calendar_id": str(holiday_calendar.id),
            "full_day_min_hours": "8.00",
            "half_day_min_hours": "4.00",
            "late_mark_after_minutes": 15,
            "overtime_threshold_minutes": 30,
            "config_snapshot": policy.config_snapshot,
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["current_resolved_policy_name"] == policy.name
    assert payload["draft_policy_matches_current_resolution"] is True
    assert payload["derived_status"] == AttendanceStatus.HOLIDAY
    assert payload["resolved_shift_name"] == shift.name
    assert payload["matched_holiday_id"] == str(holiday.id)
    assert payload["matched_holiday_name"] == holiday.name
    assert payload["matched_holiday_type"] == holiday.holiday_type


@pytest.mark.django_db
def test_hr_admin_attendance_policy_preview_derives_late_and_overtime(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=4)
    shift = Shift.objects.create(
        tenant=employee.tenant,
        code="preview-overtime-shift",
        name="Preview Overtime Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        grace_in_minutes=10,
        grace_out_minutes=15,
        is_active=True,
    )
    policy = create_employee_scoped_attendance_policy(
        employee=employee,
        code="preview-overtime-policy",
        name="Preview Overtime Policy",
        default_shift=shift,
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policies/preview/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "policy_id": str(policy.id),
            "shift_id": str(shift.id),
            "default_shift_id": str(shift.id),
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:25:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T19:00:00+00:00",
            "full_day_min_hours": "8.00",
            "half_day_min_hours": "4.00",
            "late_mark_after_minutes": 15,
            "overtime_threshold_minutes": 30,
            "config_snapshot": policy.config_snapshot,
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["derived_status"] == AttendanceStatus.LATE
    assert payload["resolved_shift_name"] == shift.name
    assert payload["work_duration_hours"] == "9.58"
    assert payload["overtime_hours"] == "1.08"
    assert payload["late_minutes"] == 25
    assert payload["early_exit_minutes"] == 0


@pytest.mark.django_db
def test_hr_admin_attendance_policy_preview_derives_half_day(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=9)
    shift = Shift.objects.create(
        tenant=employee.tenant,
        code="preview-halfday-shift",
        name="Preview Half Day Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        grace_in_minutes=10,
        grace_out_minutes=15,
        is_active=True,
    )
    policy = create_employee_scoped_attendance_policy(
        employee=employee,
        code="preview-halfday-policy",
        name="Preview Half Day Policy",
        default_shift=shift,
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "present",
                "derive_overtime": True,
            }
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policies/preview/",
        {
            "employee_id": str(employee.id),
            "attendance_date": attendance_date.isoformat(),
            "policy_id": str(policy.id),
            "shift_id": str(shift.id),
            "default_shift_id": str(shift.id),
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T13:30:00+00:00",
            "full_day_min_hours": "8.00",
            "half_day_min_hours": "4.00",
            "late_mark_after_minutes": 15,
            "overtime_threshold_minutes": 30,
            "config_snapshot": policy.config_snapshot,
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["derived_status"] == AttendanceStatus.HALF_DAY
    assert payload["work_duration_hours"] == "4.50"
    assert payload["overtime_hours"] == "0.00"


@pytest.mark.django_db
def test_manager_regularization_derives_absent_when_punches_are_missing(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=10)
    create_employee_scoped_attendance_policy(
        employee=employee,
        code="missing-punch-absent-policy",
        name="Missing Punch Absent Policy",
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )
    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
        shift=None,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "reason": "Submitting without punches to use missing-punch derivation.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved with missing punch derivation."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.ABSENT
    assert record.work_duration_hours == Decimal("0.00")
    assert record.overtime_hours == Decimal("0.00")
    assert record.is_regularized is True


@pytest.mark.django_db
def test_manager_regularization_uses_rotation_shift_weekly_off_derivation(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=(6 - timezone.localdate().weekday()) % 7 or 7)
    week_off_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-weekoff-shift",
        name="Rotation Weekly Off Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        weekly_off_days=["sunday"],
        is_active=True,
    )
    work_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-work-shift",
        name="Rotation Work Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        is_active=True,
    )
    create_employee_scoped_attendance_policy(
        employee=employee,
        code="rotation-weekoff-policy",
        name="Rotation Weekly Off Policy",
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=week_off_shift,
        assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
        effective_from=attendance_date,
        effective_to=attendance_date + timedelta(days=1),
        is_primary=True,
        config_snapshot={
            "rotation": {
                "anchor_date": attendance_date.isoformat(),
                "entries": [
                    {"shift_id": str(week_off_shift.id), "span_days": 1},
                    {"shift_id": str(work_shift.id), "span_days": 1},
                ],
            }
        },
    )
    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
        shift=None,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "reason": "Marking weekly off through rotation-derived shift.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved with rotation weekly-off resolution."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.shift_id == week_off_shift.id
    assert record.status == AttendanceStatus.WEEKLY_OFF
    assert record.is_regularized is True


@pytest.mark.django_db
def test_manager_regularization_temporary_override_beats_rotation_weekly_off(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=(6 - timezone.localdate().weekday()) % 7 or 7)
    week_off_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-collision-weekoff-shift",
        name="Rotation Collision Weekly Off Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        weekly_off_days=["sunday"],
        is_active=True,
    )
    override_shift = Shift.objects.create(
        tenant=employee.tenant,
        code="rotation-collision-override-shift",
        name="Rotation Collision Override Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        weekly_off_days=[],
        is_active=True,
    )
    create_employee_scoped_attendance_policy(
        employee=employee,
        code="rotation-collision-policy",
        name="Rotation Collision Policy",
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=week_off_shift,
        assignment_kind=EmployeeShiftAssignmentKind.WEEKLY_ROTATION,
        effective_from=attendance_date,
        effective_to=attendance_date,
        is_primary=True,
        config_snapshot={
            "rotation": {
                "anchor_date": attendance_date.isoformat(),
                "entries": [
                    {"shift_id": str(week_off_shift.id), "span_days": 1},
                ],
            }
        },
    )
    EmployeeShiftAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        shift=override_shift,
        assignment_kind=EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE,
        effective_from=attendance_date,
        effective_to=attendance_date,
        is_primary=True,
    )
    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
        shift=None,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T18:00:00+00:00",
            "reason": "Override should beat rotation weekly off.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved with temporary override precedence."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.shift_id == override_shift.id
    assert record.status == AttendanceStatus.PRESENT
    assert record.is_regularized is True


@pytest.mark.django_db
def test_manager_regularization_prefers_holiday_over_weekly_off_when_both_match(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=(6 - timezone.localdate().weekday()) % 7 or 7)
    shift = Shift.objects.create(
        tenant=employee.tenant,
        code="holiday-vs-weekoff-shift",
        name="Holiday Vs Weekly Off Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        weekly_off_days=["sunday"],
        is_active=True,
    )
    holiday_calendar = HolidayCalendar.objects.create(
        tenant=employee.tenant,
        code="holiday-vs-weekoff-calendar",
        name="Holiday Vs Weekly Off Calendar",
        legal_entity=employee.legal_entity,
        branch=employee.branch,
        location=employee.location,
        year=attendance_date.year,
        is_active=True,
    )
    holiday = Holiday.objects.create(
        calendar=holiday_calendar,
        date=attendance_date,
        name="Overlap Holiday",
        holiday_type="general",
    )
    create_employee_scoped_attendance_policy(
        employee=employee,
        code="holiday-vs-weekoff-policy",
        name="Holiday Vs Weekly Off Policy",
        default_shift=shift,
        holiday_calendar=holiday_calendar,
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )
    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
        shift=None,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "reason": "Holiday should win over weekly off.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved with holiday precedence."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.shift_id == shift.id
    assert record.holiday_id == holiday.id
    assert record.status == AttendanceStatus.HOLIDAY
    assert record.is_regularized is True


@pytest.mark.django_db
def test_manager_regularization_uses_resolved_employee_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=7)

    department_policy = AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code="department-runtime-policy",
        name="Department Runtime Policy",
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
        full_day_min_hours=Decimal("5.00"),
        half_day_min_hours=Decimal("3.00"),
        allow_regularization=True,
        require_regularization_reason=True,
        config_snapshot={"derivation": {"enabled": True, "missing_punch_status": "absent", "late_status_mode": "present", "derive_overtime": True}},
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )

    employee_policy = AttendancePolicy.objects.create(
        tenant=employee.tenant,
        code="employee-runtime-policy",
        name="Employee Runtime Policy",
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit="day",
        full_day_min_hours=Decimal("8.00"),
        half_day_min_hours=Decimal("4.00"),
        allow_regularization=True,
        require_regularization_reason=True,
        config_snapshot={"derivation": {"enabled": True, "missing_punch_status": "absent", "late_status_mode": "present", "derive_overtime": True}},
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=employee_policy,
        employee=employee,
        priority=10,
        is_active=True,
    )

    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T14:00:00+00:00",
            "reason": "Applying corrected five-hour work window.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved after checking scoped policy."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.HALF_DAY
    assert record.work_duration_hours == Decimal("5.00")
    assert record.is_regularized is True


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_resolution_prefers_location_over_branch(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    branch_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="branch-resolution-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=branch_policy,
        branch=employee.branch,
        priority=50,
        is_active=True,
    )
    location_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="location-resolution-policy",
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=location_policy,
        location=employee.location,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(location_policy.id)
    assert payload["policy_name"] == location_policy.name
    assert payload["priority"] == 10
    assert any("Location:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_manager_regularization_uses_resolved_location_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=9)

    branch_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="branch-runtime-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=branch_policy,
        branch=employee.branch,
        priority=50,
        is_active=True,
    )
    location_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="location-runtime-policy",
        full_day_min_hours="7.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=location_policy,
        location=employee.location,
        priority=10,
        is_active=True,
    )

    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T15:00:00+00:00",
            "reason": "Applying corrected six-hour work window with location scope.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved after checking location-scoped policy."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.HALF_DAY
    assert record.work_duration_hours == Decimal("6.00")
    assert record.is_regularized is True


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_resolution_prefers_employment_type_over_department(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    department_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="department-resolution-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="employment-type-resolution-policy",
        full_day_min_hours="8.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=employment_type_policy,
        employment_type=employee.employment_type,
        priority=10,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["has_resolution"] is True
    assert payload["policy_id"] == str(employment_type_policy.id)
    assert payload["policy_name"] == employment_type_policy.name
    assert payload["priority"] == 10
    assert any("Employment type:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_prefers_more_granular_scope_when_priorities_match(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    branch_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="branch-default-resolution-policy",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=branch_policy,
        branch=employee.branch,
        priority=100,
        is_active=True,
    )
    location_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="location-default-resolution-policy",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=location_policy,
        location=employee.location,
        priority=100,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(location_policy.id)
    assert any("Location:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_allows_manual_priority_override_over_granularity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    legal_entity_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="legal-entity-override-resolution-policy",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=legal_entity_policy,
        legal_entity=employee.legal_entity,
        priority=10,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="employment-type-override-resolution-policy",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=employment_type_policy,
        employment_type=employee.employment_type,
        priority=50,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(legal_entity_policy.id)
    assert any("Legal entity:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_hr_admin_attendance_policy_assignment_prefers_multi_field_scope_over_broader_single_scope(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    department_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="department-single-resolution-policy",
        full_day_min_hours="7.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=100,
        is_active=True,
    )
    branch_location_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="branch-location-resolution-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=branch_location_policy,
        branch=employee.branch,
        location=employee.location,
        priority=100,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/resolve/",
        {"employee_id": str(employee.id)},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["policy_id"] == str(branch_location_policy.id)
    assert any("Branch:" in label for label in payload["scope_labels"])
    assert any("Location:" in label for label in payload["scope_labels"])


@pytest.mark.django_db
def test_manager_regularization_uses_resolved_multi_field_attendance_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=11)

    department_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="department-single-runtime-policy",
        full_day_min_hours="7.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=100,
        is_active=True,
    )
    branch_location_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="branch-location-runtime-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=branch_location_policy,
        branch=employee.branch,
        location=employee.location,
        priority=100,
        is_active=True,
    )

    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T15:00:00+00:00",
            "reason": "Applying corrected six-hour work window with multi-field scope.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved after checking multi-field-scoped policy."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.PRESENT
    assert record.work_duration_hours == Decimal("6.00")
    assert record.is_regularized is True


@pytest.mark.django_db
def test_hr_admin_cannot_create_ambiguous_same_priority_attendance_assignment(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    grade_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="grade-ambiguous-attendance-policy",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=grade_policy,
        grade=employee.grade,
        priority=100,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="employment-type-ambiguous-attendance-policy",
    )

    response = api_client.post(
        "/api/v1/hr-admin/attendance-policy-assignments/",
        {
            "attendance_policy_id": str(employment_type_policy.id),
            "employment_type_id": str(employee.employment_type_id),
            "priority": 100,
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "same priority and effective granularity" in str(response.json()["detail"])
    assert str(response.json()["conflict_check"]["has_blocking_conflict"]) == "True"
    assert str(response.json()["conflict_check"]["conflicts"][0]["is_same_granularity"]) == "True"


@pytest.mark.django_db
def test_manager_regularization_uses_resolved_employment_type_policy_assignment(api_client: APIClient, bootstrapped_workspace):
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=10)

    department_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="department-runtime-policy",
        full_day_min_hours="5.00",
        half_day_min_hours="3.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=department_policy,
        department=employee.department,
        priority=50,
        is_active=True,
    )
    employment_type_policy = create_assignment_test_attendance_policy(
        employee=employee,
        label="employment-type-runtime-policy",
        full_day_min_hours="7.00",
        half_day_min_hours="4.00",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=employee.tenant,
        attendance_policy=employment_type_policy,
        employment_type=employee.employment_type,
        priority=10,
        is_active=True,
    )

    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
    )

    employee_token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:00:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T15:00:00+00:00",
            "reason": "Applying corrected six-hour work window with employment type scope.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved after checking employment-type-scoped policy."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.HALF_DAY
    assert record.work_duration_hours == Decimal("6.00")
    assert record.is_regularized is True


@pytest.mark.django_db
def test_manager_approval_recalculates_attendance_runtime_from_regularization(api_client: APIClient, bootstrapped_workspace):
    employee_token = login(api_client, "riya.sharma")
    employee = Employee.objects.get(employee_code="EMP-0042")
    attendance_date = timezone.localdate() + timedelta(days=5)
    shift = Shift.objects.create(
        tenant=employee.tenant,
        code="regularization-runtime-shift",
        name="Regularization Runtime Shift",
        start_time=datetime.strptime("09:00", "%H:%M").time(),
        end_time=datetime.strptime("18:00", "%H:%M").time(),
        working_hours=Decimal("8.00"),
        grace_in_minutes=10,
        grace_out_minutes=15,
        is_active=True,
    )
    create_employee_scoped_attendance_policy(
        employee=employee,
        code="regularization-runtime-policy",
        name="Regularization Runtime Policy",
        default_shift=shift,
        require_regularization_reason=True,
        config_snapshot={
            "derivation": {
                "enabled": True,
                "auto_mark_holiday": True,
                "auto_mark_weekly_off": True,
                "missing_punch_status": "absent",
                "late_status_mode": "late",
                "derive_overtime": True,
            }
        },
    )
    record = AttendanceRecord.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_date=attendance_date,
        status=AttendanceStatus.UNKNOWN,
        shift=shift,
    )

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    submit_response = api_client.post(
        "/api/v1/me/attendance-regularizations/",
        {
            "attendance_record_id": str(record.id),
            "requested_status": "present",
            "requested_check_in_at": f"{attendance_date.isoformat()}T09:25:00+00:00",
            "requested_check_out_at": f"{attendance_date.isoformat()}T19:00:00+00:00",
            "reason": "Need corrected punch times.",
        },
        format="json",
    )

    assert submit_response.status_code == 201, submit_response.json()
    regularization_id = submit_response.json()["id"]

    manager_token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {manager_token}")
    approve_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{regularization_id}/approve/",
        {"comment": "Approved after review."},
        format="json",
    )

    assert approve_response.status_code == 200, approve_response.json()
    record.refresh_from_db()

    assert record.status == AttendanceStatus.LATE
    assert record.is_regularized is True
    assert record.late_minutes == 25
    assert record.early_exit_minutes == 0
    assert record.work_duration_hours == Decimal("9.58")
    assert record.overtime_hours == Decimal("1.08")


@pytest.mark.django_db
def test_hr_admin_cannot_create_duplicate_employee_code(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/employees/",
        {
            "employee_code": "EMP-0042",
            "first_name": "Duplicate",
            "last_name": "Code",
            "employment_status": "active",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["employee_code"] == "This employee code is already in use."


@pytest.mark.django_db
def test_hr_admin_employee_directory_exposes_access_state(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0101",
        first_name="No",
        last_name="Access",
        preferred_name="No Access",
        work_email="no.access@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )

    response = api_client.get("/api/v1/hr-admin/employees/")

    assert response.status_code == 200, response.json()
    payload = response.json()

    provisioned_employee = next(item for item in payload if item["employee_code"] == "EMP-0042")
    assert provisioned_employee["has_access"] is True
    assert provisioned_employee["membership_status"] == MembershipStatus.ACTIVE
    assert provisioned_employee["assigned_role_count"] == 1

    unprovisioned_employee = next(item for item in payload if item["employee_code"] == "EMP-0101")
    assert unprovisioned_employee["has_access"] is False
    assert unprovisioned_employee["membership_status"] == ""
    assert unprovisioned_employee["assigned_role_count"] == 0


@pytest.mark.django_db
def test_hr_admin_employee_directory_exposes_manager_reassignment_visibility(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/employees/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    manager = next(item for item in payload if item["employee_code"] == "EMP-0002")
    contributor = next(item for item in payload if item["employee_code"] == "EMP-0042")

    assert manager["direct_reports_count"] >= 1
    assert contributor["direct_reports_count"] == 0


@pytest.mark.django_db
def test_hr_admin_employee_detail_exposes_access_summary(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    response = api_client.get(f"/api/v1/hr-admin/employees/{employee.id}/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["employee_code"] == "EMP-0042"
    assert payload["has_access"] is True
    assert payload["membership_status"] == MembershipStatus.ACTIVE
    assert payload["assigned_role_count"] == 1


@pytest.mark.django_db
def test_hr_admin_employee_detail_exposes_direct_report_count(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    manager = Employee.objects.get(employee_code="EMP-0002")
    response = api_client.get(f"/api/v1/hr-admin/employees/{manager.id}/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["employee_code"] == "EMP-0002"
    assert payload["direct_reports_count"] >= 1


@pytest.mark.django_db
def test_hr_admin_employee_form_options_expose_relation_metadata(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/employees/options/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    branch = next(item for item in payload["branches"] if item["name"] == "Bengaluru HO")
    department = next(item for item in payload["departments"] if item["name"] == "People Operations")
    designation = next(item for item in payload["designations"] if item["name"] == "Sales Executive")

    assert branch["legal_entity_id"]
    assert branch["location_id"]
    assert department["business_unit_id"]
    assert designation["grade_id"]


@pytest.mark.django_db
def test_hr_admin_cannot_create_duplicate_department_code(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/organization/departments/",
        {
            "code": "people-ops",
            "name": "Duplicate Department",
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["code"] == "This code is already in use."


@pytest.mark.django_db
def test_hr_admin_organization_detail_exposes_dependency_counts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    item = Department.objects.get(tenant__code="northstar-foods", code="people-ops")
    response = api_client.get(f"/api/v1/hr-admin/organization/departments/{item.id}/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["code"] == "people-ops"
    assert payload["linked_employees_count"] == Employee.objects.filter(tenant=item.tenant, department=item).count()
    assert payload["child_count"] == Department.objects.filter(tenant=item.tenant, parent=item).count()


@pytest.mark.django_db
def test_hr_admin_organization_snapshot_exposes_list_level_dependency_counts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/organization/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    department = next(item for item in payload["departments"] if item["code"] == "people-ops")
    grade = next(item for item in payload["grades"] if item["code"] == "m1")

    assert department["linked_employees_count"] >= 1
    assert "child_count" in department
    assert grade["linked_employees_count"] >= 1
    assert grade["designations_count"] >= 1


@pytest.mark.django_db
def test_hr_admin_cannot_deactivate_department_with_linked_employees(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    item = Department.objects.get(tenant__code="northstar-foods", code="people-ops")
    response = api_client.patch(
        f"/api/v1/hr-admin/organization/departments/{item.id}/",
        {
            "is_active": False,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["is_active"] == "Cannot deactivate this record while it still has linked employees."


@pytest.mark.django_db
def test_hr_admin_cannot_deactivate_business_unit_with_children(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    parent = BusinessUnit.objects.get(tenant=tenant, code="corporate")
    BusinessUnit.objects.create(
        tenant=tenant,
        code="corporate-child",
        name="Corporate Child",
        parent=parent,
        is_active=True,
    )

    response = api_client.patch(
        f"/api/v1/hr-admin/organization/business_units/{parent.id}/",
        {
            "is_active": False,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "child business units" in response.json()["is_active"]


@pytest.mark.django_db
def test_hr_admin_cannot_deactivate_grade_with_designations(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    item = Grade.objects.get(tenant__code="northstar-foods", code="m1")
    response = api_client.patch(
        f"/api/v1/hr-admin/organization/grades/{item.id}/",
        {
            "is_active": False,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "linked designations" in response.json()["is_active"]


@pytest.mark.django_db
def test_hr_admin_cannot_assign_business_unit_as_its_own_parent(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    item = BusinessUnit.objects.get(tenant__code="northstar-foods", code="corporate")
    response = api_client.patch(
        f"/api/v1/hr-admin/organization/business_units/{item.id}/",
        {
            "parent_id": str(item.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["parent_id"] == "A business unit cannot be its own parent."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_department_as_its_own_parent(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    item = Department.objects.get(tenant__code="northstar-foods", code="people-ops")
    response = api_client.patch(
        f"/api/v1/hr-admin/organization/departments/{item.id}/",
        {
            "parent_id": str(item.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["parent_id"] == "A department cannot be its own parent."


@pytest.mark.django_db
def test_hr_admin_cannot_save_grade_with_invalid_level(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/organization/grades/",
        {
            "code": "invalid-grade",
            "name": "Invalid Grade",
            "is_active": True,
            "level": 0,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["level"] == ["Level must be 1 or higher."]


@pytest.mark.django_db
def test_hr_admin_cannot_assign_employee_as_their_own_manager(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "reporting_manager_id": str(employee.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["reporting_manager_id"] == "An employee cannot report to themselves."


@pytest.mark.django_db
def test_hr_admin_cannot_save_employee_with_birth_date_after_joining(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/employees/",
        {
            "employee_code": "EMP-0201",
            "first_name": "Date",
            "last_name": "Mismatch",
            "employment_status": "active",
            "date_of_birth": "2024-01-10",
            "date_of_joining": "2024-01-01",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Date of birth must be earlier than date of joining." in str(response.json()["date_of_birth"])


@pytest.mark.django_db
def test_hr_admin_cannot_save_employee_with_probation_before_joining(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/employees/",
        {
            "employee_code": "EMP-0202",
            "first_name": "Probation",
            "last_name": "Mismatch",
            "employment_status": "active",
            "date_of_joining": "2024-02-01",
            "probation_end_date": "2024-01-01",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Probation end date cannot be earlier than date of joining." in str(response.json()["probation_end_date"])


@pytest.mark.django_db
def test_hr_admin_cannot_save_employee_with_confirmation_before_probation_end(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/employees/",
        {
            "employee_code": "EMP-0203",
            "first_name": "Confirmation",
            "last_name": "Mismatch",
            "employment_status": "active",
            "date_of_joining": "2024-01-01",
            "probation_end_date": "2024-06-01",
            "confirmation_date": "2024-05-01",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Confirmation date cannot be earlier than probation end date." in str(response.json()["confirmation_date"])


@pytest.mark.django_db
def test_hr_admin_cannot_inactivate_employee_while_access_is_live(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "employment_status": EmploymentStatus.INACTIVE,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["employment_status"] == "Deactivate employee access first before moving this employee to an inactive or exited status."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_branch_from_different_legal_entity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    legal_entity = LegalEntity.objects.create(
        tenant=tenant,
        code="second-entity",
        name="Second Entity",
        is_active=True,
    )
    location = Location.objects.create(
        tenant=tenant,
        code="second-location",
        name="Second Location",
        is_active=True,
    )
    branch = Branch.objects.create(
        tenant=tenant,
        code="second-branch",
        name="Second Branch",
        legal_entity=legal_entity,
        location=location,
        is_active=True,
    )

    employee = Employee.objects.get(employee_code="EMP-0042")
    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "branch_id": str(branch.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["branch_id"] == "Selected branch does not belong to the selected legal entity."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_location_mismatched_with_branch(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    legal_entity = LegalEntity.objects.get(tenant=tenant, code="northstar-pvt-ltd")
    location = Location.objects.create(
        tenant=tenant,
        code="alternate-location",
        name="Alternate Location",
        is_active=True,
    )
    branch = Branch.objects.create(
        tenant=tenant,
        code="alternate-branch",
        name="Alternate Branch",
        legal_entity=legal_entity,
        location=location,
        is_active=True,
    )
    employee = Employee.objects.get(employee_code="EMP-0042")
    current_location = Location.objects.get(tenant=tenant, code="bengaluru-hq")

    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "branch_id": str(branch.id),
            "location_id": str(current_location.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["location_id"] == "Selected location does not match the branch location."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_department_from_different_business_unit(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    business_unit = BusinessUnit.objects.create(
        tenant=tenant,
        code="field-ops",
        name="Field Ops",
        is_active=True,
    )
    department = Department.objects.create(
        tenant=tenant,
        code="field-sales",
        name="Field Sales",
        business_unit=business_unit,
        is_active=True,
    )
    current_business_unit = BusinessUnit.objects.get(tenant=tenant, code="corporate")
    employee = Employee.objects.get(employee_code="EMP-0042")

    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "department_id": str(department.id),
            "business_unit_id": str(current_business_unit.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["business_unit_id"] == "Selected business unit does not match the department business unit."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_cost_center_from_different_legal_entity(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    legal_entity = LegalEntity.objects.create(
        tenant=tenant,
        code="third-entity",
        name="Third Entity",
        is_active=True,
    )
    cost_center = CostCenter.objects.create(
        tenant=tenant,
        code="third-entity-cc",
        name="Third Entity Cost Center",
        legal_entity=legal_entity,
        is_active=True,
    )
    employee = Employee.objects.get(employee_code="EMP-0042")

    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "cost_center_id": str(cost_center.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["cost_center_id"] == "Selected cost center does not belong to the selected legal entity."


@pytest.mark.django_db
def test_hr_admin_cannot_assign_designation_from_different_grade(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    grade = Grade.objects.create(
        tenant=tenant,
        code="g3",
        name="G3",
        level=3,
        is_active=True,
    )
    designation = Designation.objects.create(
        tenant=tenant,
        code="regional-manager",
        name="Regional Manager",
        grade=grade,
        is_active=True,
    )
    current_grade = Grade.objects.get(tenant=tenant, code="m1")
    employee = Employee.objects.get(employee_code="EMP-0042")

    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/",
        {
            "designation_id": str(designation.id),
            "grade_id": str(current_grade.id),
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["grade_id"] == "Selected grade does not match the designation grade."


@pytest.mark.django_db
def test_hr_admin_cannot_save_employee_access_without_roles(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0043")
    response = api_client.patch(
        f"/api/v1/hr-admin/employees/{employee.id}/access/",
        {
            "username": "aman.verma",
            "email": "aman.verma@northstar.example",
            "role_ids": [],
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["role_ids"] == "Select at least one role."


@pytest.mark.django_db
def test_hr_admin_cannot_keep_active_access_for_inactive_employee(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0102",
        first_name="Former",
        last_name="Employee",
        preferred_name="Former",
        work_email="former.employee@northstar.example",
        employment_status=EmploymentStatus.INACTIVE,
    )
    employee_role = Role.objects.get(tenant__code="northstar-foods", code="employee")
    response = api_client.post(
        f"/api/v1/hr-admin/employees/{employee.id}/access/",
        {
            "username": "former.employee",
            "email": "former.employee@northstar.example",
            "first_name": "Former",
            "last_name": "Employee",
            "display_name": "Former Employee",
            "membership_status": MembershipStatus.ACTIVE,
            "is_default_membership": True,
            "is_user_active": True,
            "must_change_password": True,
            "role_ids": [str(employee_role.id)],
            "password": "",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["is_user_active"] == "Inactive or exited employees cannot keep an active user account."


@pytest.mark.django_db
def test_hr_admin_can_store_non_active_access_for_inactive_employee(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0103",
        first_name="Archived",
        last_name="User",
        preferred_name="Archived",
        work_email="archived.user@northstar.example",
        employment_status=EmploymentStatus.INACTIVE,
    )
    employee_role = Role.objects.get(tenant__code="northstar-foods", code="employee")
    response = api_client.post(
        f"/api/v1/hr-admin/employees/{employee.id}/access/",
        {
            "username": "archived.user",
            "email": "archived.user@northstar.example",
            "first_name": "Archived",
            "last_name": "User",
            "display_name": "Archived User",
            "membership_status": MembershipStatus.SUSPENDED,
            "is_default_membership": True,
            "is_user_active": False,
            "must_change_password": True,
            "role_ids": [str(employee_role.id)],
            "password": "",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["is_user_active"] is False
    assert payload["membership_status"] == MembershipStatus.SUSPENDED


@pytest.mark.django_db
def test_hr_admin_can_assign_employee_role_and_auto_generate_password(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0100",
        first_name="Access",
        last_name="Provision",
        preferred_name="Access",
        work_email="access.provision@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    employee_role = Role.objects.get(tenant__code="northstar-foods", code="employee")
    response = api_client.post(
        f"/api/v1/hr-admin/employees/{employee.id}/access/",
        {
            "username": "access.provision",
            "email": "access.provision@northstar.example",
            "first_name": "Access",
            "last_name": "Provision",
            "display_name": "Access Provision",
            "membership_status": MembershipStatus.ACTIVE,
            "is_default_membership": True,
            "is_user_active": True,
            "must_change_password": True,
            "role_ids": [str(employee_role.id)],
            "password": "",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["role_ids"] == [str(employee_role.id)]
    assert payload["roles"][0]["code"] == "employee"
    assert payload["password_was_reset"] is True
    assert isinstance(payload["generated_password"], str)
    assert payload["generated_password"]


@pytest.mark.django_db
def test_hr_admin_completed_onboarding_updates_employee_joining_state(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0204",
        first_name="Joining",
        last_name="Employee",
        work_email="joining.employee@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.COMPLETED,
            "expected_joining_date": "2024-07-01",
            "actual_joining_date": "2024-07-03",
            "checklist_snapshot": [{"code": "offer", "label": "Offer accepted", "done": True}],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    employee.refresh_from_db()
    assert employee.date_of_joining.isoformat() == "2024-07-03"
    assert employee.employment_status == EmploymentStatus.ACTIVE


@pytest.mark.django_db
def test_hr_admin_confirmed_probation_updates_employee_confirmation_dates(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0205",
        first_name="Probation",
        last_name="Confirm",
        work_email="probation.confirm@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
        date_of_joining=datetime.strptime("2024-01-15", "%Y-%m-%d").date(),
    )

    response = api_client.post(
        "/api/v1/hr-admin/probation-reviews/",
        {
            "employee_id": str(employee.id),
            "review_date": "2024-07-01",
            "probation_end_date": "2024-06-30",
            "decision": ProbationDecision.CONFIRM,
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    employee.refresh_from_db()
    assert employee.probation_end_date.isoformat() == "2024-06-30"
    assert employee.confirmation_date.isoformat() == "2024-07-01"


@pytest.mark.django_db
def test_hr_admin_completed_movement_updates_employee_structure(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    new_manager = Employee.objects.get(tenant=tenant, employee_code="EMP-0044")
    business_unit = BusinessUnit.objects.get(tenant=tenant, code="corporate")
    grade = Grade.objects.get(tenant=tenant, code="m1")
    department = Department.objects.create(
        tenant=tenant,
        code="corp-strategy",
        name="Corporate Strategy",
        business_unit=business_unit,
        is_active=True,
    )
    designation = Designation.objects.create(
        tenant=tenant,
        code="strategy-lead",
        name="Strategy Lead",
        grade=grade,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/movements/",
        {
            "employee_id": str(employee.id),
            "movement_type": "promotion",
            "status": LifecycleEventStatus.COMPLETED,
            "effective_date": "2024-08-01",
            "to_department_id": str(department.id),
            "to_designation_id": str(designation.id),
            "to_manager_id": str(new_manager.id),
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    employee.refresh_from_db()
    assert employee.department_id == department.id
    assert employee.designation_id == designation.id
    assert employee.reporting_manager_id == new_manager.id


@pytest.mark.django_db
def test_hr_admin_cannot_complete_exit_while_employee_access_is_live(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.COMPLETED,
            "resignation_date": "2024-08-01",
            "proposed_last_working_date": "2024-08-15",
            "approved_last_working_date": "2024-08-15",
            "actual_exit_date": "2024-08-15",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Deactivate employee access first before completing an exit for this employee."


@pytest.mark.django_db
def test_hr_admin_completed_exit_updates_employee_status(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0206",
        first_name="Exit",
        last_name="Ready",
        work_email="exit.ready@northstar.example",
        employment_status=EmploymentStatus.ON_NOTICE,
        date_of_joining=datetime.strptime("2023-01-10", "%Y-%m-%d").date(),
    )

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.COMPLETED,
            "resignation_date": "2024-08-01",
            "notice_start_date": "2024-08-01",
            "notice_end_date": "2024-08-31",
            "proposed_last_working_date": "2024-08-31",
            "approved_last_working_date": "2024-08-31",
            "actual_exit_date": "2024-08-31",
            "exit_reason": "personal",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    employee.refresh_from_db()
    assert employee.employment_status == EmploymentStatus.EXITED


@pytest.mark.django_db
def test_hr_admin_cannot_complete_onboarding_with_missing_required_documents(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0207",
        first_name="Docs",
        last_name="Pending",
        work_email="docs.pending@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="id-proof",
        name="ID Proof",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.COMPLETED,
            "actual_joining_date": "2024-09-01",
            "checklist_snapshot": [{"code": "offer", "label": "Offer accepted", "done": True}],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Verify required onboarding documents before setting onboarding to Completed" in str(response.json()["status"])


@pytest.mark.django_db
def test_hr_admin_onboarding_auto_adds_document_requirement_checklist_items(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0207A",
        first_name="Docs",
        last_name="Checklist",
        work_email="docs.checklist@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="bank-proof",
        name="Bank Proof",
        category_type=DocumentCategoryType.BANK,
        requires_verification=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "owner_value": "identifier:nisha.rao",
            "actual_joining_date": "2024-09-01",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    document_item = next(item for item in payload["checklist_snapshot"] if item["due_date_source"] == "document_rule")
    assert document_item["code"] == "document-bank-proof"
    assert document_item["label"] == "Verify Bank Proof"
    assert document_item["owner"] == "nisha.rao"
    assert document_item["owner_source_type"] == "document_rule"
    assert document_item["source_document_category_name"] == "Bank Proof"
    assert document_item["source_document_due_offset_days"] == 0
    assert document_item["due_on"] == "2024-09-01"
    assert document_item["blocking"] is True
    assert document_item["done"] is False


@pytest.mark.django_db
def test_hr_admin_onboarding_document_requirement_items_respect_future_due_and_compliance(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0207B",
        first_name="Future",
        last_name="Documents",
        work_email="future.documents@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="tax-proof",
        name="Tax Proof",
        category_type=DocumentCategoryType.TAX,
        requires_verification=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        is_mandatory=True,
        required_within_days_of_joining=7,
        is_active=True,
    )
    EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        title="Tax Proof",
        file_name="tax-proof.pdf",
        uploaded_by_identifier="nisha.rao",
        verified_by_identifier="nisha.rao",
        verified_at=timezone.now(),
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "expected_joining_date": timezone.localdate().isoformat(),
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    document_item = next(item for item in payload["checklist_snapshot"] if item["due_date_source"] == "document_rule")
    assert document_item["blocking"] is False
    assert document_item["done"] is True
    assert payload["missing_required_document_count"] == 0
    assert payload["future_due_document_count"] == 1


@pytest.mark.django_db
def test_hr_admin_document_options_expose_upload_limit(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/document-options/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["max_upload_size_bytes"] == 10 * 1024 * 1024


@pytest.mark.django_db
def test_hr_admin_can_upload_and_download_employee_document_artifact(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="passport-copy",
        name="Passport Copy",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        allow_multiple_files=False,
        is_active=True,
    )
    uploaded_file = SimpleUploadedFile(
        "passport-copy.pdf",
        b"%PDF-1.4 phase4 storage smoke\n",
        content_type="application/pdf",
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/employee-documents/",
        {
            "employee_id": str(employee.id),
            "category_id": str(category.id),
            "title": "Passport front and back",
            "document_number": "P1234567",
            "file": uploaded_file,
        },
        format="multipart",
    )

    assert create_response.status_code == 201, create_response.json()
    payload = create_response.json()
    assert payload["employee_id"] == str(employee.id)
    assert payload["category_id"] == str(category.id)
    assert payload["artifact_id"]
    assert payload["mime_type"] == "application/pdf"
    assert payload["file_size_bytes"] > 0
    assert payload["file_url"].endswith(f"/api/v1/hr-admin/employee-documents/{payload['id']}/download/")

    document = EmployeeDocument.objects.get(id=payload["id"])
    assert document.artifact_id is not None
    assert document.verification_status == VerificationStatus.PENDING

    artifact = DocumentArtifact.objects.get(id=document.artifact_id)
    assert artifact.original_filename == "passport-copy.pdf"
    assert artifact.storage_provider == "local"
    assert artifact.file_size_bytes > 0
    assert artifact.mime_type == "application/pdf"
    assert artifact.checksum_sha256

    download_response = api_client.get(f"/api/v1/hr-admin/employee-documents/{document.id}/download/")

    assert download_response.status_code == 200
    assert download_response["Content-Type"] == "application/pdf"
    assert "attachment;" in download_response["Content-Disposition"]
    assert b"phase4 storage smoke" in b"".join(download_response.streaming_content)


@pytest.mark.django_db
def test_hr_admin_can_preview_generated_letter_with_employee_context(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)

    response = api_client.post(
        "/api/v1/hr-admin/generated-letters/preview/",
        {
            "employee_id": str(employee.id),
            "letter_type": "confirmation",
            "title": "Confirmation Letter",
            "template_code": "confirmation-standard",
            "issue_date": "2026-09-04",
            "template_body": "This confirms {{ employee_name }} joined {{ legal_entity }} as {{ designation }} on {{ date_of_joining }}. Ref {{ reference_number }}.",
            "payload_values": {"reference_number": "HR/CONF/0042"},
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["missing_variables"] == []
    assert "Riya Sharma joined Northstar Foods Pvt Ltd" in payload["rendered_text"]
    assert "HR/CONF/0042" in payload["rendered_text"]
    assert payload["payload"]["context"]["employee_code"] == "EMP-0042"
    assert payload["used_variables"] == [
        "date_of_joining",
        "designation",
        "employee_name",
        "legal_entity",
        "reference_number",
    ]


@pytest.mark.django_db
def test_hr_admin_generated_letter_preview_rejects_missing_variables(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)

    response = api_client.post(
        "/api/v1/hr-admin/generated-letters/preview/",
        {
            "employee_id": str(employee.id),
            "letter_type": "experience",
            "template_body": "Experience certified for {{ employee_name }} until {{ end_date }}.",
            "payload_values": {},
        },
        format="json",
    )

    assert response.status_code == 400
    assert "end_date" in str(response.json()["template_body"])


@pytest.mark.django_db
def test_hr_admin_can_generate_list_and_download_letter_artifact(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)

    create_response = api_client.post(
        "/api/v1/hr-admin/generated-letters/",
        {
            "employee_id": str(employee.id),
            "letter_type": "confirmation",
            "title": "Riya Confirmation Letter",
            "template_code": "confirmation-standard",
            "issue_date": "2026-09-04",
            "workflow_reference": "WF-CONF-0042",
            "template_body": "Dear {{ first_name }}, your confirmation at {{ legal_entity }} is effective {{ issue_date }}.",
            "payload_values": {},
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    payload = create_response.json()
    assert payload["employee_id"] == str(employee.id)
    assert payload["letter_type"] == "confirmation"
    assert payload["artifact_id"]
    assert payload["file_url"].endswith(f"/api/v1/hr-admin/generated-letters/{payload['id']}/download/")
    assert "Dear Riya" in payload["rendered_text"]
    assert payload["payload_snapshot"]["generated_by_identifier"] == "EMP-0001"

    letter = GeneratedLetter.objects.get(id=payload["id"])
    assert letter.artifact_id is not None
    assert letter.artifact.source_kind == "generated"
    assert letter.artifact.mime_type == "text/plain"
    assert letter.workflow_reference == "WF-CONF-0042"

    list_response = api_client.get("/api/v1/hr-admin/generated-letters/?q=Riya&page=1&page_size=5")
    assert list_response.status_code == 200, list_response.json()
    assert any(item["id"] == str(letter.id) for item in list_response.json()["items"])

    download_response = api_client.get(f"/api/v1/hr-admin/generated-letters/{letter.id}/download/")
    assert download_response.status_code == 200
    assert download_response["Content-Type"] == "text/plain"
    assert "attachment;" in download_response["Content-Disposition"]
    assert b"Dear Riya" in b"".join(download_response.streaming_content)


@pytest.mark.django_db
def test_hr_admin_can_request_document_reupload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    hr_employee = Employee.objects.get(employee_code="EMP-0001", tenant=tenant)
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="reupload-request-id",
        name="Reupload Request ID",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Identity proof",
        file_name="identity-proof.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.PENDING,
        uploaded_by_identifier="EMP-0042",
    )

    response = api_client.patch(
        f"/api/v1/hr-admin/employee-documents/{document.id}/",
        {
            "verification_status": VerificationStatus.REJECTED,
            "reupload_requested": True,
            "rejection_reason": "Please upload a clearer scan.",
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["verification_status"] == VerificationStatus.REJECTED
    assert payload["reupload_requested"] is True
    assert payload["reupload_requested_by_identifier"] == hr_employee.employee_code
    assert payload["review_history"][-1]["new_status"] == VerificationStatus.REJECTED

    document.refresh_from_db()
    assert document.reupload_requested is True
    assert document.reupload_requested_by_identifier == hr_employee.employee_code
    notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_document",
        subject_identifier=str(document.id),
        recipient_membership=employee.membership,
    ).order_by("-created_at").first()
    assert notification is not None
    assert notification.payload["reupload_requested"] is True
    assert notification.payload["employee_code"] == employee.employee_code


@pytest.mark.django_db
def test_hr_admin_document_list_exposes_expiry_runtime_and_filters_expired(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="expiry-runtime-doc",
        name="Expiry Runtime Doc",
        category_type=DocumentCategoryType.POLICY,
        requires_verification=False,
        allow_employee_upload=True,
        is_active=True,
    )
    expired_document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Expired artifact",
        file_name="expired.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() - timedelta(days=2),
        uploaded_by_identifier="EMP-0042",
    )
    EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Future artifact",
        file_name="future.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() + timedelta(days=45),
        uploaded_by_identifier="EMP-0042",
    )

    response = api_client.get("/api/v1/hr-admin/employee-documents/?expiry_filter=expired")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert any(item["id"] == str(expired_document.id) for item in payload["items"])
    expired_payload = next(item for item in payload["items"] if item["id"] == str(expired_document.id))
    assert expired_payload["expiry_state"] == "expired"
    assert expired_payload["expiry_label"] == "Expired"
    assert expired_payload["is_expired"] is True
    assert expired_payload["days_until_expiry"] <= -1


@pytest.mark.django_db
def test_hr_admin_document_reminder_action_creates_expiry_attention_notification(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="expiry-reminder-doc",
        name="Expiry Reminder Doc",
        category_type=DocumentCategoryType.POLICY,
        requires_verification=False,
        allow_employee_upload=True,
        is_active=True,
    )
    expired_document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Expired reminder target",
        file_name="expired-reminder.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() - timedelta(days=1),
        uploaded_by_identifier="EMP-0042",
    )
    valid_document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Valid reminder skip",
        file_name="valid-reminder.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() + timedelta(days=90),
        uploaded_by_identifier="EMP-0042",
    )

    response = api_client.post(
        "/api/v1/hr-admin/employee-documents/reminders/",
        {"document_ids": [str(expired_document.id), str(valid_document.id)]},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["processed_count"] == 2
    assert payload["reminder_count"] == 1
    assert payload["skipped_count"] == 1

    notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_document",
        subject_identifier=str(expired_document.id),
        recipient_membership=employee.membership,
    ).order_by("-created_at").first()
    assert notification is not None
    assert notification.payload["expiry_state"] == "expired"
    assert notification.payload["employee_code"] == employee.employee_code


@pytest.mark.django_db
def test_document_expiry_reminder_command_sends_system_scan_notifications(bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="expiry-command-doc",
        name="Expiry Command Doc",
        category_type=DocumentCategoryType.POLICY,
        requires_verification=False,
        allow_employee_upload=True,
        is_active=True,
    )
    expiring_document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Expiring command target",
        file_name="expiring-command.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() + timedelta(days=7),
        uploaded_by_identifier="EMP-0042",
    )

    call_command("send_document_expiry_reminders", tenant_code=tenant.code)

    notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_document",
        subject_identifier=str(expiring_document.id),
        recipient_membership=employee.membership,
    ).order_by("-created_at").first()
    assert notification is not None
    assert notification.payload["expiry_state"] == "expiring_soon"
    assert notification.payload["reminder_source"] == "system_scan"


@pytest.mark.django_db
def test_hr_admin_notification_queue_filters_by_module_and_subject_type(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(employee_code="EMP-0042", tenant=tenant)
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="notification-filter-doc",
        name="Notification Filter Doc",
        category_type=DocumentCategoryType.POLICY,
        requires_verification=False,
        allow_employee_upload=True,
        is_active=True,
    )
    document = EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Notification filter target",
        file_name="notification-filter.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() - timedelta(days=1),
        uploaded_by_identifier="EMP-0042",
    )
    _ = Notification.objects.create(
        tenant=tenant,
        channel="in_app",
        audience_type="custom",
        subject_type="leave_request",
        subject_identifier="leave-123",
        recipient_identifier="nisha.rao",
        title="Leave queue item",
        body="Review leave request.",
        status="pending",
        priority="normal",
        payload={},
    )
    NotificationEventDefinition.objects.create(
        tenant=tenant,
        code="documents-employee-expiry-attention-test",
        name="Employee Document Expiry Attention Test",
        module="documents",
        trigger_key="documents.employee.expiry_attention",
        audience_type="employee",
        channel="in_app",
        is_active=True,
        priority="high",
        delivery_delay_minutes=0,
        recipient_snapshot={},
    )
    api_client.post(
        "/api/v1/hr-admin/employee-documents/reminders/",
        {"document_ids": [str(document.id)]},
        format="json",
    )

    response = api_client.get("/api/v1/hr-admin/notifications/?module=documents&subject_type=employee_document")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["total_count"] >= 1
    assert all(item["subject_type"] == "employee_document" for item in payload["items"])


@pytest.mark.django_db
def test_bootstrap_demo_workspace_seeds_document_notification_catalog(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    options_response = api_client.get("/api/v1/hr-admin/notification-options/")
    assert options_response.status_code == 200, options_response.json()
    options_payload = options_response.json()
    assert any(item["value"] == "documents" for item in options_payload["workflow_modules"])

    templates_response = api_client.get("/api/v1/hr-admin/notification-templates/")
    assert templates_response.status_code == 200, templates_response.json()
    templates_payload = templates_response.json()
    assert any(item["code"] == "documents-employee-expiry-attention" for item in templates_payload)
    assert NotificationTemplate.objects.filter(code="documents-employee-expiry-attention", is_system_seeded=True).exists()

    events_response = api_client.get("/api/v1/hr-admin/notification-events/")
    assert events_response.status_code == 200, events_response.json()
    events_payload = events_response.json()
    assert any(item["trigger_key"] == "documents.employee.expiry_attention" and item["template_name"] for item in events_payload)

    tenant = bootstrapped_workspace["pending_leave"].tenant
    assert any(item["value"] == NotificationDeliveryBackend.EMAIL_SMTP for item in options_payload["notification_delivery_backends"])
    assert any(item["key"] == "max_attempts" for item in options_payload["notification_delivery_authoring"]["policy_fields"])
    assert any(item["backend_key"] == NotificationDeliveryBackend.EMAIL_SMTP for item in options_payload["notification_delivery_authoring"]["provider_fields"])
    assert any(item["channel"] == "email" for item in options_payload["notification_delivery_authoring"]["channel_hints"])
    assert any(item["module"] == "documents" for item in options_payload["notification_catalog_authoring"]["event_module_hints"])
    assert any(item["audience_type"] == "custom" for item in options_payload["notification_catalog_authoring"]["audience_hints"])
    assert any("channel" in item and "status" in item for item in options_payload["templates"])
    assert len(options_payload["channel_configurations"]) == 5
    assert NotificationChannelConfiguration.objects.filter(tenant=tenant).count() == 5


@pytest.mark.django_db
def test_hr_admin_notification_channel_config_can_be_updated(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    list_response = api_client.get("/api/v1/hr-admin/notification-channel-configs/")
    assert list_response.status_code == 200, list_response.json()
    items = list_response.json()
    email_item = next(item for item in items if item["channel"] == "email")

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/notification-channel-configs/{email_item['id']}/",
        {
            "is_enabled": False,
            "backend_key": NotificationDeliveryBackend.CONSOLE,
            "sender_address": "alerts@example.local",
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    payload = patch_response.json()
    assert payload["backend_key"] == NotificationDeliveryBackend.CONSOLE
    assert payload["is_enabled"] is False
    assert payload["sender_address"] == "alerts@example.local"


@pytest.mark.django_db
def test_hr_admin_notification_template_preview_renders_sample_payload(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/notification-templates/preview/",
        {
            "channel": "email",
            "subject_template": "Update for {employee_name}",
            "title_template": "",
            "body_template": "Hello {employee_name}, status is {status}.",
            "metadata_template": {"reply_to_label": "{status} desk"},
            "sample_payload": {"employee_name": "Riya Sharma", "status": "approved"},
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["preview"]["subject"] == "Update for Riya Sharma"
    assert payload["preview"]["body"] == "Hello Riya Sharma, status is approved."
    assert payload["preview"]["metadata"]["reply_to_label"] == "approved desk"
    assert payload["test_notification"] is None


@pytest.mark.django_db
def test_hr_admin_notification_event_test_send_creates_notification(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    template = NotificationTemplate.objects.filter(tenant=tenant, code="documents-employee-expiry-attention").first()
    assert template is not None

    response = api_client.post(
        "/api/v1/hr-admin/notification-events/test-send/",
        {
            "module": "documents",
            "trigger_key": "documents.employee.expiry_attention",
            "audience_type": "membership",
            "channel": "in_app",
            "template_id": str(template.id),
            "membership_id": str(employee.membership.id),
            "priority": "high",
            "delivery_delay_minutes": 0,
            "recipient_snapshot": {"routing": "fixed_membership"},
            "sample_payload": {"employee_name": "Riya Sharma", "document_name": "PAN Card", "deadline": "2026-06-30"},
            "subject_type": "employee_document",
            "subject_identifier": "preview-doc-1",
            "process_now": True,
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["preview"]["channel"] == "in_app"
    assert payload["preview"]["resolved_recipient"]["membership_id"] == str(employee.membership.id)
    assert payload["test_notification"]["status"] == NotificationStatus.DELIVERED
    assert payload["test_notification"]["recipient_membership_id"] == str(employee.membership.id)


@pytest.mark.django_db
def test_hr_admin_notification_diagnostics_summarizes_catalog_and_tests(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/notification-diagnostics/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["overview"]["total_templates"] >= 1
    assert payload["overview"]["total_events"] >= 1
    assert "alerts" in payload
    assert "recommendations" in payload
    assert "channel_diagnostics" in payload
    assert "template_diagnostics" in payload
    assert "event_diagnostics" in payload
    assert "recent_test_notifications" in payload


@pytest.mark.django_db
def test_hr_admin_notification_diagnostics_includes_channel_health(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership

    notification = Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="diag-email-1",
        title="Channel diagnostic email",
        subject="Channel diagnostic subject",
        body="Channel diagnostic body.",
        status="failed",
        priority="high",
        payload={},
    )
    NotificationDeliveryLog.objects.create(
        tenant=tenant,
        notification=notification,
        channel="email",
        status="failed",
        provider_name=NotificationDeliveryBackend.EMAIL_SMTP,
        error_message="Mailbox rejected the message.",
        response_payload={"provider": "smtp"},
    )

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/notification-diagnostics/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    email_channel = next(item for item in payload["channel_diagnostics"] if item["channel"] == "email")
    assert email_channel["backend_key"] in {NotificationDeliveryBackend.EMAIL_SMTP, NotificationDeliveryBackend.CONSOLE}
    assert email_channel["failed_notification_count"] >= 1
    assert email_channel["retry_capped_count"] == 0
    assert NotificationDeliveryBackend.EMAIL_SMTP in email_channel["provider_names"]
    assert "Mailbox rejected" in email_channel["latest_failure_message"]
    assert email_channel["latest_failure_at"] is not None


@pytest.mark.django_db
def test_employee_notification_center_lists_and_updates_read_state(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")

    notification = Notification.objects.create(
        tenant=tenant,
        channel="in_app",
        audience_type="employee",
        recipient_membership=employee.membership,
        recipient_identifier=employee.membership.user.username,
        subject_type="employee_document",
        subject_identifier="doc-ess-1",
        title="Document follow-up",
        subject="",
        body="Please review your latest document update.",
        status="delivered",
        priority="normal",
        payload={"document_id": "doc-ess-1"},
    )

    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    list_response = api_client.get("/api/v1/me/notifications/?status=delivered")
    assert list_response.status_code == 200, list_response.json()
    payload = list_response.json()
    assert any(item["id"] == str(notification.id) for item in payload["items"])

    patch_response = api_client.patch(
        f"/api/v1/me/notifications/{notification.id}/",
        {"read_at": "2026-06-21T10:30:00+05:30"},
        format="json",
    )
    assert patch_response.status_code == 200, patch_response.json()
    assert patch_response.json()["read_at"] is not None


@pytest.mark.django_db
def test_manager_notification_center_shows_manager_scope_only(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    manager = Employee.objects.get(tenant=tenant, employee_code="EMP-0002")
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")

    manager_notification = Notification.objects.create(
        tenant=tenant,
        channel="in_app",
        audience_type="manager",
        recipient_membership=manager.membership,
        recipient_identifier=manager.membership.user.username,
        subject_type="leave_request",
        subject_identifier=str(bootstrapped_workspace["pending_leave"].id),
        title="Manager review pending",
        subject="",
        body="A leave request needs your decision.",
        status="pending",
        priority="high",
        payload={"leave_request_id": str(bootstrapped_workspace["pending_leave"].id)},
    )
    Notification.objects.create(
        tenant=tenant,
        channel="in_app",
        audience_type="employee",
        recipient_membership=employee.membership,
        recipient_identifier=employee.membership.user.username,
        subject_type="employee_document",
        subject_identifier="doc-hidden-1",
        title="Employee-only reminder",
        subject="",
        body="This should not appear in manager inbox.",
        status="pending",
        priority="normal",
        payload={},
    )

    token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    list_response = api_client.get("/api/v1/manager/notifications/")
    assert list_response.status_code == 200, list_response.json()
    payload = list_response.json()
    ids = {item["id"] for item in payload["items"]}
    assert str(manager_notification.id) in ids

    detail_response = api_client.get(f"/api/v1/manager/notifications/{manager_notification.id}/")
    assert detail_response.status_code == 200, detail_response.json()
    assert detail_response.json()["audience_type"] == "manager"


@pytest.mark.django_db
def test_process_notifications_command_delivers_email_and_console_channels(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership

    Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="doc-email-1",
        title="Email reminder",
        subject="Email reminder subject",
        body="Email reminder body.",
        status="pending",
        priority="high",
        payload={},
    )
    Notification.objects.create(
        tenant=tenant,
        channel="sms",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="doc-sms-1",
        title="SMS reminder",
        body="SMS reminder body.",
        status="pending",
        priority="normal",
        payload={},
    )

    call_command("process_notifications", tenant_code=tenant.code)

    email_notification = Notification.objects.get(tenant=tenant, subject_identifier="doc-email-1")
    sms_notification = Notification.objects.get(tenant=tenant, subject_identifier="doc-sms-1")
    assert email_notification.status == NotificationStatus.DELIVERED
    assert sms_notification.status == NotificationStatus.DELIVERED
    assert email_notification.recipient_address == employee.work_email
    assert sms_notification.recipient_address == employee.phone_number
    assert len(mail.outbox) >= 1
    assert any(message.subject == "Email reminder subject" for message in mail.outbox)

    logs = NotificationDeliveryLog.objects.filter(
        tenant=tenant,
        notification__subject_identifier__in=["doc-email-1", "doc-sms-1"],
    )
    assert logs.count() == 2
    assert logs.filter(provider_name=NotificationDeliveryBackend.EMAIL_SMTP).exists()
    assert logs.filter(provider_name=NotificationDeliveryBackend.SMS_CONSOLE).exists()

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    review_response = api_client.get(f"/api/v1/hr-admin/notifications/{email_notification.id}/")
    assert review_response.status_code == 200, review_response.json()
    review_payload = review_response.json()
    assert len(review_payload["delivery_logs"]) == 1
    assert review_payload["delivery_logs"][0]["provider_name"] == NotificationDeliveryBackend.EMAIL_SMTP


@pytest.mark.django_db
def test_hr_admin_can_retry_notification_delivery(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership

    notification = Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="retry-email-1",
        title="Retry email reminder",
        subject="Retry email reminder subject",
        body="Retry email reminder body.",
        status="failed",
        priority="high",
        payload={},
    )

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.post(
        f"/api/v1/hr-admin/notifications/{notification.id}/retry/",
        {"process_now": True},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["status"] == NotificationStatus.DELIVERED
    assert payload["attempt_count"] == 1
    assert payload["max_attempts"] == 3
    assert payload["retry_backoff_minutes"] == 0
    assert payload["retry_limit_reached"] is False
    assert payload["can_retry"] is True
    assert len(payload["delivery_logs"]) == 1
    assert payload["delivery_logs"][0]["provider_name"] == NotificationDeliveryBackend.EMAIL_SMTP

    notification.refresh_from_db()
    assert notification.status == NotificationStatus.DELIVERED
    assert NotificationDeliveryLog.objects.filter(notification=notification).count() == 1


@pytest.mark.django_db
def test_hr_admin_can_bulk_retry_notification_delivery(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership

    first = Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="bulk-retry-email-1",
        title="Bulk retry email 1",
        subject="Bulk retry email subject 1",
        body="Bulk retry email body 1.",
        status="failed",
        priority="high",
        payload={},
    )
    second = Notification.objects.create(
        tenant=tenant,
        channel="sms",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="bulk-retry-sms-1",
        title="Bulk retry sms 1",
        body="Bulk retry sms body 1.",
        status="failed",
        priority="normal",
        payload={},
    )

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.post(
        "/api/v1/hr-admin/notifications/bulk-retry/",
        {"notification_ids": [str(first.id), str(second.id)], "process_now": True},
        format="json",
    )

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["action"] == "retry_delivery"
    assert payload["updated_count"] == 2

    first.refresh_from_db()
    second.refresh_from_db()
    assert first.status == NotificationStatus.DELIVERED
    assert second.status == NotificationStatus.DELIVERED
    assert NotificationDeliveryLog.objects.filter(notification=first).count() == 1
    assert NotificationDeliveryLog.objects.filter(notification=second).count() == 1


@pytest.mark.django_db
def test_hr_admin_notification_list_can_filter_by_retry_state(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership
    config = NotificationChannelConfiguration.objects.get(tenant=tenant, channel="email")
    config.delivery_policy = {"max_attempts": 1}
    config.save(update_fields=["delivery_policy", "updated_at"])

    retry_ready = Notification.objects.create(
        tenant=tenant,
        channel="sms",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="retry-ready-1",
        title="Retry ready notification",
        body="Retry ready body.",
        status="failed",
        priority="normal",
        payload={},
    )
    retry_capped = Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="retry-capped-1",
        title="Retry capped notification",
        body="Retry capped body.",
        status="failed",
        priority="high",
        payload={},
    )
    NotificationDeliveryLog.objects.create(
        tenant=tenant,
        notification=retry_capped,
        channel="email",
        status="failed",
        provider_name=NotificationDeliveryBackend.EMAIL_SMTP,
        error_message="First attempt failed.",
        response_payload={},
    )

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    ready_response = api_client.get("/api/v1/hr-admin/notifications/?retry_state=retry_ready")
    assert ready_response.status_code == 200, ready_response.json()
    ready_ids = {item["id"] for item in ready_response.json()["items"]}
    assert str(retry_ready.id) in ready_ids
    assert str(retry_capped.id) not in ready_ids

    capped_response = api_client.get("/api/v1/hr-admin/notifications/?retry_state=retry_capped")
    assert capped_response.status_code == 200, capped_response.json()
    capped_ids = {item["id"] for item in capped_response.json()["items"]}
    assert str(retry_capped.id) in capped_ids
    assert str(retry_ready.id) not in capped_ids


@pytest.mark.django_db
def test_hr_admin_retry_respects_notification_retry_limit(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership
    config = NotificationChannelConfiguration.objects.get(tenant=tenant, channel="email")
    config.delivery_policy = {"max_attempts": 1, "retry_backoff_minutes": 15}
    config.save(update_fields=["delivery_policy", "updated_at"])

    notification = Notification.objects.create(
        tenant=tenant,
        channel="email",
        audience_type="membership",
        recipient_membership=membership,
        recipient_identifier=membership.user.username,
        subject_type="employee_document",
        subject_identifier="retry-limit-email-1",
        title="Retry limit email reminder",
        subject="Retry limit email reminder subject",
        body="Retry limit email reminder body.",
        status="failed",
        priority="high",
        payload={},
    )
    NotificationDeliveryLog.objects.create(
        tenant=tenant,
        notification=notification,
        channel="email",
        status="failed",
        provider_name=NotificationDeliveryBackend.EMAIL_SMTP,
        error_message="First attempt failed.",
        response_payload={},
    )

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.post(
        f"/api/v1/hr-admin/notifications/{notification.id}/retry/",
        {"process_now": True},
        format="json",
    )

    assert response.status_code == 400, response.json()
    assert "retry limit" in response.json()["detail"].lower()

    detail_response = api_client.get(f"/api/v1/hr-admin/notifications/{notification.id}/")
    assert detail_response.status_code == 200, detail_response.json()
    detail_payload = detail_response.json()
    assert detail_payload["attempt_count"] == 1
    assert detail_payload["max_attempts"] == 1
    assert detail_payload["retry_backoff_minutes"] == 15
    assert detail_payload["retry_limit_reached"] is True
    assert detail_payload["can_retry"] is False


@pytest.mark.django_db
def test_hr_admin_bulk_retry_returns_error_when_all_selected_notifications_hit_retry_limit(api_client: APIClient, bootstrapped_workspace):
    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.get(tenant=tenant, employee_code="EMP-0042")
    membership = employee.membership
    config = NotificationChannelConfiguration.objects.get(tenant=tenant, channel="email")
    config.delivery_policy = {"max_attempts": 1}
    config.save(update_fields=["delivery_policy", "updated_at"])

    notifications = []
    for index in range(2):
        item = Notification.objects.create(
            tenant=tenant,
            channel="email",
            audience_type="membership",
            recipient_membership=membership,
            recipient_identifier=membership.user.username,
            subject_type="employee_document",
            subject_identifier=f"bulk-retry-limit-email-{index}",
            title=f"Bulk retry limit {index}",
            subject=f"Bulk retry limit subject {index}",
            body=f"Bulk retry limit body {index}.",
            status="failed",
            priority="normal",
            payload={},
        )
        NotificationDeliveryLog.objects.create(
            tenant=tenant,
            notification=item,
            channel="email",
            status="failed",
            provider_name=NotificationDeliveryBackend.EMAIL_SMTP,
            error_message="First attempt failed.",
            response_payload={},
        )
        notifications.append(item)

    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    response = api_client.post(
        "/api/v1/hr-admin/notifications/bulk-retry/",
        {"notification_ids": [str(item.id) for item in notifications], "process_now": True},
        format="json",
    )

    assert response.status_code == 400, response.json()
    assert "retry limit" in response.json()["detail"].lower()


@pytest.mark.django_db
def test_employee_document_center_returns_requirement_runtime_and_document_summary(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code="employee-center-pan",
        name="Employee Center PAN",
        category_type=DocumentCategoryType.TAX,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=employee.tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )
    EmployeeDocument.objects.create(
        tenant=employee.tenant,
        employee=employee,
        category=category,
        title="Expiring PAN",
        file_name="expiring-pan.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() + timedelta(days=10),
        uploaded_by_identifier="EMP-0042",
    )

    response = api_client.get("/api/v1/me/document-center/")

    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["summary"]["required_document_count"] >= 1
    assert payload["summary"]["missing_required_document_count"] >= 0
    assert payload["summary"]["expiring_documents"] >= 1
    assert payload["max_upload_size_bytes"] == 10 * 1024 * 1024
    assert any(item["category_id"] == str(category.id) for item in payload["requirement_items"])
    assert any(item["id"] == str(category.id) for item in payload["uploadable_categories"])


@pytest.mark.django_db
def test_employee_upload_creates_hr_document_review_notification(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code="employee-upload-notify",
        name="Employee Upload Notify",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    uploaded_file = SimpleUploadedFile(
        "notify-upload.pdf",
        b"%PDF-1.4 employee upload notify\n",
        content_type="application/pdf",
    )

    response = api_client.post(
        "/api/v1/me/employee-documents/",
        {
            "category_id": str(category.id),
            "title": "Notify upload",
            "file": uploaded_file,
        },
        format="multipart",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    notification = Notification.objects.filter(
        tenant=employee.tenant,
        subject_type="employee_document",
        subject_identifier=payload["id"],
    ).order_by("-created_at").first()
    assert notification is not None
    assert notification.payload["employee_code"] == employee.employee_code
    assert notification.payload["category_name"] == category.name
    assert notification.recipient_membership is not None


@pytest.mark.django_db
def test_employee_reupload_replaces_previous_document_version(api_client: APIClient, bootstrapped_workspace):
    employee_token = login(api_client, "riya.sharma")
    hr_token = login(APIClient(), "nisha.rao")
    employee = Employee.objects.get(employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code="employee-reupload-bank",
        name="Employee Reupload Bank",
        category_type=DocumentCategoryType.BANK,
        requires_verification=True,
        allow_employee_upload=True,
        allow_multiple_files=False,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=employee.tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {employee_token}")
    first_upload = api_client.post(
        "/api/v1/me/employee-documents/",
        {
            "category_id": str(category.id),
            "title": "Bank proof v1",
            "file": SimpleUploadedFile("bank-v1.pdf", b"%PDF-1.4 first upload\n", content_type="application/pdf"),
        },
        format="multipart",
    )
    assert first_upload.status_code == 201, first_upload.json()
    first_document = EmployeeDocument.objects.get(id=first_upload.json()["id"])

    hr_client = APIClient()
    hr_client.credentials(HTTP_AUTHORIZATION=f"Token {hr_token}")
    reupload_request = hr_client.patch(
        f"/api/v1/hr-admin/employee-documents/{first_document.id}/",
        {
            "verification_status": VerificationStatus.REJECTED,
            "reupload_requested": True,
            "rejection_reason": "Bank name is not visible.",
        },
        format="json",
    )
    assert reupload_request.status_code == 200, reupload_request.json()

    second_upload = api_client.post(
        "/api/v1/me/employee-documents/",
        {
            "category_id": str(category.id),
            "replace_document_id": str(first_document.id),
            "title": "Bank proof v2",
            "file": SimpleUploadedFile("bank-v2.pdf", b"%PDF-1.4 replacement upload\n", content_type="application/pdf"),
        },
        format="multipart",
    )

    assert second_upload.status_code == 201, second_upload.json()
    payload = second_upload.json()
    assert payload["version_number"] == 2
    assert payload["previous_document_id"] == str(first_document.id)

    first_document.refresh_from_db()
    assert first_document.status == EmployeeDocumentStatus.REPLACED
    assert first_document.reupload_requested is False

    second_document = EmployeeDocument.objects.get(id=payload["id"])
    assert second_document.previous_document == first_document
    assert second_document.version_number == 2
    assert second_document.status == EmployeeDocumentStatus.ACTIVE


@pytest.mark.django_db
def test_employee_can_upload_and_download_allowed_document(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code="employee-self-bank",
        name="Employee Self Bank",
        category_type=DocumentCategoryType.BANK,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=employee.tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )

    upload_response = api_client.post(
        "/api/v1/me/employee-documents/",
        {
            "category_id": str(category.id),
            "title": "Salary bank proof",
            "document_number": "",
            "file": SimpleUploadedFile(
                "salary-proof.pdf",
                b"%PDF-1.4 employee self upload\n",
                content_type="application/pdf",
            ),
        },
        format="multipart",
    )

    assert upload_response.status_code == 201, upload_response.json()
    payload = upload_response.json()
    assert payload["employee_code"] == "EMP-0042"
    assert payload["uploaded_by_identifier"] == "EMP-0042"
    assert payload["artifact_id"]

    document = EmployeeDocument.objects.get(id=payload["id"])
    assert document.employee == employee

    download_response = api_client.get(f"/api/v1/me/employee-documents/{document.id}/download/")

    assert download_response.status_code == 200
    assert download_response["Content-Type"] == "application/pdf"
    assert b"employee self upload" in b"".join(download_response.streaming_content)


@pytest.mark.django_db
def test_employee_cannot_upload_category_when_self_upload_is_disabled(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "riya.sharma")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    employee = Employee.objects.get(employee_code="EMP-0042")
    category = DocumentCategory.objects.create(
        tenant=employee.tenant,
        code="employee-hr-only-contract",
        name="Employee HR Only Contract",
        category_type=DocumentCategoryType.CONTRACT,
        requires_verification=True,
        allow_employee_upload=False,
        is_active=True,
    )

    response = api_client.post(
        "/api/v1/me/employee-documents/",
        {
            "category_id": str(category.id),
            "title": "Contract",
            "file": SimpleUploadedFile(
                "contract.pdf",
                b"%PDF-1.4 blocked self upload\n",
                content_type="application/pdf",
            ),
        },
        format="multipart",
    )

    assert response.status_code == 400
    assert "Employees cannot upload this document category directly." in str(response.json()["category_id"])


@pytest.mark.django_db
def test_hr_admin_can_complete_rehire_onboarding_for_rehire_eligible_employee(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0208",
        first_name="Rehire",
        last_name="Eligible",
        work_email="rehire.eligible@northstar.example",
        employment_status=EmploymentStatus.EXITED,
        date_of_joining=datetime.strptime("2022-01-10", "%Y-%m-%d").date(),
        probation_end_date=datetime.strptime("2022-04-10", "%Y-%m-%d").date(),
        confirmation_date=datetime.strptime("2022-04-15", "%Y-%m-%d").date(),
    )
    EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.COMPLETED,
        resignation_date=datetime.strptime("2024-05-01", "%Y-%m-%d").date(),
        approved_last_working_date=datetime.strptime("2024-05-31", "%Y-%m-%d").date(),
        actual_exit_date=datetime.strptime("2024-05-31", "%Y-%m-%d").date(),
        rehire_eligible=True,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.COMPLETED,
            "actual_joining_date": "2024-07-01",
            "checklist_snapshot": [{"code": "reactivate", "label": "Reactivation approved", "done": True}],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["is_rehire_journey"] is True
    employee.refresh_from_db()
    assert employee.employment_status == EmploymentStatus.ACTIVE
    assert employee.date_of_joining.isoformat() == "2024-07-01"
    assert employee.probation_end_date is None
    assert employee.confirmation_date is None
    assert EmployeeLifecycleEvent.objects.filter(
        tenant=tenant,
        employee=employee,
        event_type=LifecycleEventType.REHIRE,
        status=LifecycleEventStatus.COMPLETED,
    ).exists()


@pytest.mark.django_db
def test_hr_admin_cannot_complete_rehire_onboarding_for_ineligible_employee(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0209",
        first_name="Rehire",
        last_name="Blocked",
        work_email="rehire.blocked@northstar.example",
        employment_status=EmploymentStatus.EXITED,
    )
    EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.COMPLETED,
        actual_exit_date=datetime.strptime("2024-06-15", "%Y-%m-%d").date(),
        rehire_eligible=False,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.COMPLETED,
            "actual_joining_date": "2024-07-01",
            "checklist_snapshot": [{"code": "reactivate", "label": "Reactivation approved", "done": True}],
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["status"] == "This employee is marked as not eligible for rehire."


@pytest.mark.django_db
def test_hr_admin_onboarding_payload_normalizes_checklist_and_tracks_progress(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0210",
        first_name="Checklist",
        last_name="Normalize",
        work_email="checklist.normalize@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"label": "Collect photo", "done": True, "required": True},
                {"code": "background-check", "label": "Background check", "done": False, "required": False, "blocking": False},
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["checklist_snapshot"][0]["code"] == "item-1"
    assert payload["checklist_snapshot"][0]["label"] == "Collect photo"
    assert payload["checklist_total_count"] == 2
    assert payload["checklist_completed_count"] == 1
    assert payload["checklist_open_count"] == 1


@pytest.mark.django_db
def test_hr_admin_onboarding_payload_tracks_overdue_and_escalation_counts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0214",
        first_name="Checklist",
        last_name="Escalation",
        work_email="checklist.escalation@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    past_due = (timezone.localdate() - timedelta(days=5)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "id-proof", "label": "Collect ID proof", "done": False, "required": True, "due_on": past_due, "escalate_after_days": 2},
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["checklist_overdue_count"] == 1
    assert payload["checklist_escalation_due_count"] == 1
    assert payload["attention_state"] == "escalation_due"
    assert payload["attention_rank"] == 4
    assert payload["attention_item_count"] == 1
    assert payload["attention_due_on"] == (timezone.localdate() - timedelta(days=3)).isoformat()
    assert payload["checklist_snapshot"][0]["is_overdue"] is True
    assert payload["checklist_snapshot"][0]["is_escalation_due"] is True


@pytest.mark.django_db
def test_hr_admin_onboarding_list_sorts_by_attention_rank(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    overdue_employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0228",
        first_name="Attention",
        last_name="High",
        work_email="attention.high@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    scheduled_employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0229",
        first_name="Attention",
        last_name="Low",
        work_email="attention.low@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(scheduled_employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "offer", "label": "Offer accepted", "done": False, "due_on": (timezone.localdate() + timedelta(days=3)).isoformat()},
            ],
        },
        format="json",
    )
    overdue_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(overdue_employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "id-proof", "label": "Collect ID proof", "done": False, "due_on": (timezone.localdate() - timedelta(days=2)).isoformat()},
            ],
        },
        format="json",
    )
    assert overdue_response.status_code == 201, overdue_response.json()

    list_response = api_client.get("/api/v1/hr-admin/onboardings/?q=EMP-022")
    assert list_response.status_code == 200, list_response.json()
    items = list_response.json()["items"]
    assert items[0]["employee_code"] == "EMP-0228"
    assert items[0]["attention_state"] == "overdue"
    assert items[1]["employee_code"] == "EMP-0229"
    assert items[1]["attention_state"] == "scheduled"


@pytest.mark.django_db
def test_hr_admin_onboarding_checklist_item_history_updates_on_change(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0216",
        first_name="Checklist",
        last_name="History",
        work_email="checklist.history@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "offer", "label": "Offer accepted", "done": False, "owner": "hr.ops"},
            ],
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    item_id = create_response.json()["id"]

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/onboardings/{item_id}/",
        {
            "checklist_snapshot": [
                {"code": "offer", "label": "Offer accepted", "done": True, "owner": "people.ops", "history": create_response.json()["checklist_snapshot"][0]["history"]},
            ],
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    item = patch_response.json()["checklist_snapshot"][0]
    actions = [entry["action"] for entry in item["history"]]
    assert "created" in actions
    assert "completed" in actions
    assert "owner_changed" in actions
    assert item["last_action_by"]


@pytest.mark.django_db
def test_hr_admin_onboarding_overdue_item_creates_notifications(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0218",
        first_name="Checklist",
        last_name="Notify",
        work_email="checklist.notify@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {
                    "code": "id-proof",
                    "label": "Collect ID proof",
                    "done": False,
                    "owner": "nisha.rao",
                    "due_on": past_due,
                    "escalate_after_days": 1,
                },
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    notifications = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_onboarding",
        recipient_identifier="nisha.rao",
    ).order_by("created_at")
    assert notifications.count() == 2
    assert notifications[0].priority == NotificationPriority.HIGH
    assert notifications[1].priority == NotificationPriority.CRITICAL
    actions = [entry["action"] for entry in response.json()["checklist_snapshot"][0]["history"]]
    assert "reminder_sent" in actions
    assert "escalation_sent" in actions


@pytest.mark.django_db
def test_hr_admin_onboarding_escalation_routes_to_fallback_owner(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0220",
        first_name="Checklist",
        last_name="Escalation Route",
        work_email="checklist.escalation.route@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {
                    "code": "id-proof",
                    "label": "Collect ID proof",
                    "done": False,
                    "owner": "riya.sharma",
                    "escalation_owner": "nisha.rao",
                    "due_on": past_due,
                    "escalate_after_days": 1,
                },
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    escalation_notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_onboarding",
        recipient_identifier="nisha.rao",
        priority=NotificationPriority.CRITICAL,
    ).latest("created_at")
    assert escalation_notification.payload["attention_type"] == "escalation_due"
    item = response.json()["checklist_snapshot"][0]
    assert item["escalation_owner"] == "nisha.rao"
    assert "escalation_sent" in [entry["action"] for entry in item["history"]]


@pytest.mark.django_db
def test_hr_admin_onboarding_escalation_can_auto_reassign_owner(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0222",
        first_name="Checklist",
        last_name="Auto Reassign",
        work_email="checklist.auto.reassign@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {
                    "code": "id-proof",
                    "label": "Collect ID proof",
                    "done": False,
                    "owner": "riya.sharma",
                    "escalation_owner": "nisha.rao",
                    "auto_reassign_on_escalation": True,
                    "due_on": past_due,
                    "escalate_after_days": 1,
                },
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    item = response.json()["checklist_snapshot"][0]
    assert item["owner"] == "nisha.rao"
    assert item["is_escalated"] is True
    assert item["escalated_at"]
    assert "escalated" in [entry["action"] for entry in item["history"]]
    assert "owner_escalated" in [entry["action"] for entry in item["history"]]


@pytest.mark.django_db
def test_hr_admin_onboarding_escalation_state_is_not_duplicated_after_first_escalation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0224",
        first_name="Checklist",
        last_name="Escalation State",
        work_email="checklist.escalation.state@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {
                    "code": "id-proof",
                    "label": "Collect ID proof",
                    "done": False,
                    "owner": "nisha.rao",
                    "due_on": past_due,
                    "escalate_after_days": 1,
                },
            ],
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    onboarding_id = create_response.json()["id"]

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/onboardings/{onboarding_id}/",
        {
            "checklist_snapshot": create_response.json()["checklist_snapshot"],
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    item = patch_response.json()["checklist_snapshot"][0]
    actions = [entry["action"] for entry in item["history"]]
    assert actions.count("escalated") == 1
    assert actions.count("escalation_sent") == 1
    assert item["is_escalated"] is True
    assert item["escalated_at"]


@pytest.mark.django_db
def test_hr_admin_onboarding_can_create_workflow_instance_from_template_code(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-default",
        name="Employee Onboarding Default",
        module="lifecycle",
        trigger_key="employee-onboarding-default",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="HR Review",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0211",
        first_name="Workflow",
        last_name="Onboarding",
        work_email="workflow.onboarding@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-default",
            "checklist_snapshot": [{"code": "offer", "label": "Offer accepted", "done": True}],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["workflow_reference"]
    workflow_instance = WorkflowInstance.objects.get(id=payload["workflow_reference"])
    assert workflow_instance.module == "lifecycle"
    assert workflow_instance.trigger_key == "employee-onboarding-default"
    assert workflow_instance.subject_type == "employee_onboarding"


@pytest.mark.django_db
def test_hr_admin_onboarding_can_seed_checklist_from_template_steps(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    membership = TenantMembership.objects.select_related("user").get(tenant=tenant, user__username="nisha.rao")
    manager = Employee.objects.get(tenant=tenant, membership__user__username="karan.mehta")
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-seeded",
        name="Employee Onboarding Seeded",
        module="lifecycle",
        trigger_key="employee-onboarding-seeded",
        status=WorkflowStatus.ACTIVE,
        version=2,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Collect documents",
        actor_type=WorkflowActorType.MEMBERSHIP,
        membership=membership,
        mode="sequential",
        escalate_after_hours=48,
        rule_snapshot={"due_anchor": "expected_joining_date", "due_offset_days": -5},
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=2,
        name="Manager welcome",
        actor_type=WorkflowActorType.MANAGER,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0226",
        first_name="Template",
        last_name="Seeded",
        work_email="template.seeded@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
        reporting_manager=manager,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-seeded",
            "expected_joining_date": "2024-07-10",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["checklist_total_count"] == 2
    assert payload["checklist_snapshot"][0]["code"] == "collect-documents"
    assert payload["checklist_snapshot"][0]["owner"] == "nisha.rao"
    assert payload["checklist_snapshot"][0]["owner_source_type"] == "membership"
    assert payload["checklist_snapshot"][0]["source_template_code"] == "employee-onboarding-seeded"
    assert payload["checklist_snapshot"][0]["source_step_order"] == 1
    assert payload["checklist_snapshot"][0]["escalate_after_days"] == 2
    assert payload["checklist_snapshot"][0]["due_on"] == "2024-07-05"
    assert payload["checklist_snapshot"][0]["due_date_source"] == "template_rule"
    assert payload["checklist_snapshot"][0]["source_due_anchor"] == "expected_joining_date"
    assert payload["checklist_snapshot"][0]["source_due_offset_days"] == -5
    assert payload["checklist_snapshot"][1]["owner_source_type"] == "manager"


@pytest.mark.django_db
def test_hr_admin_onboarding_can_seed_configured_user_and_hr_owner_lifecycle_item_owners(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    membership = TenantMembership.objects.select_related("user").get(tenant=tenant, user__username="nisha.rao")
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-owner-types",
        name="Employee Onboarding Owner Types",
        module="lifecycle",
        trigger_key="employee-onboarding-owner-types",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Configured buddy",
        actor_type=WorkflowActorType.CONFIGURED_USER,
        membership=membership,
        mode="sequential",
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=2,
        name="HR ownership review",
        actor_type=WorkflowActorType.HR_OWNER,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0310",
        first_name="Owner",
        last_name="Types",
        work_email="owner.types@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-owner-types",
            "owner_value": "identifier:nisha.rao",
            "expected_joining_date": "2024-08-15",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["checklist_snapshot"][0]["owner"] == "nisha.rao"
    assert payload["checklist_snapshot"][0]["owner_source_type"] == WorkflowActorType.CONFIGURED_USER
    assert payload["checklist_snapshot"][1]["owner"] == "nisha.rao"
    assert payload["checklist_snapshot"][1]["owner_source_type"] == WorkflowActorType.HR_OWNER


@pytest.mark.django_db
def test_hr_admin_onboarding_workflow_instance_seeds_manager_and_hr_owner_assignments(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    manager = Employee.objects.get(tenant=tenant, membership__user__username="karan.mehta")
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-assignment-seeded",
        name="Employee Onboarding Assignment Seeded",
        module="lifecycle",
        trigger_key="employee-onboarding-assignment-seeded",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Manager welcome",
        actor_type=WorkflowActorType.MANAGER,
        mode="sequential",
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=2,
        name="HR final review",
        actor_type=WorkflowActorType.HR_OWNER,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0311",
        first_name="Workflow",
        last_name="Assignments",
        work_email="workflow.assignments@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
        reporting_manager=manager,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-assignment-seeded",
            "owner_value": "identifier:nisha.rao",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    workflow_instance = WorkflowInstance.objects.get(id=response.json()["workflow_reference"])
    step_assignments = {
        step.step_order: WorkflowAssignment.objects.filter(step_instance=step).select_related("membership__user").get()
        for step in workflow_instance.step_instances.order_by("step_order")
    }

    assert step_assignments[1].actor_type == WorkflowActorType.MANAGER
    assert step_assignments[1].membership.user.username == "karan.mehta"
    assert step_assignments[2].actor_type == WorkflowActorType.HR_OWNER
    assert step_assignments[2].membership.user.username == "nisha.rao"


@pytest.mark.django_db
def test_hr_admin_onboarding_refreshes_template_due_dates_when_joining_date_changes(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-due-refresh",
        name="Employee Onboarding Due Refresh",
        module="lifecycle",
        trigger_key="employee-onboarding-due-refresh",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Prepare workspace",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
        rule_snapshot={"due_anchor": "expected_joining_date", "due_offset_days": -2},
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0232",
        first_name="Template",
        last_name="Refresh",
        work_email="template.refresh@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-due-refresh",
            "expected_joining_date": "2024-07-10",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    onboarding_id = create_response.json()["id"]
    assert create_response.json()["checklist_snapshot"][0]["due_on"] == "2024-07-08"

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/onboardings/{onboarding_id}/",
        {
            "expected_joining_date": "2024-07-14",
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    item = patch_response.json()["checklist_snapshot"][0]
    assert item["due_on"] == "2024-07-12"
    assert "due_on_changed" in [entry["action"] for entry in item["history"]]


@pytest.mark.django_db
def test_hr_admin_workflow_options_expose_lifecycle_rule_authoring_metadata(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.get("/api/v1/hr-admin/workflow-options/")

    assert response.status_code == 200, response.json()
    lifecycle_rule_options = response.json()["lifecycle_rule_options"]
    assert lifecycle_rule_options["supported_rule_snapshot_fields"] == [
        "due_anchor",
        "due_anchor_candidates",
        "due_offset_days",
        "due_offset_unit",
        "non_working_weekdays",
    ]
    assert [item["value"] for item in lifecycle_rule_options["due_offset_units"]] == [
        "calendar_days",
        "business_days",
    ]
    assert [item["value"] for item in lifecycle_rule_options["non_working_weekdays"]] == [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]

    presets = {item["key"]: item for item in lifecycle_rule_options["trigger_presets"]}
    assert presets["onboarding"]["match_terms"] == ["onboarding"]
    assert "expected_joining_date" in [item["value"] for item in presets["onboarding"]["allowed_due_anchors"]]
    assert "approved_last_working_date" in [item["value"] for item in presets["exit"]["allowed_due_anchors"]]
    assert "record_created_on" in [item["value"] for item in lifecycle_rule_options["common_due_anchors"]]
    assert "actual_exit_date" in [item["value"] for item in presets["default"]["allowed_due_anchors"]]


@pytest.mark.django_db
def test_hr_admin_workflow_template_can_store_lifecycle_due_rule_candidates(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/workflow-templates/",
        {
            "code": "lifecycle-sla-rules",
            "name": "Lifecycle SLA Rules",
            "module": "lifecycle",
            "trigger_key": "employee-onboarding-sla-rules",
            "status": "active",
            "steps": [
                {
                    "step_order": 1,
                    "name": "Prepare workspace",
                    "actor_type": WorkflowActorType.ROLE,
                    "mode": "sequential",
                    "rule_snapshot": {
                        "due_anchor_candidates": ["actual_joining_date", "expected_joining_date"],
                        "due_offset_days": -1,
                    },
                }
            ],
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    step = response.json()["steps"][0]
    assert step["rule_snapshot"]["due_anchor_candidates"] == ["actual_joining_date", "expected_joining_date"]
    assert step["rule_snapshot"]["due_offset_days"] == -1


@pytest.mark.django_db
def test_hr_admin_workflow_template_rejects_invalid_lifecycle_due_anchor(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/workflow-templates/",
        {
            "code": "lifecycle-invalid-anchor",
            "name": "Lifecycle Invalid Anchor",
            "module": "lifecycle",
            "trigger_key": "employee-onboarding-invalid-anchor",
            "status": "active",
            "steps": [
                {
                    "step_order": 1,
                    "name": "Prepare workspace",
                    "actor_type": WorkflowActorType.ROLE,
                    "mode": "sequential",
                    "rule_snapshot": {
                        "due_anchor": "approved_last_working_date",
                        "due_offset_days": -1,
                    },
                }
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "steps" in response.json()


@pytest.mark.django_db
def test_hr_admin_onboarding_due_rule_can_fallback_to_expected_joining_date(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-fallback-anchor",
        name="Employee Onboarding Fallback Anchor",
        module="lifecycle",
        trigger_key="employee-onboarding-fallback-anchor",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Prepare laptop",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
        rule_snapshot={
            "due_anchor_candidates": ["actual_joining_date", "expected_joining_date"],
            "due_offset_days": -1,
        },
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0233",
        first_name="Fallback",
        last_name="Anchor",
        work_email="fallback.anchor@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-fallback-anchor",
            "expected_joining_date": "2024-07-20",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    item = response.json()["checklist_snapshot"][0]
    assert item["due_on"] == "2024-07-19"
    assert item["source_due_anchor"] == "expected_joining_date"


@pytest.mark.django_db
def test_hr_admin_workflow_template_rejects_invalid_due_offset_unit(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    response = api_client.post(
        "/api/v1/hr-admin/workflow-templates/",
        {
            "code": "lifecycle-invalid-offset-unit",
            "name": "Lifecycle Invalid Offset Unit",
            "module": "lifecycle",
            "trigger_key": "employee-onboarding-invalid-offset-unit",
            "status": "active",
            "steps": [
                {
                    "step_order": 1,
                    "name": "Prepare workspace",
                    "actor_type": WorkflowActorType.ROLE,
                    "mode": "sequential",
                    "rule_snapshot": {
                        "due_anchor": "expected_joining_date",
                        "due_offset_days": -1,
                        "due_offset_unit": "working_days",
                    },
                }
            ],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "steps" in response.json()


@pytest.mark.django_db
def test_hr_admin_onboarding_business_day_due_rule_skips_weekend_and_holiday(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0234",
        first_name="Business",
        last_name="Days",
        work_email="business.days@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    holiday_calendar = HolidayCalendar.objects.create(
        tenant=tenant,
        code="lifecycle-business-days",
        name="Lifecycle Business Days",
        year=2024,
        is_active=True,
    )
    Holiday.objects.create(
        calendar=holiday_calendar,
        date=datetime.strptime("2024-07-08", "%Y-%m-%d").date(),
        name="Founders Day",
        holiday_type="general",
    )
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-business-days",
        name="Employee Onboarding Business Days",
        module="lifecycle",
        trigger_key="employee-onboarding-business-days",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Prepare workspace",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
        rule_snapshot={
            "due_anchor": "expected_joining_date",
            "due_offset_days": -3,
            "due_offset_unit": "business_days",
        },
    )

    response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-business-days",
            "expected_joining_date": "2024-07-10",
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    item = response.json()["checklist_snapshot"][0]
    assert item["due_on"] == "2024-07-04"
    assert item["source_due_offset_unit"] == "business_days"


@pytest.mark.django_db
def test_hr_admin_onboarding_business_day_rule_preserves_custom_non_working_weekdays_on_refresh(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-onboarding-custom-weekoff",
        name="Employee Onboarding Custom Weekoff",
        module="lifecycle",
        trigger_key="employee-onboarding-custom-weekoff",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Prepare desk",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
        rule_snapshot={
            "due_anchor": "expected_joining_date",
            "due_offset_days": -2,
            "due_offset_unit": "business_days",
            "non_working_weekdays": ["friday", "saturday"],
        },
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0235",
        first_name="Custom",
        last_name="Weekoff",
        work_email="custom.weekoff@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "onboarding_template_code": "employee-onboarding-custom-weekoff",
            "expected_joining_date": "2024-07-08",
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    onboarding_id = create_response.json()["id"]
    item = create_response.json()["checklist_snapshot"][0]
    assert item["due_on"] == "2024-07-04"
    assert item["source_non_working_weekdays"] == ["friday", "saturday"]

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/onboardings/{onboarding_id}/",
        {
            "expected_joining_date": "2024-07-10",
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    refreshed_item = patch_response.json()["checklist_snapshot"][0]
    assert refreshed_item["due_on"] == "2024-07-08"
    assert refreshed_item["source_non_working_weekdays"] == ["friday", "saturday"]


@pytest.mark.django_db
def test_hr_admin_cannot_complete_exit_with_open_blocking_clearance_items(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0212",
        first_name="Exit",
        last_name="Clearance",
        work_email="exit.clearance@northstar.example",
        employment_status=EmploymentStatus.ON_NOTICE,
    )

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.COMPLETED,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "actual_exit_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {"code": "it-return", "label": "Return laptop", "done": False, "required": True},
                    {"code": "finance", "label": "Finance clearance", "done": True, "required": True},
                ]
            },
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["clearance_status_snapshot"] == "Complete all blocking clearance items before completing an exit."


@pytest.mark.django_db
def test_hr_admin_exit_clearance_can_create_workflow_instance_from_template_code(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-exit-clearance",
        name="Employee Exit Clearance",
        module="lifecycle",
        trigger_key="employee-exit-clearance",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="Exit Owner Review",
        actor_type=WorkflowActorType.ROLE,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0213",
        first_name="Workflow",
        last_name="Exit",
        work_email="workflow.exit@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "workflow_template_code": "employee-exit-clearance",
                "items": [
                    {"code": "it-return", "label": "Return laptop", "done": True, "required": True},
                    {"code": "manager-signoff", "label": "Manager signoff", "done": False, "required": True},
                ],
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["workflow_reference"]
    assert payload["clearance_total_count"] == 2
    assert payload["clearance_completed_count"] == 1
    assert payload["clearance_open_count"] == 1
    workflow_instance = WorkflowInstance.objects.get(id=payload["workflow_reference"])
    assert workflow_instance.module == "lifecycle"
    assert workflow_instance.trigger_key == "employee-exit-clearance"
    assert workflow_instance.subject_type == "employee_exit"


@pytest.mark.django_db
def test_hr_admin_exit_clearance_can_seed_items_from_template_steps(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    membership = TenantMembership.objects.select_related("user").get(tenant=tenant, user__username="nisha.rao")
    manager = Employee.objects.get(tenant=tenant, membership__user__username="karan.mehta")
    template = WorkflowTemplate.objects.create(
        tenant=tenant,
        code="employee-exit-seeded",
        name="Employee Exit Seeded",
        module="lifecycle",
        trigger_key="employee-exit-seeded",
        status=WorkflowStatus.ACTIVE,
        version=1,
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=1,
        name="IT asset return",
        actor_type=WorkflowActorType.MEMBERSHIP,
        membership=membership,
        mode="sequential",
        escalate_after_hours=24,
        rule_snapshot={"due_anchor": "approved_last_working_date", "due_offset_days": -2},
    )
    WorkflowStep.objects.create(
        template=template,
        step_order=2,
        name="Manager clearance",
        actor_type=WorkflowActorType.MANAGER,
        mode="sequential",
    )
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0227",
        first_name="Template",
        last_name="Exit",
        work_email="template.exit@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
        reporting_manager=manager,
    )

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "workflow_template_code": "employee-exit-seeded",
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["clearance_total_count"] == 2
    assert payload["clearance_status_snapshot"]["items"][0]["code"] == "it-asset-return"
    assert payload["clearance_status_snapshot"]["items"][0]["owner"] == "nisha.rao"
    assert payload["clearance_status_snapshot"]["items"][0]["owner_source_type"] == "membership"
    assert payload["clearance_status_snapshot"]["items"][0]["source_template_code"] == "employee-exit-seeded"
    assert payload["clearance_status_snapshot"]["items"][0]["source_step_order"] == 1
    assert payload["clearance_status_snapshot"]["items"][0]["escalate_after_days"] == 1
    assert payload["clearance_status_snapshot"]["items"][0]["due_on"] == "2024-09-28"
    assert payload["clearance_status_snapshot"]["items"][0]["due_date_source"] == "template_rule"
    assert payload["clearance_status_snapshot"]["items"][0]["source_due_anchor"] == "approved_last_working_date"
    assert payload["clearance_status_snapshot"]["items"][0]["source_due_offset_days"] == -2
    assert payload["clearance_status_snapshot"]["items"][1]["owner_source_type"] == "manager"


@pytest.mark.django_db
def test_hr_admin_exit_payload_tracks_clearance_overdue_and_escalation_counts(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0215",
        first_name="Exit",
        last_name="Escalation",
        work_email="exit.escalation@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    past_due = (timezone.localdate() - timedelta(days=4)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {"code": "asset-return", "label": "Asset return", "done": False, "required": True, "due_on": past_due, "escalate_after_days": 1},
                ],
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    payload = response.json()
    assert payload["clearance_overdue_count"] == 1
    assert payload["clearance_escalation_due_count"] == 1
    assert payload["attention_state"] == "escalation_due"
    assert payload["attention_rank"] == 4
    assert payload["attention_item_count"] == 1
    assert payload["attention_due_on"] == (timezone.localdate() - timedelta(days=3)).isoformat()
    assert payload["clearance_status_snapshot"]["items"][0]["is_overdue"] is True
    assert payload["clearance_status_snapshot"]["items"][0]["is_escalation_due"] is True


@pytest.mark.django_db
def test_hr_admin_exit_clearance_item_history_updates_on_change(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0217",
        first_name="Exit",
        last_name="History",
        work_email="exit.history@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {"code": "asset-return", "label": "Asset return", "done": False, "owner": "it.ops"},
                ],
            },
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    item_id = create_response.json()["id"]

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/exits/{item_id}/",
        {
            "clearance_status_snapshot": {
                "items": [
                    {
                        "code": "asset-return",
                        "label": "Asset return",
                        "done": True,
                        "owner": "it.lead",
                        "history": create_response.json()["clearance_status_snapshot"]["items"][0]["history"],
                    },
                ],
            },
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    item = patch_response.json()["clearance_status_snapshot"]["items"][0]
    actions = [entry["action"] for entry in item["history"]]
    assert "created" in actions
    assert "completed" in actions
    assert "owner_changed" in actions
    assert item["last_action_by"]


@pytest.mark.django_db
def test_hr_admin_exit_overdue_clearance_item_creates_notifications(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0219",
        first_name="Exit",
        last_name="Notify",
        work_email="exit.notify@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {
                        "code": "asset-return",
                        "label": "Asset return",
                        "done": False,
                        "owner": "nisha.rao",
                        "due_on": past_due,
                        "escalate_after_days": 1,
                    },
                ],
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    notifications = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_exit",
        recipient_identifier="nisha.rao",
    ).order_by("created_at")
    assert notifications.count() == 2
    assert notifications[0].priority == NotificationPriority.HIGH
    assert notifications[1].priority == NotificationPriority.CRITICAL
    actions = [entry["action"] for entry in response.json()["clearance_status_snapshot"]["items"][0]["history"]]
    assert "reminder_sent" in actions
    assert "escalation_sent" in actions


@pytest.mark.django_db
def test_hr_admin_exit_escalation_routes_to_fallback_owner(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0221",
        first_name="Exit",
        last_name="Escalation Route",
        work_email="exit.escalation.route@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {
                        "code": "asset-return",
                        "label": "Asset return",
                        "done": False,
                        "owner": "riya.sharma",
                        "escalation_owner": "nisha.rao",
                        "due_on": past_due,
                        "escalate_after_days": 1,
                    },
                ],
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    escalation_notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_exit",
        recipient_identifier="nisha.rao",
        priority=NotificationPriority.CRITICAL,
    ).latest("created_at")
    assert escalation_notification.payload["attention_type"] == "escalation_due"
    item = response.json()["clearance_status_snapshot"]["items"][0]
    assert item["escalation_owner"] == "nisha.rao"
    assert "escalation_sent" in [entry["action"] for entry in item["history"]]


@pytest.mark.django_db
def test_hr_admin_exit_escalation_can_auto_reassign_owner(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0223",
        first_name="Exit",
        last_name="Auto Reassign",
        work_email="exit.auto.reassign@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {
                        "code": "asset-return",
                        "label": "Asset return",
                        "done": False,
                        "owner": "riya.sharma",
                        "escalation_owner": "nisha.rao",
                        "auto_reassign_on_escalation": True,
                        "due_on": past_due,
                        "escalate_after_days": 1,
                    },
                ],
            },
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    item = response.json()["clearance_status_snapshot"]["items"][0]
    assert item["owner"] == "nisha.rao"
    assert item["is_escalated"] is True
    assert item["escalated_at"]
    assert "escalated" in [entry["action"] for entry in item["history"]]
    assert "owner_escalated" in [entry["action"] for entry in item["history"]]


@pytest.mark.django_db
def test_hr_admin_lifecycle_queue_sorts_by_attention_rank(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    high_employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0230",
        first_name="Queue",
        last_name="High",
        work_email="queue.high@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )
    low_employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0231",
        first_name="Queue",
        last_name="Low",
        work_email="queue.low@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
    )

    api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(low_employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "offer", "label": "Offer accepted", "done": False, "due_on": (timezone.localdate() + timedelta(days=4)).isoformat()},
            ],
        },
        format="json",
    )
    api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(high_employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "checklist_snapshot": [
                {"code": "offer", "label": "Offer accepted", "done": False, "due_on": (timezone.localdate() - timedelta(days=4)).isoformat()},
            ],
        },
        format="json",
    )

    queue_response = api_client.get("/api/v1/hr-admin/lifecycle-queue/?item_type=onboarding&q=EMP-023")
    assert queue_response.status_code == 200, queue_response.json()
    items = queue_response.json()["items"]
    assert items[0]["employee_code"] == "EMP-0230"
    assert items[0]["attention_state"] == "overdue"
    assert items[1]["employee_code"] == "EMP-0231"
    assert items[1]["attention_state"] == "scheduled"


@pytest.mark.django_db
def test_hr_admin_lifecycle_queue_exposes_document_attention_summary(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0235",
        first_name="Queue",
        last_name="Documents",
        work_email="queue.documents@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
        date_of_joining=timezone.localdate(),
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="queue-doc-blocker",
        name="Queue Doc Blocker",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )
    EmployeeDocument.objects.create(
        tenant=tenant,
        employee=employee,
        category=category,
        title="Expired blocker",
        file_name="expired-blocker.pdf",
        status=EmployeeDocumentStatus.ACTIVE,
        verification_status=VerificationStatus.VERIFIED,
        expires_on=timezone.localdate() - timedelta(days=1),
        uploaded_by_identifier="EMP-0235",
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "expected_joining_date": timezone.localdate().isoformat(),
            "checklist_snapshot": [],
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()

    queue_response = api_client.get("/api/v1/hr-admin/lifecycle-queue/?item_type=onboarding&q=EMP-0235")

    assert queue_response.status_code == 200, queue_response.json()
    payload = queue_response.json()["items"][0]
    assert payload["employee_code"] == "EMP-0235"
    assert payload["document_attention_state"] == "blocked"
    assert payload["expired_document_count"] == 1
    assert payload["missing_required_document_count"] == 0
    assert "expired" in payload["document_attention_summary"].lower()


@pytest.mark.django_db
def test_onboarding_document_attention_creates_notification(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0236",
        first_name="Notify",
        last_name="Docs",
        work_email="notify.docs@northstar.example",
        employment_status=EmploymentStatus.DRAFT,
        date_of_joining=timezone.localdate(),
    )
    category = DocumentCategory.objects.create(
        tenant=tenant,
        code="notify-doc-blocker",
        name="Notify Doc Blocker",
        category_type=DocumentCategoryType.IDENTITY,
        requires_verification=True,
        allow_employee_upload=True,
        is_active=True,
    )
    DocumentRequirementRule.objects.create(
        tenant=tenant,
        category=category,
        employment_type=employee.employment_type,
        is_mandatory=True,
        required_within_days_of_joining=0,
        is_active=True,
    )

    create_response = api_client.post(
        "/api/v1/hr-admin/onboardings/",
        {
            "employee_id": str(employee.id),
            "status": OnboardingStatus.IN_PROGRESS,
            "expected_joining_date": timezone.localdate().isoformat(),
            "checklist_snapshot": [],
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    notification = Notification.objects.filter(
        tenant=tenant,
        subject_type="employee_onboarding",
        subject_identifier=str(create_response.json()["id"]),
    ).order_by("-created_at").first()
    assert notification is not None
    assert notification.title
    assert notification.body
    assert notification.payload["document_attention_state"] == "blocked"
    assert notification.payload["missing_required_document_count"] == 1


@pytest.mark.django_db
def test_hr_admin_exit_escalation_state_is_not_duplicated_after_first_escalation(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "nisha.rao")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    tenant = bootstrapped_workspace["pending_leave"].tenant
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-0225",
        first_name="Exit",
        last_name="Escalation State",
        work_email="exit.escalation.state@northstar.example",
        employment_status=EmploymentStatus.ACTIVE,
    )
    past_due = (timezone.localdate() - timedelta(days=3)).isoformat()

    create_response = api_client.post(
        "/api/v1/hr-admin/exits/",
        {
            "employee_id": str(employee.id),
            "status": ExitStatus.CLEARANCE_IN_PROGRESS,
            "resignation_date": "2024-09-01",
            "approved_last_working_date": "2024-09-30",
            "clearance_status_snapshot": {
                "items": [
                    {
                        "code": "asset-return",
                        "label": "Asset return",
                        "done": False,
                        "owner": "nisha.rao",
                        "due_on": past_due,
                        "escalate_after_days": 1,
                    },
                ],
            },
        },
        format="json",
    )

    assert create_response.status_code == 201, create_response.json()
    exit_id = create_response.json()["id"]

    patch_response = api_client.patch(
        f"/api/v1/hr-admin/exits/{exit_id}/",
        {
            "clearance_status_snapshot": create_response.json()["clearance_status_snapshot"],
        },
        format="json",
    )

    assert patch_response.status_code == 200, patch_response.json()
    item = patch_response.json()["clearance_status_snapshot"]["items"][0]
    actions = [entry["action"] for entry in item["history"]]
    assert actions.count("escalated") == 1
    assert actions.count("escalation_sent") == 1
    assert item["is_escalated"] is True
    assert item["escalated_at"]


@pytest.mark.django_db
def test_manager_can_approve_pending_leave_and_regularization(api_client: APIClient, bootstrapped_workspace):
    token = login(api_client, "karan.mehta")
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    leave_response = api_client.post(
        f"/api/v1/manager/leave-requests/{bootstrapped_workspace['pending_leave'].id}/approve/",
        {"comment": "Approved in Phase 0 smoke test."},
        format="json",
    )
    assert leave_response.status_code == 200, leave_response.json()
    assert leave_response.json()["status"] == LeaveRequestStatus.APPROVED

    regularization_response = api_client.post(
        f"/api/v1/manager/attendance-regularizations/{bootstrapped_workspace['pending_regularization'].id}/approve/",
        {"comment": "Approved in Phase 0 smoke test."},
        format="json",
    )
    assert regularization_response.status_code == 200, regularization_response.json()
    assert regularization_response.json()["status"] == RegularizationStatus.APPROVED
