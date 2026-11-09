from contextlib import redirect_stdout
from datetime import timedelta
from io import StringIO
from threading import Barrier, Thread

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import DatabaseError, close_old_connections, connection
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import serializers

from apps.common.api_views import save_hr_admin_exit
from apps.employee_lifecycle.effective_services import initialize_employment_timeline
from apps.employee_lifecycle.models import (
    EmployeeExit,
    EmploymentAssignmentStatus,
    EmploymentSpellStatus,
    ExitStatus,
    LifecycleEventType,
)
from apps.employees.models import Employee, EmploymentStatus
from apps.tenants.models import Tenant


def provision(seed_ref: str) -> Tenant:
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed_ref)
    return Tenant.objects.get(code=f"pw-qa-{seed_ref}")


@pytest.fixture
def exit_workspace(db):
    if connection.vendor != "postgresql":
        pytest.skip("EL-1K exit integrity verification requires PostgreSQL.")
    tenant = provision("el1k-exit")
    template = tenant.employees.select_related("legal_entity", "employment_type").first()
    actor = tenant.memberships.filter(membership_roles__role__code="hr-admin").select_related("employee").first().employee
    return tenant, template, actor


def create_employee(tenant: Tenant, template: Employee, code: str) -> Employee:
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code=code,
        first_name="Exit",
        last_name="Integrity",
        employment_status=EmploymentStatus.ACTIVE,
        date_of_joining=timezone.localdate() - timedelta(days=365),
        legal_entity=template.legal_entity,
        employment_type=template.employment_type,
    )
    initialize_employment_timeline(
        employee_id=employee.id,
        actor_identifier="el1k-fixture",
        approved_source_reference=f"el1k:{code}:baseline",
        effective_from=employee.date_of_joining,
    )
    return employee


@pytest.mark.django_db(transaction=True)
def test_exit_completion_closes_history_and_writes_one_terminal_audit(exit_workspace):
    tenant, template, actor = exit_workspace
    employee = create_employee(tenant, template, "EL1K-COMPLETE")
    exit_date = timezone.localdate()
    item = EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.CLEARANCE_IN_PROGRESS,
        approved_last_working_date=exit_date,
        clearance_status_snapshot={"items": [{"code": "finance", "label": "Finance", "done": True, "blocking": True}]},
    )

    completed = save_hr_admin_exit(
        actor,
        {"status": ExitStatus.COMPLETED, "actual_exit_date": exit_date},
        item=item,
    )

    employee.refresh_from_db()
    assignment = employee.employment_assignments.get()
    spell = employee.employment_spells.get()
    assert completed.status == ExitStatus.COMPLETED
    assert employee.employment_status == EmploymentStatus.EXITED
    assert assignment.status == EmploymentAssignmentStatus.SUPERSEDED
    assert assignment.effective_to == exit_date
    assert spell.status == EmploymentSpellStatus.CLOSED
    assert spell.ended_on == exit_date
    assert employee.lifecycle_events.filter(
        event_type=LifecycleEventType.EXIT,
        workflow_reference=f"employee-lifecycle:{item.id}",
        payload__current_value=ExitStatus.COMPLETED,
    ).count() == 1


@pytest.mark.django_db(transaction=True)
def test_exit_submission_and_approval_record_valid_transitions_and_actor(exit_workspace):
    tenant, template, actor = exit_workspace
    employee = create_employee(tenant, template, "EL1K-APPROVAL")
    item = EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.DRAFT,
        proposed_last_working_date=timezone.localdate(),
        clearance_status_snapshot={"items": []},
    )

    submitted = save_hr_admin_exit(actor, {"status": ExitStatus.PENDING_APPROVAL}, item=item)
    approved = save_hr_admin_exit(
        actor,
        {"status": ExitStatus.APPROVED, "approved_last_working_date": timezone.localdate()},
        item=submitted,
    )

    employee.refresh_from_db()
    events = list(
        employee.lifecycle_events.filter(
            event_type=LifecycleEventType.EXIT,
            workflow_reference=f"employee-lifecycle:{item.id}",
        ).order_by("created_at")
    )
    assert approved.status == ExitStatus.APPROVED
    assert employee.employment_status == EmploymentStatus.ON_NOTICE
    assert [event.payload["current_value"] for event in events] == [
        ExitStatus.PENDING_APPROVAL,
        ExitStatus.APPROVED,
    ]
    assert all(event.payload["actor"] == actor.membership.user.username for event in events)


@pytest.mark.django_db(transaction=True)
def test_concurrent_exit_completion_allows_one_terminal_writer(exit_workspace):
    tenant, template, actor = exit_workspace
    employee = create_employee(tenant, template, "EL1K-RACE")
    exit_date = timezone.localdate()
    item = EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.CLEARANCE_IN_PROGRESS,
        approved_last_working_date=exit_date,
        clearance_status_snapshot={"items": [{"code": "finance", "label": "Finance", "done": True, "blocking": True}]},
    )
    barrier = Barrier(2)
    outcomes: list[str] = []

    def complete() -> None:
        close_old_connections()
        try:
            thread_actor = Employee.objects.get(id=actor.id)
            thread_item = EmployeeExit.objects.get(id=item.id)
            barrier.wait()
            save_hr_admin_exit(
                thread_actor,
                {"status": ExitStatus.COMPLETED, "actual_exit_date": exit_date},
                item=thread_item,
            )
            outcomes.append("completed")
        except (DatabaseError, ValidationError, serializers.ValidationError):
            outcomes.append("rejected")
        finally:
            close_old_connections()

    threads = [Thread(target=complete) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=15)

    assert not any(thread.is_alive() for thread in threads)
    assert sorted(outcomes) == ["completed", "rejected"]
    employee.refresh_from_db()
    assert employee.employment_status == EmploymentStatus.EXITED
    assert employee.employment_assignments.filter(status=EmploymentAssignmentStatus.SUPERSEDED).count() == 1
    assert employee.employment_spells.filter(status=EmploymentSpellStatus.CLOSED).count() == 1
    assert employee.lifecycle_events.filter(
        event_type=LifecycleEventType.EXIT,
        workflow_reference=f"employee-lifecycle:{item.id}",
        payload__current_value=ExitStatus.COMPLETED,
    ).count() == 1


@pytest.mark.django_db(transaction=True)
def test_exit_cancellation_restores_state_and_protects_completed_clearance(exit_workspace):
    tenant, template, actor = exit_workspace
    employee = create_employee(tenant, template, "EL1K-CANCEL")
    item = EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.APPROVED,
        approved_last_working_date=timezone.localdate(),
        clearance_status_snapshot={"items": []},
    )
    employee.employment_status = EmploymentStatus.ON_NOTICE
    employee.save(update_fields=["employment_status", "updated_at"])

    cancelled = save_hr_admin_exit(actor, {"status": ExitStatus.CANCELLED}, item=item)
    employee.refresh_from_db()
    assert cancelled.status == ExitStatus.CANCELLED
    assert employee.employment_status == EmploymentStatus.ACTIVE

    protected_employee = create_employee(tenant, template, "EL1K-PROTECTED")
    protected = EmployeeExit.objects.create(
        tenant=tenant,
        employee=protected_employee,
        status=ExitStatus.CLEARANCE_IN_PROGRESS,
        approved_last_working_date=timezone.localdate(),
        clearance_status_snapshot={"items": [{"code": "asset", "label": "Asset", "done": True}]},
    )
    with pytest.raises(serializers.ValidationError, match="governed correction process"):
        save_hr_admin_exit(actor, {"status": ExitStatus.CANCELLED}, item=protected)
    protected.refresh_from_db()
    assert protected.status == ExitStatus.CLEARANCE_IN_PROGRESS


@pytest.mark.django_db(transaction=True)
def test_exited_employee_hard_delete_is_rejected_at_orm_and_database_boundaries(exit_workspace):
    tenant, template, actor = exit_workspace
    employee = create_employee(tenant, template, "EL1K-RETAINED")
    exit_date = timezone.localdate()
    item = EmployeeExit.objects.create(
        tenant=tenant,
        employee=employee,
        status=ExitStatus.CLEARANCE_IN_PROGRESS,
        approved_last_working_date=exit_date,
        clearance_status_snapshot={"items": [{"code": "finance", "label": "Finance", "done": True, "blocking": True}]},
    )
    save_hr_admin_exit(actor, {"status": ExitStatus.COMPLETED, "actual_exit_date": exit_date}, item=item)

    with pytest.raises(ProtectedError):
        employee.delete()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM employees_employee WHERE id = %s", [employee.id])

    assert Employee.objects.filter(id=employee.id, employment_status=EmploymentStatus.EXITED).exists()
    assert EmployeeExit.objects.filter(id=item.id, employee=employee, status=ExitStatus.COMPLETED).exists()
    assert employee.employment_assignments.filter(status=EmploymentAssignmentStatus.SUPERSEDED).count() == 1
    assert employee.employment_spells.filter(status=EmploymentSpellStatus.CLOSED).count() == 1
