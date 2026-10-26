import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

const repoRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(repoRoot, "docs/qa/evidence/workflow-notification-phase6-2026-10-26");
let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;
let leaveRequestId = "";
let workflowReference = "";
let managerNotificationId = "";

async function login(page: Page, role: "hr_admin" | "employee" | "manager", target = workspace) {
  const persona = workspacePersona(target, role);
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.status()).toBe(200);
}

async function backendHeaders(context: BrowserContext) {
  const token = (await context.cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function backend(request: APIRequestContext, context: BrowserContext, method: "get" | "post" | "patch", route: string, data?: object) {
  return request[method](`http://127.0.0.1:8001/api/v1${route}`, { headers: await backendHeaders(context), data });
}

function processNotifications() {
  execFileSync(path.join(repoRoot, ".venv/bin/python"), ["backend/manage.py", "process_notifications", "--tenant-code", workspace.manifest.tenant.code], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });
}

async function configureJoinedFlow(page: Page) {
  await login(page, "hr_admin");
  const stamp = Date.now();
  const workflow = await backend(page.request, page.context(), "post", "/hr-admin/workflow-templates/", {
    code: `WN_P6_${stamp}`,
    name: "Phase 6 joined leave workflow",
    module: "leave",
    trigger_key: "leave.request",
    status: "active",
    version: 1,
    condition_snapshot: { owner: "phase6" },
    steps: [{ step_order: 1, name: "Manager decision", mode: "sequential", actor_type: "manager" }],
  });
  expect(workflow.status()).toBe(201);
  const workflowId = (await workflow.json() as { id: string }).id;
  const assignment = await backend(page.request, page.context(), "post", "/hr-admin/workflow-template-assignments/", {
    template_id: workflowId,
    priority: 906,
    is_active: true,
  });
  expect(assignment.status()).toBe(201);

  for (const definition of [
    { code: `P6_MANAGER_${stamp}`, name: "Phase 6 manager event", trigger_key: "leave.request.manager_pending", audience_type: "manager", title: "Phase 6 manager leave {leave_request_id}", body: "Review joined leave {leave_request_id}." },
    { code: `P6_EMPLOYEE_${stamp}`, name: "Phase 6 employee event", trigger_key: "leave.request.employee_updated", audience_type: "employee", title: "Phase 6 employee leave {leave_request_id}", body: "Joined leave {leave_request_id} is now {status}." },
  ]) {
    const template = await backend(page.request, page.context(), "post", "/hr-admin/notification-templates/", {
      code: `${definition.code}_TPL`, name: `${definition.name} template`, channel: "in_app", status: "active",
      title_template: definition.title, subject_template: "Joined workflow update", body_template: definition.body,
      metadata_template: { owner: "phase6" },
    });
    expect(template.status()).toBe(201);
    const templateId = (await template.json() as { id: string }).id;
    const event = await backend(page.request, page.context(), "post", "/hr-admin/notification-events/", {
      code: definition.code, name: definition.name, module: "leave", trigger_key: definition.trigger_key,
      audience_type: definition.audience_type, channel: "in_app", template_id: templateId,
      is_active: true, priority: "high", delivery_delay_minutes: 0, recipient_snapshot: { owner: "phase6" },
    });
    expect(event.status()).toBe(201);
  }

  const configs = await backend(page.request, page.context(), "get", "/hr-admin/notification-channel-configs/");
  expect(configs.status()).toBe(200);
  const inApp = (await configs.json() as Array<{ id: string; channel: string }>).find((item) => item.channel === "in_app");
  expect(inApp).toBeTruthy();
  const disabled = await backend(page.request, page.context(), "patch", `/hr-admin/notification-channel-configs/${inApp!.id}/`, { is_enabled: false });
  expect(disabled.status()).toBe(200);
  return inApp!.id;
}

async function axeScan(page: Page, name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
  writeFileSync(path.join(evidence, `${test.info().project.name}-${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

test.beforeAll(async ({ browser }, info) => {
  mkdirSync(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
  foreignWorkspace = await provisionIsolatedQaWorkspace(info);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3285" });
  const page = await context.newPage();
  const channelConfigId = await configureJoinedFlow(page);

  await login(page, "employee");
  let submissionPayload: { id: string; workflow_reference: string } | undefined;
  await page.route("**/api/me/leave-requests", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const upstream = await route.fetch();
    const body = await upstream.body();
    submissionPayload = JSON.parse(body.toString("utf8"));
    await route.fulfill({ response: upstream, body });
  });
  await page.goto("/ess/leave");
  await page.getByRole("button", { name: "Apply leave", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Apply leave", exact: true });
  await dialog.getByLabel("Start date", { exact: true }).fill("2026-11-10");
  await dialog.getByLabel("End date", { exact: true }).fill("2026-11-10");
  await dialog.getByLabel("Reason for leave").fill("Phase 6 joined certification");
  const submitted = page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Submit leave", exact: true }).click();
  const submission = await submitted;
  expect(submission.status()).toBe(201);
  expect(submissionPayload).toBeTruthy();
  leaveRequestId = submissionPayload!.id;
  workflowReference = submissionPayload!.workflow_reference;
  expect(workflowReference).toBeTruthy();

  processNotifications();
  await login(page, "hr_admin");
  const queue = await backend(page.request, page.context(), "get", `/hr-admin/notifications/?q=${encodeURIComponent(leaveRequestId)}&page_size=50`);
  const managerItem = (await queue.json() as { items: Array<{ id: string; title: string; status: string }> }).items.find((item) => item.title.startsWith("Phase 6 manager leave"));
  expect(managerItem?.status).toBe("cancelled");
  managerNotificationId = managerItem!.id;
  const enabled = await backend(page.request, page.context(), "patch", `/hr-admin/notification-channel-configs/${channelConfigId}/`, { is_enabled: true });
  expect(enabled.status()).toBe(200);
  const retried = await backend(page.request, page.context(), "post", `/hr-admin/notifications/${managerNotificationId}/retry/`, { process_now: true });
  expect(retried.status()).toBe(200);
  expect((await retried.json() as { status: string }).status).toBe("delivered");
  await context.close();
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
  await cleanupIsolatedQaWorkspace(foreignWorkspace);
});

test("joined configuration, trace, retry, MSS decision and ESS consumption remain connected", async ({ page }) => {
  await login(page, "hr_admin");
  await page.goto(`/hr-admin/workflows?q=${leaveRequestId}`);
  await expect(page.getByText("Phase 6 joined leave workflow", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workflow timeline" }).getByText("1", { exact: true }).first()).toBeVisible();
  await page.goto(`/hr-admin/notifications?q=${leaveRequestId}&page_size=50`);
  const managerQueueCard = page.locator("article", { hasText: `Phase 6 manager leave ${leaveRequestId}` });
  await expect(managerQueueCard).toBeVisible();
  await expect(managerQueueCard).toContainText("delivered");

  await login(page, "manager");
  await page.goto(`/mss/notifications?q=${leaveRequestId}`);
  await page.getByRole("button", { name: "Review notification" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Open source" })).toHaveAttribute("href", new RegExp(leaveRequestId));
  await page.keyboard.press("Escape");
  const decision = await page.request.post(`/api/manager/leave-requests/${leaveRequestId}/approve`, { data: { comment: "Phase 6 joined approval" } });
  expect(decision.status()).toBe(200);
  const repeated = await page.request.post(`/api/manager/leave-requests/${leaveRequestId}/approve`, { data: { comment: "Repeated Phase 6 request" } });
  expect([400, 404, 409]).toContain(repeated.status());
  processNotifications();

  await login(page, "employee");
  await page.goto(`/ess/notifications?q=${leaveRequestId}`);
  await expect(page.getByText(new RegExp(`Phase 6 employee leave ${leaveRequestId}`)).first()).toBeVisible();
  await page.getByRole("button", { name: /Review notification:/ }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Open source" })).toHaveAttribute("href", new RegExp(leaveRequestId));
});

test("wrong role, foreign tenant and stale identifiers remain unavailable", async ({ page }) => {
  await login(page, "employee");
  expect((await page.request.post(`/api/manager/leave-requests/${leaveRequestId}/approve`, { data: { comment: "Wrong role" } })).status()).toBe(403);
  expect((await page.request.patch(`/api/me/notifications/${managerNotificationId}`, { data: { read_at: null } })).status()).toBe(404);
  await login(page, "manager", foreignWorkspace);
  expect((await page.request.post(`/api/manager/leave-requests/${leaveRequestId}/approve`, { data: { comment: "Foreign tenant" } })).status()).toBe(404);
  await page.goto("/mss/notifications");
  await expect(page.getByText(new RegExp(leaveRequestId))).toHaveCount(0);
});

test("joined surfaces retain keyboard, responsive and selected accessibility contracts", async ({ page }) => {
  const sizes = [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 320, height: 480 }];
  await login(page, "hr_admin");
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto(`/hr-admin/notifications?q=${leaveRequestId}`);
    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 12)
        .map((element) => ({ className: element.className, right: element.getBoundingClientRect().right, tag: element.tagName, text: element.textContent?.trim().slice(0, 80) })),
    }));
    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      writeFileSync(path.join(evidence, `${test.info().project.name}-overflow-${size.width}.json`), JSON.stringify(overflow, null, 2));
    }
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
  await axeScan(page, "hr-queue");
  await login(page, "manager");
  await page.goto(`/mss/notifications?q=${leaveRequestId}`);
  const opener = page.getByRole("button", { name: "Review notification" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await axeScan(page, "mss-inbox");
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-joined-320x480.png`), fullPage: true });
});
