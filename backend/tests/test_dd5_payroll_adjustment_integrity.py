from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
from io import StringIO
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import close_old_connections, connection

from apps.employees.models import Employee
from apps.payroll.models import PayrollAdjustment, PayrollInputSnapshot, PayrollRun
from apps.payroll.services import (
    PayrollAdjustmentError,
    approve_payroll_adjustment,
    create_payroll_adjustment,
    reject_payroll_adjustment,
    submit_payroll_adjustment,
)
from apps.tenants.models import Tenant


@pytest.mark.django_db(transaction=True)
def test_concurrent_adjustment_approve_reject_has_one_terminal_decision():
    if connection.vendor != "postgresql":
        pytest.skip("DD-5 adjustment concurrency certification requires PostgreSQL.")

    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="dd5-adjustment-race")

    tenant = Tenant.objects.get(code="pw-qa-dd5-adjustment-race")
    payroll_run = PayrollRun.objects.get(tenant=tenant, code="qa-inputs-locked")
    employee = Employee.objects.get(tenant=tenant, employee_code="QA-EMP-001")
    snapshot = PayrollInputSnapshot.objects.get(payroll_run=payroll_run, employee=employee)
    submitter = get_user_model().objects.get(username="pw_dd5_adjustment_race_hr_admin")
    checker = get_user_model().objects.get(username="pw_dd5_adjustment_race_hr_checker")
    adjustment = create_payroll_adjustment(
        payroll_run=payroll_run,
        employee=employee,
        input_snapshot=snapshot,
        kind="correction",
        direction="earning",
        component_code="DD5_RACE",
        component_name="DD5 adjustment race",
        amount="100.00",
        effective_date=payroll_run.period.start_date,
        source_ref="dd5-adjustment-race",
        created_by=submitter,
    )
    submit_payroll_adjustment(adjustment, submitted_by=submitter)
    barrier = Barrier(2)

    def decide(action: str):
        close_old_connections()
        try:
            item = PayrollAdjustment.objects.get(pk=adjustment.pk)
            actor = get_user_model().objects.get(pk=checker.pk)
            barrier.wait()
            if action == "approve":
                approve_payroll_adjustment(item, approved_by=actor)
            else:
                reject_payroll_adjustment(item, rejected_by=actor, reason="Concurrent rejection")
            return "succeeded"
        except PayrollAdjustmentError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(decide, ["approve", "reject"]))

    adjustment.refresh_from_db()
    assert sorted(results) == ["rejected", "succeeded"]
    assert adjustment.status in {"approved", "rejected"}
    assert bool(adjustment.approved_at) != bool(adjustment.rejected_at)


@pytest.mark.django_db(transaction=True)
def test_adjustment_submitter_cannot_approve_own_adjustment():
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="rg2a-adjustment-maker-checker")

    tenant = Tenant.objects.get(code="pw-qa-rg2a-adjustment-maker-checker")
    payroll_run = PayrollRun.objects.get(tenant=tenant, code="qa-inputs-locked")
    employee = Employee.objects.get(tenant=tenant, employee_code="QA-EMP-001")
    snapshot = PayrollInputSnapshot.objects.get(payroll_run=payroll_run, employee=employee)
    submitter = get_user_model().objects.get(username="pw_rg2a_adjustment_maker_checker_hr_admin")
    adjustment = create_payroll_adjustment(
        payroll_run=payroll_run,
        employee=employee,
        input_snapshot=snapshot,
        kind="correction",
        direction="earning",
        component_code="RG2A_MAKER_CHECKER",
        component_name="RG-2A maker checker",
        amount="100.00",
        effective_date=payroll_run.period.start_date,
        source_ref="rg2a-adjustment-maker-checker",
        created_by=submitter,
    )
    submit_payroll_adjustment(adjustment, submitted_by=submitter)

    with pytest.raises(PayrollAdjustmentError, match="different authorized user"):
        approve_payroll_adjustment(adjustment, approved_by=submitter)

    adjustment.refresh_from_db()
    assert adjustment.status == "submitted"
    assert adjustment.approved_by_id is None
