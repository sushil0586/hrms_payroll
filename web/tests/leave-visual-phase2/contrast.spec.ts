import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona} from '../helpers/isolated-qa-workspace';
function luminance(color:string){const values=(color.match(/[\d.]+/g)??[]).slice(0,3).map(v=>{const s=Number(v)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('control boundaries and text contrast are measurable in actual four-role renders',async({page},info)=>{
 const fixture=await provisionIsolatedQaWorkspace(info);const evidence=process.env.PHASE2_EVIDENCE_DIR!;mkdirSync(evidence,{recursive:true});const measured: { role: string; disabled: boolean; border: string; background: string; text: string; borderWidth: string; boundaryRatio: number; textRatio: number }[]=[];
 try{
  for(const [role,route,label]of [['employee','/ess/leave','Search leave history'],['hr_admin','/hr-admin/leave-requests','Search'],['tenant_admin','/tenant-admin/leave-year','Period code'],['manager','/mss/approvals?queue=leave','Decision note']]as const){
   const actor=workspacePersona(fixture,role);expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);await page.goto(route);
   if(role==='manager')await page.getByRole('button',{name:'Review',exact:true}).last().click();
   const input=page.getByRole('textbox',{name:label,exact:true});await expect(input).toBeVisible(); await expect(input).toBeEnabled();
   const sample=()=>input.evaluate(node=>{const style=getComputedStyle(node);return{disabled:node.matches(':disabled'),border:style.borderTopColor,background:style.backgroundColor,text:style.color,borderWidth:style.borderTopWidth};});
   const styles=await sample();
   const result={role,...styles,boundaryRatio:contrast(styles.border,styles.background),textRatio:contrast(styles.text,styles.background)};measured.push(result);
   const record=()=>writeFileSync(path.join(evidence,`${info.project.name}-measured-contrast.json`),JSON.stringify(measured,null,2));record();
   // Native enabled state may precede the end of the existing border-color transition.
   // Observe the actual rendered contrast condition, without sleeps or timeout changes.
   await expect.poll(async()=>{const current=await sample();Object.assign(result,current,{boundaryRatio:contrast(current.border,current.background),textRatio:contrast(current.text,current.background)});record();return result.boundaryRatio;}).toBeGreaterThanOrEqual(3);
   expect(result.disabled).toBe(false);expect(parseFloat(result.borderWidth)).toBeGreaterThan(0);expect(result.textRatio).toBeGreaterThanOrEqual(4.5);
  }
 }finally{await cleanupIsolatedQaWorkspace(fixture);}
});
