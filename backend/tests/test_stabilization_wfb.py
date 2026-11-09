"""Frozen WF-B rotation/template/rollout edge cases; owned PostgreSQL only."""
from datetime import date,timedelta
import json
import pytest
from django.db import connection
from apps.attendance.models import ShiftRosterTemplate,EmployeeShiftAssignment,ShiftRosterRollout,ShiftRosterRolloutItem
from apps.attendance.services import _resolve_shift_from_assignment,preview_shift_roster_template_rollout
from apps.common.models import SaasCommercialAuditEvent
from test_shift_p5_closure import scope
pytestmark=pytest.mark.django_db(transaction=True)
URL='/api/v1/hr-admin/shift-roster-templates/'

def test_current_postgresql_identity(record_property):
 with connection.cursor() as c:c.execute('SELECT current_database(),current_user,current_schema(),inet_server_port(),version()');v=c.fetchone()
 assert connection.vendor=='postgresql' and v[:4]==('test_hrms_wfb','hrms_qa','public',55491)
 record_property('database_identity',json.dumps(v))

@pytest.mark.parametrize('offset,off',[(-1,False),(0,False),(1,False),(2,True),(4,True),(5,False),(7,True)])
def test_unequal_rotation_anchor_and_explicit_off(scope,offset,off):
 tenant,actor,client=scope;shift=tenant.shifts.first();anchor=date(2059,1,10)
 assignment=EmployeeShiftAssignment(tenant=tenant,employee=actor,shift=shift,assignment_kind='weekly_rotation',effective_from=date(2059,1,1),config_snapshot={'rotation':{'anchor_date':str(anchor),'entries':[{'entry_kind':'work','shift_id':str(shift.id),'span_days':2},{'entry_kind':'off','span_days':3}]}})
 result=_resolve_shift_from_assignment(assignment,attendance_date=anchor+timedelta(days=offset))
 assert (result['shift'] is None)==off
 # Before-anchor clamping is observed implementation; no new backward-cycle policy inferred.

def test_template_stale_edit_and_draft_apply_non_effect(scope):
 tenant,actor,client=scope;item=ShiftRosterTemplate.objects.create(tenant=tenant,shift=tenant.shifts.first(),code='wfb-stale',name='WF-B synthetic draft')
 version=item.updated_at.isoformat();r=client.patch(f'{URL}{item.id}/',{'name':'Updated','expected_updated_at':version},format='json');assert r.status_code==200
 before=SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()
 assert client.patch(f'{URL}{item.id}/',{'name':'Stale overwrite','expected_updated_at':version},format='json').status_code==409
 item.refresh_from_db();assert item.name=='Updated';assert SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()==before
 employee=tenant.employees.get(employee_code='QA-MGR-002');n=EmployeeShiftAssignment.objects.filter(tenant=tenant).count()
 r=client.post(URL+'rollout/',{'template_id':str(item.id),'employee_ids':[str(employee.id)],'effective_from':'2059-01-01','dry_run':False},format='json')
 assert r.status_code==400,r.data;assert EmployeeShiftAssignment.objects.filter(tenant=tenant).count()==n;assert not ShiftRosterRollout.objects.filter(tenant=tenant).exists()

def test_preview_rechecks_new_primary_conflict_before_apply(scope,record_property):
 tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');shift=tenant.shifts.first()
 template=ShiftRosterTemplate.objects.create(tenant=tenant,shift=shift,code='wfb-recheck',name='WF-B synthetic recheck',status='published')
 data=dict(tenant=tenant,template=template,employee_queryset=tenant.employees.filter(id=employee.id),effective_from=date(2059,2,1),effective_to=date(2059,2,2),is_primary=True,actor=actor)
 p=preview_shift_roster_template_rollout(**data,dry_run=True);assert p['created_count']==1;assert not ShiftRosterRollout.objects.filter(tenant=tenant).exists()
 accepted=client.post('/api/v1/hr-admin/employee-shift-assignments/',{'employee_id':str(employee.id),'shift_id':str(shift.id),'effective_from':'2059-02-01','effective_to':'2059-02-02','is_primary':True},format='json');assert accepted.status_code==201
 r=preview_shift_roster_template_rollout(**data,dry_run=False);assert r['created_count']==0 and r['skipped_count']==1
 assert EmployeeShiftAssignment.objects.filter(tenant=tenant,employee=employee,effective_from=date(2059,2,1)).count()==1
 item=ShiftRosterRolloutItem.objects.get(rollout_id=r['rollout_id']);assert item.assignment_id is None
 record_property('preview_apply_recheck',json.dumps({'preview':p,'apply':r},default=str))
