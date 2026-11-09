"""Declared synthetic pagination fixture, exact tenant ownership only."""
import sys,json
from pathlib import Path
from datetime import date,timedelta
import django
django.setup()
from django.db import connection
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.tenants.models import Tenant
from apps.attendance.models import Shift,ShiftRosterTemplate,EmployeeShiftAssignment
m=json.loads(Path(sys.argv[1]).read_text());seed=sys.argv[2];tenant=Tenant.objects.get(id=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(tenant,seed)
assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_wfb'
for i in range(12):
 shift=Shift.objects.create(tenant=tenant,code=f'wfb-page-{i:02}',name=f'WF-B page shift {i:02}',start_time='09:00',end_time='17:00',working_hours=8)
 ShiftRosterTemplate.objects.create(tenant=tenant,code=f'wfb-page-{i:02}',name=f'WF-B page template {i:02}',shift=shift)
 day=date(2061,1,1)+timedelta(days=3*i)
 EmployeeShiftAssignment.objects.create(tenant=tenant,employee_id=m['credentials']['manager_b']['employee_id'],shift=shift,effective_from=day,effective_to=day+timedelta(days=1))
print(json.dumps({'fixture_only':True,'tenant':str(tenant.id),'added':{'shifts':12,'templates':12,'assignments':12}}))
