"""Change only a manifest-owned synthetic tenant timezone on the approved disposable DB."""
import json,sys,django
from pathlib import Path
django.setup()
from django.db import connection
from apps.tenants.models import Tenant
from apps.common.management.commands.manage_playwright_workspace import Command
manifest=json.loads(Path(sys.argv[1]).read_text())
with connection.cursor() as q:
 q.execute('select current_database(),current_user,current_schema(),inet_server_port()');identity=q.fetchone()
assert connection.vendor=='postgresql' and identity==('hrms_shift_pilot','hrms_pilot','public',55469)
assert manifest['ownership']['disposable'] and manifest['ownership']['owner']=='playwright'
tenant=Tenant.objects.get(id=manifest['tenant']['id'],code=manifest['tenant']['code'])
Command()._assert_owned(tenant,manifest['ownership']['seed_ref'])
tenant.timezone='America/New_York';tenant.save(update_fields=['timezone'])
print(json.dumps({'tenant':manifest['tenant'],'timezone':tenant.timezone,'database':identity,'exact_ownership_verified':True}))
