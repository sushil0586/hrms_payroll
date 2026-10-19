"""Read-only, employee-scoped monthly attendance projection for ESS.

Do not materialize missing days or re-derive finalized records from current policy.
The legacy latest-records contract remains in MeAttendanceRecordListView.
"""
from calendar import monthrange
from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.attendance.models import AttendancePeriodClose, AttendancePeriodCloseStatus, AttendanceRecord, AttendanceRegularization, RegularizationStatus
from apps.attendance.services import build_attendance_derivation_summary, resolve_attendance_policy_for_employee


def employee_attendance_month(employee, params):
    zone_name = employee.tenant.timezone or "UTC"
    try:
        zone = ZoneInfo(zone_name)
    except (ZoneInfoNotFoundError, ValueError):
        zone_name, zone = "UTC", ZoneInfo("UTC")
    today = timezone.now().astimezone(zone).date()
    month = params.get("month") or today.strftime("%Y-%m")
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise ValidationError({"month": "Use YYYY-MM for the attendance month."})
    try:
        year, number = map(int, month.split("-"))
        start = date(year, number, 1)
        end = date(year, number, monthrange(year, number)[1])
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 10))
        if page < 1 or not 1 <= page_size <= 31:
            raise ValueError
    except (ValueError, OverflowError):
        raise ValidationError({"period": "Choose a valid month, positive page and page size from 1 to 31."})
    records = list(AttendanceRecord.objects.filter(
        tenant=employee.tenant, employee=employee, attendance_date__range=(start, end),
    ).select_related("employee__tenant", "employee__legal_entity", "employee__branch", "employee__location", "employee__department", "employee__grade", "employee__employment_type", "shift", "holiday").order_by("attendance_date"))
    closed = list(AttendancePeriodClose.objects.filter(
        tenant=employee.tenant, legal_entity_id=employee.legal_entity_id,
        status=AttendancePeriodCloseStatus.CLOSED, period_start__lte=end, period_end__gte=start,
    ).values_list("period_start", "period_end"))
    pending = set(AttendanceRegularization.objects.filter(
        tenant=employee.tenant, employee=employee, status=RegularizationStatus.PENDING,
        attendance_record__attendance_date__range=(start, end),
    ).values_list("attendance_record_id", flat=True))
    days = []
    for record in records:
        locked = record.is_locked or any(a <= record.attendance_date <= b for a, b in closed)
        # Finalized evidence is read from the row, never reconstructed from live policy.
        derivation = None if locked else build_attendance_derivation_summary(record)
        policy = None if locked else resolve_attendance_policy_for_employee(employee, as_of=record.attendance_date)
        unavailable = "This attendance day is finalized. Contact HR for a governed correction." if locked else (
            "A correction for this day is already awaiting approval." if record.id in pending else (
                "The applicable attendance policy does not permit regularization." if policy and not policy.allow_regularization else ""
            )
        )
        days.append({
            "id": str(record.id), "attendance_date": record.attendance_date.isoformat(), "status": record.status,
            "shift": record.shift.name if record.shift else None,
            "holiday": record.holiday.name if record.holiday else None,
            "check_in_at": record.check_in_at.isoformat() if record.check_in_at else None,
            "check_out_at": record.check_out_at.isoformat() if record.check_out_at else None,
            "work_duration_hours": str(record.work_duration_hours), "overtime_hours": str(record.overtime_hours),
            "late_minutes": record.late_minutes, "early_exit_minutes": record.early_exit_minutes,
            "is_regularized": record.is_regularized, "is_locked": locked,
            "derivation_summary": derivation, "can_regularize": not bool(unavailable),
            "regularization_unavailable_reason": unavailable,
        })
    total = len(days)
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    offset = (page - 1) * page_size
    return {
        "month": month, "period_start": start.isoformat(), "period_end": end.isoformat(),
        "timezone": zone_name, "today": today.isoformat(), "days": days,
        "items": days[offset:offset + page_size], "page": page, "page_size": page_size,
        "total_count": total, "total_pages": pages, "has_next": page < pages, "has_previous": page > 1,
        "summary": {
            "recorded_days": total, "locked_days": sum(item["is_locked"] for item in days),
            "worked_hours": str(sum((record.work_duration_hours for record in records), Decimal("0.00"))),
            "pending_corrections": len(pending),
        },
        "raw_punch_history_available": False,
    }
