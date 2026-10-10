import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PaginatedResponse<T> = {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages?: number;
};

type ShiftAssignmentRow = {
  id: string;
  employee: string;
  shift: string;
  assignment_kind: string;
};

type RosterTemplateRow = {
  id: string;
  name: string;
  status: string;
  assignment_kind: string;
};

type RosterRolloutRow = {
  id: string;
  template_name: string;
  scope_labels: string[];
};

test.describe("E90-6 roster and shift operations compact QA", () => {
  test("shift assignments, roster templates, and rollout history stay paginated and usable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments?page_size=10", hrAdmin);
    await expectPageReady(page, "Shift assignments");
    await expect(page.getByRole("form", { name: "Shift assignment filters" })).toBeVisible();
    await expect(page.getByText(/matching/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const assignmentResponse = await page.request.get("/api/hr-admin/employee-shift-assignments?page=1&page_size=3");
    expect(assignmentResponse.status()).toBe(200);
    const assignmentText = await assignmentResponse.text();
    expect(Buffer.byteLength(assignmentText, "utf8")).toBeLessThan(120_000);
    const assignments = JSON.parse(assignmentText) as PaginatedResponse<ShiftAssignmentRow>;
    expect(assignments.page_size).toBe(3);
    expect(assignments.items.length).toBeLessThanOrEqual(3);
    if (assignments.items.length) {
      expect(assignments.items[0]).toEqual(expect.objectContaining({ id: expect.any(String), employee: expect.any(String), shift: expect.any(String) }));
    } else {
      expect(assignments.total_count).toBe(0);
      await expect(page.getByText(/No shift assignments|matching/i).first()).toBeVisible();
    }

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates?page_size=10&rollout_page_size=3", hrAdmin);
    await expectPageReady(page, "Roster templates");
    await expect(page.getByRole("form", { name: "Roster template filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Roster rollout" })).toBeVisible();
    await expect(page.getByLabel("Roster rollout history pagination")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const templateResponse = await page.request.get("/api/hr-admin/shift-roster-templates?page=1&page_size=3");
    expect(templateResponse.status()).toBe(200);
    const templateText = await templateResponse.text();
    expect(Buffer.byteLength(templateText, "utf8")).toBeLessThan(100_000);
    const templates = JSON.parse(templateText) as PaginatedResponse<RosterTemplateRow>;
    expect(templates.page_size).toBe(3);
    expect(templates.items.length).toBeLessThanOrEqual(3);

    const rolloutResponse = await page.request.get("/api/hr-admin/shift-roster-rollouts?page=1&page_size=2");
    expect(rolloutResponse.status()).toBe(200);
    const rolloutText = await rolloutResponse.text();
    expect(Buffer.byteLength(rolloutText, "utf8")).toBeLessThan(60_000);
    const rollouts = JSON.parse(rolloutText) as PaginatedResponse<RosterRolloutRow>;
    expect(rollouts.page_size).toBe(2);
    expect(rollouts.items.length).toBeLessThanOrEqual(2);
    if (rollouts.items.length) {
      expect(Array.isArray(rollouts.items[0].scope_labels)).toBe(true);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates?page_size=10&rollout_page_size=3", hrAdmin);
    await expectPageReady(page, "Roster templates");
    await expectNoHorizontalOverflow(page);
  });
});
