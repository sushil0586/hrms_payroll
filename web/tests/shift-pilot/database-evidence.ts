import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Page, TestInfo } from '@playwright/test';
const exec = promisify(execFile);
// Campaign-only inspection of the same explicitly verified PostgreSQL runtime.
// Request bodies, cookies and credentials are deliberately absent from attachments.
export async function retainShiftMutationEvidence(page: Page, info: TestInfo, tenantId: string, expectedActor: string) {
  if (!/^[a-f\d-]{36}$/i.test(tenantId)) throw new Error('Invalid owned tenant identity');
  const root = path.resolve(__dirname, '../../..');
  const script = `import json; from django.db import connection; from apps.attendance.models import Shift,EmployeeShiftAssignment; from apps.common.models import SaasCommercialAuditEvent; assert connection.vendor == 'postgresql'; tenant='${tenantId}'; print(json.dumps({'vendor':connection.vendor,'tenant':tenant,'shifts':list(Shift.objects.filter(tenant_id=tenant).order_by('id').values('id','code','name','start_time','end_time','updated_at')),'assignments':list(EmployeeShiftAssignment.objects.filter(tenant_id=tenant).order_by('id').values('id','employee_id','shift_id','effective_from','effective_to','is_primary','updated_at')),'audit':list(SaasCommercialAuditEvent.objects.filter(tenant_id=tenant,event_type__in=['attendance_shift_created','attendance_shift_updated','attendance_shift_assignment_created','attendance_shift_assignment_updated']).order_by('id').values('id','event_type','actor_identifier','event_snapshot'))},default=str))`;
  async function snapshot() {
    const {stdout} = await exec(process.env.HRMS_QA_PYTHON || path.join(root,'.venv/bin/python'), ['backend/manage.py','shell','-c',script], {cwd:root,env:process.env,maxBuffer:4*1024*1024});
    return JSON.parse(stdout.trim().split('\n').at(-1)!);
  }
  let index=0;
  await page.route(/\/api\/hr-admin\/(shifts|employee-shift-assignments)(\/[a-f\d-]{36})?$/,async route=>{
    if (!['POST','PATCH','DELETE'].includes(route.request().method())) {await route.continue();return;}
    const identity=++index; const before=await snapshot();
    const response=await route.fetch(); const after=await snapshot();
    await info.attach(`sql-mutation-${identity}`,{body:JSON.stringify({expectedActor,method:route.request().method(),path:new URL(route.request().url()).pathname,status:response.status(),before,after},null,2),contentType:'application/json'});
    await route.fulfill({response});
  });
}

// This prepares a real closed attendance period in the exact owned browser
// fixture. Payroll input locking in the base fixture is a different contract.
export async function prepareOwnedAttendanceClose(info: TestInfo, workspace: import('../helpers/isolated-qa-workspace').IsolatedQaWorkspace) {
  const {id,code}=workspace.manifest.tenant;
  if(!/^[a-f\d-]{36}$/i.test(id)||!/^[a-z\d-]+$/.test(workspace.seedRef)||code!==`pw-qa-${workspace.seedRef}`)throw new Error('Invalid owned fixture identity');
  const root=path.resolve(__dirname,'../../..');
  const script=`import json; from datetime import date; from django.db import connection; from apps.tenants.models import Tenant; from apps.attendance.services import reconcile_attendance_period,transition_attendance_close; from apps.common.management.commands.manage_playwright_workspace import Command; assert connection.vendor=='postgresql'; assert connection.settings_dict['HOST']=='127.0.0.1' and str(connection.settings_dict['PORT'])=='55439' and connection.settings_dict['NAME']=='hrms_shift_pilot'; tenant=Tenant.objects.get(id=${JSON.stringify(id)},code=${JSON.stringify(code)}); guard=Command(); guard._assert_safe_identity(${JSON.stringify(workspace.seedRef)},${JSON.stringify(code)}); guard._assert_owned(tenant,${JSON.stringify(workspace.seedRef)}); employee=tenant.employees.get(id=${JSON.stringify(workspace.manifest.credentials.employee.employee_id)}); actor=tenant.employees.get(id=${JSON.stringify(workspace.manifest.credentials.hr_admin.employee_id)}); close=reconcile_attendance_period(tenant=tenant,legal_entity=employee.legal_entity,period_start=date(2033,1,1),period_end=date(2033,1,31),actor=actor,idempotency_key='p6-owned-browser-close');\nfor action in ('submit','approve','close'): close=transition_attendance_close(close=close,actor=actor,action=action)\nassert close.status=='closed'; print(json.dumps({'kind':'owned synthetic fixture setup through real reconciliation/transition services','tenant':str(tenant.id),'employee':str(employee.id),'close_id':str(close.id),'period_start':str(close.period_start),'period_end':str(close.period_end),'status':close.status,'snapshot_hash':close.snapshot_hash}))`;
  const {stdout}=await exec(process.env.HRMS_QA_PYTHON||path.join(root,'.venv/bin/python'),['backend/manage.py','shell','-c',script],{cwd:root,env:process.env,maxBuffer:4*1024*1024});
  const record=JSON.parse(stdout.trim().split('\n').at(-1)!);
  if(record.tenant!==id||record.status!=='closed')throw new Error('Attendance-close fixture not verified');
  await info.attach('owned-attendance-close-fixture',{body:JSON.stringify(record,null,2),contentType:'application/json'});
}
