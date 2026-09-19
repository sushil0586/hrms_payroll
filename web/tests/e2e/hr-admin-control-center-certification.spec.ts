import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("HR admin control center certification", () => {
  test("shows command queue, shortcuts, launch posture, and certified layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "People Operations Control Center");

    const controlCenter = page.getByTestId("hr-admin-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Items that need your attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational readiness" })).toBeVisible();

    for (const signal of [
      "Payroll readiness",
      "Lifecycle queue",
      "Document review",
      "Attendance exceptions",
      "Notifications",
      "Launch blockers",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true })).toBeVisible();
    }

    for (const link of [
      "Open readiness",
      "Review lifecycle",
      "Review documents",
      "Open attendance",
      "Open delivery",
      "Resolve launch",
    ]) {
      await expect(controlCenter.getByRole("link", { name: link })).toBeVisible();
    }

    await expect(page.getByRole("link", { name: "Resolve payroll blockers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open employees" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports" }).first()).toBeVisible();
    await expect(page.getByText("Launch audit", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View assignments" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByText("Launch guardrails", { exact: true })).toBeVisible();
    await expect(page.getByText("Focused workspaces", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open payroll" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
