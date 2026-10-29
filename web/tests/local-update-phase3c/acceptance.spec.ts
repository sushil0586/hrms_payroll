import { expect, test } from "@playwright/test";
import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name:"hrms_access_token", value:"phase3c-test", url:"http://127.0.0.1:3167", httpOnly:true, sameSite:"Lax" }]);
});

test("document categories inspect, create, edit, and history stay local", async ({ page }) => {
  const response=await page.goto("/hr-admin/document-categories",{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);
  await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();const shell=await markLocalUpdateShell(page),navigations=await documentNavigationCount(page);
  await page.getByRole("button",{name:"Inspect"}).first().click();await expect(page).toHaveURL(/selectedCategory=cat-1/);await expect(page.getByText("Permanent account number").first()).toBeVisible();
  await page.goBack();await expect(page).toHaveURL("/hr-admin/document-categories");await page.goForward();await expect(page).toHaveURL(/selectedCategory=cat-1/);
  await page.getByRole("button",{name:"Create category"}).click();const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();await dialog.getByLabel("Code").fill("ADDRESS");await dialog.getByLabel("Name").fill("Address proof");await dialog.getByRole("button",{name:"Create category"}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole("table",{name:"Document categories"})).toContainText("Address proof");
  await page.getByRole("button",{name:"Edit"}).last().click();await expect(page.getByRole("dialog")).toBeVisible();await page.getByRole("dialog").getByLabel("Description").fill("Locally updated proof");await page.getByRole("dialog").getByRole("button",{name:"Save changes"}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,navigations);
});

test("document requirements inspect and confirmed create stay local", async ({ page }) => {
  const response=await page.goto("/hr-admin/document-requirements",{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);
  await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();const shell=await markLocalUpdateShell(page),navigations=await documentNavigationCount(page);
  await page.getByRole("button",{name:"Inspect"}).first().click();await expect(page).toHaveURL(/selectedRequirement=req-1/);await page.getByRole("button",{name:"Create requirement"}).click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Category (required)").selectOption("cat-1");await dialog.getByLabel("Required within joining days").fill("14");await dialog.getByRole("button",{name:"Create requirement"}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole("table",{name:"Document requirements"})).toContainText("14 day(s)");
  await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,navigations);
});

test("employee document filters, review, reminders, and upload update only the workspace", async ({ page }) => {
  const response=await page.goto("/hr-admin/employee-documents",{waitUntil:"domcontentloaded"});expect(response?.status()).toBe(200);
  await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();const shell=await markLocalUpdateShell(page),navigations=await documentNavigationCount(page);
  await page.getByRole("textbox",{name:"Search",exact:true}).fill("PAN");await page.getByRole("button",{name:"Apply filters"}).first().click();await expect(page).toHaveURL(/q=PAN/);await expect(page.getByText("PAN evidence").first()).toBeVisible();await page.goBack();await expect(page).toHaveURL("/hr-admin/employee-documents");await page.goForward();await expect(page).toHaveURL(/q=PAN/);
  await page.getByRole("button",{name:"Inspect"}).first().click();await page.getByRole("button",{name:"Review",exact:true}).click();const review=page.getByRole("dialog",{name:"Review PAN evidence"});await expect(review).toBeVisible();await review.getByLabel("Verification status").selectOption("verified");await review.getByRole("button",{name:"Save review"}).click();await expect(review).toHaveCount(0);await expect(page.getByText("Document review updated.")).toBeVisible();
  await page.getByRole("button",{name:"Clear filters"}).click();await expect(page).toHaveURL("/hr-admin/employee-documents");await page.getByLabel("Select PAN evidence for reminder follow-up").check();await page.getByRole("button",{name:"Send reminder (1)",exact:true}).click();await expect(page.getByText(/1 reminder sent/)).toBeVisible();
  await page.getByRole("button",{name:"Upload document"}).click();const upload=page.getByRole("dialog",{name:"Upload employee document"});await expect(upload).toBeVisible();await upload.getByLabel("Employee",{exact:true}).selectOption("emp-1");await upload.getByLabel("Category",{exact:true}).selectOption("cat-1");await upload.getByLabel("Title",{exact:true}).fill("Uploaded local evidence");await upload.getByLabel("File",{exact:true}).setInputFiles({name:"local-evidence.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4 local")});await upload.getByRole("button",{name:"Upload document"}).click();await expect(upload.getByRole("heading",{name:"Document stored"})).toBeVisible();await upload.getByRole("button",{name:"View document queue"}).click();await expect(upload).toHaveCount(0);await expect(page.getByRole("table").first()).toContainText("Uploaded local evidence");
  await expectLocalUpdateShell(shell);await expectNoDocumentNavigation(page,navigations);
});
