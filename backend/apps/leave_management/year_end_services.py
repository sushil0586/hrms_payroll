"""Persisted leave-year ledger, entitlement-lot, and rollover services."""

from __future__ import annotations

import hashlib
import json
from datetime import date
from decimal import Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.iam.permission_checks import get_user_tenant_permission_keys
from apps.leave_management.models import (
    LeaveBalance,
    LeaveBalanceTransaction,
    LeaveEntitlementLot,
    LeavePolicyPeriod,
    LeavePolicyPeriodAction,
    LeavePolicyPeriodStatus,
    LeavePolicyPeriodStatusEvent,
    LeaveRequestAllocation,
    LeaveYearCloseItem,
    LeaveYearCloseItemStatus,
    LeaveYearCloseRun,
    LeaveYearCloseRunStatus,
)


LEDGER_ACTIONS = LeaveBalanceTransaction.ActionType


def resolve_leave_policy_period(*, tenant, leave_policy, on_date: date, legal_entity=None) -> LeavePolicyPeriod | None:
    periods = LeavePolicyPeriod.objects.filter(
        tenant=tenant,
        leave_policy=leave_policy,
        start_date__lte=on_date,
        end_date__gte=on_date,
    )
    if legal_entity is not None:
        entity_period = periods.filter(legal_entity=legal_entity).first()
        if entity_period:
            return entity_period
    return periods.filter(legal_entity__isnull=True).first()


def _projection_checksum(balance: LeaveBalance) -> str:
    payload = {
        key: str(getattr(balance, key) or 0)
        for key in [
            "opening_balance",
            "accrued_amount",
            "consumed_amount",
            "reserved_amount",
            "carry_forward_amount",
            "encashed_amount",
            "adjustment_amount",
            "expired_amount",
            "forfeited_amount",
            "closing_balance",
            "ledger_version",
        ]
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def _recalculate_projection(balance: LeaveBalance) -> None:
    balance.closing_balance = (
        balance.opening_balance
        + balance.accrued_amount
        + balance.carry_forward_amount
        + balance.adjustment_amount
        - balance.consumed_amount
        - balance.reserved_amount
        - balance.encashed_amount
        - balance.expired_amount
        - balance.forfeited_amount
    )


def _apply_projection_delta(balance: LeaveBalance, *, action: str, units: Decimal) -> None:
    if units <= 0:
        raise ValidationError({"units": "Ledger movement units must be greater than zero."})
    mapping = {
        LEDGER_ACTIONS.OPENING: ("opening_balance", units),
        LEDGER_ACTIONS.ACCRUAL: ("accrued_amount", units),
        LEDGER_ACTIONS.RESERVATION: ("reserved_amount", units),
        LEDGER_ACTIONS.RESERVATION_RELEASE: ("reserved_amount", -units),
        LEDGER_ACTIONS.CONSUMPTION: ("consumed_amount", units),
        LEDGER_ACTIONS.CONSUMPTION_REVERSAL: ("consumed_amount", -units),
        LEDGER_ACTIONS.CREDIT_ADJUSTMENT: ("adjustment_amount", units),
        LEDGER_ACTIONS.DEBIT_ADJUSTMENT: ("adjustment_amount", -units),
        LEDGER_ACTIONS.CARRY_FORWARD: ("carry_forward_amount", units),
        LEDGER_ACTIONS.EXPIRY: ("expired_amount", units),
        LEDGER_ACTIONS.FORFEITURE: ("forfeited_amount", units),
        LEDGER_ACTIONS.ENCASHMENT: ("encashed_amount", units),
        LEDGER_ACTIONS.ENCASHMENT_REVERSAL: ("encashed_amount", -units),
    }
    if action not in mapping:
        raise ValidationError({"action": "Unsupported governed ledger movement."})
    field, delta = mapping[action]
    next_value = Decimal(getattr(balance, field) or 0) + delta
    if next_value < 0 and field != "adjustment_amount":
        raise ValidationError({"units": f"Ledger movement would make {field} negative."})
    setattr(balance, field, next_value)
    _recalculate_projection(balance)


@transaction.atomic
def ensure_governed_leave_balance(*, employee, policy_period: LeavePolicyPeriod) -> LeaveBalance:
    if employee.tenant_id != policy_period.tenant_id:
        raise ValidationError({"employee": "Employee and leave period must belong to the same tenant."})
    period_year = policy_period.start_date.year
    balance, _ = LeaveBalance.objects.select_for_update().get_or_create(
        tenant=policy_period.tenant,
        employee=employee,
        leave_policy=policy_period.leave_policy,
        policy_period=policy_period,
        period_year=period_year,
        defaults={"ledger_checksum": ""},
    )
    if not balance.ledger_checksum:
        balance.ledger_checksum = _projection_checksum(balance)
        balance.save(update_fields=["ledger_checksum", "updated_at"])
    return balance


@transaction.atomic
def append_leave_ledger_movement(
    *,
    balance: LeaveBalance,
    action: str,
    units: Decimal,
    effective_date: date,
    idempotency_key: str,
    reason: str,
    performed_by=None,
    leave_request=None,
    close_run=None,
    source_transaction=None,
    metadata=None,
) -> LeaveBalanceTransaction:
    if not idempotency_key.strip():
        raise ValidationError({"idempotency_key": "An idempotency key is required."})
    # Serialize commands for this balance before checking replay identity.
    locked = (
        LeaveBalance.objects.select_for_update(of=("self",))
        .select_related("policy_period", "leave_policy")
        .get(pk=balance.pk)
    )
    existing = LeaveBalanceTransaction.objects.filter(
        tenant=balance.tenant,
        idempotency_key=idempotency_key,
    ).first()
    if existing:
        if (
            existing.leave_balance_id != balance.id
            or existing.action != action
            or existing.units != Decimal(units).quantize(Decimal("0.01"))
            or existing.effective_date != effective_date
        ):
            raise ValidationError({"idempotency_key": "This ledger key was used for a different movement."})
        return existing

    if locked.policy_period_id is None:
        raise ValidationError({"leave_balance": "Historical unclassified balances cannot receive governed ledger movements."})
    if not (locked.policy_period.start_date <= effective_date <= locked.policy_period.end_date):
        if action != LEDGER_ACTIONS.CARRY_FORWARD:
            raise ValidationError({"effective_date": "Movement date must fall inside the balance policy period."})
    if locked.policy_period.status in {LeavePolicyPeriodStatus.CLOSED, LeavePolicyPeriodStatus.LOCKED} and action not in {
        LEDGER_ACTIONS.FORFEITURE,
        LEDGER_ACTIONS.CORRECTION,
    }:
        raise ValidationError({"policy_period": "Closed leave periods do not accept new ledger movements."})
    if locked.policy_period.source_close_runs.filter(
        status__in={LeaveYearCloseRunStatus.RUNNING, LeaveYearCloseRunStatus.SUCCEEDED}
    ).exists() and action not in {LEDGER_ACTIONS.FORFEITURE, LEDGER_ACTIONS.CORRECTION}:
        raise ValidationError({"policy_period": "Leave-year close has started; ordinary movements are no longer accepted."})

    units = Decimal(units).quantize(Decimal("0.01"))
    before = Decimal(locked.closing_balance or 0)
    _apply_projection_delta(locked, action=action, units=units)
    locked.ledger_version += 1
    locked.ledger_checksum = _projection_checksum(locked)
    item = LeaveBalanceTransaction.objects.create(
        tenant=locked.tenant,
        leave_balance=locked,
        employee=locked.employee,
        leave_policy=locked.leave_policy,
        policy_period=locked.policy_period,
        close_run=close_run,
        leave_request=leave_request,
        source_transaction=source_transaction,
        status=LeaveBalanceTransaction.Status.APPLIED,
        action=action,
        units=units,
        delta_units=locked.closing_balance - before,
        idempotency_key=idempotency_key,
        effective_date=effective_date,
        reason=reason,
        performed_by=performed_by,
        closing_balance_before=before,
        closing_balance_after=locked.closing_balance,
        metadata=metadata or {},
    )
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('hrms.leave_ledger_write', 'authorized', true)")
    locked.save(
        update_fields=[
            "opening_balance",
            "accrued_amount",
            "consumed_amount",
            "reserved_amount",
            "carry_forward_amount",
            "encashed_amount",
            "adjustment_amount",
            "expired_amount",
            "forfeited_amount",
            "closing_balance",
            "ledger_version",
            "ledger_checksum",
            "updated_at",
        ]
    )
    return item


def _period_permissions(actor, tenant) -> set[str]:
    if getattr(actor, "is_superuser", False):
        return {"*"}
    return get_user_tenant_permission_keys(actor, tenant)


@transaction.atomic
def transition_leave_policy_period(*, policy_period, action: str, actor, reason: str, idempotency_key: str):
    if not reason.strip() or not idempotency_key.strip():
        raise ValidationError({"detail": "Reason and idempotency key are required."})
    existing = LeavePolicyPeriodStatusEvent.objects.filter(
        tenant=policy_period.tenant,
        idempotency_key=idempotency_key,
    ).first()
    if existing:
        if existing.policy_period_id != policy_period.id or existing.action != action:
            raise ValidationError({"idempotency_key": "This key was used for another leave-period transition."})
        return LeavePolicyPeriod.objects.get(pk=policy_period.pk)
    period = LeavePolicyPeriod.objects.select_for_update().get(pk=policy_period.pk)
    permission = "leave.periods.reopen" if action == LeavePolicyPeriodAction.REOPEN else "leave.periods.close"
    permissions = _period_permissions(actor, period.tenant)
    if "*" not in permissions and permission not in permissions:
        raise PermissionDenied(f"Missing required permission: {permission}")
    transitions = {
        LeavePolicyPeriodAction.CLOSE: ({LeavePolicyPeriodStatus.OPEN}, LeavePolicyPeriodStatus.CLOSED),
        LeavePolicyPeriodAction.REOPEN: ({LeavePolicyPeriodStatus.CLOSED}, LeavePolicyPeriodStatus.OPEN),
        LeavePolicyPeriodAction.LOCK: ({LeavePolicyPeriodStatus.CLOSED}, LeavePolicyPeriodStatus.LOCKED),
    }
    if action not in transitions:
        raise ValidationError({"action": "Unsupported leave-period transition."})
    allowed, next_status = transitions[action]
    if period.status not in allowed:
        raise ValidationError({"status": f"Cannot {action} leave period in {period.status} status."})
    if action == LeavePolicyPeriodAction.CLOSE and not period.source_close_runs.filter(
        status=LeaveYearCloseRunStatus.SUCCEEDED
    ).exists():
        raise ValidationError({"status": "Leave period requires a successful close run before close."})
    previous = period.status
    period.status = next_status
    now = timezone.now()
    if action in {LeavePolicyPeriodAction.CLOSE, LeavePolicyPeriodAction.LOCK}:
        period.closed_at = now
    elif action == LeavePolicyPeriodAction.REOPEN:
        period.reopened_at = now
        period.reopen_count += 1
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('hrms.leave_period_transition', 'authorized', true)")
    period.save()
    LeavePolicyPeriodStatusEvent.objects.create(
        tenant=period.tenant,
        policy_period=period,
        action=action,
        previous_status=previous,
        next_status=next_status,
        actor=actor,
        reason=reason.strip(),
        idempotency_key=idempotency_key.strip(),
        authorization_snapshot={"required_permission": permission, "permission_keys": sorted(permissions)},
    )
    return period


@transaction.atomic
def create_leave_year_close_run(
    *, source_period, target_period, actor_employee, idempotency_key: str, carry_forward_cap: Decimal,
    expiring_units: Decimal = Decimal("0"), expiry_date: date | None = None, scheduled_for=None,
) -> LeaveYearCloseRun:
    existing = LeaveYearCloseRun.objects.filter(tenant=source_period.tenant, idempotency_key=idempotency_key).first()
    if existing:
        expected = {
            "carry_forward_cap": str(Decimal(carry_forward_cap).quantize(Decimal("0.01"))),
            "expiring_units": str(Decimal(expiring_units).quantize(Decimal("0.01"))),
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
        }
        if (
            existing.source_period_id != source_period.id
            or existing.target_period_id != target_period.id
            or any(existing.request_snapshot.get(key) != value for key, value in expected.items())
        ):
            raise ValidationError({"idempotency_key": "This rollover key was used with different inputs."})
        return existing
    if source_period.tenant_id != target_period.tenant_id or source_period.leave_policy_id != target_period.leave_policy_id:
        raise ValidationError({"target_period": "Rollover periods must share tenant and policy."})
    if source_period.end_date >= target_period.start_date:
        raise ValidationError({"target_period": "Target leave period must start after the source period."})
    cap = Decimal(carry_forward_cap).quantize(Decimal("0.01"))
    expiring = Decimal(expiring_units).quantize(Decimal("0.01"))
    if cap < 0 or expiring < 0 or expiring > cap:
        raise ValidationError({"carry_forward": "Carry-forward cap and expiring units are inconsistent."})
    if expiring and (expiry_date is None or expiry_date < target_period.start_date):
        raise ValidationError({"expiry_date": "An expiry date in the target period is required for expiring units."})
    return LeaveYearCloseRun.objects.create(
        tenant=source_period.tenant,
        leave_policy=source_period.leave_policy,
        source_period=source_period,
        target_period=target_period,
        requested_by=actor_employee,
        idempotency_key=idempotency_key,
        scheduled_for=scheduled_for,
        request_snapshot={
            "carry_forward_cap": str(cap),
            "expiring_units": str(expiring),
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
            "policy_snapshot": source_period.policy_snapshot,
        },
    )


def preview_leave_year_close(
    *, source_period: LeavePolicyPeriod, target_period: LeavePolicyPeriod,
    carry_forward_cap: Decimal, expiring_units: Decimal = Decimal("0"), expiry_date: date | None = None,
) -> dict:
    """Return the exact per-balance rollover projection without writing state."""
    if source_period.tenant_id != target_period.tenant_id or source_period.leave_policy_id != target_period.leave_policy_id:
        raise ValidationError({"target_period": "Rollover periods must share tenant and policy."})
    if source_period.end_date >= target_period.start_date:
        raise ValidationError({"target_period": "Target leave period must start after the source period."})
    cap = Decimal(carry_forward_cap).quantize(Decimal("0.01"))
    expiring = Decimal(expiring_units).quantize(Decimal("0.01"))
    if cap < 0 or expiring < 0 or expiring > cap:
        raise ValidationError({"carry_forward": "Carry-forward cap and expiring units are inconsistent."})
    if expiring and (expiry_date is None or expiry_date < target_period.start_date):
        raise ValidationError({"expiry_date": "An expiry date in the target period is required for expiring units."})

    rows = []
    totals = {"available": Decimal("0"), "carried": Decimal("0"), "forfeited": Decimal("0"), "expiring": Decimal("0")}
    balances = LeaveBalance.objects.filter(policy_period=source_period).select_related("employee").order_by("employee_id")
    for balance in balances:
        available = max(Decimal(balance.closing_balance or 0), Decimal("0"))
        carried = min(available, cap)
        forfeited = available - carried
        row_expiring = min(expiring, carried)
        for key, value in (("available", available), ("carried", carried), ("forfeited", forfeited), ("expiring", row_expiring)):
            totals[key] += value
        rows.append({
            "employee_id": str(balance.employee_id),
            "employee_code": balance.employee.employee_code,
            "available": str(available),
            "carried": str(carried),
            "forfeited": str(forfeited),
            "expiring": str(row_expiring),
        })
    return {
        "source_period_id": str(source_period.id),
        "target_period_id": str(target_period.id),
        "balance_count": len(rows),
        "totals": {key: str(value.quantize(Decimal("0.01"))) for key, value in totals.items()},
        "rows": rows,
        "inputs": {
            "carry_forward_cap": str(cap),
            "expiring_units": str(expiring),
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
        },
    }


def build_historical_leave_classification_report(*, tenant, limit: int = 200) -> dict:
    """Describe safe candidates and ambiguities without mutating historical records."""
    periods = list(LeavePolicyPeriod.objects.filter(tenant=tenant).order_by("leave_policy_id", "start_date"))
    period_map: dict[object, list[LeavePolicyPeriod]] = {}
    for period in periods:
        period_map.setdefault(period.leave_policy_id, []).append(period)

    balance_rows = []
    balance_counts = {"unclassified": 0, "unambiguous_candidate": 0, "ambiguous": 0, "no_matching_period": 0}
    balances = LeaveBalance.objects.filter(tenant=tenant, policy_period__isnull=True).select_related("employee", "leave_policy")
    for balance in balances.order_by("employee_id", "leave_policy_id", "period_year"):
        balance_counts["unclassified"] += 1
        matches = [period for period in period_map.get(balance.leave_policy_id, []) if period.start_date.year <= balance.period_year <= period.end_date.year]
        classification = "unambiguous_candidate" if len(matches) == 1 else "ambiguous" if matches else "no_matching_period"
        balance_counts[classification] += 1
        if len(balance_rows) < limit:
            balance_rows.append({
                "id": str(balance.id), "employee_code": balance.employee.employee_code,
                "leave_policy_code": balance.leave_policy.code, "period_year": balance.period_year,
                "classification": classification, "candidate_period_ids": [str(item.id) for item in matches],
            })

    transaction_rows = []
    transaction_counts = {"unclassified": 0, "unambiguous_candidate": 0, "ambiguous": 0, "no_matching_period": 0}
    transactions = LeaveBalanceTransaction.objects.filter(tenant=tenant, policy_period__isnull=True).select_related("employee", "leave_policy")
    for item in transactions.order_by("effective_date", "id"):
        transaction_counts["unclassified"] += 1
        matches = [period for period in period_map.get(item.leave_policy_id, []) if period.start_date <= item.effective_date <= period.end_date]
        classification = "unambiguous_candidate" if len(matches) == 1 else "ambiguous" if matches else "no_matching_period"
        transaction_counts[classification] += 1
        if len(transaction_rows) < limit:
            transaction_rows.append({
                "id": str(item.id), "employee_code": item.employee.employee_code,
                "leave_policy_code": item.leave_policy.code, "effective_date": item.effective_date.isoformat(),
                "classification": classification, "candidate_period_ids": [str(period.id) for period in matches],
            })
    return {
        "read_only": True,
        "automatic_classification_performed": False,
        "balance_counts": balance_counts,
        "transaction_counts": transaction_counts,
        "balances": balance_rows,
        "transactions": transaction_rows,
    }


@transaction.atomic
def _process_close_item(*, run: LeaveYearCloseRun, source_balance: LeaveBalance) -> LeaveYearCloseItem:
    item, _ = LeaveYearCloseItem.objects.select_for_update().get_or_create(
        close_run=run,
        tenant=run.tenant,
        employee=source_balance.employee,
        defaults={"source_balance": source_balance},
    )
    if item.status == LeaveYearCloseItemStatus.SUCCEEDED:
        return item
    source_balance = LeaveBalance.objects.select_for_update().get(pk=source_balance.pk)
    cap = Decimal(run.request_snapshot["carry_forward_cap"])
    available = max(Decimal(source_balance.closing_balance or 0), Decimal("0"))
    carried = min(available, cap)
    forfeited = available - carried
    target_balance = ensure_governed_leave_balance(employee=source_balance.employee, policy_period=run.target_period)
    if forfeited:
        append_leave_ledger_movement(
            balance=source_balance,
            action=LEDGER_ACTIONS.FORFEITURE,
            units=forfeited,
            effective_date=run.source_period.end_date,
            idempotency_key=f"{run.id}:forfeit:{source_balance.employee_id}",
            reason="Leave-year carry-forward cap forfeiture",
            performed_by=run.requested_by,
            close_run=run,
        )
    carry_transaction = None
    if carried:
        carry_transaction = append_leave_ledger_movement(
            balance=target_balance,
            action=LEDGER_ACTIONS.CARRY_FORWARD,
            units=carried,
            effective_date=run.target_period.start_date,
            idempotency_key=f"{run.id}:carry:{source_balance.employee_id}",
            reason="Leave-year carry-forward",
            performed_by=run.requested_by,
            close_run=run,
        )
        expiring = min(Decimal(run.request_snapshot.get("expiring_units") or 0), carried)
        base = carried - expiring
        if expiring:
            LeaveEntitlementLot.objects.get_or_create(
                source_transaction=carry_transaction,
                metadata__lot_kind="carry_forward_expiring",
                defaults={
                    "tenant": run.tenant,
                    "leave_balance": target_balance,
                    "policy_period": run.target_period,
                    "granted_units": expiring,
                    "remaining_units": expiring,
                    "effective_date": run.target_period.start_date,
                    "expiry_date": date.fromisoformat(run.request_snapshot["expiry_date"]),
                    "priority": 10,
                    "metadata": {"lot_kind": "carry_forward_expiring", "close_run_id": str(run.id)},
                },
            )
        if base:
            LeaveEntitlementLot.objects.get_or_create(
                source_transaction=carry_transaction,
                metadata__lot_kind="carry_forward_base",
                defaults={
                    "tenant": run.tenant,
                    "leave_balance": target_balance,
                    "policy_period": run.target_period,
                    "granted_units": base,
                    "remaining_units": base,
                    "effective_date": run.target_period.start_date,
                    "priority": 20,
                    "metadata": {"lot_kind": "carry_forward_base", "close_run_id": str(run.id)},
                },
            )
    item.target_balance = target_balance
    item.status = LeaveYearCloseItemStatus.SUCCEEDED
    item.carry_forward_units = carried
    item.forfeited_units = forfeited
    item.result_snapshot = {"available": str(available), "carried": str(carried), "forfeited": str(forfeited)}
    item.error_snapshot = {}
    item.save()
    return item


def execute_leave_year_close_run(run: LeaveYearCloseRun) -> LeaveYearCloseRun:
    with transaction.atomic():
        run = LeaveYearCloseRun.objects.select_for_update().get(pk=run.pk)
        if run.status == LeaveYearCloseRunStatus.SUCCEEDED:
            return run
        run.status = LeaveYearCloseRunStatus.RUNNING
        run.started_at = run.started_at or timezone.now()
        run.attempt_count += 1
        run.error_snapshot = {}
        run.save()
    balances = list(
        LeaveBalance.objects.filter(policy_period=run.source_period).select_related("employee").order_by("employee_id")
    )
    failures = []
    for balance in balances:
        try:
            _process_close_item(run=run, source_balance=balance)
        except Exception as exc:
            failures.append({"employee_id": str(balance.employee_id), "error": str(exc)})
            LeaveYearCloseItem.objects.update_or_create(
                close_run=run,
                employee=balance.employee,
                defaults={
                    "tenant": run.tenant,
                    "source_balance": balance,
                    "status": LeaveYearCloseItemStatus.FAILED,
                    "error_snapshot": {"message": str(exc), "type": exc.__class__.__name__},
                },
            )
    with transaction.atomic():
        run = LeaveYearCloseRun.objects.select_for_update().get(pk=run.pk)
        run.processed_count = run.items.filter(status=LeaveYearCloseItemStatus.SUCCEEDED).count()
        run.failed_count = run.items.filter(status=LeaveYearCloseItemStatus.FAILED).count()
        run.status = LeaveYearCloseRunStatus.FAILED if failures else LeaveYearCloseRunStatus.SUCCEEDED
        run.completed_at = timezone.now()
        run.result_snapshot = {"source_balance_count": len(balances), "processed_count": run.processed_count}
        run.error_snapshot = {"failures": failures} if failures else {}
        run.save()
    return run


@transaction.atomic
def expire_entitlement_lots(*, policy_period: LeavePolicyPeriod, as_of: date, idempotency_prefix: str):
    expired = []
    # Match consumption/reversal: balance locks precede existing lot locks.
    eligible_balance_ids = LeaveEntitlementLot.objects.filter(
        policy_period=policy_period, expiry_date__lt=as_of, remaining_units__gt=0,
    ).values_list("leave_balance_id", flat=True)
    locked_balance_ids = list(
        LeaveBalance.objects.select_for_update().filter(pk__in=eligible_balance_ids)
        .order_by("pk").values_list("pk", flat=True)
    )
    lots = (
        LeaveEntitlementLot.objects.select_for_update()
        .filter(policy_period=policy_period, leave_balance_id__in=locked_balance_ids,
                expiry_date__lt=as_of, remaining_units__gt=0)
        .order_by("expiry_date", "effective_date", "id")
    )
    for lot in lots:
        units = Decimal(lot.remaining_units)
        transaction_item = append_leave_ledger_movement(
            balance=lot.leave_balance,
            action=LEDGER_ACTIONS.EXPIRY,
            units=units,
            effective_date=lot.expiry_date,
            idempotency_key=f"{idempotency_prefix}:{lot.id}",
            reason="Carried leave entitlement expired",
            metadata={"entitlement_lot_id": str(lot.id)},
        )
        lot.remaining_units = Decimal("0")
        lot.metadata = {**lot.metadata, "expiry_transaction_id": str(transaction_item.id)}
        lot.save(update_fields=["remaining_units", "metadata", "updated_at"])
        expired.append(transaction_item)
    return expired


@transaction.atomic
def consume_entitlement_lots(
    *, balance: LeaveBalance, units: Decimal, consumption_date: date, idempotency_key: str,
    leave_request=None,
):
    """Consume earliest-expiring eligible entitlement units and persist exact allocations."""
    balance = LeaveBalance.objects.select_for_update().get(pk=balance.pk)
    units = Decimal(units).quantize(Decimal("0.01"))
    remaining = units
    lots = list(
        LeaveEntitlementLot.objects.select_for_update()
        .filter(
            leave_balance=balance,
            effective_date__lte=consumption_date,
            remaining_units__gt=0,
        )
        .filter(Q(expiry_date__isnull=True) | Q(expiry_date__gte=consumption_date))
        .order_by(F("expiry_date").asc(nulls_last=True), "effective_date", "priority", "id")
    )
    allocations = []
    for lot in lots:
        if remaining <= 0:
            break
        allocated = min(remaining, Decimal(lot.remaining_units))
        lot.remaining_units -= allocated
        lot.save(update_fields=["remaining_units", "updated_at"])
        if leave_request is not None:
            allocation, _ = LeaveRequestAllocation.objects.get_or_create(
                tenant=balance.tenant,
                idempotency_key=f"{idempotency_key}:lot:{lot.id}",
                defaults={
                    "leave_request": leave_request,
                    "leave_balance": balance,
                    "policy_period": balance.policy_period,
                    "entitlement_lot": lot,
                    "allocation_date": consumption_date,
                    "units": allocated,
                    "status": LeaveRequestAllocation.Status.CONSUMED,
                },
            )
            allocations.append(allocation)
        else:
            allocations.append({"lot_id": str(lot.id), "units": str(allocated)})
        remaining -= allocated
    if remaining > 0:
        raise ValidationError({"units": f"Eligible entitlement lots are short by {remaining:.2f} units."})
    movement = append_leave_ledger_movement(
        balance=balance,
        action=LEDGER_ACTIONS.CONSUMPTION,
        units=units,
        effective_date=consumption_date,
        idempotency_key=idempotency_key,
        reason="Approved leave consumed from entitlement lots",
        leave_request=leave_request,
        metadata={
            "lot_allocations": [
                item if isinstance(item, dict) else {"allocation_id": str(item.id), "lot_id": str(item.entitlement_lot_id), "units": str(item.units)}
                for item in allocations
            ]
        },
    )
    return movement, allocations


@transaction.atomic
def reverse_leave_request_allocations(*, leave_request, reversal_date: date, idempotency_key: str):
    """Restore exact lots; expired-lot restoration requires an explicit correction decision."""
    balance_ids = LeaveRequestAllocation.objects.filter(
        leave_request=leave_request, status=LeaveRequestAllocation.Status.CONSUMED,
    ).values_list("leave_balance_id", flat=True)
    # Acquire shared balances before allocation/lot rows, in stable batch order.
    list(LeaveBalance.objects.select_for_update().filter(pk__in=balance_ids).order_by("pk"))
    allocations = list(
        LeaveRequestAllocation.objects.select_for_update(of=("self",))
        .select_related("entitlement_lot", "leave_balance")
        .filter(leave_request=leave_request, status=LeaveRequestAllocation.Status.CONSUMED)
        .order_by("allocation_date", "id")
    )
    if not allocations:
        raise ValidationError({"leave_request": "No consumed lot allocations exist for reversal."})
    expired = [item for item in allocations if item.entitlement_lot.expiry_date and item.entitlement_lot.expiry_date < reversal_date]
    if expired:
        raise ValidationError({
            "leave_request": "Cancellation would restore expired leave; use an authorized compensating correction."
        })
    total = Decimal("0")
    for allocation in allocations:
        lot = LeaveEntitlementLot.objects.select_for_update().get(pk=allocation.entitlement_lot_id)
        lot.remaining_units += allocation.units
        if lot.remaining_units > lot.granted_units:
            raise ValidationError({"leave_request": "Reversal would over-credit an entitlement lot."})
        lot.save(update_fields=["remaining_units", "updated_at"])
        allocation.status = LeaveRequestAllocation.Status.REVERSED
        allocation.save(update_fields=["status", "updated_at"])
        total += allocation.units
    source_movement = LeaveBalanceTransaction.objects.filter(
        leave_request=leave_request,
        action=LEDGER_ACTIONS.CONSUMPTION,
        status=LeaveBalanceTransaction.Status.APPLIED,
    ).order_by("created_at").last()
    return append_leave_ledger_movement(
        balance=allocations[0].leave_balance,
        action=LEDGER_ACTIONS.CONSUMPTION_REVERSAL,
        units=total,
        effective_date=reversal_date,
        idempotency_key=idempotency_key,
        reason="Leave cancellation restored exact entitlement lots",
        leave_request=leave_request,
        source_transaction=source_movement,
        metadata={"reversed_allocation_ids": [str(item.id) for item in allocations]},
    )


@transaction.atomic
def compensate_leave_ledger_transaction(
    *, source_transaction: LeaveBalanceTransaction, effective_date: date, idempotency_key: str,
    reason: str, performed_by=None,
):
    """Reverse an applied movement by appending its semantic opposite."""
    inverse = {
        LEDGER_ACTIONS.CONSUMPTION: LEDGER_ACTIONS.CONSUMPTION_REVERSAL,
        LEDGER_ACTIONS.ENCASHMENT: LEDGER_ACTIONS.ENCASHMENT_REVERSAL,
        LEDGER_ACTIONS.CREDIT_ADJUSTMENT: LEDGER_ACTIONS.DEBIT_ADJUSTMENT,
        LEDGER_ACTIONS.DEBIT_ADJUSTMENT: LEDGER_ACTIONS.CREDIT_ADJUSTMENT,
        LEDGER_ACTIONS.RESERVATION: LEDGER_ACTIONS.RESERVATION_RELEASE,
    }.get(source_transaction.action)
    if inverse is None:
        raise ValidationError({
            "source_transaction": "This movement requires a policy-specific correction decision and cannot be reversed automatically."
        })
    return append_leave_ledger_movement(
        balance=source_transaction.leave_balance,
        action=inverse,
        units=source_transaction.units,
        effective_date=effective_date,
        idempotency_key=idempotency_key,
        reason=reason,
        performed_by=performed_by,
        leave_request=source_transaction.leave_request,
        source_transaction=source_transaction,
        metadata={"correction_of": str(source_transaction.id)},
    )
