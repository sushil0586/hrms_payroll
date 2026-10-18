import { expect, test, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function fulfillAfter(route: Route, delayMs: number, status: number, body: unknown, contentType = "application/json") {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (route.request().isNavigationRequest()) return;
  await route.fulfill({ status, body: typeof body === "string" ? body : JSON.stringify(body), contentType }).catch(() => undefined);
}

test.describe("Phase L5 shared loading-state gap closure", () => {
  test.describe.configure({ mode: "serial" });

  test("employee lookup keeps prior options, cancels stale searches, and retries", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments/new", workspacePersona(workspace, "hr_admin"));
      const search = page.getByRole("searchbox", { name: "Find person" });
      const employee = search.locator("xpath=ancestor::div[1]").locator("select");
      await search.focus();
      await expect(employee.locator("option")).not.toHaveCount(1);

      const delays = new Map([["L5-A", 2_000], ["L5-B", 750], ["L5-C", 300]]);
      const completed: string[] = [];
      await page.route("**/api/hr-admin/employees/option-search?**", async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q") ?? "";
        const delay = delays.get(query);
        if (!delay) return route.fallback();
        await fulfillAfter(route, delay, 200, {
          items: [{ id: query, name: `${query} latest employee`, employee_code: query }],
          total_count: 1,
        });
        completed.push(query);
      });

      let startedAt = Date.now();
      await search.fill("L5-A");
      await expect(page.getByRole("status").filter({ hasText: "Preparing employee search" })).toBeVisible({ timeout: 200 });
      const acknowledgementMs = Date.now() - startedAt;
      await expect(page.getByRole("status").filter({ hasText: "Updating employee options" })).toBeVisible({ timeout: 700 });
      await search.fill("L5-B");
      await page.waitForTimeout(300);
      await search.fill("L5-C");
      await expect(employee).toContainText("L5-C latest employee");
      await page.waitForTimeout(2_000);
      await expect(employee).toContainText("L5-C latest employee");
      await expect(employee).not.toContainText("L5-A latest employee");

      let attempts = 0;
      await page.unroute("**/api/hr-admin/employees/option-search?**");
      await page.route("**/api/hr-admin/employees/option-search?**", async (route) => {
        attempts += 1;
        if (attempts === 1) return fulfillAfter(route, 750, 503, { detail: "Employee lookup is temporarily unavailable." });
        return fulfillAfter(route, 750, 200, {
          items: [{ id: "recovered", name: "Recovered employee", employee_code: "L5-R" }],
          total_count: 1,
        });
      });
      await search.fill("failure");
      await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
      await expect(employee).toContainText("L5-C latest employee");
      await page.getByRole("button", { name: "Retry" }).click();
      await expect(employee).toContainText("Recovered employee");
      await testInfo.attach("employee-lookup-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delaysMs: [2_000, 750, 300], attempts, completed }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l5-employee-lookup ${JSON.stringify({ acknowledgementMs, attempts, completed })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("sign out reports a delayed failure, blocks duplicates, and becomes actionable", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/mss/approvals", workspacePersona(workspace, "manager"));
      let attempts = 0;
      await page.route("**/api/auth/logout", async (route) => {
        attempts += 1;
        await fulfillAfter(route, 2_000, 503, { detail: "Authentication service unavailable." });
      });
      const header = page.getByRole("banner");
      const button = header.getByRole("button", { name: "Sign out" });
      const startedAt = Date.now();
      await button.click();
      const pending = header.getByRole("button", { name: "Signing out" });
      await expect(pending).toBeDisabled({ timeout: 500 });
      const acknowledgementMs = Date.now() - startedAt;
      await pending.click({ force: true });
      await expect(page.getByRole("alert").filter({ hasText: "Unable to sign out" })).toBeVisible();
      expect(attempts).toBe(1);
      await expect(button).toBeEnabled();
      await testInfo.attach("logout-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delayMs: 2_000, attempts }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l5-logout-feedback ${JSON.stringify({ acknowledgementMs, attempts })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("migrated report export exposes preparation, error, and retry states", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/reports/leave-balance", workspacePersona(workspace, "hr_admin"));
      let attempts = 0;
      await page.route("**/api/hr-admin/reports/leave-balance?**", async (route) => {
        attempts += 1;
        if (attempts === 1) return fulfillAfter(route, 2_000, 503, { detail: "Report generation failed safely." });
        return fulfillAfter(route, 750, 200, "employee_code,balance\nQA-EMP-001,10\n", "text/csv");
      });
      const exportLink = page.getByRole("link", { name: "Export filtered CSV" });
      await expect(exportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/leave-balance/);
      const startedAt = Date.now();
      await exportLink.click();
      await expect(page.getByRole("link", { name: "Preparing download" })).toBeVisible({ timeout: 500 });
      const acknowledgementMs = Date.now() - startedAt;
      await expect(page.getByRole("alert").filter({ hasText: "failed safely" })).toBeVisible();
      const downloadEvent = page.waitForEvent("download");
      await page.getByRole("link", { name: "Retry download" }).click();
      await downloadEvent;
      expect(attempts).toBe(2);
      await testInfo.attach("report-family-download-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delaysMs: [2_000, 750], attempts }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l5-report-download ${JSON.stringify({ acknowledgementMs, attempts })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });
});
