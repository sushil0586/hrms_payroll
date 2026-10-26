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
const evidence = path.join(repoRoot, "docs/qa/evidence/mss-makeover-phase3-2026-10-26");
let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;

async function login(page: Page, role: "manager" | "employee", selected = workspace) {
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

test("queue tabs support keyboard activation and browser history restores selected context", async ({ page }) => {
  await login(page, "manager");
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  await page.goto(`/mss/approvals?queue=leave&leaveId=${leaveId}`);
  await expect(page.getByRole("heading", { name: "Selected leave request" })).toBeVisible();

  const attendance = page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /Attendance/ });
  await expect(attendance).toHaveAttribute("data-navigation-mode", "document");
  await attendance.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/queue=attendance/);
  await expect(page.getByRole("heading", { name: "Attendance approvals" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`queue=leave.*leaveId=${leaveId}`));
  await expect(page.getByRole("heading", { name: "Selected leave request" })).toBeVisible();

  const history = page.getByRole("navigation", { name: "Approval views" }).getByRole("link", { name: /History/ });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/queue=history/);
  await expect(page.getByText("Completed-decision history is not available in this workspace.")).toBeVisible();
  await expect(page.getByText("No completed manager decisions are available yet.")).toBeVisible();
  await expectNoDocumentOverflow(page);
  await axeScan(page, "approval-history");
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-history-desktop.png`), fullPage: true });
});

test("decision validation and failed requests preserve a retryable manager note", async ({ page }) => {
  await login(page, "manager");
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  await page.goto(`/mss/approvals?queue=leave&leaveId=${leaveId}`);
  await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog", { name: /Review leave approval/ });
  const note = dialog.getByLabel("Decision note");

  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog).toContainText("Enter a decision note before rejecting this request.");
  await expect(note).toBeFocused();

  await note.fill("Phase 3 retryable manager decision");
  await page.route(`**/api/manager/leave-requests/${leaveId}/reject`, (route) => route.abort(), { times: 1 });
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not confirm the outcome");
  await expect(note).toHaveValue("Phase 3 retryable manager decision");
  await expect(dialog.getByRole("alert")).toBeFocused();
});

test("both decision dialogs remain complete at 320px and suppress duplicate submissions", async ({ page }) => {
  await login(page, "manager");
  await page.setViewportSize({ width: 320, height: 480 });

  for (const [queue, key, id, dialogName, endpoint, buttonName] of [
    ["leave", "leaveId", workspace.manifest.fixtures.leave_request_id, /Review leave approval/, "leave-requests", "Approve request"],
    ["attendance", "regId", workspace.manifest.fixtures.attendance_regularization_id, /Review attendance approval/, "attendance-regularizations", "Approve request"],
  ] as const) {
    await page.goto(`/mss/approvals?queue=${queue}&${key}=${id}`);
    await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
    const dialog = page.getByRole("dialog", { name: dialogName });
    await expect(dialog.getByLabel("Decision note")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reject request", exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${queue}-dialog-320x480.png`), fullPage: true });

    let submissions = 0;
    await page.route(`**/api/manager/${endpoint}/${id}/approve`, async (route) => {
      submissions += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "approved" }) });
    }, { times: 1 });
    const approve = dialog.getByRole("button", { name: buttonName, exact: true });
    await approve.dblclick();
    await expect(dialog).toHaveCount(0);
    expect(submissions).toBe(1);
    await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${queue}-320x480.png`), fullPage: true });
  }
});

test("real decisions persist while role and tenant boundaries deny unauthorized mutations", async ({ page }) => {
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  const regularizationId = workspace.manifest.fixtures.attendance_regularization_id;
  await login(page, "manager");

  const leave = await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Phase 3 persisted leave approval" },
  });
  expect(leave.status()).toBe(200);
  const attendance = await page.request.post(`/api/manager/attendance-regularizations/${regularizationId}/reject`, {
    data: { comment: "Phase 3 persisted attendance rejection" },
  });
  expect(attendance.status()).toBe(200);
  expect([400, 404, 409]).toContain((await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Duplicate terminal decision" },
  })).status());

  await login(page, "employee");
  expect((await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Employee boundary proof" },
  })).status()).toBe(403);

  await login(page, "manager", foreignWorkspace);
  expect((await page.request.post(`/api/manager/leave-requests/${leaveId}/approve`, {
    data: { comment: "Foreign tenant boundary proof" },
  })).status()).toBe(404);
});
