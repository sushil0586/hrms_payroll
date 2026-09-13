import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PayrollOutputBatch = {
  id: string;
  payroll_run_name: string;
  status: string;
  artifact_count: number;
  payslip_count: number;
  register_count: number;
  published_artifact_count: number;
};

type PayrollOutputSetup = {
  output_batches: PayrollOutputBatch[];
  artifacts: Array<{
    id: string;
    output_batch_id: string;
    kind: string;
    status: string;
    title: string;
    checksum_sha256: string;
    source_hash: string;
  }>;
};

type PayrollFinanceHandoff = {
  id: string;
  output_batch_id: string;
  payroll_run_name: string;
  status: string;
  artifact_count: number;
  totals_snapshot: Record<string, unknown>;
  handoff_summary_snapshot: Record<string, unknown>;
  handoff_profile_ref: string;
};

type PayrollFinanceHandoffSetup = {
  summary: {
    handoff_count: number;
    transmitted_handoff_count: number;
    accepted_handoff_count: number;
    finance_artifact_count: number;
    reconciled_delivery_count: number;
    provider_audit_pack_count?: number;
  };
  handoffs: PayrollFinanceHandoff[];
  artifacts: Array<{
    id: string;
    output_batch_id: string;
    kind: string;
    status: string;
    title: string;
    checksum_sha256: string;
    source_hash: string;
    is_downloadable: boolean;
  }>;
  deliveries: Array<{
    id: string;
    handoff_id: string;
    output_artifact_id: string;
    artifact_kind: string;
    status: string;
    provider_ref: string;
    payload_checksum_sha256: string;
    acknowledged_at: string | null;
    reconciled_at: string | null;
  }>;
  provider_jobs: Array<{
    id: string;
    provider_delivery_id: string | null;
    status: string;
    provider_ref: string;
    idempotency_key: string;
  }>;
  callback_events: Array<{
    id: string;
    handoff_id: string;
    provider_delivery_id: string;
    provider_status: string;
    payload_checksum_sha256: string;
  }>;
};

type HandoffActionResult = {
  detail: string;
  handoff: PayrollFinanceHandoff;
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const runName = `${prefix} Output Payslip ESS Gate`;

function panel(page: Page, label: string) {
  return page.getByLabel(label);
}

function field(scope: Locator, label: string) {
  return scope.getByLabel(label);
}

async function authToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return token!;
}

async function backendApiGet<T>(page: Page, path: string) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}${path}`, {
    headers: {
      Authorization: `Token ${await authToken(page)}`,
    },
  });
  expect(response.status(), `${path} should return 200 from backend API`).toBe(200);
  return (await response.json()) as T;
}

async function backendApiRequest(page: Page, path: string, method: "GET" | "POST", data?: Record<string, unknown>) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const token = await authToken(page);
  if (method === "POST") {
    return page.request.post(`${apiBase}${path}`, {
      data,
      headers: { Authorization: `Token ${token}` },
    });
  }
  return page.request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 60_000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function locatePublishedP100Batch(page: Page) {
  const setup = await backendApiGet<PayrollOutputSetup>(page, "/hr-admin/payroll-output-setup/");
  const batch = setup.output_batches.find((item) => item.payroll_run_name === runName);
  expect(batch, `Missing published P100 output batch for ${runName}. Run P100-8 first.`).toBeTruthy();
  expect(batch?.status, `${runName} output batch must be published before finance handoff certification.`).toBe("published");
  expect(batch?.artifact_count).toBeGreaterThanOrEqual(101);
  expect(batch?.payslip_count).toBe(100);
  expect(batch?.register_count).toBe(1);
  expect(batch?.published_artifact_count).toBeGreaterThanOrEqual(101);
  return batch as PayrollOutputBatch;
}

async function locateHandoff(page: Page, outputBatchId: string) {
  const setup = await backendApiGet<PayrollFinanceHandoffSetup>(page, "/hr-admin/payroll-finance-handoff-setup/");
  return {
    setup,
    handoff: setup.handoffs.find((item) => item.output_batch_id === outputBatchId) ?? null,
  };
}

async function csvExport(page: Page, url: string, reportKey: string) {
  const response = await page.request.get(url);
  expect(response.status(), `${reportKey} export should return 200`).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["x-hrms-report-key"]).toBe(reportKey);
  expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
  expect(Number(response.headers()["x-hrms-source-row-count"])).toBeGreaterThan(0);
  return response.text();
}

async function manifestExport(page: Page, url: string, reportKey: string) {
  const response = await page.request.get(url);
  expect(response.status(), `${reportKey} manifest should return 200`).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["x-hrms-report-key"]).toBe(reportKey);
  expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
  const manifest = await response.json();
  expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
  expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
  return manifest as { source_endpoints: string[]; evidence_columns: string[] };
}

test.describe.serial("P100-9 finance handoff and compliance certification", () => {
  test("HR admin completes finance handoff, reconciles provider evidence, and certifies finance reports", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    const batch = await locatePublishedP100Batch(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${batch.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: runName, exact: true })).toBeVisible();
    await expect(page.getByText("Finance handoff readiness")).toBeVisible();
    await expect(page.getByText(/\d+ artifacts/).first()).toBeVisible();

    let { handoff } = await locateHandoff(page, batch.id);
    if (!handoff) {
      const outputPanel = panel(page, "Output controls");
      await field(outputPanel, "Handoff profile ref").fill("tenant.payroll.finance.handoff.pilot100.v1");
      const generated = await submitAndCapture<HandoffActionResult>(
        page,
        new RegExp(`/api/hr-admin/payroll-output-batches/${batch.id}/generate-finance-handoff$`),
        "POST",
        async () => {
          await outputPanel.getByRole("button", { name: "Generate handoff" }).click();
        },
      );
      expect(generated.ok).toBeTruthy();
      expect(generated.payload.handoff.status).toBe("generated");
      handoff = generated.payload.handoff;
      await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff generated");
    }

    expect(handoff.output_batch_id).toBe(batch.id);
    expect(handoff.artifact_count).toBeGreaterThanOrEqual(3);
    expect(handoff.handoff_profile_ref).toContain("handoff");

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("heading", { name: runName, exact: true })).toBeVisible();
    for (const heading of [
      "Handoff controls",
      "Configurable finance routing",
      "Finance artifacts",
      "Delivery acknowledgements",
      "Provider jobs",
      "Provider callbacks",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    if (handoff.status === "generated") {
      const handoffPanel = panel(page, "Handoff controls");
      const transmitted = await submitAndCapture<HandoffActionResult>(
        page,
        new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.id}/transmit$`),
        "POST",
        async () => {
          await handoffPanel.getByRole("button", { name: "Transmit handoff" }).click();
        },
      );
      expect(transmitted.ok).toBeTruthy();
      expect(transmitted.payload.handoff.status).toBe("transmitted");
      handoff = transmitted.payload.handoff;
      await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff transmitted");
    }

    let handoffSetup = (await locateHandoff(page, batch.id)).setup;
    const generatedArtifacts = handoffSetup.artifacts.filter((artifact) => artifact.output_batch_id === batch.id);
    expect(generatedArtifacts.length).toBeGreaterThanOrEqual(3);
    expect(generatedArtifacts.map((artifact) => artifact.kind)).toEqual(expect.arrayContaining(["bank_advice", "accounting_export"]));
    expect(generatedArtifacts.every((artifact) => artifact.checksum_sha256.match(/^[a-f0-9]{64}$/))).toBe(true);
    expect(generatedArtifacts.every((artifact) => artifact.source_hash.match(/^[a-f0-9]{64}$/))).toBe(true);

    if (handoff.status === "transmitted") {
      const handoffPanel = panel(page, "Handoff controls");
      await field(handoffPanel, "Acknowledgement profile ref").fill("tenant.payroll.finance.ack.pilot100.v1");
      const acknowledged = await submitAndCapture<HandoffActionResult>(
        page,
        new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.id}/acknowledge$`),
        "POST",
        async () => {
          await handoffPanel.getByRole("button", { name: "Acknowledge handoff" }).click();
        },
      );
      expect(acknowledged.ok).toBeTruthy();
      expect(acknowledged.payload.handoff.status).toBe("accepted");
      handoff = acknowledged.payload.handoff;
      await expect(page.getByRole("status").first()).toContainText("Payroll finance handoff acknowledgement recorded");
    }

    const beforeAuditSetup = (await locateHandoff(page, batch.id)).setup;
    const existingAuditPacks = beforeAuditSetup.artifacts.filter((artifact) => artifact.output_batch_id === batch.id && artifact.kind === "provider_audit_pack");
    if (!existingAuditPacks.length) {
      const handoffPanel = panel(page, "Handoff controls");
      await field(handoffPanel, "Audit pack profile ref").fill("tenant.payroll.provider.audit.pilot100.v1");
      const auditPack = await submitAndCapture<HandoffActionResult>(
        page,
        new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoff.id}/generate-audit-pack$`),
        "POST",
        async () => {
          await handoffPanel.getByRole("button", { name: "Generate audit pack" }).click();
        },
      );
      expect(auditPack.ok).toBeTruthy();
      await expect(page.getByRole("status").first()).toContainText("Payroll provider audit pack generated");
    }

    handoffSetup = (await locateHandoff(page, batch.id)).setup;
    const finalHandoff = handoffSetup.handoffs.find((item) => item.id === handoff.id);
    expect(finalHandoff?.status).toBe("accepted");
    const deliveries = handoffSetup.deliveries.filter((delivery) => delivery.handoff_id === handoff.id);
    expect(deliveries.length).toBeGreaterThanOrEqual(3);
    expect(deliveries.every((delivery) => ["acknowledged", "reconciled"].includes(delivery.status))).toBe(true);
    expect(deliveries.every((delivery) => delivery.payload_checksum_sha256.match(/^[a-f0-9]{64}$/))).toBe(true);
    const handoffJobs = handoffSetup.provider_jobs.filter((job) => deliveries.some((delivery) => delivery.id === job.provider_delivery_id));
    expect(handoffJobs.every((job) => ["completed", "queued", "running"].includes(job.status))).toBe(true);
    expect(handoffSetup.artifacts.filter((artifact) => artifact.output_batch_id === batch.id && artifact.kind === "provider_audit_pack").length).toBe(1);
    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoff.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("heading", { name: "Provider audit pack" })).toBeVisible();

    const bankAdvice = generatedArtifacts.find((artifact) => artifact.kind === "bank_advice");
    expect(bankAdvice?.is_downloadable).toBe(true);
    const bankDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${bankAdvice?.id}/download`);
    expect(bankDownload.status()).toBe(200);
    expect(bankDownload.headers()["x-payroll-artifact-checksum"]).toBe(bankAdvice?.checksum_sha256);
    expect(await bankDownload.text()).toContain("employee_code");

    await gotoAuthenticated(page, "/hr-admin/reports/bank-advice", hrAdmin);
    await expectPageReady(page, "Bank Advice Report");
    const bankReport = page.getByTestId("bank-advice-report");
    await page.getByPlaceholder("Search run, provider, file, hash").fill(runName);
    await expect(bankReport.locator("tbody").getByText(runName).first()).toBeVisible();
    await expect(bankReport.locator(".pagination-bar")).toBeVisible();
    await page.getByLabel("Handoff status").selectOption("accepted");
    await expect(bankReport.getByText(/Showing/)).toBeVisible();
    await page.getByLabel("Delivery status").selectOption("reconciled");
    await expect(bankReport.getByText(/Showing/)).toBeVisible();
    const bankCsv = await csvExport(page, `/api/hr-admin/reports/bank-advice?q=${encodeURIComponent(runName)}&sort=delivery_status`, "bank-advice");
    expect(bankCsv).toContain(runName);
    expect(bankCsv).toContain("bank_advice_total");
    const bankManifest = await manifestExport(page, `/api/hr-admin/reports/bank-advice?q=${encodeURIComponent(runName)}&sort=delivery_status&format=manifest`, "bank-advice");
    expect(bankManifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
    expect(bankManifest.evidence_columns).toContain("source_hash");

    await gotoAuthenticated(page, "/hr-admin/reports/finance-handoff-exceptions", hrAdmin);
    await expectPageReady(page, "Finance Handoff Exceptions Report");
    const exceptionReport = page.getByTestId("finance-handoff-exceptions-report");
    await page.getByRole("searchbox", { name: "Search handoffs" }).fill(runName);
    await expect(exceptionReport.locator("tbody").getByText(runName).first()).toBeVisible();
    await page.getByLabel("Risk").selectOption("Low");
    await expect(exceptionReport.getByText(/Showing/)).toBeVisible();
    const exceptionCsv = await csvExport(page, `/api/hr-admin/reports/finance-handoff-exceptions?q=${encodeURIComponent(runName)}&sort=risk`, "finance-handoff-exceptions");
    expect(exceptionCsv).toContain(runName);
    expect(exceptionCsv).toContain("Ready for finance review");
    const exceptionManifest = await manifestExport(page, `/api/hr-admin/reports/finance-handoff-exceptions?q=${encodeURIComponent(runName)}&sort=risk&format=manifest`, "finance-handoff-exceptions");
    expect(exceptionManifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
    expect(exceptionManifest.evidence_columns).toContain("handoff_risk");

    await gotoAuthenticated(page, "/hr-admin/reports/payroll-register", hrAdmin);
    await expectPageReady(page, "Payroll Register Report");
    const registerReport = page.getByTestId("payroll-register-report");
    await page.getByPlaceholder("Search run, file, profile, hash").fill(runName);
    await expect(registerReport.locator("tbody").getByText(runName).first()).toBeVisible();
    const registerCsv = await csvExport(page, `/api/hr-admin/reports/payroll-register?q=${encodeURIComponent(runName)}&sort=net_pay_desc`, "payroll-register");
    expect(registerCsv).toContain(runName);
    expect(registerCsv).toContain("source_hash");

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");
    const blockedHandoff = await backendApiRequest(page, "/hr-admin/payroll-finance-handoff-setup/", "GET");
    expect([401, 403]).toContain(blockedHandoff.status());
    const blockedBank = await page.request.get(`/api/hr-admin/reports/bank-advice?q=${encodeURIComponent(runName)}`);
    expect([401, 403]).toContain(blockedBank.status());
    const blockedGenerate = await backendApiRequest(page, `/hr-admin/payroll-output-batches/${batch.id}/generate-finance-handoff/`, "POST", {
      handoff_profile_ref: "tenant.payroll.finance.handoff.blocked.v1",
    });
    expect([401, 403]).toContain(blockedGenerate.status());
    await expectNoHorizontalOverflow(page);
  });
});
