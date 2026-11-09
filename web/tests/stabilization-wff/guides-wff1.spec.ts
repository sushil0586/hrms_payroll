import {test,expect,login} from './helpers';
import fs from 'node:fs';
import path from 'node:path';
test('F1-GUIDES concrete guide article coverage',async({page,owned},info)=>{
 test.setTimeout(900000);test.skip(!info.project.name.endsWith('-1440'),'Article state expansion uses all three desktop engines; narrow coverage remains separately tracked.');
 const matrix=JSON.parse(fs.readFileSync(path.join(process.env.HRMS_PILOT_EVIDENCE!.replace('/evidence/','/agentic/'),'guide-matrix.json'),'utf8'));
 await login(page,owned,'hr_admin');const results=[];
 for(const [i,item] of matrix.entries()){
 const response=await page.goto(item.route,{waitUntil:'networkidle'});await expect(page.locator('main h1').first()).toBeVisible();await expect(page).toHaveURL(url=>url.pathname===item.route);await page.evaluate(()=>document.fonts.ready);
 const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 await info.attach(`guide-${i}.png`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>await(window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run().then(r=>r.violations));
 const row={id:`F1-ARTICLE-${i}`,route:item.route,status:response?.status(),geometry,violations};results.push(row);await info.attach(`article-cell-${i}`,{body:JSON.stringify(row),contentType:'application/json'});
 expect.soft(response?.status(),item.route).toBe(200);expect.soft(geometry.scrollWidth,item.route).toBeLessThanOrEqual(geometry.width);expect.soft(violations,item.route).toEqual([]);
 }
 await info.attach('article-results',{body:JSON.stringify(results),contentType:'application/json'});
});
