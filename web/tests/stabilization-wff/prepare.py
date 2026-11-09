import django,json,sys,hashlib
from pathlib import Path
django.setup()
from django.apps import apps
from django.utils import timezone
from apps.tenants.models import Tenant
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit
from apps.workflows.models import WorkflowTemplate,WorkflowTemplateAssignment
from apps.notifications.models import NotificationTemplate,NotificationEventDefinition,Notification
from apps.common.management.commands.manage_playwright_workspace import Command
m=json.loads(Path(sys.argv[1]).read_text());t=Tenant.objects.get(pk=m['tenant']['id']);Command()._assert_owned(t,sys.argv[2]);e=Employee.objects.get(pk=m['credentials']['employee']['employee_id']);today=timezone.localdate()
objects={}
for key,model,kw in [('onboardings',EmployeeOnboarding,{}),('probation-reviews',ProbationReview,{'review_date':today}),('movements',EmployeeMovement,{'movement_type':'transfer','effective_date':today}),('exits',EmployeeExit,{})]:
 obj=model.objects.filter(tenant=t,employee=e).first() or model.objects.create(tenant=t,employee=e,**kw);objects[key]=str(obj.id)
w=WorkflowTemplate.objects.create(tenant=t,code='wff-review',name='WF-F Review',module='lifecycle',trigger_key='wff.review');objects['workflow-templates']=str(w.id);objects['workflow-template-assignments']=str(WorkflowTemplateAssignment.objects.create(tenant=t,template=w).id)
n=NotificationTemplate.objects.create(tenant=t,code='wff-in-app',name='WF-F In app',channel='in_app',body_template='Synthetic notice');objects['notification-templates']=str(n.id);objects['notification-events']=str(NotificationEventDefinition.objects.create(tenant=t,code='wff.notice',name='WF-F notice',module='lifecycle',trigger_key='wff.notice',audience_type='employee',channel='in_app',template=n).id)
objects['notifications']=str(Notification.objects.filter(tenant=t).first().id)
models={'legal_entities':'LegalEntity','locations':'Location','branches':'Branch','business_units':'BusinessUnit','departments':'Department','cost_centers':'CostCenter','grades':'Grade','designations':'Designation','employment_types':'EmploymentType'}
for section,name in models.items():
 model=apps.get_model('organizations',name);obj=model.objects.filter(tenant=t).first()
 if not obj:
  kw={'tenant':t,'code':'wff-'+section.replace('_','-'),'name':'WF-F '+section}
  if name=='Branch':kw['legal_entity']=e.legal_entity
  obj=model.objects.create(**kw)
 objects[section]=str(obj.id)
protected={}
for model in apps.get_app_config('payroll').get_models():
 if any(f.name=='tenant' for f in model._meta.fields):protected[model._meta.label]=hashlib.sha256(json.dumps(list(model.objects.filter(tenant=t).order_by('pk').values()),sort_keys=True,default=str).encode()).hexdigest()
Path(sys.argv[1]).with_name('wff-protected.json').write_text(json.dumps(protected));print(json.dumps(objects))
