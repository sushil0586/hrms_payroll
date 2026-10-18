from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, IntegrityError, close_old_connections, connection, transaction

from apps.employees.models import Employee, EmploymentStatus
from apps.leave_management.models import (
    LeaveBalance,
    LeaveBalanceTransaction,
    LeaveEntitlementLot,
    LeavePolicy,
    LeavePolicyPeriod,
    LeavePolicyPeriodAction,
    LeavePolicyPeriodStatus,
    LeavePolicyStatus,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    LeaveYearCloseRun,
    LeaveYearCloseRunStatus,
)
from apps.leave_management.year_end_services import (
    append_leave_ledger_movement,
    compensate_leave_ledger_transaction,
    consume_entitlement_lots,
    create_leave_year_close_run,
    ensure_governed_leave_balance,
    execute_leave_year_close_run,
    expire_entitlement_lots,
    resolve_leave_policy_period,
    reverse_leave_request_allocations,
    transition_leave_policy_period,
)
from apps.leave_management.services import (
    _consume_governed_leave_request,
    _reserve_governed_leave_request,
    apply_leave_balance_admin_action,
    review_leave_balance_transaction,
)
from apps.organizations.models import LegalEntity
from apps.tenants.models import Tenant


def leave_scope(code="db3", *, start=date(2026, 4, 1), end=date(2027, 3, 31), legal_entity=None):
    tenant = legal_entity.tenant if legal_entity else Tenant.objects.create(code=code, name=code, is_sandbox=True)
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code=f"EMP-{code}",
        first_name="Ledger",
        employment_status=EmploymentStatus.ACTIVE,
        date_of_joining=date(2020, 1, 1),
        legal_entity=legal_entity,
    )
    leave_type = LeaveType.objects.create(tenant=tenant, code=f"annual-{code}", name="Annual")
    policy = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code=f"annual-{code}",
        name="Annual Policy",
        status=LeavePolicyStatus.ACTIVE,
        annual_entitlement=Decimal("20.00"),
        max_carry_forward=Decimal("10.00"),
        config_snapshot={"entitlement": {"policy_year_start_month": start.month, "policy_year_start_day": start.day}},
    )
    period = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        legal_entity=legal_entity,
        code=f"{start.isoformat()}:{end.isoformat()}",
        start_date=start,
        end_date=end,
        status=LeavePolicyPeriodStatus.OPEN,
        policy_snapshot=policy.config_snapshot,
    )
    return tenant, employee, policy, period


def opening_balance(employee, period, units):
    balance = ensure_governed_leave_balance(employee=employee, policy_period=period)
    append_leave_ledger_movement(
        balance=balance,
        action=LeaveBalanceTransaction.ActionType.OPENING,
        units=Decimal(units),
        effective_date=period.start_date,
        idempotency_key=f"opening:{balance.id}",
        reason="Deterministic opening fixture",
    )
    balance.refresh_from_db()
    return balance


@pytest.mark.django_db(transaction=True)
def test_governed_admin_review_applies_once_and_keeps_ledger_projection_consistent():
    tenant, employee, policy, period = leave_scope("db3-admin-review")
    reviewer = Employee.objects.create(
        tenant=tenant,
        employee_code="EMP-DB3-REVIEWER",
        first_name="Reviewer",
        employment_status=EmploymentStatus.ACTIVE,
        date_of_joining=date(2020, 1, 1),
    )
    policy.config_snapshot = {
        **policy.config_snapshot,
        "operations": {
            "reviewer_employee_id": str(reviewer.id),
            "approval_required_for_debit_adjustment": True,
        },
    }
    policy.save(update_fields=["config_snapshot", "updated_at"])
    balance = opening_balance(employee, period, "10.00")

    pending = apply_leave_balance_admin_action(
        actor=employee,
        employee=employee,
        leave_policy=policy,
        action=LeaveBalanceTransaction.ActionType.DEBIT_ADJUSTMENT,
        units=Decimal("1.00"),
        effective_date=date(2026, 5, 1),
        reason="Governed maker-checker correction",
    )
    assert pending["transaction"].status == LeaveBalanceTransaction.Status.PENDING
    assert pending["transaction"].policy_period == period
    pending["balance"].refresh_from_db()
    closing_before_review = pending["balance"].closing_balance
    version_before_review = pending["balance"].ledger_version

    reviewed = review_leave_balance_transaction(
        actor=reviewer,
        transaction_item=pending["transaction"],
        decision="approve",
    )
    reviewed["transaction"].refresh_from_db()
    reviewed["balance"].refresh_from_db()
    assert reviewed["transaction"].status == LeaveBalanceTransaction.Status.APPLIED
    assert reviewed["transaction"].delta_units == Decimal("-1.00")
    assert reviewed["balance"].closing_balance == closing_before_review - Decimal("1.00")
    assert reviewed["balance"].ledger_version == version_before_review + 1
    assert reviewed["balance"].ledger_checksum

    with pytest.raises(ValidationError, match="Only pending transactions"):
        review_leave_balance_transaction(
            actor=reviewer,
            transaction_item=pending["transaction"],
            decision="approve",
        )


@pytest.mark.django_db(transaction=True)
def test_calendar_and_april_march_period_resolution_with_entity_precedence():
    tenant, _, policy, april_period = leave_scope("db3-period")
    calendar_period = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        code="2027-calendar",
        start_date=date(2027, 4, 1),
        end_date=date(2027, 12, 31),
        status=LeavePolicyPeriodStatus.OPEN,
    )
    entity = LegalEntity.objects.create(tenant=tenant, code="entity", name="Entity", country_code="IN")
    entity_period = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        legal_entity=entity,
        code="entity-2027",
        start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31),
        status=LeavePolicyPeriodStatus.OPEN,
    )
    assert resolve_leave_policy_period(tenant=tenant, leave_policy=policy, on_date=date(2027, 3, 31)) == april_period
    assert resolve_leave_policy_period(tenant=tenant, leave_policy=policy, on_date=date(2027, 7, 1)) == calendar_period
    assert resolve_leave_policy_period(
        tenant=tenant, leave_policy=policy, legal_entity=entity, on_date=date(2027, 7, 1)
    ) == entity_period


@pytest.mark.django_db(transaction=True)
def test_worked_example_carry_cap_lots_consumption_and_no_expiry_after_full_use():
    tenant, employee, policy, source = leave_scope("db3-worked")
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        code="2027-28",
        start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31),
        status=LeavePolicyPeriodStatus.OPEN,
    )
    source_balance = opening_balance(employee, source, "18.00")
    run = create_leave_year_close_run(
        source_period=source,
        target_period=target,
        actor_employee=employee,
        idempotency_key="worked-example",
        carry_forward_cap=Decimal("10.00"),
        expiring_units=Decimal("4.00"),
        expiry_date=date(2027, 6, 29),
    )
    run = execute_leave_year_close_run(run)
    assert run.status == LeaveYearCloseRunStatus.SUCCEEDED
    source_balance.refresh_from_db()
    assert source_balance.forfeited_amount == Decimal("8.00")
    assert source_balance.closing_balance == Decimal("10.00")
    target_balance = LeaveBalance.objects.get(employee=employee, policy_period=target)
    assert target_balance.carry_forward_amount == Decimal("10.00")
    lots = list(target_balance.entitlement_lots.order_by("priority"))
    assert [(lot.granted_units, lot.expiry_date) for lot in lots] == [
        (Decimal("4.00"), date(2027, 6, 29)),
        (Decimal("6.00"), None),
    ]

    consume_entitlement_lots(
        balance=target_balance,
        units=Decimal("6.00"),
        consumption_date=date(2027, 5, 10),
        idempotency_key="worked-consume-six",
    )
    lots = list(target_balance.entitlement_lots.order_by("priority"))
    assert [lot.remaining_units for lot in lots] == [Decimal("0.00"), Decimal("4.00")]
    assert expire_entitlement_lots(policy_period=target, as_of=date(2027, 6, 30), idempotency_prefix="worked-expiry") == []


@pytest.mark.django_db(transaction=True)
def test_unused_expiring_carry_forward_is_debited_after_grace_period():
    tenant, employee, policy, source = leave_scope("db3-expiry")
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        code="next",
        start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31),
        status=LeavePolicyPeriodStatus.OPEN,
    )
    opening_balance(employee, source, "18.00")
    run = execute_leave_year_close_run(create_leave_year_close_run(
        source_period=source,
        target_period=target,
        actor_employee=employee,
        idempotency_key="expiry-example",
        carry_forward_cap=Decimal("10.00"),
        expiring_units=Decimal("4.00"),
        expiry_date=date(2027, 6, 29),
    ))
    balance = LeaveBalance.objects.get(employee=employee, policy_period=target)
    consume_entitlement_lots(
        balance=balance,
        units=Decimal("2.00"),
        consumption_date=date(2027, 5, 10),
        idempotency_key="expiry-consume-two",
    )
    expired = expire_entitlement_lots(policy_period=target, as_of=date(2027, 6, 30), idempotency_prefix="expiry-job")
    assert len(expired) == 1
    assert expired[0].units == Decimal("2.00")
    balance.refresh_from_db()
    assert balance.expired_amount == Decimal("2.00")
    assert balance.closing_balance == Decimal("6.00")
    assert run.items.get(employee=employee).carry_forward_units == Decimal("10.00")


@pytest.mark.django_db(transaction=True)
def test_duplicate_and_concurrent_rollover_execution_creates_one_credit():
    if connection.vendor != "postgresql":
        pytest.skip("Worker concurrency verification requires PostgreSQL.")
    tenant, employee, policy, source = leave_scope("db3-rollover-race")
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant, leave_policy=policy, code="next", start_date=date(2027, 4, 1), end_date=date(2028, 3, 31), status=LeavePolicyPeriodStatus.OPEN
    )
    opening_balance(employee, source, "8.00")
    run = create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee,
        idempotency_key="race", carry_forward_cap=Decimal("10.00"),
    )

    def execute():
        close_old_connections()
        try:
            return execute_leave_year_close_run(LeaveYearCloseRun.objects.get(pk=run.pk)).status
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(lambda _: execute(), range(2)))
    assert outcomes == [LeaveYearCloseRunStatus.SUCCEEDED, LeaveYearCloseRunStatus.SUCCEEDED]
    assert LeaveBalanceTransaction.objects.filter(close_run=run, action=LeaveBalanceTransaction.ActionType.CARRY_FORWARD).count() == 1
    assert LeaveEntitlementLot.objects.filter(leave_balance__policy_period=target).count() == 1


@pytest.mark.django_db(transaction=True)
def test_period_close_reopen_is_authorized_audited_and_idempotent():
    _, employee, _, source = leave_scope("db3-close")
    target = LeavePolicyPeriod.objects.create(
        tenant=source.tenant, leave_policy=source.leave_policy, code="next",
        start_date=date(2027, 4, 1), end_date=date(2028, 3, 31), status=LeavePolicyPeriodStatus.OPEN,
    )
    opening_balance(employee, source, "1.00")
    execute_leave_year_close_run(create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee,
        idempotency_key="close-run", carry_forward_cap=Decimal("1.00"),
    ))
    outsider = get_user_model().objects.create_user(username="db3-outsider")
    admin = get_user_model().objects.create_superuser(username="db3-admin", email="db3-admin@example.test", password="x")
    with pytest.raises(PermissionDenied):
        transition_leave_policy_period(policy_period=source, action=LeavePolicyPeriodAction.CLOSE, actor=outsider, reason="No", idempotency_key="deny")
    closed = transition_leave_policy_period(policy_period=source, action=LeavePolicyPeriodAction.CLOSE, actor=admin, reason="Completed", idempotency_key="close")
    repeated = transition_leave_policy_period(policy_period=source, action=LeavePolicyPeriodAction.CLOSE, actor=admin, reason="Retry", idempotency_key="close")
    assert closed.status == repeated.status == LeavePolicyPeriodStatus.CLOSED
    reopened = transition_leave_policy_period(policy_period=source, action=LeavePolicyPeriodAction.REOPEN, actor=admin, reason="Correction", idempotency_key="reopen")
    assert reopened.status == LeavePolicyPeriodStatus.OPEN
    assert reopened.status_events.count() == 2


@pytest.mark.django_db(transaction=True)
def test_database_guards_overlap_append_only_projection_and_tenant_scope():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    tenant, employee, policy, period = leave_scope("db3-guards")
    balance = opening_balance(employee, period, "5.00")
    entry = balance.transactions.get(action=LeaveBalanceTransaction.ActionType.OPENING)
    with pytest.raises(DatabaseError), transaction.atomic():
        LeaveBalanceTransaction.objects.filter(pk=entry.pk).update(reason="rewrite")
    with pytest.raises(DatabaseError), transaction.atomic():
        LeaveBalance.objects.filter(pk=balance.pk).update(closing_balance=Decimal("99.00"))
    with pytest.raises((DatabaseError, IntegrityError)), transaction.atomic():
        LeavePolicyPeriod.objects.bulk_create([
            LeavePolicyPeriod(
                tenant=tenant, leave_policy=policy, code="overlap",
                start_date=date(2026, 12, 1), end_date=date(2027, 11, 30), status=LeavePolicyPeriodStatus.OPEN,
            )
        ])
    other = Tenant.objects.create(code="db3-other", name="Other", is_sandbox=True)
    with pytest.raises(DatabaseError), transaction.atomic():
        LeaveBalance.objects.filter(pk=balance.pk).update(tenant=other)


@pytest.mark.django_db(transaction=True)
def test_mid_year_policy_change_does_not_rewrite_historical_period_or_ledger():
    _, employee, policy, period = leave_scope("db3-policy-change")
    balance = opening_balance(employee, period, "12.00")
    original_snapshot = period.policy_snapshot
    policy.annual_entitlement = Decimal("24.00")
    policy.config_snapshot = {"entitlement": {"policy_year_start_month": 1, "policy_year_start_day": 1}}
    policy.save(update_fields=["annual_entitlement", "config_snapshot", "updated_at"])
    period.refresh_from_db()
    balance.refresh_from_db()
    assert period.policy_snapshot == original_snapshot
    assert balance.closing_balance == Decimal("12.00")
    assert balance.transactions.count() == 1


@pytest.mark.django_db(transaction=True)
def test_cancellation_restores_exact_lots_and_compensating_correction_is_append_only():
    tenant, employee, policy, period = leave_scope(
        "db3-cancel", start=date(2027, 4, 1), end=date(2028, 3, 31)
    )
    balance = opening_balance(employee, period, "5.00")
    opening = balance.transactions.get(action=LeaveBalanceTransaction.ActionType.OPENING)
    lot = LeaveEntitlementLot.objects.create(
        tenant=tenant,
        leave_balance=balance,
        policy_period=period,
        source_transaction=opening,
        granted_units=Decimal("5.00"),
        remaining_units=Decimal("5.00"),
        effective_date=period.start_date,
        expiry_date=date(2027, 12, 31),
    )
    request = LeaveRequest.objects.create(
        tenant=tenant,
        employee=employee,
        leave_type=policy.leave_type,
        leave_policy=policy,
        status=LeaveRequestStatus.APPROVED,
        start_date=date(2027, 5, 10),
        end_date=date(2027, 5, 12),
        requested_units=Decimal("3.00"),
        approved_units=Decimal("3.00"),
    )
    consumption, _ = consume_entitlement_lots(
        balance=balance,
        units=Decimal("3.00"),
        consumption_date=request.start_date,
        idempotency_key="cancel-consume",
        leave_request=request,
    )
    lot.refresh_from_db()
    assert lot.remaining_units == Decimal("2.00")
    reversal = reverse_leave_request_allocations(
        leave_request=request,
        reversal_date=date(2027, 5, 20),
        idempotency_key="cancel-reverse",
    )
    lot.refresh_from_db()
    balance.refresh_from_db()
    assert lot.remaining_units == Decimal("5.00")
    assert balance.consumed_amount == Decimal("0.00")
    assert reversal.source_transaction == consumption

    debit = append_leave_ledger_movement(
        balance=balance,
        action=LeaveBalanceTransaction.ActionType.DEBIT_ADJUSTMENT,
        units=Decimal("1.00"),
        effective_date=date(2027, 6, 1),
        idempotency_key="correction-source",
        reason="Incorrect debit",
    )
    correction = compensate_leave_ledger_transaction(
        source_transaction=debit,
        effective_date=date(2027, 6, 2),
        idempotency_key="correction-reversal",
        reason="Approved correction",
    )
    assert correction.source_transaction == debit
    assert correction.action == LeaveBalanceTransaction.ActionType.CREDIT_ADJUSTMENT
    assert LeaveBalanceTransaction.objects.filter(pk=debit.pk).exists()


@pytest.mark.django_db(transaction=True)
def test_cancellation_after_lot_expiry_requires_explicit_correction_decision():
    tenant, employee, policy, period = leave_scope(
        "db3-post-expiry-cancel", start=date(2027, 4, 1), end=date(2028, 3, 31)
    )
    balance = opening_balance(employee, period, "2.00")
    opening = balance.transactions.get(action=LeaveBalanceTransaction.ActionType.OPENING)
    LeaveEntitlementLot.objects.create(
        tenant=tenant,
        leave_balance=balance,
        policy_period=period,
        source_transaction=opening,
        granted_units=Decimal("2.00"),
        remaining_units=Decimal("2.00"),
        effective_date=period.start_date,
        expiry_date=date(2027, 6, 29),
    )
    request = LeaveRequest.objects.create(
        tenant=tenant, employee=employee, leave_type=policy.leave_type, leave_policy=policy,
        status=LeaveRequestStatus.APPROVED, start_date=date(2027, 5, 1), end_date=date(2027, 5, 1),
        requested_units=Decimal("1.00"), approved_units=Decimal("1.00"),
    )
    consume_entitlement_lots(
        balance=balance, units=Decimal("1.00"), consumption_date=request.start_date,
        idempotency_key="expired-consume", leave_request=request,
    )
    with pytest.raises(ValidationError, match="expired leave"):
        reverse_leave_request_allocations(
            leave_request=request,
            reversal_date=date(2027, 7, 1),
            idempotency_key="expired-reverse",
        )


@pytest.mark.django_db(transaction=True)
def test_worker_failure_is_durable_and_retry_completes_without_double_credit(monkeypatch):
    import apps.leave_management.year_end_services as year_end

    tenant, employee, policy, source = leave_scope("db3-worker-retry")
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant, leave_policy=policy, code="next", start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31), status=LeavePolicyPeriodStatus.OPEN,
    )
    opening_balance(employee, source, "7.00")
    run = create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee,
        idempotency_key="worker-retry", carry_forward_cap=Decimal("10.00"),
    )
    original = year_end._process_close_item
    monkeypatch.setattr(year_end, "_process_close_item", lambda **kwargs: (_ for _ in ()).throw(RuntimeError("worker interrupted")))
    failed = execute_leave_year_close_run(run)
    assert failed.status == LeaveYearCloseRunStatus.FAILED
    assert failed.failed_count == 1
    monkeypatch.setattr(year_end, "_process_close_item", original)
    succeeded = execute_leave_year_close_run(failed)
    assert succeeded.status == LeaveYearCloseRunStatus.SUCCEEDED
    assert succeeded.attempt_count == 2
    assert LeaveBalanceTransaction.objects.filter(close_run=run, action=LeaveBalanceTransaction.ActionType.CARRY_FORWARD).count() == 1


@pytest.mark.django_db(transaction=True)
def test_movements_cannot_arrive_after_rollover_has_completed():
    tenant, employee, policy, source = leave_scope("db3-close-race-gate")
    target = LeavePolicyPeriod.objects.create(
        tenant=tenant, leave_policy=policy, code="next", start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31), status=LeavePolicyPeriodStatus.OPEN,
    )
    source_balance = opening_balance(employee, source, "6.00")
    execute_leave_year_close_run(create_leave_year_close_run(
        source_period=source, target_period=target, actor_employee=employee,
        idempotency_key="close-gate", carry_forward_cap=Decimal("6.00"),
    ))
    with pytest.raises(ValidationError, match="close has started"):
        append_leave_ledger_movement(
            balance=source_balance,
            action=LeaveBalanceTransaction.ActionType.CONSUMPTION,
            units=Decimal("1.00"),
            effective_date=date(2027, 3, 30),
            idempotency_key="late-approval",
            reason="Late approval",
        )


@pytest.mark.django_db(transaction=True)
def test_cross_year_request_is_reserved_and_consumed_in_each_policy_period():
    tenant, employee, policy, first = leave_scope(
        "db3-cross-year", start=date(2026, 1, 1), end=date(2026, 12, 31)
    )
    second = LeavePolicyPeriod.objects.create(
        tenant=tenant,
        leave_policy=policy,
        code="2027",
        start_date=date(2027, 1, 1),
        end_date=date(2027, 12, 31),
        status=LeavePolicyPeriodStatus.OPEN,
        policy_snapshot=policy.config_snapshot,
    )
    request = LeaveRequest.objects.create(
        tenant=tenant,
        employee=employee,
        leave_type=policy.leave_type,
        leave_policy=policy,
        status=LeaveRequestStatus.PENDING,
        start_date=date(2026, 12, 31),
        end_date=date(2027, 1, 1),
        requested_units=Decimal("2.00"),
    )
    breakdown = {
        "days": [
            {"date": "2026-12-31", "units": "1.00", "counted": True},
            {"date": "2027-01-01", "units": "1.00", "counted": True},
        ]
    }
    assert _reserve_governed_leave_request(leave_request=request, unit_breakdown=breakdown) is True
    balances = {
        balance.policy_period_id: balance
        for balance in LeaveBalance.objects.filter(employee=employee, policy_period__in=[first, second])
    }
    assert balances[first.id].reserved_amount == Decimal("1.00")
    assert balances[second.id].reserved_amount == Decimal("1.00")
    assert _consume_governed_leave_request(leave_request=request) is True
    for balance in balances.values():
        balance.refresh_from_db()
        assert balance.reserved_amount == Decimal("0.00")
        assert balance.consumed_amount == Decimal("1.00")
    assert request.allocations.filter(status="consumed").count() == 2
