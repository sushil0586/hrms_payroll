import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/qa/evidence/workflow-notification-phase1-2026-10-24");
const unavailableId = "00000000-0000-4000-8000-000000000000";

let workspace: IsolatedQaWorkspace;
let notificationId = unavailableId;
let workflowTemplateId = unavailableId;
let workflowAssignmentId = unavailableId;
let notificationTemplateId = unavailableId;
let notificationEventId = unavailableId;

const routes = [
  ["/hr-admin/workflows", "Workflow control", "hr_admin"],
  ["/hr-admin/workflow-templates", "Workflow templates", "hr_admin"],
  ["/hr-admin/workflow-templates/new", "Create workflow template", "hr_admin"],
  ["workflow-template-edit", "Edit workflow template", "hr_admin"],
  ["/hr-admin/workflow-template-assignments", "Workflow template assignments", "hr_admin"],
  ["/hr-admin/workflow-template-assignments/new", "Create workflow assignment", "hr_admin"],
  ["workflow-assignment-edit", "Edit workflow assignment", "hr_admin"],
  ["/hr-admin/notifications-admin", "Notifications", "hr_admin"],
  ["/hr-admin/notification-delivery", "Notification delivery", "hr_admin"],
  ["/hr-admin/notification-templates", "Notification templates", "hr_admin"],
  ["/hr-admin/notification-templates/new", "Create notification template", "hr_admin"],
  ["notification-template-edit", "Edit notification template", "hr_admin"],
  ["/hr-admin/notification-events", "Notification events", "hr_admin"],
  ["/hr-admin/notification-events/new", "Create notification event", "hr_admin"],
  ["notification-event-edit", "Edit notification event", "hr_admin"],
  ["/hr-admin/notifications", "Notification queue", "hr_admin"],
  ["notification-review", "Notification review", "hr_admin"],
  ["/hr-admin/notification-diagnostics", "Notification diagnostics", "hr_admin"],
  ["/ess/notifications", "Notifications", "employee"],
  ["/mss/notifications", "Manager notifications", "manager"],
] as const;

async function login(page: Page, role: "hr_admin" | "employee" | "manager") {
  const persona = workspacePersona(workspace, role);
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(response.status()).toBe(200);
}

test.beforeAll(async ({ request }, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  mkdirSync(path.join(evidenceRoot, "screens"), { recursive: true });
  const persona = workspacePersona(workspace, "hr_admin");
  const login = await request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(login.status()).toBe(200);
  const stamp = Date.now();
  const workflowTemplate = await request.post("/api/hr-admin/workflow-templates", { data: {
    code: `WN_P1_${stamp}`, name: "Phase 1 workflow template", module: "leave",
    trigger_key: `wn.phase1.${stamp}`, status: "active", version: 1, condition_snapshot: {},
    steps: [{ step_order: 1, name: "Manager review", mode: "sequential", actor_type: "manager" }],
  } });
  expect(workflowTemplate.status()).toBe(201);
  workflowTemplateId = (await workflowTemplate.json() as { id: string }).id;
  const assignment = await request.post("/api/hr-admin/workflow-template-assignments", { data: {
    template_id: workflowTemplateId, priority: 901, is_active: true,
  } });
  expect(assignment.status()).toBe(201);
  workflowAssignmentId = (await assignment.json() as { id: string }).id;
  const template = await request.post("/api/hr-admin/notification-templates", { data: {
    code: `WN_P1_${stamp}`, name: "Phase 1 notification template", channel: "in_app", status: "active",
    title_template: "Phase 1 update", body_template: "Phase 1 baseline message", metadata_template: {},
  } });
  expect(template.status()).toBe(201);
  notificationTemplateId = (await template.json() as { id: string }).id;
  const event = await request.post("/api/hr-admin/notification-events", { data: {
    code: `WN_P1_EVT_${stamp}`, name: "Phase 1 notification event", module: "leave",
    trigger_key: `wn.phase1.event.${stamp}`, audience_type: "custom", channel: "in_app",
    template_id: notificationTemplateId, is_active: true, priority: "normal", recipient_snapshot: {},
  } });
  expect(event.status()).toBe(201);
  notificationEventId = (await event.json() as { id: string }).id;
  notificationId = workspace.manifest.fixtures.manager_notification_id;
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("inventory contains exactly 20 unique route patterns", async () => {
  expect(routes).toHaveLength(20);
  expect(new Set(routes.map(([route]) => route)).size).toBe(20);
});

for (const [routeKey, heading, role] of routes) {
  test(`${routeKey} passes the Phase 1 responsive and keyboard baseline`, async ({ page }, info) => {
    await login(page, role);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dynamicRoutes: Record<string, string> = {
      "workflow-template-edit": `/hr-admin/workflow-templates/${workflowTemplateId}/edit`,
      "workflow-assignment-edit": `/hr-admin/workflow-template-assignments/${workflowAssignmentId}/edit`,
      "notification-template-edit": `/hr-admin/notification-templates/${notificationTemplateId}/edit`,
      "notification-event-edit": `/hr-admin/notification-events/${notificationEventId}/edit`,
      "notification-review": `/hr-admin/notifications/${notificationId}/review`,
    };
    const route = dynamicRoutes[routeKey] ?? routeKey;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const regions = page.locator("main .workspace-table-region:visible");
      for (let index = 0; index < await regions.count(); index += 1) {
        await expect(regions.nth(index)).toHaveAttribute("tabindex", "0");
        await expect(regions.nth(index)).toHaveAccessibleName(/.+/);
      }
    }

    const firstControl = page.locator('main :is(a[href],button,input,select,textarea):visible:not([disabled])').first();
    if (await firstControl.count()) {
      await firstControl.focus();
      await expect(firstControl).toBeFocused();
      await page.keyboard.press("Tab");
    }
    if (info.project.name === "chromium") {
      const slug = routeKey.replaceAll("/", "-").replaceAll("[", "").replaceAll("]", "").replace(/^-/, "");
      await page.screenshot({ path: path.join(evidenceRoot, "screens", `${slug}-320.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
