import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin workflow trace flows", () => {
  test("workflow hub exposes trace filters and live timeline context", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/workflows");
    await expectPageReady(page, "Workflow control");

    await expect(page.getByRole("heading", { name: "Workflow timeline" })).toBeVisible();
    await expect(page.getByText("SLA").or(page.getByText("Workflow timeline")).first()).toBeVisible();

    await page.getByRole("textbox", { name: "Search" }).fill("missed punch");
    await page.getByRole("combobox", { name: "Module" }).selectOption("attendance");
    await page.getByRole("combobox", { name: "Status" }).selectOption("rejected");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/q=missed\+punch/);
    await expect(page.getByRole("heading", { name: /Missed punch|Workflow timeline/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
