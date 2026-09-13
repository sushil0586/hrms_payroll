"""Seed a dedicated 100-employee calculation/review run for pilot certification."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.payroll.models import (
    PayrollCalculationLine,
    PayrollConfigStatus,
    PayrollExpressionLanguage,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollRuleDefinition,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunApproval,
    PayrollRunCalculation,
    PayrollRunException,
    PayrollRunReview,
    PayrollRunStatus,
    PayrollValidationIssue,
)
from apps.tenants.models import Tenant


DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_PREFIX = "PILOT100_20260912"
DEFAULT_PERIOD_START = date(2026, 9, 1)
DEFAULT_PERIOD_END = date(2026, 9, 30)


class Command(BaseCommand):
    help = "Creates or cleans a calculation-ready P100 payroll run copied from locked input snapshots."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE, help="Tenant code to seed.")
        parser.add_argument("--prefix", default=DEFAULT_PREFIX, help="Pilot workforce prefix.")
        parser.add_argument("--period-start", default=DEFAULT_PERIOD_START.isoformat(), help="Payroll period start date.")
        parser.add_argument("--period-end", default=DEFAULT_PERIOD_END.isoformat(), help="Payroll period end date.")
        parser.add_argument("--output-file", default="", help="Optional JSON manifest output path.")
        parser.add_argument("--cleanup", action="store_true", help="Delete this prefix's pilot calculation run instead of seeding.")

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
            manifest = self._manifest(
                tenant=tenant,
                prefix=prefix,
                period_start=period_start,
                period_end=period_end,
                cleanup=cleanup_summary,
                counts={},
            )
            self._write_manifest(options["output_file"], manifest)
            self.stdout.write(self.style.SUCCESS(f"Cleaned pilot calculation run {prefix} for {tenant.code}."))
            return

        source_run = PayrollRun.objects.filter(
            tenant=tenant,
            code=f"{prefix.lower()}-inputs-lockable",
            status__in=[PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED, PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED],
        ).select_related("period", "pay_group").first()
        if source_run is None:
            raise CommandError("Locked lockable input run not found. Run seed_pilot_100_snapshots and lock the lockable run first.")

        source_snapshots = list(
            PayrollInputSnapshot.objects.filter(
                tenant=tenant,
                payroll_run=source_run,
                snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            )
            .select_related("employee", "pay_group_assignment", "salary_assignment")
            .order_by("employee__employee_code")
        )
        if len(source_snapshots) != 100:
            raise CommandError(f"Expected 100 locked source snapshots on {source_run.code}; found {len(source_snapshots)}.")

        rule_codes = self._upsert_rules(tenant=tenant, prefix=prefix, period_start=period_start)
        target_run = PayrollRun.objects.create(
            tenant=tenant,
            period=source_run.period,
            pay_group=source_run.pay_group,
            code=f"{prefix.lower()}-calc-review",
            name=f"{prefix} Payroll Calculation - Review Gate",
            status=PayrollRunStatus.INPUTS_LOCKED,
            input_profile_ref="tenant.payroll.input.pilot100.calculation.v1",
            snapshot_schema_ref="tenant.payroll.snapshot.pilot100.v1",
            locked_at=timezone.now(),
            config_snapshot={
                "seed_ref": prefix,
                "scenario": "calculation_review_gate",
                "source_run_id": str(source_run.id),
                "calculation_profile_ref": "tenant.payroll.calc.pilot100.v1",
                "calculation_profile": {"rule_codes": rule_codes},
                "review_profile": {
                    "review_profile_ref": "tenant.payroll.review.pilot100.v1",
                    "max_auto_snapshot_warnings": 100,
                },
                "validation_profile": {
                    "validation_profile_ref": "tenant.payroll.validation.pilot100.v1",
                    "warn_snapshot_warnings": True,
                    "require_locked_snapshots": True,
                    "missing_dependency_severity": "warning",
                },
            },
        )

        counts = {"snapshots": 0, "warning_snapshots": 0, "ready_snapshots": 0, "rules": len(rule_codes)}
        for index, source in enumerate(source_snapshots, start=1):
            validation_snapshot = source.validation_snapshot if isinstance(source.validation_snapshot, dict) else {}
            warnings = validation_snapshot.get("warnings", [])
            if not isinstance(warnings, list):
                warnings = [warnings]
            salary_snapshot = self._salary_snapshot(source=source, index=index)
            PayrollInputSnapshot.objects.create(
                tenant=tenant,
                payroll_run=target_run,
                employee=source.employee,
                pay_group_assignment=source.pay_group_assignment,
                salary_assignment=source.salary_assignment,
                snapshot_status=PayrollInputSnapshotStatus.LOCKED,
                locked_at=timezone.now(),
                input_profile_ref=target_run.input_profile_ref,
                employee_snapshot=source.employee_snapshot,
                organization_snapshot=source.organization_snapshot,
                salary_snapshot=salary_snapshot,
                attendance_snapshot=source.attendance_snapshot,
                leave_snapshot=source.leave_snapshot,
                lifecycle_snapshot=source.lifecycle_snapshot,
                document_snapshot=source.document_snapshot,
                banking_snapshot=source.banking_snapshot,
                validation_snapshot=validation_snapshot,
                config_snapshot={
                    **(source.config_snapshot if isinstance(source.config_snapshot, dict) else {}),
                    "seed_ref": prefix,
                    "surface": "pilot_100_calculation",
                    "source_run_id": str(source_run.id),
                    "source_snapshot_id": str(source.id),
                    "source_hash": source.source_hash,
                },
            )
            counts["snapshots"] += 1
            if warnings:
                counts["warning_snapshots"] += 1
            else:
                counts["ready_snapshots"] += 1

        manifest = self._manifest(
            tenant=tenant,
            prefix=prefix,
            period_start=period_start,
            period_end=period_end,
            cleanup=cleanup_summary,
            counts=counts,
            run_id=str(target_run.id),
            run_code=target_run.code,
            source_run_id=str(source_run.id),
            rule_codes=rule_codes,
        )
        self._write_manifest(options["output_file"], manifest)
        self.stdout.write(self.style.SUCCESS(f"Seeded pilot calculation run for {prefix}: {json.dumps(counts, sort_keys=True)}"))

    def _cleanup(self, *, tenant: Tenant, prefix: str) -> dict[str, int]:
        run_code = f"{prefix.lower()}-calc-review"
        runs = list(PayrollRun.objects.filter(tenant=tenant, code=run_code))
        if not runs:
            return {
                "approvals": 0,
                "exceptions": 0,
                "reviews": 0,
                "validation_issues": 0,
                "lines": 0,
                "calculations": 0,
                "snapshots": 0,
                "runs": 0,
                "rule_versions": 0,
                "rule_definitions": 0,
            }

        reviews = PayrollRunReview.objects.filter(tenant=tenant, payroll_run__in=runs)
        calculations = PayrollRunCalculation.objects.filter(tenant=tenant, payroll_run__in=runs)
        line_ids = PayrollCalculationLine.objects.filter(tenant=tenant, payroll_run__in=runs).values_list("id", flat=True)
        counts = {
            "approvals": PayrollRunApproval.objects.filter(tenant=tenant, payroll_run__in=runs).delete()[0],
            "exceptions": PayrollRunException.objects.filter(tenant=tenant, payroll_run__in=runs).delete()[0],
            "reviews": reviews.delete()[0],
            "validation_issues": PayrollValidationIssue.objects.filter(tenant=tenant, payroll_run__in=runs).delete()[0],
            "lines": PayrollCalculationLine.objects.filter(id__in=list(line_ids)).delete()[0],
            "calculations": calculations.delete()[0],
            "snapshots": PayrollInputSnapshot.objects.filter(tenant=tenant, payroll_run__in=runs).delete()[0],
            "runs": PayrollRun.objects.filter(id__in=[run.id for run in runs]).delete()[0],
            "rule_versions": 0,
            "rule_definitions": 0,
        }
        return counts

    def _upsert_rules(self, *, tenant: Tenant, prefix: str, period_start: date) -> list[str]:
        rules = [
            {
                "code": f"{prefix}_CALC_BASIC",
                "name": f"{prefix} Basic Pay",
                "expression": "salary.annual_ctc / 12",
                "component_code": "BASIC",
                "component_name": "Basic Pay",
                "component_type": "earning",
                "output_path": "components.basic_pay",
                "calculation_order": 10,
            },
            {
                "code": f"{prefix}_CALC_HRA",
                "name": f"{prefix} House Rent Allowance",
                "expression": "salary.annual_ctc / 12 * 0.40",
                "component_code": "HRA",
                "component_name": "House Rent Allowance",
                "component_type": "earning",
                "output_path": "components.hra",
                "calculation_order": 20,
            },
            {
                "code": f"{prefix}_CALC_LOP",
                "name": f"{prefix} Loss of Pay",
                "expression": "(salary.annual_ctc / 12 / attendance.working_days) * attendance.lop_days",
                "component_code": "LOP",
                "component_name": "Loss of Pay",
                "component_type": "deduction",
                "output_path": "components.lop_deduction",
                "calculation_order": 100,
            },
        ]
        rule_codes: list[str] = []
        for item in rules:
            definition, _ = PayrollRuleDefinition.objects.update_or_create(
                tenant=tenant,
                code=item["code"],
                defaults={
                    "name": item["name"],
                    "rule_type": PayrollRuleType.FORMULA,
                    "description": "Pilot 100 calculation certification rule.",
                    "tags": ["pilot100", "calculation", prefix],
                    "config_snapshot": {"seed_ref": prefix, "status": PayrollConfigStatus.ACTIVE},
                },
            )
            PayrollRuleVersion.objects.update_or_create(
                rule=definition,
                version=1,
                defaults={
                    "tenant": tenant,
                    "status": PayrollRuleVersionStatus.ACTIVE,
                    "expression_language": PayrollExpressionLanguage.SAFE_EXPR_V1,
                    "expression": item["expression"],
                    "effective_from": period_start,
                    "effective_to": None,
                    "input_schema": {"required_paths": ["salary.annual_ctc", "attendance.working_days", "attendance.lop_days"]},
                    "output_schema": {"result_path": item["output_path"]},
                    "rounding_rule_ref": "payroll.round.nearest_rupee.v1",
                    "config_snapshot": {
                        "seed_ref": prefix,
                        "component_code": item["component_code"],
                        "component_name": item["component_name"],
                        "component_type": item["component_type"],
                        "calculation_order": item["calculation_order"],
                        "output_path": item["output_path"],
                        "profile_ref": "tenant.payroll.rule.version.pilot100.v1",
                    },
                },
            )
            rule_codes.append(item["code"])
        return rule_codes

    def _salary_snapshot(self, *, source: PayrollInputSnapshot, index: int) -> dict:
        salary_snapshot = dict(source.salary_snapshot) if isinstance(source.salary_snapshot, dict) else {}
        annual_ctc = salary_snapshot.get("annual_ctc")
        monthly_gross = salary_snapshot.get("monthly_gross")
        if str(annual_ctc or "").strip() and str(monthly_gross or "").strip():
            return salary_snapshot
        fallback_annual = Decimal("540000.00") + (Decimal(index) * Decimal("12000.00"))
        salary_snapshot.update(
            {
                "annual_ctc": str(fallback_annual),
                "monthly_gross": str(fallback_annual / Decimal("12.00")),
                "currency_code": salary_snapshot.get("currency_code") or "INR",
                "structure": salary_snapshot.get("structure") or "Pilot 100 seeded salary fallback",
                "source": "pilot_100_calculation_fallback",
            }
        )
        return salary_snapshot

    def _manifest(self, *, tenant: Tenant, prefix: str, period_start: date, period_end: date, cleanup: dict, counts: dict, **extra) -> dict:
        return {
            "seed_ref": prefix,
            "tenant_code": tenant.code,
            "surface": "pilot_100_calculation",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "cleanup": cleanup,
            "counts": counts,
            "generated_at": timezone.now().isoformat(),
            **extra,
        }

    def _write_manifest(self, output_file: str, manifest: dict) -> None:
        if not output_file:
            return
        path = Path(output_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")

    def _normalize_prefix(self, prefix: str) -> str:
        normalized = "".join(character if character.isalnum() or character == "_" else "_" for character in prefix.strip().upper())
        if not normalized:
            raise CommandError("prefix must not be empty.")
        return normalized
