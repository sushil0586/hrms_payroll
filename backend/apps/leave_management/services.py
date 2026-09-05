"""Operational services for leave flows."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import Holiday, HolidayCalendar, HolidayType
from apps.iam.models import MembershipStatus, TenantMembership
from apps.leave_management.models import (
    LeaveBalance,
    LeaveBalanceTransaction,
    LeaveDayPortion,
    LeavePolicy,
    LeavePolicyAssignment,
    LeaveRequest,
    LeaveRequestStatus,
)
from apps.notifications.services import trigger_notification_event
from apps.workflows.models import WorkflowActorType, WorkflowAction, WorkflowInstanceStatus, WorkflowModule
from apps.workflows.services import create_workflow_instance, resolve_workflow_action

LEAVE_APPROVAL_ROUTES = {
    "manager_only",
    "manager_then_second_level",
    "manager_then_hr",
    "manager_second_level_hr",
}

DEFAULT_LEAVE_POLICY_CONFIG = {
    "version": 1,
    "approval": {
        "default_route": "manager_only",
        "escalation_route": None,
        "escalate_when_units_gte": None,
        "second_level_owner_employee_id": None,
        "hr_owner_employee_id": None,
    },
    "evidence": {
        "attachment_required": False,
        "attachment_label": "supporting document",
        "required_when_units_gte": None,
        "medical_certificate_when_units_gte": None,
        "approval_route_when_evidence_required": None,
    },
    "entitlement": {
        "grant_mode": "scheduled",
        "proration_mode": "none",
        "policy_year_start_month": 1,
        "policy_year_start_day": 1,
        "carry_forward_mode": "limited",
        "carry_forward_cap": None,
        "encashment_allowed": False,
        "encashment_cap": None,
        "probation_accrual_mode": "accrue",
    },
    "operations": {
        "reviewer_employee_id": None,
        "approval_required_for_encashment": False,
        "approval_required_for_debit_adjustment": False,
        "credit_adjustment_requires_approval_over_units": None,
        "debit_adjustment_requires_approval_over_units": None,
        "encashment_requires_approval_over_units": None,
    },
    "lifecycle": {
        "allow_employee_withdraw_pending": True,
        "withdraw_notice_hours_before_start": None,
        "withdraw_requires_attachment": False,
        "withdraw_attachment_label": "withdrawal evidence",
        "allow_employee_cancel_approved": False,
        "cancel_approved_requires_reapproval": False,
        "cancel_approval_route": None,
        "cancel_notice_hours_before_start": None,
        "cancel_requires_attachment": False,
        "cancel_attachment_label": "cancellation evidence",
    },
    "holiday_governance": {
        "enabled": False,
        "allowed_holiday_types": [],
        "require_matching_holiday_dates": True,
        "max_paid_units_per_period": None,
        "count_pending_requests_towards_cap": True,
        "paid_cap_exhaustion_action": "block",
    },
}

LEAVE_ASSIGNMENT_SCOPE_FIELDS = (
    "legal_entity_id",
    "branch_id",
    "department_id",
    "grade_id",
    "employment_type_id",
    "employee_id",
)

LEAVE_GRANT_MODES = {"upfront", "scheduled"}
LEAVE_PRORATION_MODES = {"none", "by_join_month"}
LEAVE_CARRY_FORWARD_MODES = {"none", "limited"}
LEAVE_PROBATION_ACCRUAL_MODES = {"accrue", "defer"}
LEAVE_BALANCE_ADMIN_ACTIONS = {"credit_adjustment", "debit_adjustment", "encashment"}
LEAVE_HOLIDAY_CAP_ACTIONS = {"block"}


def _normalize_decimal_string(value) -> str | None:
    if value in (None, ""):
        return None
    try:
        normalized = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return f"{normalized:.2f}"


def _parse_decimal(value) -> Decimal | None:
    normalized = _normalize_decimal_string(value)
    if normalized is None:
        return None
    return Decimal(normalized)


def normalize_leave_policy_config(snapshot) -> dict:
    raw = snapshot if isinstance(snapshot, dict) else {}
    approval_raw = raw.get("approval") if isinstance(raw.get("approval"), dict) else {}
    evidence_raw = raw.get("evidence") if isinstance(raw.get("evidence"), dict) else {}
    entitlement_raw = raw.get("entitlement") if isinstance(raw.get("entitlement"), dict) else {}
    operations_raw = raw.get("operations") if isinstance(raw.get("operations"), dict) else {}
    lifecycle_raw = raw.get("lifecycle") if isinstance(raw.get("lifecycle"), dict) else {}
    holiday_governance_raw = raw.get("holiday_governance") if isinstance(raw.get("holiday_governance"), dict) else {}

    default_route = approval_raw.get("default_route")
    if default_route not in LEAVE_APPROVAL_ROUTES:
        default_route = DEFAULT_LEAVE_POLICY_CONFIG["approval"]["default_route"]

    escalation_route = approval_raw.get("escalation_route")
    if escalation_route not in LEAVE_APPROVAL_ROUTES:
        escalation_route = None

    approval_route_when_evidence_required = evidence_raw.get("approval_route_when_evidence_required")
    if approval_route_when_evidence_required not in LEAVE_APPROVAL_ROUTES:
        approval_route_when_evidence_required = None

    attachment_label = str(evidence_raw.get("attachment_label") or "").strip() or DEFAULT_LEAVE_POLICY_CONFIG["evidence"]["attachment_label"]
    grant_mode = entitlement_raw.get("grant_mode")
    if grant_mode not in LEAVE_GRANT_MODES:
        grant_mode = DEFAULT_LEAVE_POLICY_CONFIG["entitlement"]["grant_mode"]

    proration_mode = entitlement_raw.get("proration_mode")
    if proration_mode not in LEAVE_PRORATION_MODES:
        proration_mode = DEFAULT_LEAVE_POLICY_CONFIG["entitlement"]["proration_mode"]

    carry_forward_mode = entitlement_raw.get("carry_forward_mode")
    if carry_forward_mode not in LEAVE_CARRY_FORWARD_MODES:
        carry_forward_mode = DEFAULT_LEAVE_POLICY_CONFIG["entitlement"]["carry_forward_mode"]

    probation_accrual_mode = entitlement_raw.get("probation_accrual_mode")
    if probation_accrual_mode not in LEAVE_PROBATION_ACCRUAL_MODES:
        probation_accrual_mode = DEFAULT_LEAVE_POLICY_CONFIG["entitlement"]["probation_accrual_mode"]

    try:
        policy_year_start_month = int(entitlement_raw.get("policy_year_start_month", 1))
    except (TypeError, ValueError):
        policy_year_start_month = 1
    if policy_year_start_month < 1 or policy_year_start_month > 12:
        policy_year_start_month = 1

    try:
        policy_year_start_day = int(entitlement_raw.get("policy_year_start_day", 1))
    except (TypeError, ValueError):
        policy_year_start_day = 1
    if policy_year_start_day < 1 or policy_year_start_day > 28:
        policy_year_start_day = 1

    allowed_holiday_types = [
        holiday_type
        for holiday_type in holiday_governance_raw.get("allowed_holiday_types", [])
        if holiday_type in HolidayType.values
    ]
    paid_cap_exhaustion_action = holiday_governance_raw.get("paid_cap_exhaustion_action")
    if paid_cap_exhaustion_action not in LEAVE_HOLIDAY_CAP_ACTIONS:
        paid_cap_exhaustion_action = DEFAULT_LEAVE_POLICY_CONFIG["holiday_governance"]["paid_cap_exhaustion_action"]

    return {
        "version": 1,
        "approval": {
            "default_route": default_route,
            "escalation_route": escalation_route,
            "escalate_when_units_gte": _normalize_decimal_string(approval_raw.get("escalate_when_units_gte")),
            "second_level_owner_employee_id": str(approval_raw.get("second_level_owner_employee_id") or "").strip() or None,
            "hr_owner_employee_id": str(approval_raw.get("hr_owner_employee_id") or "").strip() or None,
        },
        "evidence": {
            "attachment_required": bool(evidence_raw.get("attachment_required", False)),
            "attachment_label": attachment_label,
            "required_when_units_gte": _normalize_decimal_string(evidence_raw.get("required_when_units_gte")),
            "medical_certificate_when_units_gte": _normalize_decimal_string(
                evidence_raw.get("medical_certificate_when_units_gte")
            ),
            "approval_route_when_evidence_required": approval_route_when_evidence_required,
        },
        "entitlement": {
            "grant_mode": grant_mode,
            "proration_mode": proration_mode,
            "policy_year_start_month": policy_year_start_month,
            "policy_year_start_day": policy_year_start_day,
            "carry_forward_mode": carry_forward_mode,
            "carry_forward_cap": _normalize_decimal_string(entitlement_raw.get("carry_forward_cap")),
            "encashment_allowed": bool(entitlement_raw.get("encashment_allowed", False)),
            "encashment_cap": _normalize_decimal_string(entitlement_raw.get("encashment_cap")),
            "probation_accrual_mode": probation_accrual_mode,
        },
        "operations": {
            "reviewer_employee_id": str(operations_raw.get("reviewer_employee_id") or "").strip() or None,
            "approval_required_for_encashment": bool(operations_raw.get("approval_required_for_encashment", False)),
            "approval_required_for_debit_adjustment": bool(operations_raw.get("approval_required_for_debit_adjustment", False)),
            "credit_adjustment_requires_approval_over_units": _normalize_decimal_string(
                operations_raw.get("credit_adjustment_requires_approval_over_units")
            ),
            "debit_adjustment_requires_approval_over_units": _normalize_decimal_string(
                operations_raw.get("debit_adjustment_requires_approval_over_units")
            ),
            "encashment_requires_approval_over_units": _normalize_decimal_string(
                operations_raw.get("encashment_requires_approval_over_units")
            ),
        },
        "lifecycle": {
            "allow_employee_withdraw_pending": bool(lifecycle_raw.get("allow_employee_withdraw_pending", True)),
            "withdraw_notice_hours_before_start": _normalize_decimal_string(lifecycle_raw.get("withdraw_notice_hours_before_start")),
            "withdraw_requires_attachment": bool(lifecycle_raw.get("withdraw_requires_attachment", False)),
            "withdraw_attachment_label": str(lifecycle_raw.get("withdraw_attachment_label") or "").strip() or "withdrawal evidence",
            "allow_employee_cancel_approved": bool(lifecycle_raw.get("allow_employee_cancel_approved", False)),
            "cancel_approved_requires_reapproval": bool(lifecycle_raw.get("cancel_approved_requires_reapproval", False)),
            "cancel_approval_route": (
                lifecycle_raw.get("cancel_approval_route")
                if lifecycle_raw.get("cancel_approval_route") in LEAVE_APPROVAL_ROUTES
                else None
            ),
            "cancel_notice_hours_before_start": _normalize_decimal_string(lifecycle_raw.get("cancel_notice_hours_before_start")),
            "cancel_requires_attachment": bool(lifecycle_raw.get("cancel_requires_attachment", False)),
            "cancel_attachment_label": str(lifecycle_raw.get("cancel_attachment_label") or "").strip() or "cancellation evidence",
        },
        "holiday_governance": {
            "enabled": bool(holiday_governance_raw.get("enabled", False)),
            "allowed_holiday_types": allowed_holiday_types,
            "require_matching_holiday_dates": bool(holiday_governance_raw.get("require_matching_holiday_dates", True)),
            "max_paid_units_per_period": _normalize_decimal_string(holiday_governance_raw.get("max_paid_units_per_period")),
            "count_pending_requests_towards_cap": bool(holiday_governance_raw.get("count_pending_requests_towards_cap", True)),
            "paid_cap_exhaustion_action": paid_cap_exhaustion_action,
        },
    }


def _get_policy_year_start(policy_config: dict, *, as_of: date) -> date:
    entitlement = policy_config.get("entitlement", {})
    month = int(entitlement.get("policy_year_start_month") or 1)
    day = int(entitlement.get("policy_year_start_day") or 1)
    start = date(as_of.year, month, day)
    if as_of < start:
        start = date(as_of.year - 1, month, day)
    return start


def _get_policy_year_end(policy_config: dict, *, as_of: date) -> date:
    start = _get_policy_year_start(policy_config, as_of=as_of)
    return date(start.year + 1, start.month, start.day) - timedelta(days=1)


def _get_policy_period_year(policy_config: dict, *, as_of: date) -> int:
    return _get_policy_year_start(policy_config, as_of=as_of).year


def _resolve_employee_holiday_calendars(employee, *, years: set[int]) -> list[HolidayCalendar]:
    calendars = list(
        HolidayCalendar.objects.filter(
            tenant=employee.tenant,
            is_active=True,
            year__in=sorted(years),
        )
        .prefetch_related("holidays")
        .order_by("year", "created_at")
    )
    matches: list[tuple[int, HolidayCalendar]] = []
    for calendar in calendars:
        if calendar.location_id and calendar.location_id != employee.location_id:
            continue
        if calendar.branch_id and calendar.branch_id != employee.branch_id:
            continue
        if calendar.legal_entity_id and calendar.legal_entity_id != employee.legal_entity_id:
            continue
        specificity = sum(bool(value) for value in [calendar.legal_entity_id, calendar.branch_id, calendar.location_id])
        matches.append((specificity, calendar))
    matches.sort(key=lambda item: (-item[0], item[1].year, item[1].created_at))
    selected_by_year: dict[int, HolidayCalendar] = {}
    for _, calendar in matches:
        selected_by_year.setdefault(calendar.year, calendar)
    return list(selected_by_year.values())


def _get_holidays_in_range(*, employee, start_date: date, end_date: date) -> list[Holiday]:
    years = set(range(start_date.year, end_date.year + 1))
    calendars = _resolve_employee_holiday_calendars(employee, years=years)
    holidays: list[Holiday] = []
    for calendar in calendars:
        for holiday in calendar.holidays.all():
            if start_date <= holiday.date <= end_date:
                holidays.append(holiday)
    holidays.sort(key=lambda holiday: holiday.date)
    return holidays


def get_leave_policy_period_year(*, leave_policy: LeavePolicy, as_of: date) -> int:
    return _get_policy_period_year(normalize_leave_policy_config(leave_policy.config_snapshot), as_of=as_of)


def _calculate_prorated_entitlement(*, employee, leave_policy: LeavePolicy, as_of: date, policy_config: dict) -> Decimal:
    annual_entitlement = Decimal(leave_policy.annual_entitlement or 0)
    if annual_entitlement <= 0:
        return Decimal("0.00")
    if policy_config["entitlement"]["probation_accrual_mode"] == "defer" and _is_employee_on_probation(employee, as_of=as_of):
        return Decimal("0.00")

    if policy_config["entitlement"]["proration_mode"] != "by_join_month" or not employee.date_of_joining:
        return annual_entitlement

    period_start = _get_policy_year_start(policy_config, as_of=as_of)
    period_end = _get_policy_year_end(policy_config, as_of=as_of)
    if employee.date_of_joining <= period_start:
        return annual_entitlement
    if employee.date_of_joining > period_end:
        return Decimal("0.00")

    join_month_index = (employee.date_of_joining.year * 12) + employee.date_of_joining.month
    period_end_month_index = (period_end.year * 12) + period_end.month
    months_remaining = max(period_end_month_index - join_month_index + 1, 0)
    prorated = (annual_entitlement * Decimal(months_remaining) / Decimal("12")).quantize(Decimal("0.01"))
    return max(prorated, Decimal("0.00"))


def _calculate_scheduled_accrual(*, entitlement: Decimal, leave_policy: LeavePolicy, as_of: date, policy_config: dict) -> Decimal:
    if entitlement <= 0:
        return Decimal("0.00")
    if policy_config["entitlement"]["grant_mode"] == "upfront":
        return entitlement

    policy_year_start = _get_policy_year_start(policy_config, as_of=as_of)
    if as_of < policy_year_start:
        return Decimal("0.00")

    if leave_policy.accrual_frequency == "monthly":
        months_elapsed = ((as_of.year - policy_year_start.year) * 12) + (as_of.month - policy_year_start.month) + 1
        months_elapsed = min(max(months_elapsed, 0), 12)
        return (entitlement * Decimal(months_elapsed) / Decimal("12")).quantize(Decimal("0.01"))
    if leave_policy.accrual_frequency == "quarterly":
        months_elapsed = ((as_of.year - policy_year_start.year) * 12) + (as_of.month - policy_year_start.month)
        quarters_elapsed = min(max((months_elapsed // 3) + 1, 0), 4)
        return (entitlement * Decimal(quarters_elapsed) / Decimal("4")).quantize(Decimal("0.01"))
    if leave_policy.accrual_frequency == "yearly":
        return entitlement
    return entitlement


def _calculate_carry_forward_amount(*, employee, leave_policy: LeavePolicy, policy_period_year: int, policy_config: dict) -> Decimal:
    if policy_config["entitlement"]["carry_forward_mode"] == "none":
        return Decimal("0.00")

    cap = _parse_decimal(policy_config["entitlement"].get("carry_forward_cap"))
    if cap is None:
        cap = Decimal(leave_policy.max_carry_forward or 0)
    if cap <= 0:
        return Decimal("0.00")

    previous_balance = (
        LeaveBalance.objects.filter(
            employee=employee,
            tenant=employee.tenant,
            leave_policy=leave_policy,
            period_year=policy_period_year - 1,
        )
        .only("closing_balance")
        .first()
    )
    if not previous_balance:
        return Decimal("0.00")
    return min(Decimal(previous_balance.closing_balance or 0), cap).quantize(Decimal("0.01"))


def _build_leave_request_policy_runtime(*, leave_type, leave_policy: LeavePolicy | None, requested_units: Decimal) -> dict:
    config = normalize_leave_policy_config(leave_policy.config_snapshot if leave_policy else {})
    approval = config["approval"]
    evidence = config["evidence"]

    approval_route = approval["default_route"]
    escalation_threshold = _parse_decimal(approval.get("escalate_when_units_gte"))
    if approval.get("escalation_route") and escalation_threshold is not None and requested_units >= escalation_threshold:
        approval_route = approval["escalation_route"]

    attachment_label = evidence["attachment_label"]
    required_attachment_reason = None
    if leave_type.requires_attachment or evidence.get("attachment_required"):
        required_attachment_reason = f"{attachment_label.capitalize()} is required for this leave type."

    generic_threshold = _parse_decimal(evidence.get("required_when_units_gte"))
    if generic_threshold is not None and requested_units >= generic_threshold:
        required_attachment_reason = (
            f"{attachment_label.capitalize()} is required for requests of {generic_threshold:.2f} units or more."
        )

    medical_threshold = _parse_decimal(evidence.get("medical_certificate_when_units_gte"))
    if medical_threshold is not None and requested_units >= medical_threshold:
        attachment_label = "medical certificate"
        required_attachment_reason = (
            f"Medical certificate is required for requests of {medical_threshold:.2f} units or more."
        )

    if required_attachment_reason and evidence.get("approval_route_when_evidence_required"):
        approval_route = evidence["approval_route_when_evidence_required"]

    return {
        "config": config,
        "approval_route": approval_route,
        "required_attachment_label": attachment_label if required_attachment_reason else None,
        "required_attachment_reason": required_attachment_reason,
    }


def _assignment_scope_labels(assignment: LeavePolicyAssignment) -> list[str]:
    labels: list[str] = []
    if assignment.employee_id and assignment.employee:
        labels.append(f"Employee: {assignment.employee.employee_code}")
    if assignment.legal_entity_id and assignment.legal_entity:
        labels.append(f"Legal entity: {assignment.legal_entity.name}")
    if assignment.branch_id and assignment.branch:
        labels.append(f"Branch: {assignment.branch.name}")
    if assignment.department_id and assignment.department:
        labels.append(f"Department: {assignment.department.name}")
    if assignment.grade_id and assignment.grade:
        labels.append(f"Grade: {assignment.grade.name}")
    if assignment.employment_type_id and assignment.employment_type:
        labels.append(f"Employment type: {assignment.employment_type.name}")
    return labels


def _assignment_scope_value(source, field_name: str):
    if isinstance(source, dict):
        return source.get(field_name)
    return getattr(source, field_name, None)


def _assignment_scope_is_exact_match(left, right) -> bool:
    return all(_assignment_scope_value(left, field_name) == _assignment_scope_value(right, field_name) for field_name in LEAVE_ASSIGNMENT_SCOPE_FIELDS)


def _employee_matches_assignment_scope(employee, assignment_scope) -> bool:
    assignment_employee_id = _assignment_scope_value(assignment_scope, "employee_id")
    if assignment_employee_id and str(assignment_employee_id) != str(employee.id):
        return False
    if _assignment_scope_value(assignment_scope, "legal_entity_id") and _assignment_scope_value(assignment_scope, "legal_entity_id") != employee.legal_entity_id:
        return False
    if _assignment_scope_value(assignment_scope, "branch_id") and _assignment_scope_value(assignment_scope, "branch_id") != employee.branch_id:
        return False
    if _assignment_scope_value(assignment_scope, "department_id") and _assignment_scope_value(assignment_scope, "department_id") != employee.department_id:
        return False
    if _assignment_scope_value(assignment_scope, "grade_id") and _assignment_scope_value(assignment_scope, "grade_id") != employee.grade_id:
        return False
    if _assignment_scope_value(assignment_scope, "employment_type_id") and _assignment_scope_value(assignment_scope, "employment_type_id") != employee.employment_type_id:
        return False
    return True


def _assignment_scopes_overlap(candidate_scope, existing_assignment: LeavePolicyAssignment) -> bool:
    candidate_employee_id = _assignment_scope_value(candidate_scope, "employee_id")
    existing_employee_id = existing_assignment.employee_id
    if candidate_employee_id and existing_employee_id:
        return str(candidate_employee_id) == str(existing_employee_id)
    if candidate_employee_id:
        candidate_employee = existing_assignment.employee.__class__.objects.filter(
            tenant=existing_assignment.tenant,
            id=candidate_employee_id,
        ).first()
        return bool(candidate_employee and _employee_matches_assignment_scope(candidate_employee, existing_assignment))
    if existing_employee_id and existing_assignment.employee:
        return _employee_matches_assignment_scope(existing_assignment.employee, candidate_scope)

    for field_name in LEAVE_ASSIGNMENT_SCOPE_FIELDS:
        if field_name == "employee_id":
            continue
        candidate_value = _assignment_scope_value(candidate_scope, field_name)
        existing_value = getattr(existing_assignment, field_name)
        if candidate_value and existing_value and candidate_value != existing_value:
            return False
    return True


def _assignment_scope_specificity(assignment_scope) -> int:
    return sum(1 for field_name in LEAVE_ASSIGNMENT_SCOPE_FIELDS if _assignment_scope_value(assignment_scope, field_name))


def _describe_assignment_overlap_kind(candidate_scope, existing_assignment: LeavePolicyAssignment) -> str:
    if _assignment_scope_is_exact_match(candidate_scope, existing_assignment):
        return "exact_scope"
    candidate_specificity = _assignment_scope_specificity(candidate_scope)
    existing_specificity = _assignment_scope_specificity(existing_assignment)
    if candidate_specificity > existing_specificity:
        return "draft_narrower"
    if candidate_specificity < existing_specificity:
        return "draft_broader"
    return "mixed_overlap"


def _describe_assignment_priority_effect(*, candidate_priority: int, existing_priority: int) -> str:
    if candidate_priority < existing_priority:
        return "draft_wins"
    if candidate_priority > existing_priority:
        return "existing_wins"
    return "same_priority"


def _build_assignment_scope_labels_from_scope(scope_data, *, tenant=None) -> list[str]:
    labels: list[str] = []
    employee_id = _assignment_scope_value(scope_data, "employee_id")
    if employee_id and tenant:
        employee = (
            LeavePolicyAssignment.employee.field.related_model.objects.filter(tenant=tenant, id=employee_id)
            .only("employee_code")
            .first()
        )
        if employee:
            labels.append(f"Employee: {employee.employee_code}")

    relation_specs = (
        ("legal_entity_id", LeavePolicyAssignment.legal_entity.field.related_model, "Legal entity"),
        ("branch_id", LeavePolicyAssignment.branch.field.related_model, "Branch"),
        ("department_id", LeavePolicyAssignment.department.field.related_model, "Department"),
        ("grade_id", LeavePolicyAssignment.grade.field.related_model, "Grade"),
        ("employment_type_id", LeavePolicyAssignment.employment_type.field.related_model, "Employment type"),
    )
    for field_name, model_class, label in relation_specs:
        raw_value = _assignment_scope_value(scope_data, field_name)
        if raw_value and tenant:
            related = model_class.objects.filter(tenant=tenant, id=raw_value).only("name").first()
            if related:
                labels.append(f"{label}: {related.name}")
    return labels


def preview_leave_policy_assignment_conflicts(
    *,
    tenant,
    leave_policy: LeavePolicy,
    scope_data: dict,
    priority: int,
    item_id: str | None = None,
) -> dict:
    assignments = (
        LeavePolicyAssignment.objects.filter(
            tenant=tenant,
            leave_policy__leave_type=leave_policy.leave_type,
            is_active=True,
        )
        .exclude(id=item_id)
        .select_related(
            "leave_policy",
            "leave_policy__leave_type",
            "employee",
            "legal_entity",
            "branch",
            "department",
            "grade",
            "employment_type",
        )
        .order_by("priority", "created_at")
    )

    conflicts: list[dict] = []
    has_blocking_conflict = False
    candidate_scope_labels = _build_assignment_scope_labels_from_scope(scope_data, tenant=tenant)
    for assignment in assignments:
        if not _assignment_scopes_overlap(scope_data, assignment):
            continue
        overlap_kind = _describe_assignment_overlap_kind(scope_data, assignment)
        priority_effect = _describe_assignment_priority_effect(
            candidate_priority=priority,
            existing_priority=assignment.priority,
        )
        is_same_priority = priority == assignment.priority
        is_exact_scope = overlap_kind == "exact_scope"
        is_same_granularity = (
            _leave_assignment_resolution_signature(scope_data)
            == _leave_assignment_resolution_signature(assignment)
        )
        if is_same_priority and (is_exact_scope or is_same_granularity):
            has_blocking_conflict = True
        conflicts.append(
            {
                "assignment_id": str(assignment.id),
                "policy_id": str(assignment.leave_policy_id),
                "policy_name": assignment.leave_policy.name,
                "leave_type_id": str(assignment.leave_policy.leave_type_id),
                "leave_type_name": assignment.leave_policy.leave_type.name,
                "priority": assignment.priority,
                "scope_labels": _assignment_scope_labels(assignment),
                "overlap_kind": overlap_kind,
                "priority_effect": priority_effect,
                "is_exact_scope": is_exact_scope,
                "is_same_priority": is_same_priority,
                "is_same_granularity": is_same_granularity,
            }
        )

    if has_blocking_conflict:
        summary = (
            "This assignment would create an ambiguous active route because another active assignment for the same leave type "
            "already overlaps at the same priority and effective granularity."
        )
    elif conflicts:
        summary = (
            "This scope overlaps with other active assignments for the same leave type. Review the priority order before rollout."
        )
    else:
        summary = "No active overlap detected for this leave assignment."

    return {
        "has_conflicts": bool(conflicts),
        "has_blocking_conflict": has_blocking_conflict,
        "summary": summary,
        "candidate_scope": candidate_scope_labels,
        "conflicts": conflicts,
    }


def preview_leave_policy_assignment_resolution(*, employee, leave_type) -> dict:
    assignment = _find_matching_leave_policy_assignment(employee, leave_type)
    if not assignment:
        return {
            "has_resolution": False,
            "employee_id": str(employee.id),
            "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
            "leave_type_id": str(leave_type.id),
            "leave_type_name": leave_type.name,
            "policy_id": None,
            "policy_name": None,
            "assignment_id": None,
            "priority": None,
            "scope_labels": [],
            "summary": "No active leave assignment resolves for this employee and leave type.",
        }

    return {
        "has_resolution": True,
        "employee_id": str(employee.id),
        "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
        "leave_type_id": str(leave_type.id),
        "leave_type_name": leave_type.name,
        "policy_id": str(assignment.leave_policy_id),
        "policy_name": assignment.leave_policy.name,
        "assignment_id": str(assignment.id),
        "priority": assignment.priority,
        "scope_labels": _assignment_scope_labels(assignment),
        "summary": f"{assignment.leave_policy.name} currently resolves for this employee.",
    }


def _build_leave_entitlement_preview(*, employee, leave_policy: LeavePolicy, as_of: date, policy_config: dict) -> dict:
    policy_period_year = _get_policy_period_year(policy_config, as_of=as_of)
    policy_year_start = _get_policy_year_start(policy_config, as_of=as_of)
    policy_year_end = _get_policy_year_end(policy_config, as_of=as_of)
    prorated_entitlement = _calculate_prorated_entitlement(
        employee=employee,
        leave_policy=leave_policy,
        as_of=as_of,
        policy_config=policy_config,
    )
    scheduled_accrual = _calculate_scheduled_accrual(
        entitlement=prorated_entitlement,
        leave_policy=leave_policy,
        as_of=as_of,
        policy_config=policy_config,
    )
    carry_forward_amount = _calculate_carry_forward_amount(
        employee=employee,
        leave_policy=leave_policy,
        policy_period_year=policy_period_year,
        policy_config=policy_config,
    )
    return {
        "policy_period_year": policy_period_year,
        "policy_year_start": policy_year_start.isoformat(),
        "policy_year_end": policy_year_end.isoformat(),
        "prorated_entitlement": f"{prorated_entitlement:.2f}",
        "projected_accrued_amount": f"{scheduled_accrual:.2f}",
        "projected_carry_forward_amount": f"{carry_forward_amount:.2f}",
    }


def _membership_display_name(membership: TenantMembership | None) -> str:
    if not membership:
        return ""
    user = getattr(membership, "user", None)
    if not user:
        return membership.employee_code or ""
    return user.display_name or user.get_full_name() or user.username or membership.employee_code or ""


def _get_second_level_manager_membership(employee, *, second_level_owner_employee_id: str | None = None) -> TenantMembership | None:
    if second_level_owner_employee_id:
        configured_employee = (
            employee.__class__.objects.filter(
                tenant=employee.tenant,
                id=second_level_owner_employee_id,
            )
            .select_related("membership")
            .first()
        )
        configured_membership = getattr(configured_employee, "membership", None) if configured_employee else None
        if configured_membership and configured_membership.status == MembershipStatus.ACTIVE:
            return configured_membership
    first_level = getattr(employee, "reporting_manager", None)
    second_level = getattr(first_level, "reporting_manager", None) if first_level else None
    membership = getattr(second_level, "membership", None) if second_level else None
    if membership and membership.status == MembershipStatus.ACTIVE:
        return membership
    return None


def _get_hr_owner_membership(employee, *, hr_owner_employee_id: str | None = None) -> TenantMembership | None:
    if hr_owner_employee_id:
        configured_employee = (
            employee.__class__.objects.filter(
                tenant=employee.tenant,
                id=hr_owner_employee_id,
            )
            .select_related("membership")
            .first()
        )
        configured_membership = getattr(configured_employee, "membership", None) if configured_employee else None
        if configured_membership and configured_membership.status == MembershipStatus.ACTIVE:
            return configured_membership
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


def _build_leave_approval_steps(
    *,
    employee,
    approval_route: str,
    second_level_owner_employee_id: str | None = None,
    hr_owner_employee_id: str | None = None,
) -> list[dict]:
    manager_membership = getattr(employee.reporting_manager, "membership", None) if employee.reporting_manager else None
    second_level_membership = _get_second_level_manager_membership(
        employee,
        second_level_owner_employee_id=second_level_owner_employee_id,
    )
    hr_owner_membership = _get_hr_owner_membership(
        employee,
        hr_owner_employee_id=hr_owner_employee_id,
    )

    route_map = {
        "manager_only": [("Manager Approval", manager_membership, WorkflowActorType.MANAGER)],
        "manager_then_second_level": [
            ("Manager Approval", manager_membership, WorkflowActorType.MANAGER),
            ("Second-Level Manager Approval", second_level_membership, WorkflowActorType.MANAGER),
        ],
        "manager_then_hr": [
            ("Manager Approval", manager_membership, WorkflowActorType.MANAGER),
            ("HR Review", hr_owner_membership, WorkflowActorType.HR_OWNER),
        ],
        "manager_second_level_hr": [
            ("Manager Approval", manager_membership, WorkflowActorType.MANAGER),
            ("Second-Level Manager Approval", second_level_membership, WorkflowActorType.MANAGER),
            ("HR Review", hr_owner_membership, WorkflowActorType.HR_OWNER),
        ],
    }

    configured_steps = route_map.get(approval_route) or route_map["manager_only"]
    approval_steps: list[dict] = []
    for name, membership, actor_type in configured_steps:
        if membership:
            approval_steps.append(
                {
                    "name": name,
                    "actor_type": actor_type,
                    "membership": membership,
                    "actor_identifier": str(membership.user_id),
                }
            )
    if not approval_steps and manager_membership:
        approval_steps.append(
            {
                "name": "Manager Approval",
                "actor_type": WorkflowActorType.MANAGER,
                "membership": manager_membership,
                "actor_identifier": str(manager_membership.user_id),
            }
        )
    return approval_steps


def preview_leave_policy_configuration(
    *,
    employee,
    leave_type,
    requested_units: Decimal,
    config_snapshot,
    policy_id: str | None = None,
) -> dict:
    policy_stub = LeavePolicy(tenant=employee.tenant, leave_type=leave_type, config_snapshot=config_snapshot or {})
    current_assignment = _find_matching_leave_policy_assignment(employee, leave_type)
    policy_runtime = _build_leave_request_policy_runtime(
        leave_type=leave_type,
        leave_policy=policy_stub,
        requested_units=requested_units,
    )
    approval_steps = _build_leave_approval_steps(
        employee=employee,
        approval_route=policy_runtime["approval_route"],
        second_level_owner_employee_id=policy_runtime["config"]["approval"].get("second_level_owner_employee_id"),
        hr_owner_employee_id=policy_runtime["config"]["approval"].get("hr_owner_employee_id"),
    )
    entitlement_preview = _build_leave_entitlement_preview(
        employee=employee,
        leave_policy=policy_stub,
        as_of=timezone.localdate(),
        policy_config=policy_runtime["config"],
    )
    return {
        "approval_route": policy_runtime["approval_route"],
        "required_attachment_label": policy_runtime["required_attachment_label"],
        "required_attachment_reason": policy_runtime["required_attachment_reason"],
        "current_resolved_policy_id": str(current_assignment.leave_policy_id) if current_assignment else None,
        "current_resolved_policy_name": current_assignment.leave_policy.name if current_assignment else None,
        "current_assignment_id": str(current_assignment.id) if current_assignment else None,
        "current_assignment_priority": current_assignment.priority if current_assignment else None,
        "current_assignment_scope": _assignment_scope_labels(current_assignment) if current_assignment else [],
        "draft_policy_matches_current_resolution": bool(
            policy_id and current_assignment and str(current_assignment.leave_policy_id) == str(policy_id)
        ),
        "steps": [
            {
                "step_order": index,
                "name": step["name"],
                "actor_type": step["actor_type"],
                "actor_identifier": step["actor_identifier"],
                "actor_name": _membership_display_name(step.get("membership")),
            }
            for index, step in enumerate(approval_steps, start=1)
        ],
        "resolved_config": policy_runtime["config"],
        "entitlement_preview": entitlement_preview,
    }


def _leave_assignment_resolution_signature(assignment_scope) -> tuple[int, int, int]:
    def scope_value(field_name: str):
        if isinstance(assignment_scope, dict):
            return assignment_scope.get(field_name)
        return getattr(assignment_scope, field_name, None)

    if scope_value("employee_id"):
        return (99, 99, 99)

    rank_map = (
        (scope_value("grade_id"), 4),
        (scope_value("employment_type_id"), 4),
        (scope_value("department_id"), 3),
        (scope_value("branch_id"), 2),
        (scope_value("legal_entity_id"), 1),
    )
    present_ranks = [rank for value, rank in rank_map if value]
    return (
        len(present_ranks),
        max(present_ranks, default=0),
        sum(present_ranks),
    )


def _find_matching_leave_policy_assignment(employee, leave_type) -> LeavePolicyAssignment | None:
    assignments = (
        LeavePolicyAssignment.objects.filter(
            tenant=employee.tenant,
            leave_policy__leave_type=leave_type,
            leave_policy__status="active",
            is_active=True,
        )
        .select_related(
            "leave_policy",
            "employee",
            "legal_entity",
            "branch",
            "department",
            "grade",
            "employment_type",
        )
        .order_by("priority", "created_at")
    )
    matching_assignments: list[LeavePolicyAssignment] = []
    for assignment in assignments:
        if assignment.employee_id and assignment.employee_id != employee.id:
            continue
        if assignment.legal_entity_id and assignment.legal_entity_id != employee.legal_entity_id:
            continue
        if assignment.branch_id and assignment.branch_id != employee.branch_id:
            continue
        if assignment.department_id and assignment.department_id != employee.department_id:
            continue
        if assignment.grade_id and assignment.grade_id != employee.grade_id:
            continue
        if assignment.employment_type_id and assignment.employment_type_id != employee.employment_type_id:
            continue
        matching_assignments.append(assignment)
    if not matching_assignments:
        return None
    return min(
        matching_assignments,
        key=lambda assignment: (
            assignment.priority,
            tuple(-value for value in _leave_assignment_resolution_signature(assignment)),
            assignment.created_at,
        ),
    )


def _resolve_leave_policy(employee, leave_type) -> LeavePolicy | None:
    assignment = _find_matching_leave_policy_assignment(employee, leave_type)
    if assignment:
        return assignment.leave_policy
    return None


def _calculate_requested_units(start_date, end_date, start_day_portion, end_day_portion) -> Decimal:
    total_days = (end_date - start_date).days + 1
    units = Decimal(total_days)
    if total_days == 1 and start_day_portion != "full_day" and end_day_portion != "full_day":
        return Decimal("0.5")
    if start_day_portion != "full_day":
        units -= Decimal("0.5")
    if end_day_portion != "full_day":
        units -= Decimal("0.5")
    return max(units, Decimal("0.5"))


def _recalculate_closing_balance(balance: LeaveBalance) -> LeaveBalance:
    balance.closing_balance = (
        balance.opening_balance
        + balance.accrued_amount
        + balance.carry_forward_amount
        + balance.adjustment_amount
        - balance.consumed_amount
        - balance.reserved_amount
        - balance.encashed_amount
    )
    return balance


def _get_or_create_leave_balance(*, employee, leave_policy: LeavePolicy, period_year: int, as_of: date) -> LeaveBalance:
    policy_config = normalize_leave_policy_config(leave_policy.config_snapshot)
    prorated_entitlement = _calculate_prorated_entitlement(
        employee=employee,
        leave_policy=leave_policy,
        as_of=as_of,
        policy_config=policy_config,
    )
    accrued_amount = _calculate_scheduled_accrual(
        entitlement=prorated_entitlement,
        leave_policy=leave_policy,
        as_of=as_of,
        policy_config=policy_config,
    )
    carry_forward_amount = _calculate_carry_forward_amount(
        employee=employee,
        leave_policy=leave_policy,
        policy_period_year=period_year,
        policy_config=policy_config,
    )
    closing_balance = accrued_amount + carry_forward_amount
    balance, created = LeaveBalance.objects.get_or_create(
        employee=employee,
        tenant=employee.tenant,
        leave_policy=leave_policy,
        period_year=period_year,
        defaults={
            "opening_balance": Decimal("0"),
            "accrued_amount": accrued_amount,
            "consumed_amount": Decimal("0"),
            "reserved_amount": Decimal("0"),
            "carry_forward_amount": carry_forward_amount,
            "encashed_amount": Decimal("0"),
            "adjustment_amount": Decimal("0"),
            "closing_balance": closing_balance,
        },
    )
    if not created:
        balance.accrued_amount = accrued_amount
        balance.carry_forward_amount = carry_forward_amount
        _recalculate_closing_balance(balance)
        balance.save(update_fields=["accrued_amount", "carry_forward_amount", "closing_balance", "updated_at"])
    return balance


def _employee_service_days(employee, *, as_of: date) -> int:
    if not employee.date_of_joining:
        return 0
    return max((as_of - employee.date_of_joining).days, 0)


def _is_employee_on_probation(employee, *, as_of: date) -> bool:
    if employee.confirmation_date and employee.confirmation_date <= as_of:
        return False
    if employee.probation_end_date:
        return employee.probation_end_date >= as_of
    return False


def _validate_leave_request(
    *,
    employee,
    leave_type,
    leave_policy: LeavePolicy | None,
    start_date,
    end_date,
    start_day_portion,
    end_day_portion,
    requested_units: Decimal,
    attachment_reference: str = "",
):
    today = timezone.localdate()

    if not leave_type.is_active:
        raise ValidationError({"leave_type_id": "Selected leave type is inactive."})

    if start_date > end_date:
        raise ValidationError({"end_date": "End date must be on or after start date."})

    if start_date == end_date and start_day_portion != end_day_portion:
        raise ValidationError(
            {"end_day_portion": "Single-day leave must use the same day portion for start and end."}
        )

    if not leave_policy:
        raise ValidationError({"leave_type_id": "No active leave policy is assigned to this employee for the selected leave type."})

    if leave_policy.effective_from and start_date < leave_policy.effective_from:
        raise ValidationError({"start_date": "Leave request starts before this policy becomes effective."})

    if leave_policy.effective_to and end_date > leave_policy.effective_to:
        raise ValidationError({"end_date": "Leave request ends after this policy expires."})

    if not leave_policy.allow_half_day and (
        start_day_portion != LeaveDayPortion.FULL_DAY or end_day_portion != LeaveDayPortion.FULL_DAY
    ):
        raise ValidationError({"start_day_portion": "Half-day leave is not allowed under this policy."})

    if start_date < today and not leave_policy.allow_backdated_application:
        raise ValidationError({"start_date": "Backdated leave requests are not allowed under this policy."})

    if start_date >= today and leave_policy.notice_days_required:
        if (start_date - today).days < leave_policy.notice_days_required:
            raise ValidationError(
                {"start_date": f"This policy requires at least {leave_policy.notice_days_required} days of notice."}
            )

    if requested_units < leave_policy.min_days_per_request:
        raise ValidationError(
            {"start_day_portion": f"Minimum request size for this policy is {leave_policy.min_days_per_request}."}
        )

    if leave_policy.max_consecutive_days and requested_units > leave_policy.max_consecutive_days:
        raise ValidationError(
            {"end_date": f"Maximum consecutive leave allowed under this policy is {leave_policy.max_consecutive_days}."}
        )

    if leave_policy.minimum_service_days:
        service_days = _employee_service_days(employee, as_of=today)
        if service_days < leave_policy.minimum_service_days:
            raise ValidationError(
                {"leave_type_id": f"This policy requires at least {leave_policy.minimum_service_days} days of service."}
            )

    if not leave_policy.is_probation_eligible and _is_employee_on_probation(employee, as_of=today):
        raise ValidationError({"leave_type_id": "This leave policy is not available during probation."})

    if not leave_type.allow_negative_balance:
        balance = _get_or_create_leave_balance(
            employee=employee,
            leave_policy=leave_policy,
            period_year=get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
            as_of=start_date,
        )
        available_units = balance.closing_balance
        if requested_units > available_units:
            raise ValidationError(
                {"leave_type_id": f"Insufficient balance. Available balance is {available_units} units."}
            )

    policy_runtime = _build_leave_request_policy_runtime(
        leave_type=leave_type,
        leave_policy=leave_policy,
        requested_units=requested_units,
    )
    if policy_runtime["required_attachment_reason"] and not attachment_reference.strip():
        raise ValidationError({"attachment_reference": policy_runtime["required_attachment_reason"]})

    holiday_rules = policy_runtime["config"].get("holiday_governance", {})
    if holiday_rules.get("enabled"):
        matched_holidays = _get_holidays_in_range(employee=employee, start_date=start_date, end_date=end_date)
        allowed_holiday_types = set(holiday_rules.get("allowed_holiday_types") or [])
        matched_allowed_holidays = [
            holiday for holiday in matched_holidays if not allowed_holiday_types or holiday.holiday_type in allowed_holiday_types
        ]
        if holiday_rules.get("require_matching_holiday_dates", True) and not matched_allowed_holidays:
            allowed_labels = ", ".join(holiday_type.replace("_", " ") for holiday_type in (holiday_rules.get("allowed_holiday_types") or [])) or "configured holiday"
            raise ValidationError(
                {
                    "start_date": f"This leave policy can only be used on dates marked as {allowed_labels} in the employee holiday calendar."
                }
            )

        paid_cap = _parse_decimal(holiday_rules.get("max_paid_units_per_period"))
        policy_period_year = get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date)
        paid_usage_before_request = Decimal("0.00")
        if paid_cap is not None and paid_cap >= 0:
            relevant_statuses = [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PARTIALLY_APPROVED]
            if holiday_rules.get("count_pending_requests_towards_cap", True):
                relevant_statuses.append(LeaveRequestStatus.PENDING)
            existing_requests = LeaveRequest.objects.filter(
                tenant=employee.tenant,
                employee=employee,
                leave_policy=leave_policy,
                status__in=relevant_statuses,
            )
            for existing_request in existing_requests:
                holiday_booking = (existing_request.metadata or {}).get("holiday_booking", {})
                if not holiday_booking.get("applies"):
                    continue
                if int(holiday_booking.get("policy_period_year") or policy_period_year) != policy_period_year:
                    continue
                matched_holiday_types = set(holiday_booking.get("matched_holiday_types") or [])
                if allowed_holiday_types and not matched_holiday_types.intersection(allowed_holiday_types):
                    continue
                if existing_request.status == LeaveRequestStatus.APPROVED:
                    paid_usage_before_request += Decimal(existing_request.approved_units or existing_request.requested_units or 0)
                elif existing_request.status == LeaveRequestStatus.PARTIALLY_APPROVED:
                    paid_usage_before_request += Decimal(existing_request.approved_units or 0)
                else:
                    paid_usage_before_request += Decimal(existing_request.requested_units or 0)
            paid_usage_after_request = (paid_usage_before_request + requested_units).quantize(Decimal("0.01"))
            if paid_usage_after_request > paid_cap and holiday_rules.get("paid_cap_exhaustion_action") == "block":
                raise ValidationError(
                    {
                        "leave_type_id": (
                            f"This policy allows only {paid_cap:.2f} paid restricted-holiday units in the policy period. "
                            f"{paid_usage_before_request:.2f} are already consumed or pending."
                        )
                    }
                )
        else:
            paid_usage_after_request = Decimal("0.00")

        policy_runtime["holiday_booking"] = {
            "applies": True,
            "matched_holidays": [
                {
                    "id": str(holiday.id),
                    "date": holiday.date.isoformat(),
                    "name": holiday.name,
                    "holiday_type": holiday.holiday_type,
                }
                for holiday in matched_allowed_holidays
            ],
            "matched_holiday_types": sorted({holiday.holiday_type for holiday in matched_allowed_holidays}),
            "policy_period_year": policy_period_year,
            "paid_usage_before_request": f"{paid_usage_before_request:.2f}",
            "paid_usage_after_request": f"{paid_usage_after_request:.2f}",
            "paid_cap": holiday_rules.get("max_paid_units_per_period"),
        }
    else:
        policy_runtime["holiday_booking"] = {
            "applies": False,
            "matched_holidays": [],
            "matched_holiday_types": [],
            "policy_period_year": get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
            "paid_usage_before_request": "0.00",
            "paid_usage_after_request": "0.00",
            "paid_cap": holiday_rules.get("max_paid_units_per_period"),
        }
    return policy_runtime


def _reserve_leave_balance(*, employee, leave_policy: LeavePolicy | None, start_date, requested_units: Decimal):
    if not leave_policy:
        return
    balance = _get_or_create_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        period_year=get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
        as_of=start_date,
    )
    balance.reserved_amount += requested_units
    _recalculate_closing_balance(balance)
    balance.save(update_fields=["reserved_amount", "closing_balance", "updated_at"])


def _release_reserved_leave_balance(*, employee, leave_policy: LeavePolicy | None, start_date, requested_units: Decimal):
    if not leave_policy:
        return
    balance = _get_or_create_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        period_year=get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
        as_of=start_date,
    )
    balance.reserved_amount = max(balance.reserved_amount - requested_units, Decimal("0"))
    _recalculate_closing_balance(balance)
    balance.save(update_fields=["reserved_amount", "closing_balance", "updated_at"])


def _consume_leave_balance(*, employee, leave_policy: LeavePolicy | None, start_date, approved_units: Decimal):
    if not leave_policy:
        return
    balance = _get_or_create_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        period_year=get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
        as_of=start_date,
    )
    balance.consumed_amount += approved_units
    _recalculate_closing_balance(balance)
    balance.save(update_fields=["consumed_amount", "closing_balance", "updated_at"])


def _release_consumed_leave_balance(*, employee, leave_policy: LeavePolicy | None, start_date, approved_units: Decimal):
    if not leave_policy:
        return
    balance = _get_or_create_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        period_year=get_leave_policy_period_year(leave_policy=leave_policy, as_of=start_date),
        as_of=start_date,
    )
    balance.consumed_amount = max(Decimal(balance.consumed_amount or 0) - approved_units, Decimal("0"))
    _recalculate_closing_balance(balance)
    balance.save(update_fields=["consumed_amount", "closing_balance", "updated_at"])


def _get_fallback_hr_reviewer(*, employee):
    membership = (
        TenantMembership.objects.filter(
            tenant=employee.tenant,
            employee__isnull=False,
            status=MembershipStatus.ACTIVE,
            membership_roles__role__code="hr-admin",
            membership_roles__role__is_active=True,
        )
        .select_related("employee")
        .order_by("employee__employee_code")
        .first()
    )
    return getattr(membership, "employee", None)


def _resolve_leave_balance_operation_reviewer(*, employee, leave_policy: LeavePolicy, config: dict):
    operations = config.get("operations", {})
    approval = config.get("approval", {})
    reviewer_employee_id = operations.get("reviewer_employee_id") or approval.get("hr_owner_employee_id")
    if reviewer_employee_id:
        reviewer = Employee.objects.filter(tenant=employee.tenant, id=reviewer_employee_id).first()
        if reviewer:
            return reviewer
    return _get_fallback_hr_reviewer(employee=employee)


def _employee_can_review_leave_balance_transaction(*, employee, transaction_item: LeaveBalanceTransaction) -> bool:
    if transaction_item.status != LeaveBalanceTransaction.Status.PENDING:
        return False
    if transaction_item.performed_by_id and transaction_item.performed_by_id == employee.id:
        return False

    reviewer_employee_id = str(transaction_item.metadata.get("reviewer_employee_id") or "").strip()
    if reviewer_employee_id:
        return str(employee.id) == reviewer_employee_id

    return TenantMembership.objects.filter(
        tenant=employee.tenant,
        employee=employee,
        status=MembershipStatus.ACTIVE,
        membership_roles__role__code="hr-admin",
        membership_roles__role__is_active=True,
    ).exists()


def _project_leave_balance_admin_action(
    *,
    balance: LeaveBalance,
    leave_policy: LeavePolicy,
    action: str,
    units: Decimal,
):
    adjustment_amount = Decimal(balance.adjustment_amount or 0)
    encashed_amount = Decimal(balance.encashed_amount or 0)
    available_units = Decimal(balance.closing_balance or 0)

    if action == "credit_adjustment":
        adjustment_amount += units
    elif action == "debit_adjustment":
        if units > available_units:
            raise ValidationError({"units": f"Cannot debit {units:.2f} units when only {available_units:.2f} are available."})
        adjustment_amount -= units
    else:
        config = normalize_leave_policy_config(leave_policy.config_snapshot)
        entitlement = config["entitlement"]
        if not entitlement.get("encashment_allowed"):
            raise ValidationError({"action": "Encashment is not allowed under this leave policy."})
        encashment_cap = _parse_decimal(entitlement.get("encashment_cap"))
        if encashment_cap is not None and units > encashment_cap:
            raise ValidationError({"units": f"Encashment exceeds the configured cap of {encashment_cap:.2f} units."})
        if units > available_units:
            raise ValidationError({"units": f"Cannot encash {units:.2f} units when only {available_units:.2f} are available."})
        encashed_amount += units

    projected_closing_balance = (
        Decimal(balance.opening_balance or 0)
        + Decimal(balance.accrued_amount or 0)
        + Decimal(balance.carry_forward_amount or 0)
        + adjustment_amount
        - Decimal(balance.consumed_amount or 0)
        - Decimal(balance.reserved_amount or 0)
        - encashed_amount
    ).quantize(Decimal("0.01"))

    return {
        "adjustment_amount": adjustment_amount.quantize(Decimal("0.01")),
        "encashed_amount": encashed_amount.quantize(Decimal("0.01")),
        "projected_closing_balance": projected_closing_balance,
    }


def _resolve_leave_balance_operation_governance(*, employee, leave_policy: LeavePolicy, action: str, units: Decimal):
    config = normalize_leave_policy_config(leave_policy.config_snapshot)
    operations = config.get("operations", {})
    threshold_field_map = {
        "credit_adjustment": "credit_adjustment_requires_approval_over_units",
        "debit_adjustment": "debit_adjustment_requires_approval_over_units",
        "encashment": "encashment_requires_approval_over_units",
    }
    requires_approval = False
    reasons: list[str] = []

    if action == "encashment" and operations.get("approval_required_for_encashment"):
        requires_approval = True
        reasons.append("Encashment requires approval under this leave policy.")
    if action == "debit_adjustment" and operations.get("approval_required_for_debit_adjustment"):
        requires_approval = True
        reasons.append("Debit adjustments require approval under this leave policy.")

    threshold = _parse_decimal(operations.get(threshold_field_map[action]))
    if threshold is not None and units >= threshold:
        requires_approval = True
        reasons.append(f"{action.replace('_', ' ').capitalize()} requires approval at {threshold:.2f} units or above.")

    reviewer = _resolve_leave_balance_operation_reviewer(employee=employee, leave_policy=leave_policy, config=config) if requires_approval else None
    approval_reason = " ".join(reasons).strip() or None
    return {
        "config": config,
        "requires_approval": requires_approval,
        "approval_reason": approval_reason,
        "reviewer": reviewer,
    }


def _get_leave_request_lifecycle_runtime(*, leave_request: LeaveRequest, as_of: date | None = None) -> dict:
    today = as_of or timezone.localdate()
    leave_policy = leave_request.leave_policy
    config = normalize_leave_policy_config(leave_policy.config_snapshot if leave_policy else {})
    lifecycle = config.get("lifecycle", {})
    request_action = str((leave_request.metadata or {}).get("request_action") or "leave_request")

    withdraw_allowed = leave_request.status == LeaveRequestStatus.PENDING and lifecycle.get("allow_employee_withdraw_pending", True)
    withdraw_reason = ""
    withdraw_notice_hours = _parse_decimal(lifecycle.get("withdraw_notice_hours_before_start"))
    if leave_request.status != LeaveRequestStatus.PENDING:
        withdraw_allowed = False
        withdraw_reason = "Only pending leave requests can be withdrawn."
    elif request_action == "cancellation_request":
        withdraw_allowed = False
        withdraw_reason = "Cancellation requests already under approval cannot be withdrawn directly."
    elif not lifecycle.get("allow_employee_withdraw_pending", True):
        withdraw_allowed = False
        withdraw_reason = "This leave policy does not allow employee withdrawal after submission."
    elif withdraw_notice_hours is not None:
        hours_until_start = Decimal((leave_request.start_date - today).days * 24)
        if hours_until_start < withdraw_notice_hours:
            withdraw_allowed = False
            withdraw_reason = (
                f"Withdrawal is blocked within {withdraw_notice_hours:.2f} hours of the leave start date."
            )

    cancel_allowed = leave_request.status in {
        LeaveRequestStatus.APPROVED,
        LeaveRequestStatus.PARTIALLY_APPROVED,
    } and lifecycle.get("allow_employee_cancel_approved", False)
    cancel_reason = ""
    cancel_notice_hours = _parse_decimal(lifecycle.get("cancel_notice_hours_before_start"))
    if leave_request.status not in {LeaveRequestStatus.APPROVED, LeaveRequestStatus.PARTIALLY_APPROVED}:
        cancel_allowed = False
        cancel_reason = "Only approved leave requests can be cancelled."
    elif not lifecycle.get("allow_employee_cancel_approved", False):
        cancel_allowed = False
        cancel_reason = "This leave policy does not allow employee cancellation after approval."
    elif cancel_notice_hours is not None:
        hours_until_start = Decimal((leave_request.start_date - today).days * 24)
        if hours_until_start < cancel_notice_hours:
            cancel_allowed = False
            cancel_reason = (
                f"Cancellation is blocked within {cancel_notice_hours:.2f} hours of the leave start date."
            )
    if request_action == "cancellation_request":
        cancel_allowed = False
        cancel_reason = "A cancellation request is already pending approval for this leave request."

    return {
        "request_action": request_action,
        "allow_employee_withdraw_pending": lifecycle.get("allow_employee_withdraw_pending", True),
        "withdraw_notice_hours_before_start": lifecycle.get("withdraw_notice_hours_before_start"),
        "withdraw_requires_attachment": bool(lifecycle.get("withdraw_requires_attachment", False)),
        "withdraw_attachment_label": lifecycle.get("withdraw_attachment_label") or "withdrawal evidence",
        "can_withdraw": withdraw_allowed,
        "withdraw_block_reason": withdraw_reason or None,
        "allow_employee_cancel_approved": lifecycle.get("allow_employee_cancel_approved", False),
        "cancel_approved_requires_reapproval": bool(lifecycle.get("cancel_approved_requires_reapproval", False)),
        "cancel_approval_route": lifecycle.get("cancel_approval_route"),
        "cancel_notice_hours_before_start": lifecycle.get("cancel_notice_hours_before_start"),
        "cancel_requires_attachment": bool(lifecycle.get("cancel_requires_attachment", False)),
        "cancel_attachment_label": lifecycle.get("cancel_attachment_label") or "cancellation evidence",
        "can_cancel": cancel_allowed,
        "cancel_block_reason": cancel_reason or None,
    }


def apply_leave_balance_admin_action(
    *,
    actor=None,
    employee,
    leave_policy: LeavePolicy,
    action: str,
    units: Decimal,
    effective_date: date,
    reason: str,
) -> dict:
    if action not in LEAVE_BALANCE_ADMIN_ACTIONS:
        raise ValidationError({"action": "Unsupported balance action."})
    if units <= 0:
        raise ValidationError({"units": "Units must be greater than zero."})
    if not reason.strip():
        raise ValidationError({"reason": "Reason is required for leave balance operations."})

    period_year = get_leave_policy_period_year(leave_policy=leave_policy, as_of=effective_date)
    balance = _get_or_create_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        period_year=period_year,
        as_of=effective_date,
    )
    closing_balance_before = Decimal(balance.closing_balance or 0)
    projection = _project_leave_balance_admin_action(
        balance=balance,
        leave_policy=leave_policy,
        action=action,
        units=units,
    )
    governance = _resolve_leave_balance_operation_governance(
        employee=employee,
        leave_policy=leave_policy,
        action=action,
        units=units,
    )
    reviewer = governance["reviewer"]

    if governance["requires_approval"] and reviewer is None:
        raise ValidationError({"action": "This operation requires a reviewer, but no active HR reviewer could be resolved."})

    is_pending = bool(governance["requires_approval"])
    transaction_item = LeaveBalanceTransaction.objects.create(
        tenant=employee.tenant,
        leave_balance=balance,
        employee=employee,
        leave_policy=leave_policy,
        status=LeaveBalanceTransaction.Status.PENDING if is_pending else LeaveBalanceTransaction.Status.APPLIED,
        action=action,
        units=units,
        effective_date=effective_date,
        reason=reason.strip(),
        performed_by=actor if actor and getattr(actor, "tenant_id", None) == employee.tenant_id else None,
        closing_balance_before=closing_balance_before,
        closing_balance_after=projection["projected_closing_balance"],
        metadata={
            "period_year": period_year,
            "approval_reason": governance["approval_reason"],
            "reviewer_employee_id": str(reviewer.id) if reviewer else None,
            "reviewer_employee_name": (
                f"{reviewer.first_name} {reviewer.last_name}".strip() or reviewer.employee_code
                if reviewer
                else None
            ),
        },
    )
    if is_pending:
        return {
            "balance": balance,
            "transaction": transaction_item,
            "applied": False,
            "requires_review": True,
            "message": governance["approval_reason"] or "Leave balance operation has been sent for approval.",
        }

    balance.adjustment_amount = projection["adjustment_amount"]
    balance.encashed_amount = projection["encashed_amount"]
    balance.closing_balance = projection["projected_closing_balance"]
    balance.save(update_fields=["adjustment_amount", "encashed_amount", "closing_balance", "updated_at"])
    return {
        "balance": balance,
        "transaction": transaction_item,
        "applied": True,
        "requires_review": False,
        "message": "Leave balance operation applied successfully.",
    }


@transaction.atomic
def review_leave_balance_transaction(*, actor, transaction_item: LeaveBalanceTransaction, decision: str, rejection_reason: str = "") -> dict:
    if decision not in {"approve", "reject"}:
        raise ValidationError({"decision": "Unsupported review decision."})

    locked_transaction = (
        LeaveBalanceTransaction.objects.select_for_update()
        .select_related("employee", "leave_policy", "leave_balance", "performed_by")
        .filter(id=transaction_item.id, tenant=actor.tenant)
        .first()
    )
    if not locked_transaction:
        raise ValidationError({"transaction_id": "Leave balance transaction not found."})
    if locked_transaction.status != LeaveBalanceTransaction.Status.PENDING:
        raise ValidationError({"transaction_id": "Only pending transactions can be reviewed."})
    if not _employee_can_review_leave_balance_transaction(employee=actor, transaction_item=locked_transaction):
        raise ValidationError({"decision": "You are not allowed to review this leave balance transaction."})
    if decision == "reject" and not rejection_reason.strip():
        raise ValidationError({"rejection_reason": "Rejection reason is required when rejecting a leave balance transaction."})

    balance = (
        LeaveBalance.objects.select_for_update()
        .select_related("employee", "leave_policy", "leave_policy__leave_type")
        .get(id=locked_transaction.leave_balance_id)
    )

    if decision == "reject":
        locked_transaction.status = LeaveBalanceTransaction.Status.REJECTED
        locked_transaction.reviewed_by = actor
        locked_transaction.reviewed_at = timezone.now()
        locked_transaction.rejection_reason = rejection_reason.strip()
        locked_transaction.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"])
        return {
            "balance": balance,
            "transaction": locked_transaction,
            "applied": False,
            "requires_review": False,
            "message": "Leave balance transaction rejected.",
        }

    projection = _project_leave_balance_admin_action(
        balance=balance,
        leave_policy=locked_transaction.leave_policy,
        action=locked_transaction.action,
        units=Decimal(locked_transaction.units or 0),
    )
    locked_transaction.closing_balance_before = Decimal(balance.closing_balance or 0)
    locked_transaction.closing_balance_after = projection["projected_closing_balance"]
    balance.adjustment_amount = projection["adjustment_amount"]
    balance.encashed_amount = projection["encashed_amount"]
    balance.closing_balance = projection["projected_closing_balance"]
    balance.save(update_fields=["adjustment_amount", "encashed_amount", "closing_balance", "updated_at"])

    locked_transaction.status = LeaveBalanceTransaction.Status.APPLIED
    locked_transaction.reviewed_by = actor
    locked_transaction.reviewed_at = timezone.now()
    locked_transaction.rejection_reason = ""
    locked_transaction.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "closing_balance_before",
            "closing_balance_after",
            "updated_at",
        ]
    )
    return {
        "balance": balance,
        "transaction": locked_transaction,
        "applied": True,
        "requires_review": False,
        "message": "Leave balance transaction approved and applied.",
    }


@transaction.atomic
def withdraw_leave_request(*, leave_request: LeaveRequest, actor_employee, reason: str = "", attachment_reference: str = "") -> LeaveRequest:
    if leave_request.employee_id != actor_employee.id:
        raise ValidationError({"detail": "You can only withdraw your own leave request."})
    runtime = _get_leave_request_lifecycle_runtime(leave_request=leave_request)
    if not runtime["can_withdraw"]:
        raise ValidationError({"status": runtime["withdraw_block_reason"] or "This leave request cannot be withdrawn."})
    if runtime["withdraw_requires_attachment"] and not attachment_reference.strip():
        raise ValidationError(
            {"attachment_reference": f"{runtime['withdraw_attachment_label'].capitalize()} is required to withdraw this leave request."}
        )

    _release_reserved_leave_balance(
        employee=leave_request.employee,
        leave_policy=leave_request.leave_policy,
        start_date=leave_request.start_date,
        requested_units=Decimal(leave_request.requested_units or 0),
    )

    leave_request.status = LeaveRequestStatus.WITHDRAWN
    leave_request.manager_comment = ""
    leave_request.rejection_reason = ""
    leave_request.cancelled_at = timezone.now()
    leave_request.metadata = {
        **(leave_request.metadata or {}),
        "lifecycle_rules": runtime,
        "withdrawal": {
            "reason": reason.strip(),
            "attachment_reference": attachment_reference.strip(),
            "acted_at": timezone.now().isoformat(),
        },
    }
    leave_request.save(update_fields=["status", "manager_comment", "rejection_reason", "cancelled_at", "metadata", "updated_at"])
    return leave_request


@transaction.atomic
def cancel_leave_request(*, leave_request: LeaveRequest, actor_employee, reason: str = "", attachment_reference: str = "") -> LeaveRequest:
    if leave_request.employee_id != actor_employee.id:
        raise ValidationError({"detail": "You can only cancel your own leave request."})
    runtime = _get_leave_request_lifecycle_runtime(leave_request=leave_request)
    if not runtime["can_cancel"]:
        raise ValidationError({"status": runtime["cancel_block_reason"] or "This leave request cannot be cancelled."})
    if runtime["cancel_requires_attachment"] and not attachment_reference.strip():
        raise ValidationError(
            {"attachment_reference": f"{runtime['cancel_attachment_label'].capitalize()} is required to cancel this leave request."}
        )

    if runtime["cancel_approved_requires_reapproval"]:
        approval_route = (
            runtime["cancel_approval_route"]
            or str(leave_request.metadata.get("policy_rules", {}).get("approval_route", "") or "")
            or normalize_leave_policy_config(leave_request.leave_policy.config_snapshot if leave_request.leave_policy else {}).get("approval", {}).get("default_route")
            or "manager_only"
        )
        manager_membership = leave_request.employee.reporting_manager.membership if leave_request.employee.reporting_manager and leave_request.employee.reporting_manager.membership else None
        approval_steps = _build_leave_approval_steps(
            employee=leave_request.employee,
            approval_route=approval_route,
            second_level_owner_employee_id=normalize_leave_policy_config(leave_request.leave_policy.config_snapshot if leave_request.leave_policy else {}).get("approval", {}).get("second_level_owner_employee_id"),
            hr_owner_employee_id=normalize_leave_policy_config(leave_request.leave_policy.config_snapshot if leave_request.leave_policy else {}).get("approval", {}).get("hr_owner_employee_id"),
        )
        workflow_instance = create_workflow_instance(
            tenant=leave_request.tenant,
            module=WorkflowModule.LEAVE,
            trigger_key="leave.cancel",
            subject_type="leave_request",
            subject_identifier=str(leave_request.id),
            initiated_by_identifier=str(actor_employee.membership.user_id) if actor_employee.membership else str(actor_employee.id),
            employee_identifier=str(actor_employee.id),
            payload_snapshot={
                "leave_request_id": str(leave_request.id),
                "action": "cancellation_request",
                "approval_route": approval_route,
                "attachment_reference": attachment_reference.strip(),
            },
            manager_membership=manager_membership,
            approval_steps=approval_steps,
        )
        leave_request.status = LeaveRequestStatus.PENDING
        leave_request.workflow_reference = str(workflow_instance.id)
        leave_request.manager_comment = ""
        leave_request.rejection_reason = ""
        leave_request.metadata = {
            **(leave_request.metadata or {}),
            "lifecycle_rules": runtime,
            "request_action": "cancellation_request",
            "cancellation_request": {
                "reason": reason.strip(),
                "attachment_reference": attachment_reference.strip(),
                "approval_route": approval_route,
                "requested_at": timezone.now().isoformat(),
                "previous_status": LeaveRequestStatus.APPROVED,
            },
        }
        leave_request.save(update_fields=["status", "workflow_reference", "manager_comment", "rejection_reason", "metadata", "updated_at"])
        if manager_membership:
            trigger_notification_event(
                tenant=leave_request.tenant,
                module=WorkflowModule.LEAVE,
                trigger_key="leave.request.manager_pending",
                recipient_membership=manager_membership,
                recipient_identifier=str(manager_membership.user_id),
                subject_type="leave_request",
                subject_identifier=str(leave_request.id),
                fallback_title="Leave cancellation pending approval",
                fallback_body=f"{actor_employee.first_name} requested cancellation for approved leave from {leave_request.start_date} to {leave_request.end_date}.",
                payload={"leave_request_id": str(leave_request.id), "action": "cancellation_request"},
            )
        return leave_request

    approved_units = Decimal(leave_request.approved_units or leave_request.requested_units or 0)
    _release_consumed_leave_balance(
        employee=leave_request.employee,
        leave_policy=leave_request.leave_policy,
        start_date=leave_request.start_date,
        approved_units=approved_units,
    )

    leave_request.status = LeaveRequestStatus.CANCELLED
    leave_request.manager_comment = ""
    leave_request.rejection_reason = ""
    leave_request.cancelled_at = timezone.now()
    leave_request.metadata = {
        **(leave_request.metadata or {}),
        "lifecycle_rules": runtime,
        "cancellation": {
            "reason": reason.strip(),
            "attachment_reference": attachment_reference.strip(),
            "acted_at": timezone.now().isoformat(),
        },
    }
    leave_request.save(update_fields=["status", "manager_comment", "rejection_reason", "cancelled_at", "metadata", "updated_at"])
    return leave_request


@transaction.atomic
def submit_leave_request(
    *,
    employee,
    leave_type,
    start_date,
    end_date,
    start_day_portion,
    end_day_portion,
    reason: str = "",
    attachment_reference: str = "",
) -> LeaveRequest:
    """Creates and submits a leave request."""

    leave_policy = _resolve_leave_policy(employee, leave_type)
    requested_units = _calculate_requested_units(start_date, end_date, start_day_portion, end_day_portion)
    policy_runtime = _validate_leave_request(
        employee=employee,
        leave_type=leave_type,
        leave_policy=leave_policy,
        start_date=start_date,
        end_date=end_date,
        start_day_portion=start_day_portion,
        end_day_portion=end_day_portion,
        requested_units=requested_units,
        attachment_reference=attachment_reference,
    )
    leave_request = LeaveRequest.objects.create(
        tenant=employee.tenant,
        employee=employee,
        leave_type=leave_type,
        leave_policy=leave_policy,
        status=LeaveRequestStatus.PENDING,
        start_date=start_date,
        end_date=end_date,
        start_day_portion=start_day_portion,
        end_day_portion=end_day_portion,
        requested_units=requested_units,
        reason=reason,
        applied_at=timezone.now(),
        metadata={
            "request_action": "leave_request",
            "attachment_reference": attachment_reference.strip(),
            "policy_rules": {
                "approval_route": policy_runtime["approval_route"],
                "required_attachment_label": policy_runtime["required_attachment_label"],
                "config_snapshot": policy_runtime["config"],
            },
            "holiday_booking": policy_runtime.get("holiday_booking", {}),
            "lifecycle_rules": _get_leave_request_lifecycle_runtime(
                leave_request=LeaveRequest(
                    employee=employee,
                    leave_policy=leave_policy,
                    status=LeaveRequestStatus.PENDING,
                    start_date=start_date,
                    end_date=end_date,
                    requested_units=requested_units,
                    approved_units=Decimal("0.00"),
                ),
                as_of=timezone.localdate(),
            ),
        },
    )
    _reserve_leave_balance(
        employee=employee,
        leave_policy=leave_policy,
        start_date=start_date,
        requested_units=requested_units,
    )
    manager_membership = employee.reporting_manager.membership if employee.reporting_manager and employee.reporting_manager.membership else None
    approval_steps = _build_leave_approval_steps(
        employee=employee,
        approval_route=policy_runtime["approval_route"],
        second_level_owner_employee_id=policy_runtime["config"]["approval"].get("second_level_owner_employee_id"),
        hr_owner_employee_id=policy_runtime["config"]["approval"].get("hr_owner_employee_id"),
    )
    workflow_instance = create_workflow_instance(
        tenant=employee.tenant,
        module=WorkflowModule.LEAVE,
        trigger_key="leave.request",
        subject_type="leave_request",
        subject_identifier=str(leave_request.id),
        initiated_by_identifier=str(employee.membership.user_id) if employee.membership else str(employee.id),
        employee_identifier=str(employee.id),
        payload_snapshot={
            "leave_request_id": str(leave_request.id),
            "approval_route": policy_runtime["approval_route"],
            "attachment_reference": attachment_reference.strip(),
            "required_attachment_label": policy_runtime["required_attachment_label"],
        },
        manager_membership=manager_membership,
        approval_steps=approval_steps,
    )
    leave_request.workflow_reference = str(workflow_instance.id)
    leave_request.save(update_fields=["workflow_reference", "updated_at"])
    if manager_membership:
        trigger_notification_event(
            tenant=employee.tenant,
            module=WorkflowModule.LEAVE,
            trigger_key="leave.request.manager_pending",
            recipient_membership=manager_membership,
            recipient_identifier=str(manager_membership.user_id),
            subject_type="leave_request",
            subject_identifier=str(leave_request.id),
            fallback_title="New leave request pending approval",
            fallback_body=f"{employee.first_name} requested leave from {start_date} to {end_date}.",
            payload={"leave_request_id": str(leave_request.id)},
        )
    return leave_request


@transaction.atomic
def resolve_leave_request(*, leave_request: LeaveRequest, actor_employee, approve: bool, comment: str = "") -> LeaveRequest:
    """Approves or rejects a leave request."""

    action = WorkflowAction.APPROVE if approve else WorkflowAction.REJECT
    previous_status = leave_request.status
    request_action = str((leave_request.metadata or {}).get("request_action") or "leave_request")
    workflow_instance = None
    if leave_request.workflow_reference:
        from apps.workflows.models import WorkflowInstance

        workflow_instance = WorkflowInstance.objects.filter(id=leave_request.workflow_reference).first()
        if workflow_instance:
            workflow_instance = resolve_workflow_action(
                instance=workflow_instance,
                actor_identifier=str(actor_employee.membership.user_id) if actor_employee.membership else str(actor_employee.id),
                action=action,
                comment=comment,
            )

    is_final_approval = approve and (
        workflow_instance is None or workflow_instance.status == WorkflowInstanceStatus.APPROVED
    )
    is_rejected = not approve

    if request_action == "cancellation_request":
        previous_approved_status = str((leave_request.metadata or {}).get("cancellation_request", {}).get("previous_status") or LeaveRequestStatus.APPROVED)
        leave_request.status = (
            LeaveRequestStatus.CANCELLED
            if is_final_approval
            else previous_approved_status
            if is_rejected
            else LeaveRequestStatus.PENDING
        )
        leave_request.rejection_reason = comment if is_rejected else ""
        leave_request.manager_comment = comment or leave_request.manager_comment
        leave_request.cancelled_at = timezone.now() if is_final_approval else None
        metadata = dict(leave_request.metadata or {})
        if is_final_approval or is_rejected:
            metadata["request_action"] = "leave_request"
            metadata["cancellation_resolution"] = {
                "approved": bool(is_final_approval),
                "comment": comment,
                "acted_at": timezone.now().isoformat(),
            }
        leave_request.metadata = metadata
    else:
        leave_request.status = (
            LeaveRequestStatus.APPROVED
            if is_final_approval
            else LeaveRequestStatus.REJECTED
            if is_rejected
            else LeaveRequestStatus.PENDING
        )
        leave_request.approved_units = leave_request.requested_units if is_final_approval else Decimal("0")
        leave_request.approved_at = timezone.now() if is_final_approval else None
        leave_request.rejection_reason = comment if is_rejected else ""
        leave_request.manager_comment = comment or leave_request.manager_comment
    leave_request.save(
        update_fields=[
            "status",
            "approved_units",
            "approved_at",
            "cancelled_at",
            "rejection_reason",
            "manager_comment",
            "metadata",
            "updated_at",
        ]
    )
    if request_action == "cancellation_request":
        if is_final_approval:
            _release_consumed_leave_balance(
                employee=leave_request.employee,
                leave_policy=leave_request.leave_policy,
                start_date=leave_request.start_date,
                approved_units=Decimal(leave_request.approved_units or leave_request.requested_units or 0),
            )
    elif previous_status == LeaveRequestStatus.PENDING:
        if is_final_approval or is_rejected:
            _release_reserved_leave_balance(
                employee=leave_request.employee,
                leave_policy=leave_request.leave_policy,
                start_date=leave_request.start_date,
                requested_units=leave_request.requested_units,
            )
        if is_final_approval:
            _consume_leave_balance(
                employee=leave_request.employee,
                leave_policy=leave_request.leave_policy,
                start_date=leave_request.start_date,
                approved_units=leave_request.approved_units,
            )
    if leave_request.employee.membership:
        fallback_body = (
            "Your leave cancellation was approved."
            if request_action == "cancellation_request" and is_final_approval
            else "Your leave cancellation was rejected."
            if request_action == "cancellation_request" and is_rejected
            else "Your leave cancellation moved to the next approver."
            if request_action == "cancellation_request"
            else "Your leave request was approved."
            if is_final_approval
            else "Your leave request was rejected."
            if is_rejected
            else "Your leave request moved to the next approver."
        )
        trigger_notification_event(
            tenant=leave_request.tenant,
            module=WorkflowModule.LEAVE,
            trigger_key="leave.request.employee_updated",
            recipient_membership=leave_request.employee.membership,
            recipient_identifier=str(leave_request.employee.membership.user_id),
            subject_type="leave_request",
            subject_identifier=str(leave_request.id),
            fallback_title="Leave request updated",
            fallback_body=fallback_body,
            payload={"leave_request_id": str(leave_request.id), "status": leave_request.status},
        )
    return leave_request
