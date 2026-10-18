import { expect, test, type Page } from "@playwright/test";

import { platformAdmin, type Persona } from "../helpers/staging-auth";

const seedRef = process.env.DB613_BROWSER_SEED_REF ?? "db613-browser";
const tenantCode = `pw-qa-${seedRef}`;
const persona: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? platformAdmin.username,
  password: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD ?? platformAdmin.password,
};

async function login(page: Page, loginPersona = persona) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email").fill(loginPersona.username);
  await page.getByLabel("Password").fill(loginPersona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test("DB6-13-001 provisions the connected synthetic tenant through Platform Admin", async ({ page }) => {
  await login(page);
  await page.goto("/platform-admin/tenants", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Tenant pipeline" })).toBeVisible();

  const createCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Create tenant" }) }).first();
  await createCard.getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Code", { exact: true }).fill(tenantCode);
  await dialog.getByLabel("Name", { exact: true }).fill("DB-6.13 Connected Lifecycle");
  await dialog.getByLabel("Legal name", { exact: true }).fill("DB-6.13 Connected Lifecycle Pvt Ltd");
  await dialog.getByLabel("Primary domain", { exact: true }).fill(`${tenantCode}.example.test`);
  await dialog.getByLabel("Primary email", { exact: true }).fill(`owner+${seedRef}@playwright.qa.invalid`);
  await dialog.getByLabel("Primary phone", { exact: true }).fill("+91 90000 00613");
  await dialog.getByLabel("Plan", { exact: true }).selectOption("enterprise");
  await dialog.getByLabel("Seed pack", { exact: true }).selectOption("standard_office");
  await dialog.getByLabel("Timezone", { exact: true }).fill("Asia/Kolkata");
  await dialog.getByLabel("Country", { exact: true }).fill("IN");
  await dialog.getByLabel("Sandbox", { exact: true }).setChecked(true);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/platform/tenants") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  const response = await responsePromise;
  const payload = await response.json() as { id?: string; code?: string };
  expect(response.status()).toBe(201);
  expect(payload.id).toBeTruthy();
  expect(payload.code).toBe(tenantCode);
  await expect(page).toHaveURL(new RegExp(`/platform-admin/onboarding\\?tenantId=${payload.id}`));
  await expect(page.getByText(tenantCode).first()).toBeVisible();
  console.log(JSON.stringify({ tenant_id: payload.id, tenant_code: payload.code }));
});

test("DB6-13-001 configures the connected fiscal year and accounting period through Tenant Admin", async ({ page }) => {
  test.setTimeout(120_000);
  const tenantAdmin: Persona = {
    username: process.env.PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME ?? "",
    password: process.env.PLAYWRIGHT_LIVE_PASSWORD ?? "Password@123",
  };
  expect(tenantAdmin.username).toBeTruthy();
  await login(page, tenantAdmin);
  await page.goto("/tenant-admin/financial-calendars", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Financial years and periods" })).toBeVisible();
  const saveCalendar = page.getByRole("button", { name: "Save fiscal calendar" });
  await expect.poll(() => saveCalendar.evaluate((element) => Object.keys(element).some((key) => key.startsWith("__reactProps")))).toBeTruthy();

  const calendarRow = page.getByRole("table", { name: "Fiscal calendars" }).getByRole("row", { name: /DB6\.13 April March Calendar/ });
  if (!(await calendarRow.isVisible().catch(() => false))) {
    await page.getByLabel("Calendar code").fill("db613-apr-mar");
    await page.getByLabel("Calendar name").fill("DB6.13 April March Calendar");
    await page.getByLabel("Start month").fill("4");
    await page.getByLabel("Start day").fill("1");
    await page.getByLabel("Effective from").fill("2026-04-01");
    await saveCalendar.click();
    await expect(page.locator(".notice").filter({ hasText: "Fiscal calendar saved after backend confirmation." })).toBeVisible();
  }

  await page.getByRole("region", { name: "Create financial year" }).locator("select").selectOption({ label: "DB6.13 April March Calendar" });
  await page.getByLabel("Financial year code").fill("DB613-FY2026-27");
  await page.getByLabel("Financial year start").fill("2026-04-01");
  await page.getByLabel("Financial year end").fill("2027-03-31");
  await page.getByRole("button", { name: "Save financial year" }).click();
  await expect(page.locator(".notice").filter({ hasText: "Financial year saved after backend confirmation." })).toBeVisible();

  await page.getByRole("region", { name: "Create accounting period" }).locator("select").first().selectOption({ label: "DB613-FY2026-27" });
  await page.getByLabel("Accounting period code").fill("DB613-2026-12");
  await page.getByLabel("Accounting period name").fill("DB6.13 December 2026");
  await page.getByLabel("Sequence").fill("9");
  await page.getByLabel("Accounting period start").fill("2026-12-01");
  await page.getByLabel("Accounting period end").fill("2026-12-31");
  await page.getByRole("button", { name: "Save accounting period" }).click();
  await expect(page.locator(".notice").filter({ hasText: "Accounting period saved after backend confirmation." })).toBeVisible();
  const row = page.getByRole("table", { name: "Accounting periods" }).getByRole("row", { name: /DB6\.13 December 2026/ });
  await expect(row).toContainText("open");
});

test("DB6-13-001 activates the connected tenant through Platform Admin", async ({ page }) => {
  const tenantId = process.env.DB613_BROWSER_TENANT_ID;
  test.skip(!tenantId, "DB613_BROWSER_TENANT_ID is required for the activation stage.");
  await login(page);
  await page.goto(`/platform-admin/onboarding?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Launch Readiness" })).toBeVisible();
  const setup = page.locator("article").filter({ has: page.getByRole("heading", { name: "Edit tenant setup" }) }).first();
  await setup.locator('[name="status"]').selectOption("active");
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/platform/tenants/${tenantId}`) && response.request().method() === "PATCH",
  );
  await setup.getByRole("button", { name: "Save tenant" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page.getByText("Tenant updated.", { exact: true })).toBeVisible();
  const payload = await response.json() as { id?: string; status?: string; subscription_plan?: string };
  expect(payload.id).toBe(tenantId);
  expect(payload.status).toBe("active");
  expect(payload.subscription_plan).toBe("enterprise");
});
