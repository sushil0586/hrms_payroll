import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll handoff flows", () => {
  test("handoff workspace exposes finance artifacts, provider evidence, and live detail links", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Handoffs" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Finance handoff desk" })).toBeVisible();
    await expect(page.getByText("Selected handoff").or(page.getByText("No package selected")).first()).toBeVisible();
    await expect(page.getByText("Finance artifacts").first()).toBeVisible();
    await expect(page.getByText("Selected artifact").or(page.getByText("No package selected")).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider retries" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider jobs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Provider evidence lane summary" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Provider evidence lane summary" })).toContainText("Delivery operations");
    for (const lane of ["Deliveries", "Retries", "Provider jobs", "Callbacks"]) {
      await expect(page.getByRole("region", { name: "Provider evidence lane summary" }).getByText(lane, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Audit packs").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Finance handoff readiness" })).toBeVisible();
    await expect(page.getByLabel("Selected handoff readiness counts")).toContainText("Artifacts");
    await expect(page.getByLabel("Selected handoff readiness counts")).toContainText("Deliveries");
    await expect(
      page.getByText("Ready to transmit.")
        .or(page.getByText("Ready for acknowledgement."))
        .or(page.getByText("Ready for audit pack."))
        .or(page.getByText("Audit pack locked."))
        .or(page.getByText("Handoff action blocked."))
        .or(page.getByText("Handoff blocked."))
        .or(page.getByText("Select a finance handoff."))
        .first(),
    ).toBeVisible();

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
      const detailPanel = page.locator("main .payroll-handoff-detail-panel").first();
      await expect(detailPanel).toBeVisible();
      await expect(
        detailPanel.getByText("Locked evidence")
          .or(detailPanel.getByText("Storage governance"))
          .or(detailPanel.getByText("Provider acknowledgement"))
          .first(),
      ).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("handoff evidence lanes stay readable on mobile and survive back-forward navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff?deliveryPageSize=1&retryPageSize=1&jobPageSize=1&callbackPageSize=1");
    await expectPageReady(page, "Payroll Handoff");

    const evidenceSummary = page.getByRole("region", { name: "Provider evidence lane summary" });
    await expect(evidenceSummary).toBeVisible();
    await expect(evidenceSummary.getByText("Delivery operations")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const evidenceLink = page.locator("main a[href*='evidence=']").first();
    if (await evidenceLink.isVisible().catch(() => false)) {
      await evidenceLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/evidence=/),
        evidenceLink.click(),
      ]);
      await expect(page.locator("main aside[aria-label$='audit evidence']").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.goBack();
      await expect(page.getByRole("heading", { name: "Payroll Handoff" })).toBeVisible();
      await expect(evidenceSummary).toBeVisible();
      await page.goForward();
      await expect(page).toHaveURL(/evidence=/);
      await expect(page.locator("main aside[aria-label$='audit evidence']").first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
