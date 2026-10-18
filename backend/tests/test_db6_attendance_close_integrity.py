from contextlib import redirect_stdout
from datetime import date
from io import StringIO

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import DatabaseError, connection, transaction

from apps.attendance.models import (
    AttendancePeriodClose, AttendancePeriodCloseEvent, AttendancePeriodCloseStatus, AttendanceRecord,
    AttendanceSource, AttendanceStatus,
)
from apps.attendance.services import AttendanceCloseError, reconcile_attendance_period, transition_attendance_close
from apps.organizations.models import LegalEntity
from apps.payroll.models import PayrollInputSnapshotStatus, PayrollRun
from apps.common.api_views import save_hr_admin_payroll_input_snapshot
from apps.tenants.models import Tenant


def provision(seed_ref):
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed_ref)
    return Tenant.objects.get(code=f"pw-qa-{seed_ref}")


@pytest.mark.django_db(transaction=True)
def test_monthly_close_is_idempotent_blocks_late_writes_and_reopens_with_history():
    if connection.vendor != "postgresql":
        pytest.skip("Attendance close database guards require PostgreSQL.")
    tenant = provision("db6-attendance-close")
    actor = tenant.employees.get(employee_code="QA-HR-001")
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    record = AttendanceRecord.objects.create(
        tenant=tenant, employee=employee, attendance_date=date(2029, 1, 15),
        status=AttendanceStatus.PRESENT, source=AttendanceSource.MANUAL,
    )
    close = reconcile_attendance_period(
        tenant=tenant, legal_entity=employee.legal_entity, period_start=date(2029, 1, 1),
        period_end=date(2029, 1, 31), actor=actor, idempotency_key="jan-2029-v1",
    )
    duplicate = reconcile_attendance_period(
        tenant=tenant, legal_entity=employee.legal_entity, period_start=date(2029, 1, 1),
        period_end=date(2029, 1, 31), actor=actor, idempotency_key="jan-2029-v1",
    )
    assert duplicate.id == close.id
    assert close.reconciliation_snapshot["payroll_impact"] == {
        "payable_units": "1.00", "lop_units": "0.00", "source": "attendance.derivation_summary.v1"
    }
    for action in ("submit", "approve", "close"):
        close = transition_attendance_close(close=close, actor=actor, action=action)
    assert close.status == AttendancePeriodCloseStatus.CLOSED
    record.refresh_from_db()
    assert record.is_locked is True
    with pytest.raises(DatabaseError), transaction.atomic():
        AttendanceRecord.objects.filter(pk=record.pk).update(status=AttendanceStatus.ABSENT)
    close = transition_attendance_close(close=close, actor=actor, action="reopen", reason="Approved correction DB6")
    assert close.status == AttendancePeriodCloseStatus.REOPENED
    assert AttendanceRecord.objects.filter(pk=record.pk).update(status=AttendanceStatus.ABSENT) == 1
    assert list(close.events.values_list("event_type", flat=True)) == ["reconciled", "submit", "approve", "close", "reopen"]
    event = close.events.first()
    with pytest.raises(DatabaseError), transaction.atomic():
        AttendancePeriodCloseEvent.objects.filter(pk=event.pk).update(reason="rewrite")


@pytest.mark.django_db(transaction=True)
def test_close_rejects_attendance_changed_after_reconciliation():
    if connection.vendor != "postgresql":
        pytest.skip("Attendance close database guards require PostgreSQL.")
    tenant = provision("db6-attendance-stale")
    actor = tenant.employees.get(employee_code="QA-HR-001")
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    record = AttendanceRecord.objects.create(
        tenant=tenant, employee=employee, attendance_date=date(2029, 2, 15),
        status=AttendanceStatus.PRESENT, source=AttendanceSource.MANUAL,
    )
    close = reconcile_attendance_period(
        tenant=tenant, legal_entity=employee.legal_entity, period_start=date(2029, 2, 1),
        period_end=date(2029, 2, 28), actor=actor, idempotency_key="feb-2029-v1",
    )
    close = transition_attendance_close(close=close, actor=actor, action="submit")
    close = transition_attendance_close(close=close, actor=actor, action="approve")
    AttendanceRecord.objects.filter(pk=record.pk).update(status=AttendanceStatus.ABSENT)

    with pytest.raises(AttendanceCloseError, match="changed after reconciliation"):
        transition_attendance_close(close=close, actor=actor, action="close")

    close.refresh_from_db()
    record.refresh_from_db()
    assert close.status == AttendancePeriodCloseStatus.APPROVED
    assert record.is_locked is False


@pytest.mark.django_db(transaction=True)
def test_close_rejects_blockers_cross_tenant_scope_and_unreasoned_reopen():
    if connection.vendor != "postgresql":
        pytest.skip("Attendance close database guards require PostgreSQL.")
    tenant_a = provision("db6-attendance-close-a")
    tenant_b = provision("db6-attendance-close-b")
    actor = tenant_a.employees.get(employee_code="QA-HR-001")
    employee = tenant_a.employees.get(employee_code="QA-EMP-001")
    close = reconcile_attendance_period(
        tenant=tenant_a, legal_entity=employee.legal_entity, period_start=date(2026, 10, 1),
        period_end=date(2026, 10, 31), actor=actor, idempotency_key="blocked-oct-2026",
    )
    assert close.blocker_count > 0
    with pytest.raises(AttendanceCloseError, match="Resolve missing attendance"):
        transition_attendance_close(close=close, actor=actor, action="submit")
    foreign_entity = LegalEntity.objects.get(tenant=tenant_b, code="qa-entity")
    with pytest.raises(AttendanceCloseError, match="Invalid legal entity"):
        reconcile_attendance_period(
            tenant=tenant_a, legal_entity=foreign_entity, period_start=date(2030, 1, 1),
            period_end=date(2030, 1, 31), actor=actor, idempotency_key="foreign",
        )


@pytest.mark.django_db(transaction=True)
def test_payroll_input_references_closed_attendance_version_and_rejects_reopened_source():
    tenant = provision("db6-attendance-payroll")
    actor = tenant.employees.get(employee_code="QA-HR-001")
    employee = tenant.employees.get(employee_code="QA-MGR-001")
    payroll_run = PayrollRun.objects.filter(tenant=tenant).select_related("period").first()
    close = AttendancePeriodClose.objects.create(
        tenant=tenant,
        legal_entity=employee.legal_entity,
        period_start=payroll_run.period.start_date,
        period_end=payroll_run.period.end_date,
        version=1,
        status=AttendancePeriodCloseStatus.CLOSED,
        idempotency_key="payroll-close-reference",
        reconciliation_snapshot={"schema_ref": "attendance.monthly_close.snapshot.v1"},
        snapshot_hash="a" * 64,
        closed_by=actor,
    )
    snapshot = save_hr_admin_payroll_input_snapshot(actor, {
        "payroll_run_id": payroll_run.id,
        "employee_id": employee.id,
        "snapshot_status": PayrollInputSnapshotStatus.READY,
        "validation_snapshot": {"blockers": [], "warnings": []},
    })
    assert snapshot.attendance_close_id == close.id

    close = transition_attendance_close(
        close=close, actor=actor, action="reopen", reason="Governed payroll correction"
    )
    with pytest.raises(ValidationError, match="must remain closed"):
        save_hr_admin_payroll_input_snapshot(
            actor, {"validation_snapshot": {"blockers": [], "warnings": ["review"]}}, item=snapshot
        )
