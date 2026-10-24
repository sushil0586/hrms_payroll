"""Deterministic, disposable fixtures for the deep attendance browser suite."""

import json
import os
from datetime import date, timedelta
from pathlib import Path

from django.apps import apps
from django.utils import timezone


def prepare(manifest_path: str) -> None:
    database = os.environ.get("POSTGRES_DB", "")
    host = os.environ.get("POSTGRES_HOST", "")
    if not database.startswith("hrms_") or host not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Attendance fixtures require an explicitly named local PostgreSQL database.")

    path = Path(manifest_path)
    manifest = json.loads(path.read_text())
    tenant = apps.get_model("tenants.Tenant").objects.get(pk=manifest["tenant"]["id"])
    if not tenant.is_sandbox or not tenant.code.startswith("pw-qa-") or manifest.get("ownership", {}).get("owner") != "playwright":
        raise RuntimeError("Refusing to seed a workspace that is not Playwright-owned and synthetic.")

    Employee = apps.get_model("employees.Employee")
    Record = apps.get_model("attendance.AttendanceRecord")
    Regularization = apps.get_model("attendance.AttendanceRegularization")
    Calendar = apps.get_model("attendance.HolidayCalendar")
    PolicyAssignment = apps.get_model("attendance.AttendancePolicyAssignment")
    ShiftAssignment = apps.get_model("attendance.EmployeeShiftAssignment")
    Roster = apps.get_model("attendance.ShiftRosterTemplate")
    PeriodClose = apps.get_model("attendance.AttendancePeriodClose")
    PeriodCloseEvent = apps.get_model("attendance.AttendancePeriodCloseEvent")

    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    actor = Employee.objects.get(pk=manifest["credentials"]["hr_admin"]["employee_id"], tenant=tenant)
    shift = tenant.shifts.get(pk=manifest["attendance"]["shift_id"])
    policy = tenant.attendance_policies.get(pk=manifest["attendance"]["policy_id"])
    marker = {"owner": "playwright", "suite": "attendance-family"}

    calendar = Calendar.objects.create(
        tenant=tenant, code="qa-deep-holidays", name="QA Deep Holiday Calendar",
        legal_entity=employee.legal_entity, year=2032,
    )
    assignment = ShiftAssignment.objects.get(tenant=tenant, employee=employee, shift=shift)
    policy_assignment = PolicyAssignment.objects.create(
        tenant=tenant, attendance_policy=policy, legal_entity=employee.legal_entity,
        priority=20, effective_from=date(2028, 1, 1), resolution_snapshot=marker,
    )
    roster = Roster.objects.create(
        tenant=tenant, code="qa-deep-roster", name="QA Deep Roster", shift=shift,
        description="Playwright-owned attendance fixture", config_snapshot=marker,
    )

    occupied = set(Record.objects.filter(employee=employee).values_list("attendance_date", flat=True))
    records = []
    cursor = date(2028, 1, 1)
    while len(records) < 530:
        if cursor not in occupied and cursor not in {date(2030, 1, 15), date(2032, 3, 3)}:
            index = len(records)
            records.append(Record(
                tenant=tenant, employee=employee, attendance_date=cursor,
                status="absent" if index % 3 == 0 else "present", source="system", shift=shift,
                work_duration_hours="0.00" if index % 3 == 0 else "8.00",
                source_payload=marker,
                notes="QA beyond-page-500" if index == 529 else f"QA attendance row {index + 1}",
            ))
        cursor += timedelta(days=1)
    Record.objects.bulk_create(records)

    late = Record.objects.create(
        tenant=tenant, employee=employee, attendance_date=date(2032, 3, 3), status="late",
        source="manual", shift=shift, work_duration_hours="8.00", late_minutes=10,
        source_payload=marker, notes="QA exact combined-filter record",
    )
    closed_record = Record.objects.create(
        tenant=tenant, employee=employee, attendance_date=date(2030, 1, 15), status="present",
        source="manual", shift=shift, work_duration_hours="8.00", is_locked=True,
        source_payload=marker, notes="QA closed-period record",
    )

    draft_records = list(Record.objects.filter(employee=employee).exclude(pk__in=[late.pk, closed_record.pk]).order_by("attendance_date")[:15])
    Regularization.objects.bulk_create([
        Regularization(
            tenant=tenant, employee=employee, attendance_record=record, status="draft",
            requested_status="present", reason=f"QA draft regularization {index + 1}", evidence_payload=marker,
        )
        for index, record in enumerate(draft_records)
    ])

    now = timezone.now()
    close = PeriodClose.objects.create(
        tenant=tenant, legal_entity=employee.legal_entity, period_start=date(2030, 1, 1),
        period_end=date(2030, 1, 31), status="closed", idempotency_key=f"playwright:{tenant.code}:attendance-close:2030-01",
        reconciliation_snapshot={"owner": "playwright", "record_ids": [str(closed_record.pk)]},
        employee_count=1, attendance_record_count=1, closed_by=actor, closed_at=now,
    )
    PeriodCloseEvent.objects.create(
        close=close, tenant=tenant, event_type="closed", actor=actor,
        reason="Playwright deep attendance fixture", evidence_snapshot=marker, occurred_at=now,
    )

    # The base workspace intentionally gives both HR personas the broad HR role.
    # This suite needs a genuine view-only persona for authorization assertions.
    MembershipRole = apps.get_model("iam.MembershipRole")
    Role = apps.get_model("iam.Role")
    RolePermission = apps.get_model("iam.RolePermission")
    checker_membership = tenant.memberships.get(user__username=manifest["credentials"]["hr_checker"]["username"])
    viewer_role = Role.objects.create(
        tenant=tenant, code="hr-attendance-viewer", name="HR Attendance Viewer",
        description="Playwright-owned attendance view-only role.",
    )
    RolePermission.objects.create(role=viewer_role, permission_key="attendance.view")
    MembershipRole.objects.filter(membership=checker_membership).delete()
    MembershipRole.objects.create(membership=checker_membership, role=viewer_role, is_primary=True)

    manifest["a1"] = {"closed_id": str(closed_record.pk), "late_id": str(late.pk)}
    manifest["family"] = {
        "calendar_id": str(calendar.pk), "assignment_id": str(assignment.pk),
        "policy_assignment_id": str(policy_assignment.pk), "roster_id": str(roster.pk),
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n")
