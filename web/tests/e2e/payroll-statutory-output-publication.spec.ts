import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession, type Persona } from "../helpers/staging-auth";

type OutputFixture = {
  maker: Persona;
  checker: Persona;
  employee: Persona;
  other_employee: Persona;
  employee_code: string;
  run_code: string;
  run_id: string;
  review_id: string;
  calculation_evidence_hash: string;
};

async function submitAndCapture<T>(page: Page, route: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => route.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return {
    status: response.status(),
    payload: await response.json().catch(() => ({})) as T,
  };
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

test("final-locked output publishes with sealed evidence and employee-only payslip access", async ({ page }) => {
  test.setTimeout(120_000);
  const fixturePath = process.env.PLAYWRIGHT_PHASE10_OUTPUT_FIXTURE;
  expect(fixturePath, "PLAYWRIGHT_PHASE10_OUTPUT_FIXTURE must identify the isolated fixture").toBeTruthy();
  const fixture = JSON.parse(await readFile(fixturePath ?? "", "utf8")) as OutputFixture;

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.maker);
  await expectPageReady(page, "Payroll Review");
  let controls = page.getByLabel("Review controls");
  const submitted = await submitAndCapture<{ review: { status: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/submit$`),
    () => controls.getByRole("button", { name: "Submit review" }).click(),
  );
  expect(submitted.status).toBe(200);

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.checker);
  await expectPageReady(page, "Payroll Review");
  controls = page.getByLabel("Review controls");
  await controls.getByLabel("Approval profile ref").fill("phase10.output.checker.v1");
  await controls.getByLabel("Approval comment").fill("Calculation evidence and output boundary reconciled.");
  const approved = await submitAndCapture<{ review: { status: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/approve$`),
    () => controls.getByRole("button", { name: "Approve review" }).click(),
  );
  expect(approved.status).toBe(200);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Review");
  controls = page.getByLabel("Review controls");
  const locked = await submitAndCapture<{ review: { status: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/lock$`),
    () => controls.getByRole("button", { name: "Final lock" }).click(),
  );
  expect(locked.status).toBe(200);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Review");
  controls = page.getByLabel("Review controls");
  await controls.getByLabel("Output profile ref").fill("phase10.output.publication.v1");
  const generated = await submitAndCapture<{ job: { status_url: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/generate-outputs$`),
    () => controls.getByRole("button", { name: "Generate outputs" }).click(),
  );
  expect(generated.status).toBe(202);
  const generationJob = await waitForPayrollJob(page, generated.payload.job.status_url);
  const outputBatchId = String(generationJob.result?.output_batch_id ?? "");
  expect(outputBatchId).toBeTruthy();
  const setupResponse = await requestWithBrowserSession(page, `/api/hr-admin/payroll-output-setup?batch_id=${outputBatchId}`);
  expect(setupResponse.status).toBe(200);
  const setup = JSON.parse(setupResponse.body) as {
    output_batches: Array<{ id: string; status: string; config_snapshot: Record<string, unknown> }>;
    artifacts: Array<{
      id: string;
      kind: string;
      employee_code: string | null;
      source_hash: string;
      checksum_sha256: string;
      config_snapshot: Record<string, unknown>;
    }>;
  };
  const registerResponse = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-output-setup?batch_id=${outputBatchId}&artifact_kind=register`,
  );
  expect(registerResponse.status).toBe(200);
  const registerSetup = JSON.parse(registerResponse.body) as {
    artifacts: typeof setup.artifacts;
  };
  const outputBatch = setup.output_batches.find((batch) => batch.id === outputBatchId);
  expect(outputBatch?.status).toBe("generated");
  expect(outputBatch?.config_snapshot.calculation_evidence_hash).toBe(fixture.calculation_evidence_hash);
  const payslip = setup.artifacts.find((artifact) => artifact.kind === "payslip");
  const register = registerSetup.artifacts.find((artifact) => artifact.kind === "register");
  expect(payslip?.employee_code).toBe(fixture.employee_code);
  expect(payslip?.config_snapshot.calculation_evidence_hash).toBe(fixture.calculation_evidence_hash);
  expect(payslip?.source_hash).toHaveLength(64);
  expect(payslip?.checksum_sha256).toHaveLength(64);
  expect(register?.config_snapshot.calculation_evidence_hash).toBe(fixture.calculation_evidence_hash);

  await gotoAuthenticated(page, `/ess/payslips?q=${fixture.run_code}`, fixture.employee);
  await expectPageReady(page, "Payslips");
  await expect(page.getByRole("button", { name: "Review payslip" })).toHaveCount(0);

  await gotoAuthenticated(
    page,
    `/hr-admin/payroll-outputs?batchId=${outputBatchId}&artifactId=${payslip?.id}&tab=detail`,
    fixture.checker,
  );
  await expectPageReady(page, "Payroll Outputs");
  const detail = page.getByRole("complementary", { name: /output artifact/i });
  await expect(detail).toContainText("Payslip totals match the payroll register");
  await expect(detail).toContainText("Storage governance");
  await page.getByRole("link", { name: /Actions Publish and create handoff/ }).click();
  const outputControls = page.getByLabel("Output controls");
  await expect(outputControls.getByRole("button", { name: "Generate handoff" })).toBeDisabled();
  const published = await submitAndCapture<{ job: { status_url: string } }>(
    page,
    new RegExp(`/api/hr-admin/payroll-output-batches/${outputBatchId}/publish$`),
    () => outputControls.getByRole("button", { name: "Publish outputs" }).click(),
  );
  expect(published.status).toBe(202);
  const publishJob = await waitForPayrollJob(page, published.payload.job.status_url);
  expect(publishJob.result?.status).toBe("published");

  await gotoAuthenticated(page, `/ess/payslips?q=${fixture.run_code}`, fixture.employee);
  await expectPageReady(page, "Payslips");
  await expect(page.getByText(fixture.employee_code, { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Review payslip" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Review payslip" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Access and file information").click();
  await expect(dialog).toContainText("Storage governance");
  await expect(dialog.getByRole("link", { name: "Download payslip" })).toHaveAttribute(
    "href",
    new RegExp(`/api/me/payroll-payslips/${payslip?.id}/download`),
  );
  const download = await requestWithBrowserSession(page, `/api/me/payroll-payslips/${payslip?.id}/download`);
  expect(download.status).toBe(200);
  expect(download.headers["x-payroll-artifact-checksum"]).toBe(payslip?.checksum_sha256);

  await gotoAuthenticated(page, "/ess/payslips", fixture.other_employee);
  const denied = await requestWithBrowserSession(page, `/api/me/payroll-payslips/${payslip?.id}/download`);
  expect([403, 404]).toContain(denied.status);
  await expectNoHorizontalOverflow(page);
});
