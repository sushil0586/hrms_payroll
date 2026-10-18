from datetime import date, time
from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.attendance.models import (
    EmployeeShiftAssignment,
    EmployeeShiftAssignmentKind,
    Shift,
    ShiftRosterRollout,
    ShiftRosterRolloutItem,
    ShiftRosterTemplate,
    ShiftRosterTemplateStatus,
)
from apps.attendance.services import preview_shift_roster_template_rollout
from apps.employees.models import Employee, EmploymentStatus
from apps.tenants.models import Tenant


def attendance_scope(code: str):
    tenant = Tenant.objects.create(code=code, name=code, is_sandbox=True)
    employees = [
        Employee.objects.create(
            tenant=tenant,
            employee_code=f"EMP-{code}-{index}",
            first_name=f"Employee {index}",
            employment_status=EmploymentStatus.ACTIVE,
            date_of_joining=date(2024, 1, 1),
        )
        for index in range(1, 3)
    ]
    shift = Shift.objects.create(
        tenant=tenant,
        code=f"shift-{code}",
        name="DD4 Day Shift",
        start_time=time(9),
        end_time=time(18),
        working_hours=Decimal("8.00"),
    )
    template = ShiftRosterTemplate.objects.create(
        tenant=tenant,
        code=f"roster-{code}",
        name="DD4 Roster",
        status=ShiftRosterTemplateStatus.PUBLISHED,
        shift=shift,
        assignment_kind=EmployeeShiftAssignmentKind.FIXED,
    )
    return tenant, employees, template


@pytest.mark.django_db(transaction=True)
def test_roster_rollout_failure_rolls_back_assignments_and_audit():
    tenant, employees, template = attendance_scope("dd4-rollback")

    with patch.object(ShiftRosterRolloutItem.objects, "bulk_create", side_effect=RuntimeError("audit write failed")):
        with pytest.raises(RuntimeError, match="audit write failed"):
            preview_shift_roster_template_rollout(
                tenant=tenant,
                template=template,
                employee_queryset=Employee.objects.filter(id__in=[item.id for item in employees]),
                effective_from=date(2027, 1, 1),
                effective_to=date(2027, 1, 31),
                is_primary=True,
                scope_snapshot={"certification": "DD-AT-005"},
                dry_run=False,
            )

    assert not EmployeeShiftAssignment.objects.filter(tenant=tenant).exists()
    assert not ShiftRosterRollout.objects.filter(tenant=tenant).exists()


@pytest.mark.django_db(transaction=True)
def test_roster_rollout_retry_does_not_duplicate_employee_assignments():
    tenant, employees, template = attendance_scope("dd4-retry")
    queryset = Employee.objects.filter(id__in=[item.id for item in employees])
    inputs = {
        "tenant": tenant,
        "template": template,
        "employee_queryset": queryset,
        "effective_from": date(2027, 2, 1),
        "effective_to": date(2027, 2, 28),
        "is_primary": True,
        "scope_snapshot": {"certification": "DD-AT-005"},
        "dry_run": False,
    }

    first = preview_shift_roster_template_rollout(**inputs)
    second = preview_shift_roster_template_rollout(**inputs)

    assert first["created_count"] == 2
    assert second["created_count"] == 0
    assert second["skipped_count"] == 2
    assert EmployeeShiftAssignment.objects.filter(tenant=tenant).count() == 2
    assert ShiftRosterRollout.objects.filter(tenant=tenant).count() == 2
