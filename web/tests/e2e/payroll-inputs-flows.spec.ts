import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll input snapshot flows", () => {
  test("input workspace exposes run locks, source snapshots, and employee traces", async ({ page }) => {
    await page.goto("/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");

    await expect(page.getByRole("heading", { name: "Input control" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "September 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hash" })).toBeVisible();
    await expect(page.getByText("india.monthly.input.profile.v1").first()).toBeVisible();

    await page.getByRole("link", { name: /Aman Verma/ }).first().click();
    await expect(page).toHaveURL(/snapshotId=snapshot-emp-0043/);
    await expect(page.getByText("Missing primary bank account")).toBeVisible();

    await page.getByRole("link", { name: /August 2026 Core Payroll/ }).click();
    await expect(page).toHaveURL(/runId=payrun-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("Inputs Locked").first()).toBeVisible();

    await page.getByRole("link", { name: /Riya Sharma/ }).first().click();
    await expect(page).toHaveURL(/snapshotId=snapshot-aug-emp-0042/);
    await expect(page.getByRole("heading", { name: "Riya Sharma" }).first()).toBeVisible();
    await expect(page.getByText("Source hash")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lock readiness" })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
