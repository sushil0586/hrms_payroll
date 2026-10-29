import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

type TenantRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  subscription_plan: string;
};

let workspace: IsolatedQaWorkspace | undefined;

async function createTenant(page: Page, suffix: string, index: number) {
  const code = `w6-${suffix}-${String(index).padStart(2, "0")}`;
  const response = await page.evaluate(async (payload) => {
    const result = await fetch("/api/platform/tenants", {
      body: JSON.stringify(payload),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return { status: result.status };
  }, {
      code,
      name: `Wave 6 Tenant ${String(index).padStart(2, "0")}`,
      legal_name: `Wave 6 Tenant ${String(index).padStart(2, "0")} Pvt Ltd`,
      primary_domain: `${code}.example.test`,
      primary_email: `owner+${code}@example.test`,
      subscription_plan: index % 2 === 0 ? "enterprise" : "growth",
      seed_pack: "standard_office",
      status: index % 3 === 0 ? "suspended" : index % 2 === 0 ? "active" : "draft",
      timezone: "Asia/Kolkata",
      country_code: "IN",
      is_sandbox: true,
  });
  expect(response.status, `create ${code}`).toBe(201);
}

async function browserGetJson<T>(page: Page, path: string) {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath, { credentials: "same-origin" });
    return { body: await response.json().catch(() => null), status: response.status };
  }, path) as Promise<{ body: T; status: number }>;
}

async function openTenantRegister(page: Page) {
  await gotoAuthenticated(page, "/platform-admin/tenants", workspacePlatformPersona(workspace!));
  await expect(page.getByTestId("platform-admin-tenants-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tenant pipeline" })).toBeVisible();
}

test.describe.serial("CRUD V2 Wave 6 platform tenant register", () => {
  test.beforeAll(async ({}, testInfo) => {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
  });

  test.afterAll(async () => {
    await cleanupIsolatedQaWorkspace(workspace);
  });

  test("certifies list, search, filters, pagination, detail navigation, and reload", async ({ page }) => {
    test.setTimeout(180_000);
    await openTenantRegister(page);

    const suffix = workspace!.seedRef.slice(-8);
    for (let index = 1; index <= 10; index += 1) await createTenant(page, suffix, index);
    const apiResponse = await browserGetJson<TenantRow[]>(page, "/api/platform/tenants");
    expect(apiResponse.status).toBe(200);
    const apiRows = apiResponse.body;
    const ownedRows = apiRows.filter((row) => row.code.startsWith(`w6-${suffix}-`));
    expect(ownedRows).toHaveLength(10);

    await page.reload({ waitUntil: "domcontentloaded" });
    const rows = page.locator(".employee-directory-item");
    await expect(rows).toHaveCount(8);
    await expect(page.getByText(/Page 1/)).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/Page 2/)).toBeVisible();
    const pageTwoCodes = await rows.locator(".section-copy").allTextContents();
    expect(new Set(pageTwoCodes).size).toBe(pageTwoCodes.length);

    const search = page.locator('[name="tenant_search"]');
    await search.fill(`w6-${suffix}-04`);
    await expect(rows).toHaveCount(1);
    await expect(rows.getByText(`w6-${suffix}-04`, { exact: true })).toBeVisible();
    await search.fill("no-such-wave-six-tenant");
    await expect(page.getByText("No tenants match this view.")).toBeVisible();
    await expect(page.getByText("Reset the filters to return to the complete register.")).toBeVisible();
    await page.getByRole("button", { name: /Reset filters/i }).click();
    await expect(search).toHaveValue("");

    await page.locator('[name="tenant_status_filter"]').selectOption("suspended");
    const suspendedCodes = await rows.locator(".section-copy").allTextContents();
    expect(suspendedCodes.length).toBeGreaterThan(0);
    for (const code of suspendedCodes.filter((value) => value.startsWith(`w6-${suffix}-`))) {
      expect(ownedRows.find((row) => row.code === code)?.status).toBe("suspended");
    }
    await page.locator('[name="tenant_status_filter"]').selectOption("all");
    await page.locator('[name="tenant_plan_filter"]').selectOption("enterprise");
    const enterpriseCodes = await rows.locator(".section-copy").allTextContents();
    for (const code of enterpriseCodes.filter((value) => value.startsWith(`w6-${suffix}-`))) {
      expect(ownedRows.find((row) => row.code === code)?.subscription_plan).toBe("enterprise");
    }

    await search.fill(`w6-${suffix}-02`);
    await page.locator('[name="tenant_plan_filter"]').selectOption("all");
    const detailRow = rows.filter({ has: page.getByText(`w6-${suffix}-02`, { exact: true }) });
    await expect(detailRow).toHaveCount(1);
    await detailRow.getByRole("link").click();
    await expect(page).toHaveURL(/\/platform-admin\/onboarding\?tenantId=/);
    await expect(page.getByRole("heading", { name: "Wave 6 Tenant 02" })).toBeVisible();

    await page.goto("/platform-admin/tenants", { waitUntil: "domcontentloaded" });
    await expect(search).toHaveValue("");
    await expect(page.locator('[name="tenant_status_filter"]')).toHaveValue("all");
    await expect(page.locator('[name="tenant_plan_filter"]')).toHaveValue("all");
  });

  test("certifies fail-closed role and anonymous access without tenant mutation", async ({ page }) => {
    const platform = workspacePlatformPersona(workspace!);
    await gotoAuthenticated(page, "/platform-admin/tenants", platform);
    const before = await browserGetJson<TenantRow[]>(page, "/api/platform/tenants");
    const beforeRows = before.body;

    await gotoAuthenticated(page, "/platform-admin/tenants", workspacePersona(workspace!, "tenant_admin"));
    await expect(page).not.toHaveURL(/\/platform-admin\/tenants/);
    const denied = await browserGetJson<unknown>(page, "/api/platform/tenants");
    expect([401, 403, 404]).toContain(denied.status);
    expect(JSON.stringify(denied.body).toLowerCase()).not.toMatch(/password|token|secret|traceback/);

    await page.request.post("/api/auth/logout");
    await page.context().clearCookies();
    const anonymous = await browserGetJson<unknown>(page, "/api/platform/tenants");
    expect([401, 403, 404]).toContain(anonymous.status);

    await gotoAuthenticated(page, "/platform-admin/tenants", platform);
    const afterRows = (await browserGetJson<TenantRow[]>(page, "/api/platform/tenants")).body;
    expect(afterRows.map((row) => row.id).sort()).toEqual(beforeRows.map((row) => row.id).sort());
  });

  test("certifies keyboard and responsive tenant controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTenantRegister(page);
    await expectNoHorizontalOverflow(page);
    const search = page.locator('[name="tenant_search"]');
    await search.focus();
    await expect(search).toBeFocused();
    await page.keyboard.type("Wave 6 Tenant");
    await expect(page.locator(".employee-directory-item").first()).toBeVisible();
    await expect(page.locator('[name="tenant_status_filter"]')).toBeVisible();
    await expect(page.locator('[name="tenant_plan_filter"]')).toBeVisible();
    await expect(page.getByText(/of \d+ records/)).toBeVisible();
  });
});
