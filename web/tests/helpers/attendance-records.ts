import { expect, type Locator, type Page } from "@playwright/test";

export function attendanceRecordRows(page: Page) {
  return page.locator("table.attendance-directory-table tbody tr").filter({
    has: page.locator("input[type='checkbox']"),
  });
}

export async function selectFirstAttendanceRecord(page: Page): Promise<Locator> {
  const row = attendanceRecordRows(page).first();
  await expect(row).toBeVisible();
  const checkbox = row.getByRole("checkbox");
  if (!(await checkbox.isChecked())) await checkbox.check();
  await expect(page.getByText("1 selected").first()).toBeVisible();
  return row;
}

export async function openAttendanceMoreFilters(page: Page) {
  const moreFilters = page.locator("details").filter({
    has: page.getByText("More filters", { exact: true }),
  }).first();
  if (!(await moreFilters.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await moreFilters.getByText("More filters", { exact: true }).click();
  }
  return moreFilters;
}
