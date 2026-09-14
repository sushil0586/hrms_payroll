import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Employee self service control center certification", () => {
  test("shows personal priorities, shortcuts, and request workspace without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");

    const controlCenter = page.getByTestId("ess-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Self-service shortcuts" })).toBeVisible();

    for (const signal of [
      "Leave requests",
      "Attendance fixes",
      "Payslips",
      "Tax declarations",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true }).first()).toBeVisible();
    }

    for (const action of [
      "Review leave",
      "Review attendance",
      "Open payslips",
      "Open tax",
      "New request",
      "Documents",
      "Notifications",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Profile snapshot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attendance today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave balances" })).toBeVisible();
    await expect(page.getByText("Reporting manager:", { exact: false }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
