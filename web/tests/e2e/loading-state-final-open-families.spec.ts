import { expect, test, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, personaForRoute } from "../helpers/staging-auth";

function isPrefetch(route: Route) {
  const headers = route.request().headers();
  return headers["next-router-prefetch"] === "1" || headers.purpose === "prefetch";
}

async function delayNavigation(route: Route, delayMs: number) {
  if (isPrefetch(route)) return route.abort();
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.continue();
}

test.describe("Final loading-state open-family coverage", () => {
  test.describe.configure({ mode: "serial" });

  test("server-backed employee dialog acknowledges immediately and opens the selected employee", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/employees?page_size=5", workspacePersona(workspace, "hr_admin"));
      const employeeLink = page.locator(".employee-directory-table tbody tr").first().getByRole("link").first();
      const employeeHref = await employeeLink.getAttribute("href");
      const employeeId = employeeHref ? new URL(employeeHref, page.url()).searchParams.get("employeeId") : null;
      expect(employeeId).toBeTruthy();
      await employeeLink.click();
      const detail = page.getByRole("article", { name: "Employee Master Detail" });
      await expect(page).toHaveURL(new RegExp(`employeeId=${employeeId}`));
      await expect(detail).toHaveAttribute("aria-busy", "false");
      await page.route(/\/hr-admin\/employees\?.*action=edit/, (route) => delayNavigation(route, 2_000));

      const startedAt = Date.now();
      await detail.getByRole("link", { name: "Edit", exact: true }).click();
      const status = page.getByTestId("workspace-navigation-status");
      await expect(status).toContainText("Loading Edit", { timeout: 500 });
      const acknowledgementMs = Date.now() - startedAt;
      await expect(detail).toHaveAttribute("aria-busy", "true");
      await expect(page).toHaveURL(new RegExp(`employeeId=${employeeId}.*action=edit|action=edit.*employeeId=${employeeId}`));
      const dialog = page.getByRole("dialog", { name: "Edit employee" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Employee code")).not.toHaveValue("");
      await expect(status).toHaveCount(0);
      await testInfo.attach("employee-remote-dialog-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delayMs: 2_000, employeeId }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("tenant audit and platform permission filters retain their regions while delayed", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit", personaForRoute("/tenant-admin/trust-audit"));
    const auditLedger = page.locator(".tenant-audit-ledger").last();
    await page.route(/\/tenant-admin\/trust-audit\?.+/, (route) => delayNavigation(route, 750));
    const auditFilter = page.locator('.support-session-scopes a[href*="event_group="]').first();
    const auditStartedAt = Date.now();
    await auditFilter.click();
    await expect(page.getByTestId("workspace-navigation-status")).toBeVisible({ timeout: 500 });
    const auditAcknowledgementMs = Date.now() - auditStartedAt;
    await expect(auditFilter.locator("xpath=ancestor::div[contains(@class,'panel-card-soft')]")).toHaveAttribute("aria-busy", "true");
    await expect(auditLedger).toBeVisible();
    await expect(page).toHaveURL(/event_group=/);
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);

    await gotoAuthenticated(page, "/platform-admin/permissions", personaForRoute("/platform-admin/permissions"));
    await page.route(/\/platform-admin\/permissions\?.+/, (route) => delayNavigation(route, 2_000));
    const filter = page.locator(".platform-permission-filters");
    await filter.getByLabel("Search").fill("employee");
    const platformStartedAt = Date.now();
    await filter.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("workspace-navigation-status")).toContainText("Loading Apply", { timeout: 500 });
    const platformAcknowledgementMs = Date.now() - platformStartedAt;
    await expect(filter).toHaveAttribute("aria-busy", "true");
    await expect(page.getByText("Catalog review")).toBeVisible();
    await expect(page).toHaveURL(/q=employee/);
    await expect(page.getByTestId("workspace-navigation-status")).toHaveCount(0);
    await testInfo.attach("server-query-feedback.json", {
      body: Buffer.from(JSON.stringify({ auditAcknowledgementMs, platformAcknowledgementMs, delaysMs: [750, 2_000] }, null, 2)),
      contentType: "application/json",
    });
  });

  test("policy conflict checks cancel stale responses and expose retry after failure", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new", workspacePersona(workspace, "hr_admin"));
      const policy = page.getByLabel("Attendance policy");
      const policyOptions = policy.locator("option:not([value=''])");
      await expect(policyOptions).not.toHaveCount(0);
      let requests = 0;
      await page.route("**/api/hr-admin/attendance-policy-assignments/conflicts", async (route) => {
        requests += 1;
        await new Promise((resolve) => setTimeout(resolve, requests === 1 ? 2_000 : 750));
        if (requests < 3) return route.abort("connectionfailed").catch(() => undefined);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ has_blocking_conflict: false, has_conflicts: false, summary: "No active overlap.", candidate_scope: [], conflicts: [] }),
        });
      });
      await policy.selectOption({ index: 1 });
      await expect(page.getByRole("status").filter({ hasText: "Checking overlap impact" })).toHaveAttribute("aria-busy", "true");
      const priority = page.getByLabel("Priority");
      await priority.fill("7");
      await expect(page.getByRole("button", { name: "Retry overlap check" })).toBeVisible();
      await page.getByRole("button", { name: "Retry overlap check" }).click();
      await expect(page.getByRole("status").filter({ hasText: "No active overlap" })).toBeVisible();
      expect(requests).toBeGreaterThanOrEqual(3);
      await testInfo.attach("policy-conflict-latest-request.json", {
        body: Buffer.from(JSON.stringify({ requests, delaysMs: [2_000, 750], recovered: true }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });
});
