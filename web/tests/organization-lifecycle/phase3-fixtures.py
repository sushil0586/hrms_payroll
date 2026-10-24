import os,json
from pathlib import Path
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit
from apps.tenants.models import Tenant
from apps.tenants.retention import authorized_synthetic_tenant_teardown
from apps.documents.models import EmployeeDocument
from apps.iam.models import User,TenantMembership,MembershipRole,Role,RolePermission
from apps.workflows.models import WorkflowTemplate,WorkflowStep
manifest=Path(os.environ['QA_LIFECYCLE_MANIFEST']);m=json.loads(manifest.read_text());context_path=manifest.with_name('lifecycle-phase3-context.json');tenant=Tenant.objects.get(id=m['tenant']['id']);assert tenant.code.startswith('pw-qa-')
if os.environ.get('QA_LIFECYCLE_CLEANUP')=='1':
 if context_path.exists():
  c=json.loads(context_path.read_text());foreign=Tenant.objects.filter(id=c['foreign_tenant']).first()
  if foreign:
   assert foreign.code==tenant.code+'-foreign'
   with transaction.atomic():
    with authorized_synthetic_tenant_teardown(foreign,expected_owner_email=tenant.primary_email):foreign.delete()
else:
 with transaction.atomic():
  today=timezone.localdate();employee=Employee.objects.get(id=m['credentials']['employee']['employee_id']);manager=Employee.objects.get(id=m['credentials']['manager']['employee_id']);admin=Employee.objects.get(id=m['credentials']['hr_admin']['employee_id'])
  for e in [manager,admin]:e.probation_end_date=today;e.confirmation_date=None;e.save(update_fields=['probation_end_date','confirmation_date'])
  original=EmployeeDocument.objects.filter(tenant=tenant,employee=employee).first()
  for recipient in [manager,admin]:
   EmployeeDocument.objects.create(tenant=tenant,employee=recipient,category=original.category,title='QA identity evidence',document_number='QA-ID-'+recipient.employee_code,issued_on=today,file_name='qa-identity.pdf',mime_type='application/pdf',status='active',verification_status='verified',verified_by_identifier='playwright-fixture',verified_at=timezone.now(),metadata={'owner':'playwright'})
  onboarding=EmployeeOnboarding.objects.create(tenant=tenant,employee=employee,status='in_progress',expected_joining_date=today,notes='QA oldest onboarding',workflow_reference='QA mixed owner',assigned_owner_identifier='qa-owner')
  for i in range(12):
   e=Employee.objects.create(tenant=tenant,employee_code=f'QA-JOIN-{i:02d}',first_name='QA Joiner',last_name=f'{i:02d}')
   EmployeeOnboarding.objects.create(tenant=tenant,employee=e,status='not_started',expected_joining_date=today+timedelta(days=i),notes=f'QA Joiner {i:02d}')
  oldest=ProbationReview.objects.create(tenant=tenant,employee=employee,review_date=today-timedelta(days=120),decision='pending',remarks='QA oldest review',workflow_reference='QA mixed owner')
  for i in range(110):ProbationReview.objects.create(tenant=tenant,employee=employee,review_date=today+timedelta(days=i),decision='pending',remarks=f'QA review {i:03d}')
  confirm=ProbationReview.objects.create(tenant=tenant,employee=admin,review_date=today,probation_end_date=today,decision='pending',remarks='QA confirmation')
  extend=ProbationReview.objects.create(tenant=tenant,employee=manager,review_date=today,probation_end_date=today,decision='pending',remarks='QA extension')
  movement=EmployeeMovement.objects.create(tenant=tenant,employee=employee,movement_type='transfer',status='draft',effective_date=today+timedelta(days=30),reason='QA movement')
  exit=EmployeeExit.objects.create(tenant=tenant,employee=employee,status='draft',proposed_last_working_date=today+timedelta(days=60),exit_reason='QA exit')
  template=WorkflowTemplate.objects.create(tenant=tenant,code='qa-phase3-onboard',name='QA Phase 3 onboarding',module='lifecycle',trigger_key='qa.phase3.onboard',status='active',version=1)
  WorkflowStep.objects.create(template=template,step_order=1,name='QA joining task',actor_type='hr_owner',rule_snapshot={'due_anchor':'expected_joining_date','due_offset_days':2},escalate_after_hours=48)
  foreign=Tenant.objects.create(code=tenant.code+'-foreign',name='QA foreign lifecycle tenant',is_sandbox=True,primary_email=tenant.primary_email);foreign_employee=Employee.objects.create(tenant=foreign,employee_code='QA-FOREIGN',first_name='QA Foreign');foreign_review=ProbationReview.objects.create(tenant=foreign,employee=foreign_employee,review_date=today,decision='pending')
  u=User.objects.get(username=m['credentials']['hr_checker']['username']);membership=TenantMembership.objects.get(user=u,tenant=tenant);MembershipRole.objects.filter(membership=membership).delete();role=Role.objects.create(tenant=tenant,code='hr-phase3-view',name='QA lifecycle view');RolePermission.objects.create(role=role,permission_key='lifecycle.view');MembershipRole.objects.create(membership=membership,role=role,is_primary=True)
  context={'onboarding':str(onboarding.id),'probation':str(oldest.id),'movement':str(movement.id),'exit':str(exit.id),'confirm':str(confirm.id),'extend':str(extend.id),'employee':str(employee.id),'manager':str(manager.id),'admin_employee':str(admin.id),'foreign':str(foreign_review.id),'foreign_tenant':str(foreign.id),'today':str(today),'extension_date':str(today+timedelta(days=30)),'template_code':template.code,'expected_count':sum(model.objects.filter(tenant=tenant).count() for model in [EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit])}
  context_path.write_text(json.dumps(context))
