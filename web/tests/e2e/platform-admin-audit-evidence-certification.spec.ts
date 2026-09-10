import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type OnboardingEvent = {
  event_type: string;
  summary: string;
  actor_identifier: string;
  created_at: string;
  payload: Record<string, unknown>;
};

type OnboardingPayload = {
  tenant_code: string;
  tenant_name: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  baseline_published_at: string | null;
  handoff_completed_at: string | null;
  admin_contacts: Array<{ email: string; provisioning_status: string; membership_id: string | null; is_primary: boolean }>;
  checklist_items: Array<{ code: string; status: string; completed_by_identifier: string }>;
  recent_events: OnboardingEvent[];
};

type TenantListItem = {
  id: string;
  code: string;
};

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

async function openPlatformTab(page: Page, name: "Tenants" | "Onboarding" | "Admins" | "Policy Packs" | "Events") {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
}

async function onboardingPayload(page: Page, tenantId: string): Promise<OnboardingPayload> {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function tenantIdByCode(page: Page, tenantCode: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant?.id ?? "";
}

function expectEvent(payload: OnboardingPayload, eventType: string, summaryPattern?: RegExp) {
  const event = payload.recent_events.find((item) => item.event_type === eventType);
  expect(event, `${eventType} event`).toBeTruthy();
  expect(event?.actor_identifier).toBe("platform.admin");
  expect(event?.created_at).toBeTruthy();
  if (summaryPattern) {
    expect(event?.summary).toMatch(summaryPattern);
  }
}

function expectChecklist(payload: OnboardingPayload, code: string) {
  const item = payload.checklist_items.find((checklistItem) => checklistItem.code === code);
  expect(item, `${code} checklist item`).toBeTruthy();
  expect(item?.status).toBe("completed");
  expect(item?.completed_by_identifier).toBe("platform.admin");
}

test.describe("Platform admin audit evidence certification", () => {
  test("each platform onboarding mutation leaves tenant-specific evidence visible after refresh", async ({ page }) => {
    test.setTimeout(300_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-audit-${runRef}`;
    const tenantName = `QA Audit Tenant ${runRef}`;
    const packCode = `qa-audit-pack-${runRef}`;
    const packName = `QA Audit Pack ${runRef}`;
    const adminName = "QA Audit Admin";
    const adminEmail = `qa.audit.${runRef}@example.test`;

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Console");

    await openPlatformTab(page, "Policy Packs");
    const policyPackCard = card(page, "Policy packs");
    await namedControl(policyPackCard, "code").fill(packCode);
    await namedControl(policyPackCard, "name").fill(packName);
    await namedControl(policyPackCard, "domain").selectOption("leave");
    await namedControl(policyPackCard, "status").selectOption("draft");
    await namedControl(policyPackCard, "country_code").fill("IN");
    await namedControl(policyPackCard, "industry_tag").fill("qa");
    await namedControl(policyPackCard, "description").fill("Audit evidence certification pack.");
    await policyPackCard.getByRole("button", { name: "Create pack" }).click();
    await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();
    await page.reload();
    await namedControl(policyPackCard, "policy_pack_search").fill(packCode);
    await page.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
    await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();

    await openPlatformTab(page, "Tenants");
    const createTenantCard = card(page, "Create tenant");
    await namedControl(createTenantCard, "code").fill(tenantCode);
    await namedControl(createTenantCard, "name").fill(tenantName);
    await namedControl(createTenantCard, "legal_name").fill(`${tenantName} Pvt Ltd`);
    await namedControl(createTenantCard, "primary_domain").fill(`${tenantCode}.example.test`);
    await namedControl(createTenantCard, "primary_email").fill(`ops.${tenantCode}@example.test`);
    await namedControl(createTenantCard, "subscription_plan").selectOption("growth");
    await namedControl(createTenantCard, "seed_pack").selectOption("standard_office");
    await namedControl(createTenantCard, "country_code").fill("IN");
    await createTenantCard.getByRole("button", { name: "Create tenant" }).click();
    await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();

    const tenantId = await tenantIdByCode(page, tenantCode);
    expect(tenantId).toBeTruthy();
    await page.goto(`/platform-admin?panel=onboarding&tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    let evidence = await onboardingPayload(page, tenantId ?? "");
    expect(evidence.tenant_code).toBe(tenantCode);
    expectEvent(evidence, "tenant_created", new RegExp(tenantCode));
    expectChecklist(evidence, "tenant_created");
    expectChecklist(evidence, "domain_mapped");

    const onboardingCard = card(page, "Onboarding metadata");
    await namedControl(onboardingCard, "owner_mode").selectOption("combined_platform_admin");
    await namedControl(onboardingCard, "setup_style").selectOption("platform_assisted");
    await namedControl(onboardingCard, "data_setup_style").selectOption("manual");
    await namedControl(onboardingCard, "policy_control_style").selectOption("mixed");
    await namedControl(onboardingCard, "notes").fill(`Audit notes for ${tenantCode}`);
    await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
    await expect(notice(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    expectEvent(evidence, "tenant_prepared", new RegExp(tenantCode));

    await openPlatformTab(page, "Admins");
    const contactsCard = card(page, "Admin contacts");
    await namedControl(contactsCard, "full_name").fill(adminName);
    await namedControl(contactsCard, "email").fill(adminEmail);
    await namedControl(contactsCard, "phone_number").fill("+91 92222 22001");
    await namedControl(contactsCard, "job_title").fill("Head of People");
    await namedControl(contactsCard, "is_primary").setChecked(true);
    await contactsCard.getByRole("button", { name: "Add contact" }).click();
    await expect(notice(page).getByText("Admin contact added.", { exact: true })).toBeVisible();
    await page.reload();
    evidence = await onboardingPayload(page, tenantId ?? "");
    expectEvent(evidence, "admin_contact_added", new RegExp(adminEmail));
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.is_primary)).toBeTruthy();

    await openPlatformTab(page, "Admins");
    const provisionCard = card(page, "Provision first admin");
    await namedControl(provisionCard, "contact_id").selectOption({ label: `${adminName} - ${adminEmail}` });
    await namedControl(provisionCard, "username").fill(`qa.audit.${runRef}`);
    await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
    await namedControl(provisionCard, "role_name").fill("Tenant Admin");
    await namedControl(provisionCard, "password").fill(process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123");
    await namedControl(provisionCard, "must_change_password").setChecked(false);
    await provisionCard.getByRole("button", { name: "Provision admin" }).click();
    await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    expectEvent(evidence, "first_admin_provisioned", new RegExp(adminEmail));
    expectChecklist(evidence, "first_admin_provisioned");
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.provisioning_status === "provisioned" && contact.membership_id)).toBeTruthy();

    await openPlatformTab(page, "Policy Packs");
    const adoptCard = card(page, "Adopt baseline");
    await namedControl(adoptCard, "policy_pack_id").selectOption({ label: `${packName} - ${packCode}` });
    await namedControl(adoptCard, "adoption_mode").selectOption("clone_to_tenant_records");
    await namedControl(adoptCard, "notes").fill(`Audit adoption for ${tenantCode}.`);
    await adoptCard.getByRole("button", { name: "Adopt pack" }).click();
    await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    expectEvent(evidence, "baseline_published", new RegExp(packCode));
    expectChecklist(evidence, "baseline_published");
    expect(evidence.baseline_published_at).toBeTruthy();

    await openPlatformTab(page, "Onboarding");
    await card(page, "Activation gates").getByRole("button", { name: "Mark handoff" }).click();
    await expect(notice(page).getByText("Mark Handoff Ready", { exact: true })).toBeVisible();
    await card(page, "Activation gates").getByRole("button", { name: "Activate tenant" }).click();
    await expect(notice(page).getByText("Activate", { exact: true })).toBeVisible();
    evidence = await onboardingPayload(page, tenantId ?? "");
    expectEvent(evidence, "handoff_marked_ready", new RegExp(tenantCode));
    expectEvent(evidence, "tenant_activated", new RegExp(tenantCode));
    expectChecklist(evidence, "handoff_completed");
    expect(evidence.tenant_status).toBe("active");
    expect(evidence.tenant_onboarding_status).toBe("active");
    expect(evidence.handoff_completed_at).toBeTruthy();

    await page.reload();
    await openPlatformTab(page, "Events");
    const eventsCard = card(page, "Onboarding events");
    for (const eventType of ["tenant_created", "tenant_prepared", "admin_contact_added", "first_admin_provisioned", "baseline_published", "handoff_marked_ready", "tenant_activated"]) {
      await namedControl(eventsCard, "event_search").fill(eventType);
      await expect(eventsCard.locator(".tenant-support-access-row").filter({ hasText: eventType.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) })).toBeVisible();
    }

    await openPlatformTab(page, "Tenants");
    await namedControl(card(page, "Tenant pipeline"), "tenant_search").fill(tenantCode);
    await expect(card(page, "Tenant pipeline").locator(".employee-directory-item").filter({ hasText: tenantName })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
