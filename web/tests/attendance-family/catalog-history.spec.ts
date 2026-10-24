import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const repo=path.resolve(__dirname,'../../..');let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);execFileSync(path.join(repo,'.venv/bin/python'),[path.join(repo,'docs/qa/evidence/hr-admin-standardization/attendance-family/seed.py'),fixture.manifestPath],{env:process.env,cwd:repo})});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
for(const catalog of ['employee-shift-assignments','shift-roster-templates'])test(`queued catalog ${catalog} applies search and restores committed history`,async({page})=>{
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.goto(`/hr-admin/${catalog}`);const search=page.getByRole('searchbox',{name:'Search',exact:true});await search.fill('QA');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page).toHaveURL(/q=QA/);await expect(page.locator('main table tbody tr:not(:has(td[colspan]))')).toHaveCount(1);
 await search.fill('NO-ATTENDANCE-ASSET');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page).toHaveURL(/q=NO-ATTENDANCE/);await expect(page.locator('main table tbody tr:not(:has(td[colspan]))')).toHaveCount(0);
 await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/q=QA/);await page.reload();await expect(search).toHaveValue('QA');await expect(page.locator('main table tbody tr:not(:has(td[colspan]))')).toHaveCount(1);
 await search.fill('unapplied-draft');const pager=page.getByRole('form',{name:/pagination/});await pager.getByRole('combobox').selectOption('100');await pager.getByRole('button',{name:'Apply',exact:true}).click();await expect(page).toHaveURL(/page_size=100/);expect(new URL(page.url()).searchParams.get('q')).toBe('QA');await expect(search).toHaveValue('QA');await expect(pager.getByRole('combobox')).toHaveValue('100');
 await page.getByRole('link',{name:'Clear filters',exact:true}).click();await expect(search).toHaveValue('');await expect(page.locator('main table tbody tr:not(:has(td[colspan]))')).toHaveCount(1);
});
