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
const evidence = path.join(repoRoot, "docs/qa/evidence/mss-makeover-phase1-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "manager" | "manager_b" | "employee") {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const persona = workspacePersona(workspace, role);
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect.poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === "hrms_access_token")).toBe(true);
}

async function expectNoDocumentOverflow(page: Page) {
  const measurement = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.clientWidth + 1);
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
  writeFileSync(
    path.join(evidence, `${test.info().project.name}-${name}-axe.json`),
    JSON.stringify(result, null, 2),
  );
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({}, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("manager dashboard has one usable hierarchy across responsive widths", async ({ page }) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 480 },
  ]) {
    await login(page, "manager");
    await page.setViewportSize(size);
    await page.goto("/mss");
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What to review next" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coverage context" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your ESS" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Inbox" })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await page.screenshot({
      path: path.join(evidence, `${test.info().project.name}-dashboard-${size.width}x${size.height}.png`),
      fullPage: true,
    });
  }
  await axeScan(page, "dashboard");
});

test("leave, attendance and unavailable history keep truthful URL-addressed states", async ({ page }) => {
  await login(page, "manager");
  await page.goto(`/mss/approvals?queue=leave&leaveId=${workspace.manifest.fixtures.leave_request_id}`);
  await expect(page.getByRole("heading", { name: "Manager approvals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected leave request" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /Leave/ })).toHaveAttribute("aria-current", "page");

  const attendanceTab = page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /Attendance/ });
  await expect(attendanceTab).toHaveAttribute("href", /queue=attendance/);
  await page.goto((await attendanceTab.getAttribute("href"))!);
  await expect(page).toHaveURL(/queue=attendance/);
  await expect(page.getByRole("heading", { name: "Attendance approvals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected attendance request" })).toBeVisible();

  const historyTab = page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /History/ });
  await expect(historyTab).toHaveAttribute("href", /queue=history/);
  await page.goto((await historyTab.getAttribute("href"))!);
  await expect(page).toHaveURL(/queue=history/);
  await expect(page.getByRole("heading", { name: "Decision history" })).toBeVisible();
  await expect(page.getByText("Completed-decision history is currently unavailable in this workspace.")).toBeVisible();
  await expect(page.getByText("No completed manager decisions are available yet.")).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-history-unavailable.png`), fullPage: true });
});

test("approval details and decision dialogs remain usable at compact short height", async ({ page }) => {
  await login(page, "manager");
  await page.setViewportSize({ width: 320, height: 480 });
  for (const [queue, selectedKey, selectedId, dialogName] of [
    ["leave", "leaveId", workspace.manifest.fixtures.leave_request_id, /Review leave approval/],
    ["attendance", "regId", workspace.manifest.fixtures.attendance_regularization_id, /Review attendance approval/],
  ] as const) {
    await page.goto(`/mss/approvals?queue=${queue}&${selectedKey}=${selectedId}`);
    const opener = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" });
    await expect(opener).toBeVisible();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: dialogName });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Decision note")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Approve/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Reject/ })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${queue}-dialog-320x480.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("manager notifications, empty projection and wrong-role denial remain distinct", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/mss/notifications");
  await expect(page.getByRole("heading", { name: "Manager notifications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team alert list" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review notification" })).toBeVisible();
  await axeScan(page, "notifications");

  await login(page, "manager_b");
  await page.goto("/mss/notifications");
  await expect(page.getByText("No notifications yet.", { exact: true })).toBeVisible();

  await login(page, "employee");
  const denied = await page.request.post(
    `/api/manager/leave-requests/${workspace.manifest.fixtures.leave_request_id}/approve`,
    { data: { comment: "Phase 1 wrong-role negative" } },
  );
  expect([401, 403]).toContain(denied.status());
});
