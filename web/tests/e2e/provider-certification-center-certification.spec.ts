import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase PLF-6 Provider certification center", () => {
  test("HR admin can certify provider center navigation, controls, registries, evidence export, and launch gates", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers", hrAdmin);
    await expectPageReady(page, "Payroll Providers");

    const pageActions = page.locator(".page-intro__actions");
    for (const action of ["Handoff", "Outputs", "Statutory", "Export evidence", "Evidence manifest"]) {
      await expect(pageActions.getByRole("link", { name: action, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Live rails off").first()).toBeVisible();
    await expect(page.getByText(/real payout, filing, and journal submission stay disabled/i).first()).toBeVisible();

    for (const metric of ["Connections", "Certified", "Sandbox ready", "Cert runs", "Mapping packs", "Simulations", "Adapters", "Live packs", "Clients", "Fixtures", "Packages", "Storage policies", "Launch rehearsal", "Launch history", "Credential refs", "Bank lanes", "Statutory lanes", "Failure taxonomy", "Callback/retry"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    for (const section of ["Connections", "Launch rehearsal", "Certification checklist", "Callback, retry, and revoke certification", "Artifact policy readiness", "Provider package manifests", "Provider client readiness", "Live adapter readiness", "Provider schema coverage", "Active comparison evidence", "Scenario evidence", "Vertical coverage"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }

    for (const bucket of ["Delivery failures", "Callback rejections", "Retry queue", "Worker jobs"]) {
      await expect(page.locator(".payroll-provider-failure-grid").filter({ hasText: bucket })).toBeVisible();
    }

    for (const taxonomyRef of ["provider.delivery.failure", "provider.callback.rejected", "provider.retry.queue", "provider.job.worker"]) {
      await expect(page.getByText(taxonomyRef)).toBeVisible();
    }

    for (const column of ["Provider", "Kind", "Adapter", "Credential", "Certification", "Latest run", "Status"]) {
      await expect(page.locator("table.payroll-provider-table").getByRole("columnheader", { name: column })).toBeVisible();
    }

    const connectionLinks = page.locator("main a[href*='connectionId=']");
    expect(await connectionLinks.count()).toBeGreaterThan(0);
    await connectionLinks.first().click();
    await expect(page).toHaveURL(/connectionId=/);
    await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run certification" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run rehearsal" })).toBeVisible();
    await expect(page.getByText("Adapter contract").first()).toBeVisible();
    await expect(page.getByText("Credential boundary").first()).toBeVisible();
    await expect(page.getByText("Certification evidence").first()).toBeVisible();
    await expect(page.getByText("Gate detail").first()).toBeVisible();
    await expect(page.getByText(/Retry\/requeue API guarded|No delivery, callback, retry, or worker-job evidence exists yet/i).first()).toBeVisible();

    for (const endpoint of [
      "/api/hr-admin/payroll-provider-deliveries/00000000-0000-4000-8000-000000000000/schedule-retry",
      "/api/hr-admin/payroll-provider-deliveries/00000000-0000-4000-8000-000000000000/requeue",
      "/api/hr-admin/payroll-signed-access-grants/00000000-0000-4000-8000-000000000000/revoke",
    ]) {
      const guardedResponse = await page.request.post(endpoint);
      expect([400, 404]).toContain(guardedResponse.status());
    }

    const evidenceResponse = await page.request.get("/api/hr-admin/payroll-provider-certification-evidence");
    expect(evidenceResponse.status()).toBe(200);
    expect(evidenceResponse.headers()["x-hrms-report-key"]).toBe("provider-certification-evidence");
    expect(evidenceResponse.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const evidence = await evidenceResponse.json();
    expect(evidence.report_key).toBe("provider-certification-evidence");
    expect(evidence.summary.connection_count).toBeGreaterThan(0);
    expect(Array.isArray(evidence.connections)).toBe(true);
    const evidenceText = JSON.stringify(evidence).toLowerCase();
    expect(evidenceText).not.toContain("password");
    expect(evidenceText).not.toContain("raw_secret");
    expect(evidenceText).not.toContain("client_secret");
    expect(evidenceText).not.toContain("private_key");

    const manifestResponse = await page.request.get("/api/hr-admin/payroll-provider-certification-evidence?format=manifest");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("provider-certification-evidence");
    const manifest = await manifestResponse.json();
    expect(manifest.report_key).toBe("provider-certification-evidence");
    expect(manifest.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);

    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access provider certification center or evidence package", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/payroll-providers", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { name: "Payroll Providers" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);

    const evidenceResponse = await page.request.get("/api/hr-admin/payroll-provider-certification-evidence");
    expect([401, 403]).toContain(evidenceResponse.status());

    for (const endpoint of [
      "/api/hr-admin/payroll-provider-deliveries/00000000-0000-4000-8000-000000000000/schedule-retry",
      "/api/hr-admin/payroll-provider-deliveries/00000000-0000-4000-8000-000000000000/requeue",
      "/api/hr-admin/payroll-signed-access-grants/00000000-0000-4000-8000-000000000000/revoke",
    ]) {
      const guardedResponse = await page.request.post(endpoint);
      expect([401, 403]).toContain(guardedResponse.status());
    }
  });
});
