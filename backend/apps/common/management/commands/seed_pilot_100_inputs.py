"""Seed realistic attendance, leave, and lifecycle inputs for the 100 employee pilot."""

from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.attendance.models import AttendanceRecord, AttendanceRegularization, AttendanceSource, AttendanceStatus, RegularizationStatus, Shift
from apps.employee_lifecycle.models import (
    EmployeeExit,
    EmployeeMovement,
    EmployeeOnboarding,
    ExitStatus,
    LifecycleEventStatus,
    MovementType,
    OnboardingStatus,
    ProbationDecision,
    ProbationReview,
)
from apps.employees.models import Employee
from apps.leave_management.models import LeaveBalance, LeaveDayPortion, LeavePolicy, LeaveRequest, LeaveRequestStatus
from apps.tenants.models import Tenant


DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_PREFIX = "PILOT100_20260912"
DEFAULT_PERIOD_START = date(2026, 9, 1)
DEFAULT_PERIOD_END = date(2026, 9, 30)


class Command(BaseCommand):
    help = "Creates or cleans realistic pilot inputs for the 100 employee payroll run."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed.")
        parser.add_argument("--prefix", default=DEFAULT_PREFIX, help="Pilot workforce prefix.")
        parser.add_argument("--period-start", default=DEFAULT_PERIOD_START.isoformat(), help="Payroll period start date.")
        parser.add_argument("--period-end", default=DEFAULT_PERIOD_END.isoformat(), help="Payroll period end date.")
        parser.add_argument("--output-file", default="", help="Optional JSON manifest output path.")
        parser.add_argument("--cleanup", action="store_true", help="Delete this prefix's pilot inputs instead of seeding them.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(code=options["tenant_code"]).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {options['tenant_code']}")

        prefix = self._normalize_prefix(options["prefix"])
        period_start = date.fromisoformat(options["period_start"])
        period_end = date.fromisoformat(options["period_end"])
        if period_end < period_start:
            raise CommandError("period-end must be on or after period-start.")

        employees = list(Employee.objects.filter(tenant=tenant, employee_code__startswith=f"{prefix}_E").order_by("employee_code"))
        if len(employees) != 100:
            raise CommandError(f"Expected 100 pilot employees for {prefix}; found {len(employees)}.")

        cleanup_summary = self._cleanup(tenant=tenant, employees=employees, prefix=prefix, period_start=period_start, period_end=period_end)
        if options["cleanup"]:
            manifest = self._manifest(
                tenant=tenant,
                prefix=prefix,
                period_start=period_start,
                period_end=period_end,
                cleanup=cleanup_summary,
                counts={},
                scenarios={},
            )
            self._write_manifest(options["output_file"], manifest)
            self.stdout.write(self.style.SUCCESS(f"Cleaned pilot inputs {prefix} for {tenant.code}."))
            return

        shift = Shift.objects.filter(tenant=tenant, is_active=True).order_by("name").first()
        policies = list(LeavePolicy.objects.filter(tenant=tenant, status="active").select_related("leave_type").order_by("name"))
        if shift is None:
            raise CommandError("No active shift found. Run bootstrap_demo_workspace first.")
        if not policies:
            raise CommandError("No active leave policies found. Run bootstrap_demo_workspace first.")

        employee_by_index = {index + 1: employee for index, employee in enumerate(employees)}
        manager = employee_by_index[1]
        attendance_counts = self._seed_attendance(
            tenant=tenant,
            employees=employees,
            prefix=prefix,
            period_start=period_start,
            period_end=period_end,
            shift=shift,
        )
        leave_counts = self._seed_leave(
            tenant=tenant,
            employee_by_index=employee_by_index,
            manager=manager,
            prefix=prefix,
            policies=policies,
            period_start=period_start,
        )
        lifecycle_counts = self._seed_lifecycle(
            tenant=tenant,
            employee_by_index=employee_by_index,
            manager=manager,
            prefix=prefix,
            period_start=period_start,
            period_end=period_end,
        )

        counts = {**attendance_counts, **leave_counts, **lifecycle_counts}
        scenarios = {
            "clean_attendance": "E001-E040 plus E091-E095 have complete present-day rows.",
            "approved_leave_lop": "E041-E050 have approved leave and on-leave/absent attendance days.",
            "pending_leave": "E051-E055 keep pending leave as payroll readiness warnings.",
            "regularization": "E056-E060 include approved, rejected, and pending regularization cases.",
            "overtime": "E061-E075 include overtime and late/exception rows.",
            "statutory_variation_placeholders": "E076-E085 are reserved for statutory declaration variation in a later phase.",
            "lifecycle": "E086-E090 include onboarding, probation, movement, and exit records.",
            "bank_blockers": "E096-E100 remain missing-bank blockers from workforce seed.",
        }
        manifest = self._manifest(
            tenant=tenant,
            prefix=prefix,
            period_start=period_start,
            period_end=period_end,
            cleanup=cleanup_summary,
            counts=counts,
            scenarios=scenarios,
        )
        self._write_manifest(options["output_file"], manifest)
        self.stdout.write(self.style.SUCCESS(f"Seeded pilot inputs for {prefix}: {json.dumps(counts, sort_keys=True)}"))

    def _cleanup(self, *, tenant: Tenant, employees: list[Employee], prefix: str, period_start: date, period_end: date) -> dict[str, int]:
        employee_ids = [employee.id for employee in employees]
        regularizations = AttendanceRegularization.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            evidence_payload__seed_ref=prefix,
        ).delete()[0]
        attendance_records = AttendanceRecord.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
            source_payload__seed_ref=prefix,
        ).delete()[0]
        leave_requests = LeaveRequest.objects.filter(tenant=tenant, employee_id__in=employee_ids, metadata__seed_ref=prefix).delete()[0]
        leave_balances = LeaveBalance.objects.filter(
            tenant=tenant,
            employee_id__in=employee_ids,
            period_year=period_start.year,
        ).delete()[0]
        onboardings = EmployeeOnboarding.objects.filter(tenant=tenant, employee_id__in=employee_ids, notes__contains=prefix).delete()[0]
        probation_reviews = ProbationReview.objects.filter(tenant=tenant, employee_id__in=employee_ids, remarks__contains=prefix).delete()[0]
        movements = EmployeeMovement.objects.filter(tenant=tenant, employee_id__in=employee_ids, reason__contains=prefix).delete()[0]
        exits = EmployeeExit.objects.filter(tenant=tenant, employee_id__in=employee_ids, exit_reason_detail__contains=prefix).delete()[0]
        return {
            "attendance_regularizations": regularizations,
            "attendance_records": attendance_records,
            "leave_requests": leave_requests,
            "leave_balances": leave_balances,
            "onboardings": onboardings,
            "probation_reviews": probation_reviews,
            "movements": movements,
            "exits": exits,
        }

    def _seed_attendance(self, *, tenant: Tenant, employees: list[Employee], prefix: str, period_start: date, period_end: date, shift: Shift) -> dict[str, int]:
        workdays = [period_start + timedelta(days=offset) for offset in range((period_end - period_start).days + 1) if (period_start + timedelta(days=offset)).weekday() < 5]
        status_counts: dict[str, int] = {}
        rows = 0
        for index, employee in enumerate(employees, start=1):
            for attendance_date in workdays:
                status = AttendanceStatus.PRESENT
                check_in = self._at(attendance_date, time(9, 0))
                check_out = self._at(attendance_date, time(18, 0))
                work_hours = Decimal("8.00")
                overtime = Decimal("0.00")
                late_minutes = 0
                notes = f"{prefix} pilot baseline attendance."

                if 41 <= index <= 50 and attendance_date.day in {8, 9}:
                    status, check_in, check_out, work_hours, notes = AttendanceStatus.ON_LEAVE, None, None, Decimal("0.00"), f"{prefix} approved leave coverage."
                elif 51 <= index <= 55 and attendance_date.day == 16:
                    status, check_in, check_out, work_hours, notes = AttendanceStatus.ABSENT, None, None, Decimal("0.00"), f"{prefix} pending leave payroll warning."
                elif 56 <= index <= 60 and attendance_date.day == 14:
                    status, check_in, check_out, work_hours, late_minutes, notes = AttendanceStatus.LATE, self._at(attendance_date, time(10, 10)), self._at(attendance_date, time(18, 30)), Decimal("7.50"), 70, f"{prefix} regularization candidate."
                elif 61 <= index <= 75 and attendance_date.day in {10, 17, 24}:
                    status, check_out, overtime, work_hours, notes = AttendanceStatus.PRESENT, self._at(attendance_date, time(20, 0)), Decimal("2.00"), Decimal("10.00"), f"{prefix} approved overtime coverage."
                elif 76 <= index <= 85 and attendance_date.day == 21:
                    status, check_in, check_out, work_hours, late_minutes, notes = AttendanceStatus.LATE, self._at(attendance_date, time(9, 45)), self._at(attendance_date, time(18, 5)), Decimal("7.50"), 45, f"{prefix} statutory declaration follow-up day."
                elif 86 <= index <= 90 and attendance_date < date(2026, 9, 15):
                    status, check_in, check_out, work_hours, notes = AttendanceStatus.ABSENT, None, None, Decimal("0.00"), f"{prefix} lifecycle partial-period coverage."

                AttendanceRecord.objects.update_or_create(
                    tenant=tenant,
                    employee=employee,
                    attendance_date=attendance_date,
                    defaults={
                        "status": status,
                        "source": AttendanceSource.IMPORT,
                        "shift": shift,
                        "check_in_at": check_in,
                        "check_out_at": check_out,
                        "work_duration_hours": work_hours,
                        "overtime_hours": overtime,
                        "late_minutes": late_minutes,
                        "early_exit_minutes": 0,
                        "is_regularized": False,
                        "is_locked": False,
                        "source_payload": {"seed_ref": prefix, "scenario_index": index},
                        "notes": notes,
                    },
                )
                rows += 1
                status_counts[status] = status_counts.get(status, 0) + 1

        for index, decision in [(56, "approved"), (57, "rejected"), (58, "pending"), (59, "approved"), (60, "pending")]:
            employee = employees[index - 1]
            record = AttendanceRecord.objects.get(tenant=tenant, employee=employee, attendance_date=date(2026, 9, 14))
            regularization = AttendanceRegularization.objects.create(
                tenant=tenant,
                employee=employee,
                attendance_record=record,
                status={
                    "approved": RegularizationStatus.APPROVED,
                    "rejected": RegularizationStatus.REJECTED,
                    "pending": RegularizationStatus.PENDING,
                }[decision],
                requested_status=AttendanceStatus.PRESENT,
                requested_check_in_at=self._at(record.attendance_date, time(9, 2)),
                requested_check_out_at=self._at(record.attendance_date, time(18, 20)),
                reason=f"{prefix} biometric outage scenario {decision}.",
                manager_comment="Pilot correction accepted." if decision == "approved" else "",
                rejection_reason="Pilot negative-path evidence." if decision == "rejected" else "",
                applied_at=timezone.now(),
                resolved_at=timezone.now() if decision in {"approved", "rejected"} else None,
                evidence_payload={"seed_ref": prefix, "scenario": "attendance_regularization", "decision": decision},
            )
            if decision == "approved":
                record.status = AttendanceStatus.PRESENT
                record.check_in_at = regularization.requested_check_in_at
                record.check_out_at = regularization.requested_check_out_at
                record.work_duration_hours = Decimal("8.00")
                record.late_minutes = 0
                record.is_regularized = True
                record.save(update_fields=["status", "check_in_at", "check_out_at", "work_duration_hours", "late_minutes", "is_regularized", "updated_at"])

        return {
            "attendance_records": rows,
            "attendance_regularizations": 5,
            "attendance_present_rows": status_counts.get(AttendanceStatus.PRESENT, 0),
            "attendance_leave_rows": status_counts.get(AttendanceStatus.ON_LEAVE, 0),
            "attendance_absent_rows": status_counts.get(AttendanceStatus.ABSENT, 0),
            "attendance_late_rows": status_counts.get(AttendanceStatus.LATE, 0),
        }

    def _seed_leave(self, *, tenant: Tenant, employee_by_index: dict[int, Employee], manager: Employee, prefix: str, policies: list[LeavePolicy], period_start: date) -> dict[str, int]:
        primary_policy = policies[0]
        leave_requests = 0
        for index in range(1, 101):
            employee = employee_by_index[index]
            consumed = Decimal("2.00") if 41 <= index <= 50 else Decimal("0.00")
            reserved = Decimal("1.00") if 51 <= index <= 55 else Decimal("0.00")
            opening = Decimal("12.00")
            LeaveBalance.objects.update_or_create(
                tenant=tenant,
                employee=employee,
                leave_policy=primary_policy,
                period_year=period_start.year,
                defaults={
                    "opening_balance": opening,
                    "accrued_amount": Decimal("0.00"),
                    "consumed_amount": consumed,
                    "reserved_amount": reserved,
                    "carry_forward_amount": Decimal("0.00"),
                    "encashed_amount": Decimal("0.00"),
                    "adjustment_amount": Decimal("0.00"),
                    "closing_balance": opening - consumed,
                },
            )

        for index in range(41, 51):
            self._leave_request(employee_by_index[index], primary_policy, prefix, date(2026, 9, 8), date(2026, 9, 9), LeaveRequestStatus.APPROVED, approved_by=manager)
            leave_requests += 1
        for index in range(51, 56):
            self._leave_request(employee_by_index[index], primary_policy, prefix, date(2026, 9, 16), date(2026, 9, 16), LeaveRequestStatus.PENDING)
            leave_requests += 1

        return {"leave_balances": 100, "leave_requests": leave_requests, "approved_leave_requests": 10, "pending_leave_requests": 5}

    def _seed_lifecycle(self, *, tenant: Tenant, employee_by_index: dict[int, Employee], manager: Employee, prefix: str, period_start: date, period_end: date) -> dict[str, int]:
        EmployeeOnboarding.objects.create(
            tenant=tenant,
            employee=employee_by_index[86],
            status=OnboardingStatus.IN_PROGRESS,
            expected_joining_date=period_start + timedelta(days=14),
            actual_joining_date=None,
            assigned_owner_identifier=manager.employee_code,
            checklist_snapshot=[{"label": "Laptop allocation", "status": "pending"}, {"label": "Policy acknowledgement", "status": "done"}],
            notes=f"{prefix} in-progress onboarding for partial-month payroll.",
        )
        ProbationReview.objects.create(
            tenant=tenant,
            employee=employee_by_index[87],
            review_date=period_start + timedelta(days=7),
            probation_end_date=period_start + timedelta(days=10),
            decision=ProbationDecision.PENDING,
            reviewer_identifier=manager.employee_code,
            remarks=f"{prefix} overdue probation review before payroll confirmation.",
        )
        EmployeeMovement.objects.create(
            tenant=tenant,
            employee=employee_by_index[88],
            movement_type=MovementType.TRANSFER,
            status=LifecycleEventStatus.PENDING,
            effective_date=period_start + timedelta(days=19),
            reason=f"{prefix} pending transfer impacts costing and approvals.",
            from_department=employee_by_index[88].department,
            to_department=employee_by_index[89].department,
            from_manager=employee_by_index[88].reporting_manager,
            to_manager=manager,
        )
        EmployeeExit.objects.create(
            tenant=tenant,
            employee=employee_by_index[89],
            status=ExitStatus.CLEARANCE_IN_PROGRESS,
            resignation_date=period_start - timedelta(days=20),
            notice_start_date=period_start - timedelta(days=20),
            notice_end_date=period_end,
            proposed_last_working_date=period_end,
            approved_last_working_date=period_end,
            exit_reason="Resignation",
            exit_reason_detail=f"{prefix} FNF readiness and clearance in progress.",
            clearance_status_snapshot={"it": "pending", "finance": "pending", "hr": "in_progress"},
        )
        EmployeeExit.objects.create(
            tenant=tenant,
            employee=employee_by_index[90],
            status=ExitStatus.APPROVED,
            resignation_date=period_start - timedelta(days=12),
            notice_start_date=period_start - timedelta(days=12),
            notice_end_date=period_start + timedelta(days=20),
            proposed_last_working_date=period_start + timedelta(days=20),
            approved_last_working_date=period_start + timedelta(days=20),
            exit_reason="Resignation",
            exit_reason_detail=f"{prefix} approved mid-month exit for payroll proration.",
            clearance_status_snapshot={"it": "done", "finance": "pending", "hr": "done"},
        )
        return {"onboardings": 1, "probation_reviews": 1, "movements": 1, "exits": 2}

    def _leave_request(self, employee: Employee, policy: LeavePolicy, prefix: str, start_date: date, end_date: date, status: str, *, approved_by: Employee | None = None) -> None:
        LeaveRequest.objects.create(
            tenant=employee.tenant,
            employee=employee,
            leave_type=policy.leave_type,
            leave_policy=policy,
            status=status,
            start_date=start_date,
            end_date=end_date,
            start_day_portion=LeaveDayPortion.FULL_DAY,
            end_day_portion=LeaveDayPortion.FULL_DAY,
            requested_units=Decimal((end_date - start_date).days + 1),
            approved_units=Decimal((end_date - start_date).days + 1) if status == LeaveRequestStatus.APPROVED else Decimal("0.00"),
            reason=f"{prefix} payroll pilot leave input.",
            manager_comment=f"Approved by {approved_by.employee_code} for pilot." if approved_by else "",
            applied_at=timezone.now(),
            approved_at=timezone.now() if status == LeaveRequestStatus.APPROVED else None,
            metadata={"seed_ref": prefix, "scenario": "payroll_pilot_leave_input", "request_action": "leave_request"},
        )

    def _at(self, attendance_date: date, value: time):
        return timezone.make_aware(datetime.combine(attendance_date, value), timezone.get_current_timezone())

    def _manifest(self, *, tenant: Tenant, prefix: str, period_start: date, period_end: date, cleanup: dict, counts: dict, scenarios: dict) -> dict:
        return {
            "seed_ref": prefix,
            "tenant_code": tenant.code,
            "surface": "pilot_100_inputs",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "cleanup": cleanup,
            "counts": counts,
            "scenarios": scenarios,
            "generated_at": timezone.now().isoformat(),
        }

    def _normalize_prefix(self, value: str) -> str:
        normalized = value.strip().upper().replace("-", "_")
        if not normalized:
            raise CommandError("Prefix cannot be blank.")
        return normalized

    def _write_manifest(self, output_file: str, manifest: dict) -> None:
        if not output_file:
            return
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(manifest, indent=2, sort_keys=True, default=str), encoding="utf-8")
