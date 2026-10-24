"""Guarded loopback-only synthetic browser attendance; never imported by application code."""
from datetime import date, datetime, timezone
import json
from django.conf import settings
from apps.tenants.models import Tenant
from apps.attendance.models import AttendanceRecord, AttendanceSource, AttendanceStatus, AttendancePeriodClose, HolidayCalendar, Holiday, AttendanceRegularization
from apps.attendance.services import reconcile_attendance_period, transition_attendance_close


def prepare(manifest_path):
    db = settings.DATABASES["default"]
    if not str(db["NAME"]).startswith("hrms_") or db["HOST"] not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("ESS2 fixtures require an explicitly named loopback database")
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    tenant = Tenant.objects.get(pk=manifest["tenant"]["id"], code__startswith="pw-qa-")
    tenant.timezone = "America/New_York"
    tenant.save(update_fields=["timezone"])
    employee = tenant.employees.get(pk=manifest["credentials"]["employee"]["employee_id"])
    actor = tenant.employees.get(employee_code="QA-HR-001")
    for day in range(1, 21):
        AttendanceRecord.objects.create(tenant=tenant, employee=employee, attendance_date=date(2029, 3, day),
            status=AttendanceStatus.WEEKLY_OFF if day == 4 else AttendanceStatus.LATE if day == 2 else AttendanceStatus.PRESENT,
            source=AttendanceSource.MANUAL, shift_id=manifest["attendance"]["shift_id"],
            check_in_at=datetime(2029, 3, day, 4, 30, tzinfo=timezone.utc),
            check_out_at=datetime(2029, 3, day, 12, 30, tzinfo=timezone.utc),
            work_duration_hours="8.00", overtime_hours="0.50", late_minutes=15 if day == 2 else 0)
    calendar = HolidayCalendar.objects.create(tenant=tenant, code="ess2-synthetic", name="ESS2 Synthetic Calendar", year=2029)
    holiday = Holiday.objects.create(calendar=calendar, date=date(2029, 3, 5), name="ESS2 Synthetic Holiday")
    AttendanceRecord.objects.filter(employee=employee, attendance_date=holiday.date).update(holiday=holiday, status=AttendanceStatus.HOLIDAY)
    for record in employee.attendance_records.filter(attendance_date__range=(date(2029, 3, 1), date(2029, 3, 6))):
        AttendanceRegularization.objects.create(tenant=tenant, employee=employee, attendance_record=record,
            status="rejected", requested_status="present", reason="Synthetic seeded history for pagination", rejection_reason="Synthetic historical decision")
    AttendanceRecord.objects.create(tenant=tenant, employee=employee, attendance_date=date(2029, 2, 15), status=AttendanceStatus.PRESENT, source=AttendanceSource.MANUAL, work_duration_hours="8.00")
    close = reconcile_attendance_period(tenant=tenant, legal_entity=employee.legal_entity, period_start=date(2029, 2, 1), period_end=date(2029, 2, 28), actor=actor, idempotency_key="ess2-feb-close")
    for action in ("submit", "approve", "close"):
        close = transition_attendance_close(close=close, actor=actor, action=action)
    return {"close_id": str(close.id), "hash": close.snapshot_hash}


def verify(close_id, expected_hash):
    close = AttendancePeriodClose.objects.get(pk=close_id)
    assert close.snapshot_hash == expected_hash
    assert close.status == "closed"
    assert AttendanceRecord.objects.filter(tenant=close.tenant, attendance_date=date(2029, 2, 15), is_locked=True).exists()
    print("Finalized hash, closed status and locked row preserved")
