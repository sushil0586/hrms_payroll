import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function unique(prefix: string) {
  return `${prefix}_${Date.now().toString(36).toUpperCase()}`;
}

function field(scope: Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function createAndCapture(page: Page, apiPath: string, button: string) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes(apiPath) && candidate.request().method() === "POST"),
    page.getByRole("button", { name: button, exact: true }).click(),
  ]);
  const raw = await response.json().catch(() => ({}));
  expect(response.status(), JSON.stringify(raw)).toBe(201);
  return raw;
}

async function selectedIdFromRow(page: Page, rowText: string) {
  const row = page.getByRole("row").filter({ hasText: rowText }).first();
  await expect(row).toBeVisible();
  const href = await row.getByRole("link", { name: "Inspect" }).getAttribute("href");
  const id = href ? new URL(href, "http://local.test").searchParams.get("selected") : null;
  expect(id).toBeTruthy();
  return id!;
}

test.describe("CRUD-2B employee and leave closure", () => {
  test("leave status filter constrains choices and safely normalizes tampered values", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-types?status=retired-value&category=foreign-category");
    const filters = page.getByRole("form", { name: "Leave type filters" });
    const status = filters.getByRole("combobox", { name: "Status" });
    const category = filters.getByRole("combobox", { name: "Category" });

    await expect(status).toHaveValue("all");
    await expect(category).toHaveValue("all");
    await expect(status.locator("option")).toHaveCount(3);
    await status.focus();
    await expect(status).toBeFocused();
    await status.selectOption("active");
    await expect(status).toHaveValue("active");
    await expectNoHorizontalOverflow(page);
  });

  test.setTimeout(180_000);

  test("employee validation focuses errors and remains readable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await expectPageReady(page, "Create employee");

    const steps = page.locator(".employee-form-stepper__item");
    await steps.nth(3).click();
    await page.getByRole("button", { name: "Create employee" }).click();
    const code = page.locator('[name="employee_code"]');
    await expect(code).toBeFocused();
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "Save needs attention." })).toContainText("Review the highlighted employee fields");
    await expectNoHorizontalOverflow(page);

    await code.fill("   ");
    await page.locator('[name="first_name"]').fill("   ");
    await steps.nth(3).click();
    await page.getByRole("button", { name: "Create employee" }).click();
    await expect(code).toBeFocused();

    await code.fill(unique("EMP"));
    await page.locator('[name="first_name"]').fill("Validation");
    await steps.nth(1).click();
    const workEmail = page.locator('[name="work_email"]');
    await workEmail.fill("invalid-email");
    await steps.nth(3).click();
    await page.getByRole("button", { name: "Create employee" }).click();
    await expect(workEmail).toBeFocused();
    await expect(page.getByText("Enter a valid work email address.")).toBeVisible();
  });

  test("backend-authoritative employee status errors focus the constrained control", async ({ page }) => {
    const employeeCode = unique("NEG");
    await page.route("**/api/hr-admin/employees", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      const response = await route.fetch({
        postData: JSON.stringify({ ...payload, employment_status: "invalid-status" }),
      });
      await route.fulfill({ response });
    });

    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await page.locator('[name="employee_code"]').fill(employeeCode);
    await page.locator('[name="first_name"]').fill("Negative");
    await page.locator(".employee-form-stepper__item").nth(3).click();
    const response = page.waitForResponse(
      (candidate) => candidate.url().includes("/api/hr-admin/employees") && candidate.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create employee" }).click();
    expect((await response).status()).toBe(400);
    const status = page.locator('[name="employment_status"]');
    await expect(status).toBeFocused();
    await expect(status).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "Save needs attention." })).toBeVisible();
  });

  test("leave category failure is announced once and duplicate submit is suppressed", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/hr-admin/leave-types", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ category: ["Select a valid leave category."] }),
      });
    });
    await gotoAuthenticated(page, "/hr-admin/leave-types?leaveTypeModal=create");
    const dialog = page.getByRole("dialog", { name: "Create leave type" });
    await dialog.getByLabel("Code", { exact: true }).fill(unique("NEGTYPE"));
    await dialog.getByLabel("Name", { exact: true }).fill("Negative category test");
    const submit = dialog.getByRole("button", { name: "Create leave type", exact: true });
    const firstSubmit = submit.click();
    await expect(dialog.getByRole("button", { name: "Saving..." })).toBeDisabled();
    await dialog.locator("form").evaluate((form) => (form as HTMLFormElement).requestSubmit());
    await firstSubmit;
    await expect(dialog.getByRole("alert").filter({ hasText: "Save needs attention." })).toContainText(
      "Select a valid leave category.",
    );
    await expect(dialog.getByLabel("Category", { exact: true })).toBeFocused();
    expect(calls).toBe(1);
    await expect(dialog.getByRole("status").filter({ hasText: /saved|created/i })).toHaveCount(0);
  });

  test("leave type, policy, and assignment create update read and deactivate through the browser", async ({ page }) => {
    const ref = unique("CRUD2B");
    const leaveCode = `LT_${ref}`.slice(0, 32);
    const policyCode = `LP_${ref}`.slice(0, 32);
    const policyName = `CRUD 2B policy ${ref}`;

    await gotoAuthenticated(page, "/hr-admin/leave-types?leaveTypeModal=create");
    await expectPageReady(page, "Leave types");
    const leaveDialog = page.getByRole("dialog", { name: "Create leave type" });
    await leaveDialog.getByLabel("Code", { exact: true }).fill(leaveCode);
    await leaveDialog.getByLabel("Name", { exact: true }).fill(`CRUD 2B ${ref}`);
    await leaveDialog.getByLabel("Short code", { exact: true }).fill("C2B");
    await leaveDialog.getByLabel("Color code", { exact: true }).fill("#246B78");
    await leaveDialog.getByLabel("Description", { exact: true }).fill("Created through the CRUD-2B browser package");
    await createAndCapture(page, "/api/hr-admin/leave-types", "Create leave type");
    await expect(page).toHaveURL(/\/hr-admin\/leave-types/);
    await page.goto(`/hr-admin/leave-types?q=${leaveCode}`);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("table", { name: "Leave types" })).toContainText(leaveCode);
    const leaveType = { id: await selectedIdFromRow(page, leaveCode) };
    await page.goto(`/hr-admin/leave-types?editLeaveType=${leaveType.id}`);
    const editLeave = page.getByRole("dialog", { name: "Edit leave type" });
    await editLeave.getByLabel("Description", { exact: true }).fill("CRUD-2B persisted update");
    const leavePatch = page.waitForResponse((r) => r.url().includes(`/api/hr-admin/leave-types/${leaveType.id}`) && r.request().method() === "PATCH");
    await editLeave.getByRole("button", { name: "Save changes" }).click();
    expect((await leavePatch).ok()).toBeTruthy();

    await page.goto("/hr-admin/leave-policies?leavePolicyModal=create");
    const policyDialog = page.locator("form.form-layout-modern");
    await field(policyDialog, "Template").selectOption("india-earned-leave");
    await policyDialog.getByRole("button", { name: "Apply template" }).click();
    await field(policyDialog, "Leave type").selectOption(leaveType.id);
    await field(policyDialog, "Code").fill(policyCode);
    await field(policyDialog, "Name").fill(policyName);
    await createAndCapture(page, "/api/hr-admin/leave-policies", "Create leave policy");
    await page.goto(`/hr-admin/leave-policies?q=${policyCode}`);
    await page.getByRole("button", { name: "Apply filters" }).click();
    const policy = { id: await selectedIdFromRow(page, policyName) };
    await page.goto("/hr-admin/leave-policy-assignments?leaveAssignmentModal=create");
    const assignmentDialog = page.locator("form.form-layout-modern");
    await field(assignmentDialog, "Leave policy").selectOption(policy.id);
    await field(assignmentDialog, "Priority").fill("71");
    await field(assignmentDialog, "Effective from").fill("2026-01-01");
    await expect(assignmentDialog.getByRole("status")).toContainText(/governance check|overlap/i);
    await createAndCapture(page, "/api/hr-admin/leave-policy-assignments", "Create assignment");
    await page.goto(`/hr-admin/leave-policy-assignments?q=${encodeURIComponent(policyName)}`);
    await page.getByRole("button", { name: "Apply filters" }).click();
    const assignment = { id: await selectedIdFromRow(page, policyName) };
    await page.goto(`/hr-admin/leave-policy-assignments?editLeaveAssignment=${assignment.id}`);
    const editAssignment = page.locator("form.form-layout-modern");
    await field(editAssignment, "Priority").fill("72");
    const assignmentPatch = page.waitForResponse((r) => r.url().includes(`/api/hr-admin/leave-policy-assignments/${assignment.id}`) && r.request().method() === "PATCH");
    await editAssignment.getByRole("button", { name: "Save changes" }).click();
    expect((await assignmentPatch).ok()).toBeTruthy();

    await page.goto(`/hr-admin/leave-policy-assignments?q=${encodeURIComponent(policyName)}&selected=${assignment.id}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.locator("#leave-assignment-detail").getByRole("button", { name: "Remove" }).click();
    const deactivateButton = page.getByRole("button", { name: "Deactivate" });
    await expect(deactivateButton).toBeVisible();
    const deactivate = page.waitForResponse((r) => r.url().includes(`/api/hr-admin/leave-policy-assignments/${assignment.id}`) && r.request().method() === "PATCH");
    await deactivateButton.click();
    expect((await deactivate).ok()).toBeTruthy();
    await expect(page.getByRole("status").filter({ hasText: "Leave assignment deactivated." }).first()).toBeVisible();
  });
});
