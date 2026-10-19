"""PostgreSQL regressions for concurrent employee read-side accrual commands."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal
from threading import Barrier

import pytest
from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection

from apps.leave_management.models import LeaveBalanceTransaction, LeaveEntitlementLot
from apps.leave_management.services import _get_or_create_leave_balance
from apps.leave_management.year_end_services import append_leave_ledger_movement, ensure_governed_leave_balance
from tests.test_db3_leave_year_integrity import leave_scope


def parallel(operation):
    assert connection.vendor == "postgresql", "This regression requires real PostgreSQL row locks"
    barrier = Barrier(4)
    def run(index):
        close_old_connections()
        try:
            barrier.wait(timeout=20)
            return operation(index)
        finally:
            close_old_connections()
    with ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(run, range(4)))


@pytest.mark.django_db(transaction=True)
def test_parallel_identical_ledger_commands_apply_once():
    _, employee, _, period = leave_scope("closure-replay")
    balance = ensure_governed_leave_balance(employee=employee, policy_period=period)
    def command(_):
        return append_leave_ledger_movement(balance=balance, action=LeaveBalanceTransaction.ActionType.ACCRUAL, units=Decimal("20"),
            effective_date=period.start_date, idempotency_key="closure-replay", reason="Concurrent replay").pk
    ids = parallel(command)
    assert len(set(ids)) == 1
    balance.refresh_from_db()
    assert balance.accrued_amount == Decimal("20")
    assert balance.ledger_version == 1
    assert balance.transactions.count() == 1


@pytest.mark.django_db(transaction=True)
def test_parallel_lazy_accrual_creates_one_movement_and_lot():
    _, employee, policy, period = leave_scope("closure-accrual")
    def read(_):
        return _get_or_create_leave_balance(employee=employee, leave_policy=policy,
            period_year=2026, as_of=date(2026, 10, 19)).pk
    ids = parallel(read)
    assert len(set(ids)) == 1
    balance = employee.leave_balances.get(pk=ids[0])
    assert balance.accrued_amount == Decimal("20")
    assert LeaveBalanceTransaction.objects.filter(leave_balance=balance).count() == 1
    assert LeaveEntitlementLot.objects.filter(leave_balance=balance).count() == 1
    assert balance.ledger_version == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_conflicting_replays_rejected_without_projection_change():
    _, employee, _, period = leave_scope("closure-conflict")
    balance = ensure_governed_leave_balance(employee=employee, policy_period=period)
    def command(index):
        try:
            append_leave_ledger_movement(balance=balance, action=LeaveBalanceTransaction.ActionType.ACCRUAL, units=Decimal(index + 1),
                effective_date=period.start_date, idempotency_key="closure-conflict", reason="Conflict")
            return "applied"
        except ValidationError:
            return "rejected"
    results = parallel(command)
    assert results.count("applied") == 1
    assert results.count("rejected") == 3
    item = LeaveBalanceTransaction.objects.get(leave_balance=balance)
    balance.refresh_from_db()
    assert balance.accrued_amount == item.units
    assert balance.ledger_version == 1
