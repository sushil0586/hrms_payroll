"""Owned synthetic lifecycle fixture and durable reconciliation, no Payroll operations."""
import sys,json,hashlib
from pathlib import Path
from datetime import timedelta
import django
django.setup()
from django.db import connection
from django.utils import timezone
from django.apps import apps
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.tenants.models import Tenant
from apps.attendance.models import Shift,EmployeeShiftAssignment,AttendanceRecord
from apps.common.models import SaasCommercialAuditEvent
m=json.loads(Path(sys.argv[1]).read_text());seed=sys.argv[2];phase=sys.argv[3];tenant=Tenant.objects.get(id=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(tenant,seed)
assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_wfb1'
def hashes():
 result={}
 for model in apps.get_app_config('payroll').get_models():
  if any(f.name=='tenant' for f in model._meta.fields):result[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
 result['attendance']=hashlib.sha256(json.dumps(list(AttendanceRecord.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
 return result
state=Path(sys.argv[1]).with_name('lifecycle-state.json');today=timezone.localdate()
if phase=='prepare':
 ids={}
 for kind,start,end in [('future',10,20),('active',-10,20)]:
  shift=Shift.objects.create(tenant=tenant,code='b1-'+kind,name='B1 '+kind.title()+' Synthetic',start_time='09:00',end_time='17:00',working_hours=8)
  item=EmployeeShiftAssignment.objects.create(tenant=tenant,employee_id=m['credentials']['manager_b' if kind=='future' else 'hr_admin']['employee_id'],shift=shift,effective_from=today+timedelta(days=start),effective_to=today+timedelta(days=end),is_primary=False)
  ids[kind+'_id']=str(item.id)
 future=EmployeeShiftAssignment.objects.get(pk=ids['future_id'])
 data={**ids,'future_version':future.updated_at.isoformat(),'future_end':str(future.effective_to+timedelta(days=1)),'last_day':str(today+timedelta(days=2)),'protected_hashes':hashes()};state.write_text(json.dumps(data));print(json.dumps({k:v for k,v in data.items() if k!='protected_hashes'}))
else:
 data=json.loads(state.read_text());future=EmployeeShiftAssignment.objects.get(pk=data['future_id']);active=EmployeeShiftAssignment.objects.get(pk=data['active_id']);assert future.cancelled_at and str(active.effective_to)==data['last_day'];assert hashes()==data['protected_hashes']
 events=list(SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_snapshot__assignment_id__in=[str(future.id),str(active.id)]).values('event_type','actor_identifier','event_snapshot'));assert len(events)==3 and {e['event_type'] for e in events}=={'attendance_shift_assignment_updated','attendance_shift_assignment_cancelled','attendance_shift_assignment_ended'} and all(e['actor_identifier'] and (e['event_snapshot'].get('reason') or e['event_type']=='attendance_shift_assignment_updated') for e in events)
 print(json.dumps({'database':'hrms_wfb1','tenant':str(tenant.id),'rows_retained':2,'protected_hashes_unchanged':True,'protected_model_count':len(data['protected_hashes']),'events':events},default=str))
