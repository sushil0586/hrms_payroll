import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

test.describe("HR admin payroll review flows", () => {
  test.setTimeout(60_000);

  test("review workspace exposes exceptions, approvals, final lock controls, and live detail", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-review", payrollOperator);
    await expectPageReady(page, "Payroll Review");

    const setupResponse = await page.request.get("/api/hr-admin/payroll-review-setup?review_page_size=10&exception_page_size=10&approval_page_size=10&line_page_size=10");
    const setupBody = await setupResponse.body();
    const setupPayload = JSON.parse(setupBody.toString());
    expect(setupResponse.ok()).toBeTruthy();
    expect(setupPayload.calculations.length, "review setup should only include selected review calculation context").toBeLessThanOrEqual(1);
    expect(setupPayload.exceptions.length, "review setup should honor compact exception page size").toBeLessThanOrEqual(10);
    expect(setupPayload.approvals.length, "review setup should honor compact approval page size").toBeLessThanOrEqual(10);
    expect(setupPayload.lines.length, "review setup should honor compact line page size").toBeLessThanOrEqual(10);
    expect(setupBody.length, "review setup payload should stay compact").toBeLessThan(350_000);

    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Payroll review desk" })).toBeVisible();
    await expect(page.getByText("Selected review").or(page.getByText("Review detail")).or(page.getByText("No review selected")).or(page.getByRole("heading", { name: "No review" })).first()).toBeVisible();
    await expect(page.getByText("Exception register").first()).toBeVisible();
    await expect(page.getByText("Approval trail").first()).toBeVisible();
    await expect(page.getByText("Final lock").first()).toBeVisible();
    await expect(page.getByText("Selected exception").or(page.getByText("No exception selected")).first()).toBeVisible();

    const exceptionLink = page.locator("main table a[href*='exceptionId=']").first();
    if (await exceptionLink.isVisible().catch(() => false)) {
      const href = await exceptionLink.getAttribute("href");
      expect(href).toContain("exceptionId=");
      await exceptionLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/exceptionId=/),
        exceptionLink.click(),
      ]);
      await expect(page).toHaveURL(/exceptionId=/);
      await expect(page.getByText("Approval").or(page.getByText("Source")).or(page.getByText("Exception")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("exception controls validate input and recover from API failures", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-review", payrollOperator);
    await expectPageReady(page, "Payroll Review");

    const actions = page.getByRole("region", { name: "Exception actions" });
    await expect(actions).toBeVisible();
    await actions.scrollIntoViewIfNeeded();

    const title = actions.getByLabel("Title");
    const detail = actions.getByLabel("Detail");
    const category = actions.getByLabel("Category");
    const createButton = actions.getByRole("button", { name: "Create exception" });

    if (await createButton.isEnabled().catch(() => false)) {
      await title.fill("Bad");
      await createButton.click();
      await expect(actions.getByText("Exception title must be at least 5 characters.")).toBeVisible();

      await title.fill(`Browser review exception ${Date.now()}`);
      await detail.fill("Short");
      await createButton.click();
      await expect(actions.getByText("Exception detail must explain the payroll issue in at least 10 characters.")).toBeVisible();

      await detail.fill("Browser test confirms failed exception creation shows a recoverable error.");
      await category.fill("manual_review");
      await page.route("**/api/hr-admin/payroll-reviews/*/exceptions", (route) => route.abort());
      await createButton.click();
      await expect(actions.getByText("Network connection failed while creating the exception. Please retry.")).toBeVisible();
      await page.unroute("**/api/hr-admin/payroll-reviews/*/exceptions");
      await expect(createButton).toBeEnabled();
    }

    const decisionReason = actions.getByLabel("Decision reason");
    const decisionButton = actions.getByRole("button", { name: "Save decision" });
    if (await decisionButton.isEnabled().catch(() => false)) {
      await decisionReason.fill("short");
      await decisionButton.click();
      await expect(actions.getByText("Decision reason must explain the action in at least 10 characters.")).toBeVisible();

      await decisionReason.fill("Browser validation confirms decision failures recover cleanly.");
      await page.route("**/api/hr-admin/payroll-review-exceptions/*/decision", (route) => route.abort());
      await decisionButton.click();
      await expect(actions.getByText("Network connection failed while saving the exception decision. Please retry.")).toBeVisible();
      await page.unroute("**/api/hr-admin/payroll-review-exceptions/*/decision");
      await expect(decisionButton).toBeEnabled();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("review workspace remains stable on mobile and browser history navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-review", payrollOperator);
    await expectPageReady(page, "Payroll Review");

    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Payroll review desk" })).toBeVisible();

    const exceptionLink = page.locator("main table a[href*='exceptionId=']").first();
    if (await exceptionLink.isVisible().catch(() => false)) {
      await exceptionLink.scrollIntoViewIfNeeded();
      await exceptionLink.click();
      await expect(page).toHaveURL(/exceptionId=/);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Payroll Review");
      await expect(page).toHaveURL(/exceptionId=/);
      await page.goBack();
      await expectPageReady(page, "Payroll Review");
      await page.goForward();
      await expectPageReady(page, "Payroll Review");
    }

    await expectNoHorizontalOverflow(page);
  });
});
