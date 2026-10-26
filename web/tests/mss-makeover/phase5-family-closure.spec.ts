import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/mss-makeover-phase5-2026-10-26");
let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;

async function login(page: Page, role: "manager" | "manager_b" | "employee", selected = workspace) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = workspacePersona(selected, role);
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function expectNoDocumentOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
}

async function axeScan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> };
    }).axe;
    return axe.run(document.querySelector("main")!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
  foreignWorkspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
  await cleanupIsolatedQaWorkspace(foreignWorkspace);
});

test("all MSS routes retain the accepted hierarchy across responsive widths", async ({ page }) => {
  await login(page, "manager");
  const routes = [
    { name: "dashboard", path: "/mss", heading: "Manager dashboard" },
    { name: "approvals", path: `/mss/approvals?queue=leave&leaveId=${workspace.manifest.fixtures.leave_request_id}`, heading: "Manager approvals" },
    { name: "notifications", path: "/mss/notifications", heading: "Manager notifications" },
  ];
  const sizes = [
    { width: 1440, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 480 },
  ];

  for (const route of routes) {
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoDocumentOverflow(page);
      await page.screenshot({
        path: path.join(evidence, `${test.info().project.name}-${route.name}-${size.width}x${size.height}.png`),
        fullPage: true,
      });
      if (size.width === 1440) await axeScan(page, route.name);
    }
  }
});

test("queue navigation and both modal families retain keyboard and focus contracts", async ({ page }) => {
  await login(page, "manager");
  await page.goto(`/mss/approvals?queue=leave&leaveId=${workspace.manifest.fixtures.leave_request_id}`);
  const attendanceTab = page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /Attendance/ });
  await attendanceTab.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/queue=attendance/);
  await expect(page.getByRole("heading", { name: "Selected attendance request" })).toBeVisible();

  const review = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" });
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /Review attendance approval/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(review).toBeFocused();

  await page.goto("/mss/notifications");
  const notificationReview = page.getByRole("button", { name: "Review notification" }).first();
  await notificationReview.focus();
  await page.keyboard.press("Enter");
  const notificationDialog = page.getByRole("dialog", { name: /Manager approval needs review/ });
  await expect(notificationDialog).toBeVisible();
  await expect(notificationDialog.getByRole("link", { name: "Open source" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(notificationReview).toBeFocused();
});

test("empty, unauthenticated, wrong-role and foreign-tenant boundaries remain explicit", async ({ page }) => {
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  await login(page, "manager_b");
  await page.goto("/mss");
  await expect(page.getByRole("heading", { name: "No manager decisions pending" })).toBeVisible();
  await page.goto("/mss/notifications");
  await expect(page.getByText("No notifications yet.", { exact: true })).toBeVisible();

  await login(page, "employee");
  expect((await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Phase 5 employee denial" },
  })).status()).toBe(403);

  await login(page, "manager", foreignWorkspace);
  expect((await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Phase 5 foreign denial" },
  })).status()).toBe(404);

  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await page.goto("/mss");
  await expect(page).toHaveURL(/\/login/);
});

test("current-build Leave and Attendance decisions reconcile into exact ESS outcomes", async ({ page }) => {
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  const regularizationId = workspace.manifest.fixtures.attendance_regularization_id;
  await login(page, "manager");

  await page.goto(`/mss/approvals?queue=leave&leaveId=${leaveId}`);
  await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
  const leaveDialog = page.getByRole("dialog", { name: /Review leave approval/ });
  await leaveDialog.getByLabel("Decision note").fill("Phase 5 closure leave approval");
  const leaveResponse = page.waitForResponse((response) => response.url().includes(`${leaveId}/approve`) && response.request().method() === "POST");
  await leaveDialog.getByRole("button", { name: "Approve request", exact: true }).click();
  expect((await leaveResponse).status()).toBe(200);
  await expect(leaveDialog).toHaveCount(0);

  await page.goto(`/mss/approvals?queue=attendance&regId=${regularizationId}`);
  await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
  const attendanceDialog = page.getByRole("dialog", { name: /Review attendance approval/ });
  await attendanceDialog.getByLabel("Decision note").fill("Phase 5 closure attendance rejection");
  const attendanceResponse = page.waitForResponse((response) => response.url().includes(`${regularizationId}/reject`) && response.request().method() === "POST");
  await attendanceDialog.getByRole("button", { name: "Reject request", exact: true }).click();
  expect((await attendanceResponse).status()).toBe(200);
  await expect(attendanceDialog).toHaveCount(0);

  await login(page, "employee");
  await page.goto(`/ess/leave?status=approved&requestId=${leaveId}`);
  await expect(page.getByRole("dialog")).toContainText(/approved/i);
  await expect(page.getByText("Phase 5 closure leave approval").first()).toBeVisible();
  await page.goto(`/ess/attendance?status=rejected&regId=${regularizationId}`);
  await expect(page.getByRole("dialog")).toContainText(/rejected/i);
  await expect(page.getByText("Phase 5 closure attendance rejection").first()).toBeVisible();
  await expectNoDocumentOverflow(page);
});
