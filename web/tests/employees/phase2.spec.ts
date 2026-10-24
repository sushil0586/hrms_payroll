import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let runtimeErrors:string[]=[];
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200)});
test.afterEach(()=>{expect(runtimeErrors).toEqual([])});
const evidence=process.env.EMPLOYEE_EVIDENCE_DIR || '../docs/qa/evidence/employee-makeover-phase2-2026-10-22';
test('mobile filters serialize collapsed controls and reopen committed non-default scope',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/hr-admin/employees');
 const form=page.getByRole('form',{name:'Directory filters'});const disclosure=form.locator('.employee-directory-filters');
 await expect(disclosure).not.toHaveAttribute('open');await expect(form.getByLabel('Search',{exact:true})).toBeVisible();
 await disclosure.locator('summary').click();await form.getByRole('combobox',{name:'Status',exact:true}).selectOption('active');await form.getByRole('combobox',{name:'Department',exact:true}).selectOption({label:'QA People'});
 await disclosure.locator('summary').click();await expect(disclosure).not.toHaveAttribute('open');await form.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(page).toHaveURL(/status=active/);await expect(page).toHaveURL(/department=QA/);await expect(disclosure).toHaveAttribute('open');await expect(page.getByRole('table',{name:'Employee directory',exact:true}).locator('tbody tr')).toHaveCount(6);
 await page.reload();await expect(disclosure).toHaveAttribute('open');await expect(form.getByRole('combobox',{name:'Status',exact:true})).toHaveValue('active');
 await page.screenshot({path:`${evidence}/${info.project.name}-active-filters-390.png`});
 await form.getByRole('link',{name:'Reset',exact:true}).click();await expect(disclosure).not.toHaveAttribute('open');await page.goBack();await expect(disclosure).toHaveAttribute('open');
});
test('pointer and keyboard selection reveal full-width details and close to actual trigger',async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/hr-admin/employees');
 const table=page.getByRole('table',{name:'Employee directory',exact:true});const before=(await table.boundingBox())!;
 const trigger=page.locator(`tr[data-employee-id="${fixture.manifest.credentials.employee.employee_id}"] .employee-directory-table__identity`);
 for(const mode of ['pointer','keyboard']){
  if(mode==='pointer')await trigger.click();else{await trigger.focus();await trigger.press('Enter')}
  await expect(page).toHaveURL(new RegExp(`employeeId=${fixture.manifest.credentials.employee.employee_id}`));await expect(page.locator('.workspace-navigation-status')).toHaveCount(0);
  const detail=page.locator('.employee-detail-drawer');const heading=detail.getByRole('heading',{name:'Esha Employee',exact:true});await expect(heading).toBeFocused();
  const after=(await table.boundingBox())!;expect(Math.abs(after.width-before.width)).toBeLessThan(1);expect((await detail.boundingBox())!.width).toBeGreaterThan(before.width-2);expect((await detail.boundingBox())!.y).toBeGreaterThanOrEqual(after.y+after.height);
  await expect(detail.getByRole('link',{name:'Edit',exact:true})).toHaveCount(1);await expect(detail.getByRole('link',{name:'Access',exact:true})).toHaveCount(0);
  await detail.getByText('Actions',{exact:true}).click();await expect(detail.getByRole('link',{name:/Manage access/})).toBeVisible();await expect(detail.getByRole('link',{name:/Edit employee/})).toHaveCount(0);
  await page.screenshot({path:`${evidence}/${info.project.name}-detail-${mode}-1440.png`});
  if(mode==='pointer'){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const scan=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(context:object,options:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.employee-detail-drawer']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});
   await info.attach('employee-detail-axe',{body:JSON.stringify(scan,null,2),contentType:'application/json'});expect(scan.violations).toEqual([]);
  }
  await detail.getByRole('link',{name:'Close details',exact:true}).click();await expect(detail).toHaveCount(0);await expect(trigger).toBeFocused();
 }
});
test('direct selection and history retain the employee context and fallback close target',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.setViewportSize({width:320,height:844});await page.goto(`/hr-admin/employees?employeeId=${id}`);
 const detail=page.locator('.employee-detail-drawer');await expect(detail.getByRole('heading',{name:'Esha Employee',exact:true})).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`${evidence}/${info.project.name}-detail-320.png`});
 await detail.getByRole('link',{name:'Close details',exact:true}).click();await expect(detail).toHaveCount(0);await expect(page.locator(`tr[data-employee-id="${id}"] .employee-directory-table__identity`)).toBeFocused();
 await expect(page).not.toHaveURL(/employeeId=/);await page.goBack();await expect(detail).toContainText('Esha Employee');await page.goForward();await expect(detail).toHaveCount(0);
});

test('filter layout aligns desktop controls and gives mobile results space',async({page},info)=>{
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:844});await page.goto('/hr-admin/employees');
  const form=page.getByRole('form',{name:'Directory filters'});const disclosure=form.locator('.employee-directory-filters');
  if(width>900){
   await expect(disclosure).toHaveAttribute('open');
   const tops=[];
   for(const name of ['Search','Department','Status','Sort by']){const control=name==='Search'?form.getByLabel(name,{exact:true}):form.getByRole('combobox',{name,exact:true});tops.push((await control.boundingBox())!.y)}
   expect(Math.max(...tops)-Math.min(...tops)).toBeLessThan(5);
  }else{
   await expect(disclosure).not.toHaveAttribute('open');
   const apply=(await form.getByRole('button',{name:'Apply',exact:true}).boundingBox())!;const reset=(await form.getByRole('link',{name:'Reset',exact:true}).boundingBox())!;
   expect(Math.abs(apply.y-reset.y)).toBeLessThan(1);
   if(width===390)expect((await page.getByRole('table',{name:'Employee directory',exact:true}).boundingBox())!.y).toBeLessThan(844);
  }
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`${evidence}/${info.project.name}-layout-${width}.png`});
 }
});

test('detail actions open the existing employee, access and bank dialogs and return context',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.setViewportSize({width:390,height:844});
 for(const item of [{key:'edit',name:'Edit',title:'Edit employee'},{key:'access',name:'Manage access',title:'Manage access'},{key:'bank',name:'Manage bank accounts',title:'Manage bank accounts'}]){
  await page.goto(`/hr-admin/employees?employeeId=${id}`);const detail=page.locator('.employee-detail-drawer');await expect(detail).toContainText('Esha Employee');
  if(item.key!=='edit')await detail.getByText('Actions',{exact:true}).click();
  await detail.getByRole('link',{name:item.key==='edit'?'Edit':new RegExp(`^${item.name}`),exact:item.key==='edit'}).click();
  const dialog=page.getByRole('dialog',{name:item.title,exact:true});await expect(dialog).toBeVisible();
  await page.screenshot({path:`${evidence}/${info.project.name}-action-${item.key}-390.png`});
  await dialog.getByRole('button',{name:`Close ${item.title}`,exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(new RegExp(`employeeId=${id}`));await expect(page).not.toHaveURL(/action=/);await expect(detail).toContainText('Esha Employee');
 }
});
