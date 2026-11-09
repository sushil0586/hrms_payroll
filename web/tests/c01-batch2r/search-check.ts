import {expect,type Page,type TestInfo} from '@playwright/test';import fs from 'node:fs';import path from 'node:path';
export async function checkSearch(page:Page,info:TestInfo,id:string){
 const dir=path.join(process.env.C02R_EVIDENCE!,'screenshots');fs.mkdirSync(dir,{recursive:true});
 const panel=page.getByRole('region',{name:'Workspace search results',exact:true});await page.locator('input[aria-label="Workspace search"]').focus();await expect(panel).toBeVisible();const first=panel.locator('.workspace-search__result').first();await expect(first).toBeVisible();
 for(const state of ['normal','hover','keyboard-focus']){
  if(state==='hover')await first.hover();
  if(state==='keyboard-focus'){await panel.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press(info.project.use.browserName==='webkit'?'Alt+Tab':'Tab');await expect(first).toBeFocused();}
  const result=await page.evaluate(async()=>await (window as any).axe.run());await info.attach('axe-search-'+state,{body:JSON.stringify(result.violations),contentType:'application/json'});await page.screenshot({path:path.join(dir,id+'-search-'+state+'.png'),fullPage:true,animations:'disabled'});expect(result.violations).toEqual([]);
 }
 await info.attach('search-state-applicability',{body:JSON.stringify({id,keyboard_profile:info.project.use.browserName==='webkit'?'Native control verified Alt+Tab for buttons in this profile; ordinary Tab acceptance is not certified.':'Native Tab verified',selection:'No aria-selected/listbox selected visual state is implemented; actual button keyboard focus represents the available pre-activation state. No selection state invented.',icons:'Text,subtitle,section labels and existing header icons included in axe; no search-result icon exists in this component.'}),contentType:'application/json'});await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
}
