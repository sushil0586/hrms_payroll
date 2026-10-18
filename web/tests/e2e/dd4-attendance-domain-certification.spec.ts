import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function selectRosterEmployee(panel: Locator, employeeCode: string) {
  const search = panel.getByPlaceholder("Code, name, or email");
  await search.fill(employeeCode);
  const employeeSelect = panel.getByLabel("Target employee");
  const matchingOption = employeeSelect.locator("option").filter({ hasText: employeeCode });
  await expect(matchingOption).toHaveCount(1);
  const value = await matchingOption.getAttribute("value");
  expect(value).toBeTruthy();
  await employeeSelect.selectOption(value ?? "");
  await expect(panel.getByLabel("Selected employees")).toContainText(employeeCode);
}

async function captureRollout(page: Page, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/hr-admin/shift-roster-templates/rollout") && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: await response.json() as {
    rollout_id: string | null;
    created_count: number;
    skipped_count: number;
    target_count: number;
  } };
}

test("DD-AT-005/008 partial rollout and attendance import replay preserve one persisted result", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const hrAdmin = workspacePersona(workspace, "hr_admin");
  const assignedEmployee = workspace.manifest.credentials.employee;
  const unassignedEmployee = workspace.manifest.credentials.manager;
  const templateCode = `dd4-${workspace.seedRef}`.slice(0, 60);

  try {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates/new", hrAdmin);
    await expectPageReady(page, "Create roster template");
    const createForm = page.locator("form").first();
    await field(createForm, "Code").fill(templateCode);
    await field(createForm, "Name").fill(`DD4 ${workspace.seedRef}`);
    await field(createForm, "Status").selectOption("published");
    await field(createForm, "Base shift").selectOption(workspace.manifest.attendance.shift_id);
    await field(createForm, "Assignment mode").selectOption("fixed");
    const [createResponse] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/hr-admin/shift-roster-templates") && candidate.request().method() === "POST"),
      createForm.getByRole("button", { name: "Create template" }).click(),
    ]);
    expect(createResponse.status()).toBe(201);
    await expect(page).toHaveURL(/\/hr-admin\/shift-roster-templates$/);
    const templateLookup = await requestWithBrowserSession(
      page,
      `/api/hr-admin/shift-roster-templates?q=${encodeURIComponent(templateCode)}&page_size=25`,
    );
    expect(templateLookup.status).toBe(200);
    const template = (JSON.parse(templateLookup.body) as { items: Array<{ id: string; code: string }> }).items.find(
      (item) => item.code === templateCode,
    );
    expect(template).toBeTruthy();

    const rolloutPanel = page.getByRole("heading", { name: "Roster rollout" }).locator("xpath=ancestor::section[1]");
    await field(rolloutPanel, "Roster template").selectOption(template?.id ?? "");
    await selectRosterEmployee(rolloutPanel, assignedEmployee.employee_code);
    await selectRosterEmployee(rolloutPanel, unassignedEmployee.employee_code);
    await field(rolloutPanel, "Effective from").fill("2027-02-01");
    await field(rolloutPanel, "Effective to").fill("2027-02-28");

    const preview = await captureRollout(page, () => rolloutPanel.getByRole("button", { name: "Preview rollout" }).click());
    expect(preview.status).toBe(200);
    expect(preview.payload).toMatchObject({ target_count: 2, created_count: 1, skipped_count: 1 });

    const applied = await captureRollout(page, () => rolloutPanel.getByRole("button", { name: "Apply rollout" }).click());
    expect(applied.status).toBe(200);
    expect(applied.payload).toMatchObject({ target_count: 2, created_count: 1, skipped_count: 1 });
    expect(applied.payload.rollout_id).toBeTruthy();

    const replay = await captureRollout(page, () => rolloutPanel.getByRole("button", { name: "Apply rollout" }).click());
    expect(replay.status).toBe(200);
    expect(replay.payload).toMatchObject({ target_count: 2, created_count: 0, skipped_count: 2 });

    await gotoAuthenticated(page, "/hr-admin/attendance-records", hrAdmin);
    await expectPageReady(page, "Attendance records");
    const importWorkbench = page.getByTestId("attendance-record-import-workbench");
    const csv = [
      "employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes",
      `${unassignedEmployee.employee_code},2026-11-03,present,import,QA Day,2026-11-03T09:00:00+05:30,2026-11-03T18:00:00+05:30,8.00,0.00,0,0,false,false,DD4 replay evidence`,
      `UNKNOWN-${workspace.seedRef},2026-11-03,present,import,QA Day,2026-11-03T09:00:00+05:30,2026-11-03T18:00:00+05:30,8.00,0.00,0,0,false,false,DD4 blocked row`,
    ].join("\n");
    await importWorkbench.getByLabel("Attendance CSV data").fill(csv);
    await importWorkbench.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(importWorkbench.getByText("Preview ready. Commit ready attendance rows after checking blocked rows.")).toBeVisible();
    await expect(importWorkbench.getByText("1 ready")).toBeVisible();
    await importWorkbench.getByRole("button", { name: "Commit ready attendance rows" }).click();
    await expect(importWorkbench.getByText("Commit complete. Open Time to Payroll to verify attendance exceptions.")).toBeVisible();

    await page.reload();
    await expectPageReady(page, "Attendance records");
    const replayWorkbench = page.getByTestId("attendance-record-import-workbench");
    await replayWorkbench.getByLabel("Attendance CSV data").fill(csv);
    await replayWorkbench.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(replayWorkbench.getByText("0 ready")).toBeVisible();
    await expect(replayWorkbench.getByRole("button", { name: "Commit ready attendance rows" })).toBeDisabled();

    const attendance = await requestWithBrowserSession(
      page,
      `/api/hr-admin/attendance-records?employee_id=${unassignedEmployee.employee_id}&date_from=2026-11-03&date_to=2026-11-03`,
    );
    expect(attendance.status).toBe(200);
    const attendancePayload = JSON.parse(attendance.body) as { items: Array<{ employee_id: string; attendance_date: string; notes: string }> };
    expect(attendancePayload.items.filter((item) => item.employee_id === unassignedEmployee.employee_id && item.attendance_date === "2026-11-03")).toHaveLength(1);

    await testInfo.attach("dd4-browser-api-evidence.json", {
      body: Buffer.from(JSON.stringify({ preview: preview.payload, applied: applied.payload, replay: replay.payload, attendance: attendancePayload.items }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
