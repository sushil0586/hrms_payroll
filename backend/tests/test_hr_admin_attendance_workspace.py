"""HR-A1: actual bulk API ownership, validation and closed-snapshot protection."""
from contextlib import redirect_stdout
from datetime import date
from io import StringIO
from uuid import uuid4
import pytest
from django.core.management import call_command
from django.db import connection
from rest_framework.test import APIClient
from apps.attendance.models import AttendanceRecord, AttendanceStatus, AttendanceSource
from apps.attendance.services import reconcile_attendance_period, transition_attendance_close
from apps.tenants.models import Tenant

pytestmark = pytest.mark.django_db(transaction=True)
URL = "/api/v1/hr-admin/attendance-records/bulk-actions/"


def provision():
    seed = f"a1-{uuid4().hex[:10]}"
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed)
    return Tenant.objects.get(code=f"pw-qa-{seed}")


@pytest.fixture
def scope():
    tenant = provision()
    actor = tenant.employees.get(employee_code="QA-HR-001")
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    record = AttendanceRecord.objects.create(tenant=tenant, employee=employee, attendance_date=date(2033, 1, 15), status=AttendanceStatus.PRESENT, source=AttendanceSource.MANUAL, work_duration_hours="8.00")
    client = APIClient()
    client.force_authenticate(actor.membership.user)
    return tenant, actor, record, client


def test_bulk_open_actions_preserve_record_timing_and_retry(scope):
    _, _, record, client = scope
    record.refresh_from_db()
    timing = (record.check_in_at, record.check_out_at, record.work_duration_hours, record.overtime_hours)
    for action in ("lock", "lock", "unlock", "mark_regularized", "clear_regularized"):
        response = client.post(URL, {"action": action, "record_ids": [str(record.id), str(record.id)]}, format="json")
        assert response.status_code == 200
        assert response.data["updated_count"] == 1
    response = client.post(URL, {"action": "set_status", "status": "absent", "record_ids": [str(record.id)]}, format="json")
    assert response.status_code == 200
    record.refresh_from_db()
    assert record.status == "absent"
    assert (record.check_in_at, record.check_out_at, record.work_duration_hours, record.overtime_hours) == timing


def test_bulk_foreign_id_is_scoped_noop(scope):
    _, _, record, client = scope
    other = provision().attendance_records.first()
    before = (other.status, other.is_locked, other.is_regularized)
    response = client.post(URL, {"action": "lock", "record_ids": [str(other.id)]}, format="json")
    assert response.status_code == 200 and response.data["updated_count"] == 0  # existing API contract
    other.refresh_from_db()
    assert (other.status, other.is_locked, other.is_regularized) == before
    assert record.tenant_id != other.tenant_id


def test_bulk_employee_permission_rejected(scope):
    _, _, record, client = scope
    client.force_authenticate(record.employee.membership.user)
    assert client.post(URL, {"action": "lock", "record_ids": [str(record.id)]}, format="json").status_code == 403
    record.refresh_from_db()
    assert record.is_locked is False


@pytest.mark.parametrize("body", [{"action": "lock", "record_ids": []}, {"action": "set_status", "record_ids": [str(uuid4())]}, {"action": "delete", "record_ids": [str(uuid4())]}])
def test_bulk_invalid_requests_rejected(scope, body):
    _, _, record, client = scope
    assert client.post(URL, body, format="json").status_code == 400
    record.refresh_from_db()
    assert record.status == "present" and record.is_locked is False


def test_bulk_closed_period_rejects_whole_batch_without_snapshot_change(scope):
    assert connection.vendor == "postgresql"
    tenant, actor, record, client = scope
    close = reconcile_attendance_period(tenant=tenant, legal_entity=record.employee.legal_entity, period_start=date(2033, 1, 1), period_end=date(2033, 1, 31), actor=actor, idempotency_key="a1-close")
    for action in ("submit", "approve", "close"):
        close = transition_attendance_close(close=close, actor=actor, action=action)
    snapshot = (close.snapshot_hash, close.reconciliation_snapshot, close.events.count())
    open_record = AttendanceRecord.objects.create(tenant=tenant, employee=record.employee, attendance_date=date(2033, 2, 1), status="present", source="manual")
    client.raise_request_exception = False
    for action in ("unlock", "set_status", "mark_regularized"):
        response = client.post(URL, {"action": action, "status": "absent", "record_ids": [str(open_record.id), str(record.id)]}, format="json")
        assert response.status_code == 400
        assert "attendance period is closed" in response.json()["record_ids"][0]
        record.refresh_from_db(); open_record.refresh_from_db(); close.refresh_from_db()
        assert record.status == "present" and record.is_locked is True and record.is_regularized is False
        assert open_record.status == "present" and open_record.is_regularized is False
        assert (close.snapshot_hash, close.reconciliation_snapshot, close.events.count()) == snapshot


def test_unrelated_database_failure_is_not_disguised_as_validation(scope):
    from unittest.mock import patch
    from django.db import DatabaseError
    _, _, record, client = scope
    client.raise_request_exception = False
    with patch("django.db.models.query.QuerySet.update", side_effect=DatabaseError("Synthetic unrelated database failure")):
        assert client.post(URL, {"action": "lock", "record_ids": [str(record.id)]}, format="json").status_code == 500
    record.refresh_from_db()
    assert record.is_locked is False


@pytest.mark.parametrize("resource", ["shifts", "attendance-policies", "holiday-calendars", "attendance-policy-assignments", "employee-shift-assignments", "shift-roster-templates"])
def test_attendance_family_foreign_details_and_mutations_are_rejected(scope, resource):
    from apps.attendance.models import HolidayCalendar, ShiftRosterTemplate
    _, _, _, client = scope
    other = provision()
    calendar = HolidayCalendar.objects.create(tenant=other, code="foreign-qa", name="Foreign QA", year=2036)
    roster = ShiftRosterTemplate.objects.create(tenant=other, code="foreign-qa", name="Foreign QA", shift=other.shifts.first())
    records = {
        "shifts": other.shifts.first(), "attendance-policies": other.attendance_policies.first(),
        "holiday-calendars": calendar, "attendance-policy-assignments": other.attendance_policy_assignments.first(),
        "employee-shift-assignments": other.employee_shift_assignments.first(), "shift-roster-templates": roster,
    }
    url = f"/api/v1/hr-admin/{resource}/{records[resource].id}/"
    assert client.get(url).status_code == 404
    assert client.patch(url, {}, format="json").status_code == 404


@pytest.mark.parametrize("resource", ["shifts", "attendance-policies", "holiday-calendars", "attendance-policy-assignments", "employee-shift-assignments", "shift-roster-templates"])
def test_attendance_family_employee_cannot_read_admin_catalogs(scope, resource):
    _, _, record, client = scope
    client.force_authenticate(record.employee.membership.user)
    assert client.get(f"/api/v1/hr-admin/{resource}/").status_code == 403
