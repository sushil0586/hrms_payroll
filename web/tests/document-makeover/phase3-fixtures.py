import os,json
from pathlib import Path
from apps.tenants.models import Tenant
from apps.organizations.models import LegalEntity
from apps.documents.models import DocumentCategory, DocumentRequirementRule
m=json.loads(Path(os.environ['QA_PHASE3_MANIFEST']).read_text())
t=Tenant.objects.get(id=m['tenant']['id'])
LegalEntity.objects.create(tenant=t,code='qa-no-branches',name='QA Entity Without Branches',registered_name='QA Entity Without Branches',timezone=t.timezone)
category=DocumentCategory.objects.filter(tenant=t).order_by('created_at').first()
requirement=DocumentRequirementRule.objects.filter(tenant=t).order_by('created_at').first()
assert category and requirement
Path(os.environ['QA_PHASE3_MANIFEST']).with_name('phase3-context.json').write_text(json.dumps({'category':str(category.id),'requirement':str(requirement.id)}))
