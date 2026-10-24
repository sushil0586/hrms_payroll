import os,json
from pathlib import Path
from django.core.files.base import ContentFile
from apps.documents.models import EmployeeDocument,DocumentArtifact,DocumentRequirementRule
from apps.documents.services import store_document_artifact
from apps.employees.models import Employee
m=json.loads(Path(os.environ['QA_PHASE6_MANIFEST']).read_text());e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);t=e.tenant
assert t.code==m['tenant']['code'] and t.code.startswith('pw-qa-')
root=Path(os.environ['QA_PHASE6_EVIDENCE'])
if os.environ.get('QA_PHASE6_CLEANUP'):
 files=[]
 for a in DocumentArtifact.objects.filter(tenant=t):
  f=a.stored_file
  if not f.name:continue
  assert t.code in f.name
  entry={'tenant':t.code,'path':f.path,'checksum':a.checksum_sha256};f.storage.delete(f.name);entry['absent']=not f.storage.exists(f.name);files.append(entry)
 with (root/'artifact-cleanup.jsonl').open('a') as out:out.write(json.dumps({'tenant':t.code,'files':files})+'\n')
else:
 base=EmployeeDocument.objects.get(tenant=t);c=base.category;c.requires_expiry_date=False;c.requires_verification=True;c.allow_employee_upload=True;c.allow_multiple_files=True;c.visibility_rules={'accepted_mime_types':['text/plain']};c.save()
 a=store_document_artifact(tenant=t,employee=e,uploaded_file=ContentFile(b'Phase 6 original evidence.\n',name='phase6-original.txt'),actor_identifier='phase6');base.artifact=a;base.file_name='phase6-original.txt';base.verification_status='pending';base.save()
 rule=DocumentRequirementRule.objects.filter(tenant=t,category=c).first() or DocumentRequirementRule.objects.create(tenant=t,category=c,employment_type=e.employment_type,is_mandatory=True)
 Path(os.environ['QA_PHASE6_MANIFEST']).with_name('phase6-context.json').write_text(json.dumps({'document':str(base.id),'category':str(c.id),'requirement':str(rule.id),'employee':str(e.id)}))
