import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, manager } from "../helpers/staging-auth";

test.describe("Manager self service control center certification", () => {
  test("shows team queues, decision shortcuts, and payroll-impact signals without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/mss", manager);
    await expectPageReady(page, "Manager control center");

    const controlCenter = page.getByTestId("mss-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work queue" })).toBeVisible();

    for (const signal of [
      "Leave approvals",
      "Attendance regularizations",
      "Today exceptions",
      "Team on leave",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true })).toBeVisible();
    }

    for (const action of [
      "Open approvals",
      "Notifications",
      "Self service",
      "Review leave",
      "Review attendance",
      "Open exceptions",
      "View leave context",
      "Leave queue",
      "Attendance queue",
      "Alerts",
      "My payslips",
      "My documents",
      "Tax declarations",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByText("Manager inbox", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
