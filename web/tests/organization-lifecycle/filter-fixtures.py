"""Contrasting records for filter acceptance only; no business transitions are invoked."""
import json,os
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from apps.employees.models import Employee
from apps.organizations import models as org
from apps.employee_lifecycle.models import EmployeeOnboarding,ProbationReview,EmployeeMovement,EmployeeExit,OnboardingStatus,ProbationDecision,LifecycleEventStatus,ExitStatus,MovementType
m=json.loads(Path(os.environ['QA_FILTER_MANIFEST']).read_text());t=Employee.objects.get(pk=m['credentials']['employee']['employee_id']).tenant
assert t.code==m['tenant']['code'] and t.code.startswith('pw-qa-')
today=timezone.localdate();manager=Employee.objects.get(pk=m['credentials']['manager']['employee_id'])
sections={'legal_entities':'LegalEntity','locations':'Location','branches':'Branch','business_units':'BusinessUnit','departments':'Department','cost_centers':'CostCenter','grades':'Grade','designations':'Designation','employment_types':'EmploymentType'}
for section,model in sections.items():
 cls=getattr(org,model)
 original=cls.objects.filter(tenant=t).first()
 fields={f.attname:getattr(original,f.attname) for f in cls._meta.concrete_fields if not f.primary_key and f.name not in ('created_at','updated_at','code','name','is_active')}
 for i in range(12):cls.objects.create(**fields,code=f'filter-{i:02d}',name=f'Filter Master {i:02d}',is_active=i%2==0)
for kind,choices in [('onboarding',OnboardingStatus.values),('probation',ProbationDecision.values),('movement',LifecycleEventStatus.values),('exit',ExitStatus.values)]:
 for i in range(40 if kind=='probation' else max(12,len(choices),len(MovementType.values))):
  e=Employee.objects.create(tenant=t,employee_code=f'FILTER-{kind[:3].upper()}-{i:03d}',first_name='Filter',last_name=f'{kind} {i:03d}')
  due=today+timedelta(days=(i%5)-2);owner='filter-owner-one' if i%2==0 else 'filter-owner-two';status=choices[i%len(choices)]
  task={'key':'qa-filter','label':'Filter task','status':'pending','due_on':str(today+timedelta(days=2)),'escalation_due_on':str(today+timedelta(days=3))} if i%2==0 else {'key':'qa-filter','label':'Filter task','status':'pending','due_on':str(today-timedelta(days=3))}
  common={'tenant':t,'employee':e,'workflow_reference':f'Filter Workflow {kind} {i:03d}'}
  if kind=='onboarding':x=EmployeeOnboarding.objects.create(**common,status=status,expected_joining_date=due,assigned_owner_identifier=owner,notes='Filter searchable note',checklist_snapshot=[task])
  elif kind=='probation':x=ProbationReview.objects.create(**common,decision=status,review_date=due,reviewer_identifier=owner,remarks='Filter searchable note')
  elif kind=='movement':x=EmployeeMovement.objects.create(**common,status=status,movement_type=MovementType.values[i%len(MovementType.values)],effective_date=due,to_manager=manager if i%2==0 else None,reason='Filter searchable note')
  else:x=EmployeeExit.objects.create(**common,status=status,proposed_last_working_date=due,rehire_eligible=i%2==0,exit_reason='Filter searchable note')
  type(x).objects.filter(pk=x.pk).update(created_at=timezone.now()-timedelta(days=[0,7,8,14,15,29,30,60][i%8]))
Path(os.environ['QA_FILTER_MANIFEST']).with_name('filter-context.json').write_text(json.dumps({'today':str(today),'employee':m['credentials']['employee']['employee_id'],'sections':list(sections)}))
