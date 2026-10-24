import os,json
from pathlib import Path
from apps.tenants.models import Tenant
from apps.organizations.models import LegalEntity
m=json.loads(Path(os.environ['QA_PHASE3_MANIFEST']).read_text())
t=Tenant.objects.get(id=m['tenant']['id'])
LegalEntity.objects.create(tenant=t,code='qa-no-branches',name='QA Entity Without Branches',registered_name='QA Entity Without Branches',timezone=t.timezone)
