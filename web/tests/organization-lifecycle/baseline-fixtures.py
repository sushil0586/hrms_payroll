import os,json
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit
from apps.organizations import models as org
from apps.iam.models import User,TenantMembership,MembershipRole,Role,RolePermission
m=json.loads(Path(os.environ['QA_ORG_MANIFEST']).read_text());e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);t=e.tenant;assert t.code==m['tenant']['code'] and t.code.startswith('pw-qa-');today=timezone.localdate();root=Path(os.environ['QA_ORG_EVIDENCE'])
sections={'legal_entities':'LegalEntity','locations':'Location','branches':'Branch','business_units':'BusinessUnit','departments':'Department','cost_centers':'CostCenter','grades':'Grade','designations':'Designation','employment_types':'EmploymentType'}
ids={key:str(getattr(org,value).objects.filter(tenant=t).first().id) for key,value in sections.items()}
o=EmployeeOnboarding.objects.create(tenant=t,employee=e,status='in_progress',expected_joining_date=today,onboarding_template_code='QA-baseline',assigned_owner_identifier='qa-owner')
p=ProbationReview.objects.create(tenant=t,employee=e,review_date=today-timedelta(days=120),decision='pending',reviewer_identifier='qa-reviewer',remarks='QA oldest review')
for i in range(110):ProbationReview.objects.create(tenant=t,employee=e,review_date=today+timedelta(days=i),decision='pending',remarks=f'QA review {i:03d}')
visible=ProbationReview.objects.filter(tenant=t).first();movement=EmployeeMovement.objects.create(tenant=t,employee=e,movement_type='transfer',status='draft',effective_date=today+timedelta(days=30),reason='QA baseline draft');exit=EmployeeExit.objects.create(tenant=t,employee=e,status='draft',proposed_last_working_date=today+timedelta(days=60),exit_reason='QA baseline draft')
context={'sections':ids,'onboardings':str(o.id),'probation-reviews':str(visible.id),'oldest_review':str(p.id),'movements':str(movement.id),'exits':str(exit.id),'expected_lifecycle_count':114}
Path(os.environ['QA_ORG_MANIFEST']).with_name('organization-context.json').write_text(json.dumps(context))
probes=[];client=APIClient();client.force_authenticate(User.objects.get(username=m['credentials']['hr_admin']['username']))
for url in ['/api/v1/hr-admin/lifecycle-queue/?page_size=500','/api/v1/hr-admin/probation-reviews/?page_size=500','/api/v1/hr-admin/lifecycle-queue/?page_size=100&page=2','/api/v1/hr-admin/probation-reviews/'+str(p.id)+'/']:
 response=client.get(url);data=response.data;probes.append({'persona':'hr-admin','url':url,'status':response.status_code,'total_count':data.get('total_count'),'page_size':data.get('page_size'),'loaded_count':len(data['items']) if 'items' in data else None,'id':str(data.get('id',''))})
for persona,key in [('hr_checker','lifecycle.view'),('manager','organization.manage')]:
 u=User.objects.get(username=m['credentials'][persona]['username']);membership=TenantMembership.objects.get(user=u,tenant=t);MembershipRole.objects.filter(membership=membership).delete();role=Role.objects.create(tenant=t,code='hr-qa-baseline-'+persona,name='QA baseline '+key);RolePermission.objects.create(role=role,permission_key=key);MembershipRole.objects.create(membership=membership,role=role,is_primary=True);client.force_authenticate(u)
 for url in ['/api/v1/hr-admin/lifecycle-options/','/api/v1/hr-admin/onboardings/','/api/v1/hr-admin/organization/','/api/v1/hr-admin/organization/options/']:
  response=client.get(url);probes.append({'persona':key,'url':url,'status':response.status_code})
(root/'read-probes.json').write_text(json.dumps(probes,indent=2)+'\n')
