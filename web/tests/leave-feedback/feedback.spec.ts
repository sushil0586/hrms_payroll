import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
const evidence = process.env.LEAVE_FEEDBACK_EVIDENCE_DIR ?? path.resolve(__dirname, "../../../docs/qa/evidence/leave-feedback/latest");
let fixture: IsolatedQaWorkspace, pageErrors: string[];
test.beforeEach(async ({page}, info) => {
 fixture = await provisionIsolatedQaWorkspace(info); pageErrors = [];
 page.on("pageerror", e => pageErrors.push(e.message));
 await login(page, "hr_admin");
});
test.afterEach(async () => { try { expect(pageErrors).toEqual([]); } finally { await cleanupIsolatedQaWorkspace(fixture); } });
async function login(page: Page, role: "hr_admin" | "employee" | "manager" | "tenant_admin") {
 const u = workspacePersona(fixture, role);
 expect((await page.request.post("/api/auth/login", {data: {identifier: u.username, password: u.password}})).status()).toBe(200);
}
async function backendGet(page: Page, path: string) {
 const token = (await page.context().cookies()).find(c => c.name === "hrms_access_token")?.value;
 const response = await page.request.get(`${process.env.HRMS_API_BASE_URL}${path}`, {headers:{Authorization:`Token ${token}`}});
 expect(response.status()).toBe(200); return response.json();
}
async function policy(page: Page) {
 await page.goto(`/hr-admin/leave-policies/${fixture.manifest.leave.policy_id}/edit`);
 const section = page.locator("details.form-section-card").filter({has: page.getByRole("heading", {name: "Advanced routing and evidence rules", exact: true})});
 if (await section.getAttribute("open") === null) await section.locator("summary").click();
 return section;
}
async function capture(page: Page, name: string) {
 const root = path.join(evidence, "screenshots"); mkdirSync(root, {recursive:true});
 const prefix = test.info().project.name + "-" + name;
 await page.screenshot({path:path.join(root, prefix+".png"), fullPage:true});
 await page.addScriptTag({content:readFileSync(require.resolve("axe-core/axe.min.js"),"utf8")});
 const result = await page.evaluate(async () => (window as unknown as {axe: {run: (root: unknown, options: unknown) => Promise<{violations:unknown[]; incomplete:unknown[]}>}}).axe.run(document.querySelector('[role="dialog"]') ?? document.querySelector("main"), {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}}));
 writeFileSync(path.join(evidence,prefix+"-axe.json"),JSON.stringify(result,null,2));
 expect(result.violations).toEqual([]);
}

test("client validation reveals a collapsed field and does not steal focus while correcting another error", async ({page}) => {
 const section = await policy(page); await page.getByRole("checkbox",{name:"Enable automatic approval",exact:true}).check();
 const name = page.getByRole("textbox",{name:"Name",exact:true}); const original = await name.inputValue(); await name.fill("");
 await section.locator("summary").click();
 let writes = 0; page.on("request", r => {if(r.method()==="PATCH") writes++;});
 await page.getByRole("button",{name:"Save changes",exact:true}).click();
 await expect(name).toBeFocused(); await expect(name).toHaveAttribute("aria-invalid","true");
 await name.fill(original); await expect(name).toBeFocused();
 await page.getByRole("button",{name:"Save changes",exact:true}).click();
 const hours = page.getByRole("spinbutton",{name:"Automatic approval waiting hours",exact:true});
 await expect(hours).toBeFocused(); await expect(section).toHaveAttribute("open","");
 await expect(hours).toHaveAccessibleDescription(/positive whole number/); expect(writes).toBe(0);
 await hours.fill("7"); await expect(hours).toBeFocused(); await hours.press("2"); await expect(hours).toHaveValue("72"); await expect(hours).toBeFocused(); await expect(hours).toHaveAttribute("aria-invalid","false"); await expect(page.locator(".action-toast")).toHaveCount(0);
 for(const width of [1440,768,390]) { await page.setViewportSize({width,height:900}); await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); await capture(page,"validation-"+width); }
});

test("real nested backend validation preserves values and confirmed save survives navigation only once", async ({page}) => {
 await policy(page); await page.getByRole("checkbox",{name:"Enable automatic approval",exact:true}).check();
 const hours = page.getByRole("spinbutton",{name:"Automatic approval waiting hours",exact:true}); await hours.fill("1000000000");
 let response = page.waitForResponse(r=>r.request().method()==="PATCH"&&r.url().includes("/api/hr-admin/leave-policies/"));
 await page.getByRole("button",{name:"Save changes",exact:true}).click(); expect((await response).status()).toBe(400);
 await expect(hours).toHaveAttribute("aria-invalid","true"); await expect(hours).toBeFocused(); await expect(hours).toHaveValue("1000000000");
 await expect(page.locator(".action-toast")).toContainText("Automatic approval waiting hours");
 await expect(page.locator(".action-toast")).not.toContainText("[object Object]");
 await hours.fill("72"); response = page.waitForResponse(r=>r.request().method()==="PATCH"&&r.url().includes("/api/hr-admin/leave-policies/"));
 await page.getByRole("button",{name:"Save changes",exact:true}).click(); expect((await response).status()).toBe(200);
 await expect(page).toHaveURL(/\/hr-admin\/leave-policies$/); await expect(page.locator(".action-toast")).toContainText("Your changes to this leave policy were saved.");
 const dismiss=page.getByRole("button",{name:"Dismiss notification",exact:true}); await dismiss.focus(); await page.keyboard.press("Enter"); await expect(page.locator(".action-toast")).toHaveCount(0);
 await page.reload(); await expect(page.locator(".action-toast")).toHaveCount(0);
});

test("failed policy transport retains edits, explains uncertain outcome and allows an explicit confirmed retry", async ({page}) => {
 await policy(page); const name=page.getByRole("textbox",{name:"Name",exact:true}); await name.fill("Synthetic feedback policy");
 await page.route("**/api/hr-admin/leave-policies/*",route=>route.request().method()==="PATCH"?route.abort():route.continue(),{times:1});
 await page.getByRole("button",{name:"Save changes",exact:true}).click();
 await expect(page.locator(".action-toast")).toContainText("could not confirm the outcome"); await expect(name).toHaveValue("Synthetic feedback policy");
 expect(await page.evaluate(()=>sessionStorage.getItem("accerio.action-feedback"))).toBeNull();
 await page.route("**/api/hr-admin/leave-policies/*",route=>route.fulfill({status:200,contentType:"application/json",body:"null"}),{times:1});
 await page.getByRole("button",{name:"Save changes",exact:true}).click();
 await expect(page.locator(".action-toast")).toContainText("incomplete confirmation"); await expect(page.locator(".action-toast strong")).toHaveText("Save not confirmed."); await expect(name).toHaveValue("Synthetic feedback policy");
 expect(await page.evaluate(()=>sessionStorage.getItem("accerio.action-feedback"))).toBeNull();
 const original = await backendGet(page,"/hr-admin/leave-policies/"+fixture.manifest.leave.policy_id+"/"); expect(original.name).not.toBe("Synthetic feedback policy");
 const response=page.waitForResponse(r=>r.request().method()==="PATCH"&&r.url().includes("/api/hr-admin/leave-policies/"));
 await page.getByRole("button",{name:"Save changes",exact:true}).click(); expect((await response).status()).toBe(200);
 await expect(page).toHaveURL(/\/hr-admin\/leave-policies$/); await expect(page.locator(".action-toast")).toContainText("saved");
 const persisted=await backendGet(page,"/hr-admin/leave-policies/"+fixture.manifest.leave.policy_id+"/"); expect(persisted.name).toBe("Synthetic feedback policy");
});

test("ESS invalid submission, transport failure and server unavailability keep the form; real retry creates one request", async ({page}) => {
 await login(page,"employee"); await page.goto("/ess/leave"); await page.getByRole("button",{name:"Apply leave",exact:true}).click(); const d=page.getByRole("dialog",{name:"Apply leave",exact:true});
 await d.getByRole("button",{name:"Submit leave",exact:true}).click(); const reason=d.getByLabel("Reason for leave"); await expect(reason).toHaveAttribute("aria-invalid","true");
 await d.getByLabel("Start date",{exact:true}).fill("2026-12-07"); await d.getByLabel("End date",{exact:true}).fill("2026-12-07"); await reason.fill("Synthetic feedback retry");
 let attempts=0, submitted:string|undefined;
 await page.route("**/api/me/leave-requests",async route=>{ if(route.request().method()!=="POST")return route.continue(); attempts++; if(attempts===1)return route.abort(); if(attempts===2)return route.fulfill({status:503,json:{detail:"PRIVATE database trace must never be exposed"}}); const upstream=await route.fetch();const bytes=await upstream.body();submitted=bytes.toString();await route.fulfill({response:upstream,body:bytes}); });
 await d.getByRole("button",{name:"Submit leave",exact:true}).click(); await expect(d.getByRole("alert")).toContainText("could not confirm the outcome"); await expect(reason).toHaveValue("Synthetic feedback retry");
 await d.getByRole("button",{name:"Submit leave",exact:true}).click(); await expect(page.locator(".action-toast strong")).toHaveText("Submission needs attention."); await expect(d.getByRole("alert")).not.toContainText("PRIVATE"); await expect(d.getByRole("alert")).toContainText("could not confirm the outcome"); await expect(reason).toHaveValue("Synthetic feedback retry");
 await expect(d.getByRole("alert")).toBeFocused();
 let closeAttempts=0;page.once("dialog",async dialog=>{closeAttempts++;await dialog.dismiss();});await page.keyboard.press("Escape");expect(closeAttempts).toBe(1);await expect(reason).toHaveValue("Synthetic feedback retry");
 await page.setViewportSize({width:390,height:844}); await capture(page,"ess-unconfirmed-mobile");
 const success=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/api/me/leave-requests")&&r.status()===201); await d.getByRole("button",{name:"Submit leave",exact:true}).click(); await success;
 await expect(d).toHaveCount(0); expect(typeof JSON.parse(submitted!).id).toBe("string"); expect(attempts).toBe(3);
 const requests=await backendGet(page,"/me/leave-requests/"); expect(requests.items.filter((r:{reason:string})=>r.reason==="Synthetic feedback retry")).toHaveLength(1);
});

test("HR rejection validates and focuses its note, retains it on failure and confirms the actual decision", async ({page}) => {
 const id=fixture.manifest.fixtures.leave_request_id; await page.goto(`/hr-admin/leave-requests?overrideLeave=${id}`); const d=page.getByRole("dialog",{name:"Review leave request",exact:true});
 await d.getByRole("button",{name:"Reject",exact:true}).click(); const note=d.getByLabel("Decision note"); await expect(note).toBeFocused(); await expect(note).toHaveAccessibleDescription(/decision note is required/);
 await note.fill("S"); await expect(note).toBeFocused(); await note.fill("Synthetic feedback rejection"); await page.route(`**/api/hr-admin/leave-requests/${id}/reject`,r=>r.abort(),{times:1}); await d.getByRole("button",{name:"Reject",exact:true}).click(); await expect(d.getByRole("alert")).toContainText("could not confirm the outcome"); await expect(note).toHaveValue("Synthetic feedback rejection");
 const response=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().includes(`${id}/reject`)); await d.getByRole("button",{name:"Reject",exact:true}).click(); expect((await response).status()).toBe(200); await expect(d).toHaveCount(0); await expect(page.locator(".action-toast")).toContainText("Leave request rejected.");
});

test("MSS rejection note is named described and keyboard reachable; backend errors retain entered text", async ({page}) => {
 await login(page,"manager"); await page.goto("/mss/approvals?queue=leave"); await page.getByRole("button",{name:"Review",exact:true}).first().click();const d=page.getByRole("dialog");
 await d.getByRole("button",{name:"Reject request",exact:true}).click(); const note=d.getByLabel("Decision note"); await expect(note).toBeFocused(); await expect(note).toHaveAccessibleDescription(/decision note before rejecting/); await note.fill("S"); await expect(note).toBeFocused(); await note.fill("Synthetic manager rejection");
 await page.route("**/api/manager/leave-requests/*/reject",r=>r.fulfill({status:409,json:{detail:"This request was already resolved. Refresh and review its history."}}),{times:1}); await d.getByRole("button",{name:"Reject request",exact:true}).click(); await expect(d.getByRole("alert")).toContainText("already resolved"); await expect(d.getByRole("alert")).toBeFocused(); await expect(note).toHaveValue("Synthetic manager rejection");
 await page.setViewportSize({width:390,height:844}); await capture(page,"mss-decision-mobile"); page.once("dialog",dialog=>dialog.accept()); await page.keyboard.press("Escape"); await expect(d).toHaveCount(0);
});


test("invalid CSV headers are errors rather than success notices and never send mutations", async ({page}) => {
 let writes=0; page.on("request",r=>{if(r.method()==="POST"&&r.url().includes("/api/hr-admin/leave-"))writes++;});
 await page.goto("/hr-admin/leave-balances");
 const balanceImport=page.locator('section[data-testid="leave-balance-import-workbench"]');
 const disclosure=page.locator('details[data-testid="leave-balance-import-workbench"]');
 if(await disclosure.getAttribute("open")===null)await disclosure.locator("summary").click();
 await balanceImport.getByLabel("Leave balance CSV data").fill("wrong,headers\nx,y");
 await balanceImport.getByRole("button",{name:"Preview leave import",exact:true}).click();
 await expect(balanceImport.getByRole("alert")).toHaveClass(/notice--error/); await expect(balanceImport.getByRole("alert")).toContainText(/column|header|required/i);
 await page.goto("/hr-admin/leave-policy-assignments"); await page.getByText("Assignment governance tools",{exact:true}).click();
 const assignments=page.getByTestId("leave-policy-assignment-import-workbench");
 await assignments.getByLabel("Leave policy assignment CSV data").fill("wrong,headers\nx,y"); await assignments.getByRole("button",{name:"Preview assignment import",exact:true}).click();
 await expect(assignments.getByRole("alert")).toHaveClass(/notice--error/); await expect(assignments.getByRole("alert")).toContainText(/column|header|required/i); expect(writes).toBe(0);
});

test("saved assignment import refreshes its catalog even when supplementary audit confirmation is unavailable", async ({page}) => {
 const policy = await backendGet(page, "/hr-admin/leave-policies/"+fixture.manifest.leave.policy_id+"/");
 await page.goto("/hr-admin/leave-policy-assignments"); await page.getByText("Assignment governance tools",{exact:true}).click();
 const summary=page.locator('[aria-label="Leave assignment summary"] > span').first(); const before=Number((await summary.innerText()).match(/\d+/)![0]);
 const imp=page.getByTestId("leave-policy-assignment-import-workbench");
 await page.route("**/api/hr-admin/import-batches",route=>route.request().method()==="POST"&&route.request().postDataJSON().status==="committed"?route.fulfill({status:503,json:{detail:"Synthetic supplementary audit unavailable"}}):route.continue());
 await imp.getByLabel("Leave policy assignment CSV data").fill("employee_code,leave_policy_name,effective_from,effective_to,priority,is_active\n"+fixture.manifest.credentials.hr_checker.employee_code+","+policy.name+",2027-01-01,2027-12-31,990,false");
 await imp.getByRole("button",{name:"Preview assignment import",exact:true}).click();
 const commit=imp.getByRole("button",{name:"Commit ready assignment rows",exact:true}); await expect(commit).toBeEnabled();
 let writes=0; page.on("request",r=>{if(r.method()==="POST"&&r.url().endsWith("/api/hr-admin/leave-policy-assignments/bulk-import"))writes++;});
 await page.route(url=>url.pathname==="/api/hr-admin/leave-policy-assignments"&&url.searchParams.has("page"),route=>route.fulfill({status:503,json:{detail:"Synthetic catalog read unavailable"}}),{times:1});
 const response=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/api/hr-admin/leave-policy-assignments/bulk-import")); await commit.click(); expect((await response).status()).toBe(201);
 await expect(imp.getByRole("status").filter({hasText:"Assignment import status."})).toContainText("1 saved, 0 failed or unconfirmed, 0 blocked");
 await expect(imp.getByRole("alert")).toContainText("audit could not be confirmed");
 await expect(page.getByRole("alert").filter({hasText:"last loaded results are shown"})).toBeVisible();
 await page.getByRole("button",{name:"Retry catalog refresh",exact:true}).click();
 await expect(summary).toContainText(String(before+1)+" assignments"); await expect(commit).toBeDisabled(); expect(writes).toBe(1);
 await expect(page.getByRole("alert").filter({hasText:"last loaded results are shown"})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844}); await capture(page,"assignment-audit-unconfirmed-mobile");
 await page.reload(); await expect(summary).toContainText(String(before+1)+" assignments");
});

test("assignment catalog proxy preserves approved filters pagination tenant isolation and role denial", async ({page},info) => {
 const seed=await page.request.post("/api/hr-admin/leave-policy-assignments",{data:{leave_policy_id:fixture.manifest.leave.policy_id, employee_id:fixture.manifest.credentials.hr_checker.employee_id,priority:991,is_active:false,effective_from:"2027-01-01",effective_to:"2027-12-31"}}); expect(seed.status()).toBe(201);
 const own=await(await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=50")).json(); expect(own.items.length).toBeGreaterThan(1);
 const first=await(await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=1")).json(); const second=await(await page.request.get("/api/hr-admin/leave-policy-assignments?page=2&page_size=1")).json();
 expect(first.items).toHaveLength(1); expect(second.items).toHaveLength(1); expect(first.page).toBe(1); expect(second.page).toBe(2); expect(first.items[0].id).not.toBe(second.items[0].id);
 const empty=await(await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=10&q=no-such-synthetic-assignment&status=inactive&scope=employee&risk=clear")).json(); expect(empty.items).toEqual([]); expect(empty.total_count).toBe(0);
 const foreign=await provisionIsolatedQaWorkspace(info);
 try {
  const u=workspacePersona(foreign,"hr_admin");expect((await page.request.post("/api/auth/login",{data:{identifier:u.username,password:u.password}})).status()).toBe(200);
  const foreignRows=await(await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=50&tenant_id="+fixture.manifest.tenant.id)).json();expect(foreignRows.items.length).toBeGreaterThan(0);
  const ownIds=new Set(own.items.map((r:{id:string})=>r.id));expect(foreignRows.items.every((r:{id:string})=>!ownIds.has(r.id))).toBe(true);
 } finally {await cleanupIsolatedQaWorkspace(foreign);}
 await login(page,"employee");expect((await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=10")).status()).toBe(403);
 await page.request.post("/api/auth/logout");expect((await page.request.get("/api/hr-admin/leave-policy-assignments?page=1&page_size=10")).status()).toBe(401);
});


test("ESS lifecycle failure retains reason and keyboard ownership before a confirmed withdrawal", async ({page}) => {
 await login(page,"employee");const id=fixture.manifest.fixtures.leave_request_id;await page.goto("/ess/leave?requestId="+id);
 const d=page.getByRole("dialog");const panel=d.locator(".leave-lifecycle-panel");const reason=panel.getByLabel("Reason",{exact:true});await reason.fill("Synthetic keyboard withdrawal");
 await page.route(`**/api/me/leave-requests/${id}/withdraw/`,route=>route.fulfill({status:503,json:{detail:"Synthetic withdrawal unconfirmed"}}),{times:1});
 await panel.getByRole("button",{name:"Withdraw request",exact:true}).click();await expect(panel.getByRole("alert")).toBeFocused();await expect(panel.getByRole("alert")).toContainText("could not confirm the outcome");await expect(reason).toHaveValue("Synthetic keyboard withdrawal");
 let prompts=0;page.once("dialog",async dialog=>{prompts++;await dialog.dismiss();});await page.keyboard.press("Escape");expect(prompts).toBe(1);await expect(d).toBeVisible();
 await page.setViewportSize({width:390,height:844});await capture(page,"ess-withdraw-unconfirmed-mobile");
 const response=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().includes(id+"/withdraw")&&![301,302,307,308].includes(r.status()));await panel.getByRole("button",{name:"Withdraw request",exact:true}).click();expect((await response).status()).toBe(200);await expect(d).toHaveCount(0);
 expect((await backendGet(page,"/me/leave-requests/"+id+"/")).status).toBe("withdrawn");await expect(page.locator(".action-toast")).toContainText("Leave request withdrawn.");
});
