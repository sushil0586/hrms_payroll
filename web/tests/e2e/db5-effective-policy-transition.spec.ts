import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

function field(form: Locator, label: string) {
  return form.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select").first();
}

async function selectFirstValue(select: Locator) {
  const value = await select.evaluate((element) => {
    const control = element as HTMLSelectElement;
    return Array.from(control.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await select.selectOption(value);
}

async function submitAssignment(page: Page, form: Locator, apiPath: string) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname === apiPath && candidate.request().method() === "POST"),
    form.getByRole("button", { name: "Create assignment" }).click(),
  ]);
  expect(response.status(), await response.text()).toBe(201);
  return response.json() as Promise<{ id: string; effective_from: string; effective_to: string }>;
}

test("DB-5 policy assignments persist explicit effective windows", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const serverErrors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  try {
    const persona = workspacePersona(workspace, "hr_admin");
    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments?leaveAssignmentModal=create", persona);
    const leaveDialog = page.getByRole("dialog", { name: "Create leave assignment" });
    const leaveForm = leaveDialog.locator("form").first();
    await selectFirstValue(field(leaveForm, "Leave policy"));
    await field(leaveForm, "Effective from").fill("2026-11-01");
    await field(leaveForm, "Effective to").fill("2027-03-31");
    await leaveForm.getByText("Active", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").uncheck();
    const leave = await submitAssignment(page, leaveForm, "/api/hr-admin/leave-policy-assignments");
    expect(leave.effective_from).toBe("2026-11-01");
    expect(leave.effective_to).toBe("2027-03-31");

    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments/new", persona);
    const attendanceForm = page.locator("form").first();
    await selectFirstValue(field(attendanceForm, "Attendance policy"));
    await field(attendanceForm, "Effective from").fill("2026-11-01");
    await field(attendanceForm, "Effective to").fill("2027-03-31");
    await attendanceForm.getByText("Active", { exact: true }).locator("xpath=ancestor::label[1]").getByRole("checkbox").uncheck();
    const attendance = await submitAssignment(page, attendanceForm, "/api/hr-admin/attendance-policy-assignments");
    expect(attendance.effective_from).toBe("2026-11-01");
    expect(attendance.effective_to).toBe("2027-03-31");
    expect(serverErrors).toEqual([]);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
