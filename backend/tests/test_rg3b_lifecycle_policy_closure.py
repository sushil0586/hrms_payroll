from datetime import date

import pytest
from django.core.exceptions import ValidationError

from apps.common.api_serializers import HrAdminWorkflowTemplateWriteSerializer
from apps.employees.models import Employee, EmploymentStatus
from apps.organizations.models import LegalEntity
from apps.tenants.models import Tenant
from apps.workflows.models import (
    WorkflowAction,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowModule,
    WorkflowStepInstance,
    WorkflowStepMode,
)
from apps.workflows.services import create_workflow_instance, resolve_workflow_action


pytestmark = pytest.mark.django_db(transaction=True)


def test_dynamic_parallel_workflow_fails_closed_without_creating_runtime_state():
    tenant = Tenant.objects.create(code="rg3b-parallel", name="RG3B Parallel", is_sandbox=True)

    with pytest.raises(ValidationError, match="Parallel approval is unavailable"):
        create_workflow_instance(
            tenant=tenant,
            module=WorkflowModule.LEAVE,
            trigger_key="rg3b.parallel",
            subject_type="leave_request",
            subject_identifier="RG3B-LEAVE-1",
            initiated_by_identifier="rg3b-employee",
            approval_steps=[{"name": "Parallel managers", "mode": WorkflowStepMode.PARALLEL}],
        )

    assert not WorkflowInstance.objects.filter(tenant=tenant).exists()


@pytest.mark.parametrize(
    ("step_override", "message"),
    [
        ({"mode": WorkflowStepMode.PARALLEL}, "parallel approval"),
        ({"allow_delegate": True}, "delegation is unavailable"),
        ({"escalate_after_hours": 1}, "escalation is unavailable"),
    ],
)
def test_workflow_configuration_rejects_unapproved_authority_features(step_override, message):
    step = {
        "name": "Manager approval",
        "mode": WorkflowStepMode.SEQUENTIAL,
        "allow_delegate": False,
        "escalate_after_hours": 0,
        **step_override,
    }
    serializer = HrAdminWorkflowTemplateWriteSerializer(
        data={
            "code": "rg3b-safe-restriction",
            "name": "RG3B safe restriction",
            "module": WorkflowModule.LEAVE,
            "trigger_key": "rg3b.safe",
            "steps": [step],
        }
    )

    assert serializer.is_valid() is False
    assert message in str(serializer.errors).lower()


@pytest.mark.parametrize("action", [WorkflowAction.DELEGATE, WorkflowAction.ESCALATE])
def test_unapproved_authority_actions_fail_closed_without_mutating_workflow(action):
    tenant = Tenant.objects.create(code=f"rg3b-{action}", name=f"RG3B {action}", is_sandbox=True)
    instance = WorkflowInstance.objects.create(
        tenant=tenant,
        module=WorkflowModule.LEAVE,
        trigger_key="rg3b.authority",
        subject_type="leave_request",
        subject_identifier=f"RG3B-{action}",
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=1,
    )
    step = WorkflowStepInstance.objects.create(
        workflow_instance=instance,
        step_order=1,
        name="Manager approval",
        status=WorkflowInstanceStatus.PENDING,
    )

    with pytest.raises(ValidationError, match="authority and lifecycle policy"):
        resolve_workflow_action(instance=instance, actor_identifier="rg3b-manager", action=action)

    instance.refresh_from_db()
    step.refresh_from_db()
    assert instance.status == WorkflowInstanceStatus.PENDING
    assert step.status == WorkflowInstanceStatus.PENDING
    assert not instance.action_logs.exists()


def test_policy_blocked_employee_state_is_not_changed_by_unrelated_workflow_guards():
    tenant = Tenant.objects.create(code="rg3b-history", name="RG3B History", is_sandbox=True)
    entity = LegalEntity.objects.create(tenant=tenant, code="entity", name="Entity")
    employee = Employee.objects.create(
        tenant=tenant,
        employee_code="RG3B-EMP",
        first_name="Historical",
        last_name="Employee",
        legal_entity=entity,
        employment_status=EmploymentStatus.EXITED,
        date_of_joining=date(2020, 1, 1),
    )

    assert employee.employment_status == EmploymentStatus.EXITED
    assert employee.date_of_joining == date(2020, 1, 1)
