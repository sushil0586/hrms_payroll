import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("HR admin control center certification", () => {
  test("shows command queue, shortcuts, launch posture, and certified layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, "Control center");

    const controlCenter = page.getByTestId("hr-admin-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's operating priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operator shortcuts" })).toBeVisible();

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
      "Payroll inputs",
      "Payroll review",
      "Employees",
      "Reports",
      "Letters",
      "Ops health",
    ]) {
      await expect(controlCenter.getByRole("link", { name: link })).toBeVisible();
    }

    await expect(page.getByText("SaaS launch audit", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View assignments" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByText("Launch guardrails", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
