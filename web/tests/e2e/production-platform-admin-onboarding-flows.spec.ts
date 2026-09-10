import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function notice(page: Page): Locator {
  return page.locator(".notice").first();
}

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

test.describe("Production platform admin onboarding proof", () => {
  test("platform admin onboards five tenants and first admins through the browser", async ({ page }) => {
    test.setTimeout(600_000);
    const runRef = uniqueRunRef();
    const adminPassword = process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123";

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Console");
    await expectNoHorizontalOverflow(page);

    const packCode = `qa-pack-${runRef}`;
    const packName = `QA Browser Baseline ${runRef}`;
    const policyPackCard = card(page, "Policy packs");
    await namedControl(policyPackCard, "code").fill(packCode);
    await namedControl(policyPackCard, "name").fill(packName);
    await namedControl(policyPackCard, "domain").selectOption("leave");
    await namedControl(policyPackCard, "status").selectOption("draft");
    await namedControl(policyPackCard, "version").fill("1");
    await namedControl(policyPackCard, "country_code").fill("IN");
    await namedControl(policyPackCard, "industry_tag").fill("qa");
    await namedControl(policyPackCard, "description").fill("Browser-created baseline pack for platform admin onboarding proof.");
    await policyPackCard.getByRole("button", { name: "Create pack" }).click();
    await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(packCode)).toBeVisible();
    await page.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
    await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(card(page, "Policy packs").locator(".tenant-support-access-row").filter({ hasText: packCode }).getByText("Published", { exact: true })).toBeVisible();

    for (let index = 1; index <= 5; index += 1) {
      const padded = String(index).padStart(2, "0");
      const tenantCode = `qa-pa-${runRef}-${padded}`;
      const tenantName = `QA Platform Tenant ${runRef} ${padded}`;
      const adminName = `QA Admin ${padded}`;
      const adminEmail = `qa.pa.${runRef}.${padded}@example.test`;
      const adminUsername = `qa.pa.${runRef}.${padded}`;

      const createTenantCard = card(page, "Create tenant");
      await namedControl(createTenantCard, "code").fill(tenantCode);
      await namedControl(createTenantCard, "name").fill(tenantName);
      await namedControl(createTenantCard, "legal_name").fill(`${tenantName} Pvt Ltd`);
      await namedControl(createTenantCard, "primary_domain").fill(`${tenantCode}.example.test`);
      await namedControl(createTenantCard, "primary_email").fill(`ops.${tenantCode}@example.test`);
      await namedControl(createTenantCard, "primary_phone").fill(`+91 90000 00${padded}`);
      await namedControl(createTenantCard, "subscription_plan").selectOption(index === 3 ? "enterprise" : "growth");
      await namedControl(createTenantCard, "seed_pack").selectOption(index === 2 ? "shift_based" : "standard_office");
      await namedControl(createTenantCard, "timezone").fill("Asia/Kolkata");
      await namedControl(createTenantCard, "country_code").fill("IN");
      await namedControl(createTenantCard, "is_sandbox").setChecked(true);
      await createTenantCard.getByRole("button", { name: "Create tenant" }).click();
      await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/tenantId=/);
      await expect(page.getByText(tenantName).first()).toBeVisible();

      const onboardingCard = card(page, "Onboarding metadata");
      await namedControl(onboardingCard, "owner_mode").selectOption(index === 3 ? "split_platform_roles" : "combined_platform_admin");
      await namedControl(onboardingCard, "setup_style").selectOption(index === 4 ? "customer_led" : index === 3 ? "shared" : "platform_assisted");
      await namedControl(onboardingCard, "data_setup_style").selectOption(index === 2 ? "seeded_demo" : index === 3 ? "import_led" : "manual");
      await namedControl(onboardingCard, "policy_control_style").selectOption(index === 2 ? "mostly_locked" : index === 3 ? "mostly_delegated" : "mixed");
      await namedControl(onboardingCard, "country_context").fill("IN");
      await namedControl(onboardingCard, "industry_context").fill(index === 3 ? "technology" : "services");
      await namedControl(onboardingCard, "notes").fill(`Browser onboarding notes for ${tenantCode}.`);
      await namedControl(onboardingCard, "internal_handoff_notes").fill(`Internal readiness note for ${tenantCode}.`);
      await namedControl(onboardingCard, "customer_handoff_notes").fill(`Customer handoff note for ${tenantCode}.`);
      await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
      await expect(notice(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();
      await page.reload();

      const contactsCard = card(page, "Admin contacts");
      await namedControl(contactsCard, "full_name").fill(adminName);
      await namedControl(contactsCard, "email").fill(adminEmail);
      await namedControl(contactsCard, "phone_number").fill(`+91 91111 11${padded}`);
      await namedControl(contactsCard, "job_title").fill("Head of People");
      await namedControl(contactsCard, "is_primary").setChecked(true);
      await namedControl(contactsCard, "notes").fill(`Primary admin contact for ${tenantCode}.`);
      await contactsCard.getByRole("button", { name: "Add contact" }).click();
      await expect(notice(page).getByText("Admin contact added.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(card(page, "Admin contacts").getByText(adminEmail, { exact: true })).toBeVisible();

      const provisionCard = card(page, "Provision first admin");
      await namedControl(provisionCard, "contact_id").selectOption({ label: `${adminName} - ${adminEmail}` });
      await namedControl(provisionCard, "username").fill(adminUsername);
      await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
      await namedControl(provisionCard, "role_name").fill("Tenant Admin");
      await namedControl(provisionCard, "password").fill(adminPassword);
      await namedControl(provisionCard, "membership_status").selectOption("active");
      await namedControl(provisionCard, "must_change_password").setChecked(false);
      await namedControl(provisionCard, "is_user_active").setChecked(true);
      await provisionCard.getByRole("button", { name: "Provision admin" }).click();
      await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(
        card(page, "Admin contacts").locator(".tenant-support-access-row").filter({ hasText: adminEmail }).getByText("Provisioned", { exact: true }),
      ).toBeVisible();

      const adoptCard = card(page, "Adopt baseline");
      await namedControl(adoptCard, "policy_pack_id").selectOption({ label: `${packName} - ${packCode}` });
      await namedControl(adoptCard, "adoption_mode").selectOption("clone_to_tenant_records");
      await namedControl(adoptCard, "notes").fill(`Adopting ${packCode} for ${tenantCode}.`);
      await adoptCard.getByRole("button", { name: "Adopt pack" }).click();
      await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(card(page, tenantName).getByText("baseline_published").or(page.getByText("Baseline Published")).first()).toBeVisible();

      const gatesCard = card(page, "Activation gates");
      await gatesCard.getByRole("button", { name: "Mark baseline" }).click();
      await expect(notice(page).getByText("Mark Baseline Published", { exact: true })).toBeVisible();
      await page.reload();
      await card(page, "Activation gates").getByRole("button", { name: "Mark handoff" }).click();
      await expect(notice(page).getByText("Mark Handoff Ready", { exact: true })).toBeVisible();
      await page.reload();
      await card(page, "Activation gates").getByRole("button", { name: "Activate tenant" }).click();
      await expect(notice(page).getByText("Activate", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText("Active").first()).toBeVisible();

      await page.request.post("/api/auth/logout").catch(() => null);
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("Username or email").fill(adminUsername);
      await page.getByLabel("Password").fill(adminPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/tenant-admin$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Tenant Admin Console" })).toBeVisible();
      await expect(page.getByRole("heading", { name: tenantName })).toBeVisible();

      await page.request.post("/api/auth/logout").catch(() => null);
      await page.context().clearCookies();
      await gotoAuthenticated(page, "/platform-admin", platformAdmin);
      await expectPageReady(page, "Platform Admin Console");
    }

    await expectNoHorizontalOverflow(page);
  });
});
