import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

async function captureStatus(page: import("@playwright/test").Page, pattern: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => pattern.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: await response.json() as { id: string; status: string } };
}

test("Phase 4 action panels retain operator input across aborts, service failures, and malformed success responses", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const maker = workspacePersona(workspace, "hr_admin");
  const runId = workspace.manifest.fixtures.payroll_run_id;

  try {
    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}`, maker);
    await expectPageReady(page, "Payroll Adjustments");
    const adjustment = page.getByLabel("Adjustment actions");
    const source = adjustment.getByLabel("Adjustment source reference");
    await source.fill(`phase4-recovery-${workspace.seedRef}`);
    await adjustment.getByLabel("Adjustment amount").fill("1789.25");

    await page.route("**/api/hr-admin/payroll-adjustments", (route) => route.abort("failed"));
    await adjustment.getByRole("button", { name: "Create adjustment" }).click();
    await expect(adjustment.getByRole("alert")).toContainText("could not be confirmed");
    await expect(source).toHaveValue(`phase4-recovery-${workspace.seedRef}`);
    await expect(adjustment.getByLabel("Adjustment amount")).toHaveValue("1789.25");
    await page.unroute("**/api/hr-admin/payroll-adjustments");

    await page.route("**/api/hr-admin/payroll-adjustments", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Payroll service is temporarily unavailable." }),
    }));
    await adjustment.getByRole("button", { name: "Create adjustment" }).click();
    await expect(adjustment.getByRole("alert")).toContainText("temporarily unavailable");
    await expect(source).toHaveValue(`phase4-recovery-${workspace.seedRef}`);
    await page.unroute("**/api/hr-admin/payroll-adjustments");

    await page.route("**/api/hr-admin/payroll-adjustments", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }));
    await adjustment.getByRole("button", { name: "Create adjustment" }).click();
    await expect(adjustment.getByRole("alert")).toContainText("was not confirmed");
    await expect(source).toHaveValue(`phase4-recovery-${workspace.seedRef}`);
    await page.unroute("**/api/hr-admin/payroll-adjustments");

    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?tab=actions&runId=${runId}`, maker);
    await expectPageReady(page, "Payroll Settlements");
    const settlement = page.getByLabel("Settlement actions");
    const settlementSource = settlement.getByLabel("Settlement source reference");
    await settlementSource.fill(`phase4-settlement-recovery-${workspace.seedRef}`);
    await page.route("**/api/hr-admin/payroll-settlements", (route) => route.abort("failed"));
    await settlement.getByRole("button", { name: "Create settlement" }).click();
    await expect(settlement.getByRole("alert")).toContainText("could not be confirmed");
    await expect(settlementSource).toHaveValue(`phase4-settlement-recovery-${workspace.seedRef}`);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("Phase 4 adjustment and settlement rejection require rationale and persist the rejected state", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const maker = workspacePersona(workspace, "hr_admin");
  const checker = workspacePersona(workspace, "hr_checker");
  const runId = workspace.manifest.fixtures.payroll_run_id;

  try {
    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}`, maker);
    let panel = page.getByLabel("Adjustment actions");
    await panel.getByLabel("Adjustment source reference").fill(`phase4-reject-${workspace.seedRef}`);
    const adjustment = await captureStatus(page, /\/api\/hr-admin\/payroll-adjustments\/?$/, () => panel.getByRole("button", { name: "Create adjustment" }).click());
    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}&adjustmentId=${adjustment.payload.id}`, maker);
    panel = page.getByLabel("Adjustment actions");
    await captureStatus(page, new RegExp(`/payroll-adjustments/${adjustment.payload.id}/submit/?$`), () => panel.getByRole("button", { name: "Submit selected" }).click());
    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}&adjustmentId=${adjustment.payload.id}`, checker);
    panel = page.getByLabel("Adjustment actions");
    await expect(panel.getByRole("button", { name: "Reject selected" })).toBeDisabled();
    await panel.getByLabel("Adjustment rejection reason").fill("Incorrect supporting payroll input.");
    const rejectedAdjustment = await captureStatus(page, new RegExp(`/payroll-adjustments/${adjustment.payload.id}/reject/?$`), () => panel.getByRole("button", { name: "Reject selected" }).click());
    expect(rejectedAdjustment.payload.status).toBe("rejected");

    await gotoAuthenticated(page, "/hr-admin/exits", maker);
    const employee = workspace.manifest.credentials.employee;
    const exitResponse = await requestWithBrowserSession(page, "/api/hr-admin/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employee.employee_id,
        status: "approved",
        resignation_date: "2026-10-01",
        notice_start_date: "2026-10-01",
        notice_end_date: "2026-10-31",
        proposed_last_working_date: "2026-10-31",
        approved_last_working_date: "2026-10-31",
        exit_reason: "Phase 4 rejected settlement fixture",
      }),
    });
    expect(exitResponse.status).toBe(201);

    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?tab=actions&runId=${runId}`, maker);
    let settlementPanel = page.getByLabel("Settlement actions");
    await settlementPanel.getByLabel("Settlement source reference").fill(`phase4-settlement-reject-${workspace.seedRef}`);
    const settlement = await captureStatus(page, /\/api\/hr-admin\/payroll-settlements\/?$/, () => settlementPanel.getByRole("button", { name: "Create settlement" }).click());
    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?tab=actions&runId=${runId}&settlementId=${settlement.payload.id}`, maker);
    settlementPanel = page.getByLabel("Settlement actions");
    await captureStatus(page, new RegExp(`/payroll-settlements/${settlement.payload.id}/submit/?$`), () => settlementPanel.getByRole("button", { name: "Submit selected" }).click());
    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?tab=actions&runId=${runId}&settlementId=${settlement.payload.id}`, checker);
    settlementPanel = page.getByLabel("Settlement actions");
    await expect(settlementPanel.getByRole("button", { name: "Reject selected" })).toBeDisabled();
    await settlementPanel.getByLabel("Settlement rejection reason").fill("Exit dues require correction.");
    const rejectedSettlement = await captureStatus(page, new RegExp(`/payroll-settlements/${settlement.payload.id}/reject/?$`), () => settlementPanel.getByRole("button", { name: "Reject selected" }).click());
    expect(rejectedSettlement.payload.status).toBe("rejected");
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
