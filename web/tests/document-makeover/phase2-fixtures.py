import os,json
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from apps.documents.services import store_document_artifact
from apps.documents.models import EmployeeDocument
from apps.employees.models import Employee
from apps.iam.models import User,TenantMembership,MembershipRole,Role,RolePermission
p=Path(os.environ['QA_PHASE2_MANIFEST']);x=json.loads(p.read_text());e=Employee.objects.get(id=x['credentials']['employee']['employee_id']);base=EmployeeDocument.objects.get(tenant=e.tenant)
a=store_document_artifact(tenant=e.tenant,employee=e,uploaded_file=ContentFile(b'QA phase 2 proof.\n',name='qa-phase2.txt'),actor_identifier='qa-phase2');base.artifact=a;base.file_name='qa-phase2.txt';base.file_size_bytes=a.file_size_bytes;base.verification_status='pending';base.save()
ids={'review':str(base.id)}
for i in range(28):
 d=EmployeeDocument.objects.create(tenant=e.tenant,employee=e,category=base.category,title=f'QA queue {i:02d}',file_name=f'qa-{i}.pdf',verification_status='pending',expires_on=timezone.localdate()-timedelta(days=1) if i==0 else None)
 if i==0:ids['expired']=str(d.id)
roles={}
for persona,key in [('hr_checker','documents.view'),('manager','documents.manage'),('manager_b','documents.verify'),('tenant_admin','documents.export')]:
 u=User.objects.get(username=x['credentials'][persona]['username']);m=TenantMembership.objects.get(user=u,tenant=e.tenant);MembershipRole.objects.filter(membership=m).delete();r=Role.objects.create(tenant=e.tenant,code='hr-qa-'+key.split('.')[-1],name='QA '+key);RolePermission.objects.create(role=r,permission_key=key);MembershipRole.objects.create(membership=m,role=r,is_primary=True);roles[key]=x['credentials'][persona]
(p.parent/'phase2-context.json').write_text(json.dumps({'ids':ids,'roles':roles,'artifact_path':str(a.stored_file.path)}))
