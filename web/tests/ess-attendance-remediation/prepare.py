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
assert connection.vendor=='postgresql' and identity==('hrms_ess_pilot','hrms_qa','public',55479)
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
print(json.dumps({'records':records,'dates':{k:v.isoformat() for k,v in dates.items()},'month':today.strftime('%Y-%m'),'tenant':str(tenant.id),'database':identity,'exact_ownership_verified':True}))
