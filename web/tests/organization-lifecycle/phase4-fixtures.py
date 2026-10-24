import os,json
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeMovement
from apps.employee_lifecycle.effective_services import initialize_employment_timeline
from apps.organizations.models import Department
from apps.tenants.models import Tenant
m=json.loads(Path(os.environ['QA_LIFECYCLE_MANIFEST']).read_text());tenant=Tenant.objects.get(id=m['tenant']['id']);assert tenant.code.startswith('pw-qa-')
e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);manager=Employee.objects.get(id=m['credentials']['manager']['employee_id']);today=timezone.localdate()
base=initialize_employment_timeline(employee_id=e.id,actor_identifier='QA phase4',approved_source_reference='QA phase4 baseline',effective_from=today-timedelta(days=365))
target=Department.objects.create(tenant=tenant,code='QA-MOVE',name='QA Movement destination')
record=EmployeeMovement.objects.create(tenant=tenant,employee=e,movement_type='transfer',status='draft',effective_date=today,reason='QA preserved movement',to_department=target,to_manager=manager,current_snapshot={'qa_source':{'retained':True}})
for i in range(12):EmployeeMovement.objects.create(tenant=tenant,employee=e,movement_type='transfer',status='draft',effective_date=today+timedelta(days=i+1),reason=f'QA page movement {i}',to_department=target,to_manager=manager)
Path(os.environ['QA_LIFECYCLE_MANIFEST']).with_name('phase4-context.json').write_text(json.dumps({'movement':str(record.id),'employee':str(e.id),'manager':str(manager.id),'target_department':str(target.id),'baseline':str(base.id),'today':str(today),'future':str(today+timedelta(days=30))}))
