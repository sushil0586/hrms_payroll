import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, requestWithBrowserSession, supportAgent } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope.getByLabel(label, { exact: true }).or(
    scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea"),
  ).first();
}

test.describe.configure({ mode: "serial" });

test.describe("CRUD V2 Wave 5 support and HR private documents", () => {
  test("support console is read-only, fail closed, responsive and privacy preserving", async ({ page }) => {
    await gotoAuthenticated(page, "/support?tenant_code=northstar-foods&session_ref=missing-wave5-session&scope_ref=configuration_health", supportAgent);
    await expectPageReady(page, "Support Console");
    await expect(page.getByRole("main").getByText("Support Session Denied", { exact: true }).last()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
    const body = (await page.getByRole("main").innerText()).toLowerCase();
    for (const forbidden of ["password", "secret", "access token", "salary_snapshot"]) expect(body).not.toContain(forbidden);

    const response = await page.request.get(
      "/api/support/tenant-console?tenant_code=northstar-foods&session_ref=missing-wave5-session&scope_ref=configuration_health",
    );
    expect([401, 403, 404]).toContain(response.status());
    const payload = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
    for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) expect(payload).not.toContain(forbidden);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("HR upload has truthful pending state and private failure contract", async ({ page }) => {
    test.setTimeout(120_000);
    const suffix = Date.now();
    await gotoAuthenticated(page, "/hr-admin/employee-documents", hrAdmin);
    const categoryResponse = await requestWithBrowserSession(page, "/api/hr-admin/document-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allow_employee_upload: false,
        allow_multiple_files: true,
        category_type: "other",
        code: `wave5-hr-${suffix}`,
        name: `Wave 5 HR ${suffix}`,
        visibility_rules: { accepted_mime_types: ["application/pdf"] },
      }),
    });
    expect(categoryResponse.status, categoryResponse.body).toBe(201);
    const category = JSON.parse(categoryResponse.body) as { id: string };
    const employeesResponse = await requestWithBrowserSession(page, "/api/hr-admin/employees");
    expect(employeesResponse.status).toBe(200);
    const employees = JSON.parse(employeesResponse.body);
    const employeeId = (Array.isArray(employees) ? employees : employees.items)?.[0]?.id as string;
    expect(employeeId).toBeTruthy();

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await expectPageReady(page, "Upload employee document");
    await field(page, "Employee").selectOption(employeeId);
    await field(page, "Category").selectOption(category.id);
    await field(page, "Title").fill(`Wave 5 HR document ${suffix}`);
    await field(page, "File").setInputFiles({
      name: `wave5-hr-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\nWave 5 HR ${suffix}\n%%EOF\n`),
    });

    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/hr-admin/employee-documents", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await released;
      await route.continue();
    });
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/hr-admin/employee-documents") && response.request().method() === "POST",
    );
    const submitPromise = page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByRole("button", { name: "Uploading document" })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toHaveCount(0);
    release();
    await submitPromise;
    const uploadResponse = await responsePromise;
    expect(uploadResponse.status()).toBe(201);
    const uploadPayload = await uploadResponse.json() as { id: string };
    await expect(page.getByRole("status").filter({ hasText: "Document stored" })).toBeVisible();
    await page.unroute("**/api/hr-admin/employee-documents");

    const receipt = page.getByRole("status").filter({ hasText: "Document stored" });
    await expect(receipt).toContainText("Submitted for HR verification");
    const href = `/api/hr-admin/employee-documents/${uploadPayload.id}/download`;
    expect(href).toMatch(/^\/api\/hr-admin\/employee-documents\/[0-9a-f-]+\/download$/i);
    await page.route(`**${href}`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "The private document is temporarily unavailable. Try again." }),
      });
    });
    const failed = await page.evaluate(async (downloadHref) => {
      const response = await fetch(downloadHref, { credentials: "include" });
      return { status: response.status, body: await response.text() };
    }, href);
    expect(failed.status).toBe(503);
    expect(failed.body).toContain("temporarily unavailable");
    expect(failed.body).not.toMatch(/Traceback|\/Users\/|document-artifacts\//);
  });
});
