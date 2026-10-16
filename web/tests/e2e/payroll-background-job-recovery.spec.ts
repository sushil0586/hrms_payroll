import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test("payroll calculation remains visible and completes after browser reload", async ({ page }) => {
  const runId = process.env.PLAYWRIGHT_PAYROLL_BACKGROUND_RUN_ID;
  expect(runId, "PLAYWRIGHT_PAYROLL_BACKGROUND_RUN_ID is required").toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${runId}`, hrAdmin);
  await expectPageReady(page, "Payroll Calculations");

  const panel = page.getByLabel("Calculation controls");
  await panel.getByLabel("Calculation profile ref").fill(`tenant.payroll.phase5e.browser-recovery.${Date.now()}`);
  const accepted = page.waitForResponse((response) =>
    response.url().includes(`/api/hr-admin/payroll-runs/${runId}/calculate-draft`) && response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Calculate draft" }).click();
  const acceptedResponse = await accepted;
  expect(acceptedResponse.status()).toBe(202);
  const payload = await acceptedResponse.json() as { job: { id: string; status: string } };
  expect(payload.job.id).toBeTruthy();
  expect(["queued", "running", "succeeded"]).toContain(payload.job.status);

  await expect(panel.locator("div.form-status").first()).toContainText(/Queued|Processing|Completed/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Calculations");

  const restoredPanel = page.getByLabel("Calculation controls");
  const restoredJobStatus = restoredPanel.locator("div.form-status").first();
  await expect(restoredJobStatus).toContainText(/Queued|Processing|Completed/);
  await expect(restoredJobStatus).toContainText("Completed", { timeout: 90_000 });
  await expect(restoredPanel.getByRole("button", { name: "Calculate draft" })).toBeEnabled();

  const statusResult = await page.evaluate(async (jobId) => {
    const response = await fetch(`/api/hr-admin/payroll-jobs/${jobId}`, { cache: "no-store" });
    return { status: response.status, payload: await response.json() };
  }, payload.job.id) as {
    status: number;
    payload: { job: { status: string; completed_items: number; total_items: number } };
  };
  expect(statusResult.status).toBe(200);
  const statusPayload = statusResult.payload;
  expect(statusPayload.job.status).toBe("succeeded");
  expect(statusPayload.job.completed_items).toBe(statusPayload.job.total_items);
  expect(statusPayload.job.total_items).toBeGreaterThan(0);
});
