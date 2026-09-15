import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

const tabs = ["Control", "Tenants", "Launch Checklist", "Tenant Admin Users", "Setup Templates", "Events"] as const;

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
    await expectPageReady(page, "Platform Admin Dashboard");
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toBeVisible();
    for (const tab of tabs) {
      await expect(page.getByRole("tab", { name: new RegExp(`^${tab}`) })).toBeVisible();
    }

    await expect(page.getByRole("tab", { name: /^Control/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();
    await expect(card(page, "Mission queue")).toBeVisible();
    await expect(card(page, "Tenant pipeline")).toBeVisible();
    await expect(card(page, "Risk radar")).toBeVisible();
    await expect(card(page, "Activation blockers")).toBeVisible();
    await expect(card(page, "Command shortcuts")).toBeVisible();
    await expect(card(page, "Evidence trail")).toBeVisible();
    for (const shortcut of ["Review leads", "Create tenant", "Create admin access", "Setup templates", "Ops health", "Resilience"]) {
      await expect(card(page, "Command shortcuts").getByRole("link", { name: shortcut })).toBeVisible();
    }

    await openTab(page, "Tenants");
    await expect(page).toHaveURL(/\/platform-admin\/tenants/);
    await expect(page.getByTestId("platform-admin-tenants-panel")).toBeVisible();
    await expect(page.locator('[name="tenant_search"]')).toBeVisible();
    await expect(page.locator('[name="tenant_status_filter"]')).toBeVisible();
    await expect(page.locator('[name="tenant_plan_filter"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-tenants-panel"));
    expect(await page.locator(".employee-directory-item").count()).toBeLessThanOrEqual(8);
    await expectSearchNarrowsList(page, "tenant_search", ".employee-directory-item");
    const tenantListCount = await page.locator(".employee-directory-item").count();
    await page.locator('[name="tenant_status_filter"]').selectOption("active");
    expect(await page.locator(".employee-directory-item").count()).toBeLessThanOrEqual(tenantListCount);
    await page.locator('[name="tenant_status_filter"]').selectOption("all");
    await page.locator('[name="tenant_plan_filter"]').selectOption("growth");
    expect(await page.locator(".employee-directory-item").count()).toBeLessThanOrEqual(tenantListCount);
    await page.locator('[name="tenant_plan_filter"]').selectOption("all");

    const createTenant = card(page, "Create tenant");
    await expect(createTenant.getByText("After create")).toBeVisible();
    await expect(createTenant.getByRole("button", { name: "Create tenant" })).toBeVisible();
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    const createTenantDialog = page.getByRole("dialog", { name: "Create platform tenant" });
    await expect(createTenantDialog.getByText("Before creating")).toBeVisible();
    await expect(createTenantDialog.getByText("Code and name are mandatory.")).toBeVisible();
    await expectNamedControls(createTenantDialog, [
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
    await createTenantDialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(createTenantDialog.locator('[name="code"]')).toBeFocused();
    await createTenantDialog.getByRole("button", { name: "Cancel" }).click();

    await openTab(page, "Launch Checklist");
    await expect(page).toHaveURL(/\/platform-admin\/onboarding/);
    await expect(page.getByTestId("platform-admin-onboarding-panel")).toBeVisible();
    await expect(card(page, "Launch checklist").locator(".platform-guided-checklist")).toBeVisible();
    const guidedChecklist = card(page, "Launch checklist").locator(".platform-guided-checklist");
    await expect(guidedChecklist).toBeVisible();
    for (const step of [
      "Customer record created",
      "Apply setup template",
      "Create tenant admin login",
      "Mark ready for tenant admin",
      "Activate tenant",
    ]) {
      await expect(guidedChecklist.locator(".platform-guided-checklist__item").filter({ hasText: step })).toBeVisible();
    }
    await expect(card(page, "Launch checklist").locator(".platform-gate-checklist")).toBeVisible();
    await expect(card(page, "Launch checklist").getByText("Initial setup confirmed")).toBeVisible();
    await expect(card(page, "Launch checklist").getByText("Primary tenant admin has login access")).toBeVisible();
    await expect(card(page, "Launch checklist").getByText("Ready for tenant admin", { exact: true })).toBeVisible();
    await expect(card(page, "Launch checklist").getByRole("button", { name: "Confirm setup" })).toBeVisible();
    await expect(card(page, "Launch checklist").getByRole("button", { name: "Mark ready" })).toBeVisible();
    await expect(card(page, "Launch checklist").getByRole("button", { name: "Activate tenant" })).toBeVisible();
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

    await openTab(page, "Tenant Admin Users");
    await expect(page.getByTestId("platform-admin-admins-panel")).toBeVisible();
    await expect(card(page, "Admin contacts").getByRole("button", { name: "Add contact" })).toBeVisible();
    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    const addContactDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await expect(addContactDialog.getByText("Contact validation")).toBeVisible();
    await expectNamedControls(addContactDialog, ["full_name", "email", "phone_number", "job_title", "is_primary", "notes"]);
    await addContactDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(card(page, "Create tenant admin login").getByText(/Before creating login access|No contacts are ready for login access/)).toBeVisible();
    await expectNamedControls(card(page, "Create tenant admin login"), [
      "contact_id",
      "username",
      "role_code",
      "role_name",
      "password",
      "membership_status",
      "must_change_password",
      "is_user_active",
    ]);
    await expect(card(page, "Create tenant admin login").getByRole("button", { name: "Create login access" })).toBeVisible();

    await openTab(page, "Setup Templates");
    await expect(page.getByTestId("platform-admin-policy-packs-panel")).toBeVisible();
    await expect(page.locator('[name="policy_pack_search"]')).toBeVisible();
    await expect(page.locator('[name="policy_pack_status_filter"]')).toBeVisible();
    await expect(page.locator('[name="policy_pack_domain_filter"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-policy-packs-panel"));
    expect(await card(page, "Setup templates").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(8);
    await expectSearchNarrowsList(page, "policy_pack_search", ".tenant-support-access-row");
    const setupTemplateCount = await card(page, "Setup templates").locator(".tenant-support-access-row").count();
    await page.locator('[name="policy_pack_status_filter"]').selectOption("published");
    expect(await card(page, "Setup templates").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(setupTemplateCount);
    await page.locator('[name="policy_pack_status_filter"]').selectOption("all");
    await page.locator('[name="policy_pack_domain_filter"]').selectOption("leave");
    expect(await card(page, "Setup templates").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(setupTemplateCount);
    await page.locator('[name="policy_pack_domain_filter"]').selectOption("all");
    await expect(card(page, "Setup templates").getByText("Template validation")).toBeVisible();
    await expectNamedControls(card(page, "Setup templates"), [
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
    await expectNamedControls(card(page, "Apply setup template"), ["policy_pack_id", "adoption_mode", "notes"]);
    await expect(card(page, "Apply setup template").getByText(/Before adoption|Setup template cannot be applied yet/)).toBeVisible();

    await openTab(page, "Events");
    await expect(page.getByTestId("platform-admin-events-panel")).toBeVisible();
    await expect(page.locator('[name="event_search"]')).toBeVisible();
    await expect(page.locator('[name="event_type_filter"]')).toBeVisible();
    await expectPagination(page.getByTestId("platform-admin-events-panel"));
    expect(await card(page, "Onboarding events").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(8);
    const firstEventType = await page.locator('[name="event_type_filter"] option').nth(1).getAttribute("value");
    expect(firstEventType).toBeTruthy();
    const eventCount = await card(page, "Onboarding events").locator(".tenant-support-access-row").count();
    await page.locator('[name="event_type_filter"]').selectOption(firstEventType ?? "");
    expect(await card(page, "Onboarding events").locator(".tenant-support-access-row").count()).toBeLessThanOrEqual(eventCount);
    await page.locator('[name="event_type_filter"]').selectOption("all");
    await page.locator('[name="event_search"]').fill("__no_matching_platform_admin_event__");
    expect(await card(page, "Onboarding events").locator(".tenant-support-access-row").count()).toBe(0);
    await expectNoHorizontalOverflow(page);
  });
});
