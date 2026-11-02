import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession, type Persona } from "../helpers/staging-auth";

type Phase12Fixture = {
  finance: Persona;
  unauthorized: Persona;
  handoff_id: string;
};

async function capturePost(page: Page, route: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => route.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: await response.json().catch(() => ({})) as Record<string, unknown> };
}

test("finance transmits and reconciles one idempotent sandbox handoff", async ({ page }) => {
  test.setTimeout(90_000);
  const fixturePath = process.env.PLAYWRIGHT_PHASE12_PROVIDER_FIXTURE;
  expect(fixturePath, "PLAYWRIGHT_PHASE12_PROVIDER_FIXTURE must identify the isolated fixture").toBeTruthy();
  const fixture = JSON.parse(await readFile(fixturePath ?? "", "utf8")) as Phase12Fixture;
  const handoffPath = `/hr-admin/payroll-handoff?tab=actions&handoffId=${fixture.handoff_id}`;

  await gotoAuthenticated(page, handoffPath, fixture.finance);
  await expectPageReady(page, "Payroll Handoff");
  let controls = page.getByLabel("Handoff controls");
  const transmitted = await capturePost(
    page,
    new RegExp(`/api/hr-admin/payroll-finance-handoffs/${fixture.handoff_id}/transmit$`),
    () => controls.getByRole("button", { name: "Transmit handoff" }).click(),
  );
  expect(transmitted.status).toBe(200);
  await expect(page.getByRole("status")).toContainText(/transmit/i);

  const firstSetup = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-finance-handoff-setup/?handoff_id=${fixture.handoff_id}&delivery_page_size=25&include_artifact_detail=true`,
  );
  expect(firstSetup.status).toBe(200);
  const firstPayload = JSON.parse(firstSetup.body) as {
    handoffs: Array<{ id: string; status: string }>;
    deliveries: Array<{ id: string; status: string; payload_checksum_sha256: string; request_snapshot: Record<string, unknown> }>;
  };
  expect(firstPayload.handoffs.find((item) => item.id === fixture.handoff_id)?.status).toBe("transmitted");
  expect(firstPayload.deliveries).toHaveLength(3);
  expect(new Set(firstPayload.deliveries.map((item) => item.status))).toEqual(new Set(["submitted"]));
  expect(firstPayload.deliveries.every((item) => /^[a-f0-9]{64}$/.test(item.payload_checksum_sha256))).toBe(true);
  const deliveryIds = firstPayload.deliveries.map((item) => item.id).sort();

  const replay = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-finance-handoffs/${fixture.handoff_id}/transmit`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  expect(replay.status).toBe(200);
  const replayPayload = JSON.parse(replay.body) as { deliveries: Array<{ id: string }> };
  expect(replayPayload.deliveries.map((item) => item.id).sort()).toEqual(deliveryIds);

  await page.reload({ waitUntil: "domcontentloaded" });
  controls = page.getByLabel("Handoff controls");
  await controls.getByLabel("Acknowledgement profile ref").fill("phase12.sandbox.reconciliation.v1");
  const acknowledged = await capturePost(
    page,
    new RegExp(`/api/hr-admin/payroll-finance-handoffs/${fixture.handoff_id}/acknowledge$`),
    () => controls.getByRole("button", { name: "Acknowledge handoff" }).click(),
  );
  expect(acknowledged.status).toBe(200);
  const acknowledgedPayload = acknowledged.payload as {
    deliveries: Array<{ id: string; status: string; reconciliation_snapshot: Record<string, unknown> }>;
  };
  expect(acknowledgedPayload.deliveries.map((item) => item.id).sort()).toEqual(deliveryIds);
  expect(new Set(acknowledgedPayload.deliveries.map((item) => item.status))).toEqual(new Set(["reconciled"]));
  expect(acknowledgedPayload.deliveries.every((item) => item.reconciliation_snapshot.checksum_matched === true)).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  controls = page.getByLabel("Handoff controls");
  await controls.getByLabel("Audit pack profile ref").fill("phase12.provider-audit.v1");
  const auditPack = await capturePost(
    page,
    new RegExp(`/api/hr-admin/payroll-finance-handoffs/${fixture.handoff_id}/generate-audit-pack$`),
    () => controls.getByRole("button", { name: "Generate audit pack" }).click(),
  );
  expect(auditPack.status).toBe(200);

  const finalSetup = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-finance-handoff-setup/?handoff_id=${fixture.handoff_id}&artifact_page_size=25&delivery_page_size=25`,
  );
  expect(finalSetup.status).toBe(200);
  const finalPayload = JSON.parse(finalSetup.body) as {
    handoffs: Array<{ id: string; status: string }>;
    artifacts: Array<{ kind: string; checksum_sha256: string }>;
    deliveries: Array<{ id: string; status: string }>;
  };
  expect(finalPayload.handoffs.find((item) => item.id === fixture.handoff_id)?.status).toBe("accepted");
  expect(finalPayload.deliveries.map((item) => item.id).sort()).toEqual(deliveryIds);
  expect(new Set(finalPayload.deliveries.map((item) => item.status))).toEqual(new Set(["reconciled"]));
  expect(finalPayload.artifacts.some((item) => item.kind === "provider_audit_pack" && /^[a-f0-9]{64}$/.test(item.checksum_sha256))).toBe(true);
  await expectNoHorizontalOverflow(page);

  await gotoAuthenticated(page, "/ess", fixture.unauthorized);
  const denied = await requestWithBrowserSession(page, `/api/hr-admin/payroll-finance-handoff-setup/?handoff_id=${fixture.handoff_id}`);
  expect([403, 404]).toContain(denied.status);
});
