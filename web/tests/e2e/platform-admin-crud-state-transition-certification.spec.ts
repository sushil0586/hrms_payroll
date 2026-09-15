import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  onboarding_status: string;
  subscription_plan: string;
  primary_email: string;
  primary_phone: string;
  primary_domain: string;
  timezone: string;
  country_code: string;
};

type OnboardingPayload = {
  tenant_code: string;
  tenant_name: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  recent_events: Array<{ event_type: string; summary: string; actor_identifier: string; created_at: string }>;
};

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function notice(page: Page): Locator {
  return page.locator(".notice").first();
}

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function openPlatformTab(page: Page, name: "Tenants" | "Launch Checklist" | "Events") {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
}

async function openCreateTenantDialog(page: Page): Promise<Locator> {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
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

function expectEvent(payload: OnboardingPayload, eventType: string, summaryPattern?: RegExp) {
  const event = payload.recent_events.find((item) => item.event_type === eventType);
  expect(event, `${eventType} event`).toBeTruthy();
  expect(event?.actor_identifier).toBe("platform.admin");
  expect(event?.created_at).toBeTruthy();
  if (summaryPattern) {
    expect(event?.summary).toMatch(summaryPattern);
  }
}

test.describe("Platform admin CRUD and state transition certification", () => {
  test("creates, updates, suspends, reactivates, and audits a tenant from browser controls", async ({ page }) => {
    test.setTimeout(240_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-crud-${runRef}`;
    const tenantName = `QA CRUD Tenant ${runRef}`;
    const updatedTenantName = `${tenantName} Updated`;
    const updatedEmail = `owner.${tenantCode}@example.test`;
    const updatedPhone = "+91 93333 33001";
    const updatedDomain = `${tenantCode}.accerio.test`;

    await gotoAuthenticated(page, "/platform-admin/tenants", platformAdmin);
    await expectPageReady(page, "Tenants");
    await expectNoHorizontalOverflow(page);

    const createDialog = await openCreateTenantDialog(page);
    await namedControl(createDialog, "code").fill(tenantCode);
    await namedControl(createDialog, "name").fill(tenantName);
    await namedControl(createDialog, "legal_name").fill(`${tenantName} Pvt Ltd`);
    await namedControl(createDialog, "primary_domain").fill(`${tenantCode}.example.test`);
    await namedControl(createDialog, "primary_email").fill(`ops.${tenantCode}@example.test`);
    await namedControl(createDialog, "primary_phone").fill("+91 92222 22001");
    await namedControl(createDialog, "subscription_plan").selectOption("starter");
    await namedControl(createDialog, "seed_pack").selectOption("standard_office");
    await namedControl(createDialog, "timezone").fill("Asia/Kolkata");
    await namedControl(createDialog, "country_code").fill("IN");
    await createDialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();

    const createdTenant = await tenantByCode(page, tenantCode);
    await page.goto(`/platform-admin/onboarding?tenantId=${createdTenant.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expectPageReady(page, "Launch Checklist");
    await expect(card(page, tenantName)).toBeVisible();

    const setupCard = card(page, "Edit tenant setup");
    await namedControl(setupCard, "name").fill(updatedTenantName);
    await namedControl(setupCard, "legal_name").fill(`${updatedTenantName} Private Limited`);
    await namedControl(setupCard, "status").selectOption("suspended");
    await namedControl(setupCard, "subscription_plan").selectOption("enterprise");
    await namedControl(setupCard, "seed_pack").selectOption("professional_services");
    await namedControl(setupCard, "primary_email").fill(updatedEmail);
    await namedControl(setupCard, "primary_phone").fill(updatedPhone);
    await namedControl(setupCard, "primary_domain").fill(updatedDomain);
    await namedControl(setupCard, "timezone").fill("Asia/Kolkata");
    await namedControl(setupCard, "country_code").fill("IN");
    await setupCard.getByRole("button", { name: "Save tenant" }).click();
    await expect(notice(page).getByText("Tenant updated.", { exact: true })).toBeVisible();

    await page.reload();
    await expect(card(page, updatedTenantName)).toBeVisible();
    let updatedTenant = await tenantByCode(page, tenantCode);
    expect(updatedTenant.name).toBe(updatedTenantName);
    expect(updatedTenant.status).toBe("suspended");
    expect(updatedTenant.subscription_plan).toBe("enterprise");
    expect(updatedTenant.primary_email).toBe(updatedEmail);
    expect(updatedTenant.primary_phone).toBe(updatedPhone);
    expect(updatedTenant.primary_domain).toBe(updatedDomain);

    let evidence = await onboardingPayload(page, createdTenant.id);
    expect(evidence.tenant_name).toBe(updatedTenantName);
    expect(evidence.tenant_status).toBe("suspended");
    expectEvent(evidence, "tenant_updated", new RegExp(tenantCode));

    const onboardingCard = card(page, "Onboarding metadata");
    await namedControl(onboardingCard, "owner_mode").selectOption("split_platform_roles");
    await namedControl(onboardingCard, "setup_style").selectOption("customer_led");
    await namedControl(onboardingCard, "data_setup_style").selectOption("import_led");
    await namedControl(onboardingCard, "policy_control_style").selectOption("mostly_delegated");
    await namedControl(onboardingCard, "country_context").fill("IN");
    await namedControl(onboardingCard, "industry_context").fill("professional services");
    await namedControl(onboardingCard, "notes").fill(`CRUD state transition note ${tenantCode}`);
    await namedControl(onboardingCard, "internal_handoff_notes").fill("Internal checklist reviewed.");
    await namedControl(onboardingCard, "customer_handoff_notes").fill("Customer will complete tenant-side setup.");
    await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
    await expect(notice(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();

    evidence = await onboardingPayload(page, createdTenant.id);
    expectEvent(evidence, "tenant_prepared", new RegExp(tenantCode));

    await openPlatformTab(page, "Tenants");
    await namedControl(card(page, "Tenant pipeline"), "tenant_search").fill(tenantCode);
    await expect(card(page, "Tenant pipeline").locator(".employee-directory-item").filter({ hasText: updatedTenantName })).toBeVisible();
    await expect(card(page, "Tenant pipeline").locator(".employee-directory-item").filter({ hasText: "Enterprise" })).toBeVisible();

    await openPlatformTab(page, "Launch Checklist");
    const reactivateSetupCard = card(page, "Edit tenant setup");
    await namedControl(reactivateSetupCard, "status").selectOption("active");
    await reactivateSetupCard.getByRole("button", { name: "Save tenant" }).click();
    await expect(notice(page).getByText("Tenant updated.", { exact: true })).toBeVisible();

    updatedTenant = await tenantByCode(page, tenantCode);
    expect(updatedTenant.status).toBe("active");
    evidence = await onboardingPayload(page, createdTenant.id);
    expect(evidence.tenant_status).toBe("active");
    expectEvent(evidence, "tenant_updated", new RegExp(tenantCode));

    await openPlatformTab(page, "Events");
    const eventsCard = card(page, "Onboarding events");
    await namedControl(eventsCard, "event_search").fill("tenant_updated");
    await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: "Tenant Updated" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
