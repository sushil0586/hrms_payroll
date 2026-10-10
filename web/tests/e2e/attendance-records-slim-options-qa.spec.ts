import { expect, test } from "@playwright/test";

import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test("attendance records loads slim options and resolves import employees on preview", async ({ page }) => {
  const employeeSearchResponses: Array<{ url: string; bytes: number }> = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/hr-admin/employees/option-search")) {
      employeeSearchResponses.push({ url, bytes: (await response.body()).length });
    }
  });

  await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
  await expect(page.locator("h1", { hasText: "Attendance records" })).toBeVisible();
  await expect(page.getByTestId("attendance-record-import-workbench")).toBeVisible();

  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  const apiBaseUrl = process.env.HRMS_API_BASE_URL ?? "http://localhost:8001/api/v1";
  const optionsResponse = await page.request.get(`${apiBaseUrl}/hr-admin/attendance-operations/workbench-options/?include_shifts=true`, {
    headers: { Authorization: `Token ${token}` },
  });
  const optionsBody = await optionsResponse.body();
  const optionsPayload = JSON.parse(optionsBody.toString());
  expect(optionsResponse.ok()).toBeTruthy();
  expect(optionsPayload.employees, "slim attendance options should not preload employees").toHaveLength(0);
  expect(optionsPayload.shifts.length, "slim attendance options should still include shifts").toBeGreaterThan(0);
  expect(optionsBody.length, "attendance options payload should stay compact").toBeLessThan(25_000);

  const recordsResponse = await page.request.get(`${apiBaseUrl}/hr-admin/attendance-records/?page=1&page_size=1`, {
    headers: { Authorization: `Token ${token}` },
  });
  const recordsBody = await recordsResponse.body();
  const recordsPayload = JSON.parse(recordsBody.toString());
  expect(recordsBody.length, "attendance records list payload should stay compact").toBeLessThan(80_000);
  expect(recordsPayload.items).toHaveLength(1);
  const firstRecord = recordsPayload.items?.[0];
  test.skip(!firstRecord?.employee_code, "No attendance record available for import preview QA.");

  await expect(page.getByTestId("attendance-records-toolbar").getByLabel("Shift", { exact: true })).toBeVisible();
  if (firstRecord.shift_id) {
    const shiftResponse = await page.request.get(`${apiBaseUrl}/hr-admin/attendance-records/?page=1&page_size=10&shift_id=${firstRecord.shift_id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const shiftPayload = await shiftResponse.json();
    expect(shiftResponse.ok()).toBeTruthy();
    expect(shiftPayload.items.every((item: { shift_id: string | null }) => item.shift_id === firstRecord.shift_id)).toBeTruthy();
  }

  const regularizationsResponse = await page.request.get(`${apiBaseUrl}/hr-admin/attendance-regularizations/?page=1&page_size=10&from_date=2026-01-01&to_date=2027-12-31`, {
    headers: { Authorization: `Token ${token}` },
  });
  const regularizationsBody = await regularizationsResponse.body();
  const regularizationsPayload = JSON.parse(regularizationsBody.toString());
  expect(regularizationsResponse.ok()).toBeTruthy();
  expect(regularizationsPayload.items.length).toBeLessThanOrEqual(10);
  expect(regularizationsBody.length, "attendance regularization list payload should stay compact").toBeLessThan(120_000);

  const csv = [
    "employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes",
    `${firstRecord.employee_code},2026-04-03,present,manual,,2026-04-03T09:00:00+05:30,2026-04-03T18:00:00+05:30,8.00,0.00,0,0,false,false,Preview only QA row`,
  ].join("\n");

  await page.locator("[data-testid='attendance-record-import-workbench'] textarea").fill(csv);
  await page.getByRole("button", { name: "Preview attendance import" }).click();
  await expect(page.getByText("Preview ready. Commit ready attendance rows after checking blocked rows.")).toBeVisible();

  expect(employeeSearchResponses.length, "preview should resolve employee code through async search").toBeGreaterThan(0);
  expect(employeeSearchResponses[0].bytes, "employee search response should be small").toBeLessThan(10_000);
});
