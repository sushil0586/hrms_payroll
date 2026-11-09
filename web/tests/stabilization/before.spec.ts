import { test, expect } from '@playwright/test';
import { componentBundle } from './component-bundle';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
test('A07 before-source reproduction: intermediate route discards destination receipt',async({page},info)=>{
 const before=process.env.HRMS_WFA_BEFORE_RECEIPT;if(!before)throw Error('Frozen exact before-source path required');
 await page.route('https://synthetic.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<html lang="en"><title>WF-A before source</title><body><main><div id="root"></div></main></body></html>'}));await page.goto('https://synthetic.invalid/hr-admin/intermediate');
 await page.evaluate(()=>sessionStorage.setItem('accerio.action-feedback',JSON.stringify({pathname:'/hr-admin/destination',id:'owned-record',title:'Saved',message:'Synthetic destination receipt',createdAt:Date.now()})));
 await page.addScriptTag({content:componentBundle(before)});await expect(page.getByRole('heading',{name:'Synthetic WF-A fixture'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('accerio.action-feedback'))).toBeNull();
 await info.attach('before-source-identity',{contentType:'application/json',body:JSON.stringify({sha256:createHash('sha256').update(fs.readFileSync(before)).digest('hex'),actual:'pending destination receipt was lost',expected:'retain until matching destination consumes',defect:'STAB-SHARED-001'})});await info.attach('A07-before.png',{contentType:'image/png',body:await page.screenshot()});
});
