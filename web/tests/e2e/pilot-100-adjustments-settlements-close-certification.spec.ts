import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PayrollRun = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type AdjustmentSetup = {
  runs: PayrollRun[];
  adjustments: Array<{ id: string; payroll_run_id: string; status: string; source_ref: string; source_hash: string }>;
};

type SettlementSetup = {
  runs: PayrollRun[];
  settlements: Array<{ id: string; payroll_run_id: string; status: string; source_ref: string; source_hash: string; line_count: number }>;
  lines: Array<{ id: string; settlement_id: string; source_hash: string }>;
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const runCode = `${prefix.toLowerCase()}-adjust-settle-close`;

function uniqueRef(kind: string) {
  return `${prefix.toLowerCase()}-${kind}-${Date.now()}`;
}

async function apiGet<T>(page: Page, url: string) {
  const response = await page.request.get(url);
  expect(response.status(), `${url} should return 200`).toBe(200);
  return (await response.json()) as T;
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 45_000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function locatePilotRun(page: Page) {
  const setup = await apiGet<AdjustmentSetup>(page, "/api/hr-admin/payroll-adjustment-setup");
  const run = setup.runs.find((item) => item.code === runCode);
  expect(run, `Missing ${runCode}. Seed with seed_pilot_100_calculation --run-code-suffix adjust-settle-close first.`).toBeTruthy();
  expect(run?.status, `${runCode} must start inputs_locked for repeatable P100-7 browser certification.`).toBe("inputs_locked");
  return run as PayrollRun;
}

async function waitForSettlementLineCount(page: Page, settlementId: string, expectedCount: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const setup = await apiGet<SettlementSetup>(page, "/api/hr-admin/payroll-settlement-setup");
    const lineCount = setup.lines.filter((item) => item.settlement_id === settlementId).length;
    if (lineCount >= expectedCount) {
      return setup;
    }
    await page.waitForTimeout(1000);
  }
  const setup = await apiGet<SettlementSetup>(page, "/api/hr-admin/payroll-settlement-setup");
  expect(setup.lines.filter((item) => item.settlement_id === settlementId).length).toBeGreaterThanOrEqual(expectedCount);
  return setup;
}

test.describe.serial("P100-7 adjustments, settlements, and close readiness certification", () => {
  test("HR admin creates, rejects invalid states, applies payroll inputs, and proves report visibility", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/payroll-adjustments", hrAdmin);
    await expectPageReady(page, "Payroll Adjustments");
    const run = await locatePilotRun(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?runId=${run.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Adjustments");
    await expect(page.getByRole("heading", { name: `${prefix} Adjustments Settlements Close Gate` })).toBeVisible();
    const adjustmentPanel = page.getByLabel("Adjustment certification actions");
    await expect(adjustmentPanel).toBeVisible();
    await expect(adjustmentPanel.getByLabel("Employee snapshot")).toHaveCount(1);

    const adjustmentSourceRef = uniqueRef("adjustment");
    await adjustmentPanel.getByLabel("Adjustment source reference").fill(adjustmentSourceRef);
    await adjustmentPanel.getByLabel("Adjustment amount").fill("13500");
    const createdAdjustment = await submitAndCapture<{ id: string; status: string; source_hash: string }>(
      page,
      /\/api\/hr-admin\/payroll-adjustments$/,
      "POST",
      async () => {
        await adjustmentPanel.getByRole("button", { name: "Create adjustment" }).click();
      },
    );
    expect(createdAdjustment.status).toBe(201);
    expect(createdAdjustment.payload.status).toBe("draft");
    expect(createdAdjustment.payload.source_hash).toMatch(/^[a-f0-9]{64}$/);

    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?runId=${run.id}&adjustmentId=${createdAdjustment.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Adjustments");
    await expect(page.locator(".payroll-adjustment-table tr.is-selected")).toContainText("Pilot Certification Bonus");
    await expect(page.locator("aside[aria-label*='Pilot Certification Bonus']")).toContainText(adjustmentSourceRef);

    const unapprovedApply = await submitAndCapture<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-adjustments/${createdAdjustment.payload.id}/apply$`),
      "POST",
      async () => {
        await page.getByLabel("Adjustment certification actions").getByRole("button", { name: "Apply selected" }).click();
      },
    );
    expect(unapprovedApply.status).toBe(400);
    expect(unapprovedApply.payload.detail ?? "").toMatch(/approved/i);
    await expect(page.getByLabel("Adjustment certification actions").locator(".form-status")).toContainText(/approved/i);

    const duplicateCreate = await submitAndCapture<{ detail?: string }>(
      page,
      /\/api\/hr-admin\/payroll-adjustments$/,
      "POST",
      async () => {
        const refreshedPanel = page.getByLabel("Adjustment certification actions");
        await refreshedPanel.getByLabel("Adjustment source reference").fill(adjustmentSourceRef);
        await refreshedPanel.getByRole("button", { name: "Create adjustment" }).click();
      },
    );
    expect(duplicateCreate.status).toBe(400);
    await expect(page.getByLabel("Adjustment certification actions").locator(".form-status")).toContainText(/Action failed|already exists|unique/i);

    for (const [action, expected] of [
      ["Submit selected", "submitted"],
      ["Approve selected", "approved"],
      ["Apply selected", "applied"],
    ] as const) {
      const response = await submitAndCapture<{ status: string }>(
        page,
        new RegExp(`/api/hr-admin/payroll-adjustments/${createdAdjustment.payload.id}/${action.split(" ")[0].toLowerCase()}$`),
        "POST",
        async () => {
          await page.getByLabel("Adjustment certification actions").getByRole("button", { name: action }).click();
        },
      );
      expect(response.ok).toBeTruthy();
      expect(response.payload.status).toBe(expected);
      await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?runId=${run.id}&adjustmentId=${createdAdjustment.payload.id}`, hrAdmin);
      await expectPageReady(page, "Payroll Adjustments");
    }
    await expect(page.locator(".payroll-adjustment-table tr.is-selected")).toContainText("Applied");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?runId=${run.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Settlements");
    const settlementPanel = page.getByLabel("Settlement certification actions");
    await expect(settlementPanel).toBeVisible();
    const settlementSourceRef = uniqueRef("settlement");
    await settlementPanel.getByLabel("Settlement source reference").fill(settlementSourceRef);
    const createdSettlement = await submitAndCapture<{ id: string; status: string; source_hash: string }>(
      page,
      /\/api\/hr-admin\/payroll-settlements$/,
      "POST",
      async () => {
        await settlementPanel.getByRole("button", { name: "Create settlement" }).click();
      },
    );
    expect(createdSettlement.status).toBe(201);
    expect(createdSettlement.payload.status).toBe("draft");
    expect(createdSettlement.payload.source_hash).toMatch(/^[a-f0-9]{64}$/);
    await waitForSettlementLineCount(page, createdSettlement.payload.id, 2);

    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?runId=${run.id}&settlementId=${createdSettlement.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Settlements");
    await expect(page.locator(".payroll-settlement-line-table tbody tr")).toHaveCount(2);
    await expect(page.locator("aside[aria-label*='payroll settlement']")).toContainText(settlementSourceRef);

    for (const [action, expected] of [
      ["Submit selected", "submitted"],
      ["Approve selected", "approved"],
      ["Apply selected", "applied"],
    ] as const) {
      const response = await submitAndCapture<{ status: string }>(
        page,
        new RegExp(`/api/hr-admin/payroll-settlements/${createdSettlement.payload.id}/${action.split(" ")[0].toLowerCase()}$`),
        "POST",
        async () => {
          await page.getByLabel("Settlement certification actions").getByRole("button", { name: action }).click();
        },
      );
      expect(response.ok).toBeTruthy();
      expect(response.payload.status).toBe(expected);
      await gotoAuthenticated(page, `/hr-admin/payroll-settlements?runId=${run.id}&settlementId=${createdSettlement.payload.id}`, hrAdmin);
      await expectPageReady(page, "Payroll Settlements");
    }
    await expect(page.locator(".payroll-adjustment-table").or(page.locator(".payroll-settlement-line-table")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const adjustmentSetup = await apiGet<AdjustmentSetup>(page, "/api/hr-admin/payroll-adjustment-setup");
    const appliedAdjustment = adjustmentSetup.adjustments.find((item) => item.id === createdAdjustment.payload.id);
    const generatedSettlementAdjustments = adjustmentSetup.adjustments.filter((item) => item.payroll_run_id === run.id && item.source_ref.startsWith("settlement-line:"));
    expect(appliedAdjustment?.status).toBe("applied");
    expect(generatedSettlementAdjustments.length).toBeGreaterThanOrEqual(2);
    expect(generatedSettlementAdjustments.every((item) => item.status === "applied" && /^[a-f0-9]{64}$/.test(item.source_hash))).toBeTruthy();

    const settlementSetup = await apiGet<SettlementSetup>(page, "/api/hr-admin/payroll-settlement-setup");
    const appliedSettlement = settlementSetup.settlements.find((item) => item.id === createdSettlement.payload.id);
    expect(appliedSettlement?.status).toBe("applied");
    expect(appliedSettlement?.line_count).toBe(2);
    expect(settlementSetup.lines.filter((item) => item.settlement_id === createdSettlement.payload.id && /^[a-f0-9]{64}$/.test(item.source_hash)).length).toBe(2);

    for (const [path, reportKey, expectedText] of [
      ["/hr-admin/reports/payroll-adjustments", "payroll-adjustments", adjustmentSourceRef],
      ["/hr-admin/reports/payroll-settlements", "payroll-settlements", settlementSourceRef],
      ["/hr-admin/reports/payroll-close-readiness", "payroll-close-readiness", `${prefix} Adjustments Settlements Close Gate`],
    ] as const) {
      await gotoAuthenticated(page, path, hrAdmin);
      await expectPageReady(page, path.includes("close") ? "Payroll Close Readiness Report" : path.includes("settlements") ? "Payroll Settlements Report" : "Payroll Adjustments Report");
      if (path.includes("close")) {
        await page.getByLabel("Payroll run", { exact: true }).selectOption({ label: expectedText });
        await expect(page.locator("tbody")).toContainText(expectedText);
      } else {
        await page.getByPlaceholder(/Search/).fill(expectedText);
        await expect(page.getByText(expectedText).first()).toBeVisible();
      }
      const exportResponse = await page.request.get(`/api/hr-admin/reports/${reportKey}?q=${encodeURIComponent(path.includes("close") ? prefix : expectedText)}`);
      expect(exportResponse.status()).toBe(200);
      expect(exportResponse.headers()["x-hrms-report-key"]).toBe(reportKey);
      expect(await exportResponse.text()).toContain(expectedText);
      const manifestResponse = await page.request.get(`/api/hr-admin/reports/${reportKey}?q=${encodeURIComponent(path.includes("close") ? prefix : expectedText)}&format=manifest`);
      expect(manifestResponse.status()).toBe(200);
      expect(manifestResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
      await expectNoHorizontalOverflow(page);
    }
  });
});
