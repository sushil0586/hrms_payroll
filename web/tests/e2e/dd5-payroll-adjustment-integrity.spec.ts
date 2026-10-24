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
  return { status: response.status(), payload: (await response.json()) as T };
}

test("DD-PY-006 browser adjustment uses authorized checker and persists one applied input", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const maker = workspacePersona(workspace, "hr_admin");
  const checker = workspacePersona(workspace, "hr_checker");
  const runId = workspace.manifest.fixtures.payroll_run_id;
  const sourceRef = `dd5-browser-${workspace.seedRef}`;

  try {
    await gotoAuthenticated(page, `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}`, maker);
    await expectPageReady(page, "Payroll Adjustments");
    const actions = page.getByLabel("Adjustment actions");
    await actions.getByLabel("Adjustment source reference").fill(sourceRef);
    await actions.getByLabel("Adjustment amount").fill("1250.50");
    const created = await captureJson<{ id: string; status: string; amount: string }>(
      page,
      /\/api\/hr-admin\/payroll-adjustments\/?$/,
      () => actions.getByRole("button", { name: "Create adjustment" }).click(),
    );
    expect(created.status).toBe(201);
    expect(created.payload).toMatchObject({ status: "draft", amount: "1250.50" });

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}&adjustmentId=${created.payload.id}`,
      maker,
    );
    const submitted = await captureJson<{ status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-adjustments/${created.payload.id}/submit/?$`),
      () => page.getByLabel("Adjustment actions").getByRole("button", { name: "Submit selected" }).click(),
    );
    expect(submitted.payload.status).toBe("submitted");

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}&adjustmentId=${created.payload.id}`,
      checker,
    );
    const approved = await captureJson<{ status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-adjustments/${created.payload.id}/approve/?$`),
      () => page.getByLabel("Adjustment actions").getByRole("button", { name: "Approve selected" }).click(),
    );
    expect(approved.payload.status).toBe("approved");

    await gotoAuthenticated(
      page,
      `/hr-admin/payroll-adjustments?tab=actions&runId=${runId}&adjustmentId=${created.payload.id}`,
      maker,
    );
    const applied = await captureJson<{ status: string; source_hash: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-adjustments/${created.payload.id}/apply/?$`),
      () => page.getByLabel("Adjustment actions").getByRole("button", { name: "Apply selected" }).click(),
    );
    expect(applied.payload.status).toBe("applied");
    expect(applied.payload.source_hash).toMatch(/^[a-f0-9]{64}$/);

    const setup = await requestWithBrowserSession(
      page,
      `/api/hr-admin/payroll-adjustment-setup?run_id=${runId}&adjustment_page_size=100`,
    );
    expect(setup.status).toBe(200);
    const persisted = (JSON.parse(setup.body) as { adjustments: Array<{ id: string; source_ref: string; status: string; amount: string }> })
      .adjustments.filter((item) => item.id === created.payload.id);
    expect(persisted).toEqual([
      expect.objectContaining({ source_ref: sourceRef, status: "applied", amount: "1250.50" }),
    ]);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
