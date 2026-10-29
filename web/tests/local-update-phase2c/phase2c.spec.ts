import { expect, test, type Page } from "@playwright/test";
import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";
const routes=[
  ["/hr-admin/leave-types","Leave types"],["/hr-admin/leave-policies","Leave policies"],["/hr-admin/leave-policy-assignments","Leave assignments"],["/hr-admin/leave-requests","Leave Requests"],["/hr-admin/leave-balances","Leave balances"],["/hr-admin/leave-year","Leave-year control"],
] as const;
for(const [route,heading] of routes)test(`${heading} keeps its primary interaction local`,async({page})=>{const response=await page.goto(route,{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);await expect(page.getByRole("heading",{level:1,name:heading})).toBeVisible();await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();const shell=await markLocalUpdateShell(page), navigations=await documentNavigationCount(page);
  if(route.endsWith("leave-types")||route.endsWith("leave-policies")){const search=page.getByLabel("Search").first();await search.fill("annual");await expect(search).toHaveValue("annual");const inspect=page.getByRole("button",{name:"Inspect"}).first();if(await inspect.count())await inspect.click();}
  if(route.endsWith("leave-policy-assignments")){const form=page.getByRole("form",{name:"Leave assignment filters"});await form.getByLabel("Search").fill("demo");await form.getByRole("button",{name:"Apply filters"}).click();await expect(page).toHaveURL(/q=demo/);}
  if(route.endsWith("leave-requests")){const form=page.getByRole("form",{name:"Leave request filters"});await form.getByLabel("Search").fill("demo");await form.getByRole("button",{name:"Apply filters"}).click();await expect(page).toHaveURL(/q=demo/);}
  if(route.endsWith("leave-balances")){const form=page.getByRole("form",{name:"Leave balance filters"});await form.getByLabel("Search").fill("demo");await form.getByRole("button",{name:"Apply filters"}).click();await expect(page).toHaveURL(/q=demo/);}
  await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,navigations);
});
