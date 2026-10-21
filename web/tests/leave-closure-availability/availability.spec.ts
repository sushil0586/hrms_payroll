import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeEach(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info);});
test.afterEach(async()=>{await cleanupIsolatedQaWorkspace(fixture);});
function csvFields(line:string){const result:string[]=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){result.push(value);value='';}else value+=c;}result.push(value);return result;}
test('ESS, HR report and CSV use the canonical net balance without reserving twice',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const login=async(role:'hr_admin'|'employee')=>{const user=workspacePersona(fixture,role);expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);};
 await login('hr_admin');
 const response=await page.request.get('/api/hr-admin/leave-balances?page_size=50');expect(response.status()).toBe(200);const item=(await response.json()).items.find((row:{id:string})=>row.id===fixture.manifest.leave.balance_id);expect(Number(item.reserved_amount)).toBeGreaterThan(0);const canonical=Number(item.closing_balance).toFixed(2);
 await login('employee');await page.goto('/ess/leave');await expect(page.getByText(canonical+' units available',{exact:true})).toBeVisible();
 await login('hr_admin');await page.goto('/hr-admin/reports/leave-balance');
 const row=page.getByRole('table',{name:'Leave balance report',exact:true}).getByRole('row').filter({hasText:fixture.manifest.credentials.employee.employee_code});
 await expect(row.getByText('Closing '+canonical,{exact:true})).toBeVisible();await expect(row.getByText('Available '+canonical,{exact:true})).toBeVisible();
 const exported=await page.request.get('/api/hr-admin/reports/leave-balance');expect(exported.status()).toBe(200);const lines=(await exported.text()).trim().split(/\r?\n/).map(csvFields),columns=lines[0],data=lines.slice(1).find(cells=>cells[columns.indexOf('employee_code')]===fixture.manifest.credentials.employee.employee_code)!;expect(data).toBeTruthy();expect(data[columns.indexOf('closing_balance')]).toBe(canonical);expect(data[columns.indexOf('available_after_reserved')]).toBe(canonical);expect(errors).toEqual([]);
 const root=process.env.LEAVE_CLOSURE_EVIDENCE_ROOT||path.resolve(__dirname,'../../../docs/qa/evidence/leave-blocker-closure');mkdirSync(path.join(root,'availability'),{recursive:true});writeFileSync(path.join(root,'availability',info.project.name+'-net-balance.json'),JSON.stringify({canonical, reserved:item.reserved_amount,ess_available:canonical,hr_available:canonical,csv_available:data[columns.indexOf('available_after_reserved')]},null,2));
});
