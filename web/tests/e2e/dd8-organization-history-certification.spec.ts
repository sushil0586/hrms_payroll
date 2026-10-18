import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function organizationSnapshot(page: import("@playwright/test").Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const apiBase = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8020/api/v1";
  const response = await page.request.get(`${apiBase}/hr-admin/organization/`, { headers: { Authorization: `Token ${token}` } });
  expect(response.status()).toBe(200);
  return response.json();
}

async function backendGet(page: import("@playwright/test").Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  const apiBase = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8020/api/v1";
  const response = await page.request.get(`${apiBase}${path}`, { headers: { Authorization: `Token ${token}` } });
  expect(response.status()).toBe(200);
  return response.json();
}

test("DD-OR-007 organization CSV commit is atomic and safely retryable", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const legalEntityCode = `dd8-le-${suffix}`;
  const branchCode = `dd8-br-${suffix}`;
  const csv = [
    "section,code,name,registered_name,country_code,timezone,primary_email,primary_phone,address_line_1,address_line_2,city,state,postal_code,legal_entity_code,location_code,branch_type,business_unit_code,parent_code,grade_code,level,description,is_payroll_eligible,is_active",
    `legal_entities,${legalEntityCode},DD8 Atomic Legal Entity,DD8 Atomic Legal Entity Pvt Ltd,IN,Asia/Kolkata,,,,,,,,,,,,,,,,,true`,
    `branches,${branchCode},DD8 Atomic Branch,,,,,,,,,,,${legalEntityCode},,Head Office,,,,,,,true`,
  ].join("\n");

  await gotoAuthenticated(page, "/hr-admin/organization");
  await expectPageReady(page, "Organization masters");
  const workbench = page.getByTestId("organization-import-workbench");
  await page.getByTestId("organization-import-disclosure").locator("summary").click();
  await workbench.locator("input[type='file']").setInputFiles({
    name: "dd8-atomic-organization.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await workbench.getByRole("button", { name: "Preview import" }).click();
  await expect(workbench.getByText("ready", { exact: true })).toHaveCount(2);

  let corruptOnce = true;
  await page.route("**/api/hr-admin/organization/import", async (route) => {
    if (!corruptOnce) return route.continue();
    corruptOnce = false;
    const body = route.request().postDataJSON();
    body.rows[1].data.legal_entity_code = "DD8-MISSING-AFTER-PREVIEW";
    await route.continue({ postData: JSON.stringify(body), headers: { ...route.request().headers(), "content-type": "application/json" } });
  });
  await workbench.getByRole("button", { name: "Commit ready rows" }).click();
  await expect(workbench.getByText("Some organization rows failed.")).toBeVisible();

  const failedSnapshot = await organizationSnapshot(page);
  expect(failedSnapshot.legal_entities.some((item: { code: string }) => item.code === legalEntityCode)).toBe(false);
  expect(failedSnapshot.branches.some((item: { code: string }) => item.code === branchCode)).toBe(false);

  await page.unroute("**/api/hr-admin/organization/import");
  await workbench.getByRole("button", { name: "Preview import" }).click();
  await workbench.getByRole("button", { name: "Commit ready rows" }).click();
  await expect(workbench.getByText("Commit complete. Refresh the catalog to verify created masters.")).toBeVisible();

  const snapshotAfterRetry = await organizationSnapshot(page);
  const legalEntity = snapshotAfterRetry.legal_entities.find((item: { code: string }) => item.code === legalEntityCode);
  const branch = snapshotAfterRetry.branches.find((item: { code: string }) => item.code === branchCode);
  expect(legalEntity).toBeTruthy();
  expect(branch).toBeTruthy();
  const branchDetail = await backendGet(page, `/hr-admin/organization/branches/${branch.id}/`);
  expect(branchDetail.legal_entity_id).toBe(legalEntity.id);
});
