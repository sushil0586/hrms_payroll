import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authToken(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token, "Expected authenticated browser session token.").toBeTruthy();
  return token!;
}

function artifactIdFromHref(href: string) {
  const match = href.match(/payroll-output-artifacts\/([^/]+)\//);
  return match?.[1] ?? "";
}

async function latestDownloadableRegister(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-output-setup/?artifact_kind=register&artifact_page_size=100`, {
    headers: { Authorization: `Token ${await authToken(page)}` },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as {
    artifacts?: Array<{
      id: string;
      output_batch_id: string;
      kind: string;
      status: string;
      is_downloadable: boolean;
      download_url?: string | null;
    }>;
  };
  const artifact = payload.artifacts?.find((item) => item.kind === "register" && item.status === "published" && item.is_downloadable && item.download_url);
  expect(artifact, "Expected at least one published downloadable register artifact for access isolation.").toBeTruthy();
  return artifact!;
}

test.describe("Phase 5H payroll artifact access isolation", () => {
  test("HR output artifacts download through same-origin proxy while ESS stays employee scoped", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    const artifact = await latestDownloadableRegister(page);
    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${artifact.output_batch_id}&artifactId=${artifact.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Artifact register" })).toBeVisible();

    const downloadLink = page.getByRole("link", { name: "Download file" }).first();
    await expect(downloadLink).toBeVisible();
    const downloadHref = await downloadLink.getAttribute("href");
    expect(downloadHref).toMatch(/^\/api\/hr-admin\/payroll-output-artifacts\/[^/]+\/download$/);

    const artifactId = artifactIdFromHref(downloadHref ?? "");
    expect(artifactId).toBeTruthy();

    const hrDownload = await page.request.get(downloadHref ?? "");
    expect(hrDownload.status()).toBe(200);
    expect(hrDownload.headers()["content-disposition"] ?? "").toContain("attachment");
    expect(hrDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(hrDownload.headers()["x-payroll-download-strategy"]).toBeTruthy();
    expect((await hrDownload.body()).length).toBeGreaterThan(0);

    const auditLink = page.getByRole("link", { name: "Export access audit" }).first();
    await expect(auditLink).toBeVisible();
    const auditHref = await auditLink.getAttribute("href");
    expect(auditHref).toBe(`/api/hr-admin/payroll-output-artifacts/${artifactId}/access-audit-export`);
    const auditExport = await page.request.get(auditHref ?? "");
    expect(auditExport.status()).toBe(200);
    expect(auditExport.headers()["content-type"]).toContain("text/csv");
    expect(await auditExport.text()).toContain("row_type,artifact_id,artifact_key");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectPageReady(page, "Payslips");
    const blockedHrDownload = await page.request.get(downloadHref ?? "");
    expect([403, 404]).toContain(blockedHrDownload.status());

    const invalidEssDownload = await page.request.get(`/api/me/payroll-payslips/${artifactId}/download`);
    expect(invalidEssDownload.status()).toBe(404);

    const essDownloadLink = page.getByRole("link", { name: "Download payslip" }).first();
    await expect(essDownloadLink).toBeVisible();
    const essDownloadHref = await essDownloadLink.getAttribute("href");
    expect(essDownloadHref).toMatch(/^\/api\/me\/payroll-payslips\/[^/]+\/download$/);
    const essDownload = await page.request.get(essDownloadHref ?? "");
    expect(essDownload.status()).toBe(200);
    expect(essDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(essDownload.headers()["x-payroll-download-strategy"]).toBeTruthy();
    expect((await essDownload.body()).length).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
  });
});
