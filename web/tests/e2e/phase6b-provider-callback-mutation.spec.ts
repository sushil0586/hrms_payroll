import crypto from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

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
          signature_key_resolution_mode?: string;
          signature_digest_format?: string;
        };
      };
    };
  }>;
};

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function captureProviderStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase6b-provider-callback-mutation/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

function payloadChecksum(payload: Record<string, unknown>) {
  return crypto.createHash("sha256").update(JSON.stringify(payload, Object.keys(payload).sort())).digest("hex");
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

async function ensureSubmittedDelivery(page: Page) {
  let setup = await getHandoffSetup(page);
  let delivery = setup.deliveries.find((item) => item.artifact_kind === "bank_advice");
  if (delivery) {
    return delivery;
  }

  const handoff = setup.handoffs.find((item) => item.status !== "accepted");
  expect(handoff, "Expected at least one seeded finance handoff for provider callback certification.").toBeTruthy();
  const transmitResponse = await page.request.post(`/api/hr-admin/payroll-finance-handoffs/${handoff!.id}/transmit`, {
    data: {},
  });
  expect(transmitResponse.ok()).toBeTruthy();

  setup = await getHandoffSetup(page);
  delivery = setup.deliveries.find((item) => item.handoff_id === handoff!.id && item.artifact_kind === "bank_advice");
  expect(delivery, "Expected handoff transmission to create a bank advice provider delivery.").toBeTruthy();
  return delivery!;
}

test.describe("Phase 6B provider callback mutation certification", () => {
  test("accepts signed callback, ignores replay, rejects bad signature, and exposes ledger evidence", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", hrAdmin);
    await expectPageReady(page, "Payroll Handoff");

    const delivery = await ensureSubmittedDelivery(page);
    const runRef = Date.now();
    const payloadSnapshot = {
      provider_batch_ref: `BANK-CALLBACK-P6B-${runRef}`,
      settlement_reference: `UTR-P6B-${runRef}`,
      line_count: delivery.request_snapshot.line_count ?? 0,
    };
    const checksum = stablePayloadChecksum(payloadSnapshot);
    expect(payloadChecksum(payloadSnapshot)).toBe(checksum);
    const idempotencyKey = `bank-callback-phase6b-${runRef}`;
    const signature = signatureFor(delivery, idempotencyKey, checksum);

    const validResponse = await page.request.post("/api/payroll-provider-callbacks", {
      data: {
        provider_delivery_id: delivery.id,
        provider_ref: delivery.provider_ref,
        external_reference: delivery.external_reference,
        external_event_id: `evt-bank-phase6b-${runRef}`,
        idempotency_key: idempotencyKey,
        provider_status: "reconciled",
        payload_snapshot: payloadSnapshot,
        signature,
      },
    });
    expect(validResponse.status()).toBe(200);
    const validPayload = await validResponse.json();
    expect(validPayload.replayed).toBe(false);
    expect(validPayload.callback_event.status).toBe("processed");
    expect(validPayload.callback_event.verification_snapshot.signature_valid).toBe(true);
    expect(validPayload.callback_event.verification_snapshot.callback_security.passed).toBe(true);
    expect(validPayload.delivery.status).toBe("reconciled");

    const replayResponse = await page.request.post("/api/payroll-provider-callbacks", {
      data: {
        provider_delivery_id: delivery.id,
        provider_ref: delivery.provider_ref,
        external_reference: delivery.external_reference,
        external_event_id: `evt-bank-phase6b-${runRef}`,
        idempotency_key: idempotencyKey,
        provider_status: "reconciled",
        payload_snapshot: payloadSnapshot,
        signature,
      },
    });
    expect(replayResponse.status()).toBe(200);
    expect((await replayResponse.json()).replayed).toBe(true);

    const rejectedResponse = await page.request.post("/api/payroll-provider-callbacks", {
      data: {
        provider_delivery_id: delivery.id,
        provider_ref: delivery.provider_ref,
        external_reference: delivery.external_reference,
        external_event_id: `evt-bank-phase6b-bad-${runRef}`,
        idempotency_key: `bank-callback-phase6b-bad-${runRef}`,
        provider_status: "failed",
        payload_snapshot: { failure_code: "phase6b_bad_signature_probe" },
        signature: "invalid-signature",
      },
    });
    expect(rejectedResponse.status()).toBe(400);
    const rejectedPayload = await rejectedResponse.json();
    expect(rejectedPayload.callback_event.status).toBe("rejected");
    expect(rejectedPayload.callback_event.verification_snapshot.signature_valid).toBe(false);
    expect(rejectedPayload.callback_event.verification_snapshot.callback_security.blocking_gate_refs).toContain("callback_signature_matched");

    await page.goto(`/hr-admin/payroll-handoff?handoffId=${delivery.handoff_id}`);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expect(page.getByText(`evt-bank-phase6b-${runRef}`)).toBeVisible();
    await expect(page.getByText(`evt-bank-phase6b-bad-${runRef}`)).toBeVisible();
    await page.locator(`a[href*="evidence=callback%3A${validPayload.callback_event.id}"]`).click();
    const evidencePanel = page.getByLabel("Callback audit evidence");
    await expect(evidencePanel.getByRole("heading", { name: "Callback Evidence" })).toBeVisible();
    await expect(evidencePanel.getByText(idempotencyKey)).toBeVisible();
    await expect(evidencePanel.getByText("callback_signature_matched")).toBeVisible();
    await expect(evidencePanel.getByText("callback_replay_window")).toBeVisible();
    await expect(evidencePanel.getByText("callback_rate_limit")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "01-callback-mutation-ledger-evidence");
  });
});
