import { expect, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const filteredPath =
  "/hr-admin/import-history?q=no-such-import-batch-ledger&actor=qa-auditor&from_date=2026-01-01&to_date=2026-01-31&batch_hash=deadbeef&source_hash=cafebabe&page_size=10";

test.describe("import history ledger certification", () => {
  test("keeps audit filters, pagination, and empty state usable on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await gotoAuthenticated(page, filteredPath, hrAdmin);
    await suppressBrowserTestNoise(page);

    const workspace = page.getByTestId("import-history-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.getByPlaceholder("Search type, actor, file, hash")).toHaveValue("no-such-import-batch-ledger");
    await expect(workspace.getByPlaceholder("Uploaded by")).toHaveValue("qa-auditor");
    await expect(workspace.getByPlaceholder("Batch hash")).toHaveValue("deadbeef");
    await expect(workspace.getByPlaceholder("Source hash")).toHaveValue("cafebabe");
    await expect(workspace.getByRole("combobox", { name: "Rows per page" })).toHaveValue("10");
    await expect(workspace.getByText(/No import batches match|Loading import history/)).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Reset" })).toBeEnabled();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps audit filters readable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await gotoAuthenticated(page, filteredPath, hrAdmin);
    await suppressBrowserTestNoise(page);

    const workspace = page.getByTestId("import-history-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Import status" })).toBeVisible();
    await expect(workspace.getByRole("combobox", { name: "Rows per page" })).toBeVisible();
    await expect(workspace.getByText(/No import batches match|Loading import history/)).toBeVisible();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
