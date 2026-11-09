import django,json,sys,hashlib
from pathlib import Path
django.setup()
from django.apps import apps
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
m=json.loads(Path(sys.argv[1]).read_text());t=Tenant.objects.get(pk=m['tenant']['id']);Command()._assert_owned(t,sys.argv[2]);before=json.loads(Path(sys.argv[1]).with_name('wff-protected.json').read_text());after={}
for model in apps.get_app_config('payroll').get_models():
 if any(f.name=='tenant' for f in model._meta.fields):after[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=t).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
changed=[k for k in before if before[k]!=after.get(k)];assert not changed,changed
print(json.dumps({'protected_models':len(after),'all_hashes_unchanged':True,'tenant':str(t.id),'scenario':sys.argv[3] if len(sys.argv)>3 else 'route-family'}))
