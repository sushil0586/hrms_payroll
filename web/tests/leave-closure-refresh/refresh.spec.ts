import {test,expect,type Page,type Route} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const evidence=path.join(process.env.LEAVE_CLOSURE_EVIDENCE_ROOT || path.resolve(__dirname,'../../../docs/qa/evidence/leave-blocker-closure'),'refresh');
let fixture:IsolatedQaWorkspace,errors:string[],posts:number,release:(()=>void)|undefined;
test.beforeEach(async({page},info)=>{fixture=await provisionIsolatedQaWorkspace(info);errors=[];posts=0;release=undefined;page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/api/hr-admin/leave-balances/actions'))posts++;});const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);await page.goto('/hr-admin/leave-balances?transaction_status=rejected');});
test.afterEach(async()=>{release?.();try{expect(errors).toEqual([]);}finally{await cleanupIsolatedQaWorkspace(fixture);}});
const row=(page:Page)=>page.getByRole('table',{name:'Balance ledger',exact:true}).getByRole('row').filter({hasText:'Year 2026'});
async function balance(page:Page){const response=await page.request.get('/api/hr-admin/leave-balances?page_size=50');expect(response.status()).toBe(200);return(await response.json()).items.find((item:{period_year:number;employee_id:string})=>item.period_year===2026&&item.employee_id===fixture.manifest.credentials.employee.employee_id);}
async function credit(page:Page,reason:string){const panel=page.getByText('Balance actions',{exact:true});if(!await page.getByRole('form',{name:'Balance action',exact:true}).isVisible())await panel.click();const form=page.getByRole('form',{name:'Balance action',exact:true});await form.getByRole('combobox',{name:'Employee',exact:true}).selectOption(fixture.manifest.credentials.employee.employee_id);await form.getByRole('combobox',{name:'Leave policy',exact:true}).selectOption(fixture.manifest.leave.policy_id);await form.getByRole('textbox',{name:'Units',exact:true}).fill('1.00');await form.getByLabel('Effective date',{exact:true}).fill('2026-10-20');await form.getByRole('textbox',{name:'Reason',exact:true}).fill(reason);const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/hr-admin/leave-balances/actions'));await form.getByRole('button',{name:'Apply balance action'}).click();const result=await response;expect(result.status()).toBe(200);return result.json();}
function save(name:string,result:unknown){mkdirSync(evidence,{recursive:true});writeFileSync(path.join(evidence,test.info().project.name+'-'+name+'.json'),JSON.stringify(result,null,2));}
test('committed credit refreshes both filtered ledgers without relying on RSC delivery',async({page})=>{const before=await balance(page);await page.route('**/*_rsc=*',route=>route.abort());const result=await credit(page,'QA canonical refresh');await expect(row(page)).toContainText(result.balance.closing_balance);expect(Number(result.balance.closing_balance)).toBe(Number(before.closing_balance)+1);await expect(page.getByRole('table',{name:'Balance transactions',exact:true})).not.toContainText('QA canonical refresh');expect(posts).toBe(1);save('rsc-independent',{before:before.closing_balance,after:result.balance.closing_balance,posts});});
test('failed read refresh exposes a read-only retry without replaying the committed credit',async({page})=>{await page.route('**/api/hr-admin/leave-balances?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic ledger read unavailable'})}),{times:1});const result=await credit(page,'QA read retry');await expect(page.getByRole('alert').filter({hasText:'latest ledger could not be loaded'})).toBeVisible();await page.getByRole('button',{name:'Retry ledger refresh',exact:true}).click();await expect(row(page)).toContainText(result.balance.closing_balance);await expect(page.getByRole('button',{name:'Retry ledger refresh'})).toHaveCount(0);expect(posts).toBe(1);save('read-retry',{closing:result.balance.closing_balance,posts});});
test('a superseded ledger read is aborted and cannot replace the newer committed balance',async({page})=>{let ready!:()=>void;const captured=new Promise<void>(resolve=>ready=resolve),gate=new Promise<void>(resolve=>release=resolve);let aborted=0;page.on('requestfailed',request=>{if(request.url().includes('/api/hr-admin/leave-balances?'))aborted++;});await page.route('**/api/hr-admin/leave-balances?*',async(route:Route)=>{const response=await route.fetch();ready();await gate;await route.fulfill({response}).catch(()=>undefined);},{times:1});await credit(page,'QA first held read');await captured;const latest=await credit(page,'QA latest read');await expect(row(page)).toContainText(latest.balance.closing_balance);await expect.poll(()=>aborted).toBeGreaterThan(0);release?.();expect((await balance(page)).closing_balance).toBe(latest.balance.closing_balance);await expect(row(page)).toContainText(latest.balance.closing_balance);expect(posts).toBe(2);save('latest-read',{closing:latest.balance.closing_balance,posts,aborted});});

test('reviewing the last filtered page canonicalizes both pagination and detail navigation',async({page})=>{
 const foreign=await provisionIsolatedQaWorkspace(test.info());
 try{
  const repo=path.resolve(__dirname,'../../..');
  execFileSync(path.join(repo,'.venv/bin/python'),[path.join(repo,'docs/qa/evidence/hr-admin-standardization/leave-balances/seed.py'),fixture.manifestPath,foreign.manifestPath],{cwd:repo,env:process.env});
  await page.goto('/hr-admin/leave-balances?transaction_status=pending&page_size=1&transaction_page=2');
  const transactions=page.getByRole('table',{name:'Balance transactions',exact:true});
  await transactions.getByRole('link',{name:/Inspect transaction for/}).first().click();
  const detail=page.getByRole('complementary',{name:'Leave balance transaction detail',exact:true});
  await detail.getByRole('textbox',{name:'Rejection reason'}).fill('QA last-page rejection');
  const reviewed=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().includes('/review'));
  await detail.getByRole('button',{name:'Reject',exact:true}).click();
  const review=await reviewed;expect(review.request().postDataJSON().rejection_reason).toBe('QA last-page rejection');expect(review.status()).toBe(200);
  await expect(page).toHaveURL(/transaction_page=1/);
  await expect(page).toHaveURL(/transaction_status=pending/);
  await expect(detail).toHaveCount(0);
  await expect(transactions.locator('tbody tr')).toHaveCount(1);
  await transactions.getByRole('link',{name:/Inspect transaction for/}).first().click();
  await expect(detail).toBeVisible();await expect(page).toHaveURL(/transaction_page=1/);
  save('last-page',{canonical_url:page.url(),remaining_visible_transactions:1});
 }finally{await cleanupIsolatedQaWorkspace(foreign);}
});
