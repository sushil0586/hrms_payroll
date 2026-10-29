import { expect, test } from "@playwright/test";
import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

async function open(page: import("@playwright/test").Page, path: string) {
  const response=await page.goto(path,{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);await page.waitForLoadState("networkidle",{timeout:10_000}).catch(()=>undefined);const shell=await markLocalUpdateShell(page);return {shell,nav:await documentNavigationCount(page)};
}

test("permission filters use history and preserve the catalog shell",async({page})=>{
  const {shell,nav}=await open(page,"/platform-admin/permissions");const form=page.locator(".platform-permission-filters");await form.getByPlaceholder("Permission key, label, module, role").fill("attendance");await form.getByRole("button",{name:"Apply"}).click();await expect(page).toHaveURL(/q=attendance/);await expect(form.getByPlaceholder("Permission key, label, module, role")).toHaveValue("attendance");await page.goBack();await expect(form.getByPlaceholder("Permission key, label, module, role")).toHaveValue("");const row=page.locator(".platform-permission-row").first();const key=(await row.locator("code").textContent())!;await page.route("**/api/platform/permission-catalog/*",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({key,label:"Phase 6 reconciled permission",module:"Governance",description:"Locally reconciled metadata",risk_level:"high",tenant_assignable:false,required_module:"",required_plan:"",default_role_codes:[],catalog_source:"database",is_active:true})}));await row.getByRole("button",{name:"Edit"}).click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Label").fill("Phase 6 reconciled permission");await dialog.getByRole("button",{name:"Save permission"}).click();await expect(page.locator(".platform-permission-row").filter({hasText:key})).toContainText("Phase 6 reconciled permission");await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("membership invite failure retains the draft and shell",async({page})=>{
  const {shell,nav}=await open(page,"/tenant-admin/users");await page.getByRole("button",{name:"Invite member",exact:true}).first().click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Email").fill("phase6.member@example.com");await dialog.getByLabel("Username").fill("phase6.member");await page.route("**/api/tenant-admin/memberships",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({detail:"Membership service unavailable"})}));await dialog.getByRole("button",{name:"Invite member",exact:true}).click();await expect(dialog.getByText("Membership service unavailable")).toBeVisible();await expect(dialog.getByLabel("Email")).toHaveValue("phase6.member@example.com");await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("role create failure retains entered metadata",async({page})=>{
  const {shell,nav}=await open(page,"/tenant-admin/roles");await page.getByRole("button",{name:"Add role",exact:true}).first().click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Role name").fill("Phase 6 reviewer");await dialog.getByLabel("Role code").fill("phase-6-reviewer");await page.route("**/api/tenant-admin/roles",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({detail:"Role service unavailable"})}));await dialog.getByRole("button",{name:"Create role",exact:true}).click();await expect(dialog.getByText("Role service unavailable")).toBeVisible();await expect(dialog.getByLabel("Role name")).toHaveValue("Phase 6 reviewer");await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("support access view-only controls retain entered evidence locally",async({page})=>{
  const {shell,nav}=await open(page,"/tenant-admin/support-access");await page.getByLabel("Support agent").fill("support.phase6@example.com");await page.getByLabel("Reason").fill("Phase 6 local update verification");await expect(page.getByRole("button",{name:"Request access"})).toBeDisabled();await expect(page.getByText(/request creation is disabled/i)).toBeVisible();await expect(page.getByLabel("Reason")).toHaveValue("Phase 6 local update verification");await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("tenant governance uncertainty keeps its request draft",async({page})=>{
  const {shell,nav}=await open(page,"/tenant-admin/data-governance");await page.getByRole("checkbox").first().check();await page.getByLabel("Business reason").fill("Phase 6 governed export verification");await page.route("**/api/tenant-admin/data-governance/requests",route=>route.abort("connectionreset"));await page.getByRole("button",{name:"Submit request"}).click();await expect(page.locator(".form-error")).toContainText("unconfirmed");await expect(page.getByLabel("Business reason")).toHaveValue("Phase 6 governed export verification");await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("platform tenant filters remain local",async({page})=>{
  const {shell,nav}=await open(page,"/platform-admin/tenants");const search=page.getByPlaceholder(/Search tenant/i).first();if(await search.count()){await search.fill("phase6-no-match");await expect(search).toHaveValue("phase6-no-match");}await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,nav);
});

test("admin and governance source excludes page-wide refresh mutations",async()=>{
  const {readFileSync}=await import("node:fs");const {resolve}=await import("node:path");const files=["app/tenant-admin/tenant-membership-actions.tsx","app/tenant-admin/tenant-role-actions.tsx","app/tenant-admin/tenant-change-request-actions.tsx","app/tenant-admin/tenant-support-access-actions.tsx","app/platform-admin/platform-admin-console.tsx","app/platform-admin/permissions/permission-catalog-actions.tsx","components/governance/data-governance-workbench.tsx","components/patterns/platform-governance-form-banner.tsx"];const source=files.map(file=>readFileSync(resolve(process.cwd(),"src",file),"utf8")).join("\n");expect(source).not.toContain("router.refresh(");expect(source).not.toContain("window.location.reload(");
});

test("financial calendar and leave year regressions load without post forms",async({page})=>{
  for(const path of["/tenant-admin/financial-calendars","/tenant-admin/leave-year"]){const response=await page.goto(path,{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);await expect(page.locator("main h1")).toBeVisible();await expect(page.locator('form[method="post"]')).toHaveCount(0);}
});
