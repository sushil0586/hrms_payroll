import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
};

type PolicyPackItem = {
  id: string;
  item_key: string;
  item_type: string;
  name: string;
};

type PolicyPack = {
  id: string;
  code: string;
  status: string;
  version: number;
  items: PolicyPackItem[];
};

type AddItemOptions = {
  dependencies?: string;
  payload?: Record<string, unknown>;
  sortOrder?: string;
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

async function listPolicyPacks(page: Page) {
  const response = await page.request.get("/api/platform-policy-packs");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as PolicyPack[];
}

async function getPolicyPackByCode(page: Page, packCode: string) {
  const packs = await listPolicyPacks(page);
  const pack = packs.find((item) => item.code === packCode);
  expect(pack, `policy pack ${packCode}`).toBeTruthy();
  return pack as PolicyPack;
}

async function expectPolicyPackItem(page: Page, packCode: string, itemKey: string) {
  await expect
    .poll(async () => {
      const pack = await getPolicyPackByCode(page, packCode);
      return pack.items.some((item) => item.item_key === itemKey);
    }, { timeout: 10_000 })
    .toBeTruthy();
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
  await namedControl(setupCard, "description").fill("Deep Setup Templates regression certification pack.");
  await setupCard.getByRole("button", { name: "Create template" }).click();
  await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
}

async function selectTemplateInApplyCard(page: Page, packCode: string) {
  const applyCard = card(page, "Apply setup template");
  await selectOptionContaining(namedControl(applyCard, "policy_pack_id"), packCode);
  return applyCard;
}

async function fillCommonItem(addCard: Locator, packCode: string, itemType: string, key: string, name: string, options?: AddItemOptions) {
  await selectOptionContaining(namedControl(addCard, "item_policy_pack_id"), packCode);
  await namedControl(addCard, "item_type").selectOption(itemType);
  await namedControl(addCard, "item_key").fill(key);
  await namedControl(addCard, "name").fill(name);
  await namedControl(addCard, "sort_order").fill(options?.sortOrder ?? "10");
  await namedControl(addCard, "dependency_keys").fill(options?.dependencies ?? "");
}

async function fillRuntimeBasics(addCard: Locator, code: string, name: string) {
  await namedControl(addCard, "payload_code").fill(code);
  await namedControl(addCard, "payload_name").fill(name);
}

async function fillAdvancedPayload(addCard: Locator, payload: Record<string, unknown>) {
  const payloadField = namedControl(addCard, "payload");
  if (!(await payloadField.isVisible())) {
    await addCard.locator("summary").filter({ hasText: "Advanced JSON override" }).click();
  }
  await payloadField.fill(JSON.stringify(payload, null, 2));
}

async function addItem(page: Page, packCode: string, itemType: string, key: string, name: string, options?: AddItemOptions) {
  const addCard = card(page, "Add template item");
  await fillCommonItem(addCard, packCode, itemType, key, name, options);
  if (options?.payload) {
    await fillRuntimeBasics(addCard, String(options.payload.code ?? key), String(options.payload.name ?? name));
    if (itemType === "leave_policy") {
      await namedControl(addCard, "payload_leave_type_item_key").fill(String(options.payload.leave_type_item_key ?? ""));
    }
    if (itemType === "attendance_policy") {
      await namedControl(addCard, "payload_default_shift_item_key").fill(String(options.payload.default_shift_item_key ?? ""));
      await namedControl(addCard, "payload_holiday_calendar_item_key").fill(String(options.payload.holiday_calendar_item_key ?? ""));
    }
    await fillAdvancedPayload(addCard, options.payload);
  } else {
    await fillRuntimeBasics(addCard, key.replace(/-type|-policy|-calendar/g, ""), name);
  }
  await addCard.getByRole("button", { name: "Add item" }).click();
  await expect(notice(page).getByText("Setup template item added.", { exact: true })).toBeVisible();
  await expectPolicyPackItem(page, packCode, key);
}

async function addLeaveType(page: Page, packCode: string, key: string, name: string, sortOrder: string) {
  await addItem(page, packCode, "leave_type", key, name, {
    sortOrder,
    payload: {
      code: key.replace("-type", ""),
      name,
      category: "paid",
      unit: "day",
      is_approval_required: true,
    },
  });
}

async function publishTemplate(page: Page, packCode: string) {
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "policy_pack_search").fill(packCode);
  const row = setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).first();
  await row.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("dialog", { name: "Publish setup template?" }).getByRole("button", { name: "Publish template" }).click();
  await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
}

async function addCompleteV1Items(page: Page, packCode: string) {
  await addLeaveType(page, packCode, "casual-leave-type", "Casual Leave", "10");
  await addItem(page, packCode, "leave_policy", "casual-leave-policy", "Casual Leave Policy", {
    dependencies: "casual-leave-type",
    sortOrder: "20",
    payload: {
      code: "casual-leave-policy",
      name: "Casual Leave Policy",
      leave_type_item_key: "casual-leave-type",
      annual_entitlement: "12.00",
      min_days_per_request: "0.50",
      notice_days_required: 2,
      allow_half_day: true,
    },
  });
  await addItem(page, packCode, "shift", "general-shift", "General Shift", {
    sortOrder: "30",
    payload: {
      code: "general-shift",
      name: "General Shift",
      start_time: "09:00:00",
      end_time: "18:00:00",
      working_hours: "8.00",
      weekly_off_days: ["sunday"],
    },
  });
  await addItem(page, packCode, "holiday_calendar", "india-holidays-2026", "India Holidays 2026", {
    sortOrder: "40",
    payload: {
      code: "india-holidays-2026",
      name: "India Holidays 2026",
      year: 2026,
      holidays: [{ date: "2026-01-26", name: "Republic Day", holiday_type: "compulsory" }],
    },
  });
  await addItem(page, packCode, "attendance_policy", "office-attendance-policy", "Office Attendance Policy", {
    dependencies: "general-shift, india-holidays-2026",
    sortOrder: "50",
    payload: {
      code: "office-attendance-policy",
      name: "Office Attendance Policy",
      default_shift_item_key: "general-shift",
      holiday_calendar_item_key: "india-holidays-2026",
      full_day_min_hours: "8.00",
      half_day_min_hours: "4.00",
      allow_regularization: true,
      require_regularization_reason: true,
    },
  });
  await addLeaveType(page, packCode, "legacy-leave-type", "Legacy Leave", "60");
}

test.describe("Platform Admin setup templates deep regression", () => {
  test("certifies multi-item lifecycle, preview/apply reconciliation, tenant isolation, and version upgrade safety", async ({ page }) => {
    test.setTimeout(520_000);
    const runRef = uniqueRunRef();
    const tenantACode = `qa-deep-a-${runRef}`;
    const tenantBCode = `qa-deep-b-${runRef}`;
    const packCode = `qa-deep-pack-${runRef}`;
    const packName = `QA Deep Setup Pack ${runRef}`;

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 500) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantAId = await createTenantViaApi(page, tenantACode, `QA Deep Tenant A ${runRef}`);
    const tenantBId = await createTenantViaApi(page, tenantBCode, `QA Deep Tenant B ${runRef}`);
    expect(tenantAId).toBeTruthy();
    expect(tenantBId).toBeTruthy();

    await openSetupTemplates(page, tenantAId);
    await createTemplate(page, packCode, packName);
    await safeReload(page);

    await openTenantOnboarding(page, tenantAId);
    await addLeaveType(page, packCode, "temporary-leave-type", "Temporary Leave", "5");
    await openSetupTemplates(page, tenantAId);
    let applyCard = await selectTemplateInApplyCard(page, packCode);
    await applyCard.locator(".platform-template-preview__item").filter({ hasText: "temporary-leave-type" }).getByRole("button", { name: "Edit" }).click();
    const editForm = applyCard.locator(".platform-template-preview__edit-form");
    await namedControl(editForm, "name").fill("Temporary Leave Edited");
    await namedControl(editForm, "payload_name").fill("Temporary Leave Edited");
    await editForm.getByRole("button", { name: "Save item" }).click();
    await expect(notice(page).getByText("Setup template item updated.", { exact: true })).toBeVisible();
    await applyCard.locator(".platform-template-preview__item").filter({ hasText: "temporary-leave-type" }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete setup template item?" }).getByRole("button", { name: "Delete item" }).click();
    await expect(notice(page).getByText("Setup template item deleted.", { exact: true })).toBeVisible();

    await openTenantOnboarding(page, tenantAId);
    await addCompleteV1Items(page, packCode);
    await safeReload(page);
    await openSetupTemplates(page, tenantAId);
    applyCard = await selectTemplateInApplyCard(page, packCode);
    await expect(applyCard.getByText("Leave Type", { exact: true }).first()).toBeVisible();
    await expect(applyCard.getByText("Leave Policy", { exact: true }).first()).toBeVisible();
    await expect(applyCard.getByText("Shift", { exact: true }).first()).toBeVisible();
    await expect(applyCard.getByText("Holiday Calendar", { exact: true }).first()).toBeVisible();
    await expect(applyCard.getByText("Attendance Policy", { exact: true }).first()).toBeVisible();

    await openSetupTemplates(page, tenantAId);
    await publishTemplate(page, packCode);
    await safeReload(page);

    const v1Pack = await getPolicyPackByCode(page, packCode);
    const v1Item = v1Pack.items.find((item) => item.item_key === "casual-leave-type");
    expect(v1Item).toBeTruthy();
    const publishedPatch = await page.request.patch(`/api/platform-policy-packs/${v1Pack.id}/items/${v1Item?.id}`, {
      data: { name: "Should Not Mutate Published" },
    });
    expect(publishedPatch.status()).toBe(400);
    expect(await publishedPatch.text()).toContain("Published or archived setup templates cannot be changed");
    const publishedCreate = await page.request.post(`/api/platform-policy-packs/${v1Pack.id}/items`, {
      data: {
        item_type: "leave_type",
        item_key: "blocked-after-publish",
        name: "Blocked After Publish",
        payload: { code: "blocked-after-publish", name: "Blocked After Publish" },
      },
    });
    expect(publishedCreate.status()).toBe(400);
    const publishedDelete = await page.request.delete(`/api/platform-policy-packs/${v1Pack.id}/items/${v1Item?.id}`);
    expect(publishedDelete.status()).toBe(400);

    applyCard = await selectTemplateInApplyCard(page, packCode);
    const publishedItem = applyCard.locator(".platform-template-preview__item").filter({ hasText: "casual-leave-type" }).first();
    await expect(publishedItem.getByRole("button", { name: "Edit" })).toBeDisabled();
    await expect(publishedItem.getByRole("button", { name: "Delete" })).toBeDisabled();
    await applyCard.getByRole("button", { name: "Preview impact" }).click();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("6 create", { exact: true })).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply template" }).click();
    await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("6 created", { exact: true })).toBeVisible();
    await safeReload(page);

    applyCard = await selectTemplateInApplyCard(page, packCode);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Manual review", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("6 unchanged", { exact: true })).toBeVisible();
    await expect(applyCard.getByRole("button", { name: "Apply upgrade" })).toBeDisabled();

    await openSetupTemplates(page, tenantBId);
    applyCard = await selectTemplateInApplyCard(page, packCode);
    await namedControl(applyCard, "adoption_mode").selectOption("baseline_only");
    await applyCard.getByRole("button", { name: "Preview impact" }).click();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("6 evidence only", { exact: true })).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply template" }).click();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("6 evidence only", { exact: true })).toBeVisible();

    await openSetupTemplates(page, tenantAId);
    const setupCard = card(page, "Setup templates");
    await namedControl(setupCard, "policy_pack_search").fill(packCode);
    await setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "New version" }).click();
    await page.getByRole("dialog", { name: "Create a new draft version?" }).getByRole("button", { name: "Create version" }).click();
    await expect(notice(page).getByText("New draft template version created.", { exact: true })).toBeVisible();
    await safeReload(page);

    const v2Code = `${packCode}-v2`;
    applyCard = await selectTemplateInApplyCard(page, v2Code);
    await applyCard
      .locator(".platform-template-preview__item")
      .filter({ has: page.getByText("Leave Type - casual-leave-type", { exact: true }) })
      .getByRole("button", { name: "Edit" })
      .click();
    const v2EditForm = applyCard.locator(".platform-template-preview__edit-form");
    await namedControl(v2EditForm, "name").fill("Casual Leave v2");
    await namedControl(v2EditForm, "payload_name").fill("Casual Leave v2");
    await v2EditForm.getByRole("button", { name: "Save item" }).click();
    await expect(notice(page).getByText("Setup template item updated.", { exact: true })).toBeVisible();
    await applyCard.locator(".platform-template-preview__item").filter({ hasText: "legacy-leave-type" }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete setup template item?" }).getByRole("button", { name: "Delete item" }).click();
    await expect(notice(page).getByText("Setup template item deleted.", { exact: true })).toBeVisible();

    await openTenantOnboarding(page, tenantAId);
    await addLeaveType(page, v2Code, "sick-leave-type", "Sick Leave", "70");
    await openSetupTemplates(page, tenantAId);
    await publishTemplate(page, v2Code);
    await safeReload(page);

    applyCard = await selectTemplateInApplyCard(page, v2Code);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Upgradeable", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("1 add", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("1 change", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("1 remove", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("4 unchanged", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("Target version changes: name, payload.")).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply upgrade" }).click();
    await expect(notice(page).getByText("Setup template upgrade applied.", { exact: true })).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("1 created", { exact: true })).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("1 updated", { exact: true })).toBeVisible();
    await expect(applyCard.locator(".platform-adoption-preview__counts").getByText("5 skipped", { exact: true })).toBeVisible();

    await safeReload(page);
    applyCard = await selectTemplateInApplyCard(page, v2Code);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Manual review", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("6 unchanged", { exact: true })).toBeVisible();
    await expect(applyCard.getByRole("button", { name: "Apply upgrade" })).toBeDisabled();

    await openSetupTemplates(page, tenantBId);
    applyCard = await selectTemplateInApplyCard(page, v2Code);
    await applyCard.getByRole("button", { name: "Compare version" }).click();
    await expect(applyCard.getByText("Tenant is on")).toContainText("v1");
    await expect(applyCard.getByText("1 add", { exact: true })).toBeVisible();
    await expect(applyCard.getByText("1 change", { exact: true })).toBeVisible();
    await openSetupTemplates(page, tenantAId);
    await openSetupTemplates(page, tenantBId);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.url()).toContain(`tenantId=${tenantAId}`);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.url()).toContain(`tenantId=${tenantBId}`);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    expect(consoleErrors.filter((message) => !message.includes("favicon")).join("\n")).toBe("");
    expect(failedRequests.join("\n")).toBe("");
  });

  test("certifies negative validation, draft adoption denial, invalid URLs, and non-platform access", async ({ page }) => {
    test.setTimeout(300_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-deep-neg-${runRef}`;
    const packCode = `qa-deep-neg-pack-${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantId = await createTenantViaApi(page, tenantCode, `QA Deep Negative Tenant ${runRef}`);
    await openSetupTemplates(page, tenantId);
    await createTemplate(page, packCode, `QA Deep Negative Pack ${runRef}`);
    await safeReload(page);
    await openTenantOnboarding(page, tenantId);

    const addCard = card(page, "Add template item");
    await fillCommonItem(addCard, packCode, "leave_type", "bad-json-type", "Bad JSON Type");
    await fillRuntimeBasics(addCard, "bad-json-type", "Bad JSON Type");
    await fillAdvancedPayload(addCard, { code: "bad-json-type", name: "Bad JSON Type" });
    await namedControl(addCard, "payload").fill("{ bad json");
    await addCard.getByRole("button", { name: "Add item" }).click();
    await expect(notice(page).getByText("Item payload must be valid JSON.", { exact: true })).toBeVisible();

    await addLeaveType(page, packCode, "base-leave-type", "Base Leave", "10");
    await fillCommonItem(addCard, packCode, "leave_policy", "bad-policy", "Bad Policy", { sortOrder: "20" });
    await fillRuntimeBasics(addCard, "bad-policy", "Bad Policy");
    await namedControl(addCard, "payload_leave_type_item_key").fill("missing-leave-type");
    await fillAdvancedPayload(addCard, {
      code: "bad-policy",
      name: "Bad Policy",
      leave_type_item_key: "missing-leave-type",
      annual_entitlement: "1.00",
    });
    await addCard.getByRole("button", { name: "Add item" }).click();
    await expect(notice(page).getByText(/leave_type_item_key must reference an existing Leave Type item/)).toBeVisible();

    await fillCommonItem(addCard, packCode, "leave_type", "self-dependent-type", "Self Dependent", {
      dependencies: "self-dependent-type",
      sortOrder: "30",
    });
    await fillAdvancedPayload(addCard, {
      code: "self-dependent-type",
      name: "Self Dependent",
      category: "paid",
      unit: "day",
    });
    await addCard.getByRole("button", { name: "Add item" }).click();
    await expect(notice(page).getByText(/An item cannot depend on itself/)).toBeVisible();

    await openSetupTemplates(page, tenantId);
    const draftApplyCard = await selectTemplateInApplyCard(page, packCode);
    await expect(draftApplyCard.getByRole("button", { name: "Preview impact" })).toBeDisabled();
    await expect(draftApplyCard.getByRole("button", { name: "Apply template" })).toBeDisabled();
    const draftPack = await getPolicyPackByCode(page, packCode);
    const draftPreview = await page.request.post(`/api/platform-policy-packs/${draftPack.id}/adoption-preview/`, {
      data: { tenant_id: tenantId, adoption_mode: "clone_to_tenant_records" },
    });
    expect(draftPreview.status()).toBe(400);
    expect(await draftPreview.text()).toContain("Only published policy packs can be previewed for adoption");
    const draftAdopt = await page.request.post(`/api/platform-policy-packs/${draftPack.id}/adopt-for-tenant/`, {
      data: { tenant_id: tenantId, adoption_mode: "clone_to_tenant_records" },
    });
    expect(draftAdopt.status()).toBe(400);
    expect(await draftAdopt.text()).toContain("Only published policy packs can be adopted");

    const invalidPackResponse = await page.request.post("/api/platform-policy-packs/00000000-0000-0000-0000-000000000000/adoption-preview/", {
      data: { tenant_id: tenantId, adoption_mode: "clone_to_tenant_records" },
    });
    expect(invalidPackResponse.status()).toBe(404);
    expect(await invalidPackResponse.text()).toContain("Policy pack not found");

    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await gotoAuthenticated(page, `/platform-admin/policy-packs?tenantId=${tenantId}`, hrAdmin);
    await expect(page).not.toHaveURL(/\/platform-admin\/policy-packs/);
  });
});
