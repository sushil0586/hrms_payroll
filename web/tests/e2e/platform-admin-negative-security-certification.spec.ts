import { expect, type APIResponse, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

async function openCreateTenantDialog(page: Page): Promise<Locator> {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openAddContactDialog(page: Page): Promise<Locator> {
  await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
  await expect(dialog).toBeVisible();
  return dialog;
}

function notice(page: Page): Locator {
  return page.locator(".notice").first();
}

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function loginAs(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
}

async function expectDenied(response: APIResponse) {
  expect([401, 403, 404, 405]).toContain(response.status());
  const payload = await response.json().catch(() => ({}));
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("password");
  expect(serialized).not.toContain("token");
  expect(serialized).not.toContain("secret");
}

async function openPlatformTab(page: Page, name: "Tenants" | "Launch Readiness" | "Admin Access" | "Setup Templates" | "Audit Logs") {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
}

test.describe("Platform admin negative and security certification", () => {
  test("wrong roles and unauthenticated sessions cannot access platform APIs or workspace", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/platform-admin");
    await expect(page).toHaveURL(/\/login$/);
    await expectDenied(await page.request.get("/api/platform/tenants"));
    await expectDenied(await page.request.post("/api/platform/tenants", { data: { code: "blocked", name: "Blocked" } }));
    await expectDenied(await page.request.get("/api/platform-policy-packs"));

    for (const persona of [employee, manager, hrAdmin]) {
      await loginAs(page, persona, "/platform-admin");
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("link", { name: "Platform" })).toHaveAttribute("href", "/");
      await expectDenied(await page.request.get("/api/platform/tenants"));
      await expectDenied(await page.request.post("/api/platform-policy-packs", {
        data: { code: `blocked-${uniqueRunRef()}`, name: "Blocked Pack", domain: "leave" },
      }));
    }
  });

  test("invalid fields, duplicates, and early activation gates fail visibly", async ({ page }) => {
    test.setTimeout(240_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-neg-${runRef}`;
    const packCode = `qa-neg-pack-${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    await openPlatformTab(page, "Tenants");
    await expect(page).toHaveURL(/\/platform-admin\/tenants/);

    let createTenant = await openCreateTenantDialog(page);
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await expect(namedControl(createTenant, "code")).toBeFocused();

    await namedControl(createTenant, "code").fill(tenantCode);
    await namedControl(createTenant, "name").fill(`QA Negative Tenant ${runRef}`);
    await namedControl(createTenant, "primary_email").fill("not-an-email");
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await expect(namedControl(createTenant, "primary_email")).toBeFocused();
    await namedControl(createTenant, "primary_email").fill(`ops.${tenantCode}@example.test`);
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/platform-admin\/onboarding/);

    const tenantId = new URL(page.url()).searchParams.get("tenantId");
    expect(tenantId).toBeTruthy();

    await openPlatformTab(page, "Tenants");
    createTenant = await openCreateTenantDialog(page);
    await namedControl(createTenant, "code").fill(tenantCode);
    await namedControl(createTenant, "name").fill(`QA Duplicate Tenant ${runRef}`);
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText(/already exists|unique|tenant creation failed|platform action failed/i)).toBeVisible();
    await createTenant.getByRole("button", { name: "Cancel" }).click();

    await openPlatformTab(page, "Launch Readiness");
    const gates = card(page, "Launch readiness");
    await expect(gates.locator(".platform-gate-checklist")).toBeVisible();
    await expect(gates.getByText("Initial setup confirmed")).toBeVisible();
    await expect(gates.getByText("Primary tenant admin has login access")).toBeVisible();
    await expect(gates.getByText("Go-live handoff ready", { exact: true })).toBeVisible();
    await expect(gates.getByText("Initial setup must be confirmed first.")).toBeVisible();
    await expect(gates.getByRole("link", { name: "Open setup templates" })).toBeVisible();
    await expect(gates.getByRole("button", { name: "Mark ready" })).toBeDisabled();
    await expect(gates.getByRole("button", { name: "Activate tenant" })).toBeDisabled();

    const directBaselineResponse = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-baseline-published`);
    expect(directBaselineResponse.status()).toBe(400);
    expect(JSON.stringify(await directBaselineResponse.json())).toContain("At least one adopted policy pack is required");
    const directHandoffResponse = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-handoff-ready`);
    expect(directHandoffResponse.status()).toBe(400);
    expect(JSON.stringify(await directHandoffResponse.json())).toContain("Baseline must be published");
    const directActivationResponse = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/activate`);
    expect(directActivationResponse.status()).toBe(400);
    expect(JSON.stringify(await directActivationResponse.json())).toContain("Tenant handoff must be ready");

    await openPlatformTab(page, "Admin Access");
    const addContact = await openAddContactDialog(page);
    await namedControl(addContact, "full_name").fill("Invalid Admin");
    await namedControl(addContact, "email").fill("not-an-email");
    await addContact.getByRole("button", { name: "Add contact" }).click();
    await expect(namedControl(addContact, "email")).toBeFocused();
    await addContact.getByRole("button", { name: "Cancel" }).click();

    await openPlatformTab(page, "Setup Templates");
    const packs = card(page, "Setup templates");
    await packs.getByRole("button", { name: "Create template" }).click();
    await expect(namedControl(packs, "code")).toBeFocused();
    await namedControl(packs, "code").fill(packCode);
    await namedControl(packs, "name").fill(`QA Negative Pack ${runRef}`);
    await namedControl(packs, "domain").selectOption("leave");
    await packs.getByRole("button", { name: "Create template" }).click();
    await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
    await namedControl(packs, "policy_pack_search").fill(packCode);
    await expect(page.getByText(packCode)).toBeVisible();

    await namedControl(packs, "code").fill(packCode);
    await namedControl(packs, "name").fill(`QA Duplicate Pack ${runRef}`);
    await namedControl(packs, "domain").selectOption("leave");
    await packs.getByRole("button", { name: "Create template" }).click();
    await expect(notice(page).getByText(/already exists|unique|policy pack creation failed|platform action failed/i)).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
