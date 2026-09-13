"""Seed 100-employee payroll input snapshot runs for pilot certification."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.attendance.models import AttendanceRecord, AttendanceRegularization, AttendanceStatus, RegularizationStatus
from apps.employee_lifecycle.models import EmployeeExit, EmployeeMovement, EmployeeOnboarding, ProbationReview
from apps.employees.models import Employee, EmployeeBankAccount
from apps.leave_management.models import LeaveBalance, LeaveRequest, LeaveRequestStatus
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    PayGroup,
    PayGroupAssignment,
    PayrollConfigStatus,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollRun,
    PayrollRunStatus,
)
from apps.tenants.models import Tenant


DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_PREFIX = "PILOT100_20260912"
DEFAULT_PERIOD_START = date(2026, 9, 1)
DEFAULT_PERIOD_END = date(2026, 9, 30)


class Command(BaseCommand):
    help = "Creates or cleans P100 payroll input snapshot runs for the pilot payroll rehearsal."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed.")
        parser.add_argument("--prefix", default=DEFAULT_PREFIX, help="Pilot workforce prefix.")
        parser.add_argument("--period-start", default=DEFAULT_PERIOD_START.isoformat(), help="Payroll period start date.")
        parser.add_argument("--period-end", default=DEFAULT_PERIOD_END.isoformat(), help="Payroll period end date.")
        parser.add_argument("--output-file", default="", help="Optional JSON manifest output path.")
        parser.add_argument("--cleanup", action="store_true", help="Delete this prefix's pilot snapshot runs instead of seeding.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(code=options["tenant_code"]).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {options['tenant_code']}")

        prefix = self._normalize_prefix(options["prefix"])
        period_start = date.fromisoformat(options["period_start"])
        period_end = date.fromisoformat(options["period_end"])
        employees = list(Employee.objects.filter(tenant=tenant, employee_code__startswith=f"{prefix}_E").order_by("employee_code"))
        if len(employees) != 100:
            raise CommandError(f"Expected 100 pilot employees for {prefix}; found {len(employees)}.")

        cleanup_summary = self._cleanup(tenant=tenant, prefix=prefix)
        if options["cleanup"]:
            manifest = self._manifest(tenant=tenant, prefix=prefix, period_start=period_start, period_end=period_end, cleanup=cleanup_summary, counts={})
            self._write_manifest(options["output_file"], manifest)
            self.stdout.write(self.style.SUCCESS(f"Cleaned pilot snapshots {prefix} for {tenant.code}."))
            return

        period, pay_group = self._resolve_period_and_pay_group(tenant=tenant, period_start=period_start, period_end=period_end, prefix=prefix)
        blocked_run = PayrollRun.objects.create(
            tenant=tenant,
            period=period,
            pay_group=pay_group,
            code=f"{prefix.lower()}-inputs-blocked",
            name=f"{prefix} Payroll Inputs - Blocker Gate",
            status=PayrollRunStatus.COLLECTING_INPUTS,
            input_profile_ref="tenant.payroll.input.pilot100.blocked.v1",
            snapshot_schema_ref="tenant.payroll.snapshot.pilot100.v1",
            config_snapshot={"seed_ref": prefix, "scenario": "blocked_gate"},
        )
        lockable_run = PayrollRun.objects.create(
            tenant=tenant,
            period=period,
            pay_group=pay_group,
            code=f"{prefix.lower()}-inputs-lockable",
            name=f"{prefix} Payroll Inputs - Lockable",
            status=PayrollRunStatus.COLLECTING_INPUTS,
            input_profile_ref="tenant.payroll.input.pilot100.lockable.v1",
            snapshot_schema_ref="tenant.payroll.snapshot.pilot100.v1",
            config_snapshot={"seed_ref": prefix, "scenario": "lockable_gate"},
        )

        counts = {
            "blocked_run_snapshots": 0,
            "lockable_run_snapshots": 0,
            "blocked_snapshots": 0,
            "warning_snapshots": 0,
            "ready_snapshots": 0,
        }
        for index, employee in enumerate(employees, start=1):
            blocked_status, blockers, warnings = self._issues_for_index(index, lockable=False)
            self._create_snapshot(
                payroll_run=blocked_run,
                employee=employee,
                index=index,
                prefix=prefix,
                status=blocked_status,
                blockers=blockers,
                warnings=warnings,
            )
            counts["blocked_run_snapshots"] += 1
            if blocked_status == PayrollInputSnapshotStatus.BLOCKED:
                counts["blocked_snapshots"] += 1
            elif blocked_status == PayrollInputSnapshotStatus.WARNING:
                counts["warning_snapshots"] += 1
            else:
                counts["ready_snapshots"] += 1

            lockable_status, lockable_blockers, lockable_warnings = self._issues_for_index(index, lockable=True)
            self._create_snapshot(
                payroll_run=lockable_run,
                employee=employee,
                index=index,
                prefix=prefix,
                status=lockable_status,
                blockers=lockable_blockers,
                warnings=lockable_warnings,
            )
            counts["lockable_run_snapshots"] += 1

        manifest = self._manifest(
            tenant=tenant,
            prefix=prefix,
            period_start=period_start,
            period_end=period_end,
            cleanup=cleanup_summary,
            counts=counts,
            blocked_run_id=str(blocked_run.id),
            lockable_run_id=str(lockable_run.id),
        )
        self._write_manifest(options["output_file"], manifest)
        self.stdout.write(self.style.SUCCESS(f"Seeded pilot payroll input snapshots for {prefix}: {json.dumps(counts, sort_keys=True)}"))

    def _cleanup(self, *, tenant: Tenant, prefix: str) -> dict[str, int]:
        runs = PayrollRun.objects.filter(tenant=tenant, code__in=[f"{prefix.lower()}-inputs-blocked", f"{prefix.lower()}-inputs-lockable"])
        run_count = runs.count()
        deleted = runs.delete()[0]
        return {"runs": run_count, "deleted_objects": deleted}

    def _resolve_period_and_pay_group(self, *, tenant: Tenant, period_start: date, period_end: date, prefix: str):
        pay_group = PayGroup.objects.filter(tenant=tenant, status="active").select_related("calendar").order_by("name").first()
        if pay_group is None:
            raise CommandError("No active pay group found. Run payroll setup before seeding snapshots.")
        calendar = pay_group.calendar
        period = PayrollPeriod.objects.filter(
            tenant=tenant,
            calendar=calendar,
            start_date=period_start,
            end_date=period_end,
        ).first()
        if period:
            return period, pay_group
        period = PayrollPeriod.objects.create(
            tenant=tenant,
            calendar=calendar,
            code=f"{prefix.lower()}-sep-2026",
            name=f"{prefix} September 2026",
            start_date=period_start,
            end_date=period_end,
            pay_date=date(2026, 10, 1),
            status=PayrollPeriodStatus.OPEN,
            config_snapshot={"seed_ref": prefix, "surface": "pilot_100_snapshots"},
        )
        return period, pay_group

    def _issues_for_index(self, index: int, *, lockable: bool):
        blockers: list[str] = []
        warnings: list[str] = []
        if index >= 96:
            if lockable:
                warnings.append("Accepted exception: missing primary bank account retained for bank advice negative proof.")
            else:
                blockers.append("Missing primary bank account.")
        if 51 <= index <= 55:
            warnings.append("Pending leave request overlaps payroll period.")
        if index in {58, 60}:
            warnings.append("Pending attendance regularization requires manager decision.")
        if 86 <= index <= 90:
            warnings.append("Lifecycle event requires payroll review.")
        if blockers:
            return PayrollInputSnapshotStatus.BLOCKED, blockers, warnings
        if warnings:
            return PayrollInputSnapshotStatus.WARNING, blockers, warnings
        return PayrollInputSnapshotStatus.READY, blockers, warnings

    def _create_snapshot(self, *, payroll_run: PayrollRun, employee: Employee, index: int, prefix: str, status: str, blockers: list[str], warnings: list[str]) -> None:
        period_start = payroll_run.period.start_date
        period_end = payroll_run.period.end_date
        pay_group_assignment = (
            PayGroupAssignment.objects.filter(
                tenant=employee.tenant,
                employee=employee,
                status="active",
                effective_from__lte=period_end,
            )
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period_start))
            .select_related("pay_group")
            .order_by("-effective_from")
            .first()
        )
        salary_assignment = (
            EmployeeSalaryAssignment.objects.filter(
                tenant=employee.tenant,
                employee=employee,
                status=PayrollConfigStatus.ACTIVE,
                effective_from__lte=period_end,
            )
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period_start))
            .select_related("structure_version__structure")
            .order_by("-effective_from")
            .first()
        )
        attendance = AttendanceRecord.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            attendance_date__gte=period_start,
            attendance_date__lte=period_end,
        )
        leave_requests = LeaveRequest.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
        leave_balance = LeaveBalance.objects.filter(tenant=employee.tenant, employee=employee, period_year=period_start.year).first()
        bank_account = EmployeeBankAccount.objects.filter(employee=employee, is_primary=True).first()
        regularization_pending = AttendanceRegularization.objects.filter(
            tenant=employee.tenant,
            employee=employee,
            status=RegularizationStatus.PENDING,
            attendance_record__attendance_date__gte=period_start,
            attendance_record__attendance_date__lte=period_end,
        ).count()
        lifecycle_counts = {
            "onboardings": EmployeeOnboarding.objects.filter(tenant=employee.tenant, employee=employee).count(),
            "probation_reviews": ProbationReview.objects.filter(tenant=employee.tenant, employee=employee).count(),
            "movements": EmployeeMovement.objects.filter(tenant=employee.tenant, employee=employee, effective_date__gte=period_start, effective_date__lte=period_end).count(),
            "exits": EmployeeExit.objects.filter(tenant=employee.tenant, employee=employee).count(),
        }
        working_days = attendance.count()
        present_days = attendance.filter(status__in=[AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.REMOTE]).count()
        lop_days = attendance.filter(status__in=[AttendanceStatus.ABSENT, AttendanceStatus.ON_LEAVE]).count()
        overtime_hours = attendance.aggregate(total=Sum("overtime_hours"))["total"] or Decimal("0.00")

        PayrollInputSnapshot.objects.create(
            tenant=employee.tenant,
            payroll_run=payroll_run,
            employee=employee,
            pay_group_assignment=pay_group_assignment,
            salary_assignment=salary_assignment,
            snapshot_status=status,
            input_profile_ref=payroll_run.input_profile_ref,
            employee_snapshot={
                "employee_code": employee.employee_code,
                "employment_status": employee.employment_status,
                "date_of_joining": employee.date_of_joining.isoformat() if employee.date_of_joining else None,
            },
            organization_snapshot={
                "legal_entity": employee.legal_entity.name if employee.legal_entity else None,
                "department": employee.department.name if employee.department else None,
                "business_unit": employee.business_unit.name if employee.business_unit else None,
                "cost_center": employee.cost_center.name if employee.cost_center else None,
                "location": employee.location.name if employee.location else None,
            },
            salary_snapshot={
                "annual_ctc": str(salary_assignment.annual_ctc_override or "") if salary_assignment else "",
                "monthly_gross": str((salary_assignment.annual_ctc_override or Decimal("0.00")) / Decimal("12.00")) if salary_assignment else "",
                "currency_code": "INR",
                "structure": salary_assignment.structure_version.structure.name if salary_assignment else None,
            },
            attendance_snapshot={
                "working_days": working_days,
                "present_days": present_days,
                "lop_days": lop_days,
                "overtime_hours": str(overtime_hours),
                "pending_regularizations": regularization_pending,
            },
            leave_snapshot={
                "requests": leave_requests.count(),
                "pending_requests": leave_requests.filter(status=LeaveRequestStatus.PENDING).count(),
                "approved_requests": leave_requests.filter(status=LeaveRequestStatus.APPROVED).count(),
                "closing_balance": str(leave_balance.closing_balance) if leave_balance else "",
                "reserved_amount": str(leave_balance.reserved_amount) if leave_balance else "",
            },
            lifecycle_snapshot=lifecycle_counts,
            document_snapshot={"seed_ref": prefix, "document_blockers": 0},
            banking_snapshot={
                "has_primary_bank": bool(bank_account),
                "bank_name": bank_account.bank_name if bank_account else "",
                "account_mask": bank_account.account_number[-4:] if bank_account else "",
            },
            validation_snapshot={"blockers": blockers, "warnings": warnings},
            config_snapshot={"seed_ref": prefix, "scenario_index": index, "surface": "pilot_100_snapshots"},
        )

    def _manifest(self, *, tenant: Tenant, prefix: str, period_start: date, period_end: date, cleanup: dict, counts: dict, **extra) -> dict:
        return {
            "seed_ref": prefix,
            "tenant_code": tenant.code,
            "surface": "pilot_100_snapshots",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "cleanup": cleanup,
            "counts": counts,
            "generated_at": timezone.now().isoformat(),
            **extra,
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
