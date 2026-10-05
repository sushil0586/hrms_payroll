import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type OrganizationItem = {
  id: string;
  code: string;
  name: string;
};

const liveApiRequired = Boolean(process.env.HRMS_API_BASE_URL);

function uniqueRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function field(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

function directoryItem(page: Page, code: string): Locator {
  return page.locator(".employee-directory-item").filter({ hasText: code }).first();
}

async function createBusinessUnitThroughBrowser(page: Page, runRef: string): Promise<OrganizationItem> {
  const code = `pc-bu-${runRef}`;
  const name = `PC Business Unit ${runRef}`;
  await gotoAuthenticated(page, "/hr-admin/organization/business_units/new");
  await expectPageReady(page, "Create business unit");
  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/hr-admin/organization/business_units") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Create business unit" }).click();
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Business unit create failed: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.id).toBeTruthy();

  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=business_units/, { timeout: 20_000 });
  await gotoAuthenticated(page, `/hr-admin/organization?section=business_units&q=${encodeURIComponent(code)}&status=all`);
  await expect(directoryItem(page, code)).toBeVisible();
  await expect(page.getByRole("heading", { name: `${name} detail` })).toBeVisible();
  return { id: payload.id as string, code, name };
}

async function createDepartmentWithRecoverableFailure(page: Page, runRef: string, businessUnit: OrganizationItem): Promise<OrganizationItem> {
  const code = `pc-dep-${runRef}`;
  const name = `PC Department ${runRef}`;
  let firstAttempt = true;

  await page.route("**/api/hr-admin/organization/departments", async (route) => {
    if (route.request().method() !== "POST" || !firstAttempt) {
      await route.fallback();
      return;
    }
    firstAttempt = false;
    await route.abort("failed");
  });

  await gotoAuthenticated(page, "/hr-admin/organization/departments/new");
  await expectPageReady(page, "Create department");
  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Business unit").selectOption({ label: businessUnit.name });
  await page.getByRole("button", { name: "Create department" }).click();
  await expect(page.getByText("Save failed.")).toBeVisible();
  await expect(page.getByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
  await expect(field(page, "Code")).toHaveValue(code);
  await expect(field(page, "Name")).toHaveValue(name);
  await expect(page.getByRole("button", { name: "Create department" })).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/hr-admin/organization/departments") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Create department" }).click();
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Department create failed after network recovery: ${response.status()} ${JSON.stringify(payload)}`).toBeTruthy();
  expect(payload.id).toBeTruthy();

  await expect(page).toHaveURL(/\/hr-admin\/organization\?section=departments/, { timeout: 20_000 });
  await page.unroute("**/api/hr-admin/organization/departments");
  await gotoAuthenticated(page, `/hr-admin/organization?section=departments&q=${encodeURIComponent(code)}&status=all`);
  await expect(directoryItem(page, code)).toBeVisible();
  await expect(page.getByRole("heading", { name: `${name} detail` })).toBeVisible();
  await expect(page.locator(".detail-row").filter({ hasText: "Business Unit" }).filter({ hasText: businessUnit.name })).toBeVisible();
  return { id: payload.id as string, code, name };
}

test.describe("HR Admin Organization Masters production certification", () => {
  test.skip(!liveApiRequired, "Organization production certification requires a live HRMS API.");
  test.setTimeout(4 * 60 * 1000);

  test("is launch-grade for dependency workflow, recovery, validation, persistence, navigation, and responsive UX", async ({ page }) => {
    const runRef = uniqueRef();
    await page.setViewportSize({ width: 1440, height: 1100 });

    const businessUnit = await createBusinessUnitThroughBrowser(page, runRef);
    const department = await createDepartmentWithRecoverableFailure(page, runRef, businessUnit);

    await gotoAuthenticated(page, "/hr-admin/organization/departments/new");
    await expectPageReady(page, "Create department");
    await field(page, "Code").fill(department.code);
    await field(page, "Name").fill(`${department.name} Duplicate`);
    await field(page, "Business unit").selectOption({ label: businessUnit.name });
    await page.getByRole("button", { name: "Create department" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();
    await expect(page.getByText("This code is already in use.").first()).toBeVisible();
    await expect(field(page, "Code")).toHaveValue(department.code);

    let delayedPostCount = 0;
    await page.route("**/api/hr-admin/organization/grades", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      delayedPostCount += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: `grade-${runRef}`, ...body }),
      });
    });

    await gotoAuthenticated(page, "/hr-admin/organization/grades/new");
    await expectPageReady(page, "Create grade");
    await field(page, "Code").fill(`pc-gr-${runRef}`);
    await field(page, "Name").fill(`PC Grade ${runRef}`);
    await field(page, "Level").fill("3");
    await page.locator("form").first().evaluate((form) => {
      const target = form as HTMLFormElement;
      target.requestSubmit();
      target.requestSubmit();
    });
    await expect(page).toHaveURL(/\/hr-admin\/organization\?section=grades/, { timeout: 20_000 });
    expect(delayedPostCount, "double-clicking create should only send one grade POST").toBe(1);
    await page.unroute("**/api/hr-admin/organization/grades");

    await gotoAuthenticated(page, `/hr-admin/organization/business_units/${businessUnit.id}/edit`);
    await expectPageReady(page, "Edit business unit");
    await field(page, "Active").selectOption("false");
    await expect(page.getByText("Inactive records must be dependency-safe.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Review dependent departments" })).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();
    await expect(page.getByText(/Cannot deactivate this record while it still has .*linked departments/).first()).toBeVisible();
    await field(page, "Active").selectOption("true");
    await field(page, "Name").fill(`${businessUnit.name} Updated`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/organization\?section=business_units/, { timeout: 20_000 });
    await gotoAuthenticated(page, `/hr-admin/organization?section=business_units&q=${encodeURIComponent(businessUnit.code)}&status=all`);
    await expect(page.getByRole("heading", { name: `${businessUnit.name} Updated detail` })).toBeVisible();

    await page.getByRole("link", { name: /Departments/ }).first().click();
    await expect(page).toHaveURL(/section=departments/);
    await page.goBack();
    await expect(page).toHaveURL(/section=business_units/);
    await expect(field(page, "Search")).toHaveValue(businessUnit.code);
    await page.goForward();
    await expect(page).toHaveURL(/section=departments/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await expectPageReady(page, "Organization masters");

    await gotoAuthenticated(page, `/hr-admin/organization?section=departments&q=${encodeURIComponent(department.code)}&status=all`);
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByRole("heading", { name: "Organization masters" })).toBeVisible();
    await expect(directoryItem(page, department.code)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
