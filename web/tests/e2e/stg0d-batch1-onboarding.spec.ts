import { expect, test, type Locator, type Page } from "@playwright/test";

import { platformAdmin, requestWithBrowserSession, type Persona } from "../helpers/staging-auth";
import {
  beginRun,
  beginScenario,
  finishScenario,
  registerRunResource,
  stagingEnvironmentFingerprint,
  stagingEvidenceApiEnabled,
  stagingManifestSha256,
  validateStagingRunConfiguration,
} from "../helpers/staging-run-manifest";

const runRef = process.env.STG_RUN_ID ?? process.env.STG0D_RUN_REF ?? `${Date.now()}`;
const tenantCode = (process.env.STG_TENANT_NAMESPACE ?? `pw-qa-stg0d-${runRef}`).toLowerCase();
const tenantName = `STG-0D Tenant ${runRef}`;
const primaryEmail = `owner+${runRef}@playwright.qa.invalid`;
const adminEmail = process.env.STG_SYNTHETIC_ADMIN_EMAIL ?? `tenant-admin+${runRef}@playwright.qa.invalid`;
const adminUsername = `stg0d.admin.${runRef}`.toLowerCase();
const adminPassword = process.env.STG0D_TENANT_ADMIN_PASSWORD ?? "Password@123";

let tenantId = "";
let contactId = "";
let adminUserId = "";
let adminMembershipId = "";

function card(page: Page, heading: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

async function gotoReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
}

async function login(page: Page, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.ok()).toBeTruthy();
}

async function openTenantDialog(page: Page) {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function fillTenantDialog(dialog: Locator, code = tenantCode, email = primaryEmail) {
  await dialog.getByLabel("Code", { exact: true }).fill(code);
  await dialog.getByLabel("Name", { exact: true }).fill(tenantName);
  await dialog.getByLabel("Legal name", { exact: true }).fill(`${tenantName} Pvt Ltd`);
  await dialog.getByLabel("Primary domain", { exact: true }).fill(`${code}.playwright.qa.invalid`);
  await dialog.getByLabel("Primary email", { exact: true }).fill(email);
  await dialog.getByLabel("Primary phone", { exact: true }).fill("+91 90000 01010");
  await dialog.getByLabel("Plan", { exact: true }).selectOption("enterprise");
  await dialog.getByLabel("Seed pack", { exact: true }).selectOption("standard_office");
  await dialog.getByLabel("Timezone", { exact: true }).fill("Asia/Kolkata");
  await dialog.getByLabel("Country", { exact: true }).fill("IN");
  await dialog.getByLabel("Sandbox", { exact: true }).setChecked(true);
}

async function verifyPersistedEvidence(
  page: Page,
  scenarioId: string,
  identifiers: Record<string, string | string[]> = {},
) {
  if (!stagingEvidenceApiEnabled()) return;
  await login(page, platformAdmin);
  const query = new URLSearchParams({
    run_id: runRef,
    scenario_id: scenarioId,
    tenant_id: tenantId,
    tenant_code: tenantCode,
  });
  for (const [name, value] of Object.entries(identifiers)) {
    for (const item of Array.isArray(value) ? value : [value]) query.append(name, item);
  }
  const evidence = await requestWithBrowserSession(
    page,
    `/api/platform/qa/staging-onboarding-evidence?${query.toString()}`,
    {
      headers: {
        "X-HRMS-Environment-Fingerprint": stagingEnvironmentFingerprint(),
        "X-HRMS-Manifest-SHA256": stagingManifestSha256(),
      },
    },
  );
  expect(evidence.status, evidence.body).toBe(200);
  const payload = JSON.parse(evidence.body) as {
    passed?: boolean;
    run_id?: string;
    scenario_id?: string;
    assertions?: Record<string, boolean>;
  };
  expect(payload).toMatchObject({ passed: true, run_id: runRef, scenario_id: scenarioId });
  expect(Object.values(payload.assertions ?? {}).every(Boolean)).toBe(true);
}

test.describe.serial("STG-0D Batch-1 platform tenant onboarding automation", () => {
  test.setTimeout(90_000);

  test.beforeAll(() => {
    validateStagingRunConfiguration();
    beginRun([process.env.STG_EVIDENCE_DIRECTORY ?? "playwright-output"]);
  });

  test.beforeEach(async ({}, testInfo) => {
    const scenarioId = testInfo.title.match(/STG-E2E-\d{4}/)?.[0];
    if (!scenarioId) throw new Error("Batch-1 test title is missing its frozen scenario ID.");
    beginScenario(scenarioId, testInfo.file, testInfo.title);
  });

  test.afterEach(async ({}, testInfo) => {
    const scenarioId = testInfo.title.match(/STG-E2E-\d{4}/)?.[0];
    if (!scenarioId) return;
    finishScenario(
      scenarioId,
      testInfo.file,
      testInfo.title,
      testInfo.status === "passed" ? "passed" : testInfo.status === "interrupted" ? "interrupted" : "failed",
      [testInfo.outputDir],
    );
  });

  test("STG-E2E-0101 creates one owned Enterprise tenant through Platform Admin UI", async ({ page }) => {
    await login(page, platformAdmin);
    await gotoReady(page, "/platform-admin/tenants");
    const dialog = await openTenantDialog(page);
    await fillTenantDialog(dialog);
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/platform/tenants") && response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    const response = await responsePromise;
    const payload = await response.json() as { id?: string; code?: string; subscription_plan?: string };
    expect(response.status()).toBe(201);
    expect(payload.code).toBe(tenantCode);
    expect(payload.subscription_plan).toBe("enterprise");
    tenantId = payload.id ?? "";
    expect(tenantId).toBeTruthy();
    registerRunResource("STG-E2E-0101", {
      resource_type: "tenant",
      resource_id: tenantId,
      tenant_id: tenantId,
      ownership: "created",
      attributes: { code: tenantCode, primary_email: primaryEmail, sandbox: true },
    });
    await expect(page).toHaveURL(new RegExp(`tenantId=${tenantId}`));
    await verifyPersistedEvidence(page, "STG-E2E-0101");
  });

  test("STG-E2E-0102 rejects duplicate tenant code without a second tenant", async ({ page }) => {
    await login(page, platformAdmin);
    await gotoReady(page, "/platform-admin/tenants");
    const dialog = await openTenantDialog(page);
    await fillTenantDialog(dialog, tenantCode, `other+${runRef}@playwright.qa.invalid`);
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/platform/tenants") && response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    await expect(page.getByText(/already exists/i).first()).toBeVisible();
    const list = await requestWithBrowserSession(page, "/api/platform/tenants");
    expect(list.status).toBe(200);
    const matches = (JSON.parse(list.body) as Array<{ code: string }>).filter((item) => item.code === tenantCode);
    expect(matches).toHaveLength(1);
    await verifyPersistedEvidence(page, "STG-E2E-0102");
  });

  test("STG-E2E-0103 rejects duplicate administrator email without partial identity", async ({ page }) => {
    expect(tenantId).toBeTruthy();
    await login(page, platformAdmin);
    await gotoReady(page, `/platform-admin/admins?tenantId=${tenantId}`);
    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    const firstDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await namedControl(firstDialog, "full_name").fill("STG0D Tenant Admin");
    await namedControl(firstDialog, "email").fill(adminEmail);
    await namedControl(firstDialog, "job_title").fill("Tenant Admin");
    await namedControl(firstDialog, "is_primary").setChecked(true);
    const contactResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/platform/tenants/${tenantId}/admin-contacts`) && response.request().method() === "POST",
    );
    await firstDialog.getByRole("button", { name: "Add contact" }).click();
    contactId = ((await (await contactResponsePromise).json()) as { id: string }).id;
    registerRunResource("STG-E2E-0103", {
      resource_type: "admin_contact",
      resource_id: contactId,
      tenant_id: tenantId,
      ownership: "created",
    });

    const provisionCard = card(page, "Create tenant admin login");
    await namedControl(provisionCard, "contact_id").selectOption(contactId);
    await namedControl(provisionCard, "username").fill(adminUsername);
    await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
    await namedControl(provisionCard, "role_name").fill("Tenant Admin");
    await namedControl(provisionCard, "password").fill(adminPassword);
    await namedControl(provisionCard, "membership_status").selectOption("active");
    await namedControl(provisionCard, "must_change_password").setChecked(false);
    const provisionResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/platform/admin-contacts/${contactId}/provision-user`) && response.request().method() === "POST",
    );
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    const provisionResponse = await provisionResponsePromise;
    const provisionPayload = await provisionResponse.json() as { user_id: string; membership_id: string };
    expect(provisionResponse.status(), JSON.stringify(provisionPayload)).toBe(200);
    adminUserId = provisionPayload.user_id;
    adminMembershipId = provisionPayload.membership_id;
    registerRunResource("STG-E2E-0103", {
      resource_type: "user",
      resource_id: adminUserId,
      tenant_id: tenantId,
      ownership: "created",
      attributes: { synthetic_recipient_ref: adminEmail },
    });
    registerRunResource("STG-E2E-0103", {
      resource_type: "membership",
      resource_id: adminMembershipId,
      tenant_id: tenantId,
      ownership: "created",
    });
    await expect(page.getByText("First admin provisioned.")).toBeVisible();

    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    const duplicateDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await namedControl(duplicateDialog, "full_name").fill("Duplicate Admin");
    await namedControl(duplicateDialog, "email").fill(adminEmail.toUpperCase());
    await namedControl(duplicateDialog, "job_title").fill("Tenant Admin");
    await duplicateDialog.getByRole("button", { name: "Add contact" }).click();
    await expect(page.getByText("Admin contact added.")).toBeVisible();
    const duplicateOption = namedControl(provisionCard, "contact_id").locator("option").filter({ hasText: /Duplicate Admin/ });
    const duplicateContactId = await duplicateOption.getAttribute("value");
    expect(duplicateContactId).toBeTruthy();
    registerRunResource("STG-E2E-0103", {
      resource_type: "admin_contact",
      resource_id: duplicateContactId ?? "",
      tenant_id: tenantId,
      ownership: "created",
    });
    await namedControl(provisionCard, "contact_id").selectOption(duplicateContactId ?? "");
    await namedControl(provisionCard, "username").fill(`${adminUsername}.duplicate`);
    const duplicateResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/platform/admin-contacts/") && response.url().endsWith("/provision-user") && response.request().method() === "POST",
    );
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    expect((await duplicateResponsePromise).status()).toBe(400);
    await expect(page.getByText(/already exists/i).first()).toBeVisible();
    await verifyPersistedEvidence(page, "STG-E2E-0103", {
      admin_user_id: adminUserId,
      admin_membership_id: adminMembershipId,
      admin_contact_id: [contactId, duplicateContactId ?? ""],
    });
  });

  test("STG-E2E-0104 activates the Enterprise subscription and exposes persisted state", async ({ page }) => {
    expect(tenantId).toBeTruthy();
    await login(page, platformAdmin);
    await gotoReady(page, `/platform-admin/onboarding?tenantId=${tenantId}`);
    const setup = card(page, "Edit tenant setup");
    await namedControl(setup, "status").selectOption("active");
    await namedControl(setup, "subscription_plan").selectOption("enterprise");
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/platform/tenants/${tenantId}`) && response.request().method() === "PATCH",
    );
    await setup.getByRole("button", { name: "Save tenant" }).click();
    const response = await responsePromise;
    const payload = await response.json() as { status?: string; subscription_plan?: string };
    expect(response.ok()).toBeTruthy();
    expect(payload).toMatchObject({ status: "active", subscription_plan: "enterprise" });
    await verifyPersistedEvidence(page, "STG-E2E-0104");
  });

  test("STG-E2E-0105 provisioned Tenant Admin logs in and reaches tenant control center", async ({ page }) => {
    await login(page, { username: adminUsername, password: adminPassword });
    await gotoReady(page, "/tenant-admin");
    await expect(page).toHaveURL(/\/tenant-admin(?:$|[/?#])/);
    await expect(page.getByRole("heading", { level: 1, name: /Tenant Control Center|Control center/i })).toBeVisible();
    const consoleResponse = await requestWithBrowserSession(page, "/api/tenant-admin/console");
    expect(consoleResponse.status).toBe(200);
    expect(consoleResponse.body).toContain(tenantId);
    await verifyPersistedEvidence(page, "STG-E2E-0105", {
      admin_user_id: adminUserId,
      admin_membership_id: adminMembershipId,
    });
  });

  test("STG-E2E-0106 non-platform Tenant Admin cannot list or create platform tenants", async ({ page }) => {
    await login(page, { username: adminUsername, password: adminPassword });
    await gotoReady(page, "/tenant-admin");
    const list = await requestWithBrowserSession(page, "/api/platform/tenants");
    const create = await requestWithBrowserSession(page, "/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: `${tenantCode}-denied`, name: "Denied tenant" }),
    });
    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
    registerRunResource("STG-E2E-0106", {
      resource_type: "denied_tenant",
      resource_id: tenantId,
      tenant_id: tenantId,
      ownership: "observed",
      attributes: { code: `${tenantCode}-denied` },
    });
    await gotoReady(page, "/platform-admin/tenants");
    await expect(page.getByRole("heading", { name: "Tenant pipeline" })).toHaveCount(0);
    await verifyPersistedEvidence(page, "STG-E2E-0106", {
      admin_user_id: adminUserId,
      admin_membership_id: adminMembershipId,
      denied_tenant_code: `${tenantCode}-denied`,
    });
  });
});
