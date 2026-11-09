import {test,expect,login} from './helpers';
import routes from './routes.json';
for(const role of [...new Set(routes.map(r=>r.role))]){
 test(`WF-F page family ${role}`,async({page,owned},info)=>{
  info.setTimeout(role==='hr_admin'?600000:300000);
  if(role!=='public')await login(page,owned,role as Parameters<typeof login>[2]);
  const results:unknown[]=[];const failures:string[]=[];
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes.filter(r=>r.role===role)){
   let url=route.route.replace('/docs/[[...slug]]','/docs');
   const emp=owned.workspace.manifest.credentials.employee.employee_id;
   url=url.replace('[employeeId]',emp);
   if(url.includes('[itemId]')){const parts=url.split('/');const moduleKey=parts[2]==='organization'?parts[3]:parts[2];url=url.replace('[itemId]',owned.prepared[moduleKey]||'00000000-0000-0000-0000-000000000000');}
   const start=errors.length;
   try{
    const response=await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await page.keyboard.press('Tab');
    const detail=await page.evaluate(()=>({title:document.title,headings:[...document.querySelectorAll('h1')].map(el=>el.textContent),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.querySelector('main')?.textContent?.slice(0,700)??''}));
    await info.attach(route.id+'.png',{body:await page.screenshot({animations:'disabled',fullPage:true}),contentType:'image/png'});
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const violations=await page.evaluate(async()=>await (window as unknown as{axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run().then(r=>r.violations));
    const summary={id:route.id,route:url,template:route.template,project:info.project.name,actualURL:page.url(),status:response?.status(),detail,violations,errors:errors.slice(start)};results.push(summary);
    await info.attach(route.id+'-audit',{body:JSON.stringify(summary),contentType:'application/json'});
    if((response?.status()??500)>=500||!detail.headings.length||detail.scrollWidth>detail.width+1||violations.length||errors.length>start)failures.push(route.id);
   }catch(e){failures.push(route.id);results.push({id:route.id,route:url,error:String(e)});}
  }
  await info.attach('page-family-results',{body:JSON.stringify(results),contentType:'application/json'});
  expect(failures,'Affected cells retain individual details; continue family to avoid losing inventory evidence').toEqual([]);
 });
}
