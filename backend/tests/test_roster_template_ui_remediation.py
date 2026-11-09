"""Isolated API coverage for roster template create and unused removal."""
from datetime import date
from unittest.mock import patch
from uuid import uuid4
import pytest
from django.db import connection
from apps.attendance.models import Shift, ShiftRosterTemplate, ShiftRosterRollout
from apps.common.models import SaasCommercialAuditEvent
from apps.tenants.models import Tenant
from test_shift_p5_closure import scope

pytestmark=pytest.mark.django_db(transaction=True)
URL='/api/v1/hr-admin/shift-roster-templates/'

def unused(tenant,**extra):
    return ShiftRosterTemplate.objects.create(tenant=tenant,shift=tenant.shifts.first(),code='unused-'+uuid4().hex[:8],name='Synthetic unused roster',**extra)

@pytest.mark.parametrize('kind',['fixed','weekly_rotation','temporary_override'])
def test_create_from_form_payload_and_duplicate(scope,kind,record_property):
    tenant,actor,client=scope
    with connection.cursor() as cursor:
        cursor.execute('SELECT current_database(),current_user,current_schema(),version()')
        record_property('postgresql_identity',str(cursor.fetchone()))
    body=dict(code='create-'+uuid4().hex[:8],name='Synthetic created roster',description='',status='draft',shift_id=str(tenant.shifts.first().id),assignment_kind=kind,config_snapshot={'rotation':{'pattern_type':'custom_cycle','anchor_date':None,'entries':[{'position':0,'entry_kind':'work','shift_id':None,'span_days':7}]}})
    response=client.post(URL,body,format='json');assert response.status_code==201,response.data
    item=ShiftRosterTemplate.objects.get(id=response.data['id']); assert item.assignment_kind==kind
    assert item.config_snapshot['rotation']['entries'][0]['shift_id']==body['shift_id']
    assert client.post(URL,body,format='json').status_code==400
    assert ShiftRosterTemplate.objects.filter(tenant=tenant,code=body['code']).count()==1
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_roster_template_created',event_snapshot__template_id=str(item.id)).count()==1

def test_missing_base_shift_rejected_without_create(scope):
    tenant,actor,client=scope;before=tenant.shift_roster_templates.count()
    response=client.post(URL,{'code':'missing','name':'Missing base shift','shift_id':None},format='json')
    assert response.status_code==400 and 'shift_id' in response.data
    assert tenant.shift_roster_templates.count()==before

def test_unused_delete_audit_and_replay(scope):
    tenant,actor,client=scope;item=unused(tenant);identity=str(item.id)
    assert client.delete(f'{URL}{identity}/').status_code==200
    assert not ShiftRosterTemplate.objects.filter(id=identity).exists()
    assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_roster_template_deleted',event_snapshot__template_id=identity).count()==1
    assert client.delete(f'{URL}{identity}/').status_code==404

@pytest.mark.parametrize('rollout_status',['preview','completed'])
def test_rollout_history_protected(scope,rollout_status):
    tenant,actor,client=scope;item=unused(tenant)
    rollout=ShiftRosterRollout.objects.create(tenant=tenant,template=item,status=rollout_status,effective_from=date(2044,1,1))
    assert client.delete(f'{URL}{item.id}/').status_code==409
    assert ShiftRosterTemplate.objects.filter(id=item.id).exists()
    assert ShiftRosterRollout.objects.filter(id=rollout.id).exists()

def test_locked_template_protected(scope):
    tenant,actor,client=scope;item=unused(tenant,status='locked')
    assert client.delete(f'{URL}{item.id}/').status_code==409
    assert ShiftRosterTemplate.objects.filter(id=item.id).exists()

def test_permission_and_tenant_isolation(scope):
    tenant,actor,client=scope;item=unused(tenant)
    client.force_authenticate(tenant.employees.get(employee_code='QA-EMP-001').membership.user)
    assert client.delete(f'{URL}{item.id}/').status_code==403
    client.force_authenticate(actor.membership.user)
    foreign=Tenant.objects.create(name='Synthetic foreign',code='foreign-'+uuid4().hex[:8])
    foreign_shift=Shift.objects.create(tenant=foreign,code='foreign-shift',name='Synthetic foreign shift',start_time='09:00',end_time='18:00')
    foreign_item=ShiftRosterTemplate.objects.create(tenant=foreign,shift=foreign_shift,name='Synthetic foreign template',code='foreign')
    assert client.delete(f'{URL}{foreign_item.id}/').status_code==404
    assert ShiftRosterTemplate.objects.filter(id=foreign_item.id).exists()

def test_audit_failure_rolls_back_delete(scope):
    tenant,actor,client=scope;item=unused(tenant)
    with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('synthetic audit outage')):
        with pytest.raises(RuntimeError,match='synthetic audit outage'):client.delete(f'{URL}{item.id}/')
    assert ShiftRosterTemplate.objects.filter(id=item.id).exists()
