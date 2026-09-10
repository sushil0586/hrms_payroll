import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
}

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function selectOptionContaining(select: Locator, text: string) {
  const value = await select.evaluate((element, needle) => {
    const option = Array.from((element as HTMLSelectElement).options).find((item) => item.textContent?.includes(String(needle)));
    return option?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 30000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function createDisposableActiveRule(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-rules", hrAdmin);
  await expectPageReady(page, "Payroll Rules");
  const ruleDefinitionForm = form(page, "payroll-rule-definition-form");
  const ruleVersionForm = form(page, "payroll-rule-version-form");
  const ruleCode = uniqueCode("OUTPUT_RULE");

  await ruleDefinitionForm.getByRole("button", { name: "New" }).click();
  const rule = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-rule-definitions$/, "POST", async () => {
    await field(ruleDefinitionForm, "Code").fill(ruleCode);
    await field(ruleDefinitionForm, "Name").fill(`Output artifact ${ruleCode}`);
    await field(ruleDefinitionForm, "Rule type").selectOption("formula");
    await field(ruleDefinitionForm, "Description").fill("Browser-created output artifact certification rule.");
    await field(ruleDefinitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase5p"]));
    await field(ruleDefinitionForm, "Config profile reference").fill("tenant.payroll.rule.phase5p.v1");
    await ruleDefinitionForm.getByRole("button", { name: "Create rule" }).click();
  });
  expect(rule.ok).toBeTruthy();

  await ruleVersionForm.getByRole("button", { name: "New" }).click();
  const version = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-rule-versions$/, "POST", async () => {
    await field(ruleVersionForm, "Rule").selectOption(rule.payload.id);
    await field(ruleVersionForm, "Version").fill("1");
    await field(ruleVersionForm, "Status").selectOption("active");
    await field(ruleVersionForm, "Expression").fill("salary.annual_ctc / 12");
    await field(ruleVersionForm, "Effective from").fill("2026-01-01");
    await field(ruleVersionForm, "Effective to").fill("");
    await field(ruleVersionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
    await field(ruleVersionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.annual_ctc"] }));
    await field(ruleVersionForm, "Output schema JSON").fill(JSON.stringify({ result_path: "components.phase5p_basic" }));
    await field(ruleVersionForm, "Config snapshot JSON").fill(JSON.stringify({
      component_code: "PHASE5P_BASIC",
      component_name: "Phase 5P Basic",
      component_type: "earning",
      calculation_order: 10,
      output_path: "components.phase5p_basic",
      profile_ref: "tenant.payroll.rule.version.phase5p.v1",
    }));
    await ruleVersionForm.getByRole("button", { name: "Create version" }).click();
  });
  expect(version.ok).toBeTruthy();
}

async function createLockedReview(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  const runForm = form(page, "payroll-run-form");
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  const lockForm = form(page, "payroll-input-lock-form");
  const runCode = uniqueCode("OUTPUT_CERT");

  await runForm.getByRole("button", { name: "New" }).click();
  const run = await submitAndCapture<{ id: string; code: string }>(page, /\/api\/hr-admin\/payroll-runs$/, "POST", async () => {
    await field(runForm, "Code").fill(runCode);
    await field(runForm, "Name").fill(`Output certification ${runCode}`);
    await field(runForm, "Status").selectOption("collecting_inputs");
    await field(runForm, "Input profile ref").fill("tenant.payroll.input.phase5p.v1");
    await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.phase5p.v1");
    await field(runForm, "Config profile reference").fill("tenant.payroll.run.phase5p.v1");
    await runForm.getByRole("button", { name: "Create run" }).click();
  });
  expect(run.ok).toBeTruthy();

  await snapshotForm.getByRole("button", { name: "New" }).click();
  const snapshot = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-input-snapshots$/, "POST", async () => {
    await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
    await selectOptionContaining(field(snapshotForm, "Employee"), "EMP-0042");
    await field(snapshotForm, "Snapshot status").selectOption("ready");
    await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.phase5p.v1");
    await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.phase5p.v1");
    await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
    await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Phase 5P", cost_center: "QA-CC" }));
    await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 960000, monthly_gross: 80000, currency_code: "INR" }));
    await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 22, lop_days: 0 }));
    await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: [] }));
    await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
  });
  expect(snapshot.ok).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}&snapshotId=${snapshot.payload.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  const lockInputs = await submitAndCapture<{ locked_count: number }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`), "POST", async () => {
    await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
  });
  expect(lockInputs.ok).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.payload.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Calculations");
  const calculationPanel = page.getByLabel("Calculation controls");
  const calculation = await submitAndCapture<{ calculation: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/calculate-draft$`), "POST", async () => {
    await calculationPanel.getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase5p.v1");
    await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
  });
  expect(calculation.ok).toBeTruthy();

  const review = await submitAndCapture<{ review: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/open-review$`), "POST", async () => {
    await calculationPanel.getByLabel("Review profile ref").fill("tenant.payroll.review.phase5p.v1");
    await calculationPanel.getByRole("button", { name: "Open review" }).click();
  });
  expect(review.ok).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Review");
  const controls = page.getByLabel("Review controls");
  const submitted = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`), "POST", async () => {
    await controls.getByRole("button", { name: "Submit review" }).click();
  });
  expect(submitted.ok).toBeTruthy();

  await controls.getByLabel("Approval profile ref").fill("tenant.payroll.approval.phase5p.v1");
  await controls.getByLabel("Approval comment").fill("Approved for output artifact certification.");
  const approved = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/approve$`), "POST", async () => {
    await controls.getByRole("button", { name: "Approve review" }).click();
  });
  expect(approved.ok).toBeTruthy();

  const locked = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/lock$`), "POST", async () => {
    await controls.getByRole("button", { name: "Final lock" }).click();
  });
  expect(locked.ok).toBeTruthy();

  await controls.getByLabel("Output profile ref").fill("tenant.payroll.outputs.phase5p.v1");
  const outputs = await submitAndCapture<{
    output_batch: { id: string; status: string; artifact_count: number; payslip_count: number; register_count: number };
    artifacts: Array<{ id: string; kind: string; status: string; employee_code: string | null }>;
  }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/generate-outputs$`), "POST", async () => {
    await controls.getByRole("button", { name: "Generate outputs" }).click();
  });
  expect(outputs.ok).toBeTruthy();
  expect(outputs.payload.output_batch.artifact_count).toBeGreaterThanOrEqual(2);

  return {
    batchId: outputs.payload.output_batch.id,
    payslipId: outputs.payload.artifacts.find((artifact) => artifact.kind === "payslip" && artifact.employee_code === "EMP-0042")?.id ?? "",
    registerId: outputs.payload.artifacts.find((artifact) => artifact.kind === "register")?.id ?? "",
    runCode,
  };
}

test.describe("Phase 5P payroll output artifact certification", () => {
  test("outputs publish, metadata, downloads, access audit, pagination, and ESS scope are certified", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    await createDisposableActiveRule(page);
    const setup = await createLockedReview(page);
    expect(setup.payslipId).toBeTruthy();
    expect(setup.registerId).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}&batchPageSize=1&artifactPageSize=1`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Output controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();
    await expect(page.getByText("Available after publish")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.locator(".pagination-bar__summary").filter({ hasText: "Page 1" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Next" }).first()).toBeVisible();
    await expect(page.locator(".payroll-output-card.is-selected")).toContainText(setup.runCode);
    await expect(page.locator(".payroll-output-artifact-table tr.is-selected")).toContainText("EMP-0042");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Storage governance");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("Access governance");
    await expect(page.locator("aside[aria-label$='output artifact']")).toContainText("tenant.payroll.outputs.phase5p.v1");

    const controls = page.getByLabel("Output controls");
    const published = await submitAndCapture<{
      output_batch: { status: string; published_artifact_count: number };
      artifacts: Array<{ id: string; status: string }>;
    }>(page, new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/publish$`), "POST", async () => {
      await controls.getByRole("button", { name: "Publish outputs" }).click();
    });
    expect(published.ok).toBeTruthy();
    expect(published.payload.output_batch.status).toBe("published");
    expect(published.payload.output_batch.published_artifact_count).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("status").first()).toContainText("Payroll outputs published.");

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.payslipId}&batchPageSize=1&artifactPageSize=1`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    const downloadLink = page.getByRole("link", { name: "Download file" }).first();
    await expect(downloadLink).toHaveAttribute("href", new RegExp(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`));
    const download = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"] ?? "").toContain("attachment");
    expect(download.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-key"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-provider"]).toBeTruthy();
    expect(download.headers()["x-payroll-storage-version"]).toBeTruthy();
    expect(download.headers()["x-payroll-download-strategy"]).toBeTruthy();
    expect(download.headers()["x-payroll-retention-policy"]).toBeTruthy();
    expect((await download.body()).length).toBeGreaterThan(0);

    const auditExport = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/access-audit-export`);
    expect(auditExport.status()).toBe(200);
    expect(auditExport.headers()["content-type"]).toContain("text/csv");
    const auditCsv = await auditExport.text();
    expect(auditCsv).toContain("row_type,artifact_id,artifact_key");
    expect(auditCsv).toContain("downloaded");

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}&artifactId=${setup.registerId}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.locator(".payroll-output-artifact-table tr.is-selected")).toContainText(/register/i);
    const registerDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.registerId}/download`);
    expect(registerDownload.status()).toBe(200);
    expect(registerDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();

    await gotoAuthenticated(page, `/ess/payslips?q=${setup.runCode}`, employee);
    await expectPageReady(page, "Payslips");
    await expect(page.locator(".payroll-output-artifact-table tr.is-selected")).toContainText(setup.runCode);
    await expect(page.locator("aside[aria-label$='detail']")).toContainText("Storage governance");
    await expect(page.getByRole("link", { name: "Download payslip" })).toHaveAttribute("href", new RegExp(`/api/me/payroll-payslips/${setup.payslipId}/download`));
    const essDownload = await page.request.get(`/api/me/payroll-payslips/${setup.payslipId}/download`);
    expect(essDownload.status()).toBe(200);
    expect(essDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    const registerFromEss = await page.request.get(`/api/me/payroll-payslips/${setup.registerId}/download`);
    expect(registerFromEss.status()).toBe(404);
    const hrRouteFromEss = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${setup.payslipId}/download`);
    expect([403, 404]).toContain(hrRouteFromEss.status());
    await expectNoHorizontalOverflow(page);
  });

  test("published outputs generate finance handoff with transmit, acknowledgement, audit pack, and pagination evidence", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    await createDisposableActiveRule(page);
    const setup = await createLockedReview(page);
    expect(setup.payslipId).toBeTruthy();

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${setup.batchId}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    const outputControls = page.getByLabel("Output controls");
    const published = await submitAndCapture<{ output_batch: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/publish$`),
      "POST",
      async () => {
        await outputControls.getByRole("button", { name: "Publish outputs" }).click();
      },
    );
    expect(published.ok).toBeTruthy();

    await outputControls.getByLabel("Handoff profile ref").fill("tenant.payroll.handoff.phase5q.v1");
    const handoff = await submitAndCapture<{ handoff: { id: string; status: string }; artifacts: Array<{ id: string; kind: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${setup.batchId}/generate-finance-handoff$`),
      "POST",
      async () => {
        await outputControls.getByRole("button", { name: "Generate handoff" }).click();
      },
    );
    expect(handoff.ok).toBeTruthy();
    expect(handoff.payload.handoff.status).toBe("generated");
    await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff generated.");

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.payload.handoff.id}&handoffPageSize=1&artifactPageSize=1`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.locator(".pagination-bar__summary").filter({ hasText: "Page 1" })).toHaveCount(2);
    await expect(page.locator(".payroll-handoff-card.is-selected")).toContainText(setup.runCode);
    await expect(page.getByRole("heading", { name: "Handoff controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finance artifacts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configurable finance routing" })).toBeVisible();
    await expect(page.locator("aside[aria-label$='finance artifact']")).toContainText("Storage governance");

    const handoffControls = page.getByLabel("Handoff controls");
    const transmitted = await submitAndCapture<{ handoff: { status: string }; deliveries: Array<{ id: string; output_artifact_id: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/transmit$`),
      "POST",
      async () => {
        await handoffControls.getByRole("button", { name: "Transmit handoff" }).click();
      },
    );
    expect(transmitted.ok).toBeTruthy();
    expect(transmitted.payload.handoff.status).toBe("transmitted");
    await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff transmitted.");

    await handoffControls.getByLabel("Acknowledgement profile ref").fill("tenant.payroll.ack.phase5q.v1");
    const acknowledged = await submitAndCapture<{ handoff: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/acknowledge$`),
      "POST",
      async () => {
        await handoffControls.getByRole("button", { name: "Acknowledge handoff" }).click();
      },
    );
    expect(acknowledged.ok).toBeTruthy();
    expect(acknowledged.payload.handoff.status).toBe("accepted");

    await handoffControls.getByLabel("Audit pack profile ref").fill("tenant.payroll.audit.phase5q.v1");
    const auditPack = await submitAndCapture<{ handoff: { id: string }; artifacts: Array<{ kind: string }> }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.payload.handoff.id}/generate-audit-pack$`),
      "POST",
      async () => {
        await handoffControls.getByRole("button", { name: "Generate audit pack" }).click();
      },
    );
    expect(auditPack.ok).toBeTruthy();
    expect(auditPack.payload.artifacts.some((artifact) => artifact.kind === "provider_audit_pack")).toBe(true);

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.payload.handoff.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("heading", { name: "Provider audit pack" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("tenant.payroll.handoff.phase5q.v1");
    await expect(page.getByRole("main")).toContainText("tenant.payroll.audit.phase5q.v1");
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    const deliveryLink = page.locator(".payroll-handoff-evidence-card").first();
    await expect(deliveryLink).toBeVisible();
    await deliveryLink.click();
    await expect(page.getByLabel("Delivery audit evidence")).toContainText("Provider delivery");
    await expectNoHorizontalOverflow(page);
  });
});
