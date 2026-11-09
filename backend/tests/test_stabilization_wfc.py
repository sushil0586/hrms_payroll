"""Frozen WF-C synthetic PostgreSQL regularization integrity and role boundaries."""
from datetime import date, datetime, timezone as dtz
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import json
import pytest
from django.db import connection,close_old_connections
from rest_framework.test import APIClient
from apps.attendance.models import AttendanceRecord,AttendanceRegularization,AttendancePeriodClose
from apps.attendance.services import submit_regularization
from apps.common.models import SaasCommercialAuditEvent
from test_shift_p5_closure import scope
pytestmark=pytest.mark.django_db(transaction=True)
ESS='/api/v1/me/attendance-regularizations/'
HR='/api/v1/hr-admin/attendance-regularizations/'
MSS='/api/v1/manager/attendance-regularizations/'

def setup(scope):
 tenant,hr,client=scope;employee=tenant.employees.get(employee_code='QA-EMP-001');manager=tenant.employees.get(employee_code='QA-MGR-001')
 record=AttendanceRecord.objects.create(tenant=tenant,employee=employee,attendance_date=date(2028,2,7),status='absent',source='manual')
 return tenant,employee,manager,record

def pending(scope):
 tenant,employee,manager,record=setup(scope)
 item=submit_regularization(employee=employee,attendance_record=record,requested_status='present',requested_check_in_at=datetime(2028,2,7,9,tzinfo=dtz.utc),requested_check_out_at=datetime(2028,2,7,17,30,tzinfo=dtz.utc),reason='WF-C synthetic correction')
 return tenant,employee,manager,record,item

def manager_client(manager):
 client=APIClient();client.force_authenticate(manager.membership.user);client.raise_request_exception=False;return client

def test_current_postgresql_identity(record_property):
 with connection.cursor() as q:q.execute('select current_database(),current_user,current_schema(),inet_server_port(),version()');v=q.fetchone()
 assert connection.vendor=='postgresql' and v[:4]==('test_hrms_wfc','hrms_qa','public',55493);record_property('observed_identity',json.dumps(v))

def test_locked_approval_is_rejected_without_history_mutation(scope):
 tenant,employee,manager,record,item=pending(scope);AttendanceRecord.objects.filter(pk=record.pk).update(is_locked=True)
 before=AttendanceRecord.objects.values().get(pk=record.pk);r=manager_client(manager).post(f'{MSS}{item.id}/approve/',{'comment':'Synthetic locked probe'},format='json')
 assert r.status_code==400,r.status_code
 assert AttendanceRecord.objects.values().get(pk=record.pk)==before
 item.refresh_from_db();assert item.status=='pending'


def test_closed_period_submission_is_rejected_even_without_stale_row_lock_flag(scope):
 tenant,employee,manager,record=setup(scope)
 AttendancePeriodClose.objects.create(tenant=tenant,legal_entity=employee.legal_entity,period_start=date(2028,2,1),period_end=date(2028,2,29),status='closed',idempotency_key='wfc-owned-close',reconciliation_snapshot={'fixture':True})
 c=manager_client(employee);r=c.post(ESS,{'attendance_record_id':str(record.id),'requested_status':'present','requested_check_in_at':'2028-02-07T09:00Z','requested_check_out_at':'2028-02-07T17:30Z','reason':'Synthetic closed-day probe'},format='json')
 assert r.status_code==400,r.status_code
 assert not AttendanceRegularization.objects.filter(attendance_record=record).exists()

@pytest.mark.parametrize('admin',[False,True])
def test_opposite_resolved_outcome_is_validation_not_server_error(scope,admin):
 tenant,employee,manager,record,item=pending(scope);client=scope[2] if admin else manager_client(manager);client.raise_request_exception=False;url=HR if admin else MSS
 assert client.post(f'{url}{item.id}/approve/',{'comment':'Synthetic approval'},format='json').status_code==200
 before=AttendanceRecord.objects.values().get(pk=record.pk);r=client.post(f'{url}{item.id}/reject/',{'comment':'Conflicting stale outcome'},format='json')
 assert r.status_code==400,r.status_code
 assert AttendanceRecord.objects.values().get(pk=record.pk)==before
 assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_snapshot__attendance_regularization_id=str(item.id)).count()==1

@pytest.mark.parametrize('admin',[False,True])
def test_blank_reject_note_is_denied(scope,admin):
 tenant,employee,manager,record,item=pending(scope);client=scope[2] if admin else manager_client(manager);url=HR if admin else MSS
 assert client.post(f'{url}{item.id}/reject/',{'comment':'  '},format='json').status_code==400
 item.refresh_from_db();assert item.status=='pending'

@pytest.mark.parametrize('mode',['approve','opposite'])
def test_simultaneous_decisions_one_effect_and_one_audit(scope,mode,record_property):
 tenant,employee,manager,record,item=pending(scope);barrier=Barrier(2)
 def decide(action):
  close_old_connections();c=manager_client(manager)
  try:barrier.wait();return c.post(f'{MSS}{item.id}/{action}/',{'comment':'Synthetic concurrent decision'},format='json').status_code
  finally:close_old_connections()
 with ThreadPoolExecutor(2) as pool:results=list(pool.map(decide,['approve','approve' if mode=='approve' else 'reject']))
 assert sorted(results)==([200,200] if mode=='approve' else [200,400]),results
 assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_snapshot__attendance_regularization_id=str(item.id)).count()==1
 record_property('concurrent_responses',json.dumps(results))


def test_unrelated_manager_and_employee_cannot_review(scope):
 tenant,employee,manager,record,item=pending(scope)
 for actor in [employee,tenant.employees.get(employee_code='QA-MGR-002')]:
  c=manager_client(actor);r=c.post(f'{MSS}{item.id}/approve/',{'comment':'Synthetic scope denial'},format='json');assert r.status_code in [403,404]
 item.refresh_from_db();assert item.status=='pending'


def test_closed_approval_is_validation_and_retains_request(scope):
 tenant,employee,manager,record,item=pending(scope)
 AttendancePeriodClose.objects.create(tenant=tenant,legal_entity=employee.legal_entity,period_start=date(2028,2,1),period_end=date(2028,2,29),status='closed',idempotency_key='wfc-approval-close')
 before=AttendanceRecord.objects.values().get(pk=record.pk)
 assert manager_client(manager).post(f'{MSS}{item.id}/approve/',{'comment':'Synthetic closed approval'},format='json').status_code==400
 item.refresh_from_db();assert item.status=='pending';assert AttendanceRecord.objects.values().get(pk=record.pk)==before


def test_hr_record_edit_and_audit_are_atomic(scope):
 from unittest.mock import patch
 tenant,employee,manager,record=setup(scope);before=record.notes
 with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('Synthetic audit outage')):
  with pytest.raises(RuntimeError):scope[2].patch(f'/api/v1/hr-admin/attendance-records/{record.id}/',{'notes':'must rollback'},format='json')
 record.refresh_from_db();assert record.notes==before


def test_hr_closed_record_edit_is_validation_without_effect(scope):
 tenant,employee,manager,record=setup(scope)
 AttendancePeriodClose.objects.create(tenant=tenant,legal_entity=employee.legal_entity,period_start=date(2028,2,1),period_end=date(2028,2,29),status='closed',idempotency_key='wfc-hr-edit-close')
 scope[2].raise_request_exception=False;before=AttendanceRecord.objects.values().get(pk=record.pk)
 assert scope[2].patch(f'/api/v1/hr-admin/attendance-records/{record.id}/',{'notes':'closed probe'},format='json').status_code==400
 assert AttendanceRecord.objects.values().get(pk=record.pk)==before


def test_actual_foreign_tenant_review_and_detail_are_denied(scope):
 from test_hr_admin_attendance_workspace import provision
 from uuid import uuid4
 foreign=provision();record=foreign.attendance_records.first();reg=AttendanceRegularization.objects.filter(tenant=foreign).first()
 manager=scope[0].employees.get(employee_code='QA-MGR-001');c=manager_client(manager)
 assert c.get(f'{MSS}{reg.id}/').status_code==404
 assert c.post(f'{MSS}{reg.id}/approve/',{'comment':'Foreign denial'},format='json').status_code==404
 assert scope[2].get(f'{HR}{reg.id}/').status_code==404
 assert scope[2].post(f'{HR}{reg.id}/reject/',{'comment':'Foreign denial'},format='json').status_code==404
 reg.refresh_from_db();assert reg.status=='pending'


def test_review_capability_is_required_even_for_hr_role(scope):
 from apps.iam.models import RolePermission
 tenant,employee,manager,record,item=pending(scope)
 RolePermission.objects.filter(role__tenant=tenant,permission_key='attendance.regularization.review').delete()
 assert scope[2].post(f'{HR}{item.id}/approve/',{'comment':'Denied capability'},format='json').status_code==403
 item.refresh_from_db();assert item.status=='pending'


def test_regularization_audit_failure_rolls_back_record_and_decision(scope):
 from unittest.mock import patch
 tenant,employee,manager,record,item=pending(scope);before=AttendanceRecord.objects.values().get(pk=record.pk);c=manager_client(manager);c.raise_request_exception=True
 with patch('apps.common.selectors.record_saas_commercial_audit_event',side_effect=RuntimeError('Synthetic regularization audit outage')):
  with pytest.raises(RuntimeError):c.post(f'{MSS}{item.id}/approve/',{'comment':'Must rollback'},format='json')
 item.refresh_from_db();assert item.status=='pending';assert AttendanceRecord.objects.values().get(pk=record.pk)==before
