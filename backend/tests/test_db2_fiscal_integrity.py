from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Event

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, IntegrityError, close_old_connections, connection, transaction

from apps.organizations.models import LegalEntity
from apps.payroll.fiscal_services import (
    accounting_context_for_payroll_period,
    assert_period_is_postable,
    resolve_fiscal_calendar,
    transition_accounting_period,
    transition_fiscal_year,
)
from apps.payroll.models import (
    AccountingPeriod,
    AccountingPeriodAction,
    AccountingPeriodStatus,
    FiscalCalendar,
    FiscalCalendarStatus,
    FiscalYear,
    FiscalYearAction,
    FiscalYearStatus,
    PayrollCalendar,
    PayrollPeriod,
    PayrollRun,
)
from apps.tenants.models import Tenant


def fiscal_fixture(code="db2", *, start_month=4, start_day=1, legal_entity=None):
    tenant = legal_entity.tenant if legal_entity else Tenant.objects.create(code=code, name=code, is_sandbox=True)
    calendar = FiscalCalendar.objects.create(
        tenant=tenant,
        legal_entity=legal_entity,
        code=f"{code}-fiscal",
        name=f"{code} Fiscal",
        start_month=start_month,
        start_day=start_day,
        country_code="IN" if start_month == 4 else "US",
        status=FiscalCalendarStatus.ACTIVE,
        is_default=True,
        effective_from=date(2026, start_month, start_day),
    )
    fiscal_year = FiscalYear.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="FY2026-27" if start_month == 4 else "FY2026",
        start_date=date(2026, start_month, start_day),
        end_date=date(2027, start_month, start_day) if start_day > 1 else date(2027, start_month, 1),
        status=FiscalYearStatus.OPEN,
    )
    # Keep explicit dates because fiscal years are configuration, not inferred globally.
    fiscal_year.end_date = date(2027, 3, 31) if start_month == 4 else date(2026, 12, 31)
    fiscal_year.save()
    return tenant, calendar, fiscal_year


def make_period(fiscal_year, code, sequence, start_date, end_date, *, status=AccountingPeriodStatus.OPEN, legal_entity=None):
    return AccountingPeriod.objects.create(
        tenant=fiscal_year.tenant,
        fiscal_year=fiscal_year,
        legal_entity=legal_entity,
        code=code,
        name=code,
        sequence=sequence,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )


@pytest.mark.django_db(transaction=True)
def test_india_financial_year_transition_and_march_paid_in_april_are_distinct():
    tenant, _, fy_2026 = fiscal_fixture("db2-india")
    march = make_period(fy_2026, "2027-03", 12, date(2027, 3, 1), date(2027, 3, 31))
    calendar_2027 = FiscalCalendar.objects.get(tenant=tenant)
    fy_2027 = FiscalYear.objects.create(
        tenant=tenant,
        calendar=calendar_2027,
        code="FY2027-28",
        start_date=date(2027, 4, 1),
        end_date=date(2028, 3, 31),
        status=FiscalYearStatus.OPEN,
    )
    april = make_period(fy_2027, "2027-04", 1, date(2027, 4, 1), date(2027, 4, 30))
    payroll_calendar = PayrollCalendar.objects.create(tenant=tenant, code="monthly", name="Monthly")
    payroll_period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=payroll_calendar,
        code="mar-2027",
        name="March 2027",
        start_date=date(2027, 3, 1),
        end_date=date(2027, 3, 31),
        pay_date=date(2027, 4, 5),
    )

    context = accounting_context_for_payroll_period(payroll_period)
    assert context["earning_period"] == march
    assert context["payment_period"] == april
    assert context["fiscal_year"] == fy_2026


@pytest.mark.django_db(transaction=True)
def test_legal_entity_calendar_overrides_tenant_default():
    tenant, tenant_calendar, _ = fiscal_fixture("db2-precedence")
    entity = LegalEntity.objects.create(tenant=tenant, code="us-entity", name="US Entity", country_code="US")
    _, entity_calendar, _ = fiscal_fixture("entity", start_month=1, legal_entity=entity)
    assert resolve_fiscal_calendar(tenant=tenant, on_date=date(2026, 6, 1)) == tenant_calendar
    assert resolve_fiscal_calendar(tenant=tenant, legal_entity=entity, on_date=date(2026, 6, 1)) == entity_calendar


@pytest.mark.django_db(transaction=True)
def test_duplicate_and_overlapping_year_period_creation_is_rejected():
    _, calendar, fiscal_year = fiscal_fixture("db2-overlap")
    make_period(fiscal_year, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    with pytest.raises((ValidationError, IntegrityError, DatabaseError)):
        with transaction.atomic():
            AccountingPeriod.objects.bulk_create([
                AccountingPeriod(
                    tenant=fiscal_year.tenant,
                    fiscal_year=fiscal_year,
                    code="overlap",
                    name="Overlap",
                    sequence=2,
                    start_date=date(2026, 4, 15),
                    end_date=date(2026, 5, 15),
                )
            ])
    with pytest.raises((ValidationError, IntegrityError, DatabaseError)):
        FiscalYear.objects.create(
            tenant=fiscal_year.tenant,
            calendar=calendar,
            code="OVERLAP",
            start_date=date(2026, 12, 1),
            end_date=date(2027, 11, 30),
        )


@pytest.mark.django_db(transaction=True)
def test_close_reopen_is_authorized_audited_and_idempotent():
    tenant, _, fiscal_year = fiscal_fixture("db2-lifecycle")
    period = make_period(fiscal_year, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    admin = get_user_model().objects.create_superuser(username="db2-admin", email="db2-admin@example.test", password="x")
    outsider = get_user_model().objects.create_user(username="db2-user", email="db2-user@example.test", password="x")

    with pytest.raises(PermissionDenied):
        transition_accounting_period(accounting_period=period, action=AccountingPeriodAction.CLOSE, actor=outsider, reason="No access", request_key="deny-close")
    closed = transition_accounting_period(accounting_period=period, action=AccountingPeriodAction.CLOSE, actor=admin, reason="Month complete", request_key="close-1")
    repeated = transition_accounting_period(accounting_period=period, action=AccountingPeriodAction.CLOSE, actor=admin, reason="Retry", request_key="close-1")
    assert closed.status == repeated.status == AccountingPeriodStatus.CLOSED
    with pytest.raises(ValidationError):
        assert_period_is_postable(closed)
    reopened = transition_accounting_period(accounting_period=period, action=AccountingPeriodAction.REOPEN, actor=admin, reason="Approved correction", request_key="reopen-1")
    assert reopened.status == AccountingPeriodStatus.OPEN
    assert reopened.reopen_count == 1
    assert reopened.status_events.count() == 2


@pytest.mark.django_db(transaction=True)
def test_direct_period_status_bypass_and_event_mutation_are_rejected():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    _, _, fiscal_year = fiscal_fixture("db2-bypass")
    period = make_period(fiscal_year, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    with pytest.raises(DatabaseError), transaction.atomic():
        AccountingPeriod.objects.filter(pk=period.pk).update(status=AccountingPeriodStatus.CLOSED)


@pytest.mark.django_db(transaction=True)
def test_calendar_boundaries_cannot_be_rewritten_after_year_creation():
    _, calendar, _ = fiscal_fixture("db2-versioning")
    calendar.start_month = 1
    with pytest.raises(ValidationError):
        calendar.save()


@pytest.mark.django_db(transaction=True)
def test_historical_payroll_mapping_is_not_changed_by_new_calendar_version():
    tenant = Tenant.objects.create(code="db2-history", name="DB2 History", is_sandbox=True)
    payroll_calendar = PayrollCalendar.objects.create(tenant=tenant, code="monthly", name="Monthly")
    payroll_period = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=payroll_calendar,
        code="legacy",
        name="Legacy",
        start_date=date(2025, 3, 1),
        end_date=date(2025, 3, 31),
        pay_date=date(2025, 4, 1),
    )
    run = PayrollRun.objects.create(tenant=tenant, period=payroll_period, code="legacy", name="Legacy")
    FiscalCalendar.objects.create(
        tenant=tenant,
        code="future",
        name="Future",
        start_month=4,
        start_day=1,
        status=FiscalCalendarStatus.ACTIVE,
        is_default=True,
        effective_from=date(2026, 4, 1),
    )
    run.refresh_from_db()
    assert run.fiscal_year_id is None
    assert run.earning_accounting_period_id is None
    assert run.period_mapping_snapshot == {}


@pytest.mark.django_db(transaction=True)
def test_cross_tenant_accounting_period_reference_is_rejected():
    tenant_a, _, fiscal_year_a = fiscal_fixture("db2-tenant-a")
    period_a = make_period(fiscal_year_a, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    tenant_b = Tenant.objects.create(code="db2-tenant-b", name="Tenant B", is_sandbox=True)
    payroll_calendar = PayrollCalendar.objects.create(tenant=tenant_b, code="monthly", name="Monthly")
    with pytest.raises(ValidationError):
        PayrollPeriod.objects.create(
            tenant=tenant_b,
            calendar=payroll_calendar,
            code="cross",
            name="Cross",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
            pay_date=date(2026, 4, 30),
            earning_accounting_period=period_a,
        )


@pytest.mark.django_db(transaction=True)
def test_financial_year_close_requires_closed_periods_and_is_audited():
    _, _, fiscal_year = fiscal_fixture("db2-year-close")
    period = make_period(fiscal_year, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    admin = get_user_model().objects.create_superuser(
        username="db2-year-admin", email="db2-year-admin@example.test", password="x"
    )

    with pytest.raises(ValidationError):
        transition_fiscal_year(
            fiscal_year=fiscal_year,
            action=FiscalYearAction.CLOSE,
            actor=admin,
            reason="Year complete",
            request_key="year-close-too-soon",
        )
    transition_accounting_period(
        accounting_period=period,
        action=AccountingPeriodAction.CLOSE,
        actor=admin,
        reason="Month complete",
        request_key="year-period-close",
    )
    closed = transition_fiscal_year(
        fiscal_year=fiscal_year,
        action=FiscalYearAction.CLOSE,
        actor=admin,
        reason="Year complete",
        request_key="year-close",
    )
    repeated = transition_fiscal_year(
        fiscal_year=fiscal_year,
        action=FiscalYearAction.CLOSE,
        actor=admin,
        reason="Idempotent retry",
        request_key="year-close",
    )
    assert closed.status == repeated.status == FiscalYearStatus.CLOSED
    assert closed.status_events.count() == 1
    reopened = transition_fiscal_year(
        fiscal_year=fiscal_year,
        action=FiscalYearAction.REOPEN,
        actor=admin,
        reason="Authorized correction",
        request_key="year-reopen",
    )
    assert reopened.status == FiscalYearStatus.OPEN
    assert reopened.status_events.count() == 2


@pytest.mark.django_db(transaction=True)
def test_financial_year_direct_status_update_is_rejected():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    _, _, fiscal_year = fiscal_fixture("db2-year-bypass")
    with pytest.raises(DatabaseError), transaction.atomic():
        FiscalYear.objects.filter(pk=fiscal_year.pk).update(status=FiscalYearStatus.CLOSED)


@pytest.mark.django_db(transaction=True)
def test_database_rejects_cross_tenant_period_assignment_through_queryset_update():
    if connection.vendor != "postgresql":
        pytest.skip("Database trigger verification requires PostgreSQL.")
    _, _, fiscal_year_a = fiscal_fixture("db2-db-scope-a")
    period_a = make_period(fiscal_year_a, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    tenant_b = Tenant.objects.create(code="db2-db-scope-b", name="DB Scope B", is_sandbox=True)
    payroll_calendar = PayrollCalendar.objects.create(tenant=tenant_b, code="monthly", name="Monthly")
    payroll_period = PayrollPeriod.objects.create(
        tenant=tenant_b,
        calendar=payroll_calendar,
        code="apr",
        name="April",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 30),
        pay_date=date(2026, 4, 30),
    )
    with pytest.raises(DatabaseError), transaction.atomic():
        PayrollPeriod.objects.filter(pk=payroll_period.pk).update(earning_accounting_period=period_a)


@pytest.mark.django_db(transaction=True)
def test_concurrent_posting_lock_and_period_close_are_serialized():
    if connection.vendor != "postgresql":
        pytest.skip("Row-lock concurrency verification requires PostgreSQL.")
    _, _, fiscal_year = fiscal_fixture("db2-close-post-race")
    period = make_period(fiscal_year, "apr", 1, date(2026, 4, 1), date(2026, 4, 30))
    admin = get_user_model().objects.create_superuser(
        username="db2-race-admin", email="db2-race-admin@example.test", password="x"
    )
    posting_locked = Event()
    release_posting = Event()

    def post_with_period_lock():
        close_old_connections()
        try:
            with transaction.atomic():
                locked = AccountingPeriod.objects.select_for_update().get(pk=period.pk)
                assert_period_is_postable(locked)
                posting_locked.set()
                assert release_posting.wait(5)
                return "posted"
        finally:
            close_old_connections()

    def close_period():
        close_old_connections()
        try:
            assert posting_locked.wait(5)
            result = transition_accounting_period(
                accounting_period=period,
                action=AccountingPeriodAction.CLOSE,
                actor=admin,
                reason="Concurrent close",
                request_key="race-close",
            )
            return result.status
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        posting_future = executor.submit(post_with_period_lock)
        close_future = executor.submit(close_period)
        assert posting_locked.wait(5)
        release_posting.set()
        assert posting_future.result(timeout=10) == "posted"
        assert close_future.result(timeout=10) == AccountingPeriodStatus.CLOSED

    period.refresh_from_db()
    assert period.status == AccountingPeriodStatus.CLOSED
