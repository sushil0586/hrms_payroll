import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

const password = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const tenantId = process.env.PLAYWRIGHT_DB6_TENANT_ID ?? "";
const tenantCode = process.env.PLAYWRIGHT_DB6_TENANT_CODE ?? "";
const tenantAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME ?? "pw_db612_browser_tenant_admin",
  password,
};
const platformAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME ?? "pw_db612_browser_platform_admin",
  password,
};
const independentChecker: Persona = {
  username: process.env.PLAYWRIGHT_DB6_CHECKER_USERNAME ?? "pw_db612_checker_platform_admin",
  password,
};

function section(page: Page, heading: string): Locator {
  return page.getByRole("heading", { name: heading }).locator("xpath=ancestor::section[1]");
}

function card(page: Page, heading: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

async function submitGovernanceRequest(page: Page, type: "export" | "erasure", reason: string) {
  const requestPanel = section(page, "Governed data request");
  await requestPanel.getByLabel("Request type").selectOption(type);
  await requestPanel.getByLabel("employee documents").check();
  await requestPanel.getByLabel("Business reason").fill(reason);
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/tenant-admin/data-governance/requests") && response.request().method() === "POST",
  );
  await requestPanel.getByRole("button", { name: "Submit request" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const payload = await response.json() as { id: string; status: string; tenant_id: string };
  expect(payload.status).toBe("requested");
  expect(payload.tenant_id).toBe(tenantId);
  await expect(page.getByText("Governance request submitted for independent approval.")).toBeVisible();
  return payload;
}

async function selectOptionContaining(select: Locator, text: string) {
  const value = await select.evaluate((element, needle) => {
    const option = Array.from((element as HTMLSelectElement).options).find((item) => item.textContent?.includes(String(needle)));
    return option?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

test.describe("DB-6.12 browser-first governance and offboarding", () => {
  test("governs retention, hold release, maker-checker requests, disabled erasure, and suspension", async ({ page }) => {
    test.setTimeout(180_000);
    expect(tenantId).toBeTruthy();
    expect(tenantCode).toBeTruthy();
    const exportReason = `DB-6.12 governed export ${Date.now()}`;
    const erasureReason = `DB-6.12 offboarding erasure assessment ${Date.now()}`;
    const holdRef = `QA-HOLD-DB612-${Date.now()}`;
    const policyRef = `DB612-${Date.now()}`;

    await gotoAuthenticated(page, "/tenant-admin/data-governance", tenantAdmin);
    await expectPageReady(page, "Data retention and exports");
    await expect(page.getByText("Irreversible erasure is disabled by deployment policy.")).toBeVisible();
    const exportRequest = await submitGovernanceRequest(page, "export", exportReason);
    const erasureRequest = await submitGovernanceRequest(page, "erasure", erasureReason);
    expect(exportRequest.id).not.toBe(erasureRequest.id);

    await gotoAuthenticated(page, `/platform-admin/data-governance?tenantId=${tenantId}`, platformAdmin);
    await expectPageReady(page, "Retention and controlled erasure");
    const policyPanel = section(page, "Retention policy configuration");
    await policyPanel.getByLabel("Tenant").selectOption(tenantId);
    await policyPanel.getByLabel("Jurisdiction").fill(`IN-QA-${policyRef}`);
    await policyPanel.getByLabel("Record category").selectOption("employee_documents");
    await policyPanel.getByLabel("Retention days").fill("365");
    await policyPanel.getByLabel("Lifecycle date field").fill("updated_at");
    await policyPanel.getByLabel("Effective from").fill("2026-01-01");
    await policyPanel.getByLabel("Legal basis reference").fill(`QA-LEGAL-${policyRef}`);
    await policyPanel.getByLabel("Approval reference").fill(`QA-COUNSEL-${policyRef}`);
    const policyResponse = page.waitForResponse((response) => response.url().endsWith("/api/platform/data-governance") && response.request().method() === "POST");
    await policyPanel.getByRole("button", { name: "Save approved policy" }).click();
    expect((await policyResponse).status()).toBe(201);
    await expect(page.getByText("Retention policy recorded.")).toBeVisible();

    const holdPanel = section(page, "Legal holds");
    await holdPanel.getByLabel("Tenant").selectOption(tenantId);
    await holdPanel.getByLabel("Category").selectOption("employee_documents");
    await holdPanel.getByLabel("Authority reference").fill(holdRef);
    await holdPanel.getByLabel("Reason").fill("DB-6.12 independent legal preservation verification");
    const holdResponse = page.waitForResponse((response) => response.url().includes("/api/platform/data-governance/legal-holds") && response.request().method() === "POST");
    await holdPanel.getByRole("button", { name: "Place legal hold" }).click();
    expect((await holdResponse).status()).toBe(201);
    await expect(page.getByText("Legal hold placed.")).toBeVisible();

    for (const reason of [exportReason, erasureReason]) {
      const row = page.getByRole("row").filter({ hasText: reason });
      await expect(row).toContainText("requested");
      await row.getByRole("button", { name: "Approve" }).click();
      await expect(page.getByText("Request approved.")).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Retention and controlled erasure");
      await expect(page.getByRole("row").filter({ hasText: reason })).toContainText("approved");
    }

    await gotoAuthenticated(page, `/platform-admin/data-governance?tenantId=${tenantId}`, independentChecker);
    await expectPageReady(page, "Retention and controlled erasure");
    const releasePanel = section(page, "Active and released holds");
    await selectOptionContaining(releasePanel.getByLabel("Active legal hold"), holdRef);
    await releasePanel.getByLabel("Release reason").fill("Independent authority confirmed preservation obligation ended");
    const releaseResponse = page.waitForResponse((response) => response.url().includes("/release") && response.request().method() === "POST");
    await releasePanel.getByRole("button", { name: "Release legal hold" }).click();
    expect((await releaseResponse).status()).toBe(200);
    await expect(page.getByText("Legal hold released with retained audit history.")).toBeVisible();

    const erasureRow = page.getByRole("row").filter({ hasText: erasureReason });
    await erasureRow.getByRole("button", { name: "Queue job" }).click();
    await expect(page.getByText("Request queued.")).toBeVisible();
    await expect.poll(async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      return (await page.getByRole("row").filter({ hasText: erasureReason }).textContent()) ?? "";
    }, { timeout: 30_000 }).toContain("blocked");
    await expect(page.getByText("Irreversible erasure is disabled by deployment policy.")).toBeVisible();

    await gotoAuthenticated(page, `/platform-admin/onboarding?tenantId=${tenantId}`, independentChecker);
    await expectPageReady(page, "Launch Readiness");
    const setupCard = card(page, "Edit tenant setup");
    await setupCard.locator('[name="status"]').selectOption("suspended");
    const suspensionResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/platform/tenants/${tenantId}`) && response.request().method() === "PATCH",
    );
    await setupCard.getByRole("button", { name: "Save tenant" }).click();
    expect((await suspensionResponse).status()).toBe(200);
    await expect(page.getByText("Tenant updated.", { exact: true })).toBeVisible();
  });
});
