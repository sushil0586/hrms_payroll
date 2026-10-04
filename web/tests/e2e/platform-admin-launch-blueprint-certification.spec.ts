import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

async function tenantIdByCode(page: Page, tenantCode: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  return tenants.find((tenant) => tenant.code === tenantCode)?.id ?? "";
}

async function createTenantViaApi(page: Page, tenantCode: string, tenantName: string, subscriptionPlan = "starter") {
  const response = await page.request.post("/api/platform/tenants", {
    data: {
      code: tenantCode,
      name: tenantName,
      legal_name: `${tenantName} Pvt Ltd`,
      primary_email: `ops.${tenantCode}@example.test`,
      primary_domain: `${tenantCode}.example.test`,
      subscription_plan: subscriptionPlan,
      seed_pack: "standard_office",
      timezone: "Asia/Kolkata",
      country_code: "IN",
      is_sandbox: true,
    },
  });
  expect(response.ok()).toBeTruthy();
  return tenantIdByCode(page, tenantCode);
}

async function openLaunchBlueprint(page: Page, tenantId: string) {
  await page.goto(`/platform-admin/launch?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expectPageReady(page, "Launch Blueprint");
  await expect(page.getByTestId("platform-launch-blueprint-panel")).toBeVisible();
}

test.describe("Platform Admin launch blueprint certification", () => {
  test.describe.configure({ mode: "serial" });

  test("certifies India blueprint preview, missing input guardrail, safe apply, and evidence", async ({ page }) => {
    test.setTimeout(180_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-launch-${runRef}`;
    const tenantName = `QA Launch Tenant ${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantId = await createTenantViaApi(page, tenantCode, tenantName);
    expect(tenantId).toBeTruthy();

    await openLaunchBlueprint(page, tenantId);
    await expect(page.getByRole("link", { name: /Launch Blueprint/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /India Standard SME/i })).toBeVisible();
    await expect(page.getByText("Tenant launch status")).toBeVisible();

    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText("Launch preview completed.")).toBeVisible();
    await expect(page.getByText("Needs inputs", { exact: true }).first()).toBeVisible();
    const missingInputs = page.locator(".platform-validation-strip").first();
    await expect(missingInputs).toContainText("Registered Address");
    await expect(missingInputs).toContainText("Default Branch");
    await expect(page.getByRole("button", { name: "Apply safe launch setup" })).toBeDisabled();

    await page.getByLabel("Registered address").fill("Indiranagar, Bengaluru, Karnataka 560038");
    await page.getByLabel("Default branch").fill("Bengaluru");
    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText("Apply-ready")).toBeVisible();
    await expect(page.getByText("Will configure now")).toBeVisible();
    await expect(page.getByText("Roles and Users", { exact: true })).toBeVisible();
    await expect(page.getByText("Document Requirements", { exact: true })).toBeVisible();
    await expect(page.getByText("Approval Workflows", { exact: true })).toBeVisible();
    await expect(page.getByText("Notification Templates", { exact: true })).toBeVisible();
    await expect(page.getByText("Production payroll", { exact: true })).toBeVisible();
    await expect(page.getByText("Not live", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Apply safe launch setup" }).click();
    await expect(page.getByText("Certified safe launch setup applied.")).toBeVisible();
    await expect(page.getByText("Apply - Succeeded")).toBeVisible();
    await expect(page.getByText(/Applied: .*roles_users/)).toBeVisible();
    await expect(page.getByText(/Applied: .*documents/)).toBeVisible();
    await expect(page.getByText(/Applied: .*leave_attendance/)).toBeVisible();
    await expect(page.getByText(/Applied: .*workflows/)).toBeVisible();
    await expect(page.getByText(/Applied: .*notifications/)).toBeVisible();
    await expect(page.getByText(/Applied: .*org_masters/)).toBeVisible();
    await expect(page.getByText(/Applied: .*launch_checklist/)).toBeVisible();

    await page.getByRole("button", { name: "Complete customer handoff" }).click();
    await expect(page.getByText("This field may not be blank.")).toBeVisible();
    await page.getByLabel("Handoff notes").fill("Tenant admin briefed. Customer owns org masters, employee import, and gated payroll setup.");
    await page.getByRole("button", { name: "Complete customer handoff" }).click();
    await expect(page.locator(".platform-feedback").getByText("Customer handoff completed.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("platform-launch-blueprint-panel").getByText("Customer Ready", { exact: true })).toBeVisible();

    await page.getByLabel("Default branch").fill("Mumbai");
    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText(/A change reason is required after safe launch setup has been applied/)).toBeVisible();
    await page.getByLabel("Change reason").fill("Customer changed the launch default branch before handoff.");
    await page.getByRole("button", { name: "Preview launch plan" }).click();
    await expect(page.getByText("Launch preview completed.")).toBeVisible();
    await expect(page.getByText("Change control active")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test("certifies Growth payroll defaults and blocked provider placeholders", async ({ page }) => {
    test.setTimeout(180_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-launch-growth-${runRef}`;
    const tenantName = `QA Growth Launch ${runRef}`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const tenantId = await createTenantViaApi(page, tenantCode, tenantName, "growth");
    expect(tenantId).toBeTruthy();

    await openLaunchBlueprint(page, tenantId);
    await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /India Standard SME/i }).click();

    await page.getByLabel("Registered address").fill("HSR Layout, Bengaluru, Karnataka 560102");
    await page.getByLabel("Default branch").fill("Bengaluru");
    await page.getByRole("button", { name: "Preview launch plan" }).click();

    await expect(page.getByText("Apply-ready")).toBeVisible();
    await expect(page.getByText("Payroll Defaults", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Provider Placeholders", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Configuration only", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Safe but blocked", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Blocked after apply", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Production payroll", { exact: true })).toBeVisible();
    await expect(page.getByText("Not live", { exact: true })).toBeVisible();
    await expect(page.getByText(/No payroll runs or employee salary assignments are created/).first()).toBeVisible();
    await expect(page.getByText(/live submissions remain off/).first()).toBeVisible();

    await page.getByRole("button", { name: "Apply safe launch setup" }).click();
    await expect(page.getByText("Certified safe launch setup applied.")).toBeVisible();
    await expect(page.getByText("Apply - Succeeded")).toBeVisible();
    await expect(page.getByText(/Applied: .*payroll_defaults/)).toBeVisible();
    await expect(page.getByText(/Applied: .*provider_placeholders/)).toBeVisible();
    await expect(page.getByText("Payroll defaults evidence", { exact: true })).toBeVisible();
    await expect(page.getByText("Provider placeholders evidence", { exact: true })).toBeVisible();
    await expect(page.getByText(/3 blocked provider lanes/)).toBeVisible();
    await expect(page.getByText(/3 draft mapping packs/)).toBeVisible();
    await expect(page.getByText(/No real credentials, certification runs, provider jobs, deliveries, or live submissions created/)).toBeVisible();

    const runsResponse = await page.request.get(`/api/platform/tenants/${tenantId}/launch-runs`);
    expect(runsResponse.ok()).toBeTruthy();
    const runs = (await runsResponse.json()) as Array<{ run_type: string; result_payload?: { applied_modules?: string[]; safe_apply_modules?: string[] } }>;
    const applyRun = runs.find((run) => run.run_type === "apply");
    expect(applyRun?.result_payload?.applied_modules ?? []).toContain("payroll_defaults");
    expect(applyRun?.result_payload?.applied_modules ?? []).toContain("provider_placeholders");
    expect(applyRun?.result_payload?.safe_apply_modules ?? []).toContain("provider_placeholders");

    await expectNoHorizontalOverflow(page);
  });
});
