"""Run inside `manage.py shell` against an isolated Phase 5D workspace."""

import hashlib
import json
import os
import time
from datetime import date
from decimal import Decimal

from django.utils import timezone

from apps.employees.models import Employee, EmploymentStatus
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryProfile,
    PayGroupAssignment,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollRuleDefinition,
    PayrollRuleType,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunCalculation,
    PayrollRunStatus,
    PayrollRunReview,
    PayrollOutputBatch,
    PayrollFinanceHandoff,
    PayrollBackgroundJobOperation,
    PayrollBackgroundJobStatus,
)
from apps.payroll.background_jobs import enqueue_payroll_background_job
from apps.payroll.services import (
    PayrollOutputError,
    approve_payroll_run_review,
    calculate_draft_payroll_run,
    generate_payroll_finance_handoff,
    generate_payroll_outputs,
    lock_approved_payroll_run_review,
    open_payroll_run_review,
    publish_payroll_output_batch,
    submit_payroll_run_review,
)
from apps.tenants.models import Tenant


TENANT_CODE = os.getenv("PAYROLL_PERF_TENANT_CODE", "pw-qa-perf-p5d-main")
VOLUMES = tuple(int(value) for value in os.getenv("PHASE5D_VOLUMES", "100,500,1000,2500").split(","))
BACKGROUND_MODE = os.getenv("PAYROLL_BACKGROUND_MODE", "0") == "1"
RUN_PREFIX = os.getenv("PAYROLL_RUN_PREFIX", "phase5d")
MARKER = {
    "owner": "phase5e" if BACKGROUND_MODE else "phase5d",
    "seed_ref": TENANT_CODE,
    "disposable": True,
}


def emit(event, **payload):
    print(json.dumps({"event": event, "at": timezone.now().isoformat(), **payload}, default=str), flush=True)


def timed(label, function, *args, **kwargs):
    started = time.perf_counter()
    result = function(*args, **kwargs)
    duration = round(time.perf_counter() - started, 3)
    emit("stage", stage=label, seconds=duration)
    return result, duration


def background_timed(label, operation, target, *, actor, request_snapshot=None):
    started = time.perf_counter()
    job, created = enqueue_payroll_background_job(
        tenant=target.tenant,
        operation=operation,
        target=target,
        requested_by=actor,
        request_snapshot=request_snapshot or {},
        client_key=f"phase5e:{label}",
    )
    accepted_seconds = round(time.perf_counter() - started, 3)
    duplicate, duplicate_created = enqueue_payroll_background_job(
        tenant=target.tenant,
        operation=operation,
        target=target,
        requested_by=actor,
        request_snapshot=request_snapshot or {},
        client_key=f"phase5e:{label}",
    )
    if duplicate_created or duplicate.id != job.id:
        raise RuntimeError(f"Duplicate submission created a second job for {label}.")
    deadline = time.monotonic() + 360
    observed = []
    while time.monotonic() < deadline:
        job.refresh_from_db()
        marker = (job.status, job.stage, job.completed_items, job.total_items)
        if not observed or observed[-1] != marker:
            observed.append(marker)
            emit(
                "job_status",
                label=label,
                job_id=str(job.id),
                status=job.status,
                stage=job.stage,
                completed_items=job.completed_items,
                total_items=job.total_items,
            )
        if job.status in {PayrollBackgroundJobStatus.SUCCEEDED, PayrollBackgroundJobStatus.FAILED}:
            break
        time.sleep(0.25)
    if job.status != PayrollBackgroundJobStatus.SUCCEEDED:
        raise RuntimeError(f"Background payroll job {label} ended as {job.status}: {job.error_message}")
    duration = round(time.perf_counter() - started, 3)
    queue_seconds = round((job.started_at - job.queued_at).total_seconds(), 3)
    worker_seconds = round((job.completed_at - job.started_at).total_seconds(), 3)
    emit(
        "background_stage",
        stage=label,
        accepted_seconds=accepted_seconds,
        queue_seconds=queue_seconds,
        worker_seconds=worker_seconds,
        end_to_end_seconds=duration,
        attempt_count=job.attempt_count,
        duplicate_job_id=str(duplicate.id),
    )
    return job, duration


tenant = Tenant.objects.get(code=TENANT_CODE)
base = tenant.employees.get(employee_code="QA-EMP-001")
actor = tenant.memberships.get(employee_code="QA-HR-001").user
base_pay_group_assignment = base.pay_group_assignments.get()
base_salary_assignment = base.salary_assignments.get()
pay_group = base_pay_group_assignment.pay_group
period = tenant.payroll_periods.get(code="2026-10")
statutory_pack = tenant.payroll_statutory_packs.get(code="qa-india-2026")

deduction_rule, created = PayrollRuleDefinition.objects.get_or_create(
    tenant=tenant,
    code="phase5d-statutory-deduction",
    defaults={
        "name": "Phase 5D statutory deduction",
        "rule_type": PayrollRuleType.FORMULA,
        "config_snapshot": {
            **MARKER,
            "component_code": "QA_STATUTORY_DEDUCTION",
            "component_name": "QA Statutory Deduction",
            "component_type": "deduction",
            "calculation_order": 20,
            "output_path": "components.qa_statutory_deduction",
        },
    },
)
if created:
    PayrollRuleVersion.objects.create(
        tenant=tenant,
        rule=deduction_rule,
        version=1,
        status=PayrollRuleVersionStatus.ACTIVE,
        expression="salary.monthly_gross * 0.10",
        effective_from=date(2024, 1, 1),
        config_snapshot=deduction_rule.config_snapshot,
    )

existing = tenant.employees.filter(employee_code__startswith="P5D-").count()
if existing < 2499:
    started = time.perf_counter()
    employees = []
    for index in range(existing + 1, 2500):
        employees.append(Employee(
            tenant=tenant,
            employee_code=f"P5D-{index:04d}",
            first_name="Payroll",
            last_name=f"Employee {index:04d}",
            preferred_name=f"P5D {index:04d}",
            work_email=f"p5d-{index:04d}@playwright.invalid",
            date_of_joining=date(2024, 1, 1),
            employment_status=EmploymentStatus.ACTIVE,
            legal_entity=base.legal_entity,
            branch=base.branch,
            location=base.location,
            department=base.department,
            business_unit=base.business_unit,
            cost_center=base.cost_center,
            designation=base.designation,
            grade=base.grade,
            employment_type=base.employment_type,
            reporting_manager=base.reporting_manager,
        ))
    Employee.objects.bulk_create(employees, batch_size=500)
    employees = list(tenant.employees.filter(employee_code__startswith="P5D-").order_by("employee_code"))
    PayGroupAssignment.objects.bulk_create([
        PayGroupAssignment(
            tenant=tenant,
            pay_group=pay_group,
            employee=employee,
            effective_from=date(2024, 1, 1),
            config_snapshot=MARKER,
        ) for employee in employees
    ], batch_size=500)
    EmployeeSalaryAssignment.objects.bulk_create([
        EmployeeSalaryAssignment(
            tenant=tenant,
            employee=employee,
            structure_version=base_salary_assignment.structure_version,
            effective_from=date(2024, 1, 1),
            config_snapshot=MARKER,
        ) for employee in employees
    ], batch_size=500)
    profiles = [EmployeeStatutoryProfile(
        tenant=tenant,
        employee=employee,
        statutory_pack=statutory_pack,
        effective_from=date(2026, 4, 1),
        effective_to=date(2027, 3, 31),
        source_ref="phase5d:volume",
        config_snapshot=MARKER,
    ) for employee in employees]
    EmployeeStatutoryProfile.objects.bulk_create(profiles, batch_size=500)
    EmployeeStatutoryDeclaration.objects.bulk_create([
        EmployeeStatutoryDeclaration(
            tenant=tenant,
            employee=profile.employee,
            employee_statutory_profile=profile,
            statutory_pack=statutory_pack,
            financial_year_code="2026-27",
            source_ref="phase5d:volume",
            config_snapshot=MARKER,
        ) for profile in profiles
    ], batch_size=500)
    emit("provision", employees_created=len(employees), seconds=round(time.perf_counter() - started, 3))

employees = [base, *tenant.employees.filter(employee_code__startswith="P5D-").order_by("employee_code")]
assignments = {item.employee_id: item for item in tenant.pay_group_assignments.filter(employee__in=employees)}
salaries = {item.employee_id: item for item in tenant.employee_salary_assignments.filter(employee__in=employees)}
emit("fixture", employee_count=len(employees), pay_group=str(pay_group.id), period=str(period.id))

for volume in VOLUMES:
    code = f"{RUN_PREFIX}-{volume}"
    if PayrollRun.objects.filter(tenant=tenant, code=code).exists():
        raise RuntimeError(f"Owned payroll run {code} already exists; use a fresh disposable workspace.")
    run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        pay_group=pay_group,
        code=code,
        name=f"Phase 5D {volume} employees",
        status=PayrollRunStatus.INPUTS_LOCKED,
        locked_by=actor,
        config_snapshot=MARKER,
    )
    selected = employees[:volume]
    started = time.perf_counter()
    snapshots = []
    for employee in selected:
        employee_snapshot = {"employee_code": employee.employee_code, "name": str(employee)}
        salary_snapshot = {"annual_ctc": "600000.00", "monthly_gross": "50000.00"}
        banking_snapshot = {
            "account_name": str(employee),
            "account_number_masked": f"XXXX{employee.employee_code[-4:]}",
            "bank_name": "Synthetic QA Bank",
            "ifsc_code": "QA0000001",
        }
        digest = hashlib.sha256(json.dumps({
            "employee": employee_snapshot,
            "salary": salary_snapshot,
            "banking": banking_snapshot,
            "period_start": str(period.start_date),
            "period_end": str(period.end_date),
        }, sort_keys=True).encode()).hexdigest()
        snapshots.append(PayrollInputSnapshot(
            tenant=tenant,
            payroll_run=run,
            employee=employee,
            pay_group_assignment=assignments[employee.id],
            salary_assignment=salaries[employee.id],
            snapshot_status=PayrollInputSnapshotStatus.LOCKED,
            period_start=period.start_date,
            period_end=period.end_date,
            locked_at=timezone.now(),
            employee_snapshot=employee_snapshot,
            salary_snapshot=salary_snapshot,
            banking_snapshot=banking_snapshot,
            validation_snapshot={"blockers": [], "warnings": []},
            source_hash=digest,
            config_snapshot=MARKER,
        ))
    PayrollInputSnapshot.objects.bulk_create(snapshots, batch_size=500)
    snapshot_seconds = round(time.perf_counter() - started, 3)

    if BACKGROUND_MODE:
        calculation_job, calculation_seconds = background_timed(
            f"{volume}:calculate", PayrollBackgroundJobOperation.CALCULATE, run, actor=actor,
        )
        calculation = PayrollRunCalculation.objects.get(id=calculation_job.result_snapshot["calculation_id"])
    else:
        calculation, calculation_seconds = timed(f"{volume}:calculate", calculate_draft_payroll_run, run, calculated_by=actor)
    review, review_seconds = timed(f"{volume}:open_review", open_payroll_run_review, calculation, opened_by=actor)
    review, submit_seconds = timed(f"{volume}:submit_review", submit_payroll_run_review, review, submitted_by=actor)
    _, approve_seconds = timed(f"{volume}:approve_review", approve_payroll_run_review, review, approved_by=actor, comment="Phase 5D volume certification")
    review.refresh_from_db()
    review, lock_seconds = timed(f"{volume}:lock_review", lock_approved_payroll_run_review, review, locked_by=actor)
    if BACKGROUND_MODE:
        output_job, output_seconds = background_timed(
            f"{volume}:generate_outputs", PayrollBackgroundJobOperation.GENERATE_OUTPUTS, review, actor=actor,
        )
        batch = PayrollOutputBatch.objects.get(id=output_job.result_snapshot["output_batch_id"])
        _, publish_seconds = background_timed(
            f"{volume}:publish_outputs", PayrollBackgroundJobOperation.PUBLISH_OUTPUTS, batch, actor=actor,
        )
        batch.refresh_from_db()
        handoff_job, handoff_seconds = background_timed(
            f"{volume}:finance_handoff", PayrollBackgroundJobOperation.GENERATE_FINANCE_HANDOFF, batch, actor=actor,
        )
        handoff = PayrollFinanceHandoff.objects.get(id=handoff_job.result_snapshot["finance_handoff_id"])
    else:
        batch, output_seconds = timed(f"{volume}:generate_outputs", generate_payroll_outputs, review, generated_by=actor)
        batch, publish_seconds = timed(f"{volume}:publish_outputs", publish_payroll_output_batch, batch, published_by=actor)
        handoff, handoff_seconds = timed(f"{volume}:finance_handoff", generate_payroll_finance_handoff, batch, generated_by=actor)
    duplicate_handoff = generate_payroll_finance_handoff(batch, generated_by=actor)
    duplicate_publish = publish_payroll_output_batch(batch, published_by=actor)
    regeneration_blocked = False
    try:
        generate_payroll_outputs(review, generated_by=actor)
    except PayrollOutputError:
        regeneration_blocked = True

    totals = calculation.totals_snapshot
    expected_gross = Decimal("50000.00") * volume
    expected_deduction = Decimal("5000.00") * volume
    expected_net = Decimal("45000.00") * volume
    artifacts = PayrollOutputArtifact.objects.filter(output_batch=batch)
    artifact_bytes = sum(len(item.file_payload or b"") for item in artifacts.only("file_payload"))
    checks = {
        "employee_count": calculation.lines.values("employee_id").distinct().count() == volume,
        "gross": Decimal(str(totals["gross_earnings"])) == expected_gross,
        "deductions": Decimal(str(totals["employee_deductions"])) == expected_deduction,
        "net": Decimal(str(totals["net_pay"])) == expected_net,
        "reconciles": expected_gross - expected_deduction == expected_net,
        "published": duplicate_publish.id == batch.id,
        "handoff_idempotent": duplicate_handoff.id == handoff.id,
        "published_regeneration_blocked": regeneration_blocked,
        "payslip_count": artifacts.filter(kind="payslip").count() == volume,
        "register_count": artifacts.filter(kind="register").count() == 1,
        "finance_artifact_count": artifacts.filter(
            kind__in=["bank_advice", "accounting_export", "statutory_report"]
        ).count() == 3,
    }
    emit(
        "volume_result",
        volume=volume,
        checks=checks,
        passed=all(checks.values()),
        snapshot_seconds=snapshot_seconds,
        end_to_end_seconds=round(sum([
            calculation_seconds, review_seconds, submit_seconds, approve_seconds,
            lock_seconds, output_seconds, publish_seconds, handoff_seconds,
        ]), 3),
        calculation=totals,
        output_artifact_count=artifacts.count(),
        output_artifact_bytes=artifact_bytes,
        handoff_id=str(handoff.id),
    )

emit("complete", volumes=list(VOLUMES))
