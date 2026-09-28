import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const artifactDir = path.join(process.cwd(), "test-results/hr-admin-setup-dynamic-routes");

type CreatedSetupRecords = {
  legalEntityId: string;
  workflowTemplateId: string;
  workflowAssignmentId: string;
};

async function postJson<T>(page: Page, url: string, data: Record<string, unknown>) {
  const response = await page.request.post(url, { data });
  const payload = await response.json().catch(() => null);
  expect(response.ok(), `${url} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload as T;
}

async function createSetupRecords(page: Page): Promise<CreatedSetupRecords> {
  await gotoAuthenticated(page, "/hr-admin/organization");
  const runSuffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 100_000).toString(36)}`;

  const legalEntity = await postJson<{ id: string }>(page, "/api/hr-admin/organization/legal_entities", {
    code: `pw-dyn-le-${runSuffix}`,
    name: `PW Dynamic Legal Entity ${runSuffix}`,
    registered_name: `PW Dynamic Legal Entity ${runSuffix} Pvt Ltd`,
    country_code: "IN",
    timezone: "Asia/Kolkata",
    primary_email: `pw-dyn-le-${runSuffix}@example.test`,
    primary_phone: "+91 9876543210",
    is_active: true,
  });

  const workflowTemplate = await postJson<{ id: string }>(page, "/api/hr-admin/workflow-templates", {
    code: `PW_DYN_WF_${runSuffix}`.toUpperCase(),
    name: `PW Dynamic Workflow ${runSuffix}`,
    module: "leave",
    trigger_key: `pw_dynamic_${runSuffix}`,
    description: "Playwright-created workflow template for dynamic route visual certification.",
    status: "active",
    version: 1,
    is_system_seeded: false,
    effective_from: null,
    effective_to: null,
    condition_snapshot: {},
    steps: [
      {
        step_order: 1,
        name: "Manager review",
        mode: "sequential",
        actor_type: "manager",
        role_id: null,
        membership_id: null,
        permission_key: "",
        scope_type: "direct_reports",
        auto_approve_after_hours: 24,
        escalate_after_hours: 48,
        allow_delegate: true,
        allow_send_back: true,
        allow_comment: true,
        rule_snapshot: {},
      },
    ],
  });

  const workflowAssignment = await postJson<{ id: string }>(page, "/api/hr-admin/workflow-template-assignments", {
    template_id: workflowTemplate.id,
    legal_entity_id: legalEntity.id,
    branch_id: null,
    department_id: null,
    business_unit_id: null,
    grade_id: null,
    priority: 900_000 + Math.floor(Date.now() % 10_000),
    is_active: true,
  });

  return {
    legalEntityId: legalEntity.id,
    workflowTemplateId: workflowTemplate.id,
    workflowAssignmentId: workflowAssignment.id,
  };
}

async function capture(page: Page, name: string) {
  mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function expectActionGroupRightAligned(page: Page, route: string) {
  const actionGroups = page.locator(".form-actions-bar__buttons, .form-shell-card__actions").filter({ has: page.getByRole("button") });
  const count = await actionGroups.count();
  expect(count, `${route} should expose a form action group`).toBeGreaterThan(0);

  const group = actionGroups.last();
  await expect(group).toBeVisible();
  const card = group.locator("xpath=ancestor::*[contains(@class, 'form-shell-card')][1]");
  const groupBox = await group.boundingBox();
  const cardBox = await card.boundingBox();
  expect(groupBox, `${route} action group should have a measurable box`).not.toBeNull();
  expect(cardBox, `${route} form card should have a measurable box`).not.toBeNull();

  if (groupBox && cardBox && page.viewportSize()?.width && page.viewportSize()!.width >= 900) {
    expect(groupBox.x + groupBox.width, `${route} actions should align near the right edge of the form card`).toBeGreaterThan(
      cardBox.x + cardBox.width - 260,
    );
  }
}

async function auditSetupChildRoute(page: Page, route: string, heading: string | RegExp, screenshotName: string) {
  await gotoAuthenticated(page, route);
  await expectPageReady(page, heading);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, route);
  await auditVisibleControls(page, route, 32);
  await expectActionGroupRightAligned(page, route);
  await capture(page, screenshotName);
}

test.describe("HR admin setup dynamic route polish", () => {
  test("organization and workflow child create/edit routes are aligned and correctly wired", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 960 });
    const records = await createSetupRecords(page);

    await auditSetupChildRoute(page, "/hr-admin/organization/legal_entities/new", /Create legal entity/i, "desktop-organization-legal-entity-new");
    await auditSetupChildRoute(
      page,
      `/hr-admin/organization/legal_entities/${records.legalEntityId}/edit`,
      /Edit legal entity/i,
      "desktop-organization-legal-entity-edit",
    );
    await auditSetupChildRoute(
      page,
      `/hr-admin/workflow-templates/${records.workflowTemplateId}/edit`,
      "Edit workflow template",
      "desktop-workflow-template-edit",
    );
    await auditSetupChildRoute(
      page,
      `/hr-admin/workflow-template-assignments/${records.workflowAssignmentId}/edit`,
      "Edit workflow assignment",
      "desktop-workflow-assignment-edit",
    );

    await expect(page.getByRole("link", { name: "Back to workflow assignments" })).toHaveAttribute(
      "href",
      "/hr-admin/workflow-template-assignments",
    );
  });

  test("setup dynamic child routes remain smooth on mobile", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: 390, height: 844 });
    const records = await createSetupRecords(page);

    for (const route of [
      "/hr-admin/organization/legal_entities/new",
      `/hr-admin/organization/legal_entities/${records.legalEntityId}/edit`,
      `/hr-admin/workflow-templates/${records.workflowTemplateId}/edit`,
      `/hr-admin/workflow-template-assignments/${records.workflowAssignmentId}/edit`,
    ]) {
      await gotoAuthenticated(page, route);
      await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    }

    await capture(page, "mobile-workflow-assignment-edit");
  });
});
