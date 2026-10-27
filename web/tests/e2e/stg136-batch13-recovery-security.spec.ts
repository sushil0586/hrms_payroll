import { expect, test, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function backendGet(page: Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const backendUrl = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8018/api/v1";
  return page.request.get(`${backendUrl}${path}`, { headers: { Authorization: `Token ${token}` } });
}

test("STG-E2E-1303/1304 cross-role and cross-tenant access fail closed", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const owned = await provisionIsolatedQaWorkspace(testInfo);
  const foreign = await provisionIsolatedQaWorkspace(testInfo);

  try {
    const employee = workspacePersona(owned, "employee");
    await gotoAuthenticated(page, "/hr-admin/employees", employee);
    await expect(page).toHaveURL(/\/access-denied(?:\?|$)/);

    const foreignEmployeeId = foreign.manifest.credentials.employee.employee_id;
    const denied = await backendGet(page, `/hr-admin/employees/${foreignEmployeeId}/`);
    expect([403, 404]).toContain(denied.status());

    const ownProfile = await backendGet(page, "/me/profile/");
    expect(ownProfile.status()).toBe(200);
    const profile = await ownProfile.json() as { id: string; tenant_id?: string };
    expect(profile.id).toBe(owned.manifest.credentials.employee.employee_id);
    expect(profile.id).not.toBe(foreignEmployeeId);

    await testInfo.attach("stg-e2e-1303-1304-security.json", {
      body: Buffer.from(JSON.stringify({
        actor: employee.username,
        ownedTenantId: owned.manifest.tenant.id,
        foreignTenantId: foreign.manifest.tenant.id,
        foreignEmployeeId,
        crossRoleUrl: page.url(),
        crossTenantStatus: denied.status(),
        ownProfileId: profile.id,
      }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(foreign);
    await cleanupIsolatedQaWorkspace(owned);
  }
});

test("STG-E2E-1307 durable payroll job remains visible after browser reload", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);

  try {
    const hrAdmin = workspacePersona(workspace, "hr_admin");
    const runId = workspace.manifest.fixtures.payroll_run_id;
    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${runId}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");

    const panel = page.getByLabel("Calculation controls");
    await panel.getByLabel("Calculation profile ref").fill(`stg136.batch13.${workspace.seedRef}`);
    const accepted = page.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes(`/api/hr-admin/payroll-runs/${runId}/calculate-draft`),
    );
    await panel.getByRole("button", { name: "Calculate draft" }).click();
    const acceptedResponse = await accepted;
    expect(acceptedResponse.status()).toBe(202);
    const acceptedPayload = await acceptedResponse.json() as { job: { id: string; status: string } };
    expect(acceptedPayload.job.id).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Calculations");
    const restored = page.getByLabel("Calculation controls").locator("div.form-status").first();
    await expect(restored).toContainText(/Queued|Processing|Completed/);
    await expect(restored).toContainText("Completed", { timeout: 90_000 });

    const status = await backendGet(page, `/hr-admin/payroll-jobs/${acceptedPayload.job.id}/`);
    expect(status.status()).toBe(200);
    const statusPayload = await status.json() as { job: { id: string; status: string; completed_items: number; total_items: number } };
    expect(statusPayload.job).toMatchObject({ id: acceptedPayload.job.id, status: "succeeded" });
    expect(statusPayload.job.completed_items).toBe(statusPayload.job.total_items);
    expect(statusPayload.job.total_items).toBeGreaterThan(0);

    await testInfo.attach("stg-e2e-1307-durable-job.json", {
      body: Buffer.from(JSON.stringify({
        tenantId: workspace.manifest.tenant.id,
        payrollRunId: runId,
        acceptedStatus: acceptedResponse.status(),
        job: statusPayload.job,
      }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
