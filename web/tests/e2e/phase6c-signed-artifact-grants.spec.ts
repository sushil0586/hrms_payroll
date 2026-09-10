import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PayrollOutputSetup = {
  artifacts: Array<{
    id: string;
    kind: string;
    title: string;
    status: string;
    is_downloadable: boolean;
    supports_signed_url: boolean;
  }>;
};
type PayrollInputSetup = {
  options: {
    periods: Array<{ id: string }>;
    employees: Array<{ id: string; employee_code: string; name: string }>;
  };
};

async function captureGrantStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase6c-signed-artifact-grants/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function token(page: Page) {
  const cookies = await page.context().cookies();
  const value = cookies.find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(value).toBeTruthy();
  return value!;
}

async function outputSetup(page: Page): Promise<PayrollOutputSetup> {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}/hr-admin/payroll-output-setup/`, {
    headers: { Authorization: `Token ${await token(page)}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as PayrollOutputSetup;
}

async function getJson<T>(page: Page, path: string) {
  const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
  const response = await page.request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Token ${await token(page)}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function postJson<T>(page: Page, path: string, data: Record<string, unknown>) {
  const response = await page.request.post(path, { data });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function createDisposableSignedArtifact(page: Page) {
  const setup = await getJson<PayrollInputSetup>(page, "/hr-admin/payroll-input-snapshot-setup/");
  const period = setup.options.periods[0];
  const employee = setup.options.employees.find((item) => item.employee_code === "EMP-0042") ?? setup.options.employees[0];
  expect(period).toBeTruthy();
  expect(employee).toBeTruthy();
  const runRef = Date.now();
  const run = await postJson<{ id: string }>(page, "/api/hr-admin/payroll-runs", {
    period_id: period.id,
    code: `PW_SIGNED_${runRef}`,
    name: `Browser signed grant ${runRef}`,
    status: "collecting_inputs",
    input_profile_ref: "tenant.payroll.input.phase6c.v1",
    snapshot_schema_ref: "tenant.payroll.snapshot.phase6c.v1",
    config_snapshot: {
      output_profile: {
        storage_profile: {
          provider_ref: "payroll.storage.signed_url.placeholder.v1",
          download_strategy_ref: "payroll.download.signed_url.v1",
          signed_url_expires_in_seconds: 300,
          key_prefix: "signed-payroll",
          retention_policy_ref: "payroll.retention.10y.v1",
        },
      },
    },
  });
  await postJson<{ id: string }>(page, "/api/hr-admin/payroll-input-snapshots", {
    payroll_run_id: run.id,
    employee_id: employee.id,
    snapshot_status: "ready",
    input_profile_ref: "tenant.payroll.input.phase6c.v1",
    config_profile_ref: "tenant.payroll.snapshot.phase6c.v1",
    employee_snapshot: { source: "browser", employment_status: "active" },
    organization_snapshot: { source: "browser", legal_entity: "Phase 6C" },
    salary_snapshot: { source: "browser", annual_ctc: 720000, monthly_gross: 60000, currency_code: "INR" },
    attendance_snapshot: { working_days: 22, present_days: 22, lop_days: 0 },
    validation_snapshot: { blockers: [], warnings: [] },
  });
  await postJson(page, `/api/hr-admin/payroll-runs/${run.id}/lock-inputs`, {});
  await postJson<{ calculation: { id: string } }>(page, `/api/hr-admin/payroll-runs/${run.id}/calculate-draft`, {
    calculation_profile_ref: "tenant.payroll.calc.phase6c.v1",
  });
  const review = await postJson<{ review: { id: string } }>(page, `/api/hr-admin/payroll-runs/${run.id}/open-review`, {
    review_profile_ref: "tenant.payroll.review.phase6c.v1",
  });
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/submit`, {});
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/approve`, {
    approval_profile_ref: "tenant.payroll.approval.phase6c.v1",
  });
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/lock`, {});
  const outputs = await postJson<{ output_batch: { id: string }; artifacts: PayrollOutputSetup["artifacts"] }>(
    page,
    `/api/hr-admin/payroll-reviews/${review.review.id}/generate-outputs`,
    { output_profile_ref: "india.signed.output.profile.v1" },
  );
  await postJson(page, `/api/hr-admin/payroll-output-batches/${outputs.output_batch.id}/publish`, {});
  const refreshed = await outputSetup(page);
  const artifact = refreshed.artifacts.find((item) => item.status === "published" && item.is_downloadable && item.supports_signed_url && item.kind === "payslip");
  expect(artifact, "Expected disposable signed-url output generation to create a signed payslip.").toBeTruthy();
  return artifact!;
}

async function selectedSignedArtifact(page: Page) {
  const setup = await outputSetup(page);
  const artifact = setup.artifacts.find((item) => item.status === "published" && item.is_downloadable && item.supports_signed_url);
  return artifact ?? createDisposableSignedArtifact(page);
}

test.describe("Phase 6C signed payroll artifact grant certification", () => {
  test("issues, uses, revokes, and blocks a signed HR artifact grant with visible access governance", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByText("Storage governance").first()).toBeVisible();
    await expect(page.getByText("Access governance").first()).toBeVisible();

    for (const text of [
      "Signed issued",
      "Active grants",
      "Revoked grants",
      "Expired grants",
      "Downloads",
      "Latest expiry",
      "Source hash",
      "Template config",
    ]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }

    const artifact = await selectedSignedArtifact(page);
    const issueResponse = await page.request.post(`/api/hr-admin/payroll-output-artifacts/${artifact.id}/signed-access`, {
      data: {
        expires_in_seconds: 60,
        max_access_count: 2,
        permission_scope: "download",
      },
    });
    expect(issueResponse.status()).toBe(201);
    const issuePayload = await issueResponse.json();
    expect(issuePayload.grant.status).toBe("active");
    expect(issuePayload.grant.output_artifact_id).toBe(artifact.id);
    expect(issuePayload.grant.token_prefix).toBeTruthy();
    expect(issuePayload.grant.signed_url).toContain(`${issuePayload.grant.token_prefix}...`);
    expect(issuePayload.signed_url).toContain("grant_id=");
    expect(issuePayload.signed_url).toContain("token=");

    const signedPath = String(issuePayload.signed_url).replace(/^\/api\/v1/, "/api");
    const signedDownload = await page.request.get(signedPath);
    expect(signedDownload.status()).toBe(200);
    expect(signedDownload.headers()["content-disposition"] ?? "").toContain("attachment");
    expect(signedDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect((await signedDownload.body()).length).toBeGreaterThan(0);

    const revokeMissingReason = await page.request.post(`/api/hr-admin/payroll-signed-access-grants/${issuePayload.grant.id}/revoke`, {
      data: {},
    });
    expect(revokeMissingReason.status()).toBe(400);

    const revokeResponse = await page.request.post(`/api/hr-admin/payroll-signed-access-grants/${issuePayload.grant.id}/revoke`, {
      data: { reason: "Phase 6C browser certification revoke." },
    });
    expect(revokeResponse.status()).toBe(200);
    const revokedPayload = await revokeResponse.json();
    expect(revokedPayload.status).toBe("revoked");
    expect(revokedPayload.revocation_reason).toBe("Phase 6C browser certification revoke.");
    expect(revokedPayload.revoked_at).toBeTruthy();

    const blockedDownload = await page.request.get(signedPath);
    expect(blockedDownload.status()).toBe(403);
    expect(await blockedDownload.json()).toMatchObject({ detail: "Signed access grant has been revoked." });

    await page.goto(`/hr-admin/payroll-outputs?artifactId=${artifact.id}`);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByText("Access governance").first()).toBeVisible();
    await expect(page.getByText("Revoked grants").first()).toBeVisible();
    const auditExport = await page.request.get(`/api/hr-admin/payroll-output-artifacts/${artifact.id}/access-audit-export`);
    expect(auditExport.status()).toBe(200);
    const auditCsv = await auditExport.text();
    expect(auditCsv).toContain("signed_url_issued");
    expect(auditCsv).toContain("revoked");
    expect(auditCsv).toContain("Phase 6C browser certification revoke.");
    await expectNoHorizontalOverflow(page);
    await captureGrantStep(page, testInfo, "01-signed-grant-governance-after-revoke");
  });
});
