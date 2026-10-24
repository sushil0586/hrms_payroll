import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../../../docs/qa/evidence/document-makeover-phase1-followup-2026-10-22');
const fixture=JSON.parse(readFileSync('/tmp/hrms-doc-followup-context.json','utf8'));
test('HR-prefixed custom view-only role page baseline',async({page})=>{
 const user=fixture.roles['documents.view'];expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:'Password@123'}})).status()).toBe(200);
 const notes=[];
 for(const [route,expected] of [['/hr-admin/employee-documents','/hr-admin/employee-documents'],['/hr-admin/employee-documents/new','/hr-admin/employee-documents'],['/hr-admin/document-categories','/hr-admin/document-categories'],[`/hr-admin/employee-documents/${fixture.artifact_document}/review`,'/hr-admin/employee-documents'],['/hr-admin/generated-letters','/hr-admin/generated-letters']]){
  const r=await page.goto(route,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(new URL(page.url()).pathname).toBe(expected);notes.push({requested:route.replaceAll(fixture.artifact_document,'[artifactDocument]'),status:r?.status(),finalPath:expected,headings:await page.getByRole('heading',{level:1}).allTextContents()});
 }
 writeFileSync(path.join(root,'view-role-observations.json'),JSON.stringify({roleCode:'hr-qa-view',onlyPermission:'documents.view',notes},null,2)+'\n');
});

test('genuine empty employee history baseline',async({page})=>{
 const user=fixture.b.credentials.manager;expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:'Password@123'}})).status()).toBe(200);
 await page.setViewportSize({width:320,height:600});await page.goto('/ess/documents',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'Upload document',exact:true})).toBeEnabled();await page.getByText('No documents match the current filters.',{exact:true}).scrollIntoViewIfNeeded();await expect(page.getByText('No documents match the current filters.',{exact:true})).toBeVisible();await page.screenshot({path:path.join(root,'ess-empty-history.png')});
});
