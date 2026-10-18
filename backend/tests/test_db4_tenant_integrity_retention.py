from contextlib import redirect_stdout
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from io import StringIO
from threading import Event

import pytest
from django.core.management import call_command
from django.db import DatabaseError, close_old_connections, connection, transaction

from apps.attendance.models import AttendanceRecord
from apps.documents.models import EmployeeDocument
from apps.employees.models import Employee, EmploymentStatus
from apps.iam.models import MembershipRole, TenantMembership
from apps.leave_management.models import LeaveBalance
from apps.organizations.models import LegalEntity
from apps.payroll.models import PayrollBackgroundJob, PayrollBackgroundJobOperation, PayrollRun, PayrollRunKind
from apps.tenants.models import Tenant
from apps.tenants.retention import authorized_synthetic_tenant_teardown
from apps.workflows.models import (
    WorkflowAction,
    WorkflowActionLog,
    WorkflowActorType,
    WorkflowAssignment,
    WorkflowInstance,
    WorkflowModule,
    WorkflowStep,
    WorkflowStepInstance,
    WorkflowTemplate,
)


def provision(seed_ref):
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed_ref)
    return Tenant.objects.get(code=f"pw-qa-{seed_ref}")


@pytest.fixture
def tenant_pair(db):
    if connection.vendor != "postgresql":
        pytest.skip("DB-4 trigger verification requires PostgreSQL.")
    return provision("db4-test-a"), provision("db4-test-b")


def assert_database_rejects(operation):
    with pytest.raises(DatabaseError), transaction.atomic():
        operation()


@pytest.mark.django_db(transaction=True)
def test_direct_tenant_guards_reject_orm_bulk_and_raw_sql_bypasses(tenant_pair):
    tenant_a, tenant_b = tenant_pair
    employee_a = tenant_a.employees.get(employee_code="QA-EMP-001")
    employee_b = tenant_b.employees.get(employee_code="QA-EMP-001")
    entity_a = LegalEntity.objects.get(tenant=tenant_a, code="qa-entity")
    entity_b = LegalEntity.objects.get(tenant=tenant_b, code="qa-entity")

    assert Employee.objects.filter(pk=employee_a.pk).update(legal_entity=entity_a) == 1
    assert_database_rejects(lambda: Employee.objects.filter(pk=employee_a.pk).update(legal_entity=entity_b))

    attendance = AttendanceRecord.objects.create(
        tenant=tenant_a,
        employee=employee_a,
        attendance_date=date(2026, 10, 17),
    )
    assert_database_rejects(lambda: AttendanceRecord.objects.filter(pk=attendance.pk).update(employee=employee_b))

    document = EmployeeDocument.objects.create(
        tenant=tenant_a,
        employee=employee_a,
        category=tenant_a.document_categories.get(code="qa-identity"),
        title="DB-4 retained identity proof",
        file_name="identity.pdf",
    )
    assert_database_rejects(lambda: EmployeeDocument.objects.filter(pk=document.pk).update(employee=employee_b))

    balance = LeaveBalance.objects.get(tenant=tenant_a, employee=employee_a)
    assert_database_rejects(lambda: LeaveBalance.objects.filter(pk=balance.pk).update(employee=employee_b))

    snapshot = tenant_a.payroll_input_snapshots.get(employee=employee_a)
    with connection.cursor() as cursor:
        def raw_cross_tenant_update():
            cursor.execute(
                "UPDATE payroll_payrollinputsnapshot SET employee_id = %s WHERE id = %s",
                [employee_b.pk, snapshot.pk],
            )

        assert_database_rejects(raw_cross_tenant_update)


@pytest.mark.django_db(transaction=True)
def test_workflow_and_background_job_nested_scope_is_enforced(tenant_pair):
    tenant_a, tenant_b = tenant_pair
    run_a = tenant_a.payroll_runs.get(code="qa-inputs-locked")
    run_b = tenant_b.payroll_runs.get(code="qa-inputs-locked")
    job = PayrollBackgroundJob.objects.create(
        tenant=tenant_a,
        operation=PayrollBackgroundJobOperation.CALCULATE,
        idempotency_key="db4-background-job",
        payroll_run=run_a,
    )
    assert_database_rejects(lambda: PayrollBackgroundJob.objects.filter(pk=job.pk).update(payroll_run=run_b))

    instance = WorkflowInstance.objects.create(
        tenant=tenant_a,
        module=WorkflowModule.LEAVE,
        trigger_key="db4",
        subject_type="leave_request",
        subject_identifier="db4-subject",
    )
    step = WorkflowStepInstance.objects.create(workflow_instance=instance, step_order=1, name="Review")
    member_a = TenantMembership.objects.filter(tenant=tenant_a).first()
    member_b = TenantMembership.objects.filter(tenant=tenant_b).first()
    membership_role_a = MembershipRole.objects.filter(membership=member_a).first()
    assert_database_rejects(lambda: MembershipRole.objects.filter(pk=membership_role_a.pk).update(role=tenant_b.roles.first()))
    assignment = WorkflowAssignment.objects.create(
        step_instance=step,
        actor_type=WorkflowActorType.MEMBERSHIP,
        membership=member_a,
    )
    assert_database_rejects(lambda: WorkflowAssignment.objects.filter(pk=assignment.pk).update(membership=member_b))
    role_b = tenant_b.roles.first()
    assert_database_rejects(lambda: WorkflowAssignment.objects.filter(pk=assignment.pk).update(role=role_b))

    template_b = WorkflowTemplate.objects.create(
        tenant=tenant_b,
        code="db4-template-b",
        name="DB-4 Tenant B template",
        module=WorkflowModule.LEAVE,
        trigger_key="db4-b",
    )
    template_step_b = WorkflowStep.objects.create(template=template_b, step_order=1, name="Tenant B Review")
    assert_database_rejects(lambda: WorkflowStep.objects.filter(pk=template_step_b.pk).update(role=tenant_a.roles.first()))
    assert_database_rejects(
        lambda: WorkflowStepInstance.objects.create(
            workflow_instance=instance,
            template_step=template_step_b,
            step_order=2,
            name="Invalid cross-tenant step",
        )
    )

    instance_b = WorkflowInstance.objects.create(
        tenant=tenant_b,
        module=WorkflowModule.LEAVE,
        trigger_key="db4-b",
        subject_type="leave_request",
        subject_identifier="db4-subject-b",
    )
    step_b = WorkflowStepInstance.objects.create(workflow_instance=instance_b, step_order=1, name="Tenant B Review")
    assert_database_rejects(
        lambda: WorkflowActionLog.objects.create(
            workflow_instance=instance,
            step_instance=step_b,
            action=WorkflowAction.SUBMIT,
        )
    )


@pytest.mark.django_db(transaction=True)
def test_historical_parent_deletion_is_blocked_but_archival_is_preserved(tenant_pair):
    tenant_a, _ = tenant_pair
    employee = tenant_a.employees.get(employee_code="QA-EMP-001")
    record = AttendanceRecord.objects.create(
        tenant=tenant_a,
        employee=employee,
        attendance_date=date(2026, 10, 17),
    )
    assert_database_rejects(record.delete)
    assert_database_rejects(employee.delete)

    Employee.objects.filter(pk=employee.pk).update(employment_status=EmploymentStatus.INACTIVE)
    employee.refresh_from_db()
    assert employee.employment_status == EmploymentStatus.INACTIVE
    assert AttendanceRecord.objects.filter(pk=record.pk).exists()

    instance = WorkflowInstance.objects.create(
        tenant=tenant_a,
        module=WorkflowModule.EMPLOYEES,
        trigger_key="db4-retention",
        subject_type="employee",
        subject_identifier=str(employee.pk),
    )
    WorkflowActionLog.objects.create(workflow_instance=instance, action=WorkflowAction.SUBMIT)
    assert_database_rejects(instance.delete)


@pytest.mark.django_db(transaction=True)
def test_synthetic_teardown_requires_exact_ownership_and_preserves_other_tenants(tenant_pair):
    tenant_a, tenant_b = tenant_pair
    tenant_b_id = tenant_b.pk
    with pytest.raises(Exception):
        with authorized_synthetic_tenant_teardown(tenant_a, expected_owner_email="wrong@playwright.qa.invalid"):
            pass

    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref="db4-test-a", cleanup=True)
    assert not Tenant.objects.filter(pk=tenant_a.pk).exists()
    assert Tenant.objects.filter(pk=tenant_b_id).exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_payroll_run_delete_and_job_creation_cannot_orphan_history(tenant_pair):
    tenant_a, _ = tenant_pair
    period = tenant_a.payroll_periods.get(code="2026-10")
    pay_group = tenant_a.pay_groups.get(code="qa-monthly")
    payroll_run = PayrollRun.objects.create(
        tenant=tenant_a,
        period=period,
        pay_group=pay_group,
        code="db4-delete-race",
        name="DB-4 deletion race",
        run_kind=PayrollRunKind.SUPPLEMENTARY,
    )
    delete_locked = Event()
    writer_started = Event()

    def delete_run():
        close_old_connections()
        try:
            with transaction.atomic():
                locked = PayrollRun.objects.select_for_update().get(pk=payroll_run.pk)
                delete_locked.set()
                assert writer_started.wait(timeout=10)
                locked.delete()
            return "deleted"
        except DatabaseError:
            return "rejected"
        finally:
            close_old_connections()

    def create_job():
        close_old_connections()
        assert delete_locked.wait(timeout=10)
        writer_started.set()
        try:
            PayrollBackgroundJob.objects.create(
                tenant=tenant_a,
                operation=PayrollBackgroundJobOperation.CALCULATE,
                idempotency_key="db4-delete-race-job",
                payroll_run_id=payroll_run.pk,
            )
            return "created"
        except DatabaseError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        delete_future = pool.submit(delete_run)
        create_future = pool.submit(create_job)
        outcomes = {delete_future.result(), create_future.result()}

    assert "rejected" in outcomes
    assert not (
        PayrollBackgroundJob.objects.filter(idempotency_key="db4-delete-race-job").exists()
        and not PayrollRun.objects.filter(pk=payroll_run.pk).exists()
    )
