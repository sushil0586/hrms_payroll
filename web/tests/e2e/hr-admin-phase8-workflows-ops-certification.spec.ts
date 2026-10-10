import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

const opsRoutes = [
  {
    path: "/hr-admin/saas-operations",
    heading: "SaaS Operations",
    stripHeading: "Tenant operating command",
    active: "Ops health",
    text: ["Operational triage", "Launch posture"],
  },
  {
    path: "/hr-admin/saas-control-plane",
    heading: "SaaS Control Plane",
    stripHeading: "Commercial and entitlement control",
    active: "Control plane",
    text: ["Tenant commercial state", "Required entitlements"],
  },
  {
    path: "/hr-admin/saas-resilience",
    heading: "SaaS Resilience",
    stripHeading: "Backup, restore, and retention proof",
    active: "Resilience",
    text: ["Readiness checks", "Backup and restore controls"],
  },
  {
    path: "/hr-admin/saas-sla-operations",
    heading: "SaaS SLA Ops",
    stripHeading: "Incident and SLA operating view",
    active: "SLA ops",
    text: ["Service-impact records", "SLA triage signals"],
  },
] as const;

async function expectRightAlignedActions(container: ReturnType<Page["locator"]>, selector: string) {
  const card = container.first();
  const actions = card.locator(selector).first();
  await expect(card).toBeVisible();
  await expect(actions).toBeVisible();
  const cardBox = await card.boundingBox();
  const actionsBox = await actions.boundingBox();
  expect(cardBox, "card should have a measurable box").not.toBeNull();
  expect(actionsBox, "actions should have a measurable box").not.toBeNull();
  if (cardBox && actionsBox) {
    expect(actionsBox.x + actionsBox.width).toBeGreaterThan(cardBox.x + cardBox.width - 260);
  }
}

test.describe("HR Admin phase 8 workflows and operations certification", () => {
  test("certifies workflow hub, filters, child catalog links, and form entry points", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/workflows");
    await expectPageReady(page, "Workflow control");

    await expect(page.locator(".workflow-workbench")).toBeVisible();
    await expect(page.locator(".workflow-filter-panel")).toBeVisible();
    await expect(page.locator(".workflow-trace-card").first()).toBeVisible();
    await expectRightAlignedActions(page.locator(".workflow-filter-panel"), ".queue-toolbar__actions");
    await expect(page.getByRole("link", { name: "Open workflow templates" })).toHaveAttribute("href", "/hr-admin/workflow-templates");
    await expect(page.getByRole("link", { name: "Open workflow assignments" })).toHaveAttribute("href", "/hr-admin/workflow-template-assignments");

    await page.getByRole("textbox", { name: "Search" }).fill("zz-no-workflow-trace-phase8");
    await page.getByRole("combobox", { name: "Module" }).selectOption("attendance");
    await page.getByRole("combobox", { name: "Status" }).selectOption("rejected");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/q=zz-no-workflow-trace-phase8/);
    await expect(page.getByText("No workflow traces match the current filters.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/workflow-templates");
    await expectPageReady(page, "Workflow templates");
    await expect(page.getByRole("link", { name: "Create workflow template" }).first()).toHaveAttribute("href", "/hr-admin/workflow-templates/new");
    await expect(page.getByRole("link", { name: "Open template assignments" })).toHaveAttribute("href", "/hr-admin/workflow-template-assignments");
    const templateCards = page.locator(".workflow-catalog-card");
    if ((await templateCards.count()) > 0) {
      await expect(templateCards.first()).toBeVisible();
      await expectRightAlignedActions(templateCards, ".record-card__actions");
      const templateEdit = templateCards.first().getByRole("link", { name: "Edit" });
      await expect(templateEdit).toBeVisible();
      await templateEdit.click();
      await expectPageReady(page, "Edit workflow template");
      await expect(page.getByRole("button", { name: /Save changes/ })).toBeVisible();
    } else {
      await expect(page.getByText("Create the first approval template.")).toBeVisible();
    }

    await gotoAuthenticated(page, "/hr-admin/workflow-templates/new");
    await expectPageReady(page, "Create workflow template");
    await expect(page.getByRole("button", { name: /Create workflow template/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/workflow-template-assignments");
    await expectPageReady(page, "Workflow template assignments");
    await expect(page.getByRole("link", { name: "Create workflow assignment" }).first()).toHaveAttribute("href", "/hr-admin/workflow-template-assignments/new");
    const assignmentCards = page.locator(".workflow-catalog-card");
    if ((await assignmentCards.count()) > 0) {
      await expect(assignmentCards.first()).toBeVisible();
      await expectRightAlignedActions(assignmentCards, ".record-card__actions");
      const assignmentEdit = assignmentCards.first().getByRole("link", { name: "Edit" });
      await expect(assignmentEdit).toBeVisible();
      const assignmentEditHref = await assignmentEdit.getAttribute("href");
      expect(assignmentEditHref).toMatch(/\/hr-admin\/workflow-template-assignments\/.+\/edit/);
      await page.goto(assignmentEditHref!, { waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Edit workflow assignment");
      await expect(page.getByRole("button", { name: /Save changes/ })).toBeVisible();
    } else {
      await expect(page.getByText("Assign a template to an org scope.")).toBeVisible();
    }

    await gotoAuthenticated(page, "/hr-admin/workflow-template-assignments/new");
    await expectPageReady(page, "Create workflow assignment");
    await expect(page.getByRole("button", { name: /Create assignment/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("certifies ops health routes, governance navigation, and launch links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of opsRoutes) {
      await gotoAuthenticated(page, route.path);
      await expectPageReady(page, route.heading);
      const strip = page.locator(".operations-governance-strip");
      await expect(strip).toBeVisible();
      await expect(strip.getByRole("heading", { name: route.stripHeading })).toBeVisible();
      await expect(strip.locator(".operations-governance-strip__link.is-active")).toContainText(route.active);
      for (const text of route.text) {
        await expect(page.locator("main").getByText(text).first()).toBeVisible();
      }
      await expect(strip.getByRole("link", { name: /Remediation/ })).toHaveAttribute("href", "/hr-admin/launch-remediation");
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    }

    await gotoAuthenticated(page, "/hr-admin/saas-operations");
    const strip = page.locator(".operations-governance-strip");
    await strip.getByRole("link", { name: /Control plane/ }).click();
    await expect(page).toHaveURL(/\/hr-admin\/saas-control-plane$/);
    await expectPageReady(page, "SaaS Control Plane");
  });

  test("certifies workflow and ops routes on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/hr-admin/workflows", "/hr-admin/workflow-templates", "/hr-admin/saas-operations", "/hr-admin/saas-sla-operations"]) {
      await gotoAuthenticated(page, path);
      await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
      await expectNoAppError(page);
      await expectNoHorizontalOverflow(page);
    }
  });
});
