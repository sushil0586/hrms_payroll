import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type EvidenceFixture = {
  username: string;
  password: string;
  run_id: string;
  calculation_id: string;
  line_id: string;
  declaration_source_hash: string;
  item_source_hash: string;
  line_source_hash: string;
};

test("locked statutory evidence is visible in the payroll calculation trace", async ({ page }) => {
  const fixturePath = process.env.PLAYWRIGHT_PHASE8_EVIDENCE_FIXTURE;
  expect(fixturePath, "PLAYWRIGHT_PHASE8_EVIDENCE_FIXTURE must identify the isolated fixture").toBeTruthy();
  const fixture = JSON.parse(await readFile(fixturePath ?? "", "utf8")) as EvidenceFixture;

  await gotoAuthenticated(
    page,
    `/hr-admin/payroll-calculations?runId=${fixture.run_id}&calculationId=${fixture.calculation_id}&lineId=${fixture.line_id}`,
    { username: fixture.username, password: fixture.password },
  );
  await expectPageReady(page, "Payroll Calculations");

  const trace = page.locator("aside[aria-label$='calculation trace']");
  await expect(trace).toContainText("Tax Deducted At Source");
  await expect(trace.getByText("Locked declaration evidence", { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.declaration_source_hash, { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.item_source_hash, { exact: true })).toBeVisible();
  await expect(trace.getByText(fixture.line_source_hash.slice(0, 16), { exact: true })).toBeVisible();
  await expect(trace).not.toContainText(/employee-document:phase8-private-proof|ABCDE1234F/i);
  await expectNoHorizontalOverflow(page);
});
