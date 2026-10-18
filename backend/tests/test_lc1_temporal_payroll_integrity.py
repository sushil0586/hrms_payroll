from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from django.core.management import call_command
from django.db import IntegrityError, close_old_connections, connection, transaction

from apps.employees.models import Employee
from apps.payroll.models import (
    EmployeeSalaryAssignment,
    PayGroup,
    PayGroupAssignment,
    PayGroupStatus,
    PayrollCalendar,
    PayrollConfigStatus,
    SalaryStructure,
    SalaryStructureVersion,
)
from apps.tenants.models import Tenant


@pytest.fixture
def temporal_workspace(db):
    call_command("manage_playwright_workspace", seed_ref="lc1-temporal")
    tenant = Tenant.objects.get(code="pw-qa-lc1-temporal")
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code=f"LC1-{Employee.objects.filter(tenant=tenant).count() + 1:03d}",
        first_name="Temporal",
        last_name="Guard",
        date_of_joining=date(2026, 1, 1),
    )
    calendar = PayrollCalendar.objects.create(tenant=tenant, code="lc1", name="LC1")
    pay_group = PayGroup.objects.create(
        tenant=tenant,
        calendar=calendar,
        code="lc1",
        name="LC1",
        status=PayGroupStatus.ACTIVE,
    )
    structure = SalaryStructure.objects.create(
        tenant=tenant,
        pay_group=pay_group,
        code="lc1",
        name="LC1",
        status=PayrollConfigStatus.ACTIVE,
    )
    version = SalaryStructureVersion.objects.create(
        tenant=tenant,
        structure=structure,
        version=1,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 12, 31),
        status=PayrollConfigStatus.ACTIVE,
    )
    return tenant, employee, pay_group, version


@pytest.mark.django_db(transaction=True)
def test_bulk_and_raw_writes_cannot_bypass_temporal_guards(temporal_workspace):
    if connection.vendor != "postgresql":
        pytest.skip("LC-1 temporal bypass certification requires PostgreSQL.")
    tenant, employee, pay_group, version = temporal_workspace
    PayGroupAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        pay_group=pay_group,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 12, 31),
        status=PayGroupStatus.ACTIVE,
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        PayGroupAssignment.objects.bulk_create([
            PayGroupAssignment(
                tenant=tenant,
                employee=employee,
                pay_group=pay_group,
                effective_from=date(2026, 6, 1),
                status=PayGroupStatus.ACTIVE,
            )
        ])

    EmployeeSalaryAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        structure_version=version,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 5, 31),
        status=PayrollConfigStatus.ACTIVE,
    )
    with pytest.raises(IntegrityError), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO payroll_employeesalaryassignment
                (id, created_at, updated_at, tenant_id, employee_id, structure_version_id,
                 effective_from, effective_to, status, annual_ctc_override, assignment_reason, config_snapshot)
            VALUES (gen_random_uuid(), NOW(), NOW(), %s, %s, %s, %s, NULL, 'active', NULL, '', '{}'::jsonb)
            """,
            [tenant.id, employee.id, version.id, date(2026, 5, 1)],
        )


@pytest.mark.django_db(transaction=True)
def test_concurrent_salary_assignments_allow_exactly_one(temporal_workspace):
    if connection.vendor != "postgresql":
        pytest.skip("LC-1 concurrency certification requires PostgreSQL.")
    tenant, employee, _pay_group, version = temporal_workspace

    def create_assignment(start_date):
        close_old_connections()
        try:
            EmployeeSalaryAssignment.objects.bulk_create([
                EmployeeSalaryAssignment(
                    tenant_id=tenant.id,
                    employee_id=employee.id,
                    structure_version_id=version.id,
                    effective_from=start_date,
                    status=PayrollConfigStatus.ACTIVE,
                )
            ])
            return "created"
        except IntegrityError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(create_assignment, [date(2027, 1, 1), date(2027, 6, 1)]))

    assert sorted(outcomes) == ["created", "rejected"]
    assert EmployeeSalaryAssignment.objects.filter(tenant=tenant, employee=employee).count() == 1
