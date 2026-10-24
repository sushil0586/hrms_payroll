import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const fixture=JSON.parse(readFileSync('/tmp/hrms-doc-followup-context.json','utf8'));
const root=path.resolve(__dirname,'../../../docs/qa/evidence/document-makeover-phase1-followup-2026-10-22');
test('remaining Documents baseline states and page permissions',async({page})=>{
 const notes:any[]=[]; const record=(value:any)=>{notes.push(value);writeFileSync(path.join(root,'observations.json'),JSON.stringify(notes,null,2)+'\n')};
 async function login(cred:any){expect((await page.request.post('/api/auth/login',{data:{identifier:cred.username,password:'Password@123'}})).status()).toBe(200)}
 async function goto(url:string){const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await expect(page.locator('main').first()).toBeAttached();return r}
 async function capture(name:string){await page.screenshot({path:path.join(root,name+'.png')});record({name,url:page.url().replaceAll(fixture.artifact_document,'[artifactDocument]'),...await page.evaluate(()=>({headings:[...document.querySelectorAll('main h1,[role=dialog] h2')].map(e=>e.textContent),active:document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}))})}
 await login(fixture.a.credentials.hr_admin);await page.setViewportSize({width:1440,height:600});
 for(const [name,id] of Object.entries(fixture.ids)){
  await goto(`/hr-admin/employee-documents?reviewDocument=${id}`);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Save review',exact:true})).toBeEnabled();await capture('review-'+name+'-short');
  if(name==='verified'){await dialog.getByRole('button',{name:'Save review',exact:true}).scrollIntoViewIfNeeded();await capture('review-footer-short')}
 }
 for(const [name,url,button] of [['category','/hr-admin/document-categories?categoryModal=create','Create category'],['requirement','/hr-admin/document-requirements?requirementModal=create','Create requirement']]){
  await goto(url);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:button,exact:true}).scrollIntoViewIfNeeded();await capture(name+'-footer-short');
 }
 const list=await page.request.get('/api/hr-admin/employee-documents?page_size=100');const listData=await list.json();expect(listData.total_count).toBe(fixture.document_count);expect(listData.items.length).toBe(100);
 await goto('/hr-admin/reports/document-compliance');await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.getByText('100 total records',{exact:true}).scrollIntoViewIfNeeded();await capture('report-loaded-scope');
 const csv=await page.request.get('/api/hr-admin/reports/document-compliance');expect(csv.status()).toBe(200);const csvText=await csv.text();writeFileSync(path.join(root,'report.csv'),csvText);
 const manifest=await page.request.get('/api/hr-admin/reports/document-compliance?format=manifest');expect(manifest.status()).toBe(200);writeFileSync(path.join(root,'report-manifest.json'),await manifest.text());
 record({name:'report-scope',databaseCount:fixture.document_count,loadedCount:listData.items.length,csvDataLines:csvText.trim().split(/\r?\n/).length-1,containsOldestArtifactDocument:csvText.includes('QA Identity Evidence')});
 for(const [key,cred] of Object.entries(fixture.roles)){
  await login(cred);
  for(const route of ['/hr-admin/employee-documents','/hr-admin/employee-documents/new','/hr-admin/document-categories',`/hr-admin/employee-documents/${fixture.artifact_document}/review`,'/hr-admin/generated-letters']){
   try { const r=await goto(route);await expect(page.getByRole('heading',{level:1}).first()).toBeVisible({timeout:30000});record({name:'permission-page',permission:key,requested:route.replaceAll(fixture.artifact_document,'[artifactDocument]'),status:r?.status(),finalPath:new URL(page.url()).pathname.replaceAll(fixture.artifact_document,'[artifactDocument]'),headings:await page.getByRole('heading',{level:1}).allTextContents(),notices:await page.locator('.notice').allTextContents()}); } catch(error) { record({name:'permission-page',permission:key,requested:route.replaceAll(fixture.artifact_document,'[artifactDocument]'),navigationError:String(error).split('Call log:')[0]}); }
  }
 }
 await login(fixture.a.credentials.employee);
 for(const width of [1440,320]){
  await page.setViewportSize({width,height:600});await goto('/ess/documents');await expect(page.getByRole('button',{name:'Upload document',exact:true})).toBeEnabled();await page.locator('strong').filter({hasText:/^QA missing required evidence$/}).scrollIntoViewIfNeeded();await capture('ess-missing-'+width);
  await page.getByRole('button',{name:'Upload document',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('Category',{exact:true})).toBeEnabled();await capture('ess-upload-short-'+width);await page.getByRole('dialog').getByRole('button',{name:'Submit for review'}).scrollIntoViewIfNeeded();await capture('ess-upload-footer-'+width);await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await goto('/ess/documents?q=QA%20Identity%20Evidence');await expect(page.getByRole('button',{name:'Review',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Review',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Close',exact:true})).toBeEnabled();await capture('ess-detail-short-'+width);
 }
 await login(fixture.b.credentials.manager);await goto('/ess/documents');await expect(page.getByRole('heading',{level:1,name:'Documents',exact:true})).toBeVisible();await page.getByRole('heading',{name:'Document history',exact:true}).scrollIntoViewIfNeeded();await capture('ess-genuine-empty');
 writeFileSync(path.join(root,'observations.json'),JSON.stringify(notes,null,2)+'\n');
});
