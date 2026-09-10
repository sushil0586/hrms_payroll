import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function selectFirstNonEmptyOption(field: Locator) {
  const value = await field.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });

  expect(value).not.toBe("");
  await field.selectOption(value);
  return value;
}

function assignmentActiveCheckbox(page: Page) {
  return page.locator("label").filter({ hasText: /^Active/ }).getByRole("checkbox");
}

function uniqueCode(prefix: string) {
  return `PW_TEST_${prefix}_${Date.now()}`;
}

function uniquePriority() {
  return 800_000 + Math.floor(Date.now() % 100_000);
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function hasNonEmptyOption(field: Locator) {
  return field.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).some((option) => Boolean(option.value));
  });
}

async function createLeavePolicyThroughBrowser(page: Page) {
  const code = uniqueCode("LEAVE_POLICY");
  await gotoAuthenticated(page, "/hr-admin/leave-policies/new");
  await expectPageReady(page, "Create leave policy");
  await selectFirstNonEmptyOption(page.getByRole("combobox", { name: /^Leave type/ }));
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(`Browser ${code}`);
  await page.getByRole("combobox", { name: /^Status/ }).selectOption("active");
  await page.getByLabel("Effective from").fill("2026-01-01");
  await page.getByLabel("Annual entitlement").fill("12.00");
  await page.getByLabel("Min days per request").fill("0.50");
  await page.getByRole("button", { name: "Create leave policy" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/leave-policies$/);
  await expect(page.getByText(code).first()).toBeVisible();
  return code;
}

async function createAttendancePolicyThroughBrowser(page: Page) {
  const code = uniqueCode("ATTENDANCE_POLICY");
  await gotoAuthenticated(page, "/hr-admin/attendance-policies/new");
  await expectPageReady(page, "Create attendance policy");
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(`Browser ${code}`);
  await page.getByRole("combobox", { name: /^Status/ }).selectOption("active");
  await page.getByLabel("Full day min hours").fill("8.00");
  await page.getByLabel("Half day min hours").fill("4.00");
  await page.getByRole("button", { name: "Create attendance policy" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/attendance-policies$/);
  await expect(page.getByText(code).first()).toBeVisible();
  return code;
}

async function createShiftThroughBrowser(page: Page) {
  const code = uniqueCode("SHIFT");
  await gotoAuthenticated(page, "/hr-admin/shifts/new");
  await expectPageReady(page, "Shift");
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByLabel("Name", { exact: true }).fill(`Browser ${code}`);
  await page.getByLabel("Start time").fill("10:00");
  await page.getByLabel("End time").fill("19:00");
  await page.getByLabel("Working hours").fill("8.00");
  await page.getByLabel("Break minutes").fill("60");
  await page.getByRole("button", { name: "Create shift" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/shifts$/);
  await expect(page.getByText(code).first()).toBeVisible();
  return code;
}

async function createDocumentCategoryThroughBrowser(page: Page) {
  const code = uniqueCode("DOCUMENT_CATEGORY");
  await gotoAuthenticated(page, "/hr-admin/document-categories/new");
  await expectPageReady(page, "Create document category");
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(`Browser ${code}`);
  await page.getByLabel("Description").fill("Browser-created category for staged requirement testing.");
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/document-categories$/);
  await expect(page.getByText(code).first()).toBeVisible();
  return code;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const expectedPathname = `/api/hr-admin/${path}`.replace(/\/$/, "");
  const [response] = await Promise.all([
    page.waitForResponse((item) => {
      const pathname = new URL(item.url()).pathname.replace(/\/$/, "");
      return pathname === expectedPathname && item.request().method() === method;
    }),
    action(),
  ]);
  const payload = await response.json().catch(() => null);
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload as T;
}

async function ensureOption(fieldLocator: Locator, createRecord: () => Promise<string>, reopen: () => Promise<void>) {
  if (await hasNonEmptyOption(fieldLocator)) {
    return;
  }
  await createRecord();
  await reopen();
}

async function openFirstEditLinkOrCreate(page: Page, listPath: string, createRecord: () => Promise<string>) {
  await gotoAuthenticated(page, listPath);
  const firstEdit = page.getByRole("link", { name: "Edit" }).first();
  if (!(await firstEdit.isVisible().catch(() => false))) {
    const code = await createRecord();
    await gotoAuthenticated(page, listPath);
    const createdEdit = page.locator("article, tr, .table-row").filter({ hasText: code }).getByRole("link", { name: "Edit" }).first();
    await expect(createdEdit).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/edit$/),
      createdEdit.click(),
    ]);
    return;
  }
  await expect(firstEdit).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/edit$/),
    firstEdit.click(),
  ]);
}

test.describe("HR admin governance and assignment forms", () => {
  test("leave policy edit loads a live record and applies governance state", async ({ page }) => {
    await openFirstEditLinkOrCreate(page, "/hr-admin/leave-policies", () => createLeavePolicyThroughBrowser(page));
    await expectPageReady(page, /Edit leave policy/);

    const detachButton = page.getByRole("button", { name: "Detach from platform" });
    if (await detachButton.isVisible().catch(() => false)) {
      await expect(page.getByText("Platform managed, tenant editable").or(page.getByText("Managed by the platform baseline")).first()).toBeVisible();
    }
    await expect(page.getByLabel("Notice days required")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance policy edit loads a live record and applies governance state", async ({ page }) => {
    await openFirstEditLinkOrCreate(page, "/hr-admin/attendance-policies", () => createAttendancePolicyThroughBrowser(page));
    await expectPageReady(page, "Edit attendance policy");

    const detachButton = page.getByRole("button", { name: "Detach from platform" });
    if (await detachButton.isVisible().catch(() => false)) {
      await expect(page.getByText("Platform managed, tenant editable").or(page.getByText("Managed by the platform baseline")).first()).toBeVisible();
    }
    await expect(page.getByRole("combobox", { name: /^Default shift/ })).toBeVisible();
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

    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments/new");
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

    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new");
    await expectPageReady(page, /Create attendance policy assignment/);

    const attendancePolicy = page.getByRole("combobox", { name: /^Attendance policy/ });
    if (!(await hasNonEmptyOption(attendancePolicy))) {
      await createAttendancePolicyThroughBrowser(page);
      await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new");
      await expectPageReady(page, /Create attendance policy assignment/);
    }
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

    await gotoAuthenticated(page, "/hr-admin/workflow-template-assignments/new");
    await expectPageReady(page, "Create workflow assignment");

    await page.getByRole("button", { name: "Create assignment" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();
    await expect(page.getByText("Select a workflow template before assigning it.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("document requirement form toggles rule state without losing scope inputs", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/document-requirements/new");
    await expectPageReady(page, "Create document requirement");

    const category = page.getByRole("combobox", { name: /^Category/ });
    if (!(await hasNonEmptyOption(category))) {
      await createDocumentCategoryThroughBrowser(page);
      await gotoAuthenticated(page, "/hr-admin/document-requirements/new");
      await expectPageReady(page, "Create document requirement");
    }
    await selectFirstNonEmptyOption(page.getByRole("combobox", { name: /^Category/ }));
    await page.getByLabel("Required within joining days").fill("14");
    await expect(page.getByRole("heading", { name: "Requirement state" })).toBeVisible();
    await expect(page.locator("label").filter({ hasText: "Mandatory" }).getByRole("checkbox")).toBeChecked();
    await assignmentActiveCheckbox(page).uncheck();
    await expect(page.getByRole("combobox", { name: /^Category/ })).not.toHaveValue("");
    await expectNoHorizontalOverflow(page);
  });

  test("shift assignment form switches into weekly rotation controls", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new");
    await expectPageReady(page, /Create shift assignment/);

    await page.getByRole("combobox", { name: /^Assignment mode/ }).selectOption("weekly_rotation");
    await expect(page.getByRole("heading", { name: "Rotation design" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add rotation step" })).toBeVisible();
    await page.getByRole("button", { name: "Add rotation step" }).click();
    await expect(page.getByText("Step 2")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("leave policy assignment creates, reads, updates, and deactivates through browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments/new");
    await expectPageReady(page, /Create leave policy assignment/);
    await ensureOption(
      page.getByRole("combobox", { name: /^Leave policy/ }),
      () => createLeavePolicyThroughBrowser(page),
      async () => {
        await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments/new");
        await expectPageReady(page, /Create leave policy assignment/);
      },
    );

    const form = page.locator("form").first();
    const priority = uniquePriority();
    await expect(field(form, "Leave policy")).toBeVisible();
    await expect(field(form, "Legal entity")).toBeVisible();
    await expect(field(form, "Branch")).toBeVisible();
    await expect(field(form, "Department")).toBeVisible();
    await expect(field(form, "Grade")).toBeVisible();
    await expect(field(form, "Employment type")).toBeVisible();
    await expect(field(form, "Employee override")).toBeVisible();
    await expect(field(form, "Priority")).toBeVisible();

    await assignmentActiveCheckbox(page).uncheck();
    await selectFirstNonEmptyOption(field(form, "Leave policy"));
    await selectFirstNonEmptyOption(field(form, "Employee override"));
    await field(form, "Priority").fill(String(priority));

    const created = await submitAndCapture<{ id: string }> (page, "leave-policy-assignments", "POST", async () => {
      await page.getByRole("button", { name: "Create assignment" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/leave-policy-assignments$/);
    await expect(page.getByText(`Priority ${priority}`).first()).toBeVisible();
    await expect(page.getByText("inactive").first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/leave-policy-assignments/${created.id}/edit`);
    await expectPageReady(page, /Edit leave policy assignment/);
    await expect(field(page.locator("form").first(), "Priority")).toHaveValue(String(priority));
    await field(page.locator("form").first(), "Priority").fill(String(priority + 1));
    await submitAndCapture(page, `leave-policy-assignments/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/leave-policy-assignments$/);
    await expect(page.getByText(`Priority ${priority + 1}`).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance policy assignment creates, reads, updates, and deactivates through browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new");
    await expectPageReady(page, /Create attendance policy assignment|Attendance policy assignment/);
    await ensureOption(
      page.getByRole("combobox", { name: /^Attendance policy/ }),
      () => createAttendancePolicyThroughBrowser(page),
      async () => {
        await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new");
        await expectPageReady(page, /Create attendance policy assignment|Attendance policy assignment/);
      },
    );

    const form = page.locator("form").first();
    const priority = uniquePriority();
    for (const label of ["Attendance policy", "Legal entity", "Branch", "Location", "Department", "Grade", "Employment type", "Employee override", "Priority"]) {
      await expect(field(form, label)).toBeVisible();
    }

    await assignmentActiveCheckbox(page).uncheck();
    await selectFirstNonEmptyOption(field(form, "Attendance policy"));
    await selectFirstNonEmptyOption(field(form, "Employee override"));
    await field(form, "Priority").fill(String(priority));

    const created = await submitAndCapture<{ id: string }>(page, "attendance-policy-assignments", "POST", async () => {
      await page.getByRole("button", { name: "Create assignment" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/attendance-policy-assignments$/);
    await expect(page.getByText(`Priority ${priority}`).first()).toBeVisible();
    await expect(page.getByText("inactive").first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/attendance-policy-assignments/${created.id}/edit`);
    await expectPageReady(page, /Edit attendance policy assignment|Edit assignment/);
    await expect(field(page.locator("form").first(), "Priority")).toHaveValue(String(priority));
    await field(page.locator("form").first(), "Priority").fill(String(priority + 1));
    await submitAndCapture(page, `attendance-policy-assignments/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/attendance-policy-assignments$/);
    await expect(page.getByText(`Priority ${priority + 1}`).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("workflow template assignment creates, reads, updates, and deactivates through browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/workflow-template-assignments/new");
    await expectPageReady(page, /Create workflow assignment/);

    const form = page.locator("form").first();
    for (const label of ["Workflow template", "Legal entity", "Branch", "Department", "Business unit", "Grade", "Priority"]) {
      await expect(field(form, label)).toBeVisible();
    }
    await expect(await hasNonEmptyOption(field(form, "Workflow template"))).toBe(true);

    const priority = uniquePriority();
    await selectFirstNonEmptyOption(field(form, "Workflow template"));
    await field(form, "Priority").fill(String(priority));
    await page.locator("label").filter({ hasText: "Assignment active" }).getByRole("checkbox").uncheck();

    const created = await submitAndCapture<{ id: string }>(page, "workflow-template-assignments", "POST", async () => {
      await page.getByRole("button", { name: "Create assignment" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/workflow-template-assignments$/);
    await expect(page.getByText(String(priority)).first()).toBeVisible();
    await expect(page.getByText("Inactive").first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/workflow-template-assignments/${created.id}/edit`);
    await expectPageReady(page, /Edit workflow assignment|Edit assignment/);
    await expect(field(page.locator("form").first(), "Priority")).toHaveValue(String(priority));
    await field(page.locator("form").first(), "Priority").fill(String(priority + 1));
    await submitAndCapture(page, `workflow-template-assignments/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/workflow-template-assignments$/);
    await expect(page.getByText(String(priority + 1)).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee shift assignment creates and updates rotation controls through browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new");
    await expectPageReady(page, /Create shift assignment/);
    await ensureOption(
      page.getByRole("combobox", { name: /^Base shift/ }),
      () => createShiftThroughBrowser(page),
      async () => {
        await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new");
        await expectPageReady(page, /Create shift assignment/);
      },
    );

    const form = page.locator("form").first();
    for (const label of ["Employee", "Base shift", "Assignment mode", "Effective from", "Effective to"]) {
      await expect(field(form, label)).toBeVisible();
    }
    await expect(page.locator("label").filter({ hasText: "Primary assignment" }).getByRole("checkbox")).toBeVisible();

    await selectFirstNonEmptyOption(field(form, "Employee"));
    const shiftId = await selectFirstNonEmptyOption(field(form, "Base shift"));
    await field(form, "Assignment mode").selectOption("weekly_rotation");
    await field(form, "Effective from").fill("2098-01-01");
    await field(form, "Effective to").fill("2098-01-14");
    await page.locator("label").filter({ hasText: "Primary assignment" }).getByRole("checkbox").uncheck();
    await field(form, "Rotation anchor date").fill("2098-01-01");
    await page.getByRole("button", { name: "Add rotation step" }).click();
    await page.locator(".detail-row").filter({ hasText: "Step 1" }).getByRole("spinbutton").fill("5");
    await page.locator(".detail-row").filter({ hasText: "Step 2" }).getByRole("combobox").selectOption(shiftId);
    await page.locator(".detail-row").filter({ hasText: "Step 2" }).getByRole("spinbutton").fill("2");

    const created = await submitAndCapture<{ id: string }>(page, "employee-shift-assignments", "POST", async () => {
      await page.getByRole("button", { name: "Create assignment" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments$/);

    await gotoAuthenticated(page, `/hr-admin/employee-shift-assignments/${created.id}/edit`);
    await expectPageReady(page, /Edit shift assignment|Edit assignment/);
    await expect(field(page.locator("form").first(), "Assignment mode")).toHaveValue("weekly_rotation");
    await expect(field(page.locator("form").first(), "Effective from")).toHaveValue("2098-01-01");
    await expect(field(page.locator("form").first(), "Effective to")).toHaveValue("2098-01-14");
    await field(page.locator("form").first(), "Assignment mode").selectOption("temporary_override");
    await submitAndCapture(page, `employee-shift-assignments/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments$/);
    await expect(page.getByText("temporary override").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("shift roster template creates, updates, previews rollout, and applies rollout through browser", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new");
    await expectPageReady(page, /Create roster template/);
    await ensureOption(
      page.getByRole("combobox", { name: /^Base shift/ }),
      () => createShiftThroughBrowser(page),
      async () => {
        await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new");
        await expectPageReady(page, /Create roster template/);
      },
    );

    const form = page.locator("form").first();
    for (const label of ["Code", "Name", "Status", "Base shift", "Assignment mode", "Description"]) {
      await expect(field(form, label)).toBeVisible();
    }

    const code = uniqueCode("ROSTER");
    await field(form, "Code").fill(code);
    await field(form, "Name").fill(`Browser ${code}`);
    await field(form, "Status").selectOption("published");
    await selectFirstNonEmptyOption(field(form, "Base shift"));
    await field(form, "Assignment mode").selectOption("fixed");
    await field(form, "Description").fill("Browser-created roster rollout template.");

    const created = await submitAndCapture<{ id: string }>(page, "shift-roster-templates", "POST", async () => {
      await page.getByRole("button", { name: "Create template" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/);
    await expect(page.getByText(code).first()).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/shift-roster-templates/${created.id}/edit`);
    await expectPageReady(page, /Edit roster template/);
    await field(page.locator("form").first(), "Description").fill("Updated roster rollout template.");
    await submitAndCapture(page, `shift-roster-templates/${created.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/);
    await expect(page.getByText("Updated roster rollout template.").first()).toBeVisible();

    const rolloutPanel = page.getByRole("heading", { name: "Roster rollout" }).locator("xpath=ancestor::section[1]");
    await expect(field(rolloutPanel, "Roster template")).toBeVisible();
    await field(rolloutPanel, "Roster template").selectOption(created.id);
    await selectFirstNonEmptyOption(field(rolloutPanel, "Target employees"));
    await field(rolloutPanel, "Effective from").fill("2098-02-01");
    await field(rolloutPanel, "Effective to").fill("2098-02-07");
    await rolloutPanel.locator("label").filter({ hasText: "Create as primary assignments" }).getByRole("checkbox").uncheck();

    await submitAndCapture(page, "shift-roster-templates/rollout", "POST", async () => {
      await rolloutPanel.getByRole("button", { name: "Preview rollout" }).click();
    });
    await expect(page.getByText(/ready for rollout|would be skipped|No employees matched/i).first()).toBeVisible();

    await submitAndCapture(page, "shift-roster-templates/rollout", "POST", async () => {
      await rolloutPanel.getByRole("button", { name: "Apply rollout" }).click();
    });
    await expect(page.getByText(/employee shift assignment.*created|skipped|No employees matched/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
