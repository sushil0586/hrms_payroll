import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

async function selectFirstNonEmptyOption(field: Locator) {
  const value = await field.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });

  expect(value).not.toBe("");
  await field.selectOption(value);
}

function assignmentActiveCheckbox(page: Page) {
  return page.locator("label").filter({ hasText: /^Active/ }).getByRole("checkbox");
}

test.describe("HR admin governance and assignment forms", () => {
  test("leave policy edit shows platform governance and locked fields", async ({ page }) => {
    await page.goto("/hr-admin/leave-policies/lp-1/edit");
    await expectPageReady(page, /Edit leave policy/);

    await expect(page.getByText("Platform managed, tenant editable")).toBeVisible();
    await expect(page.getByText("Managed by the platform baseline")).toBeVisible();
    await expect(page.getByRole("button", { name: "Detach from platform" })).toBeVisible();
    await expect(page.getByLabel("Notice days required")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance policy edit protects locked default shift", async ({ page }) => {
    await page.goto("/hr-admin/attendance-policies/ap-1/edit");
    await expectPageReady(page, "Edit attendance policy");

    await expect(page.getByText("Platform managed, tenant editable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Detach from platform" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Default shift/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("leave assignment form renders conflict governance and inactive guidance", async ({ page }) => {
    await page.route("**/api/hr-admin/leave-policy-assignments/conflicts", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          has_conflicts: false,
          has_blocking_conflict: false,
          summary: "No overlapping leave assignment detected for this candidate scope.",
          candidate_scope: ["Global assignment"],
          conflicts: [],
        }),
      });
    });

    await page.goto("/hr-admin/leave-policy-assignments/new");
    await expectPageReady(page, /Create leave policy assignment/);

    await selectFirstNonEmptyOption(page.getByRole("combobox", { name: /^Leave policy/ }));
    await expect(page.getByText("No overlapping leave assignment detected for this candidate scope.")).toBeVisible();
    await assignmentActiveCheckbox(page).uncheck();
    await expect(page.getByText("Inactive assignments do not influence rollout.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance assignment form renders conflict governance and scoped fields", async ({ page }) => {
    await page.route("**/api/hr-admin/attendance-policy-assignments/conflicts", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          has_conflicts: true,
          has_blocking_conflict: false,
          summary: "One existing attendance assignment overlaps, but this draft has a different priority.",
          candidate_scope: ["Global assignment"],
          conflicts: [
            {
              assignment_id: "apa-1",
              policy_name: "General Office Policy",
              scope_labels: ["Legal entity: Northstar Foods Pvt Ltd"],
              priority: 100,
              priority_effect: "same_priority",
            },
          ],
        }),
      });
    });

    await page.goto("/hr-admin/attendance-policy-assignments/new");
    await expectPageReady(page, /Create attendance policy assignment/);

    await selectFirstNonEmptyOption(page.getByRole("combobox", { name: /^Attendance policy/ }));
    await expect(page.getByText("One existing attendance assignment overlaps")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Location/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("workflow assignment form surfaces server validation errors", async ({ page }) => {
    await page.route("**/api/hr-admin/workflow-template-assignments", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({ template_id: ["Select a workflow template before assigning it."] }),
      });
    });

    await page.goto("/hr-admin/workflow-template-assignments/new");
    await expectPageReady(page, "Create workflow assignment");

    await page.getByRole("button", { name: "Create assignment" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();
    await expect(page.getByText("Select a workflow template before assigning it.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("document requirement form toggles rule state without losing scope inputs", async ({ page }) => {
    await page.goto("/hr-admin/document-requirements/new");
    await expectPageReady(page, "Create document requirement");

    await selectFirstNonEmptyOption(page.getByRole("combobox", { name: /^Category/ }));
    await page.getByLabel("Required within joining days").fill("14");
    await expect(page.getByRole("heading", { name: "Requirement state" })).toBeVisible();
    await expect(page.locator("label").filter({ hasText: "Mandatory" }).getByRole("checkbox")).toBeChecked();
    await assignmentActiveCheckbox(page).uncheck();
    await expect(page.getByRole("combobox", { name: /^Category/ })).not.toHaveValue("");
    await expectNoHorizontalOverflow(page);
  });

  test("shift assignment form switches into weekly rotation controls", async ({ page }) => {
    await page.goto("/hr-admin/employee-shift-assignments/new");
    await expectPageReady(page, /Create shift assignment/);

    await page.getByRole("combobox", { name: /^Assignment mode/ }).selectOption("weekly_rotation");
    await expect(page.getByRole("heading", { name: "Rotation design" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add rotation step" })).toBeVisible();
    await page.getByRole("button", { name: "Add rotation step" }).click();
    await expect(page.getByText("Step 2")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
