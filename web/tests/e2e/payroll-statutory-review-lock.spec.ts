import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession, type Persona } from "../helpers/staging-auth";

type ReviewFixture = {
  maker: Persona;
  checker: Persona;
  run_id: string;
  calculation_id: string;
  line_id: string;
  review_id: string;
  declaration_source_hash: string;
  item_source_hash: string;
  line_source_hash: string;
};

async function submitAndCapture(page: Page, route: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => route.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: await response.json().catch(() => ({})) as Record<string, unknown> };
}

async function expectLockedEvidence(page: Page, fixture: ReviewFixture) {
  await gotoAuthenticated(
    page,
    `/hr-admin/payroll-calculations?runId=${fixture.run_id}&calculationId=${fixture.calculation_id}&lineId=${fixture.line_id}`,
    fixture.checker,
  );
  await expectPageReady(page, "Payroll Calculations");
  const trace = page.locator("aside[aria-label$='calculation trace']");
  await expect(trace.getByText("Locked declaration evidence", { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.declaration_source_hash, { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.item_source_hash, { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.line_source_hash.slice(0, 16), { exact: true })).toBeVisible();
  await expect(trace).not.toContainText(/employee-document:phase9-private-proof|ABCDE1234F/i);
  await expectNoHorizontalOverflow(page);
}

test("locked statutory evidence survives maker-checker review and final lock", async ({ page }) => {
  test.setTimeout(120_000);
  const fixturePath = process.env.PLAYWRIGHT_PHASE9_REVIEW_FIXTURE;
  expect(fixturePath, "PLAYWRIGHT_PHASE9_REVIEW_FIXTURE must identify the isolated fixture").toBeTruthy();
  const fixture = JSON.parse(await readFile(fixturePath ?? "", "utf8")) as ReviewFixture;

  await gotoAuthenticated(
    page,
    `/hr-admin/payroll-calculations?runId=${fixture.run_id}&calculationId=${fixture.calculation_id}&lineId=${fixture.line_id}`,
    fixture.maker,
  );
  await expectPageReady(page, "Payroll Calculations");
  await expect(page.getByText(fixture.declaration_source_hash, { exact: true })).toBeVisible();

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.maker);
  await expectPageReady(page, "Payroll Review");
  const makerControls = page.getByLabel("Review controls");
  const submitted = await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/submit$`),
    () => makerControls.getByRole("button", { name: "Submit review" }).click(),
  );
  expect(submitted.status).toBe(200);
  await expect(page.getByRole("status").filter({ hasText: /submitted for approval/i }).first()).toBeVisible();

  await expect(makerControls.getByRole("button", { name: "Approve review" })).toBeDisabled();
  const selfApproval = await requestWithBrowserSession(
    page,
    `/api/hr-admin/payroll-reviews/${fixture.review_id}/approve`,
    { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } },
  );
  expect(selfApproval.status).toBe(400);
  expect(selfApproval.body).toMatch(/submitter cannot approve/i);

  await gotoAuthenticated(page, `/hr-admin/payroll-review?tab=actions&reviewId=${fixture.review_id}`, fixture.checker);
  await expectPageReady(page, "Payroll Review");
  const checkerControls = page.getByLabel("Review controls");
  await checkerControls.getByLabel("Approval profile ref").fill("phase9.checker.v1");
  await checkerControls.getByLabel("Approval comment").fill("Locked statutory hashes reconciled by the independent checker.");
  const approved = await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/approve$`),
    () => checkerControls.getByRole("button", { name: "Approve review" }).click(),
  );
  expect(approved.status).toBe(200);
  await expect(page.getByRole("status").filter({ hasText: /Payroll review approved/i }).first()).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Review");
  await expect(checkerControls.getByRole("button", { name: "Final lock" })).toBeEnabled();

  const locked = await submitAndCapture(
    page,
    new RegExp(`/api/hr-admin/payroll-reviews/${fixture.review_id}/lock$`),
    () => checkerControls.getByRole("button", { name: "Final lock" }).click(),
  );
  expect(locked.status).toBe(200);
  await expect(page.getByRole("status").filter({ hasText: /Payroll run final locked/i }).first()).toBeVisible();

  await expectLockedEvidence(page, fixture);
});
