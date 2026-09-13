import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, type Persona } from "../helpers/staging-auth";

type PayrollRun = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type CalculationLine = {
  id: string;
  employee_code: string;
  source_hash: string;
};

type CalculationSetup = {
  runs: PayrollRun[];
};

type PayrollOutputArtifact = {
  id: string;
  output_batch_id: string;
  kind: string;
  status: string;
  employee_code: string | null;
  employee_name: string | null;
  source_hash: string;
  checksum_sha256: string;
  is_downloadable: boolean;
  supports_signed_url: boolean;
};

type PayrollOutputSetup = {
  output_batches: Array<{
    id: string;
    payroll_run_name: string;
    status: string;
    artifact_count: number;
    published_artifact_count: number;
    payslip_count: number;
    register_count: number;
    output_profile_ref: string;
  }>;
  artifacts: PayrollOutputArtifact[];
};

type EssPayslipList = {
  summary: {
    published_payslip_count: number;
    downloadable_payslip_count: number;
  };
  items: Array<{
    id: string;
    payroll_run_name: string;
    title: string;
    source_hash: string;
    access_summary: {
      is_read_acknowledged: boolean;
      download_count: number;
    };
  }>;
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const runCode = `${prefix.toLowerCase()}-output-payslip`;
const pilotEmployee: Persona = {
  username: process.env.PLAYWRIGHT_PILOT100_EMPLOYEE_USERNAME ?? `${prefix.toLowerCase()}.e001`,
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

function panel(page: Page, label: string) {
  return page.getByLabel(label);
}

function field(scope: Locator, label: string) {
  return scope.getByLabel(label);
}

async function apiGet<T>(page: Page, url: string) {
  const response = await page.request.get(url);
  expect(response.status(), `${url} should return 200`).toBe(200);
  return (await response.json()) as T;
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

async function backendApiPost<T>(page: Page, path: string, data: Record<string, unknown>) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.post(`${apiBase}${path}`, {
    data,
    headers: {
      Authorization: `Token ${await authToken(page)}`,
    },
  });
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

function backendAbsoluteUrl(path: string) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  return `${new URL(apiBase).origin}${path}`;
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

async function locatePilotRun(page: Page) {
  const setup = await apiGet<CalculationSetup>(page, "/api/hr-admin/payroll-calculation-setup");
  const run = setup.runs.find((item) => item.code === runCode);
  expect(
    run,
    `Missing ${runCode}. Seed with seed_pilot_100_calculation --run-code-suffix output-payslip first.`,
  ).toBeTruthy();
  expect(run?.status, `${runCode} must start inputs_locked for repeatable P100-8 browser certification.`).toBe("inputs_locked");
  return run as PayrollRun;
}

function artifactIdFromMeDownload(href: string) {
  return href.match(/payroll-payslips\/([^/]+)\/download/)?.[1] ?? "";
}

test.describe.serial("P100-8 output, payslip, and ESS certification", () => {
  test("HR admin publishes 100 payslips and a pilot employee can read only their own payslip", async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const run = await locatePilotRun(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: `${prefix} Output Payslip ESS Gate` })).toBeVisible();

    const calculationPanel = panel(page, "Calculation controls");
    const calculation = await submitAndCapture<{
      calculation: { id: string; status: string; line_count: number; totals_snapshot: Record<string, unknown> };
      lines: CalculationLine[];
    }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.id}/calculate-draft$`), "POST", async () => {
      await field(calculationPanel, "Calculation profile ref").fill("tenant.payroll.calc.pilot100.v1");
      await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
    });
    expect(calculation.ok).toBeTruthy();
    expect(calculation.payload.calculation.status).toBe("completed");
    expect(calculation.payload.calculation.line_count).toBe(300);
    expect(Number(calculation.payload.calculation.totals_snapshot.employee_count)).toBe(100);
    expect(new Set(calculation.payload.lines.map((line) => line.employee_code)).size).toBe(100);
    expect(calculation.payload.lines.filter((line) => line.source_hash).length).toBe(300);

    const review = await submitAndCapture<{
      review: { id: string; status: string; exception_count: number };
    }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.id}/open-review$`), "POST", async () => {
      await field(calculationPanel, "Review profile ref").fill("tenant.payroll.review.pilot100.outputs.v1");
      await calculationPanel.getByRole("button", { name: "Open review" }).click();
    });
    expect(review.ok).toBeTruthy();
    expect(review.payload.review.status).toBe("open");
    expect(review.payload.review.exception_count).toBeGreaterThanOrEqual(17);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    const reviewPanel = panel(page, "Review controls");
    const submitted = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`),
      "POST",
      async () => {
        await reviewPanel.getByRole("button", { name: "Submit review" }).click();
      },
    );
    expect(submitted.ok).toBeTruthy();
    expect(submitted.payload.review.status).toBe("ready_for_approval");

    await field(reviewPanel, "Approval profile ref").fill("tenant.payroll.approval.pilot100.outputs.v1");
    await field(reviewPanel, "Approval comment").fill("Approved for P100-8 payslip publication and ESS ownership certification.");
    const approved = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/approve$`),
      "POST",
      async () => {
        await reviewPanel.getByRole("button", { name: "Approve review" }).click();
      },
    );
    expect(approved.ok).toBeTruthy();
    expect(approved.payload.review.status).toBe("approved");

    const locked = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/lock$`),
      "POST",
      async () => {
        await reviewPanel.getByRole("button", { name: "Final lock" }).click();
      },
    );
    expect(locked.ok).toBeTruthy();
    expect(locked.payload.review.status).toBe("locked");

    const outputResponse = await submitAndCapture<{
      output_batch: { id: string; status: string; artifact_count: number; payslip_count: number; register_count: number };
      artifacts: PayrollOutputArtifact[];
    }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/generate-outputs$`), "POST", async () => {
      await field(reviewPanel, "Output profile ref").fill("india.signed.output.profile.v1");
      await reviewPanel.getByRole("button", { name: "Generate outputs" }).click();
    });
    expect(outputResponse.ok).toBeTruthy();
    expect(outputResponse.payload.output_batch.status).toBe("generated");
    expect(outputResponse.payload.output_batch.payslip_count).toBe(100);
    expect(outputResponse.payload.output_batch.register_count).toBe(1);
    expect(outputResponse.payload.output_batch.artifact_count).toBe(101);
    expect(outputResponse.payload.artifacts.filter((artifact) => artifact.kind === "payslip").length).toBe(100);

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${outputResponse.payload.output_batch.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Output controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    await expect(page.getByText("100 payslips").first()).toBeVisible();

    const outputPanel = panel(page, "Output controls");
    const published = await submitAndCapture<{ output_batch: { id: string; status: string; published_artifact_count: number } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${outputResponse.payload.output_batch.id}/publish$`),
      "POST",
      async () => {
        await outputPanel.getByRole("button", { name: "Publish outputs" }).click();
      },
    );
    expect(published.ok).toBeTruthy();
    expect(published.payload.output_batch.status).toBe("published");
    expect(published.payload.output_batch.published_artifact_count).toBe(101);
    await expect(page.getByRole("status").first()).toContainText(/Payroll outputs published/);

    const outputSetup = await backendApiGet<PayrollOutputSetup>(
      page,
      `/hr-admin/payroll-output-setup/?batch_id=${outputResponse.payload.output_batch.id}`,
    );
    const selectedBatch = outputSetup.output_batches.find((batch) => batch.id === outputResponse.payload.output_batch.id);
    expect(selectedBatch?.status).toBe("published");
    expect(selectedBatch?.artifact_count).toBe(101);
    expect(selectedBatch?.payslip_count).toBe(100);
    const payslips = outputSetup.artifacts.filter((artifact) => artifact.output_batch_id === outputResponse.payload.output_batch.id && artifact.kind === "payslip");
    const pilotEmployeeArtifact = payslips.find((artifact) => artifact.employee_code === `${prefix}_E001`);
    const otherEmployeeArtifact = payslips.find((artifact) => artifact.employee_code === `${prefix}_E002`);
    expect(payslips.length).toBe(100);
    expect(new Set(payslips.map((artifact) => artifact.employee_code)).size).toBe(100);
    expect(pilotEmployeeArtifact?.source_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(pilotEmployeeArtifact?.supports_signed_url).toBe(true);
    expect(otherEmployeeArtifact?.id).toBeTruthy();

    const hrDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${pilotEmployeeArtifact?.id}/download`);
    expect(hrDownload.status()).toBe(200);
    expect(hrDownload.headers()["x-payroll-artifact-checksum"]).toBe(pilotEmployeeArtifact?.checksum_sha256);
    expect(hrDownload.headers()["x-payroll-storage-provider"]).toBeTruthy();
    expect((await hrDownload.body()).length).toBeGreaterThan(0);

    const auditExport = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${pilotEmployeeArtifact?.id}/access-audit-export`);
    expect(auditExport.status()).toBe(200);
    expect(auditExport.headers()["x-payroll-artifact-checksum"]).toBe(pilotEmployeeArtifact?.checksum_sha256);
    expect(await auditExport.text()).toContain("row_type,artifact_id,artifact_key");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess/payslips?q=${encodeURIComponent(runCode)}`, pilotEmployee);
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("heading", { name: "Payslip register" })).toBeVisible();
    await expect(page.getByText(`${prefix} Output Payslip ESS Gate`).first()).toBeVisible();
    await expect(page.getByText(`${prefix}_E001`).first()).toBeVisible();
    await expect(page.getByText("Source hash").first()).toBeVisible();
    await expect(page.getByText("Storage governance").first()).toBeVisible();
    await expect(page.getByText("Calculation lines").first()).toBeVisible();

    const ownPayslips = await backendApiGet<EssPayslipList>(page, `/me/payroll-payslips/?q=${encodeURIComponent(runCode)}`);
    expect(ownPayslips.summary.published_payslip_count).toBeGreaterThanOrEqual(1);
    expect(ownPayslips.summary.downloadable_payslip_count).toBeGreaterThanOrEqual(1);
    const ownPayslip = ownPayslips.items.find((item) => item.id === pilotEmployeeArtifact?.id);
    expect(ownPayslip?.source_hash).toBe(pilotEmployeeArtifact?.source_hash);

    const downloadLink = page.getByRole("link", { name: "Download payslip" }).first();
    await expect(downloadLink).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
    const ownDownloadHref = await downloadLink.getAttribute("href");
    expect(artifactIdFromMeDownload(ownDownloadHref ?? "")).toBe(pilotEmployeeArtifact?.id);
    const ownDownload = await page.request.get(ownDownloadHref ?? "");
    expect(ownDownload.status()).toBe(200);
    expect(ownDownload.headers()["x-payroll-artifact-checksum"]).toBe(pilotEmployeeArtifact?.checksum_sha256);

    const markRead = page.getByRole("button", { name: /Mark as read|Read acknowledged/ }).first();
    if (await markRead.isEnabled().catch(() => false)) {
      await markRead.click();
      await expect(page.getByRole("button", { name: "Read acknowledged" }).first()).toBeVisible();
    }

    const blockedHrArtifactDownload = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${pilotEmployeeArtifact?.id}/download`);
    expect([401, 403]).toContain(blockedHrArtifactDownload.status());
    const blockedOtherPayslip = await page.request.get(`/api/me/payroll-payslips/${otherEmployeeArtifact?.id}/download`);
    expect(blockedOtherPayslip.status()).toBe(404);

    const signedAccess = await backendApiPost<{
      grant: { output_artifact_id: string };
      signed_url: string;
    }>(page, `/me/payroll-payslips/${pilotEmployeeArtifact?.id}/signed-access/`, {
        expires_in_seconds: 60,
        max_access_count: 1,
        permission_scope: "download",
    });
    expect(signedAccess.status).toBe(201);
    const signedPayload = signedAccess.payload;
    expect(signedPayload.grant.output_artifact_id).toBe(pilotEmployeeArtifact?.id);
    const signedPath = backendAbsoluteUrl(String(signedPayload.signed_url));
    const signedHeaders = { Authorization: `Token ${await authToken(page)}` };
    const firstSignedDownload = await page.request.get(signedPath, { headers: signedHeaders });
    expect(firstSignedDownload.status()).toBe(200);
    const secondSignedDownload = await page.request.get(signedPath, { headers: signedHeaders });
    expect(secondSignedDownload.status()).toBe(403);
    expect(await secondSignedDownload.json()).toMatchObject({ detail: "Signed access grant access limit has been reached." });
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/reports/payslip-publication", hrAdmin);
    await expectPageReady(page, "Payslip Publication Report");
    const report = page.getByTestId("payslip-publication-report");
    await report.getByPlaceholder("Search employee, run, artifact, hash").fill(`${prefix}_E001`);
    await expect(report.locator("tbody").getByText(`${prefix}_E001`).first()).toBeVisible();
    await expect(report.locator("tbody").getByText(`${prefix} Output Payslip ESS Gate`).first()).toBeVisible();
    const reportExport = await page.request.get(`/api/hr-admin/reports/payslip-publication?q=${encodeURIComponent(runCode)}&sort=risk`);
    expect(reportExport.status()).toBe(200);
    expect(reportExport.headers()["x-hrms-report-key"]).toBe("payslip-publication");
    expect(Number(reportExport.headers()["x-hrms-source-row-count"])).toBeGreaterThanOrEqual(100);
    const reportCsv = await reportExport.text();
    expect(reportCsv).toContain(`${prefix}_E001`);
    expect(reportCsv).toContain(String(pilotEmployeeArtifact?.source_hash));
    await expectNoHorizontalOverflow(page);
  });
});
