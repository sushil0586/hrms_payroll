import { expect, type APIResponse, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

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

async function openPlatformTab(page: Page, name: "Tenants" | "Onboarding" | "Admins" | "Policy Packs" | "Events") {
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
      await expect(page.getByText("Platform admin restricted")).toBeVisible();
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
    await expectPageReady(page, "Platform Admin Console");

    const createTenant = card(page, "Create tenant");
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
    await expect(page).toHaveURL(/panel=onboarding/);

    const tenantId = new URL(page.url()).searchParams.get("tenantId");
    expect(tenantId).toBeTruthy();

    await openPlatformTab(page, "Tenants");
    await namedControl(card(page, "Create tenant"), "code").fill(tenantCode);
    await namedControl(card(page, "Create tenant"), "name").fill(`QA Duplicate Tenant ${runRef}`);
    await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText(/already exists|unique|tenant creation failed|platform action failed/i)).toBeVisible();

    await openPlatformTab(page, "Onboarding");
    await card(page, "Activation gates").getByRole("button", { name: "Mark baseline" }).click();
    await expect(notice(page).getByText("At least one adopted policy pack is required before baseline publication can be confirmed.")).toBeVisible();
    await card(page, "Activation gates").getByRole("button", { name: "Mark handoff" }).click();
    await expect(notice(page).getByText("Baseline must be published before handoff is marked ready.")).toBeVisible();
    await card(page, "Activation gates").getByRole("button", { name: "Activate tenant" }).click();
    await expect(notice(page).getByText("Tenant handoff must be ready before activation.")).toBeVisible();

    await openPlatformTab(page, "Admins");
    await namedControl(card(page, "Admin contacts"), "full_name").fill("Invalid Admin");
    await namedControl(card(page, "Admin contacts"), "email").fill("not-an-email");
    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    await expect(namedControl(card(page, "Admin contacts"), "email")).toBeFocused();

    await openPlatformTab(page, "Policy Packs");
    const packs = card(page, "Policy packs");
    await packs.getByRole("button", { name: "Create pack" }).click();
    await expect(namedControl(packs, "code")).toBeFocused();
    await namedControl(packs, "code").fill(packCode);
    await namedControl(packs, "name").fill(`QA Negative Pack ${runRef}`);
    await namedControl(packs, "domain").selectOption("leave");
    await packs.getByRole("button", { name: "Create pack" }).click();
    await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
    await namedControl(packs, "policy_pack_search").fill(packCode);
    await expect(page.getByText(packCode)).toBeVisible();

    await namedControl(packs, "code").fill(packCode);
    await namedControl(packs, "name").fill(`QA Duplicate Pack ${runRef}`);
    await namedControl(packs, "domain").selectOption("leave");
    await packs.getByRole("button", { name: "Create pack" }).click();
    await expect(notice(page).getByText(/already exists|unique|policy pack creation failed|platform action failed/i)).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
