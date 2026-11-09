"""Effective-dated employment state and lifecycle transition services."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.employee_lifecycle.models import (
    EmployeeMovement,
    EmploymentAssignment,
    EmploymentAssignmentStatus,
    EmploymentSpell,
    EmploymentSpellStatus,
)
from apps.employees.models import Employee
from apps.platform_config.models import ConfigStatus, TenantConfiguration


MOVEMENT_BACKDATING_WINDOW_CONFIG_KEY = "lifecycle.movement_backdating_window_days"


ASSIGNMENT_FIELDS = (
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


@dataclass(frozen=True)
class EmploymentScope:
    legal_entity_id: object | None
    branch_id: object | None
    location_id: object | None
    department_id: object | None
    business_unit_id: object | None
    cost_center_id: object | None
    designation_id: object | None
    grade_id: object | None
    employment_type_id: object | None
    reporting_manager_id: object | None
    source: str
    assignment_id: object | None = None


def _scope_from(value, source: str) -> EmploymentScope:
    return EmploymentScope(
        **{f"{field}_id": getattr(value, f"{field}_id", None) for field in ASSIGNMENT_FIELDS},
        source=source,
        assignment_id=getattr(value, "id", None) if source == "employment_assignment" else None,
    )


def resolve_employment_assignment(employee: Employee, *, as_of: date) -> EmploymentAssignment | None:
    return (
        EmploymentAssignment.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            status__in=[EmploymentAssignmentStatus.ACTIVE, EmploymentAssignmentStatus.PLANNED, EmploymentAssignmentStatus.SUPERSEDED],
            effective_from__lte=as_of,
        )
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=as_of))
        .select_related("employment_spell")
        .order_by("-effective_from", "-created_at")
        .first()
    )


def resolve_employment_scope(employee: Employee, *, as_of: date) -> EmploymentScope:
    assignment = resolve_employment_assignment(employee, as_of=as_of)
    return _scope_from(assignment, "employment_assignment") if assignment else _scope_from(employee, "legacy_employee_projection")


def resolve_movement_backdating_window_days(tenant) -> int:
    """Return the published tenant window; missing or invalid policy fails closed."""

    configuration = (
        TenantConfiguration.objects.filter(
            tenant=tenant,
            definition__key=MOVEMENT_BACKDATING_WINDOW_CONFIG_KEY,
            status=ConfigStatus.PUBLISHED,
        )
        .filter(Q(effective_from__isnull=True) | Q(effective_from__lte=timezone.now()))
        .select_related("definition")
        .first()
    )
    value = configuration.published_value if configuration else 0
    if isinstance(value, bool) or not isinstance(value, int):
        return 0
    return max(value, 0)


@transaction.atomic
def initialize_employment_timeline(
    *, employee_id, actor_identifier: str, approved_source_reference: str, effective_from: date | None = None
) -> EmploymentAssignment:
    """Create an explicitly approved baseline; never called as an implicit migration."""

    employee = Employee.objects.select_for_update().select_related("tenant").get(id=employee_id)
    if EmploymentAssignment.objects.filter(employee=employee).exists():
        raise ValidationError("An employment timeline already exists for this employee.")
    if not employee.legal_entity_id:
        raise ValidationError("A legal entity is required before approving an employment baseline.")
    if not approved_source_reference.strip():
        raise ValidationError("An approved source reference is required for timeline initialization.")
    start = effective_from or employee.date_of_joining
    if not start:
        raise ValidationError("An approved employment start date is required for timeline initialization.")
    now = timezone.now()
    spell = EmploymentSpell.objects.create(
        tenant=employee.tenant,
        employee=employee,
        sequence=1,
        started_on=start,
        status=EmploymentSpellStatus.ACTIVE,
        legal_entity=employee.legal_entity,
        employment_type=employee.employment_type,
        source_reference=approved_source_reference,
        approved_by_identifier=actor_identifier,
        approved_at=now,
        evidence_snapshot={"source": "approved_current_projection"},
    )
    return EmploymentAssignment.objects.create(
        tenant=employee.tenant,
        employee=employee,
        employment_spell=spell,
        effective_from=start,
        status=EmploymentAssignmentStatus.ACTIVE,
        source_reference=approved_source_reference,
        approved_by_identifier=actor_identifier,
        approved_at=now,
        evidence_snapshot={"source": "approved_current_projection"},
        **{field: getattr(employee, field) for field in ASSIGNMENT_FIELDS},
    )


@transaction.atomic
def apply_completed_movement(movement_id, *, actor_identifier: str) -> EmploymentAssignment:
    movement = (
        EmployeeMovement.objects.select_for_update()
        .select_related("employee", "employee__tenant")
        .get(id=movement_id)
    )
    if movement.resulting_assignment_id:
        return movement.resulting_assignment
    employee = Employee.objects.select_for_update().get(id=movement.employee_id)
    today = timezone.localdate()
    if movement.effective_date < today:
        window_days = resolve_movement_backdating_window_days(movement.tenant)
        age_days = (today - movement.effective_date).days
        if window_days == 0 or age_days > window_days:
            raise ValidationError(
                f"Backdated movements are limited to the configured {window_days}-day window."
            )
    current = (
        EmploymentAssignment.objects.select_for_update()
        .filter(
            tenant=movement.tenant,
            employee=employee,
            status__in=[EmploymentAssignmentStatus.ACTIVE, EmploymentAssignmentStatus.PLANNED],
            effective_from__lte=movement.effective_date,
        )
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=movement.effective_date))
        .order_by("-effective_from")
        .first()
    )
    if not current:
        raise ValidationError(
            "Employment timeline classification is required before completing this movement; historical dates will not be inferred."
        )
    target_entity_id = movement.to_legal_entity_id or current.legal_entity_id
    if target_entity_id != current.legal_entity_id:
        raise ValidationError(
            "Cross-legal-entity transfer is blocked until approved leave, payroll, statutory, fiscal-calendar, and continuity decisions are recorded."
        )
    if movement.effective_date == current.effective_from:
        raise ValidationError("A same-day replacement requires the approved retroactive-correction workflow.")

    target_values = {field: getattr(current, field) for field in ASSIGNMENT_FIELDS}
    movement_map = {
        "legal_entity": "to_legal_entity",
        "branch": "to_branch",
        "location": "to_location",
        "department": "to_department",
        "business_unit": "to_business_unit",
        "designation": "to_designation",
        "grade": "to_grade",
        "employment_type": "to_employment_type",
        "reporting_manager": "to_manager",
    }
    for target_field, movement_field in movement_map.items():
        value = getattr(movement, movement_field)
        if value is not None:
            target_values[target_field] = value

    activates_immediately = movement.effective_date <= timezone.localdate()
    current.effective_to = movement.effective_date - timedelta(days=1)
    if activates_immediately:
        current.status = EmploymentAssignmentStatus.SUPERSEDED
    current.save(update_fields=["effective_to", "status", "updated_at"])
    assignment = EmploymentAssignment.objects.create(
        tenant=movement.tenant,
        employee=employee,
        employment_spell=current.employment_spell,
        effective_from=movement.effective_date,
        status=EmploymentAssignmentStatus.ACTIVE if activates_immediately else EmploymentAssignmentStatus.PLANNED,
        source_reference=f"employee_movement:{movement.id}",
        approved_by_identifier=actor_identifier,
        approved_at=timezone.now(),
        evidence_snapshot={"movement_type": movement.movement_type, "reason": movement.reason},
        **target_values,
    )
    movement.resulting_assignment = assignment
    movement.save(update_fields=["resulting_assignment", "updated_at"])
    if activates_immediately:
        for field, value in target_values.items():
            setattr(employee, field, value)
        employee.save(update_fields=[*ASSIGNMENT_FIELDS, "updated_at"])
    return assignment


@transaction.atomic
def activate_due_employment_assignments(*, as_of: date | None = None) -> list[EmploymentAssignment]:
    """Activate due planned assignments exactly once and refresh employee projections."""

    activation_date = as_of or timezone.localdate()
    due_ids = list(
        EmploymentAssignment.objects.filter(
            status=EmploymentAssignmentStatus.PLANNED,
            effective_from__lte=activation_date,
        )
        .order_by("employee_id", "effective_from", "created_at")
        .values_list("id", flat=True)
    )
    activated: list[EmploymentAssignment] = []
    for assignment_id in due_ids:
        assignment = EmploymentAssignment.objects.select_for_update().select_related("employee").get(id=assignment_id)
        if assignment.status != EmploymentAssignmentStatus.PLANNED or assignment.effective_from > activation_date:
            continue
        employee = Employee.objects.select_for_update().get(id=assignment.employee_id)
        EmploymentAssignment.objects.select_for_update().filter(
            tenant=assignment.tenant,
            employee=employee,
            status=EmploymentAssignmentStatus.ACTIVE,
            effective_to__lt=assignment.effective_from,
        ).exclude(id=assignment.id).update(status=EmploymentAssignmentStatus.SUPERSEDED)
        assignment.status = EmploymentAssignmentStatus.ACTIVE
        assignment.evidence_snapshot = {
            **assignment.evidence_snapshot,
            "activated_on": activation_date.isoformat(),
        }
        assignment.save(update_fields=["status", "evidence_snapshot", "updated_at"])
        for field in ASSIGNMENT_FIELDS:
            setattr(employee, field, getattr(assignment, field))
        employee.save(update_fields=[*ASSIGNMENT_FIELDS, "updated_at"])
        activated.append(assignment)
    return activated


def classify_employment_history(tenant) -> dict:
    employees = Employee.objects.filter(tenant=tenant)
    without_timeline = employees.exclude(employment_assignments__isnull=False).count()
    multiple_open = 0
    for employee_id in employees.values_list("id", flat=True):
        if EmploymentAssignment.objects.filter(employee_id=employee_id, effective_to__isnull=True).count() > 1:
            multiple_open += 1
    return {
        "tenant_id": str(tenant.id),
        "employee_count": employees.count(),
        "without_timeline_count": without_timeline,
        "multiple_open_timeline_count": multiple_open,
        "classification_mode": "read_only",
        "automatic_backfill_performed": False,
    }
