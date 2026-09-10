"""Operational services for attendance flows."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import (
    AttendancePolicy,
    AttendancePolicyAssignment,
    AttendancePolicyStatus,
    AttendanceRecord,
    AttendanceRegularization,
    AttendanceStatus,
    EmployeeShiftAssignmentKind,
    EmployeeShiftAssignment,
    Holiday,
    HolidayCalendar,
    RegularizationStatus,
    Shift,
    ShiftRosterRollout,
    ShiftRosterRolloutItem,
    ShiftRosterRolloutStatus,
    ShiftRosterTemplateStatus,
)
from apps.employees.models import Employee, EmploymentStatus
from apps.notifications.services import trigger_notification_event
from apps.workflows.models import WorkflowAction, WorkflowModule
from apps.workflows.services import create_workflow_instance, resolve_workflow_action


DEFAULT_ATTENDANCE_POLICY_CONFIG = {
    "derivation": {
        "enabled": False,
        "auto_mark_holiday": True,
        "auto_mark_weekly_off": True,
        "missing_punch_status": "unknown",
        "late_status_mode": "present",
        "derive_overtime": True,
    }
}
ATTENDANCE_MISSING_PUNCH_STATUSES = {AttendanceStatus.UNKNOWN, AttendanceStatus.ABSENT}
ATTENDANCE_LATE_STATUS_MODES = {"present", "late"}
DECIMAL_ZERO = Decimal("0.00")
DECIMAL_HUNDREDTH = Decimal("0.01")
DEFAULT_EMPLOYEE_SHIFT_ASSIGNMENT_CONFIG = {
    "rotation": {
        "anchor_date": None,
        "entries": [],
    }
}


def _quantize_hours(value: Decimal | int | float | str | None) -> Decimal:
    if value in (None, ""):
        return DECIMAL_ZERO
    try:
        return Decimal(str(value)).quantize(DECIMAL_HUNDREDTH, rounding=ROUND_HALF_UP)
    except Exception:
        return DECIMAL_ZERO


def normalize_employee_shift_assignment_config(raw: dict | None, *, fallback_shift_id: str | None = None, effective_from=None) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    rotation_raw = raw.get("rotation") if isinstance(raw.get("rotation"), dict) else {}
    normalized_entries: list[dict] = []
    for index, entry in enumerate(rotation_raw.get("entries") or []):
        if not isinstance(entry, dict):
            continue
        shift_id = entry.get("shift_id") or fallback_shift_id
        if not shift_id:
            continue
        try:
            span_days = max(int(entry.get("span_days") or 7), 1)
        except Exception:
            span_days = 7
        normalized_entries.append(
            {
                "position": index,
                "shift_id": str(shift_id),
                "span_days": span_days,
            }
        )
    if not normalized_entries and fallback_shift_id:
        normalized_entries.append(
            {
                "position": 0,
                "shift_id": str(fallback_shift_id),
                "span_days": 7,
            }
        )
    anchor_date = rotation_raw.get("anchor_date")
    if isinstance(anchor_date, date):
        normalized_anchor_date = anchor_date.isoformat()
    elif isinstance(anchor_date, str) and anchor_date:
        normalized_anchor_date = anchor_date
    elif effective_from:
        normalized_anchor_date = effective_from.isoformat()
    else:
        normalized_anchor_date = None
    return {
        "rotation": {
            "anchor_date": normalized_anchor_date,
            "entries": normalized_entries,
        }
    }


def normalize_attendance_policy_config(raw: dict | None) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    derivation_raw = raw.get("derivation") if isinstance(raw.get("derivation"), dict) else {}
    missing_punch_status = derivation_raw.get("missing_punch_status")
    if missing_punch_status not in ATTENDANCE_MISSING_PUNCH_STATUSES:
        missing_punch_status = DEFAULT_ATTENDANCE_POLICY_CONFIG["derivation"]["missing_punch_status"]
    late_status_mode = derivation_raw.get("late_status_mode")
    if late_status_mode not in ATTENDANCE_LATE_STATUS_MODES:
        late_status_mode = DEFAULT_ATTENDANCE_POLICY_CONFIG["derivation"]["late_status_mode"]
    return {
        "derivation": {
            "enabled": bool(derivation_raw.get("enabled", False)),
            "auto_mark_holiday": bool(derivation_raw.get("auto_mark_holiday", True)),
            "auto_mark_weekly_off": bool(derivation_raw.get("auto_mark_weekly_off", True)),
            "missing_punch_status": missing_punch_status,
            "late_status_mode": late_status_mode,
            "derive_overtime": bool(derivation_raw.get("derive_overtime", True)),
        }
    }


def _attendance_assignment_resolution_signature(assignment_scope) -> tuple[int, int, int]:
    def scope_value(field_name: str):
        if isinstance(assignment_scope, dict):
            return assignment_scope.get(field_name)
        return getattr(assignment_scope, field_name, None)

    if scope_value("employee_id"):
        return (99, 99, 99)

    rank_map = (
        (scope_value("grade_id"), 5),
        (scope_value("employment_type_id"), 5),
        (scope_value("department_id"), 4),
        (scope_value("location_id"), 3),
        (scope_value("branch_id"), 2),
        (scope_value("legal_entity_id"), 1),
    )
    present_ranks = [rank for value, rank in rank_map if value]
    return (
        len(present_ranks),
        max(present_ranks, default=0),
        sum(present_ranks),
    )


def _find_matching_attendance_policy_assignment(employee, *, as_of=None) -> AttendancePolicyAssignment | None:
    as_of = as_of or timezone.localdate()
    assignments = (
        AttendancePolicyAssignment.objects.filter(
            tenant=employee.tenant,
            is_active=True,
            attendance_policy__status=AttendancePolicyStatus.ACTIVE,
        )
        .select_related("attendance_policy", "attendance_policy__default_shift", "attendance_policy__holiday_calendar")
        .order_by("priority", "created_at")
    )
    matching_assignments: list[AttendancePolicyAssignment] = []
    for assignment in assignments:
        if assignment.employee_id and assignment.employee_id != employee.id:
            continue
        if assignment.legal_entity_id and assignment.legal_entity_id != employee.legal_entity_id:
            continue
        if assignment.branch_id and assignment.branch_id != employee.branch_id:
            continue
        if assignment.location_id and assignment.location_id != employee.location_id:
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
            tuple(-value for value in _attendance_assignment_resolution_signature(assignment)),
            assignment.created_at,
        ),
    )


def _attendance_assignment_scope_labels(assignment: AttendancePolicyAssignment) -> list[str]:
    labels: list[str] = []
    if assignment.employee:
        labels.append(f"Employee: {assignment.employee.employee_code}")
    if assignment.legal_entity:
        labels.append(f"Legal entity: {assignment.legal_entity.name}")
    if assignment.branch:
        labels.append(f"Branch: {assignment.branch.name}")
    if assignment.location:
        labels.append(f"Location: {assignment.location.name}")
    if assignment.department:
        labels.append(f"Department: {assignment.department.name}")
    if assignment.grade:
        labels.append(f"Grade: {assignment.grade.name}")
    if assignment.employment_type:
        labels.append(f"Employment type: {assignment.employment_type.name}")
    return labels or ["Tenant default scope"]


def _build_attendance_assignment_scope_labels_from_scope(scope_data: dict, *, tenant) -> list[str]:
    labels: list[str] = []
    employee_id = scope_data.get("employee_id")
    if employee_id:
        employee = AttendancePolicyAssignment.employee.field.related_model.objects.filter(tenant=tenant, id=employee_id).first()
        if employee:
            labels.append(f"Employee: {employee.employee_code}")
    relation_map = [
        ("legal_entity_id", AttendancePolicyAssignment.legal_entity.field.related_model, "Legal entity"),
        ("branch_id", AttendancePolicyAssignment.branch.field.related_model, "Branch"),
        ("location_id", AttendancePolicyAssignment.location.field.related_model, "Location"),
        ("department_id", AttendancePolicyAssignment.department.field.related_model, "Department"),
        ("grade_id", AttendancePolicyAssignment.grade.field.related_model, "Grade"),
        ("employment_type_id", AttendancePolicyAssignment.employment_type.field.related_model, "Employment type"),
    ]
    for field_name, model_class, label in relation_map:
        raw_value = scope_data.get(field_name)
        if not raw_value:
            continue
        item = model_class.objects.filter(tenant=tenant, id=raw_value).first()
        if item:
            labels.append(f"{label}: {item.name}")
    return labels or ["Tenant default scope"]


def _attendance_assignment_scopes_overlap(candidate_scope: dict, existing_assignment: AttendancePolicyAssignment) -> bool:
    comparable_fields = [
        "employee_id",
        "legal_entity_id",
        "branch_id",
        "location_id",
        "department_id",
        "grade_id",
        "employment_type_id",
    ]
    for field_name in comparable_fields:
        candidate_value = candidate_scope.get(field_name)
        existing_value = getattr(existing_assignment, field_name)
        if candidate_value and existing_value and str(candidate_value) != str(existing_value):
            return False
    return True


def _describe_attendance_assignment_overlap_kind(candidate_scope: dict, existing_assignment: AttendancePolicyAssignment) -> str:
    comparable_fields = [
        "employee_id",
        "legal_entity_id",
        "branch_id",
        "location_id",
        "department_id",
        "grade_id",
        "employment_type_id",
    ]
    exact = True
    for field_name in comparable_fields:
        candidate_value = candidate_scope.get(field_name)
        existing_value = getattr(existing_assignment, field_name)
        if str(candidate_value or "") != str(existing_value or ""):
            exact = False
            break
    if exact:
        return "exact_scope"
    if candidate_scope.get("employee_id") or existing_assignment.employee_id:
        return "employee_override_overlap"
    return "partial_scope_overlap"


def _describe_attendance_assignment_priority_effect(*, candidate_priority: int, existing_priority: int) -> str:
    if candidate_priority < existing_priority:
        return "draft_wins"
    if candidate_priority > existing_priority:
        return "existing_wins"
    return "same_priority"


def preview_attendance_policy_assignment_conflicts(*, tenant, attendance_policy: AttendancePolicy, scope_data: dict, priority: int, item_id: str | None = None) -> dict:
    assignments = (
        AttendancePolicyAssignment.objects.filter(
            tenant=tenant,
            attendance_policy__tenant=tenant,
            is_active=True,
        )
        .exclude(id=item_id)
        .select_related(
            "attendance_policy",
            "employee",
            "legal_entity",
            "branch",
            "location",
            "department",
            "grade",
            "employment_type",
        )
        .order_by("priority", "created_at")
    )

    conflicts: list[dict] = []
    has_blocking_conflict = False
    candidate_scope_labels = _build_attendance_assignment_scope_labels_from_scope(scope_data, tenant=tenant)
    for assignment in assignments:
        if not _attendance_assignment_scopes_overlap(scope_data, assignment):
            continue
        overlap_kind = _describe_attendance_assignment_overlap_kind(scope_data, assignment)
        priority_effect = _describe_attendance_assignment_priority_effect(
            candidate_priority=priority,
            existing_priority=assignment.priority,
        )
        is_same_priority = priority == assignment.priority
        is_exact_scope = overlap_kind == "exact_scope"
        is_same_granularity = (
            _attendance_assignment_resolution_signature(scope_data)
            == _attendance_assignment_resolution_signature(assignment)
        )
        if is_same_priority and (is_exact_scope or is_same_granularity):
            has_blocking_conflict = True
        conflicts.append(
            {
                "assignment_id": str(assignment.id),
                "policy_id": str(assignment.attendance_policy_id),
                "policy_name": assignment.attendance_policy.name,
                "priority": assignment.priority,
                "scope_labels": _attendance_assignment_scope_labels(assignment),
                "overlap_kind": overlap_kind,
                "priority_effect": priority_effect,
                "is_exact_scope": is_exact_scope,
                "is_same_priority": is_same_priority,
                "is_same_granularity": is_same_granularity,
            }
        )

    if has_blocking_conflict:
        summary = (
            "This assignment would create an ambiguous active route because another active attendance assignment "
            "already overlaps at the same priority and effective granularity."
        )
    elif conflicts:
        summary = (
            "This scope overlaps with other active attendance assignments. Review the priority order before rollout."
        )
    else:
        summary = "No active overlap detected for this attendance assignment."

    return {
        "has_conflicts": bool(conflicts),
        "has_blocking_conflict": has_blocking_conflict,
        "summary": summary,
        "candidate_scope": candidate_scope_labels,
        "conflicts": conflicts,
    }


def preview_attendance_policy_assignment_resolution(*, employee, as_of=None) -> dict:
    assignment = _find_matching_attendance_policy_assignment(employee, as_of=as_of)
    if not assignment:
        return {
            "has_resolution": False,
            "employee_id": str(employee.id),
            "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
            "policy_id": None,
            "policy_name": None,
            "assignment_id": None,
            "priority": None,
            "scope_labels": [],
            "summary": "No active attendance policy assignment resolves for this employee.",
        }

    return {
        "has_resolution": True,
        "employee_id": str(employee.id),
        "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
        "policy_id": str(assignment.attendance_policy_id),
        "policy_name": assignment.attendance_policy.name,
        "assignment_id": str(assignment.id),
        "priority": assignment.priority,
        "scope_labels": _attendance_assignment_scope_labels(assignment),
        "summary": f"{assignment.attendance_policy.name} currently resolves for this employee.",
    }


def _employee_shift_assignment_scope_labels(assignment: EmployeeShiftAssignment) -> list[str]:
    config_snapshot = normalize_employee_shift_assignment_config(
        getattr(assignment, "config_snapshot", {}),
        fallback_shift_id=str(assignment.shift_id),
        effective_from=assignment.effective_from,
    )
    rotation_entries = config_snapshot["rotation"]["entries"]
    coverage_label = (
        f"Rotation: {len(rotation_entries)} step{'s' if len(rotation_entries) != 1 else ''}"
        if assignment.assignment_kind == EmployeeShiftAssignmentKind.WEEKLY_ROTATION
        else assignment.shift.name
    )
    return [
        f"Employee: {assignment.employee.employee_code}",
        f"Window: {assignment.effective_from.isoformat()} to {assignment.effective_to.isoformat() if assignment.effective_to else 'open ended'}",
        f"{'Primary' if assignment.is_primary else 'Secondary'} {assignment.assignment_kind.replace('_', ' ')} assignment",
        f"Coverage: {coverage_label}",
    ]


def _get_shift_assignment_kind_priority(kind: str) -> int:
    if kind == EmployeeShiftAssignmentKind.TEMPORARY_OVERRIDE:
        return 3
    if kind == EmployeeShiftAssignmentKind.WEEKLY_ROTATION:
        return 2
    return 1


def _parse_rotation_anchor_date(value, *, fallback_date):
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return fallback_date
    return fallback_date


def _resolve_shift_from_assignment(assignment: EmployeeShiftAssignment, *, attendance_date):
    if assignment.assignment_kind != EmployeeShiftAssignmentKind.WEEKLY_ROTATION:
        return {
            "shift": assignment.shift,
            "assignment_kind": assignment.assignment_kind,
            "sequence_summary": assignment.shift.name,
            "config_snapshot": normalize_employee_shift_assignment_config(
                getattr(assignment, "config_snapshot", {}),
                fallback_shift_id=str(assignment.shift_id),
                effective_from=assignment.effective_from,
            ),
        }

    config_snapshot = normalize_employee_shift_assignment_config(
        getattr(assignment, "config_snapshot", {}),
        fallback_shift_id=str(assignment.shift_id),
        effective_from=assignment.effective_from,
    )
    rotation = config_snapshot["rotation"]
    entries = rotation["entries"]
    anchor_date = _parse_rotation_anchor_date(rotation.get("anchor_date"), fallback_date=assignment.effective_from)
    cycle_days = sum(int(entry["span_days"]) for entry in entries) or 7
    elapsed_days = max((attendance_date - anchor_date).days, 0)
    day_pointer = elapsed_days % cycle_days
    shift_ids = {entry["shift_id"] for entry in entries}
    shift_map = {
        str(item.id): item
        for item in Shift.objects.filter(tenant=assignment.tenant, id__in=shift_ids)
    }
    chosen_entry = entries[0]
    cumulative_days = 0
    for entry in entries:
        cumulative_days += int(entry["span_days"])
        if day_pointer < cumulative_days:
            chosen_entry = entry
            break
    chosen_shift = shift_map.get(chosen_entry["shift_id"], assignment.shift)
    sequence_summary = " -> ".join(
        f"{shift_map.get(entry['shift_id'], assignment.shift).name} ({entry['span_days']}d)"
        for entry in entries
    )
    return {
        "shift": chosen_shift,
        "assignment_kind": assignment.assignment_kind,
        "sequence_summary": sequence_summary,
        "config_snapshot": config_snapshot,
    }


def _shift_assignment_windows_overlap(*, start_a, end_a, start_b, end_b) -> bool:
    normalized_end_a = end_a or date.max
    normalized_end_b = end_b or date.max
    return start_a <= normalized_end_b and start_b <= normalized_end_a


def preview_employee_shift_assignment_conflicts(
    *,
    tenant,
    employee,
    shift,
    effective_from,
    effective_to,
    is_primary,
    assignment_kind: str = EmployeeShiftAssignmentKind.FIXED,
    item_id: str | None = None,
) -> dict:
    assignments = (
        EmployeeShiftAssignment.objects.filter(
            tenant=tenant,
            employee=employee,
        )
        .exclude(id=item_id)
        .select_related("employee", "shift")
        .order_by("-effective_from", "created_at")
    )
    conflicts: list[dict] = []
    has_blocking_conflict = False
    candidate_scope = [
        f"Employee: {employee.employee_code}",
        f"Window: {effective_from.isoformat()} to {effective_to.isoformat() if effective_to else 'open ended'}",
        f"{'Primary' if is_primary else 'Secondary'} {assignment_kind.replace('_', ' ')} assignment",
    ]
    for assignment in assignments:
        if not _shift_assignment_windows_overlap(
            start_a=effective_from,
            end_a=effective_to,
            start_b=assignment.effective_from,
            end_b=assignment.effective_to,
        ):
            continue
        is_exact_window = assignment.effective_from == effective_from and assignment.effective_to == effective_to
        is_primary_conflict = bool(is_primary and assignment.is_primary)
        if is_primary_conflict:
            has_blocking_conflict = True
        conflicts.append(
            {
                "assignment_id": str(assignment.id),
                "shift_id": str(assignment.shift_id),
                "shift_name": assignment.shift.name,
                "assignment_kind": assignment.assignment_kind,
                "effective_from": assignment.effective_from,
                "effective_to": assignment.effective_to,
                "is_primary": assignment.is_primary,
                "overlap_kind": "primary_overlap" if is_primary_conflict else "window_overlap",
                "is_exact_window": is_exact_window,
                "is_primary_conflict": is_primary_conflict,
            }
        )
    if has_blocking_conflict:
        summary = (
            "This shift assignment overlaps an existing primary shift assignment for the same employee. "
            "Only one primary shift assignment should cover a given date window."
        )
    elif conflicts:
        summary = (
            "This employee already has another shift assignment in the selected date window. Review whether that overlap is intentional."
        )
    else:
        summary = "No overlapping shift assignment detected for this employee and date window."
    return {
        "has_conflicts": bool(conflicts),
        "has_blocking_conflict": has_blocking_conflict,
        "summary": summary,
        "candidate_scope": candidate_scope,
        "conflicts": conflicts,
    }


def _find_matching_employee_shift_assignment(*, employee, attendance_date):
    assignments = list(
        EmployeeShiftAssignment.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            effective_from__lte=attendance_date,
        )
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=attendance_date))
        .select_related("employee", "shift")
    )
    assignments.sort(
        key=lambda item: (
            _get_shift_assignment_kind_priority(item.assignment_kind),
            1 if item.is_primary else 0,
            item.effective_from.toordinal(),
            item.created_at.timestamp(),
        ),
        reverse=True,
    )
    return assignments[0] if assignments else None


def preview_shift_roster_template_rollout(
    *,
    tenant,
    template,
    employee_queryset,
    effective_from,
    effective_to,
    is_primary,
    scope_snapshot: dict | None = None,
    actor=None,
    dry_run: bool = True,
):
    items: list[dict] = []
    created_count = 0
    skipped_count = 0
    has_blocking_conflicts = False
    normalized_config = normalize_employee_shift_assignment_config(
        getattr(template, "config_snapshot", {}),
        fallback_shift_id=str(template.shift_id),
        effective_from=effective_from,
    )
    created_assignments: list[tuple[object, object | None]] = []
    for employee in employee_queryset.order_by("employee_code"):
        conflict_check = preview_employee_shift_assignment_conflicts(
            tenant=tenant,
            employee=employee,
            shift=template.shift,
            effective_from=effective_from,
            effective_to=effective_to,
            is_primary=is_primary,
            assignment_kind=template.assignment_kind,
        )
        if conflict_check["has_blocking_conflict"]:
            has_blocking_conflicts = True
            skipped_count += 1
            items.append(
                {
                    "employee_id": str(employee.id),
                    "employee_name": f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code,
                    "employee_code": employee.employee_code,
                    "status": "skipped",
                    "reason": conflict_check["summary"],
                    "assignment_id": None,
                }
            )
            continue
        if dry_run:
            created_count += 1
            items.append(
                {
                    "employee_id": str(employee.id),
                    "employee_name": f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code,
                    "employee_code": employee.employee_code,
                    "status": "ready",
                    "reason": "Ready for rollout.",
                    "assignment_id": None,
                }
            )
            continue

        assignment = EmployeeShiftAssignment.objects.create(
            tenant=tenant,
            employee=employee,
            shift=template.shift,
            assignment_kind=template.assignment_kind,
            effective_from=effective_from,
            effective_to=effective_to,
            is_primary=is_primary,
            config_snapshot=normalized_config,
        )
        created_count += 1
        created_assignments.append((employee, assignment))
        items.append(
            {
                "employee_id": str(employee.id),
                "employee_name": f"{employee.first_name} {employee.last_name}".strip() or employee.employee_code,
                "employee_code": employee.employee_code,
                "status": "created",
                "reason": "Shift assignment created from roster template.",
                "assignment_id": str(assignment.id),
            }
        )

    if not items:
        summary = "No employees matched the selected rollout scope."
    elif dry_run:
        summary = f"{created_count} employee(s) are ready for rollout and {skipped_count} would be skipped."
    else:
        summary = f"{created_count} employee shift assignment(s) created and {skipped_count} skipped."

    rollout_id = None
    if not dry_run:
        rollout = ShiftRosterRollout.objects.create(
            tenant=tenant,
            template=template,
            initiated_by=actor,
            status=ShiftRosterRolloutStatus.COMPLETED,
            scope_snapshot=scope_snapshot or {},
            effective_from=effective_from,
            effective_to=effective_to,
            is_primary=is_primary,
            target_count=len(items),
            created_count=created_count,
            skipped_count=skipped_count,
            summary=summary,
        )
        employee_map = {str(employee.id): employee for employee in employee_queryset}
        assignment_map = {str(employee.id): assignment for employee, assignment in created_assignments}
        ShiftRosterRolloutItem.objects.bulk_create(
            [
                ShiftRosterRolloutItem(
                    rollout=rollout,
                    employee=employee_map.get(item["employee_id"]),
                    assignment=assignment_map.get(item["employee_id"]),
                    status=item["status"],
                    reason=item["reason"],
                )
                for item in items
            ]
        )
        rollout_id = str(rollout.id)

    return {
        "rollout_id": rollout_id,
        "template_id": str(template.id),
        "template_name": template.name,
        "target_count": len(items),
        "created_count": created_count,
        "skipped_count": skipped_count,
        "has_blocking_conflicts": has_blocking_conflicts,
        "summary": summary,
        "items": items,
    }


def get_shift_roster_rollout_employee_queryset(
    *,
    tenant,
    employee_ids=None,
    legal_entity_id=None,
    branch_id=None,
    location_id=None,
    department_id=None,
):
    queryset = Employee.objects.filter(
        tenant=tenant,
        employment_status__in=[EmploymentStatus.ACTIVE, EmploymentStatus.ON_NOTICE],
    )
    if employee_ids:
        queryset = queryset.filter(id__in=employee_ids)
    if legal_entity_id:
        queryset = queryset.filter(legal_entity_id=legal_entity_id)
    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)
    if location_id:
        queryset = queryset.filter(location_id=location_id)
    if department_id:
        queryset = queryset.filter(department_id=department_id)
    return queryset.distinct()


def preview_employee_shift_assignment_resolution(*, employee, attendance_date, end_date=None) -> dict:
    assignment = _find_matching_employee_shift_assignment(employee=employee, attendance_date=attendance_date)
    if not assignment:
        return {
            "has_resolution": False,
            "employee_id": str(employee.id),
            "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
            "attendance_date": attendance_date,
            "end_date": end_date,
            "shift_id": None,
            "shift_name": None,
            "assignment_id": None,
            "assignment_kind": None,
            "scope_labels": [],
            "sequence_summary": None,
            "sequence": [],
            "summary": "No shift assignment resolves for this employee on the selected date.",
        }
    resolved = _resolve_shift_from_assignment(assignment, attendance_date=attendance_date)
    sequence: list[dict] = []
    if end_date and end_date >= attendance_date:
        pointer = attendance_date
        while pointer <= end_date:
            sequence_assignment = _find_matching_employee_shift_assignment(employee=employee, attendance_date=pointer)
            if sequence_assignment:
                sequence_resolved = _resolve_shift_from_assignment(sequence_assignment, attendance_date=pointer)
                sequence.append(
                    {
                        "attendance_date": pointer,
                        "assignment_id": str(sequence_assignment.id),
                        "assignment_kind": sequence_assignment.assignment_kind,
                        "shift_id": str(sequence_resolved["shift"].id) if sequence_resolved["shift"] else None,
                        "shift_name": sequence_resolved["shift"].name if sequence_resolved["shift"] else None,
                        "sequence_summary": sequence_resolved["sequence_summary"],
                    }
                )
            else:
                sequence.append(
                    {
                        "attendance_date": pointer,
                        "assignment_id": None,
                        "assignment_kind": None,
                        "shift_id": None,
                        "shift_name": None,
                        "sequence_summary": "No shift assignment",
                    }
                )
            pointer += timedelta(days=1)
    return {
        "has_resolution": True,
        "employee_id": str(employee.id),
        "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
        "attendance_date": attendance_date,
        "end_date": end_date,
        "shift_id": str(resolved["shift"].id) if resolved["shift"] else None,
        "shift_name": resolved["shift"].name if resolved["shift"] else None,
        "assignment_id": str(assignment.id),
        "assignment_kind": assignment.assignment_kind,
        "scope_labels": _employee_shift_assignment_scope_labels(assignment),
        "sequence_summary": resolved["sequence_summary"],
        "config_snapshot": resolved["config_snapshot"],
        "sequence": sequence,
        "summary": f"{resolved['shift'].name if resolved['shift'] else 'No shift'} currently resolves for this employee on the selected date.",
    }


def resolve_attendance_policy_for_employee(employee, *, as_of=None) -> AttendancePolicy | None:
    assignment = _find_matching_attendance_policy_assignment(employee, as_of=as_of)
    return assignment.attendance_policy if assignment else None


def preview_attendance_policy_configuration(
    *,
    employee,
    attendance_date,
    check_in_at=None,
    check_out_at=None,
    explicit_status: str | None = None,
    default_shift=None,
    holiday_calendar=None,
    full_day_min_hours=None,
    half_day_min_hours=None,
    late_mark_after_minutes=None,
    overtime_threshold_minutes=None,
    config_snapshot: dict | None = None,
    policy_id: str | None = None,
    preview_shift=None,
) -> dict:
    current_assignment = _find_matching_attendance_policy_assignment(employee, as_of=attendance_date)
    current_policy = current_assignment.attendance_policy if current_assignment else None
    preview_policy = AttendancePolicy(
        tenant=employee.tenant,
        code="preview-attendance-policy",
        name="Preview attendance policy",
        status=AttendancePolicyStatus.ACTIVE,
        attendance_unit=current_policy.attendance_unit if current_policy else "day",
        default_shift=default_shift,
        holiday_calendar=holiday_calendar,
        full_day_min_hours=full_day_min_hours if full_day_min_hours is not None else (current_policy.full_day_min_hours if current_policy else DECIMAL_ZERO),
        half_day_min_hours=half_day_min_hours if half_day_min_hours is not None else (current_policy.half_day_min_hours if current_policy else DECIMAL_ZERO),
        late_mark_after_minutes=late_mark_after_minutes if late_mark_after_minutes is not None else (current_policy.late_mark_after_minutes if current_policy else 0),
        overtime_threshold_minutes=overtime_threshold_minutes if overtime_threshold_minutes is not None else (current_policy.overtime_threshold_minutes if current_policy else 0),
        allow_manual_entry=True,
        allow_web_checkin=True,
        allow_mobile_checkin=True,
        allow_geofenced_checkin=False,
        allow_regularization=True,
        require_regularization_reason=False,
        config_snapshot=normalize_attendance_policy_config(config_snapshot),
    )
    runtime = evaluate_attendance_runtime(
        employee=employee,
        attendance_date=attendance_date,
        check_in_at=check_in_at,
        check_out_at=check_out_at,
        explicit_status=explicit_status,
        shift=preview_shift,
        policy=preview_policy,
    )
    return {
        "current_resolved_policy_id": str(current_policy.id) if current_policy else None,
        "current_resolved_policy_name": current_policy.name if current_policy else None,
        "current_assignment_id": str(current_assignment.id) if current_assignment else None,
        "current_assignment_priority": current_assignment.priority if current_assignment else None,
        "current_assignment_scope": _attendance_assignment_scope_labels(current_assignment) if current_assignment else [],
        "draft_policy_matches_current_resolution": bool(current_policy and policy_id and str(current_policy.id) == str(policy_id)),
        "resolved_config": normalize_attendance_policy_config(preview_policy.config_snapshot),
        "derived_status": runtime["status"],
        "resolved_shift_id": str(runtime["shift"].id) if runtime["shift"] else None,
        "resolved_shift_name": runtime["shift"].name if runtime["shift"] else None,
        "matched_holiday_id": str(runtime["holiday"].id) if runtime["holiday"] else None,
        "matched_holiday_name": runtime["holiday"].name if runtime["holiday"] else None,
        "matched_holiday_type": runtime["holiday"].holiday_type if runtime["holiday"] else None,
        "work_duration_hours": f"{runtime['work_duration_hours']:.2f}",
        "overtime_hours": f"{runtime['overtime_hours']:.2f}",
        "late_minutes": runtime["late_minutes"],
        "early_exit_minutes": runtime["early_exit_minutes"],
    }


def _resolve_shift_for_employee(employee, *, attendance_date, fallback_shift=None):
    assignment = _find_matching_employee_shift_assignment(employee=employee, attendance_date=attendance_date)
    if assignment:
        return _resolve_shift_from_assignment(assignment, attendance_date=attendance_date)["shift"]
    return fallback_shift


def _resolve_holiday_calendar_for_employee(employee, *, attendance_date, policy: AttendancePolicy | None):
    if policy and policy.holiday_calendar_id and policy.holiday_calendar and policy.holiday_calendar.year == attendance_date.year:
        return policy.holiday_calendar
    calendars = (
        HolidayCalendar.objects.filter(
            tenant=employee.tenant,
            year=attendance_date.year,
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
        specificity = sum(
            1
            for value in [calendar.legal_entity_id, calendar.branch_id, calendar.location_id]
            if value
        )
        candidates.append((specificity, calendar))
    if not candidates:
        return None
    candidates.sort(key=lambda item: (-item[0], str(item[1].created_at)))
    return candidates[0][1]


def _resolve_holiday_for_employee(employee, *, attendance_date, policy: AttendancePolicy | None):
    calendar = _resolve_holiday_calendar_for_employee(employee, attendance_date=attendance_date, policy=policy)
    if not calendar:
        return None
    return Holiday.objects.filter(calendar=calendar, date=attendance_date).order_by("created_at").first()


def _shift_window_datetimes(*, attendance_date, shift, tz):
    start_dt = timezone.make_aware(datetime.combine(attendance_date, shift.start_time), tz)
    end_date = attendance_date
    if shift.is_night_shift or shift.end_time <= shift.start_time:
        end_date = attendance_date + timedelta(days=1)
    end_dt = timezone.make_aware(datetime.combine(end_date, shift.end_time), tz)
    return start_dt, end_dt


def evaluate_attendance_runtime(
    *,
    employee,
    attendance_date,
    check_in_at=None,
    check_out_at=None,
    explicit_status: str | None = None,
    shift=None,
    policy: AttendancePolicy | None = None,
) -> dict:
    policy = policy or resolve_attendance_policy_for_employee(employee, as_of=attendance_date)
    policy_config = normalize_attendance_policy_config(getattr(policy, "config_snapshot", {}))
    derivation_rules = policy_config["derivation"]
    shift = shift or _resolve_shift_for_employee(employee, attendance_date=attendance_date, fallback_shift=getattr(policy, "default_shift", None))
    holiday = _resolve_holiday_for_employee(employee, attendance_date=attendance_date, policy=policy)
    weekday_name = attendance_date.strftime("%A").lower()
    is_weekly_off = bool(shift and weekday_name in {str(day).lower() for day in (shift.weekly_off_days or [])})

    work_duration_hours = DECIMAL_ZERO
    late_minutes = 0
    early_exit_minutes = 0
    overtime_hours = DECIMAL_ZERO

    if check_in_at and check_out_at and check_out_at > check_in_at:
        seconds = Decimal(str((check_out_at - check_in_at).total_seconds()))
        work_duration_hours = (seconds / Decimal("3600")).quantize(DECIMAL_HUNDREDTH, rounding=ROUND_HALF_UP)

    if derivation_rules["enabled"]:
        derived_status = explicit_status or AttendanceStatus.PRESENT
        if explicit_status in {AttendanceStatus.REMOTE, AttendanceStatus.ON_LEAVE}:
            derived_status = explicit_status
        elif derivation_rules["auto_mark_holiday"] and holiday:
            derived_status = AttendanceStatus.HOLIDAY
        elif derivation_rules["auto_mark_weekly_off"] and is_weekly_off:
            derived_status = AttendanceStatus.WEEKLY_OFF
        elif not check_in_at and not check_out_at:
            if explicit_status in {AttendanceStatus.REMOTE, AttendanceStatus.ON_LEAVE}:
                derived_status = explicit_status
            else:
                derived_status = derivation_rules["missing_punch_status"]
        elif not check_in_at or not check_out_at:
            if explicit_status in {AttendanceStatus.REMOTE, AttendanceStatus.ON_LEAVE}:
                derived_status = explicit_status
            else:
                derived_status = derivation_rules["missing_punch_status"]
        else:
            full_day_hours = _quantize_hours(getattr(policy, "full_day_min_hours", 0) if policy else 0)
            half_day_hours = _quantize_hours(getattr(policy, "half_day_min_hours", 0) if policy else 0)
            if full_day_hours > DECIMAL_ZERO and work_duration_hours >= full_day_hours:
                derived_status = AttendanceStatus.PRESENT
            elif half_day_hours > DECIMAL_ZERO and work_duration_hours >= half_day_hours:
                derived_status = AttendanceStatus.HALF_DAY
            elif explicit_status in {AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY, AttendanceStatus.LATE} and work_duration_hours > DECIMAL_ZERO:
                derived_status = AttendanceStatus.HALF_DAY if explicit_status == AttendanceStatus.HALF_DAY else AttendanceStatus.PRESENT
            else:
                derived_status = AttendanceStatus.ABSENT

            if shift and not shift.is_flexible:
                tz = timezone.get_current_timezone()
                shift_start_dt, shift_end_dt = _shift_window_datetimes(attendance_date=attendance_date, shift=shift, tz=tz)
                grace_in = shift_start_dt + timedelta(minutes=shift.grace_in_minutes)
                grace_out = shift_end_dt - timedelta(minutes=shift.grace_out_minutes)
                if check_in_at > grace_in:
                    late_minutes = max(int((check_in_at - shift_start_dt).total_seconds() // 60), 0)
                if check_out_at < grace_out:
                    early_exit_minutes = max(int((shift_end_dt - check_out_at).total_seconds() // 60), 0)
                if derivation_rules["derive_overtime"] and getattr(policy, "overtime_threshold_minutes", 0) is not None:
                    shift_working_hours = _quantize_hours(getattr(shift, "working_hours", 0))
                    overtime_threshold = Decimal(str(getattr(policy, "overtime_threshold_minutes", 0) or 0)) / Decimal("60")
                    threshold_hours = shift_working_hours + overtime_threshold
                    if work_duration_hours > threshold_hours:
                        overtime_hours = (work_duration_hours - threshold_hours).quantize(DECIMAL_HUNDREDTH, rounding=ROUND_HALF_UP)

                if late_minutes > 0 and derivation_rules["late_status_mode"] == "late" and derived_status == AttendanceStatus.PRESENT:
                    derived_status = AttendanceStatus.LATE
        status = derived_status
    else:
        status = explicit_status or AttendanceStatus.UNKNOWN

    return {
        "policy": policy,
        "policy_config": policy_config,
        "shift": shift,
        "holiday": holiday,
        "status": status,
        "work_duration_hours": work_duration_hours,
        "late_minutes": late_minutes,
        "early_exit_minutes": early_exit_minutes,
        "overtime_hours": overtime_hours,
    }


@transaction.atomic
def submit_regularization(
    *,
    employee,
    attendance_record: AttendanceRecord,
    requested_status: str,
    requested_check_in_at=None,
    requested_check_out_at=None,
    reason: str = "",
) -> AttendanceRegularization:
    """Creates and submits an attendance regularization request."""
    if attendance_record.is_locked:
        raise ValueError("Attendance regularization is blocked because the attendance record is locked.")
    if AttendanceRegularization.objects.filter(
        tenant=employee.tenant,
        employee=employee,
        attendance_record=attendance_record,
        status=RegularizationStatus.PENDING,
    ).exists():
        raise ValueError("A pending attendance regularization already exists for this attendance record.")
    policy = resolve_attendance_policy_for_employee(employee, as_of=attendance_record.attendance_date)
    if policy and not policy.allow_regularization:
        raise ValueError("Attendance regularization is not allowed under the active attendance policy.")
    if policy and policy.require_regularization_reason and not (reason or "").strip():
        raise ValueError("A regularization reason is required under the active attendance policy.")

    regularization = AttendanceRegularization.objects.create(
        tenant=employee.tenant,
        employee=employee,
        attendance_record=attendance_record,
        status=RegularizationStatus.PENDING,
        requested_status=requested_status,
        requested_check_in_at=requested_check_in_at,
        requested_check_out_at=requested_check_out_at,
        reason=reason,
        applied_at=timezone.now(),
    )
    manager_membership = employee.reporting_manager.membership if employee.reporting_manager and employee.reporting_manager.membership else None
    workflow_instance = create_workflow_instance(
        tenant=employee.tenant,
        module=WorkflowModule.ATTENDANCE,
        trigger_key="attendance.regularization",
        subject_type="attendance_regularization",
        subject_identifier=str(regularization.id),
        initiated_by_identifier=str(employee.membership.user_id) if employee.membership else str(employee.id),
        employee_identifier=str(employee.id),
        payload_snapshot={"attendance_regularization_id": str(regularization.id)},
        manager_membership=manager_membership,
    )
    regularization.workflow_reference = str(workflow_instance.id)
    regularization.save(update_fields=["workflow_reference", "updated_at"])
    if manager_membership:
        trigger_notification_event(
            tenant=employee.tenant,
            module=WorkflowModule.ATTENDANCE,
            trigger_key="attendance.regularization.manager_pending",
            recipient_membership=manager_membership,
            recipient_identifier=str(manager_membership.user_id),
            subject_type="attendance_regularization",
            subject_identifier=str(regularization.id),
            fallback_title="Attendance regularization pending approval",
            fallback_body=f"{employee.first_name} submitted an attendance regularization for {attendance_record.attendance_date}.",
            payload={"attendance_regularization_id": str(regularization.id)},
        )
    return regularization


@transaction.atomic
def resolve_regularization(*, regularization: AttendanceRegularization, actor_employee, approve: bool, comment: str = "") -> AttendanceRegularization:
    """Approves or rejects an attendance regularization request."""

    action = WorkflowAction.APPROVE if approve else WorkflowAction.REJECT
    regularization.status = RegularizationStatus.APPROVED if approve else RegularizationStatus.REJECTED
    regularization.manager_comment = comment if approve else regularization.manager_comment
    regularization.rejection_reason = "" if approve else comment
    regularization.resolved_at = timezone.now()
    regularization.save(
        update_fields=[
            "status",
            "manager_comment",
            "rejection_reason",
            "resolved_at",
            "updated_at",
        ]
    )
    if approve:
        record = regularization.attendance_record
        next_check_in_at = regularization.requested_check_in_at or record.check_in_at
        next_check_out_at = regularization.requested_check_out_at or record.check_out_at
        runtime = evaluate_attendance_runtime(
            employee=regularization.employee,
            attendance_date=record.attendance_date,
            check_in_at=next_check_in_at,
            check_out_at=next_check_out_at,
            explicit_status=regularization.requested_status,
            shift=record.shift,
        )
        record.status = runtime["status"]
        record.shift = runtime["shift"]
        record.holiday = runtime["holiday"]
        record.check_in_at = next_check_in_at
        record.check_out_at = next_check_out_at
        record.work_duration_hours = runtime["work_duration_hours"]
        record.overtime_hours = runtime["overtime_hours"]
        record.late_minutes = runtime["late_minutes"]
        record.early_exit_minutes = runtime["early_exit_minutes"]
        record.is_regularized = True
        record.save(
            update_fields=[
                "status",
                "shift",
                "holiday",
                "check_in_at",
                "check_out_at",
                "work_duration_hours",
                "overtime_hours",
                "late_minutes",
                "early_exit_minutes",
                "is_regularized",
                "updated_at",
            ]
        )
    if regularization.workflow_reference:
        from apps.workflows.models import WorkflowInstance

        instance = WorkflowInstance.objects.filter(id=regularization.workflow_reference).first()
        if instance:
            resolve_workflow_action(
                instance=instance,
                actor_identifier=str(actor_employee.membership.user_id) if actor_employee.membership else str(actor_employee.id),
                action=action,
                comment=comment,
            )
    if regularization.employee.membership:
        trigger_notification_event(
            tenant=regularization.tenant,
            module=WorkflowModule.ATTENDANCE,
            trigger_key="attendance.regularization.employee_updated",
            recipient_membership=regularization.employee.membership,
            recipient_identifier=str(regularization.employee.membership.user_id),
            subject_type="attendance_regularization",
            subject_identifier=str(regularization.id),
            fallback_title="Attendance regularization updated",
            fallback_body=f"Your attendance regularization was {'approved' if approve else 'rejected'}.",
            payload={"attendance_regularization_id": str(regularization.id), "status": regularization.status},
        )
    return regularization
