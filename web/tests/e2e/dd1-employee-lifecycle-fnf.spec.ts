import { expect, test, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

async function captureJson<T>(page: Page, url: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => url.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: (await response.json().catch(() => ({}))) as T };
}

test("DD-EL-005/006 connects an approved exit to a maker/checker FnF settlement", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const maker = workspacePersona(workspace, "hr_admin");
  const checker = workspacePersona(workspace, "hr_checker");
  const employee = workspace.manifest.credentials.employee;
  const runId = workspace.manifest.fixtures.payroll_run_id;
  const sourceRef = `dd1-fnf-${workspace.seedRef}`;

  try {
    await gotoAuthenticated(page, "/hr-admin/exits", maker);
    const exitResponse = await requestWithBrowserSession(page, "/api/hr-admin/exits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employee.employee_id,
        status: "approved",
        resignation_date: "2026-10-01",
        notice_start_date: "2026-10-01",
        notice_end_date: "2026-10-31",
        proposed_last_working_date: "2026-10-31",
        approved_last_working_date: "2026-10-31",
        exit_reason: "DD-1 deterministic resignation",
        exit_reason_detail: "Approved synthetic exit prerequisite for FnF certification.",
      }),
    });
    expect(exitResponse.status).toBe(201);
    const exit = { payload: JSON.parse(exitResponse.body) as { id: string; employee_id: string } };
    expect(exit.payload.employee_id).toBe(employee.employee_id);

    await gotoAuthenticated(page, `/hr-admin/payroll-settlements?tab=actions&runId=${runId}`, maker);
    await expectPageReady(page, "Payroll Settlements");
    const panel = page.getByLabel("Settlement actions");
    await expect(panel.getByLabel("Settlement exit record")).toContainText(employee.employee_code);
    await panel.getByLabel("Settlement source reference").fill(sourceRef);
    await panel.getByLabel("Settlement gross due").fill("42000");
    await panel.getByLabel("Settlement recovery").fill("3000");
    const settlement = await captureJson<{ id: string; exit_record_id: string; status: string }>(
      page,
      /\/api\/hr-admin\/payroll-settlements\/?$/,
      async () => panel.getByRole("button", { name: "Create settlement" }).click(),
    );
    expect(settlement.status).toBe(201);
    expect(settlement.payload.exit_record_id).toBe(exit.payload.id);
    await expect.poll(async () => {
      const response = await requestWithBrowserSession(page, "/api/hr-admin/payroll-settlement-setup");
      if (response.status !== 200) return -1;
      const setup = JSON.parse(response.body) as { lines: Array<{ settlement_id: string }> };
      return setup.lines.filter((line) => line.settlement_id === settlement.payload.id).length;
    }).toBe(2);

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-settlements?tab=actions&runId=${runId}&settlementId=${settlement.payload.id}`,
      maker,
    );
    const submitted = await captureJson<{ status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-settlements/${settlement.payload.id}/submit/?$`),
      async () => page.getByLabel("Settlement actions").getByRole("button", { name: "Submit selected" }).click(),
    );
    expect(submitted.status).toBe(200);
    expect(submitted.payload.status).toBe("submitted");

    const makerApproval = await captureJson<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-settlements/${settlement.payload.id}/approve/?$`),
      async () => page.getByLabel("Settlement actions").getByRole("button", { name: "Approve selected" }).click(),
    );
    expect(makerApproval.status).toBe(400);
    expect(makerApproval.payload.detail).toMatch(/different authorized user/i);

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-settlements?tab=actions&runId=${runId}&settlementId=${settlement.payload.id}`,
      checker,
    );
    const approved = await captureJson<{ status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-settlements/${settlement.payload.id}/approve/?$`),
      async () => page.getByLabel("Settlement actions").getByRole("button", { name: "Approve selected" }).click(),
    );
    expect(approved.status).toBe(200);
    expect(approved.payload.status).toBe("approved");

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-settlements?tab=actions&runId=${runId}&settlementId=${settlement.payload.id}`,
      checker,
    );
    const applied = await captureJson<{ status: string; totals_snapshot: { net_settlement: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-settlements/${settlement.payload.id}/apply/?$`),
      async () => page.getByLabel("Settlement actions").getByRole("button", { name: "Apply selected" }).click(),
    );
    expect(applied.status).toBe(200);
    expect(applied.payload.status).toBe("applied");
    expect(applied.payload.totals_snapshot.net_settlement).toBe("39000.00");

    const setupResponse = await requestWithBrowserSession(page, "/api/hr-admin/payroll-settlement-setup");
    expect(setupResponse.status).toBe(200);
    const setup = JSON.parse(setupResponse.body);
    const persisted = setup.settlements.find((item: { id: string }) => item.id === settlement.payload.id);
    expect(persisted).toMatchObject({
      status: "applied",
      exit_record_id: exit.payload.id,
      employee_id: employee.employee_id,
      line_count: 2,
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
