import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type CreatedRecord = {
  code: string;
  name: string;
  editHref: string;
  id: string;
};

const runSuffix = Date.now().toString(36);

function codeFor(prefix: string, intent = "main") {
  return `PW_TEST_${prefix}_${intent}_${runSuffix}`.toUpperCase();
}

function field(page: Page, label: string, index = 0) {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .nth(index);
}

function toggle(page: Page, label: string) {
  return page
    .locator("label")
    .filter({ has: page.locator("strong, .detail-label", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input[type='checkbox']")
    .first();
}

function recordCard(page: Page, text: string) {
  return page.locator("article.record-card").filter({ hasText: text }).first();
}

async function expectNativeRequired(fieldLocator: Locator) {
  await expect
    .poll(async () => fieldLocator.evaluate((element) => (element as HTMLInputElement | HTMLSelectElement).validity.valueMissing))
    .toBe(true);
}

async function expectFields(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(field(page, label), `${label} should be visible`).toBeVisible();
  }
}

async function expectToggles(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(toggle(page, label), `${label} should be visible`).toBeVisible();
  }
}

async function selectFirstNonEmptyOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    return Array.from(selectElement.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await select.selectOption(value);
}

async function selectRecordOption(page: Page, label: string, record: CreatedRecord) {
  await field(page, label).selectOption({ label: record.name });
  await expect(field(page, label)).toHaveValue(record.id);
}

async function submitAndExpectList(page: Page, listPath: string) {
  await expect(page).toHaveURL(new RegExp(`${listPath}$`), { timeout: 20_000 });
}

async function openEditByCode(page: Page, listPath: string, code: string, heading: string | RegExp) {
  await gotoAuthenticated(page, listPath);
  await expect(recordCard(page, code)).toBeVisible();
  const editLink = recordCard(page, code).getByRole("link", { name: "Edit" }).first();
  await expect(editLink).toBeVisible();
  const href = await editLink.getAttribute("href");
  expect(href).toBeTruthy();
  await editLink.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)), editLink.click()]);
  await expectPageReady(page, heading);
  const id = href!.match(/\/([^/]+)\/edit$/)?.[1] ?? "";
  expect(id).not.toBe("");
  return { href: href!, id };
}

async function expectDuplicateSaveFails(page: Page) {
  await expect(page.getByText("Save failed.")).toBeVisible({ timeout: 15_000 });
  await expectNoHorizontalOverflow(page);
}

async function createLeaveType(page: Page, prefix = "LT"): Promise<CreatedRecord> {
  const code = codeFor(prefix);
  const name = `PW Test Leave Type ${runSuffix}`;
  await gotoAuthenticated(page, "/hr-admin/leave-types/new");
  await expectPageReady(page, "Create leave type.");
  await expect(page.getByRole("heading", { name: "Identity and presentation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Behavior switches" })).toBeVisible();
  await expectFields(page, ["Code", "Name", "Short code", "Category", "Unit", "Color code", "Description"]);
  await expectToggles(page, ["Active", "Requires attachment", "Allow negative balance", "Approval required"]);

  await page.getByRole("button", { name: "Create leave type" }).click();
  await expectNativeRequired(field(page, "Code"));
  await expectNativeRequired(field(page, "Name"));

  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Short code").fill(`P${prefix}`);
  await field(page, "Color code").fill("#2563eb");
  await field(page, "Description").fill("Browser-created leave type for Phase 1C CRUD coverage.");
  await toggle(page, "Requires attachment").check();
  await toggle(page, "Allow negative balance").check();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Create leave type" }).click();
  await submitAndExpectList(page, "/hr-admin/leave-types");
  await expect(recordCard(page, code)).toBeVisible();

  const edit = await openEditByCode(page, "/hr-admin/leave-types", code, /Edit leave type/);
  return { code, name, editHref: edit.href, id: edit.id };
}

async function createShift(page: Page, prefix = "SHIFT"): Promise<CreatedRecord> {
  const code = codeFor(prefix);
  const name = `PW Test Shift ${runSuffix}`;
  await gotoAuthenticated(page, "/hr-admin/shifts/new");
  await expectPageReady(page, "Create shift");
  await expect(page.getByRole("heading", { name: "Shift timing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operational behavior" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly off days" })).toBeVisible();
  await expectFields(page, ["Code", "Name", "Start time", "End time", "Working hours", "Break minutes", "Grace in minutes", "Grace out minutes"]);
  await expectToggles(page, ["Night shift", "Flexible shift", "Active", "Saturday", "Sunday"]);

  await page.getByRole("button", { name: "Create shift" }).click();
  await expectNativeRequired(field(page, "Code"));
  await expectNativeRequired(field(page, "Name"));

  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Start time").fill("10:00");
  await field(page, "End time").fill("19:00");
  await field(page, "Working hours").fill("8.00");
  await field(page, "Break minutes").fill("45");
  await field(page, "Grace in minutes").fill("10");
  await field(page, "Grace out minutes").fill("5");
  await toggle(page, "Flexible shift").check();
  await toggle(page, "Saturday").check();
  await toggle(page, "Sunday").check();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Create shift" }).click();
  await submitAndExpectList(page, "/hr-admin/shifts");
  await expect(recordCard(page, code)).toBeVisible();

  const edit = await openEditByCode(page, "/hr-admin/shifts", code, "Edit shift");
  return { code, name, editHref: edit.href, id: edit.id };
}

async function createHolidayCalendar(page: Page, prefix = "HC"): Promise<CreatedRecord> {
  const code = codeFor(prefix);
  const name = `PW Test Holiday Calendar ${runSuffix}`;
  await gotoAuthenticated(page, "/hr-admin/holiday-calendars/new");
  await expectPageReady(page, "Create holiday calendar");
  await expect(page.getByRole("heading", { name: "Calendar identity and scope" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Holiday rows" })).toBeVisible();
  await expectFields(page, ["Code", "Name", "Year", "Legal entity", "Branch", "Location"]);
  await expectToggles(page, ["Active"]);

  await page.getByRole("button", { name: "Create holiday calendar" }).click();
  await expectNativeRequired(field(page, "Code"));
  await expectNativeRequired(field(page, "Name"));

  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Year").fill("2027");
  await page.getByRole("button", { name: "Add holiday" }).click();
  await expect(page.getByRole("heading", { name: "Holiday 1" })).toBeVisible();
  await field(page, "Date").fill("2027-01-26");
  await field(page, "Name", 1).fill("Republic Day QA");
  await field(page, "Holiday type").selectOption("restricted");
  await field(page, "Description").fill("Phase 1C restricted holiday row.");
  await toggle(page, "Optional holiday").check();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Create holiday calendar" }).click();
  await submitAndExpectList(page, "/hr-admin/holiday-calendars");
  await expect(recordCard(page, code)).toBeVisible();

  const edit = await openEditByCode(page, "/hr-admin/holiday-calendars", code, "Edit holiday calendar");
  return { code, name, editHref: edit.href, id: edit.id };
}

async function createDocumentCategory(page: Page, prefix = "DC"): Promise<CreatedRecord> {
  const code = codeFor(prefix);
  const name = `PW Test Document Category ${runSuffix}`;
  await gotoAuthenticated(page, "/hr-admin/document-categories/new");
  await expectPageReady(page, "Create document category");
  await expect(page.getByRole("heading", { name: "Category setup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Behavior and validation" })).toBeVisible();
  await expectFields(page, ["Code", "Name", "Category type", "Description", "Visibility rules JSON"]);
  await expectToggles(page, ["Active", "System seeded", "Requires expiry date", "Requires verification", "Allow employee upload", "Allow multiple files"]);

  await page.getByRole("button", { name: "Create category" }).click();
  await expectNativeRequired(field(page, "Code"));
  await expectNativeRequired(field(page, "Name"));

  await field(page, "Code").fill(code);
  await field(page, "Name").fill(name);
  await field(page, "Description").fill("Browser-created document category for Phase 1C.");
  await field(page, "Visibility rules JSON").fill('{"visible_to":["hr_admin","employee"]}');
  await toggle(page, "Requires expiry date").check();
  await toggle(page, "Allow multiple files").check();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Create category" }).click();
  await submitAndExpectList(page, "/hr-admin/document-categories");
  await expect(recordCard(page, code)).toBeVisible();

  const edit = await openEditByCode(page, "/hr-admin/document-categories", code, "Edit document category");
  return { code, name, editHref: edit.href, id: edit.id };
}

test.describe("HR admin policy and governance master CRUD", () => {
  test("leave type page supports granular browser CRUD and duplicate validation", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const record = await createLeaveType(page, "LTCRUD");

    await gotoAuthenticated(page, "/hr-admin/leave-types/new");
    await field(page, "Code").fill(record.code);
    await field(page, "Name").fill(`${record.name} Duplicate`);
    await page.getByRole("button", { name: "Create leave type" }).click();
    await expectDuplicateSaveFails(page);

    await openEditByCode(page, "/hr-admin/leave-types", record.code, /Edit leave type/);
    await field(page, "Name").fill(`${record.name} Updated`);
    await field(page, "Description").fill("Updated by Phase 1C browser CRUD.");
    await toggle(page, "Active").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/leave-types");
    await expect(recordCard(page, record.code)).toContainText("inactive");
  });

  test("shift page supports granular browser CRUD, weekly-off controls, and duplicate validation", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const record = await createShift(page, "SHIFTCRUD");

    await gotoAuthenticated(page, "/hr-admin/shifts/new");
    await field(page, "Code").fill(record.code);
    await field(page, "Name").fill(`${record.name} Duplicate`);
    await page.getByRole("button", { name: "Create shift" }).click();
    await expectDuplicateSaveFails(page);

    await openEditByCode(page, "/hr-admin/shifts", record.code, "Edit shift");
    await field(page, "Name").fill(`${record.name} Updated`);
    await field(page, "Grace in minutes").fill("12");
    await toggle(page, "Night shift").check();
    await toggle(page, "Active").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/shifts");
    await expect(recordCard(page, record.code)).toContainText("inactive");
  });

  test("holiday calendar page supports granular browser CRUD with holiday row operations", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const record = await createHolidayCalendar(page, "HCCRUD");

    await gotoAuthenticated(page, "/hr-admin/holiday-calendars/new");
    await field(page, "Code").fill(record.code);
    await field(page, "Name").fill(`${record.name} Duplicate`);
    await field(page, "Year").fill("2027");
    await page.getByRole("button", { name: "Create holiday calendar" }).click();
    await expectDuplicateSaveFails(page);

    await openEditByCode(page, "/hr-admin/holiday-calendars", record.code, "Edit holiday calendar");
    await field(page, "Name").fill(`${record.name} Updated`);
    await page.getByRole("button", { name: "Add holiday" }).click();
    await expect(page.getByRole("heading", { name: "Holiday 2" })).toBeVisible();
    await page.getByRole("button", { name: "Remove holiday" }).last().click();
    await expect(page.getByRole("heading", { name: "Holiday 2" })).toHaveCount(0);
    await toggle(page, "Active").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/holiday-calendars");
    await expect(recordCard(page, record.code)).toContainText("inactive");
  });

  test("leave policy page supports granular browser CRUD, advanced controls, preview validation, and duplicate validation", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const leaveType = await createLeaveType(page, "LTPOL");
    const code = codeFor("LPCRUD");
    const name = `PW Test Leave Policy ${runSuffix}`;

    await gotoAuthenticated(page, "/hr-admin/leave-policies/new");
    await expectPageReady(page, "Create leave policy");
    await expectFields(page, [
      "Leave type",
      "Code",
      "Name",
      "Status",
      "Effective from",
      "Effective to",
      "Accrual frequency",
      "Annual entitlement",
      "Max carry forward",
      "Max consecutive days",
      "Min days per request",
      "Notice days required",
      "Gender restriction",
      "Marital status restriction",
      "Minimum service days",
      "Default approval route",
      "Escalation route",
      "Attachment label",
      "Grant mode",
      "Proration mode",
      "Policy year start month",
      "Policy year start day",
      "Balance reviewer",
      "Employee",
      "Requested units",
    ]);
    await expectToggles(page, [
      "Allow half day",
      "Allow backdated application",
      "Allow weekend or holiday overlap",
      "Enable sandwich rule",
      "Probation eligible",
      "Always require attachment",
      "Allow encashment",
      "Always review encashment",
      "Allow employee withdraw while pending",
      "Enable holiday-linked validation",
    ]);
    await page.getByRole("button", { name: "Preview route" }).click();
    await expect(page.getByText("Select a leave type before previewing the route.")).toBeVisible();

    await page.getByRole("button", { name: "Create leave policy" }).click();
    await expectNativeRequired(field(page, "Code"));
    await expectNativeRequired(field(page, "Name"));

    await selectRecordOption(page, "Leave type", leaveType);
    await field(page, "Code").fill(code);
    await field(page, "Name").fill(name);
    await field(page, "Status").selectOption("active");
    await field(page, "Effective from").fill("2027-01-01");
    await field(page, "Annual entitlement").fill("18.00");
    await field(page, "Max carry forward").fill("6.00");
    await field(page, "Max consecutive days").fill("5.00");
    await field(page, "Notice days required").fill("2");
    await field(page, "Gender restriction").fill("any");
    await field(page, "Marital status restriction").fill("any");
    await field(page, "Minimum service days").fill("30");
    await toggle(page, "Allow half day").check();
    await toggle(page, "Always require attachment").check();
    await field(page, "Attachment label").fill("Policy evidence");
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Create leave policy" }).click();
    await submitAndExpectList(page, "/hr-admin/leave-policies");
    await expect(recordCard(page, code)).toBeVisible();

    const edit = await openEditByCode(page, "/hr-admin/leave-policies", code, "Edit leave policy");
    await field(page, "Name").fill(`${name} Updated`);
    await field(page, "Notice days required").fill("3");
    await field(page, "Status").selectOption("archived");
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/leave-policies");
    await expect(recordCard(page, code)).toContainText("archived");

    await gotoAuthenticated(page, "/hr-admin/leave-policies/new");
    await selectRecordOption(page, "Leave type", leaveType);
    await field(page, "Code").fill(code);
    await field(page, "Name").fill(`${name} Duplicate`);
    await field(page, "Status").selectOption("active");
    await page.getByRole("button", { name: "Create leave policy" }).click();
    await expectDuplicateSaveFails(page);
    expect(edit.id).not.toBe("");
  });

  test("attendance policy page supports granular browser CRUD, runtime controls, preview validation, and duplicate validation", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const shift = await createShift(page, "SHAP");
    const calendar = await createHolidayCalendar(page, "HCAP");
    const code = codeFor("APCRUD");
    const name = `PW Test Attendance Policy ${runSuffix}`;

    await gotoAuthenticated(page, "/hr-admin/attendance-policies/new");
    await expectPageReady(page, "Create attendance policy");
    await expectFields(page, [
      "Code",
      "Name",
      "Status",
      "Attendance unit",
      "Default shift",
      "Holiday calendar",
      "Full day min hours",
      "Half day min hours",
      "Late mark after minutes",
      "Max late marks in period",
      "Overtime threshold minutes",
      "Missing punch status",
      "Late status mode",
      "Employee",
      "Attendance date",
      "Preview shift override",
      "Requested status override",
      "Check in",
      "Check out",
    ]);
    await expectToggles(page, [
      "Allow manual entry",
      "Allow web check-in",
      "Allow mobile check-in",
      "Allow geofenced check-in",
      "Allow regularization",
      "Require regularization reason",
      "Enable automatic derivation",
      "Auto mark holiday",
      "Auto mark weekly off",
      "Derive overtime from shift thresholds",
    ]);
    await page.getByRole("button", { name: "Preview attendance outcome" }).click();
    await expect(page.getByText("Select an attendance date for preview.")).toBeVisible();

    await page.getByRole("button", { name: "Create attendance policy" }).click();
    await expectNativeRequired(field(page, "Code"));
    await expectNativeRequired(field(page, "Name"));

    await field(page, "Code").fill(code);
    await field(page, "Name").fill(name);
    await field(page, "Status").selectOption("active");
    await selectRecordOption(page, "Default shift", shift);
    await selectRecordOption(page, "Holiday calendar", calendar);
    await field(page, "Full day min hours").fill("8.00");
    await field(page, "Half day min hours").fill("4.00");
    await field(page, "Late mark after minutes").fill("15");
    await field(page, "Max late marks in period").fill("3");
    await field(page, "Overtime threshold minutes").fill("45");
    await toggle(page, "Allow geofenced check-in").check();
    await toggle(page, "Enable automatic derivation").check();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Create attendance policy" }).click();
    await submitAndExpectList(page, "/hr-admin/attendance-policies");
    await expect(recordCard(page, code)).toBeVisible();

    await openEditByCode(page, "/hr-admin/attendance-policies", code, "Edit attendance policy");
    await field(page, "Name").fill(`${name} Updated`);
    await field(page, "Late mark after minutes").fill("20");
    await field(page, "Status").selectOption("archived");
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/attendance-policies");
    await expect(recordCard(page, code)).toContainText("archived");

    await gotoAuthenticated(page, "/hr-admin/attendance-policies/new");
    await field(page, "Code").fill(code);
    await field(page, "Name").fill(`${name} Duplicate`);
    await page.getByRole("button", { name: "Create attendance policy" }).click();
    await expectDuplicateSaveFails(page);
  });

  test("workflow template page supports granular browser CRUD, JSON validation, and step operations", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const code = codeFor("WFCRUD");
    const name = `PW Test Workflow Template ${runSuffix}`;

    await gotoAuthenticated(page, "/hr-admin/workflow-templates/new");
    await expectPageReady(page, "Create workflow template");
    await expect(page.getByRole("heading", { name: "Template setup" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Workflow steps" })).toBeVisible();
    await expectFields(page, [
      "Code",
      "Name",
      "Module",
      "Trigger key",
      "Status",
      "Version",
      "Effective from",
      "Effective to",
      "Description",
      "Condition snapshot JSON",
      "Mode",
      "Actor type",
      "Role",
      "Configured membership",
      "Scope type",
      "Permission key",
      "Auto approve after hours",
      "Escalate after hours",
    ]);
    await expectToggles(page, ["System seeded", "Allow delegate", "Allow send back", "Allow comment"]);

    await page.getByRole("button", { name: "Create workflow template" }).click();
    await expectNativeRequired(field(page, "Code"));
    await expectNativeRequired(field(page, "Name"));
    await expectNativeRequired(field(page, "Trigger key"));

    await field(page, "Code").fill(code);
    await field(page, "Name").fill(name);
    await field(page, "Trigger key").fill(`phase1c_${runSuffix}`);
    await field(page, "Name", 1).fill("Manager approval");
    await field(page, "Condition snapshot JSON").fill("{not-json");
    await page.getByRole("button", { name: "Create workflow template" }).click();
    await expect(page.getByText("Condition snapshot must be valid JSON.")).toBeVisible();
    await field(page, "Condition snapshot JSON").fill("{}");

    await field(page, "Status").selectOption("active");
    await field(page, "Version").fill("1");
    await field(page, "Description").fill("Browser-created workflow template for Phase 1C.");
    await field(page, "Auto approve after hours").fill("24");
    await field(page, "Escalate after hours").fill("48");
    await page.getByRole("button", { name: "Add step" }).click();
    await expect(page.getByRole("heading", { name: "Step 2" })).toBeVisible();
    await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Step 2" }) }).getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("heading", { name: "Step 2" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Create workflow template" }).click();
    await submitAndExpectList(page, "/hr-admin/workflow-templates");
    await expect(recordCard(page, code)).toBeVisible();

    await openEditByCode(page, "/hr-admin/workflow-templates", code, "Edit workflow template");
    await field(page, "Name").fill(`${name} Updated`);
    await field(page, "Description").fill("Updated by Phase 1C browser CRUD.");
    await field(page, "Status").selectOption("archived");
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/workflow-templates");
    await expect(recordCard(page, code)).toContainText("archived");
  });

  test("document category page supports granular browser CRUD, JSON validation, and duplicate validation", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const record = await createDocumentCategory(page, "DCCRUD");

    await gotoAuthenticated(page, "/hr-admin/document-categories/new");
    await field(page, "Code").fill(codeFor("DCCRUD_JSON"));
    await field(page, "Name").fill(`PW Bad JSON Category ${runSuffix}`);
    await field(page, "Visibility rules JSON").fill("{bad-json");
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByText("Visibility rules must be valid JSON.")).toBeVisible();

    await field(page, "Visibility rules JSON").fill("{}");
    await field(page, "Code").fill(record.code);
    await field(page, "Name").fill(`${record.name} Duplicate`);
    await page.getByRole("button", { name: "Create category" }).click();
    await expectDuplicateSaveFails(page);

    await openEditByCode(page, "/hr-admin/document-categories", record.code, "Edit document category");
    await field(page, "Name").fill(`${record.name} Updated`);
    await field(page, "Description").fill("Updated by Phase 1C browser CRUD.");
    await toggle(page, "Active").uncheck();
    await toggle(page, "Allow employee upload").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/document-categories");
    await expect(recordCard(page, record.code)).toContainText("HR only");
  });

  test("document requirement page supports granular browser CRUD and scoped requirement controls", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const category = await createDocumentCategory(page, "DREQCAT");

    await gotoAuthenticated(page, "/hr-admin/document-requirements/new");
    await expectPageReady(page, "Create document requirement");
    await expect(page.getByRole("heading", { name: "Requirement scope" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Requirement state" })).toBeVisible();
    await expectFields(page, ["Category", "Legal entity", "Branch", "Department", "Grade", "Employment type", "Required within joining days", "Priority"]);
    await expectToggles(page, ["Mandatory", "Active"]);

    await page.getByRole("button", { name: "Create requirement" }).click();
    await expect(page.getByText("Save failed.")).toBeVisible();

    await selectRecordOption(page, "Category", category);
    await selectFirstNonEmptyOption(field(page, "Legal entity"));
    await selectFirstNonEmptyOption(field(page, "Branch"));
    await selectFirstNonEmptyOption(field(page, "Department"));
    await selectFirstNonEmptyOption(field(page, "Grade"));
    await selectFirstNonEmptyOption(field(page, "Employment type"));
    await field(page, "Required within joining days").fill("21");
    await field(page, "Priority").fill("77");
    await toggle(page, "Mandatory").uncheck();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Create requirement" }).click();
    await submitAndExpectList(page, "/hr-admin/document-requirements");
    await expect(recordCard(page, category.name)).toBeVisible();
    await expect(recordCard(page, category.name)).toContainText("Optional");

    const editLink = recordCard(page, category.name).getByRole("link", { name: "Edit" }).first();
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expectPageReady(page, "Edit document requirement");
    await expect(field(page, "Category")).toHaveValue(category.id);
    await field(page, "Required within joining days").fill("14");
    await field(page, "Priority").fill("88");
    await toggle(page, "Mandatory").check();
    await toggle(page, "Active").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await submitAndExpectList(page, "/hr-admin/document-requirements");
    await expect(recordCard(page, category.name)).toContainText("Mandatory");
    await expect(recordCard(page, category.name)).toContainText("88");
  });
});
