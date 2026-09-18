import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
};

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function notice(page: Page): Locator {
  return page.locator(".platform-feedback").first();
}

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function safeReload(page: Page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function tenantIdByCode(page: Page, tenantCode: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  return tenants.find((tenant) => tenant.code === tenantCode)?.id ?? "";
}

async function createTenantViaApi(page: Page, tenantCode: string, tenantName: string) {
  const response = await page.request.post("/api/platform/tenants", {
    data: {
      code: tenantCode,
      name: tenantName,
      legal_name: `${tenantName} Pvt Ltd`,
      primary_email: `ops.${tenantCode}@example.test`,
      primary_domain: `${tenantCode}.example.test`,
      subscription_plan: "growth",
      seed_pack: "standard_office",
      timezone: "Asia/Kolkata",
      country_code: "IN",
      is_sandbox: true,
    },
  });
  expect(response.ok()).toBeTruthy();
  return tenantIdByCode(page, tenantCode);
}

async function selectOptionContaining(select: Locator, text: string) {
  const option = select.locator("option").filter({ hasText: text }).first();
  await expect(option, `option containing ${text}`).toHaveCount(1, { timeout: 10_000 });
  const value = await option.getAttribute("value");
  expect(value, `option containing ${text}`).toBeTruthy();
  await select.selectOption(value ?? "");
}

async function openSetupTemplates(page: Page, tenantId: string) {
  await page.goto(`/platform-admin/policy-packs?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page.getByTestId("platform-admin-policy-packs-panel")).toBeVisible();
}

async function openTenantOnboarding(page: Page, tenantId: string) {
  await page.goto(`/platform-admin/onboarding?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page.getByTestId("platform-admin-onboarding-panel")).toBeVisible();
}

async function createTemplate(page: Page, packCode: string, packName: string) {
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "code").fill(packCode);
  await namedControl(setupCard, "name").fill(packName);
  await namedControl(setupCard, "domain").selectOption("leave");
  await namedControl(setupCard, "status").selectOption("draft");
  await namedControl(setupCard, "version").fill("1");
  await namedControl(setupCard, "country_code").fill("IN");
  await namedControl(setupCard, "industry_tag").fill("qa");
  await namedControl(setupCard, "description").fill("Setup template lifecycle certification pack.");
  await setupCard.getByRole("button", { name: "Create template" }).click();
  await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
}

async function addLeaveTypeItem(page: Page, item: { packCode: string; key: string; name: string; runtimeCode: string; runtimeName: string; sortOrder: string }) {
  await fillLeaveTypeItem(page, item);
  const addCard = card(page, "Add template item");
  await addCard.getByRole("button", { name: "Add item" }).click();
  await expect(notice(page).getByText("Setup template item added.", { exact: true })).toBeVisible();
}

async function fillLeaveTypeItem(page: Page, item: { packCode: string; key: string; name: string; runtimeCode: string; runtimeName: string; sortOrder: string; dependencyKeys?: string }) {
  const addCard = card(page, "Add template item");
  await selectOptionContaining(namedControl(addCard, "item_policy_pack_id"), item.packCode);
  await namedControl(addCard, "item_type").selectOption("leave_type");
  await namedControl(addCard, "item_key").fill(item.key);
  await namedControl(addCard, "name").fill(item.name);
  await namedControl(addCard, "sort_order").fill(item.sortOrder);
  await namedControl(addCard, "dependency_keys").fill(item.dependencyKeys ?? "");
  await namedControl(addCard, "payload_code").fill(item.runtimeCode);
  await namedControl(addCard, "payload_name").fill(item.runtimeName);
  await namedControl(addCard, "payload_category").selectOption("paid");
  await namedControl(addCard, "payload_unit").selectOption("day");
}

async function publishTemplate(page: Page, packCode: string) {
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "policy_pack_search").fill(packCode);
  const row = setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).first();
  await row.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("dialog", { name: "Publish setup template?" }).getByRole("button", { name: "Publish template" }).click();
  await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
}

async function selectTemplateInApplyCard(page: Page, packCode: string) {
  const applyCard = card(page, "Apply setup template");
  await selectOptionContaining(namedControl(applyCard, "policy_pack_id"), packCode);
  return applyCard;
}

test.describe("Platform Admin setup templates lifecycle certification", () => {
  test("certifies guided authoring, publish, adopt, clone, compare, and upgrade apply", async ({ page }) => {
    test.setTimeout(360_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-tpl-${runRef}`;
    const tenantName = `QA Template Tenant ${runRef}`;
    const packCode = `qa-template-${runRef}`;
    const packName = `QA Template Pack ${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantId = await createTenantViaApi(page, tenantCode, tenantName);
    expect(tenantId).toBeTruthy();

    await openSetupTemplates(page, tenantId);
    await createTemplate(page, packCode, packName);
    await safeReload(page);

    await openTenantOnboarding(page, tenantId);
    await addLeaveTypeItem(page, {
      packCode,
      key: "casual-leave-type",
      name: "Casual Leave",
      runtimeCode: "casual-leave",
      runtimeName: "Casual Leave",
      sortOrder: "10",
    });
    await safeReload(page);
    await openSetupTemplates(page, tenantId);
    await publishTemplate(page, packCode);
    await safeReload(page);

    let applyCard = await selectTemplateInApplyCard(page, packCode);
    await namedControl(applyCard, "adoption_mode").selectOption("clone_to_tenant_records");
    await applyCard.getByRole("button", { name: "Preview impact" }).click();
    await expect(applyCard.getByText("Impact preview")).toBeVisible();
    await expect(applyCard.getByText("Ready", { exact: true })).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply template" }).click();
    await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("Apply result")).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("1 created", { exact: true })).toBeVisible();
    await safeReload(page);

    const setupCard = card(page, "Setup templates");
    await namedControl(setupCard, "policy_pack_search").fill(packCode);
    await setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "New version" }).click();
    await page.getByRole("dialog", { name: "Create a new draft version?" }).getByRole("button", { name: "Create version" }).click();
    await expect(notice(page).getByText("New draft template version created.", { exact: true })).toBeVisible();
    await safeReload(page);

    await namedControl(setupCard, "policy_pack_search").fill(`${packCode}-v2`);
    await expect(setupCard.locator(".tenant-support-access-row").filter({ hasText: `${packCode}-v2` })).toBeVisible();
    applyCard = await selectTemplateInApplyCard(page, `${packCode}-v2`);
    await applyCard.locator(".platform-template-preview__item").filter({ hasText: "casual-leave-type" }).getByRole("button", { name: "Edit" }).click();
    const editForm = applyCard.locator(".platform-template-preview__edit-form");
    await namedControl(editForm, "name").fill("Casual Leave v2");
    await namedControl(editForm, "payload_name").fill("Casual Leave v2");
    await editForm.getByRole("button", { name: "Save item" }).click();
    await expect(notice(page).getByText("Setup template item updated.", { exact: true })).toBeVisible();
    await safeReload(page);

    await openTenantOnboarding(page, tenantId);
    await addLeaveTypeItem(page, {
      packCode: `${packCode}-v2`,
      key: "sick-leave-type",
      name: "Sick Leave",
      runtimeCode: "sick-leave",
      runtimeName: "Sick Leave",
      sortOrder: "20",
    });
    await safeReload(page);
    await openSetupTemplates(page, tenantId);
    await publishTemplate(page, `${packCode}-v2`);
    await safeReload(page);

    applyCard = await selectTemplateInApplyCard(page, `${packCode}-v2`);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Version comparison")).toBeVisible();
    await expect(applyCard.getByText("Upgradeable")).toBeVisible();
    await expect(applyCard.getByText("Casual Leave v2", { exact: true }).first()).toBeVisible();
    await expect(applyCard.getByText("Sick Leave", { exact: true }).first()).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply upgrade" }).click();
    await expect(notice(page).getByText("Setup template upgrade applied.", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("Apply result")).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("1 updated", { exact: true })).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("1 created", { exact: true })).toBeVisible();

    await safeReload(page);
    applyCard = await selectTemplateInApplyCard(page, `${packCode}-v2`);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Version comparison")).toBeVisible();
    await expect(applyCard.getByText("2 unchanged", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("certifies setup-template validation guardrails and published locks", async ({ page }) => {
    test.setTimeout(240_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-tpl-neg-${runRef}`;
    const tenantName = `QA Template Negative Tenant ${runRef}`;
    const packCode = `qa-template-neg-${runRef}`;
    const packName = `QA Template Negative Pack ${runRef}`;
    const headerOnlyCode = `qa-header-only-${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantId = await createTenantViaApi(page, tenantCode, tenantName);
    expect(tenantId).toBeTruthy();

    await openSetupTemplates(page, tenantId);
    await createTemplate(page, packCode, packName);
    await safeReload(page);

    await openTenantOnboarding(page, tenantId);
    await addLeaveTypeItem(page, {
      packCode,
      key: "guardrail-leave-type",
      name: "Guardrail Leave",
      runtimeCode: "guardrail-leave",
      runtimeName: "Guardrail Leave",
      sortOrder: "10",
    });

    await fillLeaveTypeItem(page, {
      packCode,
      key: "guardrail-leave-type",
      name: "Duplicate Guardrail Leave",
      runtimeCode: "guardrail-leave-duplicate",
      runtimeName: "Duplicate Guardrail Leave",
      sortOrder: "20",
    });
    await card(page, "Add template item").getByRole("button", { name: "Add item" }).click();
    await expect(notice(page).getByText("This record already exists. Search the list or use a different code/email.", { exact: true })).toBeVisible();

    await fillLeaveTypeItem(page, {
      packCode,
      key: "blocked-dependency-leave",
      name: "Blocked Dependency Leave",
      runtimeCode: "blocked-dependency-leave",
      runtimeName: "Blocked Dependency Leave",
      sortOrder: "30",
      dependencyKeys: "missing-leave-type",
    });
    await card(page, "Add template item").getByRole("button", { name: "Add item" }).click();
    await expect(notice(page).getByText(/Unknown dependency keys: missing-leave-type/)).toBeVisible();

    await openSetupTemplates(page, tenantId);
    await createTemplate(page, headerOnlyCode, `QA Header Only ${runRef}`);
    await namedControl(card(page, "Setup templates"), "policy_pack_search").fill(headerOnlyCode);
    const headerOnlyRow = card(page, "Setup templates").locator(".tenant-support-access-row").filter({ hasText: headerOnlyCode }).first();
    await expect(headerOnlyRow.getByText("Header only", { exact: true })).toBeVisible();
    await headerOnlyRow.getByRole("button", { name: "Publish" }).click();
    const headerOnlyDialog = page.getByRole("dialog", { name: "Publish header-only setup template?" });
    await expect(headerOnlyDialog.getByText("evidence-only baseline")).toBeVisible();
    await headerOnlyDialog.getByRole("button", { name: "Publish header-only" }).click();
    await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();

    await openSetupTemplates(page, tenantId);
    await publishTemplate(page, packCode);
    await safeReload(page);
    const applyCard = await selectTemplateInApplyCard(page, packCode);
    const publishedItem = applyCard.locator(".platform-template-preview__item").filter({ hasText: "guardrail-leave-type" }).first();
    await expect(publishedItem.getByRole("button", { name: "Edit" })).toBeDisabled();
    await expect(publishedItem.getByRole("button", { name: "Delete" })).toBeDisabled();
    await expect(publishedItem.getByText("Published templates are locked. Create a new version before editing items.")).toBeVisible();
  });
});
