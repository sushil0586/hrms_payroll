import django,sys,json,hashlib
from pathlib import Path
django.setup()
from django.apps import apps
from django.db import connection
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.attendance.models import AttendanceRecord,AttendanceRegularization
from apps.common.models import SaasCommercialAuditEvent
m=json.loads(Path(sys.argv[1]).read_text());state=json.loads(Path(sys.argv[1]).with_name('wfc-state.json').read_text());seed=sys.argv[2];tenant=Tenant.objects.get(pk=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(tenant,seed);assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_wfc'
actual={}
for label in ['payroll','leave_management']:
 for model in apps.get_app_config(label).get_models():
  if any(f.name=='tenant' for f in model._meta.fields):actual[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
assert actual==state['protected']
mode=sys.argv[3];p=state['prepared']
if mode=='workflow':
 record=AttendanceRecord.objects.get(pk=p['records']['work']);assert str(record.work_duration_hours)=='8.50' and record.is_regularized
 corrections=AttendanceRegularization.objects.filter(attendance_record=record)
 assert sorted(corrections.values_list('status',flat=True))==['approved','rejected']
 assert all(corrections.values_list('workflow_reference',flat=True))
 events=SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_snapshot__attendance_regularization_id__in=[str(i) for i in corrections.values_list('id',flat=True)])
 assert sorted(events.values_list('event_type',flat=True))==['attendance_regularization_approved','attendance_regularization_rejected'] and all(events.values_list('actor_identifier',flat=True))
else:
 record=AttendanceRecord.objects.get(pk=p['hr_record_id']);assert record.notes=='WF-C standalone note' and str(record.work_duration_hours)=='8.00'
 reg=AttendanceRegularization.objects.get(pk=p['hr_reg_id']);assert reg.status=='rejected' and reg.rejection_reason=='WF-C synthetic HR explanation'
 assert AttendanceRegularization.objects.get(pk=p['hr_inline_id']).status=='approved'
 assert AttendanceRegularization.objects.get(pk=p['hr_standalone_id']).status=='rejected'
 assert SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type='attendance_record_updated',event_snapshot__attendance_record_id=str(record.id)).count()==2

print(json.dumps({'database':'hrms_wfc','tenant':str(tenant.id),'protected_model_hashes_unchanged':True,'protected_model_count':len(actual),'records':list(AttendanceRecord.objects.filter(tenant=tenant,id__in=[state['prepared']['records']['work'],state['prepared']['hr_record_id']]).values('id','attendance_date','status','work_duration_hours','is_regularized','notes')),'regularizations':list(AttendanceRegularization.objects.filter(tenant=tenant).values('id','status','attendance_record_id','requested_status','manager_comment','rejection_reason')),'audits':list(SaasCommercialAuditEvent.objects.filter(tenant=tenant,event_type__startswith='attendance').values('event_type','actor_identifier','event_snapshot'))},default=str))
