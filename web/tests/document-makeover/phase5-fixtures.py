import os,json
from pathlib import Path
from apps.employees.models import Employee
from apps.documents.models import EmployeeDocument,DocumentArtifact
from apps.documents.services import store_document_artifact
from django.core.files.base import ContentFile
m=json.loads(Path(os.environ['QA_PHASE5_MANIFEST']).read_text());e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);t=e.tenant
assert t.code==m['tenant']['code'] and t.code.startswith('pw-qa-')
root=Path(os.environ['QA_PHASE5_EVIDENCE'])
if os.environ.get('QA_PHASE5_CLEANUP'):
 files=[]
 for a in DocumentArtifact.objects.filter(tenant=t):
  f=a.stored_file
  if not f.name:continue
  assert t.code in f.name
  x={'tenant':t.code,'path':f.path,'checksum':a.checksum_sha256};f.storage.delete(f.name);x['absent']=not f.storage.exists(f.name);files.append(x)
 with (root/'artifact-cleanup.jsonl').open('a') as out:out.write(json.dumps({'tenant':t.code,'files':files})+'\n')
else:
 base=EmployeeDocument.objects.get(tenant=t);a=store_document_artifact(tenant=t,employee=e,uploaded_file=ContentFile(b'Oldest report evidence.\n',name='oldest-proof.txt'),actor_identifier='phase5');base.artifact=a;base.file_name='oldest-proof.txt';base.title='QA oldest evidence';base.save()
 for i in range(110):EmployeeDocument.objects.create(tenant=t,employee=e,category=base.category,title=f'QA evidence {i:03d}',file_name=f'evidence-{i}.txt',verification_status='pending' if i%2==0 else 'verified',document_number=f'P5-{i:03d}')
 Path(os.environ['QA_PHASE5_MANIFEST']).with_name('phase5-context.json').write_text(json.dumps({'oldest_id':str(base.id),'employee':str(e.id),'count':111}))
