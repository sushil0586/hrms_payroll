from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import close_old_connections, connection

from apps.common.models import SaasCommercialAuditEvent
from apps.common.selectors import update_tenant_admin_role
from apps.iam.models import MembershipRole, MembershipStatus, Role, RolePermission, TenantMembership, User
from apps.iam.permission_checks import user_has_tenant_permission
from apps.tenants.models import Tenant
from apps.workflows.models import (
    WorkflowAction,
    WorkflowActionLog,
    WorkflowInstance,
    WorkflowInstanceStatus,
    WorkflowModule,
    WorkflowStepInstance,
)
from apps.workflows.services import resolve_workflow_action


def _tenant(code: str) -> Tenant:
    return Tenant.objects.create(code=code, name=code.replace("-", " ").title(), is_sandbox=True)


def _two_step_workflow(tenant: Tenant) -> WorkflowInstance:
    instance = WorkflowInstance.objects.create(
        tenant=tenant,
        module=WorkflowModule.LEAVE,
        trigger_key="dd7.sequential",
        subject_type="leave_request",
        subject_identifier="DD7-LEAVE-1",
        status=WorkflowInstanceStatus.PENDING,
        current_step_order=1,
    )
    WorkflowStepInstance.objects.create(
        workflow_instance=instance,
        step_order=1,
        name="Manager approval",
        status=WorkflowInstanceStatus.PENDING,
    )
    WorkflowStepInstance.objects.create(
        workflow_instance=instance,
        step_order=2,
        name="HR approval",
        status=WorkflowInstanceStatus.DRAFT,
    )
    return instance


@pytest.mark.django_db(transaction=True)
def test_dd7_sequential_steps_activate_in_order_and_keep_an_immutable_action_history():
    instance = _two_step_workflow(_tenant("dd7-sequential"))

    resolve_workflow_action(
        instance=instance,
        actor_identifier="manager-a",
        action=WorkflowAction.APPROVE,
        comment="Manager approved.",
    )
    instance.refresh_from_db()
    steps = list(instance.step_instances.order_by("step_order"))
    assert instance.status == WorkflowInstanceStatus.PENDING
    assert instance.current_step_order == 2
    assert [step.status for step in steps] == [WorkflowInstanceStatus.APPROVED, WorkflowInstanceStatus.PENDING]

    resolve_workflow_action(
        instance=instance,
        actor_identifier="hr-owner",
        action=WorkflowAction.APPROVE,
        comment="HR approved.",
    )
    instance.refresh_from_db()
    assert instance.status == WorkflowInstanceStatus.APPROVED
    assert list(
        WorkflowActionLog.objects.filter(workflow_instance=instance)
        .order_by("created_at")
        .values_list("actor_identifier", "action")
    ) == [("manager-a", WorkflowAction.APPROVE), ("hr-owner", WorkflowAction.APPROVE)]


@pytest.mark.django_db(transaction=True)
def test_dd7_concurrent_second_step_decisions_have_one_terminal_outcome():
    if connection.vendor != "postgresql":
        pytest.skip("Workflow row-lock verification requires PostgreSQL.")
    instance = _two_step_workflow(_tenant("dd7-race"))
    resolve_workflow_action(instance=instance, actor_identifier="manager-a", action=WorkflowAction.APPROVE)
    barrier = Barrier(2)

    def decide(action: str) -> str:
        close_old_connections()
        try:
            barrier.wait(timeout=5)
            resolve_workflow_action(
                instance=WorkflowInstance.objects.get(pk=instance.pk),
                actor_identifier=f"hr-{action}",
                action=action,
            )
            return "success"
        except ValidationError:
            return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(decide, [WorkflowAction.APPROVE, WorkflowAction.REJECT]))

    assert sorted(outcomes) == ["conflict", "success"]
    assert WorkflowActionLog.objects.filter(workflow_instance=instance).count() == 2
    assert WorkflowActionLog.objects.filter(workflow_instance=instance, step_instance__step_order=2).count() == 1


@pytest.mark.django_db(transaction=True)
def test_dd7_role_permission_revocation_is_effective_on_the_next_check_and_audited():
    call_command("sync_permission_catalog", verbosity=0)
    tenant = _tenant("dd7-revocation")
    user = User.objects.create_user(
        username="dd7.manager",
        email="dd7.manager@example.test",
        password="Password@123",
    )
    membership = TenantMembership.objects.create(
        tenant=tenant,
        user=user,
        employee_code="DD7-MGR",
        status=MembershipStatus.ACTIVE,
        is_default=True,
    )
    role = Role.objects.create(tenant=tenant, code="manager", name="Manager", is_system_role=True)
    MembershipRole.objects.create(membership=membership, role=role, is_primary=True)
    RolePermission.objects.bulk_create(
        [
            RolePermission(role=role, permission_key="leave.requests.approve"),
            RolePermission(role=role, permission_key="leave.view"),
        ]
    )
    admin_user = User.objects.create_user(
        username="dd7.tenant-admin",
        email="dd7.tenant-admin@example.test",
        password="Password@123",
    )
    admin_membership = TenantMembership.objects.create(
        tenant=tenant,
        user=admin_user,
        employee_code="DD7-TA",
        status=MembershipStatus.ACTIVE,
    )
    admin_role = Role.objects.create(tenant=tenant, code="tenant-admin", name="Tenant Admin", is_system_role=True)
    MembershipRole.objects.create(membership=admin_membership, role=admin_role, is_primary=True)
    RolePermission.objects.bulk_create(
        [
            RolePermission(role=admin_role, permission_key="tenant.users.manage"),
            RolePermission(role=admin_role, permission_key="tenant.roles.manage"),
        ]
    )
    assert user_has_tenant_permission(user, tenant, "leave.requests.approve") is True

    update_tenant_admin_role(
        tenant,
        role.id,
        actor_identifier="dd7.tenant-admin",
        payload={
            "name": role.name,
            "code": role.code,
            "description": "Approval permission revoked during DD-7.",
            "is_active": True,
            "permission_keys": ["leave.view"],
        },
    )

    assert user_has_tenant_permission(user, tenant, "leave.requests.approve") is False
    audit = SaasCommercialAuditEvent.objects.get(tenant=tenant, event_type="tenant_role_updated")
    assert audit.actor_identifier == "dd7.tenant-admin"
    assert "leave.requests.approve" in audit.event_snapshot["change_summary"]["removed_permission_keys"]
