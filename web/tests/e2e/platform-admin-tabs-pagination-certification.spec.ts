import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

const tabs = ["Control", "Tenants", "Launch Readiness", "Admin Access", "Setup Templates", "Audit Logs"] as const;

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

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  const tolerance = 1;
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

async function expectReadinessActionsFit(page: Page) {
  const actions = page.locator(".platform-readiness-actions");
  await expect(actions).toBeVisible();
  const actionBox = await actions.boundingBox();
  expect(actionBox, "readiness action bounds").toBeTruthy();
  const buttons = actions.getByRole("button");
  await expect(buttons).toHaveCount(3);
  const boxes = [];
  for (let index = 0; index < 3; index += 1) {
    const button = buttons.nth(index);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box, `readiness action ${index} bounds`).toBeTruthy();
    if (actionBox && box) {
      expect(box.x, `readiness action ${index} left edge`).toBeGreaterThanOrEqual(actionBox.x - 1);
      expect(box.x + box.width, `readiness action ${index} right edge`).toBeLessThanOrEqual(actionBox.x + actionBox.width + 1);
      expect(box.width, `readiness action ${index} usable width`).toBeGreaterThan(90);
      boxes.push(box);
    }
  }
  for (let left = 0; left < boxes.length; left += 1) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      expect(boxesOverlap(boxes[left], boxes[right]), `readiness action ${left} overlaps ${right}`).toBeFalsy();
    }
  }
}

async function expectSetupTemplateActionsFit(page: Page) {
  const setupCard = card(page, "Setup templates");
  const firstTemplateRow = setupCard.locator(".platform-template-row").first();
  if ((await firstTemplateRow.count()) > 0) {
    await expect(firstTemplateRow).toBeVisible();
    const rowBox = await firstTemplateRow.boundingBox();
    expect(rowBox, "setup template row bounds").toBeTruthy();
    const rowButtons = firstTemplateRow.getByRole("button");
    await expect(rowButtons).toHaveCount(2);
    const boxes = [];
    for (let index = 0; index < 2; index += 1) {
      const button = rowButtons.nth(index);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, `setup template action ${index} bounds`).toBeTruthy();
      if (rowBox && box) {
        expect(box.x, `setup template action ${index} left edge`).toBeGreaterThanOrEqual(rowBox.x - 1);
        expect(box.x + box.width, `setup template action ${index} right edge`).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
        expect(box.width, `setup template action ${index} usable width`).toBeGreaterThan(70);
        boxes.push(box);
      }
    }
    if (boxes.length === 2) {
      expect(boxesOverlap(boxes[0], boxes[1]), "setup template row actions overlap").toBeFalsy();
    }
  }

  const adoptionActions = card(page, "Apply setup template").locator(".platform-adoption-actions .button-row");
  await expect(adoptionActions).toBeVisible();
  const actionsBox = await adoptionActions.boundingBox();
  expect(actionsBox, "setup adoption actions bounds").toBeTruthy();
  const adoptionButtons = adoptionActions.getByRole("button");
  await expect(adoptionButtons).toHaveCount(4);
  const actionBoxes = [];
  for (let index = 0; index < 4; index += 1) {
    const button = adoptionButtons.nth(index);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box, `adoption action ${index} bounds`).toBeTruthy();
    if (actionsBox && box) {
      expect(box.x, `adoption action ${index} left edge`).toBeGreaterThanOrEqual(actionsBox.x - 1);
      expect(box.x + box.width, `adoption action ${index} right edge`).toBeLessThanOrEqual(actionsBox.x + actionsBox.width + 1);
      expect(box.width, `adoption action ${index} usable width`).toBeGreaterThan(80);
      actionBoxes.push(box);
    }
  }
  for (let left = 0; left < actionBoxes.length; left += 1) {
    for (let right = left + 1; right < actionBoxes.length; right += 1) {
      expect(boxesOverlap(actionBoxes[left], actionBoxes[right]), `adoption action ${left} overlaps ${right}`).toBeFalsy();
    }
  }
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
    await expect(createTenantDialog).toHaveAttribute("aria-describedby", "create-platform-tenant-description");
    await expect(createTenantDialog.locator('[name="code"]')).toBeFocused();
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
    await page.keyboard.press("Escape");
    await expect(createTenantDialog).toBeHidden();
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    await createTenantDialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(createTenantDialog.locator('[name="code"]')).toBeFocused();
    await createTenantDialog.getByRole("button", { name: "Cancel" }).click();

    await openTab(page, "Launch Readiness");
    await expect(page).toHaveURL(/\/platform-admin\/onboarding/);
    await expect(page.getByTestId("platform-admin-onboarding-panel")).toBeVisible();
    await expect(card(page, "Launch readiness").locator(".platform-guided-checklist")).toBeVisible();
    const guidedChecklist = card(page, "Launch readiness").locator(".platform-guided-checklist");
    await expect(guidedChecklist).toBeVisible();
    for (const step of [
      "Customer record created",
      "Apply setup template",
      "Create tenant admin login",
      "Complete go-live handoff",
      "Activate tenant",
    ]) {
      await expect(guidedChecklist.locator(".platform-guided-checklist__item").filter({ hasText: step })).toBeVisible();
    }
    await expect(card(page, "Launch readiness").locator(".platform-gate-checklist")).toBeVisible();
    await expect(card(page, "Launch readiness").getByText("Initial setup confirmed")).toBeVisible();
    await expect(card(page, "Launch readiness").getByText("Primary tenant admin has login access")).toBeVisible();
    await expect(card(page, "Launch readiness").getByText("Go-live handoff ready", { exact: true })).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Confirm setup" })).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Mark ready" })).toBeVisible();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Activate tenant" })).toBeVisible();
    await expectReadinessActionsFit(page);
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

    await openTab(page, "Admin Access");
    await expect(page.getByTestId("platform-admin-admins-panel")).toBeVisible();
    await expect(card(page, "Admin contacts").getByRole("button", { name: "Add contact" })).toBeVisible();
    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
    const addContactDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await expect(addContactDialog).toHaveAttribute("aria-describedby", "add-platform-admin-contact-description");
    await expect(addContactDialog.locator('[name="full_name"]')).toBeFocused();
    await expect(addContactDialog.getByText("Contact validation")).toBeVisible();
    await expectNamedControls(addContactDialog, ["full_name", "email", "phone_number", "job_title", "is_primary", "notes"]);
    await page.keyboard.press("Escape");
    await expect(addContactDialog).toBeHidden();
    await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
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
    await expectSetupTemplateActionsFit(page);

    await openTab(page, "Audit Logs");
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
    const desktopScreenshot = await page.screenshot({ fullPage: true });
    expect(desktopScreenshot.length).toBeGreaterThan(1000);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    const mobileScreenshot = await page.screenshot({ fullPage: true });
    expect(mobileScreenshot.length).toBeGreaterThan(1000);
  });
});
