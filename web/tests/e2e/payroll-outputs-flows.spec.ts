import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

test.describe("HR admin payroll output flows", () => {
  test("outputs workspace exposes artifact register, storage strategy, and live artifact details", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", payrollOperator);
    await expectPageReady(page, "Payroll Outputs");

    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Output publication desk" })).toBeVisible();
    await expect(page.getByText("Selected batch").or(page.getByText("No output batches are available yet")).first()).toBeVisible();
    await expect(page.getByText("Artifact register").first()).toBeVisible();
    await expect(page.getByText("Finance handoff readiness").first()).toBeVisible();
    await expect(page.getByText("Selected artifact").or(page.getByText("No artifact selected")).first()).toBeVisible();
    await expect(page.getByText("Storage").or(page.getByText("Source hash")).or(page.getByText("No output artifacts")).first()).toBeVisible();

    const artifactLink = page.locator("main table a[href*='artifactId=']").first();
    if (await artifactLink.isVisible().catch(() => false)) {
      const href = await artifactLink.getAttribute("href");
      expect(href).toContain("artifactId=");
      await artifactLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/artifactId=/),
        artifactLink.click(),
      ]);
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Access governance").or(page.getByText("Download file")).or(page.getByText("Storage")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("outputs workspace preserves artifact selection through refresh and history", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", payrollOperator);
    await expectPageReady(page, "Payroll Outputs");

    const artifactLink = page.locator("main table a[href*='artifactId=']").first();
    if (await artifactLink.isVisible().catch(() => false)) {
      await artifactLink.scrollIntoViewIfNeeded();
      await artifactLink.click();
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Selected artifact")).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Payroll Outputs");
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Selected artifact")).toBeVisible();

      await page.goBack();
      await expectPageReady(page, "Payroll Outputs");
      await page.goForward();
      await expectPageReady(page, "Payroll Outputs");
      await expect(page).toHaveURL(/artifactId=/);
    }

    await expectNoHorizontalOverflow(page);
  });

  test("output controls surface disabled reasons and recover from network failures", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", payrollOperator);
    await expectPageReady(page, "Payroll Outputs");

    const controls = page.getByLabel("Output controls");
    await expect(controls).toBeVisible();
    await expect(controls.getByRole("button", { name: "Publish outputs" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Generate handoff" })).toBeVisible();

    const publishButton = controls.getByRole("button", { name: "Publish outputs" });
    if (await publishButton.isEnabled().catch(() => false)) {
      await page.route("**/api/hr-admin/payroll-output-batches/*/publish", (route) => route.abort());
      await publishButton.click();
      await expect(page.getByRole("alert")).toBeVisible();
      await page.unroute("**/api/hr-admin/payroll-output-batches/*/publish");
      await expect(publishButton).toBeEnabled();
    } else {
      await expect(controls).toContainText(/only generated batches can be published|Select an output batch first|Requires payroll\.publish/i);
    }

    const handoffButton = controls.getByRole("button", { name: "Generate handoff" });
    if (!(await handoffButton.isEnabled().catch(() => false))) {
      await expect(controls).toContainText(/publish outputs before finance handoff|Select an output batch first|Requires finance\.handoff\.create/i);
    }

    await expectNoHorizontalOverflow(page);
  });

  test("outputs workspace is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", payrollOperator);
    await expectPageReady(page, "Payroll Outputs");

    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Output publication desk" })).toBeVisible();
    await expect(page.getByText("Artifact register").first()).toBeVisible();
    await expect(page.getByText("Finance handoff readiness").first()).toBeVisible();

    const artifactLink = page.locator("main table a[href*='artifactId=']").first();
    if (await artifactLink.isVisible().catch(() => false)) {
      await artifactLink.scrollIntoViewIfNeeded();
      await artifactLink.click();
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Selected artifact")).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
