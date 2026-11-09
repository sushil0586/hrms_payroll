import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const state=process.env.C02_STATE!,evidence=process.env.C02_EVIDENCE!,docs=process.env.C02_DOCS!;
const [own,foreign]=JSON.parse(fs.readFileSync(path.join(state,'fixtures.json'),'utf8'));
const scenarios=JSON.parse(fs.readFileSync(path.join(docs,'scenarios.json'),'utf8'));
const requirements=JSON.parse(fs.readFileSync(path.join(docs,'requirements.json'),'utf8'));
const prior=new Set(JSON.parse(fs.readFileSync(path.join(docs,'batch1-reconciliation.json'),'utf8')).selected_reuse.map((x:any)=>x.scenario_id));
const python='/Users/ansh/Library/Caches/hrms-qa/shift-pilot-py312/bin/python';const root=path.resolve(__dirname,'../../..');
function probe(id:string){return JSON.parse(execFileSync(python,['web/tests/c01-batch2/probe.py',id],{cwd:root,env:process.env,encoding:'utf8',timeout:180000}));}
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
   await input.fill('c02-nonexistent-'+s.id);await page.getByRole('button',{name:isShift?'Apply':'Apply filters',exact:true}).click();await expect(page.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe('c02-nonexistent-'+s.id);await page.reload();await expect(input).toHaveValue('c02-nonexistent-'+s.id);
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
  if(!isShift){const r=await request.post('/api/hr-admin/shifts',{headers,data:{code:'c02-b-'+tag,name:'C02 BFF dependency',start_time:'09:00',end_time:'17:00',working_hours:'8.00'}});expect(r.status()).toBe(201);shiftId=(await r.json()).id;}
  let templateId:string|undefined;
  if(isRollout){const r=await request.post('/api/hr-admin/shift-roster-templates',{headers,data:{code:'c02-t-'+tag,name:'C02 BFF roster',shift_id:shiftId,status:'published',assignment_kind:'fixed'}});expect(r.status()).toBe(201);templateId=(await r.json()).id;}
  const data:any=isShift?{code:'c02-b-'+tag,name:'C02 BFF shift',start_time:'09:00',end_time:'17:00',working_hours:'8.00'}:isAssignment?{employee_id:own.credentials.manager_b.employee_id,shift_id:shiftId,effective_from:date(index),effective_to:date(index),is_primary:true}:isRollout?{template_id:templateId,employee_ids:[own.credentials.manager_b.employee_id],effective_from:date(index),effective_to:date(index),is_primary:true,dry_run:false}:{code:'c02-b-'+tag,name:'C02 BFF template',shift_id:shiftId,status:'published',assignment_kind:'fixed'};
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
 const after=probe('snapshot');expect(after.foreign).toEqual(before.foreign);expect(after.protected).toEqual(before.protected);expect(after.historical_inputs).toEqual(before.historical_inputs);completed=true;
 }finally{const capsule={scenario_id:s.id,requirement_id:req.id,completed,exchanges,before,after:probe('snapshot')};await info.attach('workflow-capsule',{body:JSON.stringify(capsule),contentType:'application/json'});journal({...capsule,phase:'end'});}
 });
}
