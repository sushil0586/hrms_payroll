import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Public landing and lead intake", () => {
  test("homepage explains the operating flow and accepts governed pilot requests", async ({ page }) => {
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
    await expectPageReady(page, "One clear operating flow for HR and payroll");
    await expect(page.getByRole("link", { name: "Request access" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See the complete flow" })).toBeVisible();
    await expect(page.getByText("India-ready payroll operations")).toBeVisible();
    await expect(page.getByText("Role-based access")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Confidence comes from how the work is handled." })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "One clear operating flow for HR and payroll." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer sign in" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
