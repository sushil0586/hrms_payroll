import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  status: string;
  onboarding_status: string;
  subscription_plan: string;
  seed_pack: string;
  primary_email: string;
  primary_phone: string;
  primary_domain: string;
  timezone: string;
  country_code: string;
  is_sandbox: boolean;
};

type OnboardingPayload = {
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  owner_mode: string;
  setup_style: string;
  data_setup_style: string;
  policy_control_style: string;
  notes: string;
  internal_handoff_notes: string;
  customer_handoff_notes: string;
  admin_contacts: Array<{
    id: string;
    full_name: string;
    email: string;
    job_title: string;
    is_primary: boolean;
    provisioning_status: string;
  }>;
  recent_events: Array<{ id: string; event_type: string; summary: string; actor_identifier: string; created_at: string }>;
};

type TenantFixture = {
  code: string;
  name: string;
  legalName: string;
  domain: string;
  email: string;
  phone: string;
  plan: "growth" | "enterprise";
  seedPack: "shift_based" | "professional_services";
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  notes: string;
  setupStyle: "shared" | "customer_led";
  dataSetupStyle: "import_led" | "seeded_demo";
  policyControlStyle: "mostly_locked" | "mostly_delegated";
  industry: string;
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function feedback(page: Page): Locator {
  return page.locator(".platform-feedback, .notice").first();
}

async function safeWait(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function gotoPlatform(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await safeWait(page);
  await expectPageReady(page, heading);
}

async function tenantByCode(page: Page, tenantCode: string): Promise<TenantListItem> {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant as TenantListItem;
}

async function onboardingPayload(page: Page, tenantId: string): Promise<OnboardingPayload> {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createTenantFromBrowser(page: Page, fixture: TenantFixture): Promise<TenantListItem> {
  await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
  const createCard = card(page, "Create tenant");
  await createCard.getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  await expect(namedControl(dialog, "code")).toBeFocused();

  await namedControl(dialog, "code").fill(fixture.code);
  await namedControl(dialog, "name").fill(fixture.name);
  await namedControl(dialog, "legal_name").fill(fixture.legalName);
  await namedControl(dialog, "primary_domain").fill(fixture.domain);
  await namedControl(dialog, "primary_email").fill(fixture.email);
  await namedControl(dialog, "primary_phone").fill(fixture.phone);
  await namedControl(dialog, "subscription_plan").selectOption(fixture.plan);
  await namedControl(dialog, "seed_pack").selectOption(fixture.seedPack);
  await namedControl(dialog, "timezone").fill("Asia/Kolkata");
  await namedControl(dialog, "country_code").fill("IN");
  await namedControl(dialog, "is_sandbox").setChecked(true);
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  await expect(feedback(page).getByText("Tenant created.", { exact: true })).toBeVisible();

  const tenant = await tenantByCode(page, fixture.code);
  expect(tenant.name).toBe(fixture.name);
  expect(tenant.legal_name).toBe(fixture.legalName);
  expect(tenant.primary_domain).toBe(fixture.domain);
  expect(tenant.primary_email).toBe(fixture.email);
  expect(tenant.subscription_plan).toBe(fixture.plan);
  expect(tenant.seed_pack).toBe(fixture.seedPack);
  expect(tenant.is_sandbox).toBe(true);
  return tenant;
}

async function configureTenantFromBrowser(page: Page, tenant: TenantListItem, fixture: TenantFixture) {
  await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenant.id}`, "Launch Readiness");
  await expect(card(page, fixture.name)).toBeVisible();
  await expect(card(page, fixture.name).getByText(fixture.code)).toBeVisible();

  const onboardingCard = card(page, "Onboarding metadata");
  await namedControl(onboardingCard, "owner_mode").selectOption("split_platform_roles");
  await namedControl(onboardingCard, "setup_style").selectOption(fixture.setupStyle);
  await namedControl(onboardingCard, "data_setup_style").selectOption(fixture.dataSetupStyle);
  await namedControl(onboardingCard, "policy_control_style").selectOption(fixture.policyControlStyle);
  await namedControl(onboardingCard, "country_context").fill("IN");
  await namedControl(onboardingCard, "industry_context").fill(fixture.industry);
  await namedControl(onboardingCard, "notes").fill(fixture.notes);
  await namedControl(onboardingCard, "internal_handoff_notes").fill(`Internal readiness for ${fixture.code}`);
  await namedControl(onboardingCard, "customer_handoff_notes").fill(`Customer handoff for ${fixture.code}`);
  await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
  await expect(feedback(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();

  await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenant.id}`, "Admin Access");
  const contactsCard = card(page, "Admin contacts");
  await contactsCard.getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
  await expect(dialog).toBeVisible();
  await namedControl(dialog, "full_name").fill(fixture.contactName);
  await namedControl(dialog, "email").fill(fixture.contactEmail);
  await namedControl(dialog, "phone_number").fill(fixture.phone);
  await namedControl(dialog, "job_title").fill(fixture.contactTitle);
  await namedControl(dialog, "is_primary").setChecked(true);
  await namedControl(dialog, "notes").fill(`Primary admin for ${fixture.code}`);
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(feedback(page).getByText("Admin contact added.", { exact: true })).toBeVisible();

  const payload = await onboardingPayload(page, tenant.id);
  expect(payload.tenant_id).toBe(tenant.id);
  expect(payload.notes).toBe(fixture.notes);
  expect(payload.setup_style).toBe(fixture.setupStyle);
  expect(payload.data_setup_style).toBe(fixture.dataSetupStyle);
  expect(payload.policy_control_style).toBe(fixture.policyControlStyle);
  expect(payload.admin_contacts.some((contact) => contact.email === fixture.contactEmail)).toBe(true);
}

async function expectTenantContext(page: Page, tenant: TenantListItem, fixture: TenantFixture) {
  await expect(page).toHaveURL(new RegExp(`tenantId=${tenant.id}`));
  const selectedTenantAction = page.getByRole("link", { name: "Open selected tenant" });
  if (await selectedTenantAction.count()) {
    await expect(selectedTenantAction).toHaveAttribute("href", new RegExp(`tenantId=${tenant.id}`));
  } else {
    await expect(page.getByRole("heading", { name: fixture.name })).toBeVisible();
    await expect(page.getByText(fixture.code).first()).toBeVisible();
  }
}

async function expectNoOtherTenant(page: Page, other: TenantFixture) {
  await expect(page.getByText(other.notes)).toHaveCount(0);
  await expect(page.getByText(other.contactEmail)).toHaveCount(0);
}

async function verifyTenantScopedModules(page: Page, tenant: TenantListItem, fixture: TenantFixture, other: TenantFixture) {
  await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenant.id}`, "Launch Readiness");
  await expectTenantContext(page, tenant, fixture);
  await expect(card(page, "Onboarding metadata").locator("textarea[name='notes']")).toHaveValue(fixture.notes);
  await expectNoOtherTenant(page, other);

  await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenant.id}`, "Admin Access");
  await expectTenantContext(page, tenant, fixture);
  await expect(card(page, "Admin contacts").getByText(fixture.contactEmail)).toBeVisible();
  await expect(card(page, "Admin contacts").getByText(fixture.contactTitle)).toBeVisible();
  await expectNoOtherTenant(page, other);

  await gotoPlatform(page, `/platform-admin/policy-packs?tenantId=${tenant.id}`, "Setup Templates");
  await expectTenantContext(page, tenant, fixture);
  await expect(card(page, "Apply setup template").getByText(/selected tenant|chosen tenant|tenant/i).first()).toBeVisible();
  await expectNoOtherTenant(page, other);

  await gotoPlatform(page, `/platform-admin/audit-logs?tenantId=${tenant.id}`, "Audit Logs");
  await expectTenantContext(page, tenant, fixture);
  const eventsCard = card(page, "Onboarding events");
  await namedControl(eventsCard, "event_search").fill(fixture.code);
  await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: fixture.code }).first()).toBeVisible();
  await expect(eventsCard.getByText(other.code)).toHaveCount(0);
}

test.describe("Platform Admin tenant isolation certification", () => {
  test("certifies two-tenant browser lifecycle, context switching, and scoped module isolation", async ({ page }) => {
    test.setTimeout(360_000);
    const runRef = uniqueRunRef();
    const tenantA: TenantFixture = {
      code: `qa-iso-a-${runRef}`,
      name: `QA Tenant A ${runRef}`,
      legalName: `QA Tenant A ${runRef} Private Limited`,
      domain: `qa-tenant-a-${runRef}.example.test`,
      email: `ops.qa-tenant-a-${runRef}@example.test`,
      phone: "+91 94444 44001",
      plan: "growth",
      seedPack: "shift_based",
      contactName: `Asha Admin ${runRef}`,
      contactEmail: `asha.admin.${runRef}@example.test`,
      contactTitle: "People Ops Lead A",
      notes: `Isolation tenant A notes ${runRef}`,
      setupStyle: "shared",
      dataSetupStyle: "import_led",
      policyControlStyle: "mostly_locked",
      industry: "manufacturing",
    };
    const tenantB: TenantFixture = {
      code: `qa-iso-b-${runRef}`,
      name: `QA Tenant B ${runRef}`,
      legalName: `QA Tenant B ${runRef} LLP`,
      domain: `qa-tenant-b-${runRef}.example.test`,
      email: `ops.qa-tenant-b-${runRef}@example.test`,
      phone: "+91 95555 55002",
      plan: "enterprise",
      seedPack: "professional_services",
      contactName: `Bharat Admin ${runRef}`,
      contactEmail: `bharat.admin.${runRef}@example.test`,
      contactTitle: "Customer Admin B",
      notes: `Isolation tenant B notes ${runRef}`,
      setupStyle: "customer_led",
      dataSetupStyle: "seeded_demo",
      policyControlStyle: "mostly_delegated",
      industry: "professional services",
    };

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      const failure = request.failure()?.errorText ?? "";
      if (!url.includes("_rsc") && !failure.includes("ERR_ABORTED")) {
        failedRequests.push(`${request.method()} ${url} ${failure}`);
      }
    });

    await gotoAuthenticated(page, "/platform-admin/tenants", platformAdmin);
    await expectPageReady(page, "Tenants");
    const createdA = await createTenantFromBrowser(page, tenantA);
    const createdB = await createTenantFromBrowser(page, tenantB);

    await configureTenantFromBrowser(page, createdA, tenantA);
    await configureTenantFromBrowser(page, createdB, tenantB);

    await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
    const tenantPipeline = card(page, "Tenant pipeline");
    await namedControl(tenantPipeline, "tenant_search").fill(runRef);
    await namedControl(tenantPipeline, "tenant_status_filter").selectOption("prepared");
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantA.code })).toBeVisible();
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantB.code })).toBeVisible();
    await namedControl(tenantPipeline, "tenant_plan_filter").selectOption("growth");
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantA.code })).toBeVisible();
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantB.code })).toHaveCount(0);
    await namedControl(tenantPipeline, "tenant_plan_filter").selectOption("enterprise");
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantB.code })).toBeVisible();
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantA.code })).toHaveCount(0);

    await verifyTenantScopedModules(page, createdA, tenantA, tenantB);
    await verifyTenantScopedModules(page, createdB, tenantB, tenantA);
    await verifyTenantScopedModules(page, createdA, tenantA, tenantB);

    await page.goBack();
    await safeWait(page);
    await expect(page).toHaveURL(/tenantId=/);
    await expect(page.getByRole("link", { name: "Open selected tenant" })).toHaveAttribute("href", /tenantId=/);
    await page.goForward();
    await safeWait(page);
    await expect(page).toHaveURL(/tenantId=/);
    await expect(page.getByRole("link", { name: "Open selected tenant" })).toHaveAttribute("href", /tenantId=/);

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${createdB.id}`, "Admin Access");
    await expect(card(page, "Admin contacts").getByText(tenantB.contactEmail)).toBeVisible();
    await page.goto(`/platform-admin/admins?tenantId=${createdA.id}`, { waitUntil: "domcontentloaded" });
    await safeWait(page);
    await expect(card(page, "Admin contacts").getByText(tenantA.contactEmail)).toBeVisible();
    await expect(card(page, "Admin contacts").getByText(tenantB.contactEmail)).toHaveCount(0);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await gotoPlatform(page, `/platform-admin/tenants?tenantId=${createdA.id}`, "Tenants");
      await expectNoHorizontalOverflow(page);
      await expect(card(page, "Tenant pipeline")).toBeVisible();
      await expect(card(page, "Create tenant").getByRole("button", { name: "Create tenant" })).toBeVisible();
    }

    expect(consoleErrors.filter((entry) => !entry.includes("favicon")).join("\n")).toBe("");
    expect(failedRequests.join("\n")).toBe("");
  });
});
