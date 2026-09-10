import { expect, test, type Locator } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function expectRequiredFieldInvalid(field: Locator) {
  await expect
    .poll(async () => field.evaluate((element) => (element as HTMLInputElement | HTMLSelectElement).validity.valueMissing))
    .toBe(true);
}

async function selectFirstNonEmptyOption(field: Locator) {
  const value = await field.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });

  expect(value).not.toBe("");
  await field.selectOption(value);
}

test.describe("HR admin configuration form flows", () => {
  test("employee create form keeps required fields and date warnings visible", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await expectPageReady(page, "Create employee");

    await page.getByRole("button", { name: "Create employee" }).click();
    await expectRequiredFieldInvalid(page.getByLabel("Employee code"));
    await expectRequiredFieldInvalid(page.getByLabel("First name"));

    await page.getByLabel("Date of birth").fill("2026-01-01");
    await page.getByLabel("Date of joining").fill("2025-01-01");
    await expect(page.getByText("date of birth must be earlier than date of joining")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("organization department form exposes hierarchy fields and required validation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/organization/departments/new");
    await expectPageReady(page, "Create department");

    await expect(page.getByRole("heading", { name: "Core identity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Department hierarchy" })).toBeVisible();

    await page.getByRole("button", { name: "Create department" }).click();
    await expectRequiredFieldInvalid(page.getByLabel("Code"));
    await expectRequiredFieldInvalid(page.getByLabel("Name"));
    await expectNoHorizontalOverflow(page);
  });

  test("leave policy preview explains missing leave type before saving", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-policies/new");
    await expectPageReady(page, "Create leave policy");

    await page.getByRole("button", { name: "Preview route" }).click();
    await expect(page.getByText("Select a leave type before previewing the route.")).toBeVisible();

    const leaveType = page.getByRole("combobox", { name: /^Leave type/ });
    await selectFirstNonEmptyOption(leaveType);
    await expect(leaveType).not.toHaveValue("");
    await expectNoHorizontalOverflow(page);
  });

  test("attendance policy preview explains missing date before saving", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/attendance-policies/new");
    await expectPageReady(page, "Create attendance policy");

    await page.getByRole("button", { name: "Preview attendance outcome" }).click();
    await expect(page.getByText("Select an attendance date for preview.")).toBeVisible();

    await page.getByLabel("Attendance date").fill("2026-06-10");
    await page.getByRole("combobox", { name: /^Requested status override/ }).selectOption("present");
    await expectNoHorizontalOverflow(page);
  });

  test("workflow template form can add and remove approval steps", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/workflow-templates/new");
    await expectPageReady(page, "Create workflow template");

    await expect(page.getByRole("heading", { name: "Step 1" })).toBeVisible();
    await page.getByRole("button", { name: "Add step" }).click();
    await expect(page.getByRole("heading", { name: "Step 2" })).toBeVisible();

    await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Step 2" }) }).getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("heading", { name: "Step 2" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("notification template form adapts message fields by channel", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/notification-templates/new");
    await expectPageReady(page, "Create notification template");

    await expect(page.getByLabel("Subject template")).toBeDisabled();
    await expect(page.getByLabel("Title template")).toBeEnabled();

    await page.getByRole("combobox", { name: /^Channel/ }).selectOption("email");
    await expect(page.getByLabel("Subject template")).toBeEnabled();
    await expect(page.getByLabel("Title template")).toBeDisabled();

    await page.getByLabel("Body template").fill("");
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByText("Preview failed.")).toBeVisible();
    await expect(page.getByText("Template body is required for preview.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
