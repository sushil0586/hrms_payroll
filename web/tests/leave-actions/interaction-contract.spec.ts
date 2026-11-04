import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
});

test.beforeEach(async ({ page }) => {
  const user = workspacePersona(workspace, "hr_admin");
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: user.username, password: user.password },
  });
  expect(response.status()).toBe(200);
});

function detail(page: Page, name: string) {
  return page.getByRole("complementary", { name, exact: true });
}

async function closeDialogAndRestoreFocus(dialog: Locator, trigger: Locator, buttonName: RegExp | string) {
  await dialog.getByRole("button", { name: buttonName, exact: typeof buttonName === "string" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

async function loginAsEmployee(page: Page) {
  const user = workspacePersona(workspace, "employee");
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: user.username, password: user.password },
  });
  expect(response.status()).toBe(200);
}

test("leave type Inspect, Close, Cancel, Save, and removal controls work", async ({ page }) => {
  await page.goto("/hr-admin/leave-types");
  const inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await expect(inspect).toHaveAttribute("title", /Inspect .+/);
  await inspect.hover();
  await expect(page.getByRole("tooltip").first()).toBeVisible();
  await inspect.click();
  await expect(page.getByRole("dialog", { name: "Leave type detail", exact: true })).toBeVisible();
  await expect(detail(page, "Leave type detail")).toBeVisible();
  const closeDetail = detail(page, "Leave type detail").getByRole("button", { name: "Close", exact: true });
  await closeDetail.click();
  await expect(detail(page, "Leave type detail")).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const create = page.getByRole("button", { name: "Create leave type", exact: true });
  await create.click();
  let modal = page.getByRole("dialog", { name: "Create leave type", exact: true });
  await expect(modal.getByLabel("Code", { exact: true })).toBeFocused();
  await closeDialogAndRestoreFocus(modal, create, "Cancel");

  await create.click();
  modal = page.getByRole("dialog", { name: "Create leave type", exact: true });
  await closeDialogAndRestoreFocus(modal, create, /^Close Create leave type$/);

  await inspect.click();
  const edit = detail(page, "Leave type detail").getByRole("button", { name: "Edit leave type", exact: true });
  await edit.click();
  modal = page.getByRole("dialog", { name: "Edit leave type", exact: true });
  const name = modal.getByLabel("Name", { exact: true });
  const updatedName = `QA Leave Type ${Date.now()}`;
  await name.fill(updatedName);
  const patch = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/leave-types/"));
  await modal.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patch).status()).toBe(200);
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Leave type saved." })).toBeVisible();
  await expect(page.getByRole("table", { name: "Leave types", exact: true })).toContainText(updatedName);
  await page.reload();
  const updatedRow = page.getByRole("row").filter({ hasText: updatedName });
  await updatedRow.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(detail(page, "Leave type detail")).toContainText(updatedName);

  const remove = detail(page, "Leave type detail").getByRole("button", { name: "Remove", exact: true });
  await remove.click();
  const removal = page.getByRole("dialog").filter({ hasText: "Leave type removal" });
  await expect(removal.getByRole("button", { name: "Delete permanently", exact: true })).toBeDisabled();
  await closeDialogAndRestoreFocus(removal, remove, new RegExp(`^Close ${updatedName}$`));
});

test("leave type filters apply on submit and sorting is stable", async ({ page }) => {
  await page.goto("/hr-admin/leave-types");
  const filters = page.getByRole("form", { name: "Leave type filters" });
  await filters.locator('select[name="status"]').selectOption("inactive");
  await expect(page).not.toHaveURL(/status=inactive/);
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/status=inactive/);
  const table = page.getByRole("table", { name: "Leave types", exact: true });
  const rows = table.locator("tbody tr");
  if (await rows.count()) {
    await expect(table.getByText("Active", { exact: true })).toHaveCount(0);
  }

  await filters.locator('select[name="status"]').selectOption("all");
  await filters.locator('select[name="sort"]').selectOption("name-desc");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  const names = await table.locator("tbody tr .workspace-table__primary-cell strong").allTextContents();
  expect(names).toEqual([...names].sort((left, right) => right.localeCompare(left)));
  await expect(page.locator(".pagination-panel")).toBeVisible();
});

test("leave type create validation is consolidated and success feedback is durable", async ({ page }) => {
  await page.goto("/hr-admin/leave-types");
  await page.getByRole("button", { name: "Create leave type", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Create leave type", exact: true });
  await modal.getByLabel("Color code", { exact: true }).fill("invalid");
  await modal.getByRole("button", { name: "Create leave type", exact: true }).click();
  await expect(modal.getByRole("alert")).toHaveCount(1);
  await expect(modal.getByText("Enter a unique leave type code.", { exact: true })).toBeVisible();
  await expect(modal.getByText("Enter the leave type name.", { exact: true })).toBeVisible();
  await expect(modal.getByText("Enter a color in #RRGGBB format.", { exact: true })).toBeVisible();

  const suffix = Date.now().toString(36);
  const name = `QA toast ${suffix}`;
  await modal.getByLabel("Code", { exact: true }).fill(`qa-toast-${suffix}`);
  await modal.getByLabel("Name", { exact: true }).fill(name);
  await modal.getByLabel("Color code", { exact: true }).fill("#5546b7");
  await modal.getByRole("button", { name: "Create leave type", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Leave type saved." })).toBeVisible();
  await expect(page.locator(".notice--success").filter({ hasText: "Leave type created and available in this list." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("table", { name: "Leave types", exact: true })).toContainText(name);
});

test("leave policy Inspect, Close, Edit, Save, Cancel, and removal cancellation work", async ({ page }) => {
  await page.goto("/hr-admin/leave-policies");
  const inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const panel = detail(page, "Leave policy detail");
  await expect(panel).toBeVisible();

  const edit = panel.getByRole("button", { name: "Edit leave policy", exact: true });
  await edit.click();
  let modal = page.getByRole("dialog", { name: "Edit leave policy", exact: true });
  await modal.getByLabel("Name", { exact: true }).fill("Unsaved leave policy name");
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(edit).toBeFocused();
  await expect(panel).not.toContainText("Unsaved leave policy name");

  await edit.click();
  modal = page.getByRole("dialog", { name: "Edit leave policy", exact: true });
  const updatedName = `QA Leave Policy ${Date.now()}`;
  await modal.getByLabel("Name", { exact: true }).fill(updatedName);
  const patch = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/leave-policies/"));
  await modal.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patch).status()).toBe(200);
  await expect(panel).toContainText(updatedName);
  await page.reload();
  const updatedRow = page.getByRole("row").filter({ hasText: updatedName });
  const updatedInspect = updatedRow.getByRole("button", { name: "Inspect", exact: true });
  await updatedInspect.click();
  await expect(detail(page, "Leave policy detail")).toContainText(updatedName);

  const removalOptions = detail(page, "Leave policy detail").getByRole("button", { name: "Removal options", exact: true });
  await removalOptions.click();
  const removal = page.getByRole("dialog").filter({ hasText: "Policy removal check" });
  await expect(removal.getByRole("button", { name: "Delete permanently", exact: true })).toBeDisabled();
  await closeDialogAndRestoreFocus(removal, removalOptions, /^Close /);

  const close = detail(page, "Leave policy detail").getByRole("button", { name: "Close", exact: true });
  await close.click();
  await expect(detail(page, "Leave policy detail")).toHaveCount(0);
  await expect(updatedInspect).toBeFocused();
});

test("leave policy dropdown filters apply only on submit and sorting is stable", async ({ page }) => {
  await page.goto("/hr-admin/leave-policies");
  const filters = page.getByRole("form", { name: "Leave policy filters" });
  const status = filters.locator('select[name="status"]');
  const option = await status.locator("option").nth(1).getAttribute("value");
  expect(option).toBeTruthy();
  await status.selectOption(option!);
  await expect(page).not.toHaveURL(/status=/);
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`status=${encodeURIComponent(option!)}`));

  await status.selectOption("");
  await filters.locator('select[name="sort"]').selectOption("name-desc");
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  const table = page.getByRole("table", { name: "Leave policies", exact: true });
  const names = await table.locator("tbody tr .workspace-table__primary-cell strong").allTextContents();
  expect(names).toEqual([...names].sort((left, right) => right.localeCompare(left)));
});

test("leave assignment Inspect, Close, Edit, Save, Cancel, and removal cancellation work", async ({ page }) => {
  await page.goto("/hr-admin/leave-policy-assignments");
  const inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const panel = detail(page, "Leave assignment detail");
  await expect(panel).toBeVisible();

  const edit = panel.getByRole("button", { name: "Edit assignment", exact: true });
  await edit.click();
  let modal = page.getByRole("dialog", { name: "Edit leave assignment", exact: true });
  const initialPriority = await modal.getByLabel("Priority", { exact: true }).inputValue();
  await modal.getByLabel("Priority", { exact: true }).fill("456");
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(edit).toBeFocused();
  await expect(panel).toContainText(initialPriority);

  await edit.click();
  modal = page.getByRole("dialog", { name: "Edit leave assignment", exact: true });
  await modal.getByLabel("Priority", { exact: true }).fill("457");
  const patch = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/leave-policy-assignments/"));
  await modal.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patch).status()).toBe(200);
  await expect(panel).toContainText("457");
  await page.reload();
  const updatedRow = page.getByRole("row").filter({ hasText: "457" });
  const updatedInspect = updatedRow.getByRole("button", { name: "Inspect", exact: true });
  await updatedInspect.click();
  await expect(detail(page, "Leave assignment detail")).toContainText("457");

  const remove = detail(page, "Leave assignment detail").getByRole("button", { name: "Remove", exact: true });
  await remove.click();
  const removal = page.getByRole("dialog").last();
  await expect(removal).toContainText("Assignment removal");
  await removal.getByRole("button", { name: /^Close / }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Assignment removal" })).toHaveCount(0);
  await expect(remove).toBeFocused();

  const close = detail(page, "Leave assignment detail").getByRole("button", { name: "Close", exact: true });
  await close.click();
  await expect(detail(page, "Leave assignment detail")).toHaveCount(0);
  await expect(updatedInspect).toBeFocused();
});

test("leave assignment filters submit explicitly and page sorting is stable", async ({ page }) => {
  await page.goto("/hr-admin/leave-policy-assignments");
  const filters = page.getByRole("form", { name: "Leave assignment filters" });
  await filters.locator('select[name="status"]').selectOption("active");
  await expect(page).not.toHaveURL(/status=active/);
  await filters.locator('select[name="sort"]').selectOption("priority-desc");
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/status=active/);
  await expect(page).toHaveURL(/sort=priority-desc/);
  const priorities = (await page.getByRole("table", { name: "Leave assignments", exact: true }).locator("tbody tr td:nth-child(3)").allTextContents()).map(Number);
  expect(priorities).toEqual([...priorities].sort((left, right) => right - left));
});

test("HR leave request inspection, review cancellation, filters, and sorting work", async ({ page }) => {
  await page.goto("/hr-admin/leave-requests");
  const inspect = page.getByRole("button", { name: /Inspect leave request for/ }).first();
  await expect(inspect).toHaveAttribute("title", /Inspect .+/);
  await inspect.click();
  const requestDetail = detail(page, "Leave request detail");
  await expect(requestDetail).toBeVisible();

  const review = requestDetail.getByRole("button", { name: "Review", exact: true });
  if (await review.isEnabled()) {
    await review.click();
    const reviewDialog = page.getByRole("dialog").last();
    await expect(reviewDialog).toContainText("HR override");
    await reviewDialog.getByRole("button", { name: /^Close Review leave request$/ }).click();
    await expect(page.getByRole("dialog", { name: "Review leave request", exact: true })).toHaveCount(0);
    await expect(review).toBeFocused();
  }

  await requestDetail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(requestDetail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const filters = page.getByRole("form", { name: "Leave request filters" });
  await filters.locator('select[name="status"]').selectOption("pending");
  await filters.locator('select[name="sort"]').selectOption("employee");
  await expect(page).not.toHaveURL(/status=pending/);
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/status=pending/);
  await expect(page).toHaveURL(/sort=employee/);
});

test("leave request import reports an atomic rollback without false created rows", async ({ page }) => {
  await page.goto("/hr-admin/leave-requests");
  await page.getByText("Import leave requests", { exact: true }).click();
  const workbench = page.getByTestId("leave-request-import-workbench");
  await workbench.getByRole("button", { name: "Load sample template", exact: true }).click();
  const csv = workbench.getByRole("textbox", { name: "Leave request CSV data", exact: true });
  const sample = await csv.inputValue();
  const firstRow = sample.trim().split("\n")[1];
  await csv.fill(`${sample.trim()}\n${firstRow.replaceAll("2026-04-03", "2026-04-07").replace("Phase 9 leave attendance collision", "Atomic rollback second row")}`);
  await workbench.getByRole("button", { name: "Preview leave import", exact: true }).click();
  await expect(workbench.getByRole("button", { name: "Commit ready leave rows", exact: true })).toBeEnabled();

  await page.route("**/api/hr-admin/leave-requests/bulk-import", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
      detail: "No leave requests were created.",
      rolled_back: true,
      errors: [{ row: 2, message: "Synthetic concurrent validation failure." }],
    }),
  }), { times: 1 });
  await workbench.getByRole("button", { name: "Commit ready leave rows", exact: true }).click();

  await expect(workbench.getByRole("alert")).toContainText("Some leave rows failed");
  await expect(workbench.getByRole("table")).toContainText("Batch rolled back because another row failed validation.");
  await expect(workbench.getByRole("table")).toContainText("Synthetic concurrent validation failure.");
  await expect(workbench.getByText("created", { exact: true })).toHaveCount(0);
});

test("ESS request filters submit explicitly, show scoped loading, and hide empty pagination", async ({ page }) => {
  await loginAsEmployee(page);
  await page.goto("/ess/requests");
  const filters = page.getByRole("form", { name: "Filters", exact: true });
  await filters.locator('select[name="type"]').selectOption("attendance");
  await expect(page).not.toHaveURL(/type=attendance/);

  await page.route("**/api/me/request-history?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const response = await route.fetch();
    const payload = await response.json();
    await route.fulfill({ response, json: { ...payload, items: [], total_count: 0, page: 1, has_next: false, has_previous: false } });
  }, { times: 1 });
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Loading request history" })).toBeVisible();
  await expect(page).toHaveURL(/type=attendance/);
  await expect(page.getByText("No requests match the selected workflow and status.")).toBeVisible();
  await expect(page.locator(".pagination-panel")).toHaveCount(0);
});

test("ESS leave filters submit on Enter and request details close back to their trigger", async ({ page }) => {
  await loginAsEmployee(page);
  await page.goto("/ess/leave");
  const filters = page.getByRole("form", { name: "Leave history filters", exact: true });
  const search = filters.getByRole("textbox", { name: "Search leave history", exact: true });
  await search.fill("synthetic");
  await filters.getByRole("combobox", { name: "Sort by", exact: true }).selectOption("oldest");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=synthetic/);
  await expect(page).toHaveURL(/sort=oldest/);
  await expect(page.getByRole("status").filter({ hasText: "Loading leave requests" })).toHaveCount(0);

  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  const view = page.getByRole("button", { name: /^View / }).first();
  if (await view.count()) {
    await view.click();
    const modal = page.getByRole("dialog").last();
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: /^Close / }).click();
    await expect(modal).toHaveCount(0);
    await expect(view).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: /withdrawn|cancelled/i })).toHaveCount(0);
  }
});

test("ESS Apply Leave exposes complete validation once and remains usable on mobile", async ({ page }) => {
  await loginAsEmployee(page);
  await page.goto("/ess/leave");
  await page.getByRole("button", { name: "Apply leave", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Apply leave", exact: true });
  const startDate = modal.locator('input[name="start_date"]');
  const endDate = modal.locator('input[name="end_date"]');
  const reason = modal.locator('textarea[name="reason"]');

  await startDate.fill("");
  await endDate.fill("");
  await expect(modal.getByRole("button", { name: "Submit leave", exact: true })).toBeEnabled();
  await modal.getByRole("button", { name: "Submit leave", exact: true }).click();
  await expect(modal.getByText("Select the leave start date.", { exact: true })).toBeVisible();
  await expect(modal.getByText("Select the leave end date.", { exact: true })).toBeVisible();
  await expect(modal.getByText("Enter the reason for this leave request.", { exact: true })).toBeVisible();
  await expect(modal.getByRole("alert")).toHaveCount(1);
  await expect(modal.locator('input[name="start_date"]')).toBeFocused();

  await startDate.fill("2026-12-18");
  await endDate.fill("2026-12-17");
  await reason.fill("Synthetic invalid range");
  await expect(modal.getByRole("button", { name: "Submit leave", exact: true })).toBeDisabled();
  await expect(modal.locator(".notice--warning").filter({ hasText: "Check dates" })).toBeVisible();

  await endDate.fill("2026-12-18");
  await modal.locator('input[name="attachment_file"]').setInputFiles({
    name: "unsafe.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("synthetic blocked upload"),
  });
  await modal.getByRole("button", { name: "Submit leave", exact: true }).click();
  await expect(modal.getByText("This file type is not allowed for leave evidence. Upload a PDF, image, or document file.", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => modal.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await modal.getByRole("button", { name: /^Close Apply leave$/ }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply leave", exact: true })).toBeFocused();
});

test("submitted filters, Clear filters, and create-assignment Close and Cancel work", async ({ page }) => {
  await page.goto("/hr-admin/leave-types");
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  await search.fill("no-such-leave-type");
  await expect(page).not.toHaveURL(/q=no-such-leave-type/);
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/q=no-such-leave-type/);
  await expect(page.getByRole("table", { name: "Leave types", exact: true })).toContainText("No leave types");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page).not.toHaveURL(/q=/);

  await page.goto("/hr-admin/leave-policy-assignments");
  const create = page.getByRole("button", { name: "Create assignment", exact: true });
  await create.click();
  let modal = page.getByRole("dialog", { name: "Create leave assignment", exact: true });
  await modal.getByRole("button", { name: "Create assignment", exact: true }).click();
  await expect(modal.getByRole("alert")).toBeVisible();
  await closeDialogAndRestoreFocus(modal, create, "Cancel");

  await create.click();
  modal = page.getByRole("dialog", { name: "Create leave assignment", exact: true });
  await closeDialogAndRestoreFocus(modal, create, /^Close Create leave assignment$/);
});

test("all setup dialogs trap focus and Escape restores their action trigger", async ({ page }) => {
  for (const [route, buttonName, dialogName] of [
    ["leave-types", "Create leave type", "Create leave type"],
    ["leave-policies", "Create leave policy", "Create leave policy"],
    ["leave-policy-assignments", "Create assignment", "Create leave assignment"],
  ] as const) {
    await page.goto(`/hr-admin/${route}`);
    const trigger = page.getByRole("button", { name: buttonName, exact: true });
    await trigger.click();
    const modal = page.getByRole("dialog", { name: dialogName, exact: true });
    await expect.poll(() => modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});
