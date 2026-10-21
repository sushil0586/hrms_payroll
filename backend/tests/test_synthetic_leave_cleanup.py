"""Protected compensation graphs remain immutable except during owned QA teardown."""
from contextlib import redirect_stdout
from datetime import date
from decimal import Decimal
from io import StringIO
from uuid import uuid4

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models.deletion import ProtectedError

from apps.leave_management.models import LeaveBalanceTransaction
from apps.leave_management.year_end_services import append_leave_ledger_movement
from apps.tenants.models import Tenant


@pytest.mark.django_db(transaction=True)
def test_owned_teardown_orders_compensations_without_weakening_protection():
    seed = f"cleanup-{uuid4().hex[:12]}"
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed)
    tenant = Tenant.objects.get(code=f"pw-qa-{seed}")
    from apps.common.selectors import get_employee_leave_summary
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    get_employee_leave_summary(employee)
    balance = employee.leave_balances.get(policy_period__isnull=False)
    source = append_leave_ledger_movement(balance=balance, action="consumption", units=Decimal("1"), effective_date=date(2026, 11, 10), idempotency_key="qa-consume", reason="Synthetic cleanup regression")
    reversal = append_leave_ledger_movement(balance=balance, action="consumption_reversal", units=Decimal("1"), source_transaction=source, effective_date=date(2026, 11, 10), idempotency_key="qa-reverse", reason="Synthetic cleanup regression")
    with pytest.raises(ProtectedError):
        LeaveBalanceTransaction.objects.filter(pk=source.pk).delete()
    assert LeaveBalanceTransaction.objects.filter(pk=reversal.pk).exists()
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed, cleanup=True)
    assert not Tenant.objects.filter(pk=tenant.pk).exists()
    assert not LeaveBalanceTransaction.objects.filter(pk__in=[source.pk, reversal.pk]).exists()


@pytest.mark.django_db(transaction=True)
def test_owned_cleanup_refuses_a_tenant_with_changed_ownership_marker():
    seed = f"cleanup-{uuid4().hex[:12]}"
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed)
    tenant = Tenant.objects.get(code=f"pw-qa-{seed}")
    tenant.is_sandbox = False
    tenant.save(update_fields=["is_sandbox"])
    with pytest.raises(CommandError):
        call_command("manage_playwright_workspace", seed_ref=seed, cleanup=True)
    assert Tenant.objects.filter(pk=tenant.pk).exists()


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("action", ["approve", "reject"])
def test_stale_manager_decision_is_validation_error_and_preserves_withdrawal(action):
    from rest_framework.test import APIClient
    from apps.leave_management.models import LeaveRequest

    seed = f"stale-{uuid4().hex[:12]}"
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed)
    tenant = Tenant.objects.get(code=f"pw-qa-{seed}")
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    manager = employee.reporting_manager
    item = LeaveRequest.objects.get(employee=employee, status="pending")
    client = APIClient()
    client.force_authenticate(employee.membership.user)
    assert client.post(f"/api/v1/me/leave-requests/{item.id}/withdraw/", {"reason": "Synthetic withdrawal"}, format="json").status_code == 200
    balance = employee.leave_balances.get(leave_policy=item.leave_policy)
    balance.refresh_from_db()
    before = (balance.reserved_amount, balance.consumed_amount, balance.closing_balance, balance.transactions.count())
    client.force_authenticate(manager.membership.user)
    response = client.post(f"/api/v1/manager/leave-requests/{item.id}/{action}/", {"comment": "Stale decision must be rejected"}, format="json")
    assert response.status_code == 400, response.data
    assert "already been resolved" in str(response.data)
    item.refresh_from_db()
    balance.refresh_from_db()
    assert item.status == "withdrawn"
    assert (balance.reserved_amount, balance.consumed_amount, balance.closing_balance, balance.transactions.count()) == before
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed, cleanup=True)
