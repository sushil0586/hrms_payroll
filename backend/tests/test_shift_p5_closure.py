"""Prompt 5: current PostgreSQL API/persistence, boundary and concurrency evidence.
Uses only the disposable pytest database; fixtures are synthetic, not shared services.
"""
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
from datetime import date, time
from io import StringIO
from threading import Barrier, local
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from django.core.management import call_command
from django.db import close_old_connections, connection
from rest_framework.test import APIClient
from apps.attendance.models import Shift, EmployeeShiftAssignment
from apps.attendance.services import _find_matching_employee_shift_assignment, _shift_window_datetimes
from apps.common.models import SaasCommercialAuditEvent
from apps.tenants.models import Tenant

pytestmark = pytest.mark.django_db(transaction=True)
SH = '/api/v1/hr-admin/shifts/'
AS = '/api/v1/hr-admin/employee-shift-assignments/'

@pytest.fixture
def scope():
    assert connection.vendor == 'postgresql'
    seed = 'p5-' + uuid4().hex[:12]
    with redirect_stdout(StringIO()):
        call_command('manage_playwright_workspace', seed_ref=seed)
    tenant = Tenant.objects.get(code='pw-qa-' + seed)
    actor = tenant.employees.get(employee_code='QA-HR-001')
    client = APIClient(); client.force_authenticate(actor.membership.user)
    return tenant, actor, client

def body(**extra):
    return dict(code='p5-boundary', name='Synthetic P5 shift', start_time='22:00', end_time='06:00', working_hours='8.00', is_night_shift=True, weekly_off_days=['sunday'], **extra)

def snapshot(tenant):
    return (list(Shift.objects.filter(tenant=tenant).order_by('id').values()), list(EmployeeShiftAssignment.objects.filter(tenant=tenant).order_by('id').values()), SaasCommercialAuditEvent.objects.filter(tenant=tenant).count())

def test_create_modify_duplicate_audit_and_durable_read(scope):
    tenant, actor, client = scope
    response = client.post(SH, body(), format='json'); assert response.status_code == 201
    item = Shift.objects.get(id=response.data['id']); assert item.tenant_id == tenant.id
    assert (item.start_time, item.end_time, item.weekly_off_days) == (time(22), time(6), ['sunday'])
    assert client.patch(f'{SH}{item.id}/', {'name':'P5 persisted modification'}, format='json').status_code == 200
    item.refresh_from_db(); assert item.name == 'P5 persisted modification'
    assert client.get(f'{SH}{item.id}/').data['name'] == item.name
    events = SaasCommercialAuditEvent.objects.filter(tenant=tenant, event_snapshot__shift_id=str(item.id))
    assert all(event.actor_identifier for event in events)
    assert set(events.values_list('event_type', flat=True)) == {'attendance_shift_created','attendance_shift_updated'}
    before = snapshot(tenant)
    assert client.post(SH, body(), format='json').status_code == 400
    assert snapshot(tenant) == before

@pytest.mark.parametrize('patch', [{'code':''},{'start_time':'25:00'},{'break_minutes':-1},{'grace_in_minutes':-1},{'working_hours':'1000.00'}])
def test_invalid_create_is_immutable(scope, patch):
    tenant, _, client = scope; data=body(); data.update(patch); before=snapshot(tenant)
    assert client.post(SH,data,format='json').status_code == 400
    assert snapshot(tenant) == before

@pytest.mark.parametrize('resource',[SH,AS])
@pytest.mark.parametrize('role',['employee','manager','manager_b','anonymous'])
def test_denied_mutations_leave_business_and_success_audit_unchanged(scope, resource, role):
    tenant, _, client = scope
    if role == 'anonymous': client.force_authenticate(None)
    else:
        code={'employee':'QA-EMP-001','manager':'QA-MGR-001','manager_b':'QA-MGR-002'}[role]
        employee=tenant.employees.get(employee_code=code); client.force_authenticate(employee.membership.user)
    before=snapshot(tenant)
    response=client.post(resource,body(),format='json')
    assert response.status_code in (401,403)
    assert snapshot(tenant)==before

@pytest.mark.parametrize('resource',[SH,AS])
def test_foreign_detail_patch_and_reference_rejection_is_immutable(scope, resource):
    tenant, _, client=scope
    seed='p5-foreign-'+uuid4().hex[:8]
    with redirect_stdout(StringIO()):call_command('manage_playwright_workspace',seed_ref=seed)
    other=Tenant.objects.get(code='pw-qa-'+seed)
    foreign=other.shifts.first() if resource==SH else other.employee_shift_assignments.first()
    before=(snapshot(tenant),snapshot(other))
    assert client.get(f'{resource}{foreign.id}/').status_code==404
    assert client.patch(f'{resource}{foreign.id}/',{'name':'forbidden'},format='json').status_code==404
    if resource==AS:
        response=client.post(AS,{'employee_id':str(other.employees.first().id),'shift_id':str(other.shifts.first().id),'effective_from':'2040-01-01'},format='json')
        assert response.status_code==400
    assert (snapshot(tenant),snapshot(other))==before

@pytest.mark.parametrize('start,end,night,hours',[(time(9),time(17),False,8),(time(22),time(6),False,8),(time(22),time(6),True,8),(time(0),time(0),False,24),(time(23,59),time(0),False,1/60)])
def test_observed_runtime_time_window_contract(scope,start,end,night,hours):
    tenant,_,_=scope
    shift=Shift(tenant=tenant,start_time=start,end_time=end,is_night_shift=night)
    a,b=_shift_window_datetimes(attendance_date=date(2040,1,2),shift=shift,tz=ZoneInfo('Asia/Kolkata'))
    assert (b-a).total_seconds()/3600 == pytest.approx(hours)
    # Observed implementation contract; policy acceptance for equal times is still separate.

def test_inclusive_and_open_ended_assignment_resolution(scope):
    tenant,_,client=scope; employee=tenant.employees.get(employee_code='QA-EMP-001'); shift=tenant.shifts.first()
    EmployeeShiftAssignment.objects.filter(employee=employee).delete()
    response=client.post(AS,{'employee_id':str(employee.id),'shift_id':str(shift.id),'effective_from':'2040-01-02','effective_to':'2040-01-03','is_primary':True},format='json')
    assert response.status_code==201
    assignment=EmployeeShiftAssignment.objects.get(id=response.data['id'])
    for day,wanted in [(1,False),(2,True),(3,True),(4,False)]:
        result=_find_matching_employee_shift_assignment(employee=employee,attendance_date=date(2040,1,day))
        assert (result is not None)==wanted
    before=snapshot(tenant)
    for data in [{'effective_to':'2039-12-31'},{'effective_from':'2040-01-01','effective_to':'2040-01-02'}]:
        response=client.post(AS,{'employee_id':str(employee.id),'shift_id':str(shift.id),**data},format='json')
        assert response.status_code==400
        assert snapshot(tenant)==before
    assert client.patch(f'{AS}{assignment.id}/',{'effective_to':None},format='json').status_code==200
    assert _find_matching_employee_shift_assignment(employee=employee,attendance_date=date(2041,1,1)).id==assignment.id

def test_simultaneous_stale_assignment_updates_have_one_winner_and_one_audit(scope):
    tenant,actor,_=scope
    employee=tenant.employees.get(employee_code='QA-EMP-001')
    item=EmployeeShiftAssignment.objects.create(
        tenant=tenant,
        employee=employee,
        shift=tenant.shifts.first(),
        effective_from=date(2045,1,1),
        effective_to=date(2045,1,31),
        is_primary=True,
    )
    revision=item.updated_at.isoformat(); barrier=Barrier(2)
    before=SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_assignment_updated',event_snapshot__assignment_id=str(item.id)).count()
    user=actor.membership.user
    def update(value):
        close_old_connections()
        try:
            client=APIClient();client.force_authenticate(user);barrier.wait(timeout=10)
            result=client.patch(f'{AS}{item.id}/',{'is_primary':value,'expected_updated_at':revision},format='json')
            return result.status_code,value
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(update,[True,False]))
    assert sorted(status for status,_ in results)==[200,409]
    item.refresh_from_db();assert item.is_primary==next(value for status,value in results if status==200)
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_assignment_updated',event_snapshot__assignment_id=str(item.id)).count()==before+1

def test_simultaneous_overlapping_primary_assignment_creates_are_serialized(scope, monkeypatch):
    """Coordinate before the parent lock; a post-read barrier deadlocks correct locking."""
    from apps.common import api_views
    tenant,actor,_=scope; employee=tenant.employees.get(employee_code='QA-EMP-001')
    EmployeeShiftAssignment.objects.filter(employee=employee).delete()
    barrier=Barrier(2); thread_state=local(); original=api_views.lock_employee_shift_assignment_scope
    def coordinated(**kwargs):
        if not getattr(thread_state, "coordinated", False):
            thread_state.coordinated = True
            barrier.wait(timeout=15)
        return original(**kwargs)
    monkeypatch.setattr(api_views,'lock_employee_shift_assignment_scope',coordinated)
    user=actor.membership.user;shift=tenant.shifts.first()
    def create(index):
        close_old_connections()
        try:
            client=APIClient();client.force_authenticate(user)
            result=client.post(AS,{'employee_id':str(employee.id),'shift_id':str(shift.id),'effective_from':'2042-01-01','effective_to':'2042-01-31','is_primary':True},format='json')
            return result.status_code
        finally:close_old_connections()
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(create,range(2)))
    # A complete overlapping primary window must have one durable business effect.
    assert statuses.count(201)==1, f'Concurrent create statuses: {statuses}; durable rows: {EmployeeShiftAssignment.objects.filter(employee=employee,effective_from=date(2042,1,1)).count()}'
    assert statuses.count(400)+statuses.count(409)==1
    assert EmployeeShiftAssignment.objects.filter(employee=employee,effective_from=date(2042,1,1)).count()==1
