import os,json
from pathlib import Path
from django.core.files.base import ContentFile
from apps.documents.services import store_document_artifact
from apps.documents.models import EmployeeDocument,DocumentCategory,DocumentRequirementRule,DocumentArtifact
from apps.employees.models import Employee
m=json.loads(Path(os.environ['QA_PHASE4_MANIFEST']).read_text());e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);t=e.tenant
assert t.code == m['tenant']['code'] and t.code.startswith('pw-qa-')
root=Path(os.environ['QA_PHASE4_EVIDENCE'])
if os.environ.get('QA_PHASE4_CLEANUP'):
    artifacts=[]
    for artifact in DocumentArtifact.objects.filter(tenant=t):
        file=artifact.stored_file
        if not file.name: continue
        entry={'tenant':t.code,'artifact_id':str(artifact.id),'storage_key':file.name,'path':file.path,'checksum':artifact.checksum_sha256 if hasattr(artifact,'checksum_sha256') else ''}
        assert t.code in file.name
        file.storage.delete(file.name);entry['absent_after_delete']=not file.storage.exists(file.name);artifacts.append(entry)
    with (root/'artifact-cleanup.jsonl').open('a') as out:out.write(json.dumps({'tenant':t.code,'artifacts':artifacts})+'\n')
else:
    base=EmployeeDocument.objects.get(tenant=t);cat=base.category;cat.requires_expiry_date=True;cat.visibility_rules={'accepted_mime_types':['text/plain']};cat.save()
    artifact=store_document_artifact(tenant=t,employee=e,uploaded_file=ContentFile(b'Phase 4 original evidence.\n',name='qa-phase4-original.txt'),actor_identifier='qa-phase4')
    base.artifact=artifact;base.file_name='qa-phase4-original.txt';base.file_size_bytes=artifact.file_size_bytes;base.mime_type='text/plain';base.verification_status='rejected';base.reupload_requested=True;base.rejection_reason='Please provide a renewed copy.';base.save()
    categories={}
    for key,name,allowed,verify in [('auto','QA Automatic Evidence',True,False),('missing','QA Missing Evidence',True,True),('restricted','QA HR Only Evidence',False,True)]:
        c=DocumentCategory.objects.create(tenant=t,code='phase4-'+key,name=name,allow_employee_upload=allowed,requires_verification=verify,allow_multiple_files=True,visibility_rules={'accepted_mime_types':['text/plain']})
        DocumentRequirementRule.objects.create(tenant=t,category=c,employment_type=e.employment_type,is_mandatory=True)
        categories[key]=str(c.id)
    history=DocumentCategory.objects.create(tenant=t,code='phase4-history',name='QA History',allow_employee_upload=False,allow_multiple_files=True)
    for i in range(12):EmployeeDocument.objects.create(tenant=t,employee=e,category=history,title=f'QA history {i:02d}',file_name=f'history-{i}.txt',verification_status='pending')
    context={'base':str(base.id),'identity_category':str(cat.id),'categories':categories,'employee':str(e.id),'hr_target':m['credentials']['manager']['employee_id'],'seed_artifact_path':artifact.stored_file.path}
    Path(os.environ['QA_PHASE4_MANIFEST']).with_name('phase4-context.json').write_text(json.dumps(context))
