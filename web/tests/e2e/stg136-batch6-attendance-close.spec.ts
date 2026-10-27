import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

const backend = "http://127.0.0.1:8048";
let proxy: Server;
let workspace: IsolatedQaWorkspace;

function django(code: string) {
  return execFileSync(path.resolve(__dirname, "../../../.venv/bin/python"), ["backend/manage.py", "shell", "-c", code], {
    cwd: path.resolve(__dirname, "../../.."), env: process.env, encoding: "utf8",
  });
}

test.describe("STG-136 Batch 6 attendance configuration and close", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(async ({}, testInfo) => {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    django(`from tests.ess2_browser_fixture import prepare; prepare(${JSON.stringify(workspace.manifestPath)})`);
    proxy = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === "string" && !["host", "connection", "content-length"].includes(key)) headers[key] = value;
      }
      const result = await fetch(`${backend}${request.url || "/"}`, {
        method: request.method, headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
      });
      response.writeHead(result.status, { "Content-Type": result.headers.get("content-type") || "application/json" });
      response.end(Buffer.from(await result.arrayBuffer()));
    });
    await new Promise<void>((resolve, reject) => { proxy.once("error", reject); proxy.listen(8049, "127.0.0.1", resolve); });
  });

  test.afterAll(async () => {
    await cleanupIsolatedQaWorkspace(workspace);
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  });

  test("STG-E2E-0601/0602 creates shift variants and verifies calendar/policy configuration", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shifts/new", workspacePersona(workspace, "hr_admin"));
    await page.getByLabel("Code").fill("B6-REG");
    await page.getByLabel("Name").fill("Batch 6 Regular");
    await page.getByLabel("Start time").fill("09:00");
    await page.getByLabel("End time").fill("17:30");
    await page.getByLabel("Working hours").fill("8.00");
    await page.locator("label.toggle-field").filter({ hasText: "Sunday" }).getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create shift" }).click();
    await expect(page.getByRole("heading", { name: "Batch 6 Regular", exact: true })).toBeVisible();

    await page.goto("/hr-admin/shifts/new");
    await page.getByLabel("Code").fill("B6-NIGHT");
    await page.getByLabel("Name").fill("Batch 6 Overnight");
    await page.getByLabel("Start time").fill("22:00");
    await page.getByLabel("End time").fill("06:00");
    await page.getByLabel("Working hours").fill("8.00");
    await page.locator("label.toggle-field").filter({ hasText: "Night shift" }).getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create shift" }).click();
    await expect(page.getByRole("heading", { name: "Batch 6 Overnight", exact: true })).toBeVisible();

    await page.goto("/hr-admin/holiday-calendars");
    await expect(page.getByRole("heading", { name: "Holiday calendars" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ESS2 Synthetic Calendar", exact: true })).toBeVisible();
    await page.goto("/hr-admin/attendance-policies");
    await expect(page.getByRole("heading", { name: "Attendance policies" })).toBeVisible();
  });

  test("STG-E2E-0610/0611/0612 reconciles, closes, and protects the monthly snapshot", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/attendance-close", workspacePersona(workspace, "hr_admin"));
    await page.getByLabel("Period start").fill("2029-03-01");
    await page.getByLabel("Period end").fill("2029-03-31");
    await page.getByRole("button", { name: "Reconcile period" }).click();
    const card = page.locator("article.record-card").filter({ hasText: "2029-03-01 to 2029-03-31" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Submit" }).click();
    await card.getByRole("button", { name: "Approve" }).click();
    await card.getByRole("button", { name: "Close period" }).click();
    await expect(card).toContainText("closed");
    await expect(card.getByRole("button", { name: "Close period" })).toHaveCount(0);
    const persisted = django(`from apps.attendance.models import AttendancePeriodClose; c=AttendancePeriodClose.objects.get(tenant_id='${workspace.manifest.tenant.id}', period_start='2029-03-01'); print(c.status, c.snapshot_hash, c.attendance_record_count, ','.join(c.events.order_by('occurred_at').values_list('event_type', flat=True)))`);
    expect(persisted).toMatch(/closed\s+[0-9a-f]{64}\s+\d+\s+reconciled,submit,approve,close/);
  });
});
