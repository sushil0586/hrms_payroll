import { expect, type APIResponse, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type PublicLead = {
  id: string;
  status: string;
  company_name: string;
  contact_name: string;
  work_email: string;
  phone_number: string;
  employee_count: number | null;
  industry: string;
  country_code: string;
  preferred_plan: string;
  message: string;
  source_path: string;
  reviewed_by_identifier: string;
  reviewed_at: string | null;
  converted_tenant_id: string | null;
};

type Tenant = {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  primary_email: string;
  primary_phone: string;
  primary_domain: string;
  subscription_plan: string;
  seed_pack: string;
  country_code: string;
  is_sandbox: boolean;
};

type Onboarding = {
  recent_events: {
    event_type: string;
    summary: string;
    actor_identifier: string;
    created_at: string;
    payload: Record<string, unknown>;
  }[];
  admin_contacts: {
    full_name: string;
    email: string;
    phone_number: string;
    job_title: string;
    is_primary: boolean;
  }[];
};

function uniqueRunRef() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase() + Math.floor(Math.random() * 1000);
}

function leadPayload(overrides: Partial<Record<string, unknown>> = {}) {
  const runRef = uniqueRunRef();
  return {
    intent: "signup",
    company_name: `QA Leads ${runRef} Private Limited`,
    contact_name: `QA Lead Contact ${runRef}`,
    work_email: `qa.lead.${runRef}@example.test`,
    phone_number: "+91 90000 33333",
    employee_count: 137,
    industry: "Technology",
    country_code: "IN",
    preferred_plan: "growth",
    message: `QA certification lead with long readable context ${runRef}. Needs payroll, leave, attendance, and compliance onboarding.`,
    source_path: "/qa-platform-admin-leads",
    website: "",
    ...overrides,
  };
}

function rowForLead(page: Page, companyName: string): Locator {
  return page.locator(".tenant-support-access-row--stacked").filter({ hasText: companyName }).first();
}

function statusChip(row: Locator, status: string): Locator {
  return row.locator(".record-chip").filter({ hasText: new RegExp(`^${status}$`) }).first();
}

function leadsCard(page: Page): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: "Public signup and contact leads" }) }).first();
}

async function createPublicLead(page: Page, payload: ReturnType<typeof leadPayload>) {
  const response = await page.request.post("/api/public-leads", { data: payload });
  expect(response.status(), await response.text()).toBe(201);
  const body = (await response.json()) as { lead_id: string; status: string };
  expect(body.lead_id).toBeTruthy();
  return body.lead_id;
}

async function getLead(page: Page, leadId: string) {
  for (const status of ["new", "reviewing", "qualified", "converted", "closed"]) {
    const response = await page.request.get(`/api/platform/leads?status=${status}`);
    expect(response.ok()).toBeTruthy();
    const leads = (await response.json()) as PublicLead[];
    const lead = leads.find((item) => item.id === leadId);
    if (lead) {
      return lead;
    }
  }
  throw new Error(`lead ${leadId} was not found in platform lead queues`);
}

async function getTenantByCode(page: Page, code: string) {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as Tenant[];
  return tenants.filter((tenant) => tenant.code === code);
}

async function getTenantOnboarding(page: Page, tenantId: string) {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Onboarding;
}

async function patchLeadStatus(page: Page, leadId: string, status: "reviewing" | "qualified" | "closed") {
  const response = await page.request.patch(`/api/platform/leads/${leadId}`, { data: { status } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as PublicLead;
}

async function openLeads(page: Page) {
  await gotoAuthenticated(page, "/platform-admin/leads", platformAdmin);
  await expectPageReady(page, "Leads");
  await expect(page.getByTestId("platform-admin-leads-panel")).toBeVisible();
}

async function searchLead(page: Page, query: string) {
  const search = leadsCard(page).getByRole("textbox", { name: "Search" });
  await search.fill(query);
  await expect(leadsCard(page).locator(".platform-filter-summary")).toBeVisible();
}

async function expectStatusPatch(page: Page, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/platform/leads/") && response.request().method() === "PATCH",
  );
  await action();
  const response = await responsePromise;
  expect(response.ok(), `lead status PATCH ${response.status()}: ${await response.text()}`).toBeTruthy();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectApiDenied(response: APIResponse, text: RegExp) {
  expect([400, 409]).toContain(response.status());
  const payload = await response.json().catch(() => ({}));
  expect(JSON.stringify(payload)).toMatch(text);
}

test.describe.configure({ mode: "serial" });

test.describe("Platform admin Leads certification", () => {
  test("certifies lead list, search variants, filters, close flow, refresh, and keyboard accessibility", async ({ page }) => {
    const payload = leadPayload({
      company_name: `QA Leads Search ${uniqueRunRef()} Private Limited`,
      contact_name: "Renu QA Lead",
      work_email: `renu.qa.${uniqueRunRef()}@example.test`,
      phone_number: "",
      employee_count: null,
      industry: "",
      preferred_plan: "",
      message: "   Lead has optional values intentionally missing and padded context.   ",
    });
    const leadId = await createPublicLead(page, payload);

    await openLeads(page);
    const panel = page.getByTestId("platform-admin-leads-panel");
    await expect(panel.getByLabel("Lead filters")).toBeVisible();
    await expect(panel.locator('[name="lead_status_filter"]')).toHaveValue("active");
    await expect(panel.getByText("Default view: active leads")).toBeVisible();

    await searchLead(page, payload.company_name);
    const leadRow = rowForLead(page, payload.company_name);
    await expect(leadRow).toBeVisible();
    await expect(leadRow.getByText("Renu QA Lead")).toBeVisible();
    await expect(leadRow.getByText(payload.work_email)).toBeVisible();
    await expect(leadRow.getByText("No phone")).toBeVisible();
    await expect(leadRow.getByText("Employee count not set")).toBeVisible();
    await expect(leadRow.getByText("Plan not set")).toBeVisible();
    await expect(leadRow.getByText("Industry not set")).toBeVisible();
    await expect(leadRow.getByText(/Lead has optional values intentionally missing/)).toBeVisible();
    await expect(statusChip(leadRow, "New")).toBeVisible();

    await searchLead(page, payload.company_name.slice(0, 12).toUpperCase());
    await expect(rowForLead(page, payload.company_name)).toBeVisible();
    await searchLead(page, `   ${payload.work_email.toUpperCase()}   `);
    await expect(rowForLead(page, payload.company_name)).toBeVisible();
    await searchLead(page, "### no match qa lead ###");
    await expect(panel.getByText("No public leads match this view.")).toBeVisible();
    await searchLead(page, payload.company_name);

    await expectStatusPatch(page, () => leadRow.getByRole("button", { name: "Reviewing" }).click());
    await searchLead(page, payload.company_name);
    await expect(statusChip(rowForLead(page, payload.company_name), "Reviewing")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await searchLead(page, payload.company_name);
    await expect(statusChip(rowForLead(page, payload.company_name), "Reviewing")).toBeVisible();

    const closeButton = rowForLead(page, payload.company_name).getByRole("button", { name: "Close" });
    await expect(closeButton).toBeEnabled();
    await closeButton.click();
    const closeDialog = page.getByRole("dialog", { name: "Close this lead?" });
    await expect(closeDialog).toBeVisible();
    await expect(closeDialog.getByText("will leave the active lead queue")).toBeVisible();
    await expectStatusPatch(page, () => closeDialog.getByRole("button", { name: "Close lead" }).click());
    await panel.locator('[name="lead_status_filter"]').selectOption("closed");
    await searchLead(page, payload.company_name);
    await expect(statusChip(rowForLead(page, payload.company_name), "Closed")).toBeVisible();
    await expect(rowForLead(page, payload.company_name).getByRole("button", { name: "Close" })).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await panel.locator('[name="lead_status_filter"]').selectOption("closed");
    await searchLead(page, payload.company_name);
    await expect(statusChip(rowForLead(page, payload.company_name), "Closed")).toBeVisible();

    const storedLead = await getLead(page, leadId);
    expect(storedLead.status).toBe("closed");
    expect(storedLead.reviewed_by_identifier).toBeTruthy();
    expect(storedLead.reviewed_at).toBeTruthy();

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    const statusFilter = panel.locator('[name="lead_status_filter"]');
    await statusFilter.focus();
    await expect(statusFilter).toBeFocused();
    await page.keyboard.press("Escape");
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies lead qualification, tenant conversion, duplicate prevention, tenant field mapping, and audit evidence", async ({ page }) => {
    const runRef = uniqueRunRef();
    const companyName = `QA Leads Convert ${runRef} Pvt Ltd`;
    const contactName = "Sushil QA Convert";
    const workEmail = `sushil.qa.${runRef}@example.test`;
    const tenantCode = `qa-lead-${runRef}`.slice(0, 50);
    const primaryDomain = `${tenantCode}.example.test`;
    const payload = leadPayload({
      company_name: companyName,
      contact_name: contactName,
      work_email: workEmail,
      phone_number: "+91 90000 44444",
      employee_count: 248,
      industry: "Manufacturing",
      preferred_plan: "business",
      message: "Commercial approval received. Convert through browser certification.",
    });
    const leadId = await createPublicLead(page, payload);

    await openLeads(page);
    await searchLead(page, companyName);
    let leadRow = rowForLead(page, companyName);
    await expect(leadRow).toBeVisible();
    await expectStatusPatch(page, () => leadRow.getByRole("button", { name: "Qualified" }).click());
    await searchLead(page, companyName);
    leadRow = rowForLead(page, companyName);
    await expect(statusChip(leadRow, "Qualified")).toBeVisible();

    await leadRow.getByLabel("Tenant code").fill("");
    await leadRow.getByRole("button", { name: "Convert lead" }).click();
    await expect(leadRow.getByLabel("Tenant code")).toBeFocused();

    await leadRow.getByLabel("Tenant code").fill(tenantCode);
    await leadRow.getByLabel("Primary domain").fill(primaryDomain);
    await leadRow.getByLabel("Plan").selectOption("enterprise");
    await leadRow.getByLabel("Seed pack").selectOption("standard_office");
    await leadRow.getByLabel("Owner mode").selectOption("combined_platform_admin");
    await leadRow.getByLabel("Setup style").selectOption("platform_assisted");
    await leadRow.getByLabel("Data setup").selectOption("manual");
    await leadRow.getByLabel("Policy control").selectOption("mixed");
    await leadRow.getByLabel("Admin title").fill("Head of People");
    await leadRow.getByLabel("Conversion notes").fill("QA conversion notes persisted to onboarding.");

    const convertButton = leadRow.getByRole("button", { name: "Convert lead" });
    await convertButton.dblclick();
    await expect(page).toHaveURL(/\/platform-admin\/admins\?tenantId=/);
    const tenantId = new URL(page.url()).searchParams.get("tenantId");
    expect(tenantId).toBeTruthy();
    await expect(page.getByTestId("platform-admin-admins-panel")).toBeVisible();

    const tenantMatches = await getTenantByCode(page, tenantCode);
    expect(tenantMatches).toHaveLength(1);
    const tenant = tenantMatches[0];
    expect(tenant.id).toBe(tenantId);
    expect(tenant.name).toBe(companyName);
    expect(tenant.legal_name).toBe(companyName);
    expect(tenant.primary_email).toBe(workEmail);
    expect(tenant.primary_phone).toBe("+91 90000 44444");
    expect(tenant.primary_domain).toBe(primaryDomain);
    expect(tenant.subscription_plan).toBe("enterprise");
    expect(tenant.seed_pack).toBe("standard_office");
    expect(tenant.country_code).toBe("IN");
    expect(tenant.is_sandbox).toBe(true);

    const convertedLead = await getLead(page, leadId);
    expect(convertedLead.status).toBe("converted");
    expect(convertedLead.converted_tenant_id).toBe(tenantId);

    const duplicateConvert = await page.request.post(`/api/platform/leads/${leadId}/convert`, {
      data: {
        code: `${tenantCode}-again`.slice(0, 50),
        primary_domain: `${tenantCode}-again.example.test`,
      },
    });
    await expectApiDenied(duplicateConvert, /already been converted/i);
    expect(await getTenantByCode(page, tenantCode)).toHaveLength(1);

    const onboarding = await getTenantOnboarding(page, tenantId ?? "");
    const conversionEvent = onboarding.recent_events.find((event) => event.event_type === "public_lead_converted");
    expect(conversionEvent).toBeTruthy();
    expect(conversionEvent?.summary).toContain(workEmail);
    expect(conversionEvent?.summary).toContain(tenantCode);
    expect(conversionEvent?.actor_identifier).toBeTruthy();
    expect(conversionEvent?.created_at).toBeTruthy();
    expect(conversionEvent?.payload.lead_id).toBe(leadId);
    expect(conversionEvent?.payload.employee_count).toBe(248);
    expect(onboarding.admin_contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          full_name: contactName,
          email: workEmail,
          phone_number: "+91 90000 44444",
          job_title: "Head of People",
          is_primary: true,
        }),
      ]),
    );

    await openLeads(page);
    const convertedStatusFilter = page.getByTestId("platform-admin-leads-panel").locator('[name="lead_status_filter"]');
    await convertedStatusFilter.selectOption("converted");
    await expect(convertedStatusFilter).toHaveValue("converted");
    await searchLead(page, companyName);
    const convertedRow = rowForLead(page, companyName);
    await expect(statusChip(convertedRow, "Converted")).toBeVisible();
    await expect(convertedRow.getByText("Converted tenant is ready for tenant admin access.")).toBeVisible();
    await expect(convertedRow.getByRole("link", { name: "Open admin setup" })).toHaveAttribute("href", new RegExp(`/platform-admin/admins\\?tenantId=${tenantId}`));
    await expect(convertedRow.getByText("Convert to tenant")).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await page.getByTestId("platform-admin-leads-panel").locator('[name="lead_status_filter"]').selectOption("converted");
    await searchLead(page, companyName);
    await expect(statusChip(rowForLead(page, companyName), "Converted")).toBeVisible();

    await gotoAuthenticated(page, "/platform-admin/tenants", platformAdmin);
    await expectPageReady(page, "Tenants");
    await page.getByTestId("platform-admin-tenants-panel").getByRole("textbox", { name: "Search" }).fill(tenantCode);
    const tenantRow = page.locator(".employee-directory-item").filter({ hasText: tenantCode }).first();
    await expect(tenantRow).toBeVisible();
    await expect(tenantRow.getByText(companyName)).toBeVisible();
    await expect(tenantRow.getByText(primaryDomain)).toBeVisible();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
