import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const repo=path.resolve(__dirname,'../../..'),evidence=path.join(repo,'docs/qa/evidence/hr-admin-standardization/leave-correctness');
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({browser},info)=>{writeFileSync(path.join(evidence,info.project.name+'-version.json'),JSON.stringify({engine:info.project.name,version:browser.version(),platform:process.platform}));fixture=await provisionIsolatedQaWorkspace(info);execFileSync(path.join(repo,'.venv/bin/python'),[path.join(evidence,'seed.py'),fixture.manifestPath],{cwd:repo,env:process.env});});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture);});
test.beforeEach(async({page})=>{const u=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:u.username,password:u.password}})).status()).toBe(200);});
async function metricsFit(page:import('@playwright/test').Page){
 await expect.poll(()=>page.locator('.workspace-metric-grid .metric-tile').evaluateAll(tiles=>tiles.every(tile=>{const box=tile.getBoundingClientRect();return [...tile.children].every(child=>{const r=child.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom&&r.left>=box.left&&r.right<=box.right;});}))).toBe(true);
}
async function inspect(page:import('@playwright/test').Page,name:string){
 await page.addScriptTag({content:readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});const violations=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(r:unknown,o:unknown)=>Promise<{violations:unknown[]}>}}).axe;return(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations;});writeFileSync(path.join(evidence,test.info().project.name+'-'+name+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
 await page.setViewportSize({width:390,height:900});await metricsFit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',test.info().project.name+'-'+name+'.png'),fullPage:true});
 if(name.endsWith('import')){const region=page.getByRole('region',{name:name==='balance-import'?'Leave balance import table scroll':'Leave assignment import table scroll',exact:true});await region.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await expect(region).toBeFocused();}
}
test('mixed units use counts and factual states, never inferred risk or combined quantity',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/hr-admin/reports/leave-balance');
 const summary=page.getByRole('group',{name:'Leave balance summary'});await expect(summary).not.toContainText('Closing liability');await expect(summary).not.toContainText('Reserved units');await expect(summary).toContainText('Policies represented');await expect(summary).toContainText('Balances with reservations');
 await expect(page.getByText('Amounts use each policy’s configured unit. Quantities are not added across policies or years.')).toBeVisible();
 await inspect(page,'report');
 const form=page.getByRole('form',{name:'Leave balance filters',exact:true});await expect(form.getByRole('combobox',{name:'Balance state',exact:true})).toBeVisible();
 await form.getByRole('combobox',{name:'Balance state',exact:true}).selectOption('No reservations');await form.getByRole('button',{name:'Apply filters'}).click();await expect(page).toHaveURL(/liability_state=No/);await page.reload();await expect(form.getByRole('combobox',{name:'Balance state',exact:true})).toHaveValue('No reservations');
 const csv=await page.request.get('/api/hr-admin/reports/leave-balance?liability_state=No%20reservations');expect(csv.status()).toBe(200);const text=await csv.text();expect(text).toContain('QA Hour policy');expect(text).toContain('Not assessed');expect(text).not.toContain('Low balance');expect(text).not.toContain('Healthy');
 await page.goto('/hr-admin/reports/leave-balance?liability_risk=High');await expect(page.getByText(/Legacy risk filter is not assessed/)).toBeVisible();await expect(page.getByText('No leave balance rows match the selected filters.')).toBeVisible();const legacy=await page.request.get('/api/hr-admin/reports/leave-balance?liability_risk=High');expect((await legacy.text()).trim().split('\n')).toHaveLength(1);
 await page.goto('/hr-admin/reports/leave-balance');for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});await metricsFit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',`${test.info().project.name}-report-${width}.png`),fullPage:true});}expect(errors).toEqual([]);
});
test('duplicate names including off-page policies block balance import with zero writes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let mutations=0;page.on('request',r=>{if(r.method()==='POST'&&(/leave-balances\/actions|leave-policy-assignments(?:\/import)?$/.test(r.url())))mutations++;});
 await page.goto('/hr-admin/leave-balances?page_size=1');const imports=page.getByTestId('leave-balance-import-workbench').first();await imports.locator('summary').click();await imports.locator('textarea').fill('employee_code,leave_policy_name,action,units,effective_date,reason\nQA-EMP-001,QA Casual 2026,credit_adjustment,1,2026-10-20,Ambiguous policy must not write');await imports.getByRole('button',{name:'Preview leave import',exact:true}).click();await expect(imports).toContainText('Policy name is ambiguous');await expect(imports.getByRole('button',{name:/Commit/})).toBeDisabled();
 await expect(imports.getByRole('alert')).toContainText('Import needs attention');await inspect(page,'balance-import');expect(mutations).toBe(0);expect(errors).toEqual([]);
});
test('duplicate policy names block assignment import without writing',async({page})=>{
 let mutations=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/hr-admin/leave-policy-assignments'))mutations++;});
 await page.goto('/hr-admin/leave-policy-assignments');const block=page.getByTestId('leave-policy-assignment-import-workbench');await block.locator('xpath=..').locator('summary').click();await block.locator('textarea').fill('employee_code,leave_policy_name,effective_from,effective_to,priority,is_active\nQA-EMP-001,QA Casual 2026,2035-01-01,2035-12-31,912,true');await block.getByRole('button',{name:'Preview assignment import',exact:true}).click();await expect(block).toContainText('Policy name is ambiguous');await expect(block.getByRole('button',{name:/Commit/})).toBeDisabled();await expect(block.getByRole('alert')).toContainText('Assignment import needs attention');await inspect(page,'assignment-import');expect(mutations).toBe(0);
});
