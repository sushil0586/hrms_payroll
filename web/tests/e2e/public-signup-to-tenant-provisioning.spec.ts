import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

test.describe("PLF-1/2 public signup to tenant provisioning", () => {
  test("public lead can be reviewed and converted to tenant from browser UI", async ({ page }) => {
    const suffix = uniqueSuffix();
    const companyName = `PLF Launch Tenant ${suffix}`;
    const contactName = "Aditi Rao";
    const workEmail = `aditi.${suffix}@plf-launch.test`;
    const tenantCode = `plf-launch-${suffix}`.slice(0, 50);
    const primaryDomain = `plf-${suffix}.test`;
    const adminUsername = `plf.admin.${suffix}`.slice(0, 150);
    const adminPassword = process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123";

    await page.goto("/", { waitUntil: "networkidle" });
    await expectPageReady(page, "Run payroll, compliance, and employee operations");

    const signup = page.locator("#signup");
    await signup.getByLabel("Company name").fill(companyName);
    await signup.getByLabel("Your name").fill(contactName);
    await signup.getByLabel("Work email").fill(workEmail);
    await signup.getByLabel("Phone").fill("+91 90000 22222");
    await signup.getByLabel("Employees").fill("125");
    await signup.getByLabel("Preferred plan").selectOption("growth");
    await signup.getByLabel("Industry").fill("Technology");
    await signup.getByLabel("Country").fill("IN");
    await signup.getByLabel("Message").fill("Please start a public launch onboarding rehearsal.");
    await signup.getByRole("button", { name: "Request pilot access" }).click();

    await expect(signup.getByText("Request received. Our team will review it and contact you.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/platform-admin/leads", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    const leadsPanel = page.getByTestId("platform-admin-leads-panel");
    await expect(leadsPanel).toBeVisible();
    await leadsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);

    const leadRow = page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
    await expect(leadRow).toBeVisible();
    await expect(leadRow.getByText(contactName)).toBeVisible();
    await expect(leadRow.getByText(workEmail)).toBeVisible();
    await expect(leadRow.getByText("125 employees")).toBeVisible();
    await expect(leadRow.getByText("Convert to tenant")).toBeVisible();

    await leadRow.getByRole("button", { name: "Reviewing" }).click();
    await expect(page.getByText("Lead marked Reviewing.")).toBeVisible();
    await leadsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);
    const reviewingRow = page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
    await reviewingRow.getByRole("button", { name: "Qualified" }).click();
    await expect(page.getByText("Lead marked Qualified.")).toBeVisible();

    await leadsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);
    const qualifiedRow = page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
    await qualifiedRow.getByLabel("Tenant code").fill(tenantCode);
    await qualifiedRow.getByLabel("Primary domain").fill(primaryDomain);
    await qualifiedRow.getByLabel("Plan").selectOption("growth");
    await qualifiedRow.getByLabel("Seed pack").selectOption("standard_office");
    await qualifiedRow.getByLabel("Owner mode").selectOption("combined_platform_admin");
    await qualifiedRow.getByLabel("Setup style").selectOption("platform_assisted");
    await qualifiedRow.getByLabel("Data setup").selectOption("manual");
    await qualifiedRow.getByLabel("Policy control").selectOption("mixed");
    await qualifiedRow.getByLabel("Admin title").fill("Head of People");
    await qualifiedRow.getByLabel("Conversion notes").fill("Commercial approval received for launch rehearsal.");
    await qualifiedRow.getByRole("button", { name: "Convert lead" }).click();

    await expect(page).toHaveURL(/\/platform-admin\/admins\?tenantId=/);
    const adminsPanel = page.getByTestId("platform-admin-admins-panel");
    await expect(adminsPanel).toBeVisible();
    const adminContactRow = adminsPanel.locator(".tenant-support-access-row").filter({ hasText: workEmail }).first();
    await expect(adminContactRow).toBeVisible();
    await expect(adminContactRow.getByText(contactName)).toBeVisible();
    await expect(adminContactRow.getByText(workEmail)).toBeVisible();
    const provisionForm = adminsPanel.locator("article").filter({ hasText: "Provision first admin" }).first();
    await expect(provisionForm.getByRole("button", { name: "Provision admin" })).toBeVisible();
    await provisionForm.locator('[name="contact_id"]').selectOption({ label: `${contactName} - ${workEmail}` });
    await provisionForm.locator('[name="username"]').fill(adminUsername);
    await provisionForm.locator('[name="role_code"]').selectOption("tenant-admin");
    await provisionForm.locator('[name="role_name"]').fill("Tenant Admin");
    await provisionForm.locator('[name="password"]').fill(adminPassword);
    await provisionForm.locator('[name="membership_status"]').selectOption("active");
    await provisionForm.locator('[name="must_change_password"]').setChecked(false);
    await provisionForm.locator('[name="is_user_active"]').setChecked(true);
    await provisionForm.getByRole("button", { name: "Provision admin" }).click();

    await expect(page.getByText("First admin provisioned.")).toBeVisible();
    await expect(adminContactRow.getByText("Provisioned")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/platform-admin/tenants", { waitUntil: "networkidle" });
    const tenantsPanel = page.getByTestId("platform-admin-tenants-panel");
    await tenantsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);
    await expect(tenantsPanel.locator(".employee-directory-item").filter({ hasText: companyName }).first()).toBeVisible();
    await expect(tenantsPanel.getByText(primaryDomain)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel("Username or email").fill(adminUsername);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/tenant-admin$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Tenant Admin Console" })).toBeVisible();
    await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
