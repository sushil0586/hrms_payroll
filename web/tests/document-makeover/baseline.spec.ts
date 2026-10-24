import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
const root=path.resolve(__dirname,'../../../docs/qa/evidence/document-makeover-phase1-2026-10-22');
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('Documents source-matched Chromium rendered baseline',async({page})=>{
 const user=workspacePersona(fixture,'hr_admin');
 expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 const docsResponse=await page.request.get('/api/hr-admin/employee-documents');expect(docsResponse.ok()).toBeTruthy();
 const docs=await docsResponse.json();const documentId=docs.items[0].id;
 await page.goto('/hr-admin/document-requirements',{waitUntil:'domcontentloaded'});
 const requirementHref=await page.locator('a[href*=selectedRequirement]').first().getAttribute('href');
 const requirementId=new URL(requirementHref!, 'http://localhost').searchParams.get('selectedRequirement')!;
 const categoryId=fixture.manifest.fixtures.document_category_id;
 const states=[
 ['hub','/hr-admin/documents'],['queue','/hr-admin/employee-documents'],['no-matches','/hr-admin/employee-documents?q=unmatched-doc-baseline'],
 ['review-dialog',`/hr-admin/employee-documents?reviewDocument=${documentId}`],['upload','/hr-admin/employee-documents/new'],['review-page',`/hr-admin/employee-documents/${documentId}/review`],
 ['categories','/hr-admin/document-categories'],['category-create-page','/hr-admin/document-categories/new'],['category-edit-page',`/hr-admin/document-categories/${categoryId}/edit`],
 ['category-create-dialog','/hr-admin/document-categories?categoryModal=create'],['category-edit-dialog',`/hr-admin/document-categories?editCategory=${categoryId}`],['category-detail',`/hr-admin/document-categories?selectedCategory=${categoryId}`],
 ['requirements','/hr-admin/document-requirements'],['requirement-create-page','/hr-admin/document-requirements/new'],['requirement-edit-page',`/hr-admin/document-requirements/${requirementId}/edit`],
 ['requirement-create-dialog','/hr-admin/document-requirements?requirementModal=create'],['requirement-edit-dialog',`/hr-admin/document-requirements?editRequirement=${requirementId}`],['requirement-detail',`/hr-admin/document-requirements?selectedRequirement=${requirementId}`],
 ['letters','/hr-admin/generated-letters'],['compliance','/hr-admin/reports/document-compliance']
 ];
 const observations:any[]=[];
 async function capture(name:string,url:string,width:number){
  await page.setViewportSize({width,height:width>=768?1000:844});
  const errors:string[]=[];const handler=(error:Error)=>errors.push(error.message);page.on('pageerror',handler);
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});expect(response?.status()).toBe(200);
  if(name==='hub' && width===1024)await expect(page.getByRole('table',{name:'Document control workspaces'})).toBeVisible();
  else await expect(page.getByRole('heading',{level:1})).toBeVisible({timeout:30000});
  const headingVisible=await page.locator('main h1').first().isVisible();
  if(name.endsWith('-dialog'))await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:path.join(root,`${name}-${width}.png`)});
  observations.push({name,width,headingVisible,url:url.replaceAll(documentId,'[documentId]').replaceAll(categoryId,'[categoryId]').replaceAll(requirementId,'[requirementId]'),...await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('main h1,main h2')].map(x=>x.textContent),dialogs:document.querySelectorAll('[role=dialog]').length})),pageErrors:errors});
  page.off('pageerror',handler);expect(errors).toEqual([]);
 }
 for(const width of [1440,390,320])for(const [name,url] of states)await capture(name,url,width);
 for(const width of [1024,768])await capture('hub','/hr-admin/documents',width);
 const employee=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:employee.username,password:employee.password}})).status()).toBe(200);
 for(const width of [1440,1024,768,390,320])await capture('ess-center','/ess/documents',width);
 writeFileSync(path.join(root,'observations.json'),JSON.stringify({scope:'Chromium route/query baseline only; fixture setup writes, no UI business writes; seeded verified document has no artifact.',observations},null,2)+'\n');
});
