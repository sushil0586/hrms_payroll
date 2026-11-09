import { test, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { componentBundle } from './component-bundle';
const root=path.resolve(__dirname,'../../..');
function css(file:string):string{return fs.readFileSync(file,'utf8').replace(/@import ["']([^"']+)["'];/g,(_match,ref:string)=>css(path.resolve(path.dirname(file),ref)));}
const styles=['web/src/app/globals.css','web/src/styles/accerio.css','web/src/styles/workspace-shell.css','web/src/styles/workspace-patterns.css'].map(p=>css(path.join(root,p))).join('\n');
const bundle=componentBundle();
async function open(page:Page,mode='receipt'){
 await page.route('https://synthetic.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<html lang="en"><title>WF-A synthetic fixture</title><body class="accerio-shell workspace-tone--hr"><main class="accerio-page"><div id="root"></div></main></body></html>'}));
 await page.goto('https://synthetic.invalid/hr-admin/shifts');await page.addStyleTag({content:styles});
 await page.evaluate(m=>{Object.assign(window,{fixtureMode:m,responseMode:'ok'});},mode);await page.addScriptTag({content:bundle});await expect(page.getByRole('heading',{name:'Synthetic WF-A fixture'})).toBeVisible();
}
async function shot(page:Page,info:TestInfo,name:string){await info.attach(name,{contentType:'image/png',body:await page.screenshot({animations:'disabled'})});}
async function call(page:Page,code:string){return page.evaluate(code);}

test('A01-A10 shared success lifetime and receipt boundaries',async({page,browser},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await open(page);
 await page.clock.install({time:new Date('2026-11-08T06:00:00Z')});await page.clock.pauseAt(new Date('2026-11-08T06:00:00Z'));
 await page.getByRole('button',{name:'Save and close child',exact:true}).click();await expect(page.locator('.action-toast')).toHaveCount(1);await expect(page.getByRole('button',{name:'Save and close child'})).toBeFocused();await shot(page,info,'A01-success-child-unmounted.png');
 await page.clock.runFor(4999);await expect(page.locator('.action-toast')).toHaveCount(1);await page.clock.runFor(1);await expect(page.locator('.action-toast')).toHaveCount(0);
 await page.getByRole('button',{name:'Success',exact:true}).click();await page.clock.runFor(3000);await page.getByRole('button',{name:'Success',exact:true}).press('Enter');await page.clock.runFor(4999);await expect(page.locator('.action-toast')).toHaveCount(1);await page.clock.runFor(1);await expect(page.locator('.action-toast')).toHaveCount(0);
 await page.getByRole('button',{name:'Success',exact:true}).click();await page.getByRole('button',{name:'Dismiss notification'}).click();await expect(page.locator('.action-toast')).toHaveCount(0);
 // Remount the route-owned receipt through actual client route state changes.
 await call(page,"window.wfa.route('/hr-admin/intermediate')");await call(page,"window.wfa.publish('/hr-admin/destination','owned-record','Action saved.','Destination saved.')");
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('accerio.action-feedback'))).not.toBeNull();
 await call(page,"window.wfa.route('/hr-admin/destination')");
 // The first child was deliberately unmounted; use a new scope to mount a fresh page consumer.
 await call(page,"window.changeScope('qa:user:membership:hr')");
 await call(page,"window.changeScope('qa:user:membership:new')");await expect(page.locator('.action-toast')).toHaveCount(0);
 // Another scope cannot consume the old receipt; source remains pending until expiry/owner consumption.
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('accerio.action-feedback'))).not.toBeNull();
 await page.reload();await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle});await expect(page.getByRole('heading',{name:'Synthetic WF-A fixture'})).toBeVisible();
 await call(page,"window.wfa.route('/hr-admin/intermediate')");await call(page,"window.wfa.publish('/hr-admin/destination','owned-record','Action saved.','Destination saved.')");
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('accerio.action-feedback'))).not.toBeNull();await call(page,"window.wfa.route('/hr-admin/destination')");await expect(page.locator('.action-toast')).toContainText('Destination saved.');await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('accerio.action-feedback'))).toBeNull();
 await page.clock.runFor(5000);await expect(page.locator('.action-toast')).toHaveCount(0);await expect(page.locator('.notice--success')).toContainText('Destination saved.');
 await call(page,"window.wfa.route('/hr-admin/other')");await page.goBack();await expect(page.locator('.action-toast')).toHaveCount(0);
 await call(page,"window.wfa.publish(location.pathname,'outside-record','Action saved.','Filtered saved.')");await expect(page.locator('.action-toast')).toHaveCount(1);await expect(page.locator('.action-toast')).toContainText('outside this view');await shot(page,info,'A10-filtered-receipt.png');await page.getByRole('button',{name:'Dismiss notification'}).click();
 for(const value of [null,{}, {pathname:'/hr-admin/destination',id:'owned-record',title:'Old',message:'Expired',scope:'qa:user:membership:hr',createdAt:0}, {pathname:'/hr-admin/destination',id:'owned-record',title:'Future',message:'Future',scope:'qa:user:membership:hr',createdAt:Date.UTC(2099,0,1)}]){
  await page.evaluate(detail=>window.dispatchEvent(new CustomEvent('accerio:action-feedback',{detail})),value);await expect(page.locator('.action-toast')).toHaveCount(0);
 }
 await page.evaluate(()=>{Object.defineProperty(Storage.prototype,'setItem',{configurable:true,value(){throw new Error('Synthetic blocked storage')}});Object.defineProperty(Storage.prototype,'getItem',{configurable:true,value(){throw new Error('Synthetic blocked storage')}});});
 await call(page,"window.wfa.publish(location.pathname,'owned-record','Action saved.','Storage-independent live success.')");await expect(page.locator('.action-toast')).toContainText('Storage-independent live success.');await page.getByRole('button',{name:'Dismiss notification'}).click();
 await page.getByRole('button',{name:'Open modal',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}for(let i=0;i<12;i++){await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}await shot(page,info,'A03-modal-keyboard.png');await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Open modal',exact:true})).toBeFocused();
 await page.clock.resume();await page.addScriptTag({path:path.join(root,'web/node_modules/axe-core/axe.min.js')});const axe=await page.evaluate(async()=>await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run());expect(axe.violations).toEqual([]);expect(errors).toEqual([]);await info.attach('identity-and-accessibility',{contentType:'application/json',body:JSON.stringify({browser:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize(),axeViolations:axe.violations,errors,synthetic:true,mocked:true})});
});

test('A11 manager rejected, uncertain and failed-read outcomes do not publish success',async({page},info)=>{
 await open(page,'panel');await page.getByRole('button',{name:'Reject request',exact:true}).click();await expect(page.getByRole('textbox',{name:'Decision note'})).toBeFocused();await expect(page.locator('.action-toast--success')).toHaveCount(0);
 for(const mode of ['network','error','ok']){
  await page.evaluate(m=>Object.assign(window,{responseMode:m}),mode);await page.getByRole('button',{name:'Approve request',exact:true}).click();await expect(page.locator('.manager-decision-panel [role="alert"]')).toContainText(mode==='ok'?'latest queue could not be confirmed':'could not confirm the outcome');await expect(page.locator('.action-toast--success')).toHaveCount(0);
 }
 await shot(page,info,'A11-failed-confirmation.png');
});
