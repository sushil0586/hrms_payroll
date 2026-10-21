import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona} from '../helpers/isolated-qa-workspace';
test('diagnose outer grid sizing against responsive flex wrap',async({page},info)=>{
 const fixture=await provisionIsolatedQaWorkspace(info);try{const u=workspacePersona(fixture,'hr_admin');await page.request.post('/api/auth/login',{data:{identifier:u.username,password:u.password}});await page.goto('/hr-admin/reports/leave-balance');
 const geometry=()=>page.locator('.workspace-metric-grid .metric-tile').evaluateAll(tiles=>tiles.map(tile=>{const box=tile.getBoundingClientRect();return {box:box.toJSON(),display:getComputedStyle(tile).display,minHeight:getComputedStyle(tile).minHeight,children:[...tile.children].map(child=>({text:child.textContent,box:child.getBoundingClientRect().toJSON()})),fits:[...tile.children].every(child=>{const r=child.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom&&r.left>=box.left&&r.right<=box.right;})};}));
 for(const width of [390,1440,768,390]){await page.setViewportSize({width,height:900});await page.screenshot();}const before=await geometry();
 await page.addStyleTag({content:'.accerio-shell .accerio-page .workspace-metric-grid {display:flex;flex-wrap:wrap}.accerio-shell .accerio-page .workspace-metric-grid .metric-tile {flex:1 0 calc(25% - var(--space-3))}@media(max-width:900px){.accerio-shell .accerio-page .workspace-metric-grid .metric-tile {flex-basis:calc(50% - var(--space-3))}}'});
 const after=[];for(const width of [1440,768,390,1440,390]){await page.setViewportSize({width,height:900});await page.screenshot();after.push({width,tiles:await geometry()});}
 writeFileSync(path.resolve(__dirname,'../../../docs/qa/evidence/hr-admin-standardization/leave-correctness/layout-flex-diagnostic.json'),JSON.stringify({before,after},null,2));expect(before.some(t=>!t.fits)).toBe(true);expect(after.every(stage=>stage.tiles.every(t=>t.fits))).toBe(true);
 }finally{await cleanupIsolatedQaWorkspace(fixture);}
});
