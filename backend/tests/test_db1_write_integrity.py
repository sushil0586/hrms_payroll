from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal
from threading import Barrier

import pytest
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, close_old_connections, connection, transaction
from django.utils import timezone

from apps.employees.models import Employee, EmploymentStatus
from apps.leave_management.models import LeaveBalance, LeavePolicy, LeavePolicyStatus, LeaveType
from apps.leave_management.services import _reserve_leave_balance
from apps.payroll.models import (
    PayrollCalendar,
    PayrollPeriod,
    PayrollRun,
    PayrollRunKind,
    PayrollRunStatus,
)
from apps.tenants.models import Tenant
from apps.workflows.models import (
    WorkflowAction,
    WorkflowActionLog,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowModule,
    WorkflowStepInstance,
)
from apps.workflows.services import resolve_workflow_action


def make_tenant(code: str) -> Tenant:
    return Tenant.objects.create(code=code, name=code.replace("-", " ").title(), is_sandbox=True)


def make_payroll_scope(code: str = "db1"):
    tenant = make_tenant(code)
    calendar = PayrollCalendar.objects.create(tenant=tenant, code="monthly", name="Monthly")
    period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="2026-10",
        name="October 2026",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 31),
        pay_date=date(2026, 10, 31),
    )
    return tenant, period


def make_workflow(code: str = "db1-workflow") -> WorkflowInstance:
    tenant = make_tenant(code)
    instance = WorkflowInstance.objects.create(
        tenant=tenant,
        module=WorkflowModule.LEAVE,
        trigger_key="leave.request",
        subject_type="leave_request",
        subject_identifier="subject-1",
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=1,
    )
    WorkflowStepInstance.objects.create(
        workflow_instance=instance,
        step_order=1,
        name="Manager approval",
        status=WorkflowInstanceStatus.PENDING,
    )
    return instance


@pytest.mark.django_db(transaction=True)
def test_regular_payroll_run_business_identity_is_unique_and_exception_runs_remain_supported():
    tenant, period = make_payroll_scope("db1-payroll-identity")
    PayrollRun.objects.create(tenant=tenant, period=period, code="regular-1", name="Regular 1")

    with pytest.raises((IntegrityError, ValidationError)):
        with transaction.atomic():
            PayrollRun.objects.create(tenant=tenant, period=period, code="regular-2", name="Regular 2")

    PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="supplementary-1",
        name="Supplementary 1",
        run_kind=PayrollRunKind.SUPPLEMENTARY,
    )
    PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="supplementary-2",
        name="Supplementary 2",
        run_kind=PayrollRunKind.SUPPLEMENTARY,
    )


@pytest.mark.django_db(transaction=True)
def test_cancelled_regular_payroll_run_can_be_replaced():
    tenant, period = make_payroll_scope("db1-payroll-replacement")
    PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="cancelled",
        name="Cancelled",
        status=PayrollRunStatus.CANCELLED,
    )
    replacement = PayrollRun.objects.create(tenant=tenant, period=period, code="replacement", name="Replacement")
    assert replacement.run_kind == PayrollRunKind.REGULAR


@pytest.mark.django_db(transaction=True)
def test_concurrent_regular_payroll_run_creation_allows_only_one_active_run():
    if connection.vendor != "postgresql":
        pytest.skip("Database concurrency verification requires PostgreSQL.")
    tenant, period = make_payroll_scope("db1-payroll-race")
    barrier = Barrier(2)

    def create_run(index):
        close_old_connections()
        try:
            barrier.wait(timeout=5)
            PayrollRun.objects.bulk_create(
                [
                    PayrollRun(
                        tenant_id=tenant.id,
                        period_id=period.id,
                        code=f"regular-{index}",
                        name=f"Regular {index}",
                        run_kind=PayrollRunKind.REGULAR,
                    )
                ]
            )
            return "success"
        except IntegrityError:
            return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(create_run, range(2)))

    assert sorted(outcomes) == ["conflict", "success"]
    assert PayrollRun.objects.filter(tenant=tenant, period=period, run_kind=PayrollRunKind.REGULAR).count() == 1


@pytest.mark.django_db(transaction=True)
def test_locked_payroll_run_rejects_queryset_and_raw_sql_mutation():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    tenant, period = make_payroll_scope("db1-terminal-guard")
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="locked",
        name="Locked",
        status=PayrollRunStatus.LOCKED,
    )

    with pytest.raises(DatabaseError), transaction.atomic():
        PayrollRun.objects.filter(pk=payroll_run.pk).update(name="Bulk bypass")
    with pytest.raises(DatabaseError), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute("UPDATE payroll_payrollrun SET name = %s WHERE id = %s", ["Raw bypass", payroll_run.id])

    payroll_run.refresh_from_db()
    assert payroll_run.name == "Locked"


@pytest.mark.django_db(transaction=True)
def test_approved_payroll_run_rejects_business_edits_but_allows_final_lock_transition():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    tenant, period = make_payroll_scope("db1-approved-guard")
    payroll_run = PayrollRun.objects.create(
        tenant=tenant,
        period=period,
        code="approved",
        name="Approved",
        status=PayrollRunStatus.APPROVED,
    )

    with pytest.raises(DatabaseError), transaction.atomic():
        PayrollRun.objects.filter(pk=payroll_run.pk).update(name="Bulk bypass")

    payroll_run.status = PayrollRunStatus.LOCKED
    payroll_run.final_locked_at = timezone.now()
    payroll_run.save(update_fields=["status", "final_locked_at", "updated_at"])
    payroll_run.refresh_from_db()
    assert payroll_run.status == PayrollRunStatus.LOCKED


@pytest.mark.django_db(transaction=True)
def test_workflow_resolution_is_idempotent_and_conflicting_replay_is_rejected():
    instance = make_workflow()
    resolve_workflow_action(instance=instance, actor_identifier="manager-1", action=WorkflowAction.APPROVE)
    resolved = resolve_workflow_action(instance=instance, actor_identifier="manager-1", action=WorkflowAction.APPROVE)

    assert resolved.status == WorkflowInstanceStatus.APPROVED
    assert WorkflowActionLog.objects.filter(workflow_instance=instance, action=WorkflowAction.APPROVE).count() == 1
    with pytest.raises(ValidationError):
        resolve_workflow_action(instance=instance, actor_identifier="manager-2", action=WorkflowAction.REJECT)


@pytest.mark.django_db(transaction=True)
def test_concurrent_approve_reject_only_one_workflow_decision_succeeds():
    if connection.vendor != "postgresql":
        pytest.skip("Row-lock concurrency verification requires PostgreSQL.")
    instance = make_workflow("db1-workflow-race")
    barrier = Barrier(2)

    def decide(action):
        close_old_connections()
        try:
            barrier.wait(timeout=5)
            resolve_workflow_action(
                instance=WorkflowInstance.objects.get(pk=instance.pk),
                actor_identifier=f"actor-{action}",
                action=action,
            )
            return "success"
        except ValidationError:
            return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(decide, [WorkflowAction.APPROVE, WorkflowAction.REJECT]))

    assert sorted(outcomes) == ["conflict", "success"]
    assert WorkflowActionLog.objects.filter(workflow_instance=instance).count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_leave_reservations_cannot_overallocate_balance():
    if connection.vendor != "postgresql":
        pytest.skip("Row-lock concurrency verification requires PostgreSQL.")
    tenant = make_tenant("db1-leave-race")
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-DB1",
        first_name="DB1",
        employment_status=EmploymentStatus.ACTIVE,
        date_of_joining=date(2020, 1, 1),
    )
    leave_type = LeaveType.objects.create(tenant=tenant, code="annual", name="Annual", allow_negative_balance=False)
    policy = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code="annual-policy",
        name="Annual Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("10.00"),
    )
    LeaveBalance.objects.create(
        tenant=tenant,
        employee=employee,
        leave_policy=policy,
        period_year=2026,
        accrued_amount=Decimal("10.00"),
        closing_balance=Decimal("10.00"),
    )
    barrier = Barrier(2)

    def reserve():
        close_old_connections()
        try:
            barrier.wait(timeout=5)
            with transaction.atomic():
                _reserve_leave_balance(
                    employee=Employee.objects.get(pk=employee.pk),
                    leave_policy=LeavePolicy.objects.select_related("leave_type").get(pk=policy.pk),
                    start_date=date(2026, 10, 20),
                    requested_units=Decimal("6.00"),
                )
            return "success"
        except ValidationError:
            return "insufficient"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(lambda _: reserve(), range(2)))

    assert sorted(outcomes) == ["insufficient", "success"]
    balance = LeaveBalance.objects.get(employee=employee, leave_policy=policy, period_year=2026)
    assert balance.reserved_amount == Decimal("6.00")
    assert balance.closing_balance == Decimal("4.00")
