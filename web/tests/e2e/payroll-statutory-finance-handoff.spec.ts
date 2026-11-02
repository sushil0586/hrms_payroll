import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession, type Persona } from "../helpers/staging-auth";

type FinanceFixture = {
  maker: Persona;
  checker: Persona;
  finance: Persona;
  unauthorized: Persona;
  run_code: string;
  review_id: string;
};

async function submitAndCapture<T>(page: Page, route: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => route.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: await response.json().catch(() => ({})) as T };
}

async function waitForPayrollJob(page: Page, statusUrl: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await requestWithBrowserSession(page, statusUrl);
    expect(response.status).toBe(200);
    const payload = JSON.parse(response.body) as { job?: { status: string; result?: Record<string, unknown>; error?: { message?: string } } };
    const job = payload.job ?? payload as unknown as NonNullable<typeof payload.job>;
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new Error(job.error?.message ?? "Payroll background job failed.");
    await page.waitForTimeout(500);
  }
  throw new Error(`Payroll background job did not complete: ${statusUrl}`);
}

test("published output generates a sealed, untransmitted finance handoff", async ({ page }) => {
  test.setTimeout(120_000);
  const fixturePath = process.env.PLAYWRIGHT_PHASE11_HANDOFF_FIXTURE;
  expect(fixturePath, "PLAYWRIGHT_PHASE11_HANDOFF_FIXTURE must identify the isolated fixture").toBeTruthy();
  const fixture = JSON.parse(await readFile(fixturePath ?? "", "utf8")) as FinanceFixture;

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.maker);
  await expectPageReady(page, "Payroll Review");
  let controls = page.getByLabel("Review controls");
  expect((await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/submit$`),
    () => controls.getByRole("button", { name: "Submit review" }).click(),
  )).status).toBe(200);

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.checker);
  await expectPageReady(page, "Payroll Review");
  controls = page.getByLabel("Review controls");
  await controls.getByLabel("Approval profile ref").fill("phase11.finance.checker.v1");
  await controls.getByLabel("Approval comment").fill("Published output and finance boundary reviewed.");
  expect((await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/approve$`),
    () => controls.getByRole("button", { name: "Approve review" }).click(),
  )).status).toBe(200);

  await page.reload({ waitUntil: "domcontentloaded" });
  controls = page.getByLabel("Review controls");
  expect((await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/lock$`),
    () => controls.getByRole("button", { name: "Final lock" }).click(),
  )).status).toBe(200);

  await page.reload({ waitUntil: "domcontentloaded" });
  controls = page.getByLabel("Review controls");
  await controls.getByLabel("Output profile ref").fill("phase11.output.v1");
  const generated = await submitAndCapture<{ job: { status_url: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/generate-outputs$`),
    () => controls.getByRole("button", { name: "Generate outputs" }).click(),
  );
  expect(generated.status).toBe(202);
  const outputJob = await waitForPayrollJob(page, generated.payload.job.status_url);
  const outputBatchId = String(outputJob.result?.output_batch_id ?? "");
  expect(outputBatchId).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-outputs?tab=actions&batchId=${outputBatchId}`, fixture.checker);
  await expectPageReady(page, "Payroll Outputs");
  const outputControls = page.getByLabel("Output controls");
  const published = await submitAndCapture<{ job: { status_url: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-output-batches/${outputBatchId}/publish$`),
    () => outputControls.getByRole("button", { name: "Publish outputs" }).click(),
  );
  expect(published.status).toBe(202);
  expect((await waitForPayrollJob(page, published.payload.job.status_url)).result?.status).toBe("published");

  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshedControls = page.getByLabel("Output controls");
  await refreshedControls.getByLabel("Handoff profile ref").fill("phase11.finance.handoff.v1");
  const handoffResponse = await submitAndCapture<{ job: { status_url: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-output-batches/${outputBatchId}/generate-finance-handoff$`),
    () => refreshedControls.getByRole("button", { name: "Generate handoff" }).click(),
  );
  expect(handoffResponse.status).toBe(202);
  const handoffJob = await waitForPayrollJob(page, handoffResponse.payload.job.status_url);
  const handoffId = String(handoffJob.result?.finance_handoff_id ?? "");
  expect(handoffId).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-handoff?tab=artifacts&handoffId=${handoffId}`, fixture.finance);
  await expectPageReady(page, "Payroll Handoff");
  await expect(page.getByRole("heading", { name: "Finance artifacts" })).toBeVisible();
  await expect(page.getByText(/Bank Advice/).first()).toBeVisible();
  await expect(page.getByText(/Accounting Export/).first()).toBeVisible();
  await expect(page.getByText(/Statutory Summary/).first()).toBeVisible();

  const setupResponse = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-finance-handoff-setup/?handoff_id=${handoffId}&artifact_page_size=25&include_artifact_detail=true`,
  );
  expect(setupResponse.status).toBe(200);
  const setup = JSON.parse(setupResponse.body) as {
    handoffs: Array<{ id: string; status: string; config_snapshot: Record<string, unknown>; totals_snapshot: Record<string, unknown> }>;
    artifacts: Array<{ kind: string; status: string; source_hash: string; checksum_sha256: string; config_snapshot: Record<string, unknown>; totals_snapshot: Record<string, unknown> }>;
    deliveries: unknown[];
  };
  const handoff = setup.handoffs.find((item) => item.id === handoffId);
  expect(handoff?.status).toBe("generated");
  expect(handoff?.config_snapshot.calculation_evidence_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(handoff?.config_snapshot.source_artifact_manifest_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(setup.artifacts).toHaveLength(3);
  expect(new Set(setup.artifacts.map((artifact) => artifact.kind))).toEqual(
    new Set(["bank_advice", "accounting_export", "statutory_report"]),
  );
  for (const artifact of setup.artifacts) {
    expect(artifact.status).toBe("generated");
    expect(artifact.source_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.config_snapshot.calculation_evidence_hash).toBe(handoff?.config_snapshot.calculation_evidence_hash);
    expect(artifact.config_snapshot.source_artifact_manifest_hash).toBe(handoff?.config_snapshot.source_artifact_manifest_hash);
  }
  expect(setup.deliveries).toHaveLength(0);
  expect(handoff?.totals_snapshot.bank_advice_total).toBe(handoff?.totals_snapshot.net_pay);

  await gotoAuthenticated(page, `/hr-admin/payroll-handoff?tab=actions&handoffId=${handoffId}`, fixture.finance);
  const handoffControls = page.getByLabel("Handoff controls");
  await expect(handoffControls.getByRole("button", { name: "Transmit handoff" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await gotoAuthenticated(page, "/ess", fixture.unauthorized);
  const denied = await requestWithBrowserSession(page, `/api/hr-admin/payroll-finance-handoff-setup/?handoff_id=${handoffId}`);
  expect([403, 404]).toContain(denied.status);
});
