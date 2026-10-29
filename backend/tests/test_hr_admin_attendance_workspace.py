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


def test_duplicate_roster_template_code_returns_validation_without_second_row(scope):
    from apps.attendance.models import ShiftRosterTemplate

    tenant, actor, _, client = scope
    shift = tenant.shifts.first()
    ShiftRosterTemplate.objects.create(tenant=tenant, code="duplicate-qa", name="Existing QA", shift=shift)
    before = ShiftRosterTemplate.objects.filter(tenant=tenant, code="duplicate-qa").count()

    response = client.post(
        "/api/v1/hr-admin/shift-roster-templates/",
        {
            "code": "duplicate-qa",
            "name": "Duplicate QA",
            "status": "draft",
            "shift_id": str(shift.id),
            "assignment_kind": "fixed",
            "config_snapshot": {},
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["code"] == "A roster template with this code already exists."
    assert ShiftRosterTemplate.objects.filter(tenant=tenant, code="duplicate-qa").count() == before


def test_weekly_roster_update_rejects_explicit_empty_rotation(scope):
    from apps.attendance.models import ShiftRosterTemplate

    tenant, _, _, client = scope
    item = ShiftRosterTemplate.objects.create(tenant=tenant, code="rotation-qa", name="Rotation QA", shift=tenant.shifts.first())
    response = client.patch(
        f"/api/v1/hr-admin/shift-roster-templates/{item.id}/",
        {"assignment_kind": "weekly_rotation", "config_snapshot": {"rotation": {"anchor_date": None, "entries": []}}},
        format="json",
    )
    assert response.status_code == 400
    assert "at least one rotation step" in response.json()["config_snapshot"]
    item.refresh_from_db()
    assert item.assignment_kind == "fixed"


def test_assignment_update_rejects_stale_revision_and_writes_one_audit(scope):
    from apps.common.models import SaasCommercialAuditEvent

    tenant, _, _, client = scope
    item = tenant.employee_shift_assignments.select_related("employee", "shift").first()
    revision = item.updated_at.isoformat().replace("+00:00", "Z")
    url = f"/api/v1/hr-admin/employee-shift-assignments/{item.id}/"
    accepted = client.patch(url, {"is_primary": False, "expected_updated_at": revision}, format="json")
    stale = client.patch(url, {"is_primary": True, "expected_updated_at": revision}, format="json")

    assert accepted.status_code == 200
    assert stale.status_code == 409
    item.refresh_from_db()
    assert item.is_primary is False
    events = SaasCommercialAuditEvent.objects.filter(
        tenant=tenant,
        event_type="attendance_shift_assignment_updated",
        event_snapshot__assignment_id=str(item.id),
    )
    assert events.count() == 1
    assert events.get().event_snapshot["changed_fields"] == ["is_primary"]


def test_roster_update_rejects_stale_revision_and_writes_one_audit(scope):
    from apps.attendance.models import ShiftRosterTemplate
    from apps.common.models import SaasCommercialAuditEvent

    tenant, _, _, client = scope
    item = ShiftRosterTemplate.objects.create(tenant=tenant, code="stale-qa", name="Original", shift=tenant.shifts.first())
    revision = item.updated_at.isoformat().replace("+00:00", "Z")
    url = f"/api/v1/hr-admin/shift-roster-templates/{item.id}/"
    accepted = client.patch(url, {"name": "Accepted", "expected_updated_at": revision}, format="json")
    stale = client.patch(url, {"name": "Rejected", "expected_updated_at": revision}, format="json")

    assert accepted.status_code == 200
    assert stale.status_code == 409
    item.refresh_from_db()
    assert item.name == "Accepted"
    events = SaasCommercialAuditEvent.objects.filter(
        tenant=tenant,
        event_type="attendance_shift_roster_template_updated",
        event_snapshot__template_id=str(item.id),
    )
    assert events.count() == 1
    assert events.get().event_snapshot["changed_fields"] == ["name"]


def test_roster_create_writes_transactional_audit(scope):
    from apps.common.models import SaasCommercialAuditEvent

    tenant, _, _, client = scope
    response = client.post(
        "/api/v1/hr-admin/shift-roster-templates/",
        {
            "code": "wave14-audit",
            "name": "Wave 14 audited roster",
            "status": "draft",
            "assignment_kind": "fixed",
            "shift_id": str(tenant.shifts.first().id),
            "config_snapshot": {},
        },
        format="json",
    )

    assert response.status_code == 201
    assert tenant.shift_roster_templates.filter(id=response.data["id"]).count() == 1
    events = SaasCommercialAuditEvent.objects.filter(
        tenant=tenant,
        event_type="attendance_shift_roster_template_created",
        event_snapshot__template_id=str(response.data["id"]),
    )
    assert events.count() == 1
    assert events.get().event_snapshot["action"] == "created"


def test_assignment_update_rejects_closed_attendance_history_without_audit(scope):
    from apps.attendance.models import AttendancePeriodCloseStatus
    from apps.common.models import SaasCommercialAuditEvent

    tenant, actor, _, client = scope
    item = tenant.employee_shift_assignments.select_related("employee", "shift").first()
    item.effective_from = date(2033, 1, 1)
    item.effective_to = date(2033, 1, 31)
    item.save(update_fields=["effective_from", "effective_to", "updated_at"])
    close = reconcile_attendance_period(
        tenant=tenant,
        legal_entity=item.employee.legal_entity,
        period_start=date(2033, 1, 1),
        period_end=date(2033, 1, 31),
        actor=actor,
        idempotency_key="wave13-closed-assignment",
    )
    for action in ("submit", "approve", "close"):
        close = transition_attendance_close(close=close, actor=actor, action=action)
    assert close.status == AttendancePeriodCloseStatus.CLOSED
    before = (item.shift_id, item.effective_from, item.effective_to, item.updated_at)

    response = client.patch(
        f"/api/v1/hr-admin/employee-shift-assignments/{item.id}/",
        {"is_primary": not item.is_primary, "expected_updated_at": item.updated_at.isoformat().replace("+00:00", "Z")},
        format="json",
    )

    assert response.status_code == 400
    assert "closed attendance period" in response.json()["detail"]
    item.refresh_from_db()
    assert (item.shift_id, item.effective_from, item.effective_to, item.updated_at) == before
    assert not SaasCommercialAuditEvent.objects.filter(
        tenant=tenant,
        event_type="attendance_shift_assignment_updated",
        event_snapshot__assignment_id=str(item.id),
    ).exists()


def test_assignment_create_idempotency_replays_one_row_and_one_audit(scope):
    from apps.common.models import MutationIdempotencyRecord, SaasCommercialAuditEvent

    tenant, _, _, client = scope
    target = tenant.employees.get(employee_code="QA-MGR-002")
    payload = {
        "employee_id": str(target.id),
        "shift_id": str(tenant.shifts.first().id),
        "effective_from": "2041-01-01",
        "effective_to": "2041-01-31",
        "is_primary": False,
        "assignment_kind": "fixed",
        "config_snapshot": {},
    }
    key = "wave13-assignment-replay-key"

    first = client.post(
        "/api/v1/hr-admin/employee-shift-assignments/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY=key,
    )
    replay = client.post(
        "/api/v1/hr-admin/employee-shift-assignments/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY=key,
    )

    assert first.status_code == 201 and replay.status_code == 201
    assert first.data["id"] == replay.data["id"]
    assert first["Idempotency-Replayed"] == "false"
    assert replay["Idempotency-Replayed"] == "true"
    assert tenant.employee_shift_assignments.filter(id=first.data["id"]).count() == 1
    assert MutationIdempotencyRecord.objects.filter(tenant=tenant, idempotency_key=key).count() == 1
    assert SaasCommercialAuditEvent.objects.filter(
        tenant=tenant,
        event_type="attendance_shift_assignment_created",
        event_snapshot__assignment_id=str(first.data["id"]),
    ).count() == 1
