import os,json
from pathlib import Path
from apps.employees.models import Employee
from apps.organizations import models as org
from apps.iam.models import User,TenantMembership,MembershipRole,Role,RolePermission
m=json.loads(Path(os.environ['QA_ORG_MANIFEST']).read_text());e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);t=e.tenant;assert t.code==m['tenant']['code'] and t.code.startswith('pw-qa-')
sections={'legal_entities':'LegalEntity','locations':'Location','branches':'Branch','business_units':'BusinessUnit','departments':'Department','cost_centers':'CostCenter','grades':'Grade','designations':'Designation','employment_types':'EmploymentType'}
context={'sections':{key:{'id':str(x.id),'code':x.code,'name':x.name} for key,value in sections.items() for x in [getattr(org,value).objects.filter(tenant=t).first()]}}
for i in range(24):org.Department.objects.create(tenant=t,code=f'qa-team-{i:02d}',name=f'QA Team {i:02d}',business_unit=e.business_unit)
for persona,keys in [('hr_checker',['organization.view']),('manager',['organization.manage','employees.view']),('manager_b',['organization.manage'])]:
 u=User.objects.get(username=m['credentials'][persona]['username']);membership=TenantMembership.objects.get(user=u,tenant=t);MembershipRole.objects.filter(membership=membership).delete();role=Role.objects.create(tenant=t,code='hr-qa-organization-'+persona,name='QA organization '+persona)
 for key in keys:RolePermission.objects.create(role=role,permission_key=key)
 MembershipRole.objects.create(membership=membership,role=role,is_primary=True)
Path(os.environ['QA_ORG_MANIFEST']).with_name('organization-phase2-context.json').write_text(json.dumps(context))
