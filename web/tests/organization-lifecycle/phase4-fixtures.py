import os,json
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from apps.employees.models import Employee
from apps.employee_lifecycle.models import EmployeeMovement
from apps.employee_lifecycle.effective_services import MOVEMENT_BACKDATING_WINDOW_CONFIG_KEY,initialize_employment_timeline
from apps.organizations.models import Branch,BusinessUnit,Department,EmploymentType,Location
from apps.platform_config.models import TenantConfiguration
from apps.tenants.models import Tenant
m=json.loads(Path(os.environ['QA_LIFECYCLE_MANIFEST']).read_text());tenant=Tenant.objects.get(id=m['tenant']['id']);assert tenant.code.startswith('pw-qa-')
e=Employee.objects.get(id=m['credentials']['employee']['employee_id']);manager=Employee.objects.get(id=m['credentials']['manager']['employee_id']);today=timezone.localdate()
base=e.employment_assignments.order_by('effective_from').first()
if base is None:
    base=initialize_employment_timeline(employee_id=e.id,actor_identifier='QA phase4',approved_source_reference='QA phase4 baseline',effective_from=today-timedelta(days=365))
target=Department.objects.create(tenant=tenant,code='QA-MOVE',name='QA Movement destination')
future_target=Department.objects.create(tenant=tenant,code='QA-MOVE-FUTURE',name='QA Movement future destination')
target_location=Location.objects.create(tenant=tenant,code='qa-move-location',name='QA Movement location',city='Mumbai',state='Maharashtra')
target_branch=Branch.objects.create(tenant=tenant,code='qa-move-branch',name='QA Movement branch',legal_entity=e.legal_entity,location=target_location)
target_business_unit=BusinessUnit.objects.create(tenant=tenant,code='qa-move-business',name='QA Movement business')
target_hierarchy_department=Department.objects.create(tenant=tenant,code='qa-move-hierarchy',name='QA Movement hierarchy',business_unit=target_business_unit)
target_employment_type=EmploymentType.objects.create(tenant=tenant,code='qa-contract',name='QA Contract',description='Synthetic movement target')
backdate_target=Department.objects.create(tenant=tenant,code='qa-move-backdate',name='QA Movement backdate destination')
hierarchy_employee=Employee.objects.get(id=m['credentials']['manager_b']['employee_id'])
employment_type_employee=Employee.objects.get(id=m['credentials']['tenant_admin']['employee_id'])
backdate_employee=Employee.objects.get(id=m['credentials']['hr_checker']['employee_id'])
backdate_config=TenantConfiguration.objects.get(tenant=tenant,definition__key=MOVEMENT_BACKDATING_WINDOW_CONFIG_KEY);backdate_config.current_value=30;backdate_config.published_value=30;backdate_config.save(update_fields=['current_value','published_value','updated_at'])
record=EmployeeMovement.objects.create(tenant=tenant,employee=e,movement_type='transfer',status='draft',effective_date=today,reason='QA preserved movement',to_department=target,to_manager=manager,current_snapshot={'qa_source':{'retained':True}})
for i in range(12):EmployeeMovement.objects.create(tenant=tenant,employee=e,movement_type='transfer',status='draft',effective_date=today+timedelta(days=i+1),reason=f'QA page movement {i}',to_department=target,to_manager=manager)
Path(os.environ['QA_LIFECYCLE_MANIFEST']).with_name('phase4-context.json').write_text(json.dumps({'movement':str(record.id),'employee':str(e.id),'manager':str(manager.id),'target_department':str(target.id),'future_department':str(future_target.id),'baseline':str(base.id),'today':str(today),'future':str(today+timedelta(days=30)),'hierarchy_employee':str(hierarchy_employee.id),'employment_type_employee':str(employment_type_employee.id),'backdate_employee':str(backdate_employee.id),'backdate_target':str(backdate_target.id),'backdate_allowed':str(today-timedelta(days=10)),'backdate_rejected':str(today-timedelta(days=31)),'source_location':str(hierarchy_employee.location_id),'source_business_unit':str(hierarchy_employee.business_unit_id),'target_location':str(target_location.id),'target_branch':str(target_branch.id),'target_business_unit':str(target_business_unit.id),'target_hierarchy_department':str(target_hierarchy_department.id),'target_employment_type':str(target_employment_type.id)}))
