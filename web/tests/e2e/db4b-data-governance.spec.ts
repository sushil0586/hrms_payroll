import { expect, test } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspaceCleanupPlatformPersona,
  workspacePersona,
  workspacePlatformPersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe.configure({ mode: "serial" });

test("DB-4B governed export, approved retention, legal hold, and maker/checker workflow", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const tenantAdmin = workspacePersona(workspace, "tenant_admin");
  const platformAdmin = workspacePlatformPersona(workspace);
  const cleanupAdmin = workspaceCleanupPlatformPersona(workspace);
  const tenantId = workspace.manifest.tenant.id;
  let holdReleased = false;

  try {
    await gotoAuthenticated(page, "/tenant-admin/data-governance", tenantAdmin);
  await expect(page.getByRole("heading", { name: "Data retention and exports" })).toBeVisible();
  await expect(page.getByText("Irreversible erasure is disabled by deployment policy.")).toBeVisible();

  await page.getByLabel("Request type").selectOption("export");
  await page.getByLabel("employee documents").check();
  await page.getByLabel("Business reason").fill("DB-4B isolated contractual export verification");
  const requestResponse = page.waitForResponse((response) =>
    response.url().includes("/api/tenant-admin/data-governance/requests") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("button", { name: "Submitting request" })).toBeDisabled();
  const createdRequest = await requestResponse;
  expect(createdRequest.status()).toBe(201);
  expect((await createdRequest.json()).id).toBeTruthy();
  await expect(page.getByText("Governance request submitted for independent approval.")).toBeVisible();

  await gotoAuthenticated(page, `/platform-admin/data-governance?tenantId=${tenantId}`, platformAdmin);
  await expect(page.getByRole("heading", { name: "Retention and controlled erasure" })).toBeVisible();

  const policyForm = page.getByRole("region", { name: "Retention policy configuration" });
  await policyForm.getByLabel("Tenant").selectOption(tenantId);
  await policyForm.getByLabel("Jurisdiction").fill("IN-QA-APPROVED");
  await policyForm.getByLabel("Record category").selectOption("employee_documents");
  await policyForm.getByLabel("Retention days").fill("365");
  await policyForm.getByLabel("Lifecycle date field").fill("updated_at");
  await policyForm.getByLabel("Effective from").fill("2026-01-01");
  await policyForm.getByLabel("Legal basis reference").fill("QA-LEGAL-APPROVED");
  await policyForm.getByLabel("Approval reference").fill("QA-COUNSEL-APPROVAL");
  await policyForm.getByRole("button", { name: "Save approved policy" }).click();
  await expect(page.getByText("Retention policy recorded.")).toBeVisible();

  const holdForm = page.getByRole("region", { name: "Legal holds" });
  await holdForm.getByLabel("Tenant").selectOption(tenantId);
  await holdForm.getByLabel("Category").selectOption("employee_documents");
  await holdForm.getByLabel("Authority reference").fill("QA-HOLD-2026-001");
  await holdForm.getByLabel("Reason").fill("DB-4B legal hold enforcement verification");
  await holdForm.getByRole("button", { name: "Place legal hold" }).click();
  await expect(page.getByText("Legal hold placed.")).toBeVisible();
  await expect(page.getByText("1 active", { exact: true })).toBeVisible();

  const requestRow = page.getByRole("row").filter({ hasText: "DB-4B isolated contractual export verification" });
  await expect(requestRow).toContainText("requested");
  await requestRow.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Request approved.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "DB-4B isolated contractual export verification" })).toContainText("approved");

    await page.request.post("/api/auth/logout");
    await page.goto("/login");
    await gotoAuthenticated(page, `/platform-admin/data-governance?tenantId=${tenantId}`, cleanupAdmin);
    await page.getByLabel("Release reason").fill("Run-owned governance certification cleanup.");
    await page.getByRole("button", { name: "Release legal hold" }).click();
    await expect(page.getByText("Legal hold released with retained audit history.")).toBeVisible();
    holdReleased = true;
  } finally {
    const release = page.getByRole("button", { name: "Release legal hold" });
    if (!holdReleased && await release.isVisible().catch(() => false)) {
      const reason = page.getByLabel("Release reason");
      if (await reason.isVisible().catch(() => false)) {
        await reason.fill("Run-owned governance certification finalizer.");
        await release.click();
        await expect(page.getByText("Legal hold released with retained audit history.")).toBeVisible();
      }
    }
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
