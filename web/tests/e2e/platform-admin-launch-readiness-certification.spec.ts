import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

type TenantListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  onboarding_status: string;
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
  recent_events: Array<{ event_type: string; summary: string; actor_identifier: string; created_at: string }>;
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

async function safeWait(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function safeReload(page: Page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await safeWait(page);
}

async function gotoPlatform(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await safeWait(page);
  await expectPageReady(page, heading);
}

async function tenantByCode(page: Page, tenantCode: string): Promise<TenantListItem> {
  const response = await page.request.get("/api/platform/tenants");
  expect(response.ok()).toBeTruthy();
  const tenants = (await response.json()) as TenantListItem[];
  const tenant = tenants.find((item) => item.code === tenantCode);
  expect(tenant, `tenant ${tenantCode}`).toBeTruthy();
  return tenant as TenantListItem;
}

async function onboardingPayload(page: Page, tenantId: string): Promise<OnboardingPayload> {
  const response = await page.request.get(`/api/platform/tenants/${tenantId}/onboarding`);
  expect(response.ok()).toBeTruthy();
  return response.json();
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

async function openCreateTenantDialog(page: Page): Promise<Locator> {
  await card(page, "Create tenant").getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openAddContactDialog(page: Page): Promise<Locator> {
  await card(page, "Admin contacts").getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add platform admin contact" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createTenant(page: Page, tenantCode: string, tenantName: string): Promise<TenantListItem> {
  await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
  const dialog = await openCreateTenantDialog(page);
  await namedControl(dialog, "code").fill(tenantCode);
  await namedControl(dialog, "name").fill(tenantName);
  await namedControl(dialog, "legal_name").fill(`${tenantName} Private Limited`);
  await namedControl(dialog, "primary_domain").fill(`${tenantCode}.example.test`);
  await namedControl(dialog, "primary_email").fill(`ops.${tenantCode}@example.test`);
  await namedControl(dialog, "primary_phone").fill("+91 96666 66001");
  await namedControl(dialog, "subscription_plan").selectOption("growth");
  await namedControl(dialog, "seed_pack").selectOption("standard_office");
  await namedControl(dialog, "timezone").fill("Asia/Kolkata");
  await namedControl(dialog, "country_code").fill("IN");
  await namedControl(dialog, "is_sandbox").setChecked(true);
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  await expect(notice(page).getByText("Tenant created.", { exact: true })).toBeVisible();
  return tenantByCode(page, tenantCode);
}

async function createAndPublishHeaderTemplate(page: Page, packCode: string, packName: string) {
  await gotoPlatform(page, "/platform-admin/policy-packs", "Setup Templates");
  const setupCard = card(page, "Setup templates");
  await namedControl(setupCard, "code").fill(packCode);
  await namedControl(setupCard, "name").fill(packName);
  await namedControl(setupCard, "domain").selectOption("leave");
  await namedControl(setupCard, "status").selectOption("draft");
  await namedControl(setupCard, "version").fill("1");
  await namedControl(setupCard, "country_code").fill("IN");
  await namedControl(setupCard, "industry_tag").fill("qa");
  await namedControl(setupCard, "description").fill("Launch readiness certification baseline.");
  await setupCard.getByRole("button", { name: "Create template" }).click();
  await expect(notice(page).getByText("Policy pack created.", { exact: true })).toBeVisible();

  await safeReload(page);
  await namedControl(setupCard, "policy_pack_search").fill(packCode);
  await setupCard.locator(".tenant-support-access-row").filter({ hasText: packCode }).getByRole("button", { name: "Publish" }).click();
  const headerOnlyDialog = page.getByRole("dialog", { name: "Publish header-only setup template?" });
  await expect(headerOnlyDialog.getByText(/evidence-only baseline/i)).toBeVisible();
  await headerOnlyDialog.getByRole("button", { name: "Publish header-only" }).click();
  await expect(notice(page).getByText("Policy pack published.", { exact: true })).toBeVisible();
}

async function applyTemplate(page: Page, tenantId: string, packCode: string, packName: string, tenantCode: string) {
  await gotoPlatform(page, `/platform-admin/policy-packs?tenantId=${tenantId}`, "Setup Templates");
  const adoptCard = card(page, "Apply setup template");
  await namedControl(adoptCard, "policy_pack_id").selectOption({ label: `${packName} - ${packCode} - Published` });
  await namedControl(adoptCard, "adoption_mode").selectOption("clone_to_tenant_records");
  await namedControl(adoptCard, "notes").fill(`Launch readiness baseline for ${tenantCode}.`);
  await adoptCard.getByRole("button", { name: "Preview impact" }).click();
  await expect(adoptCard.getByText("Impact preview")).toBeVisible();
  await adoptCard.getByRole("button", { name: "Apply template" }).click();
  await expect(notice(page).getByText("Policy pack adopted for tenant.", { exact: true })).toBeVisible();
}

async function addPrimaryContact(page: Page, tenantId: string, adminEmail: string, provision: boolean, runRef: string) {
  await gotoPlatform(page, `/platform-admin/admins?tenantId=${tenantId}`, "Admin Access");
  const dialog = await openAddContactDialog(page);
  await namedControl(dialog, "full_name").fill("QA Launch Admin");
  await namedControl(dialog, "email").fill(adminEmail);
  await namedControl(dialog, "phone_number").fill("+91 96666 66002");
  await namedControl(dialog, "job_title").fill("Head of People");
  await namedControl(dialog, "is_primary").setChecked(true);
  await namedControl(dialog, "notes").fill(`Primary launch admin ${runRef}`);
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(notice(page).getByText("Admin contact added.", { exact: true })).toBeVisible();

  if (!provision) return;

  const provisionCard = card(page, "Create tenant admin login");
  await namedControl(provisionCard, "contact_id").selectOption({ label: `QA Launch Admin - ${adminEmail}` });
  await namedControl(provisionCard, "username").fill(`qa.launch.${runRef}`);
  await namedControl(provisionCard, "role_code").selectOption("tenant-admin");
  await namedControl(provisionCard, "role_name").fill("Tenant Admin");
  await namedControl(provisionCard, "password").fill(process.env.PLAYWRIGHT_PLATFORM_ADMIN_PROVISIONED_PASSWORD ?? "Password@123");
  await namedControl(provisionCard, "must_change_password").setChecked(false);
  await provisionCard.getByRole("button", { name: "Create login access" }).click();
  await expect(notice(page).getByText("First admin provisioned.", { exact: true })).toBeVisible();
}

async function expectBlockedReadiness(page: Page, tenantId: string, expectedReason: RegExp) {
  await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenantId}`, "Launch Readiness");
  const gates = card(page, "Launch readiness");
  await expect(gates.getByRole("button", { name: "Mark ready" })).toBeDisabled();
  await expect(gates.getByRole("button", { name: "Activate tenant" })).toBeDisabled();
  await expect(gates.getByText(expectedReason)).toBeVisible();
  await expect(gates.locator(".platform-gate-checklist")).toBeVisible();
}

test.describe("Platform Admin Launch Readiness certification", () => {
  test("certifies gate blocking, handoff, activation, repeat protection, audit evidence, and tenant context", async ({ page }) => {
    test.setTimeout(420_000);
    const runRef = uniqueRunRef();
    const tenantCode = `qa-ready-${runRef}`;
    const tenantName = `QA Readiness Tenant ${runRef}`;
    const packCode = `qa-ready-pack-${runRef}`;
    const packName = `QA Readiness Pack ${runRef}`;
    const adminEmail = `qa.launch.admin.${runRef}@example.test`;

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      const failure = request.failure()?.errorText ?? "";
      if (!url.includes("_rsc") && !failure.includes("ERR_ABORTED")) {
        failedRequests.push(`${request.method()} ${url} ${failure}`);
      }
    });

    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expectPageReady(page, "Platform Admin Dashboard");
    await createAndPublishHeaderTemplate(page, packCode, packName);
    const tenant = await createTenant(page, tenantCode, tenantName);

    await expectBlockedReadiness(page, tenant.id, /Initial setup must be confirmed first/i);
    let evidence = await onboardingPayload(page, tenant.id);
    expect(evidence.baseline_published_at).toBeNull();
    expect(evidence.handoff_completed_at).toBeNull();
    expect(evidence.tenant_status).not.toBe("active");

    let directHandoff = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-handoff-ready`);
    expect(directHandoff.status()).toBe(400);
    expect(JSON.stringify(await directHandoff.json())).toContain("Baseline must be published");
    let directActivation = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/activate`);
    expect(directActivation.status()).toBe(400);
    expect(JSON.stringify(await directActivation.json())).toContain("Tenant handoff must be ready");

    await applyTemplate(page, tenant.id, packCode, packName, tenantCode);
    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenant.id}`, "Launch Readiness");
    const gatesAfterTemplate = card(page, "Launch readiness");
    await gatesAfterTemplate.getByRole("button", { name: "Confirm setup" }).click();
    const baselineDialog = page.getByRole("dialog", { name: "Confirm initial setup?" });
    await expect(baselineDialog).toBeVisible();
    await expect(baselineDialog.getByText(tenantName)).toBeVisible();
    await baselineDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(baselineDialog).toBeHidden();
    await gatesAfterTemplate.getByRole("button", { name: "Confirm setup" }).click();
    await page.getByRole("dialog", { name: "Confirm initial setup?" }).getByRole("button", { name: "Confirm setup" }).click();
    await expect(notice(page).getByText("Mark Baseline Published", { exact: true })).toBeVisible();

    await safeReload(page);
    await expectBlockedReadiness(page, tenant.id, /Primary tenant admin needs login access/i);
    evidence = await onboardingPayload(page, tenant.id);
    expect(evidence.baseline_published_at).toBeTruthy();
    expectEvent(evidence, "baseline_published", new RegExp(packCode));
    directHandoff = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-handoff-ready`);
    expect(directHandoff.status()).toBe(400);
    expect(JSON.stringify(await directHandoff.json())).toContain("Primary tenant admin must be provisioned");

    await addPrimaryContact(page, tenant.id, adminEmail, false, runRef);
    await expectBlockedReadiness(page, tenant.id, /Primary tenant admin needs login access/i);
    evidence = await onboardingPayload(page, tenant.id);
    expect(evidence.admin_contacts.some((contact) => contact.email === adminEmail && contact.is_primary && !contact.membership_id)).toBe(true);

    await addPrimaryContact(page, tenant.id, `qa.launch.admin.provisioned.${runRef}@example.test`, true, runRef);
    await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenant.id}`, "Launch Readiness");
    const readiness = card(page, "Launch readiness");
    await expect(readiness.getByRole("button", { name: "Mark ready" })).toBeEnabled();
    await expect(readiness.getByRole("button", { name: "Activate tenant" })).toBeDisabled();
    await readiness.getByRole("button", { name: "Mark ready" }).focus();
    await page.keyboard.press("Enter");
    const handoffDialog = page.getByRole("dialog", { name: "Mark customer ready?" });
    await expect(handoffDialog.getByText(/go-live handoff/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(handoffDialog).toBeHidden();
    await readiness.getByRole("button", { name: "Mark ready" }).click();
    await page.getByRole("dialog", { name: "Mark customer ready?" }).getByRole("button", { name: "Mark ready" }).click();
    await expect(notice(page).getByText("Mark Handoff Ready", { exact: true })).toBeVisible();

    evidence = await onboardingPayload(page, tenant.id);
    expect(evidence.handoff_completed_at).toBeTruthy();
    expect(evidence.tenant_onboarding_status).toBe("handoff_ready");
    expectEvent(evidence, "handoff_marked_ready", new RegExp(tenantCode));
    expectChecklist(evidence, "handoff_completed");

    const repeatHandoff = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/mark-handoff-ready`);
    expect(repeatHandoff.ok()).toBeTruthy();
    expect((await repeatHandoff.json()).onboarding_status).toBe("handoff_ready");

    await safeReload(page);
    const activeReadiness = card(page, "Launch readiness");
    await expect(activeReadiness.getByRole("button", { name: "Activate tenant" })).toBeEnabled();
    await activeReadiness.getByRole("button", { name: "Activate tenant" }).click();
    const activateDialog = page.getByRole("dialog", { name: "Activate tenant?" });
    await expect(activateDialog).toBeVisible();
    await expect(activateDialog.getByText(tenantName)).toBeVisible();
    await activateDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(activateDialog).toBeHidden();
    await activeReadiness.getByRole("button", { name: "Activate tenant" }).click();
    await page.getByRole("dialog", { name: "Activate tenant?" }).getByRole("button", { name: "Activate tenant" }).click();
    await expect(notice(page).getByText("Activate", { exact: true })).toBeVisible();

    evidence = await onboardingPayload(page, tenant.id);
    expect(evidence.tenant_status).toBe("active");
    expect(evidence.tenant_onboarding_status).toBe("active");
    expectEvent(evidence, "tenant_activated", new RegExp(tenantCode));

    const repeatActivation = await page.request.post(`/api/platform/tenants/${tenant.id}/onboarding/activate`);
    expect(repeatActivation.status()).toBe(400);
    expect(JSON.stringify(await repeatActivation.json())).toContain("Tenant handoff must be ready");

    await safeReload(page);
    await expect(card(page, tenantName).getByText("active").first()).toBeVisible();
    await gotoPlatform(page, `/platform-admin/audit-logs?tenantId=${tenant.id}`, "Audit Logs");
    const eventsCard = card(page, "Onboarding events");
    for (const eventType of ["baseline_published", "handoff_marked_ready", "tenant_activated"]) {
      await namedControl(eventsCard, "event_search").fill(eventType);
      await expect(
        eventsCard
          .locator(".tenant-support-access-row")
          .filter({ hasText: eventType.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) })
          .first(),
      ).toBeVisible();
    }

    await gotoPlatform(page, "/platform-admin/tenants", "Tenants");
    const tenantPipeline = card(page, "Tenant pipeline");
    await namedControl(tenantPipeline, "tenant_search").fill(tenantCode);
    await namedControl(tenantPipeline, "tenant_status_filter").selectOption("active");
    await expect(tenantPipeline.locator(".employee-directory-item").filter({ hasText: tenantName })).toBeVisible();

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await gotoPlatform(page, `/platform-admin/onboarding?tenantId=${tenant.id}`, "Launch Readiness");
      await expect(card(page, "Launch readiness")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(consoleErrors.filter((entry) => !entry.includes("favicon")).join("\n")).toBe("");
    expect(failedRequests.join("\n")).toBe("");
  });
});
