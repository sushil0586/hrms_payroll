import {test,expect,request as playwrightRequest} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const state=process.env.C02R_STATE!;const evidence=process.env.C02R_EVIDENCE!;const docs=process.env.C02R_DOCS!;
const fixtures=JSON.parse(fs.readFileSync(path.join(state,'fixtures.json'),'utf8'));const [own,foreign]=fixtures;
const batch=JSON.parse(fs.readFileSync(path.join(docs,'batch-overlay.json'),'utf8'));const requirements=new Map(batch.requirements.map((r:any)=>[r.id,r]));
const root=path.resolve(__dirname,'../../..');const python='/Users/ansh/Library/Caches/hrms-qa/shift-pilot-py312/bin/python';
function snapshot(){return JSON.parse(execFileSync(python,['/tmp/c02r-snapshot.py'],{cwd:root,env:process.env,encoding:'utf8'}));}
function journal(value:any){const fd=fs.openSync(path.join(evidence,'scenario-journal.jsonl'),'a');fs.writeSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);}
function routeFor(r:any,other=false){let target=r.api_route||r.pages[0];return target.replace('[itemId]',other?foreign.exit_id:own.exit_id);}
function actor(r:any){const route=routeFor(r);return route.startsWith('/mss')?'manager':route.startsWith('/tenant-admin')||route.startsWith('/api/tenant-admin')?'tenant_admin':route.startsWith('/api/me')?'employee':'hr_admin';}
const backendPages:Record<string,string>={'/hr-admin/exits/[itemId]/edit':'/hr-admin/exits/','/hr-admin/notification-diagnostics':'/hr-admin/notification-diagnostics/','/hr-admin/onboardings':'/hr-admin/onboardings/','/hr-admin/policies':'/hr-admin/attendance-policies/','/hr-admin/shifts/new':'/hr-admin/shifts/','/hr-admin/shifts':'/hr-admin/shifts/','/hr-admin/workflow-templates':'/hr-admin/workflow-templates/','/mss/notifications':'/manager/notifications/','/tenant-admin/support-access':'/tenant-admin/console/','/hr-admin/organization?section=branches':'/hr-admin/organization/','/hr-admin/organization/locations/new':'/hr-admin/organization/options/'};
function backend(r:any){const route=r.api_route;if(!route)return backendPages[r.pages[0]];if(route==='/api/public-leads')return '/platform/public-leads/';if(route==='/api/hr-admin/reports/export-audits')return '/hr-admin/reports/export-audits/';return route.replace(/^\/api/,'')+'/';}
function payload(r:any,tag:string,other=false):any{const route=r.api_route;
 if(route==='/api/auth/password-reset/request')return {identifier:own.credentials.employee.username};
 if(route==='/api/public-leads')return {company_name:'C02R Synthetic '+tag,contact_name:'Synthetic Owner',work_email:tag+'@c02r.example.test',...(other?{tenant_id:foreign.tenant.id,employee_id:foreign.credentials.employee.employee_id,lead_id:foreign.tenant.id}:{})};
 if(route==='/api/hr-admin/shifts')return {code:'c02r-'+tag,name:'C02R '+tag,start_time:'09:00',end_time:'18:00',break_minutes:60,working_hours:'8.00',...(other?{tenant_id:foreign.tenant.id}:{})};
 if(route==='/api/hr-admin/organization/import')return {rows:[{row_number:2,section:'branches',data:{code:'c02r-'+tag,name:'C02R '+tag,legal_entity_code:other?foreign.legal_entity_code:own.legal_entity_code}}]};
 if(route==='/api/hr-admin/notification-templates/test-send')return {channel:'in_app',title_template:'C02R synthetic',body_template:'C02R '+tag,membership_id:other?foreign.membership_id:own.membership_id,process_now:false};
 return {};
}
async function call(layer:string,r:any,who:string|null,tag:string,other=false,override?:any){const role=who;const token=role?own.tokens[role]:null;const headers:any=layer==='bff'?(token?{Cookie:'hrms_access_token='+token}:{}):(token?{Authorization:'Token '+token}:{});let target=layer==='bff'?routeFor(r,other):backend(r);if(!r.api_route&&layer==='backend'&&r.pages[0].includes('/exits/'))target='/hr-admin/exits/'+(other?foreign.exit_id:own.exit_id)+'/';if(other){target+=(target.includes('?')?'&':'?')+'tenant_id='+foreign.tenant.id+'&employee_id='+foreign.credentials.employee.employee_id;}
 const ctx=await playwrightRequest.newContext({baseURL:layer==='bff'?'http://127.0.0.1:3322':'http://127.0.0.1:8122/api/v1',extraHTTPHeaders:headers,ignoreHTTPSErrors:false});const url=layer==='backend'?'http://127.0.0.1:8122/api/v1'+target:target;
 try{const opts:any={method:r.method||'GET',maxRedirects:0,timeout:90000};if(r.method==='POST'){
 if(r.api_route==='/api/me/employee-documents')opts.multipart={category_id:other?foreign.fixtures.document_category_id:own.fixtures.document_category_id,title:'C02R '+tag,file:{name:tag+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nC02R synthetic evidence\n%%EOF')}};
 else opts.data=override||payload(r,tag,other);}
 const res=await ctx.fetch(url,opts);const text=await res.text();return {status:res.status(),text,location:res.headers()['location']||'',layer,target};}finally{await ctx.dispose();}}
for(const s of batch.scenarios){if((requirements.get(s.requirement_id) as any).api_route?.includes('[...path]')||['C00B-S-501244729c9f','C00B-S-942851b78137'].includes(s.id))continue;test(s.id+' '+s.category,async({browser},info)=>{const r:any=requirements.get(s.requirement_id);journal({scenario:s.id,phase:'start',requirement:r.id,time:new Date().toISOString()});
 test.skip(r.api_route?.includes('[...path]'),'BLOCKED binding: catch-all POST family lacks approved finite child-method assertion join; periods-only sample cannot certify complete family.');
 const before=snapshot();const results:any[]=[];const current=actor(r);const isPublic=['/api/public-leads','/api/auth/password-reset/request'].includes(r.api_route);let completed=false;
 try{
 for(const layer of ['backend','bff']){
  if(s.category==='authorization'){
   const success=await call(layer,r,isPublic?null:current,info.testId.slice(-7)+layer+'p');results.push(success);expect(success.status,layer+' permitted operation').toBeGreaterThanOrEqual(200);expect(success.status,layer+' permitted operation').toBeLessThan(300);
   if(isPublic){const rejectedBefore=snapshot();const bad=await call(layer,r,null,'invalid',false,r.api_route==='/api/public-leads'?{company_name:'C02R invalid',website:'honeypot'}:{identifier:''});results.push(bad);expect(bad.status).toBe(400);expect(snapshot()).toEqual(rejectedBefore);}
   else{for(const denied of [null,(layer==='backend'&&r.pages?.[0]==='/mss/notifications')||current==='employee'?'platform':'employee']){const deniedBefore=snapshot();const x=await call(layer,r,denied,info.testId.slice(-7)+layer+'d');results.push(x);const safeRedirect=layer==='bff'&&!r.api_route&&[301,302,303,307,308].includes(x.status);expect(safeRedirect||[401,403,404].includes(x.status),layer+' unauthorized denied').toBeTruthy();expect(snapshot()).toEqual(deniedBefore);}}
  }else{
   const x=await call(layer,r,isPublic?null:current,info.testId.slice(-7)+layer+'x',true);results.push(x);expect(x.status).toBeLessThan(500);expect(x.text,layer+' no foreign tenant exposure').not.toContain(foreign.tenant.code);
   if(r.api_route==='/api/hr-admin/notification-templates/test-send'||r.api_route==='/api/hr-admin/organization/import'||r.api_route==='/api/me/employee-documents')expect([400,403,404],layer+' rejected foreign reference').toContain(x.status);
   else if(!r.pages?.[0]?.includes('/exits/'))expect(x.status).toBeGreaterThanOrEqual(200);
   expect(snapshot().foreign).toEqual(before.foreign);expect(snapshot().foreign_identity).toEqual(before.foreign_identity);for(const [id,hash]of Object.entries(before.public_leads))expect(snapshot().public_leads[id]).toBe(hash);if(r.api_route==='/api/auth/password-reset/request'){const unknown=await call(layer,r,null,'unknown',false,{identifier:'unknown-c02r@example.test'});expect(unknown.status).toBe(200);expect(JSON.parse(unknown.text)).toEqual(JSON.parse(x.text));}
  }
 }
 if(!r.api_route&&s.category==='authorization'){
  const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'hrms_access_token',value:own.tokens[current],domain:'127.0.0.1',path:'/'}]);await context.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort()});const page=await context.newPage();try{await page.goto('http://127.0.0.1:3322'+routeFor(r),{waitUntil:'domcontentloaded'});await expect(page.locator('main h1').first()).toBeVisible();await info.attach('permitted-page-security-context',{body:await page.screenshot(),contentType:'image/png'});}finally{await context.close();}}
 expect(snapshot().protected,'protected Payroll rows unchanged').toEqual(before.protected);completed=true;
 }finally{const capsule={scenario:s.id,requirement:r.id,completed,requests:results.map(({status,layer,target,text,location})=>({status,layer,target,location,body_sha256:createHash('sha256').update(text).digest('hex')})),foreign_after:snapshot().foreign,protected_after:snapshot().protected};await info.attach('security-postgresql-capsule',{body:JSON.stringify(capsule),contentType:'application/json'});journal({...capsule,phase:'end',time:new Date().toISOString()});}
});}
