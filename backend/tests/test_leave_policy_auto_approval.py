"""Real policy snapshots, workflow decisions and PostgreSQL ledger invariants."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from threading import Barrier
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection, transaction
from rest_framework.test import APIClient

from apps.common.api_serializers import HrAdminLeaveApprovalConfigSerializer
from apps.common.models import SaasCommercialAuditEvent
from apps.employees.models import Employee
from apps.iam.models import TenantMembership, RolePermission
from apps.leave_management.auto_approval import arm_leave_auto_approval, process_due_leave_auto_approvals, SYSTEM_ACTOR
from apps.leave_management.models import LeavePolicyAssignment, LeaveRequest, LeaveBalanceTransaction
from apps.leave_management.services import submit_leave_request, resolve_leave_request, withdraw_leave_request, cancel_leave_request
from apps.leave_management.tasks import process_due_leave_auto_approvals_task
from apps.workflows.models import WorkflowInstance, WorkflowStepInstance
from tests.test_db3_leave_year_integrity import leave_scope
from tests.test_hr_admin_leave_report_population import source

START = datetime(2026, 5, 1, 9, tzinfo=dt_timezone.utc)
DUE = START + timedelta(hours=72)
pytestmark = pytest.mark.django_db(transaction=True)


def scope(code="auto-policy", route="manager_only", enabled=True, hours=72):
    assert connection.vendor == "postgresql"
    tenant, employee, policy, period = leave_scope(code)
    def person(name, existing=None):
        user = get_user_model().objects.create_user(username=f"{code}-{name}", email=f"{code}-{name}@example.test")
        membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active", is_default=True)
        item = existing or Employee.objects.create(tenant=tenant, employee_code=name, first_name=name, employment_status="active")
        item.membership = membership; item.save(update_fields=["membership"])
        return item
    employee = person("Employee", employee)
    manager = person("Manager")
    hr = person("HR")
    employee.reporting_manager = manager; employee.save(update_fields=["reporting_manager"])
    policy.config_snapshot = {
        **policy.config_snapshot,
        "approval": {"default_route": route, "hr_owner_employee_id": str(hr.pk), "auto_approve_enabled": enabled, "auto_approve_after_hours": hours},
        "lifecycle": {"allow_employee_cancel_approved": True, "cancel_approved_requires_reapproval": True},
    }
    policy.save(update_fields=["config_snapshot"])
    LeavePolicyAssignment.objects.create(tenant=tenant, leave_policy=policy, employee=employee, priority=500)
    with patch("django.utils.timezone.now", return_value=START):
        request = submit_leave_request(employee=employee, leave_type=policy.leave_type,
            start_date=datetime(2026, 5, 11).date(), end_date=datetime(2026, 5, 11).date(),
            start_day_portion="full_day", end_day_portion="full_day", reason="Synthetic timer request")
    return tenant, employee, manager, policy, period, request


def process(now=DUE, limit=100):
    with patch("django.utils.timezone.now", return_value=now):
        return process_due_leave_auto_approvals(limit=limit)


def current(request):
    workflow = WorkflowInstance.objects.get(pk=request.workflow_reference)
    return workflow.step_instances.get(step_order=workflow.current_step_order)


def balances(employee):
    balance = employee.leave_balances.get(period_year=2026)
    return balance.reserved_amount, balance.consumed_amount, balance.closing_balance


@pytest.mark.parametrize("enabled,hours,valid", [(False,None,True),(True,72,True),(True,None,False),(True,0,False),(True,-1,False),(True,1.5,False),(True,True,False),(True,10**20,False)])
def test_policy_flag_and_hours_validation(enabled, hours, valid):
    serializer = HrAdminLeaveApprovalConfigSerializer(data={"default_route":"manager_only", "auto_approve_enabled":enabled,"auto_approve_after_hours":hours})
    assert serializer.is_valid() is valid, serializer.errors


def test_deadline_boundary_and_final_approval_are_audited_and_idempotent():
    tenant, employee, _, _, _, request = scope()
    assert current(request).due_at == DUE
    assert balances(employee) == (Decimal("1"), Decimal("0"), Decimal("19"))
    assert process(DUE-timedelta(microseconds=1))["approved_steps"] == 0
    assert process()["approved_steps"] == 1
    request.refresh_from_db(); assert request.status == "approved"
    assert balances(employee) == (Decimal("0"), Decimal("1"), Decimal("19"))
    workflow = WorkflowInstance.objects.get(pk=request.workflow_reference)
    assert workflow.action_logs.filter(action="approve", actor_identifier=SYSTEM_ACTOR).count() == 1
    event = SaasCommercialAuditEvent.objects.get(tenant=tenant, event_type="leave_request_approved")
    assert event.actor_identifier == SYSTEM_ACTOR
    assert request.metadata["automatic_approvals"][0]["deadline"] == DUE.isoformat()
    before = LeaveBalanceTransaction.objects.count()
    assert process()["approved_steps"] == 0
    assert LeaveBalanceTransaction.objects.count() == before


@pytest.mark.parametrize("first_decision", ["manual", "automatic"])
def test_timer_is_per_active_step_and_preserves_multi_step_approval(first_decision):
    _, employee, manager, _, _, request = scope(route="manager_then_hr")
    if first_decision == "manual":
        first_time = START+timedelta(hours=24)
        with patch("django.utils.timezone.now", return_value=first_time):
            resolve_leave_request(leave_request=request, actor_employee=manager, approve=True)
    else:
        first_time = DUE
        assert process(first_time)["approved_steps"] == 1
    request.refresh_from_db(); assert request.status == "partially_approved"
    assert balances(employee) == (Decimal("1"), Decimal("0"), Decimal("19"))
    assert current(request).step_order == 2
    assert current(request).due_at == first_time+timedelta(hours=72)
    assert process(first_time+timedelta(hours=71))["approved_steps"] == 0
    assert process(first_time+timedelta(hours=72))["approved_steps"] == 1
    request.refresh_from_db(); assert request.status == "approved"
    assert balances(employee) == (Decimal("0"), Decimal("1"), Decimal("19"))


def test_policy_off_switch_stops_pending_decisions_and_hours_remain_snapshotted():
    _, _, _, policy, _, request = scope()
    policy.config_snapshot["approval"].update(auto_approve_enabled=False, auto_approve_after_hours=1)
    policy.save(update_fields=["config_snapshot"])
    assert process()["approved_steps"] == 0
    policy.config_snapshot["approval"]["auto_approve_enabled"] = True
    policy.save(update_fields=["config_snapshot"])
    assert process(START+timedelta(hours=2))["approved_steps"] == 0
    assert current(request).due_at == DUE
    assert process()["approved_steps"] == 1


def test_enabling_policy_never_retroactively_arms_existing_requests():
    _, _, _, policy, _, request = scope(enabled=False)
    assert current(request).due_at is None
    policy.config_snapshot["approval"]["auto_approve_enabled"] = True; policy.save(update_fields=["config_snapshot"])
    with patch("django.utils.timezone.now", return_value=START):arm_leave_auto_approval(request)
    assert current(request).due_at is None
    assert process()["approved_steps"] == 0


@pytest.mark.parametrize("action", ["approve", "reject", "withdraw", "cancel"])
def test_resolved_withdrawn_and_cancellation_requests_are_not_auto_decided(action):
    _, employee, manager, _, _, request = scope()
    with patch("django.utils.timezone.now", return_value=START+timedelta(hours=1)):
        if action == "withdraw":withdraw_leave_request(leave_request=request, actor_employee=employee, reason="Withdraw")
        else:
            resolve_leave_request(leave_request=request, actor_employee=manager, approve=action!="reject")
            if action == "cancel":cancel_leave_request(leave_request=request, actor_employee=employee, reason="Cancel")
    request.refresh_from_db(); before = request.status, balances(employee), LeaveBalanceTransaction.objects.count()
    assert process()["approved_steps"] == 0
    request.refresh_from_db()
    assert before == (request.status, balances(employee), LeaveBalanceTransaction.objects.count())


def test_foreign_workflow_reference_cannot_drive_a_decision():
    _, _, _, _, _, request = scope()
    _, _, _, _, _, foreign = scope("auto-foreign")
    request.workflow_reference = foreign.workflow_reference; request.save(update_fields=["workflow_reference"])
    assert process()["approved_steps"] == 1  # Only the real foreign request's own workflow.
    request.refresh_from_db(); foreign.refresh_from_db()
    assert request.status == "pending" and foreign.status == "approved"


def test_missing_approver_blocks_without_changing_request_or_ledger():
    _, employee, _, _, _, request = scope()
    current(request).assignments.all().delete()
    assert process()["blocked"] == 1
    request.refresh_from_db(); assert request.status == "pending"
    assert balances(employee) == (Decimal("1"), Decimal("0"), Decimal("19"))
    assert request.metadata.get("automatic_approvals") is None
    assert not WorkflowInstance.objects.get(pk=request.workflow_reference).action_logs.filter(action="approve").exists()


def test_committed_policy_updates_require_permission_and_same_tenant():
    tenant, policy, client = source("auto-api")
    role = tenant.roles.get(code="hr-admin")
    url = f"/api/v1/hr-admin/leave-policies/{policy.pk}/"
    payload = {"config_snapshot":{"approval":{"default_route":"manager_only","auto_approve_enabled":True,"auto_approve_after_hours":72}}}
    assert client.patch(url, payload, format="json").status_code == 403
    RolePermission.objects.create(role=role,permission_key="leave.policies.manage")
    response = client.patch(url, payload, format="json")
    assert response.status_code == 200, response.data
    assert client.get(url).data["config_snapshot"]["approval"]["auto_approve_after_hours"] == 72
    _, other, _ = source("auto-api-foreign")
    assert client.patch(f"/api/v1/hr-admin/leave-policies/{other.pk}/",payload,format="json").status_code == 404
    anonymous=APIClient(); assert anonymous.patch(url,payload,format="json").status_code in (401,403)
    assert not other.config_snapshot


def test_closed_period_rolls_back_workflow_audit_and_consumption():
    _, employee, _, policy, period, request = scope()
    from apps.leave_management.models import LeavePolicyPeriod
    from apps.leave_management.year_end_services import create_leave_year_close_run, execute_leave_year_close_run, transition_leave_policy_period
    target = LeavePolicyPeriod.objects.create(tenant=employee.tenant, leave_policy=policy, code="next",start_date=datetime(2027,4,1).date(),end_date=datetime(2028,3,31).date(),status="open")
    execute_leave_year_close_run(create_leave_year_close_run(source_period=period,target_period=target,actor_employee=employee,idempotency_key="auto-close",carry_forward_cap=Decimal("19")))
    actor=get_user_model().objects.create_user(username="auto-close-admin",email="auto-close-admin@example.test",is_superuser=True)
    transition_leave_policy_period(policy_period=period,action="close",actor=actor,reason="Synthetic",idempotency_key="auto-close-period")
    before=balances(employee),LeaveBalanceTransaction.objects.count(),SaasCommercialAuditEvent.objects.count()
    assert process()["blocked"] == 1
    request.refresh_from_db(); assert request.status == "pending"
    assert before == (balances(employee),LeaveBalanceTransaction.objects.count(),SaasCommercialAuditEvent.objects.count())
    assert not WorkflowInstance.objects.get(pk=request.workflow_reference).action_logs.filter(action="approve").exists()


@pytest.mark.parametrize("competitor", ["worker", "approve", "reject", "withdraw"])
def test_concurrent_manual_and_automatic_decisions_preserve_one_ledger_outcome(competitor):
    _, employee, manager, _, _, request = scope()
    barrier=Barrier(2)
    def run(which):
        close_old_connections()
        try:
            barrier.wait(timeout=15)
            if which=="worker":return process()
            with patch("django.utils.timezone.now",return_value=DUE):
                if which=="withdraw":withdraw_leave_request(leave_request=request,actor_employee=employee,reason="Concurrent")
                else:resolve_leave_request(leave_request=request,actor_employee=manager,approve=which=="approve")
            return "manual"
        except ValidationError:return "stale"
        finally:close_old_connections()
    with patch("django.utils.timezone.now",return_value=DUE),ThreadPoolExecutor(max_workers=2)as pool:
        a=pool.submit(run,"worker");b=pool.submit(run,competitor);a.result(timeout=30);b.result(timeout=30)
    request.refresh_from_db()
    assert request.status in ("approved","rejected","withdrawn")
    assert WorkflowInstance.objects.get(pk=request.workflow_reference).action_logs.filter(action__in=("approve","reject")).count() <= 1
    expected = (Decimal("0"),Decimal("1"),Decimal("19")) if request.status=="approved" else (Decimal("0"),Decimal("0"),Decimal("20"))
    assert balances(employee)==expected


def test_locked_request_is_skipped_and_remains_due_for_retry():
    _, _, _, _, _, request=scope()
    def worker():
        close_old_connections()
        try:return process()
        finally:close_old_connections()
    with transaction.atomic(),ThreadPoolExecutor(max_workers=1)as pool:
        LeaveRequest.objects.select_for_update().get(pk=request.pk)
        assert pool.submit(worker).result(timeout=15)["skipped"]==1
    assert process()["approved_steps"]==1


def test_registered_task_uses_due_processor_and_reports_unexpected_failures():
    scope()
    with patch("django.utils.timezone.now",return_value=DUE):
        assert process_due_leave_auto_approvals_task.apply(throw=True).result["approved_steps"]==1
    with patch("apps.leave_management.auto_approval.process_due_leave_auto_approvals",return_value={"failed":1}):
        with pytest.raises(RuntimeError):process_due_leave_auto_approvals_task.apply(throw=True)


def test_blocked_candidates_do_not_starve_other_due_requests():
    _, _, _, _, _, blocked=scope("auto-blocked")
    step=current(blocked);step.assignments.all().delete()
    WorkflowStepInstance.objects.filter(pk=step.pk).update(updated_at=START-timedelta(hours=1))
    _, _, _, _, _, ready=scope("auto-ready")
    assert process(limit=1)["blocked"]==1
    assert process(limit=1)["approved_steps"]==1
    ready.refresh_from_db();blocked.refresh_from_db()
    assert ready.status=="approved" and blocked.status=="pending"


@pytest.mark.parametrize("approve",[True,False])
def test_system_decision_cannot_impersonate_a_human(approve):
    _, employee, manager, _, _, request=scope()
    with patch("django.utils.timezone.now",return_value=DUE),pytest.raises(ValidationError):
        resolve_leave_request(leave_request=request,actor_employee=manager,approve=approve,_automatic_approval=True)
    request.refresh_from_db();assert request.status=="pending"
    assert balances(employee)==(Decimal("1"),Decimal("0"),Decimal("19"))


def test_synthetic_queue_fixture_uses_a_current_working_day(tmp_path):
    from datetime import date
    from django.core.management import call_command
    from apps.tenants.models import Tenant
    seed="auto-fixture-working-day"
    with patch("django.utils.timezone.localdate",return_value=date(2026,10,24)):
        call_command("manage_playwright_workspace",seed_ref=seed,output_file=str(tmp_path/'workspace.json'))
    tenant=Tenant.objects.get(code='pw-qa-'+seed)
    assert tenant.leave_requests.get(status='pending').start_date==date(2026,10,26)
    call_command("manage_playwright_workspace",seed_ref=seed,cleanup=True)
    assert not Tenant.objects.filter(pk=tenant.pk).exists()


def test_expired_synthetic_fixture_horizon_rolls_back_without_policy_bypass(tmp_path):
    from datetime import date
    from django.core.management import call_command, CommandError
    from apps.tenants.models import Tenant
    before=Tenant.objects.count(),get_user_model().objects.count()
    with patch("django.utils.timezone.localdate",return_value=date(2027,1,1)),pytest.raises(CommandError,match='fixture policy period'):
        call_command("manage_playwright_workspace",seed_ref='auto-fixture-expired',output_file=str(tmp_path/'expired.json'))
    assert before==(Tenant.objects.count(),get_user_model().objects.count())
