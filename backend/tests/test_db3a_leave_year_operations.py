from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership
from apps.leave_management.models import (
    LeaveBalance,
    LeaveBalanceTransaction,
    LeavePolicy,
    LeavePolicyPeriod,
    LeavePolicyPeriodStatus,
    LeaveType,
    LeaveYearCloseRun,
    LeaveYearCloseRunStatus,
)
from apps.leave_management.tasks import (
    dispatch_pending_leave_year_close_runs,
    execute_leave_year_close_task,
    recover_stale_leave_year_close_runs,
)
from apps.leave_management.year_end_services import (
    append_leave_ledger_movement,
    build_historical_leave_classification_report,
    create_leave_year_close_run,
    ensure_governed_leave_balance,
    execute_leave_year_close_run,
    preview_leave_year_close,
)
from apps.tenants.models import Tenant


def governed_fixture(code="db3a"):
    tenant = Tenant.objects.create(code=code, name=code, is_sandbox=True)
    leave_type = LeaveType.objects.create(tenant=tenant, code="annual", name="Annual")
    policy = LeavePolicy.objects.create(
        tenant=tenant, leave_type=leave_type, code="annual", name="Annual",
        annual_entitlement=Decimal("20"), max_carry_forward=Decimal("10"),
    )
    source = LeavePolicyPeriod.objects.create(
        tenant=tenant, leave_policy=policy, code="2026-27", start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31), status=LeavePolicyPeriodStatus.OPEN,
    )
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant, leave_policy=policy, code="2027-28", start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31), status=LeavePolicyPeriodStatus.OPEN,
    )
    employee = Employee.objects.create(
        tenant=tenant, employee_code=f"EMP-{code}", first_name="DB3A",
        employment_status=EmploymentStatus.ACTIVE, date_of_joining=date(2020, 1, 1),
    )
    balance = ensure_governed_leave_balance(employee=employee, policy_period=source)
    append_leave_ledger_movement(
        balance=balance, action=LeaveBalanceTransaction.ActionType.OPENING, units=Decimal("18"),
        effective_date=source.start_date, idempotency_key=f"opening:{code}", reason="DB-3A fixture",
    )
    return tenant, employee, policy, source, target


@pytest.mark.django_db(transaction=True)
def test_preview_matches_commit_and_performs_no_writes():
    _, employee, _, source, target = governed_fixture("db3a-preview")
    before_transactions = LeaveBalanceTransaction.objects.count()
    preview = preview_leave_year_close(
        source_period=source, target_period=target, carry_forward_cap=Decimal("10"),
        expiring_units=Decimal("4"), expiry_date=date(2027, 6, 30),
    )
    assert preview["totals"] == {"available": "18.00", "carried": "10.00", "forfeited": "8.00", "expiring": "4.00"}
    assert LeaveBalanceTransaction.objects.count() == before_transactions
    run = execute_leave_year_close_run(create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee, idempotency_key="preview-commit",
        carry_forward_cap=Decimal("10"), expiring_units=Decimal("4"), expiry_date=date(2027, 6, 30),
    ))
    item = run.items.get()
    assert item.carry_forward_units == Decimal(preview["totals"]["carried"])
    assert item.forfeited_units == Decimal(preview["totals"]["forfeited"])


@pytest.mark.django_db(transaction=True)
def test_historical_classification_is_read_only_and_tenant_scoped():
    tenant, employee, policy, source, _ = governed_fixture("db3a-history")
    legacy_employee = Employee.objects.create(
        tenant=tenant, employee_code="EMP-LEGACY", first_name="Legacy",
        employment_status=EmploymentStatus.ACTIVE,
    )
    legacy = LeaveBalance.objects.create(
        tenant=tenant, employee=legacy_employee, leave_policy=policy, period_year=2026, closing_balance=Decimal("1"),
    )
    other_tenant, other_employee, other_policy, _, _ = governed_fixture("db3a-other")
    other_legacy_employee = Employee.objects.create(
        tenant=other_tenant, employee_code="EMP-OTHER-LEGACY", first_name="Other",
        employment_status=EmploymentStatus.ACTIVE,
    )
    LeaveBalance.objects.create(
        tenant=other_tenant, employee=other_legacy_employee, leave_policy=other_policy, period_year=2026, closing_balance=Decimal("2"),
    )
    before = list(LeaveBalance.objects.values_list("id", "policy_period_id", "closing_balance"))
    report = build_historical_leave_classification_report(tenant=tenant)
    assert report["automatic_classification_performed"] is False
    assert report["balance_counts"]["unclassified"] == 1
    assert report["balances"][0]["id"] == str(legacy.id)
    assert report["balances"][0]["candidate_period_ids"] == [str(source.id)]
    assert list(LeaveBalance.objects.values_list("id", "policy_period_id", "closing_balance")) == before


@pytest.mark.django_db(transaction=True)
def test_scheduled_dispatch_is_single_and_worker_recovery_is_idempotent(settings):
    _, employee, _, source, target = governed_fixture("db3a-tasks")
    run = create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee, idempotency_key="scheduled",
        carry_forward_cap=Decimal("10"), scheduled_for=timezone.now() - timedelta(minutes=1),
    )
    async_result = Mock(id="celery-db3a")
    with patch("apps.leave_management.tasks.execute_leave_year_close_task.apply_async", return_value=async_result) as apply_async:
        assert dispatch_pending_leave_year_close_runs(limit=10) == 1
        assert dispatch_pending_leave_year_close_runs(limit=10) == 0
        apply_async.assert_called_once_with(args=[str(run.id)])
    run.refresh_from_db()
    assert run.celery_task_id == "celery-db3a"

    settings.LEAVE_YEAR_CLOSE_STALE_SECONDS = 60
    LeaveYearCloseRun.objects.filter(pk=run.pk).update(
        status=LeaveYearCloseRunStatus.RUNNING, started_at=timezone.now() - timedelta(minutes=5),
        completed_at=None,
    )
    assert recover_stale_leave_year_close_runs() == 1
    assert recover_stale_leave_year_close_runs() == 0
    run.refresh_from_db()
    assert run.status == LeaveYearCloseRunStatus.QUEUED
    assert run.dispatched_at is None


@pytest.mark.django_db(transaction=True)
def test_celery_execution_retry_does_not_duplicate_rollover():
    _, employee, _, source, target = governed_fixture("db3a-celery")
    run = create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee,
        idempotency_key="celery-retry", carry_forward_cap=Decimal("10"),
    )
    first = execute_leave_year_close_task.apply(args=[str(run.id)]).get()
    second = execute_leave_year_close_task.apply(args=[str(run.id)]).get()
    assert first["status"] == second["status"] == LeaveYearCloseRunStatus.SUCCEEDED
    assert LeaveBalanceTransaction.objects.filter(
        close_run=run, action=LeaveBalanceTransaction.ActionType.CARRY_FORWARD,
    ).count() == 1


def authorized_client(tenant, code="db3a-admin"):
    user = get_user_model().objects.create_user(username=code, email=f"{code}@example.test", password="x")
    membership = TenantMembership.objects.create(
        tenant=tenant, user=user, employee_code=code, status=MembershipStatus.ACTIVE, is_default=True,
    )
    role = Role.objects.create(tenant=tenant, code="hr-admin", name="HR Admin", is_active=True)
    for permission in ("leave.periods.view", "leave.periods.manage", "leave.periods.close", "leave.periods.reopen"):
        RolePermission.objects.create(role=role, permission_key=permission)
    MembershipRole.objects.create(membership=membership, role=role, is_primary=True)
    Employee.objects.create(
        tenant=tenant, membership=membership, employee_code=code, first_name="Admin",
        employment_status=EmploymentStatus.ACTIVE,
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db(transaction=True)
def test_api_requires_tenant_scope_preview_and_explicit_close_confirmation():
    tenant, _, _, source, target = governed_fixture("db3a-api")
    client = authorized_client(tenant)
    preview_payload = {
        "source_period_id": str(source.id), "target_period_id": str(target.id),
        "carry_forward_cap": "10.00", "expiring_units": "0.00", "idempotency_key": "api-close",
    }
    preview_response = client.post("/api/v1/hr-admin/leave-year/preview/", preview_payload, format="json")
    assert preview_response.status_code == 200
    assert preview_response.data["confirmation_phrase"] == "CLOSE 2026-27"
    denied = client.post("/api/v1/hr-admin/leave-year/close-runs/", preview_payload, format="json")
    assert denied.status_code == 400
    accepted = client.post(
        "/api/v1/hr-admin/leave-year/close-runs/", {**preview_payload, "confirmation": "CLOSE 2026-27"}, format="json",
    )
    assert accepted.status_code == 202
    assert accepted.data["status"] == LeaveYearCloseRunStatus.QUEUED

    other, _, _, other_source, _ = governed_fixture("db3a-api-other")
    cross_tenant = client.post(
        "/api/v1/hr-admin/leave-year/preview/", {**preview_payload, "source_period_id": str(other_source.id)}, format="json",
    )
    assert cross_tenant.status_code == 404


@pytest.mark.django_db(transaction=True)
def test_tenant_admin_leave_year_options_do_not_require_hr_admin_access():
    tenant, _, policy, _, _ = governed_fixture("db3a-tenant-options")
    client = authorized_client(tenant, "db3a-tenant-options-admin")
    response = client.get("/api/v1/tenant-admin/leave-year/options/")
    assert response.status_code == 200
    assert response.data["leave_policies"] == [{"id": str(policy.id), "name": policy.name}]
