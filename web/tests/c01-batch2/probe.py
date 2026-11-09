"""Batch2 owned PostgreSQL assertion probe; never imports local settings."""
import os,json,sys,hashlib,uuid,traceback,runpy
from pathlib import Path
import django
django.setup()
from django.db import connection,close_old_connections
from django.apps import apps
from django.utils import timezone
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from rest_framework.test import APIClient
from unittest.mock import patch
from apps.tenants.models import Tenant
from apps.attendance.models import Shift,EmployeeShiftAssignment,ShiftRosterTemplate,ShiftRosterRollout,ShiftRosterRolloutItem
from apps.attendance.services import resolve_employee_work_day
from apps.common.models import SaasCommercialAuditEvent
S=Path(os.environ['C02_STATE']);E=Path(os.environ['C02_EVIDENCE']);D=Path(os.environ['C02_DOCS']);fixtures=json.loads((S/'fixtures.json').read_text());own,foreign=fixtures
assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_c02' and int(connection.settings_dict['PORT'])==55519
t=Tenant.objects.get(pk=own['tenant']['id']);actor=t.employees.get(employee_code='QA-HR-001');employee=t.employees.get(employee_code='QA-MGR-002');client=APIClient();client.force_authenticate(actor.membership.user)
def digest(q):return hashlib.sha256(json.dumps(list(q.order_by('pk').values()),default=str,sort_keys=True).encode()).hexdigest()
def snapshot():
 result={'foreign':{},'protected':{},'historical_inputs':{},'own':{}}
 for m in apps.get_models():
  fields={f.name for f in m._meta.fields};label=m._meta.label
  if 'tenant' in fields:result['foreign'][label]=digest(m.objects.filter(tenant_id=foreign['tenant']['id']))
  if m._meta.app_label=='payroll':result['protected'][label]=digest(m.objects.all())
  if 'tenant' in fields and (m._meta.app_label=='leave_management' or label in ['attendance.AttendanceRecord','attendance.AttendanceRegularization','attendance.AttendancePeriodClose']):result['historical_inputs'][label]=digest(m.objects.filter(tenant=t))
  if 'tenant' in fields and m._meta.app_label in ['attendance','leave_management','employees','organizations']:result['own'][label]=digest(m.objects.filter(tenant=t))
 result['audits']=digest(SaasCommercialAuditEvent.objects.filter(tenant=t).exclude(event_type__icontains='denied').exclude(event_type__icontains='rejected'))
 return result
if sys.argv[1]=='snapshot':print(json.dumps(snapshot()));sys.exit()
sid=sys.argv[1];scenario=next(x for x in json.loads((D/'scenarios.json').read_text()) if x['id']==sid);req=next(x for x in json.loads((D/'requirements.json').read_text()) if x['id']==scenario['requirement_id']);cat=scenario['category'];route=req.get('api_route','');tag=uuid.uuid4().hex[:12];day=timezone.localdate()+timedelta(days=3650+list(x['id'] for x in json.loads((D/'scenarios.json').read_text())).index(sid)*35);end=day+timedelta(days=3)
SH='/api/v1/hr-admin/shifts/';AS='/api/v1/hr-admin/employee-shift-assignments/';RT='/api/v1/hr-admin/shift-roster-templates/';requests=[]
def post(url,data,c=client):
 r=c.post(url,data,format='json');requests.append({'method':'POST','target':url,'status':r.status_code,'response':r.data});return r
def create_shift():
 r=post(SH,{'code':'c02-'+uuid.uuid4().hex[:12],'name':'C02 owned shift','start_time':'09:00','end_time':'17:00','working_hours':'8.00','weekly_off_days':['sunday']});assert r.status_code==201,r.data;return r.data['id']
shift=create_shift() if route!= '/api/hr-admin/shifts' else None
template=None
if route.endswith('/rollout'):
 r=post(RT,{'code':'c02-'+tag,'name':'C02 owned template','shift_id':shift,'status':'published','assignment_kind':'fixed'});assert r.status_code==201,r.data;template=r.data['id']
if route=='/api/hr-admin/shifts':url=SH;data={'code':'c02-'+tag,'name':'C02 owned overnight','start_time':'22:00','end_time':'06:00','is_night_shift':True,'working_hours':'8.00','weekly_off_days':['sunday']};model=Shift;event='attendance_shift_created';object_field='shift_id'
elif route=='/api/hr-admin/employee-shift-assignments':url=AS;data={'employee_id':str(employee.id),'shift_id':shift,'effective_from':str(day),'effective_to':str(end),'is_primary':True};model=EmployeeShiftAssignment;event='attendance_shift_assignment_created';object_field='assignment_id'
elif route=='/api/hr-admin/shift-roster-templates':url=RT;data={'code':'c02-'+tag,'name':'C02 owned template','shift_id':shift,'assignment_kind':'fixed','status':'published'};model=ShiftRosterTemplate;event='attendance_shift_roster_template_created';object_field='template_id'
else:url=RT+'rollout/';data={'template_id':template,'employee_ids':[str(employee.id)],'effective_from':str(day),'effective_to':str(end),'is_primary':True,'dry_run':False};model=ShiftRosterRollout;event=None;object_field=None
before=snapshot();count=model.objects.filter(tenant=t).count();audit_count=SaasCommercialAuditEvent.objects.filter(tenant=t,event_type=event).count() if event else 0;completed=False;details={}
try:
 if cat in ['positive','integrity','audit']:
  if url.endswith('rollout/'):
   dry=post(url,{**data,'dry_run':True});assert dry.status_code==200 and dry.data['created_count']==1;assert snapshot()==before,'preview changed durable state'
  r=post(url,data);assert r.status_code==(200 if url.endswith('rollout/') else 201),r.data
  assert model.objects.filter(tenant=t).count()==count+1
  if model==Shift:
   obj=Shift.objects.get(pk=r.data['id']);assert str(obj.start_time)=='22:00:00' and str(obj.end_time)=='06:00:00' and obj.weekly_off_days==['sunday']
  elif model==EmployeeShiftAssignment:
   obj=EmployeeShiftAssignment.objects.get(pk=r.data['id']);assert obj.effective_from==day and obj.effective_to==end and str(obj.shift_id)==str(shift)
   for date in [day,end]:assert resolve_employee_work_day(employee=employee,work_date=date)['roster_assignment_id']==str(obj.id)
  elif model==ShiftRosterTemplate:
   obj=ShiftRosterTemplate.objects.get(pk=r.data['id']);assert str(obj.shift_id)==str(shift) and obj.assignment_kind=='fixed' and obj.status=='published'
  else:
   obj=ShiftRosterRollout.objects.get(pk=r.data['rollout_id']);assert obj.initiated_by_id==actor.id and obj.created_count==1 and obj.target_count==1
   item=ShiftRosterRolloutItem.objects.get(rollout=obj);assert item.employee_id==employee.id and item.assignment_id and item.status=='created';assignment=item.assignment
   assert assignment.effective_from==day and assignment.effective_to==end and str(assignment.shift_id)==str(shift)
   for date in [day,end]:assert resolve_employee_work_day(employee=employee,work_date=date)['roster_assignment_id']==str(assignment.id)
   details['rollout_item']={'id':str(item.pk),'assignment':str(assignment.pk),'initiator':str(obj.initiated_by_id)}
  if event:
   audits=SaasCommercialAuditEvent.objects.filter(tenant=t,event_type=event,**{'event_snapshot__'+object_field:str(obj.pk)});assert audits.count()==1 and audits.get().actor_identifier
  details['object_id']=str(obj.pk)
  if cat=='integrity' and event:
   stable=snapshot();bad={**data,'code':'bad-'+tag} if model in [Shift,ShiftRosterTemplate] else {**data,'effective_from':str(end+timedelta(days=10)),'effective_to':str(end+timedelta(days=12))}
   with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('C02 owned audit outage')):
    try:post(url,bad)
    except RuntimeError as ex:assert str(ex)=='C02 owned audit outage'
    else:raise AssertionError('audit exception absent')
   assert snapshot()==stable,'audit rollback changed state'
 elif cat=='validation':
  bads=([{'code':''},{'start_time':'25:00'},{'break_minutes':-1},{'working_hours':'1000.00'}] if model==Shift else [{'employee_id':None},{'shift_id':foreign['attendance']['shift_id']},{'effective_to':str(day-timedelta(days=1))}] if model==EmployeeShiftAssignment else [{'shift_id':None},{'code':''},{'shift_id':foreign['attendance']['shift_id']}] if model==ShiftRosterTemplate else [{'template_id':foreign.get('c02_template_id',str(uuid.uuid4()))},{'effective_to':str(day-timedelta(days=1))}])
  for bad in bads:
   stable=snapshot();r=post(url,{**data,**bad});assert r.status_code==400,r.data;assert snapshot()==stable
  if model in [Shift,ShiftRosterTemplate]:
   assert post(url,data).status_code==201;stable=snapshot();assert post(url,data).status_code==400;assert snapshot()==stable
 elif cat=='authorization':
  for role in ['employee','manager','manager_b',None]:
   c=APIClient();c.force_authenticate(t.employees.get(employee_code=own['credentials'][role]['employee_code']).membership.user if role else None);stable=snapshot();r=post(url,data,c);assert r.status_code in [401,403],r.data;assert snapshot()==stable
  assert post(url,data).status_code==(200 if model==ShiftRosterRollout else 201)
 elif cat=='isolation':
  if model==ShiftRosterTemplate:bads=[{'shift_id':foreign['attendance']['shift_id']}]
  elif model==EmployeeShiftAssignment:bads=[{'employee_id':foreign['credentials']['employee']['employee_id']},{'shift_id':foreign['attendance']['shift_id']}]
  elif model==ShiftRosterRollout:bads=[{'template_id':str(uuid.uuid4())}]
  else:bads=[]
  for bad in bads:
   stable=snapshot();r=post(url,{**data,**bad});assert r.status_code==400,r.data;assert snapshot()==stable
  if model==ShiftRosterRollout:
   stable=snapshot();r=post(url,{**data,'employee_ids':[foreign['credentials']['employee']['employee_id']],'dry_run':True});assert r.status_code==200 and r.data['target_count']==0;assert snapshot()==stable
 elif cat=='concurrency':
  barrier=Barrier(2)
  def run(_):
   close_old_connections()
   try:
    c=APIClient();c.force_authenticate(actor.membership.user);barrier.wait(timeout=15);r=c.post(url,data,format='json');return {'status':r.status_code,'data':r.data}
   finally:close_old_connections()
  with ThreadPoolExecutor(max_workers=2) as pool:out=list(pool.map(run,[0,1]))
  details['concurrent']=out
  if model==ShiftRosterRollout:
   assert [x['status'] for x in out]==[200,200],out;assert sorted(x['data']['created_count'] for x in out)==[0,1],out
   assert EmployeeShiftAssignment.objects.filter(tenant=t,employee=employee,effective_from=day,is_primary=True).count()==1
  else:assert sorted(x['status'] for x in out) in [[201,400],[201,409]],out;assert model.objects.filter(tenant=t).count()==count+1
  if event:assert SaasCommercialAuditEvent.objects.filter(tenant=t,event_type=event).count()==audit_count+1
  if model==EmployeeShiftAssignment:
   obj=EmployeeShiftAssignment.objects.get(tenant=t,employee=employee,effective_from=day,is_primary=True);version=obj.updated_at.isoformat()
   response=client.patch(AS+str(obj.id)+'/',{'effective_to':str(end+timedelta(days=1)),'expected_updated_at':version},format='json');assert response.status_code==200,response.data
   stable=snapshot();stale=client.patch(AS+str(obj.id)+'/',{'effective_to':str(end+timedelta(days=2)),'expected_updated_at':version},format='json');assert stale.status_code==409;assert snapshot()==stable
   replay_data={**data,'effective_from':str(end+timedelta(days=10)),'effective_to':str(end+timedelta(days=11))};key='c02-owned-'+tag
   first=client.post(AS,replay_data,format='json',HTTP_IDEMPOTENCY_KEY=key);stable=snapshot();again=client.post(AS,replay_data,format='json',HTTP_IDEMPOTENCY_KEY=key);assert first.status_code==again.status_code==201 and first.data['id']==again.data['id'];assert snapshot()==stable
   details['stale_status']=stale.status_code;details['replay_same_identity']=True

 else:raise AssertionError('unsupported category '+cat)
 after=snapshot();assert after['foreign']==before['foreign'] and after['protected']==before['protected'] and after['historical_inputs']==before['historical_inputs'];completed=True
finally:
 capsule={'scenario_id':sid,'requirement_id':req['id'],'category':cat,'completed':completed,'source':'actual Django APIClient + private PostgreSQL; Playwright adds BFF/browser checks','requests':requests,'details':details,'before':before,'after':snapshot()};(E/'capsules').mkdir(exist_ok=True);(E/'capsules'/(sid+'.json')).write_text(json.dumps(capsule,default=str,indent=2))
print(json.dumps({'completed':completed,'capsule':str(E/'capsules'/(sid+'.json'))}))
