import { expect, test, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function delayed(route: Route, delayMs: number, response: { status: number; body: string; contentType: string }) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.fulfill(response);
}

test.describe("Phase L4 long-running loading feedback", () => {
  test.describe.configure({ mode: "serial" });

  test("report export acknowledges promptly, blocks duplicates, and supports retry", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/reports/workforce", workspacePersona(workspace, "hr_admin"));
      let attempts = 0;
      await page.route("**/api/hr-admin/reports/workforce**", async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await delayed(route, 2_000, {
            status: 503,
            body: JSON.stringify({ detail: "The export service is temporarily unavailable." }),
            contentType: "application/json",
          });
          return;
        }
        await delayed(route, 750, {
          status: 200,
          body: "employee_code,employee_name\nL4-001,Loading Feedback\n",
          contentType: "text/csv",
        });
      });

      const startedAt = Date.now();
      await page.getByRole("link", { name: "Export filtered CSV" }).click();
      const pending = page.getByRole("link", { name: "Preparing download" });
      await expect(pending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      const acknowledgementMs = Date.now() - startedAt;
      await expect(pending).toHaveAttribute("aria-disabled", "true");
      await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
      expect(attempts).toBe(1);

      const downloadEvent = page.waitForEvent("download");
      await page.getByRole("link", { name: "Retry download" }).click();
      await expect(page.getByRole("link", { name: /Preparing download|Downloading/ })).toBeVisible();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe("workforce-report.csv");
      await expect(page.getByRole("link", { name: "Export filtered CSV" })).not.toHaveAttribute("aria-disabled", "true");
      expect(attempts).toBe(2);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("link", { name: "Export filtered CSV" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
      await testInfo.attach("report-download-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delaysMs: [2_000, 750], attempts }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l4-report-feedback ${JSON.stringify({ acknowledgementMs, attempts })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("document upload retains values after failure and prevents duplicates", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/employee-documents/new", workspacePersona(workspace, "hr_admin"));
      const form = page.locator("form.document-child-form");
      const title = `L4 retained ${workspace.seedRef}`;
      const employeeSelect = form.locator("select").nth(0);
      const employeeValue = await employeeSelect.evaluate((select) => Array.from((select as HTMLSelectElement).options)
        .find((option) => option.text.includes("QA-EMP-001"))?.value ?? "");
      expect(employeeValue).toBeTruthy();
      await employeeSelect.selectOption(employeeValue);
      await form.locator("select").nth(1).selectOption({ index: 1 });
      await form.locator('input[required]:not([type="file"])').fill(title);
      await form.locator('input[type="file"]').setInputFiles({
        name: "l4-feedback.txt",
        mimeType: "text/plain",
        buffer: Buffer.alloc(256 * 1024, "L"),
      });
      let attempts = 0;
      await page.route("**/api/hr-admin/employee-documents", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        attempts += 1;
        await delayed(route, 2_000, {
          status: 503,
          body: JSON.stringify({ detail: "Document storage is temporarily unavailable." }),
          contentType: "application/json",
        });
      });

      const startedAt = Date.now();
      await form.getByRole("button", { name: "Upload document" }).click();
      const pending = form.getByRole("button", { name: "Uploading document" });
      await expect(pending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      const acknowledgementMs = Date.now() - startedAt;
      await expect(pending).toBeDisabled();
      await expect(form.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
      expect(attempts).toBe(1);
      await expect(form.locator('input[required]:not([type="file"])')).toHaveValue(title);
      expect(await form.locator('input[type="file"]').evaluate((input) => (input as HTMLInputElement).files?.length)).toBe(1);
      await expect(form.getByRole("button", { name: "Upload document" })).toBeEnabled();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(form.getByRole("button", { name: "Upload document" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
      await testInfo.attach("document-upload-feedback.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, delayMs: 2_000, attempts }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l4-upload-feedback ${JSON.stringify({ acknowledgementMs, attempts })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });
});
