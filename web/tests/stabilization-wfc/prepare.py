"""Exact-owned synthetic browser fixture; no real employee data or external effects."""
import os,sys,json,django
from datetime import date,datetime,timezone,timedelta
from calendar import monthrange
from zoneinfo import ZoneInfo
from pathlib import Path
django.setup()
from django.db import connection
from apps.tenants.models import Tenant
from apps.attendance.models import AttendanceRecord,AttendanceRegularization,Shift
from apps.attendance.services import resolve_employee_work_day
from apps.common.management.commands.manage_playwright_workspace import Command
manifest=json.loads(Path(sys.argv[1]).read_text());seed=sys.argv[2]
with connection.cursor() as q:q.execute('select current_database(),current_user,current_schema(),inet_server_port()');identity=q.fetchone()
assert connection.vendor=='postgresql' and identity==('hrms_wfc','hrms_qa','public',55493)
tenant=Tenant.objects.get(id=manifest['tenant']['id'],code=manifest['tenant']['code']);guard=Command();guard._assert_safe_identity(seed,tenant.code);guard._assert_owned(tenant,seed)
employee=tenant.employees.get(id=manifest['credentials']['employee']['employee_id']);shift=Shift.objects.get(tenant=tenant,id=manifest['attendance']['shift_id']);shift.weekly_off_days=['saturday','sunday'];shift.save(update_fields=['weekly_off_days'])
today=datetime.now(ZoneInfo(tenant.timezone or 'UTC')).date()
start=today.replace(day=1)
work=today
while work.weekday()>=5:work-=timedelta(days=1)
assert work.month==today.month, 'Choose a month with a completed working day for this bounded fixture'
approved=work-timedelta(days=1)
while approved.weekday()>=5:approved-=timedelta(days=1)
assert approved.month==today.month
saturday=next(start+timedelta(days=i) for i in range(monthrange(today.year,today.month)[1]) if (start+timedelta(days=i)).weekday()==5)
sunday=next(start+timedelta(days=i) for i in range(monthrange(today.year,today.month)[1]) if (start+timedelta(days=i)).weekday()==6)
records={};dates={'work':work,'approved':approved,'saturday':saturday,'sunday':sunday}
for key,day in dates.items():
 record,_=AttendanceRecord.objects.update_or_create(tenant=tenant,employee=employee,attendance_date=day,defaults={'shift':shift,'status':'absent' if key=='work' else 'weekly_off' if key in ['saturday','sunday'] else 'present','source':'manual','check_in_at':None,'check_out_at':None,'work_duration_hours':'8.50' if key=='approved' else '0.00','is_regularized':key=='approved','is_locked':False})
 records[key]=str(record.id)
 if key=='approved':AttendanceRegularization.objects.create(tenant=tenant,employee=employee,attendance_record=record,status='approved',requested_status='present',reason='Synthetic approved historical correction')
assert resolve_employee_work_day(employee=employee,work_date=saturday)['day_type']=='weekly_off'
assert resolve_employee_work_day(employee=employee,work_date=work)['day_type']=='working_day'
prepared={'records':records,'dates':{k:v.isoformat() for k,v in dates.items()},'month':today.strftime('%Y-%m'),'tenant':str(tenant.id),'database':identity,'exact_ownership_verified':True}

# Only owned synthetic rows; no Payroll operation or real record mutation.
from apps.attendance.models import EmployeeShiftAssignment
for i in range(24):
 day=date(2031,1,1)+timedelta(days=i)
 AttendanceRecord.objects.create(tenant=tenant,employee_id=manifest['credentials']['manager_b']['employee_id'],attendance_date=day,status='present',source='manual',shift=shift,check_in_at=datetime.combine(day,datetime.min.time().replace(hour=9),timezone.utc),check_out_at=datetime.combine(day,datetime.min.time().replace(hour=17),timezone.utc),work_duration_hours='8.00',notes='WF-C owned listing')
hrrecord=AttendanceRecord.objects.filter(tenant=tenant,employee_id=manifest['credentials']['manager_b']['employee_id']).order_by('attendance_date').first()
hrreg=AttendanceRegularization.objects.create(tenant=tenant,employee=hrrecord.employee,attendance_record=hrrecord,requested_status='present',requested_check_in_at=hrrecord.check_in_at,requested_check_out_at=hrrecord.check_out_at,status='pending',reason='WF-C synthetic HR review')
more={}
for key,offset in [('inline',1),('standalone',2)]:
 r=AttendanceRecord.objects.get(tenant=tenant,employee=hrrecord.employee,attendance_date=hrrecord.attendance_date+timedelta(days=offset))
 reg=AttendanceRegularization.objects.create(tenant=tenant,employee=r.employee,attendance_record=r,requested_status='present',requested_check_in_at=r.check_in_at,requested_check_out_at=r.check_out_at,status='pending',reason='WF-C '+key+' review')
 more['hr_'+key+'_id']=str(reg.id)
prepared.update(hr_record_id=str(hrrecord.id),hr_reg_id=str(hrreg.id),**more)
# Fingerprint immutable Payroll/Leave inputs before any browser workflow.
from django.apps import apps
import hashlib
protected={}
for label in ['payroll','leave_management']:
 for model in apps.get_app_config(label).get_models():
  if any(f.name=='tenant' for f in model._meta.fields):protected[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
Path(sys.argv[1]).with_name('wfc-state.json').write_text(json.dumps({'prepared':prepared,'protected':protected}))
print(json.dumps(prepared))
