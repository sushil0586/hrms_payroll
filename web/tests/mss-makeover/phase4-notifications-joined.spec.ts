import { execFileSync } from "node:child_process";
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
const evidence = path.join(repoRoot, "docs/qa/evidence/mss-makeover-phase4-2026-10-26");
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
}

function createNotification(
  role: "manager" | "employee",
  subjectType: "leave_request" | "attendance_regularization",
  subjectId: string,
  title: string,
) {
  const username = workspace.manifest.credentials[role].username;
  const code = [
    "import os",
    "from django.utils import timezone",
    "from apps.tenants.models import Tenant",
    "from apps.notifications.models import Notification",
    "tenant=Tenant.objects.get(id=os.environ['QA_TENANT_ID'])",
    "membership=tenant.memberships.get(user__username=os.environ['QA_USERNAME'])",
    "Notification.objects.create(tenant=tenant, channel='in_app', audience_type=os.environ['QA_ROLE'], subject_type=os.environ['QA_SUBJECT_TYPE'], subject_identifier=os.environ['QA_SUBJECT_ID'], recipient_membership=membership, recipient_identifier=os.environ['QA_USERNAME'], title=os.environ['QA_TITLE'], subject='MSS Phase 4 joined workflow', body='Open the source workflow to review the current request state.', status='delivered', priority='high', delivered_at=timezone.now(), payload={'owner':'mss-phase4'})",
  ].join(";");
  execFileSync(path.join(repoRoot, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", code], {
    cwd: repoRoot,
    env: {
      ...process.env,
      QA_TENANT_ID: workspace.manifest.tenant.id,
      QA_USERNAME: username,
      QA_ROLE: role,
      QA_SUBJECT_TYPE: subjectType,
      QA_SUBJECT_ID: subjectId,
      QA_TITLE: title,
    },
  });
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
  createNotification("manager", "leave_request", workspace.manifest.fixtures.leave_request_id, "Phase 4 leave approval alert");
  createNotification("manager", "attendance_regularization", workspace.manifest.fixtures.attendance_regularization_id, "Phase 4 attendance approval alert");
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("manager inbox keeps committed filters, read state, focus and safe approval handoffs", async ({ page }) => {
  await login(page, "manager");
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  await page.goto("/mss/notifications?q=Phase+4&status=delivered&channel=in_app&priority=high&page_size=25&page=1");
  await expect(page.getByText("Phase 4 leave approval alert", { exact: true })).toBeVisible();
  await expect(page.getByText("Phase 4 attendance approval alert", { exact: true })).toBeVisible();
  await expect(page.getByText("Manager triage", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Decision history" })).toHaveCount(0);

  const opener = page.getByRole("row").filter({ hasText: "Phase 4 leave approval alert" }).getByRole("button", { name: "Review notification" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Phase 4 leave approval alert/ });
  await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", `/mss/approvals?queue=leave&leaveId=${leaveId}`);
  await dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("button", { name: "Mark unread" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await expect(page).toHaveURL(/q=Phase\+4/);

  await opener.click();
  await dialog.getByRole("link", { name: "Open source" }).click();
  await expect(page).toHaveURL(new RegExp(`queue=leave.*leaveId=${leaveId}`));
  await expect(page.getByRole("heading", { name: "Selected leave request" })).toBeVisible();
});

test("owned Leave and Attendance decisions connect manager alerts to employee outcomes", async ({ page }) => {
  const leaveId = workspace.manifest.fixtures.leave_request_id;
  const regularizationId = workspace.manifest.fixtures.attendance_regularization_id;
  await login(page, "manager");

  await page.goto(`/mss/approvals?queue=leave&leaveId=${leaveId}`);
  await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
  const leaveDialog = page.getByRole("dialog", { name: /Review leave approval/ });
  await leaveDialog.getByLabel("Decision note").fill("Phase 4 joined leave approval");
  const leaveResponse = page.waitForResponse((response) => response.url().includes(`${leaveId}/approve`) && response.request().method() === "POST");
  await leaveDialog.getByRole("button", { name: "Approve request", exact: true }).click();
  expect((await leaveResponse).status()).toBe(200);
  await expect(leaveDialog).toHaveCount(0);

  await page.goto(`/mss/approvals?queue=attendance&regId=${regularizationId}`);
  await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).click();
  const attendanceDialog = page.getByRole("dialog", { name: /Review attendance approval/ });
  await attendanceDialog.getByLabel("Decision note").fill("Phase 4 joined attendance rejection");
  const attendanceResponse = page.waitForResponse((response) => response.url().includes(`${regularizationId}/reject`) && response.request().method() === "POST");
  await attendanceDialog.getByRole("button", { name: "Reject request", exact: true }).click();
  expect((await attendanceResponse).status()).toBe(200);
  await expect(attendanceDialog).toHaveCount(0);

  createNotification("employee", "leave_request", leaveId, "Phase 4 leave approved");
  createNotification("employee", "attendance_regularization", regularizationId, "Phase 4 attendance rejected");

  await login(page, "employee");
  await page.goto("/ess/notifications?q=Phase+4");
  await expect(page.getByText("Phase 4 leave approved", { exact: true })).toBeVisible();
  await page.getByRole("row").filter({ hasText: "Phase 4 leave approved" }).getByRole("button", { name: "Review notification" }).click();
  await expect(page.getByRole("dialog", { name: "Phase 4 leave approved" }).getByRole("link", { name: "Open source" }))
    .toHaveAttribute("href", `/ess/leave?requestId=${leaveId}`);
  await page.keyboard.press("Escape");

  await page.getByRole("row").filter({ hasText: "Phase 4 attendance rejected" }).getByRole("button", { name: "Review notification" }).click();
  await expect(page.getByRole("dialog", { name: "Phase 4 attendance rejected" }).getByRole("link", { name: "Open source" }))
    .toHaveAttribute("href", `/ess/attendance?regId=${regularizationId}`);
  await page.keyboard.press("Escape");

  await page.goto(`/ess/leave?status=approved&requestId=${leaveId}`);
  await expect(page.getByRole("dialog")).toContainText(/approved/i);
  await page.goto(`/ess/attendance?status=rejected&regId=${regularizationId}`);
  await expect(page.getByRole("dialog")).toContainText(/rejected/i);
});

test("empty, stale, compact and cross-role notification states remain distinct", async ({ page }) => {
  await login(page, "manager_b");
  await page.goto("/mss/notifications");
  await expect(page.getByText("No notifications yet.", { exact: true })).toBeVisible();

  await login(page, "manager");
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/mss/notifications?q=Manager+approval");
  await page.getByRole("button", { name: "Review notification" }).click();
  const staleDialog = page.getByRole("dialog", { name: /Manager approval needs review/ });
  await expect(staleDialog.getByRole("link", { name: "Open source" })).toHaveCount(0);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-mss-inbox-320x480.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await axeScan(page, "mss-inbox");

  await login(page, "employee");
  expect((await page.request.patch(`/api/me/notifications/${workspace.manifest.fixtures.manager_notification_id}`, {
    data: { read_at: new Date().toISOString() },
  })).status()).toBe(404);
});
