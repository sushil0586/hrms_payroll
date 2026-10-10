import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type EmployeeOption = {
  id: string;
  name: string;
  employee_code: string;
};

type ShiftOption = {
  id: string;
  name: string;
};

const runSuffix = Date.now().toString(36).toUpperCase();

async function backendGet(page: Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  const apiBaseUrl = process.env.HRMS_API_BASE_URL ?? "http://localhost:8001/api/v1";
  return page.request.get(`${apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Token ${token}` } : undefined,
  });
}

async function backendPost(page: Page, path: string, data: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  const apiBaseUrl = process.env.HRMS_API_BASE_URL ?? "http://localhost:8001/api/v1";
  return page.request.post(`${apiBaseUrl}${path}`, {
    data,
    headers: token ? { Authorization: `Token ${token}` } : undefined,
  });
}

function formField(page: Page, label: string): Locator {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

function employeeSelect(page: Page): Locator {
  return page
    .locator("label")
    .filter({ has: page.locator("span", { hasText: /^Employee$/ }) })
    .locator("select")
    .first();
}

async function firstEmployeeAndShift(page: Page): Promise<{ employee: EmployeeOption; shift: ShiftOption }> {
  const employeesResponse = await page.request.get("/api/hr-admin/employees/option-search?limit=25");
  expect(employeesResponse.ok()).toBeTruthy();
  const employeesPayload = await employeesResponse.json();
  const employee = employeesPayload.items?.find((item: EmployeeOption) => item.employee_code) as EmployeeOption | undefined;
  test.skip(!employee, "No employee option is available for HR Admin time/attendance certification.");

  const optionsResponse = await backendGet(page, "/hr-admin/attendance-operations/workbench-options/?include_shifts=true");
  expect(optionsResponse.ok()).toBeTruthy();
  const optionsPayload = await optionsResponse.json();
  const shift = optionsPayload.shifts?.[0] as ShiftOption | undefined;
  test.skip(!shift, "No shift option is available for HR Admin roster certification.");
  return { employee: employee!, shift: shift! };
}

async function chooseClearAssignmentWindow(page: Page, employeeId: string, shiftId: string) {
  const candidates = [
    ["2028-01-08", "2028-01-14"],
    ["2028-02-05", "2028-02-11"],
    ["2028-03-04", "2028-03-10"],
  ];
  for (const [effective_from, effective_to] of candidates) {
    const response = await backendPost(page, "/hr-admin/employee-shift-assignments/conflicts/", {
        employee_id: employeeId,
        shift_id: shiftId,
        assignment_kind: "fixed",
        effective_from,
        effective_to,
        is_primary: true,
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    if (!payload.has_blocking_conflict) {
      return { effective_from, effective_to };
    }
  }
  test.skip(true, "No collision-free future assignment window is available for roster certification.");
  return { effective_from: candidates[0][0], effective_to: candidates[0][1] };
}

async function chooseClearAttendanceDate(page: Page, employeeCode: string) {
  const candidates = ["2028-04-03", "2028-04-04", "2028-04-05", "2028-04-06"];
  for (const attendanceDate of candidates) {
    const response = await backendGet(
      page,
      `/hr-admin/attendance-records/?page=1&page_size=5&q=${encodeURIComponent(employeeCode)}&from_date=${attendanceDate}&to_date=${attendanceDate}`,
    );
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    if ((payload.items ?? []).length === 0) {
      return attendanceDate;
    }
  }
  test.skip(true, "No collision-free attendance date is available for import certification.");
  return candidates[0];
}

test.describe("Phase 3B.3 HR Admin time, leave, attendance, roster P0 gap certification", () => {
  test("HRADM-NEW-P0-003 commits attendance import, edits the record, and verifies persistence", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");
    await expect(page.getByTestId("attendance-record-import-workbench")).toBeVisible();

    const { employee, shift } = await firstEmployeeAndShift(page);
    const attendanceDate = await chooseClearAttendanceDate(page, employee.employee_code);
    const importNote = `Phase 3B.3 import ${runSuffix}`;
    const editedNote = `Phase 3B.3 edited ${runSuffix}`;
    const csv = [
      "employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes",
      `${employee.employee_code},${attendanceDate},present,manual,${shift.name},${attendanceDate}T09:00:00+05:30,${attendanceDate}T18:00:00+05:30,8.00,0.00,0,0,false,false,${importNote}`,
    ].join("\n");

    await page.locator("[data-testid='attendance-record-import-workbench'] textarea").fill(csv);
    await page.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(page.getByText("Preview ready. Commit ready attendance rows after checking blocked rows.")).toBeVisible();
    await expect(page.getByText("ready").first()).toBeVisible();

    await page.getByRole("button", { name: "Commit ready attendance rows" }).click();
    await expect(page.getByText("Commit complete. Open Time to Payroll to verify attendance exceptions.")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-testid='attendance-record-import-workbench']").getByText("created").first()).toBeVisible();

    const recordsResponse = await backendGet(
      page,
      `/hr-admin/attendance-records/?page=1&page_size=5&q=${encodeURIComponent(employee.employee_code)}&from_date=${attendanceDate}&to_date=${attendanceDate}`,
    );
    expect(recordsResponse.ok()).toBeTruthy();
    const recordsPayload = await recordsResponse.json();
    const record = recordsPayload.items?.find((item: { notes?: string }) => item.notes === importNote);
    expect(record).toEqual(expect.objectContaining({ id: expect.any(String), status: "present", notes: importNote }));

    await gotoAuthenticated(page, `/hr-admin/attendance-records/${record.id}/edit`, hrAdmin);
    await expectPageReady(page, "Edit attendance record");
    await formField(page, "Notes").fill(editedNote);
    await formField(page, "Late minutes").fill("4");
    await page.getByRole("button", { name: "Save attendance record" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records$/, { timeout: 20_000 });

    const updatedResponse = await backendGet(page, `/hr-admin/attendance-records/${record.id}/`);
    expect(updatedResponse.ok()).toBeTruthy();
    const updated = await updatedResponse.json();
    expect(updated.notes).toBe(editedNote);
    expect(updated.late_minutes).toBe(4);
    await expectNoHorizontalOverflow(page);
  });

  test("HRADM-NEW-P0-004 creates and edits shift assignments, blocks conflicts, and validates roster rollout preview", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new", hrAdmin);
    await expectPageReady(page, "Shift assignment");

    const { employee, shift } = await firstEmployeeAndShift(page);
    const window = await chooseClearAssignmentWindow(page, employee.id, shift.id);
    await page.getByLabel("Find person").fill(employee.employee_code);
    await expect
      .poll(async () => employeeSelect(page).locator("option").count(), { timeout: 15_000 })
      .toBeGreaterThan(1);
    await employeeSelect(page).selectOption(employee.id);
    await page.getByLabel("Base shift").selectOption(shift.id);
    await page.getByLabel("Assignment mode").selectOption("fixed");
    await page.getByLabel("Effective from").fill(window.effective_from);
    await page.getByLabel("Effective to").fill(window.effective_to);
    await expect(page.getByText(/Shift governance check|No blocking/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Create assignment" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments$/, { timeout: 20_000 });

    const assignmentResponse = await backendGet(
      page,
      `/hr-admin/employee-shift-assignments/?page=1&page_size=10&q=${encodeURIComponent(employee.employee_code)}`,
    );
    expect(assignmentResponse.ok()).toBeTruthy();
    const assignments = await assignmentResponse.json();
    const createdAssignment = assignments.items?.find((item: { effective_from: string; effective_to: string }) => item.effective_from === window.effective_from && item.effective_to === window.effective_to);
    expect(createdAssignment).toEqual(expect.objectContaining({ employee_id: employee.id, shift_id: shift.id, assignment_kind: "fixed" }));

    await gotoAuthenticated(page, `/hr-admin/employee-shift-assignments/${createdAssignment.id}/edit`, hrAdmin);
    await expectPageReady(page, "Edit shift assignment");
    await page.getByLabel("Assignment mode").selectOption("temporary_override");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments$/, { timeout: 20_000 });

    const conflictResponse = await backendPost(page, "/hr-admin/employee-shift-assignments/conflicts/", {
        employee_id: employee.id,
        shift_id: shift.id,
        assignment_kind: "fixed",
        effective_from: window.effective_from,
        effective_to: window.effective_to,
        is_primary: true,
    });
    expect(conflictResponse.ok()).toBeTruthy();
    const conflictPayload = await conflictResponse.json();
    expect(conflictPayload.has_blocking_conflict).toBeTruthy();

    const rosterCode = `P3B3RT${runSuffix.slice(-6)}`;
    const rosterName = `Phase 3B.3 roster ${runSuffix}`;
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", hrAdmin);
    await expectPageReady(page, "Create roster template");
    await formField(page, "Code").fill(rosterCode);
    await formField(page, "Name").fill(rosterName);
    await formField(page, "Status").selectOption("published");
    await formField(page, "Base shift").selectOption(shift.id);
    await formField(page, "Assignment mode").selectOption("fixed");
    await formField(page, "Description").fill("Phase 3B.3 browser roster certification");
    await page.getByRole("button", { name: "Create template" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/, { timeout: 20_000 });
    await expect(page.getByText(rosterCode)).toBeVisible();

    const templatesResponse = await backendGet(page, `/hr-admin/shift-roster-templates/?page=1&page_size=10&q=${encodeURIComponent(rosterCode)}`);
    expect(templatesResponse.ok()).toBeTruthy();
    const templates = await templatesResponse.json();
    const template = templates.items?.find((item: { code: string }) => item.code === rosterCode);
    expect(template).toEqual(expect.objectContaining({ status: "published", shift_id: shift.id }));

    await gotoAuthenticated(page, `/hr-admin/shift-roster-templates/${template.id}/edit`, hrAdmin);
    await expectPageReady(page, "Edit roster template");
    await formField(page, "Description").fill("Phase 3B.3 browser roster certification updated");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/, { timeout: 20_000 });

    const rolloutResponse = await backendPost(page, "/hr-admin/shift-roster-templates/rollout/", {
        template_id: template.id,
        employee_ids: [employee.id],
        effective_from: window.effective_from,
        effective_to: window.effective_to,
        is_primary: true,
        dry_run: true,
    });
    expect(rolloutResponse.ok()).toBeTruthy();
    const rollout = await rolloutResponse.json();
    expect(rollout.items?.length ?? 0).toBeGreaterThan(0);
    expect(JSON.stringify(rollout)).toContain(employee.employee_code);
    await expectNoHorizontalOverflow(page);
  });
});
