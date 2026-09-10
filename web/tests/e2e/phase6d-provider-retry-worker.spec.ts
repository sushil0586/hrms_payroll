import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const execFileAsync = promisify(execFile);

type HandoffSetup = {
  handoffs: Array<{ id: string; status: string }>;
  deliveries: Array<{
    id: string;
    handoff_id: string;
    output_artifact_id: string;
    provider_ref: string;
    external_reference: string;
    artifact_kind: string;
    channel_ref: string;
    status: string;
    payload_checksum_sha256: string;
    request_snapshot: { line_count?: number };
    config_snapshot: {
      submission_contract?: {
        callback_verification_ref?: string;
        callback_security_policy?: {
          signature_material_fields?: string[];
          signature_material_delimiter?: string;
          signature_algorithm_ref?: string;
          signature_adapter_ref?: string;
          signature_key_ref?: string;
          secret_rotation_ref?: string;
        };
      };
    };
  }>;
  retry_events: Array<{ id: string; status: string; provider_delivery_id: string }>;
  provider_jobs: Array<{ id: string; status: string; retry_event_id: string; provider_delivery_id: string }>;
};
type PayrollInputSetup = {
  options: {
    periods: Array<{ id: string }>;
    employees: Array<{ id: string; employee_code: string }>;
  };
};

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function captureProviderStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase6d-provider-retry-worker/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function authToken(page: Page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return token!;
}

async function getHandoffSetup(page: Page): Promise<HandoffSetup> {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-finance-handoff-setup/`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as HandoffSetup;
}

async function getJson<T>(page: Page, path: string) {
  const response = await page.request.get(`${apiBaseUrl()}${path}`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function postJson<T>(page: Page, path: string, data: Record<string, unknown>) {
  const response = await page.request.post(path, { data });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

function stablePayloadChecksum(payload: Record<string, unknown>) {
  const stable = JSON.stringify(payload, Object.keys(payload).sort(), 0).replace(/:/g, ":").replace(/,/g, ",");
  return crypto.createHash("sha256").update(stable).digest("hex");
}

function signatureFor(delivery: HandoffSetup["deliveries"][number], idempotencyKey: string, checksum: string) {
  const policy = delivery.config_snapshot.submission_contract?.callback_security_policy ?? {};
  const fields = policy.signature_material_fields ?? [
    "provider_ref",
    "provider_delivery_id",
    "handoff_id",
    "output_artifact_id",
    "artifact_kind",
    "channel_ref",
    "external_reference",
    "idempotency_key",
    "payload_checksum_sha256",
    "artifact_checksum_sha256",
    "callback_verification_ref",
  ];
  const values: Record<string, string> = {
    provider_ref: delivery.provider_ref,
    provider_delivery_id: delivery.id,
    handoff_id: delivery.handoff_id,
    output_artifact_id: delivery.output_artifact_id,
    artifact_kind: delivery.artifact_kind,
    channel_ref: delivery.channel_ref,
    external_reference: delivery.external_reference,
    idempotency_key: idempotencyKey,
    payload_checksum_sha256: checksum,
    artifact_checksum_sha256: delivery.payload_checksum_sha256,
    callback_verification_ref: delivery.config_snapshot.submission_contract?.callback_verification_ref ?? "payroll.callback.verification.manual.v1",
  };
  const material = fields.map((field) => values[field] ?? "").join(policy.signature_material_delimiter ?? ":");
  const adapter = policy.signature_adapter_ref ?? "";
  const algorithm = policy.signature_algorithm_ref ?? "payroll.callback.signature.sha256.v1";
  if (adapter === "payroll.provider_signature_adapter.hmac_sha256_ref.v1" || algorithm === "payroll.callback.signature.hmac_sha256_ref.v1") {
    const key = policy.signature_key_ref ?? policy.secret_rotation_ref ?? values.callback_verification_ref;
    return crypto.createHmac("sha256", key).update(material).digest("hex");
  }
  return crypto.createHash("sha256").update(material).digest("hex");
}

async function ensureRetryableDelivery(page: Page) {
  let setup = await getHandoffSetup(page);
  let delivery =
    setup.deliveries.find((item) => item.artifact_kind === "bank_advice" && ["failed", "rejected"].includes(item.status)) ??
    setup.deliveries.find((item) => item.artifact_kind === "bank_advice" && item.status !== "reconciled");

  if (!delivery) {
    const handoff = setup.handoffs.find((item) => item.status !== "accepted") ?? await createDisposableHandoff(page);
    const transmitResponse = await page.request.post(`/api/hr-admin/payroll-finance-handoffs/${handoff.id}/transmit`, { data: {} });
    expect(transmitResponse.ok()).toBeTruthy();
    setup = await getHandoffSetup(page);
    delivery = setup.deliveries.find((item) => item.handoff_id === handoff.id && item.artifact_kind === "bank_advice");
  }

  expect(delivery, "Expected a bank advice provider delivery for retry certification.").toBeTruthy();
  if (["failed", "rejected"].includes(delivery!.status)) {
    return delivery!;
  }

  const runRef = Date.now();
  const payloadSnapshot = {
    provider_batch_ref: `BANK-RETRY-P6D-${runRef}`,
    line_count: delivery!.request_snapshot.line_count ?? 0,
    failure_code: "BANK_TEMPORARY_OUTAGE",
    failure_reason: "Phase 6D browser certification transient failure.",
    retryable: true,
  };
  const checksum = stablePayloadChecksum(payloadSnapshot);
  const idempotencyKey = `bank-retry-phase6d-${runRef}`;
  const failureResponse = await page.request.post("/api/payroll-provider-callbacks", {
    data: {
      provider_delivery_id: delivery!.id,
      provider_ref: delivery!.provider_ref,
      external_reference: delivery!.external_reference,
      external_event_id: `evt-bank-phase6d-${runRef}`,
      idempotency_key: idempotencyKey,
      provider_status: "failed",
      payload_snapshot: payloadSnapshot,
      signature: signatureFor(delivery!, idempotencyKey, checksum),
      failure_code: "BANK_TEMPORARY_OUTAGE",
      failure_reason: "Phase 6D browser certification transient failure.",
    },
  });
  expect(failureResponse.status()).toBe(200);
  expect((await failureResponse.json()).delivery.status).toBe("failed");

  setup = await getHandoffSetup(page);
  const failedDelivery = setup.deliveries.find((item) => item.id === delivery!.id);
  expect(failedDelivery?.status).toBe("failed");
  return failedDelivery!;
}

async function createDisposableHandoff(page: Page) {
  const setup = await getJson<PayrollInputSetup>(page, "/hr-admin/payroll-input-snapshot-setup/");
  const period = setup.options.periods[0];
  const employee = setup.options.employees.find((item) => item.employee_code === "EMP-0042") ?? setup.options.employees[0];
  expect(period).toBeTruthy();
  expect(employee).toBeTruthy();
  const runRef = Date.now();
  const run = await postJson<{ id: string }>(page, "/api/hr-admin/payroll-runs", {
    period_id: period.id,
    code: `PW_RETRY_${runRef}`,
    name: `Browser retry worker ${runRef}`,
    status: "collecting_inputs",
    input_profile_ref: "tenant.payroll.input.phase6d.v1",
    snapshot_schema_ref: "tenant.payroll.snapshot.phase6d.v1",
    config_snapshot: {},
  });
  await postJson(page, "/api/hr-admin/payroll-input-snapshots", {
    payroll_run_id: run.id,
    employee_id: employee.id,
    snapshot_status: "ready",
    input_profile_ref: "tenant.payroll.input.phase6d.v1",
    config_profile_ref: "tenant.payroll.snapshot.phase6d.v1",
    employee_snapshot: { source: "browser", employment_status: "active" },
    organization_snapshot: { source: "browser", legal_entity: "Phase 6D" },
    salary_snapshot: { source: "browser", annual_ctc: 720000, monthly_gross: 60000, currency_code: "INR" },
    attendance_snapshot: { working_days: 22, present_days: 22, lop_days: 0 },
    validation_snapshot: { blockers: [], warnings: [] },
  });
  await postJson(page, `/api/hr-admin/payroll-runs/${run.id}/lock-inputs`, {});
  await postJson(page, `/api/hr-admin/payroll-runs/${run.id}/calculate-draft`, {
    calculation_profile_ref: "tenant.payroll.calc.phase6d.v1",
  });
  const review = await postJson<{ review: { id: string } }>(page, `/api/hr-admin/payroll-runs/${run.id}/open-review`, {
    review_profile_ref: "tenant.payroll.review.phase6d.v1",
  });
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/submit`, {});
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/approve`, {
    approval_profile_ref: "tenant.payroll.approval.phase6d.v1",
  });
  await postJson(page, `/api/hr-admin/payroll-reviews/${review.review.id}/lock`, {});
  const outputs = await postJson<{ output_batch: { id: string } }>(
    page,
    `/api/hr-admin/payroll-reviews/${review.review.id}/generate-outputs`,
    { output_profile_ref: "tenant.payroll.outputs.phase6d.v1" },
  );
  await postJson(page, `/api/hr-admin/payroll-output-batches/${outputs.output_batch.id}/publish`, {});
  const handoff = await postJson<{ handoff: { id: string; status: string } }>(
    page,
    `/api/hr-admin/payroll-output-batches/${outputs.output_batch.id}/generate-finance-handoff`,
    { handoff_profile_ref: "tenant.payroll.handoff.phase6d.v1" },
  );
  return handoff.handoff;
}

async function runProviderJobWorker() {
  const repoRoot = resolve(__dirname, "../../..");
  return execFileAsync("bash", [
    "-lc",
    "source .venv/bin/activate && python backend/manage.py process_payroll_provider_jobs --limit 10",
  ], {
    cwd: repoRoot,
    env: { ...process.env, DJANGO_SETTINGS_MODULE: process.env.DJANGO_SETTINGS_MODULE ?? "config.settings.local" },
    timeout: 60_000,
  });
}

test.describe("Phase 6D provider retry worker certification", () => {
  test("schedules a failed provider delivery retry, runs the worker, and exposes queue evidence", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", hrAdmin);
    await expectPageReady(page, "Payroll Handoff");

    const delivery = await ensureRetryableDelivery(page);
    await page.goto(`/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}&artifactId=${delivery.output_artifact_id}`);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByText("Retry commands").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Schedule retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Requeue delivery" })).toBeVisible();
    await expect(page.getByText("Retry state").first()).toBeVisible();
    await expect(page.getByText("Worker").first()).toBeVisible();
    await expect(page.getByText("Submission contract").first()).toBeVisible();
    await captureProviderStep(page, testInfo, "01-retry-controls");

    const scheduledFor = new Date(Date.now() - 1_000).toISOString();
    const scheduleResponse = await page.request.post(`/api/hr-admin/payroll-provider-deliveries/${delivery.id}/schedule-retry`, {
      data: {
        retry_reason: "Phase 6D browser worker certification.",
        scheduled_for: scheduledFor,
      },
    });
    expect(scheduleResponse.ok()).toBeTruthy();
    const schedulePayload = await scheduleResponse.json();
    expect(schedulePayload.retry_event.status).toBe("scheduled");

    await page.goto(`/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}&artifactId=${delivery.output_artifact_id}&evidence=retry:${schedulePayload.retry_event.id}`);
    await expect(page.getByRole("heading", { name: "Retry Evidence" })).toBeVisible();
    await expect(page.getByText("Decision snapshot").first()).toBeVisible();
    await expect(page.getByText("Backoff seconds").first()).toBeVisible();
    await captureProviderStep(page, testInfo, "02-retry-evidence-scheduled");

    const { stdout } = await runProviderJobWorker();
    expect(stdout).toContain("Processed");

    const refreshed = await getHandoffSetup(page);
    const executedRetry = refreshed.retry_events.find((item) => item.id === schedulePayload.retry_event.id);
    expect(executedRetry?.status).toBe("executed");
    const job = refreshed.provider_jobs.find((item) => item.retry_event_id === schedulePayload.retry_event.id);
    expect(job?.status).toBe("completed");

    await page.goto(`/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}&artifactId=${delivery.output_artifact_id}&evidence=job:${job!.id}`);
    await expect(page.getByRole("heading", { name: "Queue Runtime Evidence" })).toBeVisible();
    await expect(page.getByText("Runtime policy").first()).toBeVisible();
    await expect(page.getByText("Heartbeat seconds").first()).toBeVisible();
    await expect(page.getByText("Attempt").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "03-queue-runtime-executed");
  });
});
