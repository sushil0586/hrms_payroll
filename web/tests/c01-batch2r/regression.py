import django,json,os,sys,uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
django.setup()
from django.db import connection,close_old_connections
from rest_framework.test import APIClient
from apps.tenants.models import Tenant
from apps.attendance.models import Shift,ShiftRosterTemplate
from apps.common.models import SaasCommercialAuditEvent
assert connection.vendor=='postgresql' and connection.settings_dict['NAME']=='hrms_c02r'
s=Path(os.environ['C02R_STATE']);E=Path(os.environ['C02R_EVIDENCE']);own=json.loads((s/'fixtures.json').read_text())[0];t=Tenant.objects.get(pk=own['tenant']['id']);actor=t.employees.get(employee_code='QA-HR-001');c=APIClient();c.force_authenticate(actor.membership.user);SH='/api/v1/hr-admin/shifts/';RT='/api/v1/hr-admin/shift-roster-templates/'
def state():return {'shifts':list(Shift.objects.filter(tenant=t).order_by('pk').values()),'templates':list(ShiftRosterTemplate.objects.filter(tenant=t).order_by('pk').values()),'audits':list(SaasCommercialAuditEvent.objects.filter(tenant=t).order_by('pk').values())}
def dump(x):return json.dumps(x,default=str,sort_keys=True)
def outage(method,url,body=None):
 before=dump(state())
 with patch('apps.common.api_views._record_hr_admin_setup_audit_event',side_effect=RuntimeError('C02R mutation audit outage')):
  try:getattr(c,method)(url,body or {},format='json')
  except RuntimeError as ex:assert str(ex)=='C02R mutation audit outage'
  else:raise AssertionError('Missing audit failure')
 assert dump(state())==before
 return {'operation':method+' '+url,'before_sha256':__import__('hashlib').sha256(before.encode()).hexdigest(),'after_sha256':__import__('hashlib').sha256(dump(state()).encode()).hexdigest(),'atomic_rollback':True}
checks=[];case=sys.argv[1];tag=uuid.uuid4().hex[:10]
if case=='atomicity':
 shift={'code':'r-'+tag,'name':'C02R regression shift','start_time':'09:00','end_time':'17:00','working_hours':'8.00'};checks.append(outage('post',SH,shift));r=c.post(SH,shift,format='json');assert r.status_code==201;id=r.data['id'];checks.append(outage('patch',SH+id+'/',{'name':'Must roll back'}));checks.append(outage('delete',SH+id+'/'))
 assert c.patch(SH+id+'/',{'name':'Committed'},format='json').status_code==200
 assert c.post(SH,shift,format='json').status_code==400
 assert c.delete(SH+id+'/').status_code==200
 events=SaasCommercialAuditEvent.objects.filter(tenant=t,event_snapshot__shift_id=id);assert set(events.values_list('event_type',flat=True))=={'attendance_shift_created','attendance_shift_updated','attendance_shift_deleted'};assert events.count()==3 and all(e.actor_identifier==actor.membership.user.username for e in events)
 template={'code':'r-'+tag,'name':'C02R regression template','shift_id':str(t.shifts.first().pk),'status':'published'};checks.append(outage('post',RT,template));r=c.post(RT,template,format='json');assert r.status_code==201;id=r.data['id'];checks.append(outage('patch',RT+id+'/',{'name':'Must roll back','expected_updated_at':r.data['updated_at']}));checks.append(outage('delete',RT+id+'/'));assert c.delete(RT+id+'/').status_code==200
 checks.append({'shift_events':list(events.values()),'template_id':id,'created_retry_then_deleted':True})
elif case=='template-stale':
 r=c.post(RT,{'code':'r-'+tag,'name':'Before edit','shift_id':str(t.shifts.first().pk),'status':'published'},format='json');assert r.status_code==201;id=r.data['id'];version=r.data['updated_at'];barrier=Barrier(2);before=SaasCommercialAuditEvent.objects.filter(tenant=t).count()
 def edit(name):
  close_old_connections()
  try:
   cc=APIClient();cc.force_authenticate(actor.membership.user);barrier.wait(timeout=15);r=cc.patch(RT+id+'/',{'name':name,'expected_updated_at':version},format='json');return {'status':r.status_code,'name':name,'body':r.data}
  finally:close_old_connections()
 with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(edit,['Editor A','Editor B']))
 assert sorted(x['status'] for x in responses)==[200,409],responses;obj=ShiftRosterTemplate.objects.get(pk=id);assert obj.name==next(x['name'] for x in responses if x['status']==200);assert SaasCommercialAuditEvent.objects.filter(tenant=t).count()==before+1
 before_state=dump(state());stale=c.patch(RT+id+'/',{'name':'Stale editor','expected_updated_at':version},format='json');assert stale.status_code==409 and dump(state())==before_state;checks.append({'responses':responses,'final_name':obj.name,'old_version':version,'new_version':obj.updated_at,'one_update_event':True,'stale_retry_non_effect':True})
else:raise AssertionError(case)
(E/'regressions').mkdir(exist_ok=True);output={'case':case,'completed':True,'checks':checks};(E/'regressions'/(case+'.json')).write_text(json.dumps(output,default=str,indent=2));print(json.dumps({'completed':True,'case':case}))
