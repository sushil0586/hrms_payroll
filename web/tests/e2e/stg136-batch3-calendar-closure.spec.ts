import { appendFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, requestWithBrowserSession } from "../helpers/staging-auth";

type Resource = { id: string; code: string; [key: string]: unknown };

const suffix = (process.env.STG136_BATCH3_RUN_REF ?? Date.now().toString(36)).toUpperCase();
const evidencePath = process.env.STG136_BATCH3_EVIDENCE_PATH;

function record(scenarioId: string, evidence: Record<string, unknown>) {
  if (!evidencePath) return;
  appendFileSync(evidencePath, `${JSON.stringify({ scenario_id: scenarioId, recorded_at: new Date().toISOString(), ...evidence })}\n`, { mode: 0o600 });
}

function formField(scope: Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function browserApi(page: Page, path: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
  const result = await requestWithBrowserSession(page, path, init);
  return { ...result, payload: JSON.parse(result.body || "{}") as unknown };
}

async function directApi(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const base = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8020/api/v1";
  const response = await page.request.fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Token ${token}`, ...(data === undefined ? {} : { "content-type": "application/json" }) },
    data,
  });
  return { response, payload: await response.json().catch(() => ({})) as Record<string, unknown> };
}

async function openPayrollTab(page: Page, name: RegExp) {
  await page.getByRole("navigation", { name: "Payroll setup action groups" }).getByRole("button", { name }).click();
}

test.describe.serial("STG-136 Batch 3 calendar closure", () => {
  test.setTimeout(180_000);

  test("STG-E2E-0305 configures a tenant-owned leave-year period and policy scope", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-year", hrAdmin);
    await expectPageReady(page, "Leave-year control");

    const periodCode = `STG3-LY-${suffix}`;
    const policy = page.getByLabel("Leave policy");
    const legalEntity = page.getByLabel("Legal entity scope");
    const policyId = await policy.locator("option:not([value=''])").first().getAttribute("value");
    const legalEntityId = await legalEntity.locator("option:not([value=''])").first().getAttribute("value");
    expect(policyId).toBeTruthy();
    expect(legalEntityId).toBeTruthy();

    await policy.selectOption(policyId!);
    await legalEntity.selectOption(legalEntityId!);
    await page.getByPlaceholder("FY-2027").fill(periodCode);
    await page.locator("input[name='start_date']").fill("2029-04-01");
    await page.locator("input[name='end_date']").fill("2030-03-31");
    await page.getByLabel("Initial state").selectOption("open");
    const createResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/leave-year/periods") && response.request().method() === "POST" && response.status() !== 308);
    await page.getByRole("button", { name: "Create period" }).click();
    expect((await createResponse).status()).toBe(201);
    await expect(page.getByRole("status").getByText("Leave-year period created.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: periodCode })).toContainText("2029-04-01 to 2030-03-31");

    const snapshot = await browserApi(page, "/api/hr-admin/leave-year/periods/");
    expect(snapshot.status).toBe(200);
    const created = (snapshot.payload as Resource[]).find((item) => item.code === periodCode);
    expect(created).toBeTruthy();
    expect(created?.leave_policy_id).toBe(policyId);
    expect(created?.legal_entity_id).toBe(legalEntityId);
    expect((created?.policy_snapshot as Record<string, unknown>).policy_id).toBe(policyId);

    await policy.selectOption(policyId!);
    await legalEntity.selectOption(legalEntityId!);
    await page.getByPlaceholder("FY-2027").fill(`${periodCode}-OVERLAP`);
    await page.locator("input[name='start_date']").fill("2030-01-01");
    await page.locator("input[name='end_date']").fill("2030-12-31");
    const overlapResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/leave-year/periods") && response.request().method() === "POST" && response.status() !== 308);
    await page.getByRole("button", { name: "Create period" }).click();
    expect((await overlapResponse).status()).toBe(409);
    await expect(page.getByRole("alert").filter({ hasText: "overlaps or duplicates" })).toBeVisible();

    const foreignEntityId = process.env.STG136_BATCH3_FOREIGN_LEGAL_ENTITY_ID;
    expect(foreignEntityId).toBeTruthy();
    const crossTenant = await directApi(page, "/hr-admin/leave-year/periods/", "POST", {
      leave_policy_id: policyId,
      legal_entity_id: foreignEntityId,
      code: `${periodCode}-FOREIGN`,
      start_date: "2031-04-01",
      end_date: "2032-03-31",
      status: "planned",
    });
    expect(crossTenant.response.status()).toBe(400);

    record("STG-E2E-0305", {
      resources: [{ type: "leave_policy_period", id: created!.id, code: periodCode }],
      tenant_scope: { leave_policy_id: policyId, legal_entity_id: legalEntityId },
      policy_snapshot: created!.policy_snapshot,
      overlap_status: 409,
      cross_tenant_status: 400,
    });
  });

  test("STG-E2E-0306 configures a matching payroll calendar, period, and pay group", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-setup?tab=actions", hrAdmin);
    await expectPageReady(page, "Payroll Setup");

    const calendarCode = `STG3-CAL-${suffix}`;
    const periodCode = `STG3-PER-${suffix}`;
    const groupCode = `STG3-GRP-${suffix}`;
    const calendarForm = page.getByTestId("payroll-calendar-form");
    await formField(calendarForm, "Code").fill(calendarCode);
    await formField(calendarForm, "Name").fill(`STG3 Calendar ${suffix}`);
    await formField(calendarForm, "Frequency").selectOption("monthly");
    await formField(calendarForm, "Timezone").fill("Asia/Kolkata");
    await formField(calendarForm, "Currency code").fill("INR");
    await formField(calendarForm, "Period start day").fill("1");
    await formField(calendarForm, "Config profile reference").fill("stg136.batch3.calendar.v1");
    const calendarResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/payroll-calendars") && response.request().method() === "POST" && response.status() !== 308);
    await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    expect((await calendarResponse).status()).toBe(201);

    const calendarList = await directApi(page, "/hr-admin/payroll-calendars/");
    expect(calendarList.response.status()).toBe(200);
    const calendar = (calendarList.payload as unknown as Resource[]).find((item) => item.code === calendarCode);
    expect(calendar).toBeTruthy();

    await openPayrollTab(page, /Periods/);
    const periodForm = page.getByTestId("payroll-period-form");
    await formField(periodForm, "Calendar").selectOption(calendar!.id);
    await formField(periodForm, "Code").fill(periodCode);
    await formField(periodForm, "Name").fill(`STG3 Period ${suffix}`);
    await formField(periodForm, "Start date").fill("2029-04-01");
    await formField(periodForm, "End date").fill("2029-04-30");
    await formField(periodForm, "Pay date").fill("2029-05-02");
    await formField(periodForm, "Status").selectOption("open");
    await formField(periodForm, "Config profile reference").fill("stg136.batch3.period.v1");
    const periodResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/payroll-periods") && response.request().method() === "POST" && response.status() !== 308);
    await periodForm.getByRole("button", { name: "Create period" }).click();
    expect((await periodResponse).status()).toBe(201);

    const periodList = await directApi(page, "/hr-admin/payroll-periods/");
    expect(periodList.response.status()).toBe(200);
    const period = (periodList.payload as unknown as Resource[]).find((item) => item.code === periodCode);
    expect(period).toBeTruthy();
    expect(period?.calendar_id).toBe(calendar!.id);

    await openPayrollTab(page, /Pay groups/);
    const groupForm = page.getByTestId("pay-group-form");
    const legalEntityId = await formField(groupForm, "Legal entity").locator("option:not([value=''])").first().getAttribute("value");
    expect(legalEntityId).toBeTruthy();
    await formField(groupForm, "Calendar").selectOption(calendar!.id);
    await formField(groupForm, "Code").fill(groupCode);
    await formField(groupForm, "Name").fill(`STG3 Pay Group ${suffix}`);
    await formField(groupForm, "Status").selectOption("active");
    await formField(groupForm, "Default currency code").fill("INR");
    await formField(groupForm, "Legal entity").selectOption(legalEntityId!);
    await formField(groupForm, "Config profile reference").fill("stg136.batch3.paygroup.v1");
    const groupResponse = page.waitForResponse((response) => response.url().includes("/api/hr-admin/pay-groups") && response.request().method() === "POST" && response.status() !== 308);
    await groupForm.getByRole("button", { name: "Create pay group" }).click();
    expect((await groupResponse).status()).toBe(201);

    const groupList = await directApi(page, "/hr-admin/pay-groups/");
    expect(groupList.response.status()).toBe(200);
    const group = (groupList.payload as unknown as Resource[]).find((item) => item.code === groupCode);
    expect(group).toBeTruthy();
    expect(group?.calendar_id).toBe(calendar!.id);
    expect(group?.legal_entity_id).toBe(legalEntityId);

    const foreignCalendarId = process.env.STG136_BATCH3_FOREIGN_PAYROLL_CALENDAR_ID;
    expect(foreignCalendarId).toBeTruthy();
    const crossTenant = await directApi(page, "/hr-admin/payroll-periods/", "POST", {
      calendar_id: foreignCalendarId,
      code: `${periodCode}-FOREIGN`,
      name: "Cross-tenant period",
      start_date: "2030-04-01",
      end_date: "2030-04-30",
      pay_date: "2030-05-02",
      status: "draft",
      config_snapshot: {},
    });
    expect(crossTenant.response.status()).toBe(400);

    await gotoAuthenticated(page, "/ess", employee);
    const unauthorized = await directApi(page, "/hr-admin/payroll-calendars/", "POST", {
      code: `${calendarCode}-UNAUTH`, name: "Unauthorized", frequency: "monthly", timezone: "Asia/Kolkata",
      currency_code: "INR", period_start_day: 1, is_active: true, config_snapshot: {},
    });
    expect(unauthorized.response.status()).toBe(403);

    record("STG-E2E-0306", {
      resources: [
        { type: "payroll_calendar", id: calendar!.id, code: calendarCode },
        { type: "payroll_period", id: period!.id, code: periodCode },
        { type: "pay_group", id: group!.id, code: groupCode },
      ],
      matching_calendar_id: calendar!.id,
      legal_entity_id: legalEntityId,
      cross_tenant_status: 400,
      unauthorized_status: 403,
    });
  });
});
