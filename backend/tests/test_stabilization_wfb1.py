"""Bounded WF-B.1 lifecycle contract; disposable PostgreSQL synthetic tenants only."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch
import json
import pytest
from django.db import connection, close_old_connections
from django.utils import timezone
from rest_framework.test import APIClient
from apps.attendance.models import EmployeeShiftAssignment, AttendancePeriodClose, AttendanceRecord, ShiftRosterTemplate, ShiftRosterRollout, ShiftRosterRolloutItem
from apps.attendance.services import _find_matching_employee_shift_assignment, preview_employee_shift_assignment_conflicts, preview_shift_roster_template_rollout, AttendanceDerivationContext
from apps.common.models import SaasCommercialAuditEvent
from apps.payroll.models import PayrollPeriod
from test_shift_p5_closure import scope

pytestmark = pytest.mark.django_db(transaction=True)
URL='/api/v1/hr-admin/employee-shift-assignments/'

def assignment(scope, start=10, end=20):
    tenant,actor,client=scope
    return EmployeeShiftAssignment.objects.create(tenant=tenant,employee=tenant.employees.get(employee_code='QA-MGR-002'),shift=tenant.shifts.first(),effective_from=timezone.localdate()+timedelta(days=start),effective_to=timezone.localdate()+timedelta(days=end) if end is not None else None)

def body(item,action='cancel',**extra):
    return dict(action=action, expected_updated_at=item.updated_at.isoformat(),reason='Synthetic approved lifecycle test',acknowledge_schedule_change=True,**extra)

def post(scope,item,data):return scope[2].post(f'{URL}{item.id}/',data,format='json')

def events(item):return SaasCommercialAuditEvent.objects.filter(tenant=item.tenant,event_snapshot__assignment_id=str(item.id))

def test_current_postgresql_identity(record_property):
    with connection.cursor() as q:q.execute('select current_database(),current_user,current_schema(),inet_server_port(),version()');v=q.fetchone()
    assert connection.vendor=='postgresql' and v[:4]==('test_hrms_wfb1','hrms_qa','public',55492)
    record_property('database_identity',json.dumps(v))

def test_cancel_retains_original_window_excludes_resolution_conflicts_and_replay(scope,record_property):
    item=assignment(scope);original=(item.effective_from,item.effective_to,item.config_snapshot)
    payload=body(item);r=post(scope,item,payload);assert r.status_code==200,r.data
    item.refresh_from_db();assert item.cancelled_at and (item.effective_from,item.effective_to,item.config_snapshot)==original
    assert r.data['lifecycle_state']=='cancelled' and r.data['lifecycle_action']==''
    assert _find_matching_employee_shift_assignment(employee=item.employee,attendance_date=item.effective_from) is None
    check=preview_employee_shift_assignment_conflicts(tenant=item.tenant,employee=item.employee,shift=item.shift,effective_from=item.effective_from,effective_to=item.effective_to,is_primary=True)
    assert not check['has_conflicts'];assert events(item).count()==1
    record=AttendanceRecord.objects.create(tenant=item.tenant,employee=item.employee,attendance_date=item.effective_from)
    assert AttendanceDerivationContext.for_records([record]).shift_assignment_for(item.employee,item.effective_from) is None
    event=events(item).get();assert event.actor_identifier and event.event_snapshot['reason']==payload['reason']
    assert post(scope,item,payload).status_code==409;assert events(item).count()==1
    record_property('retained_row_and_audit',json.dumps({'id':str(item.id),'snapshot':item.lifecycle_snapshot,'audit_count':1}))

@pytest.mark.parametrize('last_offset',[0,2])
def test_active_end_is_inclusive_and_preserves_attendance(scope,last_offset):
    item=assignment(scope,-10,None);tenant=item.tenant
    before=list(AttendanceRecord.objects.filter(tenant=tenant).order_by('id').values())
    last=timezone.localdate()+timedelta(days=last_offset)
    r=post(scope,item,body(item,'end',last_working_date=str(last)));assert r.status_code==200,r.data
    item.refresh_from_db();assert item.effective_to==last and item.lifecycle_snapshot['previous_effective_to'] is None
    assert _find_matching_employee_shift_assignment(employee=item.employee,attendance_date=last).id==item.id
    assert _find_matching_employee_shift_assignment(employee=item.employee,attendance_date=last+timedelta(days=1)) is None
    assert list(AttendanceRecord.objects.filter(tenant=tenant).order_by('id').values())==before
    assert events(item).get().event_type=='attendance_shift_assignment_ended'

@pytest.mark.parametrize('start,end,action,last',[(0,10,'cancel',None),(-3,-1,'end',0),(-3,10,'end',-1),(-3,10,'end',10),(-3,10,'end',11),(3,10,'end',5),(-3,10,'end',None)])
def test_invalid_lifecycle_boundaries_non_effect(scope,start,end,action,last):
    item=assignment(scope,start,end);before=item.updated_at
    data=body(item,action,**({'last_working_date':str(timezone.localdate()+timedelta(days=last))} if last is not None else {}))
    assert post(scope,item,data).status_code==400;item.refresh_from_db();assert item.updated_at==before and events(item).count()==0

@pytest.mark.parametrize('field,value',[('reason','   '),('expected_updated_at',None),('acknowledge_schedule_change',False)])
def test_required_contract(scope,field,value):
    item=assignment(scope);data=body(item);data[field]=value
    assert post(scope,item,data).status_code==400;item.refresh_from_db();assert not item.cancelled_at and not events(item).exists()

@pytest.mark.parametrize('status',['locked','closed'])
def test_payroll_closed_period_is_read_only_guard(scope,status):
    item=assignment(scope);period=PayrollPeriod.objects.filter(tenant=item.tenant).first()
    # Direct synthetic fixture only; never invoke Payroll operations.
    PayrollPeriod.objects.filter(pk=period.pk).update(start_date=item.effective_from,end_date=item.effective_to,status=status)
    before=list(PayrollPeriod.objects.filter(pk=period.pk).values())
    r=post(scope,item,body(item));assert r.status_code==400,r.data
    assert list(PayrollPeriod.objects.filter(pk=period.pk).values())==before
    item.refresh_from_db();assert not item.cancelled_at and not events(item).exists()

@pytest.mark.parametrize('old_closed',[False,True])
def test_closed_attendance_only_affected_range(scope,old_closed):
    item=assignment(scope,-10,20);today=timezone.localdate()
    close=AttendancePeriodClose.objects.create(tenant=item.tenant,legal_entity=item.employee.legal_entity,period_start=today-timedelta(days=10) if old_closed else today+timedelta(days=3),period_end=today-timedelta(days=1) if old_closed else today+timedelta(days=10),status='closed',snapshot_hash='synthetic-owned',reconciliation_snapshot={'fixture':True},idempotency_key='b1-synthetic')
    before=AttendancePeriodClose.objects.values().get(pk=close.pk)
    r=post(scope,item,body(item,'end',last_working_date=str(today+timedelta(days=1))))
    assert r.status_code==(200 if old_closed else 400),r.data
    assert AttendancePeriodClose.objects.values().get(pk=close.pk)==before

@pytest.mark.parametrize('role',['QA-EMP-001','QA-MGR-001','QA-MGR-002'])
def test_denied_roles(scope,role):
    item=assignment(scope);actor=item.tenant.employees.filter(employee_code=role).first()
    client=APIClient();client.force_authenticate(actor.membership.user)
    r=client.post(f'{URL}{item.id}/',body(item),format='json');assert r.status_code==403,r.data
    item.refresh_from_db();assert not item.cancelled_at and not events(item).exists()

def test_foreign_tenant_and_unauthenticated(scope):
    item=assignment(scope);from uuid import uuid4
    assert scope[2].post(f'{URL}{uuid4()}/',body(item),format='json').status_code==404
    assert APIClient().post(f'{URL}{item.id}/',body(item),format='json').status_code in [401,403]

def test_audit_failure_rolls_back(scope):
    item=assignment(scope)
    with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('synthetic audit outage')):
        with pytest.raises(RuntimeError):post(scope,item,body(item))
    item.refresh_from_db();assert not item.cancelled_at and not item.lifecycle_snapshot

@pytest.mark.parametrize('other',['cancel','update'])
def test_concurrent_lifecycle_serializes_and_rejects_stale(scope,other,record_property):
    item=assignment(scope);user=scope[1].membership.user;barrier=Barrier(2);data=body(item)
    def worker(mode):
        close_old_connections();client=APIClient();client.force_authenticate(user);barrier.wait()
        try:
            if mode=='update':r=client.patch(f'{URL}{item.id}/',{'expected_updated_at':data['expected_updated_at'],'effective_to':str(item.effective_to+timedelta(days=1))},format='json')
            else:r=client.post(f'{URL}{item.id}/',data,format='json')
            return r.status_code
        finally:close_old_connections()
    with ThreadPoolExecutor(2) as pool:results=list(pool.map(worker,['cancel',other]))
    assert sorted(results)==[200,409],results;item.refresh_from_db();assert events(item).count()==1
    record_property('competing_results',json.dumps(results))

def test_roster_assignment_preserves_rollout_links_and_allows_new_primary(scope):
    tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');shift=tenant.shifts.first();today=timezone.localdate()
    template=ShiftRosterTemplate.objects.create(tenant=tenant,shift=shift,code='b1-owned',name='B1 synthetic',status='published')
    args=dict(tenant=tenant,template=template,employee_queryset=tenant.employees.filter(pk=employee.pk),effective_from=today+timedelta(days=10),effective_to=today+timedelta(days=20),is_primary=True,actor=actor)
    result=preview_shift_roster_template_rollout(**args,dry_run=False);link=ShiftRosterRolloutItem.objects.get(rollout_id=result['rollout_id']);item=link.assignment
    before=ShiftRosterRolloutItem.objects.values().get(pk=link.pk);header=ShiftRosterRollout.objects.values().get(pk=result['rollout_id'])
    assert post(scope,item,body(item)).status_code==200
    assert ShiftRosterRolloutItem.objects.values().get(pk=link.pk)==before
    assert ShiftRosterRollout.objects.values().get(pk=result['rollout_id'])==header
    assert preview_shift_roster_template_rollout(**args,dry_run=True)['created_count']==1

@pytest.mark.parametrize('mode',['historical','cancelled','ended','active'])
def test_generic_patch_cannot_bypass_history(scope,mode):
    item=assignment(scope,-10,-1) if mode=='historical' else assignment(scope,-10,20) if mode in ['active','ended'] else assignment(scope)
    if mode=='cancelled':assert post(scope,item,body(item)).status_code==200
    if mode=='ended':assert post(scope,item,body(item,'end',last_working_date=str(timezone.localdate()+timedelta(days=2)))).status_code==200
    item.refresh_from_db();before=item.updated_at
    r=scope[2].patch(f'{URL}{item.id}/',{'effective_to':str(timezone.localdate()+timedelta(days=30)),'expected_updated_at':item.updated_at.isoformat()},format='json')
    assert r.status_code==400,r.data;item.refresh_from_db();assert item.updated_at==before


def test_explicit_permission_denial(scope):
    from apps.iam.models import RolePermission
    item=assignment(scope)
    RolePermission.objects.filter(role__tenant=item.tenant,permission_key='attendance.policies.manage').delete()
    assert post(scope,item,body(item)).status_code==403
    item.refresh_from_db();assert not item.cancelled_at and not events(item).exists()


def test_actual_cross_tenant_id_denied(scope):
    from contextlib import redirect_stdout
    from io import StringIO
    from uuid import uuid4
    from django.core.management import call_command
    from apps.tenants.models import Tenant
    item=assignment(scope);seed='b1-'+uuid4().hex[:10]
    with redirect_stdout(StringIO()):call_command('manage_playwright_workspace',seed_ref=seed)
    foreign=Tenant.objects.get(code='pw-qa-'+seed);actor=foreign.employees.get(employee_code='QA-HR-001')
    client=APIClient();client.force_authenticate(actor.membership.user)
    assert client.post(f'{URL}{item.id}/',body(item),format='json').status_code==404
    item.refresh_from_db();assert not item.cancelled_at and not events(item).exists()


def test_locked_attendance_record_non_effect(scope):
    item=assignment(scope);record=AttendanceRecord.objects.create(tenant=item.tenant,employee=item.employee,attendance_date=item.effective_from,is_locked=True)
    before=AttendanceRecord.objects.values().get(pk=record.pk)
    assert post(scope,item,body(item)).status_code==400
    assert AttendanceRecord.objects.values().get(pk=record.pk)==before
