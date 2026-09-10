import { readFile } from "node:fs/promises";

import { expect, type APIResponse, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const expectedHeaders = [
  "row_type",
  "artifact_id",
  "artifact_key",
  "event_or_grant_id",
  "event_type",
  "status",
  "source_channel_ref",
  "actor_identifier",
  "request_identifier",
  "signed_access_grant_id",
  "notification_id",
  "storage_provider_ref",
  "storage_object_version",
  "download_strategy_ref",
  "checksum_sha256",
  "occurred_at",
  "expires_at",
  "revoked_at",
  "access_count",
  "metadata_snapshot",
];

function artifactIdFromHref(href: string) {
  const match = href.match(/payroll-output-artifacts\/([^/]+)\//);
  return match?.[1] ?? "";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((item) => item.some(Boolean));
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function expectDeniedWithoutCsvLeak(response: APIResponse) {
  expect([401, 403, 404]).toContain(response.status());
  expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
  const body = await response.text();
  expect(body).not.toContain("row_type,artifact_id,artifact_key");
  expect(body).not.toContain("metadata_snapshot");
}

test.describe("Phase 7I payroll artifact access audit CSV", () => {
  test("HR admin downloads parseable access CSV while employee and anonymous sessions are denied", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();

    const downloadLink = page.getByRole("link", { name: "Download file" }).first();
    await expect(downloadLink).toBeVisible();
    const downloadHref = await downloadLink.getAttribute("href");
    expect(downloadHref).toMatch(/^\/api\/hr-admin\/payroll-output-artifacts\/[^/]+\/download$/);
    const artifactId = artifactIdFromHref(downloadHref ?? "");
    expect(artifactId).toBeTruthy();

    const artifactDownload = await page.request.get(downloadHref ?? "");
    expect(artifactDownload.status()).toBe(200);
    expect(artifactDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(artifactDownload.headers()["x-payroll-download-strategy"]).toBeTruthy();

    const auditLink = page.getByRole("link", { name: "Export access audit" }).first();
    await expect(auditLink).toBeVisible();
    const auditHref = await auditLink.getAttribute("href");
    expect(auditHref).toBe(`/api/hr-admin/payroll-output-artifacts/${artifactId}/access-audit-export`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      auditLink.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/-access-audit\.csv$/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const csvText = await readFile(downloadPath as string, "utf8");
    const headerLine = csvText.split(/\r?\n/)[0];
    expect(headerLine).toBe(expectedHeaders.join(","));
    const rows = parseCsv(csvText);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.artifact_id === artifactId)).toBe(true);
    expect(rows.some((row) => row.row_type === "event" && row.event_type === "downloaded")).toBe(true);
    expect(rows.some((row) => row.checksum_sha256.length === 64)).toBe(true);
    expect(rows.some((row) => row.download_strategy_ref.startsWith("payroll.download."))).toBe(true);
    expect(rows.every((row) => row.metadata_snapshot !== undefined)).toBe(true);

    const auditApiResponse = await page.request.get(auditHref ?? "");
    expect(auditApiResponse.status()).toBe(200);
    expect(auditApiResponse.headers()["content-type"]).toContain("text/csv");
    expect(auditApiResponse.headers()["content-disposition"] ?? "").toContain("-access-audit.csv");
    expect(auditApiResponse.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(Number(auditApiResponse.headers()["x-payroll-access-audit-row-count"])).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);

    await page.request.post("/api/auth/logout");
    await expectDeniedWithoutCsvLeak(await page.request.get(auditHref ?? ""));

    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectPageReady(page, "Payslips");
    await expectDeniedWithoutCsvLeak(await page.request.get(auditHref ?? ""));
    await expect(page.getByText("Export access audit")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
