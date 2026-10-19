"""Deterministic PostgreSQL lock-interleaving regressions; no timing sleeps."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal
from threading import Event

import pytest
from django.db import close_old_connections, connection, transaction

from apps.leave_management.models import LeaveBalance, LeaveBalanceTransaction, LeaveEntitlementLot, LeaveRequest, LeaveRequestStatus
from apps.leave_management.services import _consume_governed_leave_request, _get_or_create_leave_balance, _reserve_governed_leave_request
from apps.leave_management.year_end_services import reverse_leave_request_allocations, expire_entitlement_lots
from tests.test_db3_leave_year_integrity import leave_scope


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("competing_operation", ["cancellation", "expiry"])
def test_approval_and_cancellation_share_lots_without_deadlock(competing_operation):
    assert connection.vendor == "postgresql"
    tenant, employee, policy, period = leave_scope("mixed-approval-cancel")
    balance = _get_or_create_leave_balance(employee=employee, leave_policy=policy, period_year=2026, as_of=date(2026, 5, 10))
    def request(units):
        return LeaveRequest.objects.create(tenant=tenant, employee=employee, leave_type=policy.leave_type,
            leave_policy=policy, status=LeaveRequestStatus.PENDING, start_date=date(2026, 5, 10),
            end_date=date(2026, 5, 10), requested_units=Decimal(units))
    def reserve(item, units):
        assert _reserve_governed_leave_request(leave_request=item, unit_breakdown={"days":[{"date":"2026-05-10","units":units,"counted":True}]})
    previous=request("2"); reserve(previous,"2"); assert _consume_governed_leave_request(leave_request=previous)
    pending=request("3"); reserve(pending,"3")
    lot=LeaveEntitlementLot.objects.get(leave_balance=balance)
    lot.expiry_date=date(2026,5,15);lot.save(update_fields=["expiry_date"])
    approval_holds_balance=Event(); cancellation_reaches_balance=Event()
    def approval():
        close_old_connections()
        try:
            def observe(execute, sql, params, many, context):
                if 'leave_management_leaveentitlementlot' in sql and 'FOR UPDATE' in sql:
                    assert cancellation_reaches_balance.wait(15), "Cancellation never reached its balance lock"
                return execute(sql,params,many,context)
            with transaction.atomic(), connection.execute_wrapper(observe):
                with connection.cursor()as c:c.execute("SET LOCAL lock_timeout='10s'")
                LeaveBalance.objects.select_for_update().get(pk=balance.pk)
                approval_holds_balance.set()
                assert _consume_governed_leave_request(leave_request=pending)
            return "approved"
        finally:close_old_connections()
    def cancellation():
        close_old_connections()
        try:
            assert approval_holds_balance.wait(15)
            def observe(execute, sql, params, many, context):
                if 'FROM "leave_management_leavebalance"' in sql and 'FOR UPDATE' in sql:
                    cancellation_reaches_balance.set()
                return execute(sql,params,many,context)
            with transaction.atomic(), connection.execute_wrapper(observe):
                with connection.cursor()as c:c.execute("SET LOCAL lock_timeout='10s'")
                if competing_operation=="cancellation":
                    reverse_leave_request_allocations(leave_request=previous,reversal_date=date(2026,5,10),idempotency_key="mixed-cancel")
                else:
                    expire_entitlement_lots(policy_period=period,as_of=date(2026,5,16),idempotency_prefix="mixed-expiry")
            return "cancelled"
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2)as pool:
        a=pool.submit(approval);b=pool.submit(cancellation)
        results=[a.result(timeout=30),b.result(timeout=30)]
    assert results==["approved","cancelled"]
    balance.refresh_from_db()
    assert balance.accrued_amount==Decimal("20")
    assert balance.reserved_amount==0
    if competing_operation=="expiry":
        assert balance.consumed_amount==Decimal("5")
        assert balance.expired_amount==Decimal("15")
        assert balance.closing_balance==0
        assert LeaveEntitlementLot.objects.get(leave_balance=balance).remaining_units==0
        return
    assert balance.consumed_amount==Decimal("3")
    assert balance.closing_balance==Decimal("17")
    assert LeaveEntitlementLot.objects.get(leave_balance=balance).remaining_units==Decimal("17")
    assert previous.allocations.filter(status="reversed").count()==1
    assert pending.allocations.filter(status="consumed").count()==1
    assert LeaveBalanceTransaction.objects.filter(leave_balance=balance,action="consumption_reversal").count()==1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("operation", ["cancellation", "expiry"])
def test_locked_period_rolls_back_lot_allocation_and_ledger(operation):
    from django.core.exceptions import ValidationError
    tenant, employee, policy, period = leave_scope("mixed-closed")
    balance = _get_or_create_leave_balance(employee=employee, leave_policy=policy, period_year=2026, as_of=date(2026,5,10))
    item = LeaveRequest.objects.create(tenant=tenant,employee=employee,leave_type=policy.leave_type,
        leave_policy=policy,status=LeaveRequestStatus.PENDING,start_date=date(2026,5,10),end_date=date(2026,5,10),requested_units=Decimal("2"))
    assert _reserve_governed_leave_request(leave_request=item,unit_breakdown={"days":[{"date":"2026-05-10","units":"2","counted":True}]})
    assert _consume_governed_leave_request(leave_request=item)
    lot=LeaveEntitlementLot.objects.get(leave_balance=balance)
    lot.expiry_date=date(2026,5,15);lot.save(update_fields=["expiry_date"])
    # Use the audited transition service; direct status writes are protected.
    from django.contrib.auth import get_user_model
    from apps.leave_management.models import LeavePolicyPeriod
    from apps.leave_management.year_end_services import (
        transition_leave_policy_period, create_leave_year_close_run, execute_leave_year_close_run,
    )
    target=LeavePolicyPeriod.objects.create(tenant=tenant,leave_policy=policy,code="mixed-next",
        start_date=date(2027,4,1),end_date=date(2028,3,31),status="open")
    run=execute_leave_year_close_run(create_leave_year_close_run(
        source_period=period,target_period=target,actor_employee=employee,
        idempotency_key="mixed-close-run",carry_forward_cap=Decimal("18")))
    assert run.status=="succeeded"
    actor=get_user_model().objects.create_user(username="mixed-lock-admin",is_superuser=True)
    transition_leave_policy_period(policy_period=period,action="close",actor=actor,
        reason="Synthetic close verification",idempotency_key="mixed-period-close")
    transition_leave_policy_period(policy_period=period,action="lock",actor=actor,
        reason="Synthetic rollback verification",idempotency_key="mixed-period-lock")
    balance.refresh_from_db()
    before=(balance.closing_balance,balance.consumed_amount,balance.expired_amount,balance.ledger_version,balance.ledger_checksum)
    count=LeaveBalanceTransaction.objects.filter(leave_balance=balance).count()
    with pytest.raises(ValidationError,match="Closed leave periods"):
        if operation=="cancellation":
            reverse_leave_request_allocations(leave_request=item,reversal_date=date(2026,5,10),idempotency_key="closed-cancel")
        else:
            expire_entitlement_lots(policy_period=period,as_of=date(2026,5,16),idempotency_prefix="closed-expire")
    balance.refresh_from_db();lot.refresh_from_db()
    assert before==(balance.closing_balance,balance.consumed_amount,balance.expired_amount,balance.ledger_version,balance.ledger_checksum)
    assert LeaveBalanceTransaction.objects.filter(leave_balance=balance).count()==count
    assert lot.remaining_units==Decimal("18")
    assert item.allocations.filter(status="consumed").count()==1


@pytest.mark.django_db(transaction=True)
def test_expiry_does_not_lock_an_unrelated_nonexpiring_balance():
    from apps.employees.models import Employee
    tenant, employee, policy, period = leave_scope("mixed-unrelated")
    a=_get_or_create_leave_balance(employee=employee,leave_policy=policy,period_year=2026,as_of=date(2026,5,10))
    lot=LeaveEntitlementLot.objects.get(leave_balance=a);lot.expiry_date=date(2026,5,15);lot.save(update_fields=["expiry_date"])
    other=Employee.objects.create(tenant=tenant,employee_code="MIXED-OTHER",first_name="Other",date_of_joining=date(2020,1,1),employment_status="active")
    b=_get_or_create_leave_balance(employee=other,leave_policy=policy,period_year=2026,as_of=date(2026,5,10))
    def expire():
        close_old_connections()
        try:
            with transaction.atomic():
                with connection.cursor()as c:c.execute("SET LOCAL lock_timeout='3s'")
                return len(expire_entitlement_lots(policy_period=period,as_of=date(2026,5,16),idempotency_prefix="independent"))
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=1)as pool:
        with transaction.atomic():
            LeaveBalance.objects.select_for_update().get(pk=b.pk)
            assert pool.submit(expire).result(timeout=10)==1
    a.refresh_from_db();b.refresh_from_db()
    assert a.expired_amount==Decimal("20") and a.closing_balance==0
    assert b.accrued_amount==Decimal("20") and b.closing_balance==Decimal("20")
