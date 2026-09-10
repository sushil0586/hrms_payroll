import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function artifactIdFromHref(href: string) {
  const match = href.match(/artifactId=([^&]+)/);
  return match?.[1] ?? "";
}

test.describe("Phase 5I payroll register export authorization", () => {
  test("HR admin can export run-level register evidence while employee cannot access register artifacts", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrAdmin);
    await expectPageReady(page, "Payroll Outputs");

    const registerRowLink = page.getByRole("link").filter({ hasText: "Payroll Register" }).first();
    await expect(registerRowLink).toBeVisible();
    const registerHref = await registerRowLink.getAttribute("href");
    const registerArtifactId = artifactIdFromHref(registerHref ?? "");
    expect(registerArtifactId).toBeTruthy();

    await registerRowLink.click();
    await expect(page).toHaveURL(new RegExp(`artifactId=${registerArtifactId}`));
    await expect(page.getByRole("heading", { name: /Payroll Register/ })).toBeVisible();
    await expect(page.getByText("Run level").first()).toBeVisible();
    await expect(page.getByText("Register").first()).toBeVisible();

    const downloadHref = `/api/hr-admin/payroll-output-artifacts/${registerArtifactId}/download`;
    await expect(page.getByRole("link", { name: "Download file" })).toHaveAttribute("href", downloadHref);
    const registerDownload = await page.request.get(downloadHref);
    expect(registerDownload.status()).toBe(200);
    expect(registerDownload.headers()["content-type"]).toContain("text/csv");
    expect(registerDownload.headers()["content-disposition"] ?? "").toContain("attachment");
    expect(registerDownload.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    expect(await registerDownload.text()).toContain("employee_code");

    const auditHref = `/api/hr-admin/payroll-output-artifacts/${registerArtifactId}/access-audit-export`;
    await expect(page.getByRole("link", { name: "Export access audit" })).toHaveAttribute("href", auditHref);
    const accessAudit = await page.request.get(auditHref);
    expect(accessAudit.status()).toBe(200);
    expect(accessAudit.headers()["content-type"]).toContain("text/csv");
    expect(await accessAudit.text()).toContain("downloaded");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectPageReady(page, "Payslips");
    const employeeHrRegisterDownload = await page.request.get(downloadHref);
    expect([403, 404]).toContain(employeeHrRegisterDownload.status());

    const employeeEssRegisterDownload = await page.request.get(`/api/me/payroll-payslips/${registerArtifactId}/download`);
    expect(employeeEssRegisterDownload.status()).toBe(404);
    await expect(page.getByText("Payroll Register")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
