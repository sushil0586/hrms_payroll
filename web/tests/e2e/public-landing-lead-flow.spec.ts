import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Public landing and lead intake", () => {
  test("homepage is a polished public product page with signup and contact intake", async ({ page }) => {
    const leadRequests: unknown[] = [];
    await page.route("**/api/public-leads", async (route) => {
      leadRequests.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Request received. Our team will review it and contact you.", lead_id: "lead-1", status: "new" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expectPageReady(page, "Run payroll, compliance, and employee operations");
    await expect(page.getByRole("link", { name: "Request access" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Talk to sales" })).toBeVisible();
    await expect(page.getByText("100 employee")).toBeVisible();
    await expect(page.getByText("22 browser")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start guided, then scale per employee." })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.locator("#signup").getByLabel("Company name").fill("Acme Payroll Services");
    await page.locator("#signup").getByLabel("Your name").fill("Priya Sharma");
    await page.locator("#signup").getByLabel("Work email").fill("priya@acme.example");
    await page.locator("#signup").getByLabel("Phone").fill("+91 90000 00000");
    await page.locator("#signup").getByLabel("Employees").fill("120");
    await page.locator("#signup").getByLabel("Industry").fill("Services");
    await page.locator("#signup").getByLabel("Message").fill("We want a guided payroll pilot.");
    await page.locator("#signup").getByRole("button", { name: "Request pilot access" }).click();

    await expect(page.locator("#signup").getByText("Request received. Our team will review it and contact you.")).toBeVisible();
    expect(leadRequests).toHaveLength(1);
    expect(leadRequests[0]).toMatchObject({
      intent: "signup",
      company_name: "Acme Payroll Services",
      contact_name: "Priya Sharma",
      work_email: "priya@acme.example",
      employee_count: 120,
      preferred_plan: "growth",
    });
  });

  test("public landing remains aligned on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Run payroll, compliance, and employee operations from one audit-ready SaaS workspace." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer login" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
