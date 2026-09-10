import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

const tabs = ["Tenants", "Onboarding", "Admins", "Policy Packs", "Events"] as const;

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

async function expectNamedControls(root: Locator, names: string[]) {
  for (const name of names) {
    await expect(root.locator(`[name="${name}"]`), `${name} control`).toBeVisible();
  }
}

async function openTab(page: Page, name: (typeof tabs)[number]) {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
}

async function expectPagination(root: Locator) {
  const pagination = root.locator(".pagination-bar").first();
  await expect(pagination).toBeVisible();
  await expect(pagination.getByRole("button", { name: "First" })).toBeVisible();
  await expect(pagination.getByRole("button", { name: "Previous" })).toBeVisible();
  await expect(pagination.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(pagination.getByRole("button", { name: "Last" })).toBeVisible();
  await expect(pagination.getByText(/Page \d+/)).toBeVisible();
}

async function expectSearchNarrowsList(page: Page, searchName: string, listSelector: string) {
  const listCountBefore = await page.locator(listSelector).count();
  await page.locator(`[name="${searchName}"]`).fill("__no_matching_platform_admin_record__");
  await expect(page.getByText(/clear the search|No tenants yet/i).first()).toBeVisible();
  expect(await page.locator(listSelector).count()).toBe(0);
  await page.locator(`[name="${searchName}"]`).fill("");
  expect(await page.locator(listSelector).count()).toBeLessThanOrEqual(Math.max(listCountBefore, 8));
}

test.describe("Platform admin tabbed workspace certification", () => {
  test("certifies tab routing, pagination, and every visible control group", async ({ page }) => {
    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Console");
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toBeVisible();
    for (const tab of tabs) {
      await expect(page.getByRole("tab", { name: new RegExp(`^${tab}`) })).toBeVisible();
    }

    await expect(page.getByRole("tab", { name: /^Tenants/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("platform-admin-tenants-panel")).toBeVisible();
    await expect(page.locator('[name="tenant_search"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-tenants-panel"));
    expect(await page.locator(".employee-directory-item").count()).toBeLessThanOrEqual(8);
    await expectSearchNarrowsList(page, "tenant_search", ".employee-directory-item");

    const createTenant = card(page, "Create tenant");
    await expectNamedControls(createTenant, [
      "code",
      "name",
      "legal_name",
      "primary_domain",
      "primary_email",
      "primary_phone",
      "subscription_plan",
      "seed_pack",
      "timezone",
      "country_code",
      "is_sandbox",
    ]);
    await expect(createTenant.getByRole("button", { name: "Create tenant" })).toBeVisible();
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await expect(createTenant.locator('[name="code"]')).toBeFocused();

    await openTab(page, "Onboarding");
    await expect(page).toHaveURL(/panel=onboarding/);
    await expect(page.getByTestId("platform-admin-onboarding-panel")).toBeVisible();
    await expect(card(page, "Activation gates").getByRole("button", { name: "Mark baseline" })).toBeVisible();
    await expect(card(page, "Activation gates").getByRole("button", { name: "Mark handoff" })).toBeVisible();
    await expect(card(page, "Activation gates").getByRole("button", { name: "Activate tenant" })).toBeVisible();
    await expectNamedControls(card(page, "Edit tenant setup"), [
      "name",
      "legal_name",
      "status",
      "subscription_plan",
      "seed_pack",
      "primary_email",
      "primary_phone",
      "primary_domain",
      "timezone",
      "country_code",
      "is_sandbox",
    ]);
    await expectNamedControls(card(page, "Onboarding metadata"), [
      "owner_mode",
      "setup_style",
      "data_setup_style",
      "policy_control_style",
      "country_context",
      "industry_context",
      "notes",
      "internal_handoff_notes",
      "customer_handoff_notes",
    ]);

    await openTab(page, "Admins");
    await expect(page.getByTestId("platform-admin-admins-panel")).toBeVisible();
    await expectNamedControls(card(page, "Admin contacts"), ["full_name", "email", "phone_number", "job_title", "is_primary", "notes"]);
    await expect(card(page, "Admin contacts").getByRole("button", { name: "Add contact" })).toBeVisible();
    await expectNamedControls(card(page, "Provision first admin"), [
      "contact_id",
      "username",
      "role_code",
      "role_name",
      "password",
      "membership_status",
      "must_change_password",
      "is_user_active",
    ]);
    await expect(card(page, "Provision first admin").getByRole("button", { name: "Provision admin" })).toBeVisible();

    await openTab(page, "Policy Packs");
    await expect(page.getByTestId("platform-admin-policy-packs-panel")).toBeVisible();
    await expect(page.locator('[name="policy_pack_search"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-policy-packs-panel"));
    expect(await card(page, "Policy packs").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(8);
    await expectSearchNarrowsList(page, "policy_pack_search", ".tenant-support-access-row");
    await expectNamedControls(card(page, "Policy packs"), [
      "code",
      "name",
      "domain",
      "status",
      "version",
      "country_code",
      "industry_tag",
      "description",
      "is_active",
    ]);
    await expectNamedControls(card(page, "Adopt baseline"), ["policy_pack_id", "adoption_mode", "notes"]);

    await openTab(page, "Events");
    await expect(page.getByTestId("platform-admin-events-panel")).toBeVisible();
    await expect(page.locator('[name="event_search"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-events-panel"));
    expect(await card(page, "Onboarding events").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(8);
    await page.locator('[name="event_search"]').fill("__no_matching_platform_admin_event__");
    expect(await card(page, "Onboarding events").locator(".tenant-support-access-row").count()).toBe(0);
    await expectNoHorizontalOverflow(page);
  });
});
