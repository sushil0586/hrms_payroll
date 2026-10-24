import {expect,test} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from '../helpers/isolated-qa-workspace';

type Inventory = {
  route_pattern_count:number;
  routes:Array<{route:string;phase:number;kind:string;source:string;states:string[]}>;
};

const repo=path.resolve(__dirname,'../../..');
const inventory=JSON.parse(readFileSync(path.join(repo,'docs/ui/hrms-payroll-route-inventory.json'),'utf8')) as Inventory;
const evidenceRoot=process.env.PAYROLL_PHASE1_EVIDENCE_ROOT||path.join(repo,'docs/qa/evidence/payroll-makeover-phase1-2026-10-24');
let fixture:IsolatedQaWorkspace;

test.beforeAll(async({},info)=>{
  fixture=await provisionIsolatedQaWorkspace(info);
  mkdirSync(path.join(evidenceRoot,'screens'),{recursive:true});
});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{
  const persona=workspacePersona(fixture,'hr_admin');
  expect((await page.request.post('/api/auth/login',{data:{identifier:persona.username,password:persona.password}})).status()).toBe(200);
});

test('inventory guard matches the documented route census',()=>{
  expect(inventory.routes).toHaveLength(35);
  expect(new Set(inventory.routes.map(item=>item.route)).size).toBe(35);
  expect(inventory.route_pattern_count).toBe(35);
  for(const item of inventory.routes)expect(readFileSync(path.join(repo,item.source),'utf8').length).toBeGreaterThan(0);
});

for(const item of inventory.routes){
  test(`${item.route} current rendered baseline`,async({page},info)=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    const response=await page.goto(item.route,{waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.accerio-shell')).toBeVisible();
    await expect(page.locator('main.accerio-page')).toBeVisible();
    for(const hydrated of await page.locator('[data-hydrated]').all())await expect(hydrated).toHaveAttribute('data-hydrated','true');
    const samples=[];
    for(const width of [1440,1024,768,390,320]){
      await page.setViewportSize({width,height:width<=390?640:900});
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{message:`document overflow at ${width}`}).toBeTruthy();
      const tableRegions=page.locator('main .workspace-table-region:visible');
      for(let index=0;index<await tableRegions.count();index++){
        const region=tableRegions.nth(index);
        await expect(region).toHaveAttribute('tabindex','0');
      }
      if([1440,390,320].includes(width)){
        const slug=item.route.slice(1).replaceAll('/','-');
        const file=`${info.project.name}-${slug}-${width}.png`;
        await page.screenshot({path:path.join(evidenceRoot,'screens',file),fullPage:true});
        samples.push(file);
      }
    }
    expect(errors).toEqual([]);
    writeFileSync(info.outputPath('route-proof.json'),JSON.stringify({browser:info.project.name,...item,samples},null,2));
  });
}
