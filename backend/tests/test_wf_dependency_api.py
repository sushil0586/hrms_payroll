"""Two narrowly scoped entry API probes; not execution of the frozen WF03 plan."""
from datetime import time
from uuid import uuid4
import json
import pytest
from apps.attendance.models import Shift,ShiftRosterTemplate,ShiftRosterRollout,ShiftRosterRolloutItem,EmployeeShiftAssignment
from apps.tenants.models import Tenant
from apps.common.models import SaasCommercialAuditEvent
from test_shift_p5_closure import scope
pytestmark=pytest.mark.django_db(transaction=True)
URL='/api/v1/hr-admin/shift-roster-templates/rollout/'
def counts(tenant):
 return [EmployeeShiftAssignment.objects.filter(tenant=tenant).count(),ShiftRosterRollout.objects.filter(tenant=tenant).count(),ShiftRosterRolloutItem.objects.filter(rollout__tenant=tenant).count(),SaasCommercialAuditEvent.objects.filter(tenant=tenant).count()]
def test_required_roster_api_preview_is_read_only_and_future_fixed_apply_reconciles(scope,record_property):
 tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-MGR-002');template=ShiftRosterTemplate.objects.create(tenant=tenant,code='wf-gate',name='Dependency API fixture',shift=tenant.shifts.first(),status='published')
 data={'template_id':str(template.id),'employee_ids':[str(employee.id)],'effective_from':'2055-01-01','effective_to':'2055-01-02','is_primary':True,'dry_run':True};before=counts(tenant)
 preview=client.post(URL,data,format='json');assert preview.status_code==200;assert preview.data['target_count']==1 and preview.data['created_count']==1;assert counts(tenant)==before
 applied=client.post(URL,{**data,'dry_run':False},format='json');assert applied.status_code==200
 assert applied.data['created_count']==1 and applied.data['skipped_count']==0
 rollout=ShiftRosterRollout.objects.get(id=applied.data['rollout_id'],tenant=tenant);assert rollout.initiated_by_id==actor.id and rollout.target_count==1
 item=ShiftRosterRolloutItem.objects.get(rollout=rollout);assignment=EmployeeShiftAssignment.objects.get(id=item.assignment_id,tenant=tenant,employee=employee)
 assert str(assignment.effective_from)=='2055-01-01' and str(assignment.effective_to)=='2055-01-02'
 assert counts(tenant)[:3]==[before[0]+1,before[1]+1,before[2]+1]
 record_property('required_api_reconciliation',json.dumps({'tenant':str(tenant.id),'preview':preview.data,'applied':applied.data,'before':before,'after':counts(tenant),'scope':'Existing future fixed assignment behavior only; no policy changes, retries or closed-period applicability certified.'},default=str))
def test_required_roster_api_denies_role_and_foreign_template_without_business_effect(scope):
 tenant,actor,client=scope;employee=tenant.employees.get(employee_code='QA-EMP-001');before=counts(tenant)
 template=ShiftRosterTemplate.objects.create(tenant=tenant,code='wf-role',name='Role fixture',shift=tenant.shifts.first(),status='published')
 data={'template_id':str(template.id),'employee_ids':[str(employee.id)],'effective_from':'2055-01-01','dry_run':False}
 client.force_authenticate(employee.membership.user);assert client.post(URL,data,format='json').status_code==403;assert counts(tenant)==before
 other=Tenant.objects.create(code='wf-foreign-'+uuid4().hex[:12],name='Synthetic foreign tenant',is_sandbox=True)
 shift=Shift.objects.create(tenant=other,code='foreign',name='Foreign fixture',start_time=time(9),end_time=time(17),working_hours=8)
 foreign=ShiftRosterTemplate.objects.create(tenant=other,code='foreign',name='Foreign fixture',shift=shift,status='published');other_before=counts(other)
 client.force_authenticate(actor.membership.user);assert client.post(URL,{**data,'template_id':str(foreign.id)},format='json').status_code==400
 assert counts(tenant)==before and counts(other)==other_before
