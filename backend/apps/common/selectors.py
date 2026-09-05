"""Shared selectors for the first API slice."""

from copy import deepcopy
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.attendance.models import AttendancePolicy, AttendancePolicyStatus, AttendanceRecord, AttendanceRegularization, AttendanceStatus, RegularizationStatus
from apps.documents.models import DocumentCategory, DocumentRequirementRule, EmployeeDocument, VerificationStatus
from apps.employee_lifecycle.models import EmployeeExit, EmployeeMovement, EmployeeOnboarding, ExitStatus, OnboardingStatus, ProbationDecision, ProbationReview
from apps.employees.models import Employee, EmployeeBankAccount, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, TenantMembership
from apps.leave_management.models import LeaveBalance, LeavePolicy, LeavePolicyStatus, LeaveRequest, LeaveRequestStatus
from apps.leave_management.services import _get_leave_request_lifecycle_runtime, get_leave_policy_period_year
from apps.notifications.models import Notification, NotificationEventDefinition, NotificationStatus, NotificationTemplate, NotificationTemplateStatus
from apps.organizations.models import Branch, BusinessUnit, CostCenter, Department, Designation, EmploymentType, Grade, LegalEntity, Location
from apps.platform_config.models import ConfigStatus, TenantConfiguration
from apps.workflows.models import WorkflowAssignment, WorkflowInstanceStatus, WorkflowStatus, WorkflowTemplate


PAYROLL_READINESS_CONFIG_KEY = "payroll.readiness_profile.v1"

DEFAULT_PAYROLL_READINESS_PROFILE = {
    "profile_key": PAYROLL_READINESS_CONFIG_KEY,
    "profile_name": "Source data readiness",
    "version": 1,
    "included_employment_statuses": [EmploymentStatus.ACTIVE, EmploymentStatus.ON_NOTICE],
    "employee_required_fields": [
        {"field": "date_of_joining", "label": "Date of joining", "severity": "blocker"},
        {"field": "legal_entity", "label": "Legal entity", "severity": "blocker"},
        {"field": "branch", "label": "Branch", "severity": "blocker"},
        {"field": "location", "label": "Location", "severity": "blocker"},
        {"field": "department", "label": "Department", "severity": "blocker"},
        {"field": "cost_center", "label": "Cost center", "severity": "blocker"},
        {"field": "grade", "label": "Grade", "severity": "warning"},
        {"field": "employment_type", "label": "Employment type", "severity": "blocker"},
    ],
    "bank_account": {"required": True, "severity": "warning", "label": "Primary bank account"},
    "pending_sources": {
        "leave_request_statuses": [LeaveRequestStatus.PENDING],
        "attendance_regularization_statuses": [RegularizationStatus.PENDING],
        "severity": "warning",
    },
    "attendance_unknown_statuses": [AttendanceStatus.UNKNOWN],
}


def _employee_display_name(employee: Employee) -> str:
    return " ".join(part for part in [employee.first_name, employee.last_name] if part)


def _deep_merge_dict(base: dict, override: dict) -> dict:
    result = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge_dict(result[key], value)
        else:
            result[key] = value
    return result


def _resolve_payroll_readiness_profile(tenant) -> tuple[dict, str]:
    tenant_config = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=PAYROLL_READINESS_CONFIG_KEY,
        )
        .select_related("definition")
        .first()
    )
    if not tenant_config:
        return deepcopy(DEFAULT_PAYROLL_READINESS_PROFILE), "platform_default"

    source_value = tenant_config.published_value if tenant_config.status == ConfigStatus.PUBLISHED else tenant_config.current_value
    if not isinstance(source_value, dict):
        source_value = {}
    return _deep_merge_dict(DEFAULT_PAYROLL_READINESS_PROFILE, source_value), tenant_config.status


def _count_weekdays(start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days + 1
    return sum(1 for day_offset in range(days) if (start_date + timedelta(days=day_offset)).weekday() < 5)


def _payroll_readiness_field_value(item: Employee, field_name: str):
    return getattr(item, field_name, None)


def _lifecycle_owner_value_from_identifier(identifier: str) -> str:
    normalized = (identifier or "").strip()
    return f"identifier:{normalized.lower()}" if normalized else ""


def _lifecycle_owner_identifier_from_employee(employee: Employee | None) -> str:
    if not employee:
        return ""
    membership = getattr(employee, "membership", None)
    user = getattr(membership, "user", None) if membership else None
    return (getattr(user, "username", "") or employee.employee_code or "").strip()


def _lifecycle_owner_value_from_employee(employee: Employee | None) -> str:
    return _lifecycle_owner_value_from_identifier(_lifecycle_owner_identifier_from_employee(employee))


def _get_pending_workflow_instance_ids_for_actor(actor: Employee, *, subject_type: str) -> list[str]:
    membership = getattr(actor, "membership", None)
    actor_identifiers = [str(actor.id)]
    if membership and membership.user_id:
        actor_identifiers.append(str(membership.user_id))
    queryset = WorkflowAssignment.objects.filter(
        step_instance__workflow_instance__subject_type=subject_type,
        step_instance__status__in=[WorkflowInstanceStatus.PENDING, WorkflowInstanceStatus.IN_PROGRESS],
    )
    if membership:
        queryset = queryset.filter(Q(membership=membership) | Q(actor_identifier__in=actor_identifiers))
    else:
        queryset = queryset.filter(actor_identifier__in=actor_identifiers)
    return list(
        queryset.values_list("step_instance__workflow_instance__id", flat=True).distinct()
    )


def get_default_membership_for_user(user) -> TenantMembership | None:
    """Returns the user's preferred active tenant membership."""

    memberships = (
        TenantMembership.objects.filter(
            user=user,
            status=MembershipStatus.ACTIVE,
        )
        .select_related("tenant")
        .order_by("-is_default", "created_at")
    )
    return memberships.first()


def get_employee_for_user(user) -> Employee | None:
    """Returns the employee linked to the user's active membership."""

    membership = get_default_membership_for_user(user)
    if not membership:
        return None
    return (
        Employee.objects.select_related(
            "tenant",
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
        .filter(membership=membership)
        .first()
    )


def get_employee_leave_summary(employee: Employee) -> dict:
    """Builds an employee leave summary for ESS dashboards."""

    today = timezone.localdate()
    resolved_policies = list(
        LeavePolicy.objects.filter(
            tenant=employee.tenant,
            status=LeavePolicyStatus.ACTIVE,
            assignments__is_active=True,
        )
        .select_related("leave_type")
        .distinct()
    )
    period_years = {get_leave_policy_period_year(leave_policy=policy, as_of=today) for policy in resolved_policies}
    balances = LeaveBalance.objects.filter(employee=employee, period_year__in=period_years or {today.year}).select_related("leave_policy__leave_type")
    pending_requests = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequestStatus.PENDING,
    ).count()
    recent_requests = list(
        LeaveRequest.objects.filter(employee=employee)
        .select_related("leave_type")
        .order_by("-created_at")[:5]
    )

    balance_items = [
        {
            "leave_type": balance.leave_policy.leave_type.name,
            "policy_name": balance.leave_policy.name,
            "closing_balance": balance.closing_balance,
            "consumed_amount": balance.consumed_amount,
            "reserved_amount": balance.reserved_amount,
        }
        for balance in balances
    ]

    recent_items = [
        {
            "id": str(request.id),
            "leave_type": request.leave_type.name,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "requested_units": request.requested_units,
        }
        for request in recent_requests
    ]

    return {
        "period_year": min(period_years) if period_years else today.year,
        "pending_requests_count": pending_requests,
        "balances": balance_items,
        "recent_requests": recent_items,
    }


def get_employee_attendance_summary(employee: Employee) -> dict:
    """Builds an employee attendance summary for ESS dashboards."""

    today = timezone.localdate()
    month_start = today.replace(day=1)
    records = AttendanceRecord.objects.filter(
        employee=employee,
        attendance_date__gte=month_start,
        attendance_date__lte=today,
    )
    today_record = records.filter(attendance_date=today).select_related("shift").first()
    regularization_count = AttendanceRegularization.objects.filter(
        employee=employee,
        status=RegularizationStatus.PENDING,
    ).count()
    status_counts = {
        "present_days": records.filter(status=AttendanceStatus.PRESENT).count(),
        "absent_days": records.filter(status=AttendanceStatus.ABSENT).count(),
        "half_days": records.filter(status=AttendanceStatus.HALF_DAY).count(),
        "late_days": records.filter(status=AttendanceStatus.LATE).count(),
    }
    work_duration = records.aggregate(total=Sum("work_duration_hours"))["total"] or 0
    overtime_duration = records.aggregate(total=Sum("overtime_hours"))["total"] or 0

    return {
        "today": {
            "date": today,
            "status": today_record.status if today_record else AttendanceStatus.UNKNOWN,
            "shift": today_record.shift.name if today_record and today_record.shift else None,
            "check_in_at": today_record.check_in_at if today_record else None,
            "check_out_at": today_record.check_out_at if today_record else None,
        },
        "month_to_date": {
            **status_counts,
            "work_duration_hours": work_duration,
            "overtime_hours": overtime_duration,
        },
        "pending_regularizations_count": regularization_count,
    }


def get_manager_team_summary(manager: Employee) -> dict:
    """Builds a manager summary for MSS dashboards."""

    team = Employee.objects.filter(reporting_manager=manager)
    team_ids = list(team.values_list("id", flat=True))
    today = timezone.localdate()

    employees_on_leave = LeaveRequest.objects.filter(
        employee_id__in=team_ids,
        status=LeaveRequestStatus.APPROVED,
        start_date__lte=today,
        end_date__gte=today,
    ).count()
    pending_leave_approvals = LeaveRequest.objects.filter(
        employee_id__in=team_ids,
        status=LeaveRequestStatus.PENDING,
    ).count()
    pending_regularizations = AttendanceRegularization.objects.filter(
        employee_id__in=team_ids,
        status=RegularizationStatus.PENDING,
    ).count()
    attendance_exceptions = AttendanceRecord.objects.filter(
        employee_id__in=team_ids,
        attendance_date=today,
        status__in=[AttendanceStatus.ABSENT, AttendanceStatus.HALF_DAY, AttendanceStatus.LATE, AttendanceStatus.UNKNOWN],
    ).count()

    return {
        "team_size": len(team_ids),
        "employees_on_leave_today": employees_on_leave,
        "pending_leave_approvals_count": pending_leave_approvals,
        "pending_attendance_regularizations_count": pending_regularizations,
        "attendance_exceptions_today": attendance_exceptions,
    }


def get_hr_admin_dashboard(employee: Employee) -> dict:
    """Builds a broad HR admin dashboard payload across operational modules."""

    tenant = employee.tenant
    today = timezone.localdate()
    now = timezone.now()
    month_start = today.replace(day=1)
    next_thirty_days = today + timedelta(days=30)

    employees = Employee.objects.filter(tenant=tenant)
    memberships = TenantMembership.objects.filter(tenant=tenant)

    employment_status_breakdown = [
        {
            "label": label,
            "value": employees.filter(employment_status=value).count(),
        }
        for value, label in EmploymentStatus.choices
    ]

    department_headcount = [
        {
            "label": item["department__name"] or "Unassigned",
            "value": item["count"],
        }
        for item in employees.values("department__name").annotate(count=Count("id")).order_by("-count", "department__name")[:6]
    ]

    pending_leave_requests = LeaveRequest.objects.filter(
        tenant=tenant,
        status=LeaveRequestStatus.PENDING,
    ).count()
    pending_regularizations = AttendanceRegularization.objects.filter(
        tenant=tenant,
        status=RegularizationStatus.PENDING,
    ).count()

    return {
        "overview": {
            "total_employees": employees.count(),
            "active_employees": employees.filter(employment_status=EmploymentStatus.ACTIVE).count(),
            "active_memberships": memberships.filter(status=MembershipStatus.ACTIVE).count(),
            "configured_departments": Department.objects.filter(tenant=tenant, is_active=True).count(),
            "active_branches": Branch.objects.filter(tenant=tenant, is_active=True).count(),
            "pending_approvals": pending_leave_requests + pending_regularizations,
        },
        "workforce": {
            "employment_status_breakdown": employment_status_breakdown,
            "department_headcount": department_headcount,
            "joiners_this_month": employees.filter(date_of_joining__gte=month_start, date_of_joining__lte=today).count(),
            "exits_this_month": EmployeeExit.objects.filter(
                tenant=tenant,
                actual_exit_date__gte=month_start,
                actual_exit_date__lte=today,
            ).count(),
            "managers_with_reports": employees.filter(direct_reports__isnull=False).distinct().count(),
            "employees_without_manager": employees.filter(
                employment_status__in=[EmploymentStatus.ACTIVE, EmploymentStatus.ON_NOTICE],
                reporting_manager__isnull=True,
            ).count(),
        },
        "operations": {
            "pending_leave_requests": pending_leave_requests,
            "pending_regularizations": pending_regularizations,
            "pending_onboardings": EmployeeOnboarding.objects.filter(
                tenant=tenant,
                status__in=[OnboardingStatus.NOT_STARTED, OnboardingStatus.IN_PROGRESS, OnboardingStatus.BLOCKED],
            ).count(),
            "pending_probation_reviews": ProbationReview.objects.filter(
                tenant=tenant,
                decision=ProbationDecision.PENDING,
            ).count(),
            "open_exits": EmployeeExit.objects.filter(
                tenant=tenant,
                status__in=[
                    ExitStatus.DRAFT,
                    ExitStatus.PENDING_APPROVAL,
                    ExitStatus.APPROVED,
                    ExitStatus.CLEARANCE_IN_PROGRESS,
                ],
            ).count(),
        },
        "documents": {
            "pending_verification": EmployeeDocument.objects.filter(
                tenant=tenant,
                verification_status=VerificationStatus.PENDING,
            ).count(),
            "rejected_documents": EmployeeDocument.objects.filter(
                tenant=tenant,
                verification_status=VerificationStatus.REJECTED,
            ).count(),
            "expiring_in_30_days": EmployeeDocument.objects.filter(
                tenant=tenant,
                expires_on__gte=today,
                expires_on__lte=next_thirty_days,
            ).count(),
            "mandatory_requirement_rules": DocumentRequirementRule.objects.filter(tenant=tenant, is_mandatory=True).count(),
            "active_document_categories": DocumentCategory.objects.filter(tenant=tenant, is_active=True).count(),
        },
        "governance": {
            "active_leave_policies": LeavePolicy.objects.filter(tenant=tenant, status=LeavePolicyStatus.ACTIVE).count(),
            "active_attendance_policies": AttendancePolicy.objects.filter(tenant=tenant, status=AttendancePolicyStatus.ACTIVE).count(),
            "workflow_templates": WorkflowTemplate.objects.filter(tenant=tenant, status=WorkflowStatus.ACTIVE).count(),
            "active_notification_templates": NotificationTemplate.objects.filter(
                tenant=tenant,
                status=NotificationTemplateStatus.ACTIVE,
            ).count(),
            "active_notification_events": NotificationEventDefinition.objects.filter(tenant=tenant, is_active=True).count(),
        },
        "delivery": {
            "pending_notifications": Notification.objects.filter(tenant=tenant, status=NotificationStatus.PENDING).count(),
            "sent_today": Notification.objects.filter(
                tenant=tenant,
                sent_at__date=today,
                status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.READ],
            ).count(),
            "failed_notifications": Notification.objects.filter(tenant=tenant, status=NotificationStatus.FAILED).count(),
            "documents_expiring_30_days": EmployeeDocument.objects.filter(
                tenant=tenant,
                expires_on__gte=today,
                expires_on__lte=next_thirty_days,
            ).count(),
            "latest_activity_at": now,
        },
    }


def get_hr_admin_workforce_export(employee: Employee) -> list[dict]:
    """Builds workforce export rows for HR admin reporting."""

    rows = []
    queryset = (
        Employee.objects.filter(tenant=employee.tenant)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
            "membership",
            "membership__user",
        )
        .order_by("employee_code")
    )
    for item in queryset:
        rows.append(
            {
                "employee_code": item.employee_code,
                "full_name": _employee_display_name(item),
                "work_email": item.work_email,
                "phone_number": item.phone_number,
                "employment_status": item.employment_status,
                "date_of_joining": item.date_of_joining.isoformat() if item.date_of_joining else "",
                "legal_entity": item.legal_entity.name if item.legal_entity else "",
                "branch": item.branch.name if item.branch else "",
                "location": item.location.name if item.location else "",
                "department": item.department.name if item.department else "",
                "business_unit": item.business_unit.name if item.business_unit else "",
                "designation": item.designation.name if item.designation else "",
                "grade": item.grade.name if item.grade else "",
                "employment_type": item.employment_type.name if item.employment_type else "",
                "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else "",
                "has_access": "yes" if item.membership_id else "no",
                "membership_status": item.membership.status if item.membership else "",
                "username": item.membership.user.username if item.membership and item.membership.user else "",
            }
        )
    return rows


def get_hr_admin_pending_approvals_export(employee: Employee) -> list[dict]:
    """Builds a combined pending approvals export across leave and attendance."""

    rows = []
    tenant = employee.tenant
    leave_requests = (
        LeaveRequest.objects.filter(tenant=tenant, status=LeaveRequestStatus.PENDING)
        .select_related("employee", "employee__department", "employee__designation", "leave_type")
        .order_by("-created_at")
    )
    for item in leave_requests:
        rows.append(
            {
                "request_type": "leave",
                "request_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "request_label": item.leave_type.name,
                "start_date": item.start_date.isoformat(),
                "end_date": item.end_date.isoformat(),
                "requested_units": str(item.requested_units),
                "reason": item.reason,
                "submitted_at": item.created_at.isoformat(),
            }
        )

    regularizations = (
        AttendanceRegularization.objects.filter(tenant=tenant, status=RegularizationStatus.PENDING)
        .select_related("employee", "employee__department", "employee__designation", "attendance_record")
        .order_by("-created_at")
    )
    for item in regularizations:
        rows.append(
            {
                "request_type": "attendance_regularization",
                "request_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "request_label": item.requested_status,
                "start_date": item.attendance_record.attendance_date.isoformat() if item.attendance_record else "",
                "end_date": item.attendance_record.attendance_date.isoformat() if item.attendance_record else "",
                "requested_units": "",
                "reason": item.reason,
                "submitted_at": item.created_at.isoformat(),
            }
        )

    return rows


def get_hr_admin_document_compliance_export(employee: Employee) -> list[dict]:
    """Builds employee document compliance export rows."""

    rows = []
    queryset = (
        EmployeeDocument.objects.filter(tenant=employee.tenant)
        .select_related("employee", "employee__department", "category")
        .order_by("-created_at")
    )
    for item in queryset:
        rows.append(
            {
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "category": item.category.name,
                "title": item.title,
                "document_number": item.document_number,
                "status": item.status,
                "verification_status": item.verification_status,
                "issued_on": item.issued_on.isoformat() if item.issued_on else "",
                "expires_on": item.expires_on.isoformat() if item.expires_on else "",
                "verified_at": item.verified_at.isoformat() if item.verified_at else "",
                "rejection_reason": item.rejection_reason,
            }
        )
    return rows


def get_hr_admin_notification_queue_export(employee: Employee) -> list[dict]:
    """Builds notification queue export rows for delivery visibility."""

    rows = []
    queryset = (
        Notification.objects.filter(tenant=employee.tenant)
        .select_related("event_definition", "recipient_membership", "recipient_role")
        .order_by("-created_at")
    )
    for item in queryset:
        rows.append(
            {
                "notification_id": str(item.id),
                "event_definition": item.event_definition.name if item.event_definition else "",
                "channel": item.channel,
                "audience_type": item.audience_type,
                "subject_type": item.subject_type,
                "subject_identifier": item.subject_identifier,
                "recipient_identifier": item.recipient_identifier,
                "recipient_address": item.recipient_address,
                "status": item.status,
                "priority": item.priority,
                "scheduled_for": item.scheduled_for.isoformat() if item.scheduled_for else "",
                "sent_at": item.sent_at.isoformat() if item.sent_at else "",
                "delivered_at": item.delivered_at.isoformat() if item.delivered_at else "",
                "read_at": item.read_at.isoformat() if item.read_at else "",
                "title": item.title,
                "subject": item.subject,
            }
        )
    return rows


def get_hr_admin_lifecycle_queue_export(employee: Employee) -> list[dict]:
    """Builds lifecycle queue export rows across onboarding, probation, movement, and exits."""

    rows = []
    tenant = employee.tenant

    onboardings = (
        EmployeeOnboarding.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-created_at")
    )
    for item in onboardings:
        rows.append(
            {
                "item_type": "onboarding",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.expected_joining_date.isoformat() if item.expected_joining_date else "",
                "secondary_date": item.actual_joining_date.isoformat() if item.actual_joining_date else "",
                "owner_value": _lifecycle_owner_value_from_identifier(item.assigned_owner_identifier),
                "owner_label": item.assigned_owner_identifier,
                "workflow_reference": item.workflow_reference,
                "summary": item.notes,
                "created_at": item.created_at.isoformat(),
            }
        )

    probation_reviews = (
        ProbationReview.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-review_date", "-created_at")
    )
    for item in probation_reviews:
        rows.append(
            {
                "item_type": "probation",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.decision,
                "primary_date": item.review_date.isoformat(),
                "secondary_date": item.probation_end_date.isoformat() if item.probation_end_date else "",
                "owner_value": _lifecycle_owner_value_from_identifier(item.reviewer_identifier),
                "owner_label": item.reviewer_identifier,
                "workflow_reference": item.workflow_reference,
                "summary": item.remarks,
                "created_at": item.created_at.isoformat(),
            }
        )

    movements = (
        EmployeeMovement.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation", "to_manager__membership__user")
        .order_by("-effective_date", "-created_at")
    )
    for item in movements:
        rows.append(
            {
                "item_type": "movement",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.effective_date.isoformat(),
                "secondary_date": "",
                "owner_value": _lifecycle_owner_value_from_employee(item.to_manager),
                "owner_label": _employee_display_name(item.to_manager) if item.to_manager else "",
                "workflow_reference": item.workflow_reference,
                "summary": item.reason,
                "created_at": item.created_at.isoformat(),
            }
        )

    exits = (
        EmployeeExit.objects.filter(tenant=tenant)
        .select_related("employee", "employee__department", "employee__designation")
        .order_by("-created_at")
    )
    for item in exits:
        rows.append(
            {
                "item_type": "exit",
                "item_id": str(item.id),
                "employee_code": item.employee.employee_code,
                "employee_name": _employee_display_name(item.employee),
                "department": item.employee.department.name if item.employee.department else "",
                "designation": item.employee.designation.name if item.employee.designation else "",
                "status": item.status,
                "primary_date": item.proposed_last_working_date.isoformat() if item.proposed_last_working_date else "",
                "secondary_date": item.actual_exit_date.isoformat() if item.actual_exit_date else "",
                "owner_value": "",
                "owner_label": "",
                "workflow_reference": item.workflow_reference,
                "summary": item.exit_reason_detail or item.handover_notes or item.exit_reason,
                "created_at": item.created_at.isoformat(),
            }
        )

    rows.sort(key=lambda item: item["created_at"], reverse=True)
    return rows


def get_employee_leave_requests(employee: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns employee leave request history for ESS screens."""

    queryset = (
        LeaveRequest.objects.filter(employee=employee)
        .select_related("leave_type", "leave_policy")
        .order_by("-created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": request.id,
            "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
            "leave_type": request.leave_type.name,
            "leave_type_code": request.leave_type.code,
            "policy_name": request.leave_policy.name if request.leave_policy else None,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "start_day_portion": request.start_day_portion,
            "end_day_portion": request.end_day_portion,
            "requested_units": request.requested_units,
            "approved_units": request.approved_units,
            "reason": request.reason,
            "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
            "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
            "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
            "manager_comment": request.manager_comment,
            "rejection_reason": request.rejection_reason,
            "workflow_reference": request.workflow_reference,
            "applied_at": request.applied_at,
            "approved_at": request.approved_at,
            "cancelled_at": request.cancelled_at,
            "can_withdraw": _get_leave_request_lifecycle_runtime(leave_request=request)["can_withdraw"],
            "withdraw_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_block_reason"],
            "withdraw_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_requires_attachment"],
            "withdraw_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_attachment_label"],
            "can_cancel": _get_leave_request_lifecycle_runtime(leave_request=request)["can_cancel"],
            "cancel_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_block_reason"],
            "cancel_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_requires_attachment"],
            "cancel_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_attachment_label"],
            "cancel_requires_reapproval": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approved_requires_reapproval"],
            "cancel_approval_route": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approval_route"],
            "created_at": request.created_at,
            "updated_at": request.updated_at,
        }
        for request in queryset
    ]


def get_employee_leave_request_detail(employee: Employee, request_id) -> dict | None:
    """Returns a single employee leave request detail payload."""

    request = (
        LeaveRequest.objects.filter(employee=employee, id=request_id)
        .select_related("leave_type", "leave_policy")
        .first()
    )
    if not request:
        return None
    lifecycle = _get_leave_request_lifecycle_runtime(leave_request=request)
    return {
        "id": request.id,
        "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
        "leave_type": request.leave_type.name,
        "leave_type_code": request.leave_type.code,
        "policy_name": request.leave_policy.name if request.leave_policy else None,
        "status": request.status,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "start_day_portion": request.start_day_portion,
        "end_day_portion": request.end_day_portion,
        "requested_units": request.requested_units,
        "approved_units": request.approved_units,
        "reason": request.reason,
        "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
        "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
        "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
        "manager_comment": request.manager_comment,
        "rejection_reason": request.rejection_reason,
        "workflow_reference": request.workflow_reference,
        "applied_at": request.applied_at,
        "approved_at": request.approved_at,
        "cancelled_at": request.cancelled_at,
        "can_withdraw": lifecycle["can_withdraw"],
        "withdraw_block_reason": lifecycle["withdraw_block_reason"],
        "withdraw_requires_attachment": lifecycle["withdraw_requires_attachment"],
        "withdraw_attachment_label": lifecycle["withdraw_attachment_label"],
        "can_cancel": lifecycle["can_cancel"],
        "cancel_block_reason": lifecycle["cancel_block_reason"],
        "cancel_requires_attachment": lifecycle["cancel_requires_attachment"],
        "cancel_attachment_label": lifecycle["cancel_attachment_label"],
        "cancel_requires_reapproval": lifecycle["cancel_approved_requires_reapproval"],
        "cancel_approval_route": lifecycle["cancel_approval_route"],
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }


def get_employee_attendance_regularizations(employee: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns employee regularization history for ESS screens."""

    queryset = (
        AttendanceRegularization.objects.filter(employee=employee)
        .select_related("attendance_record", "attendance_record__shift")
        .order_by("-created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": regularization.id,
            "attendance_record_id": regularization.attendance_record.id,
            "attendance_date": regularization.attendance_record.attendance_date,
            "current_status": regularization.attendance_record.status,
            "requested_status": regularization.requested_status,
            "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
            "requested_check_in_at": regularization.requested_check_in_at,
            "requested_check_out_at": regularization.requested_check_out_at,
            "actual_check_in_at": regularization.attendance_record.check_in_at,
            "actual_check_out_at": regularization.attendance_record.check_out_at,
            "status": regularization.status,
            "reason": regularization.reason,
            "manager_comment": regularization.manager_comment,
            "rejection_reason": regularization.rejection_reason,
            "workflow_reference": regularization.workflow_reference,
            "applied_at": regularization.applied_at,
            "resolved_at": regularization.resolved_at,
            "created_at": regularization.created_at,
            "updated_at": regularization.updated_at,
        }
        for regularization in queryset
    ]


def get_employee_attendance_regularization_detail(employee: Employee, regularization_id) -> dict | None:
    """Returns a single employee regularization detail payload."""

    regularization = (
        AttendanceRegularization.objects.filter(employee=employee, id=regularization_id)
        .select_related("attendance_record", "attendance_record__shift")
        .first()
    )
    if not regularization:
        return None
    return {
        "id": regularization.id,
        "attendance_record_id": regularization.attendance_record.id,
        "attendance_date": regularization.attendance_record.attendance_date,
        "current_status": regularization.attendance_record.status,
        "requested_status": regularization.requested_status,
        "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
        "requested_check_in_at": regularization.requested_check_in_at,
        "requested_check_out_at": regularization.requested_check_out_at,
        "actual_check_in_at": regularization.attendance_record.check_in_at,
        "actual_check_out_at": regularization.attendance_record.check_out_at,
        "status": regularization.status,
        "reason": regularization.reason,
        "manager_comment": regularization.manager_comment,
        "rejection_reason": regularization.rejection_reason,
        "workflow_reference": regularization.workflow_reference,
        "applied_at": regularization.applied_at,
        "resolved_at": regularization.resolved_at,
        "created_at": regularization.created_at,
        "updated_at": regularization.updated_at,
    }


def get_manager_pending_leave_requests(manager: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns workflow-assigned pending leave approvals for MSS inbox screens."""

    assigned_workflow_ids = _get_pending_workflow_instance_ids_for_actor(manager, subject_type="leave_request")
    queryset = (
        LeaveRequest.objects.filter(
            status=LeaveRequestStatus.PENDING,
        )
        .select_related("employee__department", "employee__designation", "leave_type", "leave_policy")
        .order_by("start_date", "created_at")
    )
    if assigned_workflow_ids:
        queryset = queryset.filter(workflow_reference__in=assigned_workflow_ids)
    else:
        queryset = queryset.filter(employee__reporting_manager=manager, workflow_reference="")
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": request.id,
            "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
            "employee_id": request.employee.id,
            "employee_code": request.employee.employee_code,
            "employee_name": _employee_display_name(request.employee),
            "department": request.employee.department.name if request.employee.department else None,
            "designation": request.employee.designation.name if request.employee.designation else None,
            "leave_type": request.leave_type.name,
            "leave_type_code": request.leave_type.code,
            "policy_name": request.leave_policy.name if request.leave_policy else None,
            "status": request.status,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "start_day_portion": request.start_day_portion,
            "end_day_portion": request.end_day_portion,
            "requested_units": request.requested_units,
            "approved_units": request.approved_units,
            "reason": request.reason,
            "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
            "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
            "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
            "workflow_reference": request.workflow_reference,
            "applied_at": request.applied_at,
            "can_withdraw": _get_leave_request_lifecycle_runtime(leave_request=request)["can_withdraw"],
            "withdraw_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_block_reason"],
            "withdraw_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_requires_attachment"],
            "withdraw_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["withdraw_attachment_label"],
            "can_cancel": _get_leave_request_lifecycle_runtime(leave_request=request)["can_cancel"],
            "cancel_block_reason": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_block_reason"],
            "cancel_requires_attachment": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_requires_attachment"],
            "cancel_attachment_label": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_attachment_label"],
            "cancel_requires_reapproval": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approved_requires_reapproval"],
            "cancel_approval_route": _get_leave_request_lifecycle_runtime(leave_request=request)["cancel_approval_route"],
            "created_at": request.created_at,
        }
        for request in queryset
    ]


def get_manager_leave_request_detail(manager: Employee, request_id) -> dict | None:
    """Returns a workflow-assigned leave approval detail payload."""

    assigned_workflow_ids = set(_get_pending_workflow_instance_ids_for_actor(manager, subject_type="leave_request"))
    request = (
        LeaveRequest.objects.filter(
            id=request_id,
        )
        .select_related("employee__department", "employee__designation", "leave_type", "leave_policy")
        .first()
    )
    if not request:
        return None
    if request.workflow_reference:
        if request.workflow_reference not in assigned_workflow_ids:
            return None
    elif request.employee.reporting_manager_id != manager.id:
        return None
    lifecycle = _get_leave_request_lifecycle_runtime(leave_request=request)
    return {
        "id": request.id,
        "request_action": str(request.metadata.get("request_action", "leave_request") or "leave_request"),
        "employee_id": request.employee.id,
        "employee_code": request.employee.employee_code,
        "employee_name": _employee_display_name(request.employee),
        "department": request.employee.department.name if request.employee.department else None,
        "designation": request.employee.designation.name if request.employee.designation else None,
        "leave_type": request.leave_type.name,
        "leave_type_code": request.leave_type.code,
        "policy_name": request.leave_policy.name if request.leave_policy else None,
        "status": request.status,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "start_day_portion": request.start_day_portion,
        "end_day_portion": request.end_day_portion,
        "requested_units": request.requested_units,
        "approved_units": request.approved_units,
        "reason": request.reason,
        "attachment_reference": str(request.metadata.get("attachment_reference", "") or ""),
        "approval_route": str(request.metadata.get("policy_rules", {}).get("approval_route", "") or ""),
        "required_attachment_label": request.metadata.get("policy_rules", {}).get("required_attachment_label"),
        "manager_comment": request.manager_comment,
        "rejection_reason": request.rejection_reason,
        "workflow_reference": request.workflow_reference,
        "applied_at": request.applied_at,
        "approved_at": request.approved_at,
        "cancelled_at": request.cancelled_at,
        "can_withdraw": lifecycle["can_withdraw"],
        "withdraw_block_reason": lifecycle["withdraw_block_reason"],
        "withdraw_requires_attachment": lifecycle["withdraw_requires_attachment"],
        "withdraw_attachment_label": lifecycle["withdraw_attachment_label"],
        "can_cancel": lifecycle["can_cancel"],
        "cancel_block_reason": lifecycle["cancel_block_reason"],
        "cancel_requires_attachment": lifecycle["cancel_requires_attachment"],
        "cancel_attachment_label": lifecycle["cancel_attachment_label"],
        "cancel_requires_reapproval": lifecycle["cancel_approved_requires_reapproval"],
        "cancel_approval_route": lifecycle["cancel_approval_route"],
        "created_at": request.created_at,
        "updated_at": request.updated_at,
    }


def get_manager_pending_attendance_regularizations(manager: Employee, *, limit: int | None = None) -> list[dict]:
    """Returns manager-scoped pending regularization approvals for MSS inbox screens."""

    queryset = (
        AttendanceRegularization.objects.filter(
            employee__reporting_manager=manager,
            status=RegularizationStatus.PENDING,
        )
        .select_related(
            "employee__department",
            "employee__designation",
            "attendance_record",
            "attendance_record__shift",
        )
        .order_by("attendance_record__attendance_date", "created_at")
    )
    if limit:
        queryset = queryset[:limit]

    return [
        {
            "id": regularization.id,
            "employee_id": regularization.employee.id,
            "employee_code": regularization.employee.employee_code,
            "employee_name": _employee_display_name(regularization.employee),
            "department": regularization.employee.department.name if regularization.employee.department else None,
            "designation": regularization.employee.designation.name if regularization.employee.designation else None,
            "attendance_record_id": regularization.attendance_record.id,
            "attendance_date": regularization.attendance_record.attendance_date,
            "current_status": regularization.attendance_record.status,
            "requested_status": regularization.requested_status,
            "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
            "requested_check_in_at": regularization.requested_check_in_at,
            "requested_check_out_at": regularization.requested_check_out_at,
            "actual_check_in_at": regularization.attendance_record.check_in_at,
            "actual_check_out_at": regularization.attendance_record.check_out_at,
            "status": regularization.status,
            "reason": regularization.reason,
            "workflow_reference": regularization.workflow_reference,
            "applied_at": regularization.applied_at,
            "created_at": regularization.created_at,
        }
        for regularization in queryset
    ]


def get_manager_attendance_regularization_detail(manager: Employee, regularization_id) -> dict | None:
    """Returns a manager-scoped regularization approval detail payload."""

    regularization = (
        AttendanceRegularization.objects.filter(
            employee__reporting_manager=manager,
            id=regularization_id,
        )
        .select_related(
            "employee__department",
            "employee__designation",
            "attendance_record",
            "attendance_record__shift",
        )
        .first()
    )
    if not regularization:
        return None
    return {
        "id": regularization.id,
        "employee_id": regularization.employee.id,
        "employee_code": regularization.employee.employee_code,
        "employee_name": _employee_display_name(regularization.employee),
        "department": regularization.employee.department.name if regularization.employee.department else None,
        "designation": regularization.employee.designation.name if regularization.employee.designation else None,
        "attendance_record_id": regularization.attendance_record.id,
        "attendance_date": regularization.attendance_record.attendance_date,
        "current_status": regularization.attendance_record.status,
        "requested_status": regularization.requested_status,
        "shift": regularization.attendance_record.shift.name if regularization.attendance_record.shift else None,
        "requested_check_in_at": regularization.requested_check_in_at,
        "requested_check_out_at": regularization.requested_check_out_at,
        "actual_check_in_at": regularization.attendance_record.check_in_at,
        "actual_check_out_at": regularization.attendance_record.check_out_at,
        "status": regularization.status,
        "reason": regularization.reason,
        "manager_comment": regularization.manager_comment,
        "rejection_reason": regularization.rejection_reason,
        "workflow_reference": regularization.workflow_reference,
        "applied_at": regularization.applied_at,
        "resolved_at": regularization.resolved_at,
        "created_at": regularization.created_at,
        "updated_at": regularization.updated_at,
    }


def get_hr_admin_employee_list(employee: Employee) -> list[dict]:
    """Returns tenant-wide employee list for HR admin web surfaces."""

    queryset = (
        Employee.objects.filter(tenant=employee.tenant)
        .select_related(
            "legal_entity",
            "branch",
            "location",
            "department",
            "business_unit",
            "designation",
            "grade",
            "employment_type",
            "reporting_manager",
            "membership",
        )
        .annotate(
            assigned_role_count=Count("membership__membership_roles", distinct=True),
            direct_reports_count=Count("direct_reports", distinct=True),
        )
        .order_by("employee_code")
    )

    return [
        {
            "id": item.id,
            "employee_code": item.employee_code,
            "full_name": _employee_display_name(item),
            "work_email": item.work_email,
            "phone_number": item.phone_number,
            "employment_status": item.employment_status,
            "date_of_joining": item.date_of_joining,
            "department": item.department.name if item.department else None,
            "business_unit": item.business_unit.name if item.business_unit else None,
            "legal_entity": item.legal_entity.name if item.legal_entity else None,
            "cost_center": item.cost_center.name if item.cost_center else None,
            "designation": item.designation.name if item.designation else None,
            "grade": item.grade.name if item.grade else None,
            "employment_type": item.employment_type.name if item.employment_type else None,
            "branch": item.branch.name if item.branch else None,
            "location": item.location.name if item.location else None,
            "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else None,
            "has_access": bool(item.membership_id),
            "membership_status": item.membership.status if item.membership else "",
            "assigned_role_count": item.assigned_role_count,
            "direct_reports_count": item.direct_reports_count,
        }
        for item in queryset
    ]


def get_hr_admin_payroll_readiness(
    employee: Employee,
    *,
    period_start: date,
    period_end: date,
    query: str = "",
    readiness_status: str = "all",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """Builds payroll source-data readiness from configurable tenant checks."""

    tenant = employee.tenant
    profile, profile_source = _resolve_payroll_readiness_profile(tenant)
    required_fields = [item for item in profile.get("employee_required_fields", []) if isinstance(item, dict)]
    bank_config = profile.get("bank_account") if isinstance(profile.get("bank_account"), dict) else {}
    pending_source_config = profile.get("pending_sources") if isinstance(profile.get("pending_sources"), dict) else {}
    included_statuses = set(profile.get("included_employment_statuses") or [])
    pending_leave_statuses = set(pending_source_config.get("leave_request_statuses") or [LeaveRequestStatus.PENDING])
    pending_regularization_statuses = set(pending_source_config.get("attendance_regularization_statuses") or [RegularizationStatus.PENDING])
    unknown_attendance_statuses = set(profile.get("attendance_unknown_statuses") or [AttendanceStatus.UNKNOWN])

    queryset = (
        Employee.objects.filter(tenant=tenant)
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
            "exit_record",
        )
        .order_by("employee_code")
    )
    employee_ids = list(queryset.values_list("id", flat=True))

    leave_counts = {
        item["employee_id"]: item["count"]
        for item in LeaveRequest.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    pending_leave_counts = {
        item["employee_id"]: item["count"]
        for item in LeaveRequest.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            status__in=pending_leave_statuses,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    attendance_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRecord.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    unknown_attendance_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRecord.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
            status__in=unknown_attendance_statuses,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    regularization_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRegularization.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_record__attendance_date__gte=period_start,
            attendance_record__attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    pending_regularization_counts = {
        item["employee_id"]: item["count"]
        for item in AttendanceRegularization.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            status__in=pending_regularization_statuses,
            attendance_record__attendance_date__gte=period_start,
            attendance_record__attendance_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    document_counts = {
        item["employee_id"]: item["count"]
        for item in EmployeeDocument.objects.filter(tenant=tenant, employee_id__in=employee_ids)
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    lifecycle_counts = {
        item["employee_id"]: item["count"]
        for item in EmployeeMovement.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            effective_date__gte=period_start,
            effective_date__lte=period_end,
        )
        .values("employee_id")
        .annotate(count=Count("id"))
    }
    bank_account_employee_ids = set(
        EmployeeBankAccount.objects.filter(employee_id__in=employee_ids, is_primary=True).values_list("employee_id", flat=True)
    )

    period_days = (period_end - period_start).days + 1
    working_days = _count_weekdays(period_start, period_end)
    all_items = []
    for item in queryset:
        blockers: list[str] = []
        warnings: list[str] = []

        for field_config in required_fields:
            field_name = str(field_config.get("field") or "").strip()
            if not field_name:
                continue
            if _payroll_readiness_field_value(item, field_name):
                continue
            label = str(field_config.get("label") or field_name.replace("_", " ").title())
            if field_config.get("severity") == "warning":
                warnings.append(f"Missing {label.lower()}.")
            else:
                blockers.append(f"Missing {label.lower()}.")

        if bank_config.get("required") and item.id not in bank_account_employee_ids:
            label = str(bank_config.get("label") or "Primary bank account")
            if bank_config.get("severity") == "warning":
                warnings.append(f"Missing {label.lower()}.")
            else:
                blockers.append(f"Missing {label.lower()}.")

        if included_statuses and item.employment_status not in included_statuses:
            warnings.append("Employment status is outside the included payroll readiness profile.")
        if item.date_of_joining and item.date_of_joining > period_end:
            warnings.append("Joining date is after the selected period.")

        exit_record = getattr(item, "exit_record", None)
        exit_date = (
            exit_record.actual_exit_date
            or exit_record.approved_last_working_date
            or exit_record.proposed_last_working_date
            if exit_record
            else None
        )
        if exit_date and period_start <= exit_date <= period_end:
            warnings.append("Exit activity falls inside the selected period.")
        elif exit_date and exit_date < period_start:
            warnings.append("Exit date is before the selected period.")

        pending_leave_count = pending_leave_counts.get(item.id, 0)
        pending_regularization_count = pending_regularization_counts.get(item.id, 0)
        unknown_attendance_count = unknown_attendance_counts.get(item.id, 0)
        if pending_leave_count:
            warnings.append(f"{pending_leave_count} leave request(s) pending approval in period.")
        if pending_regularization_count:
            warnings.append(f"{pending_regularization_count} attendance regularization(s) pending approval in period.")
        if unknown_attendance_count:
            warnings.append(f"{unknown_attendance_count} attendance record(s) have unknown status in period.")

        status_value = "blocked" if blockers else "warning" if warnings else "ready"
        all_items.append(
            {
                "id": item.id,
                "employee_code": item.employee_code,
                "employee_name": _employee_display_name(item),
                "work_email": item.work_email,
                "readiness_status": status_value,
                "employment_status": item.employment_status,
                "date_of_joining": item.date_of_joining,
                "exit_date": exit_date,
                "legal_entity": item.legal_entity.name if item.legal_entity else None,
                "branch": item.branch.name if item.branch else None,
                "location": item.location.name if item.location else None,
                "department": item.department.name if item.department else None,
                "business_unit": item.business_unit.name if item.business_unit else None,
                "cost_center": item.cost_center.name if item.cost_center else None,
                "designation": item.designation.name if item.designation else None,
                "grade": item.grade.name if item.grade else None,
                "employment_type": item.employment_type.name if item.employment_type else None,
                "period_days": period_days,
                "working_days": working_days,
                "attendance_record_days": attendance_counts.get(item.id, 0),
                "pending_leave_requests": pending_leave_count,
                "pending_attendance_regularizations": pending_regularization_count,
                "unknown_attendance_records": unknown_attendance_count,
                "has_primary_bank_account": item.id in bank_account_employee_ids,
                "blockers": blockers,
                "warnings": warnings,
                "source_counts": {
                    "leave_requests": leave_counts.get(item.id, 0),
                    "attendance_records": attendance_counts.get(item.id, 0),
                    "attendance_regularizations": regularization_counts.get(item.id, 0),
                    "lifecycle_events": lifecycle_counts.get(item.id, 0) + (1 if exit_date and period_start <= exit_date <= period_end else 0),
                    "documents": document_counts.get(item.id, 0),
                    "bank_accounts": 1 if item.id in bank_account_employee_ids else 0,
                },
            }
        )

    normalized_query = (query or "").strip().lower()
    if normalized_query:
        all_items = [
            item
            for item in all_items
            if any(
                normalized_query in str(value or "").lower()
                for value in [
                    item["employee_code"],
                    item["employee_name"],
                    item["work_email"],
                    item["legal_entity"],
                    item["branch"],
                    item["location"],
                    item["department"],
                    item["business_unit"],
                    item["cost_center"],
                    item["designation"],
                    item["grade"],
                    item["employment_type"],
                    item["employment_status"],
                ]
            )
        ]

    status_counts = {
        "all": len(all_items),
        "ready": sum(1 for item in all_items if item["readiness_status"] == "ready"),
        "warning": sum(1 for item in all_items if item["readiness_status"] == "warning"),
        "blocked": sum(1 for item in all_items if item["readiness_status"] == "blocked"),
    }
    summary_items = list(all_items)
    if readiness_status and readiness_status != "all":
        all_items = [item for item in all_items if item["readiness_status"] == readiness_status]

    total_count = len(all_items)
    offset = (page - 1) * page_size
    items = all_items[offset : offset + page_size]
    summary = {
        "total_employees": status_counts["all"],
        "ready": status_counts["ready"],
        "warnings": status_counts["warning"],
        "blocked": status_counts["blocked"],
        "joiners": sum(
            1
            for item in summary_items
            if item["date_of_joining"] and period_start <= item["date_of_joining"] <= period_end
        ),
        "exits": sum(1 for item in summary_items if item["exit_date"] and period_start <= item["exit_date"] <= period_end),
        "pending_leave_requests": sum(item["pending_leave_requests"] for item in summary_items),
        "pending_attendance_regularizations": sum(item["pending_attendance_regularizations"] for item in summary_items),
        "missing_primary_bank_accounts": sum(1 for item in summary_items if not item["has_primary_bank_account"]),
    }

    return {
        "period": {
            "start": period_start,
            "end": period_end,
            "label": f"{period_start:%d %b %Y} - {period_end:%d %b %Y}",
            "days": period_days,
            "working_days": working_days,
        },
        "configuration": {
            "profile_key": profile.get("profile_key", PAYROLL_READINESS_CONFIG_KEY),
            "profile_name": profile.get("profile_name", "Source data readiness"),
            "version": profile.get("version", 1),
            "source": profile_source,
            "resolved_profile": profile,
        },
        "summary": summary,
        "items": items,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "has_next": offset + page_size < total_count,
        "has_previous": page > 1,
        "status_counts": status_counts,
    }


def get_hr_admin_employee_detail(employee: Employee, employee_id) -> dict | None:
    """Returns a single employee detail for HR admin web surfaces."""

    item = (
        Employee.objects.filter(tenant=employee.tenant, id=employee_id)
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
            "membership",
        )
        .annotate(
            assigned_role_count=Count("membership__membership_roles", distinct=True),
            direct_reports_count=Count("direct_reports", distinct=True),
        )
        .first()
    )
    if not item:
        return None

    return {
        "id": item.id,
        "employee_code": item.employee_code,
        "first_name": item.first_name,
        "middle_name": item.middle_name,
        "last_name": item.last_name,
        "full_name": _employee_display_name(item),
        "preferred_name": item.preferred_name,
        "work_email": item.work_email,
        "personal_email": item.personal_email,
        "phone_number": item.phone_number,
        "employment_status": item.employment_status,
        "date_of_birth": item.date_of_birth,
        "date_of_joining": item.date_of_joining,
        "probation_end_date": item.probation_end_date,
        "confirmation_date": item.confirmation_date,
        "legal_entity_id": item.legal_entity_id,
        "legal_entity": item.legal_entity.name if item.legal_entity else None,
        "branch_id": item.branch_id,
        "branch": item.branch.name if item.branch else None,
        "location_id": item.location_id,
        "location": item.location.name if item.location else None,
        "department_id": item.department_id,
        "department": item.department.name if item.department else None,
        "business_unit_id": item.business_unit_id,
        "business_unit": item.business_unit.name if item.business_unit else None,
        "cost_center_id": item.cost_center_id,
        "cost_center": item.cost_center.name if item.cost_center else None,
        "designation_id": item.designation_id,
        "designation": item.designation.name if item.designation else None,
        "grade_id": item.grade_id,
        "grade": item.grade.name if item.grade else None,
        "employment_type_id": item.employment_type_id,
        "employment_type": item.employment_type.name if item.employment_type else None,
        "reporting_manager_id": item.reporting_manager_id,
        "reporting_manager": _employee_display_name(item.reporting_manager) if item.reporting_manager else None,
        "has_access": bool(item.membership_id),
        "membership_status": item.membership.status if item.membership else "",
        "assigned_role_count": item.assigned_role_count,
        "direct_reports_count": item.direct_reports_count,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def get_hr_admin_employee_form_options(employee: Employee) -> dict:
    """Returns tenant-scoped option lists for HR admin employee forms."""

    tenant = employee.tenant

    def build_options(queryset, *, extra_fields: tuple[str, ...] = ()):
        items = []
        for item in queryset:
            payload = {"id": item.id, "name": item.name}
            for field in extra_fields:
                payload[field] = getattr(item, field)
            items.append(payload)
        return items

    return {
        "employment_statuses": [{"value": value, "label": label} for value, label in Employee._meta.get_field("employment_status").choices],
        "legal_entities": build_options(LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "branches": build_options(
            Branch.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("legal_entity_id", "location_id"),
        ),
        "locations": build_options(Location.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "departments": build_options(
            Department.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("business_unit_id",),
        ),
        "business_units": build_options(BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "cost_centers": build_options(
            CostCenter.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("legal_entity_id",),
        ),
        "designations": build_options(
            Designation.objects.filter(tenant=tenant, is_active=True).order_by("name"),
            extra_fields=("grade_id",),
        ),
        "grades": build_options(Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "employment_types": build_options(EmploymentType.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "managers": [
            {
                "id": item.id,
                "name": _employee_display_name(item),
                "employee_code": item.employee_code,
            }
            for item in Employee.objects.filter(tenant=tenant).exclude(id=employee.id).order_by("employee_code")
        ],
    }


def get_hr_admin_employee_access_options(employee: Employee) -> dict:
    """Returns tenant-scoped access options for employee onboarding."""

    return {
        "membership_statuses": [{"value": value, "label": label} for value, label in MembershipStatus.choices],
        "roles": [
            {
                "id": role.id,
                "code": role.code,
                "name": role.name,
            }
            for role in Role.objects.filter(tenant=employee.tenant, is_active=True).order_by("name")
        ],
    }


def get_hr_admin_employee_access_detail(employee: Employee, employee_id) -> dict | None:
    """Returns access and membership detail for an employee."""

    item = (
        Employee.objects.filter(tenant=employee.tenant, id=employee_id)
        .select_related("membership__user", "tenant")
        .prefetch_related("membership__membership_roles__role")
        .first()
    )
    if not item:
        return None

    membership = item.membership
    user = membership.user if membership else None
    membership_roles = list(membership.membership_roles.select_related("role").order_by("-is_primary", "role__name")) if membership else []

    return {
        "employee_id": item.id,
        "employee_code": item.employee_code,
        "employee_name": _employee_display_name(item),
        "has_access": bool(membership and user),
        "membership_id": membership.id if membership else None,
        "user_id": user.id if user else None,
        "username": user.username if user else "",
        "email": user.email if user else item.work_email,
        "first_name": user.first_name if user else item.first_name,
        "last_name": user.last_name if user else item.last_name,
        "display_name": user.display_name if user else _employee_display_name(item),
        "phone_number": user.phone_number if user else item.phone_number,
        "is_user_active": user.is_active if user else True,
        "must_change_password": user.must_change_password if user else True,
        "membership_status": membership.status if membership else MembershipStatus.ACTIVE,
        "is_default_membership": membership.is_default if membership else True,
        "role_ids": [membership_role.role_id for membership_role in membership_roles],
        "roles": [
            {
                "id": membership_role.role.id,
                "code": membership_role.role.code,
                "name": membership_role.role.name,
                "is_primary": membership_role.is_primary,
            }
            for membership_role in membership_roles
        ],
    }


def _organization_item_payload(item, *, extra: dict | None = None) -> dict:
    payload = {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "is_active": item.is_active,
    }
    if extra:
        payload.update(extra)
    return payload


def get_hr_admin_organization_form_options(employee: Employee) -> dict:
    """Returns tenant-scoped option lists for organization master forms."""

    tenant = employee.tenant

    def build_options(queryset):
        return [{"id": item.id, "name": item.name} for item in queryset]

    return {
        "legal_entities": build_options(LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "locations": build_options(Location.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "business_units": build_options(BusinessUnit.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "departments": build_options(Department.objects.filter(tenant=tenant, is_active=True).order_by("name")),
        "grades": build_options(Grade.objects.filter(tenant=tenant, is_active=True).order_by("name")),
    }


def get_hr_admin_organization_item_detail(employee: Employee, section: str, item_id) -> dict | None:
    """Returns detail payload for a single organization master item."""

    tenant = employee.tenant
    queryset_map = {
        "legal_entities": LegalEntity.objects.filter(tenant=tenant),
        "locations": Location.objects.filter(tenant=tenant),
        "branches": Branch.objects.filter(tenant=tenant).select_related("legal_entity", "location"),
        "business_units": BusinessUnit.objects.filter(tenant=tenant).select_related("parent"),
        "departments": Department.objects.filter(tenant=tenant).select_related("business_unit", "parent"),
        "grades": Grade.objects.filter(tenant=tenant),
        "designations": Designation.objects.filter(tenant=tenant).select_related("grade"),
        "employment_types": EmploymentType.objects.filter(tenant=tenant),
    }
    queryset = queryset_map.get(section)
    if queryset is None:
        return None
    item = queryset.filter(id=item_id).first()
    if not item:
        return None

    if section == "legal_entities":
        return _organization_item_payload(
            item,
            extra={
                "registered_name": item.registered_name,
                "country_code": item.country_code,
                "timezone": item.timezone,
                "primary_email": item.primary_email,
                "primary_phone": item.primary_phone,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, legal_entity=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, legal_entity=item).count(),
                "cost_centers_count": CostCenter.objects.filter(tenant=tenant, legal_entity=item).count(),
            },
        )
    if section == "locations":
        return _organization_item_payload(
            item,
            extra={
                "address_line_1": item.address_line_1,
                "address_line_2": item.address_line_2,
                "city": item.city,
                "state": item.state,
                "postal_code": item.postal_code,
                "country_code": item.country_code,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, location=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, location=item).count(),
            },
        )
    if section == "branches":
        return _organization_item_payload(
            item,
            extra={
                "legal_entity_id": item.legal_entity_id,
                "legal_entity": item.legal_entity.name,
                "location_id": item.location_id,
                "location": item.location.name if item.location else None,
                "branch_type": item.branch_type,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, branch=item).count(),
            },
        )
    if section == "business_units":
        return _organization_item_payload(
            item,
            extra={
                "parent_id": item.parent_id,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, business_unit=item).count(),
                "child_count": BusinessUnit.objects.filter(tenant=tenant, parent=item).count(),
                "departments_count": Department.objects.filter(tenant=tenant, business_unit=item).count(),
            },
        )
    if section == "departments":
        return _organization_item_payload(
            item,
            extra={
                "business_unit_id": item.business_unit_id,
                "business_unit": item.business_unit.name if item.business_unit else None,
                "parent_id": item.parent_id,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, department=item).count(),
                "child_count": Department.objects.filter(tenant=tenant, parent=item).count(),
            },
        )
    if section == "grades":
        return _organization_item_payload(
            item,
            extra={
                "level": item.level,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, grade=item).count(),
                "designations_count": Designation.objects.filter(tenant=tenant, grade=item).count(),
            },
        )
    if section == "designations":
        return _organization_item_payload(
            item,
            extra={
                "grade_id": item.grade_id,
                "grade": item.grade.name if item.grade else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, designation=item).count(),
            },
        )
    if section == "employment_types":
        return _organization_item_payload(
            item,
            extra={
                "description": item.description,
                "is_payroll_eligible": item.is_payroll_eligible,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, employment_type=item).count(),
            },
        )
    return None


def get_hr_admin_organization_snapshot(employee: Employee) -> dict:
    """Returns tenant organization master data for HR admin web surfaces."""

    tenant = employee.tenant

    legal_entities = [
        _organization_item_payload(
            item,
            extra={
                "country_code": item.country_code,
                "timezone": item.timezone,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, legal_entity=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, legal_entity=item).count(),
                "cost_centers_count": CostCenter.objects.filter(tenant=tenant, legal_entity=item).count(),
            },
        )
        for item in LegalEntity.objects.filter(tenant=tenant).order_by("name")
    ]
    locations = [
        _organization_item_payload(
            item,
            extra={
                "city": item.city,
                "state": item.state,
                "country_code": item.country_code,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, location=item).count(),
                "branches_count": Branch.objects.filter(tenant=tenant, location=item).count(),
            },
        )
        for item in Location.objects.filter(tenant=tenant).order_by("name")
    ]
    branches = [
        _organization_item_payload(
            item,
            extra={
                "legal_entity": item.legal_entity.name,
                "location": item.location.name if item.location else None,
                "branch_type": item.branch_type,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, branch=item).count(),
            },
        )
        for item in Branch.objects.filter(tenant=tenant).select_related("legal_entity", "location").order_by("name")
    ]
    business_units = [
        _organization_item_payload(
            item,
            extra={
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, business_unit=item).count(),
                "child_count": BusinessUnit.objects.filter(tenant=tenant, parent=item).count(),
                "departments_count": Department.objects.filter(tenant=tenant, business_unit=item).count(),
            },
        )
        for item in BusinessUnit.objects.filter(tenant=tenant).select_related("parent").order_by("name")
    ]
    departments = [
        _organization_item_payload(
            item,
            extra={
                "business_unit": item.business_unit.name if item.business_unit else None,
                "parent": item.parent.name if item.parent else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, department=item).count(),
                "child_count": Department.objects.filter(tenant=tenant, parent=item).count(),
            },
        )
        for item in Department.objects.filter(tenant=tenant).select_related("business_unit", "parent").order_by("name")
    ]
    grades = [
        _organization_item_payload(
            item,
            extra={
                "level": item.level,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, grade=item).count(),
                "designations_count": Designation.objects.filter(tenant=tenant, grade=item).count(),
            },
        )
        for item in Grade.objects.filter(tenant=tenant).order_by("name")
    ]
    designations = [
        _organization_item_payload(
            item,
            extra={
                "grade": item.grade.name if item.grade else None,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, designation=item).count(),
            },
        )
        for item in Designation.objects.filter(tenant=tenant).select_related("grade").order_by("name")
    ]
    employment_types = [
        _organization_item_payload(
            item,
            extra={
                "is_payroll_eligible": item.is_payroll_eligible,
                "linked_employees_count": Employee.objects.filter(tenant=tenant, employment_type=item).count(),
            },
        )
        for item in EmploymentType.objects.filter(tenant=tenant).order_by("name")
    ]

    return {
        "summary": {
            "legal_entities_count": len(legal_entities),
            "locations_count": len(locations),
            "branches_count": len(branches),
            "business_units_count": len(business_units),
            "departments_count": len(departments),
            "grades_count": len(grades),
            "designations_count": len(designations),
            "employment_types_count": len(employment_types),
        },
        "legal_entities": legal_entities,
        "locations": locations,
        "branches": branches,
        "business_units": business_units,
        "departments": departments,
        "grades": grades,
        "designations": designations,
        "employment_types": employment_types,
    }
