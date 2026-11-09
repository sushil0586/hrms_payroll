"""Focused dependency proof only: no frozen WF03 plan execution or policy implementation."""
from datetime import date,time
import json
import pytest
from django.db import connection
from apps.attendance.models import Shift,EmployeeShiftAssignment
from apps.attendance.services import resolve_employee_work_day
from test_shift_p5_closure import scope,snapshot
pytestmark=pytest.mark.django_db(transaction=True)

def test_observed_disposable_postgresql_test_identity(record_property):
    with connection.cursor() as q:
        q.execute('select current_database(),current_user,current_schema(),inet_server_port(),version()');identity=q.fetchone()
    assert connection.vendor=='postgresql' and identity[:4]==('test_hrms_shift_pilot','hrms_pilot','public',55469)
    record_property('observed_database_identity',json.dumps(identity))

@pytest.mark.parametrize('day,kind,off',[(12,'temporary_override',False),(10,'weekly_rotation',False),(15,'weekly_rotation',True),(26,'fixed',False)])
def test_existing_precedence_and_explicit_off_resolution(scope,day,kind,off,record_property):
    tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-EMP-001')
    EmployeeShiftAssignment.objects.filter(employee=employee).delete()
    shifts=[Shift.objects.create(tenant=tenant,code='dependency-'+str(i),name='Dependency '+str(i),start_time=time(9),end_time=time(17),working_hours=8,weekly_off_days=[]) for i in range(3)]
    EmployeeShiftAssignment.objects.create(tenant=tenant,employee=employee,shift=shifts[0],assignment_kind='fixed',effective_from=date(2049,1,1),is_primary=True)
    EmployeeShiftAssignment.objects.create(tenant=tenant,employee=employee,shift=shifts[1],assignment_kind='weekly_rotation',effective_from=date(2049,1,10),effective_to=date(2049,1,25),is_primary=False,config_snapshot={'rotation':{'anchor_date':'2049-01-10','entries':[{'position':0,'entry_kind':'work','shift_id':str(shifts[1].id),'span_days':2},{'position':1,'entry_kind':'off','shift_id':None,'span_days':1}]}})
    EmployeeShiftAssignment.objects.create(tenant=tenant,employee=employee,shift=shifts[2],assignment_kind='temporary_override',effective_from=date(2049,1,12),effective_to=date(2049,1,13),is_primary=False)
    result=resolve_employee_work_day(employee=employee,work_date=date(2049,1,day))
    assert result['assignment_kind']==kind
    assert (result['day_type']=='weekly_off')==off
    if off:assert result['shift_id'] is None
    else:assert result['shift_id']==str(shifts[['fixed','weekly_rotation','temporary_override'].index(kind)].id)
    record_property('precedence_and_day_resolution',json.dumps(result,default=str))

@pytest.mark.parametrize('role',['employee','manager','manager_b','anonymous'])
def test_conflict_api_denies_unpermitted_roles_without_effect(scope,role):
    tenant,actor,client=scope
    if role=='anonymous':client.force_authenticate(None)
    else:client.force_authenticate(tenant.employees.get(employee_code={'employee':'QA-EMP-001','manager':'QA-MGR-001','manager_b':'QA-MGR-002'}[role]).membership.user)
    before=snapshot(tenant)
    response=client.post('/api/v1/hr-admin/employee-shift-assignments/conflicts/',{'employee_id':str(actor.id),'shift_id':str(tenant.shifts.first().id),'effective_from':'2049-01-01'},format='json')
    assert response.status_code in [401,403];assert snapshot(tenant)==before
