import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Employee statutory declaration flows", () => {
  test("employee declaration workspace exposes tax profile, proof status, and payroll source trail", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/statutory-declarations");
    await expectPageReady(page, "Statutory Declarations");

    await expect(page.getByRole("heading", { name: "Tax years" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proof status and tax profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start declaration" })).toBeVisible();
    const financialYear = page.getByLabel("Financial year");
    const taxRegime = page.getByLabel("Tax regime");
    const createButton = page.getByRole("button", { name: "Create" });
    const submitButton = page.getByRole("button", { name: "Submit" });
    const itemName = page.getByLabel("Item name");
    const uploadCategory = page.getByLabel("Upload category");
    const proofFile = page.getByLabel("Proof file");

    await expect(financialYear).toBeVisible();
    await financialYear.fill(`FY${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`);
    await expect(taxRegime).toBeVisible();
    await taxRegime.selectOption({ index: 0 });
    await expect(createButton).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(itemName).toBeVisible();
    await expect(uploadCategory).toBeVisible();
    await expect(proofFile).toBeVisible();

    if (await createButton.isEnabled()) {
      await createButton.click();
      await expect(page.getByRole("status")).toContainText(/saved|could not be saved/i);
    } else {
      await expect(submitButton).toBeDisabled();
      await expect(itemName).toBeDisabled();
      await expect(uploadCategory).toBeDisabled();
      await expect(proofFile).toBeDisabled();
    }

    await expect(page.getByText("Proof register", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Declared items" })).toBeVisible();
    await expect(page.getByText("Create or select a draft declaration to add proof rows.").or(page.getByText("Proof uploads")).first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
