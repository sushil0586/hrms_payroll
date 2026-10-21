import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const evidence=path.join(process.env.LEAVE_CLOSURE_EVIDENCE_ROOT || path.resolve(__dirname,'../../../docs/qa/evidence/leave-blocker-closure'),'shell');
let fixture:IsolatedQaWorkspace;const errors=new WeakMap<Page,string[]>();
test.beforeAll(async({},info)=>{mkdirSync(evidence,{recursive:true});fixture=await provisionIsolatedQaWorkspace(info);});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture);});
test.beforeEach(async({page})=>{errors.set(page,[]);page.on('pageerror',error=>errors.get(page)!.push(error.message));const user=workspacePersona(fixture,'tenant_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
for(const route of ['','users','roles','plan','setup','settings','financial-calendars','security-readiness','support-access','trust-audit','data-governance','leave-year'])test('Tenant Admin shell: '+(route||'dashboard'),async({page},info)=>{
 await page.goto('/tenant-admin'+(route?'/'+route:''));await expect(page.locator('main h1')).toBeVisible();await expect(page).toHaveURL(new RegExp('/tenant-admin'+(route?'/'+route:'')+'$'));await expect(page.locator('[data-workspace-error]')).toHaveCount(0);await expect(page.locator('.accerio-shell')).toBeVisible();
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});const search=page.getByRole('searchbox',{name:'Workspace search',exact:true});await expect(search).toBeVisible();
  const geometry=await page.locator('header.app-topbar').evaluate(header=>{const rect=header.getBoundingClientRect();const boxes=Array.from(header.querySelectorAll<HTMLElement>('.workspace-search,.topbar-actions--workspace > *')).map(el=>({label:el.className,rect:el.getBoundingClientRect(),display:getComputedStyle(el).display})).filter(b=>b.display!=='none'&&b.rect.width>0);return {header:{left:rect.left,right:rect.right},boxes:boxes.map(b=>({label:b.label,left:b.rect.left,right:b.rect.right,top:b.rect.top,bottom:b.rect.bottom,width:b.rect.width})),searchWidth:header.querySelector('input')!.getBoundingClientRect().width};});
  expect(geometry.searchWidth).toBeGreaterThanOrEqual(160);
  for(const box of geometry.boxes){expect(box.left).toBeGreaterThanOrEqual(geometry.header.left);expect(box.right).toBeLessThanOrEqual(geometry.header.right);}
  for(let i=0;i<geometry.boxes.length;i++)for(let j=i+1;j<geometry.boxes.length;j++){const a=geometry.boxes[i],b=geometry.boxes[j];expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1,'header controls overlap').toBe(false);}
  await page.addScriptTag({content:readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});const axe=await page.evaluate(async()=>{return(await (window as unknown as {axe:{run:(r:unknown,o:unknown)=>Promise<unknown>}}).axe.run(document.querySelector('header.app-topbar'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));});
  writeFileSync(path.join(evidence,`${info.project.name}-${route||'dashboard'}-${width}-axe.json`),JSON.stringify(axe,null,2));expect((axe as {violations:unknown[]}).violations).toEqual([]);
  writeFileSync(path.join(evidence,`${info.project.name}-${route||'dashboard'}-${width}-geometry.json`),JSON.stringify(geometry,null,2));
  if(route==='leave-year'){await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.workspace-metric-grid .metric-tile').evaluateAll(tiles=>tiles.length>0&&tiles.every(tile=>{const l=tile.querySelector('.metric-tile__label')!.getBoundingClientRect(),v=tile.querySelector('.metric-tile__value')!.getBoundingClientRect();return l.bottom<=v.top;}))).toBe(true);}
  await page.screenshot({path:path.join(evidence,`${info.project.name}-${route||'dashboard'}-${width}.png`),fullPage:true});
 }
 if(route==='leave-year'){
  const menu=page.locator('summary').filter({hasText:/^Menu$/});await menu.focus();await page.keyboard.press('Enter');await expect(page.getByRole('navigation',{name:'Tenant Admin mobile navigation'})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
  const search=page.getByRole('searchbox',{name:'Workspace search',exact:true});await search.focus();await search.fill('Users');await expect(page.getByRole('region',{name:'Workspace search results'})).toBeVisible();await page.keyboard.press('Enter');await expect(page).toHaveURL(/tenant-admin\/users/);await expect(page.locator('main h1')).toBeVisible();
 }
});
