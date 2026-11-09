import json,sys,hashlib
from pathlib import Path
import django
django.setup()
from django.apps import apps
from django.db import connection
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
from apps.leave_management.models import LeaveType,LeavePolicy,LeaveRequest,LeavePolicyAssignment
m=json.loads(Path(sys.argv[1]).read_text());seed=sys.argv[2];tenant=Tenant.objects.get(pk=m['tenant']['id'],code='pw-qa-'+seed);Command()._assert_owned(tenant,seed);assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_wfd'
policy=LeavePolicy.objects.get(pk=m['leave']['policy_id']);policy.config_snapshot={**policy.config_snapshot,'lifecycle':{**policy.config_snapshot.get('lifecycle',{}),'allow_employee_cancel_approved':True,'cancel_approved_requires_reapproval':False}};policy.save(update_fields=['config_snapshot']);kind=policy.leave_type;kind.color_code='#146c43';kind.save(update_fields=['color_code'])
for i in range(12):LeaveType.objects.create(tenant=tenant,code=f'wfd-extra-{i:02}',name=f'WF-D extra {i:02}',color_code='#146c43')
for i in range(15):LeaveRequest.objects.create(tenant=tenant,employee_id=m['credentials']['employee']['employee_id'],leave_policy=policy,leave_type=kind,start_date='2026-01-05',end_date='2026-01-05',status='rejected',reason=f'WF-D historical {i:02}')
protected={}
for label in ['payroll']:
 for model in apps.get_app_config(label).get_models():
  if any(f.name=='tenant' for f in model._meta.fields):protected[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=tenant).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
p={'assignment_id':str(LeavePolicyAssignment.objects.get(tenant=tenant,leave_policy=policy).id),'type_id':str(kind.id),'policy_id':str(policy.id),'request_id':m['fixtures']['leave_request_id'],'employee_id':m['credentials']['employee']['employee_id'],'balance_id':m['leave']['balance_id'],'dates':{'full':'2026-11-12','half':'2026-11-13','withdraw':'2026-11-16'}}
Path(sys.argv[1]).with_name('wfd-state.json').write_text(json.dumps({'protected':protected,'prepared':p}));print(json.dumps(p))
