import {test,expect,login,shot,axe} from './helpers';
test('F1-S search viewport keyboard and shared consumers',async({page,owned},info)=>{
 for(const [role,route]of [['hr_admin','/hr-admin/employees'],['employee','/ess/profile'],['manager','/mss/notifications'],['tenant_admin','/tenant-admin/users'],['platform','/platform-admin/tenants']]as const){
 await login(page,owned,role);await page.goto(route,{waitUntil:'networkidle'});
 const input=page.getByRole('searchbox',{name:'Workspace search',exact:true});await input.focus();const panel=page.getByRole('region',{name:'Workspace search results',exact:true});await expect(panel).toBeVisible();
 const geometry=await panel.evaluate(el=>{const r=el.getBoundingClientRect();const input=document.querySelector('.workspace-search')!.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,input:{x:input.x,bottom:input.bottom,width:input.width},viewport:{w:innerWidth,h:innerHeight},scroll:document.documentElement.scrollWidth,hit:el.contains(document.elementFromPoint(r.x+r.width/2,Math.max(0,r.y+20)))}});
 await info.attach(role+'-geometry',{body:JSON.stringify(geometry),contentType:'application/json'});await shot(page,info,role+'-search');
 expect.soft(geometry.y).toBeGreaterThanOrEqual(geometry.input.bottom-1);expect.soft(geometry.bottom).toBeLessThanOrEqual(geometry.viewport.h);expect.soft(geometry.x).toBeGreaterThanOrEqual(0);expect.soft(geometry.right).toBeLessThanOrEqual(geometry.viewport.w);expect.soft(geometry.scroll).toBeLessThanOrEqual(geometry.viewport.w);expect.soft(geometry.hit).toBe(true);
 if(geometry.y<geometry.viewport.h){await page.keyboard.press('Tab');await expect.poll(()=>panel.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
 await axe(page,info,'axe-'+role);
 if(info.project.use.viewport!.width===320){
 await panel.locator('.workspace-search__result strong').first().evaluate(el=>el.textContent='Synthetic long destination label '+ 'LongUnbrokenDestination'.repeat(8));
 const long=await panel.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));expect(long.scroll).toBeLessThanOrEqual(long.width);await shot(page,info,role+'-long-label');
 }
 await page.keyboard.press('Escape');await expect(panel).toBeHidden();await input.focus();await input.fill('zz-no-such-destination');await expect(panel.getByText('No matching page',{exact:true})).toBeVisible();await input.fill('');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect.poll(()=>panel.locator('.workspace-search__result').first().evaluate(el=>el===document.activeElement)).toBe(true);await page.keyboard.press('Enter');await expect(panel).toBeHidden();
 }
});
test('F1-M MSS dashboard compact actions and destinations',async({page,owned},info)=>{
 await login(page,owned,'manager');await page.goto('/mss',{waitUntil:'networkidle'});const actions=page.locator('.workspace-standard-header__actions .button');await expect(actions).toHaveCount(3);
 const boxes=await actions.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {label:el.textContent,height:r.height,width:r.width,href:el.getAttribute('href'),x:r.x,right:r.right}}));await info.attach('action-dimensions',{body:JSON.stringify(boxes),contentType:'application/json'});await shot(page,info,'manager-dashboard');for(const b of boxes){expect.soft(b.height).toBeGreaterThanOrEqual(36);expect.soft(b.height).toBeLessThan(90);expect.soft(b.right).toBeLessThanOrEqual(page.viewportSize()!.width);expect(b.href).toBeTruthy();}await axe(page,info,'axe-mss');
 for(const b of boxes){await page.locator('.workspace-standard-header__actions').getByRole('link',{name:b.label!,exact:true}).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(url=>url.pathname+url.search===b.href);await expect(page.locator('main h1').first()).toBeVisible();await page.goto('/mss',{waitUntil:'networkidle'});}

});
