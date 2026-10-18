from contextlib import redirect_stdout
from datetime import date
from io import StringIO

import pytest
from django.core.management import call_command
from django.db import connection

from apps.payroll.models import (
    PayGroup,
    PayGroupStatus,
    PayrollCalendar,
    PayrollConfigStatus,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollRun,
    PayrollRunStatus,
    PayrollStatutoryComponent,
    PayrollStatutoryComponentKind,
    PayrollStatutoryPack,
)
from apps.payroll.services import _selected_statutory_components
from apps.tenants.models import Tenant


@pytest.mark.django_db(transaction=True)
def test_statutory_pack_selection_respects_march_april_earning_boundary():
    if connection.vendor != "postgresql":
        pytest.skip("DB-6.7 statutory boundary verification requires PostgreSQL.")
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="db67-boundary")
    tenant = Tenant.objects.get(code="pw-qa-db67-boundary")
    calendar = PayrollCalendar.objects.create(tenant=tenant, code="db67-boundary", name="DB67 Boundary")
    march = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="march-2027",
        name="March 2027",
        start_date=date(2027, 3, 1),
        end_date=date(2027, 3, 31),
        pay_date=date(2027, 4, 5),
        status=PayrollPeriodStatus.OPEN,
    )
    april = PayrollPeriod.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="april-2027",
        name="April 2027",
        start_date=date(2027, 4, 1),
        end_date=date(2027, 4, 30),
        pay_date=date(2027, 5, 5),
        status=PayrollPeriodStatus.OPEN,
    )
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="db67-staff",
        name="DB67 Staff",
        status=PayGroupStatus.ACTIVE,
    )
    old_pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="db67-fy2026",
        name="DB67 FY 2026-27",
        status=PayrollConfigStatus.ACTIVE,
        effective_from=date(2026, 4, 1),
        effective_to=date(2027, 3, 31),
    )
    new_pack = PayrollStatutoryPack.objects.create(
        tenant=tenant,
        code="db67-fy2027",
        name="DB67 FY 2027-28",
        status=PayrollConfigStatus.ACTIVE,
        effective_from=date(2027, 4, 1),
    )
    for pack in [old_pack, new_pack]:
        PayrollStatutoryComponent.objects.create(
            tenant=tenant,
            statutory_pack=pack,
            code="pf",
            name="Provident Fund",
            statutory_type=PayrollStatutoryComponentKind.PROVIDENT_FUND,
            statutory_treatment_ref="india.epf.standard.v1",
            status=PayrollConfigStatus.ACTIVE,
        )
    profile = {
        "calculation_profile": {
            "statutory_profile": {
                "enabled": True,
                "pack_codes": [old_pack.code, new_pack.code],
            }
        }
    }
    march_run = PayrollRun.objects.create(
        tenant=tenant,
        period=march,
        pay_group=pay_group,
        code="db67-march",
        name="DB67 March",
        status=PayrollRunStatus.COLLECTING_INPUTS,
        config_snapshot=profile,
    )
    april_run = PayrollRun.objects.create(
        tenant=tenant,
        period=april,
        pay_group=pay_group,
        code="db67-april",
        name="DB67 April",
        status=PayrollRunStatus.COLLECTING_INPUTS,
        config_snapshot=profile,
    )

    assert [item.statutory_pack_id for item in _selected_statutory_components(march_run)] == [old_pack.id]
    assert [item.statutory_pack_id for item in _selected_statutory_components(april_run)] == [new_pack.id]
