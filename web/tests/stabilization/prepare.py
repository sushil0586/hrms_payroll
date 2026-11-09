"""Exact-owned synthetic fixture prep and read-only payroll/data reconciliation."""
import hashlib,json,sys
from pathlib import Path
from datetime import datetime,timezone
import django
django.setup()
from django.apps import apps
from django.db import connection
from apps.tenants.models import Tenant
from apps.attendance.models import AttendanceRegularization,Shift
from apps.leave_management.models import LeaveRequest
from apps.common.models import SaasCommercialAuditEvent
manifest_path,seed,action=sys.argv[1:]
manifest=json.loads(Path(manifest_path).read_text());tenant=Tenant.objects.get(id=manifest['tenant']['id'])
assert tenant.code==manifest['tenant']['code']=='pw-qa-'+seed
assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_stabilization'
with connection.cursor() as cursor:
 cursor.execute('SELECT current_database(),current_user,inet_server_port()');assert cursor.fetchone()==('hrms_stabilization','hrms_qa',55491)
private=Path(manifest_path).parent/'payroll-before.json'
def digest():
 result={}
 for model in apps.get_app_config('payroll').get_models():
  rows=list(model._base_manager.order_by('pk').values())
  result[model._meta.label]={'rows':len(rows),'sha256':hashlib.sha256(json.dumps(rows,sort_keys=True,default=str).encode()).hexdigest()}
 return result
if action=='before':
 regularization=AttendanceRegularization.objects.get(tenant=tenant,id=manifest['fixtures']['attendance_regularization_id'])
 assert regularization.status=='pending'
 day=regularization.attendance_record.attendance_date
 regularization.requested_check_in_at=datetime(day.year,day.month,day.day,9,tzinfo=timezone.utc)
 regularization.requested_check_out_at=datetime(day.year,day.month,day.day,17,tzinfo=timezone.utc)
 regularization.save(update_fields=['requested_check_in_at','requested_check_out_at'])
 before=digest();private.write_text(json.dumps(before));print(json.dumps({'tenant':str(tenant.id),'payroll_models':len(before),'fixture':'exact owned; valid pending punches','external_delivery':'disabled'}))
else:
 before=json.loads(private.read_text());after=digest();assert before==after,'Payroll rows changed during shared-UI/attendance/leave regression'
 if action=='after-readonly':
  print(json.dumps({'tenant':str(tenant.id),'payroll_unchanged':True,'payroll_models':len(after),'payroll_fingerprints':after}));sys.exit(0)
 regularization=AttendanceRegularization.objects.get(tenant=tenant,id=manifest['fixtures']['attendance_regularization_id'])
 leave=LeaveRequest.objects.get(tenant=tenant,id=manifest['fixtures']['leave_request_id'])
 assert regularization.status=='approved';assert leave.status=='withdrawn'
 assert Shift.objects.filter(tenant=tenant,code='wf-a-shared-feedback').count()==1
 assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_shift_created',event_snapshot__shift_code='wf-a-shared-feedback').count()==1
 print(json.dumps({'tenant':str(tenant.id),'payroll_unchanged':True,'payroll_models':len(after),'payroll_fingerprints':after,'regularization_status':regularization.status,'leave_status':leave.status,'created_shift_count':1,'shift_created_audit_count':1}))
