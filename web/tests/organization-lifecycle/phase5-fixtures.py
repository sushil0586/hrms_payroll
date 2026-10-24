import os,json
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeExit,EmployeeOnboarding
from apps.tenants.models import Tenant
from apps.workflows.models import WorkflowTemplate,WorkflowStep
m=json.loads(Path(os.environ['QA_LIFECYCLE_MANIFEST']).read_text());t=Tenant.objects.get(id=m['tenant']['id']);assert t.code.startswith('pw-qa-');today=timezone.localdate();manager=Employee.objects.get(id=m['credentials']['manager']['employee_id'])
def person(code):return Employee.objects.create(tenant=t,employee_code='QA-EXIT-'+code,first_name='QA Exit',last_name=code,employment_status='active',reporting_manager=manager)
draft=person('draft');pending=person('pending');complete=person('complete');cancel=person('cancel');live=Employee.objects.get(id=m['credentials']['employee']['employee_id'])
x=EmployeeExit.objects.create(tenant=t,employee=draft,status='draft',resignation_date=today-timedelta(days=10),notice_start_date=today-timedelta(days=9),notice_end_date=today,proposed_last_working_date=today,approved_last_working_date=today,exit_reason='QA original exit',clearance_status_snapshot={'items':[{'code':'qa-return','label':'QA asset return','done':False,'required':True,'blocking':True,'owner':m['credentials']['manager']['username'],'due_on':str(today),'history':[]}],'workflow_template_code':'','notes':'QA original plan'},handover_notes='QA original handover')
can=EmployeeExit.objects.create(tenant=t,employee=cancel,status='draft',approved_last_working_date=today,exit_reason='QA cancellation')
liv=EmployeeExit.objects.create(tenant=t,employee=live,status='draft',actual_exit_date=today,exit_reason='QA live access')
for i in range(12):EmployeeExit.objects.create(tenant=t,employee=person(f'page{i}'),status='draft',proposed_last_working_date=today+timedelta(days=i),exit_reason=f'QA page exit {i}')
onboarding=EmployeeOnboarding.objects.create(tenant=t,employee=draft,status='in_progress',assigned_owner_identifier=m['credentials']['manager']['username'],checklist_snapshot=[{'code':'qa-owner-alias','label':'QA shared ownership','owner':m['credentials']['manager']['username'],'escalation_owner':'qa-legacy-escalation','done':False,'required':True,'blocking':True}])
template=WorkflowTemplate.objects.create(tenant=t,code='qa-phase5-exit',name='QA Phase5 clearance',module='lifecycle',trigger_key='qa.phase5.exit',status='active',version=1)
WorkflowStep.objects.create(template=template,step_order=1,name='QA asset clearance',actor_type='hr_owner',rule_snapshot={'due_anchor':'approved_last_working_date','due_offset_days':-2},escalate_after_hours=48)
Path(os.environ['QA_LIFECYCLE_MANIFEST']).with_name('phase5-context.json').write_text(json.dumps({'onboarding':str(onboarding.id),'exit':str(x.id),'pendingEmployee':str(pending.id),'completeEmployee':str(complete.id),'cancelExit':str(can.id),'cancelEmployee':str(cancel.id),'liveExit':str(liv.id),'liveEmployee':str(live.id),'today':str(today),'earlier':str(today-timedelta(days=10)),'beforeEarlier':str(today-timedelta(days=11)),'template':template.code}))
