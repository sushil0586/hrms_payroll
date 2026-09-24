import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, payrollFinanceManager } from "../helpers/staging-auth";

function main(page: Page) {
  return page.locator("main").first();
}

function actionPanel(page: Page, name: string) {
  return main(page).getByLabel(name);
}

async function expectPanelChrome(panel: Locator, heading: string, expectedControls: number) {
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: heading })).toBeVisible();
  await expect(panel.getByText(`${expectedControls} controls`)).toBeVisible();
}

async function expectCardHasDisabledReason(card: Locator) {
  const reason = card.locator(".muted, .section-copy").filter({ hasText: /\S/ }).last();
  await expect(reason).toBeVisible();
}

async function expectProfileInput(panel: Locator, label: string) {
  const field = panel.getByLabel(label);
  await expect(field).toBeVisible();
  const card = field.locator("xpath=ancestor::article[1]");
  if (!(await field.isEnabled())) {
    await expect(field).toBeDisabled();
    await expectCardHasDisabledReason(card);
    return;
  }
  const currentValue = await field.inputValue();
  await field.fill(`${currentValue || "tenant.payroll.browser.cert"}.pw`);
  await expect(field).toHaveValue(/\.pw$/);
}

async function clickAndExpectDomainResponse(page: Page, panel: Locator, buttonName: string, routePattern: RegExp) {
  const button = panel.getByRole("button", { name: buttonName });
  const card = button.locator("xpath=ancestor::article[1]");
  await expect(button).toBeVisible();
  if (!(await button.isEnabled())) {
    await expect(button).toBeDisabled();
    await expectCardHasDisabledReason(card);
    return false;
  }
  const responsePromise = page.waitForResponse((response) => routePattern.test(response.url()), { timeout: 30000 });
  await button.click();
  const response = await responsePromise;
  expect([200, 201, 400]).toContain(response.status());
  expect([401, 403, 404, 500]).not.toContain(response.status());
  await expect(
    main(page).getByRole("status").or(main(page).getByRole("alert")),
  ).toBeVisible();
  return true;
}

test.describe("Phase 5B payroll close action controls", () => {
  test("calculation page certifies every close action control and authenticated draft/review endpoints", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", hrAdmin);
    await expectPageReady(page, "Payroll Calculations");

    const panel = actionPanel(page, "Calculation controls");
    await expectPanelChrome(panel, "Calculation controls", 2);
    await expectProfileInput(panel, "Calculation profile ref");
    await expectProfileInput(panel, "Review profile ref");
    await clickAndExpectDomainResponse(page, panel, "Calculate draft", /\/api\/hr-admin\/payroll-runs\/.+\/calculate-draft/);
    await clickAndExpectDomainResponse(page, panel, "Open review", /\/api\/hr-admin\/payroll-runs\/.+\/open-review/);
    await expectNoHorizontalOverflow(page);
  });

  test("review page certifies submit, approve, lock, and output generation controls", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-review", hrAdmin);
    await expectPageReady(page, "Payroll Review");

    const panel = actionPanel(page, "Review controls");
    await expectPanelChrome(panel, "Review controls", 4);
    await expect(panel.getByRole("button", { name: "Submit review" })).toBeEnabled();
    await expectProfileInput(panel, "Approval profile ref");
    await expect(panel.getByRole("button", { name: "Approve review" })).toBeEnabled();
    await expect(panel.getByRole("button", { name: "Final lock" })).toBeEnabled();
    await expectProfileInput(panel, "Output profile ref");
    await expect(panel.getByRole("button", { name: "Generate outputs" })).toBeEnabled();

    await clickAndExpectDomainResponse(page, panel, "Approve review", /\/api\/hr-admin\/payroll-reviews\/.+\/approve/);
    await expectNoHorizontalOverflow(page);
  });

  test("outputs page certifies publish and finance handoff generation controls", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");

    const panel = actionPanel(page, "Output controls");
    await expectPanelChrome(panel, "Output controls", 2);
    await expect(panel.getByRole("button", { name: "Publish outputs" })).toBeEnabled();
    await expectProfileInput(panel, "Handoff profile ref");
    await expect(panel.getByRole("button", { name: "Generate handoff" })).toBeEnabled();

    await clickAndExpectDomainResponse(page, panel, "Publish outputs", /\/api\/hr-admin\/payroll-output-batches\/.+\/publish/);
    await expectNoHorizontalOverflow(page);
  });

  test("handoff page certifies transmit, acknowledgement, and provider audit-pack controls", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", payrollFinanceManager);
    await expectPageReady(page, "Payroll Handoff");

    const panel = actionPanel(page, "Handoff controls");
    await expectPanelChrome(panel, "Handoff controls", 3);
    const transmitButton = panel.getByRole("button", { name: "Transmit handoff" });
    await expect(transmitButton).toBeVisible();
    await expectProfileInput(panel, "Acknowledgement profile ref");
    await expect(panel.getByRole("button", { name: "Acknowledge handoff" })).toBeVisible();
    await expectProfileInput(panel, "Audit pack profile ref");
    const auditPackButton = panel.getByRole("button", { name: "Generate audit pack" });
    await expect(auditPackButton).toBeVisible();

    await clickAndExpectDomainResponse(page, panel, "Transmit handoff", /\/api\/hr-admin\/payroll-finance-handoffs\/.+\/transmit/);
    await clickAndExpectDomainResponse(page, panel, "Acknowledge handoff", /\/api\/hr-admin\/payroll-finance-handoffs\/.+\/acknowledge/);
    await clickAndExpectDomainResponse(page, panel, "Generate audit pack", /\/api\/hr-admin\/payroll-finance-handoffs\/.+\/generate-audit-pack/);
    await expectNoHorizontalOverflow(page);
  });
});
