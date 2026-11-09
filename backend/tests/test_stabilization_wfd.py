"""WF-D targeted PostgreSQL contention and audit regression, synthetic only."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier, Event, Lock
from unittest.mock import patch
import pytest
from django.db import close_old_connections, connection
from django.core.exceptions import ValidationError
from apps.employees.models import Employee
from apps.leave_management import services
from apps.leave_management.models import LeaveRequest, LeaveBalanceTransaction
from tests.test_leave_policy_auto_approval import scope, START

pytestmark=pytest.mark.django_db(transaction=True)

def test_simultaneous_overlapping_submissions_have_one_effect(record_property):
    assert connection.vendor=='postgresql'
    tenant,employee,manager,policy,period,request=scope('wfd-race',enabled=False)
    start=Barrier(2);second=Event();mutex=Lock();calls=0
    original=services._find_overlapping_active_leave_request
    def coordinated(**kwargs):
        nonlocal calls
        result=original(**kwargs)
        with mutex:
            calls+=1;number=calls
        if number==1:
            # Old implementation permits both empty overlap reads. With an employee
            # lock the second reader cannot enter until first transaction commits.
            second.wait(2)
        elif number==2:second.set()
        return result
    def submit():
        close_old_connections()
        try:
            owner=Employee.objects.select_related('tenant','membership','reporting_manager__membership').get(pk=employee.pk)
            start.wait(10)
            try:
                item=services.submit_leave_request(employee=owner,leave_type=policy.leave_type,start_date=date(2026,5,18),end_date=date(2026,5,18),start_day_portion='full_day',end_day_portion='full_day',reason='WF-D synthetic race')
                return 'created'
            except ValidationError:return 'conflict'
        finally:close_old_connections()
    with patch('django.utils.timezone.now',return_value=START),patch.object(services,'_find_overlapping_active_leave_request',side_effect=coordinated),ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:submit(),range(2)))
    record_property('responses',str(results))
    assert sorted(results)==['conflict','created'],results
    assert LeaveRequest.objects.filter(tenant=tenant,reason='WF-D synthetic race').count()==1

from contextlib import redirect_stdout
from io import StringIO
from uuid import uuid4
from django.core.management import call_command
from apps.tenants.models import Tenant

@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("action", ["approve", "reject"])
def test_withdrawn_request_denies_stale_manager_and_preserves_balance(action):
    from rest_framework.test import APIClient
    from apps.leave_management.models import LeaveRequest

    seed = f"stale-{uuid4().hex[:12]}"
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed)
    tenant = Tenant.objects.get(code=f"pw-qa-{seed}")
    employee = tenant.employees.get(employee_code="QA-EMP-001")
    manager = employee.reporting_manager
    item = LeaveRequest.objects.get(employee=employee, status="pending")
    client = APIClient()
    client.force_authenticate(employee.membership.user)
    assert client.post(
        f"/api/v1/me/leave-requests/{item.id}/withdraw/",
        {
            "reason": "Synthetic withdrawal",
            "attachment_reference": "synthetic-withdrawal-evidence.pdf",
        },
        format="json",
    ).status_code == 200
    balance = employee.leave_balances.get(leave_policy=item.leave_policy)
    balance.refresh_from_db()
    before = (balance.reserved_amount, balance.consumed_amount, balance.closing_balance, balance.transactions.count())
    client.force_authenticate(manager.membership.user)
    response = client.post(f"/api/v1/manager/leave-requests/{item.id}/{action}/", {"comment": "Stale decision must be rejected"}, format="json")
    assert response.status_code in (400, 404), response.data
    assert "already been resolved" in str(response.data) or "not found for manager scope" in str(response.data)
    item.refresh_from_db()
    balance.refresh_from_db()
    assert item.status == "withdrawn"
    assert (balance.reserved_amount, balance.consumed_amount, balance.closing_balance, balance.transactions.count()) == before
    with redirect_stdout(StringIO()):
        call_command("manage_playwright_workspace", seed_ref=seed, cleanup=True)


def test_blank_leave_rejection_preserves_pending_request_and_balance():
    # Existing frozen LV-E2E-0406 and UI require a rejection reason.
    tenant,employee,manager,policy,period,request=scope('wfd-blank',enabled=False)
    before=list(employee.leave_balances.values('reserved_amount','consumed_amount','closing_balance'))
    with pytest.raises(ValidationError):
        services.resolve_leave_request(leave_request=request,actor_employee=manager,approve=False,comment='  ')
    request.refresh_from_db();assert request.status=='pending'
    assert list(employee.leave_balances.values('reserved_amount','consumed_amount','closing_balance'))==before


def test_leave_decision_audit_failure_rolls_back_balances_and_request():
    tenant,employee,manager,policy,period,request=scope('wfd-audit',enabled=False)
    before=list(employee.leave_balances.values('reserved_amount','consumed_amount','closing_balance'))
    with patch('apps.common.selectors.record_saas_commercial_audit_event',side_effect=RuntimeError('WF-D synthetic audit failure')):
        with pytest.raises(RuntimeError):services.resolve_leave_request(leave_request=request,actor_employee=manager,approve=True,comment='WF-D audited approval')
    request.refresh_from_db();assert request.status=='pending'
    assert list(employee.leave_balances.values('reserved_amount','consumed_amount','closing_balance'))==before


def test_hr_and_manager_leave_api_tenant_and_role_isolation():
    from rest_framework.test import APIClient
    from apps.leave_management.models import LeavePolicy,LeaveType
    tenants=[]
    for _ in range(2):
        seed='wfd-security-'+uuid4().hex[:10]
        with redirect_stdout(StringIO()):call_command('manage_playwright_workspace',seed_ref=seed)
        tenants.append(Tenant.objects.get(code='pw-qa-'+seed))
    own,foreign=tenants;client=APIClient();hr=own.employees.get(employee_code='QA-HR-001');client.force_authenticate(hr.membership.user)
    for route,model in [('leave-types',LeaveType),('leave-policies',LeavePolicy)]:
        item=model.objects.filter(tenant=foreign).first();before=item.name
        url=f'/api/v1/hr-admin/{route}/{item.pk}/'
        assert client.get(url).status_code==404
        assert client.patch(url,{'name':'WF-D unauthorized change'},format='json').status_code==404
        item.refresh_from_db();assert item.name==before
    employee=own.employees.get(employee_code='QA-EMP-001');client.force_authenticate(employee.membership.user)
    for route in ['leave-types','leave-policies','leave-balances','leave-requests']:
        assert client.get('/api/v1/hr-admin/'+route+'/').status_code==403
    manager=own.employees.get(employee_code='QA-MGR-001');client.force_authenticate(manager.membership.user)
    item=LeaveRequest.objects.filter(tenant=foreign,status='pending').first()
    before=list(LeaveBalanceTransaction.objects.filter(tenant=foreign).values())
    for action in ['approve','reject']:
        assert client.post(f'/api/v1/manager/leave-requests/{item.pk}/{action}/',{'comment':'WF-D forbidden'},format='json').status_code==404
    item.refresh_from_db();assert item.status=='pending'
    assert list(LeaveBalanceTransaction.objects.filter(tenant=foreign).values())==before
    client.force_authenticate(None)
    assert client.get('/api/v1/hr-admin/leave-types/').status_code in (401,403)


@pytest.mark.parametrize('role',['hr','manager'])
def test_blank_rejection_api_is_readable_400_and_immutable(role):
    from rest_framework.test import APIClient
    seed='wfd-note-'+uuid4().hex[:10]
    with redirect_stdout(StringIO()):call_command('manage_playwright_workspace',seed_ref=seed)
    tenant=Tenant.objects.get(code='pw-qa-'+seed);item=LeaveRequest.objects.get(tenant=tenant,status='pending')
    actor=tenant.employees.get(employee_code='QA-HR-001' if role=='hr' else 'QA-MGR-001')
    client=APIClient();client.force_authenticate(actor.membership.user)
    before=list(LeaveBalanceTransaction.objects.filter(tenant=tenant).values())
    prefix='hr-admin' if role=='hr' else 'manager'
    result=client.post(f'/api/v1/{prefix}/leave-requests/{item.pk}/reject/',{'comment':'  '},format='json')
    assert result.status_code==400,result.data
    assert 'comment' in result.data
    item.refresh_from_db();assert item.status=='pending'
    assert list(LeaveBalanceTransaction.objects.filter(tenant=tenant).values())==before
    accepted=client.post(f'/api/v1/{prefix}/leave-requests/{item.pk}/reject/',{'comment':'WF-D valid rejection reason'},format='json')
    assert accepted.status_code==200,accepted.data
    item.refresh_from_db();assert item.status=='rejected' and item.rejection_reason=='WF-D valid rejection reason'
