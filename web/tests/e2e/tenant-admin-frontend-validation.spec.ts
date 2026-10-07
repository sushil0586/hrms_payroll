import { expect, test, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";

async function gotoTenantAdminDemo(page: Page, path: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: origin,
    },
  ]);
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("Tenant admin frontend validation", () => {
  test("tenant member invite blocks invalid email, missing username, and missing role before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/tenant-admin/memberships", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoTenantAdminDemo(page, "/tenant-admin/users");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Tenant User Management");

    await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Email").fill("not-an-email");
    await dialog.getByLabel("Username").fill("");
    const checkedRoles = await dialog.getByLabel("Invite roles").locator("input:checked").all();
    for (const role of checkedRoles) {
      await role.uncheck();
    }

    await expect(dialog.getByRole("alert")).toContainText("Enter a valid work email address.");
    await dialog.getByLabel("Email").fill("tenant.member@example.com");
    await expect(dialog.getByRole("alert")).toContainText("Username is required.");
    await dialog.getByLabel("Username").fill("tenant.member");
    await expect(dialog.getByRole("alert")).toContainText("Select at least one role.");
    await expect(dialog.getByRole("button", { name: "Invite member", exact: true })).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("tenant role dialog blocks missing role name before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/tenant-admin/roles", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoTenantAdminDemo(page, "/tenant-admin/roles");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Roles & Permissions");

    await page.getByRole("main").getByRole("button", { name: "Add role" }).click();
    const dialog = page.getByRole("dialog", { name: "Create tenant role" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Role name").fill("");

    await expect(dialog.getByRole("alert")).toContainText("Role name is required.");
    await expect(dialog.getByRole("button", { name: "Create role" })).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("support access request blocks missing fields and invalid duration before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/tenant-admin/support-access-grants", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoTenantAdminDemo(page, "/tenant-admin/support-access");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Support Access");

    const form = page.getByTestId("tenant-support-access-form");
    await expect(form).toBeVisible();
    await form.getByLabel("Duration").fill("0");
    const checkedScopes = await form.getByLabel("Support scopes").locator("input:checked").all();
    for (const scope of checkedScopes) {
      await scope.uncheck();
    }

    await expect(form.getByText("Support agent is required.")).toBeVisible();
    await expect(form.getByText("Reason is required.")).toBeVisible();
    await expect(form.getByText(/Duration must be between 1 and \d+ minutes\./)).toBeVisible();
    await expect(form.getByText("Select at least one support scope.")).toBeVisible();
    await expect(form.getByRole("button", { name: "Request access" })).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("change request blocks missing title and invalid JSON before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/tenant-admin/change-requests", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoTenantAdminDemo(page, "/tenant-admin/plan");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Plan & Billing");

    const createRequest = page.getByRole("region", { name: "Capture the proposed change" });
    await expect(createRequest).toBeVisible();
    await createRequest.getByLabel("Title").fill("");
    await createRequest.getByLabel("Payload").fill("{ invalid");
    await createRequest.getByLabel("Payload").blur();

    await expect(createRequest.getByText("Title is required.")).toBeVisible();
    await expect(createRequest.getByText("Payload must be valid JSON.")).toBeVisible();
    await expect(createRequest.getByRole("button", { name: "Submit request" })).toBeDisabled();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
