import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Employee statutory declaration flows", () => {
  test("employee declaration workspace exposes cockpit, focused dialogs, and proof drilldown", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/statutory-declarations");
    await expectPageReady(page, "Statutory Declarations");

    await expect(page.getByText("Tax years", { exact: true })).toBeVisible();
    await expect(page.getByText("Current declaration", { exact: true })).toBeVisible();
    await expect(page.getByText("Tax profile", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proof coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Start declaration|Update declaration/ }).first()).toBeVisible();
    await expect(page.getByText("Proof register", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Declared items" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tax declaration checklist" })).toBeVisible();

    await page.getByRole("button", { name: /Start declaration|Update declaration/ }).first().click();
    const declarationDialog = page.getByRole("dialog", { name: /Start declaration|Update declaration/ });
    await expect(declarationDialog).toBeVisible();
    await expect(declarationDialog.getByLabel("Financial year")).toBeVisible();
    await expect(declarationDialog.getByLabel("Tax regime")).toBeVisible();
    await expect(declarationDialog.getByText(/India statutory guidance|New regime selected/)).toBeVisible();
    await declarationDialog.getByRole("button", { name: "Close" }).click();

    const addProof = page.getByRole("button", { name: "Add proof" }).first();
    await expect(addProof).toBeVisible();
    if (await addProof.isEnabled()) {
      await addProof.click();
      const proofDialog = page.getByRole("dialog", { name: "Add proof" });
      await expect(proofDialog).toBeVisible();
      for (const label of ["Section", "Kind", "Component", "Item name", "Amount", "Proof reference", "Upload category", "Proof file"]) {
        await expect(proofDialog.getByLabel(label)).toBeVisible();
      }
      await expect(proofDialog.getByText("Proof quality check")).toBeVisible();
      await proofDialog.getByRole("button", { name: "Close" }).click();
    }

    await expectNoHorizontalOverflow(page);
  });
});
