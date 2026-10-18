from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.utils import timezone

from apps.employee_lifecycle.effective_services import resolve_employment_scope
from apps.employee_lifecycle.models import EmploymentAssignment, EmploymentAssignmentStatus, EmploymentSpell, EmploymentSpellStatus
from apps.employees.models import Employee, EmploymentStatus
from apps.organizations.models import Department, LegalEntity
from apps.tenant_onboarding.models import TenantLaunchRun, TenantLaunchRunStatus, TenantLaunchRunType
from apps.tenants.models import Tenant


pytestmark = pytest.mark.django_db(transaction=True)


def test_concurrent_launch_idempotency_identity_allows_one_run():
    if connection.vendor != "postgresql":
        pytest.skip("Concurrent launch integrity requires PostgreSQL.")
    tenant = Tenant.objects.create(code="rg3a-launch", name="RG3A Launch")

    def create_run():
        close_old_connections()
        try:
            with transaction.atomic():
                run = TenantLaunchRun.objects.create(
                    onboarding=tenant.onboarding_record,
                    tenant=tenant,
                    blueprint_ref="rg3a.blueprint",
                    blueprint_version="v1",
                    subscription_plan="enterprise",
                    run_type=TenantLaunchRunType.APPLY,
                    status=TenantLaunchRunStatus.RUNNING,
                    idempotency_key="rg3a-concurrent-apply",
                )
            return str(run.id)
        except IntegrityError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: create_run(), range(2)))

    assert outcomes.count("rejected") == 1
    assert TenantLaunchRun.objects.filter(
        tenant=tenant,
        run_type=TenantLaunchRunType.APPLY,
        idempotency_key="rg3a-concurrent-apply",
    ).count() == 1


def test_future_assignment_does_not_change_current_or_historical_scope():
    tenant = Tenant.objects.create(code="rg3a-history", name="RG3A History")
    entity = LegalEntity.objects.create(tenant=tenant, code="entity", name="Entity")
    current_department = Department.objects.create(tenant=tenant, code="current", name="Current")
    future_department = Department.objects.create(tenant=tenant, code="future", name="Future")
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="RG3A-EMP",
        first_name="History",
        last_name="Employee",
        date_of_joining=date(2026, 1, 1),
        employment_status=EmploymentStatus.ACTIVE,
        legal_entity=entity,
        department=current_department,
    )
    spell = EmploymentSpell.objects.create(
        tenant=tenant,
        employee=employee,
        sequence=1,
        started_on=date(2026, 1, 1),
        status=EmploymentSpellStatus.ACTIVE,
        legal_entity=entity,
        source_reference="rg3a-baseline",
        approved_by_identifier="rg3a",
        approved_at=timezone.now(),
    )
    EmploymentAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        employment_spell=spell,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 12, 31),
        status=EmploymentAssignmentStatus.SUPERSEDED,
        legal_entity=entity,
        department=current_department,
        source_reference="rg3a-current",
        approved_by_identifier="rg3a",
        approved_at=timezone.now(),
    )
    EmploymentAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        employment_spell=spell,
        effective_from=date(2027, 1, 1),
        status=EmploymentAssignmentStatus.PLANNED,
        legal_entity=entity,
        department=future_department,
        source_reference="rg3a-future",
        approved_by_identifier="rg3a",
        approved_at=timezone.now(),
    )

    assert resolve_employment_scope(employee, as_of=date(2026, 6, 1)).department_id == current_department.id
    assert resolve_employment_scope(employee, as_of=date(2027, 1, 1)).department_id == future_department.id
    employee.refresh_from_db()
    assert employee.department_id == current_department.id


def test_cross_tenant_employment_assignment_is_rejected_by_database():
    if connection.vendor != "postgresql":
        pytest.skip("Tenant reference guards require PostgreSQL.")
    tenant = Tenant.objects.create(code="rg3a-a", name="RG3A A")
    other = Tenant.objects.create(code="rg3a-b", name="RG3A B")
    entity = LegalEntity.objects.create(tenant=tenant, code="entity-a", name="Entity A")
    foreign_department = Department.objects.create(tenant=other, code="foreign", name="Foreign")
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="RG3A-CROSS",
        first_name="Cross",
        last_name="Tenant",
        date_of_joining=date(2026, 1, 1),
        employment_status=EmploymentStatus.ACTIVE,
        legal_entity=entity,
    )
    spell = EmploymentSpell.objects.create(
        tenant=tenant,
        employee=employee,
        sequence=1,
        started_on=date(2026, 1, 1),
        status=EmploymentSpellStatus.ACTIVE,
        legal_entity=entity,
        source_reference="rg3a-cross",
        approved_by_identifier="rg3a",
        approved_at=timezone.now(),
    )

    with pytest.raises(Exception, match="department crosses tenant scope"), transaction.atomic():
        EmploymentAssignment.objects.create(
            tenant=tenant,
            employee=employee,
            employment_spell=spell,
            effective_from=date(2026, 1, 1),
            status=EmploymentAssignmentStatus.ACTIVE,
            legal_entity=entity,
            department=foreign_department,
            source_reference="rg3a-invalid",
            approved_by_identifier="rg3a",
            approved_at=timezone.now(),
        )
