import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/workflow-notification-phase5-2026-10-26");
let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "employee" | "manager" | "manager_b") {
  const persona = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.status()).toBe(200);
}

test.beforeAll(async ({}, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  mkdirSync(evidence, { recursive: true });
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("ESS filters commit supported scope and read state updates immediately", async ({ page }) => {
  await login(page, "employee");
  await page.goto("/ess/notifications?q=Leave&status=delivered&channel=in_app&priority=normal&subject_type=leave_request&page_size=25&page=1");
  await expect(page.getByText("Leave request received", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Review notification:/ }).click();
  const dialog = page.getByRole("dialog", { name: "Leave request received" });
  await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", new RegExp(`/ess/leave\\?requestId=${workspace.manifest.fixtures.leave_request_id}`));
  const readClick = dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("button", { name: "Saving read state" })).toBeDisabled();
  await readClick;
  await expect(dialog.getByRole("button", { name: "Mark unread" })).toBeVisible();
  await expect(dialog.getByText("Read", { exact: true }).last()).toBeVisible();
  await dialog.getByRole("button", { name: /Close Leave request received/ }).click();
  await expect(page).toHaveURL(/q=Leave/);
  await expect(page.getByText("Read", { exact: true }).first()).toBeVisible();
});

test("MSS filters retain scope while stale source identifiers render no action", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/mss/notifications?q=Manager&status=delivered&channel=in_app&priority=high&subject_type=leave_request&page_size=25&page=99");
  await expect(page).toHaveURL(/page=99/);
  await expect(page.getByText("Manager approval needs review", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review notification" }).click();
  const dialog = page.getByRole("dialog", { name: /Notification detail for Manager approval/ });
  await expect(dialog.getByRole("link", { name: "Open source" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/q=Manager/);
});

test("empty and no-match states remain distinct and recoverable", async ({ page }) => {
  await login(page, "manager_b");
  await page.goto("/mss/notifications");
  await expect(page.getByText("No notifications yet.", { exact: true })).toBeVisible();
  await login(page, "employee");
  await page.goto("/ess/notifications?q=phase5-no-match");
  await expect(page.getByText("No notifications match your filters.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/phase5-no-match/);
});

test("employee and manager notification projections reject cross-access and unknown IDs", async ({ page }) => {
  const readAt = new Date().toISOString();
  await login(page, "employee");
  const employeeOwn = await page.request.patch(`/api/me/notifications/${workspace.manifest.fixtures.employee_notification_id}`, { data: { read_at: readAt } });
  expect(employeeOwn.status()).toBe(200);
  const employeeToManager = await page.request.patch(`/api/me/notifications/${workspace.manifest.fixtures.manager_notification_id}`, { data: { read_at: readAt } });
  expect(employeeToManager.status()).toBe(404);
  await login(page, "manager");
  const managerOwn = await page.request.patch(`/api/manager/notifications/${workspace.manifest.fixtures.manager_notification_id}`, { data: { read_at: readAt } });
  expect(managerOwn.status()).toBe(200);
  const managerToEmployee = await page.request.patch(`/api/manager/notifications/${workspace.manifest.fixtures.employee_notification_id}`, { data: { read_at: readAt } });
  expect(managerToEmployee.status()).toBe(404);
  const unknown = await page.request.patch("/api/manager/notifications/00000000-0000-4000-8000-000000000000", { data: { read_at: readAt } });
  expect(unknown.status()).toBe(404);
});

test("malformed, failed, and aborted read updates never announce success", async ({ page }) => {
  await login(page, "employee");
  const reset = await page.request.patch(`/api/me/notifications/${workspace.manifest.fixtures.employee_notification_id}`, { data: { read_at: null } });
  expect(reset.status()).toBe(200);
  await page.goto("/ess/notifications");
  await page.getByRole("button", { name: /Review notification:/ }).click();
  const dialog = page.getByRole("dialog", { name: "Leave request received" });
  const endpoint = `**/api/me/notifications/${workspace.manifest.fixtures.employee_notification_id}`;

  await page.route(endpoint, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 200, contentType: "text/plain", body: "not-json" });
  });
  const malformedClick = dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("button", { name: "Saving read state" })).toBeDisabled();
  await malformedClick;
  await expect(dialog.getByRole("alert")).toContainText("could not be confirmed");
  await page.unroute(endpoint);

  await page.route(endpoint, (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Temporarily unavailable." }) }));
  await dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Temporarily unavailable");
  await page.unroute(endpoint);

  await page.route(endpoint, (route) => route.abort("connectionrefused"));
  await dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(dialog.getByRole("button", { name: "Mark read" })).toBeVisible();
});

test("ESS and MSS dialogs remain usable at 320px and short height", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  for (const [role, route, title] of [
    ["employee", "/ess/notifications", /Leave request received/],
    ["manager", "/mss/notifications", /Notification detail for Manager approval/],
  ] as const) {
    await login(page, role);
    await page.goto(route);
    await page.getByRole("button", { name: /Review notification/ }).first().click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    const measurements = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(measurements.bodyWidth).toBeLessThanOrEqual(measurements.viewport);
    await expect(dialog.getByRole("button", { name: /^Close / })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, `${role}-320x480.png`), fullPage: true });
    await page.keyboard.press("Escape");
  }
  writeFileSync(path.join(evidence, "responsive-measurements.json"), JSON.stringify({ viewport: { width: 320, height: 480 }, horizontalOverflow: false }, null, 2));
});
