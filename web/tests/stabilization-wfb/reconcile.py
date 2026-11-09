"""Exact-owned WF-B before/after snapshots; no domain writes."""
import sys,json,hashlib
from pathlib import Path
import django
django.setup()
from django.db import connection
from django.apps import apps
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.attendance.models import Shift,EmployeeShiftAssignment,ShiftRosterTemplate,ShiftRosterRollout,ShiftRosterRolloutItem
from apps.common.models import SaasCommercialAuditEvent
manifest,seed,action=sys.argv[1:];m=json.loads(Path(manifest).read_text())
t=Tenant.objects.get(id=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(t,seed)
with connection.cursor() as q:q.execute('SELECT current_database(),current_user,inet_server_port()');identity=q.fetchone()
assert connection.vendor=='postgresql' and identity==('hrms_wfb','hrms_qa',55491)
payroll={}
for model in apps.get_app_config('payroll').get_models():
 rows=list(model._base_manager.order_by('pk').values());payroll[model._meta.label]={'count':len(rows),'sha256':hashlib.sha256(json.dumps(rows,sort_keys=True,default=str).encode()).hexdigest()}
p=Path(manifest).parent/'wfb-payroll-before.json'
if action=='before':p.write_text(json.dumps(payroll))
else:assert json.loads(p.read_text())==payroll,'Payroll fingerprint changed'
result={'action':action,'database':identity,'tenant':str(t.id),'payroll_models_unchanged':len(payroll) if action=='after' else None,'payroll_fingerprints':payroll,'rows':{}}
for model in [Shift,EmployeeShiftAssignment,ShiftRosterTemplate,ShiftRosterRollout,SaasCommercialAuditEvent]:result['rows'][model._meta.label]=list(model.objects.filter(tenant=t).order_by('pk').values())
result['rows']['rollout_items']=list(ShiftRosterRolloutItem.objects.filter(rollout__tenant=t).order_by('pk').values())
print(json.dumps(result,default=str))
