import {expect,test} from '@playwright/test';
import {formatWorkspaceDate} from '../../src/lib/ui/date-time-format';

test('date-only values preserve calendar date across tenant timezone display',async({page,browser},info)=>{
 const cases=[{value:'2026-11-07',expected:'07 Nov 2026'},{value:'2028-02-29',expected:'29 Feb 2028'},{value:'2030-01-01',expected:'01 Jan 2030'}].flatMap(c=>['UTC','Asia/Kolkata','America/New_York'].map(zone=>({...c,zone,node:formatWorkspaceDate(c.value,zone)})));
 const observed=await page.evaluate(({source,cases})=>new Function('cases',`${source};return cases.map(c=>({...c,browser:formatWorkspaceDate(c.value,c.zone)}))`)(cases),{source:formatWorkspaceDate.toString(),cases});
 await info.attach('date-only-semantic-oracle',{body:JSON.stringify({oracle:'docs/ui/hrms-ui-ux-standard.md section12: Date-only values remain dates and must not shift through UTC conversion.',engine:info.project.use.browserName,version:browser.version(),observed,scope:'ActualhelperNode/browseroutputs; noNYtenantworkflow orbusinessmutation'},null,2),contentType:'application/json'});
 for(const row of observed){expect.soft(row.node).toBe(row.expected);expect.soft(row.browser).toBe(row.expected)}
});
