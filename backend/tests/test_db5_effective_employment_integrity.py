from contextlib import redirect_stdout
from datetime import date, timedelta
from io import StringIO
from threading import Barrier, Thread

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import DatabaseError, close_old_connections, connection, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attendance.models import AttendancePolicy, AttendancePolicyAssignment
from apps.attendance.services import _find_matching_attendance_policy_assignment
from apps.employee_lifecycle.effective_services import (
    apply_completed_movement,
    classify_employment_history,
    initialize_employment_timeline,
    resolve_employment_scope,
)
from apps.employee_lifecycle.models import (
    EmployeeMovement,
    EmploymentAssignment,
    EmploymentSpell,
    EmploymentSpellStatus,
    LifecycleEventStatus,
    MovementType,
)
from apps.employees.models import Employee
from apps.leave_management.models import LeavePolicy, LeavePolicyAssignment, LeaveType
from apps.leave_management.services import _find_matching_leave_policy_assignment
from apps.organizations.models import Department, LegalEntity
from apps.payroll.models import EmployeeSalaryAssignment, PayGroupAssignment
from apps.tenants.models import Tenant


def provision(seed_ref):
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed_ref)
    return Tenant.objects.get(code=f"pw-qa-{seed_ref}")


@pytest.fixture
def db5_workspace(db):
    if connection.vendor != "postgresql":
        pytest.skip("DB-5 integrity verification requires PostgreSQL.")
    tenant = provision("db5-a")
    other = provision("db5-b")
    employee = tenant.employees.select_related("legal_entity", "employment_type").first()
    actor = tenant.memberships.filter(membership_roles__role__code="hr-admin").select_related("user", "employee").first().employee
    return tenant, other, employee, actor


@pytest.mark.django_db(transaction=True)
def test_effective_movement_preserves_historical_department_and_future_projection(db5_workspace):
    tenant, _, employee, actor = db5_workspace
    original = Department.objects.create(tenant=tenant, code="db5-original", name="Original Department")
    target = Department.objects.create(tenant=tenant, code="db5-target", name="Target Department")
    employee.department = original
    employee.save(update_fields=["department", "updated_at"])
    baseline = initialize_employment_timeline(
        employee_id=employee.id,
        actor_identifier=actor.employee_code,
        approved_source_reference="DB5-QA-BASELINE-APPROVED",
        effective_from=date(2026, 1, 1),
    )
    effective_date = timezone.localdate() + timedelta(days=30)
    movement = EmployeeMovement.objects.create(
        tenant=tenant,
        employee=employee,
        movement_type=MovementType.TRANSFER,
        status=LifecycleEventStatus.COMPLETED,
        effective_date=effective_date,
        reason="Approved future department transfer",
        from_department=original,
        to_department=target,
    )
    future = apply_completed_movement(movement.id, actor_identifier=actor.employee_code)
    baseline.refresh_from_db()
    employee.refresh_from_db()

    assert baseline.effective_to == effective_date - timedelta(days=1)
    assert resolve_employment_scope(employee, as_of=effective_date - timedelta(days=1)).department_id == original.id
    assert resolve_employment_scope(employee, as_of=effective_date).department_id == target.id
    assert future.status == "planned"
    assert employee.department_id == original.id


@pytest.mark.django_db(transaction=True)
def test_overlapping_assignments_and_cross_tenant_scope_are_database_rejected(db5_workspace):
    tenant, other, employee, actor = db5_workspace
    baseline = initialize_employment_timeline(
        employee_id=employee.id,
        actor_identifier=actor.employee_code,
        approved_source_reference="DB5-QA-BASELINE-OVERLAP",
        effective_from=date(2026, 1, 1),
    )
    duplicate = EmploymentAssignment(
        tenant=tenant,
        employee=employee,
        employment_spell=baseline.employment_spell,
        effective_from=date(2026, 6, 1),
        legal_entity=employee.legal_entity,
        source_reference="DB5-QA-DUPLICATE",
        approved_by_identifier=actor.employee_code,
        approved_at=timezone.now(),
    )
    with pytest.raises(DatabaseError), transaction.atomic():
        EmploymentAssignment.objects.bulk_create([duplicate])

    other_entity = LegalEntity.objects.filter(tenant=other).first()
    cross_tenant = EmploymentAssignment(
        tenant=tenant,
        employee=employee,
        employment_spell=baseline.employment_spell,
        effective_from=date(2027, 1, 1),
        legal_entity=other_entity,
        source_reference="DB5-QA-CROSS-TENANT",
        approved_by_identifier=actor.employee_code,
        approved_at=timezone.now(),
    )
    baseline.effective_to = date(2026, 12, 31)
    baseline.save(update_fields=["effective_to", "updated_at"])
    with pytest.raises(DatabaseError), transaction.atomic():
        EmploymentAssignment.objects.bulk_create([cross_tenant])


@pytest.mark.django_db(transaction=True)
def test_concurrent_overlapping_employment_assignments_allow_exactly_one(db5_workspace):
    tenant, _, employee, actor = db5_workspace
    spell = EmploymentSpell.objects.create(
        tenant=tenant,
        employee=employee,
        sequence=1,
        started_on=date(2026, 1, 1),
        status=EmploymentSpellStatus.ACTIVE,
        legal_entity=employee.legal_entity,
        employment_type=employee.employment_type,
        source_reference="DB5-QA-CONCURRENT-SPELL",
        approved_by_identifier=actor.employee_code,
        approved_at=timezone.now(),
    )
    barrier = Barrier(2)
    outcomes: list[str] = []

    def create_assignment(source_reference: str):
        close_old_connections()
        try:
            barrier.wait()
            with transaction.atomic():
                EmploymentAssignment.objects.create(
                    tenant_id=tenant.id,
                    employee_id=employee.id,
                    employment_spell_id=spell.id,
                    effective_from=date(2026, 1, 1),
                    legal_entity_id=employee.legal_entity_id,
                    source_reference=source_reference,
                    approved_by_identifier=actor.employee_code,
                    approved_at=timezone.now(),
                )
            outcomes.append("created")
        except DatabaseError:
            outcomes.append("rejected")
        finally:
            close_old_connections()

    threads = [Thread(target=create_assignment, args=(f"DB5-QA-CONCURRENT-{index}",)) for index in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)

    assert not any(thread.is_alive() for thread in threads)
    assert sorted(outcomes) == ["created", "rejected"]
    assert EmploymentAssignment.objects.filter(employee=employee).count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize(
    ("assignment_model", "relation_field", "relation_accessor"),
    [
        (EmployeeSalaryAssignment, "structure_version_id", "salary_structure_versions"),
        (PayGroupAssignment, "pay_group_id", "pay_groups"),
    ],
)
def test_concurrent_payroll_assignment_ranges_allow_exactly_one(
    db5_workspace,
    assignment_model,
    relation_field,
    relation_accessor,
):
    tenant, _, template, _ = db5_workspace
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code=f"DB5-CONCURRENT-{assignment_model._meta.model_name}",
        first_name="Concurrent",
        last_name="Payroll",
        employment_status="active",
        date_of_joining=date(2026, 1, 1),
        legal_entity=template.legal_entity,
    )
    relation_id = getattr(tenant, relation_accessor).first().id
    barrier = Barrier(2)
    outcomes: list[str] = []

    def create_assignment():
        close_old_connections()
        try:
            barrier.wait()
            with transaction.atomic():
                assignment_model.objects.create(
                    tenant_id=tenant.id,
                    employee_id=employee.id,
                    effective_from=date(2026, 1, 1),
                    status="active",
                    **{relation_field: relation_id},
                )
            outcomes.append("created")
        except DatabaseError:
            outcomes.append("rejected")
        finally:
            close_old_connections()

    threads = [Thread(target=create_assignment) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)

    assert not any(thread.is_alive() for thread in threads)
    assert sorted(outcomes) == ["created", "rejected"]
    assert assignment_model.objects.filter(employee=employee).count() == 1


@pytest.mark.django_db(transaction=True)
def test_cross_entity_transfer_fails_closed_without_policy_decisions(db5_workspace):
    tenant, _, employee, actor = db5_workspace
    initialize_employment_timeline(
        employee_id=employee.id,
        actor_identifier=actor.employee_code,
        approved_source_reference="DB5-QA-BASELINE-XENTITY",
        effective_from=date(2026, 1, 1),
    )
    other_entity = LegalEntity.objects.create(tenant=tenant, code="db5-second-entity", name="Second Entity")
    movement = EmployeeMovement.objects.create(
        tenant=tenant,
        employee=employee,
        movement_type=MovementType.TRANSFER,
        status=LifecycleEventStatus.COMPLETED,
        effective_date=date(2026, 8, 1),
        reason="Cross entity transfer awaiting policy",
        from_legal_entity=employee.legal_entity,
        to_legal_entity=other_entity,
    )
    with pytest.raises(ValidationError, match="Cross-legal-entity transfer is blocked"):
        apply_completed_movement(movement.id, actor_identifier=actor.employee_code)
    movement.refresh_from_db()
    assert movement.resulting_assignment_id is None


@pytest.mark.django_db(transaction=True)
def test_classification_and_api_are_read_only_and_tenant_scoped(db5_workspace):
    tenant, other, _, actor = db5_workspace
    before = EmploymentAssignment.objects.count()
    report = classify_employment_history(tenant)
    assert report["classification_mode"] == "read_only"
    assert report["automatic_backfill_performed"] is False
    assert EmploymentAssignment.objects.count() == before

    client = APIClient()
    client.force_authenticate(actor.membership.user)
    response = client.get("/api/v1/hr-admin/employment-history/classification/")
    assert response.status_code == 200
    assert response.json()["tenant_id"] == str(tenant.id)
    assert response.json()["employee_count"] == tenant.employees.count()
    assert response.json()["employee_count"] != other.employees.count() or str(other.id) != response.json()["tenant_id"]

    create_response = client.post(
        "/api/v1/hr-admin/employees/",
        {
            "employee_code": "DB5-NEW-001",
            "first_name": "Effective",
            "last_name": "Joiner",
            "work_email": "db5-new-001@example.test",
            "employment_status": "active",
            "date_of_joining": "2026-10-01",
            "legal_entity_id": str(actor.legal_entity_id),
            "employment_type_id": str(actor.employment_type_id),
        },
        format="json",
    )
    assert create_response.status_code == 201, create_response.json()
    created_employee = tenant.employees.get(employee_code="DB5-NEW-001")
    assignment = created_employee.employment_assignments.get()
    assert assignment.effective_from == date(2026, 10, 1)
    assert assignment.employment_spell.started_on == date(2026, 10, 1)
    assert assignment.source_reference == f"employee_create:{created_employee.id}"


@pytest.mark.django_db(transaction=True)
def test_leave_and_attendance_resolve_historical_scope_and_effective_policy(db5_workspace):
    tenant, _, employee, actor = db5_workspace
    LeavePolicyAssignment.objects.filter(tenant=tenant).delete()
    AttendancePolicyAssignment.objects.filter(tenant=tenant).delete()
    original = Department.objects.create(tenant=tenant, code="db5-policy-original", name="Policy Original")
    target = Department.objects.create(tenant=tenant, code="db5-policy-target", name="Policy Target")
    employee.department = original
    employee.save(update_fields=["department", "updated_at"])
    initialize_employment_timeline(
        employee_id=employee.id,
        actor_identifier=actor.employee_code,
        approved_source_reference="DB5-QA-POLICY-BASELINE",
        effective_from=date(2026, 1, 1),
    )
    movement = EmployeeMovement.objects.create(
        tenant=tenant,
        employee=employee,
        movement_type=MovementType.TRANSFER,
        status=LifecycleEventStatus.COMPLETED,
        effective_date=date(2026, 7, 1),
        reason="Approved policy-scope transfer",
        from_department=original,
        to_department=target,
    )
    apply_completed_movement(movement.id, actor_identifier=actor.employee_code)

    leave_type = LeaveType.objects.filter(tenant=tenant).first()
    old_leave = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code="db5-old-leave",
        name="Old Leave Policy",
        status="active",
    )
    new_leave = LeavePolicy.objects.create(
        tenant=tenant,
        leave_type=leave_type,
        code="db5-new-leave",
        name="New Leave Policy",
        status="active",
    )
    LeavePolicyAssignment.objects.create(
        tenant=tenant,
        leave_policy=old_leave,
        department=original,
        priority=1,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 6, 30),
    )
    LeavePolicyAssignment.objects.create(
        tenant=tenant,
        leave_policy=new_leave,
        department=target,
        priority=1,
        effective_from=date(2026, 7, 1),
    )

    old_attendance = AttendancePolicy.objects.create(
        tenant=tenant,
        code="db5-old-attendance",
        name="Old Attendance Policy",
        status="active",
    )
    new_attendance = AttendancePolicy.objects.create(
        tenant=tenant,
        code="db5-new-attendance",
        name="New Attendance Policy",
        status="active",
    )
    AttendancePolicyAssignment.objects.create(
        tenant=tenant,
        attendance_policy=old_attendance,
        department=original,
        priority=1,
        effective_from=date(2026, 1, 1),
        effective_to=date(2026, 6, 30),
    )
    AttendancePolicyAssignment.objects.create(
        tenant=tenant,
        attendance_policy=new_attendance,
        department=target,
        priority=1,
        effective_from=date(2026, 7, 1),
    )

    assert _find_matching_leave_policy_assignment(employee, leave_type, as_of=date(2026, 6, 30)).leave_policy_id == old_leave.id
    assert _find_matching_leave_policy_assignment(employee, leave_type, as_of=date(2026, 7, 1)).leave_policy_id == new_leave.id
    assert _find_matching_attendance_policy_assignment(employee, as_of=date(2026, 6, 30)).attendance_policy_id == old_attendance.id
    assert _find_matching_attendance_policy_assignment(employee, as_of=date(2026, 7, 1)).attendance_policy_id == new_attendance.id
