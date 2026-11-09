import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const state=process.env.C02S_STATE!,evidence=process.env.C02S_EVIDENCE!,docs=process.env.C02S_DOCS!;
const [own,foreign]=JSON.parse(fs.readFileSync(path.join(state,'fixtures.json'),'utf8'));
const scenarios=JSON.parse(fs.readFileSync(path.join(docs,'scenarios.json'),'utf8'));
const requirements=JSON.parse(fs.readFileSync(path.join(docs,'requirements.json'),'utf8'));
const prior=new Set(JSON.parse(fs.readFileSync(path.join(docs,'batch1-reconciliation.json'),'utf8')).selected_reuse.map((x:any)=>x.scenario_id));
const python='/Users/ansh/Library/Caches/hrms-qa/shift-pilot-py312/bin/python';const root=path.resolve(__dirname,'../../..');
function probe(id:string){return JSON.parse(execFileSync(python,['web/tests/c01-batch2s/probe.py',id],{cwd:root,env:process.env,encoding:'utf8',timeout:180000}));}
function journal(data:any){const fd=fs.openSync(path.join(evidence,'scenario-journal.jsonl'),'a');fs.writeSync(fd,JSON.stringify({...data,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd);fs.closeSync(fd);}
async function login(page:Page,role='hr_admin'){await page.context().addCookies([{name:'hrms_access_token',value:own.tokens[role],domain:'127.0.0.1',path:'/'}]);await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());}
function date(index:number){const d=new Date();d.setUTCDate(d.getUTCDate()+7000+index*35);return d.toISOString().slice(0,10);}
for(const [index,s] of scenarios.entries()){
 if(prior.has(s.id))continue;
 const req=requirements.find((r:any)=>r.id===s.requirement_id);
 test(s.id+' '+s.category,async({page,request},info)=>{
 journal({scenario:s.id,phase:'start'});let completed=false;const before=probe('snapshot');const exchanges:any[]=[];
 try{
 await login(page);
 if(req.kind==='page'){
  const route=req.pages[0];await page.goto(route);await expect(page.locator('main h1').first()).toBeVisible();
  if(s.category==='entry'){await page.reload();await expect(page.locator('main h1').first()).toBeVisible();expect(page.url()).toContain(route);}
  else if(s.category==='query'){
   const isShift=route.endsWith('/shifts'),isRoster=route.includes('roster');const input=page.getByPlaceholder(isShift?'Shift name, code, weekly off':isRoster?'Template, code, shift, description':'Employee, code, shift, scope');
   await input.fill('c02s-nonexistent-'+s.id);await page.getByRole('button',{name:isShift?'Apply':'Apply filters',exact:true}).click();await expect(page.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe('c02s-nonexistent-'+s.id);await page.reload();await expect(input).toHaveValue('c02s-nonexistent-'+s.id);
  }else{
   const endpoint='/api'+route+'/workspace';const backend='http://127.0.0.1:8122/api/v1'+route+'/';
   for(const url of [endpoint,backend]){
    const backendLayer=url.startsWith('http');const headers=(role:string|null):Record<string,string>=>role?(backendLayer?{Authorization:'Token '+own.tokens[role]}:{Cookie:'hrms_access_token='+own.tokens[role]}):{Cookie:''};
    if(s.category==='authorization'){
     for(const role of ['employee',null]){const r=await request.get(url,{headers:headers(role),maxRedirects:0});exchanges.push({url,status:r.status(),role});expect([401,403,404]).toContain(r.status());}
     const r=await request.get(url,{headers:headers('hr_admin'),maxRedirects:0});expect(r.status()).toBe(200);
    }else{
     const r=await request.get(url,{headers:headers('hr_admin'),params:{tenant_id:foreign.tenant.id,employee_id:foreign.credentials.employee.employee_id},maxRedirects:0});expect(r.status()).toBe(200);const body=await r.text();expect(body).not.toContain(foreign.tenant.id);expect(body).not.toContain(foreign.credentials.employee.employee_id);exchanges.push({url,status:r.status(),foreign_scope_denied:true});
    }
   }
  }
  await info.attach('page-context',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 }else{
  const direct=probe(s.id);expect(direct.completed).toBe(true);
  const headers={Cookie:'hrms_access_token='+own.tokens.hr_admin};const tag=s.id.slice(-12)+Date.now().toString(36);const isShift=req.api_route==='/api/hr-admin/shifts',isAssignment=req.api_route==='/api/hr-admin/employee-shift-assignments',isRollout=req.api_route.endsWith('/rollout');
  let shiftId=own.attendance.shift_id;
  if(!isShift){const r=await request.post('/api/hr-admin/shifts',{headers,data:{code:'c02s-b-'+tag,name:'C02S BFF dependency',start_time:'09:00',end_time:'17:00',working_hours:'8.00'}});expect(r.status()).toBe(201);shiftId=(await r.json()).id;}
  let templateId:string|undefined;
  if(isRollout){const r=await request.post('/api/hr-admin/shift-roster-templates',{headers,data:{code:'c02s-t-'+tag,name:'C02S BFF roster',shift_id:shiftId,status:'published',assignment_kind:'fixed'}});expect(r.status()).toBe(201);templateId=(await r.json()).id;}
  const data:any=isShift?{code:'c02s-b-'+tag,name:'C02S BFF shift',start_time:'09:00',end_time:'17:00',working_hours:'8.00'}:isAssignment?{employee_id:own.credentials.manager_b.employee_id,shift_id:shiftId,effective_from:date(index),effective_to:date(index),is_primary:true}:isRollout?{template_id:templateId,employee_ids:[own.credentials.manager_b.employee_id],effective_from:date(index),effective_to:date(index),is_primary:true,dry_run:false}:{code:'c02s-b-'+tag,name:'C02S BFF template',shift_id:shiftId,status:'published',assignment_kind:'fixed'};
  const endpoint=req.api_route;
  if(s.category==='authorization'){
   for(const actor of ['employee',null]){const stable=probe('snapshot');const r=await request.post(endpoint,{headers:{Cookie:actor?'hrms_access_token='+own.tokens[actor]:''},data,maxRedirects:0});expect([401,403,404]).toContain(r.status());expect(probe('snapshot')).toEqual(stable);exchanges.push({endpoint,actor,status:r.status()});}
  }else if(s.category==='isolation'){
   const stable=probe('snapshot');const bad={...data,...(isAssignment?{employee_id:foreign.credentials.employee.employee_id}:isRollout?{template_id:foreign.tenant.id}:{shift_id:foreign.attendance.shift_id})};const r=await request.post(endpoint,{headers,data:bad,maxRedirects:0});expect(r.status()).toBe(400);expect(probe('snapshot')).toEqual(stable);exchanges.push({endpoint,status:r.status(),foreign_reference_rejected:true});
  }else if(s.category==='validation'){
   const stable=probe('snapshot');const r=await request.post(endpoint,{headers,data:{},maxRedirects:0});expect(r.status()).toBe(400);expect(probe('snapshot')).toEqual(stable);
  }
  if(s.category!=='isolation'){
   if(isRollout){const stable=probe('snapshot');const r=await request.post(endpoint,{headers,data:{...data,dry_run:true}});expect(r.status()).toBe(200);expect((await r.json()).created_count).toBe(1);expect(probe('snapshot')).toEqual(stable);}
   const r=await request.post(endpoint,{headers,data,maxRedirects:0});expect(r.status()).toBe(isRollout?200:201);const body=await r.json();if(isRollout)expect(body.created_count).toBe(1);exchanges.push({endpoint,status:r.status(),object:body.id||body.rollout_id});
  }
 }
 if(s.category==='positive')await positiveUi(page,request,req,index,info);
 const after=probe('snapshot');expect(after.foreign).toEqual(before.foreign);expect(after.protected).toEqual(before.protected);expect(after.historical_inputs).toEqual(before.historical_inputs);completed=true;
 }finally{const capsule={scenario_id:s.id,requirement_id:req.id,completed,exchanges,before,after:probe('snapshot')};await info.attach('workflow-capsule',{body:JSON.stringify(capsule),contentType:'application/json'});journal({...capsule,phase:'end'});}
 });
}

async function positiveUi(page:Page,request:any,req:any,index:number,info:any){
 const code='c02s-ui-'+Date.now().toString(36)+'-'+index;const day=date(index+400);
 let identity:string;let kind:string;
 if(req.api_route.endsWith('/rollout')){
  const headers={Cookie:'hrms_access_token='+own.tokens.hr_admin};const tr=await request.post('/api/hr-admin/shift-roster-templates',{headers,data:{code,name:'C02S UI rollout '+code,shift_id:own.attendance.shift_id,status:'published'}});expect(tr.status()).toBe(201);const template=(await tr.json()).id;
  await page.goto('/hr-admin/shift-roster-templates?q='+encodeURIComponent(code));const rollout=page.locator('section').filter({has:page.getByRole('heading',{name:'Roster rollout',exact:true})});await rollout.locator('label',{hasText:'Roster template'}).locator('select').selectOption(template);
  await rollout.getByLabel('Find person',{exact:true}).fill(own.credentials.manager_b.employee_code);const employee=rollout.getByRole('combobox',{name:'Target employee',exact:true});await expect.poll(()=>employee.locator('option').count()).toBeGreaterThan(1);await employee.selectOption(own.credentials.manager_b.employee_id);await rollout.getByLabel('Effective from',{exact:true}).fill(day);await rollout.getByLabel('Effective to',{exact:true}).fill(day);
  let response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/shift-roster-templates/rollout'));await rollout.getByRole('button',{name:'Preview rollout',exact:true}).click();const preview=await response;expect(preview.status()).toBe(200);expect((await preview.json()).created_count).toBe(1);
  response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/shift-roster-templates/rollout'));await rollout.getByRole('button',{name:'Apply rollout',exact:true}).click();const applied=await response;expect(applied.status()).toBe(200);const data=await applied.json();expect(data.created_count).toBe(1);identity=data.rollout_id;kind='rollout';await expect(page.locator('.action-toast')).toContainText('1 assignment(s) created; 0 skipped.');
 }else{
  const shift=req.api_route.endsWith('/shifts'),assignment=req.api_route.endsWith('/employee-shift-assignments');kind=shift?'shift':assignment?'assignment':'template';await page.goto(shift?'/hr-admin/shifts':assignment?'/hr-admin/employee-shift-assignments':'/hr-admin/shift-roster-templates');await page.getByRole('button',{name:shift?'Create shift':assignment?'Create assignment':'Create template',exact:true}).click();const dialog=page.getByRole('dialog');
  if(assignment){await dialog.getByLabel('Find person',{exact:true}).fill(own.credentials.manager_b.employee_code);const employee=dialog.getByRole('combobox',{name:'Employee',exact:true});await expect.poll(()=>employee.locator('option').count()).toBeGreaterThan(1);await employee.selectOption(own.credentials.manager_b.employee_id);await dialog.getByRole('combobox',{name:/^Base shift/}).selectOption(own.attendance.shift_id);await dialog.getByLabel('Effective from',{exact:true}).fill(day);await dialog.getByLabel('Effective to',{exact:true}).fill(day);}
  else{await dialog.getByLabel('Code',{exact:true}).fill(code);await dialog.getByLabel('Name',{exact:true}).fill('C02S UI '+code);if(!shift)await dialog.locator('label',{hasText:'Base shift'}).locator('select').selectOption(own.attendance.shift_id);}
  const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(req.api_route));await dialog.getByRole('button',{name:shift?'Create shift':assignment?'Create assignment':'Create template',exact:true}).click();const saved=await response;expect(saved.status()).toBe(201);identity=(await saved.json()).id;await expect(dialog).toHaveCount(0);await expect(page.locator('.action-toast')).toHaveCount(1);await expect(page.locator('.action-toast')).toContainText(shift?'Shift created.':assignment?'Shift assignment created.':'Roster template created.');
 }
 const persisted=JSON.parse(execFileSync(python,['web/tests/c01-batch2s/probe.py','inspect',kind,identity],{cwd:root,env:process.env,encoding:'utf8'}));expect(persisted.id).toBe(identity);expect(persisted.tenant_id).toBe(own.tenant.id);await info.attach('positive-ui-bff-postgresql-join',{body:JSON.stringify(persisted),contentType:'application/json'});await info.attach('positive-success-after-modal-close',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
}
