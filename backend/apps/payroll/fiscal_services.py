"""Fiscal calendar resolution and accounting-period lifecycle controls."""

from __future__ import annotations

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.db import models
from django.utils import timezone

from apps.iam.permission_checks import get_user_tenant_permission_keys
from apps.payroll.models import (
    AccountingPeriod,
    AccountingPeriodAction,
    AccountingPeriodStatus,
    AccountingPeriodStatusEvent,
    FiscalCalendar,
    FiscalCalendarStatus,
    FiscalYear,
    FiscalYearAction,
    FiscalYearStatus,
    FiscalYearStatusEvent,
)


POSTABLE_PERIOD_STATUSES = {AccountingPeriodStatus.OPEN}


def resolve_fiscal_calendar(*, tenant, on_date, legal_entity=None) -> FiscalCalendar | None:
    base = FiscalCalendar.objects.filter(
        tenant=tenant,
        status=FiscalCalendarStatus.ACTIVE,
        is_default=True,
        effective_from__lte=on_date,
    ).filter(models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=on_date))
    if legal_entity is not None:
        entity_calendar = base.filter(legal_entity=legal_entity).order_by("-version").first()
        if entity_calendar:
            return entity_calendar
    return base.filter(legal_entity__isnull=True).order_by("-version").first()


def resolve_accounting_period(*, tenant, posting_date, legal_entity=None) -> AccountingPeriod | None:
    calendar = resolve_fiscal_calendar(tenant=tenant, on_date=posting_date, legal_entity=legal_entity)
    if calendar is None:
        return None
    return (
        AccountingPeriod.objects.select_related("fiscal_year", "fiscal_year__calendar")
        .filter(
            tenant=tenant,
            fiscal_year__calendar=calendar,
            start_date__lte=posting_date,
            end_date__gte=posting_date,
        )
        .first()
    )


def accounting_context_for_payroll_period(payroll_period, *, legal_entity=None) -> dict:
    earning_period = resolve_accounting_period(
        tenant=payroll_period.tenant,
        posting_date=payroll_period.end_date,
        legal_entity=legal_entity,
    )
    payment_period = resolve_accounting_period(
        tenant=payroll_period.tenant,
        posting_date=payroll_period.pay_date,
        legal_entity=legal_entity,
    )
    return {
        "earning_period": earning_period,
        "payment_period": payment_period,
        "fiscal_year": earning_period.fiscal_year if earning_period else None,
    }


def assert_period_is_postable(period: AccountingPeriod) -> None:
    if period.status not in POSTABLE_PERIOD_STATUSES:
        raise ValidationError({"accounting_period": f"Accounting period {period.code} is not open for posting."})


def _permission_snapshot(actor, tenant) -> set[str]:
    if getattr(actor, "is_superuser", False):
        return {"*"}
    return get_user_tenant_permission_keys(actor, tenant)


@transaction.atomic
def transition_accounting_period(
    *,
    accounting_period: AccountingPeriod,
    action: str,
    actor,
    reason: str,
    request_key: str,
) -> AccountingPeriod:
    if not reason.strip():
        raise ValidationError({"reason": "A reason is required for accounting-period transitions."})
    if not request_key.strip():
        raise ValidationError({"request_key": "An idempotency request key is required."})

    existing = AccountingPeriodStatusEvent.objects.filter(
        tenant=accounting_period.tenant,
        request_key=request_key,
    ).select_related("accounting_period").first()
    if existing:
        if existing.accounting_period_id != accounting_period.id or existing.action != action:
            raise ValidationError({"request_key": "This request key was already used for another period transition."})
        return AccountingPeriod.objects.get(pk=accounting_period.pk)

    period = AccountingPeriod.objects.select_for_update().select_related("tenant").get(pk=accounting_period.pk)
    permissions = _permission_snapshot(actor, period.tenant)
    required_permission = "finance.periods.reopen" if action == AccountingPeriodAction.REOPEN else "finance.periods.close"
    if "*" not in permissions and required_permission not in permissions:
        raise PermissionDenied(f"Missing required permission: {required_permission}")

    transitions = {
        AccountingPeriodAction.OPEN: ({AccountingPeriodStatus.PLANNED}, AccountingPeriodStatus.OPEN),
        AccountingPeriodAction.SOFT_CLOSE: ({AccountingPeriodStatus.OPEN}, AccountingPeriodStatus.SOFT_CLOSED),
        AccountingPeriodAction.CLOSE: ({AccountingPeriodStatus.OPEN, AccountingPeriodStatus.SOFT_CLOSED}, AccountingPeriodStatus.CLOSED),
        AccountingPeriodAction.REOPEN: ({AccountingPeriodStatus.SOFT_CLOSED, AccountingPeriodStatus.CLOSED}, AccountingPeriodStatus.OPEN),
        AccountingPeriodAction.LOCK: ({AccountingPeriodStatus.CLOSED}, AccountingPeriodStatus.LOCKED),
    }
    if action not in transitions:
        raise ValidationError({"action": "Unsupported accounting-period transition."})
    allowed_from, next_status = transitions[action]
    if period.status == next_status:
        return period
    if period.status not in allowed_from:
        raise ValidationError({"status": f"Cannot {action.replace('_', ' ')} an accounting period in {period.status} status."})

    previous_status = period.status
    now = timezone.now()
    period.status = next_status
    if action in {AccountingPeriodAction.CLOSE, AccountingPeriodAction.LOCK}:
        period.closed_at = now
        period.closed_by = actor
    elif action == AccountingPeriodAction.REOPEN:
        period.reopened_at = now
        period.reopened_by = actor
        period.reopen_count += 1
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('hrms.accounting_period_transition', 'authorized', true)")
    period.save()
    AccountingPeriodStatusEvent.objects.create(
        tenant=period.tenant,
        accounting_period=period,
        action=action,
        previous_status=previous_status,
        next_status=next_status,
        actor=actor,
        reason=reason.strip(),
        request_key=request_key.strip(),
        authorization_snapshot={"required_permission": required_permission, "permission_keys": sorted(permissions)},
    )
    return period


@transaction.atomic
def transition_fiscal_year(*, fiscal_year: FiscalYear, action: str, actor, reason: str, request_key: str) -> FiscalYear:
    if not reason.strip():
        raise ValidationError({"reason": "A reason is required for financial-year transitions."})
    if not request_key.strip():
        raise ValidationError({"request_key": "An idempotency request key is required."})

    existing = FiscalYearStatusEvent.objects.filter(tenant=fiscal_year.tenant, request_key=request_key).first()
    if existing:
        if existing.fiscal_year_id != fiscal_year.id or existing.action != action:
            raise ValidationError({"request_key": "This request key was already used for another financial-year transition."})
        return FiscalYear.objects.get(pk=fiscal_year.pk)

    year = FiscalYear.objects.select_for_update().select_related("tenant").get(pk=fiscal_year.pk)
    permissions = _permission_snapshot(actor, year.tenant)
    required_permission = "finance.periods.reopen" if action == FiscalYearAction.REOPEN else "finance.periods.close"
    if "*" not in permissions and required_permission not in permissions:
        raise PermissionDenied(f"Missing required permission: {required_permission}")

    transitions = {
        FiscalYearAction.SOFT_CLOSE: ({FiscalYearStatus.OPEN}, FiscalYearStatus.SOFT_CLOSED),
        FiscalYearAction.CLOSE: ({FiscalYearStatus.OPEN, FiscalYearStatus.SOFT_CLOSED}, FiscalYearStatus.CLOSED),
        FiscalYearAction.REOPEN: ({FiscalYearStatus.SOFT_CLOSED, FiscalYearStatus.CLOSED}, FiscalYearStatus.OPEN),
    }
    if action not in transitions:
        raise ValidationError({"action": "Unsupported financial-year transition."})
    allowed_from, next_status = transitions[action]
    if year.status == next_status:
        return year
    if year.status not in allowed_from:
        raise ValidationError({"status": f"Cannot {action.replace('_', ' ')} a financial year in {year.status} status."})
    if action == FiscalYearAction.CLOSE and year.accounting_periods.exclude(
        status__in={AccountingPeriodStatus.CLOSED, AccountingPeriodStatus.LOCKED}
    ).exists():
        raise ValidationError({"status": "All accounting periods must be closed or locked before financial-year close."})

    previous_status = year.status
    year.status = next_status
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('hrms.fiscal_year_transition', 'authorized', true)")
    year.save()
    FiscalYearStatusEvent.objects.create(
        tenant=year.tenant,
        fiscal_year=year,
        action=action,
        previous_status=previous_status,
        next_status=next_status,
        actor=actor,
        reason=reason.strip(),
        request_key=request_key.strip(),
        authorization_snapshot={"required_permission": required_permission, "permission_keys": sorted(permissions)},
    )
    return year
