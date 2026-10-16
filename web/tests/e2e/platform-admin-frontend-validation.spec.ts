import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

async function gotoPlatformAdminDemo(page: Page, path: string) {
  if (process.env.HRMS_API_BASE_URL) {
    const tenantId = process.env.PLAYWRIGHT_PLATFORM_TENANT_ID;
    const separator = path.includes("?") ? "&" : "?";
    await gotoAuthenticated(page, tenantId ? `${path}${separator}tenantId=${tenantId}` : path, platformAdmin);
    return;
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: origin,
    },
  ]);
  await page.goto(path, { waitUntil: "networkidle" });
}

function field(scope: Page | Locator, label: string) {
  return scope.locator(`label.form-field:has(span:text-is("${label.replaceAll('"', '\\"')}"))`).locator("input, select, textarea").first();
}

async function ensureAdminContactAvailable(page: Page) {
  if (await page.getByRole("button", { name: "Edit" }).first().isVisible()) {
    return;
  }

  const tenantHref = await page
    .locator("a[href*='tenantId=']")
    .first()
    .getAttribute("href");
  const tenantId = new URL(page.url()).searchParams.get("tenantId") ?? new URL(tenantHref ?? "", page.url()).searchParams.get("tenantId");
  expect(tenantId, "Expected selected platform tenant for admin contact setup.").toBeTruthy();
  const timestamp = Date.now();
  const response = await page.request.post(`/api/platform/tenants/${tenantId}/admin-contacts`, {
    data: {
      full_name: "QA Platform Contact",
      email: `qa.platform.contact.${timestamp}@example.com`,
      phone_number: "",
      job_title: "Tenant admin",
      is_primary: true,
      notes: "Created by Playwright validation setup.",
    },
  });
  const payload = await response.json().catch(() => ({}));
  await expect(
    response.ok(),
    `Admin contact setup failed with status ${response.status()}: ${JSON.stringify(payload)}`,
  ).toBeTruthy();
  await page.reload({ waitUntil: "networkidle" });
}

const launchBlueprint = {
  ref: "demo-blueprint",
  version: "1",
  label: "Demo India Launch",
  country_code: "IN",
  industry_refs: ["general"],
  minimum_plan: "starter",
  compatible_plans: ["starter", "growth", "enterprise"],
  workforce_model: "office",
  payroll_scope: "configuration_only",
  summary: "Demo launch blueprint",
  required_inputs: ["default_branch"],
  input_schema: [
    {
      key: "default_branch",
      label: "Default branch",
      group: "Organization Structure",
      field_type: "text",
      help_text: "Required branch name for setup evidence.",
      owner_role: "platform_admin",
      placeholder: "Bengaluru HQ",
      example: "Bengaluru HQ",
      required: true,
      sensitive: false,
      choices: [],
    },
  ],
  recommended_for: ["Demo tenants"],
  modules: [
    {
      ref: "leave_attendance",
      label: "Leave and attendance",
      title: "Leave and attendance",
      minimum_plan: "starter",
      ownership_mode: "tenant_editable",
      post_onboarding_owner: "Tenant Admin",
      editable_by_roles: ["tenant-admin"],
      customer_editable_after_handoff: true,
      required_inputs: ["default_branch"],
      child_seeder: "leave_attendance",
      description: "Creates safe leave and attendance defaults.",
      ui_status: "planned",
      safe_apply_enabled: true,
      apply_allowed: true,
      plan_allowed: true,
      missing_inputs: [],
    },
  ],
  compatibility: {
    country_matches: true,
    plan_allowed: true,
    included_module_count: 1,
    plan_gated_module_count: 0,
    safe_apply_module_count: 1,
  },
};

function launchApplyRun() {
  return {
    id: "demo-apply-run",
    tenant_id: "demo-platform-tenant",
    blueprint_ref: launchBlueprint.ref,
    blueprint_version: launchBlueprint.version,
    subscription_plan: "growth",
    run_type: "apply",
    status: "succeeded",
    requested_by_identifier: "playwright",
    idempotency_key: "demo-apply",
    started_at: null,
    finished_at: null,
    input_payload: {},
    plan_snapshot: {},
    result_payload: {},
    errors: [],
    evidence: {},
    seeded_items: [],
    created_at: "2026-10-07T00:00:00.000Z",
    updated_at: "2026-10-07T00:00:00.000Z",
  };
}

async function routeLaunchFixtures(page: Page, options: { hasApplyEvidence?: boolean } = {}) {
  await page.route("**/api/platform/launch-blueprints**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([launchBlueprint]) });
  });
  await page.route("**/api/platform/tenants/*/launch-runs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(options.hasApplyEvidence ? [launchApplyRun()] : []),
    });
  });
  await page.route("**/api/platform/tenants/*/launch-certification-report", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tenant_id: "demo-platform-tenant",
        tenant_code: "northstar-foods",
        status: "fail",
        blueprint_ref: launchBlueprint.ref,
        blueprint_version: launchBlueprint.version,
        subscription_plan: "growth",
        blocker_count: 0,
        warning_count: 0,
        info_count: 0,
        checks: [],
        blockers: [],
        warnings: [],
        info: [],
        latest_baseline_run_id: "",
        latest_drift_run_id: "",
        generated_at: "2026-10-07T00:00:00.000Z",
      }),
    });
  });
}

test.describe("Platform admin frontend validation", () => {
  test("tenant creation gives immediate feedback and recovers after a network failure", async ({ page }, testInfo) => {
    let apiCalls = 0;
    await page.route("**/api/platform/tenants", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 750));
      if (apiCalls === 1) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "smoothness-proof-tenant", code: "smoothness-proof", name: "Smoothness Proof" }),
      });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/tenants");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Tenants");

    await page.getByRole("button", { name: "Create tenant" }).click();
    const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
    await dialog.getByLabel("Code").fill("smoothness-proof");
    await dialog.getByLabel("Name", { exact: true }).fill("Smoothness Proof");

    const submit = dialog.getByRole("button", { name: "Create tenant" });
    const idleBox = await submit.boundingBox();
    const startedAt = Date.now();
    await submit.click();
    await expect(dialog.getByRole("button", { name: "Creating..." })).toBeDisabled();
    const feedbackLatencyMs = Date.now() - startedAt;
    expect(feedbackLatencyMs, "Pending feedback should appear without waiting for the API response.").toBeLessThan(500);
    const pendingBox = await dialog.getByRole("button", { name: "Creating..." }).boundingBox();
    const widthShiftPixels = Math.abs((pendingBox?.width ?? 0) - (idleBox?.width ?? 0));
    const heightShiftPixels = Math.abs((pendingBox?.height ?? 0) - (idleBox?.height ?? 0));
    expect(widthShiftPixels, "Pending label should not materially shift the action layout.").toBeLessThanOrEqual(8);
    expect(heightShiftPixels, "Pending label should not shift the action layout.").toBeLessThanOrEqual(1);
    await dialog.getByRole("button", { name: "Creating..." }).click({ force: true });

    await expect(page.locator(".platform-feedback[role='alert']")).toContainText("Tenant creation failed. Check your connection and try again.");
    await expect(submit).toBeEnabled();
    await expect(dialog.getByLabel("Code")).toHaveValue("smoothness-proof");
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue("Smoothness Proof");
    expect(apiCalls).toBe(1);

    await submit.click();
    await expect(dialog.getByRole("button", { name: "Creating..." })).toBeDisabled();
    await expect(dialog).toBeHidden();
    expect(apiCalls).toBe(2);

    await testInfo.attach("interaction-metrics.json", {
      body: JSON.stringify({ apiDelayMs: 750, feedbackLatencyMs, duplicateRequests: 0, widthShiftPixels, heightShiftPixels, recoveredAfterFailure: true, successfulRetry: true }, null, 2),
      contentType: "application/json",
    });
    console.info("UI_SMOOTHNESS_METRICS", JSON.stringify({ apiDelayMs: 750, feedbackLatencyMs, duplicateRequests: 0, widthShiftPixels, heightShiftPixels }));
  });

  test("tenant create dialog blocks required tenant fields before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/tenants", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/tenants");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Tenants");

    await page.getByRole("button", { name: "Create tenant" }).click();
    const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Code").fill("");
    await dialog.getByLabel("Name", { exact: true }).fill("");
    await dialog.getByLabel("Primary email").fill("not-email");
    await dialog.getByRole("button", { name: "Create tenant" }).click();

    await expect(dialog.getByText("Tenant code is required.")).toBeVisible();
    await expect(dialog.getByText("Tenant name is required.")).toBeVisible();
    await expect(dialog.getByText("Primary email must be a valid email address.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("admin contact dialog blocks missing identity before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/tenants/*/admin-contacts", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/admins");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Admin Access");

    await page.getByRole("button", { name: "Add contact" }).click();
    const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await expect(dialog).toBeVisible();
    await field(dialog, "Full name").fill("");
    await field(dialog, "Email").fill("not-email");
    await dialog.getByRole("button", { name: "Add contact" }).click();

    await expect(dialog.getByText("Admin contact full name is required.")).toBeVisible();
    await expect(dialog.getByText("Admin contact email must be valid.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("setup template create blocks required and numeric fields before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform-policy-packs", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/policy-packs");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Setup Templates");

    const form = page.locator("form.platform-template-create-form");
    await expect(form).toBeVisible();
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Version").fill("0");
    await form.getByRole("button", { name: "Create template" }).click();

    await expect(form.getByText("Template code is required.")).toBeVisible();
    await expect(form.getByText("Template name is required.")).toBeVisible();
    await expect(form.getByText("Template version must be a whole number greater than or equal to 1.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("lead conversion blocks missing tenant code before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/leads/*/convert", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/leads");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Leads");

    const form = page.locator("form.platform-lead-convert-form").first();
    await expect(form).toBeVisible();
    await field(form, "Tenant code").fill("");
    await form.getByRole("button", { name: "Convert lead" }).click();

    await expect(form.getByText("Tenant code is required before converting a lead.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("tenant setup blocks missing name and invalid primary email before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/tenants/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/onboarding");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Launch Readiness");

    const form = page.locator("form.platform-tenant-setup-form");
    await expect(form).toBeVisible();
    await field(form, "Name").fill("");
    await field(form, "Primary email").fill("not-email");
    await form.getByRole("button", { name: "Save tenant" }).click();

    await expect(form.getByText("Tenant name is required.")).toBeVisible();
    await expect(form.getByText("Primary email must be a valid email address.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("onboarding metadata blocks missing required context before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/tenants/*/onboarding", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/onboarding");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Launch Readiness");

    const form = page.locator("form.platform-onboarding-metadata-form");
    await expect(form).toBeVisible();
    await field(form, "Country context").fill("");
    await field(form, "Industry").fill("");
    await form.getByRole("button", { name: "Save onboarding" }).click();

    await expect(form.getByText("Country context is required.")).toBeVisible();
    await expect(form.getByText("Industry context is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("admin contact edit blocks invalid identity before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/admin-contacts/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/admins");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Admin Access");
    await ensureAdminContactAvailable(page);

    await page.getByRole("button", { name: "Edit" }).first().click();
    const form = page.locator("form.platform-contact-edit-form");
    await expect(form).toBeVisible();
    await field(form, "Full name").fill("");
    await field(form, "Email").fill("not-email");
    await form.getByRole("button", { name: "Save contact" }).click();

    await expect(form.getByText("Admin contact full name is required.")).toBeVisible();
    await expect(form.getByText("Admin contact email must be valid.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("tenant admin provisioning blocks missing username before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/admin-contacts/*/provision-user", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/admins");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Admin Access");
    await ensureAdminContactAvailable(page);

    const form = page.locator("form.platform-admin-provision-form");
    await expect(form).toBeVisible();
    await field(form, "Username").fill("");
    await form.getByRole("button", { name: "Create login access" }).click();

    await expect(form.getByText("Username is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("launch preview blocks missing required launch input before API", async ({ page }) => {
    let apiCalls = 0;
    await routeLaunchFixtures(page);
    await page.route("**/api/platform/tenants/*/launch-preview", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/launch");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Launch Blueprint");

    await field(page, "Default branch").fill("");
    await page.getByRole("button", { name: "Preview launch plan" }).click();

    await expect(page.getByText("Default branch is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("customer handoff blocks missing handoff notes before API", async ({ page }) => {
    let apiCalls = 0;
    await routeLaunchFixtures(page, { hasApplyEvidence: true });
    await page.route("**/api/platform/tenants/*/launch-handoff", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/launch");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Launch Blueprint");

    await field(page, "Handoff notes").fill("");
    await page.getByRole("button", { name: "Complete customer handoff" }).click();

    await expect(page.getByText("Handoff notes are required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("permission catalog keeps keys read-only and blocks missing edit fields before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/platform/permission-catalog/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoPlatformAdminDemo(page, "/platform-admin/permissions");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Permission Catalog");

    const row = page.locator(".platform-permission-row").first();
    await expect(row).toBeVisible();
    const permissionKey = (await row.locator("code").first().innerText()).trim();
    await row.getByRole("button", { name: "Edit" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit platform permission" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(permissionKey)).toBeVisible();
    await expect(dialog.getByText("Keys are immutable.")).toBeVisible();
    await expect(dialog.getByLabel("Key")).toHaveCount(0);

    await dialog.getByLabel("Label").fill("");
    await dialog.getByLabel("Module", { exact: true }).fill("");
    await dialog.getByRole("button", { name: "Save permission" }).click();

    await expect(dialog.getByText("Permission label is required.")).toBeVisible();
    await expect(dialog.getByText("Module is required.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
