import { expect, type APIResponse, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, platformAdmin } from "../helpers/staging-auth";

type Tenant = {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  status: string;
  onboarding_status: string;
  primary_email: string;
  primary_phone: string;
  primary_domain: string;
  subscription_plan: string;
  seed_pack: string;
  timezone: string;
  country_code: string;
  is_sandbox: boolean;
};

type Lead = {
  id: string;
  status: string;
  company_name: string;
  work_email: string;
  converted_tenant_id: string | null;
};

type Onboarding = {
  tenant_code: string;
  tenant_status: string;
  tenant_onboarding_status: string;
  baseline_published_at: string | null;
  handoff_completed_at: string | null;
  admin_contacts: Array<{
    id: string;
    full_name: string;
    email: string;
    provisioning_status: string;
    membership_id: string | null;
    is_primary: boolean;
  }>;
  recent_events: Array<{
    event_type: string;
    summary: string;
    actor_identifier: string;
    created_at: string;
    payload: Record<string, unknown>;
  }>;
};

type PolicyPack = {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

function namedControl(root: Locator, name: string): Locator {
  return root.locator(`[name="${name}"]`);
}

function notice(page: Page): Locator {
  return page.locator(".platform-feedback, .notice").first();
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function expectNoSensitiveData(value: unknown) {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  expect(text).not.toContain("password@123");
  expect(text).not.toContain("generated_password");
  expect(text).not.toContain("authorization");
  expect(text).not.toContain("token");
  expect(text).not.toContain("secret");
  expect(text).not.toContain("smtp_password");
}

async function safeWait(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function gotoPlatform(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await safeWait(page);
  await expectPageReady(page, heading);
}

async function getLead(page: Page, leadId: string) {
  for (const status of ["new", "reviewing", "qualified", "converted", "closed"]) {
    const response = await page.request.get(`/api/platform/leads?status=${status}`);
    expect(response.ok()).toBeTruthy();
    const leads = (await response.json()) as Lead[];
    const lead = leads.find((item) => item.id === leadId);
    if (lead) return lead;
  }
  throw new Error(`Lead ${leadId} was not found.`);
}

async function getTenantByCode(page: Page, code: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as Tenant[];
  return tenants.filter((tenant) => tenant.code === code);
}

async function getOnboarding(page: Page, tenantId: string) {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as Onboarding;
}

async function getPolicyPackByCode(page: Page, packCode: string) {
  const response = await page.request.get("/api/platform-policy-packs");
  expect(response.ok()).toBeTruthy();
  const packs = (await response.json()) as PolicyPack[];
  const pack = packs.find((item) => item.code === packCode);
  expect(pack, `policy pack ${packCode}`).toBeTruthy();
  return pack as PolicyPack;
}

async function expectDenied(response: APIResponse, label: string) {
  expect([401, 403, 404, 405], label).toContain(response.status());
  const payload = await response.json().catch(() => ({}));
  expectNoSensitiveData(payload);
}

async function createPublicLeadFromHome(page: Page, data: {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
}) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expectPageReady(page, "Run payroll, compliance, and employee operations");
  const signup = page.locator("#signup");
  await signup.getByLabel("Company name").fill(data.companyName);
  await signup.getByLabel("Your name").fill(data.contactName);
  await signup.getByLabel("Work email").fill(data.workEmail);
  await signup.getByLabel("Phone").fill(data.phone);
  await signup.getByLabel("Employees").fill("186");
  await signup.getByLabel("Preferred plan").selectOption("growth");
  await signup.getByLabel("Industry").fill("Technology");
  await signup.getByLabel("Country").fill("IN");
  await signup.getByLabel("Message").fill("Final enterprise production-readiness onboarding rehearsal.");
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/public-leads") && response.request().method() === "POST");
  await signup.getByRole("button", { name: "Request pilot access" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(signup.getByText("Request received. Our team will review it and contact you.")).toBeVisible();
  const body = await response.json();
  return String(body.lead_id);
}

async function createAndPublishTemplate(page: Page, packCode: string, packName: string) {
  await gotoPlatform(page, "/platform-admin/policy-packs", "Setup Templates");
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "code").fill(packCode);
  await namedControl(setupCard, "name").fill(packName);
  await namedControl(setupCard, "domain").selectOption("leave");
  await namedControl(setupCard, "status").selectOption("draft");
  await namedControl(setupCard, "version").fill("1");
  await namedControl(setupCard, "country_code").fill("IN");
  await namedControl(setupCard, "industry_tag").fill("qa-final");
  await namedControl(setupCard, "description").fill("Final production-readiness baseline template.");
  await setupCard.getByRole("button", { name: "Create template" }).click();
  await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await safeWait(page);
  await namedControl(setupCard, "policy_pack_search").fill(packCode);
  await setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
  const publishDialog = page.getByRole("dialog", { name: "Publish header-only setup template?" });
  await expect(publishDialog.getByText(/evidence-only baseline/i)).toBeVisible();
  await publishDialog.getByRole("button", { name: "Publish header-only" }).click();
  await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
  const pack = await getPolicyPackByCode(page, packCode);
  expect(pack.status).toBe("published");
  return pack;
}

async function openAuditEvidence(page: Page, eventType: string) {
  const eventsCard = card(page, "Onboarding events");
  await namedControl(eventsCard, "event_search").fill(eventType);
  const row = eventsCard.locator(".tenant-support-access-row").filter({ hasText: titleCase(eventType) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: new RegExp(`View evidence for ${titleCase(eventType)}`) }).click();
  const dialog = page.getByRole("dialog", { name: titleCase(eventType) });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Platform Admin final production-readiness certification", () => {
  test("certifies the integrated public lead to active tenant onboarding journey", async ({ browser, page }) => {
    test.setTimeout(600_000);
    const runRef = uniqueRunRef();
    const companyName = `QA Final Launch ${runRef} Pvt Ltd`;
    const contactName = `QA Final Admin ${runRef}`;
    const workEmail = `qa.final.${runRef}@example.test`;
    const phone = "+91 90000 77777";
    const tenantCode = `qa-final-${runRef}`.slice(0, 50);
    const primaryDomain = `${tenantCode}.example.test`;
    const adminUsername = `qa.final.${runRef}`.slice(0, 150);
    const adminPassword = process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123";
    const packCode = `qa-final-pack-${runRef}`;
    const packName = `QA Final Pack ${runRef}`;

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !/favicon|Failed to load resource/i.test(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "";
      if (!request.url().includes("_rsc") && !failure.includes("ERR_ABORTED")) {
        failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
      }
    });

    const leadId = await createPublicLeadFromHome(page, { companyName, contactName, workEmail, phone });
    await gotoAuthenticated(page, "/platform-admin/leads", platformAdmin);
    await expectPageReady(page, "Leads");
    const leadsPanel = page.getByTestId("platform-admin-leads-panel");
    await leadsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);
    let leadRow = page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
    await expect(leadRow).toBeVisible();
    await expect(leadRow.getByText(workEmail)).toBeVisible();
    await leadRow.getByRole("button", { name: "Reviewing" }).click();
    await safeWait(page);
    await leadsPanel.getByRole("textbox", { name: "Search" }).fill(companyName);
    leadRow = page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
    await leadRow.getByRole("button", { name: "Qualified" }).click();
    await safeWait(page);
    await expect(leadRow.getByText("Qualified")).toBeVisible();

    await leadRow.getByLabel("Tenant code").fill(tenantCode);
    await leadRow.getByLabel("Primary domain").fill(primaryDomain);
    await leadRow.getByLabel("Plan").selectOption("enterprise");
    await leadRow.getByLabel("Seed pack").selectOption("standard_office");
    await leadRow.getByLabel("Owner mode").selectOption("combined_platform_admin");
    await leadRow.getByLabel("Setup style").selectOption("platform_assisted");
    await leadRow.getByLabel("Data setup").selectOption("manual");
    await leadRow.getByLabel("Policy control").selectOption("mixed");
    await leadRow.getByLabel("Admin title").fill("Head of People");
    await leadRow.getByLabel("Conversion notes").fill("Final release journey commercial approval.");
    const convertResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/platform/leads/${leadId}/convert`) && response.request().method() === "POST",
    );
    await leadRow.getByRole("button", { name: "Convert lead" }).click();
    const conversionResponse = await convertResponse;
    expect(conversionResponse.ok(), `lead conversion ${conversionResponse.status()}: ${await conversionResponse.text()}`).toBeTruthy();
    await expect(page).toHaveURL(/\/platform-admin\/admins\?tenantId=/);
    const tenantId = new URL(page.url()).searchParams.get("tenantId") ?? "";
    expect(tenantId).toBeTruthy();

    let tenantMatches = await getTenantByCode(page, tenantCode);
    expect(tenantMatches).toHaveLength(1);
    let tenant = tenantMatches[0];
    expect(tenant.id).toBe(tenantId);
    expect(tenant.name).toBe(companyName);
    expect(tenant.legal_name).toBe(companyName);
    expect(tenant.primary_email).toBe(workEmail);
    expect(tenant.primary_phone).toBe(phone);
    expect(tenant.primary_domain).toBe(primaryDomain);
    expect(tenant.subscription_plan).toBe("enterprise");
    expect(tenant.seed_pack).toBe("standard_office");
    expect(tenant.country_code).toBe("IN");
    expect(tenant.is_sandbox).toBe(true);

    let lead = await getLead(page, leadId);
    expect(lead.status).toBe("converted");
    expect(lead.converted_tenant_id).toBe(tenantId);
    const duplicateConvert = await page.request.post(`/api/platform/leads/${leadId}/convert`, {
      data: { code: `${tenantCode}-again`, primary_domain: `${tenantCode}-again.example.test` },
    });
    expect([400, 409]).toContain(duplicateConvert.status());
    expect(await getTenantByCode(page, tenantCode)).toHaveLength(1);

    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness");
    const onboardingCard = card(page, "Onboarding metadata");
    await namedControl(onboardingCard, "country_context").fill("IN");
    await namedControl(onboardingCard, "industry_context").fill("technology");
    await namedControl(onboardingCard, "notes").fill(`Final production readiness notes ${runRef}`);
    await namedControl(onboardingCard, "internal_handoff_notes").fill(`Internal signoff ${runRef}`);
    await namedControl(onboardingCard, "customer_handoff_notes").fill(`Customer handoff ${runRef}`);
    await onboardingCard.getByRole("button", { name: "Save onboarding" }).click();
    await expect(notice(page).getByText("Onboarding metadata updated.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await safeWait(page);
    await expect(namedControl(card(page, "Onboarding metadata"), "notes")).toHaveValue(`Final production readiness notes ${runRef}`);

    await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
    const tenantsPanel = page.getByTestId("platform-admin-tenants-panel");
    await tenantsPanel.getByRole("textbox", { name: "Search" }).fill(tenantCode);
    await expect(tenantsPanel.locator(".employee-directory-item").filter({ hasText: tenantCode })).toBeVisible();
    await page.goto(`/platform-admin/onboarding?tenantId=${tenantId}`, { waitUntil: "domcontentloaded" });
    await safeWait(page);
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Mark ready" })).toBeDisabled();
    await expect(card(page, "Launch readiness").getByRole("button", { name: "Activate tenant" })).toBeDisabled();

    let onboarding = await getOnboarding(page, tenantId);
    expect(onboarding.admin_contacts.some((contact) => contact.email === workEmail && contact.is_primary && !contact.membership_id)).toBe(true);

    await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantId}`, "Admin Access");
    const provisionCard = card(page, "Create tenant admin login");
    await namedControl(provisionCard, "contact_id").selectOption({ label: `${contactName} - ${workEmail}` });
    await namedControl(provisionCard, "username").fill(adminUsername);
    await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
    await namedControl(provisionCard, "role_name").fill("Tenant Admin");
    await namedControl(provisionCard, "password").fill(adminPassword);
    await namedControl(provisionCard, "membership_status").selectOption("active");
    await namedControl(provisionCard, "must_change_password").setChecked(false);
    await namedControl(provisionCard, "is_user_active").setChecked(true);
    await provisionCard.getByRole("button", { name: "Create login access" }).click();
    await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
    onboarding = await getOnboarding(page, tenantId);
    expect(onboarding.admin_contacts.some((contact) => contact.email === workEmail && contact.provisioning_status === "provisioned" && contact.membership_id)).toBe(true);

    const pack = await createAndPublishTemplate(page, packCode, packName);
    await gotoPlatform(page, `/platform-admin/policy-packs?tenantId=${tenantId}`, "Setup Templates");
    const applyCard = card(page, "Apply setup template");
    await namedControl(applyCard, "policy_pack_id").selectOption({ label: `${packName} - ${packCode} - Published` });
    await namedControl(applyCard, "adoption_mode").selectOption("clone_to_tenant_records");
    await namedControl(applyCard, "notes").fill(`Final production baseline ${runRef}.`);
    await applyCard.getByRole("button", { name: "Preview impact" }).click();
    await expect(applyCard.getByText("Impact preview")).toBeVisible();
    await expect(applyCard.getByText(/0 create/i)).toBeVisible();
    await applyCard.getByRole("button", { name: "Apply template" }).click();
    await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await safeWait(page);
    onboarding = await getOnboarding(page, tenantId);
    expect(onboarding.baseline_published_at).toBeTruthy();

    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness");
    const readiness = card(page, "Launch readiness");
    await readiness.getByRole("button", { name: "Confirm setup" }).click();
    await page.getByRole("dialog", { name: "Confirm initial setup?" }).getByRole("button", { name: "Confirm setup" }).click();
    await expect(notice(page).getByText("Mark Baseline Published", { exact: true })).toBeVisible();
    await readiness.getByRole("button", { name: "Mark ready" }).click();
    await page.getByRole("dialog", { name: "Mark customer ready?" }).getByRole("button", { name: "Mark ready" }).click();
    await expect(notice(page).getByText("Mark Handoff Ready", { exact: true })).toBeVisible();
    const repeatHandoff = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/mark-handoff-ready`);
    expect(repeatHandoff.ok()).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await safeWait(page);
    await card(page, "Launch readiness").getByRole("button", { name: "Activate tenant" }).click();
    await page.getByRole("dialog", { name: "Activate tenant?" }).getByRole("button", { name: "Activate tenant" }).click();
    await expect(notice(page).getByText("Activate", { exact: true })).toBeVisible();
    const repeatActivation = await page.request.post(`/api/platform/tenants/${tenantId}/onboarding/activate`);
    expect(repeatActivation.status()).toBe(400);

    tenantMatches = await getTenantByCode(page, tenantCode);
    tenant = tenantMatches[0];
    expect(tenant.status).toBe("active");
    expect(tenant.onboarding_status).toBe("active");
    onboarding = await getOnboarding(page, tenantId);
    expect(onboarding.tenant_status).toBe("active");
    expect(onboarding.tenant_onboarding_status).toBe("active");
    expect(onboarding.handoff_completed_at).toBeTruthy();

    await gotoPlatform(page, "/platform-admin", "Platform Admin Dashboard");
    await expect(page.getByTestId("platform-admin-control-center")).toBeVisible();
    await expect(card(page, "Activation blockers").getByText(tenantCode)).toHaveCount(0);

    await gotoPlatform(page, `/platform-admin/audit-logs?tenantId=${tenantId}`, "Audit Logs");
    for (const eventType of [
      "public_lead_converted",
      "tenant_prepared",
      "first_admin_provisioned",
      "baseline_published",
      "handoff_marked_ready",
      "tenant_activated",
    ]) {
      const dialog = await openAuditEvidence(page, eventType);
      await expect(dialog).toContainText("platform.admin");
      await expect(dialog).toContainText(tenantCode);
      const payload = await dialog.getByLabel("Audit evidence payload").textContent();
      expectNoSensitiveData(payload);
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toBeHidden();
    }
    const tenantActivated = onboarding.recent_events.find((event) => event.event_type === "tenant_activated");
    expect(tenantActivated?.payload.tenant_id).toBe(tenantId);
    expect(tenantActivated?.payload.tenant_status).toBe("active");
    expectNoSensitiveData(onboarding.recent_events);

    await gotoAuthenticated(page, "/platform-admin/tenants", hrAdmin);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('a[href^="/platform-admin"]')).toHaveCount(0);
    await expectDenied(await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`), "restricted launch readiness");
    await expectDenied(await page.request.get("/api/platform/permission-catalog"), "restricted permission catalog");
    await expectDenied(await page.request.post(`/api/platform-policy-packs/${pack.id}/adopt-for-tenant`, {
      data: { tenant_id: tenantId, mode: "clone_to_tenant_records" },
    }), "restricted setup adoption");

    await gotoAuthenticated(page, `/platform-admin/admins?tenantId=${tenantId}`, platformAdmin);
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await gotoAuthenticated(secondPage, `/platform-admin/audit-logs?tenantId=${tenantId}`, platformAdmin);
    await expect(secondPage.getByTestId("platform-admin-events-panel")).toBeVisible();
    await secondContext.close();

    for (const route of [
      ["/platform-admin", "Platform Admin Dashboard"],
      ["/platform-admin/leads", "Leads"],
      ["/platform-admin/tenants", "Tenants"],
      [`/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness"],
      [`/platform-admin/admins?tenantId=${tenantId}`, "Admin Access"],
      [`/platform-admin/policy-packs?tenantId=${tenantId}`, "Setup Templates"],
      ["/platform-admin/permissions", "Permission Catalog"],
      [`/platform-admin/audit-logs?tenantId=${tenantId}`, "Audit Logs"],
    ] as const) {
      await page.setViewportSize({ width: 1366, height: 768 });
      await gotoPlatform(page, route[0], route[1]);
      await expectNoHorizontalOverflow(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await gotoPlatform(page, route[0], route[1]);
      await expectNoHorizontalOverflow(page);
    }

    expect(consoleErrors.join("\n")).toBe("");
    expect(failedRequests.join("\n")).toBe("");
    await expectNoAppError(page);
  });
});
