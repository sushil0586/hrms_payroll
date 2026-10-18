import { expect, test } from "@playwright/test";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test("DB6-05-004/005 closes and reopens attendance with retained evidence", async ({ page }) => {
  await gotoAuthenticated(page, "/hr-admin/attendance-close", hrAdmin);
  await expect(page.getByRole("heading", { name: "Monthly attendance close" })).toBeVisible();
  await page.getByLabel("Period start").fill("2029-01-01");
  await page.getByLabel("Period end").fill("2029-01-31");
  await page.getByRole("button", { name: "Reconcile period" }).click();
  const card = page.locator("article.record-card").filter({ hasText: "2029-01-01 to 2029-01-31" });
  await expect(card).toContainText("1 employees");
  await expect(card).toContainText("1.00 payable");
  const confirmation = page.locator("p.notice[role=status]");
  await card.getByRole("button", { name: "Submit" }).click();
  await expect(confirmation).toContainText("submitted confirmed");
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(confirmation).toContainText("approved confirmed");
  await card.getByRole("button", { name: "Close period" }).click();
  await expect(confirmation).toContainText("closed confirmed");
  page.once("dialog", async dialog => { expect(dialog.type()).toBe("prompt"); await dialog.accept("DB6 governed correction"); });
  await card.getByRole("button", { name: "Reopen" }).click();
  await expect(confirmation).toContainText("reopened confirmed");
  await card.getByText("Audit trail").click();
  await expect(card).toContainText("reconciled");
  await expect(card).toContainText("DB6 governed correction");
});
