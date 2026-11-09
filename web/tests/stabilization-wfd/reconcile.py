import json,sys,hashlib
from pathlib import Path
import django
django.setup()
from django.apps import apps
from django.db import connection
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.leave_management.models import LeaveRequest,LeaveBalance
m=json.loads(Path(sys.argv[1]).read_text());seed=sys.argv[2];tenant=Tenant.objects.get(pk=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(tenant,seed);assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_wfd';s=json.loads(Path(sys.argv[1]).with_name('wfd-state.json').read_text());actual={}
for model in apps.get_app_config('payroll').get_models():
 if any(f.name=='tenant' for f in model._meta.fields):actual[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
assert actual==s['protected']
rows=list(LeaveRequest.objects.filter(tenant=tenant,reason__startswith='WF-D connected').values('id','reason','status','requested_units','approved_units'))
if sys.argv[3].startswith('D05'):
 assert {r['status'] for r in rows}=={'cancelled','rejected','withdrawn'},rows
 assert len(rows)==3
print(json.dumps({'database':'hrms_wfd','tenant':str(tenant.id),'protected_payroll_hashes_unchanged':True,'protected_model_count':len(actual),'requests':rows,'balances':list(LeaveBalance.objects.filter(tenant=tenant).values('reserved_amount','consumed_amount','closing_balance'))},default=str))
